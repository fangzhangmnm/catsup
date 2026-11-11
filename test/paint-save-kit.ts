// paint-save-kit.ts —— 画存进文件那几份测试共用的架子（贴图主线 1-8b；测试文件之间不许互相 import，共用的放这里）。created 2026-11-11 by Claude Opus 5.5
// node 里没有 zip.js 和 DOMParser：用画画内核自带的两个垫片（内核测试也是这么跑的）。解开分层字节 / PNG 用内核的解码（和浏览器里同一份）。
import "../src/paint/kernel/test/kernel-shim.mjs";
import { installDomParserShim } from "../src/paint/kernel/test/xml-shim.mjs";
import { decodeOraToPainting } from "../src/paint/kernel/src/backend/ora.ts";
import { decodePngToBytes } from "../src/paint/kernel/src/backend/png-codec.ts";
import type { PaintingData } from "../src/paint/kernel/src/backend/workpiece/painting-workpiece.ts";
installDomParserShim();

/** 分层字节 → 内核的平铺数据（和读进画板时同一条路）。 */
export async function decodeOra(ora: Uint8Array): Promise<PaintingData> { const d = await decodeOraToPainting(new Blob([ora])); return ((d as { data?: PaintingData }).data ?? (d as unknown as PaintingData)); }
/** PNG → RGBA 字节。 */
export async function decodePng(png: Uint8Array): Promise<{ data: Uint8ClampedArray; w: number; h: number }> { return decodePngToBytes(png); }
/** 一份平铺数据的指纹：大小 + 每层（名字、看不看得见、不透明度、混合、像素范围 + 字节哈希）。 */
export function dataPrint(d: PaintingData): string {
  const h = (u: Uint8ClampedArray): string => { let x = 2166136261; for (let i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); } return (x >>> 0).toString(16); };
  const leaf = (n: { name: string; visible: boolean; opacity: number; mode: string; pixels: { rect: { x: number; y: number; w: number; h: number }; bytes: Uint8ClampedArray } | null }): string => `${n.name}|${n.visible}|${n.opacity}|${n.mode}|${n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${h(n.pixels.bytes)}` : "空"}`;
  return `${d.width}x${d.height} ` + (d.nodes as unknown as Parameters<typeof leaf>[0][]).map(leaf).join(" / ");
}
/** 几层、有透明、有不透明度、有一层藏着：灌进画板的那份（宽高 = 画板的）。 */
export function layeredData(w: number, h: number, seed: number): PaintingData {
  let s = seed >>> 0; const r = (): number => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const block = (bw: number, bh: number, holes: boolean): Uint8ClampedArray => { const px = new Uint8ClampedArray(bw * bh * 4); for (let i = 0; i < px.length; i += 4) { const a = holes && r() < 0.3 ? 0 : 60 + Math.floor(r() * 196); px[i] = a ? Math.floor(r() * 256) : 0; px[i + 1] = a ? Math.floor(r() * 256) : 0; px[i + 2] = a ? Math.floor(r() * 256) : 0; px[i + 3] = a; } return px; };
  let id = 0;
  const leaf = (name: string, rect: { x: number; y: number; w: number; h: number }, o: { holes?: boolean; opacity?: number; visible?: boolean } = {}) => ({ id: ++id, name, visible: o.visible ?? true, opacity: o.opacity ?? 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect, bytes: block(rect.w, rect.h, !!o.holes) } });
  return { width: w, height: h, nodes: [
    leaf("底", { x: 0, y: 0, w: Math.min(w, 300), h: Math.min(h, 60) }, { holes: true }),
    leaf("半透明", { x: 40, y: 10, w: 120, h: 30 }, { opacity: 0.5 }),
    leaf("藏着的", { x: 200, y: 5, w: 50, h: 20 }, { visible: false }),
  ] };
}
