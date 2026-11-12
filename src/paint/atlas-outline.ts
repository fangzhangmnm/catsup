// paint/atlas-outline.ts —— 画布小窗要的「一张 atlas 上的面」：每张面在画布上的多边形、哪些边是片里的（细）/ 片的外沿（粗）、第几片、盖住多少格、一个点落在哪几张面上。
// created 2026-11-11 by Claude Opus 5.5（施工单十六第二节：画布小窗第一版，只看）。纯计算：不碰显卡、不碰页面、不改内核；三维那一半（app/canvas-window.ts）拿它递给小窗。
// 片 = 在画布上连着的面：两张面共用一条边（同两个点），而且这条边在两张面里的贴图坐标一样（差不到千分之一格）= 同一片；不一样 = 缝（两边各画一条粗线）。
// 接缝（施工单二十二 B）：给了 seamAt、这条边是接缝 = 不进细 / 粗，进 seam（小窗画成接缝色）——标了还没重新展开的接缝也照样亮，看得见下一次从哪切开。
// 片的编号按画布上从上到下、从左到右（片的包围盒左上角），人看着顺。盖住 = 格子中心落在某张面里（和统筹量标杆的数法一样）；共用 = 落在两张以上的面里（镜像两半、复制出来的面）。
import type { PaintMesh } from "./texel-table.ts";

/** 要的那一点网格体（MeshKernel 满足）：环上的点编号（认公共的边）+ 角上的贴图坐标。 */
export type AtlasMesh = Pick<PaintMesh, "faceVerts" | "cornerValues">;
export interface AtlasOutline {
  readonly width: number; readonly height: number;
  /** 这张 atlas 上的面（升序）。 */
  readonly faces: readonly number[];
  /** 每张面在画布上的多边形 [x0, y0, x1, y1…]（格）。 */
  readonly rings: ReadonlyMap<number, Float32Array>;
  /** 片里的边（细线）：每条 4 个数 x0, y0, x1, y1；共用的边只画一次。 */
  readonly thin: Float32Array;
  /** 片的外沿（粗线）。 */
  readonly thick: Float32Array;
  /** 接缝上的边（不管在片里还是外沿；给了 seamAt 才有）。 */
  readonly seam: Float32Array;
  /** 每张面在第几片（从 1 起，按画布上从上到下、从左到右）。 */
  readonly patchOf: ReadonlyMap<number, number>;
  readonly patches: number;
  /** 格子中心落在某张面里的格数 / 落在两张以上的面里的格数。 */
  readonly covered: number; readonly shared: number;
  /** 这一点（格坐标）落在哪几张面里（升序）。 */
  facesAt(x: number, y: number): number[];
}

const SAME_UV = 1e-3;   // 格：两张面在同一个点上的坐标差不到这么多 = 连着（不是缝）

