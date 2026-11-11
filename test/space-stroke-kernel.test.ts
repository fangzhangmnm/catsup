// 一笔整条走通、不带浏览器（贴图主线 1-4b，统筹 11-11 定的测试分法）：三维显卡接口的软件版画薄层 → wrapExternal 包成内核的纹理对象（内核的软件显卡）
// → 画板的档口（0-5 host 方式）→ 预览 → 落层 / 撤销 / 取消。小画布。created 2026-11-11 by Claude Opus 5.5
// 预览就是结果：落层之后合成出来的图 = 抬笔前最后一帧合成出来的图，逐像素相同（这一张没有收笔渐细重画，见施工记录）。撤一步 = 回到落笔之前。取消 = 零痕迹。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { UndoStack } from "../src/paint/kernel/src/backend/workpiece/undo-stack.ts";
import { PaintBoard } from "../src/paint/board.ts";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpaceLayer, SPACE_TIP } from "../src/paint/space-layer.ts";
import { buildTargetGeo } from "../src/paint/space-target.ts";
import { tipReach, sphereTriDist } from "../src/paint/tip-reach.ts";
import type { InkTip } from "../src/paint/tip-truth.ts";
import { gridMesh, laidOut, targetOf } from "./paint-space-kit.ts";

function rig(accum: "max" | "over") {
  const m = gridMesh(4, 2, (x, y) => 0.1 * Math.sin(2 * x) * Math.cos(2 * y)), uv = laidOut(m, "uv", m.faces(), { density: 24 }), g = buildTargetGeo(targetOf(m, uv));
  const W = g.table.width, H = g.table.height, port = new SoftGl2Port(), undo = new UndoStack({ maxQuotaBytes: 1 << 30 });
  const board = new PaintBoard({ port, width: W, height: H, undo });
  const base = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < base.length; i += 4) { base[i] = 30 + (i % 97); base[i + 1] = 200; base[i + 2] = 120; base[i + 3] = 255; }
  board.load({ width: W, height: H, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect: { x: 0, y: 0, w: W, h: H }, bytes: base } }] });
  const tips: { tip: InkTip; reach: ReturnType<typeof tipReach> }[] = [];
  for (let i = 0; i < 12; i++) {
    const x = -0.6 + i * 0.11, y = 0.2 * Math.sin(i), z = 0.1 * Math.sin(2 * x) * Math.cos(2 * y);
    let best = -1, bd = Infinity; for (let t = 0; t < g.grid.face.length; t++) { const d = sphereTriDist(x, y, z, g.wpos, 9 * t); if (d < bd) { bd = d; best = t; } }
    const tip: InkTip = { x, y, z, r: 0.15, alpha: 0.7 };
    tips.push({ tip, reach: tipReach([g], tip, [{ ti: 0, tri: best }]) });
  }
  const gpu = new SoftSpaceGpu(); gpu.register(SPACE_TIP);
  const layer = new SpaceLayer(gpu, g, 0, { hardness: 0.4, color: [0.1, 0.2, 0.9], accum, origin: tips[0].tip });
  const shot = (): Uint8Array => { const r = board.compose()!; return port.readPixels(r.fbo, 0, 0, W, H); };
  return { W, H, port, undo, board, tips, gpu, layer, shot };
}
const same = (a: Uint8Array, b: Uint8Array): number => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };

describe("一笔整条走通（三维软件版 → 内核软件显卡的档口；1-4b）", () => {
  for (const accum of ["max", "over"] as const) {
    it(`${accum === "max" ? "淡彩" : "叠色"}：预览 = 落层之后；撤一步 = 回到落笔之前`, () => {
      const r = rig(accum), before = r.shot(), steps0 = r.undo.canUndo();
      const s = r.board.openStroke(), layerId = r.board.wp.layerTree!.view().activeId!;
      const ext = r.port.wrapExternal({ pixels: r.gpu.pixels(r.layer.frame), w: r.W, h: r.H, prec: "u8" });
      let drawn = 0;
      for (let k = 4; k <= r.tips.length; k += 4) {   // 一帧一帧往前走（定型的只画一次；每帧只给还没定型画过的）
        const fz = Math.max(0, k - 3);
        r.layer.update(r.tips.slice(drawn, k), fz - drawn); drawn = fz;
        const rg = r.layer.range()!;
        s.setHostLayers([{ tex: ext, bx: rg.x, by: rg.y, bw: rg.w, bh: rg.h, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
        r.board.overlayChanged();
      }
      r.layer.update(r.tips.slice(drawn), r.tips.length - drawn);
      const rg = r.layer.range()!;
      s.setHostLayers([{ tex: ext, bx: rg.x, by: rg.y, bw: rg.w, bh: rg.h, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
      r.board.overlayChanged();
      const preview = r.shot();
      assert(same(preview, before) > 100, "预览里看得见这一笔");
      s.end();
      const after = r.shot();
      eq(same(after, preview), 0, "预览就是结果（逐像素）");
      assert(r.undo.canUndo() && !steps0, "多了一步");
      r.undo.undo();
      eq(same(r.shot(), before), 0, "撤一步 = 回到落笔之前");
      r.undo.redo();
      eq(same(r.shot(), after), 0, "重做 = 落层之后");
    });
  }
  it("取消 = 零痕迹（图、撤销栈都没动）", () => {
    const r = rig("over"), before = r.shot(), s = r.board.openStroke(), layerId = r.board.wp.layerTree!.view().activeId!;
    r.layer.update(r.tips, r.tips.length);
    const rg = r.layer.range()!, ext = r.port.wrapExternal({ pixels: r.gpu.pixels(r.layer.frame), w: r.W, h: r.H, prec: "u8" });
    s.setHostLayers([{ tex: ext, bx: rg.x, by: rg.y, bw: rg.w, bh: rg.h, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
    r.board.overlayChanged();
    assert(same(r.shot(), before) > 100, "预览里看得见");
    s.cancel(); r.board.overlayChanged();
    eq(same(r.shot(), before), 0, "图回到原样");
    eq(r.undo.canUndo(), false, "撤销栈没多步");
  });
});
