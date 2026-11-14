// reach-table.ts —— 「谁 × 哪一档 → 怎么办」一张表（层级显示施工单二½，统筹 11-13；created 2026-11-13 by Claude Opus 5.5）。
// 档 = 一个槽相对正在改的这一层是什么，只在 scene/world-view.ts relationOf 算（PoolSlot.rel）：
//   self = 这一层自己的几何 · child = 这一层的子物体（连它里面的）· outer = 外面的（外层几何、兄弟、不相干的）· twin = 正在改的这个物件摆在别处的分身（连它里面的）。
// 行 = 一件「怎么对待它」的事。以后做层级怎么进出、怎么挪、新建子物体、创建父物体 = 往这张表加行或改格，不在各处另写比较（守卫 test/reach-table.test.ts）。
// readBy = 现在谁照这一行办；写「照现状登记」的行 = 行为还是各处原来的代码，表只是把现状写明（第 1 版第 1 件只改画线 / 画点 / 悬停三行，统筹 11-13）。
import type { SlotRel } from "../scene/world-view.ts";

export type ReachRow<T> = Readonly<Record<SlotRel, T>> & { readonly readBy: string };

export const REACH = {
  /** 编辑用的线（结构线）：always = 任何画风都画（这一层自己的几何，编辑要看得见自己在改什么）；style = 只在画风自己要线时画（画风表 material.edges = "all"：线稿 / 像素描边 / 1-bit / Tron），
   *  那是画风的线（user 11-13 更正：「默认的『线稿』画风 默认物体有线，在编辑的物体有额外的点，不要改变默认的画风」）。能改的那一层靠 editDots 那一行的顶点小圆点区分。 */
  editLines: { self: "always", child: "style", outer: "style", twin: "style", readBy: "editor/stream-provider.ts（placement tier = 这一层且在编辑）→ minccino/providers/three/render3.ts showL" } satisfies ReachRow<"always" | "style">,
  /** 编辑用的点（顶点小圆点）：只画这一层自己的（根上 = 根自己的几何；进了组 = 组那个池），硬表面和自由建模同一条，任何画风（user 11-13：「root也有root的geometry的，我说的没在编辑就是所有不在当前你的层级的物体」+「就用顶点」，不用粗线）。 */
  editDots: { self: "edit", child: "never", outer: "never", twin: "never", readBy: "editor/edit-marks.ts vertDotsOf（softEdgesOf 同一档）" } satisfies ReachRow<"edit" | "never">,
  /** 淡出：进了物件之后，外面的和分身整块淡（根层没有外面，不淡）。 */
  dim: { self: false, child: false, outer: true, twin: true, readBy: "editor/editor.ts draw → dimSlots → highlight.ts faceDim / edgeDim" } satisfies ReachRow<boolean>,
  /** 共面时谁在前（深度优先级）。照现状登记。 */
  depthFront: { self: true, child: false, outer: false, twin: false, readBy: "照现状登记：stream-provider.ts placement tier（和 editLines 的 always 同一位）+ pick.ts preferActive（activeSlot）" } satisfies ReachRow<boolean>,
  /** 点一下得到什么。照现状登记。 */
  click: { self: "element", child: "wholeChild", outer: "none", twin: "none", readBy: "照现状登记：editor.ts classify（slot.active + topChild 比链前缀）；单击到 none = 清选区" } satisfies ReachRow<"element" | "wholeChild" | "none">,
  /** 框选。照现状登记。 */
  boxSelect: { self: "element", child: "wholeChild", outer: "none", twin: "none", readBy: "照现状登记：tools/selecting.ts（同一个 classify）" } satisfies ReachRow<"element" | "wholeChild" | "none">,
  /** 双击。照现状登记。 */
  doubleClick: { self: "nothing", child: "enter", outer: "exitOne", twin: "exitOne", readBy: "照现状登记：editor.ts hierarchyTapAt（classify）" } satisfies ReachRow<"nothing" | "enter" | "exitOne">,
  /** 悬停亮不亮：这一层的元素照各工具自己亮（油漆桶 / 橡皮…）；子物体 = 点一下会选到它的工具（立场表 tap = select）悬停时整个亮一下（统筹 11-13 第 1 版施工单：「光标移到子物体上整个亮一下」，和悬停同色）；外面的 / 分身不亮。 */
  hover: { self: "element", child: "wholeChild", outer: "none", twin: "none", readBy: "editor.ts pointerMove → hoverChild → draw 合进 peekFaces；元素那格 = 各工具 setHoverFace / setHoverEdge" } satisfies ReachRow<"element" | "wholeChild" | "none">,
  /** 吸附：都吸，远近按 tier（自己 0 / 孩子·父母·兄弟 1 / 其他 2）；手势中分身在手里不吸。照现状登记。 */
  snap: { self: "near", child: "byTier", outer: "byTier", twin: "byTierNotInGesture", readBy: "照现状登记：solver.ts TIER_EPS / TIER_DIST（slot.tier，relationOf 里一起算）；分身在手里 = world-view.ts twin → overridden" } satisfies ReachRow<"near" | "byTier" | "byTierNotInGesture">,
  /** 藏：藏掉的、层关掉的不进世界；「只看这个」= 只留 self / child。照现状登记。 */
  hide: { self: "byFlag", child: "byFlag", outer: "byFlagOrIsolate", twin: "byFlagOrIsolate", readBy: "照现状登记：world-view.ts chainVisible + isolate（insideContext）" } satisfies ReachRow<"byFlag" | "byFlagOrIsolate">,
  /** 工具能不能改它。照现状登记。 */
  edit: { self: "all", child: "wholeObject", outer: "no", twin: "sameDefinition", readBy: "照现状登记：指令落在 activePool()；子物体选中后整体挪 / 转 / 缩和物件动词；分身 = 同一个定义，改 self 就是改它（手势中跟着预演，world-view.ts twin）" } satisfies ReachRow<"all" | "wholeObject" | "no" | "sameDefinition">,
  /** 选中的标记。照现状登记。 */
  selectionMark: { self: "element", child: "wholeChild", outer: "none", twin: "none", readBy: "照现状登记：editor.ts draw slotHighlight（selectedPools 整池）" } satisfies ReachRow<"element" | "wholeChild" | "none">,
} as const;

export type ReachRowId = keyof typeof REACH;
export const SLOT_RELS: readonly SlotRel[] = ["self", "child", "outer", "twin"];
