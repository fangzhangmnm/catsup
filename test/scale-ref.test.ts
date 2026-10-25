// B43 尺度参考适配层：交货身份钉死 + 参考实现在真数据上答对 + 方向判定按数据里的阈值 + 地标按界面语言滤。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
type Bytes = Uint8Array & { toString(enc: "utf8"): string };
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(u: URL, enc?: "utf8"): Bytes & string };
const { createHash } = (await import("node:crypto" as string)) as { createHash(a: "sha256"): { update(b: Uint8Array): { digest(e: "hex"): string } } };
import { DEFAULT_SCALE_REF, LADDER_SHA256, areaDir, closeness, forLanguage, lengthDir, readingOf, remindersFor, scaleRefFromSettings, scaleRefToSettings, scaleRuler, scaleTipView, scaleTooltip, type Ladder } from "../src/editor/scale-ref.ts";

const root = new URL("../", import.meta.url);
const bytes = readFileSync(new URL("vendor/size-ladder/ladder-v3.json", root));
const L = JSON.parse(bytes.toString("utf8")) as Ladder;
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const O = L.orientation;
const Z = { x: 0, y: 0, z: 1 };

describe("scale-ref: 物体尺寸梯子的 CatsUp 适配", () => {
  it("交货身份：vendor 里的数据 = 适配层钉的 = 取货脚本钉的；参考实现也 = 取货脚本钉的（原样没改）", () => {
    eq(sha(bytes), LADDER_SHA256);
    const pull = readFileSync(new URL("scripts/pull-size-ladder.mjs", root), "utf8");
    eq(pull.includes(LADDER_SHA256), true);
    const q = sha(readFileSync(new URL("src/vendor/size-ladder/ladder-query.mjs", root)));
    eq(pull.includes(q), true);
    eq(L.schema, "size-ladder/4");
  });
  it("参考实现在真数据上答对（室内 · 现实，竖着 0.914 m；多选 = 并集，加上人体多出「坐高」）", () => {
    // 仓鼠 ladder-query.mjs 头注释的例子把订阅写成「室内 + 人体」、答案却是只订室内的那个——注释笔误，已记总账告诉 user（不改仓鼠仓）
    eq(scaleTooltip(L, ["interior/ALL"], { reading: 0.914, dir: "up" }), "台面 36 in / 栏杆 / 台面 中日");
    eq(scaleTooltip(L, ["interior/ALL", "body/ALL"], { reading: 0.914, dir: "up" }), "台面 36 in / 栏杆 / 坐高");
    const r = scaleRuler(L, ["interior/ALL"], { reading: 2.4, dir: "up" });
    eq(r.length > 0, true);
    eq(r.every((m, i) => i === 0 || r[i - 1].v.value <= m.v.value), true);   // 按值从小到大
    eq(r.every((m) => m.hi >= 1.2 && m.lo <= 4.8), true);                       // 和 ÷2…×2 有交集
  });
  it("没订阅 / 读数不是正数 = 什么都不显示", () => {
    eq(scaleTooltip(L, [], { reading: 1, dir: "up" }), "");
    eq(scaleRuler(L, ["interior/ALL"], { reading: 0, dir: "up" }).length, 0);
  });
  it("长度方向：按上下文帧的 z、阈值读数据（竖 / 横各 30°），中间 = 斜；组轴歪了跟着歪", () => {
    eq(O.verticalWithinDeg, 30); eq(O.horizontalWithinDeg, 30);
    eq(lengthDir({ x: 0, y: 0, z: 2 }, Z, O), "up");
    eq(lengthDir({ x: 0, y: 0, z: -2 }, Z, O), "up");
    eq(lengthDir({ x: 3, y: 1, z: 0 }, Z, O), "flat");
    eq(lengthDir({ x: 1, y: 0, z: 1 }, Z, O), "both");                                         // 45°
    eq(lengthDir({ x: Math.sin(Math.PI / 6), y: 0, z: Math.cos(Math.PI / 6) }, Z, O), "up");   // 正好 30°
    eq(lengthDir({ x: Math.sin(Math.PI / 5), y: 0, z: Math.cos(Math.PI / 5) }, Z, O), "both"); // 36°
    eq(lengthDir({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, O), "up");                         // 组轴的 z 朝 +X
    eq(lengthDir({ x: 0, y: 0, z: 0 }, Z, O), null);
  });
  it("面积方向：法向贴着 z = 平面；墙面 = 不出参考", () => {
    eq(areaDir({ x: 0, y: 0, z: -1 }, Z, O), "plan");
    eq(areaDir({ x: 1, y: 0, z: 0 }, Z, O), null);
  });
  it("地标按界面语言：中文只留世界级 + 中国的；日文只留世界级 + 日本的；别的题材一个不少", () => {
    const landmark = new Set(L.concepts.filter((c) => c.themes.includes("landmark")).map((c) => c.id));
    const zh = forLanguage(L, "zh"), ja = forLanguage(L, "ja");
    const lm = (x: Ladder): Ladder["values"] => x.values.filter((v) => landmark.has(v.concept));
    eq(lm(zh).every((v) => v.regions === "*" || v.regions.includes("CN")), true);
    eq(lm(ja).every((v) => v.regions === "*" || v.regions.includes("JP")), true);
    eq(lm(zh).some((v) => v.regions !== "*" && v.regions.includes("JP")), false);
    eq(zh.values.length - lm(zh).length, L.values.length - lm(L).length);
    eq(forLanguage(L, "zh") === zh, true);   // 缓存
  });
});

describe("scale-ref: 提示框的数据（grill 定案）", () => {
  it("readingOf：线按方向；矩形平放 = 面积、竖着 = 竖边的高、斜的不配；圆 = 直径", () => {
    eq(JSON.stringify(readingOf({ kind: "length", vec: { x: 0, y: 0, z: 0.9 } }, Z, O)), JSON.stringify({ reading: 0.9, dir: "up" }));
    const flat = readingOf({ kind: "rect", u: { x: 3, y: 0, z: 0 }, v: { x: 0, y: 4, z: 0 }, normal: Z }, Z, O);
    eq(flat?.dir, "plan"); eq(flat?.reading, 12);
    const wall = readingOf({ kind: "rect", u: { x: 0.9, y: 0, z: 0 }, v: { x: 0, y: 0, z: 2.05 }, normal: { x: 0, y: 1, z: 0 } }, Z, O);
    eq(wall?.dir, "up"); eq(wall?.reading, 2.05);
    const s = Math.SQRT1_2;
    eq(readingOf({ kind: "rect", u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: s, z: s }, normal: { x: 0, y: -s, z: s } }, Z, O), null);
    eq(JSON.stringify(readingOf({ kind: "circle", radius: 0.5, normal: Z }, Z, O)), JSON.stringify({ reading: 1, dir: "flat" }));
  });
  it("closeness：典型值上 = 1、范围边上 = 0、对数尺两边各量各的", () => {
    eq(closeness(1, 1, 0.5, 2), 1);
    eq(closeness(0.5, 1, 0.5, 2), 0);
    eq(Math.abs(closeness(Math.SQRT2, 1, 0.5, 2) - 0.5) < 1e-12, true);
    eq(Math.abs(closeness(1.1, 1, 0.9, 1.21) - 0.5) < 1e-9, true);
  });
  it("浓的排前、按名字去重、规格点命中；没选 = null", () => {
    const v = scaleTipView(L, "interior/ALL", { reading: 0.914, dir: "up" })!;
    eq(v.items.length >= 3, true);
    eq(v.items.every((it, i) => i === 0 || v.items[i - 1].strength >= it.strength), true);
    eq(new Set(v.items.map((it) => it.name)).size, v.items.length);
    eq(v.items.some((it) => it.name === "栏杆" && it.hit), true);   // 0.914 栏杆是规格点
    eq(v.marks.every((m) => m.hi >= 0.914 / 1.5 && m.lo <= 0.914 * 1.5), true);
    eq(scaleTipView(L, null, { reading: 1, dir: "up" }), null);
  });
  it("跟着文件存：没写 = 默认（室内）、none = 不显示、默认不写键、认不出的原样留着", () => {
    eq(scaleRefFromSettings({}), DEFAULT_SCALE_REF);
    eq(scaleRefFromSettings({ scaleRef: "none" }), null);
    eq(scaleRefFromSettings({ scaleRef: "garden/JPSTYLE" }), "garden/JPSTYLE");
    eq("scaleRef" in scaleRefToSettings({ a: 1 }, DEFAULT_SCALE_REF), false);
    eq(scaleRefToSettings({ a: 1 }, null).scaleRef, "none");
    eq(scaleRefToSettings({ a: 1, scaleRef: "x" }, "mars/WHAT").scaleRef, "mars/WHAT");
  });
  it("新手提醒 = 数据里每个选单项自己的提醒（v3 menu[].reminders，含继承来的）：人体有「人体」那条、DnD 只有 dnd、儿童加 children", () => {
    const ids = (x: string): string => remindersFor(L, x).map((r) => r.id).join(",");
    eq(ids("body/ALL"), "body,estimate");
    eq(ids("interior/DND"), "dnd");
    eq(ids("interior/KIDS"), "children,stylized,fit,code,estimate");
    eq(remindersFor(L, "interior/DND")[0].text.includes("SRD 5.1"), true);
    eq(remindersFor(L, null).length, 0);
  });
  it("v3 改名的选单 id：body/CHILD 读成 body/KIDS", () => { eq(scaleRefFromSettings({ scaleRef: "body/CHILD" }), "body/KIDS"); });
});
