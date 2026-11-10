// anim-curve 契约测（提案 §3 批 1）。created 2026-09-05 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import {
  makeCurve, identityCurve, cloneCurve, curveEquals, evaluate, bakeLut, bakeLut8,
  insertKey, removeKey, moveKey, setTangentMode, setTangent, setBroken, sanitizeCurve,
  setWeighted, setWeight, isWeighted, DEFAULT_WEIGHT, MIN_WEIGHT,
} from "../src/common/anim-curve.ts";

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const isMonotone = (lut) => { for (let i = 1; i < lut.length; i++) if (lut[i] < lut[i - 1]) return false; return true; };

describe("anim-curve · 恒等 / 采样", () => {
  it("identityCurve → bakeLut8 逐字节 lut[x] == x", () => {
    const lut = bakeLut8(identityCurve());
    for (let x = 0; x < 256; x++) eq(lut[x], x, `lut[${x}]`);
  });
  it("identity 上任意位置插 key → LUT 仍逐字节恒等（共线数据 clampedAuto 切线恒 1）", () => {
    const c = identityCurve();
    insertKey(c, 0.5); insertKey(c, 0.13); insertKey(c, 0.87);
    eq(c.keys.length, 5);
    const lut = bakeLut8(c);
    for (let x = 0; x < 256; x++) eq(lut[x], x, `lut[${x}]`);
  });
  it("bakeLut n 项含两端；domain 可换", () => {
    const l = bakeLut(identityCurve(), 5);
    eq(l.length, 5);
    assert(near(l[0], 0) && near(l[2], 0.5) && near(l[4], 1));
    const l2 = bakeLut(identityCurve(), 3, [0.5, 1]);
    assert(near(l2[0], 0.5) && near(l2[2], 1));
  });
  it("空曲线 → 0；单 key → 常数", () => {
    eq(evaluate({ keys: [], preWrap: "clamp", postWrap: "clamp" }, 0.3), 0);
    eq(evaluate(makeCurve([{ t: 0.2, v: 7 }]), -5), 7);
  });
  it("defaults JSON 干净（identity 往返结构不变，无 undefined 键）", () => {
    const c = identityCurve();
    eq(JSON.stringify(JSON.parse(JSON.stringify(c))), JSON.stringify(c));
    assert(!("inWeight" in c.keys[0]), "缺省不写 inWeight 键");
  });
});

describe("anim-curve · clampedAuto（Fritsch–Carlson）", () => {
  it("单调数据 → 单调 LUT，不过冲", () => {
    // 陡上 + 平台：Catmull-Rom 会在平台前过冲，clampedAuto 不会
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.2, v: 0.9 }, { t: 0.5, v: 0.95 }, { t: 1, v: 1 }]);
    const lut = bakeLut8(c);
    assert(isMonotone(lut), "LUT 单调");
    eq(lut[255], 255);
    for (let x = 0; x < 256; x++) assert(lut[x] <= 255 && lut[x] >= 0);
    // 对照：auto（Catmull-Rom）同数据确实非单调（自证限幅有意义）
    const a = makeCurve([{ t: 0, v: 0 }, { t: 0.2, v: 0.9 }, { t: 0.5, v: 0.95 }, { t: 1, v: 1 }]);
    for (let i = 0; i < a.keys.length; i++) setTangentMode(a, i, "auto");
    let over = false;
    for (let x = 0; x < 256; x++) if (evaluate(a, x / 255) > 1 + 1e-9) over = true;
    assert(over || !isMonotone(bakeLut8(a)), "auto 对照组应过冲或非单调");
  });
  it("极值 key 切线 = 0", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.5, v: 1 }, { t: 1, v: 0 }]);
    eq(c.keys[1].inTan, 0); eq(c.keys[1].outTan, 0);
    // 峰不过冲：任何采样 ≤ 1
    for (let x = 0; x <= 100; x++) assert(evaluate(c, x / 100) <= 1 + 1e-9);
  });
  it("端点 = 单边割线", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.5, v: 0.25 }, { t: 1, v: 1 }]);
    assert(near(c.keys[0].outTan, 0.5));
    assert(near(c.keys[2].inTan, 1.5));
  });
});

