// 分层键表（controller/keymap.ts）守卫：几个关键上下文里「按 X 是什么意思」（2026-10-28 Claude Fable 5.1；账本 UX17 / UX18）。
import { describe, it, eq } from "./runner.mjs";
import { resolveKey, chordOf, chordLabel, layersOf, modifierChords, type KeyContext, type KeyEvt } from "../src/controller/keymap.ts";

const base: KeyContext = { mode: "geometry", tool: "select", gesture: false, hasSelection: false, walk: "off", walking: false, mirrorSession: false, lockStyle: null, vcbWants: () => false };
const ctx = (o: Partial<KeyContext>): KeyContext => ({ ...base, ...o });
const K = (code: string, key = code.replace(/^Key/, "").toLowerCase(), m: Partial<KeyEvt> = {}): KeyEvt => ({ key, code, shift: false, ctrl: false, alt: false, ...m });
const act = (c: KeyContext, e: KeyEvt): string => { const r = resolveKey(c, e); return r === null ? "∅" : r === "swallow" ? "swallow" : r.action; };

describe("键表：什么时候按 X 是什么意思", () => {
  it("和弦：字母按物理键、修饰键固定顺序", () => {
    eq(chordOf(K("KeyX")), "x"); eq(chordOf(K("KeyB", "b", { ctrl: true, shift: true })), "ctrl+shift+b"); eq(chordOf(K("Space", " ")), "space"); eq(chordOf(K("ArrowRight", "ArrowRight", { shift: true })), "shift+arrowright");
  });
  it("自由建模：选择工具 X = 删除（有选区）；操作工具 X / Y / Z = 轴（手势外先锁、手势中锁）——user「move模式相当于blender帮你自动按G」", () => {
    eq(act(ctx({ mode: "freeform", tool: "select", hasSelection: true }), K("KeyX")), "delete.ifAny");
    eq(act(ctx({ mode: "freeform", tool: "select", hasSelection: false }), K("KeyX")), "delete.ifAny");   // 没选区 = 什么都不删（不再先锁 X）
    for (const tool of ["move", "rotate", "scale", "pp", "offset", "shrink"] as const) {
      eq(act(ctx({ mode: "freeform", tool, hasSelection: true }), K("KeyX")), "lock.axis:x", tool);
      eq(act(ctx({ mode: "freeform", tool, gesture: true }), K("KeyX")), "lock.key:x", `${tool} 手势中`);
      eq(act(ctx({ mode: "freeform", tool, gesture: true }), K("KeyZ", "z", { shift: true })), "lock.key:z:plane", `${tool} 手势中 Shift`);
    }
    eq(act(ctx({ mode: "freeform", tool: "select" }), K("KeyY")), "lock.arm:y", "选择工具先锁 Y 下一下生效");
  });
  it("硬表面：X = 橡皮（工具键）；G = 建组件；L = 画线；Shift+L 不再误切工具", () => {
    eq(act(ctx({}), K("KeyX")), "tool.key:x:erase"); eq(act(ctx({}), K("KeyG")), "component.make"); eq(act(ctx({}), K("KeyL")), "tool.key:l:line");
    eq(act(ctx({}), K("KeyL", "L", { shift: true })), "∅");
  });
  it("自由建模：G / R / S / E = 键盘起手；A = 全选；Ctrl+R 环切；Ctrl+B / Ctrl+Shift+B 倒角", () => {
    const c = ctx({ mode: "freeform", tool: "select" });
    eq(act(c, K("KeyG")), "modal:move"); eq(act(c, K("KeyR")), "modal:rotate"); eq(act(c, K("KeyE")), "modal:pp"); eq(act(c, K("KeyA")), "select.all");
    eq(act(c, K("KeyR", "r", { ctrl: true })), "mesh.loopCutArm"); eq(act(c, K("KeyB", "b", { ctrl: true, shift: true })), "modal:offset:bevelVerts");
  });
  it("步行：FPS 里 Tab = 原地编辑、Esc = 离开、别的键吞掉；放置里 Esc = 取消；原地编辑里 Esc 没选区 = 离开", () => {
    eq(act(ctx({ walk: "walk", walking: true }), K("Tab", "Tab")), "walk.editInPlace");
    eq(act(ctx({ walk: "walk", walking: true }), K("KeyL")), "swallow");
    eq(act(ctx({ walk: "place" }), K("Escape", "Escape")), "walk.cancelPlace");
    eq(act(ctx({ walk: "edit", walking: true }), K("Escape", "Escape")), "walk.exit");
    eq(act(ctx({ walk: "edit", walking: true, hasSelection: true }), K("Escape", "Escape")), "escape");
    eq(act(ctx({ walk: "edit", walking: true }), K("Space", " ")), "∅", "走路时空格归跳");
  });
  it("镜像会话回车 = 应用；数值小窗要的键先给它；方向键锁 / Shift+Tab 格点", () => {
    eq(act(ctx({ mirrorSession: true }), K("Enter", "Enter")), "mirror.apply");
    eq(act(ctx({ vcbWants: (e) => e.key === "5" }), K("Digit5", "5")), "vcb.feed");
    eq(act(ctx({}), K("ArrowRight", "ArrowRight")), "lock.key:x"); eq(act(ctx({}), K("Tab", "Tab", { shift: true })), "grid.toggle");
    eq(act(ctx({ mode: "freeform", tool: "select" }), K("ArrowRight", "ArrowRight")), "lock.arm:x", "自由建模拿着选择工具 = 先锁");
    eq(act(ctx({ mode: "freeform", tool: "move", lockStyle: "axis" }), K("ArrowRight", "ArrowRight")), "lock.key:x", "吃锁的工具 = 直接锁");
  });
  it("栈的形状：自由建模 + 操作工具 + 手势中 = 全局 / 工作台 / 工具 / 手势 / 数值小窗", () => {
    eq(layersOf(ctx({ mode: "freeform", tool: "move", gesture: true })).map((l) => l.id).join(" > "), "global > workbench:freeform > tool:ops > gesture > vcb");
  });
  it("披露：按住修饰键时这一层有什么（modifierChords）——自由建模 Ctrl 有环切 / 倒角；硬表面 Shift+Z = 缩放到全部、操作工具里 = 面锁；披露的每一条 = 真按下去生效的那条", () => {
    const ff = ctx({ mode: "freeform", tool: "move" }), ctrl = modifierChords(ff, "ctrl").map((x) => x.chord), shift = modifierChords(ff, "shift");
    eq(ctrl.includes("ctrl+r") && ctrl.includes("ctrl+b"), true, ctrl.join(","));
    eq(shift.find((x) => x.chord === "shift+z")?.label, "面锁 XY", "操作工具里 Shift+Z = 面锁（操作工具层压过自由建模层）");
    // 不变量：披露的每一条 = 真按下去生效的那条（resolveKey 同一条）
    const evt = (ch: string): KeyEvt => { const p = ch.split("+"), n = p[p.length - 1]; return { key: n === "space" ? " " : n, code: /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : /^[0-9]$/.test(n) ? `Digit${n}` : n, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") }; };
    for (const c of [ff, ctx({}), ctx({ mode: "freeform", tool: "select", hasSelection: true }), ctx({ mode: "freeform", tool: "move", gesture: true })]) for (const m of ["shift", "ctrl", "alt"] as const) for (const x of modifierChords(c, m)) { const r = resolveKey(c, evt(x.chord)); eq(r !== null && r !== "swallow" ? r.label : String(r), x.label, `${c.mode}/${c.tool} ${x.chord}`); }
    eq(modifierChords(ctx({}), "shift").find((x) => x.chord === "shift+z")?.label, "缩放到全部", "硬表面选择工具");
    eq(new Set(shift.map((x) => x.chord)).size, shift.length, "同一和弦只露一次");
    eq(chordLabel("ctrl+shift+b"), "Ctrl+Shift+B"); eq(chordLabel("shift+arrowright"), "Shift+→"); eq(chordLabel("space"), "Space");
  });
});
