// 修复指令可整个扔（user 2026-10-26「以及这些修复的东西即使可能代码量不大，但是也做成可以扔的模块化的，最好是各种命令都这样」）。
// 守卫：核心（指令层 ops.ts / 编辑器 / app）不 import 任何具体的修复模块，只认清单（repairs/index.ts）和接口（repairs/repair.ts）；
// 每个模块只被清单 import；id 不重复、都有标题。扔一个 = 删它的文件 + 清单一行。created 2026-10-26 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { REPAIRS } from "../src/editor/repairs/index.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };
// 路径一律用 URL（不依赖 node 类型）：文件 = href，import 目标 = new URL(说明符, 本文件)
const SRC = new URL("../src/", import.meta.url), REP = new URL("../src/editor/repairs/", import.meta.url).href;
const srcFiles = fs.readdirSync(SRC, { recursive: true }).filter((f) => f.endsWith(".ts")).map((f) => new URL(f, SRC).href);
const importsOf = (f: string): string[] => [...fs.readFileSync(new URL(f), "utf8").matchAll(/^(?:import|export)[^;]*?from\s+"([^"]+)"/gm)].map((m) => new URL(m[1], f).href);
const rel = (h: string): string => h.slice(SRC.href.length - "src/".length);
const INDEX = REP + "index.ts", IFACE = REP + "repair.ts";

describe("修复指令可整个扔", () => {
  it("repairs/ 外面只 import 清单和接口", () => {
    const bad: string[] = [];
    for (const f of srcFiles) {
      if (f.startsWith(REP)) continue;
      for (const t of importsOf(f)) if (t.startsWith(REP) && t !== INDEX && t !== IFACE) bad.push(`${rel(f)} → ${rel(t)}`);
    }
    eq(bad.join("\n"), "", "核心直接认识了具体的修复模块");
  });
  it("每个模块只被清单 import（模块之间不互相依赖）", () => {
    // 模块 = repairs/ 下的一个文件（index.ts / repair.ts 除外）或一个子文件夹
    const moduleOf = (f: string): string | null => {
      if (!f.startsWith(REP)) return null;
      const parts = f.slice(REP.length).split("/");
      return parts.length > 1 ? parts[0] : parts[0] === "index.ts" || parts[0] === "repair.ts" ? null : parts[0];
    };
    const bad: string[] = [];
    for (const f of srcFiles) for (const t of importsOf(f)) { const m = moduleOf(t); if (m && moduleOf(f) !== m && f !== INDEX) bad.push(`${rel(f)} → ${rel(t)}`); }
    eq(bad.join("\n"), "");
  });
  it("清单：id 不重复、都有标题和面板标签", () => {
    const ids = REPAIRS.map((m) => m.id);
    eq(new Set(ids).size, ids.length, `id 重复：${ids.join(",")}`);
    assert(REPAIRS.every((m) => m.title && typeof m.panel.label === "function" && m.none), "每个模块都有标题 / 面板标签 / 没事做时的说法");
  });
});