describe("anim-curve · 切线模式", () => {
  it("linear = 两侧各自割线（折线）；flat = 0", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.5, v: 1 }, { t: 1, v: 0.5 }]);
    setTangentMode(c, 1, "linear");
    assert(near(c.keys[1].inTan, 2)); assert(near(c.keys[1].outTan, -1));
    setTangentMode(c, 1, "flat");
    eq(c.keys[1].inTan, 0); eq(c.keys[1].outTan, 0);
    // 全 linear → 纯折线
    for (let i = 0; i < 3; i++) setTangentMode(c, i, "linear");
    assert(near(evaluate(c, 0.25), 0.5)); assert(near(evaluate(c, 0.75), 0.75));
  });
  it("constant：左 key 值持有到下一 key（阶跃）；末 key 处取末值", () => {
    const c = makeCurve([{ t: 0, v: 0.2 }, { t: 0.5, v: 0.8 }, { t: 1, v: 1 }]);
    setTangentMode(c, 0, "constant", "out");
    assert(near(evaluate(c, 0.49), 0.2));
    assert(near(evaluate(c, 0.5), 0.8));
    { const v = evaluate(c, 0.75); assert(v > 0.8 && v < 1, `第二段仍平滑（只 key0 out 为 constant）got ${v}`); }
    setTangentMode(c, 1, "constant");
    assert(near(evaluate(c, 0.99), 0.8));
    assert(near(evaluate(c, 1), 1));
    const lut = bakeLut8(c);
    eq(lut[0], 51); eq(lut[127], 51); eq(lut[128], 204); eq(lut[254], 204); eq(lut[255], 255);
  });
  it("setTangent：非 broken 镜像两侧成 free；broken 后独立", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.5, v: 0.5 }, { t: 1, v: 1 }]);
    setTangent(c, 1, "out", 3);
    eq(c.keys[1].inMode, "free"); eq(c.keys[1].outMode, "free");
    eq(c.keys[1].inTan, 3); eq(c.keys[1].outTan, 3);
    setBroken(c, 1, true);
    setTangent(c, 1, "in", -1);
    eq(c.keys[1].inTan, -1); eq(c.keys[1].outTan, 3);
    // 联动回去 → 取平均
    setBroken(c, 1, false);
    eq(c.keys[1].inTan, 1); eq(c.keys[1].outTan, 1);
    // free 不被 refresh 抹掉：移别的 key 后仍是 1
    moveKey(c, 2, 1, 0.9);
    eq(c.keys[1].inTan, 1);
  });
  it("auto / clampedAuto 隐含非 broken", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.5, v: 0.5 }, { t: 1, v: 1 }]);
    setBroken(c, 1, true);
    setTangentMode(c, 1, "clampedAuto", "in");
    eq(c.keys[1].broken, false);
    eq(c.keys[1].inMode, "clampedAuto"); eq(c.keys[1].outMode, "clampedAuto");
  });
});

describe("anim-curve · 编辑 verb", () => {
  it("insertKey 缺省 v = 原曲线值；同 t 覆盖；返回 index", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]);
    setTangent(c, 0, "out", 3);   // 弯一下
    const before = evaluate(c, 0.3);
    const i = insertKey(c, 0.3);
    eq(i, 1);
    assert(near(c.keys[1].v, before));
    eq(insertKey(c, 0.3, 0.77), 1);
    eq(c.keys.length, 3);
    eq(c.keys[1].v, 0.77);
  });
  it("插入点落在原曲线上，邻居 auto 切线重算 → 形状只微变（S 曲线 LUT 最大偏差 ≤ 4/255）", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.35, v: 0.2 }, { t: 0.65, v: 0.8 }, { t: 1, v: 1 }]);
    const a = bakeLut8(c);
    insertKey(c, 0.5);
    const b = bakeLut8(c);
    let maxd = 0;
    for (let x = 0; x < 256; x++) maxd = Math.max(maxd, Math.abs(a[x] - b[x]));
    assert(maxd <= 4, `max dev ${maxd}`);
    eq(b[Math.round(0.5 * 255)], a[Math.round(0.5 * 255)], "插入点本身值不变");
  });
  it("moveKey 越过邻居自动重排，返回新 index；lockT 只动 v", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.3, v: 0.3 }, { t: 0.6, v: 0.6 }, { t: 1, v: 1 }]);
    const ni = moveKey(c, 1, 0.8, 0.1);
    eq(ni, 2);
    eq(c.keys.map((k) => k.t).join(","), "0,0.6,0.8,1");
    eq(c.keys[2].v, 0.1);
    eq(moveKey(c, 0, 0.9, 0.5, { lockT: true }), 0);
    eq(c.keys[0].t, 0); eq(c.keys[0].v, 0.5);
  });
  it("removeKey 至少留 1 个 key", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]);
    eq(removeKey(c, 0), true);
    eq(c.keys.length, 1);
    eq(removeKey(c, 0), false);
    eq(c.keys.length, 1);
    eq(removeKey(c, 5), false);
  });
  it("cloneCurve 深拷贝独立；curveEquals", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]);
    const d = cloneCurve(c);
    assert(curveEquals(c, d));
    moveKey(d, 1, 1, 0.5);
    assert(!curveEquals(c, d));
    eq(c.keys[1].v, 1);
  });
});

describe("anim-curve · 外推 wrap", () => {
  const pts = [{ t: 0, v: 0 }, { t: 1, v: 1 }];
  it("clamp：越界取端值", () => {
    const c = makeCurve(pts);
    eq(evaluate(c, -1), 0); eq(evaluate(c, 2), 1);
  });
  it("loop：按周期折回", () => {
    const c = makeCurve(pts, "loop");
    assert(near(evaluate(c, 1.25), 0.25)); assert(near(evaluate(c, -0.75), 0.25));
  });
  it("pingPong：来回反射", () => {
    const c = makeCurve(pts, "pingPong");
    assert(near(evaluate(c, 1.25), 0.75)); assert(near(evaluate(c, 2.25), 0.25));
  });
});

