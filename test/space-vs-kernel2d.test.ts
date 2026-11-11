// 三维的薄层 vs 画画内核二维的笔尖（贴图主线 1-4b，统筹 11-11 裁定 ② 的硬保证：「手感一样」）。created 2026-11-11 by Claude Opus 5.5
// 一张平的长方形面、铺得规整（不转、不镜像，格子和面的边平行），同一串笔尖：三维这边用 1-4a 找面 + 薄层程序（三维显卡接口的软件版）画；
// 二维那边换算到同一套格子坐标（球心 → 贴图坐标、半径 × 密度 = 像素）交给画画内核自己的 GLStampRasterizer（内核的软件显卡）。
// 面里面的格子逐格比：差不超过 1/255；取最大 / 叠加 × 软笔 / 硬笔各一遍。对不上 = 某一步的次序或舍入不一样（报给统筹，不放宽）。
import { describe, it, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpaceLayer } from "../src/paint/space-layer.ts";
import { buildTargetGeo } from "../src/paint/space-target.ts";
import { tipReach, sphereTriDist } from "../src/paint/tip-reach.ts";
import { inPoly } from "../src/paint/texel-table.ts";
import type { InkTip } from "../src/paint/tip-truth.ts";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { GLStampRasterizer } from "../src/paint/kernel/src/backend/gl/gl-stamp.ts";
import { P, laidOut, targetOf } from "./paint-space-kit.ts";

const DENSITY = 8;   // 一米八格
function rig() {
  const m = new MeshKernel(), v = [P(0, 0, 0), P(6, 0, 0), P(6, 3, 0), P(0, 3, 0)].map((p) => m.addVertex(p));
  const f = m.addFace(v, -1, FRESH), uv = laidOut(m, "uv", [f], { density: DENSITY }), g = buildTargetGeo(targetOf(m, uv));
  // 世界 → 贴图坐标（平的面、铺法是相似变换：拿面上第一个三角形的公式倒过来）
  const F = g.table.faces.get(f)!.tris[0].formula, a = F.du, b = F.dv, det = a.x * b.y - a.y * b.x;
  const toUv = (x: number, y: number): [number, number] => { const dx = x - F.o.x, dy = y - F.o.y; return [(dx * b.y - dy * b.x) / det, (a.x * dy - a.y * dx) / det]; };
  return { m, f, g, toUv, W: g.table.width, H: g.table.height, ring: g.table.polys[g.table.faces.get(f)!.poly] };
}
const COLOR: [number, number, number] = [0.85, 0.35, 0.15];

describe("三维的薄层 = 画画内核二维的笔尖（平的面、铺得规整；1-4b）", () => {
  for (const [buildup, hardness, alpha] of [[false, 0.3, 0.6], [false, 1, 0.9], [true, 0.3, 0.6], [true, 0.8, 0.25]] as const) {
    it(`${buildup ? "叠加" : "取最大"}、硬度 ${hardness}、浓度 ${alpha}：面里每一格相差不超过 1/255`, () => {
      const r = rig(), tips: { tip: InkTip; reach: ReturnType<typeof tipReach> }[] = [], stamps: { x: number; y: number; size: number; alpha: number }[] = [];
      for (let i = 0; i < 16; i++) {
        const x = 1.2 + i * 0.23, y = 1.5 + 0.4 * Math.sin(i * 0.5), rad = 0.35;
        let best = -1, bd = Infinity; for (let t = 0; t < r.g.grid.face.length; t++) { const d = sphereTriDist(x, y, 0, r.g.wpos, 9 * t); if (d < bd) { bd = d; best = t; } }
        const tip: InkTip = { x, y, z: 0, r: rad, alpha };
        tips.push({ tip, reach: tipReach([r.g], tip, [{ ti: 0, tri: best }]) });
        const [u, v] = r.toUv(x, y); stamps.push({ x: u, y: v, size: 2 * rad * DENSITY, alpha });
      }
      const gpu = new SoftSpaceGpu();
      const L = new SpaceLayer(gpu, r.g, 0, { hardness, color: COLOR, accum: buildup ? "over" : "max", origin: tips[0].tip });
      L.update(tips, tips.length);
      const three = gpu.read(L.frame);
      const port = new SoftGl2Port(), ras = new GLStampRasterizer(port), fbo = ras.rasterize(stamps, { hardness, color: COLOR, buildup }, 0, 0, r.W, r.H, null), two = port.readPixels(fbo, 0, 0, r.W, r.H);
      let maxd = 0, inked = 0, where = "";
      for (let y = 0; y < r.H; y++) for (let x = 0; x < r.W; x++) {
        if (!inPoly(r.ring, x + 0.5, y + 0.5)) continue;   // 面里面的格子（块边上多归的那几格取的是边上的点，二维没有这一说）
        const o = (y * r.W + x) * 4;
        if (two[o + 3] > 0 || three[o + 3] > 0) inked++;
        for (let k = 0; k < 4; k++) { const d = Math.abs(three[o + k] - two[o + k]); if (d > maxd) { maxd = d; where = `(${x},${y}) 通道 ${k}：三维 ${three[o + k]} / 二维 ${two[o + k]}`; } }
      }
      console.log(`    ${buildup ? "叠加" : "取最大"} 硬度 ${hardness} 浓度 ${alpha}：最大差 ${maxd} / 255（有墨 ${inked} 格）${maxd ? " 例 " + where : ""}`);
      assert(inked > 150, `有墨的格子 ${inked}`);
      assert(maxd <= 1, `最大差 ${maxd} / 255，例 ${where}`);
    });
  }
});
