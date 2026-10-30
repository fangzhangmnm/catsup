export type PickKind = "verts" | "edges" | "faces";
export declare const PICK_KINDS: readonly PickKind[];
export type PickSet = Readonly<Record<PickKind, boolean>>;
/** 按下去之后的开关：solo = 只留这一种（已经只剩它 = 全开）；toggle = 开关这一种（全关了 = 全开）。 */
export declare function pickAfter(cur: PickSet, kind: PickKind, how: "solo" | "toggle"): PickSet;
/** 提示行的说法。 */
export declare function pickSay(s: PickSet): string;
