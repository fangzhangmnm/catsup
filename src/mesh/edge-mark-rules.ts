// mesh/edge-mark-rules.ts —— 边上的标记跟着拓扑操作怎么走：全仓只有这一处（施工单二十二 A，统筹 11-12 定）。created 2026-11-12 by Claude Opus 5.5
// 规矩：棱带到哪，接缝带到哪——接缝和棱、平滑、软是同一组「用户标在边上的标记」，搬家时一起走。
// 拓扑操作（src/mesh/ops/）只许引用这里的名字，不许自己列位；新加一个拓扑操作 = OPS 里加一行说清它怎么对边标记；新加一位标记 = JOIN 和 MOVE 两张表各填一格。
//   守卫 test/edge-mark-rules.test.ts（不填 = 红）。
import { F_SOFT, F_SMOOTH, F_SEAM, F_HIDDEN, F_WIRE, F_SHARP } from "./mesh-kernel.ts";

/** 手标三位（棱 / 平滑 / 不画线）：「手标 ›」那几条指令管的（mesh/edge-smooth.ts markEdges）。 */
export const HAND_MARKS = F_SHARP | F_SMOOTH | F_SOFT;
/** 标成平滑 = 这两位（倒角圆角中间新长出来的线也是这样标的）。 */
export const SMOOTH_MARK = F_SOFT | F_SMOOTH;
/** 细分当折痕读的那一位（手标的棱；读语义，不是搬家）。 */
export const CREASE_MARK = F_SHARP;

/** 搬家：一条边的标记搬到另一条边上（挤出的帽、……）时一起走的那几位 = 手标三位 + 接缝。 */
export const MOVING_MARKS = HAND_MARKS | F_SEAM;
/** 带隐藏的搬家（倒角现在就带隐藏；这一张不改它的行为——隐藏「倒角带、挤出不带」的不一致记在手感账，统筹 11-12）。 */
export const MOVING_MARKS_WITH_HIDDEN = MOVING_MARKS | F_HIDDEN;

/** 每一位在搬家时归哪一类（守卫：内核里每一位都要在这里有一格）。 */
export const MOVE: Readonly<Record<number, string>> = {
  [F_SOFT]: "手标：搬家都带", [F_SMOOTH]: "手标：搬家都带", [F_SHARP]: "手标：搬家都带",
  [F_SEAM]: "接缝：搬家都带（棱带到哪接缝带到哪）",
  [F_HIDDEN]: "隐藏：带隐藏的搬家（倒角）带、不带隐藏的（挤出的帽）不带——现状，手感账",
  [F_WIRE]: "裸线：结构位（这条边有没有面），由拓扑自己定，不搬",
};

/**
 * 并边（两条边并成一条：溶解二度点、整理里的有限溶解、删点）每一位怎么合（守卫：内核里每一位都要在这里有一格）：
 * both = 两条都有才留（手标三位：硬软边设计稿 §6 第 3 问，和硬表面体一致）；either = 有一条就留（接缝：断一截那一片就切不开；隐藏：不丢 user 标的）；
 * structural = 结构位，调用的人按拓扑重算。
 */
export const JOIN: Readonly<Record<number, "both" | "either" | "structural">> = {
  [F_SOFT]: "both", [F_SMOOTH]: "both", [F_SHARP]: "both",
  [F_SEAM]: "either", [F_HIDDEN]: "either",
  [F_WIRE]: "structural",
};
const bitsOf = (kind: "both" | "either" | "structural"): number => Object.entries(JOIN).reduce((acc, [b, k]) => (k === kind ? acc | Number(b) : acc), 0);
const JOIN_BOTH = bitsOf("both"), JOIN_EITHER = bitsOf("either");
/** 两条边并成一条时新边的标记（结构位不在里面：调用的人自己按拓扑设）。 */
export function joinFlags(f0: number, f1: number): number { return (f0 & f1 & JOIN_BOTH) | ((f0 | f1) & JOIN_EITHER); }

/**
 * 每个拓扑操作对边标记怎么走（看得见的表；守卫：src/mesh/ops/ 里每个文件都要在这里有一行）。
 */
export const OPS: Readonly<Record<string, string>> = {
  "bevel.ts": "倒角：挨着被倒的边、自己没被倒的边换成新边时带上原来的标记（MOVING_MARKS_WITH_HIDDEN）；被倒的边本身变成倒角带，它的标记不往带上搬（现状：棱、接缝都丢；Blender 默认也不搬）；圆角中间的线标成平滑（SMOOTH_MARK）",
  "build.ts": "建面 / 建几何体：新边不带标记",
  "cleanup.ts": "整理：有限溶解里并边走 join.ts 的 joinFlags；去重点 = 合到一点（见 merge.ts）",
  "delete.ts": "删：剩下的边不动；溶解二度点走 join.ts 的 joinFlags",
  "duplicate.ts": "复制（Shift+D）/ 补洞 / 桥接：新的几何不带标记（现状）",
  "extrude.ts": "挤出：帽上的边带原来那条的标记（MOVING_MARKS，不带隐藏）；新长出来的侧边不带",
  "flatten.ts": "压平 / 单轴缩放：只挪点，边不变",
  "geometry.ts": "挪点 / 变换：只挪点，边不变；setEdgeFlags 是给指令用的通用设位（位由调用的人给）",
  "index.ts": "出口：不碰边",
  "inset.ts": "插入：外圈的边不变，新长出来的内圈和连接边不带",
  "join.ts": "并边：joinFlags（JOIN 表：手标两条都有才留、接缝 / 隐藏有一条就留）；并面：被并掉的公共边没了",
  "loopcut.ts": "环切：被切的边劈成两半（走 split.ts，两半都带）；切出来的新环不带",
  "merge.ts": "合到一点：碰到的边是重建的，标记全丢（棱也丢）——现状；裸线照原样带回",
  "orient.ts": "法向一致化：只翻面的绕向，边不变",
  "primitives.ts": "基本体：新几何自己设（不从别处搬）",
  "split.ts": "劈边 / 劈面 / 刀：被劈的边两半都带全部位；面里切出来的新边不带",
  "subdivide.ts": "细分：被劈的边两半都带全部位；读 CREASE_MARK 当折痕；面里新长出来的边不带",
};
