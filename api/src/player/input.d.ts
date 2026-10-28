import type { Pt3 } from "../kernel/geom.ts";
import type { Ray } from "./world-query.ts";
/** HMD / 相机在 rig 局部（Z 上、x 右、y 前、脚底原点）的姿态。flat：local=(0,0,眼高)、fwd=(0,1,0)。 */
export interface HeadFrame {
    local: Pt3;
    /** 头的完整前向（rig 局部单位向量，含俯仰；noclip 飞行沿它飞，步行只取水平分量）。 */
    fwdLocal: Pt3;
}
export interface InputFrame {
    /** 左摇杆：x 右+，y 前+（原始幅值，死区由 player 处理）。 */
    walkX: number;
    walkY: number;
    dash: boolean;
    /** snap turn 边沿：+1 = 向左（逆时针）一档，−1 = 向右；0 = 无。 */
    turn: -1 | 0 | 1;
    /** 右摇杆前推（dpad 上）保持中 = teleport 充能。 */
    tpCharge: boolean;
    /** 右摇杆后拉（dpad 下）保持中（冷却/保持判定在 teleport 模块）。 */
    tpBack: boolean;
    /** 充能中左摇杆 dpad 上下**边沿**：发射速度档 ±1。 */
    tierStep: -1 | 0 | 1;
    /** 充能中左摇杆 dpad 左右**边沿**：落地朝向 ±1 档（45°）。 */
    yawStep: -1 | 0 | 1;
    jump: boolean;
    crouch: boolean;
    /** 趴下爬（切换态由适配器管；压过蹲）。 */
    crawl: boolean;
    /** noclip 上/下（A/B 或 Q/E）。 */
    up: boolean;
    down: boolean;
    /** 双击跳（A / 空格）**边沿** = 切换 noclip（Minecraft 约定；user 2026-09-07 VR 首轮反馈）。 */
    noclipToggle: boolean;
    head: HeadFrame;
    /** 瞄准射线（世界坐标）：VR = 手柄 targetRay；flat = 相机/光标射线。null = 没在瞄。 */
    aim: Ray | null;
}
/** 空输入：头在默认那个人的眼高（身体尺寸只从 body.ts 来，这里不另写数）。 */
export declare function emptyInput(eyeHeight?: number): InputFrame;
/** 一帧多步：第 2 步起把边沿类字段清零（同一帧的 turn 不许触发两次）。 */
export declare function stripEdges(f: InputFrame): InputFrame;
export type DpadDir = "none" | "up" | "down" | "left" | "right";
export declare const DPAD: {
    readonly ENTER: 0.6;
    readonly EXIT: 0.4;
    readonly SECTOR_HALF: number;
    readonly HOLD_HALF: number;
};
export declare class Dpad {
    dir: DpadDir;
    /** x 右+，y 前/上+。返回当前方向（含磁滞）。 */
    update(x: number, y: number): DpadDir;
}
/** 方向边沿：dpad 方向从非 d 变成 d 的那一帧返回 true。 */
export declare class DirEdge {
    private was;
    update(dir: DpadDir, d: DpadDir): boolean;
}
/** 按钮边沿（按下瞬间）。 */
export declare class ButtonEdge {
    private was;
    update(pressed: boolean): boolean;
}
/** 双击判定（Minecraft 双击跳切飞行）：两次按下边沿间隔 ≤ windowSec 的第二次返回 true；第三次重新计。 */
export declare class DoubleTap {
    private lastDown;
    private was;
    private windowSec;
    constructor(windowSec?: number);
    /** pressed = 当前按住；now = 单调秒。 */
    update(pressed: boolean, now: number): boolean;
}
/** 保持判定：条件连续成立 ≥ holdSec 的那一刻返回 true（一次），松开重置。 */
export declare class HoldLatch {
    private held;
    private fired;
    private holdSec;
    constructor(holdSec: number);
    update(active: boolean, dt: number): boolean;
    reset(): void;
}
