// 引擎词汇守卫（窄接口刀 g，2026-10-29 Claude Fable 5.1；user「小仓鼠不应该认识编辑器。它只认识最少的东西，不应该有graphics.drawgizmosline这种东西，接口要窄！」）：
// src/minccino/ 的**代码**里（注释 / 字符串剥掉后）不出现编辑器 / app 的词当标识符——gizmo、protractor、tape、knife、lock、xray、charged、seam、handle、
// activePool、editor、workbench、tool、selection、hover、guide。材质槽的名字（faceSelected / faceHover / edgeHidden）是风格材质表的槽位，不在此列。
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, e: string): string };

const WORDS = /\b(gizmo|protractor|tape|knife|lock|xray|charged|seam|handle|activePool|editor|workbench|tool|selection|hover|guide)\w*/gi;
function* walk(dir: URL): Generator<URL> {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { const u = new URL(d.name + (d.isDirectory() ? "/" : ""), dir); if (d.isDirectory()) yield* walk(u); else if (d.name.endsWith(".ts")) yield u; }
}
const stripped = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/"[^"\n]*"|`[^`]*`|'[^'\n]*'/g, '""');

describe("引擎词汇守卫（刀 g）", () => {
  it("src/minccino/ 的代码里没有编辑器的词当标识符", () => {
    const hits: string[] = [];
    for (const u of walk(new URL("../src/minccino/", import.meta.url))) {
      const found = new Set<string>(); for (const m of stripped(fs.readFileSync(u, "utf8")).matchAll(WORDS)) found.add(m[0]);
      if (found.size) hits.push(`${u.pathname.split("/src/")[1]}: ${[...found].join(", ")}`);
    }
    assert(hits.length === 0, `引擎里出现了编辑器的词：\n${hits.join("\n")}`);
  });
});
