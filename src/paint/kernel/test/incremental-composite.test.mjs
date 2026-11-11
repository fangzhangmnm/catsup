// 增量合成（CatsUp 贴图主线 1-4d 第 6 条）：外来薄层报了改哪几块 → 内核只在那些脏格里就地重合。证明 = 增量出来的 = 整张重合出来的，逐像素相同。
// 两块画板吃同一份层像素、同一份薄层像素：一块走增量（薄层 markChanged 报块），另一块每一步都 markContentDirty 强制整张（它的薄层从不报 = 内核每次都当整张变了）。
// 随机：层栈（12 种混合、剪切、组〔穿透 / 隔离〕、透明度、隐藏）、底（颜色 / 棋盘 / 透明）、每一步做一件事——画几块（重叠的、贴边的、出界的、一帧二十多块的）、
//   方框长大、什么都不变、改一大片（过半 → 整张）、换叠法 / 透明度 / 橡皮 / 锁透明、方框缩小、薄层所在那层的像素被改了没报、别的层改了并报 dirty（缓存段重建）、丢上下文。
// 每一步两边读回整张比；最后数三条路（rects / same / full）各走了几次，增量真的走到了。
// 内核自己的测试：只 import 内核和测试工具。created 2026-11-11 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/backend/soft-gl2-port.ts";
import { LayerPixels } from "../src/backend/tiles/tile-layer.ts";
import { GLBoard } from "../src/shell/gl-board.ts";
import { BLEND_MODES } from "../src/backend/gl/blend-glsl.ts";

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function trial(seed, counts, size = null, nSteps = 24) {
  const R = rng(seed), pick = (a) => a[Math.floor(R() * a.length)];
  const W = size ? size[0] : 33 + Math.floor(R() * 60), H = size ? size[1] : 25 + Math.floor(R() * 50);
  const lps = [];
  let nextId = 1;
  const leaf = () => {
    const lp = new LayerPixels(W, H), b = new Uint8ClampedArray(W * H * 4);
    const x0 = Math.floor(R() * W), y0 = Math.floor(R() * H), x1 = x0 + Math.floor(R() * W), y1 = y0 + Math.floor(R() * H), c = [R() * 255, R() * 255, R() * 255, 60 + R() * 195];
    for (let y = y0; y < Math.min(H, y1); y++) for (let x = x0; x < Math.min(W, x1); x++) { const i = (y * W + x) * 4; b[i] = c[0]; b[i + 1] = (c[1] + x * 3) & 255; b[i + 2] = c[2]; b[i + 3] = c[3]; }
    lp.putRegion(0, 0, W, H, b); lps.push(lp);
    return { isGroup: false, id: nextId++, opacity: R() < 0.7 ? 1 : 0.3 + R() * 0.7, mode: R() < 0.5 ? "source-over" : pick(BLEND_MODES), clippingMask: R() < 0.2, visible: R() < 0.92, pixels: lp };
  };
  const stack = (depth) => {
    const n = 1 + Math.floor(R() * 3), out = [];
    for (let i = 0; i < n; i++) {
      if (depth < 2 && R() < 0.25) out.push({ isGroup: true, id: nextId++, opacity: R() < 0.7 ? 1 : 0.5, mode: R() < 0.5 ? "pass-through" : pick(["source-over", ...BLEND_MODES]), clippingMask: R() < 0.1, visible: true, children: stack(depth + 1) });
      else out.push(leaf());
    }
    return out;
  };
  const layers = stack(0);
  const leaves = []; const walk = (ns) => { for (const n of ns) { if (n.isGroup) walk(n.children); else leaves.push(n); } }; walk(layers);
  const target = pick(leaves);
  const bg = pick(["#ffffff", "#336699", "checker", null]);
  const doc = { layers, width: W, height: H };

  const A = new SoftGl2Port(), B = new SoftGl2Port(), inc = new GLBoard(A, 64), ref = new GLBoard(B, 64);
  const px = new Uint8Array(W * H * 4);
  const extA = A.wrapExternal({ pixels: px, w: W, h: H, prec: "u8" }), extB = B.wrapExternal({ pixels: px, w: W, h: H, prec: "u8" });
  const ov = { bx: Math.floor(R() * W / 2), by: Math.floor(R() * H / 2), bw: 1 + Math.floor(R() * W / 2), bh: 1 + Math.floor(R() * H / 2), opacity: 1, erase: false, blendMode: "source-over", lockAlpha: false };
  const hostOv = (tex) => ({ kind: "host", tex, ...ov, layerId: target.id, selMask: null });
  /** 宿主画一块（预乘）并报给增量那块板。 */
  const paint = (x, y, w, h) => {
    if (![x, y, w, h].every(Number.isInteger)) throw new Error(`测试自己的错：画的方框要整数（${x}, ${y}, ${w}, ${h}）——小数会写歪到报的块外面`);
    const a = 30 + Math.floor(R() * 225), c = [R(), R(), R()];
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) { const i = (yy * W + xx) * 4; px[i] = Math.round(c[0] * a); px[i + 1] = Math.round(c[1] * a); px[i + 2] = Math.round(c[2] * a); px[i + 3] = a; }
    extA.markChanged(x, y, w, h);
  };
  const step = (what) => {
    const fa = inc.composite(doc, bg, [], [hostOv(extA)]);
    ref.markContentDirty();
    const fb = ref.composite(doc, bg, [], [hostOv(extB)]);
    const a = A.readPixels(fa, 0, 0, W, H), b = B.readPixels(fb, 0, 0, W, H);
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) throw new Error(`种子 ${seed}（${W}x${H}、底 ${bg}）「${what}」之后第 ${Math.floor(i / 4) % W},${Math.floor(i / 4 / W)} 格不一样：增量 ${a[i]} ≠ 整张 ${b[i]}（走的是 ${inc._tree.lastPath.path}）`);
    counts[inc._tree.lastPath.path]++;
    if (globalThis.__INC_TRACE) console.log(`  ${what} → ${inc._tree.lastPath.path} 块 ${inc._tree.lastPath.rects} 方框 ${ov.bx},${ov.by},${ov.bw},${ov.bh}`);
  };
  try {
    paint(ov.bx, ov.by, ov.bw, ov.bh); step("第一帧");
    for (let s = 0; s < nSteps; s++) {
      const k = R();
      if (k < 0.35) { const n = 1 + Math.floor(R() * 4); for (let i = 0; i < n; i++) paint(Math.floor(R() * (W + 10)) - 5, Math.floor(R() * (H + 10)) - 5, 1 + Math.floor(R() * 9), 1 + Math.floor(R() * 9)); step(`画 ${n} 块`); }
      else if (k < 0.45) { for (let i = 0; i < 22; i++) paint(Math.floor(R() * W), Math.floor(R() * H), 1 + Math.floor(R() * 3), 1 + Math.floor(R() * 3)); step("一帧 22 块"); }
      else if (k < 0.52) { paint(0, 0, 2, 2); paint(W - 3, H - 3, 5, 5); paint(-4, Math.floor(H / 2), 6, 3); step("贴边 / 出界"); }
      else if (k < 0.6) { ov.bx = Math.max(0, ov.bx - Math.floor(R() * 5)); ov.by = Math.max(0, ov.by - Math.floor(R() * 5)); ov.bw = Math.min(W - ov.bx, ov.bw + Math.floor(R() * 12)); ov.bh = Math.min(H - ov.by, ov.bh + Math.floor(R() * 12)); step("方框长大"); }
      else if (k < 0.66) step("什么都不变");
      else if (k < 0.7) { paint(0, 0, W, Math.ceil(H * 0.7)); step("改一大片"); }
      else if (k < 0.75) { const which = Math.floor(R() * 4); if (which === 0) ov.opacity = R() < 0.5 ? 1 : 0.6; else if (which === 1) ov.erase = !ov.erase; else if (which === 2) ov.blendMode = R() < 0.5 ? "source-over" : "multiply"; else ov.lockAlpha = !ov.lockAlpha; step("换叠法"); }
      else if (k < 0.79) { ov.bw = Math.max(1, ov.bw - 3); step("方框缩小"); }
      else if (k < 0.84) { target.pixels.putRegion(0, 0, 1, 1, new Uint8ClampedArray([255, 0, 0, 255])); step("薄层那层的像素改了没报"); }
      else if (k < 0.9) { const l = pick(leaves), w = Math.min(3, W), h = Math.min(3, H); l.pixels.putRegion(Math.floor(R() * (W - w + 1)), Math.floor(R() * (H - h + 1)), w, h, new Uint8ClampedArray(w * h * 4).fill(200)); inc.markContentDirty(); step("别的层改了、报 dirty（缓存段重建）"); }
      else if (k < 0.95) { inc.markContentDirty(); step("只报 dirty"); }
      else { A._invalidated.forEach((f) => f()); step("丢上下文"); }
    }
  } finally {
    for (const lp of lps) lp.dispose();
    inc.dispose(); ref.dispose();
  }
}

