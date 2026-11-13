import type { Pt3 } from "../kernel/geom.ts";
/** 整角的档（度）。量纲：度。 */
export declare const INCREMENT_DEG = 15;
/** 格点吸附的有效开关：右上锁钮的状态，按住 Shift 反过来。 */
export declare const gridEffective: (on: boolean, shift: boolean) => boolean;
/** t0 最近的整格（step 的整数倍）。 */
export declare const nearestStep: (t0: number, step: number) => number;
/** 平面内（u / v 正交单位基）从 anchor 指向 p 的方向咬到 stepDeg 的整数倍（参考方向 = u）：返回同半径的点 + 角度（度）。 */
export declare function snapDirectionInPlane(anchor: Pt3, p: Pt3, basis: {
    u: Pt3;
    v: Pt3;
}, stepDeg?: number): {
    p: Pt3;
    deg: number;
};
/**
 * 整格吸附的唯一入口（2026-11-12，Claude Opus 5.5；统筹 11-12 / user 11-13）。工具里的长度、角度要整格时只问它，不许自己 round、不许加「够不够近」。
 * g = ctx.grid()（已是有效开关：右上锁钮 XOR Shift）。关着 / 步长不对 = 原样返回。键入的数不走这里（键入的就是人要的数）。
 * 取整得 0（不到半格 / 半档）由调用方处理：不动、提示「再拖远一点」（gridSnap.zeroHint 给字）。
 */
export declare const gridSnap: {
    /** 长度：吸附长度 snap 的整数倍（h := s · round(h / s)）。 */
    readonly length: (v: number, g: {
        on: boolean;
        snap: number;
    }) => number;
    /** 角度（弧度）：15° 的整数倍。 */
    readonly angle: (rad: number, g: {
        on: boolean;
    }) => number;
    /** 取整得 0 时提示行那半句（长度给吸附长度的一半；角度给 7.5°）。fmt = 长度的显示写法（各工具用自己的 fmtLen）。 */
    readonly zeroHint: (g: {
        snap: number;
    }, fmt: (m: number) => string) => string;
    readonly zeroAngleHint: "不到半档（7.5°），再转远一点";
};
/**
 * 这个吸附结果算不算「具体的东西」：没吸到 / 吸到格点 / 吸到整数长度（求解器从锚点量的整格，离得近才咬——自由落点那一半，待定）/ 只是落在面上
 * = 都不算，工具拿光标**真实的**位置去问 gridSnap 取整；吸到点、边、停靠点、轴线这些才算、优先于取整。
 * （2026-11-12：求解器的「整数长度」以前被旋转、量角器当成具体的东西，开着吸附时 15° 档根本轮不到——probe-grid-snap 抓到的。）
 */
export declare const snapIsGridOnly: (kind: string | null | undefined) => boolean;
