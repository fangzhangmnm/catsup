import type { PlayerConfig } from "./player.ts";
/** 「这个人」的参数（米 / 米每秒 / 倍）：身高必填，别的不填 = 自动。 */
export interface AvatarSpec {
    readonly stature: number;
    /** 碰撞体直径（肩宽 + 摆臂）。 */
    readonly width?: number;
    /** 眼睛到头顶（站 / 蹲 / 爬都不变）。 */
    readonly eyeToTop?: number;
    /** 蹲下时头顶多高。 */
    readonly crouchHeight?: number;
    /** 趴下爬时头顶多高。 */
    readonly crawlHeight?: number;
    /** 走多快（米每秒）。 */
    readonly walkSpeed?: number;
    /** 跑 = 走的几倍。 */
    readonly runFactor?: number;
    /** 按住跳能跳多高（脚离地多高）。 */
    readonly jumpHeight?: number;
}
export declare const STATURE_DEFAULT = 1.72, STATURE_MIN = 0.3, STATURE_MAX = 5;
export declare const AVATAR_DEFAULT: AvatarSpec;
/** 跳的重力（米每秒²）：按住跳上升段 / 别的时候（一直用的手感；跳高换算起跳速度用的是按住那一段）。 */
export declare const GRAVITY = 25, GRAVITY_HELD = 15;
/** 填满的参数（自动的算出来、夹在合理范围：眼到头顶 ≥ 4 cm（比镜头近平面远）；爬高 ≤ 蹲高 ≤ 身高；宽度 ≤ 身高的一半）。 */
export declare function resolveAvatar(spec: AvatarSpec): Required<AvatarSpec>;
/** 身体 + 动作的字段（PlayerConfig 的子集）。 */
export type AvatarFields = Pick<PlayerConfig, "height" | "headroom" | "radius" | "stepHeight" | "stickDown" | "crouchMinHead" | "crouchDrop" | "crawlHead" | "walkSpeed" | "dashSpeed" | "crawlSpeed" | "jumpVel" | "gravity" | "gravityHeld">;
/** 这个人的字段。 */
export declare function avatarFields(spec: AvatarSpec | number): AvatarFields;
/** 换一个人：别的（手感、步进）照旧。 */
export declare function withAvatar<T extends AvatarFields>(cfg: T, spec: AvatarSpec | number): T;
/** 这份配置的人有多高（头顶离脚底）。 */
export declare function statureOf(cfg: Pick<PlayerConfig, "height" | "headroom">): number;
/**
 * 跳多高、在空中多久、平地上走着 / 跑着跳多远（按住跳到底那一种；和模拟器同一套物理：上升段 gravityHeld、到顶以后 gravity，不算空气阻力）。
 * 关卡用（user 10-24「关卡讨论用 A 到 B 几秒几拍」）：这道沟跑着跳得过去吗、这个台子跳得上去吗。
 */
export declare function jumpReach(cfg: Pick<PlayerConfig, "jumpVel" | "gravity" | "gravityHeld" | "walkSpeed" | "dashSpeed">): {
    height: number;
    airtime: number;
    walk: number;
    run: number;
};
