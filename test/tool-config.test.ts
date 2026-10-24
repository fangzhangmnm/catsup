// 工具配置深模块（0.9 QoL，2026-10-21，Claude Fable 5.1）：表 → 校验 / 修饰键覆盖 / 订阅 / device 路由；CatsUp 表本身的健全性。
import { describe, it, eq, assert } from "./runner.mjs";
import { ToolConfig, TOOL_OPTIONS, optionGroupOf, type OptionDef } from "../src/editor/tool-config.ts";
import { SURFACE_TIERS } from "../src/editor/surface-assign.ts";

const TABLE = {
  paint: {
    mode: { kind: "enum", label: "涂哪些", values: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], def: "a", scope: "session", modifiers: { ctrl: "b", shift: "c", ctrlShift: "a" } },
    deg: { kind: "number", label: "角", def: 20, min: 0, max: 90, step: 5, scope: "device" },
    on: { kind: "bool", label: "开", def: false, scope: "session" },
  },
} as const satisfies Record<string, Record<string, OptionDef>>;

describe("tool-config: 表驱动", () => {
  it("默认值；enum 非法值被拒；number 夹范围 + 按 step 量化；bool 强转", () => {
    const c = new ToolConfig(TABLE);
    eq(c.get("paint", "mode"), "a"); eq(c.get("paint", "deg"), 20); eq(c.get("paint", "on"), false);
    eq(c.set("paint", "mode", "zzz"), false); eq(c.get("paint", "mode"), "a");
    assert(c.set("paint", "mode", "b")); eq(c.get("paint", "mode"), "b");
    c.set("paint", "deg", 999); eq(c.get("paint", "deg"), 90, "夹到 max");
    c.set("paint", "deg", 22); eq(c.get("paint", "deg"), 20, "按 step 5 量化");
    c.set("paint", "deg", 89); eq(c.get("paint", "deg"), 90, "量化后仍夹在 max 内");
    eq(c.set("paint", "deg", "abc"), false);
    c.set("paint", "on", "1"); eq(c.get("paint", "on"), true);
  });
  it("修饰键 = 按住时的临时覆盖，不改存的值", () => {
    const c = new ToolConfig(TABLE);
    eq(c.effective("paint", "mode", { ctrl: true }), "b");
    eq(c.effective("paint", "mode", { shift: true }), "c");
    eq(c.effective("paint", "mode", { ctrl: true, shift: true }), "a");
    eq(c.effective("paint", "mode", {}), "a");
    eq(c.get("paint", "mode"), "a", "存的值没动");
    eq(c.effective("paint", "deg", { ctrl: true }), 20, "number 无修饰键 → 原值");
  });
  it("订阅：只在值真的变了时通知；reset 回默认", () => {
    const c = new ToolConfig(TABLE);
    const log: string[] = [];
    const off = c.subscribe((t, k) => log.push(`${t}.${k}`));
    c.set("paint", "mode", "a"); eq(log.length, 0, "同值不通知");
    c.set("paint", "mode", "c"); c.set("paint", "deg", 50);
    eq(log.join(","), "paint.mode,paint.deg");
    c.reset("paint"); eq(c.get("paint", "mode"), "a"); eq(c.get("paint", "deg"), 20);
    off(); c.set("paint", "mode", "b"); eq(log.length, 4, "退订后不通知（reset 的两次 + 之前两次）");
  });
  it("device scope 经 kv 接缝读写；session 不落盘", () => {
    const store = new Map<string, string>();
    const kv = { get: (k: string) => store.get(k) ?? null, set: (k: string, v: string | null) => { if (v === null) store.delete(k); else store.set(k, v); } };
    store.set("catsup.tool.paint.deg", "35");
    const c = new ToolConfig(TABLE, kv);
    eq(c.get("paint", "deg"), 35, "装载时同样过校验");
    c.set("paint", "deg", 62); eq(store.get("catsup.tool.paint.deg"), "60", "落盘的是校验后的值");
    c.set("paint", "mode", "b"); eq(store.has("catsup.tool.paint.mode"), false, "session 不落盘");
  });
  it("entries / labelOf 给 UI：按声明顺序，带当前值", () => {
    const c = new ToolConfig(TABLE);
    eq(c.entries("paint").map((e) => e.key).join(","), "mode,deg,on");
    eq(c.entries("nope").length, 0);
    eq(c.labelOf("paint", "mode", "b"), "B"); eq(c.labelOf("paint", "deg", "x"), "x");
  });
  it("CatsUp 的表健全：默认值合法、修饰键指向表内值、本版全部 session（没开新持久化）", () => {
    const c = new ToolConfig(TOOL_OPTIONS);
    for (const [tool, opts] of Object.entries(TOOL_OPTIONS)) for (const [key, def] of Object.entries(opts as Record<string, OptionDef>)) {
      eq(def.scope, tool === "surface" ? "device" : "session", `${tool}.${key}：surface 组 = device（user 2026-10-24「锐角阈值和模式的持久化不同工具共享」）；其余本版只许 session（开 device / doc 要 user 同意）`);
      if (def.kind === "enum") { assert(def.values.some((v) => v.id === def.def), `${tool}.${key} 默认值在表里`); for (const m of Object.values(def.modifiers ?? {})) assert(def.values.some((v) => v.id === m), `${tool}.${key} 修饰键目标在表里`); }
    }
    eq(c.get("circle", "segments"), 24); eq(c.get("surface", "tier"), "smooth"); eq(c.get("surface", "sharpDeg"), 20);
    eq(SURFACE_TIERS.length, 3); eq(optionGroupOf("paint"), "surface"); eq(optionGroupOf("circle"), "circle");
  });
});
