// read.ts —— .glb 字节 → CatsupDocument（迁移到当前版；拒开比 app 新的；未知内容保留）。
// 不构造 Kernel / Scene——那是 scene-doc.ts `sceneFromDocument` 的活（拓扑校验在内核）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21）：definitions 全读（groups / instances）；root = 其中一个。

import { decodeGlb } from "./glb.ts";
import { materialColorFromFile, textureFromLegacyMaterial } from "./migrate/material.ts";
import { carryJson, readTextureRow } from "./texture-table.ts";
import { sliceBin } from "./binary.ts";
import { decodeBrep, type CatsupBrepJson } from "./brep-codec.ts";
import type { CatsupDocument, DefinitionDoc, GroupDoc, GuidesDoc, InstanceDoc, MaterialDoc, TextureDoc } from "./document.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { DEFAULT_SETTINGS, DEFAULT_LAYER, defaultDesk, emptyReferences, menuTabsOf, refPanelOf, shelfIsEmpty, type DeskDoc, type LayerDoc, type ReferencesDoc, type ShelfDoc, type ShelfItem } from "./document.ts";
import { migrateExtension, emptyReadNotes, readStamp, FormatTooNewError, type FormatReadNotes } from "./migrate/index.ts";
import { BUILTIN_BACK_GUID, BUILTIN_FRONT_GUID, DEFAULT_LAYER_GUID, isGuid, ownGuid, type Guid } from "./guid.ts";
import { decodeMeshItem } from "./mesh-payload.ts";
import { assertReadableGltfVersion } from "./migrate/gltf/index.ts";
import { collectBufferViewRefs } from "./carry.ts";
import { isFinalRecord } from "./final.ts";
import type { Frame, Xform } from "../scene/xform.ts";
import { WORLD_FRAME } from "../scene/xform.ts";

const fail = (msg: string): never => { throw new Error(`readCatsup: ${msg}`); };
/** CATSUP_material 里本版认识的键（其余的原样带回）。 */
const MATERIAL_EXT_KEYS = new Set(["version", "minor", "patch", "guid", "channels", "sizeM"]);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const num3 = (x: unknown, what: string): { x: number; y: number; z: number } => {
  if (!Array.isArray(x) || x.length !== 3 || !x.every((v) => typeof v === "number")) fail(`${what} must be [x,y,z]`);
  const a = x as number[];
  return { x: a[0], y: a[1], z: a[2] };
};
const frameOf = (j: unknown, what: string): Frame => {
  if (!isObj(j)) return WORLD_FRAME;
  return { origin: num3(j.origin, `${what}.origin`), x: num3(j.x, `${what}.x`), y: num3(j.y, `${what}.y`), z: num3(j.z, `${what}.z`) };
};

/** 参考几何（definitions v4）：缺 = 空；坏条目整份拒开（与其他字段同口径）。 */
const guidesOf = (j: unknown, what: string): GuidesDoc => {
  if (!isObj(j)) return { lines: [], points: [] };
  const lines = (Array.isArray(j.lines) ? j.lines : []).map((l: unknown, i: number) => {
    if (!isObj(l)) fail(`${what}.lines[${i}] invalid`);
    const L = l as Record<string, unknown>;
    return { id: typeof L.id === "number" ? L.id : i + 1, p: num3(L.p, `${what}.lines[${i}].p`), dir: num3(L.dir, `${what}.lines[${i}].dir`) };
  });
  const points = (Array.isArray(j.points) ? j.points : []).map((q: unknown, i: number) => {
    if (!isObj(q)) fail(`${what}.points[${i}] invalid`);
    const Q = q as Record<string, unknown>;
    return { id: typeof Q.id === "number" ? Q.id : i + 1, p: num3(Q.p, `${what}.points[${i}].p`) };
  });
  const radius = (x: unknown, at: string): number => { if (typeof x !== "number" || !Number.isFinite(x) || x < 0) fail(`${at} invalid`); return x as number; };
  const circles = (Array.isArray(j.circles) ? j.circles : []).map((c: unknown, i: number) => {
    if (!isObj(c)) fail(`${what}.circles[${i}] invalid`);
    const C = c as Record<string, unknown>;
    return { id: typeof C.id === "number" ? C.id : 1000000 + i, c: num3(C.c, `${what}.circles[${i}].c`), n: num3(C.n, `${what}.circles[${i}].n`), r: radius(C.r, `${what}.circles[${i}].r`) };
  });
  const spheres = (Array.isArray(j.spheres) ? j.spheres : []).map((s: unknown, i: number) => {
    if (!isObj(s)) fail(`${what}.spheres[${i}] invalid`);
    const S = s as Record<string, unknown>;
    return { id: typeof S.id === "number" ? S.id : 2000000 + i, c: num3(S.c, `${what}.spheres[${i}].c`), r: radius(S.r, `${what}.spheres[${i}].r`) };
  });
  return { lines, points, ...(circles.length ? { circles } : {}), ...(spheres.length ? { spheres } : {}) };
};

