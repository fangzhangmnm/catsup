// write.ts —— CatsupDocument → .glb 字节（glTF 2.1 语义、minVersion 2.0；契约 §3）。
// 布局：BIN[0] = 缩略图（头片 peek 用），随后每个 definition 的 bake accessor + 各池 B-rep 流。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component）：每个 definition 一个 mesh（根池 + 全部 group 合并烘焙）；实例 = glTF 节点树（matrix，Y-up）
//   + CATSUP_instance；authoring 全在 CATSUP_definitions（groups / instances 各自带 3×4 变换，Z-up 本地坐标）。

import { COLOR_CHANNEL, colorMapIn, shelfIsEmpty, type ColorMap, type MaterialDoc, type TextureDoc } from "./document.ts";
import { writeTextureRow } from "./texture-table.ts";
import { BUILTIN_BACK_GUID, type Guid } from "./guid.ts";
import { APP_VERSION } from "../version.ts";
import { srgbToLinear } from "./color-space.ts";   // glTF 的 baseColorFactor 是线性值；app 里按 sRGB 存（color-space.ts）
import { BinBuilder } from "./binary.ts";
import { encodeGlb } from "./glb.ts";
import { canonicalize, encodeBrep, type CatsupBrepJson, type ViewSink } from "./brep-codec.ts";
import { bakeDefinition, bakeMesh, mergeBrep, type BakeMaterials } from "./bake.ts";
import { encodeMeshItem } from "./mesh-payload.ts";
import type { CatsupDocument, DefinitionDoc } from "./document.ts";
import { stampOf } from "./migrate/index.ts";
import { MIN_GLTF_VERSION, WRITE_GLTF_VERSION } from "./migrate/gltf/index.ts";
import { remapBufferViewRefs } from "./carry.ts";
import type { Xform } from "../scene/xform.ts";

/** 定义的 GUID → 在 doc.definitions 里第几个（头一个留身份，和 read.ts 一致）。下标只活在这一趟写入里（烘焙的 mesh 表按它排），不进文件。 */
const definitionIndex = (doc: CatsupDocument): Map<Guid, number> => { const m = new Map<Guid, number>(); doc.definitions.forEach((d, i) => { if (!m.has(d.guid)) m.set(d.guid, i); }); return m; };
export const CATSUP_EXTENSIONS = ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance", "CATSUP_material", "CATSUP_desk"] as const;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Z-up 3×4 → glTF Y-up 4×4 列主序：C·M·C⁻¹，C = (x,y,z)→(x,z,−y)。 */
export function xformToGltfMatrix(m: Xform): number[] {
  // 行主序 3×4 → 先写成 4×4 行主序再换轴
  const M = [[m[0], m[1], m[2], m[3]], [m[4], m[5], m[6], m[7]], [m[8], m[9], m[10], m[11]], [0, 0, 0, 1]];
  const C = [[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]];
  const Ci = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]];
  const mul = (A: number[][], B: number[][]): number[][] => A.map((r, i) => B[0].map((_, j) => r.reduce((acc, _v, k) => acc + A[i][k] * B[k][j], 0)));
  const R = mul(C, mul(M, Ci));
  const out: number[] = [];
  for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) out.push(R[row][col]);
  return out;
}

