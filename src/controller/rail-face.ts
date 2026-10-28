// controller/rail-face.ts —— 左柱一格按上下文换脸：此刻长什么样、点了做什么。created 2026-10-28 by Claude Opus 5.5
// user 10-28 晚「有选区的时候删除的tool能变成小垃圾桶然后点了直接删吗。然后这个context sensitive left bar/tool icon做一下深模块窄接口，然后周账让fable审计」（家族周账 F-121）。
//
// 窄接口：railFace(工具, 上下文) → null（平常的样子：拿起这把工具）或一张「脸」（图标 / 名字 / 提示 + 点了跑哪个动作）。
// 动作 = 键表用的同一套动作 id（"delete" 就是 Delete 键那一条），app 只认 id、和真按键走同一条，所以左柱不会做出键盘做不到的事。
// 规矩（防 UX 误导 = 数据安全缺陷）：
//   · 换了脸就要看得出换了（图标 + 名字都换、提示写清点了做什么）；不许同一张脸两种结果。
//   · 脸只跟着「有没有东西可做」换，不跟手势换（按下 / 拖的半路按钮不许变脸——第一版「手势中退回平常的样子」会在按下那一刻把按钮换掉，probe-rail-face ⑤ 抓到）；
//     操作进行到一半点了换过脸的格 = 先取消那个操作（不动选区），再跑这张脸的动作（app 的点击处理）。
//   · 换脸的动作必须可撤销（一步）——这里只放能撤销的动作；守卫 test/rail-face.test.ts 查动作 id 在键表里、工具在那个工作台里。
// 加一张脸 = 下面表里一行。纯数据：零 DOM / three / 内核（controller 文件夹的规矩）。
import type { ModeId } from "../editor/mode.ts";
import type { Tool } from "../editor/tool-ids.ts";

export interface RailCtx {
  readonly mode: ModeId;
  /** 有选区（点 / 边 / 面 / 子物体）。 */
  readonly hasSelection: boolean;
  /** 手势进行中（按下没松 / 等下一点 / 键盘起手）。现在没有脸看它（见上面的规矩），留着给以后真需要的脸。 */
  readonly gesture: boolean;
}
export interface RailFace {
  /** 图标（共享图标库的 id）。 */
  readonly icon: string;
  /** 左柱上的字。 */
  readonly label: string;
  /** 悬停提示：点了做什么。 */
  readonly tip: string;
  /** 点了跑的动作（键表同一套 id）。 */
  readonly action: string;
}
interface Rule { readonly tool: Tool; readonly modes: readonly ModeId[]; readonly when: (c: RailCtx) => boolean; readonly face: RailFace }

/** 换脸表（一行一张脸；先匹配的先用）。 */
export const RAIL_FACES: readonly Rule[] = [
  // 自由建模的「删除」：有选区 = 小垃圾桶，点一下 = 删掉选中的（= Delete 键 / 浮条「删除」，一步撤销）；没选区 = 平常的删除工具（按着刮）
  { tool: "erase", modes: ["freeform"], when: (c) => c.hasSelection, face: { icon: "trash-can", label: "删掉选中", tip: "删掉选中的（和 Delete 键同一条，一步撤销）；没选东西时这一格是删除工具（按着刮过去删）", action: "delete" } },
];

/** 这一格此刻的脸（null = 平常的样子）。 */
export function railFace(tool: Tool, c: RailCtx): RailFace | null {
  for (const r of RAIL_FACES) if (r.tool === tool && r.modes.includes(c.mode) && r.when(c)) return r.face;
  return null;
}
