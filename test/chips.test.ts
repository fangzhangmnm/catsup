// 键名芯片（MFD）的数据（controller/chips.ts；账本 UX19；created 2026-10-28 by Claude Opus 5.5）：槽位永远同一个顺序；字 = 键表 / 立场表那一格（和真按下去是同一条）。
import { describe, it, eq, assert } from "./runner.mjs";
import { CHIP_SLOTS, chipsOf } from "../src/controller/chips.ts";
import { stanceOf } from "../src/controller/stance.ts";
import type { KeyContext } from "../src/controller/keymap.ts";

const base: KeyContext = { mode: "geometry", tool: "select", gesture: false, hasSelection: false, walk: "off", walking: false, mirrorSession: false, lockStyle: null, vcbWants: () => false };
const at = (o: Partial<KeyContext>) => { const c = { ...base, ...o }; return chipsOf(c, stanceOf(c.mode, c.tool)); };

describe("键名芯片（chips.ts）", () => {
  it("槽位顺序固定：锁轴 · Shift · Ctrl · Alt · 确认 · 取消；结果按这个顺序", () => {
    eq(CHIP_SLOTS.join(","), "lock,shift,ctrl,alt,confirm,cancel");
    for (const o of [{}, { mode: "freeform" as const, tool: "move" as const, lockStyle: "axis" as const, gesture: true }]) { const s = at(o).map((c) => CHIP_SLOTS.indexOf(c.slot)); eq(JSON.stringify(s), JSON.stringify([...s].sort((a, b) => a - b))); }
  });
  it("自由建模移动：锁轴 = X / Y / Z（能点）、Shift = 吸附（立场表那一格、只显示）；手势中多一个 Esc 取消", () => {
    const c = at({ mode: "freeform", tool: "move", lockStyle: "axis" });
    const lock = c.find((x) => x.slot === "lock")!;
    eq(lock.items.map((i) => i.keys).join(" "), "X Y Z"); assert(lock.items.every((i) => i.press && /锁/.test(i.label)));
    eq(c.find((x) => x.slot === "shift")?.items[0].label, stanceOf("freeform", "move")!.shift); eq(c.find((x) => x.slot === "shift")?.items[0].press, null);
    assert(!c.some((x) => x.slot === "cancel"), "没在手势里 = 没有取消");
    assert(at({ mode: "freeform", tool: "move", lockStyle: "axis", gesture: true }).some((x) => x.slot === "cancel"));
  });
  it("硬表面选择：没有锁轴（不吃锁），Shift / Ctrl 有字；「—」的槽不出", () => {
    const c = at({});
    assert(!c.some((x) => x.slot === "lock")); assert(c.some((x) => x.slot === "shift") && c.some((x) => x.slot === "ctrl"));
    assert(c.every((x) => x.items.every((i) => i.label && i.label !== "—")));
  });
  it("镜像会话：确认 = Enter 应用镜像、取消 = Esc", () => {
    const c = at({ mirrorSession: true });
    eq(c.find((x) => x.slot === "confirm")?.items[0].keys, "Enter"); eq(c.find((x) => x.slot === "cancel")?.items[0].press, "escape");
  });
});
