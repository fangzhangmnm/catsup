// 纯手势数学验收（K3 切片，见 ai-docs/reports/20260606-fresh-geological-survey.html）。
// 这些函数过去内联在 input.js、零测、错一个符号画面就跟手跑偏（桌面难复现）。
// 现在是纯函数 → 可断言「anchor-preserving」不变量 + 吸附 + tap 文法。无 canvas/DOM。
import { describe, it, assert } from "./runner.mjs";
import {
  computePinchViewport, snapRotation, isTap, isDoubleTap, gestureTapAction,
  pinchScaleRot, solveAnchorTranslation,
} from "../src/common/pointer-gesture.ts";

const approx = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const W = 1000, H = 1000;

// board 的 screen↔doc 公式（与 input.js 内联的逆运算同形），用来验不变量。
function screenToDoc(sx, sy, vp) {
  const cx = vp.tx + W * vp.scale / 2, cy = vp.ty + H * vp.scale / 2;
  const ddx = sx - cx, ddy = sy - cy;
  const c = Math.cos(-vp.rot), s = Math.sin(-vp.rot);
  return { x: (ddx * c - ddy * s) / vp.scale + W / 2, y: (ddx * s + ddy * c) / vp.scale + H / 2 };
}
function docToScreen(dx, dy, vp) {
  const cx = vp.tx + W * vp.scale / 2, cy = vp.ty + H * vp.scale / 2;
  const rx = (dx - W / 2) * vp.scale, ry = (dy - H / 2) * vp.scale;
  const c = Math.cos(vp.rot), s = Math.sin(vp.rot);
  return { x: rx * c - ry * s + cx, y: rx * s + ry * c + cy };
}
// 从起手两指 + 起手 vp 拍一个 gestureStart（同 input._beginGesture）
function startFrom(a, b, vp) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return { dist: Math.hypot(dx, dy) || 1, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2, angle: Math.atan2(dy, dx), vp };
}
const limits = { minScale: 0.05, maxScale: 40, docW: W, docH: H };
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

describe("pointer-gesture · computePinchViewport（anchor-preserving）", () => {
  // 核心不变量：起手按住的 doc 点，在算出的新视口下必须正好落到当前两指中点。
  function assertAnchor(startA, startB, vp, curA, curB) {
    const g = startFrom(startA, startB, vp);
    const anchorDoc = screenToDoc(g.midX, g.midY, vp);
    const nvp = computePinchViewport(g, curA, curB, limits);
    const back = docToScreen(anchorDoc.x, anchorDoc.y, nvp);
    const m = mid(curA, curB);
    assert(approx(back.x, m.x, 1e-4) && approx(back.y, m.y, 1e-4),
      `anchor 未保持：doc(${anchorDoc.x.toFixed(1)},${anchorDoc.y.toFixed(1)}) → screen(${back.x.toFixed(2)},${back.y.toFixed(2)})，期望中点(${m.x},${m.y})`);
    return nvp;
  }
  const idVp = { tx: 0, ty: 0, scale: 1, rot: 0 };

  it("纯缩放：两指 spread → scale 增、anchor 稳", () => {
    const nvp = assertAnchor({ x: 400, y: 500 }, { x: 600, y: 500 }, idVp,
      { x: 350, y: 500 }, { x: 650, y: 500 });
    assert(approx(nvp.scale, 1.5), `scale 应 1.5，实得 ${nvp.scale}`);
    assert(approx(nvp.rot, 0), "纯缩放不应旋转");
  });

  it("纯平移：两指整体平移 → 只动 tx/ty、anchor 稳", () => {
    const nvp = assertAnchor({ x: 400, y: 500 }, { x: 600, y: 500 }, idVp,
      { x: 480, y: 530 }, { x: 680, y: 530 });
    assert(approx(nvp.scale, 1), "纯平移不缩放");
    assert(approx(nvp.rot, 0), "纯平移不旋转");
  });

  it("纯旋转：两指绕中点转 90° → rot=π/2、anchor 稳", () => {
    // 起手水平，转成竖直（同中点 500,500）
    const nvp = assertAnchor({ x: 400, y: 500 }, { x: 600, y: 500 }, idVp,
      { x: 500, y: 400 }, { x: 500, y: 600 });
    assert(approx(Math.abs(nvp.rot), Math.PI / 2, 1e-9), `rot 应 ±π/2，实得 ${nvp.rot}`);
  });

  it("组合（缩放+旋转+平移）+ 非平凡起手 vp：anchor 仍稳", () => {
    assertAnchor({ x: 300, y: 300 }, { x: 500, y: 400 },
      { tx: 120, ty: -60, scale: 1.7, rot: 0.5 },
      { x: 360, y: 280 }, { x: 700, y: 520 });
  });

  it("scale 夹在 [minScale, maxScale]", () => {
    const g = startFrom({ x: 499, y: 500 }, { x: 501, y: 500 }, idVp); // dist≈2
    const nvp = computePinchViewport(g, { x: 0, y: 500 }, { x: 1000, y: 500 }, limits); // dist 1000 → k=500
    assert(approx(nvp.scale, limits.maxScale), `应夹到 maxScale，实得 ${nvp.scale}`);
  });
});

