// 立场表守卫（2026-10-28 Claude Fable 5.1；UX 心智模型 §2.3 / §6 第 1 步）：
// ① 每个工作台的每把工具在 controller/stance.ts 里必有一行；② 行里的语法 / 锁和那把工具的手势模块一致（表是事实，模块对不上 = 红）；
// ③ 三种设备的布尔默认都在；④ src/controller/ 是无头骑士：不许运行时 import 内核 / 网格 / three / DOM（type import 可以）。
import { describe, it, assert, eq } from "./runner.mjs";
import { STANCE, BOOLEAN_DEFAULT, SNAP_BASE, stanceOf } from "../src/controller/stance.ts";
import { GeometryMode } from "../src/editor/modes/geometry.ts";
import { SurfaceMode } from "../src/editor/modes/surface.ts";
import { FreeformMode } from "../src/editor/modes/freeform.ts";
import { VerifyMode } from "../src/editor/modes/verify.ts";
import type { Mode } from "../src/editor/mode.ts";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL): string[]; readFileSync(u: URL, enc: "utf8"): string };

const modes: Mode[] = [new GeometryMode(), new SurfaceMode(), new FreeformMode(), new VerifyMode()];

describe("立场表：每把工具每个工作台一行，和手势模块一致", () => {
  it("每个工作台的每把工具都有一行", () => {
    const missing: string[] = [];
    for (const m of modes) for (const t of m.tools) if (!stanceOf(m.id, t)) missing.push(`${m.id}/${t}`);
    eq(missing.join(","), "", "缺行");
  });
  it("语法（steps / direct）和锁（axis / plane / 无）与手势模块一致", () => {
    const bad: string[] = [];
    for (const m of modes) for (const t of m.tools) {
      const h = m.handlers[t], st = stanceOf(m.id, t)!;
      if (!h) continue;   // 没有手势模块的工具（底座内建）不比
      if (h.grammar !== st.grammar) bad.push(`${m.id}/${t} grammar ${h.grammar} ≠ ${st.grammar}`);
      if ((h.lock ?? null) !== st.lock) bad.push(`${m.id}/${t} lock ${h.lock ?? "无"} ≠ ${st.lock ?? "无"}`);
    }
    eq(bad.join("; "), "", "不一致");
  });
  it("表里没有多余的工作台 / 工具（每一行都对应一把真工具）", () => {
    const known = new Set(modes.flatMap((m) => m.tools.map((t) => `${m.id}/${t}`)));
    const extra = Object.entries(STANCE).flatMap(([mode, rows]) => Object.keys(rows).map((t) => `${mode}/${t}`)).filter((k) => !k.startsWith("object/") && !known.has(k));
    eq(extra.join(","), "", "多余的行");
  });
  it("三种设备的布尔默认都在（鼠标 / 笔 / 手指），每格是合法的选区合并方式", () => {
    for (const d of ["mouse", "pen", "finger"] as const) for (const g of ["click", "box", "lasso"] as const) assert(["replace", "add", "remove", "toggle"].includes(BOOLEAN_DEFAULT[d][g]), `${d}/${g}`);
    eq(BOOLEAN_DEFAULT.mouse.click, "replace"); eq(BOOLEAN_DEFAULT.pen.click, "toggle"); eq(BOOLEAN_DEFAULT.pen.box, "add");
  });
  it("按下三分法（账本 UX30）：自由建模里经 pressTarget 的工具（移动 / 旋转 / 缩放 / 沿法线 / 挤出 / 插入）都声明 press = split3", () => {
    for (const t of ["move", "rotate", "scale", "shrink", "pp", "offset"] as const) eq(stanceOf("freeform", t)?.press, "split3", t);
    for (const t of ["select", "knife", "erase"] as const) eq(stanceOf("freeform", t)?.press, undefined, `${t} 不经 pressTarget`);
  });
  it("src/controller/ 是无头骑士：不许运行时 import 内核 / 网格 / three / DOM", () => {
    const dir = new URL("../src/controller/", import.meta.url);
    const bad: string[] = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".ts")) continue;
      const src = fs.readFileSync(new URL(f, dir), "utf8");
      for (const line of src.split("\n")) {
        if (/^import\s+(?!type\b)[^;]*from\s+"[^"]*(\/kernel\/|\/mesh\/|^three|three\/)/.test(line)) bad.push(`${f}: ${line.trim()}`);
        if (/(?<![-\w])(document|window|navigator)\./.test(line) && !line.trim().startsWith("//")) bad.push(`${f}: DOM: ${line.trim().slice(0, 80)}`);   // 前面是「-」的不算（文件名 object-window.ts 那种）
      }
    }
    eq(bad.join("; "), "", "控制器文件夹漏了");
  });
});

describe("吸附的底 SNAP_BASE（周账 F-128；user 10-29「触屏版…一开始默认开着吸附，然后toggle反转」）", () => {
  it("鼠标 = 关（Blender：按住 Shift 才吸）；笔 / 手指 = 跟右上角锁钮（Shift 锁住 = 反过来）；三种设备都有、没有第三种值", () => {
    eq(Object.keys(SNAP_BASE).sort().join(), "finger,mouse,pen");
    eq(SNAP_BASE.mouse, "off"); eq(SNAP_BASE.pen, "lock"); eq(SNAP_BASE.finger, "lock");
    for (const v of Object.values(SNAP_BASE)) assert(v === "lock" || v === "off");
  });
  it("自由建模挪 / 转 / 缩的 Shift 说的是「反过来」（底另有表），硬表面的照旧是锁钮反转", () => {
    for (const t of ["move", "rotate", "scale"] as const) assert(/反过来/.test(stanceOf("freeform", t)!.shift), `${t} 的 Shift 文案`);
    assert(/反转/.test(stanceOf("geometry", "move")!.shift));
  });
});