export function writeCatsup(doc: CatsupDocument): Uint8Array {
  const bin = new BinBuilder();
  const bufferViews: Record<string, unknown>[] = [];
  const sink: ViewSink = {
    add(bytes) {
      const span = bin.push(bytes);
      bufferViews.push({ buffer: 0, byteOffset: span.byteOffset, byteLength: span.byteLength });
      return bufferViews.length - 1;
    },
  };
  const images: Record<string, unknown>[] = [];
  let thumbnail: number | undefined;
  if (doc.thumbnail) {
    const v = sink.add(doc.thumbnail.bytes);
    images.push({ bufferView: v, mimeType: doc.thumbnail.mimeType, name: "thumbnail" });
    thumbnail = 0;
  }
  // 材质 = glTF core materials（+ images / textures = 颜色那一槽的原图，给别的软件看的派生物）+ CATSUP_material { guid, channels, sizeM 回声 }。
  // 贴图表（CATSUP_textures）：一张图的字节只落一次，表里那一行和标准那一半的 images[] 指同一个 bufferView；两个材质用同一张图 = 一条 image。
  const texTable = new Map<Guid, TextureDoc>(doc.textures.map((t) => [t.guid, t]));
  const texFrozen = isObj(doc.carry.extensions.CATSUP_textures);   // 贴图表是更新版写的：原样写回；这份 textures 里只有老文件那条路现铸的行，它们只靠标准那一半表达（下次打开再现铸）
  const imageViews = new Map<Guid, number>();
  const imageView = (t: TextureDoc): number => { let v = imageViews.get(t.guid); if (v === undefined) { v = sink.add((t as ColorMap).content.bytes); imageViews.set(t.guid, v); } return v; };
  const textures: Record<string, unknown>[] = [], coreTexture = new Map<Guid, number>();
  const materials = doc.materials.map((m) => {
    const out: Record<string, unknown> = { name: m.name, pbrMetallicRoughness: { baseColorFactor: [srgbToLinear(m.color[0]), srgbToLinear(m.color[1]), srgbToLinear(m.color[2]), 1], metallicFactor: 0, roughnessFactor: 1 } };
    const map = colorMapIn(texTable, m);
    if (map) {
      let ti = coreTexture.get(map.guid);
      if (ti === undefined) { images.push({ bufferView: imageView(map), mimeType: map.content.mimeType, name: map.name }); textures.push({ source: images.length - 1 }); ti = textures.length - 1; coreTexture.set(map.guid, ti); }
      (out.pbrMetallicRoughness as Record<string, unknown>).baseColorTexture = { index: ti };
    }
    // 每个材质都挂 CATSUP_material 拍子（1.1 起；纯色材质以前不挂）：读的时候靠它认「颜色是线性值」（migrate/material.ts）；channels 只写非空的；sizeM = 给老读者（1.2）的回声
    const channels = channelsToWrite(m, texFrozen ? (g) => !texTable.has(g) : () => true), top = texTable.get(m.channels?.[COLOR_CHANNEL]?.[0] ?? "");
    out.extensions = { CATSUP_material: { ...stampOf("CATSUP_material"), guid: m.guid, ...(channels ? { channels } : {}), ...(top?.sizeM ? { sizeM: [top.sizeM[0], top.sizeM[1]] } : {}) } };
    return out;
  });
  const matIndex = new Map<Guid, number>(doc.materials.map((m, i) => [m.guid, i]));
  // 每个 definition：规范序一次（bake 与 B-rep 流共用同一份顶点顺序）→ mesh（按材质拆 primitive）
  const accessors: Record<string, unknown>[] = [];
  const meshes: Record<string, unknown>[] = [];
  const meshOf: number[] = doc.definitions.map(() => -1);   // 定义下标 → glTF mesh 下标（没几何 = −1）
  const canon = doc.definitions.map((d) => ({ root: canonicalize(d.brep), groups: d.groups.map((g) => ({ ...g, brep: canonicalize(g.brep) })) }));
  for (let i = 0; i < doc.definitions.length; i++) {
    const merged = mergeBrep([canon[i].root, ...canon[i].groups.map((g) => g.brep)]);
    const slots = doc.definitions[i].materialSlots;
    const mats = {
      slotToCore: (slot: number) => { const g = slots[slot]; return g ? matIndex.get(g) : undefined; },
      sizeOfCore: (core: number) => { const m = doc.materials[core]; return m ? (colorMapIn(texTable, m)?.sizeM ?? null) : null; },
      isBack: (slot: number) => slots[slot] === BUILTIN_BACK_GUID,
    };
    const dd = doc.definitions[i];
    const baked = dd.kind === "mesh" && dd.mesh ? bakeMesh(dd.mesh, sink, accessors.length, mats) : bakeDefinition(merged, sink, accessors.length, mats);   // 网格体：多边形三角化给别的查看器看（真相在 CATSUP_mesh 载荷里）
    for (const [bi, t] of baked.bufferViewTargets) bufferViews[bi] = { ...bufferViews[bi], target: t };
    accessors.push(...baked.accessors);
    // glTF 不许零个 primitive 的 mesh（spec：primitives minItems 1）：没几何的定义（空节点 / 只装孩子的容器组件）不出 mesh，节点也不挂（2026-10-26 Opus）
    if ((baked.mesh.primitives as unknown[]).length) { meshOf[i] = meshes.length; meshes.push({ name: doc.definitions[i].name, ...baked.mesh }); }
  }
  // 携带的未知二进制先落 BIN，再把未知 JSON 里的旧索引改成新索引
  const viewMap = new Map<number, number>();
  for (const [oldIdx, bytes] of doc.carry.views) viewMap.set(oldIdx, sink.add(bytes));
  const remap = (old: number): number => { const n = viewMap.get(old); if (n === undefined) throw new Error(`writeCatsup: carried JSON references bufferView ${old} that was not carried`); return n; };
  const carry = remapBufferViewRefs({ topLevel: doc.carry.topLevel, extensions: doc.carry.extensions, documentExtra: doc.carry.documentExtra, definitionsExtra: doc.carry.definitionsExtra, brepKeep: doc.carry.brepKeep ?? {}, referencesExtra: doc.references.extra, texturesExtra: doc.carry.texturesExtra ?? {} }, remap);
  // 贴图表（CATSUP_textures 1.0）：空 = 不写；太新 = 上面 carry.extensions 原样写回；否则一行一条（原图的字节上面落过就共用那条）
  const texExt: Record<string, unknown> | null = !texFrozen && doc.textures.length ? { ...carry.texturesExtra, ...stampOf("CATSUP_textures"), list: doc.textures.map((t) => writeTextureRow(t, sink, imageView)) } : null;
  // 参考窗牌组（§5.8）：太新的原字节（读取器放进 carry.extensions）原样写回；否则每个文件一条 bufferView；空牌组不写
  const refsCarried = isObj(carry.extensions.CATSUP_references);
  const refsExt: Record<string, unknown> | null = refsCarried ? null : doc.references.files.length ? {
    ...carry.referencesExtra,
    ...stampOf("CATSUP_references"),
    files: doc.references.files.map((f) => ({ path: f.path, mimeType: f.mimeType, bufferView: sink.add(f.bytes) })),
  } : null;

  const v3 = (p: { x: number; y: number; z: number }): number[] => [p.x, p.y, p.z];
  // 参考圆 / 球（definitions 6.3）只在有时才写：老文件写出来的字节不变
  const encGuides = (g: DefinitionDoc["guides"]): Record<string, unknown> => ({ lines: g.lines.map((l) => ({ id: l.id, p: v3(l.p), dir: v3(l.dir) })), points: g.points.map((q) => ({ id: q.id, p: v3(q.p) })),
    ...(g.circles?.length ? { circles: g.circles.map((c) => ({ id: c.id, c: v3(c.c), n: v3(c.n), r: c.r })) } : {}), ...(g.spheres?.length ? { spheres: g.spheres.map((s) => ({ id: s.id, c: v3(s.c), r: s.r })) } : {}) });
  const defList = doc.definitions.map((d, i) => {
    const brepJson: CatsupBrepJson = encodeBrep(canon[i].root, sink, i === doc.rootIndex ? (carry.brepKeep as never) : undefined);
    const groups = canon[i].groups.map((g) => ({
      guid: g.guid, parent: g.parent,
      axes: { origin: [g.axes.origin.x, g.axes.origin.y, g.axes.origin.z], x: [g.axes.x.x, g.axes.x.y, g.axes.x.z], y: [g.axes.y.x, g.axes.y.y, g.axes.y.z], z: [g.axes.z.x, g.axes.z.y, g.axes.z.z] },
      ...(g.name !== undefined ? { name: g.name } : {}),
      guides: encGuides(g.guides),
      brep: encodeBrep(g.brep, sink),
    }));
    const instances = d.instances.map((inst) => ({ guid: inst.guid, definition: inst.definition, parent: inst.parent, matrix: [...inst.xform], ...(inst.name !== undefined ? { name: inst.name } : {}), ...(inst.locked ? { locked: true } : {}), ...(inst.layer !== undefined ? { layer: inst.layer } : {}), ...(inst.hidden ? { hidden: true } : {}) }));
    // 0.14 身体载荷（definitions v5）：mesh = 几条 bufferView（card 载荷 v6 退场）
    let payload: Record<string, unknown> = {};
    if (d.kind === "mesh" && d.mesh) payload = { mesh: encodeMeshItem(d.mesh, sink) };   // CATSUP_mesh 1.0.0 多边形载荷（M3）
    return { guid: d.guid, name: d.name, ...(d.kind !== undefined && d.kind !== "brep" ? { kind: d.kind } : {}), ...payload, axes: { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, materialSlots: [...d.materialSlots], guides: encGuides(d.guides), ...(d.drawFrame ? { drawFrame: { origin: v3(d.drawFrame.origin), x: v3(d.drawFrame.x), y: v3(d.drawFrame.y), z: v3(d.drawFrame.z) } } : {}), nodes: [], brep: brepJson, groups, instances, ...(d.extras ? { extras: d.extras } : {}) };
  });

  // glTF 节点树：根 definition 一个节点；实例递归成子节点（matrix Y-up）
  const defIndex_ = definitionIndex(doc);
  const nodes: Record<string, unknown>[] = [];
  let anyHidden = false;
  // 隐藏的实例（DT49）：节点带 Khronos KHR_node_visibility { visible: false }（藏父连子，别的 glTF 查看器也认）；我们自己读的是 CATSUP_definitions 里的 hidden
  const instExt = (definition: Guid, hidden: boolean): Record<string, unknown> => ({ CATSUP_instance: { ...stampOf("CATSUP_instance"), definition, overrides: {} }, ...(hidden ? { KHR_node_visibility: { visible: false } } : {}) });
  const buildNode = (d: DefinitionDoc, defIndex: number, depth: number, extra: Record<string, unknown>, hidden = false): number => {
    const idx = nodes.length;
    if (hidden) anyHidden = true;
    const node: Record<string, unknown> = { name: d.name, ...(meshOf[defIndex] >= 0 ? { mesh: meshOf[defIndex] } : {}), extensions: instExt(d.guid, hidden), ...extra };
    nodes.push(node);
    if (depth > 32) return idx;
    const children: number[] = [];
    for (const inst of d.instances) {
      const ti = defIndex_.get(inst.definition);
      if (ti === undefined) continue;
      children.push(buildNode(doc.definitions[ti], ti, depth + 1, { matrix: xformToGltfMatrix(inst.xform), ...(inst.name !== undefined ? { name: inst.name } : {}) }, !!inst.hidden));
    }
    if (children.length) node.children = children;
    return idx;
  };
  buildNode(doc.root, doc.rootIndex, 0, {});

  const json: Record<string, unknown> = {
    ...carry.topLevel,
    asset: { version: WRITE_GLTF_VERSION, minVersion: MIN_GLTF_VERSION, generator: `CatsUp ${APP_VERSION}`, ...(thumbnail !== undefined ? { thumbnail } : {}) },
    extensionsUsed: [...CATSUP_EXTENSIONS, ...(refsCarried || refsExt ? ["CATSUP_references"] : []), ...(isObj(carry.extensions.CATSUP_shelf) || (doc.shelf && !shelfIsEmpty(doc.shelf)) ? ["CATSUP_shelf"] : []), ...(texFrozen || texExt ? ["CATSUP_textures"] : []), ...(anyHidden ? ["KHR_node_visibility"] : [])],
    extensionsRequired: [],
    buffers: [{ byteLength: 0 }],
    bufferViews,
    accessors,
    ...(images.length ? { images } : {}),
    ...(textures.length ? { textures } : {}),
    ...(materials.length ? { materials } : {}),
    meshes,
    nodes,
    scenes: [{ nodes: [0] }],
    scene: 0,
    extensions: {
      ...carry.extensions,
      CATSUP_document: {
        ...carry.documentExtra,   // 直通的未知键先铺、已知键后铺 = 已知键永远赢（家族纪律 §3；之前铺反了：文件里的 layers 会盖掉改过的 layers）
        ...stampOf("CATSUP_document"), layers: doc.layers.map((l) => ({ id: l.id, guid: l.guid, name: l.name, visible: l.visible, ...(l.color ? { color: [l.color[0], l.color[1], l.color[2]] } : {}) })),
        formatVersion: 1,
        settings: doc.settings,
        axes: { origin: v3(doc.axes.origin), x: v3(doc.axes.x), y: v3(doc.axes.y), z: v3(doc.axes.z) },
        ...(doc.final ? { final: { ...doc.final } } : {}),
        ...(doc.finalRev !== undefined ? { finalRev: doc.finalRev } : {}),
        bake: { mode: doc.bakeMode, generator: `CatsUp ${APP_VERSION}` },
      },
      CATSUP_definitions: {
        ...carry.definitionsExtra,
        ...stampOf("CATSUP_definitions"),
        root: doc.root.guid,
        list: defList,
      },
      // 桌面态（§5.7）：太新的原字节（读取器放进 carry.extensions）原样写回；否则 extra 先铺、已知键后铺；menuTabs 空 / lastView 没有就不写键
      CATSUP_desk: isObj(carry.extensions.CATSUP_desk) ? carry.extensions.CATSUP_desk : {
        ...doc.desk.extra,
        ...stampOf("CATSUP_desk"),
        ...(Object.keys(doc.desk.menuTabs).length ? { menuTabs: { ...doc.desk.menuTabs } } : {}),
        ...(doc.desk.lastView !== undefined ? { lastView: doc.desk.lastView } : {}),
        ...(doc.desk.refPanel ? { refPanel: { ...doc.desk.refPanel } } : {}),
        ...(doc.desk.locked ? { locked: true } : {}),   // 演示锁（desk 1.2）：锁着才写
        ...(doc.desk.style !== undefined ? { style: doc.desk.style } : {}), ...(doc.desk.screen !== undefined ? { screen: doc.desk.screen } : {}),   // 风格 / 屏幕（desk 1.3）：选过才写
        ...(doc.desk.exportModel ? { exportModel: { ...doc.desk.exportModel } } : {}),   // 导出表单上次的选择（desk 1.4）：导出过才写
      },
      ...(refsExt ? { CATSUP_references: refsExt } : {}),
      ...(doc.shelf && !shelfIsEmpty(doc.shelf) ? { CATSUP_shelf: { ...doc.shelf.extra, ...stampOf("CATSUP_shelf"), folders: doc.shelf.folders, items: doc.shelf.items } } : {}),
      ...(texExt ? { CATSUP_textures: texExt } : {}),
    },
  };
  const binBytes = bin.finish();
  (json.buffers as Record<string, unknown>[])[0] = { byteLength: binBytes.byteLength };
  return encodeGlb(json, binBytes);
}

// ---------------- 「导出模型」：给别的软件看的烤好的模型（导出设计稿 ai-docs/20261028-export-design.md §5；账本 UX39）----------------
// 工程文件（writeCatsup）本来就带烤好的三角形给别的查看器，但它是工程：.catsup、原样。这里写的是**交付物**——只有 glTF 2.0 core：
// 节点层级 + 三角形（+ 线）+ 材质（+ 贴图）；不带任何 CATSUP_* 扩展、不带参考图 / 缩略图 / 携带的未知键 / 硬表面数据。开回 CatsUp 是「别的软件的 glb」（只能导入）。
// created 2026-10-28 by Claude Opus 5.5

/** 「导出模型」的选择：textures = 贴图嵌进文件（false = 只留底色）；lines = 带边线 primitive；only = 只导这几份物体（世界变换 + 定义的 GUID；缺 = 整个模型）。 */
export interface ModelExportOpts {
  textures: boolean;
  lines: boolean;
  only?: readonly { definition: Guid; xform: Xform; name?: string }[];
}

export function writeGltfModel(doc: CatsupDocument, opts: ModelExportOpts): Uint8Array {
  const bin = new BinBuilder();
  const bufferViews: Record<string, unknown>[] = [];
  const sink: ViewSink = { add(bytes) { const span = bin.push(bytes); bufferViews.push({ buffer: 0, byteOffset: span.byteOffset, byteLength: span.byteLength }); return bufferViews.length - 1; } };
  const images: Record<string, unknown>[] = [], textures: Record<string, unknown>[] = [];
  const texTable = new Map<Guid, TextureDoc>(doc.textures.map((t) => [t.guid, t])), mapOf = (m: MaterialDoc | undefined): ColorMap | null => (m && opts.textures ? colorMapIn(texTable, m) : null);   // 不带贴图 = 只留底色
  const coreTexture = new Map<Guid, number>();   // 两个材质用同一张图 = 一条 image
  const materials = doc.materials.map((m) => {
    const out: Record<string, unknown> = { name: m.name, pbrMetallicRoughness: { baseColorFactor: [srgbToLinear(m.color[0]), srgbToLinear(m.color[1]), srgbToLinear(m.color[2]), 1], metallicFactor: 0, roughnessFactor: 1 } };
    const map = mapOf(m);
    if (map) {
      let ti = coreTexture.get(map.guid);
      if (ti === undefined) { images.push({ bufferView: sink.add(map.content.bytes), mimeType: map.content.mimeType, name: map.name }); textures.push({ source: images.length - 1 }); ti = textures.length - 1; coreTexture.set(map.guid, ti); }
      (out.pbrMetallicRoughness as Record<string, unknown>).baseColorTexture = { index: ti };
    }
    return out;
  });
  // 只烤够得着的定义（整个模型 = 从根往下；只导选中的 = 从那几份往下）
  const defIndex_ = definitionIndex(doc), matIndex = new Map<Guid, number>(doc.materials.map((m, i) => [m.guid, i]));
  const reach = new Set<number>();
  const visit = (i: number | undefined, depth: number): void => { if (i === undefined || reach.has(i) || depth > 32) return; reach.add(i); for (const inst of doc.definitions[i].instances) visit(defIndex_.get(inst.definition), depth + 1); };
  if (opts.only) for (const o of opts.only) visit(defIndex_.get(o.definition), 0); else visit(doc.rootIndex, 0);
  const accessors: Record<string, unknown>[] = [], meshes: Record<string, unknown>[] = [];
  const meshOf: number[] = doc.definitions.map(() => -1);
  for (const i of [...reach].sort((a, b) => a - b)) {
    const d = doc.definitions[i], slots = d.materialSlots;
    const mats: BakeMaterials = {
      slotToCore: (slot) => { const g = slots[slot]; return g ? matIndex.get(g) : undefined; },
      sizeOfCore: (core) => mapOf(doc.materials[core])?.sizeM ?? null,   // 不带贴图 = 不出 UV
      isBack: (slot) => slots[slot] === BUILTIN_BACK_GUID,
    };
    const baked = d.kind === "mesh" && d.mesh ? bakeMesh(d.mesh, sink, accessors.length, mats, { lines: opts.lines })
      : bakeDefinition(mergeBrep([canonicalize(d.brep), ...d.groups.map((g) => canonicalize(g.brep))]), sink, accessors.length, mats, { lines: opts.lines });
    for (const [bi, t] of baked.bufferViewTargets) bufferViews[bi] = { ...bufferViews[bi], target: t };
    accessors.push(...baked.accessors);
    if ((baked.mesh.primitives as unknown[]).length) { meshOf[i] = meshes.length; meshes.push({ name: d.name, ...baked.mesh }); }
  }
  const nodes: Record<string, unknown>[] = [];
  let anyHidden = false;
  const buildNode = (defIndex: number, depth: number, extra: Record<string, unknown>, hidden: boolean): number => {
    const d = doc.definitions[defIndex], idx = nodes.length;
    if (hidden) anyHidden = true;
    const node: Record<string, unknown> = { name: d.name, ...(meshOf[defIndex] >= 0 ? { mesh: meshOf[defIndex] } : {}), ...(hidden ? { extensions: { KHR_node_visibility: { visible: false } } } : {}), ...extra };
    nodes.push(node);
    if (depth > 32) return idx;
    const children: number[] = [];
    for (const inst of d.instances) { const ti = defIndex_.get(inst.definition); if (ti !== undefined) children.push(buildNode(ti, depth + 1, { matrix: xformToGltfMatrix(inst.xform), ...(inst.name !== undefined ? { name: inst.name } : {}) }, !!inst.hidden)); }
    if (children.length) node.children = children;
    return idx;
  };
  if (opts.only) {
    nodes.push({ name: doc.root.name });
    const kids = opts.only.filter((o) => defIndex_.has(o.definition)).map((o) => buildNode(defIndex_.get(o.definition)!, 1, { matrix: xformToGltfMatrix(o.xform), ...(o.name !== undefined ? { name: o.name } : {}) }, false));
    if (kids.length) nodes[0].children = kids;
  } else buildNode(doc.rootIndex, 0, {}, false);
  const json: Record<string, unknown> = {
    asset: { version: "2.0", generator: `CatsUp ${APP_VERSION}` },   // 只用 2.0 的东西：写 2.0，别的软件最好认
    ...(anyHidden ? { extensionsUsed: ["KHR_node_visibility"] } : {}),
    buffers: [{ byteLength: 0 }],
    bufferViews, accessors,
    ...(images.length ? { images } : {}),
    ...(textures.length ? { textures } : {}),
    ...(materials.length ? { materials } : {}),
    meshes, nodes,
    scenes: [{ nodes: [0] }], scene: 0,
  };
  const binBytes = bin.finish();
  (json.buffers as Record<string, unknown>[])[0] = { byteLength: binBytes.byteLength };
  return encodeGlb(json, binBytes);
}

/** 材质扩展里写的 channels：一摞空 = 不写那个名字，都空 = 不写（null）；keep = 这一格写不写（贴图表太新时，现铸的老文件行不写进去）。 */
function channelsToWrite(m: MaterialDoc, keep: (g: Guid) => boolean): Record<string, Guid[]> | null {
  const out: Record<string, Guid[]> = {};
  for (const [name, stack] of Object.entries(m.channels ?? {})) { const gs = stack.filter(keep); if (gs.length) out[name] = [...gs]; }
  return Object.keys(out).length ? out : null;
}
