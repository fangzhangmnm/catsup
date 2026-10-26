// 参数小窗的马后炮会话（user 2026-10-25「把右下角的数值小窗扩成一个「参数小窗」 同意」）。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { afterthought } from "../src/editor/param-panel.ts";

describe("参数小窗：马后炮", () => {
  it("改值 = 撤销这一步占的操作数 → 按新值重做；别的操作 / 撤销之后作废", () => {
    let ops = 3; const log: string[] = [];
    const s = afterthought({ title: "t", fields: [], values: { algo: "bbox" }, nOps: 1, opCount: () => ops,
      undoN: (n) => { ops -= n; log.push(`undo${n}`); }, redo: (v) => { ops += 2; log.push(`redo:${v.algo}`); } });
    assert(!s.stale!(), "刚做完：算数");
    s.set("algo", "mean");
    eq(log.join(","), "undo1,redo:mean"); eq(s.values.algo, "mean");
    s.set("algo", "bbox");
    eq(log.join(","), "undo1,redo:mean,undo2,redo:bbox", "第二次撤的是重做那次占的 2 个");
    s.set("algo", "bbox");
    eq(log.length, 4, "值没变不动");
    ops++;   // 别的操作
    assert(s.stale!(), "之后又提交过 = 作废");
    s.set("algo", "mean");
    eq(log.length, 4, "作废后改值不动");
  });
  it("重做途中宿主来问「作废了吗」= 没作废（每提交一条宿主都重画小窗；2026-10-25 修：第二次改值前小窗已被自己关掉）", () => {
    let ops = 1; const seen: boolean[] = [];
    const s = afterthought({ title: "t", fields: [], values: { origin: "corner" }, nOps: 1, opCount: () => ops,
      undoN: (n) => { ops -= n; seen.push(s.stale!()); }, redo: () => { ops++; seen.push(s.stale!()); ops++; seen.push(s.stale!()); } });
    s.set("origin", "center");
    eq(seen.join(","), "false,false,false");
    assert(!s.stale!(), "改完仍算数");
    s.set("origin", "bottom");
    eq(seen.length, 6, "第二次改值照样生效");
  });
});

