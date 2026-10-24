// 绝对网格 + 整数长度 + 轴向咬合（0.11 尺规纪元 ⑤，2026-10-24 Claude Fable 5.1；user「1 绘图轴」「snap 比显示要细 1/5」「旋转的时候坐标轴方向也有snap」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { type GeomView } from "../src/scene/world-view.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { RANK, snapPoint } from "../src/editor/solver.ts";
import { GROUND, NO_HAND } from "../src/editor/pick.ts";
import { WORLD_FRAME, type Frame } from "../src/scene/xform.ts";
import { axisAlignAngle } from "../src/editor/protractor-geom.ts";
import { newDocument, readCatsup, writeCatsup } from "../src/format/index.ts";
import { DEFAULT_SETTINGS } from "../src/format/document.ts";
import { gridFromSettings } from "../src/editor/grid-settings.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50; return c; };
const viewOf = (k: Kernel, frame: Frame, grid: { step: number; sub: number } | null): GeomView =>
  Object.assign(k, { frame: () => frame, guides: () => ({ lines: [], points: [] }), grid: () => (grid ? { frame, step: grid.step, sub: grid.sub } : null) }) as unknown as GeomView;
const far = (): Kernel => { const k = new Kernel(); k.addEdges([[P(-30, -30), P(-29, -30)]]); return k; };

