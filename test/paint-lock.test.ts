// 画画这一层自己问锁（统筹 11-11，v0.19.48）：画板开一笔、落层、登记处整份换内容，锁着就抛；抛了 = 零痕迹。created 2026-11-11 by Claude Opus 5.5
// 起因：锁着时直接调画画控制器能画上、撤销栈多一步（画画这一层不看锁，只靠编辑器的指针按下一层）。真 app 里四层都拦的矩阵在探针 test/probes/probe-lock-matrix.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoard } from "../src/paint/board.ts";
import { PaintLockedError } from "../src/paint/paint-limit.ts";
import { PaintingView } from "../src/paint/kernel/src/backend/workpiece/painting-view.ts";

const W = 32, H = 24, WHY = "锁着：看、选、量、进去走都行，改不了；☰「解锁」放开";
const layer = (px: Uint8ClampedArray) => ({ width: W, height: H, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect: { x: 0, y: 0, w: W, h: H }, bytes: px } }] });
const base = (): Uint8ClampedArray => { const px = new Uint8ClampedArray(W * H * 4); for (let i = 0; i < px.length; i += 4) { px[i] = 10; px[i + 1] = 20; px[i + 2] = 30; px[i + 3] = 255; } return px; };
/** 图层像素的指纹（落定的那份）。 */
const sig = (b: PaintBoard): string => { const d = b.wp.exportData(); let h = 2166136261; for (const n of d.nodes) { const px = (n as { pixels?: { bytes: Uint8ClampedArray } }).pixels; if (px) for (const v of px.bytes) { h ^= v; h = Math.imul(h, 16777619); } } return (h >>> 0).toString(16); };
/** 一笔：薄层上一块红，交给档口，end = 落层。 */
const strokeOn = (b: PaintBoard) => {
  const session = b.openStroke();
  const thin = new Uint8Array(W * H * 4); for (let y = 4; y < 10; y++) for (let x = 4; x < 12; x++) { const i = (y * W + x) * 4; thin[i] = 220; thin[i + 3] = 255; }
  const ext = b.wrapLayer({ pixels: thin, w: W, h: H, prec: "u8" });
  ext.markChanged(4, 4, 8, 6);
  session.setHostLayers([{ tex: ext, bx: 0, by: 0, bw: 12, bh: 10, layerId: new PaintingView(b.wp).activeId!, opacity: 1, erase: false, blendMode: "source-over" }]);
  return session;
};

describe("画画这一层自己问锁（v0.19.48）", () => {
  it("没锁：一笔照常落进图层（对照：下面「没变」不是因为这一笔本来就画不上）", () => {
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H, locked: () => null });
    b.load(layer(base())); const s0 = sig(b);
    strokeOn(b).end();
    assert(sig(b) !== s0, "画上了");
  });
  it("锁着开一笔：抛 PaintLockedError、带锁的那句话；图层一点没变", () => {
    let locked: string | null = WHY;
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H, locked: () => locked });
    b.load(layer(base())); const s0 = sig(b);
    let err: unknown = null; try { strokeOn(b); } catch (e) { err = e; }
    assert(err instanceof PaintLockedError, "抛的是锁的错");
    eq((err as PaintLockedError).say, WHY, "说的是锁的那句");
    eq(sig(b), s0, "图层没变");
    locked = null; strokeOn(b).end(); assert(sig(b) !== s0, "解锁之后照常能画");
  });
  it("一笔开着时锁上了：落层抛、整笔回滚，图层和落笔之前逐位一样", () => {
    let locked: string | null = null;
    const b = new PaintBoard({ port: new SoftGl2Port(), width: W, height: H, locked: () => locked });
    b.load(layer(base())); const s0 = sig(b);
    const session = strokeOn(b);
    locked = WHY;
    let err: unknown = null; try { session.end(); } catch (e) { err = e; }
    assert(err instanceof PaintLockedError || (err instanceof Error && /locked/.test(err.message)), `落层抛了锁的错（${String(err)}）`);
    eq(sig(b), s0, "图层没变");
  });
  // 登记处整份换内容（调试钩子 fill 那条路）锁着抛：在 test/paint-board.test.ts（要一个真带画的场景，那边有 painted()）。
});
