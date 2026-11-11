// 一笔在一张贴图上的薄层（贴图主线 1-4b）：三维自己的显卡接口的软件版 + 薄层程序 vs 1-4a 的标准答案。created 2026-11-11 by Claude Opus 5.5
// 薄层逐格 = 标准答案的 8 位版（裁定 ②：每颗笔尖写一次量化一次，和画画内核二维同一种次序；放行线 1/255）；连续版当参考值（叠色约差 1.06/255，原因写在 strokeTruth8 头）。
// 定型分两次画 = 一次画完；范围之外全是零。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpaceLayer, SPACE_TIP } from "../src/paint/space-layer.ts";
import { buildTargetGeo } from "../src/paint/space-target.ts";
import { tipReach } from "../src/paint/tip-reach.ts";
import { strokeTruth, strokeTruth8, type InkTip } from "../src/paint/tip-truth.ts";
import { sphereTriDist } from "../src/paint/tip-reach.ts";
import { P, gridMesh, laidOut, targetOf } from "./paint-space-kit.ts";
import type { Xform } from "../src/scene/xform.ts";

/** 一块起伏的网格、一串沿着它走的笔尖（球心落在表面上），每颗笔尖碰到的三角形照 1-4a 找。 */
function rig(o: { alpha?: number; r?: number; xform?: Xform; jitter?: boolean } = {}) {
  const m = gridMesh(6, 2, (x, y) => 0.15 * Math.sin(2 * x) * Math.cos(1.5 * y)), uv = laidOut(m, "uv", m.faces(), { density: 24 });
  const g = buildTargetGeo(targetOf(m, uv, o.xform ? { xform: o.xform } : {})), tips: { tip: InkTip; reach: ReturnType<typeof tipReach> }[] = [], X = o.xform;
  for (let i = 0; i < 18; i++) {
    const lx = -0.8 + i * 0.09, ly = 0.3 * Math.sin(i * 0.4), lz = 0.15 * Math.sin(2 * lx) * Math.cos(1.5 * ly);
    const r = (o.r ?? 0.12) * (o.jitter ? 0.5 + ((i * 7) % 5) / 4 : 1), off = o.jitter ? r * 0.6 * Math.sin(i * 1.7) : 0;   // 大小不一、球心离面远近不一（沿 z 偏）
    const x = X ? X[0] * lx + X[1] * ly + X[2] * (lz + off) + X[3] : lx, y = X ? X[4] * lx + X[5] * ly + X[6] * (lz + off) + X[7] : ly, z = X ? X[8] * lx + X[9] * ly + X[10] * (lz + off) + X[11] : lz + off;
    let best = -1, bd = Infinity; for (let t = 0; t < g.grid.face.length; t++) { const d = sphereTriDist(x, y, z, g.wpos, 9 * t); if (d < bd) { bd = d; best = t; } }
    const tip: InkTip = { x, y, z, r, alpha: o.alpha ?? 0.6 };
    tips.push({ tip, reach: tipReach([g], tip, [{ ti: 0, tri: best }]) });
  }
  return { g, tips, W: g.table.width, H: g.table.height };
}
function run(r: ReturnType<typeof rig>, accum: "max" | "over", hardness: number, color: [number, number, number], frozenSteps: number[] = [r.tips.length]) {
  const gpu = new SoftSpaceGpu(); gpu.register(SPACE_TIP);
  const L = new SpaceLayer(gpu, r.g, 0, { hardness, color, accum, origin: r.tips[0].tip });
  let drawn = 0;   // 每帧只给还没定型画过的笔尖（前 k − drawn 颗这一帧定型）
  for (const k of frozenSteps) { const end = frozenSteps[frozenSteps.length - 1] === k ? Math.max(k, r.tips.length) : Math.min(r.tips.length, k + 3); L.update(r.tips.slice(drawn, end), k - drawn); drawn = k; }   // 中间的帧带 3 颗尾巴
  return { px: gpu.read(L.frame), range: L.range() };
}
/** 和标准答案比：8 位版（裁定 ②，放行线 1/255）的最大差 + 连续版（参考值）的最大差（0..255）、吃到墨的格数。 */
function compare(r: ReturnType<typeof rig>, px: Uint8Array, accum: "max" | "over", hardness: number, color: [number, number, number]) {
  const truth = strokeTruth([r.g], r.tips, hardness, accum).get(0) ?? new Map<number, number>(), t8 = strokeTruth8([r.g], r.tips, hardness, accum, color).get(0) ?? new Map<number, Uint8ClampedArray>();
  let maxd = 0, maxRef = 0, inked = 0;
  for (let c = 0; c < r.W * r.H; c++) {
    const a = truth.get(c) ?? 0, want = [color[0] * a, color[1] * a, color[2] * a, a].map((x) => x * 255), w8 = t8.get(c);
    if (a > 0) inked++;
    for (let k = 0; k < 4; k++) { maxRef = Math.max(maxRef, Math.abs(px[c * 4 + k] - want[k])); maxd = Math.max(maxd, Math.abs(px[c * 4 + k] - (w8 ? w8[k] : 0))); }
  }
  return { maxd, maxRef, inked };
}

