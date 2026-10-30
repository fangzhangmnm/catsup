// 通用树拖拽的落点判定（src/app/ui/tree-drag.ts dropAt；0.18 物品栏纪元 I3）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「拖拽的难点是作为一个有孩子物体的最后一个孩子和作为这个物体的下一个兄弟会有歧义」→ 横向位置定深度。
import { describe, it, eq } from "./runner.mjs";
import { dropAt, subtreeEnd, type TreeRow } from "../src/app/ui/tree-drag.ts";

// 0 根 / 1 A（展开）/ 2 A 的孩子 A1 / 3 B / 4 C
const rows: TreeRow[] = [{ depth: 0 }, { depth: 1 }, { depth: 2 }, { depth: 1 }, { depth: 1 }];
const j = (x: unknown): string => JSON.stringify(x);

describe("树拖拽落点（dropAt）", () => {
  it("一行中间 = 放进去；拖着的那块（连子孙）不能当落点", () => {
    eq(j(dropAt(rows, 4, { row: 3, fy: 0.5, depth: 1 })), j({ kind: "into", parent: 3 }));
    eq(dropAt(rows, 4, { row: 4, fy: 0.5, depth: 1 }), null, "放进自己");
    eq(dropAt(rows, 1, { row: 2, fy: 0.5, depth: 1 }), null, "放进自己的孩子");
    eq(subtreeEnd(rows, 1), 3);
  });
  it("「最后一个孩子 / 下一个兄弟」的歧义：A1 和 B 之间那条缝，横向往右 = 深一层", () => {
    const at = (depth: number) => dropAt(rows, 4, { row: 2, fy: 0.9, depth });
    eq(j(at(1)), j({ kind: "insert", parent: 0, before: 3, depth: 1, lineAfter: 2 }), "原深度 = 根的孩子、排在 B 前面（A 的下一个兄弟）");
    eq(j(at(2)), j({ kind: "insert", parent: 1, before: null, depth: 2, lineAfter: 2 }), "右一格 = A 的最后一个孩子");
    eq(j(at(3)), j({ kind: "insert", parent: 2, before: null, depth: 3, lineAfter: 2 }), "再右 = A1 的孩子（夹在允许的最深）");
    eq(j(at(9)), j(at(3)), "再往右也只到最深");
    eq(j(at(-5)), j(at(1)), "往左夹在允许的最浅（下面那行 B 的兄弟）");
  });
  it("A 和它的第一个孩子之间：只能当 A 的第一个孩子", () => {
    eq(j(dropAt(rows, 4, { row: 1, fy: 0.95, depth: 0 })), j({ kind: "insert", parent: 1, before: 2, depth: 2, lineAfter: 1 }));
  });
  it("根上面没地方；最后一行下面 = 按深度挂；挨着拖着的那块的缝跳过它", () => {
    eq(dropAt(rows, 4, { row: 0, fy: 0.1, depth: 1 }, { minDepth: 1 }), null);
    eq(j(dropAt(rows, 3, { row: 9, fy: 0, depth: 1 }, { minDepth: 1 })), j({ kind: "insert", parent: 0, before: null, depth: 1, lineAfter: 4 }));
    eq(j(dropAt(rows, 1, { row: 2, fy: 0.9, depth: 1 }, { minDepth: 1 })), j({ kind: "insert", parent: 0, before: 3, depth: 1, lineAfter: 0 }), "A 拖到自己孩子下面那条缝 = A 上面那条缝（原地）");
  });
});
