import type { Editor } from "../editor/editor.ts";
import type { Locomotion } from "./locomotion.ts";
import type { HudModel } from "./ui/hud-model.ts";
import type { NoticeLevel } from "./ui/notice.ts";
export interface VROpts {
    editor: Editor;
    locomotion: Locomotion;
    hud: HudModel;
    leftHanded: () => boolean;
    /** 支持性/会话态变了（菜单刷新、循环起停）。 */
    onChange: () => void;
    /** dev 诊断（英文随意）。 */
    log?: (msg: string) => void;
}
export declare class VR {
    private supported;
    private presenting;
    private xrInput;
    private frameIn;
    private firstFrame;
    private spawn;
    private pendingResetYaw;
    private resetAttached;
    private pointer;
    private trigWas;
    private toolDown;
    private panelPressId;
    private holdT;
    private holdStage;
    private panel;
    private lastHint;
    private opts;
    constructor(opts: VROpts);
    isSupported(): boolean;
    isPresenting(): boolean;
    /** 必须在用户手势里同步调用（requestSession 需要 transient activation）。 */
    enter(): void;
    /** 退出（面板/菜单）：end() 走标准路径；Quest 残留「Immersive XR is still running in the background」横幅案（2026-09-07）→ 两条路径各记日志，真机对照。 */
    exit(): void;
    private exitRequested;
    private onStart;
    private onEnd;
    /** 模型变了（工具/选区/撤销栈/状态行）→ 面板重画。 */
    invalidatePanel(): void;
    private toastTimer;
    /** 字幕位 toast（与桌面 notice 同一份文案；不在会话中 = 无事，DOM toast 已经在）。 */
    toast(text: string, level?: NoticeLevel): void;
    /** 每 XR 帧（渲染循环里、editor.draw 之前）。 */
    tick(dt: number): void;
    /** 选择工具：阶段长按（0.3 s 一震 = 膜 + 环边；0.6 s 二震 = 连通体；松手结算）；轻点 = 单选。 */
    private selectTick;
    private attachReset;
}
