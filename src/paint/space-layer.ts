// paint/space-layer.ts —— 一笔在一张贴图上的薄层（贴图主线 1-4b，施工单 ai-docs/20261111-paint-workorders-11.md）。created 2026-11-11 by Claude Opus 5.5
// 在三维自己的显卡接口（space-gpu.ts）上画：程序 space-tip = 一对——JavaScript 版就是 1-4a 的标准答案 tipCellsInPoly（不另写算式），
//   GLSL 版照它一行一行写（每格认画布多边形、取样点、每张面里贴图坐标上离取样点最近的三角形、用它的公式算位置、同一颗笔尖对同一格只算一次取最近的距离、
//   浓淡用内核导出的那段笔尖边缘曲线）。
// 一颗笔尖 × 它碰到的一块画布多边形 = 一个实例。实例的方块 = 这颗笔尖在这块多边形上可能碰到的格子（tipRect：每个三角形的公式在贴图上一格最少走 smin 的世界长度，
//   所以取样点离「球心投到这个三角形平面上的那一点」超过 半径 / smin 的格子不可能吃墨；挂着的面的所有三角形各一个圆，并起来、往外放块边那一圈、夹进多边形的格子范围）。
//   两个版本都只写实例方块里的格子（JavaScript 版按标准答案算完再按方块裁）——方块切掉了墨，软件版和标准答案对拍就会红。
// 淡彩（max）直接写预乘的 (c·v, v)、每通道取最大（同一笔颜色是常数：max(c·v) = c·max(v)，不用单独上色那一遍）；叠色（over）写 (c·v, v)、预乘叠加。
// 定型的笔尖只画一次，攒在定型层上；每帧：定型层拷到当帧那张，再画还会变的尾巴（每帧的活只随新定型的 + 尾巴涨）。
// 位置一律先减去这一笔落笔的那一点再上传（数据图里不放半精度）。
// 每格的表（1-4c，统筹 11-11 裁定）：定长，每格 8 字节（cellTable）；只跟贴图坐标有关，进工作台时建好、缓存在 space-prep.ts，落笔借来用（cells）。
// 容量（每个都是「到了就抛 PaintLimitError、提示行说人话」，不静默画错）：多边形块数 ≤ MAX_POLYS、每张面三角形 ≤ MAX_TRIS、一颗笔尖下同一块的面 ≤ MAX_FACES、
//   每张数据图 ≤ min(DATA_W × 显卡每边上限, 2^24) 个数（2^24 = 32 位浮点里的编号还精确）、每张图每边 ≤ 显卡上限。清单和行为见施工记录「容量清单」。
import type { SpaceAccum, SpaceData, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
import type { TargetGeo } from "./space-target.ts";
import { tipCellsInPoly, type InkTip } from "./tip-truth.ts";
import type { Reach } from "./tip-reach.ts";
import { sampleOffset, SAMPLE_Q, type TexelTable } from "./texel-table.ts";
import { PaintLimitError } from "./paint-limit.ts";
import { STAMP_FALLOFF_GLSL } from "./kernel/src/backend/gl/stamp-falloff.ts";
import { DirtyCells } from "./kernel/src/common/dirty-rects.ts";
import type { Pt3 } from "../kernel/geom.ts";

/** 数据图一行几个数（一维的表按这个宽度折成二维）。 */
export const DATA_W = 2048;
/**
 * 一颗笔尖下、同一块画布多边形挂的面最多几张；一张面最多几个三角形（着色器里那两圈循环的上界，循环带 break：面小的时候不花钱）。超了 = 抛 PaintLimitError。
 * MAX_TRIS = 1024（统筹 11-11：64 会把默认的 72 段圆面挡在外面；1024 挡住的只剩极端的大面。以后真有人撞上：把一张大面分几批画、每批只让取样点落在自己那批三角形里的格子写——现在不做）。
 */
export const MAX_FACES = 8, MAX_TRIS = 1024;
/** 画布多边形最多几块：着色器里拿来比的编号走 32 位浮点的实例表，2^24 以内才精确（每格的表本身能放到 2^32 − 2）。 */
export const MAX_POLYS = 2 ** 24 - 1;
/** 一张数据图最多几个数：32 位浮点里存的编号（三角形号、面单子里的位置）2^24 以内才精确。 */
export const MAX_DATA = 2 ** 24;
/**
 * 画布每边最多几格：取样点 = 格子中心 + 整数 / 1024，在 32 位浮点里精确要 |坐标| < 2^14（14 位整数 + 10 位小数 = 24 位有效数字）；
 * 取样点最多伸出格子 32767 / 1024 格（每格的表的偏移范围），所以 边长 − 1 + 0.5 + 32 < 2^14 → 边长 ≤ 2^14 − 32。有的电脑显卡每边能到 32768，所以单独卡。
 */
export const MAX_CANVAS_SIDE = 2 ** 14 - 32;
const TRI_STRIDE = 15, TIP_STRIDE = 8;

const VS = `#version 300 es
layout(location=0) in vec2 a_quad;
layout(location=1) in vec4 a_inst;   // 这个实例在离屏图上盖的格子范围 x, y, w, h
uniform vec2 u_size;
uniform int u_first;
flat out int v_item;
void main() { v_item = u_first + gl_InstanceID; vec2 p = a_inst.xy + a_quad * a_inst.zw; gl_Position = vec4(p / u_size * 2.0 - 1.0, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
flat in int v_item;
uniform sampler2D u_inst, u_tips, u_flist, u_faces, u_tris;
uniform highp usampler2D u_cell;   // 每格 8 字节（cellTable）：R, G = 画布多边形编号 + 1 的低、高 16 位（0 = 没人要）；B, A = 取样点离格子中心的偏移（1/${SAMPLE_Q} 格，加 32768）
uniform vec2 u_size;
uniform float u_hardness;
uniform vec3 u_color;
out vec4 o;
${STAMP_FALLOFF_GLSL}
float at(sampler2D s, int i) { return texelFetch(s, ivec2(i % ${DATA_W}, i / ${DATA_W}), 0).r; }
// 点到三角形（贴图坐标）：在里面 / 边上 = 0，不然 = 到边界最近点的距离（texel-table.ts distToTri 同一个定义）
float segD2(vec2 p, vec2 a, vec2 b) { vec2 d = b - a; float l2 = dot(d, d); float s = l2 > 0.0 ? clamp(dot(p - a, d) / l2, 0.0, 1.0) : 0.0; vec2 e = a + s * d - p; return dot(e, e); }
float distToTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 v[3] = vec2[3](a, b, c);
  bool inside = false;
  for (int i = 0, j = 2; i < 3; j = i++) {
    vec2 vi = v[i], vj = v[j];
    if ((vj.x - vi.x) * (p.y - vi.y) - (vj.y - vi.y) * (p.x - vi.x) == 0.0 && p.x >= min(vi.x, vj.x) && p.x <= max(vi.x, vj.x) && p.y >= min(vi.y, vj.y) && p.y <= max(vi.y, vj.y)) return 0.0;
    if ((vi.y > p.y) != (vj.y > p.y) && p.x < (vj.x - vi.x) * (p.y - vi.y) / (vj.y - vi.y) + vi.x) inside = !inside;
  }
  if (inside) return 0.0;
  return sqrt(min(segD2(p, a, b), min(segD2(p, b, c), segD2(p, c, a))));
}
void main() {
  int x = int(gl_FragCoord.x), y = int(gl_FragCoord.y);
  int it = 4 * v_item, tip = int(at(u_inst, it)), poly = int(at(u_inst, it + 1)), fs = int(at(u_inst, it + 2)), fn = int(at(u_inst, it + 3));
  uvec4 cv = texelFetch(u_cell, ivec2(x, y), 0);   // 每格的表和画布一样大：按格子坐标取（不是一维折行的那种）
  if (int(cv.r | (cv.g << 16u)) - 1 != poly) discard;
  vec2 s = vec2(float(x) + 0.5 + (float(cv.b) - 32768.0) / ${SAMPLE_Q}.0, float(y) + 0.5 + (float(cv.a) - 32768.0) / ${SAMPLE_Q}.0);   // 中心 + 整数 / 1024：32 位浮点里正好精确（和 samplePoint 逐位一样）
  int tb = ${TIP_STRIDE} * tip;
  vec3 tc = vec3(at(u_tips, tb), at(u_tips, tb + 1), at(u_tips, tb + 2));
  float r = at(u_tips, tb + 3), al = at(u_tips, tb + 4), best = 1e30;
  for (int k = 0; k < ${MAX_FACES}; k++) {
    if (k >= fn) break;
    int f = int(at(u_flist, fs + k)), t0 = int(at(u_faces, 2 * f)), tn = int(at(u_faces, 2 * f + 1));
    float bd = 1e30; int bi = t0;
    for (int j = 0; j < ${MAX_TRIS}; j++) {
      if (j >= tn) break;
      int b = ${TRI_STRIDE} * (t0 + j);
      float d = distToTri(s, vec2(at(u_tris, b), at(u_tris, b + 1)), vec2(at(u_tris, b + 2), at(u_tris, b + 3)), vec2(at(u_tris, b + 4), at(u_tris, b + 5)));
      if (d < bd) { bd = d; bi = t0 + j; }
    }
    int b = ${TRI_STRIDE} * bi;
    vec2 q = s - vec2(at(u_tris, b), at(u_tris, b + 1));   // 1-4c：公式钉在这个三角形自己的第一个角上（离取样点只有几格）：32 位浮点的误差不随画布多大涨
    vec3 pos = vec3(at(u_tris, b + 6), at(u_tris, b + 7), at(u_tris, b + 8)) + vec3(at(u_tris, b + 9), at(u_tris, b + 10), at(u_tris, b + 11)) * q.x + vec3(at(u_tris, b + 12), at(u_tris, b + 13), at(u_tris, b + 14)) * q.y;
    best = min(best, distance(pos, tc));
  }
  if (best >= r) discard;
  float v = stampFalloff(best, r, clamp(u_hardness, 0.0, 0.999) * r) * al;
  o = vec4(u_color * v, v);
}`;

interface Item { readonly tip: InkTip; readonly tipIdx: number; readonly poly: number; readonly tris: readonly number[]; readonly faces: readonly number[]; readonly rect: readonly [number, number, number, number] }
/** 一个三角形的公式（世界里、减去落笔点）+ 反解用的 G⁻¹（G = [du·du du·dv; du·dv dv·dv]）+ smin = √(G 的小特征值) = 贴图上走一格在世界里最少走多远。 */
interface TriInv { readonly ox: number; readonly oy: number; readonly oz: number; readonly du: Pt3; readonly dv: Pt3; readonly i00: number; readonly i01: number; readonly i11: number; readonly smin: number }

/**
 * 一颗笔尖（球心 c、半径 r，世界里减去落笔点）在这些三角形上可能碰到的贴图坐标外接框 [x0, y0, x1, y1]；有退化的三角形 = null（只能用整块）。
 * 依据：位置 = o + du·s.x + dv·s.y（仿射，出了三角形照样延伸），|位置 − c| ≥ |J(s − s_c)| ≥ smin·|s − s_c|，s_c = c 投到这个平面上的贴图坐标。
 */
export function tipUvBox(tris: readonly TriInv[], cx: number, cy: number, cz: number, r: number): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const T of tris) {
    if (!(T.smin > 0)) return null;
    const dx = cx - T.ox, dy = cy - T.oy, dz = cz - T.oz;
    const r0 = T.du.x * dx + T.du.y * dy + T.du.z * dz, r1 = T.dv.x * dx + T.dv.y * dy + T.dv.z * dz;
    const a = T.i00 * r0 + T.i01 * r1, b = T.i01 * r0 + T.i11 * r1, ru = r / T.smin;
    x0 = Math.min(x0, a - ru); y0 = Math.min(y0, b - ru); x1 = Math.max(x1, a + ru); y1 = Math.max(y1, b + ru);
  }
  return [x0, y0, x1, y1];
}
function triInv(o: Pt3, du: Pt3, dv: Pt3): TriInv {
  const g00 = du.x * du.x + du.y * du.y + du.z * du.z, g01 = du.x * dv.x + du.y * dv.y + du.z * dv.z, g11 = dv.x * dv.x + dv.y * dv.y + dv.z * dv.z;
  const det = g00 * g11 - g01 * g01, lmin = (g00 + g11) / 2 - Math.sqrt(((g00 - g11) / 2) ** 2 + g01 * g01);
  const ok = det > 1e-12 * g00 * g11 && lmin > 0;
  return { ox: o.x, oy: o.y, oz: o.z, du, dv, i00: ok ? g11 / det : 0, i01: ok ? -g01 / det : 0, i11: ok ? g00 / det : 0, smin: ok ? Math.sqrt(lmin) : 0 };
}
interface Job { readonly g: TargetGeo; items: Item[]; readonly hardness: number; readonly color: readonly [number, number, number] }
const jobs = new Map<number, Job>();
let nextJob = 1;
/** 哪些显卡接口上登记过薄层程序（契约：同一个程序名登记两次 = 抛；所以只在这里登记，SpaceLayer 建的时候确保一次）。 */
const registeredOn = new WeakSet<SpaceGpu>();
function ensureProgram(gpu: SpaceGpu): void { if (!registeredOn.has(gpu)) { gpu.register(SPACE_TIP); registeredOn.add(gpu); } }

