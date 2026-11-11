// 键名芯片（MFD）的数据（controller/chips.ts；账本 UX19；created 2026-10-28 by Claude Opus 5.5）：槽位永远同一个顺序；字 = 键表 / 立场表那一格（和真按下去是同一条）。
// 2026-10-28 晚（user「这些能不能实时响应按键，以及有context的时候才显示，他们没有context的时候不显示。然后ipad的时候能不能不显示键位」）：闲着不出、亮 = 锁着 / 按着、没键盘不出修饰键。
import { describe, it, eq, assert } from "./runner.mjs";
import { CHIP_SLOTS, IDLE_LIVE, chipLabel, chipsOf, stanceShown, type ChipLive } from "../src/controller/chips.ts";
import { stanceOf } from "../src/controller/stance.ts";
import type { KeyContext } from "../src/controller/keymap.ts";

const base: KeyContext = { mode: "geometry", tool: "select", gesture: false, anySelection: false, actableSelection: false, walk: "off", walking: false, mirrorSession: false, lockStyle: null, typingWants: () => false };
const at = (o: Partial<KeyContext>, L: Partial<Omit<ChipLive, "held" | "latched">> & { held?: Partial<ChipLive["held"]>; latched?: Partial<ChipLive["latched"]> } = {}) => { const c = { ...base, ...o }; return chipsOf(c, stanceOf(c.mode, c.tool), { ...IDLE_LIVE, ...L, held: { ...IDLE_LIVE.held, ...(L.held ?? {}) }, latched: { ...IDLE_LIVE.latched, ...(L.latched ?? {}) } }); };
const FF_MOVE = { mode: "freeform" as const, tool: "move" as const, lockStyle: "axis" as const };

