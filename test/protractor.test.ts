// 量角器纯几何（0.11 尺规纪元 ⑥，2026-10-24 Claude Fable 5.1）：绕轴有向角、15° 咬合、转出方向（右手）。
import { gridSnap } from "../src/editor/increments.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { angleAbout, projectToAxisPlane, rotateDir } from "../src/editor/protractor-geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-9): boolean => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
const Z = P(0, 0, 1), O = P(0, 0, 0);
const deg = (d: number): number => (d * Math.PI) / 180;

describe("protractor: 几何", () => {
  it("有向角：绕 +Z 从 +X 到 +Y = +90°，到 −Y = −90°；轴反向角反号", () => {
    assert(Math.abs(angleAbout(O, Z, P(1, 0, 0), P(0, 1, 0)) - deg(90)) < 1e-12);
    assert(Math.abs(angleAbout(O, Z, P(1, 0, 0), P(0, -1, 0)) + deg(90)) < 1e-12);
    assert(Math.abs(angleAbout(O, P(0, 0, -1), P(1, 0, 0), P(0, 1, 0)) + deg(90)) < 1e-12);
    assert(Math.abs(angleAbout(P(1, 1, 0), Z, P(2, 1, 0), P(2, 2, 0)) - deg(45)) < 1e-12, "圆心不在原点");
  });
  it("15° 档 = 一律取整（gridSnap.angle；2026-11-12 起没有 1.5° 的窗，user 11-13「一律取整同意」）；关着原样", () => {
    const on = { on: true }, off = { on: false };
    assert(Math.abs(gridSnap.angle(deg(31), on) - deg(30)) < 1e-12);
    assert(Math.abs(gridSnap.angle(deg(37), on) - deg(30)) < 1e-12, "以前 37° 不咬，现在取整到 30°");
    assert(Math.abs(gridSnap.angle(deg(38), on) - deg(45)) < 1e-12);
    assert(Math.abs(gridSnap.angle(deg(-14), on) + deg(15)) < 1e-12);
    assert(Math.abs(gridSnap.angle(deg(37), off) - deg(37)) < 1e-12);
  });
  it("转出方向：参考方向绕轴转角度（右手）；参考点不在轴的垂面也先投影", () => {
    assert(near(rotateDir(O, Z, P(1, 0, 0), deg(90)), P(0, 1, 0), 1e-12));
    assert(near(rotateDir(O, Z, P(1, 0, 0), deg(-90)), P(0, -1, 0), 1e-12));
    assert(near(rotateDir(O, Z, P(2, 0, 5), deg(180)), P(-1, 0, 0), 1e-12), "参考点有 z 分量 → 先投到垂面");
    assert(near(projectToAxisPlane(P(3, 4, 7), P(0, 0, 2), Z), P(3, 4, 2)));
  });
});
