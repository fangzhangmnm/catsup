// cloud-gate.ts —— 网盘掉登录 / 没网的闸门状态机（家族设计稿 ai-docs/20261103-cloud-gate-design.md §3；纯逻辑，端口注入，node 能测）。
//   created 2026-11-03 by Claude Opus 5.5（工单 C）。库零改：只用库已有的 auth / pullIfClean / open / offlineEscape / isOnline。
//
//   开机 / 醒来（挂了库）→ 摆出本机那份 + 罩住 + 「先离线用」→ 静默续签 → 问云端一次
//     · 登录好 ∧ 云端没动 / 干净快进 → 放行
//     · 登录好 ∧ 真分叉 → 库的面（面在 session 的 check 里弹，这里只是等它）
//     · 这台设备上没有账号（退出登录过 / 从没登录）→ 放行，不当登录墙（§9）
//     · 续签失败 ∨ 没网 ∨ 超时 → 闸「网盘没连上」→「重新登录」/「离线继续」
//     · 点了「先离线用」/「离线继续」→ 放行 + 常驻条；网回来 / 续签成功 → 补传 → 条收掉；闸只在开机 / 醒来弹一次
//   每一个等云端的时刻都有出口：按钮从第一帧就在；问云端有硬超时；拉取和面的等待不算超时（它们各有自己的出口）。

export type GateReason = "expired" | "no-network" | "no-response";
export type RenewResult = { kind: "ok" } | { kind: "no-account" } | { kind: "failed"; code: string | null };
export type GateOutcome = "no-gate" | "pass" | "no-login" | "offline" | "offline-kept" | "recent";

/** 文案（§5；CatsUp 孵化中不走 i18n，文案就住这里；原因三句分开，不许写死一句，不含「失败 / 错误」标题和指挥句——test/cloud-gate.test.ts 守）。 */
export const GATE_COPY = {
  checkingTitle: "正在核对网盘上的版本…",
  pullingTitle: "正在从网盘更新…",
  escape: "先离线用",
  blockedTitle: "网盘没连上",
  reason: { expired: "登录过期了", "no-network": "现在没有网络", "no-response": "网盘没有回应" } as Record<GateReason, string>,
  signIn: "重新登录",
  offline: "离线继续",
  bar: (n: number): string => (n > 0 ? `离线 · 还有 ${n} 份没传上去` : "离线"),
  barReconnecting: "已连上网盘",
  barOpenList: "看列表",
} as const;

/** 静默续签失败的原因码（§1 / §7 ⑧）。库零改 = 库已经把这一行写进 ui.reportError（log 级）：
 *  `[auth] silent token renewal failed (boot-probe): name=… code=… sub=… msg=…`。这里只读它；格式变了 test/cloud-gate.test.ts 对着库的 dist 核，会红。 */
export function parseRenewFailure(msg: string): { where: string; name: string; code: string; sub: string } | null {
  const m = /^\[auth\] silent token renewal failed \(([^)]*)\): name=(\S*) code=(\S*) sub=(\S*)/.exec(msg);
  return m ? { where: m[1], name: m[2], code: m[3], sub: m[4] } : null;
}
/** 要人重新交互的码（微软就是要人回去：刷新令牌到期 / 同意过期）→「登录过期了」；别的（网络、iframe 超时）→「网盘没有回应」。 */
export function isInteractionCode(code: string | null): boolean {
  return !!code && /^(login_required|interaction_required|consent_required|InteractionRequiredAuthError|no_tokens_found|refresh_token_expired|bad_token)$/.test(code);
}
export function reasonOf(code: string | null, online: boolean): GateReason {
  if (!online) return "no-network";
  return isInteractionCode(code) ? "expired" : "no-response";
}

/** 最近一次静默续签失败（store-ui 从库的日志行收进来；renew 取走）。只在内存。 */
let lastRenewFailure: { where: string; name: string; code: string; sub: string } | null = null;
export function noteRenewFailureLine(msg: string): { where: string; code: string; sub: string } | null {
  const f = parseRenewFailure(msg);
  if (f) lastRenewFailure = f;
  return f;
}
export function takeRenewFailureCode(): string | null {
  const c = lastRenewFailure ? (lastRenewFailure.code !== "?" ? lastRenewFailure.code : lastRenewFailure.name) : null;
  lastRenewFailure = null;
  return c;
}

