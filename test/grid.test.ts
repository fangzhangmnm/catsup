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
import { gridFromSettings, settingsFromGrid, gridLadder, displayLadder, snapLevels, DEFAULT_GRID, UNIT_SYSTEMS, IN_M, FT_M } from "../src/editor/grid-settings.ts";
import { rectToolTargets } from "../src/editor/tools.ts";

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
    // 2026-10-24 网格语义定稿：方向归轴线（y = 0.3 不变），位置归格子 = 沿轴线最近的格线交点 x = 2.4（绝对格，不是离锚点的整数长度 2.3）
    eq(a.kind, "grid-point", "轴线上的格线交点"); eq(a.label, "格点 · X 轴");
    assert(Math.abs(a.p.y - 0.3) < 1e-9 && Math.abs(a.p.x - 2.4) < 1e-9, `该在锚点的 X 轴线上落到格线 x=2.4，实得 ${a.p.x},${a.p.y}`);
    const s2 = cam.angularPx(P(2.33, 1.72, 0), VP);   // 离任何轴线都远 → 格点 (2.4,1.8)
    const b = snapPoint(v, cam, VP, s2.x, s2.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    eq(b.kind, "grid-point"); assert(near(b.p, P(2.4, 1.8, 0)), `格点，实得 ${b.p.x},${b.p.y}`);
  });
  it("边上找点（user「当我想在边上找点的时候，grid snap也没了」）：斜边上落到最近的格线交点；网格关着 = 普通边上", () => {
    const cam = topCam();
    const k = new Kernel(); k.addEdges([[P(0, 0), P(9, 3)], [P(-30, -30), P(-29, -30)]]);   // 端点 / 中点离测试点 ≥ 15 px（点 ε = 10 px）
    const v = viewOf(k, WORLD_FRAME, { step: 1, sub: 5 });
    const s = cam.angularPx(P(1.83, 0.61, 0), VP);   // 边 y = x/3：x = 1.8 处格线交点 (1.8, 0.6)
    const a = snapPoint(v, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND });
    eq(a.kind, "grid-point"); eq(a.label, "格点 · 边上");
    assert(Math.abs(a.p.x - 1.8) < 1e-9 && Math.abs(a.p.y - 0.6) < 1e-9, `(1.8,0.6)，实得 ${a.p.x},${a.p.y}`);
    const off = snapPoint(viewOf(k, WORLD_FRAME, null), cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND });
    eq(off.kind, "on-edge");
    // 端点仍然赢：指针贴着 (9,3)
    const s2 = cam.angularPx(P(8.99, 2.997, 0), VP);
    eq(snapPoint(v, cam, VP, s2.x, s2.y, 8, { plane: GROUND, hand: NO_HAND }).kind, "endpoint");
  });
  it("显式 > 隐式（D21）：网格开着，矩形的正方形对角线（软目标线）让位给格点；网格关着对角线照旧赢", () => {
    const cam = topCam();
    const anchor = P(0, 0, 0), targets = rectToolTargets(anchor, GROUND.basis);
    const s = cam.angularPx(P(2.0, 2.03, 0), VP);   // 离对角线 x=y 0.17 px、离格点 (2,2) 0.24 px
    const v = viewOf(far(), WORLD_FRAME, { step: 1, sub: 5 });
    const a = snapPoint(v, cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND, anchor, toolTargets: targets });
    eq(a.kind, "grid-point"); assert(near(a.p, P(2, 2, 0), 1e-9), `格点 (2,2)，实得 ${a.p.x},${a.p.y}`);
    const off = snapPoint(viewOf(far(), WORLD_FRAME, null), cam, VP, s.x, s.y, 8, { plane: GROUND, hand: NO_HAND, anchor, toolTargets: targets });
    eq(off.kind, "tool"); eq(off.label, "正方形");
    assert(Math.abs(off.p.x - off.p.y) < 1e-9, "网格关着：落在对角线上");
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

describe("grid: 文档 settings 往返（CATSUP_document 3.4：单位制 + 吸附长度为主；user 10-30「把显示长度单位，grid制式，格距收成一个东西」「文件格式存同意」）", () => {
  it("单位制 / 吸附长度 / 栅格面关 写进去读回来不变", () => {
    const k = new Kernel(); k.addEdges([[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]]);
    const doc = newDocument(k.toBrep(), "g");
    eq(doc.settings.absoluteGrid, false); eq(DEFAULT_SETTINGS.snapIncrement, 0.2);
    doc.settings = settingsFromGrid(doc.settings, { on: true, snap: IN_M / 4, plane: "xz", system: "imperial", shown: false });
    const g = gridFromSettings(readCatsup(writeCatsup(doc)).settings);
    eq(g.on, true); eq(g.system, "imperial"); assert(Math.abs(g.snap - IN_M / 4) < 1e-15, `吸附 1/4 in，实得 ${g.snap}`); eq(g.plane, "xz"); eq(g.shown, false);
  });
  it("给老读者照写：格距 = 吸附长度、细分 1、显示单位公制 m / 英制 ft-in、制式键；公制 + xy + 显示 = 不写 gridPlane / gridHidden / gridPreset", () => {
    const m = settingsFromGrid(DEFAULT_SETTINGS, { ...DEFAULT_GRID, snap: 0.05 });
    eq(m.gridStep, 0.05); eq(m.gridSubdiv, 1); eq(m.snapIncrement, 0.05); eq(m.displayUnit, "m"); eq(m.unitSystem, "metric");
    eq(m.gridPlane, undefined); eq(m.gridHidden, undefined); eq(m.gridPreset, undefined);
    const d = settingsFromGrid(DEFAULT_SETTINGS, { ...DEFAULT_GRID, system: "dnd", snap: 5 * FT_M });
    eq(d.gridPreset, "dnd"); eq(d.displayUnit, "ft-in"); eq(settingsFromGrid(DEFAULT_SETTINGS, { ...DEFAULT_GRID, system: "imperial", snap: IN_M }).gridPreset, "architectural");
  });
  it("老文件没有 unitSystem：按老键猜（D&D 制式 = D&D；建筑制式 / 英尺英寸 / 英寸显示 = 英制；其余公制）；吸附 = snapIncrement，坏了退回格距 ÷ 细分", () => {
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridPreset: "dnd" }).system, "dnd");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridPreset: "architectural" }).system, "imperial");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, displayUnit: "ft-in" }).system, "imperial");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, displayUnit: "in" }).system, "imperial");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, displayUnit: "cm" }).system, "metric");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, unitSystem: "mars" as never }).system, "metric", "坏值回公制");
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridStep: 1, gridSubdiv: 10, snapIncrement: 0.1 }).snap, 0.1);
    eq(gridFromSettings({ ...DEFAULT_SETTINGS, gridStep: 0.5, gridSubdiv: 10, snapIncrement: -1 }).snap, 0.05, "snapIncrement 坏了 = 格距 ÷ 细分");
    eq(gridFromSettings(DEFAULT_SETTINGS).shown, true);
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
    const s = settingsFromGrid(DEFAULT_SETTINGS, { ...DEFAULT_GRID, on: true, plane: "yz" });
    eq(s.gridPlane, "yz"); eq(gridFromSettings(s).plane, "yz");
    eq(settingsFromGrid(DEFAULT_SETTINGS, { ...DEFAULT_GRID, on: true, plane: "xy" }).gridPlane, undefined, "xy 不写键");
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