export function atlasOutline(m: AtlasMesh, uvSet: string, faces: readonly number[], width: number, height: number, seamAt?: (a: number, b: number) => boolean): AtlasOutline {
  const fs = [...new Set(faces)].filter((f) => m.cornerValues(f, uvSet)).sort((a, b) => a - b);
  const rings = new Map<number, Float32Array>(), verts = new Map<number, number[]>();
  for (const f of fs) { rings.set(f, Float32Array.from(m.cornerValues(f, uvSet)!)); verts.set(f, m.faceVerts(f)); }
  // 边 → 用它的面（按点编号认）
  const byEdge = new Map<string, { f: number; i: number }[]>(), seamEdge = new Set<string>();
  for (const f of fs) { const vs = verts.get(f)!; for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], k = a < b ? `${a},${b}` : `${b},${a}`; const l = byEdge.get(k); if (l) l.push({ f, i }); else { byEdge.set(k, [{ f, i }]); if (seamAt?.(a, b)) seamEdge.add(k); } } }
  /** 第 i 条边在面 f 里两头的坐标，按点编号小的在前。 */
  const ends = (f: number, i: number): [number, number, number, number] => {
    const vs = verts.get(f)!, r = rings.get(f)!, j = (i + 1) % vs.length;
    return vs[i] < vs[j] ? [r[2 * i], r[2 * i + 1], r[2 * j], r[2 * j + 1]] : [r[2 * j], r[2 * j + 1], r[2 * i], r[2 * i + 1]];
  };
  const close = (p: number[], q: number[]): boolean => Math.abs(p[0] - q[0]) < SAME_UV && Math.abs(p[1] - q[1]) < SAME_UV && Math.abs(p[2] - q[2]) < SAME_UV && Math.abs(p[3] - q[3]) < SAME_UV;
  // 并查：片
  const parent = new Map<number, number>(fs.map((f) => [f, f]));
  const find = (x: number): number => { let r = x; while (parent.get(r)! !== r) r = parent.get(r)!; let y = x; while (parent.get(y)! !== r) { const n = parent.get(y)!; parent.set(y, r); y = n; } return r; };
  const thin: number[] = [], thick: number[] = [], seam: number[] = [], drawnAt = new Set<string>();
  /** 一段在画布上的身份（两头的坐标量到千分之一格、小的在前）：镜像两半、复制出来的面点编号不同，坐标一样 = 同一段，只画一次。 */
  const segKey = (s: readonly number[]): string => { const q = s.map((x) => Math.round(x / SAME_UV)); return q[0] < q[2] || (q[0] === q[2] && q[1] <= q[3]) ? q.join(",") : [q[2], q[3], q[0], q[1]].join(","); };
  for (const [ek, users] of byEdge) {
    const seg = users.map((u) => ends(u.f, u.i)), onSeam = seamEdge.has(ek);
    // 每个用这条边的面：和别的哪个面在这条边上坐标一样 = 片里的；谁都不一样 = 外沿
    for (let a = 0; a < users.length; a++) {
      let joined = false;
      for (let b = 0; b < users.length; b++) if (a !== b && users[a].f !== users[b].f && close(seg[a], seg[b])) { joined = true; parent.set(find(users[a].f), find(users[b].f)); }
      const k = segKey(seg[a]);
      if (drawnAt.has(k)) continue;   // 同一段已经画过（片里的边两张面各报一次、镜像两半叠着的）
      drawnAt.add(k);
      (onSeam ? seam : joined ? thin : thick).push(...seg[a]);
    }
  }
  // 片的编号：按包围盒左上角（上到下、左到右）
  const box = new Map<number, [number, number]>();
  for (const f of fs) { const r = rings.get(f)!, root = find(f); let x0 = Infinity, y0 = Infinity; for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); y0 = Math.min(y0, r[i + 1]); } const b = box.get(root); box.set(root, b ? [Math.min(b[0], x0), Math.min(b[1], y0)] : [x0, y0]); }
  const order = [...box.entries()].sort((a, b) => a[1][1] - b[1][1] || a[1][0] - b[1][0] || a[0] - b[0]).map(([r]) => r), num = new Map(order.map((r, i) => [r, i + 1]));
  const patchOf = new Map(fs.map((f) => [f, num.get(find(f))!]));
  // 一点落在哪几张面里：格子哈希（一格 = G × G 个画布格）
  const G = Math.max(4, Math.ceil(Math.max(width, height) / 128)), gw = Math.ceil(width / G) + 1, gh = Math.ceil(height / G) + 1, buckets = new Map<number, number[]>();
  for (const f of fs) {
    const r = rings.get(f)!; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
    for (let j = Math.max(0, Math.floor(y0 / G)); j <= Math.min(gh - 1, Math.floor(y1 / G)); j++) for (let i = Math.max(0, Math.floor(x0 / G)); i <= Math.min(gw - 1, Math.floor(x1 / G)); i++) { const k = j * gw + i, l = buckets.get(k); if (l) l.push(f); else buckets.set(k, [f]); }
  }
  const facesAt = (x: number, y: number): number[] => {
    if (!(x >= 0 && y >= 0 && x <= width && y <= height)) return [];
    const out: number[] = [];
    for (const f of buckets.get(Math.floor(y / G) * gw + Math.floor(x / G)) ?? []) if (inside(rings.get(f)!, x, y)) out.push(f);
    return out;
  };
  // 盖住 / 共用（格子中心）：每张面只扫自己的包围盒，计数进一张表（随面在画布上的面积涨，不随画布涨）
  const cnt = new Uint8Array(width * height);
  for (const f of fs) {
    const r = rings.get(f)!; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x++) if (inside(r, x + 0.5, y + 0.5) && cnt[y * width + x] < 255) cnt[y * width + x]++;
  }
  let covered = 0, shared = 0;
  for (let i = 0; i < cnt.length; i++) { if (cnt[i] >= 1) covered++; if (cnt[i] >= 2) shared++; }
  return { width, height, faces: fs, rings, thin: Float32Array.from(thin), thick: Float32Array.from(thick), seam: Float32Array.from(seam), patchOf, patches: order.length, covered, shared, facesAt };
}

/** 点在多边形里（奇偶规则）。 */
function inside(r: ArrayLike<number>, x: number, y: number): boolean {
  const n = r.length / 2; let s = false;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) s = !s; }
  return s;
}
