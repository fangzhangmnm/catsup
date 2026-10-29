// B43 尺度参考适配层：交货身份钉死 + 参考实现在真数据上答对 + 方向判定按数据里的阈值 + 地标按界面语言滤 + 多选 / 冻住的梯子 / 跟着文件存。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
type Bytes = Uint8Array & { toString(enc: "utf8"): string };
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(u: URL, enc?: "utf8"): Bytes & string };
const { createHash } = (await import("node:crypto" as string)) as { createHash(a: "sha256"): { update(b: Uint8Array): { digest(e: "hex"): string } } };
import * as Q from "../src/vendor/size-ladder/ladder-query.mjs";
import { DEFAULT_SCALE_REFS, LADDER_SHA256, areaDir, closeness, forLanguage, frozenLadder, lengthDir, readingOf, remindersFor, scaleRefsFromSettings, scaleRefsToSettings, scaleTipView, scaleTooltip, type Ladder } from "../src/editor/scale-ref.ts";

const root = new URL("../", import.meta.url);
const bytes = readFileSync(new URL("vendor/size-ladder/ladder-v3.json", root));
const L = JSON.parse(bytes.toString("utf8")) as Ladder;
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");
const O = L.orientation;
const Z = { x: 0, y: 0, z: 1 };

describe("scale-ref: 物件尺寸梯子的 CatsUp 适配", () => {
  it("交货身份：vendor 里的数据 = 适配层钉的 = 取货脚本钉的；参考实现也 = 取货脚本钉的（原样没改）", () => {
    eq(sha(bytes), LADDER_SHA256);
    const pull = readFileSync(new URL("scripts/pull-size-ladder.mjs", root), "utf8");
    eq(pull.includes(LADDER_SHA256), true);
    eq(pull.includes(sha(readFileSync(new URL("src/vendor/size-ladder/ladder-query.mjs", root)))), true);
    eq(L.schema, "size-ladder/4");
  });
  it("参考实现在真数据上答对（室内，竖着 0.914 m）", () => {
    eq(scaleTooltip(L, ["interior/ALL"], { reading: 0.914, dir: "up" }), "台面 36 in / 栏杆 / 台面 中日");
    eq(scaleTooltip(L, [], { reading: 1, dir: "up" }), "");
  });
  it("长度方向：按上下文帧的 z、阈值读数据（竖 / 横各 30°），中间 = 斜；组轴歪了跟着歪", () => {
    eq(O.verticalWithinDeg, 30); eq(O.horizontalWithinDeg, 30);
    eq(lengthDir({ x: 0, y: 0, z: 2 }, Z, O), "up");
    eq(lengthDir({ x: 0, y: 0, z: -2 }, Z, O), "up");
    eq(lengthDir({ x: 3, y: 1, z: 0 }, Z, O), "flat");
    eq(lengthDir({ x: 1, y: 0, z: 1 }, Z, O), "both");
    eq(lengthDir({ x: Math.sin(Math.PI / 6), y: 0, z: Math.cos(Math.PI / 6) }, Z, O), "up");
    eq(lengthDir({ x: Math.sin(Math.PI / 5), y: 0, z: Math.cos(Math.PI / 5) }, Z, O), "both");
    eq(lengthDir({ x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, O), "up");
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
    eq(zh.values.length - lm(zh).length, L.values.length - lm(L).length);
    eq(forLanguage(L, "zh") === zh, true);
  });
});

describe("scale-ref: 提示框的数据（grill 定案 + 多选）", () => {
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
  it("挑选优先 = 评级高的先、同级离典型值近的先；按名字去重；没勾 = null", () => {
    const v = scaleTipView(L, ["interior/ALL"], { reading: 0.914, dir: "up" })!;
    eq(v.items.length >= 3, true);
    eq(new Set(v.items.map((it) => it.name)).size, v.items.length);
    eq(v.items.some((it) => it.name === "栏杆"), true);
    eq(scaleTipView(L, [], { reading: 1, dir: "up" }), null);
  });
  it("门宽在它整段范围里都进前三（user「我0.1m snap的时候没有看到门宽」：之前按深浅挑，0.8 / 1.0 m 被床宽、淋浴宽挤掉）", () => {
    for (const r of [0.8, 0.85, 0.9, 0.95, 1.0]) {
      const top3 = scaleTipView(L, ["interior/ALL", "exterior/ALL"], { reading: r, dir: "flat" })!.items.slice(0, 3).map((it) => it.name);
      eq(top3.some((n) => /门宽/.test(n)), true, `${r} m: ${top3.join(" / ")}`);
    }
  });
  it("多选 = 并集：室内 + 室外在 5 m 横着时两边的名字都在", () => {
    const names = (subs: string[]): Set<string> => new Set(scaleTipView(L, subs, { reading: 5, dir: "flat" })?.items.map((it) => it.name) ?? []);
    const both = names(["interior/ALL", "exterior/ALL"]), i = names(["interior/ALL"]), e = names(["exterior/ALL"]);
    eq([...i].every((n) => both.has(n)) && [...e].every((n) => both.has(n)), true);
    eq(both.size >= Math.max(i.size, e.size), true);
  });
  it("冻住的梯子（user「你选好了不就freeze了吗只有一个梯子」）：候选和用全量算的一模一样；同一组订阅不重算", () => {
    const LL = forLanguage(L, "zh");
    const combos = [["interior/ALL", "exterior/ALL"], ["body/KIDS", "body/ALL"], ["garden/JPSTYLE"], ["interior/KIDS", "exterior/DND", "landmark/ALL"], ["cosmos/ALL"]];
    const sig = (c: { v: unknown }[]): string => JSON.stringify(c.map((h) => h.v));
    for (const subs of combos) {
      const F = frozenLadder(L, subs);
      eq(frozenLadder(L, [...subs].reverse()) === F, true);
      for (const dir of ["up", "flat", "both", "plan"] as const) for (let r = 0.05; r < 5e4; r *= 1.37) {
        const q = { reading: r, dir };
        eq(sig(Q.candidates(F, subs, q)), sig(Q.candidates(LL, subs, q)), `${subs.join("+")} ${dir} ${r.toPrecision(3)}`);
      }
    }
  });
  it("快路径（候选池 + 读数分档）给出的名字 = 参考实现 candidates 的名字（照抄的方向判定以此对拍）", () => {
    const LL = forLanguage(L, "zh");
    const combos = [["interior/ALL", "exterior/ALL"], ["body/KIDS"], ["garden/WEST", "landmark/ALL"], ["interior/DND", "combat/DND"], ["cosmos/ALL"], ["vehicles/ALL", "sports/ALL"]];
    for (const subs of combos) for (const dir of ["up", "flat", "both", "plan"] as const) for (let r = 0.03; r < 1e6; r *= 1.37) {
      const q = { reading: r, dir };
      const fast = [...new Set(scaleTipView(L, subs, q)?.items.map((it) => it.name) ?? [])].sort().join("|");
      const ref = [...new Set((Q.candidates(LL, subs, q) as { v: { tip: { zh: string } } }[]).map((h) => h.v.tip.zh))].sort().join("|");
      eq(fast, ref, `${subs.join("+")} ${dir} ${r.toPrecision(3)}`);
    }
  });
  it("跟着文件存（多选）：没写 = 默认室内 + 室外；[] = 不显示；默认不写键；旧单选键照读；body/CHILD 读成 body/KIDS", () => {
    eq(JSON.stringify(scaleRefsFromSettings({})), JSON.stringify(["interior/ALL", "exterior/ALL"]));
    eq(JSON.stringify(DEFAULT_SCALE_REFS), JSON.stringify(["interior/ALL", "exterior/ALL"]));
    eq(scaleRefsFromSettings({ scaleRefs: [] }).length, 0);
    eq(JSON.stringify(scaleRefsFromSettings({ scaleRefs: ["garden/JPSTYLE", "body/CHILD"] })), JSON.stringify(["garden/JPSTYLE", "body/KIDS"]));
    eq(JSON.stringify(scaleRefsFromSettings({ scaleRef: "interior/DND" })), JSON.stringify(["interior/DND"]));
    eq(scaleRefsFromSettings({ scaleRef: "none" }).length, 0);
    eq("scaleRefs" in scaleRefsToSettings({ a: 1 }, ["exterior/ALL", "interior/ALL"]), false);
    eq(JSON.stringify(scaleRefsToSettings({ a: 1, scaleRef: "x" }, [])), JSON.stringify({ a: 1, scaleRefs: [] }));
  });
  it("新手提醒 = 勾的几项的提醒并起来、同一条只出一次（v3 menu[].reminders，含继承来的）", () => {
    const ids = (x: string[]): string => remindersFor(L, x).map((r) => r.id).join(",");
    eq(ids(["body/ALL"]), "body,estimate");
    eq(ids(["interior/DND"]), "dnd");
    eq(ids(["interior/ALL", "interior/DND"]), "stylized,fit,code,estimate,dnd");
    eq(remindersFor(L, ["interior/DND"])[0].text.includes("SRD 5.1"), true);
    eq(remindersFor(L, []).length, 0);
  });
});