describe("grid: 格点 = 最低秩 0-D；几何先于网格；帧坐标系", () => {
  it("地面上离光标最近的 step/sub 格点；格点落不到画面平面上就没有", () => {
    const cam = topCam();
    const v = viewOf(far(), WORLD_FRAME, { step: 1, sub: 5 });
    const s = cam.angularPx(P(2.12, 3.03, 0), VP);
    const a = snapPoint(v, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND });
    eq(a.kind, "grid-point"); assert(near(a.p, P(2.2, 3.0, 0), 1e-9), `格点 (2.2,3)，实得 ${a.p.x},${a.p.y}`);
    const v10 = viewOf(far(), WORLD_FRAME, { step: 1, sub: 10 });
    const b = snapPoint(v10, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND });
    assert(near(b.p, P(2.1, 3.0, 0), 1e-9), "1/10：格点 (2.1,3)");
    const lifted = { plane: { n: P(0, 0, 1), d: 0.37 }, basis: GROUND.basis };   // z=0.37 不是格点高度
    const c = snapPoint(v, cam, VP, s.x, s.y, 8, { plane: lifted, hand: NO_HAND });
    assert(c.kind !== "grid-point", "非格点高度的平面上没有格点");
  });
  it("格点是地板（D16）：锚点的轴线在容差内 → 轴线（整数长度）赢过近处格点；没轴线才落格点", () => {
    const cam = topCam();
    const v = viewOf(far(), WORLD_FRAME, { step: 1, sub: 5 });
    const anchor = P(0.3, 0.3, 0);
    const s = cam.angularPx(P(2.33, 0.31, 0), VP);   // 离锚点 X 轴线 0.08 px，离格点 (2.4,0.4) 0.9 px：旧裁决格点赢（0-D 优先）
    const a = snapPoint(v, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    eq(a.kind, "increment", "轴线 + 整数长度");
    assert(Math.abs(a.p.y - 0.3) < 1e-9 && Math.abs(a.p.x - 2.3) < 1e-9, `该在锚点的 X 轴线上取整到 (2.3,0.3)，实得 ${a.p.x},${a.p.y}`);
    const s2 = cam.angularPx(P(2.33, 1.72, 0), VP);   // 离任何轴线都远 → 格点 (2.4,1.8)
    const b = snapPoint(v, cam, VP, s2.x, s2.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    eq(b.kind, "grid-point"); assert(near(b.p, P(2.4, 1.8, 0)), `格点，实得 ${b.p.x},${b.p.y}`);
  });
  it("端点在旁边 → 端点赢；网格关着 → 没有格点；帧转 45° → 格点沿帧", () => {
    const cam = topCam();
    const k = far(); k.addEdges([[P(2.25, 3.0), P(2.25, 9)]]);
    const a = snapPoint(viewOf(k, WORLD_FRAME, { step: 1, sub: 5 }), cam, VP, cam.angularPx(P(2.22, 3.02, 0), VP).x, cam.angularPx(P(2.22, 3.02, 0), VP).y, 8, { plane: GROUND, hand: NO_HAND });
    eq(a.kind, "endpoint");
    assert(RANK.grid < RANK.axisLine && RANK.grid > RANK.plane, "秩：轴线 > 格点 > 兜底平面");
    const off = snapPoint(viewOf(far(), WORLD_FRAME, null), cam, VP, cam.angularPx(P(2.12, 3.03, 0), VP).x, cam.angularPx(P(2.12, 3.03, 0), VP).y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    assert(off.kind !== "grid-point" && off.kind !== "increment", "关着 = 没有网格候选");
    const c45 = Math.SQRT1_2, F: Frame = { origin: P(1, 1, 0), x: P(c45, c45, 0), y: P(-c45, c45, 0), z: P(0, 0, 1) };
    const t = P(1 + 2 * c45 + 0.03, 1 + 2 * c45 - 0.02, 0);   // 帧坐标 (2, 0) 附近
    const sp = cam.angularPx(t, VP);
    const r = snapPoint(viewOf(far(), F, { step: 1, sub: 5 }), cam, VP, sp.x, sp.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(r.kind, "grid-point"); assert(near(r.p, P(1 + 2 * c45, 1 + 2 * c45, 0), 1e-9), "帧坐标 (2,0) 的格点");
  });
});

describe("grid: 整数长度（没吸到几何、画面上没格点时沿锚点方向取整）", () => {
  it("非格点高度的平面：自由点离锚点 2.535 → 2.6（1/5）", () => {
    const cam = topCam();
    const plane = { plane: { n: P(0, 0, 1), d: 0.37 }, basis: GROUND.basis };
    const anchor = P(0, 0, 0.37);
    const sp = cam.angularPx(P(2.37, 0.9, 0.37), VP);
    const r = snapPoint(viewOf(far(), WORLD_FRAME, { step: 1, sub: 5 }), cam, VP, sp.x, sp.y, 8, { plane, anchor, hand: NO_HAND, lines: false });
    eq(r.kind, "increment");
    const d = Math.hypot(r.p.x - anchor.x, r.p.y - anchor.y, r.p.z - anchor.z);
    assert(Math.abs(d - 2.6) < 1e-9, `距离取整到 2.6，实得 ${d}`);
    assert(r.hints?.length === 1 && near(r.hints[0].a, anchor), "提示线从锚点出发");
  });
});

describe("grid: 轴向咬合（旋转 / 量角器）", () => {
  it("参考方向转到与帧的某轴（±）平行 → 吸住并报哪根轴；离得远 → null；与转轴平行的轴不参赛", () => {
    const O = P(0, 0, 0), Z = P(0, 0, 1), ref = P(1, 0, 0);
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    const F: Frame = { origin: O, x: P(c, s, 0), y: P(-s, c, 0), z: Z };
    const a = axisAlignAngle(O, Z, ref, F, (29 * Math.PI) / 180)!;
    assert(a && a.axis === "x" && Math.abs(a.ang - Math.PI / 6) < 1e-12, "29° → 30°（帧 x）");
    const b = axisAlignAngle(O, Z, ref, F, (209.2 * Math.PI) / 180)!;
    assert(b && b.axis === "x" && Math.abs(Math.atan2(Math.sin(b.ang - (210 * Math.PI) / 180), Math.cos(b.ang - (210 * Math.PI) / 180))) < 1e-12, "209.2° → 210°（−x）");
    eq(axisAlignAngle(O, Z, ref, F, (100 * Math.PI) / 180), null, "离 120°（帧 y）20°：不吸");
    eq(axisAlignAngle(O, Z, ref, WORLD_FRAME, (0.5 * Math.PI) / 180)?.axis, "x", "世界帧 0.5° → x");
    const yOnly = axisAlignAngle(O, P(1, 0, 0), P(0, 1, 0), WORLD_FRAME, (89 * Math.PI) / 180)!;
    assert(yOnly && yOnly.axis === "z", "绕 x 转：x 轴与转轴平行不参赛，吸到 z");
  });
});

describe("grid: 文档 settings 往返", () => {
  it("默认 1/5 关；写 absoluteGrid/gridStep/gridSubdiv 读回；gridFromSettings 兜坏值", () => {
    const k = new Kernel(); k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]]);
    const doc = newDocument(k.toBrep(), "g");
    eq(doc.settings.gridSubdiv, 5); eq(doc.settings.absoluteGrid, false); eq(DEFAULT_SETTINGS.snapIncrement, 0.2);
    doc.settings = { ...doc.settings, absoluteGrid: true, gridStep: 0.5, gridSubdiv: 10, snapIncrement: 0.05 };
    const back = readCatsup(writeCatsup(doc));
    eq(back.settings.absoluteGrid, true); eq(back.settings.gridStep, 0.5); eq(back.settings.gridSubdiv, 10);
    const g = gridFromSettings(back.settings);
    eq(g.on, true); eq(g.step, 0.5); eq(g.subdiv, 10);
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridStep: -1, gridSubdiv: 7 }).step, 1); eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridSubdiv: 7 }).subdiv, 5);
  });
});