/** 只看 JSON：是不是 CatsUp 文档（validateAdopt 用；外来 glb 不 adopt）。 */
export function isCatsupGltf(json: unknown): boolean {
  return isObj(json) && Array.isArray(json.extensionsUsed) && json.extensionsUsed.includes("CATSUP_document") && isObj(json.extensions) && isObj(json.extensions.CATSUP_document);
}

function readShelf(j: Record<string, unknown>, defs: ReadonlySet<Guid>, mats: ReadonlySet<Guid>, notes: FormatReadNotes): ShelfDoc {
  const seen = new Set<Guid>();
  const folderRows = (Array.isArray(j.folders) ? j.folders : []).filter(isObj) as Record<string, unknown>[];
  const reminted = (): void => { notes.remintedGuids = (notes.remintedGuids ?? 0) + 1; };
  const folderGuids = folderRows.map((f) => ownGuid(f.guid, seen, reminted));
  const known = new Set(folderGuids);
  const inFolder = (x: unknown): Guid | null => (isGuid(x) && known.has(x) ? x : null);
  const folders = folderRows.map((f, i) => ({ ...f, guid: folderGuids[i], name: typeof f.name === "string" ? f.name : "", parent: inFolder(f.parent) }));
  let dangling = 0;
  const items: ShelfItem[] = [];
  for (const it of (Array.isArray(j.items) ? j.items : []).filter(isObj) as Record<string, unknown>[]) {
    const kind = typeof it.kind === "string" ? it.kind : "definition", ref = it.ref;
    const hasIt = kind === "definition" ? isGuid(ref) && defs.has(ref) : kind === "material" ? isGuid(ref) && mats.has(ref) : true;   // 不认识的种类不查引用（更新的版本写的，原样带回）
    if (!hasIt) { dangling++; continue; }
    items.push({ ...it, guid: ownGuid(it.guid, seen, reminted), kind, ref: ref as Guid, folder: inFolder(it.folder) });
  }
  if (dangling) notes.danglingShelfRefs = dangling;
  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(j)) if (k !== "version" && k !== "minor" && k !== "patch" && k !== "folders" && k !== "items") extra[k] = v;
  return { folders, items, extra };
}