/** 薄层那个程序（一对）。JavaScript 版 = 1-4a 的标准答案。 */
export const SPACE_TIP: SpaceProgram = {
  name: "space-tip", vert: VS, frag: FS,
  cpu: (ctx) => {
    const job = jobs.get(ctx.uniforms.u_job as number);
    if (!job) throw new Error("space-tip: no job bound");
    const W = job.g.table.width, first = ctx.uniforms.u_first as number, [cr, cg, cb] = job.color;
    for (let k = 0; k < ctx.count; k++) {
      const it = job.items[first + k], [rx, ry, rw, rh] = it.rect;
      for (const [c, v] of tipCellsInPoly(job.g, it.poly, it.tris, it.tip, job.hardness)) {
        const x = c % W, y = Math.floor(c / W);
        if (x >= rx && x < rx + rw && y >= ry && y < ry + rh) ctx.write(x, y, cr * v, cg * v, cb * v, v);   // 实例方块外的不写（和显卡那一半一样）
      }
    }
  },
};

/** 一维的数折成 DATA_W 宽的数据图。放不下（行数超过显卡每边上限，或超过 MAX_DATA）= 抛 PaintLimitError；what = 这是哪张表（报错用）。一帧的表（实例 / 面单子 / 笔尖）不会走到这里抛：drawItems 先按上限分批（1-4d 第 4 条）；会抛的只剩物件自己的面表 / 三角形表。 */
function pack(gpu: SpaceGpu, values: ArrayLike<number>, what: string): SpaceData {
  const cap = Math.min(DATA_W * gpu.maxSize, MAX_DATA);   // DATA_W = 2048 ≤ 显卡每边上限：WebGL2 保证 MAX_TEXTURE_SIZE ≥ 2048
  if (values.length > cap) throw new PaintLimitError(`SpaceLayer: ${what} needs ${values.length} values (> ${cap} = min(${DATA_W} x ${gpu.maxSize}, 2^24))`, "这一笔画不了：这个物件太大，笔的数据表放不下（面太多）");
  const h = Math.max(1, Math.ceil(values.length / DATA_W)), a = new Float32Array(DATA_W * h);
  a.set(values as ArrayLike<number>);
  return gpu.data(DATA_W, h, a);
}

