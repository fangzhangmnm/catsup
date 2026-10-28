/** 可变三维向量（player 状态原地更新；结构上兼容 kernel 的只读 Vec3）。 */
export interface Vec3 {
    x: number;
    y: number;
    z: number;
}
import { type InputFrame } from "./input.ts";
import { type TeleportState } from "./teleport.ts";
import type { WorldQuery } from "./world-query.ts";
export interface PlayerConfig {
    walkSpeed: number;
    dashSpeed: number;
    crawlSpeed: number;
    flySpeed: number;
    flyDashSpeed: number;
    jumpVel: number;
    gravity: number;
    gravityHeld: number;
    terminalVel: number;
    height: number;
    /** 眼到头顶（米）：碰撞胶囊的顶永远 = 眼 + 它，站 / 蹲 / 爬都一样（2026-10-28 user「碰撞不是很对，不知道是头高了还是碰撞体低了」
     *  「应该是有一个眼睛到头顶的高度，这样站蹲爬都能算对」：以前胶囊顶 = 眼，钻到天花板 / 门楣底下时眼睛贴着几何、镜头近平面伸进去看穿）。 */
    headroom: number;
    radius: number;
    stepHeight: number;
    stickDown: number;
    followTau: number;
    crouchMinHead: number;
    crouchDrop: number;
    crawlHead: number;
    substepLen: number;
    substepCap: number;
    maxRoomscaleStep: number;
    snapTurnDeg: number;
    maxSlopeDeg: number;
    stickDeadzone: number;
    passivePushCap: number;
}
export declare const DEFAULT_CONFIG: PlayerConfig;
export declare const PHYS_DT: number;
export declare const MAX_STEPS_PER_FRAME = 8;
export interface PlayerState {
    pos: Vec3;
    heading: number;
    trackingOrigin: {
        x: number;
        y: number;
    };
    headZ: number;
    crouchDrop: number;
    velZ: number;
    grounded: boolean;
    noclip: boolean;
    scale: number;
    t: number;
    freezeReasons: Set<string>;
    discontinuity: boolean;
    teleport: TeleportState;
}
export declare function createPlayerState(cfg?: PlayerConfig): PlayerState;
export declare const isFrozen: (st: PlayerState) => boolean;
export declare const fwdOf: (h: number) => {
    x: number;
    y: number;
};
export declare const rightOf: (h: number) => {
    x: number;
    y: number;
};
/** rig 局部 (x 右, y 前) → 世界平面向量。 */
export declare function localToWorld2(h: number, lx: number, ly: number): {
    x: number;
    y: number;
};
/** 世界平面向量 → rig 局部。 */
export declare function worldToLocal2(h: number, wx: number, wy: number): {
    x: number;
    y: number;
};
export interface CapsuleSpheres {
    r: number;
    topZ: number;
    bottomZ: number;
    midZ: number;
    degenerate: boolean;
}
/** 顶球上缘 = 头顶 = 眼 + headroom（2026-10-28 起；以前 = 眼）；腹球 = min(台阶+r, 顶)——站立时钉在台阶高，蹲低了跟顶球塌成一球。腹球下缘 = 腿区上界（对墙不可见）。 */
export declare function capsuleSpheres(headZ: number, cfg: PlayerConfig): CapsuleSpheres;
/** 去穿透（≤5 轮收敛）；cap = 本步总位移预算。返回实际位移总长（>0 = 身体正嵌在几何里被推）。 */
export declare function resolveCapsule(pos: Vec3, headZ: number, world: WorldQuery, cfg: PlayerConfig, cap?: number): number;
export declare function groundProbe(pos: Vec3, world: WorldQuery, cfg: PlayerConfig): number | null;
/** 头顶净空：从 lo 向 hi 连续上扫（5 cm 步），顶球撞到就停——不是端点测试，薄顶不会被穿过去。 */
export declare function clearHeadHeight(pos: Vec3, lo: number, hi: number, world: WorldQuery, cfg: PlayerConfig, slack?: number): number;
/** 落点净空（teleport 合法性）：站立胶囊在该点不穿几何。 */
export declare function standingClear(p: Vec3, world: WorldQuery, cfg: PlayerConfig): boolean;
/**
 * 一步固定 dt。顺序：① 蹲/头高 ② snap turn ③ 水平（摇杆 XOR roomscale）④ 竖直（跳/重力/悬挂）⑤ teleport。
 * 冻结（coyote）：③ 照常（主动），④⑤ 与跳停摆；被动去穿透永远限速（见文件头）。
 */
export declare function stepPlayer(st: PlayerState, input: InputFrame, dt: number, world: WorldQuery, cfg?: PlayerConfig): void;
/** 设计内的跳：落点 + 朝向；头重锚到身上（落点就是脚下）。 */
export declare function jumpTo(st: PlayerState, to: Vec3, heading: number, input: InputFrame): void;
export interface RigPose {
    origin: Vec3;
    heading: number;
    headWorld: Vec3;
}
export declare function rigPose(st: PlayerState, head: Vec3): RigPose;
/**
 * PlayerSim：累加器固定 60 Hz 步进；渲染帧读 pose(alpha) 得插值 rig 原点（heading 取最新，不插值）；
 * 一帧多步只有第一步吃边沿；discontinuity 那帧 prev=cur（不抹跳）。
 */
export declare class PlayerSim {
    readonly state: PlayerState;
    private acc;
    private prev;
    private cur;
    private lastHead;
    world: WorldQuery;
    cfg: PlayerConfig;
    constructor(world: WorldQuery, cfg?: PlayerConfig);
    freeze(token: string): void;
    thaw(token: string): void;
    setFrozen(token: string, on: boolean): void;
    isFrozen(): boolean;
    /** 推进 renderDt 秒（可含多步或零步）。 */
    advance(input: InputFrame, renderDt: number): void;
    /** 渲染帧用：插值后的 rig 姿态。 */
    pose(): RigPose;
    /** 出生/重置：脚落 pos、朝 heading；头重锚到当前 HMD。 */
    /** 站到这里（脚底 = pos），朝 heading，头在这份身体站直时的位置（消费者不用知道眼睛在哪）。 */
    standAt(pos: Vec3, heading: number): void;
    /** 没有头显时的「头」：站着的眼睛那里、按俯仰看（键鼠 / 触屏喂输入用；眼睛在哪只有 player 知道）。 */
    flatHead(pitch: number): {
        local: Vec3;
        fwdLocal: Vec3;
    };
    reset(pos: Vec3, heading: number, head: Vec3): void;
    /** Quest「Reset View」：参考系重锚 + 报告的 yaw 偏移 → 世界朝向稳定、身体不动。 */
    handleTrackingReset(yawShift: number, head: Vec3): void;
}
