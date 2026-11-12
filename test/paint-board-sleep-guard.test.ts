// 睡和醒的结构守卫（施工单十九第 3 刀；行为在 paint-board-sleep.test.ts）。created 2026-11-12 by Claude Opus 5.5
// board.ts 里只经 gpu() 碰内核的画板（睡着就先叫醒，谁调都一样）；名单（src/paint/pixel-writes.ts）里标 gpu 的口真经 gpu()、每个改像素的口都写了睡着时怎么办；一份文件一个池、只在登记处。
import { describe, it, eq, assert } from "./runner.mjs";
import { PIXEL_WRITES } from "../src/paint/pixel-writes.ts";
const fsx = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const { readFileSync } = fsx;

describe("睡和醒的结构守卫（施工单十九第 3 刀）", () => {
  const board = readFileSync("src/paint/board.ts", "utf8");
  it("board.ts 里只经 gpu() 碰内核的画板：别处只许读睡没睡、读最近一次落层的报告、睡、退租、建", () => {
    const ok = /^this\.gl(\.asleep\b|\.lastBake\b|\.sleep\(\)|\.wake\(\)|\.dispose\(\)|, \[\]\)| = new GLBoard\(|$)/;
    const hits = [...board.matchAll(/this\.gl\b[^;\n]{0,24}/g)].map((m) => m[0]);
    eq(hits.filter((s) => !ok.test(s)).join(" | "), "", "直接碰内核画板的地方（要用显卡的走 this.gpu()）");
    eq(hits.filter((s) => s === "this.gl").length, 1, "把画板整个交出去的只有一处（gpu() 的 return）");
    const gpuFn = board.slice(board.indexOf("  private gpu(): GLBoard {"), board.indexOf("\n  }\n", board.indexOf("  private gpu(): GLBoard {")));
    eq((board.match(/this\.gl\.wake\(\)/g) ?? []).length, 1, "叫醒只有一处");
    assert(gpuFn.includes("this.gl.wake()") && gpuFn.includes("return this.gl;"), "叫醒、交出都在 gpu() 里");
    assert(/new GLBoard\(o\.port, poolCapacityForBudget\(BUDGET_BYTES\), o\.pool \? \{ pool: o\.pool \} : undefined\)/.test(board), "画板建在合用池上（PaintBoards 递进来）");
  });
  it("名单里标「gpu」的口，方法体里真经 gpu() / borrowGpu；每个改像素的口都写了睡着时怎么办", () => {
    for (const [m, rule] of Object.entries(PIXEL_WRITES.PaintBoard)) {
      if (rule.kind === "no-pixels" || rule.sleep.asleep !== "gpu") continue;
      const i = board.indexOf(`  ${m}(`), j = board.indexOf("\n  }\n", i), body = board.slice(i, j);
      assert(i >= 0 && /this\.gpu\(\)|this\.borrowGpu\(/.test(body), `PaintBoard.${m} 标了 gpu，方法体里要有 this.gpu() / this.borrowGpu(`);
    }
    for (const [cls, rows] of Object.entries(PIXEL_WRITES)) for (const [m, rule] of Object.entries(rows)) if (rule.kind !== "no-pixels") assert(rule.sleep && rule.sleep.how.length > 0, `${cls}.${m} 写明睡着时怎么办`);
  });
  it("一份文件一个池：只在登记处建一处、换文件时画板全扔了之后才退", () => {
    const boards = readFileSync("src/paint/boards.ts", "utf8");
    eq((boards.match(/createSharedTilePool\(/g) ?? []).length, 1, "只建一处");
    const da = boards.slice(boards.indexOf("  disposeAll(): void {"), boards.indexOf("\n  }\n", boards.indexOf("  disposeAll(): void {")));
    assert(da.indexOf("this.kill(") >= 0 && da.indexOf("this.pool.dispose()") > da.indexOf("this.kill("), "先扔画板、再退池");
    const walk = (d: string): string[] => fsx.readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return p.startsWith("src/paint/kernel") ? [] : fsx.statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });
    const users = walk("src").filter((f) => /createSharedTilePool/.test(readFileSync(f, "utf8")));
    eq(users.join(), "src/paint/boards.ts", "src 里只有登记处碰合用池");
  });
});
