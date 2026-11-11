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


describe("参数小窗：马后炮的「确定」、做不成退回、悬停（W-8，2026-11-10 Opus）", () => {
  it("给了 done = 一颗主按钮「确定」，点它调 done；不给 = 没有按钮（老样子）", () => {
    let done = 0;
    const a = afterthought({ title: "t", fields: [], values: {}, nOps: 1, opCount: () => 0, undoN: () => {}, redo: () => {}, done: () => { done++; } });
    eq(a.buttons.map((b) => `${b.key}:${b.label}:${b.primary}`).join(), "ok:确定:true");
    a.press("ok"); eq(done, 1);
    const b = afterthought({ title: "t", fields: [], values: {}, nOps: 1, opCount: () => 0, undoN: () => {}, redo: () => {} });
    eq(b.buttons.length, 0);
  });
  it("redo 返回 false（这组值做不成）：改的那个数退回原值，按原值重做一遍，下次还能接着改", () => {
    let ops = 5; const log: string[] = [];
    const s = afterthought({ title: "t", fields: [], values: { x: 0.5 }, nOps: 2, opCount: () => ops,
      undoN: (n) => { ops -= n; log.push(`undo${n}`); },
      redo: (v) => { if (Number(v.x) >= 1) { log.push(`refuse:${v.x}`); return false; } ops += 2; log.push(`redo:${v.x}`); return undefined; } });
    s.set("x", 1);
    eq(log.join(","), "undo2,refuse:1,redo:0.5"); eq(s.values.x, 0.5); assert(!s.stale!(), "原来的做法回来了，小窗还算数");
    s.set("x", 0.3);
    eq(log.slice(3).join(","), "undo2,redo:0.3"); eq(s.values.x, 0.3);
  });
  it("focus 转给指令（悬在 / 离开某一行）", () => {
    const seen: (string | null)[] = [];
    const s = afterthought({ title: "t", fields: [], values: {}, nOps: 1, opCount: () => 0, undoN: () => {}, redo: () => {}, focus: (k) => seen.push(k) });
    s.focus!("p1"); s.focus!(null);
    eq(seen.join(","), "p1,");
  });
});
