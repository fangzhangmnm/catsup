// read.ts —— .glb 字节 → CatsupDocument（迁移到当前版；拒开比 app 新的；未知内容保留）。
// 不构造 Kernel / Scene——那是 scene-doc.ts `sceneFromDocument` 的活（拓扑校验在内核）。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21）：definitions 全读（groups / instances）；root = 其中一个。

import { decodeGlb } from "./glb.ts";
import { sliceBin } from "./binary.ts";
import { decodeBrep, type CatsupBrepJson } from "./brep-codec.ts";
import type { CatsupDocument, DefinitionDoc, GroupDoc, InstanceDoc, MaterialDoc } from "./document.ts";
import { DEFAULT_SETTINGS } from "./document.ts";
import { migrateExtension } from "./migrate/index.ts";
import { assertReadableGltfVersion } from "./migrate/gltf/index.ts";
import { collectBufferViewRefs } from "./carry.ts";
import type { Frame, Xform } from "../scene/xform.ts";
import { WORLD_FRAME } from "../scene/xform.ts";

const fail = (msg: string): never => { throw new Error(`readCatsup: ${msg}`); };
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

/** 只看 JSON：是不是 CatsUp 文档（validateAdopt 用；外来 glb 不 adopt）。 */
export function isCatsupGltf(json: unknown): boolean {
  return isObj(json) && Array.isArray(json.extensionsUsed) && json.extensionsUsed.includes("CATSUP_document") && isObj(json.extensions) && isObj(json.extensions.CATSUP_document);
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
  const docExt = migrateExtension("CATSUP_document", exts.CATSUP_document as Record<string, unknown>);
  if (!isObj(exts.CATSUP_definitions)) fail("missing CATSUP_definitions");
  const defsExt = migrateExtension("CATSUP_definitions", exts.CATSUP_definitions as Record<string, unknown>);
  const list = defsExt.list;
  const rootIdx = defsExt.root;
  if (!Array.isArray(list)) fail("CATSUP_definitions.list missing");
  if (typeof rootIdx !== "number" || !(rootIdx in (list as unknown[]))) fail("CATSUP_definitions.root invalid");

  let brepKeep: Record<string, unknown> | undefined;
  const definitions: DefinitionDoc[] = (list as unknown[]).map((raw, di) => {
    if (!isObj(raw)) fail(`definition ${di} invalid`);
    const d = raw as Record<string, unknown>;
    if (!isObj(d.brep)) fail(`definition ${di} has no brep`);
    const brepJson = migrateExtension("CATSUP_brep", d.brep as Record<string, unknown>) as unknown as CatsupBrepJson;
    const brep = decodeBrep(brepJson, view);
    if (di === rootIdx) brepKeep = { attributes: brepJson.attributes, curves: brepJson.curves, ...(brepJson.extras ? { extras: brepJson.extras } : {}) };
    const groups: GroupDoc[] = (Array.isArray(d.groups) ? d.groups : []).map((gRaw: unknown, gi: number) => {
      if (!isObj(gRaw) || !isObj(gRaw.brep)) fail(`definition ${di} group ${gi} invalid`);
      const g = gRaw as Record<string, unknown>;
      const gj = migrateExtension("CATSUP_brep", g.brep as Record<string, unknown>) as unknown as CatsupBrepJson;
      return { id: typeof g.id === "number" ? g.id : gi + 1, parent: typeof g.parent === "number" ? g.parent : null, axes: frameOf(g.axes, `group ${gi} axes`), brep: decodeBrep(gj, view), ...(typeof g.name === "string" ? { name: g.name } : {}) };
    });
    const instances: InstanceDoc[] = (Array.isArray(d.instances) ? d.instances : []).map((iRaw: unknown, ii: number) => {
      if (!isObj(iRaw)) fail(`definition ${di} instance ${ii} invalid`);
      const inst = iRaw as Record<string, unknown>;
      if (typeof inst.definition !== "number" || !(inst.definition in (list as unknown[]))) fail(`definition ${di} instance ${ii} references a missing definition`);
      const m = inst.matrix;
      if (!Array.isArray(m) || m.length !== 12 || !m.every((v) => typeof v === "number")) fail(`definition ${di} instance ${ii} matrix must have 12 numbers`);
      return { id: typeof inst.id === "number" ? inst.id : ii + 1, definition: inst.definition as number, parent: typeof inst.parent === "number" ? inst.parent : null, xform: m as unknown as Xform, ...(typeof inst.name === "string" ? { name: inst.name } : {}) };
    });
    const materialSlots = (Array.isArray(d.materialSlots) ? d.materialSlots : []).map((x: unknown) => (typeof x === "number" ? x : -1));
    return { name: typeof d.name === "string" ? d.name : di === rootIdx ? "model" : `definition ${di}`, brep, groups, instances, materialSlots, ...(isObj(d.extras) ? { extras: d.extras as Record<string, unknown> } : {}) };
  });

  // 材质：glTF core materials（baseColorFactor / baseColorTexture → images）+ CATSUP_material{sizeM}
  const texList = Array.isArray(json.textures) ? (json.textures as Record<string, unknown>[]) : [];
  const imgList = Array.isArray(json.images) ? (json.images as Record<string, unknown>[]) : [];
  const materials: MaterialDoc[] = (Array.isArray(json.materials) ? (json.materials as Record<string, unknown>[]) : []).map((m, mi) => {
    const pbr = isObj(m.pbrMetallicRoughness) ? (m.pbrMetallicRoughness as Record<string, unknown>) : {};
    const bc = Array.isArray(pbr.baseColorFactor) ? (pbr.baseColorFactor as number[]) : [0.8, 0.8, 0.8, 1];
    const out: MaterialDoc = { name: typeof m.name === "string" ? m.name : `material ${mi}`, color: [bc[0] ?? 0.8, bc[1] ?? 0.8, bc[2] ?? 0.8] };
    const bt = isObj(pbr.baseColorTexture) ? (pbr.baseColorTexture as Record<string, unknown>) : null;
    if (bt && typeof bt.index === "number" && isObj(texList[bt.index])) {
      const src = (texList[bt.index] as Record<string, unknown>).source;
      const img = typeof src === "number" ? imgList[src] : undefined;
      if (isObj(img) && typeof img.bufferView === "number") {
        const ext = isObj(m.extensions) && isObj((m.extensions as Record<string, unknown>).CATSUP_material) ? migrateExtension("CATSUP_material", (m.extensions as Record<string, unknown>).CATSUP_material as Record<string, unknown>) : {};
        const sz = Array.isArray(ext.sizeM) && ext.sizeM.length === 2 ? (ext.sizeM as number[]) : [1, 1];
        out.texture = { mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/png", bytes: new Uint8Array(view(img.bufferView)), sizeM: [sz[0], sz[1]] };
      }
    }
    return out;
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
  for (const [k, v] of Object.entries(exts)) if (k !== "CATSUP_document" && k !== "CATSUP_definitions") extensions[k] = v;
  const DOC_KEYS = new Set(["version", "formatVersion", "settings", "bake", "lastView"]);
  const documentExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(docExt)) if (!DOC_KEYS.has(k)) documentExtra[k] = v;
  const DEF_KEYS = new Set(["version", "root", "list"]);
  const definitionsExtra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(defsExt)) if (!DEF_KEYS.has(k)) definitionsExtra[k] = v;

  const views = new Map<number, Uint8Array>();
  for (const i of collectBufferViewRefs([topLevel, extensions, documentExtra, definitionsExtra, brepKeep ?? {}])) views.set(i, new Uint8Array(view(i)));
  const settingsIn = isObj(docExt.settings) ? (docExt.settings as Record<string, unknown>) : {};
  const bake = isObj(docExt.bake) ? (docExt.bake as Record<string, unknown>) : {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...settingsIn } as CatsupDocument["settings"],
    ...(docExt.lastView !== undefined ? { lastView: docExt.lastView } : {}),
    bakeMode: bake.mode === "engine" ? "engine" : "wysiwyg",
    definitions,
    rootIndex: rootIdx as number,
    root: definitions[rootIdx as number],
    materials,
    ...(thumbnail ? { thumbnail } : {}),
    carry: { topLevel, extensions, documentExtra, definitionsExtra, ...(brepKeep ? { brepKeep } : {}), views },
  };
}
