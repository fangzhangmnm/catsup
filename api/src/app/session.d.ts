import type { Editor } from "../editor/editor.ts";
import { type RefFileDoc, type RefPanelDoc, type ReferencesDoc } from "../format/document.ts";
import type { Xform } from "../scene/xform.ts";
interface FSHandle {
    readonly name: string;
    createWritable(): Promise<{
        write(b: Blob): Promise<void>;
        close(): Promise<void>;
    }>;
    getFile(): Promise<File>;
}
export declare const supportsSavePicker: () => boolean;
export declare const supportsOpenPicker: () => boolean;
export type DocHome = {
    kind: "gallery";
    path: string;
} | {
    kind: "file";
    handle: FSHandle | null;
    fileName: string;
} | {
    kind: "transient";
    name?: string;
};
/** 参考窗的接缝（src/app/reference-host.ts 满足它）：牌组跟文件走（CATSUP_references + desk.refPanel），加删卡 = rev +1 = 脏；不进撤销。 */
export interface RefsPort {
    files(): RefFileDoc[];
    rev(): number;
    settled(): Promise<void>;
    count(): number;
    panel(): RefPanelDoc | null;
    apply(refs: ReferencesDoc, panel: RefPanelDoc | null, opts?: {
        tooNew?: boolean;
    }): void;
}
export interface SessionDeps {
    editor: Editor;
    /** 参考窗（缺 = 没有参考窗：文件里的牌组原样带着写回）。 */
    refs?: RefsPort;
    captureThumbnail: () => {
        mimeType: string;
        bytes: Uint8Array;
    } | null;
    /** 风格 / 屏幕跟文件走（desk 1.3，T86）：载入 / 新建后套上（null = 用默认）。app 认不出的 id 当没有。 */
    applyView?: (style: string | null, screen: string | null) => void;
    onHomeChanged: () => void;
    setStatus: (text: string, error?: boolean) => void;
    online: () => boolean;
    /** 口令（2026-10-29 周账 F-123；政策在 crypto-state / unlock.ts，这里只用）。**弹面板的都在 busy 外调。** */
    crypto: {
        ensureUnlocked: (path: string) => Promise<boolean>;
        ensureNewPassword: () => Promise<string | null>;
        isFreshPasswordSetup: () => boolean;
        rollbackFreshPassword: () => void;
        setPassword: (pw: string | null) => void;
        getPassword: (path: string | null) => string | null;
        /** 本地加密文件：全量解，返回验过的口令 + 明文；取消 = null。 */
        unlockImportedContainer: (blob: Blob) => Promise<{
            pw: string;
            plain: Blob;
        } | null>;
        isEncryptedBlob: (bytes: Uint8Array) => Promise<boolean>;
    };
}
export { bareName, docSuffixOf, fullName, isDocName } from "./doc-names.ts";
/** smart save 钮的状态集（WeebPaint save-status 同形）：none = 没东西可存 · dirty = 内存脏 · local-only = 已存本机/文件、云不可达 ·
 *  saving = 在飞 · cloud-off = 未配置云 · unpushed = 已落本机但云腿没成（终态，非在飞）· synced = 上次保存已同步。 */
