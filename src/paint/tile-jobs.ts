// paint/tile-jobs.ts —— 画画内核图块池的接线（贴图主线 0-3a，统筹 11-11：照画画仓 src/tile-jobs.ts 搬，不另想）。created 2026-11-11 by Claude Opus 5.5
// 四样：① 额度——开机设一次（池上现成的 setRawQuotaBytes；「只设一次」由这里守：第二次调 = 抛）；② 压缩用的编码器（接上之后额度才生效：没压缩的图块超了就当场压最老的，宁卡不爆）；
//   ③ 泄漏上报 → 调试日志；④ 空闲时按预算压最老的、切到后台全压。
// 空闲怎么算 = 画画仓 background-sync-jobs 那张表（停 1 秒给 5 毫秒、停 5 秒给 15 毫秒、停 30 秒以上给 50 毫秒；有输入 = 空闲时钟归零）。这里只有一件活，所以只搬了表和规矩，没搬整个调度器。
// 图块池全仓只有画用（src/ 里只有 src/paint/ 能 import 内核），压缩碰不到别的东西。
// TileJobs 是纯逻辑（零 DOM、时钟可注入，测试用）；DOM 接线在 initPaintTileJobs（main.ts 开机、第一块画板之前调）。
// 什么时候在跑（统筹 0-3a 审查）：设额度、接编码器、泄漏上报开机就做（不花时间）；那个每 250 ms 看一次的定时器、切后台和输入的监听**只在有画板时挂着**——
//   第一块画板建出来才起，换文件画板全扔了就停（画板登记处的 active 回调 → TileJobsDriver.setActive）。用户根本没画画，三维不多一个常驻的定时器。
import { appTilePool, setTilePoolCodec, setTilePoolLeakReporter } from "./kernel/src/backend/tiles/app-tile-pool.ts";
import { deflateTileCodec } from "./kernel/src/backend/tiles/cpu-tile-compression.ts";

/** 没压缩的图块总共能占多少（字节）。统筹 11-11 先按 128 MB（画画软件 384 MB）；量完再定。 */
export const PAINT_TILE_QUOTA_BYTES = 128 * 1024 * 1024;
/** 停多久给多少毫秒（画画仓 background-sync-jobs DEFAULT_QUOTA_TABLE 原样）。 */
export const IDLE_QUOTA_TABLE: readonly { readonly afterIdleMs: number; readonly quotaMs: number }[] = [
  { afterIdleMs: 1000, quotaMs: 5 },
  { afterIdleMs: 5000, quotaMs: 15 },
  { afterIdleMs: 30_000, quotaMs: 50 },
];
/** 多久看一次（毫秒；画画仓同值）。 */
export const TILE_TICK_MS = 250;

export interface CompactPool { compactOldest(budgetMs: number): "done" | "more"; compactAll(): void }

export class TileJobs {
  private lastInput: number;
  private readonly pool: CompactPool;
  private readonly now: () => number;
  constructor(pool: CompactPool, now: () => number = () => performance.now()) { this.pool = pool; this.now = now; this.lastInput = now(); }
  /** 有输入（按下 / 挪 / 滚轮 / 键盘 / 触摸）：空闲时钟归零。 */
  noteInput(): void { this.lastInput = this.now(); }
  /** 看一次：停够了按表给预算压最老的；没停够 = 不动（"busy"）。 */
  tick(): "busy" | "done" | "more" {
    const idle = this.now() - this.lastInput;
    let budget = 0;
    for (const r of IDLE_QUOTA_TABLE) if (idle >= r.afterIdleMs) budget = r.quotaMs;
    return budget ? this.pool.compactOldest(budget) : "busy";
  }
  /** 切到后台：全压（用户看不见，卡也无妨）。 */
  hidden(): void { this.pool.compactAll(); }
}

/** 定时器和监听从哪来（浏览器 = window / document；测试 = 假的）。每个口返回「撤掉」。 */
export interface TileJobsEnv {
  every(fn: () => void, ms: number): () => void;
  onInput(fn: () => void): () => void;
  onHidden(fn: () => void): () => void;
}
/** 只在有画板时跑：setActive(true) 挂定时器和监听（已经挂着 = 不动），setActive(false) 全撤。 */
export class TileJobsDriver {
  private off: (() => void)[] | null = null;
  private readonly jobs: TileJobs;
  private readonly env: TileJobsEnv;
  private readonly log: (msg: string) => void;
  constructor(jobs: TileJobs, env: TileJobsEnv, log: (msg: string) => void) { this.jobs = jobs; this.env = env; this.log = log; }
  get running(): boolean { return this.off !== null; }
  setActive(on: boolean): void {
    if (on === this.running) return;
    if (!on) { for (const f of this.off!) f(); this.off = null; return; }
    this.jobs.noteInput();   // 刚建了画板 = 刚有动作：空闲时钟从现在算
    this.off = [
      this.env.every(() => { try { this.jobs.tick(); } catch (e) { this.log(`[tile-pool] compact threw: ${String(e)}`); } }, TILE_TICK_MS),
      this.env.onInput(() => this.jobs.noteInput()),
      this.env.onHidden(() => { try { this.jobs.hidden(); } catch (e) { this.log(`[tile-pool] compactAll threw: ${String(e)}`); } }),
    ];
  }
}
/** 浏览器里的定时器和监听（输入 = 按下 / 挪 / 滚轮 / 键盘 / 触摸，捕获阶段、被动；后台 = visibilitychange 变 hidden）。 */
export function browserTileJobsEnv(): TileJobsEnv {
  const inputEvents = ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"] as const;
  return {
    every: (fn, ms) => { const t = setInterval(fn, ms); return () => clearInterval(t); },
    onInput: (fn) => {
      for (const ev of inputEvents) window.addEventListener(ev, fn, { capture: true, passive: true });
      return () => { for (const ev of inputEvents) window.removeEventListener(ev, fn, { capture: true } as EventListenerOptions); };
    },
    onHidden: (fn) => { const h = (): void => { if (document.visibilityState === "hidden") fn(); }; document.addEventListener("visibilitychange", h); return () => document.removeEventListener("visibilitychange", h); },
  };
}

let wired = false;
/** 开机调一次（第一块画板之前）：额度 + 编码器 + 泄漏上报（开机就做）；空闲 / 切后台交给返回的 driver（画板登记处在有没有画板变了时调 setActive）。第二次调 = 抛（额度只在开机设一次）。 */
export function initPaintTileJobs(o: { readonly log: (msg: string) => void; readonly quotaBytes?: number; readonly env?: TileJobsEnv }): { readonly jobs: TileJobs; readonly driver: TileJobsDriver } {
  if (wired) throw new Error("initPaintTileJobs: already wired (the paint tile pool quota is set once at boot)");
  wired = true;
  const pool = appTilePool();
  pool.setRawQuotaBytes(o.quotaBytes ?? PAINT_TILE_QUOTA_BYTES);
  setTilePoolCodec(deflateTileCodec);
  setTilePoolLeakReporter((info) => o.log(`[tile-pool] ${info}`));
  const jobs = new TileJobs(pool);
  return { jobs, driver: new TileJobsDriver(jobs, o.env ?? browserTileJobsEnv(), o.log) };
}
