// 一笔在一张贴图上的薄层（贴图主线 1-4b）：三维自己的显卡接口的软件版 + 薄层程序 vs 1-4a 的标准答案。created 2026-11-11 by Claude Opus 5.5
// 薄层逐格 = 标准答案（淡彩取最大、叠色预乘叠加；软笔 / 硬笔；跨好几张面）；定型分两次画 = 一次画完；范围之外全是零。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpaceLayer, SPACE_TIP } from "../src/paint/space-layer.ts";
import { buildTargetGeo } from "../src/paint/space-target.ts";
import { tipReach } from "../src/paint/tip-reach.ts";
import { strokeTruth, type InkTip } from "../src/paint/tip-truth.ts";
import { sphereTriDist } from "../src/paint/tip-reach.ts";
import { P, gridMesh, laidOut, targetOf } from "./paint-space-kit.ts";

/** 一块起伏的网格、一串沿着它走的笔尖（球心落在表面上），每颗笔尖碰到的三角形照 1-4a 找。 */
function rig(o: { alpha?: number; r?: number } = {}) {
  const m = gridMesh(6, 2, (x, y) => 0.15 * Math.sin(2 * x) * Math.cos(1.5 * y)), uv = laidOut(m, "uv", m.faces(), { density: 24 });
  const g = buildTargetGeo(targetOf(m, uv)), tips: { tip: InkTip; reach: ReturnType<typeof tipReach> }[] = [];
  for (let i = 0; i < 18; i++) {
    const x = -0.8 + i * 0.09, y = 0.3 * Math.sin(i * 0.4), z = 0.15 * Math.sin(2 * x) * Math.cos(1.5 * y);
    let best = -1, bd = Infinity; for (let t = 0; t < g.grid.face.length; t++) { const d = sphereTriDist(x, y, z, g.wpos, 9 * t); if (d < bd) { bd = d; best = t; } }
    const tip: InkTip = { x, y, z, r: o.r ?? 0.12, alpha: o.alpha ?? 0.6 };
    tips.push({ tip, reach: tipReach([g], tip, [{ ti: 0, tri: best }]) });
  }
  return { g, tips, W: g.table.width, H: g.table.height };
}
function run(r: ReturnType<typeof rig>, accum: "max" | "over", hardness: number, color: [number, number, number], frozenSteps: number[] = [r.tips.length]) {
  const gpu = new SoftSpaceGpu(); gpu.register(SPACE_TIP);
  const L = new SpaceLayer(gpu, r.g, 0, { hardness, color, accum, origin: r.tips[0].tip });
  for (const k of frozenSteps) L.update(r.tips.slice(0, Math.max(k, frozenSteps[frozenSteps.length - 1] === k ? r.tips.length : k)), k);
  return { px: gpu.read(L.frame), range: L.range() };
}
/** 标准答案（预乘）和薄层比：最大差（0..255）、吃到墨的格数。 */
function compare(r: ReturnType<typeof rig>, px: Uint8Array, accum: "max" | "over", hardness: number, color: [number, number, number]) {
  const truth = strokeTruth([r.g], r.tips, hardness, accum).get(0) ?? new Map<number, number>();
  let maxd = 0, inked = 0;
  for (let c = 0; c < r.W * r.H; c++) {
    const a = truth.get(c) ?? 0, want = [color[0] * a, color[1] * a, color[2] * a, a].map((x) => x * 255);
    if (a > 0) inked++;
    for (let k = 0; k < 4; k++) maxd = Math.max(maxd, Math.abs(px[c * 4 + k] - want[k]));
  }
  return { maxd, inked };
}

describe("薄层 = 标准答案（三维显卡接口的软件版，1-4b）", () => {
  for (const [accum, hardness, alpha] of [["max", 0.3, 0.6], ["max", 1, 0.9], ["over", 0.3, 0.6], ["over", 0.8, 0.25]] as const) {
    it(`${accum === "max" ? "淡彩（取最大）" : "叠色（预乘叠加）"}、硬度 ${hardness}、浓度 ${alpha}：逐格和标准答案比`, () => {
      const r = rig({ alpha }), color: [number, number, number] = [0.9, 0.4, 0.1], { px } = run(r, accum, hardness, color);
      const { maxd, inked } = compare(r, px, accum, hardness, color);
      assert(inked > 100, `吃到墨的格子 ${inked}`);
      console.log(`    ${accum} 硬度 ${hardness} 浓度 ${alpha}：最大差 ${maxd.toFixed(3)} / 255（${inked} 格）`);
      assert(maxd <= 1, `最大差 ${maxd.toFixed(3)} / 255`);
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
  it("范围之外全是零；范围 = 碰过的所有实例方块的并", () => {
    const r = rig(), { px, range } = run(r, "over", 0.5, [1, 1, 1]);
    assert(range, "有范围");
    let outside = 0; for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) { const inR = x >= range!.x && x < range!.x + range!.w && y >= range!.y && y < range!.y + range!.h; if (!inR && px[(y * r.W + x) * 4 + 3] !== 0) outside++; }
    eq(outside, 0, "范围之外");
  });
});
