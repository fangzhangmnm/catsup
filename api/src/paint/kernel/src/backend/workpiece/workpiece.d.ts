import type { UndoStack, RecordData, WorkpieceComponent } from "./undo-stack.ts";
/** 注册进 workpiece 的组件还须带 collector 面（token 协作；ADR-0008 §1）。 */
export interface CollectorComponent extends WorkpieceComponent {
    /** commit/cancel 时打包并清空本 token 的 collector；null = 本 token 没被摸。 */
    sealRecord(): RecordData | null;
}
export type UndoPolicy = "recorded" | "silent";
export interface WorkpieceOpts {
    /** 不传 = 该 workpiece 无 undo（写照走令牌，record 即弃）。 */
    undo?: UndoStack;
    /** FR 兜底报警：令牌未 commit/cancel 就被 GC（泄漏 bug）。默认 console.error。 */
    onTokenLeak?: (label?: string) => void;
}
export interface WorkpieceChangeEvent {
    kind: string;
    recorded: boolean;
}
/** 写门拒绝了（见 Workpiece.writeGate）：这幅画此刻不许改。不是失败，是契约——壳把它翻成「锁闪一下」，不当成报错横幅。 */
export declare class WriteRefusedError extends Error {
    reason: string;
    constructor(reason: string, label?: string);
}
export declare class Workpiece {
    private _undo;
    private _registry;
    private _tokenRef;
    private _tokenOpen;
    private _touched;
    private _commitVersion;
    private _lastSaved;
    private _silentDirty;
    private _listeners;
    private _onTokenLeak;
    private _fr;
    constructor(opts?: WorkpieceOpts);
    /** 写门的否决口（2026-11-08，家族「源文件原则上只读」；组合根注入，默认没有）：返回原因 = 此刻不许做这个操作（这幅画锁着）。
     *  **label = 操作的名字**——门按它分类（app 侧 src/edit-lock-table.ts：列为「看法」的放行，其余拒）。问门的地方有三处，都经 assertWritable：
     *  开令牌（begin）、并进一个已经开着的令牌的每个微步（History.withPoint）、撤销 / 重做（History 拿要翻的那一步的标签问）。 */
    writeGate: ((label?: string) => string | null) | null;
    /** 问一次门：不让 → 抛 WriteRefusedError。不开令牌、不改任何状态。 */
    assertWritable(label?: string): void;
    /** 已有开着的令牌 → throw（泄漏查获点）；泄漏者已被 GC → FR 报警路线 + 此处自愈回滚后继续。 */
    begin(label?: string): WriteToken;
    /** 开着的令牌存在？（substrate 观察者的收集门：LayerTiles 观察 tile 换手时据此判断收不收。） */
    get tokenOpen(): boolean;
    /** 单调：每次 step 应用（commit/undo/redo/cancel）+1 → 渲染缓存失效。 */
    get commitVersion(): number;
    /** 位置身份：= 游标处 step id（无 undo workpiece 恒 0）→ dirty 派生。 */
    get stateVersion(): number;
    /** silent 组件（或无 undo workpiece 的任何组件）动过未存。 */
    get silentDirty(): boolean;
    /** 持久层存盘后调：记 lastSaved + 清 silentDirty。 */
    markSaved(): void;
    isDirty(): boolean;
    /** 统一变更信号（histchange/sidecarchange 后继）。commit/cancel 按 touched 发、undo/redo 按 entries 发。 */
    onChange(cb: (e: WorkpieceChangeEvent) => void): () => void;
    /** 子类协作面（load 清栈用）；app 侧栈引用走构造时自己传入的 UndoStack。 */
    protected get undoStack(): UndoStack | null;
    protected register(c: CollectorComponent, policy: {
        undo: UndoPolicy;
    }): void;
    /** component 写路径守门：写 substrate 前必调（无开着的令牌 → throw；同时登记 touched）。 */
    _componentWrite(c: CollectorComponent): void;
    /** WriteToken.commit 的后半场（token 关门后调）。 */
    _commitToken(token: WriteToken, label?: string, hint?: (dir: "undo" | "redo") => void): void;
    /** WriteToken.cancel 的后半场：倒序自反 swap 回滚，无痕（不入栈、不动 silentDirty）。 */
    _cancelToken(token: WriteToken): void;
    /** 不可恢复路径协作面（History unrecoverable / clear 用）：关门 + 各 collector 弃置——
     *  不回滚（状态已不可信，回滚可能二次伤害），只释放句柄防泄漏。 */
    _abandonToken(token: WriteToken): void;
    private _assertCurrent;
    private _rollbackTouched;
    private _emit;
}
export declare class WriteToken {
    private _wp;
    private _label?;
    private _open;
    /** 仅 Workpiece.begin 构造（模块内协作；外部拿不到 ctor 入口）。 */
    constructor(wp: Workpiece, label?: string);
    /** commit/cancel 后再写 → throw（_componentWrite 查 open）。 */
    get open(): boolean;
    commit(opts?: {
        label?: string;
        hint?: (dir: "undo" | "redo") => void;
    }): void;
    /** 各被摸 collector 倒序回滚，无痕。 */
    cancel(): void;
    /** 不可恢复路径：弃置（不回滚不入栈，只释放 record）。app 正常流禁用——只给 unrecoverable 兜底。 */
    abandon(): void;
}
