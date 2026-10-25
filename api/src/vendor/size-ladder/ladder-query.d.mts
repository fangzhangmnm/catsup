export function orientOf(L: any, v: any): any;
/** 合理范围 [lo, hi]：带 = range 放宽到至少 ÷/× bandMinRatio（没 range 用 bandDefaultRatio）；点 = range，没有就 ÷/× pointDefaultRatio */
export function span(L: any, v: any): any[];
/** 正常版名字：东西全名 · 量哪里 · label · 档（常见 / 规格不写） */
export function nameOf(L: any, v: any, lang?: string): string;
/** 订阅（menu 的 id；CatsUp 单选，传一个）→ 可见的参考值 [{ i, v, agnostic }]，按数组下标排；传几个就取并集 */
export function visible(L: any, subscriptions: any): any[];
/** 候选：读数落在合理范围里的全部值（可重叠），先按评级、同级按离读数多近排。dir = "up" 竖 / "flat" 横 / "both" 斜 / "plan" 平面 */
export function candidates(L: any, subscriptions: any, { reading, dir }: {
    reading: any;
    dir: any;
}): any[];
/** tooltip（只管「认」）：候选里前 tooltipMax 个不重复的短版名字 */
export function tooltip(L: any, subscriptions: any, query: any, lang?: string): string;
/** 刻度条（管「对」和「停」）：合理范围和 读数 ÷ factor 到 × factor 有交集的参考；shape = "point" 画刻度线，"band" 画色块 */
export function ruler(L: any, subscriptions: any, { reading, dir }: {
    reading: any;
    dir: any;
}, factor?: number): {
    v: any;
    lo: any;
    hi: any;
    shape: any;
}[];
export function menu(L: any): any;
export function remindersOf(L: any, sub: any): any;
export function regionsOf(L: any, v: any): any;
export function shapeOf(L: any, v: any): any;