describe("增量合成 = 整张重合（1-4d 第 6 条）", () => {
  it("随机层栈 × 随机一串改动：每一步两边逐像素相同；三条路（只合脏格 / 原样 / 整张）都走到了", () => {
    const counts = { rects: 0, same: 0, full: 0 };
    const only = globalThis.__INC_SEED;
    for (let seed = 1; seed <= 40; seed++) if (!only || seed === only) trial(seed, counts);
    if (globalThis.__INC_TRACE !== undefined) console.log("  三条路", JSON.stringify(counts));
    assert(counts.rects > 200 && counts.same > 20 && counts.full > 100, `三条路：${JSON.stringify(counts)}`);
  }, { timeout: 60000 });
  it("画布不是 8 的倍数 / 不是 2 的幂 / 宽高是奇数（按密度开的画）：同样逐像素相同", () => {
    const counts = { rects: 0, same: 0, full: 0 };
    let seed = 100;
    for (const [size, n] of [[[1, 1], 12], [[3, 7], 16], [[13, 9], 20], [[97, 131], 20], [[300, 412], 6]]) for (let k = 0; k < (size[0] < 50 ? 3 : 1); k++) trial(seed++, counts, size, n);
    assert(counts.rects > 10 && counts.full > 5, `三条路：${JSON.stringify(counts)}`);
  }, { timeout: 60000 });
});
