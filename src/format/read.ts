// read.ts —— .glb 字节 → CatsupDocument（迁移到当前版；拒开比 app 新的；未知内容保留）。
// 不构造 Kernel——那是调用方 `Kernel.fromBrep(doc.root.brep)` 的活（拓扑校验在内核）。created 2026-09-20 by Claude Fable 5.1

import { decodeGlb } from "./glb.ts";
import { sliceBin } from "./binary.ts";
import { decodeBrep, type CatsupBrepJson } from "./brep-codec.ts";
import type { CatsupDocument } from "./document.ts";
import { DEFAULT_SETTINGS } from "./document.ts";
import { migrateExtension } from "./migrate/index.ts";
import { assertReadableGltfVersion } from "./migrate/gltf/index.ts";

const fail = (msg: string): never => { throw new Error(`readCatsup: ${msg}`); };
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

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
  if (typeof rootIdx !== "number") fail("CATSUP_definitions.root missing");
  const rootDefRaw: unknown = (list as unknown[])[rootIdx as number];
  if (!isObj(rootDefRaw)) fail("CATSUP_definitions.root invalid");
  const rootDef = rootDefRaw as Record<string, unknown>;
  if (!isObj(rootDef.brep)) fail("root definition has no brep");
  const brepJson = migrateExtension("CATSUP_brep", rootDef.brep as Record<string, unknown>) as unknown as CatsupBrepJson;
  const brep = decodeBrep(brepJson, view);

  // 缩略图
  let thumbnail: CatsupDocument["thumbnail"];
  const thumbIdx = (json.asset as Record<string, unknown>).thumbnail;
  if (typeof thumbIdx === "number" && Array.isArray(json.images) && isObj(json.images[thumbIdx])) {
    const img = json.images[thumbIdx] as Record<string, unknown>;
    if (typeof img.bufferView === "number") thumbnail = { mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/jpeg", bytes: new Uint8Array(view(img.bufferView)) };
  }

  // round-trip 保真：未知顶层键 / 未知扩展 / 文档与定义扩展里的未知键 / brep 里的属性层等
  const OURS_TOP = new Set(["asset", "extensionsUsed", "extensionsRequired", "buffers", "bufferViews", "accessors", "images", "meshes", "nodes", "scenes", "scene", "extensions"]);
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
  const brepKeep = { attributes: brepJson.attributes, curves: brepJson.curves, groups: brepJson.groups, ...(brepJson.extras ? { extras: brepJson.extras } : {}) };

  const settingsIn = isObj(docExt.settings) ? (docExt.settings as Record<string, unknown>) : {};
  const bake = isObj(docExt.bake) ? (docExt.bake as Record<string, unknown>) : {};
  return {
    settings: { ...DEFAULT_SETTINGS, ...settingsIn } as CatsupDocument["settings"],
    ...(docExt.lastView !== undefined ? { lastView: docExt.lastView } : {}),
    bakeMode: bake.mode === "engine" ? "engine" : "wysiwyg",
    root: { name: typeof rootDef.name === "string" ? rootDef.name : "model", brep, ...(isObj(rootDef.extras) ? { extras: rootDef.extras as Record<string, unknown> } : {}) },
    ...(thumbnail ? { thumbnail } : {}),
    carry: { topLevel, extensions, documentExtra, definitionsExtra, brepKeep },
  };
}
