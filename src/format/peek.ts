// peek.ts —— 只看字节头的两件事（validateAdopt / 图库封面）：① 是不是 CatsUp 文档；② 抠出 asset.thumbnail 的图片字节。
// 头片 peek 的 app 侧解析（store 那半 = 通用「取头片」escalate 中；现在拿全量字节也能用）。created 2026-09-20 by Claude Fable 5.1
import { isGlb } from "./glb.ts";

const HEADER = 12, CHUNK = 8, CHUNK_JSON = 0x4e4f534a, CHUNK_BIN = 0x004e4942;

/** 解析 GLB 头 + JSON chunk + BIN 位置（bytes 可以只是文件头片：够到 JSON chunk 末即可）。 */
export function parseGlbHead(bytes: Uint8Array): { json: Record<string, unknown>; binOffset: number; binLength: number } | null {
  if (!isGlb(bytes)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < HEADER + CHUNK) return null;
  const jsonLen = dv.getUint32(HEADER, true);
  if (dv.getUint32(HEADER + 4, true) !== CHUNK_JSON || bytes.byteLength < HEADER + CHUNK + jsonLen) return null;
  let json: unknown;
  try { json = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER + CHUNK, HEADER + CHUNK + jsonLen))); } catch { return null; }
  if (typeof json !== "object" || json === null) return null;
  const binHead = HEADER + CHUNK + jsonLen;
  let binOffset = -1, binLength = 0;
  if (bytes.byteLength >= binHead + CHUNK && dv.getUint32(binHead + 4, true) === CHUNK_BIN) { binLength = dv.getUint32(binHead, true); binOffset = binHead + CHUNK; }
  return { json: json as Record<string, unknown>, binOffset, binLength };
}

export function isCatsupDocumentHead(bytes: Uint8Array): boolean {
  const h = parseGlbHead(bytes);
  if (!h) return false;
  const used = h.json.extensionsUsed;
  return Array.isArray(used) && used.includes("CATSUP_document");
}

/** 从字节（全量或足够长的头片）抠出缩略图；没有 = null。 */
export function extractThumbnail(bytes: Uint8Array): { mimeType: string; bytes: Uint8Array } | null {
  const h = parseGlbHead(bytes);
  if (!h || h.binOffset < 0) return null;
  const asset = h.json.asset as Record<string, unknown> | undefined;
  const idx = asset?.thumbnail;
  const images = h.json.images as Record<string, unknown>[] | undefined;
  const views = h.json.bufferViews as Record<string, unknown>[] | undefined;
  if (typeof idx !== "number" || !images?.[idx] || !views) return null;
  const img = images[idx];
  const bv = typeof img.bufferView === "number" ? views[img.bufferView] : undefined;
  if (!bv || typeof bv.byteLength !== "number") return null;
  const off = h.binOffset + (typeof bv.byteOffset === "number" ? bv.byteOffset : 0), len = bv.byteLength as number;
  if (off + len > bytes.byteLength) return null;
  return { mimeType: typeof img.mimeType === "string" ? img.mimeType : "image/jpeg", bytes: bytes.slice(off, off + len) };
}
