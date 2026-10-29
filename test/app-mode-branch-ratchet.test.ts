// app 层按工作台（modeId）分叉的棘轮：只准降。created 2026-10-29 by Claude Fable 5.1
// user 10-29「硬表面推拉时右键弹出了菜单……这暴露了什么系统性问题」（Tron 账本 T102）：规则写在 app 层按 `editor.modeId === "freeform"` 分叉，
// 硬表面那边就漏了。规则该住控制器 / 编辑器（立场表、ToolHandler，如 `editor.rightClickInGesture()`），app 层只问编辑器。
// 存量 8 处（context-bar 3 / sel-grow-bar 1 / main 4）一处处搬，搬一处把 PIN 调低一格；长回去 = 红。
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, e: string): string };

const PIN = 8;
function* walk(dir: URL): Generator<URL> {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { const u = new URL(d.name + (d.isDirectory() ? "/" : ""), dir); if (d.isDirectory()) yield* walk(u); else if (d.name.endsWith(".ts")) yield u; }
}

describe("app 层按工作台分叉的棘轮（T102）", () => {
  it(`src/app 里 modeId === / !== 的分叉 ≤ ${PIN}（只准降）`, () => {
    const hits: string[] = [];
    for (const u of walk(new URL("../src/app/", import.meta.url))) fs.readFileSync(u, "utf8").split("\n").forEach((l: string, i: number) => { if (/modeId\s*[!=]==/.test(l)) hits.push(`${u.pathname.split("/src/")[1]}:${i + 1}`); });
    assert(hits.length <= PIN, `app 层按工作台分叉长回去了（${hits.length} > ${PIN}）：\n${hits.join("\n")}`);
  });
});
