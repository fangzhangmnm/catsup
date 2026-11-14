// scene/uv.ts —— 贴图坐标在网格体上怎么存（施工单十八第 1½ 刀，3.2½；画画那一层，和 scene/paint.ts 一起是全仓仅有知道「贴图坐标」意思的地方）。created 2026-11-13 by Claude Opus 5.5
// user 11-13：「几何内核对属性无感，只知道是面、点还是角，不知道它们是什么意思」。所以贴图坐标 = 这一层在内核上挂的两列 + 网格体上一张速查表：
//   · 网格体上的 uvSetSlots（MeshBody，和 materialSlots 并排）：短代号 → 排法表（Scene.uvSets）里那一行的 GUID。先后没有意思（写文件时按 GUID 排、换号）。
//     可以有没有面引用的项 = 这个网格体在那套排法上、零张面有位置（第 3 刀拿掉「有没有这一列」那个信号之后就不再要它）。
//   · 面上一列 "uv-set"（UV_SET_COL）：这张面在哪套排法上 = 速查表的下标；−1 = 没有位置。一张面同一个槽里只能有一个位置——结构上就违反不了（现在只有颜色一个槽）。
//   · 角上一列 "uv-at"（UV_AT_COL）：每角两个数，单位 = 格，1/1024 格的整数倍（quantum = 1024：内核插值后取整到这一格）。没有位置的面这里是 0，没有意思。
// 有没有位置只看代号。内核只报告「哪几列在来源之间对不上」；并出来的面代号或坐标对不上 → 拿掉位置、数出来，在每一步的收尾里（editor/paint-upkeep.ts）。
// 写位置只有一个口：placeFace。读坐标的那几块（铺法、每格的表、笔的目标、拾取、画布小窗的线、渲染）经 uvMesh 这个视图问，不直接碰那两列（守卫：这两个 id 只许出现在这里）。
import { faceHidden } from "../mesh/reserved-columns.ts";
import type { MeshKernel, ColumnDef, FaceReport, GoneFace } from "../mesh/mesh-kernel.ts";
import type { Guid } from "../format/guid.ts";
import type { UvDoc } from "../format/document.ts";
import type { Pt3 } from "../kernel/geom.ts";

/** 贴图坐标的格子：1/1024 格（施工单十八第四节）。 */
export const UV_Q = 1024;
/** 取整到 1/UV_Q 格（铺法输出、读文件时用；内核插值靠 UV_AT_COL.quantum 自己取整）。 */
export const quantizeUv = (x: number): number => Math.round(x * UV_Q) / UV_Q;
/** 面上那一列：这张面在哪套排法上（速查表下标；−1 = 没有位置）。并成时来源不一致 = 引擎自己回 −1（属性规程第七½节 E）。 */
export const UV_SET_COL: ColumnDef = Object.freeze({ id: "uv-set", on: "face", type: "int", continuous: false, fill: -1, merge: "defaultIfMixed" });
/** 角上那一列：每角两个数，格（1/1024 格的整数倍）；没有位置的面 = 0。并成时取最前的；对不上由收尾把代号改成 −1（uvLosses）。 */
export const UV_AT_COL: ColumnDef = Object.freeze({ id: "uv-at", on: "corner", type: { floats: 2 }, continuous: true, quantum: UV_Q, fill: 0, merge: "first" });
/** 这两列的 id（读写文件的门口跳过它们、另按 uv 通道写）。 */
export const UV_COLUMN_IDS: ReadonlySet<string> = new Set([UV_SET_COL.id, UV_AT_COL.id]);

