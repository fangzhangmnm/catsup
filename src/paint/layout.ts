// paint/layout.ts —— 最笨的铺法：一张面在画布上占一块（贴图主线 1-3a 第二节，施工单 ai-docs/20261110-paint-workorders-7.md）。created 2026-11-10 by Claude Opus 5.5
// 纯计算：不改内核、不碰显卡和页面。输出每张面每个角的贴图坐标（单位 = 格，画布左上角是原点，横轴朝右、纵轴朝下）+ 画布的宽高；写进哪一列由调用的人做。
// 每张面怎么摆：n = 面的朝向（环的绕向）、e = 最长那条边的方向（一样长取环上靠前的）、t = n × e；横 = p·e、纵 = −(p·t)（画布纵轴朝下：倒过来之后从正面看
// 不是镜像的，最长的边是横着的），都乘密度；整块平移，让包围盒的左上角落在整数格点上。边长乘密度是整数的长方形，四个角正好落在格点上。
// 块怎么排：按高从大到小（一样高看宽，再一样看面的编号），一行一行从左往右，放不下换行；块和块、块和画布边之间都留 gap 格。同样的输入永远同样的结果。
import type { Pt3 } from "../kernel/geom.ts";

/** 铺法要的那一点内核（MeshKernel 满足；测试可以给假的）。 */
export interface LayoutMesh {
  facePts(f: number): Pt3[];
  faceNormal(f: number): Pt3;
  cornerValues(f: number, guid: string): Float32Array | null;
  /** 可选（MeshKernel 有）：这一列上有值的每张面的包围盒 [横小, 纵小, 横大, 纵大, …]。有它 = 补面时「哪里被占着」一趟扫完（不按 placed 逐张拷值）。 */
  columnBoxes?(guid: string): ArrayLike<number>;
}
export interface LayoutOptions {
  /** 每米多少格。不给 = 画布定成 base 见方，二分找出能放下的最大密度（精确到每米一格）。 */
  readonly density?: number;
  /** 块和块之间、块和画布边之间留几格（整数，默认 4）。 */
  readonly gap?: number;
  /** 画布的宽 / 高上限（默认 4096）；超过 = 不铺，说原因。 */
  readonly maxSize?: number;
  /** 画布的基准宽（默认 1024）。 */
  readonly base?: number;
}
export interface Block { readonly face: number; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export type LayoutResult =
  | { readonly ok: true; readonly width: number; readonly height: number; readonly density: number; readonly blocks: readonly Block[]; readonly values: ReadonlyMap<number, Float64Array>; /** layoutAppend 的 partial：加到上限还放不下、没铺的面（升序）。 */ readonly unplaced?: readonly number[] }
  | { readonly ok: false; readonly reason: string; readonly face?: number; readonly need?: number };

const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const EPS = 1e-9;
const ceilCells = (x: number): number => Math.max(1, Math.ceil(x - 1e-7));   // 浮点误差别多占一格（10.0000001 → 10）
/** 往上取到 step 的倍数、至少 step。step = 256；画布比 256 小时跟着画布走（开始画时选 128 见方，2026-11-11）。 */
const upStep = (x: number, step: number): number => Math.max(step, Math.ceil(x / step) * step);
const stepOf = (w: number): number => Math.max(1, Math.min(256, w));

/** 一张面摆平之后（还没放到画布上）：角在块里的坐标（左上角 = 0,0）+ 块的宽高。退化的面（面积是零 / 摆不出方向）占一格、角都在格子中心。 */
function flatten(m: LayoutMesh, f: number, density: number): { w: number; h: number; uv: Float64Array } {
  const pts = m.facePts(f), n = pts.length, uv = new Float64Array(2 * n);
  let best = -1, bl = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); if (l > bl + EPS) { bl = l; best = i; } }
  const nrm = m.faceNormal(f);
  let area = 0;
  for (let i = 1; i + 1 < n; i++) { const a = pts[0], b = pts[i], c = pts[i + 1]; area += len(cross({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z })) / 2; }
  if (best < 0 || area <= EPS) { uv.fill(0.5); return { w: 1, h: 1, uv }; }
  const a = pts[best], b = pts[(best + 1) % n], e = { x: (b.x - a.x) / bl, y: (b.y - a.y) / bl, z: (b.z - a.z) / bl };
  const t0 = cross(nrm, e), tl = len(t0);
  if (tl < 1e-12) { uv.fill(0.5); return { w: 1, h: 1, uv }; }
  const t = { x: t0.x / tl, y: t0.y / tl, z: t0.z / tl };
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (let i = 0; i < n; i++) {
    const u = dot(pts[i], e) * density, v = -dot(pts[i], t) * density;   // 纵轴朝下：倒过来
    uv[2 * i] = u; uv[2 * i + 1] = v;
    minU = Math.min(minU, u); minV = Math.min(minV, v); maxU = Math.max(maxU, u); maxV = Math.max(maxV, v);
  }
  for (let i = 0; i < n; i++) { uv[2 * i] -= minU; uv[2 * i + 1] -= minV; }
  return { w: ceilCells(maxU - minU), h: ceilCells(maxV - minV), uv };
}

