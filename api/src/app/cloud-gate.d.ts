export type GateReason = "expired" | "no-network" | "no-response";
export type RenewResult = {
    kind: "ok";
} | {
    kind: "no-account";
} | {
    kind: "failed";
    code: string | null;
};
export type GateOutcome = "no-gate" | "pass" | "no-login" | "offline" | "offline-kept" | "recent";
/** 文案（§5；CatsUp 孵化中不走 i18n，文案就住这里；原因三句分开，不许写死一句，不含「失败 / 错误」标题和指挥句——test/cloud-gate.test.ts 守）。 */
export declare const GATE_COPY: {
    readonly checkingTitle: "正在核对网盘上的版本…";
    readonly pullingTitle: "正在从网盘更新…";
    readonly escape: "先离线用";
    readonly blockedTitle: "网盘没连上";
    readonly reason: Record<GateReason, string>;
    readonly signIn: "重新登录";
    readonly offline: "离线继续";
    readonly bar: (n: number) => string;
    readonly barReconnecting: "已连上网盘，正在补传…";
    readonly barOpenList: "看列表";
};
/** 静默续签失败的原因码（§1 / §7 ⑧）。库零改 = 库已经把这一行写进 ui.reportError（log 级）：
 *  `[auth] silent token renewal failed (boot-probe): name=… code=… sub=… msg=…`。这里只读它；格式变了 test/cloud-gate.test.ts 对着库的 dist 核，会红。 */
export declare function parseRenewFailure(msg: string): {
    where: string;
    name: string;
    code: string;
    sub: string;
} | null;
/** 要人重新交互的码（微软就是要人回去：刷新令牌到期 / 同意过期）→「登录过期了」；别的（网络、iframe 超时）→「网盘没有回应」。 */
export declare function isInteractionCode(code: string | null): boolean;
export declare function reasonOf(code: string | null, online: boolean): GateReason;
export declare function noteRenewFailureLine(msg: string): {
    where: string;
    code: string;
    sub: string;
} | null;
export declare function takeRenewFailureCode(): string | null;
export interface GateUi {
    showChecking(onEscape: () => void): void;
    showBlocked(reason: GateReason, h: {
        signIn: () => void;
        offline: () => void;
    }): void;
    hide(): void;
}
export interface OfflineBar {
    show(): void;
    reconnecting(): void;
    hide(): void;
}
export interface CloudGateDeps {
    /** 挂了库（有家）？没挂 = 永不闸（文件模式和网盘无关）。 */
    attached(): boolean;
    browserOnline(): boolean;
    /** 静默续签（含首次 initAuth）。 */
    renew(): Promise<RenewResult>;
    /** 登录好之后问云端一次（session 里：干净快进 / 真分叉弹库的面）。抛 = 没问成。 */
    check(g: {
        abandoned: () => boolean;
        onLongWait: () => void;
    }): Promise<void>;
    /** 交互登录（点击的同步栈里调；离页）。 */
    signInInteractive(): void;
    ui: GateUi;
    bar: OfflineBar;
    setUserOffline(v: boolean): void;
    userOffline(): boolean;
    /** 从「离线继续」回来：补传（库的 dirty.pushAll，失败名单进「要处理的」）。 */
    catchUp(): Promise<void>;
    /** 放行之后的常规一串（快进 / 补队列 / 没同步好的提示）。 */
    afterPass(): void;
    note(msg: string): void;
    hardTimeoutMs?: number;
    /** 醒来时如果这么久之内刚核对过，就不再罩（切个标签回来不吃第一下点击）；报告里写明这是和设计稿的一处出入。 */
    recheckMs?: number;
    now?: () => number;
}
export declare class CloudGate {
    private cycle;
    private escapeSignal;
    private escaped;
    private generation;
    private stopTimer;
    private blockedAnswer;
    private blockedReason;
    private lastOkAt;
    private reconnecting;
    private now;
    private d;
    constructor(d: CloudGateDeps);
    /** 罩子在（开机 / 醒来这一轮还没走完）。 */
    isRunning(): boolean;
    /** 这一轮里点了「先离线用」或超时了：迟到的云端结果不许再换字节（session 的 localDirty 问它）。 */
    abandoned(gen: number): boolean;
    /** 库的 offlineEscape 接缝（§4）：这一轮的逃生信号；不在闸门里 = null（走库默认那条通知）。 */
    escapeProbe(): Promise<void> | null;
    /** 罩子上的「先离线用」/ 拉取罩子上的同一个钮。 */
    escape(): void;
    /** 拉取已经开始 / 库的面弹出来了：人在看着，别拿超时打断（它们各有自己的出口）。 */
    pauseHardTimer(): void;
    private goOffline;
    /** 开机 / 醒来走这里。before = 本地那段（恢复上次的模型），在罩子底下跑完再问云端（app-store.ts 的开机顺序契约）。 */
    run(trigger: "boot" | "wake", opts?: {
        before?: () => Promise<void>;
    }): Promise<GateOutcome>;
    private runCycle;
    private attempt;
    private askBlocked;
    /** 闸门上点了「重新登录」但没跳走（登录起跳被拒）：把那张面摆回去，别留一个没罩子的半截状态。 */
    reshowBlocked(): void;
    /** 网回来了（window online）/ 登录落地了（auth 事件）：闸开着就重新核一次；选了离线就静默补传；都不是 = 没事。 */
    onCloudMaybeBack(): void;
    /** 从「离线继续」回来。闸只在开机 / 醒来弹一次：这里失败就是条还在，不再弹。 */
    reconnect(): Promise<boolean>;
}
