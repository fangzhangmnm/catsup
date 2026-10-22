// 数值小窗（#11，2026-10-21，Claude Fable 5.1）：解析（单位 / 后缀 / 段数 / 阵列 / 错误）+ 阵列变换序列。
import { describe, it, eq, assert } from "./runner.mjs";
import { type VcbValue, parseVcb, arrayTranslations, arrayRotations, fmtVcbLength, vcbPrompt } from "../src/editor/vcb.ts";
import { applyPt } from "../src/scene/xform.ts";

const ctx = { unit: "m" as const };
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
/** 成功分支：失败就抛（让断言信息直接是解析错误）。 */
const ok = (r: VcbValue | { error: string }): VcbValue => { if ("error" in r) throw new Error(r.error); return r; };

describe("vcb: 解析", () => {
  it("长度：默认单位、后缀覆盖、负号、小数、中文逗号；0 被拒", () => {
    const a = ok(parseVcb("2", "pp", ctx)); assert(a.kind === "length" && near(a.m, 2));
    const b = ok(parseVcb("250cm", "line", ctx)); assert(b.kind === "length" && near(b.m, 2.5));
    const c = ok(parseVcb("1500 mm", "offset", ctx)); assert(c.kind === "length" && near(c.m, 1.5));
    const d = ok(parseVcb("-1.5", "pp", ctx)); assert(d.kind === "length" && near(d.m, -1.5));
    const e = ok(parseVcb(".5", "move", { unit: "cm" })); assert(e.kind === "length" && near(e.m, 0.005), "cm 默认单位");
    assert("error" in parseVcb("0", "line", ctx), "0 长度拒");
    assert("error" in parseVcb("abc", "line", ctx));
    assert("error" in parseVcb("2,3", "line", ctx), "画线只收一个数");
  });
  it("矩形 宽,高；旋转 角度；缩放 倍率 / 三轴；圆 段数", () => {
    const r = ok(parseVcb("2，1.5", "rect", ctx)); assert(r.kind === "dims" && near(r.a, 2) && near(r.b, 1.5));
    assert("error" in parseVcb("2", "rect", ctx));
    const g = ok(parseVcb("45", "rotate", ctx)); assert(g.kind === "angle" && near(g.deg, 45));
    const g2 = ok(parseVcb("-90°", "rotate", ctx)); assert(g2.kind === "angle" && near(g2.deg, -90));
    const f = ok(parseVcb("1.5", "scale", ctx)); assert(f.kind === "factor" && f.f.length === 1 && near(f.f[0], 1.5));
    const f3 = ok(parseVcb("2,1,1", "scale", ctx)); assert(f3.kind === "factor" && f3.f.length === 3);
    assert("error" in parseVcb("0", "scale", ctx), "倍率 0 拒");
    const s = ok(parseVcb("12s", "circle", ctx)); assert(s.kind === "segments" && s.n === 12);
    assert("error" in parseVcb("12s", "line", ctx), "段数只对圆");
    assert("error" in parseVcb("2s", "circle", ctx), "段数下限 3");
  });
  it("英制：3'6\" / 42\" / 12' / 3' 6 1/2\" / 5ft / 30in；默认 ft 时裸数 = 英尺；回显 3' 6\"", () => {
    const a = ok(parseVcb("3'6\"", "pp", ctx)); assert(a.kind === "length" && near(a.m, 3 * 0.3048 + 6 * 0.0254));
    const b = ok(parseVcb("42\"", "line", ctx)); assert(b.kind === "length" && near(b.m, 42 * 0.0254));
    const c = ok(parseVcb("12'", "move", ctx)); assert(c.kind === "length" && near(c.m, 12 * 0.3048));
    const d = ok(parseVcb("3' 6 1/2\"", "pp", ctx)); assert(d.kind === "length" && near(d.m, 3 * 0.3048 + 6.5 * 0.0254));
    const e = ok(parseVcb("5ft", "pp", ctx)); assert(e.kind === "length" && near(e.m, 5 * 0.3048));
    const f = ok(parseVcb("30in", "pp", ctx)); assert(f.kind === "length" && near(f.m, 30 * 0.0254));
    const g = ok(parseVcb("2", "pp", { unit: "ft" })); assert(g.kind === "length" && near(g.m, 2 * 0.3048), "默认英尺");
    const h = ok(parseVcb("2,1", "rect", { unit: "in" })); assert(h.kind === "dims" && near(h.a, 2 * 0.0254));
    eq(fmtVcbLength(3 * 0.3048 + 6 * 0.0254, "ft"), "3' 6\"");
    eq(fmtVcbLength(0.0254 * 42, "in"), "42\"");
  });
  it("阵列：5x / *5 / x5 / /5，只对移动 / 旋转", () => {
    const a = ok(parseVcb("5x", "move", ctx)); assert(a.kind === "array" && a.mode === "x" && a.n === 5);
    const b = ok(parseVcb("*3", "move", ctx)); assert(b.kind === "array" && b.mode === "x" && b.n === 3);
    const c = ok(parseVcb("x4", "rotate", ctx)); assert(c.kind === "array" && c.n === 4);
    const d = ok(parseVcb("/4", "move", ctx)); assert(d.kind === "array" && d.mode === "/" && d.n === 4);
    assert("error" in parseVcb("5x", "line", ctx));
  });
});

describe("vcb: 阵列变换", () => {
  it("外部阵列 k·delta；内分 k·delta/n", () => {
    const d = { x: 2, y: 0, z: 0 }, p = { x: 0, y: 0, z: 0 };
    const xs = arrayTranslations(d, "x", 3).map((X) => applyPt(X, p).x);
    eq(xs.join(","), "2,4,6");
    const ds = arrayTranslations(d, "/", 4).map((X) => applyPt(X, p).x);
    eq(ds.join(","), "0.5,1,1.5,2");
    const rs = arrayRotations({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 2, "x", 2).map((X) => applyPt(X, { x: 1, y: 0, z: 0 }));
    assert(near(rs[0].y, 1) && near(rs[1].x, -1), "90° 两份：(0,1) 与 (−1,0)");
    eq(fmtVcbLength(2.5, "cm"), "250 cm"); eq(fmtVcbLength(0.1234, "m"), "0.123 m");
    eq(vcbPrompt("pp"), "高度"); eq(vcbPrompt(null), "");
  });
});
