import type { Editor } from "../editor/editor.ts";
import { KernelCollisionWorld } from "../editor/collision-world.ts";
import { PlayerSim, type RigPose } from "../player/player.ts";
import { FlatInput } from "../player/flat-input.ts";
import type { InputFrame } from "../player/input.ts";
export type LocomotionMode = "orbit" | "walk" | "xr";
/** 步行的几个阶段（mode = walk 时 walk / edit；放置时 mode 还是 orbit）。 */
export type WalkPhase = "off" | "place" | "walk" | "edit";
/** 眼高的默认 / 上下限（米；马前炮可调）。 */
export declare const EYE_DEFAULT: number, EYE_MIN = 0.3, EYE_MAX = 5;
export declare class Locomotion {
    readonly world: KernelCollisionWorld;
    readonly sim: PlayerSim;
    readonly flat: FlatInput;
    private mode;
    private lookPitch;
    private saved;
    private cursor;
    private phase;
    /** 放置的眼高（马前炮；落下去以后就是这个人的身高）。 */
    eyeHeight: number;
    /** 悬停处的放置结果（画虚影用）。 */
    private ghost;
    /** 自己为了原地编辑放开鼠标（区别于 Esc 被浏览器放开）。 */
    private unlockForEdit;
    /** 阶段变了（app 刷新上方那颗按钮 / 提示）。 */
    onPhase: (() => void) | null;
    /** 触屏摇杆（touch-controls.ts）：FPS 时和键盘合并（推得远的那个算、按钮取或）。 */
    touch: (() => {
        walkX: number;
        walkY: number;
        dash: boolean;
        jump: boolean;
        crouch: boolean;
    }) | null;
    /** 外部输入源（VR）：非 null 时代替键盘。 */
    externalInput: ((dt: number) => InputFrame) | null;
    private editor;
    private canvas;
    constructor(editor: Editor, canvas: HTMLCanvasElement);
    walkPhase(): WalkPhase;
    isPlacing(): boolean;
    /** FPS 进行中（不是原地编辑）：键盘归走路，工具键不响应。 */
    isFps(): boolean;
    isEditInPlace(): boolean;
    private setPhase;
    /** 视图菜单「步行相机」：进放置（先点一下落在哪）。 */
    beginPlace(): void;
    cancelPlace(): void;
    /** 眼高改了：虚影跟着重画。 */
    refreshGhost(): void;
    private updateGhost;
    /** 放置的虚影（渲染用；不在放置 = null）。 */
    placeGhost(): {
        feet: {
            x: number;
            y: number;
            z: number;
        };
        radius: number;
        height: number;
        ok: boolean;
    } | null;
    placeWhy(): string | null;
    private commitPlace;
    /** 回 FPS（放置落下 / 原地编辑里点「继续走」）：要一次用户点击才锁得上鼠标，这两个入口都是点击。 */
    resumeWalk(): void;
    /** Tab：原地编辑（镜头钉住、鼠标放出来、键盘归工具）。 */
    editInPlace(): void;
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
    /** 直接进步行（不经放置；测试 / 探针用）：落到轨道相机 target 的地面上，朝相机前向。 */
    enterWalk(): void;
    /** 离开步行：回到进来之前的视角（什么都没发生过）。放置中 = 取消放置。 */
    exitWalk(): void;
    toggleWalk(): void;
    /** 鼠标视角（app 手势路由在步行模式下把右键拖喂进来）。返回 false = 不在步行模式，调用方走轨道。 */
    look(dxPx: number, dyPx: number): boolean;
    /** 触屏转头（弧度；正 = 往右 / 往下看）。 */
    lookRad(dYaw: number, dPitch: number): void;
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