describe("grid: 网格面 xy / yz / xz（user 2026-10-24「方便我吸附画立面」）", () => {
  it("gridFrame：yz / xz 都是右手系，法向 = 另一根轴；settings 往返只在非 xy 时写 gridPlane", async () => {
    const { gridFrame, gridFromSettings, settingsFromGrid } = await import("../src/editor/grid-settings.ts");
    const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
    for (const pl of ["xy", "yz", "xz"] as const) {
      const F = gridFrame(WORLD_FRAME, pl);
      assert(near(cross(F.x, F.y), F.z), `${pl} 右手系`);
    }
    assert(near(gridFrame(WORLD_FRAME, "yz").z, P(1, 0, 0)), "yz 的法向 = X");
    assert(near(gridFrame(WORLD_FRAME, "xz").z, P(0, -1, 0)), "xz 的法向 = −Y");
    const s = settingsFromGrid(DEFAULT_SETTINGS, { on: true, step: 1, subdiv: 5, plane: "yz" });
    eq(s.gridPlane, "yz"); eq(gridFromSettings(s).plane, "yz");
    eq(settingsFromGrid(DEFAULT_SETTINGS, { on: true, step: 1, subdiv: 5, plane: "xy" }).gridPlane, undefined, "xy 不写键");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridPlane: "zz" as never }).plane, "xy", "坏值回 xy");
  });
  it("网格面 yz 开着：空处首点落在 x=0 的立面上，格点也在立面上", async () => {
    const { gridFrame } = await import("../src/editor/grid-settings.ts");
    const { rectFirstPlane } = await import("../src/editor/pick.ts");
    const cam = new OrbitCamera(); cam.yaw = 0; cam.pitch = 0.2; cam.halfH = 50;   // 从 +X 侧看 YZ 面
    const v = viewOf(far(), gridFrame(WORLD_FRAME, "yz"), { step: 1, sub: 5 });
    const s = cam.angularPx(P(0, 2.13, 1.02), VP);
    const r = rectFirstPlane(v, cam, VP, s.x, s.y, 8);
    assert(Math.abs(r.plane.plane.n.x) > 0.999, `首点平面法向 = X，实得 ${JSON.stringify(r.plane.plane.n)}`);
    eq(r.snap.kind, "grid-point"); assert(near(r.snap.p, P(0, 2.2, 1.0), 1e-9), `格点 (0,2.2,1)，实得 ${r.snap.p.x},${r.snap.p.y},${r.snap.p.z}`);
  });
});
