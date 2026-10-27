// 指令注册表的守卫 + 修复一族可整个扔（user 2026-10-26「以及这些修复的东西即使可能代码量不大，但是也做成可以扔的模块化的，最好是各种命令都这样」；
// 10-27 注册表 v2.2：指令 = 带类型的内核动词、动作 = UX 动词、放置 = 动作放在哪）。created 2026-10-26 by Claude Opus 5.5 · 2026-10-27 Claude Fable 5.1 改成注册表守卫。
// 守卫：① 核心（指令层 ops.ts / 编辑器 / app）不 import 任何一族的内部，只认注册表（commands/）和各族的清单（<族>/index.ts）；② 模块之间不互相 import、模块只被自己族的清单 import；
// ③ 注册表自洽（id 不重复、族名 = 单位种类、动作指向存在的指令、放置指向存在的动作）；④ 修复面板步骤表里每一步都是登记过的指令。
import { describe, it, eq, assert } from "./runner.mjs";
import { checkRegistry, allCommands, placementsAt, actionById } from "../src/editor/commands/registry.ts";
import { REPAIR_STEPS } from "../src/editor/repairs/index.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };
// 路径一律用 URL（不依赖 node 类型）：文件 = href，import 目标 = new URL(说明符, 本文件)
const SRC = new URL("../src/", import.meta.url), REP = new URL("../src/editor/repairs/", import.meta.url).href, CMD = new URL("../src/editor/commands/", import.meta.url).href;
const srcFiles = fs.readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith(".ts")).map((f) => new URL(f, SRC).href);
const importsOf = (f: string): string[] => [...fs.readFileSync(new URL(f), "utf8").matchAll(/^(?:import|export)[^;]*?from\s+"([^"]+)"/gm)].map((m) => new URL(m[1], f).href);
const rel = (h: string): string => h.slice(SRC.href.length - "src/".length);
const INDEX = REP + "index.ts";

describe("指令注册表守卫 / 修复一族可整个扔", () => {
  it("repairs/ 外面只 import 清单（index.ts）；commands/ 外面不 import 任何一族的内部", () => {
    const bad: string[] = [];
    for (const f of srcFiles) {
      if (f.startsWith(REP)) continue;
      for (const t of importsOf(f)) if (t.startsWith(REP) && t !== INDEX) bad.push(`${rel(f)} → ${rel(t)}`);
    }
    eq(bad.join("\n"), "", "核心直接认识了具体的修复模块");
  });
  it("每个模块只被清单 import（模块之间不互相依赖）", () => {
    // 模块 = repairs/ 下的一个文件（index.ts 除外）或一个子文件夹
    const moduleOf = (f: string): string | null => {
      if (!f.startsWith(REP)) return null;
      const parts = f.slice(REP.length).split("/");
      return parts.length > 1 ? parts[0] : parts[0] === "index.ts" ? null : parts[0];
    };
    const bad: string[] = [];
    for (const f of srcFiles) for (const t of importsOf(f)) { const m = moduleOf(t); if (m && moduleOf(f) !== m && f !== INDEX) bad.push(`${rel(f)} → ${rel(t)}`); }
    eq(bad.join("\n"), "");
  });
  it("模块只认注册表的类型文件，不认编辑器本体", () => {
    const bad: string[] = [];
    for (const f of srcFiles) { if (!f.startsWith(REP)) continue; for (const t of importsOf(f)) { if (t.startsWith(CMD) && !/\/(command|action)\.ts$/.test(t)) bad.push(`${rel(f)} → ${rel(t)}`); if (/\/editor\/editor\.ts$/.test(t)) bad.push(`${rel(f)} → ${rel(t)}`); } }
    eq(bad.join("\n"), "");
  });
  it("注册表自洽：id 不重复、族名 = 单位种类、动作 → 指令、放置 → 动作", () => {
    eq(checkRegistry().join("\n"), "");
    assert(allCommands().length >= 9, "修复一族九条指令都在");
    assert(allCommands().every((c) => c.id.startsWith("brep.") || c.id.startsWith("object.")), "今天有 brep 族和 object 族");
  });
  it("修复面板步骤表 / 浮条放置：每一步都是登记过的指令、每条放置都有动作", () => {
    const ids = new Set(allCommands().map((c) => c.id));
    eq(REPAIR_STEPS.filter((s) => !ids.has(s.command)).map((s) => s.command).join(","), "");
    eq(new Set(REPAIR_STEPS.map((s) => s.command)).size, REPAIR_STEPS.length, "步骤不重复");
    const bar = placementsAt("contextBar");
    assert(bar.length >= 9 && bar.every((p) => !!actionById(p.action)), "浮条上九条修复入口都指向动作");
    eq(bar.map((p) => p.order).join(","), [...bar.map((p) => p.order)].sort((a, b) => a - b).join(","), "按 order 排好");
  });
});
