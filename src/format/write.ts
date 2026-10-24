// write.ts —— CatsupDocument → .glb 字节（glTF 2.1 语义、minVersion 2.0；契约 §3）。
// 布局：BIN[0] = 缩略图（头片 peek 用），随后每个 definition 的 bake accessor + 各池 B-rep 流。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21，group / component）：每个 definition 一个 mesh（根池 + 全部 group 合并烘焙）；实例 = glTF 节点树（matrix，Y-up）
//   + CATSUP_instance；authoring 全在 CATSUP_definitions（groups / instances 各自带 3×4 变换，Z-up 本地坐标）。

import { APP_VERSION } from "../version.ts";
import { BinBuilder } from "./binary.ts";
import { encodeGlb } from "./glb.ts";
import { canonicalize, encodeBrep, type CatsupBrepJson, type ViewSink } from "./brep-codec.ts";
import { bakeDefinition, mergeBrep } from "./bake.ts";
import type { CatsupDocument, DefinitionDoc } from "./document.ts";
import { EXTENSION_VERSIONS } from "./migrate/index.ts";
import { MIN_GLTF_VERSION, WRITE_GLTF_VERSION } from "./migrate/gltf/index.ts";
import { remapBufferViewRefs } from "./carry.ts";
import type { Xform } from "../scene/xform.ts";

