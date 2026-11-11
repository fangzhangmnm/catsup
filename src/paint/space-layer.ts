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
import type { SpaceAccum, SpaceData, SpaceGpu, SpaceImage, SpaceProgram } from "./space-gpu.ts";
import type { TargetGeo } from "./space-target.ts";
import { tipCellsInPoly, type InkTip } from "./tip-truth.ts";
import type { Reach } from "./tip-reach.ts";
import { samplePoint } from "./texel-table.ts";
import { STAMP_FALLOFF_GLSL } from "./kernel/src/backend/gl/stamp-falloff.ts";
import type { Pt3 } from "../kernel/geom.ts";

/** 数据图一行几个数（一维的表按这个宽度折成二维）。 */
export const DATA_W = 2048;
/** 一块画布多边形下挂的面最多几张、一张面最多几个三角形（着色器里那两圈的上限；超了 = 抛，施工单「停下来报」那一条）。 */
export const MAX_FACES = 8, MAX_TRIS = 64;
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
uniform sampler2D u_inst, u_tips, u_flist, u_faces, u_tris, u_samp;
uniform highp usampler2D u_cell;   // 每格：R = 画布多边形编号 + 1（0 = 没人要），G = 块边格子在取样点表里的号 + 1（0 = 用格子中心）
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
  uvec2 cv = texelFetch(u_cell, ivec2(x, y), 0).rg;   // 每格的紧凑表和画布一样大：按格子坐标取（不是一维折行的那种）
  if (int(cv.r) - 1 != poly) discard;
  int si = int(cv.g) - 1;
  vec2 s = si < 0 ? vec2(float(x) + 0.5, float(y) + 0.5) : vec2(at(u_samp, 2 * si), at(u_samp, 2 * si + 1));
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
    vec3 pos = vec3(at(u_tris, b + 6), at(u_tris, b + 7), at(u_tris, b + 8)) + vec3(at(u_tris, b + 9), at(u_tris, b + 10), at(u_tris, b + 11)) * s.x + vec3(at(u_tris, b + 12), at(u_tris, b + 13), at(u_tris, b + 14)) * s.y;
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

/** 一维的数折成 DATA_W 宽的数据图。 */
function pack(gpu: SpaceGpu, values: ArrayLike<number>): SpaceData {
  const h = Math.max(1, Math.ceil(values.length / DATA_W)), a = new Float32Array(DATA_W * h);
  a.set(values as ArrayLike<number>);
  return gpu.data(DATA_W, h, a);
}

export interface SpaceLayerOpts {
  readonly hardness: number;
  /** 这一笔的颜色（0..1；淡彩和叠色都写预乘的 (c·v, v)）。 */
  readonly color: readonly [number, number, number];
  readonly accum: SpaceAccum;
  /** 落笔的那一点（世界）：所有位置先减去它再上传。 */
  readonly origin: Pt3;
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
  /** 每块画布多边形：格子范围 + 它的面在面表里的槽号。 */
  private readonly polyRect = new Map<number, readonly [number, number, number, number]>();
  private readonly faceSlot = new Map<number, number>();
  /** 每张面（面号）的三角形反解数据（tipRect 用）。 */
  private readonly faceInv = new Map<number, TriInv[]>();
  private bounds: [number, number, number, number] | null = null;