describe("键名芯片（chips.ts）", () => {
  it("槽位顺序固定：Shift · Ctrl · Alt · 确认 · 收 · 取消；结果按这个顺序（锁那一槽 2026-11-10 搬去右上角，白模 W-6；「收」W-7）", () => {
    eq(CHIP_SLOTS.join(","), "shift,ctrl,alt,confirm,finish,cancel");
    for (const o of [{ gesture: true }, { ...FF_MOVE, gesture: true }, { mode: "geometry" as const, tool: "move" as const, lockStyle: "axis" as const, gesture: true }]) { const s = at(o).map((c) => CHIP_SLOTS.indexOf(c.slot)); eq(JSON.stringify(s), JSON.stringify([...s].sort((a, b) => a - b))); }
  });
  it("闲着（没手势、没锁、什么都没按）= 一枚都不出（user「没有context的时候不显示」）；画线这类不对选区做事的工具有选区也不出", () => {
    eq(at({}).length, 0); eq(at(FF_MOVE).length, 0); eq(at({ mode: "geometry", tool: "line", lockStyle: "axis", anySelection: true, actableSelection: true }).length, 0);
  });
  it("锁不在芯片里（白模 W-6：锁的入口都在右上角那三行）：手势中 / 有选区 / 两种工作台都没有锁那一槽；有键盘时修饰键照旧不出（按住才出）", () => {
    eq(at({ ...FF_MOVE, anySelection: true, actableSelection: true }).length, 0);
    eq(at({ mode: "geometry", tool: "move", lockStyle: "axis", anySelection: true, actableSelection: true }).length, 0);
    for (const o of [{ ...FF_MOVE, gesture: true }, { mode: "geometry" as const, tool: "move" as const, lockStyle: "axis" as const, gesture: true }, { mode: "geometry" as const, tool: "rect" as const, lockStyle: "plane" as const, gesture: true }])
      for (const k of [true, false]) assert(at(o, { keys: k }).every((x) => x.items.every((i) => !/锁/.test(i.label))), `${o.mode}/${o.tool}：芯片里还有锁`);
  });
  it("自由建模移动、手势中：Shift = 吸附（立场表那一格、只显示）、Esc 取消", () => {
    const c = at({ ...FF_MOVE, gesture: true });
    eq(c.find((x) => x.slot === "shift")?.items[0].label, chipLabel(stanceOf("freeform", "move")!.shift)); eq(c.find((x) => x.slot === "shift")?.items[0].press, null);
    assert(c.some((x) => x.slot === "cancel"), "点了一下在等第二下 / 键盘起手 = 有取消");
  });
  it("取消只在「操作开着、手是空的」时出：拖着没松 = 不出（松手就是决定）；闲着不出；镜像会话出", () => {
    assert(!at({ ...FF_MOVE, gesture: true }, { pressing: true }).some((x) => x.slot === "cancel"));
    assert(at({ ...FF_MOVE, gesture: true }, { pressing: false }).some((x) => x.slot === "cancel"));
    assert(!at(FF_MOVE).some((x) => x.slot === "cancel"));
    assert(at({ mirrorSession: true }, { pressing: true }).some((x) => x.slot === "cancel"));
  });
  it("实时：按着 Shift = Shift 那枚出来并亮", () => {
    const sh = at({}, { held: { shift: true } });
    eq(sh.map((x) => x.slot).join(","), "shift"); assert(sh[0].items[0].on);
  });
  it("没键盘（iPad：笔 / 手指）：修饰键芯片 = 开关（user「ipad上面shift反而变成toggle」）；有选区 / 手势中才出；锁住 = 亮、一直出", () => {
    const g = at({ ...FF_MOVE, gesture: true }, { keys: false });
    const sh = g.find((x) => x.slot === "shift")!.items[0];
    eq(sh.latch, "shift"); eq(sh.press, null); assert(!sh.on);
    assert(g.some((x) => x.slot === "cancel"), "等下一点时取消照旧能点");
    assert(at({ ...FF_MOVE, anySelection: true, actableSelection: true }, { keys: false }).some((x) => x.slot === "shift"), "有选区 = 先点开关再拖");
    eq(at(FF_MOVE, { keys: false }).length, 0);
    const l = at(FF_MOVE, { keys: false, latched: { shift: true } });
    assert(l.find((x) => x.slot === "shift")!.items[0].on, "锁住 = 亮，没选区也出（不许有看不见的状态）");
    const cp = at({ mode: "geometry", tool: "move", lockStyle: "axis", anySelection: true, actableSelection: true }, { keys: false }).find((x) => x.slot === "ctrl")!.items[0];
    eq(cp.latch, "ctrl"); eq(cp.label, "复制");
    assert(!at({ mode: "geometry", tool: "move", lockStyle: "axis", anySelection: true, actableSelection: true }, { keys: true }).some((x) => x.items.some((i) => i.latch)), "有键盘 = 按住，不是开关");
  });
  it("立场表的附注不出芯片；「（= X）」并进意思是 X 的那一枚（键名 Ctrl/Alt）", () => {
    for (const m of ["geometry", "freeform", "verify"] as const) for (const t of ["select", "move", "rotate", "scale", "pp", "offset", "shrink", "knife", "erase", "transform", "create"] as const) {
      const s = stanceOf(m, t); if (!s) continue;
      const c = at({ mode: m, tool: t, gesture: true, lockStyle: null });
      for (const ch of c) for (const i of ch.items) assert(!/^（.*）$/.test(i.label), `${m}/${t} ${ch.slot}：附注出成了芯片「${i.label}」`);
      const alt = /^（=\s*(.+?)）$/.exec(s.alt);
      if (alt) { assert(!c.some((x) => x.slot === "alt"), `${m}/${t}：同义的 Alt 不该单独一枚`); assert(c.some((x) => x.items.some((i) => /Alt/.test(i.keys) && i.label === alt[1].trim())), `${m}/${t}：Alt 没并进「${alt[1]}」`); }
    }
  });
  it("芯片只印名字（user「吸附不要太长的解释，就叫吸附」）；状态行那份去掉账本代号 / 施工附注", () => {
    eq(at({ ...FF_MOVE, gesture: true }).find((x) => x.slot === "shift")?.items[0].label, "吸附");
    eq(chipLabel("吸附：点 > 边 > 面"), "吸附"); eq(chipLabel("复制（Alt / ⌘ 也认 → §3-2 要改）"), "复制"); eq(chipLabel("动作反过来（拆）"), "动作反过来（拆）");
    eq(stanceShown("面心柄 = 等比、锚点仍在对面（UX35）"), "面心柄 = 等比、锚点仍在对面"); eq(stanceShown("硬化（§3-3 要搬到 Ctrl）"), "硬化"); eq(stanceShown("吸附：点 > 边 > 面"), "吸附：点 > 边 > 面");
    for (const m of ["geometry", "freeform", "verify", "surface", "object"] as const) for (const t of ["select", "line", "rect", "move", "rotate", "scale", "transform", "pp", "offset", "followme", "paint", "erase", "weldErase", "softErase", "tape", "axes", "protractor", "compass", "knife", "shrink", "create"] as const) {
      const s = stanceOf(m, t); if (!s) continue;
      for (const k of ["shift", "ctrl", "alt"] as const) assert(!/§|UX\d|要改|要搬/.test(stanceShown(s[k])), `${m}/${t} ${k}：界面上会出代号「${stanceShown(s[k])}」`);
    }
  });
  it("「收」（W-7）：编辑器说定了点、在等下一点（finish 有字）才出，排在取消前面、实心、点它 = 动作 finish 不是按键；拖着没松不出；没键盘也出", () => {
    const knife = { mode: "freeform" as const, tool: "knife" as const, lockStyle: null, gesture: true };
    const c = at(knife, { finish: "收刀" });
    eq(c.map((x) => x.slot).join(","), "finish,cancel");
    const f = c[0].items[0];
    eq(f.label, "收刀"); eq(f.act, "finish"); eq(f.press, null); assert(f.solid === true, "实心"); eq(f.keys, "", "没有键名");
    assert(!at(knife, { finish: "收刀", pressing: true }).some((x) => x.slot === "finish"), "拖着没松不出");
    assert(!at(knife, { finish: null }).some((x) => x.slot === "finish"), "一个点都没定 = 不出");
    eq(at({ mode: "geometry", tool: "line", lockStyle: "axis", gesture: true }, { finish: "收笔", keys: false }).find((x) => x.slot === "finish")?.items[0].label, "收笔", "笔 / 手指的设备也出");
  });
  it("镜像会话：确认 = Enter 应用镜像、取消 = Esc", () => {
    const c = at({ mirrorSession: true });
    eq(c.find((x) => x.slot === "confirm")?.items[0].keys, "Enter"); eq(c.find((x) => x.slot === "cancel")?.items[0].press, "escape");
  });
});
