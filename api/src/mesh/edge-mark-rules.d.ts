/** 手标三位（棱 / 平滑 / 不画线）：「手标 ›」那几条指令管的（mesh/edge-smooth.ts markEdges）。 */
export declare const HAND_MARKS: number;
/** 标成平滑 = 这两位（倒角圆角中间新长出来的线也是这样标的）。 */
export declare const SMOOTH_MARK: number;
/** 细分当折痕读的那一位（手标的棱；读语义，不是搬家）。 */
export declare const CREASE_MARK = 32;
/** 搬家：一条边的标记搬到另一条边上（挤出的帽、……）时一起走的那几位 = 手标三位 + 接缝。 */
export declare const MOVING_MARKS: number;
/** 带隐藏的搬家（倒角现在就带隐藏；这一张不改它的行为——隐藏「倒角带、挤出不带」的不一致记在手感账，统筹 11-12）。 */
export declare const MOVING_MARKS_WITH_HIDDEN: number;
/** 每一位在搬家时归哪一类（守卫：内核里每一位都要在这里有一格）。 */
export declare const MOVE: Readonly<Record<number, string>>;
/**
 * 并边（两条边并成一条：溶解二度点、整理里的有限溶解、删点）每一位怎么合（守卫：内核里每一位都要在这里有一格）：
 * both = 两条都有才留（手标三位：硬软边设计稿 §6 第 3 问，和硬表面体一致）；either = 有一条就留（接缝：断一截那一片就切不开；隐藏：不丢 user 标的）；
 * structural = 结构位，调用的人按拓扑重算。
 */
export declare const JOIN: Readonly<Record<number, "both" | "either" | "structural">>;
/** 两条边并成一条时新边的标记（结构位不在里面：调用的人自己按拓扑设）。 */
export declare function joinFlags(f0: number, f1: number): number;
/**
 * 每个拓扑操作对边标记怎么走（看得见的表；守卫：src/mesh/ops/ 里每个文件都要在这里有一行）。
 */
export declare const OPS: Readonly<Record<string, string>>;