export interface SpaceLayerOpts {
  readonly hardness: number;
  /** 这一笔的颜色（0..1；淡彩和叠色都写预乘的 (c·v, v)）。 */
  readonly color: readonly [number, number, number];
  readonly accum: SpaceAccum;
  /** 现成的每格的表（space-prep.ts 缓存的，借来用、dispose 不放）。不给 = 自己建、自己放（测试）。 */
  readonly cells?: SpaceData;
  /** 现成的面表 / 三角形表（space-prep.ts 缓存的，借来用、dispose 不放；1-4d 第 3 条：落笔那一下不再现做）。不给 = 自己建、自己放（测试）。 */
  readonly tables?: FaceTables;
  /** 只在自己建表时用（测试比较用）：表里的位置、笔尖先减去的那一点。不给 = 物件原点 objectOrigin。 */
  readonly origin?: Pt3;
  /** 一帧的数据表（实例表 / 面单子 / 笔尖表）每张最多多少个数；不给 = 显卡每边上限和 2^24 定的那个。超了 = 分几批画（1-4d 第 4 条）；测试用小的逼出分批。 */
  readonly maxValues?: number;
}

/**
 * 面表 + 三角形表（1-4d 第 3 条，统筹定的：落笔那一下的花费不许跟着模型大小走）：只跟物件、摆放、那一套贴图坐标有关，跟这一笔无关——
 * 进画画工作台时随「画画的准备」一起建（space-prep.ts），落笔只借。所有位置先减去物件原点 origin 再上传（笔尖也减它）：以前减的是落笔那一点，
 * 那样表就得每一笔重做。三角形的公式钉在它自己的第一个角上（1-4c），所以这里减掉的只是一个整体平移。
 */
