// 形状批（v0.13.17；user 2026-10-24「中心rect和旋转rect还是要……几种arc模式也看一下」）：旋转矩形四角 / 角度咬合 / 角度+宽 → C；圆心弧段 / 扫角连续化；
// 弧四模式构造（扇形带两条半径 → batch）；矩形从中心；数值小窗 rrect / arc 解析。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { History } from "../src/editor/history.ts";
import { GROUND } from "../src/editor/pick.ts";
import { centerArcSegments, rectOpposite, rectSegmentsOnPlane, rrectAngle, rrectCornerFromAngle, rrectCorners, rrectSnapAngle, sweepAngle, unwrapAngle, bulgePointForRadius } from "../src/editor/tools.ts";
import { arcOp, buildArc } from "../src/editor/arc-build.ts";
import { parseVcb, vcbPrompt } from "../src/editor/vcb.ts";

const P = (x: number, y: number, z = 0) => ({ x, y, z });
const Z = { x: 0, y: 0, z: 1 };
const near = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) < tol;
const nearP = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, tol = 1e-6): boolean => near(a.x, b.x, tol) && near(a.y, b.y, tol) && near(a.z, b.z, tol);

describe("shapes: 旋转矩形", () => {
  it("直角 → 矩形；斜角 → 平行四边形 D = A + (C − B)；共线 / 零边退化 null", () => {
    const q = rrectCorners(P(0, 0), P(2, 0), P(2, 1))!;
    assert(q && nearP(q[3], P(0, 1)), "直角第四角");
    const s = rrectCorners(P(0, 0), P(2, 0), P(3, 1))!;
    assert(s && nearP(s[3], P(1, 1)), "平行四边形第四角");
    eq(rrectCorners(P(0, 0), P(2, 0), P(3, 0)), null, "共线");
    eq(rrectCorners(P(0, 0), P(0, 0), P(3, 1)), null, "零边");
  });
  it("角度：内角 + 侧；角度+宽 → C 往返；89° 强吸 90、Shift 37° → 30、无 Shift 37° 照旧", () => {
    const a = rrectAngle(P(0, 0), P(2, 0), P(2, 1), Z);
    assert(near(a.deg, 90) && a.side === 1, `内角 ${a.deg} 侧 ${a.side}`);
    const b = rrectAngle(P(0, 0), P(2, 0), P(3, -1), Z);
    assert(near(b.deg, 135) && b.side === -1, `内角 ${b.deg} 侧 ${b.side}`);
    const c = rrectCornerFromAngle(P(0, 0), P(2, 0), Z, 135, Math.SQRT2, -1);
    assert(nearP(c, P(3, -1)), `往返 ${JSON.stringify(c)}`);
    const t = Math.tan((89 * Math.PI) / 180);
    const s1 = rrectSnapAngle(P(0, 0), P(2, 0), P(2 + 1 / t, 1), Z, { shift: false });
    assert(s1.snapped && s1.deg === 90 && near(s1.c.x, 2) , `强吸 ${JSON.stringify(s1)}`);
    const t37 = Math.tan((37 * Math.PI) / 180);
    const c37 = P(2 - Math.cos((37 * Math.PI) / 180), Math.sin((37 * Math.PI) / 180));   // 内角 37°
    const s2 = rrectSnapAngle(P(0, 0), P(2, 0), c37, Z, { shift: true });
    assert(s2.snapped && s2.deg === 30, `Shift 格 ${JSON.stringify(s2)}`);
    const s3 = rrectSnapAngle(P(0, 0), P(2, 0), c37, Z, { shift: false });
    assert(!s3.snapped && near(s3.deg, 37, 1e-6), `无 Shift ${s3.deg}`);
    void t37;
  });
});

