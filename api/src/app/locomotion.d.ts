import type { Editor } from "../editor/editor.ts";
import { KernelCollisionWorld } from "../editor/collision-world.ts";
import { PlayerSim, type RigPose } from "../player/player.ts";
import { FlatInput } from "../player/flat-input.ts";
import type { InputFrame } from "../player/input.ts";
export type LocomotionMode = "orbit" | "walk" | "xr";
export declare class Locomotion {
    readonly world: KernelCollisionWorld;
    readonly sim: PlayerSim;
    readonly flat: FlatInput;
    private mode;
    private lookPitch;
    private saved;
    private cursor;
    /** 外部输入源（VR）：非 null 时代替键盘。 */
    externalInput: ((dt: number) => InputFrame) | null;
    private editor;
    private canvas;
    constructor(editor: Editor, canvas: HTMLCanvasElement);
    getMode(): LocomotionMode;
    isWalking(): boolean;
    isXR(): boolean;
    /** 上次 VR 站位（视图态；无地期只在内存，A13：进 VR 落在上次站位）。 */
    private lastStance;
    /** 进 XR：输入改由 vr.ts 每帧喂；相机由 XR 写；站位 = 上次站位或轨道相机 target 落地。返回出生点（首帧 reset 用）。 */
    enterXR(read: (dt: number) => InputFrame): {
        pos: {
            x: number;
            y: number;
            z: number;
        };
        heading: number;
    };
    /** 默认出生点（user 2026-09-07：「vr 里出生点是面对正北 +y 的吧，保证一下，以及不要在原点出生，而是能看到原点的地方」）：
     *  原点正南 3 m、面朝 +Y（heading 0 = 北），脚落地面。 */
    defaultSpawn(): {
        pos: {
            x: number;
            y: number;
            z: number;
        };
        heading: number;
    };
    exitXR(): void;
    get noclip(): boolean;
    setNoclip(on: boolean): void;
    /** 进步行模式：落到轨道相机 target 的地面上，朝相机前向。 */
    enterWalk(): void;
    exitWalk(): void;
    toggleWalk(): void;
    /** 鼠标视角（app 手势路由在步行模式下把右键拖喂进来）。返回 false = 不在步行模式，调用方走轨道。 */
    look(dxPx: number, dyPx: number): boolean;
    /** 碰撞世界跟 checkpoint（force = 无视 revision）。 */
    syncWorld(force?: boolean): void;
    /** 每渲染帧：喂输入、步进、写相机（XR 模式相机归 XR，只步进）。 */
    tick(dt: number): void;
    private readFlat;
    pose(): RigPose;
    /** 第一人称：把 rig 姿态写成 OrbitCamera（眼 = headWorld；yaw/pitch 换算见 camera.ts 约定）。 */
    private syncCamera;
    /** 渲染层要的 teleport 弧线（充能中才有）。 */
    teleportArc(): {
        points: {
            x: number;
            y: number;
            z: number;
        }[];
        valid: boolean;
        landing: {
            x: number;
            y: number;
            z: number;
        } | null;
    } | null;
    dispose(): void;
}