export function readCatsup(bytes: Uint8Array): CatsupDocument {
  const { json: j, bin } = decodeGlb(bytes);
  if (!isObj(j)) fail("JSON chunk is not an object");
  const json = j as Record<string, unknown>;
  if (!isObj(json.asset)) fail("missing asset");
  assertReadableGltfVersion((json.asset as Record<string, unknown>).version);
  if (!isCatsupGltf(json)) fail("not a CatsUp document (no CATSUP_document extension)");
  const bufferViews = Array.isArray(json.bufferViews) ? (json.bufferViews as Record<string, unknown>[]) : [];
  const view = (i: number): Uint8Array => {
    const bv = bufferViews[i];
    if (!isObj(bv) || typeof bv.byteLength !== "number") fail(`bufferView ${i} missing`);
    return sliceBin(bin, { byteOffset: typeof bv.byteOffset === "number" ? bv.byteOffset : 0, byteLength: bv.byteLength as number });
  };
  const exts = json.extensions as Record<string, unknown>;
  const notes = emptyReadNotes();   // 三级拍子判决（minor 更新 → 宿主提示一次）
  const reminted = (): void => { notes.remintedGuids = (notes.remintedGuids ?? 0) + 1; };
  const docExt = migrateExtension("CATSUP_document", exts.CATSUP_document as Record<string, unknown>, notes);
  // 贴图表 CATSUP_textures（2026-11-10，贴图主线 1-0½）：先于材质读（材质的 channels 要查它）。没有 = 空表；major 比本版新 → 不拒开（同 desk）：原字节带回、
  // 材质的 channels 原样带回、先按底色显示、notes 记一笔（这时 textures 里只会有下面老文件那条路现铸的行，写盘时它们不进那张原样带回的表，见 write.ts）。
  const textures: TextureDoc[] = [];
  let texturesRaw: Record<string, unknown> | null = null;
  const texturesExtraRaw: Record<string, unknown> = {};
  if (isObj(exts.CATSUP_textures)) {
    const raw = exts.CATSUP_textures as Record<string, unknown>;
    try {
      const tj = migrateExtension("CATSUP_textures", raw, notes), texSeen = new Set<Guid>();
      (Array.isArray(tj.list) ? tj.list : []).forEach((row: unknown, i: number) => textures.push(readTextureRow(row, i, view, texSeen, reminted, notes)));
      for (const [k, v] of Object.entries(tj)) if (k !== "version" && k !== "minor" && k !== "patch" && k !== "list") texturesExtraRaw[k] = v;
    } catch (e) {
      if (!(e instanceof FormatTooNewError)) throw e;
      texturesRaw = raw;
      notes.texturesTooNew = readStamp(raw);
    }
  }
  const texKnown = new Set(textures.map((t) => t.guid));
  // 材质：先于定义读（定义 6→7 的迁移要材质的 GUID）。glTF core materials（baseColorFactor）+ CATSUP_material { guid, channels, sizeM（老读者的回声） }。
  // 有 channels = 照它来，不看标准那一半的 baseColorTexture（那是给别的软件看的派生物）；没有 channels、标准那一半有图 = 老文件：图搬进贴图表（migrate/material.ts）。
  const texList = Array.isArray(json.textures) ? (json.textures as Record<string, unknown>[]) : [];
  const imgList = Array.isArray(json.images) ? (json.images as Record<string, unknown>[]) : [];
  const matSeen = new Set<Guid>([BUILTIN_FRONT_GUID, BUILTIN_BACK_GUID]);   // 内置材质永不进材质表：冒充的现铸新身份（§9.2-A）
  const materials: MaterialDoc[] = (Array.isArray(json.materials) ? (json.materials as Record<string, unknown>[]) : []).map((m, mi) => {
    const pbr = isObj(m.pbrMetallicRoughness) ? (m.pbrMetallicRoughness as Record<string, unknown>) : {};
    const bc = Array.isArray(pbr.baseColorFactor) ? (pbr.baseColorFactor as number[]) : [0.8, 0.8, 0.8, 1];
    const extRaw = isObj(m.extensions) && isObj((m.extensions as Record<string, unknown>).CATSUP_material) ? (m.extensions as Record<string, unknown>).CATSUP_material as Record<string, unknown> : null;
    const out: MaterialDoc = { guid: ownGuid(extRaw?.guid, matSeen, reminted), name: typeof m.name === "string" ? m.name : `material ${mi}`, color: materialColorFromFile(bc, extRaw) };   // 1.1 起文件里是线性值（glTF 规定），app 里按 sRGB；老文件原样（migrate/material.ts）
    if (extRaw) {   // 材质扩展里本版不认识的键：连同引用的字节原样带回（小版本更新 = 能开能存、不认识的键直通）
      const unknown: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(extRaw)) if (!MATERIAL_EXT_KEYS.has(k)) unknown[k] = v;
      if (Object.keys(unknown).length) out.extra = carryJson(unknown, view);
    }
    if (extRaw && isObj(extRaw.channels)) {
      const ext = migrateExtension("CATSUP_material", extRaw, notes), ch: Record<string, Guid[]> = {};
      for (const [name, stack] of Object.entries(ext.channels as Record<string, unknown>)) {
        if (!Array.isArray(stack)) continue;
        const keep = stack.filter((g): g is Guid => { if (!isGuid(g)) return false; if (texturesRaw || texKnown.has(g)) return true; notes.danglingTextureRefs = (notes.danglingTextureRefs ?? 0) + 1; return false; });   // 指着表里没有的 = 这一格当空的（不猜、不造）；表太新 = 原样带
        if (keep.length) ch[name] = keep;
      }
      if (Object.keys(ch).length) out.channels = ch;
      return out;
    }
    const bt = isObj(pbr.baseColorTexture) ? (pbr.baseColorTexture as Record<string, unknown>) : null;
    if (bt && typeof bt.index === "number" && isObj(texList[bt.index])) {
      const src = (texList[bt.index] as Record<string, unknown>).source;
      const img = typeof src === "number" ? imgList[src] : undefined;
      if (isObj(img) && typeof img.bufferView === "number") {
        const ext = extRaw ? migrateExtension("CATSUP_material", extRaw, notes) : {};
        const row = textureFromLegacyMaterial(out.name, { mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/png", bytes: new Uint8Array(view(img.bufferView)) }, ext.sizeM);
        textures.push(row); texKnown.add(row.guid);
        out.channels = { color: [row.guid] };
      }
    }
    return out;
  });

  if (!isObj(exts.CATSUP_definitions)) fail("missing CATSUP_definitions");
  const defsExt = migrateExtension("CATSUP_definitions", exts.CATSUP_definitions as Record<string, unknown>, notes, { materialGuids: materials.map((m) => m.guid) });
  const list = defsExt.list;
  if (!Array.isArray(list)) fail("CATSUP_definitions.list missing");
  // 定义的身份先过一遍（实例引用要查；重复的：头一个留身份，后面的现铸 = 引用都指头一个，不崩）
  const defSeen = new Set<Guid>();
  const defGuids: Guid[] = (list as unknown[]).map((d) => ownGuid(isObj(d) ? (d as Record<string, unknown>).guid : undefined, defSeen, reminted));
  const rootIdx = defGuids.indexOf(defsExt.root as Guid);
  if (rootIdx < 0) fail("CATSUP_definitions.root invalid");
  const matKnown = new Set(materials.map((m) => m.guid));

  let brepKeep: Record<string, unknown> | undefined;
  const imgListEarly = Array.isArray(json.images) ? (json.images as Record<string, unknown>[]) : [];
  const definitions: DefinitionDoc[] = (list as unknown[]).map((raw, di) => {
    if (!isObj(raw)) fail(`definition ${di} invalid`);
    const d = raw as Record<string, unknown>;
    if (!isObj(d.brep)) fail(`definition ${di} has no brep`);
    const brepJson = migrateExtension("CATSUP_brep", d.brep as Record<string, unknown>, notes) as unknown as CatsupBrepJson;
    const brep = decodeBrep(brepJson, view);
    if (di === rootIdx) {
      // 携带未知属性层；本版已解析的层（边 u8 流 / 面 u16 流）不携带——否则重写时会多一份孤儿 bufferView，字节不幂等
      const attrs: Record<string, Record<string, unknown>> = {};
      for (const [dom, layers] of Object.entries(brepJson.attributes ?? {})) {
        const keep: Record<string, unknown> = {};
        for (const [n, st] of Object.entries(layers ?? {})) {
          const ct = isObj(st) ? (st as Record<string, unknown>).componentType : undefined;
          const ours = (dom === "edge" && (ct === "uint8" || ct === undefined) && isObj(st) && typeof (st as Record<string, unknown>).bufferView === "number") || (dom === "face" && ct === "uint16");
          if (!ours) keep[n] = st;
        }
        attrs[dom] = keep;
      }
      brepKeep = { attributes: attrs, curves: brepJson.curves, ...(brepJson.extras ? { extras: brepJson.extras } : {}) };
    }
    const groupSeen = new Set<Guid>();
    const groupGuids: Guid[] = (Array.isArray(d.groups) ? d.groups : []).map((g: unknown) => ownGuid(isObj(g) ? (g as Record<string, unknown>).guid : undefined, groupSeen, reminted));
    const groupKnown = new Set(groupGuids);
    const groups: GroupDoc[] = (Array.isArray(d.groups) ? d.groups : []).map((gRaw: unknown, gi: number) => {
      if (!isObj(gRaw) || !isObj(gRaw.brep)) fail(`definition ${di} group ${gi} invalid`);
      const g = gRaw as Record<string, unknown>;
      const gj = migrateExtension("CATSUP_brep", g.brep as Record<string, unknown>, notes) as unknown as CatsupBrepJson;
      return { guid: groupGuids[gi], parent: isGuid(g.parent) && groupKnown.has(g.parent) ? g.parent : null, axes: frameOf(g.axes, `group ${gi} axes`), guides: guidesOf(g.guides, `group ${gi} guides`), brep: decodeBrep(gj, view), ...(typeof g.name === "string" ? { name: g.name } : {}) };
    });
    const instSeen = new Set<Guid>();
    const instances: InstanceDoc[] = (Array.isArray(d.instances) ? d.instances : []).map((iRaw: unknown, ii: number) => {
      if (!isObj(iRaw)) fail(`definition ${di} instance ${ii} invalid`);
      const inst = iRaw as Record<string, unknown>;
      if (!isGuid(inst.definition) || !defSeen.has(inst.definition)) fail(`definition ${di} instance ${ii} references a missing definition`);
      const m = inst.matrix;
      if (!Array.isArray(m) || m.length !== 12 || !m.every((v) => typeof v === "number")) fail(`definition ${di} instance ${ii} matrix must have 12 numbers`);
      return { guid: ownGuid(inst.guid, instSeen, reminted), definition: inst.definition as Guid, parent: isGuid(inst.parent) && groupKnown.has(inst.parent) ? inst.parent : null, xform: m as unknown as Xform, ...(inst.locked === true ? { locked: true } : {}), ...(typeof inst.layer === "number" ? { layer: inst.layer } : {}), ...(inst.hidden === true ? { hidden: true } : {}), ...(typeof inst.name === "string" ? { name: inst.name } : {}) };
    });
    // 槽表值：材质 GUID / 内置默认背面；内置默认正面的唯一表示是「槽缺」，读到 = 没有（§9.2-A a；notes 记一笔）。
    const materialSlots = (Array.isArray(d.materialSlots) ? d.materialSlots : []).map((x: unknown) => { if (x === BUILTIN_FRONT_GUID) { notes.builtinFrontSlots = (notes.builtinFrontSlots ?? 0) + 1; return null; } return isGuid(x) && (x === BUILTIN_BACK_GUID || matKnown.has(x)) ? x : null; });
    // 门 1：definition 的种类。缺省 brep；0.14 起认 mesh（载荷：definitions v5；card 在 v6 退场 = 迁成空 brep）；别的种类 → 拒开说清（开了再存会把它丢掉 = 数据丢失，比拒开更坏）。
    const kindRaw = d.kind === undefined ? "brep" : d.kind;
    if (kindRaw !== "brep" && kindRaw !== "mesh") fail(`definition ${di} kind "${String(d.kind)}" is not supported by this version`);
    const kind = kindRaw as BodyKind;
    const sliceOf = (bv: number): ArrayBuffer => { const u = view(bv); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer; };
    let payload: Partial<DefinitionDoc> = {};
    if (kind === "mesh") {
      if (!isObj(d.mesh)) fail(`definition ${di} mesh payload missing`);
      payload = { mesh: decodeMeshItem(d.mesh as Record<string, unknown>, sliceOf, notes, `definition ${di}`, fail) };   // CATSUP_mesh：多边形载荷；没 faceStart = 0.14 三角汤（migrate/mesh.ts）
    }
    return { guid: defGuids[di], name: typeof d.name === "string" ? d.name : di === rootIdx ? "model" : `definition ${di}`, kind, ...payload, brep, groups, instances, materialSlots, guides: guidesOf(d.guides, `definition ${di} guides`), ...(isObj(d.drawFrame) ? { drawFrame: frameOf(d.drawFrame, `definition ${di} drawFrame`) } : {}), ...(isObj(d.extras) ? { extras: d.extras as Record<string, unknown> } : {}) };
  });

  // 缩略图
  let thumbnail: CatsupDocument["thumbnail"];
  const thumbIdx = (json.asset as Record<string, unknown>).thumbnail;
  if (typeof thumbIdx === "number" && Array.isArray(json.images) && isObj(json.images[thumbIdx])) {
    const img = json.images[thumbIdx] as Record<string, unknown>;
    if (typeof img.bufferView === "number") thumbnail = { mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/jpeg", bytes: new Uint8Array(view(img.bufferView)) };
  }

  // round-trip 保真：未知顶层键 / 未知扩展 / 文档与定义扩展里的未知键 / 根池 brep 里的属性层等
  const OURS_TOP = new Set(["asset", "extensionsUsed", "extensionsRequired", "buffers", "bufferViews", "accessors", "images", "textures", "materials", "meshes", "nodes", "scenes", "scene", "extensions"]);
  const topLevel: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) if (!OURS_TOP.has(k)) topLevel[k] = v;
  const extensions: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(exts)) if (k !== "CATSUP_document" && k !== "CATSUP_definitions" && k !== "CATSUP_desk" && k !== "CATSUP_references" && k !== "CATSUP_shelf" && k !== "CATSUP_textures") extensions[k] = v;
  if (texturesRaw) extensions.CATSUP_textures = texturesRaw;   // 贴图表太新：原字节原样写回
  // 桌面态 CATSUP_desk（§5.7）：major 比本版新 → **不拒开**（WeebPaint desk 同款）：原字节进 carry.extensions 原样写回、这边用默认、notes 记一笔；
  // 没有这个扩展（老文件）→ 默认 + 老位置的 document.lastView（§7.2 保留读）。
  let desk: DeskDoc = defaultDesk();
  if (isObj(exts.CATSUP_desk)) {
    const raw = exts.CATSUP_desk as Record<string, unknown>;
    try {
      const dj = migrateExtension("CATSUP_desk", raw, notes);
      const DESK_KEYS = new Set(["version", "minor", "patch", "menuTabs", "lastView", "refPanel", "locked", "style", "screen", "exportModel"]);
      const extra: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dj)) if (!DESK_KEYS.has(k)) extra[k] = v;
      const refPanel = refPanelOf(dj.refPanel);
      desk = { menuTabs: menuTabsOf(dj.menuTabs), ...(dj.lastView !== undefined ? { lastView: dj.lastView } : {}), ...(refPanel ? { refPanel } : {}), ...(dj.locked === true ? { locked: true } : {}), ...(typeof dj.style === "string" ? { style: dj.style } : {}), ...(typeof dj.screen === "string" ? { screen: dj.screen } : {}), ...(isObj(dj.exportModel) ? { exportModel: Object.fromEntries(Object.entries(dj.exportModel).filter((e): e is [string, string] => typeof e[1] === "string")) } : {}), extra };   // 风格 / 屏幕（desk 1.3）：只认字符串   // 演示锁（desk 1.2）：只认 true
    } catch (e) {
      if (!(e instanceof FormatTooNewError)) throw e;
      extensions.CATSUP_desk = raw;
      notes.deskTooNew = readStamp(raw);
    }
  } else if (docExt.lastView !== undefined) desk.lastView = docExt.lastView;
  // 参考窗牌组 CATSUP_references（§5.8）：没有 = 空；major 比本版新 → 不拒开（同 desk）：原字节进 carry.extensions 原样写回、这边空、notes 记一笔。
  //   本层只搬字节：files[i] = { path, mimeType, bufferView }，清单 manifest.json 对这里不透明；坏条目（路径重复 / 缺 bufferView）整份拒开（与其他字段同口径，不静默丢卡）。
  let references: ReferencesDoc = emptyReferences();
  let referencesExtraRaw: Record<string, unknown> = {};
  if (isObj(exts.CATSUP_references)) {
    const raw = exts.CATSUP_references as Record<string, unknown>;
    try {
      const rj = migrateExtension("CATSUP_references", raw, notes);
      const seen = new Set<string>();
      const files = (Array.isArray(rj.files) ? rj.files : []).map((f: unknown, i: number) => {
        if (!isObj(f)) fail(`CATSUP_references.files[${i}] invalid`);
        const F = f as Record<string, unknown>;
        if (typeof F.path !== "string" || !F.path || seen.has(F.path)) fail(`CATSUP_references.files[${i}] path missing or duplicated`);
        if (typeof F.bufferView !== "number") fail(`CATSUP_references.files[${i}] has no bufferView`);
        seen.add(F.path as string);
        return { path: F.path as string, mimeType: typeof F.mimeType === "string" ? F.mimeType : "", bytes: new Uint8Array(view(F.bufferView as number)) };
      });
      for (const [k, v] of Object.entries(rj)) if (k !== "version" && k !== "minor" && k !== "patch" && k !== "files") referencesExtraRaw[k] = v;
      references = { files, extra: {} };
    } catch (e) {
      if (!(e instanceof FormatTooNewError)) throw e;
      extensions.CATSUP_references = raw;
      notes.referencesTooNew = readStamp(raw);
    }
  }
  // 素材架 CATSUP_shelf（计划书 §2.8）：没有 = 没有架子；major 比本版新 → 不拒开（同 desk）：原字节带回、架子先空。引用悬空（东西已经不在文件里）= 丢掉那一格、记一笔，不猜、不造。
  let shelf: ShelfDoc | undefined;
  if (isObj(exts.CATSUP_shelf)) {
    const raw = exts.CATSUP_shelf as Record<string, unknown>;
    try {
      shelf = readShelf(migrateExtension("CATSUP_shelf", raw, notes), defSeen, matKnown, notes);
    } catch (e) {
      if (!(e instanceof FormatTooNewError)) throw e;
      extensions.CATSUP_shelf = raw;
      notes.shelfTooNew = readStamp(raw);
    }
  }
  const DOC_KEYS = new Set(["version", "minor", "patch", "formatVersion", "settings", "bake", "lastView", "axes", "layers", "final", "finalRev"]);
  const documentExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(docExt)) if (!DOC_KEYS.has(k)) documentExtra[k] = v;
  const DEF_KEYS = new Set(["version", "minor", "patch", "root", "list"]);
  const definitionsExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(defsExt)) if (!DEF_KEYS.has(k)) definitionsExtra[k] = v;

  const views = new Map<number, Uint8Array>();
  for (const i of collectBufferViewRefs([topLevel, extensions, documentExtra, definitionsExtra, brepKeep ?? {}, referencesExtraRaw, texturesExtraRaw])) views.set(i, new Uint8Array(view(i)));
  references.extra = referencesExtraRaw;   // 直通的未知键（里面的 bufferView 仍是文件里的旧索引；写入器经 carry.views 重映射）
  const settingsIn = isObj(docExt.settings) ? (docExt.settings as Record<string, unknown>) : {};
  const bake = isObj(docExt.bake) ? (docExt.bake as Record<string, unknown>) : {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...settingsIn } as CatsupDocument["settings"],
    axes: frameOf(docExt.axes, "document.axes"),
    layers: (() => { const layerSeen = new Set<Guid>([DEFAULT_LAYER_GUID]); const raw = Array.isArray(docExt.layers) ? (docExt.layers as unknown[]) : []; const ls: LayerDoc[] = raw.filter(isObj).map((l) => { const o = l as Record<string, unknown>; const id = typeof o.id === "number" ? o.id : 0; return { id, guid: id === 0 ? DEFAULT_LAYER_GUID : ownGuid(o.guid, layerSeen, reminted), name: typeof o.name === "string" ? o.name : `层 ${String(o.id)}`, visible: o.visible !== false, ...(Array.isArray(o.color) && o.color.length === 3 ? { color: [o.color[0], o.color[1], o.color[2]] as [number, number, number] } : {}) }; }); if (!ls.some((l) => l.id === 0)) ls.unshift({ ...DEFAULT_LAYER }); return ls; })(),
    ...(isFinalRecord(docExt.final) ? { final: { at: docExt.final.at, rev: docExt.final.rev, app: typeof docExt.final.app === "string" ? docExt.final.app : "", fingerprint: docExt.final.fingerprint } } : {}),
    ...(typeof docExt.finalRev === "number" ? { finalRev: docExt.finalRev } : {}),
    desk,
    references,
    bakeMode: bake.mode === "engine" ? "engine" : "wysiwyg",
    definitions,
    rootIndex: rootIdx,
    root: definitions[rootIdx],
    materials,
    textures,
    ...(shelf && !shelfIsEmpty(shelf) ? { shelf } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    carry: { topLevel, extensions, documentExtra, definitionsExtra, ...(brepKeep ? { brepKeep } : {}), ...(Object.keys(texturesExtraRaw).length ? { texturesExtra: texturesExtraRaw } : {}), views },
    ...(notes.newerMinor.length || notes.newerPatch.length || notes.deskTooNew || notes.referencesTooNew || notes.shelfTooNew || notes.danglingShelfRefs || notes.builtinFrontSlots || notes.remintedGuids || notes.texturesTooNew || notes.danglingTextureRefs || notes.unknownTextureKinds ? { readNotes: notes } : {}),
  };
}