describe("pointer-gesture · 共享 kernel（参考窗复用同一套）", () => {
  it("pinchScaleRot：scale=起手×(dist比)，夹区间；rot=归一化角度差叠加", () => {
    const start = { dist: 100, angle: 0, vp: { scale: 2, rot: 0 } };
    const r = pinchScaleRot(start, 150, Math.PI / 4, 0.1, 50);
    assert(approx(r.scale, 3), `scale 应 2×1.5=3，实得 ${r.scale}`);
    assert(approx(r.rot, Math.PI / 4), `rot 应 π/4，实得 ${r.rot}`);
    // 角度差跨 ±π 要走短弧（归一化）：start angle≈π，cur≈-π → dRot≈0 不是 2π
    const wrap = pinchScaleRot({ dist: 10, angle: Math.PI - 0.05, vp: { scale: 1, rot: 0 } }, 10, -Math.PI + 0.05, 0.1, 50);
    assert(Math.abs(wrap.rot) < 0.2, `跨 ±π 应走短弧，实得 ${wrap.rot}`);
    // 夹取
    assert(approx(pinchScaleRot({ dist: 1, angle: 0, vp: { scale: 1, rot: 0 } }, 1000, 0, 0.1, 50).scale, 50), "夹到 max");
  });

  // 参考窗（image-origin 约定）：screen = scale·R(rot)·img + (tx,ty)。
  // 验 pinchScaleRot + solveAnchorTranslation 组出的 vp 让起手 image 锚点落回当前两指中点。
  it("solveAnchorTranslation：image-origin 下 anchor 落回当前中点（参考窗路径）", () => {
    const imgToScreen = (ip, vp) => {
      const c = Math.cos(vp.rot), s = Math.sin(vp.rot);
      return { x: ip.x * vp.scale * c - ip.y * vp.scale * s + vp.tx, y: ip.x * vp.scale * s + ip.y * vp.scale * c + vp.ty };
    };
    const screenToImg = (sx, sy, vp) => {
      const c = Math.cos(-vp.rot), s = Math.sin(-vp.rot);
      const dx = sx - vp.tx, dy = sy - vp.ty;
      return { x: (dx * c - dy * s) / vp.scale, y: (dx * s + dy * c) / vp.scale };
    };
    const startVp = { tx: 40, ty: 80, scale: 1.3, rot: 0.4 };
    const sa = { x: 60, y: 70 }, sb = { x: 220, y: 130 };
    const g = startFrom(sa, sb, startVp);
    const ca = { x: 90, y: 60 }, cb = { x: 300, y: 240 };   // 当前两指
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    const { scale, rot } = pinchScaleRot(g, Math.hypot(dx, dy), Math.atan2(dy, dx), 0.02, 50);
    const ip = screenToImg(g.midX, g.midY, startVp);          // 起手锚的 image 坐标
    const t = solveAnchorTranslation(ip, scale, rot, (ca.x + cb.x) / 2, (ca.y + cb.y) / 2);
    const back = imgToScreen(ip, { ...t, scale, rot });
    const m = mid(ca, cb);
    assert(approx(back.x, m.x, 1e-4) && approx(back.y, m.y, 1e-4),
      `image-origin anchor 未保持：(${back.x.toFixed(2)},${back.y.toFixed(2)}) vs 中点(${m.x},${m.y})`);
  });
});

describe("pointer-gesture · snapRotation（v0.5 形状笔配套：网格 90°→15°）", () => {
  const d2r = (d) => d * Math.PI / 180;
  it("3° 偏离 → 吸到 0", () => assert(approx(snapRotation(d2r(3), 5), 0)));
  it("87° → 吸到 90°(π/2)", () => assert(approx(snapRotation(d2r(87), 5), Math.PI / 2)));
  it("17° → 吸到 15°（新档位）", () => assert(approx(snapRotation(d2r(17), 5), d2r(15), 1e-9)));
  it("44° → 吸到 45°（15° 的倍数）", () => assert(approx(snapRotation(d2r(44), 5), d2r(45), 1e-9)));
  it("7.4°（档间自由区）→ null（不吸）", () => assert(snapRotation(d2r(7.4), 5) === null));
  it("负角 -2° → 吸到 0", () => assert(approx(snapRotation(d2r(-2), 5), 0)));
});

describe("pointer-gesture · tap 文法", () => {
  it("isTap：短时小位移=真；超时或大位移=假", () => {
    assert(isTap(100, 5, 220, 16) === true);
    assert(isTap(300, 5, 220, 16) === false, "超时");
    assert(isTap(100, 20, 220, 16) === false, "位移过大");
  });
  it("isDoubleTap：窗内近落点=真；无前次/超窗/远落点=假", () => {
    const prev = { time: 1000, x: 200, y: 200 };
    assert(isDoubleTap(1300, prev, 205, 198, 500, 80) === true);
    assert(isDoubleTap(1300, null, 205, 198, 500, 80) === false, "无前次");
    assert(isDoubleTap(1600, prev, 205, 198, 500, 80) === false, "超时间窗");
    assert(isDoubleTap(1300, prev, 300, 300, 500, 80) === false, "落点过远");
  });
  it("gestureTapAction：2→undo / 3+→redo / 其它→null", () => {
    assert(gestureTapAction(2) === "undo");
    assert(gestureTapAction(3) === "redo");
    assert(gestureTapAction(4) === "redo");
    assert(gestureTapAction(1) === null);
  });
});
