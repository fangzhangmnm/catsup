// controller/second-mode.ts —— 再点一下左柱上已经拿着的那把工具 = 换到它的另一种做法（两种做法的才有）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「brep多次点击推拉按钮能不能切换模式就是两种ctrl模式？然后有没有其他的按钮也这么推荐的。然后也许icon上面要有区分披露」→「2同意 然后shift ctrl是模式切换覆盖，就是可以换回来？」：
//   · 只给两种做法的工具；三种以上（油漆桶）走长按 / 小三角，不轮换（user 10-30「长按是弹一个让你选。不然一个一个轮换太慢了」）。
//   · 切到另一种做法 = 钮角上一个字（披露）；按住对应的修饰键 = 临时换回原来那种（两档选项 tool-config.ts effective 取反 / 工具里 XOR）。
//   · 一行 = (工作台, 工具) → 切哪个选项、另一种做法是哪个值、角标字；或者换成另一把工具（swap：矩形 ↔ 中心矩形，图标本来就不同，不要角标）。
// 加一行 = 这张表一行；左柱（main.ts mkToolBtn）只读它，不按工具写 if。
import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";

export type SecondMode =
  | { readonly kind: "option"; readonly modes: readonly ModeId[]; readonly key: string; readonly alt: string | true; readonly badge: string; readonly name: string; readonly mod: "Ctrl" | "Shift" }
  | { readonly kind: "swap"; readonly modes: readonly ModeId[]; readonly to: Tool };

const COPY = (modes: readonly ModeId[]): SecondMode => ({ kind: "option", modes, key: "copy", alt: true, badge: "复", name: "复制", mod: "Ctrl" });
export const SECOND_MODES: Partial<Record<Tool, readonly SecondMode[]>> = {
  pp: [{ kind: "option", modes: ["geometry"], key: "mode", alt: "ring", badge: "边", name: "加边", mod: "Ctrl" }],   // 自由建模的「挤出」也是 pp，那边没有加边
  move: [COPY(["geometry", "verify"])],
  rotate: [COPY(["geometry", "verify"])],
  transform: [COPY(["geometry", "verify"])],
  softErase: [{ kind: "option", modes: ["geometry", "freeform"], key: "action", alt: "harden", badge: "硬", name: "硬化", mod: "Shift" }],
  weldErase: [{ kind: "option", modes: ["geometry"], key: "action", alt: "split", badge: "拆", name: "拆开", mod: "Shift" }],
  erase: [{ kind: "option", modes: ["freeform"], key: "action", alt: "dissolve", badge: "溶", name: "溶解", mod: "Shift" }],
  rect: [{ kind: "swap", modes: ["geometry"], to: "crect" }],
  crect: [{ kind: "swap", modes: ["geometry"], to: "rect" }],
};
/** 这个工作台里这把工具的另一种做法（没有 = null）。 */
export function secondModeOf(tool: Tool, mode: ModeId): SecondMode | null { return SECOND_MODES[tool]?.find((s) => s.modes.includes(mode)) ?? null; }
/** 现在是不是在另一种做法上（选项值 = alt）。 */
export const onSecond = (sm: SecondMode | null, value: unknown): boolean => sm?.kind === "option" && value === sm.alt;
/** 切一下以后的选项值：开关 = 取反；两档的 enum = 另一档（values = 选项表那一项的档位）。 */
export function flippedValue(sm: Extract<SecondMode, { kind: "option" }>, value: unknown, values?: readonly { id: string }[]): string | boolean {
  if (sm.alt === true) return !value;
  if (value === sm.alt) return values?.find((v) => v.id !== sm.alt)?.id ?? String(value);
  return sm.alt;
}