  constructor(gpu: SpaceGpu, g: TargetGeo, ti: number, o: SpaceLayerOpts) {
    this.gpu = gpu; this.g = g; this.ti = ti; this.o = o;
    const t = g.table, W = t.width, H = t.height, X = g.target.xform;
    this.frozen = gpu.image(W, H); this.frame = gpu.image(W, H);
    this.jobId = nextJob++;
    this.job = { g, items: [], hardness: o.hardness, color: o.color };
    jobs.set(this.jobId, this.job);
    // 每格的紧凑表（统筹 11-11「轻量」）：R = 画布多边形编号 + 1，G = 块边格子在取样点表里的号 + 1（取样点和格子中心不一样的只有块边上那一圈；表里是精确的 32 位浮点）
    if (t.polys.length > 65534) throw new Error(`SpaceLayer: ${t.polys.length} canvas polygons (> 65534)`);
    const cell = new Uint16Array(W * H * 2), samp: number[] = [];
    for (let c = 0; c < W * H; c++) {
      const o = t.owner[c];
      if (o < 0) continue;
      cell[2 * c] = o + 1;
      const x = c % W, y = Math.floor(c / W), s = samplePoint(t, x, y)!;
      if (s[0] === x + 0.5 && s[1] === y + 0.5) continue;
      samp.push(s[0], s[1]);
      if (samp.length / 2 > 65535) throw new Error("SpaceLayer: too many block-edge cells (> 65535)");
      cell[2 * c + 1] = samp.length / 2;
    }
    // 每张面的三角形（贴图坐标三个角 + 世界里的公式，减去落笔点）
    const faces: number[] = [], tris: number[] = [];
    const R = (v: Pt3): Pt3 => ({ x: X[0] * v.x + X[1] * v.y + X[2] * v.z, y: X[4] * v.x + X[5] * v.y + X[6] * v.z, z: X[8] * v.x + X[9] * v.y + X[10] * v.z });
    for (const [f, fp] of t.faces) {
      if (fp.tris.length > MAX_TRIS) throw new Error(`SpaceLayer: face ${f} has ${fp.tris.length} triangles (> ${MAX_TRIS})`);
      this.faceSlot.set(f, faces.length / 2);
      faces.push(tris.length / TRI_STRIDE, fp.tris.length);
      const inv: TriInv[] = [];
      this.faceInv.set(f, inv);
      for (const tr of fp.tris) {
        const F = tr.formula, oW = { x: X[0] * F.o.x + X[1] * F.o.y + X[2] * F.o.z + X[3] - o.origin.x, y: X[4] * F.o.x + X[5] * F.o.y + X[6] * F.o.z + X[7] - o.origin.y, z: X[8] * F.o.x + X[9] * F.o.y + X[10] * F.o.z + X[11] - o.origin.z };
        const du = R(F.du), dv = R(F.dv);
        inv.push(triInv(oW, du, dv));
        tris.push(tr.uvf[0], tr.uvf[1], tr.uvf[2], tr.uvf[3], tr.uvf[4], tr.uvf[5], oW.x, oW.y, oW.z, du.x, du.y, du.z, dv.x, dv.y, dv.z);
      }
    }
    // 每块多边形的格子范围（和 tipCellsInPoly 扫的同一块：环的外接框往外 gap/2 + 0.5，夹在画布里）
    const Rg = t.gap / 2;
    t.polys.forEach((ring, p) => {
      let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
      for (let j = 0; j < ring.length; j += 2) { mx = Math.min(mx, ring[j]); Mx = Math.max(Mx, ring[j]); my = Math.min(my, ring[j + 1]); My = Math.max(My, ring[j + 1]); }
      const x0 = Math.max(0, Math.floor(mx - Rg - 0.5)), x1 = Math.min(W - 1, Math.ceil(Mx + Rg - 0.5)), y0 = Math.max(0, Math.floor(my - Rg - 0.5)), y1 = Math.min(H - 1, Math.ceil(My + Rg - 0.5));
      this.polyRect.set(p, [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
    });
    this.fixed = { u_cell: gpu.data(W, H, cell, "rg16ui"), u_samp: pack(gpu, samp.length ? samp : [0, 0]), u_faces: pack(gpu, faces), u_tris: pack(gpu, tris) };
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
          const pr = this.polyRect.get(poly);
          if (!pr) continue;
          const fs = [...new Set(trisList.map((k) => this.g.grid.face[k]))].sort((a, b) => a - b).filter((f) => this.faceSlot.has(f));
          if (fs.length > MAX_FACES) throw new Error(`SpaceLayer: canvas polygon ${poly} has ${fs.length} faces under one tip (> ${MAX_FACES})`);
          const rect = this.tipRect(tips[i].tip, fs, pr);
          if (rect) out.push({ tip: tips[i].tip, tipIdx: i, poly, tris: trisList, faces: fs, rect });
        }
      }
      return out;
    };
    const k = Math.max(0, Math.min(frozenHere, tips.length)), newFrozen = items(0, k), tail = items(k, tips.length);
    this.job.items = [...newFrozen, ...tail];
    for (const it of this.job.items) this.grow(it.rect);
    const data = this.perDraw(tips);
    if (newFrozen.length) this.draw(this.frozen, 0, newFrozen, data, false);
    const b = this.bounds;   // 只拷这一笔碰过的那一块（内核只读这一块；当帧那张别处从没写过 = 透明）
    if (b) this.gpu.copy(this.frozen, this.frame, { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] });
    if (tail.length) this.draw(this.frame, newFrozen.length, tail, data, false);
    for (const d of Object.values(data)) this.gpu.release(d);
  }

  /** 定型层清掉（抬笔时收笔渐细重画整笔用）：下一次 update 从头画。范围留着（只会更大）。 */
  resetFrozen(): void {
    this.gpu.draw({ program: SPACE_TIP.name, target: this.frozen, clear: true, accum: this.o.accum, instances: new Float32Array(0), count: 0, data: this.fixed, uniforms: { u_size: [this.frozen.w, this.frozen.h], u_first: 0, u_hardness: this.o.hardness, u_color: [...this.o.color], u_job: this.jobId } });
  }
  dispose(): void { jobs.delete(this.jobId); for (const d of Object.values(this.fixed)) this.gpu.release(d); this.gpu.release(this.frozen); this.gpu.release(this.frame); }

  /** 这颗笔尖在这块多边形上的实例方块（格子）：贴图上的外接框往外放块边那一圈（取样点离格子中心最多 gap/2）再多一格，夹进多边形的格子范围；夹完是空的 = null（画不到）。 */
  private tipRect(tip: InkTip, faces: readonly number[], pr: readonly [number, number, number, number]): [number, number, number, number] | null {
    const O = this.o.origin, box = tipUvBox(faces.flatMap((f) => this.faceInv.get(f) ?? []), tip.x - O.x, tip.y - O.y, tip.z - O.z, tip.r);
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

  /** 这一帧的实例表、笔尖表、面单子（每帧整份重传；条数 = 实例数，小）。 */
  private perDraw(tips: readonly { readonly tip: InkTip }[]): Record<string, SpaceData> {
    const inst: number[] = [], flist: number[] = [], tipv = new Float32Array(Math.max(1, tips.length) * TIP_STRIDE), O = this.o.origin;
    tips.forEach(({ tip }, i) => { const b = i * TIP_STRIDE; tipv[b] = tip.x - O.x; tipv[b + 1] = tip.y - O.y; tipv[b + 2] = tip.z - O.z; tipv[b + 3] = tip.r; tipv[b + 4] = tip.alpha; });
    for (const it of this.job.items) {
      inst.push(it.tipIdx, it.poly, flist.length, it.faces.length);
      for (const f of it.faces) flist.push(this.faceSlot.get(f)!);
    }
    return { u_inst: pack(this.gpu, inst), u_flist: pack(this.gpu, flist), u_tips: pack(this.gpu, tipv) };
  }

  private draw(target: SpaceImage, first: number, items: readonly Item[], data: Record<string, SpaceData>, clear: boolean): void {
    const n = items.length, inst = new Float32Array(n * 4), b = this.bounds!;
    items.forEach((it, k) => inst.set(it.rect, k * 4));
    this.gpu.draw({
      program: SPACE_TIP.name, target, clear, accum: this.o.accum, instances: inst, count: n,
      scissor: { x: b[0], y: b[1], w: b[2] - b[0], h: b[3] - b[1] },
      data: { ...this.fixed, ...data },
      uniforms: { u_size: [target.w, target.h], u_first: first, u_hardness: this.o.hardness, u_color: [...this.o.color], u_job: this.jobId },
    });
  }
}
