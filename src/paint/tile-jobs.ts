// paint/tile-jobs.ts —— 画画内核图块池的接线（贴图主线 0-3a，统筹 11-11：照画画仓 src/tile-jobs.ts 搬，不另想）。created 2026-11-11 by Claude Opus 5.5
// 四样：① 额度——开机设一次（池上现成的 setRawQuotaBytes；「只设一次」由这里守：第二次调 = 抛）；② 压缩用的编码器（接上之后额度才生效：没压缩的图块超了就当场压最老的，宁卡不爆）；
//   ③ 泄漏上报 → 调试日志；④ 空闲时按预算压最老的、切到后台全压。
// 空闲怎么算 = 画画仓 background-sync-jobs 那张表（停 1 秒给 5 毫秒、停 5 秒给 15 毫秒、停 30 秒以上给 50 毫秒；有输入 = 空闲时钟归零）。这里只有一件活，所以只搬了表和规矩，没搬整个调度器。
// 图块池全仓只有画用（src/ 里只有 src/paint/ 能 import 内核），压缩碰不到别的东西。
// TileJobs 是纯逻辑（零 DOM、时钟可注入，测试用）；DOM 接线在 initPaintTileJobs（main.ts 开机、第一块画板之前调）。
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

let wired = false;
/** 开机调一次（第一块画板之前）：额度 + 编码器 + 泄漏上报 + 空闲 / 切后台。第二次调 = 抛（额度只在开机设一次）。返回拆的口（真 app 不调）。 */
export function initPaintTileJobs(o: { readonly log: (msg: string) => void; readonly quotaBytes?: number }): { readonly jobs: TileJobs; dispose(): void } {
  if (wired) throw new Error("initPaintTileJobs: already wired (the paint tile pool quota is set once at boot)");
  wired = true;
  const pool = appTilePool();
  pool.setRawQuotaBytes(o.quotaBytes ?? PAINT_TILE_QUOTA_BYTES);
  setTilePoolCodec(deflateTileCodec);
  setTilePoolLeakReporter((info) => o.log(`[tile-pool] ${info}`));
  const jobs = new TileJobs(pool);
  const noteInput = (): void => jobs.noteInput();
  const inputEvents = ["pointerdown", "pointermove", "wheel", "keydown", "touchstart"] as const;
  for (const ev of inputEvents) window.addEventListener(ev, noteInput, { capture: true, passive: true });
  const onVis = (): void => { if (document.visibilityState === "hidden") jobs.hidden(); };
  document.addEventListener("visibilitychange", onVis);
  const timer = setInterval(() => { try { jobs.tick(); } catch (e) { o.log(`[tile-pool] compact threw: ${String(e)}`); } }, TILE_TICK_MS);
  return {
    jobs,
    dispose: () => {
      clearInterval(timer);
      for (const ev of inputEvents) window.removeEventListener(ev, noteInput, { capture: true } as EventListenerOptions);
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}