describe("整格 / 整角吸附（DT51，user 2026-10-25「同时snap absolute和incremental没关系吧」「以及沿着一根线走一个grid」「snap to incremental应该还要有一个捕捉阈」「15是grid合理」）", () => {
  const nearCam = (): OrbitCamera => { const c = topCam(); c.halfH = 4; return c; };   // 100 px / m：吸附圈 ≈ 10 cm
  it("斜边上从端点走整格：t = 3 m 处落「整格」（最近的格线交点 0.16 m 外 = 圈外）", () => {
    const cam = nearCam();
    const k = new Kernel(); k.addEdges([[P(0, 0), P(9, 3)], [P(-30, -30), P(-29, -30)]]);
    const v = viewOf(k, WORLD_FRAME, { step: 1, sub: 1 });
    const u = 1 / Math.sqrt(10), at = P(9 * u, 3 * u, 0);   // 沿边 3 m
    const sp = cam.angularPx(P(at.x + 0.02, at.y - 0.03, 0), VP);
    const a = snapPoint(v, cam, VP, sp.x, sp.y, 8, { plane: GROUND, hand: NO_HAND });
    eq(a.kind, "increment"); assert(near(a.p, at, 1e-9), `沿边 3 m，实得 ${a.p.x},${a.p.y}`);
    assert(String(a.label).includes("边上"), String(a.label));
  });
  it("自由画：离 30° · 2 m 近 → 咬上；离得远 → 不咬（有捕捉阈，不是硬取整）；网格关着 → 都不咬", () => {
    const cam = nearCam(), anchor = P(0, 0, 0), deg = Math.PI / 180;
    const v = viewOf(far(), WORLD_FRAME, { step: 1, sub: 1 });
    const pol = (r: number, a: number): Pt3 => P(r * Math.cos(a * deg), r * Math.sin(a * deg), 0);
    const s1 = cam.angularPx(pol(2.02, 30.3), VP);
    const a = snapPoint(v, cam, VP, s1.x, s1.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    eq(a.kind, "increment"); assert(near(a.p, pol(2, 30), 1e-9), `30° · 2 m，实得 ${a.p.x},${a.p.y}`); eq(a.label, "30° · 整格 2.0 m");
    const s2 = cam.angularPx(pol(2.47, 37), VP);
    const b = snapPoint(v, cam, VP, s2.x, s2.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    assert(b.kind !== "increment" && b.kind !== "grid-point", `离整角 / 整格都远 → 不咬，实得 ${b.kind}`);
    const c = snapPoint(viewOf(far(), WORLD_FRAME, null), cam, VP, s1.x, s1.y, 8, { plane: GROUND, hand: NO_HAND, anchor });
    assert(c.kind !== "increment", "网格关着不咬");
  });
});


// 进位表（2026-10-30 Claude Opus 5.5；user 10-30「自动缩放grid也要注意不同的进位」「比选的snap还细的格子不应该显示，因为没snap」）
describe("grid: 进位表 / 吸附档 / 画出来的网格从吸附长度起", () => {
  const isMultiple = (a: number, b: number): boolean => { const r = b / a; return Math.abs(r - Math.round(r)) < 1e-6 && r > 1 - 1e-9; };
  it("每种单位制的进位表相邻两层是整数倍（粗线一定落在细线上）；英制 / D&D 一路英尺、不进码 / 英里", () => {
    for (const u of UNIT_SYSTEMS) { const L = gridLadder(u.id); for (let i = 1; i < L.length; i++) assert(isMultiple(L[i - 1], L[i]), `${u.id} 第 ${i} 层 ${L[i]} 不是 ${L[i - 1]} 的整数倍`); }
    assert(gridLadder("metric").includes(1e-15) && gridLadder("metric").includes(1e9), "公制 fm … Gm");
    assert(gridLadder("imperial").includes(FT_M) && gridLadder("imperial").includes(10 * FT_M) && !gridLadder("imperial").some((s) => Math.abs(s - 3 * FT_M) < 1e-9), "英制 1 ft、10 ft，没有 1 yd");
    assert(gridLadder("dnd").some((s) => Math.abs(s - 5 * FT_M) < 1e-12) && gridLadder("dnd").some((s) => Math.abs(s - 50 * FT_M) < 1e-12), "D&D 5 ft、50 ft");
  });
  it("画出来的进位表：比吸附细的层不画；吸附长度不在表上但整除上一层就补成最细一层（5 cm、50 cm、6 in）；每层都落在吸附格上", () => {
    const L = displayLadder("metric", 0.05);
    eq(L[0], 0.05); assert(Math.abs(L[1] - 0.1) < 1e-12, `5 cm 上面一层 10 cm，实得 ${L[1]}`);
    eq(displayLadder("metric", 0.1)[0], 0.1);
    assert(Math.abs(displayLadder("imperial", 6 * IN_M)[1] - FT_M) < 1e-12, "6 in 上面一层 1 ft");
    eq(displayLadder("dnd", FT_M)[0], FT_M);
    for (const u of UNIT_SYSTEMS) for (const sn of snapLevels(u.id)) {
      const D = displayLadder(u.id, sn);
      assert(Math.abs(D[0] - sn) < 1e-12, `${u.id} 吸附 ${sn}：最细一层 = 吸附长度，实得 ${D[0]}`);
      for (const s of D) assert(isMultiple(sn, s) || Math.abs(s - sn) < 1e-12, `${u.id} 吸附 ${sn}：${s} 不在吸附格上`);
    }
  });
});