export interface GateUi {
  showChecking(onEscape: () => void): void;
  showBlocked(reason: GateReason, h: { signIn: () => void; offline: () => void }): void;
  hide(): void;
}
export interface OfflineBar { show(): void; reconnecting(): void; hide(): void }
export interface CloudGateDeps {
  /** 挂了库（有家）？没挂 = 永不闸（文件模式和网盘无关）。 */
  attached(): boolean;
  browserOnline(): boolean;
  /** 静默续签（含首次 initAuth）。 */
  renew(): Promise<RenewResult>;
  /** 登录好之后问云端一次（session 里：干净快进 / 真分叉弹库的面）。抛 = 没问成。 */
  check(g: { abandoned: () => boolean; onLongWait: () => void }): Promise<void>;
  /** 交互登录（点击的同步栈里调；离页）。 */
  signInInteractive(): void;
  ui: GateUi;
  bar: OfflineBar;
  setUserOffline(v: boolean): void;
  userOffline(): boolean;
  /** 从「离线继续」回来：把没落本机的落下，然后问一次要不要传（规则书 §1 第 15 条；不许不问就推）。 */
  catchUp(): Promise<void>;
  /** 放行之后的常规一串（快进 / 补队列 / 没同步好的提示）。 */
  afterPass(): void;
  note(msg: string): void;
  hardTimeoutMs?: number;
  /** 醒来时如果这么久之内刚核对过，就不再罩（切个标签回来不吃第一下点击）；报告里写明这是和设计稿的一处出入。 */
  recheckMs?: number;
  now?: () => number;
}

const HARD_TIMEOUT_MS = 8000;   // 设计稿 §4；艺术类 app 不要更短
const RECHECK_MS = 30_000;

interface Deferred<T> { promise: Promise<T>; resolve: (v: T) => void }
const deferred = <T>(): Deferred<T> => { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };
type Attempt = { k: "pass" } | { k: "no-account" } | { k: "escaped" } | { k: "blocked"; reason: GateReason };

export class CloudGate {
  private cycle: Promise<GateOutcome> | null = null;
  private escapeSignal: Deferred<void> | null = null;
  private escaped = false;
  private generation = 0;           // 每次尝试一个代号：超时 / 逃生之后迟到的结果作废
  private stopTimer: (() => void) | null = null;
  private blockedAnswer: Deferred<"retry" | "offline"> | null = null;
  private blockedReason: GateReason | null = null;
  private lastOkAt = -Infinity;
  private reconnecting = false;
  private now: () => number;
  private d: CloudGateDeps;   // 不用参数属性：node 的类型剥离不认（测试直跑 .ts）

  constructor(d: CloudGateDeps) { this.d = d; this.now = d.now ?? (() => Date.now()); }

  /** 罩子在（开机 / 醒来这一轮还没走完）。 */
  isRunning(): boolean { return this.cycle !== null; }
  /** 这一轮里点了「先离线用」或超时了：迟到的云端结果不许再换字节（session 的 localDirty 问它）。 */
  abandoned(gen: number): boolean { return this.escaped || gen !== this.generation; }
  /** 库的 offlineEscape 接缝（§4）：这一轮的逃生信号；不在闸门里 = null（走库默认那条通知）。 */
  escapeProbe(): Promise<void> | null { return this.cycle ? (this.escapeSignal?.promise ?? null) : null; }

  /** 罩子上的「先离线用」/ 拉取罩子上的同一个钮。 */
  escape(): void {
    if (this.cycle && this.escapeSignal) { this.escaped = true; this.escapeSignal.resolve(); this.d.note("gate: escape clicked"); return; }
    if (!this.d.userOffline()) this.goOffline("escape-outside-cycle");
  }
  /** 拉取已经开始 / 库的面弹出来了：人在看着，别拿超时打断（它们各有自己的出口）。 */
  pauseHardTimer(): void { this.stopTimer?.(); this.stopTimer = null; }

  private goOffline(why: string): void {
    this.d.setUserOffline(true);
    this.d.bar.show();
    this.d.note(`gate: offline chosen (${why})`);
  }

  /** 开机 / 醒来走这里。before = 本地那段（恢复上次的模型），在罩子底下跑完再问云端（app-store.ts 的开机顺序契约）。 */
  async run(trigger: "boot" | "wake", opts: { before?: () => Promise<void> } = {}): Promise<GateOutcome> {
    if (this.cycle) { await opts.before?.(); return this.cycle; }
    if (!this.d.attached()) { await opts.before?.(); return "no-gate"; }
    if (this.d.userOffline()) {
      await opts.before?.();
      this.d.note(`gate: ${trigger} while offline chosen → no gate`);
      void this.reconnect();   // 仍没网 = 什么都不做；有网 = 静默试一次，不弹闸
      return "offline-kept";
    }
    if (trigger === "wake" && this.now() - this.lastOkAt < (this.d.recheckMs ?? RECHECK_MS)) return "recent";
    this.cycle = this.runCycle(trigger, opts.before);
    try { return await this.cycle; } finally { this.cycle = null; }
  }

  private async runCycle(trigger: string, before?: () => Promise<void>): Promise<GateOutcome> {
    const t0 = this.now();
    this.escaped = false;
    this.escapeSignal = deferred();
    this.d.ui.showChecking(() => this.escape());
    try {
      await before?.();
      for (;;) {
        const a = await this.attempt();
        if (a.k === "pass") { this.lastOkAt = this.now(); this.d.note(`gate: ${trigger} pass ${(this.now() - t0).toFixed(0)}ms`); this.d.ui.hide(); this.d.afterPass(); return "pass"; }
        if (a.k === "no-account") { this.d.note(`gate: ${trigger} no account on this device → no gate`); this.d.ui.hide(); return "no-login"; }
        if (a.k === "escaped") { this.goOffline("escape"); this.d.ui.hide(); return "offline"; }
        const answer = await this.askBlocked(a.reason);
        if (answer === "offline") { this.goOffline("blocked:" + a.reason); this.d.ui.hide(); return "offline"; }
        this.escaped = false;
        this.escapeSignal = deferred();
        this.d.ui.showChecking(() => this.escape());
      }
    } catch (e) { this.d.ui.hide(); throw e; }
  }

