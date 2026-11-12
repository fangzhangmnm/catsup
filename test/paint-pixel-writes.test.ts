// 画画这一层每个公开的口对「改不改图层像素」都表态了（src/paint/pixel-writes.ts），会改的要么自己问锁、要么写明只从哪条问过锁的路来（统筹 11-11，v0.19.48）。created 2026-11-11 by Claude Opus 5.5
// 加一个口不表态 = 红；表里有、源码里没了也红；标「问锁」的真去问了；锁的真值只接到输入闸那一处。行为在 test/paint-lock.test.ts 和探针 probe-lock-matrix。
import { describe, it, eq, assert } from "./runner.mjs";
import { PIXEL_WRITES, PIXEL_WRITE_FILES } from "../src/paint/pixel-writes.ts";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string };

/** 一个类的公开方法（含 constructor、getter）：类体里两格缩进、不带 private / protected / readonly 开头的 `名字(` / `get 名字(`。 */
function publicMethods(file: string, cls: string): { names: string[]; body: (name: string) => string } {
  const src = readFileSync(file, "utf8"), start = src.indexOf(`export class ${cls} `);
  assert(start >= 0, `${file} 里没有 class ${cls}`);
  const end = src.indexOf("\n}\n", start), body = src.slice(start, end);
  const lines = body.split("\n"), names: string[] = [], at: number[] = [];
  lines.forEach((l, i) => { const m = /^  (?:async |get |set |static )?([A-Za-z_]\w*)\s*\(/.exec(l); if (m && !/^  (private|protected|readonly) /.test(l)) { names.push(m[1]); at.push(i); } });
  const allAt = lines.map((l, i) => (/^  (?:private |protected |async |get |set |static )*[A-Za-z_]\w*\s*\(/.test(l) ? i : -1)).filter((i) => i >= 0);
  return { names, body: (name) => { const i = at[names.indexOf(name)]; const next = allAt.find((k) => k > i) ?? lines.length; return lines.slice(i, next).join("\n"); } };
}

describe("画画这一层改像素的口都表态了（v0.19.48）", () => {
  for (const cls of Object.keys(PIXEL_WRITES) as (keyof typeof PIXEL_WRITES)[]) {
    it(`${cls}：每个公开方法都在表里、表里的都还在`, () => {
      const { names } = publicMethods(PIXEL_WRITE_FILES[cls], cls), table = Object.keys(PIXEL_WRITES[cls]);
      const missing = names.filter((n) => !table.includes(n)), stale = table.filter((n) => !names.includes(n));
      eq(missing.join(","), "", `没表态的口（加到 src/paint/pixel-writes.ts）`);
      eq(stale.join(","), "", `表里有、源码里没了的`);
    });
  }
  it("标「问锁」的真去问了", () => {
    const board = publicMethods(PIXEL_WRITE_FILES.PaintBoard, "PaintBoard").body("openStroke");
    eq((board.match(/this\.locked\(\)/g) ?? []).length, 2, "画板开一笔问一次、落层（commitHost）再问一次");
    assert(/commitHost: \(ov\) => \{\s*\{ const why = this\.locked\(\);/.test(board), "落层那一问在 commitHost 的第一句");
    assert(/this\.o\.editLocked\(\)/.test(publicMethods(PIXEL_WRITE_FILES.PaintBoards, "PaintBoards").body("load")), "登记处整份换内容问锁");
    const wb = readFileSync(PIXEL_WRITE_FILES.PaintWorkbench, "utf8");
    assert(/if \(this\.d\.gate\(a\.tex\)\) return;/.test(wb), "画画控制器开一笔前过门");
    for (const [cls, rows] of Object.entries(PIXEL_WRITES)) for (const [m, r] of Object.entries(rows)) if (r.kind === "asks-lock") assert(r.how.length > 0, `${cls}.${m} 写明怎么问`);
  });
  it("锁一路递到底、真值只接输入闸：登记处建画板递 locked；main.ts 的锁 = 输入闸上那条锁；落笔的门第一句问锁；调试钩子也过这道门", () => {
    assert(/new PaintBoard\(\{[^}]*locked: this\.o\.editLocked/.test(readFileSync("src/paint/boards.ts", "utf8")), "登记处建画板递 locked");
    const main = readFileSync("src/app/main.ts", "utf8");
    assert(/function paintEditLocked\(\): string \| null \{ const h = inputGate\.held\(\); return h\?\.kind === "lock" \? h\.why : null; \}/.test(main), "锁 = 输入闸上那条锁的理由");
    assert(/browserPaintBoards\([^\n]*paintEditLocked/.test(main), "登记处拿到的是它");
    const gate = main.slice(main.indexOf("function paintStrokeGate("), main.indexOf("\n}\n", main.indexOf("function paintStrokeGate(")));
    assert(/\{ const why = paintEditLocked\(\); if \(why\) \{ hintEl\.textContent = why; return "locked"; \} \}/.test(gate.split("\n")[1] ?? ""), "落笔的门第一句问锁");
    const hook = main.slice(main.indexOf("    stroke: (o: {"), main.indexOf("    stroke: (o: {") + 2000);
    assert(/const gate = paintStrokeGate\(g\);/.test(hook), "调试钩子 paint.stroke 也过这道门");
  });
});