/** 一行一行排：返回每块的左上角，或者放不下（宽度不够 / 超过 maxH）。 */
function pack(sizes: readonly { face: number; w: number; h: number }[], W: number, gap: number, maxH: number): { x: number; y: number }[] | null {
  const out: { x: number; y: number }[] = new Array(sizes.length);
  let x = gap, y = gap, rowH = 0;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    if (s.w + 2 * gap > W) return null;
    if (x + s.w + gap > W) { y += rowH + gap; x = gap; rowH = 0; }
    if (y + s.h + gap > maxH) return null;
    out[i] = { x, y };
    x += s.w + gap; rowH = Math.max(rowH, s.h);
  }
  return out;
}
const order = <T extends { face: number; w: number; h: number }>(xs: T[]): T[] => xs.sort((a, b) => b.h - a.h || b.w - a.w || a.face - b.face);

/** 按一个密度试着铺：画布宽 W、高的上限 maxH。 */
function tryDensity(m: LayoutMesh, faces: readonly number[], density: number, W: number, gap: number, maxH: number): { blocks: Block[]; values: Map<number, Float64Array>; height: number } | null {
  const flat = new Map(faces.map((f) => [f, flatten(m, f, density)] as const));
  const sizes = order(faces.map((f) => ({ face: f, w: flat.get(f)!.w, h: flat.get(f)!.h })));
  const at = pack(sizes, W, gap, maxH);
  if (!at) return null;
  const blocks: Block[] = [], values = new Map<number, Float64Array>();
  let bottom = 0;
  sizes.forEach((s, i) => {
    const { x, y } = at[i], fl = flat.get(s.face)!, v = new Float64Array(fl.uv.length);
    for (let j = 0; j < v.length; j += 2) { v[j] = fl.uv[j] + x; v[j + 1] = fl.uv[j + 1] + y; }
    blocks.push({ face: s.face, x, y, w: s.w, h: s.h }); values.set(s.face, v); bottom = Math.max(bottom, y + s.h);
  });
  return { blocks, values, height: bottom + gap };
}