export type SaveState = "none" | "dirty" | "local-only" | "saving" | "cloud-off" | "unpushed" | "synced";
export declare class Session {
    private d;
    home: DocHome;
    saving: boolean;
    /** 还原出厂（factory-reset.ts）停机旗：之后 dirty() 恒 false、save() / flush 全 no-op、tick 已停——页面随后 reload。 */
    private halted;
    /** 图库家：上次保存的云腿没成（离线 / 未登录 / 冲突取消 / 落地未确认）——下次显式保存再推。 */
    pushPending: boolean;
    /** 正在编辑的图库模型是加密的（打开 / 加密 / 解密后刷新；换家清）。锁着（内存没口令）时保存会如实拒。 */
    encrypted: boolean;
    /** 2026-10-26：这份和云端没对上、要人选用哪边（自动保存撞上时库想弹面，被 conflictGate 挡成横幅）。cloudState = 库说的云端此刻状态（changed / unchanged / absent / never）。
     *  清的时机：推上去了（save / resolveActive 成功）、换了文档。横幅本身在 main（onAttentionChanged）。 */
    attention: {
        cloudState: string | null;
    } | null;
    markAttention(cloudState: string | null): void;
    /** lazyblank（WeebPaint P1.5）：图库家 + 日期名只在内存，文件还没建；首笔有内容 → adoptLazy 翻 false。空白期永不落盘、回执条不写。 */
    lazy: boolean;
    /** 首存必须 mode:"new"（撞名不静默覆盖）直到第一次真落盘成功；失败后 30 s 自动保存重试仍带 new。 */
    private createPending;
    /** lazyblank 安家中（消歧名字）；save / leaveGate 先等它落定，别把字节写到还没定的名字上。 */
    private adopting;
    private refreshInFlight;
    private savedRevision;
    private lastSeenRevision;
    /** 参考窗牌组的修订号（加删卡；视图态不算）：存过的 / 看到过的。dirty = 几何改了 ∨ 牌组改了。 */
    private savedRefRev;
    private lastSeenRefRev;
    private lastEditAt;
    private loaded;
    private timer;
    /** T-crash 行李牌（file / transient 家才有；gallery 家 = null）+ 上次快照的 revision。 */
    private luggage;
    private snapRevision;
    private snapRefRev;
    /** 图库当前夹（新建自动安家用；gallery-host 同步）。 */
    currentDir: string;
    /** 桌面态（CATSUP_desk；WeebPaint desk 同款）：☰ 停在哪页等跟文件走的编辑器状态。载入时从文件来、新建 reset、存盘时顺手捞走；改它不标脏
     *  （user 2026-07-14 在 WeebPaint 接受的代价：只切页不画不存就退出 → 下次开 revert 到上次保存的）。 */
    private desk;
    menuTab(key: string): string | null;
    /** 风格 / 屏幕跟文件走（desk 1.3，T86）：改它不标脏（看法不是内容），下次存盘顺手带走。 */
    setView(v: {
        style?: string | null;
        screen?: string | null;
    }): void;
    private applyDeskView;
    setMenuTab(key: string, tab: string): void;
    /** 读取侧三级拍子提示（家族纪律：minor 更新提示一次、patch 静默；desk 太新 = 原字节带回 + 默认显示）。每次载入说一次。 */
    private noteFormat;
    constructor(d: SessionDeps);
    dirty(): boolean;
    private refRev;
    /** 参考窗跟着文件换：目录 + 窗交给接缝，牌组修订号对齐成「已存」（载入不是改动）。 */
    private applyRefs;
    displayName(): string;
    /** file / transient 家 且脏（beforeunload 承重层用）。 */
    dirtyLocalHome(): boolean;
    private localHomeKind;
    /** lazyblank 且还没动过（boot 登录后重试恢复 / 挂库不塞空白 用）。 */
    isUntouchedLazyBlank(): boolean;
    private hasContent;
    /** smart save 钮的状态（顺序 = WeebPaint computeSaveState：saving → dirty → cloud-off → unpushed/synced → local-only）。 */
    saveState(): SaveState;
    /** 钮的 tooltip 文案（状态 + 住哪）。 */
    saveTitle(): string;
    /** 编辑器每次 checkpoint 变化（commit / undo / redo / load）同步进来（main 的 editor.host.changed）：
     *  刷徽章 + **lazyblank 首笔安家**（WeebPaint session-state onChange 钩子同形：真出现内容才绑身份）。 */
    noteChange(): void;
    private tick;
    private mintLuggage;
    /** 释放行李牌（离开 file / transient 家的每条路都要过这）：正常关闭即删（pending-adoption 由库内拒删）。 */
    private dropLuggage;
    /** 盲快照：与保存同一 encode 字节，同一张牌覆盖写单帧。state="pending-adoption" = 登录 redirect 前留声（pagehide 不焚）。 */
    snapshot(state?: "crash" | "pending-adoption"): Promise<boolean>;
    /** 登录 redirect 前：脏的 file / transient 模型留 pending-adoption 帧（页面将死但不是关闭；回来 crash-recovery 自动领养）。 */
    needsRedirectSnapshot(): boolean;
    prepareForRedirect(): Promise<void>;
    /** pagehide（非 bfcache）= 用户过完挽留门选择离开 → 快照焚；真 crash 不触发 pagehide → 快照幸存。 */
    onPageHide(persisted: boolean): void;
    /** 崩溃安全 flush（WeebPaint es.start 三件：visibilitychange:hidden / blur / pagehide(!persisted)）：图库家脏 → 只落本地不推
     *  （页面要走，push 未必完成；push-pending 留着下次显式保存推）；file / transient 家脏 → 盲快照。不等空闲、不看手势（encode 读的是
     *  checkpoint = 上次 commit 的世界，手势中途也一致）。fire-and-forget：卸载期没有时间预算。 */
    flushForHide(): void;
    /** 领养崩溃影子 / redirect 流产者：挂了图库 → 新身份进图库（`<名>-恢复`，撞名追加序号）并保存；否则 transient（带名、脏）。
     *  领养出的模型视为 dirty 直到首次真保存（Blockbench #2684/#2003）。gate=false 用于 boot 自动领养（当前是刚开机的空场景）。 */
    adoptRecovered(bytes: Uint8Array, name: string, opts: {
        gate: boolean;
    }): Promise<"gallery" | "transient" | null>;
    /** 这份文件现在锁着没有。 */
    locked(): boolean;
    /** 锁上 / 解锁。有家（图库 / 本地文件）就顺手存一次，让锁跟着文件走；无地 = 住内存、导出时带走。 */
    setLocked(on: boolean): Promise<void>;
    private encode;
    /** desk 存盘形状：参考窗的窗以接缝为准（开过窗才有；这个文件里没开过 = 文件里原来那份）。 */
    private deskForSave;
    /** 2026-10-26：编辑器横幅 / 保存钮上的「处理…」= 对正在编辑的这份主动叫库的面（store `file.resolve()` 三选一；app 不传答案）。
     *  took-cloud → 本地已换成云端那份 → 整份重载（否则下次保存又把旧画布盖回去）；pushed → 对上了；cancelled → 横幅留着。 */
    resolveActive(): Promise<"pushed" | "took-cloud" | "cancelled" | "other">;
    private adopt;
    /** 家的唯一写点（= WeebPaint _setActive）：行李牌 / store activeIdentifier / **回执条**（@internal/gallery resume-slate）都从这收口。
     *  回执条语义（WeebPaint 同）：图库家（非 lazy）→ {doc}；文件家 → {gallery}（句柄跨刷新不可恢复，下次落图库）；transient / lazyblank 不碰
     *  （空白不算「上次开着的画」）；未挂库时回执条无意义，一律不碰。 */
    private setHome;
    /** 图库覆盖层开 / 关时的回执条（WeebPaint：退到图库 = {gallery}；回到图库家文档 = {doc}；lazyblank / 本地家底下 → 停在 {gallery}）。 */
    slateGalleryOpened(): void;
    slateGalleryClosed(): void;
    /** 撞名消歧：`base`、`base-1`、`base-2`…（store files.occupied 本机 ∪ 云端）。 */
    private freeName;
    /** lazyblank 新场景（WeebPaint beginLazyBlank）：空内核 + 图库家日期名只在内存；不建文件、不写回执条；首笔有内容 → noteChange 安家。
     *  boot 的「可画新场景」落点（首次 / 恢复失败 / 崩溃断路）+ 挂库时的「新建」。 */
    beginLazyBlank(): void;
    /** lazyblank 首笔安家：消歧名字 → 身份落定（回执条从此指它）→ 首存 mode:"new"。名字落定与字节落盘分两步：
     *  `adopting` 只覆盖前者，后者是普通 save（失败留 dirty + createPending，30 s 自动保存重试）。 */
    private adoptLazy;
    /** 新建：脏则挽留；挂了图库 → lazyblank（不建文件，首笔安家），否则 transient。 */
    newDoc(): Promise<boolean>;
    /** boot 恢复端口（restoreLastSession.restore）：无挽留门、无状态行（端口自己报）；本地优先——boot 在 initAuth 之前调，
     *  store 此刻视为未登录 → 直接读本地副本零网络（ai-docs/20260922 §1.3）。返回是否装入了字节。 */
    restore(path: string): Promise<boolean>;
    /** 从图库打开（本地优先；没本地且离线 → 诚实报）。 */
    openFromGallery(path: string): Promise<boolean>;
    /** 给正在编辑的图库模型加密（明文 → 容器，先本地后云 If-Match；库做）。无地 / 本地文件 = 先安家。口令：已解锁复用、验证器在就校验、都没有就设新的。 */
    encryptCurrent(): Promise<boolean>;
    /** 解除加密（容器 → 明文，先本地后云）。先问口令（不在内存就弹）。 */
    decryptCurrent(): Promise<boolean>;
    /** 登录落地 / 回线 / 回前台的**显式快进**（WeebPaint refreshOpenDoc，P1 2026-08-25）：图库家 ∧ 干净 ∧ 云可达 → pullIfClean；
     *  云端更新且本地干净 → 库拉字节（期间 busy 遮罩：别让用户在换字节的半路落笔）→ 同名重开。脏 / push-pending / lazyblank 一律不快进
     *  （分歧留给保存的 412 冲突面）。库侧 localDirty 二次核对 fetchMeta 期间有没有落笔。 */
    refreshOpenDoc(): Promise<void>;
    /** 打开本地文件字节（拖入 / 文件输入 / FSA 句柄）。 */
    openLocalBytes(bytes: Uint8Array, fileName: string, handle: FSHandle | null): Promise<boolean>;
    openLocalPicker(): Promise<boolean>;
    /** 保存 = 送回家。transient 显式保存 = 安家仪式（FSA 另存 / 下载兜底）；implicit（自动 / 离开）在 transient 上是 noop。
     *  localOnly：崩溃安全 flush 用，只落本地不推（push-pending 留着）。 */
    save(opts?: {
        implicit?: boolean;
        localOnly?: boolean;
    }): Promise<boolean>;
    /** 另存到磁盘（安家仪式）：FSA → 文件家；无 FSA → 下载（不安家、不清 dirty）。 */
    settleToFile(): Promise<boolean>;
    /** 导出工程文件（导出设计稿 §3；账本 UX39）：.catsup = 和保存写的同一份 encode()，工程原样一个字节不改（参考图 / 尺规 / 硬表面数据都在）。永不清 dirty；下载开始 = 责任移交。 */
    exportProject(): string;
    /** 导出模型 .glb（导出设计稿 §4 / §5）：给别的软件看的烤好的模型——只写 glTF core，不是工程备份。only = 只导这几份物体（定义 id + 世界变换）。永不清 dirty。 */
    exportModelGlb(opts: {
        textures: boolean;
        lines: boolean;
        only?: readonly {
            def: number;
            xform: Xform;
            name?: string;
        }[];
    }): {
        name: string;
        bytes: number;
    };
    private download;
    /** 离开当前文档前的挽留：图库家 = 自动保存（WeebPaint 图库模式 UX）；文件家 / transient 且脏 = 三键。 */
    leaveGate(): Promise<boolean>;
    renameActive(): Promise<string | null>;
    /** 图库把活动文档改名/移动了（onRenamed / 图库动词）→ 换身份。 */
    setActivePath(path: string): void;
    offloadDoc(path: string): Promise<void>;
    /** 去图库前：图库家的脏文档落本地（WeebPaint：退出自动 ctrl+s）。 */
    flushLocal(): Promise<void>;
    /** 挂图库的用户手势时刻（首次开图库 / 登录 / 首存）：persist 表态落点。 */
    static persistOnGesture(): void;
    /** 还原出厂 wipe 前收口（factory-reset.ts beforeWipe）：停 1 s tick（自动保存 / 盲快照）、放掉行李牌、家置成干净 transient——之后谁都别再写 store / crash-store / device-kv，
     *  它们马上要被清；beforeunload 看 dirty() 也不再挽留。不走 setHome（它会写回执条，而回执条正要被清）。 */
    haltForReset(): void;
}
