import type { Pt3 } from "../kernel/geom.ts";
import type { Ray, WorldHit, WorldQuery } from "./world-query.ts";
export declare const SPEED_TIERS: readonly number[];
export declare const DEFAULT_TIER = 1;
export declare const TELEPORT_G = 9.8;
export declare const ARC_DT = 0.04;
export declare const ARC_MAX_T = 3;
export declare const LINE_REACH = 300;
export declare const BACK_COOLDOWN = 0.3;
export declare const BACK_HOLD = 0.15;
export declare const YAW_STEP: number;
export interface ArcResult {
    points: Pt3[];
    hit: WorldHit | null;
    valid: boolean;
    reason: "ok" | "no-hit" | "slope" | "headroom";
}
/**
 * 抛射体折线求交（纯函数）。v0=Infinity → 直线。valid 需要 |n.z| ≥ minNz 且 headroomOk（由调用方注入胶囊净空判定）。
 */
export declare function simulateArc(world: WorldQuery, aim: Ray, v0: number, opts: {
    g?: number;
    minNz: number;
    headroomOk: (p: Pt3) => boolean;
}): ArcResult;
export interface TeleportState {
    charging: boolean;
    tier: number;
    yawSteps: number;
    arc: ArcResult | null;
    cooldownUntil: number;
    backHeld: number;
    /** 上一次 teleport 的**出发点**（回上一点 = 撤销这次跳；再拉一次又跳回去，来回可反复）。 */
    last: {
        pos: Pt3;
        heading: number;
    } | null;
}
export declare const initialTeleport: () => TeleportState;
export type TeleportAction = {
    kind: "none";
} | {
    kind: "jump";
    to: Pt3;
    headingDelta: number;
} | {
    kind: "back";
    to: Pt3;
    heading: number;
};
/**
 * teleport 状态机一步（纯函数式：原地改 st，返回本步动作；pos/heading 的写入由 player 执行并登记 last）。
 * @param now      sim 时间（秒）
 * @param v0Scale  √rig 缩放
 */
export declare function stepTeleport(st: TeleportState, input: {
    tpCharge: boolean;
    tpBack: boolean;
    tierStep: -1 | 0 | 1;
    yawStep: -1 | 0 | 1;
    aim: Ray | null;
}, now: number, dt: number, world: WorldQuery, opts: {
    minNz: number;
    headroomOk: (p: Pt3) => boolean;
    v0Scale: number;
}): TeleportAction;