  private async attempt(): Promise<Attempt> {
    if (this.escaped) return { k: "escaped" };
    if (!this.d.browserOnline()) return { k: "blocked", reason: "no-network" };   // 没网直接进闸，不等超时（§7 ④）
    const gen = ++this.generation;
    const timeout = deferred<void>();
    const timer = setTimeout(() => timeout.resolve(), this.d.hardTimeoutMs ?? HARD_TIMEOUT_MS);
    this.stopTimer = () => clearTimeout(timer);
    const work = (async (): Promise<RenewResult> => {
      const r = await this.d.renew();
      if (r.kind !== "ok") return r;
      await this.d.check({ abandoned: () => this.abandoned(gen), onLongWait: () => this.pauseHardTimer() });
      return r;
    })();
    type Raced = { k: "done"; r: RenewResult } | { k: "err"; e: unknown } | { k: "escaped" } | { k: "timeout" };
    const first = await Promise.race<Raced>([
      work.then((r): Raced => ({ k: "done", r }), (e): Raced => ({ k: "err", e })),
      (this.escapeSignal as Deferred<void>).promise.then((): Raced => ({ k: "escaped" })),
      timeout.promise.then((): Raced => ({ k: "timeout" })),
    ]);
    clearTimeout(timer);
    this.stopTimer = null;
    if (first.k === "escaped") { this.generation++; work.catch(() => {}); return { k: "escaped" }; }
    if (first.k === "timeout") { this.generation++; work.catch(() => {}); this.d.note("gate: cloud check timed out"); return { k: "blocked", reason: this.d.browserOnline() ? "no-response" : "no-network" }; }
    if (first.k === "err") { this.d.note("gate: check threw " + String(first.e)); return { k: "blocked", reason: this.d.browserOnline() ? "no-response" : "no-network" }; }
    if (first.r.kind === "ok") return { k: "pass" };
    if (first.r.kind === "no-account") return { k: "no-account" };
    this.d.note(`gate: renew failed code=${first.r.code ?? "-"}`);
    return { k: "blocked", reason: reasonOf(first.r.code, this.d.browserOnline()) };
  }

  private askBlocked(reason: GateReason): Promise<"retry" | "offline"> {
    const answer = deferred<"retry" | "offline">();
    this.blockedAnswer = answer;
    this.blockedReason = reason;
    this.d.note(`gate: blocked reason=${reason}`);
    this.d.ui.showBlocked(reason, {
      signIn: () => { if (this.d.browserOnline()) this.d.signInInteractive(); else answer.resolve("retry"); },   // 没网时点登录 = 再核一次，不去跳一个注定失败的页
      offline: () => answer.resolve("offline"),
    });
    return answer.promise.finally(() => { this.blockedAnswer = null; this.blockedReason = null; });
  }

  /** 闸门上点了「重新登录」但没跳走（登录起跳被拒）：把那张面摆回去，别留一个没罩子的半截状态。 */
  reshowBlocked(): void {
    const a = this.blockedAnswer, r = this.blockedReason;
    if (!a || !r) return;
    this.d.ui.showBlocked(r, { signIn: () => { if (this.d.browserOnline()) this.d.signInInteractive(); else a.resolve("retry"); }, offline: () => a.resolve("offline") });
  }

  /** 网回来了（window online）/ 登录落地了（auth 事件）：闸开着就重新核一次；选了离线就静默补传；都不是 = 没事。 */
  onCloudMaybeBack(): void {
    if (this.blockedAnswer) { this.blockedAnswer.resolve("retry"); return; }
    if (this.d.userOffline()) void this.reconnect();
  }

  /** 从「离线继续」回来。闸只在开机 / 醒来弹一次：这里失败就是条还在，不再弹。 */
  async reconnect(): Promise<boolean> {
    if (this.reconnecting || !this.d.userOffline() || !this.d.browserOnline()) return false;
    this.reconnecting = true;
    try {
      const r = await this.d.renew().catch((): RenewResult => ({ kind: "failed", code: null }));
      if (r.kind !== "ok") { this.d.note(`gate: reconnect not yet (${r.kind}${r.kind === "failed" ? " code=" + (r.code ?? "-") : ""})`); return false; }
      this.d.setUserOffline(false);
      this.d.bar.reconnecting();
      this.d.note("gate: reconnected → catching up");
      this.lastOkAt = this.now();
      try { await this.d.catchUp(); } finally { this.d.bar.hide(); }
      return true;
    } finally { this.reconnecting = false; }
  }
}