describe("薄层 = 标准答案（三维显卡接口的软件版，1-4b）", () => {
  for (const [accum, hardness, alpha] of [["max", 0.3, 0.6], ["max", 1, 0.9], ["over", 0.3, 0.6], ["over", 0.8, 0.25]] as const) {
    it(`${accum === "max" ? "淡彩（取最大）" : "叠色（预乘叠加）"}、硬度 ${hardness}、浓度 ${alpha}：逐格和标准答案比`, () => {
      const r = rig({ alpha }), color: [number, number, number] = [0.9, 0.4, 0.1], { px } = run(r, accum, hardness, color);
      const { maxd, maxRef, inked } = compare(r, px, accum, hardness, color);
      assert(inked > 100, `吃到墨的格子 ${inked}`);
      console.log(`    ${accum} 硬度 ${hardness} 浓度 ${alpha}：和 8 位标准答案最大差 ${maxd} / 255；和连续版（参考）最大差 ${maxRef.toFixed(3)} / 255（${inked} 格）`);
      assert(maxd <= 1, `和 8 位标准答案最大差 ${maxd} / 255`);
      // 连续版只当参考：淡彩只有量化（≤ 0.5）；叠色每一步的舍入会留一部分在下一步里，1-4b 量到约 1.06/255——这是 8 位累积本身（画画内核二维的叠色同样），不是写错
      assert(maxRef <= (accum === "max" ? 0.5 : 1.5) + 1e-9, `和连续版差 ${maxRef.toFixed(3)} / 255`);
    });
  }
  it("定型分几次画 = 一次画完（定型层只画一次，尾巴每帧重画）", () => {
    const r = rig(), color: [number, number, number] = [0.2, 0.5, 0.9];
    for (const accum of ["max", "over"] as const) {
      const once = run(r, accum, 0.4, color).px, steps = run(r, accum, 0.4, color, [3, 7, 7, 12, r.tips.length]).px;
      let diff = 0; for (let i = 0; i < once.length; i++) if (once[i] !== steps[i]) diff++;
      eq(diff, 0, `${accum}：逐字节相同`);
    }
  });
  it("实例方块只盖笔尖碰得到的格子、不切墨：缩放 + 转 + 镜像的摆放、笔尖大小不一、球心离面远近不一 —— 软件版（按方块裁）= 标准答案", () => {
    const c = Math.cos(0.5), sn = Math.sin(0.5), sx = -1.4, sy = 0.7, sz = 1.2;   // 先缩放（x 取负 = 镜像）再绕 z 转、再挪
    const xform: Xform = [c * sx, -sn * sy, 0, 0.3, sn * sx, c * sy, 0, -0.2, 0, 0, sz, 0.5];
    const color: [number, number, number] = [0.3, 0.8, 0.5];
    for (const accum of ["max", "over"] as const) {
      const r = rig({ xform, jitter: true }), { px } = run(r, accum, 0.6, color), { maxd, inked } = compare(r, px, accum, 0.6, color);
      assert(inked > 50, `吃到墨的格子 ${inked}`);
      assert(maxd <= 1, `${accum}：和 8 位标准答案最大差 ${maxd} / 255`);
    }
    // 方块确实变小了：每颗笔尖的方块面积远小于整块多边形
    const r = rig(), gpu = new SoftSpaceGpu(); gpu.register(SPACE_TIP);
    const L = new SpaceLayer(gpu, r.g, 0, { hardness: 0.5, color: [1, 1, 1], accum: "over", origin: r.tips[0].tip });
    let area = 0; const draw = gpu.draw.bind(gpu); gpu.draw = (d) => { for (let k = 0; k < d.count; k++) area += d.instances[4 * k + 2] * d.instances[4 * k + 3]; draw(d); };
    L.update(r.tips, r.tips.length);
    const R = L.range()!;
    assert(area < 0.5 * r.tips.length * R.w * R.h, `实例方块面积合计 ${area}，整笔范围 ${R.w}×${R.h}`);
  });
  it("每帧画的实例只随这一帧新给的笔尖涨（不随整笔长度涨）", () => {
    const r = rig(), gpu = new SoftSpaceGpu(); gpu.register(SPACE_TIP);
    const counts: number[] = [], draw = gpu.draw.bind(gpu);
    gpu.draw = (d) => { counts.push(d.count); draw(d); };
    const L = new SpaceLayer(gpu, r.g, 0, { hardness: 0.5, color: [1, 1, 1], accum: "over", origin: r.tips[0].tip });
    const perTip = Math.max(...r.tips.map((t) => t.reach.get(0)?.size ?? 0));
    let drawn = 0;
    for (let k = 1; k <= r.tips.length; k++) { const end = Math.min(r.tips.length, k + 2); L.update(r.tips.slice(drawn, end), k - drawn); drawn = k; }
    assert(Math.max(...counts) <= 3 * perTip, `一次最多画 ${Math.max(...counts)} 个实例（每颗笔尖最多 ${perTip} 块）`);
    assert(counts.length >= r.tips.length, "每帧都画了");
  });
  it("范围之外全是零；范围 = 碰过的所有实例方块的并", () => {
    const r = rig(), { px, range } = run(r, "over", 0.5, [1, 1, 1]);
    assert(range, "有范围");
    let outside = 0; for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) { const inR = x >= range!.x && x < range!.x + range!.w && y >= range!.y && y < range!.y + range!.h; if (!inR && px[(y * r.W + x) * 4 + 3] !== 0) outside++; }
    eq(outside, 0, "范围之外");
  });
});
