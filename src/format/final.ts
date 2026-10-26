// final.ts —— 定稿记录 + 内容指纹（仿 MoonSinger src/format/final.ts；设计 = ai-docs/20261024-finalize.md）。created 2026-10-24 by Claude Fable 5.1
// 指纹盖：definitions（规范序 brep + groups + instances + guides + materialSlots）+ materials（名 / 色 / 贴图字节 sha256 + 尺寸）+ axes；
// 不含 settings / desk（含 lastView）/ thumbnail（视图态不是内容）。sha256 走 WebCrypto（浏览器 / node 都有 globalThis.crypto.subtle）。
import type { CatsupDocument, DefinitionDoc } from "./document.ts";
import { canonicalize } from "./brep-codec.ts";

export interface FinalRecord { at: string; rev: number; app: string; fingerprint: string; }

const hex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256(bytes: Uint8Array): Promise<string> { return hex(await crypto.subtle.digest("SHA-256", bytes as BufferSource)); }
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;
const p3 = (p: { x: number; y: number; z: number }): number[] => [r6(p.x), r6(p.y), r6(p.z)];

/** 内容指纹（sha256 hex）。同一内容任何写法 / 任何顶点顺序都一样（brep 规范序）；视图（desk）/ 设置 / 缩略图不进。 */
export async function contentFingerprint(doc: CatsupDocument): Promise<string> {
  const mats: unknown[] = [];
  for (const m of doc.materials) mats.push({ n: m.name, c: m.color.map(r6), t: m.texture ? { h: await sha256(m.texture.bytes), s: m.texture.sizeM.map(r6) } : null });
  const brepJson = (b: CatsupDocument["root"]["brep"]): unknown => {
    const c = canonicalize(b);
    return { v: c.vertices.map(p3), e: c.edges, f: c.faces.map((f) => ({ p: f.plane, o: f.outer, h: f.holes })), pl: c.planes.map((p) => [...p3(p.n), r6(p.d)]), el: c.edgeLayers ?? {}, fl: c.faceLayers ?? {}, cu: c.curves ?? [] };
  };
  // 参考圆 / 球（definitions 6.3）只在有时才进指纹：老文件的定稿指纹不变
  const guides = (g: DefinitionDoc["guides"]): unknown => ({ l: g.lines.map((l) => [...p3(l.p), ...p3(l.dir)]), p: g.points.map((q) => p3(q.p)),
    ...(g.circles?.length ? { c: g.circles.map((c) => [...p3(c.c), ...p3(c.n), r6(c.r)]) } : {}), ...(g.spheres?.length ? { s: g.spheres.map((s) => [...p3(s.c), r6(s.r)]) } : {}) });
  const defs = doc.definitions.map((d, i) => ({
    root: i === doc.rootIndex, name: i === doc.rootIndex ? "" : d.name, ...(d.kind !== undefined && d.kind !== "brep" ? { kind: d.kind } : {}), brep: brepJson(d.brep), slots: d.materialSlots, guides: guides(d.guides), ...(d.drawFrame ? { df: [...p3(d.drawFrame.origin), ...p3(d.drawFrame.x), ...p3(d.drawFrame.y), ...p3(d.drawFrame.z)] } : {}),
    groups: d.groups.map((g) => ({ id: g.id, parent: g.parent, axes: [...p3(g.axes.origin), ...p3(g.axes.x), ...p3(g.axes.y), ...p3(g.axes.z)], brep: brepJson(g.brep), guides: guides(g.guides) })),
    instances: d.instances.map((it) => ({ id: it.id, def: it.definition, parent: it.parent, m: it.xform.map(r6) })),
  }));
  const axes = [...p3(doc.axes.origin), ...p3(doc.axes.x), ...p3(doc.axes.y), ...p3(doc.axes.z)];
  const text = JSON.stringify({ v: 1, defs, mats, axes });
  return sha256(new TextEncoder().encode(text));
}

/** 读进来的记录像不像样（坏的当没有）。 */
export function isFinalRecord(x: unknown): x is FinalRecord {
  return typeof x === "object" && x !== null && typeof (x as FinalRecord).at === "string" && typeof (x as FinalRecord).rev === "number" && typeof (x as FinalRecord).fingerprint === "string" && (x as FinalRecord).fingerprint.length === 64;
}
