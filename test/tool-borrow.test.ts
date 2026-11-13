// 快捷键拿起的工具是借的（controller/tool-borrow.ts；统筹 11-13 第 C 件）：表 = 现在的底、现在借的、发生了什么 → 新的底、新的借。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { ToolHold, held, keyBorrows, nextHold, runEnded, type Hold, type HoldEvent } from "../src/controller/tool-borrow.ts";
import type { Tool } from "../src/editor/tool-ids.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };

const H = (base: Tool, temp: Tool | null = null): Hold => ({ base, temp });
const s = (h: Hold): string => `${h.base}${h.temp ? "+" + h.temp : ""}`;

describe("借工具：状态怎么变（nextHold）", () => {
  const rows: [Hold, HoldEvent, string, string][] = [
    [H("select"), { e: "borrow", tool: "move" }, "select+move", "拿着「选」按 G / M = 借移动，底还是「选」"],
    [H("select", "move"), { e: "borrow", tool: "rotate" }, "select+rotate", "借着移动按 R = 换成借旋转，底不变（回的还是最开始那把）"],
    [H("select", "move"), { e: "borrow", tool: "move" }, "select+move", "借着移动再按 G = 在这把里起手，不变"],
    [H("move"), { e: "borrow", tool: "move" }, "move", "已经拿着移动按 G = 在这把里起手，没有借这回事"],
    [H("move", "rotate"), { e: "borrow", tool: "move" }, "move", "借着旋转按底下那把的键 = 回到底下那把（在它里面起手）"],
    [H("knife"), { e: "borrow", tool: "move" }, "knife+move", "拿着刀按 G = 借移动，做完回刀"],
    [H("select", "move"), { e: "back" }, "select", "做完 / Esc = 回底下那把"],
    [H("select"), { e: "back" }, "select", "没借的时候「回」= 什么都不变"],
    [H("select", "move"), { e: "take", tool: "knife" }, "knife", "借着时点左柱拿刀 = 真的换，借的作废"],
    [H("move", "rotate"), { e: "take", tool: "select" }, "select", "Space / Tab 回「选」= 真的换"],
  ];
  for (const [h, ev, want, why] of rows) it(why, () => eq(s(nextHold(h, ev)), want));
  it("现在手上的 = 借 ?? 底", () => { eq(held(H("select", "move")), "move"); eq(held(H("knife")), "knife"); });
});

describe("借来的做完一次了吗（runEnded）", () => {
  const base = { busy: false, modal: false, cancelled: false, atStart: false, hadOp: false };
  const rows: [Partial<typeof base>, boolean, string][] = [
    [{ modal: true }, true, "键盘起手（G）之后手势收了：落定、取消、提交被拒都算完"],
    [{ modal: true, busy: true }, false, "键盘起手还在跟着鼠标走：没完"],
    [{ cancelled: true }, true, "手势中被 Esc / 右键取消：完"],
    [{ atStart: true, hadOp: true }, true, "这一步开始时在拖、这一步提交了：完（拖完落定 / 收刀 / 环切切完）"],
    [{ atStart: true }, false, "开始时在拖、没提交、也没人取消（点了一下选东西 / 框选）：没完"],
    [{ hadOp: true }, false, "手势外提交的（Delete、右键菜单的指令）：不算这把工具做完"],
    [{ atStart: true, hadOp: true, busy: true }, false, "提交了但手势还在（刀还在等下一点）：没完"],
  ];
  for (const [r, want, why] of rows) it(why, () => eq(runEnded({ ...base, ...r }), want));
});

describe("ToolHold：编辑器里那一个字段", () => {
  it("借移动 → 点一下选东西（步开始时手势在、没提交）→ 还借着；再拖完落定 → 回「选」", () => {
    const h = new ToolHold("select"); h.apply({ e: "borrow", tool: "move" });
    h.begin(true); eq(h.settle(false, false), null, "点选不算");
    h.begin(false); eq(h.settle(true, false), null, "按下开始拖");
    h.begin(true); eq(h.settle(false, true), "select", "拖完落定");
  });
  it("键盘起手（G）→ 跟着走几步 → 点落定（提交被拒也一样）→ 回「选」", () => {
    const h = new ToolHold("select"); h.apply({ e: "borrow", tool: "move" }); h.noteModal();
    h.begin(true); eq(h.settle(true, false), null);
    h.begin(true); eq(h.settle(false, false), "select");
  });
  it("手势中 Esc（步外的取消）→ 回去；没借的时候取消什么都不回", () => {
    const h = new ToolHold("select"); h.apply({ e: "borrow", tool: "move" });
    h.noteEnd(true); eq(h.settle(false, false), "select");
    const g = new ToolHold("move"); g.noteEnd(true); eq(g.settle(false, false), null);
  });
  it("G 起手途中按 R（借旋转、G 那一下被换工具取消）：G 的记号不带给 R——借着旋转点一下选东西不回去", () => {
    const h = new ToolHold("select"); h.apply({ e: "borrow", tool: "move" }); h.noteModal();
    h.apply({ e: "borrow", tool: "rotate" }); h.begin(false); eq(h.settle(false, false), null);
    h.noteModal(); h.begin(true); eq(h.settle(false, false), "select", "再按 R 起手、落定 = 回最开始那把");
  });
  it("拿着移动（没借）按 G 起手：记号用完就清，下次借的时候不带着旧记号", () => {
    const h = new ToolHold("move"); h.noteModal(); h.begin(true); eq(h.settle(false, false), null);
    h.apply({ e: "borrow", tool: "rotate" }); h.begin(true); eq(h.settle(false, false), null, "借旋转之后点一下选东西：不该因为上次 G 的记号就回去");
  });
});

describe("借工具：只有自由建模、只有回「选」的键不借", () => {
  it("自由建模里除了「选」都借；硬表面 / 别的工作台都不借", () => {
    eq(keyBorrows("freeform", "move"), true); eq(keyBorrows("freeform", "knife"), true); eq(keyBorrows("freeform", "create"), true);
    eq(keyBorrows("freeform", "select"), false); eq(keyBorrows("geometry", "move"), false); eq(keyBorrows("surface", "paint"), false);
  });
  it("守卫：各把工具不认识借工具（src/editor/tools/ 里不 import tool-borrow、不问 toolHeld）", () => {
    const dir = new URL("../src/editor/tools/", import.meta.url);
    const bad = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".ts") && /tool-borrow|toolHeld|dropBorrow/.test(fs.readFileSync(new URL(f, dir), "utf8")));
    assert(bad.length === 0, `工具里出现了「我是不是借来的」：${bad.join(", ")}`);
  });
});