describe("anim-curve · sanitizeCurve（读持久化）", () => {
  it("合法形状 → 归一化副本（排序 + 切线重算）；非法 → null", () => {
    const c = sanitizeCurve({ keys: [{ t: 1, v: 1 }, { t: 0, v: 0, inMode: "bogus" }], preWrap: "loop" });
    assert(c);
    eq(c.keys[0].t, 0); eq(c.keys[0].inMode, "clampedAuto"); eq(c.preWrap, "loop"); eq(c.postWrap, "clamp");
    eq(sanitizeCurve(null), null);
    eq(sanitizeCurve({ keys: [] }), null);
    eq(sanitizeCurve({ keys: [{ t: "a", v: 0 }] }), null);
    eq(sanitizeCurve({ keys: [{ t: 0, v: NaN }] }), null);
  });
});

describe("anim-curve · 加权切线（Bezier）", () => {
  it("开加权（w=1/3 两侧）→ 形状逐位不变；关加权删键，JSON 干净", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 0.35, v: 0.2 }, { t: 0.65, v: 0.8 }, { t: 1, v: 1 }]);
    const a = bakeLut(c, 1001);
    for (let i = 0; i < c.keys.length; i++) setWeighted(c, i, true);
    assert(isWeighted(c.keys[1], "in") && c.keys[1].outWeight === DEFAULT_WEIGHT);
    const b = bakeLut(c, 1001);
    for (let i = 0; i < a.length; i++) assert(Math.abs(a[i] - b[i]) <= 1e-9, `i=${i}: ${a[i]} vs ${b[i]}`);
    setWeighted(c, 1, false);
    assert(!("inWeight" in c.keys[1]) && !("outWeight" in c.keys[1]));
    eq(JSON.stringify(JSON.parse(JSON.stringify(c))), JSON.stringify(c));
  });
  it("恒等曲线任意权重仍恒等（控制点都在对角线上）", () => {
    const c = identityCurve();
    setWeighted(c, 0, true); setWeighted(c, 1, true);
    setWeight(c, 0, "out", 0.9); setWeight(c, 1, "in", 0.05);
    const lut = bakeLut8(c);
    for (let x = 0; x < 256; x++) eq(lut[x], x, `lut[${x}]`);
  });
  it("拉长把手改变段内鼓起：出侧权重大 → 曲线更贴近起点切线（同斜率下前段更陡/更平）", () => {
    const mk = (w) => { const c = makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]); setTangent(c, 0, "out", 0); setTangent(c, 1, "in", 0); setWeighted(c, 0, true); setWeighted(c, 1, true); setWeight(c, 0, "out", w); return c; };
    const flatStart = evaluate(mk(0.6), 0.3), refStart = evaluate(mk(DEFAULT_WEIGHT), 0.3);
    assert(flatStart < refStart, `出侧权重 0.6 → t=0.3 处更贴 0 斜率：${flatStart} < ${refStart}`);
    // 单调 S：值域内、单调
    const c = mk(0.6); let prev = -1;
    for (let i = 0; i <= 100; i++) { const v = evaluate(c, i / 100); assert(v >= -1e-9 && v <= 1 + 1e-9 && v >= prev - 1e-9); prev = v; }
    assert(near(evaluate(c, 1), 1) && near(evaluate(c, 0), 0));
  });
  it("setWeight 钳制：[MIN, 1] 且与段另一端之和 ≤ 1；权重和 > 1 的存量数据求值不炸、仍单调", () => {
    const c = makeCurve([{ t: 0, v: 0 }, { t: 1, v: 1 }]);
    setWeighted(c, 0, true); setWeighted(c, 1, true);
    setWeight(c, 1, "in", 0.8);                       // 对端 out=1/3 → 钳到 2/3
    assert(near(c.keys[1].inWeight, 2 / 3), `in 钳到 1-1/3：${c.keys[1].inWeight}`);
    setWeight(c, 0, "out", 0.9);                      // 对端 in=2/3 → 钳到 1/3
    assert(near(c.keys[0].outWeight, 1 / 3), `out 钳到 1-2/3：${c.keys[0].outWeight}`);
    setWeight(c, 0, "out", 0); eq(c.keys[0].outWeight, MIN_WEIGHT);
    c.keys[0].outWeight = 1; c.keys[1].inWeight = 1;   // 越过 setWeight 的存量坏数据
    let prev = -1;
    for (let i = 0; i <= 200; i++) { const v = evaluate(c, i / 200); assert(Number.isFinite(v) && v >= prev - 1e-9, `t=${i / 200} v=${v}`); prev = v; }
  });
  it("sanitizeCurve 读入权重（钳制）；坏值丢弃", () => {
    const c = sanitizeCurve({ keys: [{ t: 0, v: 0, outWeight: 0.5 }, { t: 1, v: 1, inWeight: 7 }, { t: 0.5, v: 0.5, inWeight: "x" }] });
    eq(c.keys[0].outWeight, 0.5); eq(c.keys[2].inWeight, 1); assert(!("inWeight" in c.keys[1]));
  });
});