describe("shapes: 圆心弧 + 扇形 + 两点弧半径", () => {
  it("90° 12 段：起点 / 终点 / 半径；扫角连续化过 180°；sweepAngle 带号", () => {
    const arc = centerArcSegments(GROUND.plane, GROUND.basis, P(0, 0), P(1, 0), Math.PI / 2, 12)!;
    eq(arc.segs.length, 12); assert(near(arc.radius, 1)); assert(nearP(arc.end, P(0, 1)), `终点 ${JSON.stringify(arc.end)}`);
    assert(nearP(arc.segs[0][0], P(1, 0)));
    eq(centerArcSegments(GROUND.plane, GROUND.basis, P(0, 0), P(1, 0), 0, 12), null, "扫角 0");
    assert(near(sweepAngle(P(0, 0), P(1, 0), P(0, 1), Z), Math.PI / 2) && near(sweepAngle(P(0, 0), P(1, 0), P(0, -1), Z), -Math.PI / 2));
    assert(near(unwrapAngle(3.0, -3.0), 3.0 + (2 * Math.PI - 6.0)), "过 180° 不跳");
    assert(near(unwrapAngle(0.1, 0.2), 0.2));
  });
  it("buildArc 四模式：two / three 过三点；center 段数；pie 带两条半径 → batch op；两点弧改半径保同侧", () => {
    const two = buildArc({ mode: "two", plane: GROUND, a: P(0, 0), b: P(2, 0), p: P(1, 1), segments: 12 })!;
    assert(two && near(two.radius, 1) && nearP(two.center, P(1, 0)) && two.radii.length === 0 && two.segs.length === 12);
    const three = buildArc({ mode: "three", plane: GROUND, a: P(0, 0), b: P(2, 0), p: P(1, 1), segments: 6 })!;
    assert(three && near(three.radius, 1) && three.segs.length === 6 && nearP(three.segs[5][1], P(2, 0)), "三点弧终点 = b");
    const center = buildArc({ mode: "center", plane: GROUND, a: P(1, 0), center: P(0, 0), sweep: Math.PI, segments: 8 })!;
    assert(center && center.segs.length === 8 && nearP(center.end, P(-1, 0)) && center.radii.length === 0);
    const pie = buildArc({ mode: "pie", plane: GROUND, a: P(1, 0), center: P(0, 0), sweep: Math.PI / 2, segments: 4 })!;
    eq(pie.radii.length, 2);
    const op = arcOp((p) => p, { def: 0, group: null }, pie);
    eq(op.op, "batch");
    // 落地：扇形 = 一张面 + 一条弧曲线（半径不进曲线）
    const h = new History();
    const s = h.commit(new Scene(), arcOp((p) => p, { def: new Scene().root, group: null }, pie)).scene;
    const k = s.kernelOf({ def: s.root, group: null });
    eq(k.faces().length, 1); eq(k.curves().length, 1); eq(k.curves()[0].edges.length, 4); eq(k.edges().length, 6);
    assert(!h.undo()!.scene.kernelOf({ def: s.root, group: null }).edges().length, "一次撤销全没");
    const bp = bulgePointForRadius(P(0, 0), P(2, 0), P(1, 1), 2);
    assert(bp.y > 0 && near(bp.y, 2 - Math.sqrt(3)), `凸度 ${JSON.stringify(bp)}`);
    const bp2 = bulgePointForRadius(P(0, 0), P(2, 0), P(1, -1), 0.1);
    assert(near(bp2.y, -1), "半径太小 → 半圆");
  });
});

describe("shapes: 矩形从中心 + 数值小窗", () => {
  it("rectOpposite：从中心 = 锚点关于 b 的对称点 → 矩形以锚点为中心", () => {
    const a = P(1, 1), b = P(2, 1.5);
    const segs = rectSegmentsOnPlane(GROUND.plane, GROUND.basis, rectOpposite(a, b, "center"), b);
    eq(segs.length, 4);
    const xs = segs.map(([p]) => p.x), ys = segs.map(([p]) => p.y);
    assert(near(Math.min(...xs), 0) && near(Math.max(...xs), 2) && near(Math.min(...ys), 0.5) && near(Math.max(...ys), 1.5));
    assert(nearP(rectOpposite(a, b, "corner"), a));
  });
  it("vcb：rrect「30,2」/「2」；arc「12s」/「45°」/「1.5」；提示字", () => {
    const ctx = { unit: "m" as const };
    const r = parseVcb("30,2", "rrect", ctx); assert(!("error" in r) && r.kind === "angleWidth" && r.deg === 30 && near(r.m, 2));
    const w = parseVcb("2", "rrect", ctx); assert(!("error" in w) && w.kind === "length" && near(w.m, 2));
    assert("error" in parseVcb("0,2", "rrect", ctx) && "error" in parseVcb("200,2", "rrect", ctx));
    const s = parseVcb("12s", "arc", ctx); assert(!("error" in s) && s.kind === "segments" && s.n === 12);
    const s2 = parseVcb("2s", "arc", ctx); assert(!("error" in s2) && s2.kind === "segments", "弧最少 2 段");
    assert("error" in parseVcb("2s", "circle", ctx), "圆最少 3 段");
    const g = parseVcb("45°", "arc", ctx); assert(!("error" in g) && g.kind === "angle" && g.deg === 45);
    const g2 = parseVcb("90deg", "arc", ctx); assert(!("error" in g2) && g2.kind === "angle" && g2.deg === 90);
    const l = parseVcb("1.5", "arc", ctx); assert(!("error" in l) && l.kind === "length" && near(l.m, 1.5));
    assert(vcbPrompt("rrect").includes("角度") && vcbPrompt("arc").includes("段数"));
  });
});
