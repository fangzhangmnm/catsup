// 新文件一定默认开栅格吸附（user 2026-10-25「以及默认snap开」→ v0.13.64；同日再强调「新文件一定要默认开吸附」）。
// 钉三处：NEW_DOC_GRID.on、编辑器开机初值、Session 的两条新建路（beginLazyBlank / newDoc）都用它。读老文件缺 absoluteGrid 键照旧按关（老文件语义不变，DEFAULT_SETTINGS 不动）。
// 运行时那一半（开机 / 关掉后新建 / lazyblank / 新文件存了再开）= test/probes/probe-snap-default.mjs。created 2026-10-25 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { NEW_DOC_GRID, gridFromSettings } from "../src/editor/grid-settings.ts";
import { DEFAULT_SETTINGS } from "../src/format/document.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string };
const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

describe("新文件默认开吸附", () => {
  it("NEW_DOC_GRID.on = true", () => { eq(NEW_DOC_GRID.on, true); });
  it("编辑器开机初值 = NEW_DOC_GRID", () => { assert(/private _grid: GridSettings = \{ \.\.\.NEW_DOC_GRID \}/.test(read("src/editor/editor.ts")), "editor.ts 的 _grid 初值不是 NEW_DOC_GRID"); });
  it("Session 每条「新建」路（loadKernel(new Kernel(), \"新建\")）后面都紧跟 setGrid(NEW_DOC_GRID)", () => {
    const src = read("src/app/session.ts");
    const news = src.split('loadKernel(new Kernel(), "新建")').length - 1;
    const withGrid = src.split('loadKernel(new Kernel(), "新建");\n    this.d.editor.setGrid({ ...NEW_DOC_GRID });').length - 1;
    assert(news >= 2, `新建路少了？只找到 ${news} 条`);
    eq(withGrid, news, "有新建路没设 NEW_DOC_GRID");
  });
  it("老文件缺键照旧按关（不改老文件语义）", () => { eq(gridFromSettings({ ...DEFAULT_SETTINGS, absoluteGrid: undefined as unknown as boolean }).on, false); });
});