export interface FaceTables {
  /** 物件原点（世界）：表里的位置、笔尖都先减去它。 */
  readonly origin: Pt3;
  /** 面表（每张面两个数：三角形表里从第几个起、几个）、三角形表（每个 TRI_STRIDE 个数）——显卡上的数据图。 */
  readonly faces: SpaceData;
  readonly tris: SpaceData;
  /** 面号 → 面表里的槽号。 */
  readonly faceSlot: ReadonlyMap<number, number>;
  /** 面号 → 它的三角形的反解数据（tipRect 用；位置相对 origin）。 */
  readonly faceInv: ReadonlyMap<number, readonly TriInv[]>;
  /** 画布多边形 → 格子范围 [x, y, w, h]（和 tipCellsInPoly 扫的同一块）。 */
  readonly polyRect: ReadonlyMap<number, readonly [number, number, number, number]>;
}
/** 物件原点：这项目标所有三角形世界位置的外接框中心（离画的地方都不远：减掉它之后上传的 32 位数都在物件大小以内）。没有三角形 = 0。 */
export function objectOrigin(g: TargetGeo): Pt3 {
  const w = g.wpos;
  if (!w.length) return { x: 0, y: 0, z: 0 };
  let mx = Infinity, my = Infinity, mz = Infinity, Mx = -Infinity, My = -Infinity, Mz = -Infinity;
  for (let i = 0; i < w.length; i += 3) { const x = w[i], y = w[i + 1], z = w[i + 2]; if (x < mx) mx = x; if (x > Mx) Mx = x; if (y < my) my = y; if (y > My) My = y; if (z < mz) mz = z; if (z > Mz) Mz = z; }
  return { x: (mx + Mx) / 2, y: (my + My) / 2, z: (mz + Mz) / 2 };
}
/** 建面表 + 三角形表（随这项目标的三角形数涨：只在准备里调）。放得下的上限和 SpaceLayer 一样（超了 = 抛 PaintLimitError）。 */
export function buildFaceTables(gpu: SpaceGpu, g: TargetGeo, origin: Pt3 = objectOrigin(g)): FaceTables {
  const t = g.table, X = g.target.xform;
  const faces: number[] = [], tris: number[] = [];
  const faceSlot = new Map<number, number>(), faceInv = new Map<number, TriInv[]>(), polyRect = new Map<number, readonly [number, number, number, number]>();
  const R = (v: Pt3): Pt3 => ({ x: X[0] * v.x + X[1] * v.y + X[2] * v.z, y: X[4] * v.x + X[5] * v.y + X[6] * v.z, z: X[8] * v.x + X[9] * v.y + X[10] * v.z });
  for (const [f, fp] of t.faces) {
    faceSlot.set(f, faces.length / 2);
    faces.push(tris.length / TRI_STRIDE, fp.tris.length);
    const inv: TriInv[] = [];
    faceInv.set(f, inv);
    for (const tr of fp.tris) {
      const F = tr.formula, oW = { x: X[0] * F.o.x + X[1] * F.o.y + X[2] * F.o.z + X[3] - origin.x, y: X[4] * F.o.x + X[5] * F.o.y + X[6] * F.o.z + X[7] - origin.y, z: X[8] * F.o.x + X[9] * F.o.y + X[10] * F.o.z + X[11] - origin.z };
      const du = R(F.du), dv = R(F.dv);
      inv.push(triInv(oW, du, dv));
      // 上传的公式钉在第一个角 (u0, v0) 上：位置 = A + du·(s − 角)（A 用 64 位算好再减原点）。以前钉在画布原点：画布四千多格高时两个很大的数相减，硬边上差到 3/255（1-4c 量出来的）
      const A = { x: oW.x + du.x * tr.uvf[0] + dv.x * tr.uvf[1], y: oW.y + du.y * tr.uvf[0] + dv.y * tr.uvf[1], z: oW.z + du.z * tr.uvf[0] + dv.z * tr.uvf[1] };
      tris.push(tr.uvf[0], tr.uvf[1], tr.uvf[2], tr.uvf[3], tr.uvf[4], tr.uvf[5], A.x, A.y, A.z, du.x, du.y, du.z, dv.x, dv.y, dv.z);
    }
  }
  // 每块多边形的格子范围（和 tipCellsInPoly 扫的同一块：环的外接框往外 gap/2 + 0.5，夹在画布里）
  const Rg = t.gap / 2, W = t.width, H = t.height;
  t.polys.forEach((ring, p) => {
    let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
    for (let j = 0; j < ring.length; j += 2) { mx = Math.min(mx, ring[j]); Mx = Math.max(Mx, ring[j]); my = Math.min(my, ring[j + 1]); My = Math.max(My, ring[j + 1]); }
    const x0 = Math.max(0, Math.floor(mx - Rg - 0.5)), x1 = Math.min(W - 1, Math.ceil(Mx + Rg - 0.5)), y0 = Math.max(0, Math.floor(my - Rg - 0.5)), y1 = Math.min(H - 1, Math.ceil(My + Rg - 0.5));
    polyRect.set(p, [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  });
  const fd = pack(gpu, faces, "face table");
  let td: SpaceData;
  try { td = pack(gpu, tris, "triangle table"); } catch (err) { gpu.release(fd); throw err; }
  return { origin, faces: fd, tris: td, faceSlot, faceInv, polyRect };
}
/** 放掉面表 / 三角形表（准备放的时候）。 */
export function releaseFaceTables(gpu: SpaceGpu, ft: FaceTables): void { gpu.release(ft.faces); gpu.release(ft.tris); }

/**
 * 每格的表（1-4c）：每格 4 个 16 位无符号整数 = 8 字节，显卡上是 RGBA16UI。
 *   [0] [1] = 画布多边形编号 + 1 的低、高 16 位（0 = 没人要）；[2] [3] = 取样点离格子中心的偏移 x、y（texel-table.ts sampleOffset，1/1024 格为单位）+ 32768（32768 = 中心）。
 * 容量：编号 + 1 ≤ 2^32 − 1（再受 MAX_POLYS 限）；偏移 −32768 … 32767 份 ≈ ±32 格（取样点离中心不超过间隔的一半，buildTexelTable 把 gap 限在 63 以内）。
 * 大小：1024² = 8 MB，2048² = 32 MB。只跟贴图坐标有关（归属表 + 多边形）。
 */
export function cellTable(t: TexelTable): Uint16Array {
  if (t.polys.length > MAX_POLYS) throw new PaintLimitError(`cellTable: ${t.polys.length} canvas polygons (> ${MAX_POLYS})`, `这个物件画不了：画布上的块太多（${t.polys.length} 块，最多 ${MAX_POLYS} 块）`);
  const W = t.width, H = t.height, out = new Uint16Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = y * W + x, o = t.owner[c];
    if (o < 0) continue;
    const s = sampleOffset(t, x, y)!;
    packCell(out, c, o + 1, s[0], s[1]);
  }
  return out;
}
/** 往每格的表里写一格（容量在这里查：编号 + 1 在 1 … 2^32 − 1、偏移在 −32768 … 32767；超了 = 抛）。 */
export function packCell(out: Uint16Array, c: number, idPlus1: number, ox: number, oy: number): void {
  if (!(Number.isInteger(idPlus1) && idPlus1 >= 1 && idPlus1 <= 0xffffffff)) throw new Error(`packCell: polygon id + 1 = ${idPlus1} outside 1..2^32-1`);
  if (!(Number.isInteger(ox) && Number.isInteger(oy) && ox >= -32768 && ox <= 32767 && oy >= -32768 && oy <= 32767)) throw new Error(`packCell: sample offset (${ox}, ${oy}) outside -32768..32767 (1/${SAMPLE_Q} cell units)`);
  const b = 4 * c;
  out[b] = idPlus1 & 0xffff; out[b + 1] = idPlus1 >>> 16; out[b + 2] = ox + 32768; out[b + 3] = oy + 32768;
}
/**
 * 一项目标上跟这一笔无关、只跟物件和画布有关的那几个上限（画画的准备进工作台时就查，落笔之前就知道画不了；SpaceLayer 建的时候再查一遍）：
 * 画布每边 ≤ 显卡上限、多边形块数 ≤ MAX_POLYS、每张面三角形 ≤ MAX_TRIS、面表 / 三角形表放得进数据图。超了 = 抛 PaintLimitError（带人话、点出是哪张面）。
 */
export function checkLayerLimits(gpu: SpaceGpu, t: TexelTable): void {
  if (t.width > MAX_CANVAS_SIDE || t.height > MAX_CANVAS_SIDE) throw new PaintLimitError(`SpaceLayer: canvas ${t.width}x${t.height} exceeds ${MAX_CANVAS_SIDE} per side (sample points stop being exact in float32)`, `这张画画不了：画布（${t.width} × ${t.height}）每边超过 ${MAX_CANVAS_SIDE} 格，笔对不准格子`);
  if (t.width > gpu.maxSize || t.height > gpu.maxSize) throw new PaintLimitError(`SpaceLayer: canvas ${t.width}x${t.height} exceeds GPU max ${gpu.maxSize}`, `这张画画不了：画布（${t.width} × ${t.height}）比这台设备的显卡能放的（每边 ${gpu.maxSize}）大`);
  if (t.polys.length > MAX_POLYS) throw new PaintLimitError(`SpaceLayer: ${t.polys.length} canvas polygons (> ${MAX_POLYS})`, `这个物件画不了：画布上的块太多（${t.polys.length} 块，最多 ${MAX_POLYS} 块）`);
  let nt = 0;
  for (const [f, fp] of t.faces) {
    if (fp.tris.length > MAX_TRIS) throw new PaintLimitError(`SpaceLayer: face ${f} has ${fp.tris.length} triangles (> ${MAX_TRIS})`, `这张面太大了，画不了（面 ${f}：切出来 ${fp.tris.length} 个三角形，笔每张面最多 ${MAX_TRIS} 个）；把它切成几块就能画`);
    nt += fp.tris.length;
  }
  const cap = Math.min(DATA_W * gpu.maxSize, MAX_DATA);
  if (Math.max(2 * t.faces.size, TRI_STRIDE * nt) > cap) throw new PaintLimitError(`SpaceLayer: ${t.faces.size} faces / ${nt} triangles do not fit data images (cap ${cap} values)`, "这个物件画不了：面太多，笔的数据表放不下");
}
/** 每格的表传到显卡上（画布每边超过显卡上限 = 抛 PaintLimitError）。 */
export function uploadCellTable(gpu: SpaceGpu, t: TexelTable): SpaceData {
  if (t.width > gpu.maxSize || t.height > gpu.maxSize) throw new PaintLimitError(`cellTable: canvas ${t.width}x${t.height} exceeds GPU max ${gpu.maxSize}`, `这张画画不了：画布（${t.width} × ${t.height}）比这台设备的显卡能放的（每边 ${gpu.maxSize}）大`);
  return gpu.data(t.width, t.height, cellTable(t), "rgba16ui");
}

/** 一笔在一张贴图（名单里的一项）上的薄层：定型层 + 当帧那张。 */
export class SpaceLayer {
  readonly frozen: SpaceImage;
  readonly frame: SpaceImage;
  private readonly gpu: SpaceGpu;
  private readonly g: TargetGeo;
  private readonly ti: number;
  private readonly o: SpaceLayerOpts;
  private readonly job: Job;
  private readonly jobId: number;
  private readonly fixed: Record<string, SpaceData>;
  /** 每格的表 / 面表是不是自己建的（自己建的 dispose 时放；借来的不放）。 */
  private readonly ownCells: boolean;
  private readonly ownTables: boolean;
  /** 面表 + 三角形表 + 反解数据 + 多边形的格子范围（借来的或自己建的）。 */
  private readonly ft: FaceTables;
  private bounds: [number, number, number, number] | null = null;
  /**
   * 当帧那张上次 takeChanged 之后变过的格子（1-4d 第 6 条：只合成 / 只拷变了的那些）：脏格子位图（内核 dirty-rects.ts，8 格见方），每颗笔尖在每块多边形上的方框直接标进去
   * （不先攒成单子：花费只随碰到的格数涨，统筹 11-11）。每帧变的 ⊆ 上一帧的尾巴 ∪ 这一帧新定型的 ∪ 这一帧的尾巴（定型层只往里画、当帧那张 = 定型层拷过来 + 尾巴；
   * 这一笔碰过的范围以外从没写过 = 透明）。定型层清掉重画（抬笔）= 整笔的范围。
   */
  private changed: DirtyCells;
  /** 这一帧标格花了多少毫秒（量；1-4d 第 6 条判据「算这张图 ≤ 0.2 毫秒」）。 */
  lastMarkMs = 0;
  /**
   * 抬笔整笔重画那一次（resetFrozen 起）画进去的 item 的格（1-4d 第 8 条）：交给落层（HostOverlayInput.cells）只读回这些格。
   * 和画进去的是同一批 item 的方框（update 里标的那几行），不另算范围；内核还会自己核一遍（报的格以外真变了 = 照旧读整个方框）。没在整笔重画 = null。
   */
  private strokeCellsMap: DirtyCells | null = null;
  get strokeCells(): DirtyCells | null { return this.strokeCellsMap; }
  /** 上一帧尾巴画过的方框（这一帧要还原成定型层的样子：再标一遍）。 */
  private prevTail: (readonly [number, number, number, number])[] = [];
  /** 这一笔到现在一帧里最大的那张数据表有多少个数、是哪张（量「一帧的数据表放不下」离上限多远；1-7 合之前统筹要的数）；batches = 一次画最多分了几批（1-4d 第 4 条）。 */
  readonly peak = { values: 0, table: "", cap: 0, batches: 0 };

  constructor(gpu: SpaceGpu, g: TargetGeo, ti: number, o: SpaceLayerOpts) {
    this.gpu = gpu; this.g = g; this.ti = ti; this.o = o;
    ensureProgram(gpu);   // 薄层程序在这个显卡接口上只登记一次（唯一的登记处）
    const t = g.table, W = t.width, H = t.height, X = g.target.xform;
    this.frozen = gpu.image(W, H); this.frame = gpu.image(W, H);
    this.changed = new DirtyCells(W, H);
    this.jobId = nextJob++;
    this.job = { g, items: [], hardness: o.hardness, color: o.color };
    jobs.set(this.jobId, this.job);
    checkLayerLimits(gpu, t);
    if (o.cells && (o.cells.w !== W || o.cells.h !== H || o.cells.format !== "rgba16ui")) throw new Error(`SpaceLayer: borrowed cell table ${o.cells.w}x${o.cells.h} ${o.cells.format} does not match canvas ${W}x${H}`);
    this.ownCells = !o.cells; this.ownTables = !o.tables;
    this.ft = o.tables ?? buildFaceTables(gpu, g, o.origin);
    this.fixed = { u_faces: this.ft.faces, u_tris: this.ft.tris };
    try { this.fixed.u_cell = o.cells ?? uploadCellTable(gpu, t); } catch (err) { if (this.ownTables) releaseFaceTables(gpu, this.ft); throw err; }
  }

  /** 报给内核的范围（这一笔到现在碰过的所有实例方块的并）；什么都没碰 = null。 */
  range(): { x: number; y: number; w: number; h: number } | null { const b = this.bounds; return b ? { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] } : null; }

  /**
   * 这一帧：fresh = 还没画进定型层的笔尖（按先后；前面已经定型画过的不再给），其中前 frozenHere 颗这一帧定型。
   * 新定型的画进定型层（只画一次）；定型层拷到当帧那张，再画尾巴。上传的实例 / 笔尖 / 面单子只有这一帧要画的（每帧的活只随新增的笔尖涨）。
   */
  update(fresh: readonly { readonly tip: InkTip; readonly reach: Reach }[], frozenHere: number): void {
    const tips = fresh;
    const items = (from: number, to: number): Item[] => {
      const out: Item[] = [];
      for (let i = from; i < to; i++) {
        const polys = tips[i].reach.get(this.ti);
        if (!polys) continue;
        for (const [poly, trisList] of polys) {
          const pr = this.ft.polyRect.get(poly);
          if (!pr) continue;
          const fs = [...new Set(trisList.map((k) => this.g.grid.face[k]))].sort((a, b) => a - b).filter((f) => this.ft.faceSlot.has(f));
          if (fs.length > MAX_FACES) throw new PaintLimitError(`SpaceLayer: canvas polygon ${poly} has ${fs.length} faces under one tip (> ${MAX_FACES})`, `这一笔画不了：笔下有 ${fs.length} 张面共用画布上同一块地方（最多 ${MAX_FACES} 张）`);
          const rect = this.tipRect(tips[i].tip, fs, pr);
          if (rect) out.push({ tip: tips[i].tip, tipIdx: i, poly, tris: trisList, faces: fs, rect });
        }
      }
      return out;
    };
    const k = Math.max(0, Math.min(frozenHere, tips.length)), newFrozen = items(0, k), tail = items(k, tips.length);
    const tm = performance.now(), ch = this.changed, mark = (r: readonly [number, number, number, number]): void => ch.mark(r[0], r[1], r[2], r[3]);
    const sc = this.strokeCellsMap;   // 抬笔整笔重画时：画进去的 item 另记一份（落层只读这些格）
    for (const r of this.prevTail) mark(r);
    for (const it of newFrozen) { mark(it.rect); sc?.mark(it.rect[0], it.rect[1], it.rect[2], it.rect[3]); }
    for (const it of tail) { mark(it.rect); sc?.mark(it.rect[0], it.rect[1], it.rect[2], it.rect[3]); }
    this.prevTail = tail.map((it) => it.rect);
    this.lastMarkMs = performance.now() - tm;
    for (const it of newFrozen) this.grow(it.rect);
    for (const it of tail) this.grow(it.rect);
    if (newFrozen.length) this.drawItems(this.frozen, newFrozen, tips);
    // 定型层 → 当帧那张：只拷这一帧标过的格（上一帧的尾巴 ∪ 新定型的 ∪ 这一帧的尾巴；抬笔重画时 resetFrozen 标了整笔的范围）。别处当帧那张本来就 = 定型层
    //   （当帧那张 = 定型层 + 尾巴，尾巴画过的地方都标过）。以前每帧拷整个外接框 = 随这一笔走过多大一片涨（1-4d 第 9 条），一次实例化画完。
    const runs = this.changed.runs();
    if (runs.length) this.gpu.copyRects(this.frozen, this.frame, runs);
    if (tail.length) this.drawItems(this.frame, tail, tips);
  }

  /** 定型层清掉（抬笔时收笔渐细重画整笔用）：下一次 update 从头画。范围留着（只会更大）。 */
  /** 上次问过之后当帧那张变过的格子（脏格子位图；一格都没变 = null），问完换一张空的。 */
  takeChanged(): DirtyCells | null {
    const c = this.changed;
    this.changed = new DirtyCells(c.w, c.h);
    return c.empty ? null : c;
  }
  resetFrozen(): void {
    const b = this.bounds;   // 定型层清掉重画：这一笔碰过的整块都可能变
    if (b) this.changed.mark(b[0], b[1], b[2] - b[0], b[3] - b[1]);
    this.strokeCellsMap = new DirtyCells(this.changed.w, this.changed.h);   // 整笔重画开始：接下来画进去的 item 记成这一笔的格
    this.gpu.draw({ program: SPACE_TIP.name, target: this.frozen, clear: true, accum: this.o.accum, instances: new Float32Array(0), count: 0, data: this.fixed, uniforms: { u_size: [this.frozen.w, this.frozen.h], u_first: 0, u_hardness: this.o.hardness, u_color: [...this.o.color], u_job: this.jobId } });
  }
  dispose(): void { jobs.delete(this.jobId); if (this.ownTables) releaseFaceTables(this.gpu, this.ft); if (this.ownCells) this.gpu.release(this.fixed.u_cell); this.gpu.release(this.frozen); this.gpu.release(this.frame); }

  /** 这颗笔尖在这块多边形上的实例方块（格子）：贴图上的外接框往外放块边那一圈（取样点离格子中心最多 gap/2）再多一格，夹进多边形的格子范围；夹完是空的 = null（画不到）。 */
  private tipRect(tip: InkTip, faces: readonly number[], pr: readonly [number, number, number, number]): [number, number, number, number] | null {
    const O = this.ft.origin, box = tipUvBox(faces.flatMap((f) => this.ft.faceInv.get(f) ?? []), tip.x - O.x, tip.y - O.y, tip.z - O.z, tip.r);
    if (!box) return [...pr];
    const m = this.g.table.gap / 2 + 1;
    const x0 = Math.max(pr[0], Math.floor(box[0] - m - 0.5)), y0 = Math.max(pr[1], Math.floor(box[1] - m - 0.5));
    const x1 = Math.min(pr[0] + pr[2] - 1, Math.ceil(box[2] + m - 0.5)), y1 = Math.min(pr[1] + pr[3] - 1, Math.ceil(box[3] + m - 0.5));
    return x1 < x0 || y1 < y0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
  }

  private grow(r: readonly [number, number, number, number]): void {
    const b = this.bounds;
    this.bounds = b ? [Math.min(b[0], r[0]), Math.min(b[1], r[1]), Math.max(b[2], r[0] + r[2]), Math.max(b[3], r[1] + r[3])] : [r[0], r[1], r[0] + r[2], r[1] + r[3]];
  }

  /** 一帧的数据表每张最多多少个数：显卡每边上限和 2^24 定的，SpaceLayerOpts.maxValues 可以再压小（测试）。 */
  private dataCap(): number { return Math.min(DATA_W * this.gpu.maxSize, MAX_DATA, this.o.maxValues ?? Infinity); }

  /**
   * 把这些 item 画进 target（1-4d 第 4 条：一帧的数据表放不下 = 分几批画，不再取消这一笔）：按先后切成连续的几批，每批的实例表 / 面单子 / 笔尖表都放得下；
   * 一批一次 draw、按原来的先后画 = 叠出来和一次画完一样（叠色、取最大都只看先后）。每批的表各自从 0 编号（笔尖表只放这一批用到的那一段笔尖，item 按笔尖排着，是连着的一段）。
   * 软件版的程序读 job.items（不读数据图）：每批换成这一批、u_first = 0，和显卡那一半对上。一颗 item 自己就放不下 = pack 抛人话（实际碰不到：一颗最多 4 + 8 + 8 个数）。
   */
  private drawItems(target: SpaceImage, items: readonly Item[], tips: readonly { readonly tip: InkTip }[]): void {
    const cap = this.dataCap();
    let s = 0, batches = 0;
    while (s < items.length) {
      const t0 = items[s].tipIdx;
      let e = s, nInst = 0, nFace = 0;
      while (e < items.length) {
        const it = items[e], ni = nInst + 4, nf = nFace + it.faces.length, nt = (it.tipIdx - t0 + 1) * TIP_STRIDE;
        if (e > s && (ni > cap || nf > cap || nt > cap)) break;
        nInst = ni; nFace = nf; e++;
      }
      const batch = items.slice(s, e), data = this.packBatch(batch, tips, t0);
      this.job.items = batch;
      this.draw(target, batch, data);
      for (const d of Object.values(data)) this.gpu.release(d);
      s = e; batches++;
    }
    if (batches > this.peak.batches) this.peak.batches = batches;
  }

  /** 一批的实例表、笔尖表、面单子（每批整份传；实例表里的笔尖编号和面单子的起点都从这一批的开头算）。 */
  private packBatch(batch: readonly Item[], tips: readonly { readonly tip: InkTip }[], t0: number): Record<string, SpaceData> {
    const inst: number[] = [], flist: number[] = [], nt = batch[batch.length - 1].tipIdx - t0 + 1, tipv = new Float32Array(nt * TIP_STRIDE), O = this.ft.origin;
    for (let i = 0; i < nt; i++) { const tip = tips[t0 + i].tip, b = i * TIP_STRIDE; tipv[b] = tip.x - O.x; tipv[b + 1] = tip.y - O.y; tipv[b + 2] = tip.z - O.z; tipv[b + 3] = tip.r; tipv[b + 4] = tip.alpha; }
    for (const it of batch) {
      inst.push(it.tipIdx - t0, it.poly, flist.length, it.faces.length);
      for (const f of it.faces) flist.push(this.ft.faceSlot.get(f)!);
    }
    this.peak.cap = this.dataCap();
    for (const [n, t] of [[inst.length, "instance table"], [flist.length, "face list"], [tipv.length, "tip table"]] as const) if (n > this.peak.values) { this.peak.values = n; this.peak.table = t; }
    return { u_inst: pack(this.gpu, inst, "instance table"), u_flist: pack(this.gpu, flist, "face list"), u_tips: pack(this.gpu, tipv, "tip table") };
  }

  private draw(target: SpaceImage, items: readonly Item[], data: Record<string, SpaceData>): void {
    const n = items.length, inst = new Float32Array(n * 4), b = this.bounds!;
    items.forEach((it, k) => inst.set(it.rect, k * 4));
    this.gpu.draw({
      program: SPACE_TIP.name, target, clear: false, accum: this.o.accum, instances: inst, count: n,
      scissor: { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] },
      data: { ...this.fixed, ...data },
      uniforms: { u_size: [target.w, target.h], u_first: 0, u_hardness: this.o.hardness, u_color: [...this.o.color], u_job: this.jobId },
    });
  }
}
