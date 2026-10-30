// 拾取范围的按法（controller/pick-kinds.ts）+ 自由建模 1 / 2 / 3 键（user 10-29「mesh模式里面123对应单选点线面。然后什么是都可以选？」）。created 2026-10-29 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { pickAfter, pickSay, type PickSet } from "../src/controller/pick-kinds.ts";
import { resolveKey, type KeyContext, type KeyEvt } from "../src/controller/keymap.ts";

const ALL: PickSet = { verts: true, edges: true, faces: true };
const base: KeyContext = { mode: "freeform", tool: "select", gesture: false, hasSelection: false, walk: "off", walking: false, mirrorSession: false, lockStyle: null, typingWants: () => false };
const D = (n: string, shift = false): KeyEvt => ({ key: shift ? "!" : n, code: `Digit${n}`, shift, ctrl: false, alt: false });
const same = (a: unknown, b: unknown, msg?: string): void => eq(JSON.stringify(a), JSON.stringify(b), msg);
const act = (c: KeyContext, e: KeyEvt): string => { const r = resolveKey(c, e); return r === null ? "∅" : r === "swallow" ? "swallow" : r.action; };

describe("拾取范围：1 / 2 / 3 = 只留一种，再按同一个 = 都能选", () => {
  it("只留一种 / 再按回到全开", () => {
    const v = pickAfter(ALL, "verts", "solo"); same(v, { verts: true, edges: false, faces: false });
    same(pickAfter(v, "verts", "solo"), ALL);
    same(pickAfter(v, "faces", "solo"), { verts: false, edges: false, faces: true });
  });
  it("开关一种（按钮 / Shift+数字）：关掉最后亮的那颗 = 全开", () => {
    same(pickAfter(ALL, "edges", "toggle"), { verts: true, edges: false, faces: true });
    same(pickAfter({ verts: true, edges: false, faces: false }, "verts", "toggle"), ALL);
    same(pickAfter({ verts: true, edges: false, faces: false }, "faces", "toggle"), { verts: true, edges: false, faces: true });
  });
  it("提示行说法", () => { eq(pickSay(ALL), "拾取：点 · 边 · 面都能选"); eq(pickSay({ verts: false, edges: true, faces: false }).startsWith("拾取：只选边"), true); });
  it("键表：自由建模没在打字 = 拾取；小窗里有字 = 让给打字；手势中 = 打数；硬表面里不归拾取", () => {
    eq(act(base, D("1")), "pick.solo:verts"); eq(act(base, D("3")), "pick.solo:faces"); eq(act(base, D("2", true)), "pick.toggle:edges");
    const vcb = { ...base, typingWants: (e: KeyEvt) => /^[0-9]$/.test(e.key) };
    eq(act(vcb, D("1")), "pick.solo:verts", "刚做完一步、小窗空着：1 还是拾取（Blender）");
    eq(act({ ...vcb, typing: true }, D("1")), "typing.key", "小窗里已经有字：接着打");
    eq(act({ ...vcb, gesture: true, tool: "move" }, D("1")), "typing.key", "手势中打数（S Z 0）不受影响");
    eq(act({ ...base, mode: "geometry" }, D("1")) === "pick.solo:verts", false);
  });
});