/** 给一批面铺贴图坐标（一张面一块）。不改内核：values = 每张面每个角的 [横, 纵, 横, 纵…]（格）。 */
export function layoutFaces(m: LayoutMesh, faces: readonly number[], opts: LayoutOptions = {}): LayoutResult {
  const gap = Math.max(0, Math.round(opts.gap ?? 4)), maxSize = opts.maxSize ?? 4096, base = opts.base ?? 1024;
  const fs = [...new Set(faces)].sort((a, b) => a - b);
  if (!fs.length) return { ok: true, width: base, height: 256, density: opts.density ?? 0, blocks: [], values: new Map() };
  if (opts.density !== undefined) {
    const d = opts.density, flat = fs.map((f) => ({ face: f, ...flatten(m, f, d) }));
    const widest = flat.reduce((a, b) => (b.w > a.w ? b : a));
    const W = widest.w + 2 * gap > base ? upStep(widest.w + 2 * gap, stepOf(base)) : base;
    if (W > maxSize) return { ok: false, reason: `面 ${widest.face} 在每米 ${d} 格下要 ${widest.w + 2 * gap} 格宽，超过上限 ${maxSize}`, face: widest.face, need: widest.w + 2 * gap };
    const r = tryDensity(m, fs, d, W, gap, Infinity)!;
    const H = upStep(r.height, stepOf(W));
    if (H > maxSize) return { ok: false, reason: `每米 ${d} 格铺这 ${fs.length} 张面要 ${H} 格高，超过上限 ${maxSize}`, need: H };
    return { ok: true, width: W, height: H, density: d, blocks: r.blocks, values: r.values };
  }
  // 没给密度：base 见方里二分找最大的整数密度
  const fits = (d: number): boolean => tryDensity(m, fs, d, base, gap, base) !== null;
  if (!fits(1)) {
    const flat = fs.map((f) => ({ face: f, ...flatten(m, f, 1) })), big = flat.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
    return { ok: false, reason: `每米 1 格也放不进 ${base} 见方（最大的是面 ${big.face}，${big.w} × ${big.h} 格）`, face: big.face, need: Math.max(big.w, big.h) + 2 * gap };
  }
  let lo = 1, hi = 2;
  while (fits(hi) && hi < 1 << 24) { lo = hi; hi *= 2; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fits(mid)) lo = mid; else hi = mid; }
  const r = tryDensity(m, fs, lo, base, gap, base)!;
  return { ok: true, width: base, height: base, density: lo, blocks: r.blocks, values: r.values };
}

/**
 * 给新面补一块（以后加面用）：已经铺好的面（在 guid 这一列上有值的）一个数都不变；新面各铺一块，放在画布上空着的地方（左上优先），放不下就把画布往下加高
 * （256 的倍数；画布比 256 窄时按画布宽度的倍数）。坐标的单位是格、不是零到一的比例，所以加高不会动到已有的东西。
 * 怎么找空（1-3b 改，Claude Opus 5.5，2026-11-10：原来每补一张面都把「每块的右边 / 下边」当候选全排一遍、逐块比，四万面的网格体补十张面要 0.2 秒、随面数涨）：
 *   画布按 C × C 格划成粗格子（C = 宽 / 256 向上取整，至少 1）；已有的块各向外扩 gap 格，碰到的粗格子都算占了（保守）。新块只放在粗格子的角上，
 *   从上到下、从左到右找第一个放得下的地方。每行记着「从这格往右连着几格空」，找的时候只看这个数。代价随画布大小涨、不随面数涨（只有收集已有块那一步随面数涨）。
 * partial（meshLayoutPaint 用）：加到上限还放不下的面不铺、记进 unplaced，其余照铺；不给 = 放不下就整个不铺、说原因（1-3a 的行为）。
 */
