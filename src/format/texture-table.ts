// format/texture-table.ts —— CATSUP_textures 1.0 的一行 ↔ TextureDoc（读 / 写两端同一份）。
// created 2026-11-10 by Claude Opus 5.5（贴图主线 1-0½；形状 = 施工单 ai-docs/20261110-paint-workorders-2.md 第一节，Fable 定）。
// · 字节一律是 `{ "bufferView": N }`（不是图片下标）：老版本不认识这个扩展、原样带回时只会改 bufferView 的号（carry.ts）。
// · 不认识的 content 种类、行里不认识的键：连同它们引用的字节一起自带（CarriedJson），离开这份文件也完整（跨文件粘贴）；写盘时换成新落的 bufferView。
// · sizeM 和 layout 正好有一个；两个都有或都没有 = 读取失败、说是哪一行。
import { collectBufferViewRefs, remapBufferViewRefs } from "./carry.ts";
import type { ViewSink } from "./brep-codec.ts";
import type { CarriedJson, TextureContent, TextureDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
import { ownGuid, type Guid } from "./guid.ts";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
/** 行里本版认识的键（其余的原样带回）。 */
const ROW_KEYS = new Set(["guid", "name", "value", "content", "sizeM", "layout"]);
const fail = (msg: string): never => { throw new Error(`readCatsup: CATSUP_textures ${msg}`); };

/** 一段 JSON 连同它引用的字节（按文件里的号）拷出来。 */
export function carryJson(json: unknown, view: (bv: number) => Uint8Array): CarriedJson {
  const views = new Map<number, Uint8Array>();
  for (const i of collectBufferViewRefs(json)) views.set(i, new Uint8Array(view(i)));
  return { json, views };
}
/** 写盘：自带的字节各落一条新 bufferView，JSON 里的旧号换成新号。 */
export function landCarried(c: CarriedJson, sink: ViewSink): unknown {
  const map = new Map<number, number>();
  for (const [old, bytes] of c.views) map.set(old, sink.add(bytes));
  return remapBufferViewRefs(c.json, (old) => { const n = map.get(old); if (n === undefined) throw new Error(`writeCatsup: texture row references bufferView ${old} that was not carried`); return n; });
}
const viewRef = (x: unknown, what: string): number => (isObj(x) && typeof x.bufferView === "number" ? x.bufferView : fail(`${what} must be { bufferView }`));
const sizeOf = (x: unknown, what: string): [number, number] => {
  if (!Array.isArray(x) || x.length !== 2 || !x.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0)) fail(`${what}.sizeM must be two numbers > 0`);
  return [(x as number[])[0], (x as number[])[1]];
};

/** 读一行。seen / reminted = 身份去重（重复或不合法的 GUID 现铸，和别的条目一样）。 */
export function readTextureRow(raw: unknown, i: number, view: (bv: number) => Uint8Array, seen: Set<Guid>, reminted: () => void, notes: FormatReadNotes): TextureDoc {
  if (!isObj(raw)) fail(`list[${i}] invalid`);
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name : "", what = `list[${i}]${name ? `「${name}」` : ""}`;
  if (!isObj(r.content)) fail(`${what} has no content`);
  const c = r.content as Record<string, unknown>;
  let content: TextureContent;
  if (c.kind === "image") content = { kind: "image", mimeType: typeof c.mimeType === "string" ? c.mimeType : "image/png", bytes: new Uint8Array(view(viewRef(c.bytes, `${what}.content.bytes`))) };
  else if (c.kind === "layered") content = { kind: "layered", ora: new Uint8Array(view(viewRef(c.ora, `${what}.content.ora`))) };
  else { content = { kind: "other", raw: carryJson(c, view) }; notes.unknownTextureKinds = (notes.unknownTextureKinds ?? 0) + 1; }   // 更新版写的种类：整段原样带回
  const hasSize = r.sizeM !== undefined, hasLayout = r.layout !== undefined;
  if (hasSize === hasLayout) fail(`${what} must have exactly one of sizeM / layout`);
  const extraJson: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) if (!ROW_KEYS.has(k)) extraJson[k] = v;
  return {
    guid: ownGuid(r.guid, seen, reminted),
    name,
    value: r.value,
    content,
    ...(hasSize ? { sizeM: sizeOf(r.sizeM, what) } : { layout: r.layout }),
    ...(Object.keys(extraJson).length ? { extra: carryJson(extraJson, view) } : {}),
  };
}

/** 写一行。imageView = 原图那份字节的 bufferView（和标准那一半的 images[] 共用一条；write.ts 记着每张图落在哪）。不认识的键先铺、认识的后铺（已知键永远赢）。 */
export function writeTextureRow(t: TextureDoc, sink: ViewSink, imageView: (t: TextureDoc) => number): Record<string, unknown> {
  const c = t.content;
  const content = c.kind === "image" ? { kind: "image", mimeType: c.mimeType, bytes: { bufferView: imageView(t) } }
    : c.kind === "layered" ? { kind: "layered", ora: { bufferView: sink.add(c.ora) } }
    : landCarried(c.raw, sink);
  return {
    ...(t.extra ? (landCarried(t.extra, sink) as Record<string, unknown>) : {}),
    guid: t.guid,
    name: t.name,
    ...(t.value !== undefined ? { value: t.value } : {}),
    content,
    ...(t.sizeM ? { sizeM: [t.sizeM[0], t.sizeM[1]] } : {}),
    ...(t.layout !== undefined ? { layout: t.layout } : {}),
  };
}
