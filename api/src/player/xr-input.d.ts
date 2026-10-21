import { type HeadFrame, type InputFrame } from "./input.ts";
import { type RigPose, type Vec3 } from "./player.ts";
import type { Ray } from "./world-query.ts";
export interface Quat {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface RefPose {
    position: {
        x: number;
        y: number;
        z: number;
    };
    orientation: Quat;
}
/** 参考系（Y 上）向量 → rig 局部（Z 上）。 */
export declare const refToRig: (v: {
    x: number;
    y: number;
    z: number;
}) => Vec3;
/** 四元数旋转向量。 */
export declare function rotateByQuat(q: Quat, v: {
    x: number;
    y: number;
    z: number;
}): Vec3;
/** 姿态的前向（参考系 −Z）→ rig 局部。 */
export declare const forwardRig: (q: Quat) => Vec3;
export declare const upRig: (q: Quat) => Vec3;
/** rig 局部点 → 世界（含 heading 与 rig 原点）。 */
export declare function rigToWorld(rig: RigPose, p: Vec3): Vec3;
/** rig 局部方向 → 世界方向（只转不平移）。 */
export declare function rigDirToWorld(rig: RigPose, d: Vec3): Vec3;
/** 参考系姿态 → 世界射线（targetRay：原点 + 前向）。 */
export declare function poseRayWorld(pose: RefPose, rig: RigPose): Ray;
/** 头显姿态 → HeadFrame（rig 局部）。 */
export declare function headFrameOf(pose: RefPose): HeadFrame;
export interface XRHandState {
    present: boolean;
    ray: Ray | null;
    gripRay: Ray | null;
    trigger: boolean;
    triggerValue: number;
    squeeze: boolean;
    stickPress: boolean;
    a: boolean;
    b: boolean;
    axes: {
        x: number;
        y: number;
    };
}
/** 本帧解析出的 XR 输入（InputFrame 之外 app 层要用的：两手状态 + 撤销/重做边沿）。 */
export interface XRFrameInput {
    input: InputFrame;
    left: XRHandState;
    right: XRHandState;
    undoEdge: boolean;
    redoEdge: boolean;
    head: RefPose | null;
}
export declare class XRInput {
    private dpadL;
    private dpadR;
    private turnL;
    private turnR;
    private tierUp;
    private tierDown;
    private yawL;
    private yawR;
    private xEdge;
    private yEdge;
    private dblA;
    private lastHead;
    /** 每 XR 帧一次：读 session.inputSources 与头显姿态，产 InputFrame（世界射线按当前 rig 姿态算）。 */
    read(session: XRSession, frame: XRFrame, ref: XRReferenceSpace, rig: RigPose, noclip: boolean, now?: number): XRFrameInput;
}
/** 震一下（标准 pulse；没有 actuator 静默）。 */
export declare function pulse(session: XRSession | null, hand: "left" | "right" | "both", intensity?: number, ms?: number): void;