export const CATSUP_EXTENSIONS = ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance", "CATSUP_material"] as const;

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
  // 材质 = glTF core materials（+ images / textures；贴图原字节原样进 BIN）+ CATSUP_material{sizeM}
  const textures: Record<string, unknown>[] = [];
  const materials = doc.materials.map((m) => {
    const out: Record<string, unknown> = { name: m.name, pbrMetallicRoughness: { baseColorFactor: [m.color[0], m.color[1], m.color[2], 1], metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true };
    if (m.texture) {
      const v = sink.add(m.texture.bytes);
      images.push({ bufferView: v, mimeType: m.texture.mimeType, name: m.name });
      textures.push({ source: images.length - 1 });
      (out.pbrMetallicRoughness as Record<string, unknown>).baseColorTexture = { index: textures.length - 1 };
      out.extensions = { CATSUP_material: { version: EXTENSION_VERSIONS.CATSUP_material, sizeM: [m.texture.sizeM[0], m.texture.sizeM[1]] } };
    }
    return out;
  });
  // 每个 definition：规范序一次（bake 与 B-rep 流共用同一份顶点顺序）→ mesh（按材质拆 primitive）
  const accessors: Record<string, unknown>[] = [];
  const meshes: Record<string, unknown>[] = [];
  const canon = doc.definitions.map((d) => ({ root: canonicalize(d.brep), groups: d.groups.map((g) => ({ ...g, brep: canonicalize(g.brep) })) }));
  for (let i = 0; i < doc.definitions.length; i++) {
    const merged = mergeBrep([canon[i].root, ...canon[i].groups.map((g) => g.brep)]);
    const slots = doc.definitions[i].materialSlots;
    const baked = bakeDefinition(merged, sink, accessors.length, {
      slotToCore: (slot) => { const c = slots[slot]; return c !== undefined && c in doc.materials ? c : undefined; },
      sizeOfCore: (core) => doc.materials[core]?.texture?.sizeM ?? null,
    });
    for (const [bi, t] of baked.bufferViewTargets) bufferViews[bi] = { ...bufferViews[bi], target: t };
    accessors.push(...baked.accessors);
    meshes.push({ name: doc.definitions[i].name, ...baked.mesh });
  }
  // 携带的未知二进制先落 BIN，再把未知 JSON 里的旧索引改成新索引
  const viewMap = new Map<number, number>();
  for (const [oldIdx, bytes] of doc.carry.views) viewMap.set(oldIdx, sink.add(bytes));
  const remap = (old: number): number => { const n = viewMap.get(old); if (n === undefined) throw new Error(`writeCatsup: carried JSON references bufferView ${old} that was not carried`); return n; };
  const carry = remapBufferViewRefs({ topLevel: doc.carry.topLevel, extensions: doc.carry.extensions, documentExtra: doc.carry.documentExtra, definitionsExtra: doc.carry.definitionsExtra, brepKeep: doc.carry.brepKeep ?? {} }, remap);

  const v3 = (p: { x: number; y: number; z: number }): number[] => [p.x, p.y, p.z];
  const encGuides = (g: DefinitionDoc["guides"]): Record<string, unknown> => ({ lines: g.lines.map((l) => ({ id: l.id, p: v3(l.p), dir: v3(l.dir) })), points: g.points.map((q) => ({ id: q.id, p: v3(q.p) })) });
  const defList = doc.definitions.map((d, i) => {
    const brepJson: CatsupBrepJson = encodeBrep(canon[i].root, sink, i === doc.rootIndex ? (carry.brepKeep as never) : undefined);
    const groups = canon[i].groups.map((g) => ({
      id: g.id, parent: g.parent,
      axes: { origin: [g.axes.origin.x, g.axes.origin.y, g.axes.origin.z], x: [g.axes.x.x, g.axes.x.y, g.axes.x.z], y: [g.axes.y.x, g.axes.y.y, g.axes.y.z], z: [g.axes.z.x, g.axes.z.y, g.axes.z.z] },
      ...(g.name !== undefined ? { name: g.name } : {}),
      ...(g.locked ? { locked: true } : {}),
      guides: encGuides(g.guides),
      brep: encodeBrep(g.brep, sink),
    }));
    const instances = d.instances.map((inst) => ({ id: inst.id, definition: inst.definition, parent: inst.parent, matrix: [...inst.xform], ...(inst.name !== undefined ? { name: inst.name } : {}), ...(inst.locked ? { locked: true } : {}) }));
    return { name: d.name, ...(d.kind !== undefined && d.kind !== "brep" ? { kind: d.kind } : {}), axes: { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, materialSlots: [...d.materialSlots], guides: encGuides(d.guides), nodes: [], brep: brepJson, groups, instances, ...(d.extras ? { extras: d.extras } : {}) };
  });

  // glTF 节点树：根 definition 一个节点；实例递归成子节点（matrix Y-up）
  const nodes: Record<string, unknown>[] = [];
  const instExt = (definition: number): Record<string, unknown> => ({ CATSUP_instance: { version: EXTENSION_VERSIONS.CATSUP_instance, definition, overrides: {} } });
  const buildNode = (d: DefinitionDoc, defIndex: number, depth: number, extra: Record<string, unknown>): number => {
    const idx = nodes.length;
    const node: Record<string, unknown> = { name: d.name, mesh: defIndex, extensions: instExt(defIndex), ...extra };
    nodes.push(node);
    if (depth > 32) return idx;
    const children: number[] = [];
    for (const inst of d.instances) {
      const target = doc.definitions[inst.definition];
      if (!target) continue;
      children.push(buildNode(target, inst.definition, depth + 1, { matrix: xformToGltfMatrix(inst.xform), ...(inst.name !== undefined ? { name: inst.name } : {}) }));
    }
    if (children.length) node.children = children;
    return idx;
  };
  buildNode(doc.root, doc.rootIndex, 0, {});

  const json: Record<string, unknown> = {
    ...carry.topLevel,
    asset: { version: WRITE_GLTF_VERSION, minVersion: MIN_GLTF_VERSION, generator: `CatsUp ${APP_VERSION}`, ...(thumbnail !== undefined ? { thumbnail } : {}) },
    extensionsUsed: [...CATSUP_EXTENSIONS],
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
        version: EXTENSION_VERSIONS.CATSUP_document,
        formatVersion: 1,
        settings: doc.settings,
        axes: { origin: v3(doc.axes.origin), x: v3(doc.axes.x), y: v3(doc.axes.y), z: v3(doc.axes.z) },
        ...(doc.final ? { final: { ...doc.final } } : {}),
        ...(doc.finalRev !== undefined ? { finalRev: doc.finalRev } : {}),
        bake: { mode: doc.bakeMode, generator: `CatsUp ${APP_VERSION}` },
        ...(doc.lastView !== undefined ? { lastView: doc.lastView } : {}),
        ...carry.documentExtra,
      },
      CATSUP_definitions: {
        version: EXTENSION_VERSIONS.CATSUP_definitions,
        root: doc.rootIndex,
        list: defList,
        ...carry.definitionsExtra,
      },
    },
  };
  const binBytes = bin.finish();
  (json.buffers as Record<string, unknown>[])[0] = { byteLength: binBytes.byteLength };
  return encodeGlb(json, binBytes);
}