export function layoutAppend(m: LayoutMesh, guid: string, placed: readonly number[], add: readonly number[], canvas: { width: number; height: number }, density: number, opts: Omit<LayoutOptions, "density" | "base"> & { readonly partial?: boolean } = {}): LayoutResult {
  const gap = Math.max(0, Math.round(opts.gap ?? 4)), maxSize = opts.maxSize ?? 4096, W = canvas.width;
  const C = Math.max(1, Math.ceil(W / 256)), gw = Math.ceil(W / C), gh = Math.ceil(Math.max(maxSize, canvas.height) / C);
  const occ = new Uint8Array(gw * gh), run = new Int32Array(gw * gh);   // run[j·gw + i] = 第 j 行从第 i 格往右连着几格空
  const rerun = (j0: number, j1: number): void => { for (let j = j0; j < j1; j++) { let n = 0; for (let i = gw - 1; i >= 0; i--) { n = occ[j * gw + i] ? 0 : n + 1; run[j * gw + i] = n; } } };
  /** 格子坐标的块 [x0, x1) × [y0, y1) 向外扩 gap，碰到的粗格子标成占了；只重算动到的那几行。 */
  const mark = (x0: number, y0: number, x1: number, y1: number, recompute: boolean): void => {
    const i0 = Math.max(0, Math.floor((x0 - gap) / C)), i1 = Math.min(gw, Math.ceil((x1 + gap) / C)), j0 = Math.max(0, Math.floor((y0 - gap) / C)), j1 = Math.min(gh, Math.ceil((y1 + gap) / C));
    if (i0 >= i1 || j0 >= j1) return;
    for (let j = j0; j < j1; j++) occ.fill(1, j * gw + i0, j * gw + i1);
    if (recompute) rerun(j0, j1);
  };
  const box = (x0: number, y0: number, x1: number, y1: number): void => mark(Math.floor(x0), Math.floor(y0), Math.max(Math.floor(x0) + 1, Math.ceil(x1)), Math.max(Math.floor(y0) + 1, Math.ceil(y1)), false);
  if (m.columnBoxes) { const b = m.columnBoxes(guid); for (let i = 0; i + 3 < b.length; i += 4) box(b[i], b[i + 1], b[i + 2], b[i + 3]); }   // 这一列上有值的面全算占着（不管它现在走不走画）
  else for (const f of placed) {
    const v = m.cornerValues(f, guid);
    if (!v) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); }
    box(x0, y0, x1, y1);
  }
  rerun(0, gh);
  const lo = Math.ceil(gap / C);   // 块的左上角至少离画布边 gap 格
  /** 第一个放得下 w × h、而且底边加 gap 不超过 limit 的粗格子角（从上到下、从左到右）；没有 = null。 */
  const find = (w: number, h: number, limit: number): { x: number; y: number } | null => {
    const cw = Math.ceil(w / C), ch = Math.ceil(h / C), iMax = Math.floor((W - w - gap) / C);
    for (let j = lo; j + ch <= gh && j * C + h + gap <= limit; j++) {
      for (let i = lo; i <= iMax; i++) {
        if (run[j * gw + i] < cw) { i += run[j * gw + i]; continue; }   // 这一格起不够宽：跳过这段空的
        let ok = true;
        for (let t = 1; t < ch && ok; t++) if (run[(j + t) * gw + i] < cw) ok = false;
        if (ok) return { x: i * C, y: j * C };
      }
    }
    return null;
  };
  const done = new Set(placed), fs = [...new Set(add)].filter((f) => !done.has(f) && !m.cornerValues(f, guid)).sort((a, b) => a - b);   // 已经有值的不动
  const sizes = order(fs.map((f) => ({ face: f, ...flatten(m, f, density) })));
  let H = canvas.height;
  const blocks: Block[] = [], values = new Map<number, Float64Array>(), unplaced: number[] = [];
  for (const s of sizes) {
    if (s.w + 2 * gap > W) { if (opts.partial) { unplaced.push(s.face); continue; } return { ok: false, reason: `面 ${s.face} 要 ${s.w + 2 * gap} 格宽，画布只有 ${W}`, face: s.face, need: s.w + 2 * gap }; }
    let at = find(s.w, s.h, H);
    if (!at) {   // 现在的画布里放不下：往下找，画布加高（256 的倍数；画布比 256 窄时按画布宽度的倍数）
      at = find(s.w, s.h, maxSize);
      if (!at) { if (opts.partial) { unplaced.push(s.face); continue; } return { ok: false, reason: `补面 ${s.face} 要把画布加高到超过上限 ${maxSize}`, face: s.face, need: maxSize + 1 }; }
      H = Math.max(H, upStep(at.y + s.h + gap, stepOf(W)));
    }
    const v = new Float64Array(s.uv.length);
    for (let j = 0; j < v.length; j += 2) { v[j] = s.uv[j] + at.x; v[j + 1] = s.uv[j + 1] + at.y; }
    blocks.push({ face: s.face, x: at.x, y: at.y, w: s.w, h: s.h }); values.set(s.face, v);
    mark(at.x, at.y, at.x + s.w, at.y + s.h, true);
  }
  return { ok: true, width: W, height: H, density, blocks, values, ...(opts.partial ? { unplaced: unplaced.sort((a, b) => a - b) } : {}) };
}
