// 整格吸附的唯一入口 gridSnap（src/editor/increments.ts）。created 2026-11-12 by Claude Opus 5.5
// 统筹 11-12 定的原则 + user 11-13「我当时说的十五应该是十五度就是旋转的话十五度……然后一律取整同意」：
//   吸到整格 = 取整（长度取吸附长度的整数倍、角度取 15° 的整数倍），对任何值都做、不看「够不够近」、结果不随缩放变；
//   10-25 那版「离得近才咬」（屏幕像素吸附圈 / 1.5° 角度窗）作废。吸到具体的东西（点、边、停靠点、和坐标轴平行）照旧按像素 / 角度窗、且优先——归各工具。
// 钉两样：① 数学（取整、关着原样、0 和 -0、负数）② 守卫：工具不许自己取整（不 import nearestStep / INCREMENT_DEG、不自带 15° 档），只问 gridSnap。
import { describe, it, eq, assert } from "./runner.mjs";
import { gridSnap, INCREMENT_DEG } from "../src/editor/increments.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[] };
const deg = (d: number): number => (d * Math.PI) / 180;
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-12;

describe("gridSnap：长度一律取吸附长度的整数倍", () => {
  const on = { on: true, snap: 0.01 }, off = { on: false, snap: 0.01 };
  it("对任何值都取整（没有「够不够近」）", () => {
    for (const [v, want] of [[0.016, 0.02], [0.024, 0.02], [0.026, 0.03], [0.0149, 0.01], [-0.016, -0.02], [1.234, 1.23]] as const) assert(close(gridSnap.length(v, on), want), `${v} → ${want}，实得 ${gridSnap.length(v, on)}`);
  });
  it("不到半格 = 0（不是 -0）；调用方据此不动、提示", () => {
    eq(Object.is(gridSnap.length(-0.004, on), 0), true);
    eq(gridSnap.length(0.004, on), 0);
    assert(/不到半格（.*），再拖远一点/.test(gridSnap.zeroHint(on, (m) => `${m * 1000} mm`)));
  });
  it("关着 / 步长不对 = 原样", () => {
    eq(gridSnap.length(0.016, off), 0.016);
    eq(gridSnap.length(0.016, { on: true, snap: 0 }), 0.016);
  });
  it("1 毫米吸附：毫米零件照样取整（和缩放无关 = 输入里没有屏幕）", () => {
    assert(close(gridSnap.length(0.0026, { on: true, snap: 0.001 }), 0.003));
  });
});

describe("gridSnap：角度一律取 15° 的整数倍", () => {
  it("档就是 15 度（10-25 那个「15」从来就是度，没有 15 像素）", () => { eq(INCREMENT_DEG, 15); });
  it("对任何角度都取整（以前 1.5° 窗外原样，现在 37° → 30°、38° → 45°）", () => {
    for (const [a, want] of [[31, 30], [37, 30], [38, 45], [-14, -15], [181, 180], [7, 0]] as const) assert(close(gridSnap.angle(deg(a), { on: true }), deg(want)), `${a}° → ${want}°`);
  });
  it("关着原样", () => { assert(close(gridSnap.angle(deg(37), { on: false }), deg(37))); });
});

describe("gridSnap：守卫（工具不许自己取整）", () => {
  const dir = "src/editor/tools/";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
  const code = (f: string): string => fs.readFileSync(dir + f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  // 自带 15° 的只许这两处，各有各的语义，不是整格吸附：自由建模「拉出」按住 Shift = 15° 一档（Blender 式，和格点开关无关）；平面把手的转动档（feel.ts ROT_STEP_DEG）
  const OWN_STEP_OK = new Set(["mesh-create.ts"]);
  it("tools/ 里不 import nearestStep / INCREMENT_DEG（长度、角度的整格只问 gridSnap）", () => {
    const bad = files.filter((f) => /import \{[^}]*\b(nearestStep|INCREMENT_DEG)\b[^}]*\} from "\.\.\/increments\.ts"/.test(code(f)));
    eq(bad.join("、"), "");
  });
  it("tools/ 里没有自带的 15° 档（`* 15` / `= 15` 这种），白名单除外", () => {
    const bad = files.filter((f) => !OWN_STEP_OK.has(f) && /(\*\s*15\b|\b15\s*\*|_DEG\s*=\s*15\b)/.test(code(f)));
    eq(bad.join("、"), "");
  });
  it("increments.ts 里不再有「离得近才咬」的 snapScalar；量角器没有 detent", () => {
    assert(!/snapScalar/.test(fs.readFileSync("src/editor/increments.ts", "utf8")));
    assert(!/function detent/.test(fs.readFileSync("src/editor/protractor-geom.ts", "utf8")));
  });
});