/** 内核上有没有贴图坐标那两列。 */
export const hasUvColumns = (k: MeshKernel): boolean => k.hasColumn(UV_SET_COL.id);
/** 没有就加上（原有的面：代号 −1、坐标 0）。 */
export function ensureUvColumns(k: MeshKernel): void { k.addColumn(UV_SET_COL); k.addColumn(UV_AT_COL); }
/** 这张面的代号（−1 = 没有位置；没有那两列 / 面不在 = −1）。 */
export function uvCodeOf(k: MeshKernel, f: number): number { return k.faceValue(f, UV_SET_COL.id) ?? -1; }
/** 这张面在哪套排法上（GUID）；没有位置 = null。 */
export function uvSetOfFace(k: MeshKernel, slots: readonly Guid[], f: number): Guid | null {
  const c = uvCodeOf(k, f);
  return c >= 0 && c < slots.length ? slots[c] : null;
}
/** 这张面在排法 uvSet 上的坐标（角数 × 2，格，拷一份）；不在这一套上 = null。 */
export function uvAt(k: MeshKernel, slots: readonly Guid[], f: number, uvSet: Guid): Float32Array | null {
  return uvSetOfFace(k, slots, f) === uvSet ? k.cornerValues(f, UV_AT_COL.id) : null;
}
/** 在排法 uvSet 上有位置的每张活面的包围盒，摊平成 [横小, 纵小, 横大, 纵大, …]（补面时「画布上哪里被占着」）。 */
export function uvBoxes(k: MeshKernel, slots: readonly Guid[], uvSet: Guid): Float64Array {
  const code = slots.indexOf(uvSet), out: number[] = [];
  if (code < 0 || !hasUvColumns(k)) return new Float64Array(0);
  for (const f of k.faces()) {
    if (uvCodeOf(k, f) !== code) continue;
    const v = k.cornerValues(f, UV_AT_COL.id)!;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < v.length; i += 2) { const x = v[i], y = v[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    out.push(x0, y0, x1, y1);
  }
  return Float64Array.from(out);
}
/** 这个网格体在不在排法 uvSet 上（速查表里有没有它；第 3 刀拿掉这个信号）。 */
export const onUvSet = (slots: readonly Guid[], uvSet: Guid): boolean => slots.includes(uvSet);

/**
 * 唯一的写口：把面 f 放到排法 uvSet 上，角上的坐标 at（角数 × 2，格）。uvSet 不在速查表里就追加；内核上没有那两列就加上。
 * 返回它原来在哪套上——原来在别的套上 = 那个位置被盖掉了（调用方数出来、说一句；施工单十八 3.2½，第 2 刀起记进 freed）；没有位置 / 同一套 = null。
 */
export function placeFace(k: MeshKernel, slots: Guid[], f: number, uvSet: Guid, at: ArrayLike<number>): Guid | null {
  ensureUvColumns(k);
  const before = uvSetOfFace(k, slots, f);
  let c = slots.indexOf(uvSet);
  if (c < 0) { slots.push(uvSet); c = slots.length - 1; }
  k.setFaceValue(f, UV_SET_COL.id, c);
  k.setCornerValues(f, UV_AT_COL.id, at);
  return before !== null && before !== uvSet ? before : null;
}
/** 拿掉面 f 的位置（代号 −1、坐标清成 0）。返回原来在哪套上（没有 = null）。 */
export function unplaceFace(k: MeshKernel, slots: readonly Guid[], f: number): Guid | null {
  if (!hasUvColumns(k)) return null;
  const before = uvSetOfFace(k, slots, f);
  if (uvCodeOf(k, f) === -1) return before;
  k.setFaceValue(f, UV_SET_COL.id, -1);
  k.setCornerValues(f, UV_AT_COL.id, new Float32Array(2 * k.faceVerts(f).length));
  return before;
}

/**
 * 网格体退出这几套排法（「把画拿掉」，第 1 版施工单第五节 2½）：面在这几套上的位置全拿掉（代号 −1、角上清 0）、速查表里这几项删掉、
 * 剩下的面的代号照新速查表重新对上。排法表那一行（Scene.uvSets）不在这里动：留在文件里当孤儿。返回拿掉了几张面的位置。
 */
export function leaveUvSets(k: MeshKernel, slots: Guid[], gone: ReadonlySet<Guid>): number {
  const keep = slots.filter((g) => !gone.has(g)), to = slots.map((g) => keep.indexOf(g));   // 旧代号 → 新代号（退出的 = −1）
  let n = 0;
  if (hasUvColumns(k)) for (const f of k.faces()) {
    const c = uvCodeOf(k, f);
    if (c < 0) continue;
    const nc = c < to.length ? to[c] : -1;
    if (nc < 0) { unplaceFace(k, slots, f); n++; } else if (nc !== c) k.setFaceValue(f, UV_SET_COL.id, nc);
  }
  slots.length = 0; slots.push(...keep);
  return n;
}
/** 面从 source 搬到 target 时（并物件 / 炸开，照材质槽那几行）：把 source 的速查表并进 target（没有的追加），返回代号换号的函数（−1 → −1）。 */
export function mergeUvSlots(target: Guid[], source: readonly Guid[]): (code: number) => number {
  const map = source.map((g) => { let i = target.indexOf(g); if (i < 0) { target.push(g); i = target.length - 1; } return i; });
  return (code) => (code >= 0 && code < map.length ? map[code] : -1);
}
/** 整张面搬到别的内核时交给 fresh 的值里，贴图坐标的代号换成目标那边的（mergeUvSlots 给的函数）。 */
export function remapUvCode(face: Map<string, number>, remap: (code: number) => number): void {
  const c = face.get(UV_SET_COL.id);
  if (c !== undefined) face.set(UV_SET_COL.id, remap(c));
}

/**
 * 读内核报告（每一步的收尾调，editor/paint-upkeep.ts）：这一步里新面 / 改过的面贴图坐标对不上的——
 *   面上的代号来源之间不一样：引擎照声明（defaultIfMixed）已经给了 −1，这里只数；
 *   代号一样、角上的坐标对不上 / 取不到：坐标照「取最前的」，这里判成没有位置（drop）。
 * drop = 现在还有位置、要拿掉的面；lost = 来源里有位置、收尾之后没有位置的面数（数出来、提示行说一句；不许悄悄丢）。
 */
/** 报告里没了的一张面，没了之前在不在画布上（面上的代号 ≥ 0 = 有位置 = 有画）。收尾数「其中几张上有画」用。 */
export const hadPaint = (g: GoneFace): boolean => (g.shape.face?.get(UV_SET_COL.id) ?? -1) >= 0;

export function uvLosses(k: MeshKernel, report: FaceReport): { drop: number[]; lost: number } {
  const drop: number[] = [];
  let lost = 0;
  for (const [f, o] of report.odd) {
    const codes = o.face.get(UV_SET_COL.id), cornersOdd = o.corner.has(UV_AT_COL.id);   // 角上的：mixed（并成接不上）/ missing（取不到）都算
    if (!codes && !cornersOdd) continue;
    const cur = uvCodeOf(k, f), hadAny = codes ? codes.some((c) => c >= 0) : cur >= 0;
    if (cur >= 0) drop.push(f);
    if (hadAny) lost++;
  }
  return { drop: drop.sort((a, b) => a - b), lost };
}

/** 读坐标的那几块（铺法、每格的表、笔的目标、拾取、画布小窗的线）看到的网格体：几何照内核，贴图坐标按排法问。 */
export interface UvMesh {
  readonly kernel: MeshKernel;
  readonly rev: number;
  faces(): number[];
  faceVerts(f: number): number[];
  facePts(f: number): Pt3[];
  faceNormal(f: number): Pt3;
  pt(v: number): Pt3;
  hasF(f: number): boolean;
  isFaceHidden(f: number): boolean;
  faceTriangles(f: number): readonly (readonly [number, number, number])[];
  /** 这张面在排法 uvSet 上的坐标；不在 = null。 */
  uvAt(f: number, uvSet: Guid): Float32Array | null;
  /** 在排法 uvSet 上有位置的面的包围盒（摊平）。 */
  uvBoxes(uvSet: Guid): Float64Array;
  /** 这个网格体的速查表（短代号 → 排法 GUID）。 */
  uvSets(): readonly Guid[];
}
/** 内核 + 它那张速查表 → 视图（预演的影子内核也一样：传影子内核和场景里那张表）。 */
export function uvMesh(k: MeshKernel, slots: readonly Guid[]): UvMesh {
  return {
    kernel: k, get rev() { return k.rev; },
    faces: () => k.faces(), faceVerts: (f) => k.faceVerts(f), facePts: (f) => k.facePts(f), faceNormal: (f) => k.faceNormal(f), pt: (v) => k.pt(v), hasF: (f) => k.hasF(f), isFaceHidden: (f) => faceHidden(k, f), faceTriangles: (f) => k.faceTriangles(f),
    uvAt: (f, g) => uvAt(k, slots, f, g), uvBoxes: (g) => uvBoxes(k, slots, g), uvSets: () => slots,
  };
}

// —— 文件门口（format/scene-doc.ts 用；文件里的形状 = 内存里的形状，format/document.ts UvDoc）
/**
 * 内存 → 载荷：速查表原样（先后在写文件时按 GUID 排、换号，format/mesh-payload.ts）；每张面一个代号、每角两个数，面和角的先后照 meshDocFromKernel（k.faces() 的先后、各面 faceVerts 的先后）。
 * 网格体不在任何排法上（速查表空）= 没有（不写 uv 通道，和以前一样）。没有位置的面：代号 −1、坐标 0。
 */
export function uvDocOf(k: MeshKernel, slots: readonly Guid[]): UvDoc | undefined {
  if (!slots.length) return undefined;
  const faces = k.faces(), faceSet = new Int32Array(faces.length), data: number[] = [];
  faces.forEach((f, i) => {
    const c = uvCodeOf(k, f), n = k.faceVerts(f).length, code = c >= 0 && c < slots.length ? c : -1;
    faceSet[i] = code;
    if (code < 0) { for (let j = 0; j < 2 * n; j++) data.push(0); return; }
    const v = k.cornerValues(f, UV_AT_COL.id)!;
    for (let j = 0; j < v.length; j++) data.push(v[j]);
  });
  return { sets: [...slots], faceSet, data: Float32Array.from(data) };
}
/**
 * 载荷 → 内存（读文件，kernelFromMeshDoc 刚建好的内核：第 i 张面 = 载荷第 i 张面）：速查表接上 uv.sets，代号、坐标原样写进那两列。
 * 载荷在门口已经收过口（format/mesh-payload.ts、format/paint-read.ts：坏的面代号已是 −1、坐标 0）。
 */
export function applyUvDoc(k: MeshKernel, slots: Guid[], uv: UvDoc): void {
  if (!uv.sets.length) return;
  ensureUvColumns(k);
  slots.push(...uv.sets);
  const faces = k.faces();
  if (faces.length !== uv.faceSet.length) throw new Error(`applyUvDoc: ${uv.faceSet.length} face codes for ${faces.length} faces`);
  let at = 0;
  faces.forEach((f, i) => {
    const n = 2 * k.faceVerts(f).length, code = uv.faceSet[i];
    if (code >= 0) { k.setFaceValue(f, UV_SET_COL.id, code); k.setCornerValues(f, UV_AT_COL.id, uv.data.subarray(at, at + n)); }
    at += n;
  });
}

