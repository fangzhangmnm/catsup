// controller/pick-kinds.ts —— 拾取范围（点 / 边 / 面）的两种按法，一处定：右下角三颗开关和 1 / 2 / 3 键共用。created 2026-10-29 by Claude Opus 5.5
// user 10-29「mesh模式里面123对应单选点线面。然后什么是都可以选？」：只留一种（1 / 2 / 3）、已经只剩它再按同一个 = 三种全开（= 「都能选」，也是默认）；
// 开关一种（三颗按钮 / Shift+1 / 2 / 3，Blender 的 Shift 加选）、关掉最后亮的那颗 = 全开（v0.16.39 起的规矩：不会一种都选不了）。零 DOM、零编辑器 import。
export type PickKind = "verts" | "edges" | "faces";
export const PICK_KINDS: readonly PickKind[] = ["verts", "edges", "faces"];
export type PickSet = Readonly<Record<PickKind, boolean>>;
const ALL: PickSet = { verts: true, edges: true, faces: true };

/** 按下去之后的开关：solo = 只留这一种（已经只剩它 = 全开）；toggle = 开关这一种（全关了 = 全开）。 */
export function pickAfter(cur: PickSet, kind: PickKind, how: "solo" | "toggle"): PickSet {
  if (how === "solo") return PICK_KINDS.every((k) => cur[k] === (k === kind)) ? ALL : { verts: kind === "verts", edges: kind === "edges", faces: kind === "faces" };
  const next = { ...cur, [kind]: !cur[kind] };
  return PICK_KINDS.some((k) => next[k]) ? next : ALL;
}
/** 提示行的说法。 */
export function pickSay(s: PickSet): string {
  const on = PICK_KINDS.filter((k) => s[k]), name = { verts: "点", edges: "边", faces: "面" };
  return on.length === 3 ? "拾取：点 · 边 · 面都能选" : `拾取：只选${on.map((k) => name[k]).join(" · ")}${on.length === 1 ? "（再按一下同一个数字 = 都能选）" : ""}`;
}
