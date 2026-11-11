// app/paint-meter-badge.ts —— 每帧读数的小角标（贴图主线 1-4d 第 1 条：「先做，别的都靠它判断」；细则 ai-docs/20261111-paint-1-4d-smooth.md）。created 2026-11-11 by Claude Opus 5.5
// 开关在画画工作台的笔 / 橡皮 / 吸管的工具条上（「读数」，只在这一次打开里记；不进文件、不进设备）。关着 = 每帧什么都不做（计数器那边也只多看一个布尔）。
// 给 user 在 iPad 上自己看：每段最近一秒的平均 / 最慢（毫秒）+ 这一帧合计 + 两帧之间 + 最近一秒掉了几帧；字用人话（段名 = paint/frame-meter.ts METER_LABELS）。
// 一帧 = 上一次三维画完到这一次画完（编辑器 afterRender）。编辑器只在要画时才画，所以「两帧之间」只算连着画的（隔得超过 250 毫秒 = 停下来过，不算掉帧）；
// 掉了几帧 = 最近一秒里每个间隔按「一帧该多长」（最近两秒里最短的间隔，至少 4 毫秒，没有就 16.7）算多出来的帧数。字一秒最多换四次（不跟着每帧改页面）。
// 统筹 11-11 加：角标上写现在走的是哪条路（读数那一组的「走法」切换，paint/display-diag.ts）；「核对」开着时每 CHECK_EVERY 帧 + 每次抬笔之后核对一次，
//   核对的那一帧（核对完之后画的第一帧：核对的读回算在它头上）标出来、不算进读数；对不上 = 角标亮一下（详情在调试日志里）。
import { METER_LABELS, METER_SEGS, paintMeter, type MeterFrame } from "../paint/frame-meter.ts";
import { CHECK_EVERY, displayDiag } from "../paint/display-diag.ts";

export interface PaintMeterBadge {
  /** 编辑器画完一帧（afterRender）：关着 = 什么都不做。 */
  frame(): void;
  /** 露不露：开着 ∧ 在画画工作台（宿主按工具判）。 */
  sync(visible: boolean): void;
  /** 开关（工具条「读数」）。打开时清掉攒着的半帧。 */
  toggle(): boolean;
  /** 探针：最近一秒的读数。 */
  snapshot(): { frames: number; avg: Record<string, number>; max: Record<string, number>; gapMs: number; dropped: number; checks: number; mismatches: number; skipped: number };
}

const GAP_CUT = 250, PAINT_EVERY = 250;

export function mountPaintMeterBadge(o: { sceneMs(): number; copyMs(): number; mipsMs(): number; pathLabel(): string; check(): boolean }): PaintMeterBadge {
  const el = document.createElement("div"); el.className = "meter-badge"; el.hidden = true; el.setAttribute("aria-live", "off");
  document.body.appendChild(el);
  const hist: { t: number; f: MeterFrame; total: number; checked: boolean }[] = [];
  let lastPaint = 0, shown = false, sinceCheck = 0, checks = 0, mismatches = 0, skipNext = false, alertUntil = 0;
  const stats = (now: number): ReturnType<PaintMeterBadge["snapshot"]> => {
    const all = hist.filter((h) => now - h.t <= 1000), win = all.filter((h) => !h.checked), avg: Record<string, number> = {}, max: Record<string, number> = {};
    for (const k of [...METER_SEGS, "total"] as const) { let s = 0, m = 0; for (const h of win) { const v = k === "total" ? h.total : h.f[k]; s += v; m = Math.max(m, v); } avg[k] = win.length ? s / win.length : 0; max[k] = m; }
    const gaps: number[] = [], recent = hist.filter((h) => now - h.t <= 2000);
    for (let i = 1; i < recent.length; i++) { if (recent[i].checked) continue; const g = recent[i].t - recent[i - 1].t; if (g < GAP_CUT) gaps.push(g); }
    const base = gaps.length ? Math.max(4, Math.min(...gaps)) : 1000 / 60;
    let dropped = 0, gs = 0, gn = 0;
    for (let i = 1; i < all.length; i++) { if (all[i].checked) continue; const g = all[i].t - all[i - 1].t; if (g >= GAP_CUT) continue; gs += g; gn++; dropped += Math.max(0, Math.round(g / base) - 1); }   // 核对那一帧前面的间隔不算
    return { frames: win.length, avg, max, gapMs: gn ? gs / gn : 0, dropped, checks, mismatches, skipped: all.length - win.length };
  };
  const ms = (v: number): string => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const paint = (now: number): void => {
    const s = stats(now), row = (label: string, k: string): string => `<span>${label}</span><span>${ms(s.avg[k])}</span><span>${ms(s.max[k])}</span>`;
    el.innerHTML = `<b>每帧读数</b><span class="meter-head">最近一秒（毫秒）</span><span>平均</span><span>最慢</span>`
      + METER_SEGS.map((k) => row(METER_LABELS[k], k)).join("") + row("这一帧合计", "total")
      + `<span>两帧之间</span><span>${ms(s.gapMs)}</span><span></span><span class="meter-foot">最近一秒画了 ${s.frames} 帧、掉了 ${s.dropped} 帧</span>`
      + `<span class="meter-foot">走法：${o.pathLabel()}</span>`
      + (displayDiag.path === "measure" ? `<span class="meter-foot meter-note">测量用：远看的颜色可能和没画过的画差一点</span>` : "")
      + (displayDiag.check ? `<span class="meter-foot">核对 ${checks} 次、对不上 ${mismatches} 次${s.skipped ? `（最近一秒有 ${s.skipped} 帧在核对，不算进读数）` : ""}</span>` : "");
    el.classList.toggle("meter-alert", now < alertUntil);
  };
  return {
    frame() {
      if (!paintMeter.on) return;
      paintMeter.put("scene", o.sceneMs()); paintMeter.put("copy", o.copyMs()); paintMeter.put("mips", o.mipsMs());
      const f = paintMeter.endFrame(), now = performance.now();
      hist.push({ t: now, f, total: METER_SEGS.reduce((a, k) => a + f[k], 0), checked: skipNext });
      skipNext = false;
      while (hist.length && now - hist[0].t > 2000) hist.shift();
      if (displayDiag.check && (++sinceCheck >= CHECK_EVERY || displayDiag.penUp)) {   // 核对：画完这一帧之后做，读回的时间落在下一帧头上 → 下一帧不算
        sinceCheck = 0; displayDiag.penUp = false; checks++;
        if (!o.check()) { mismatches++; alertUntil = now + 1500; lastPaint = 0; }
        skipNext = true;
      } else if (!displayDiag.check) displayDiag.penUp = false;
      if (shown && now - lastPaint >= PAINT_EVERY) { lastPaint = now; paint(now); }
    },
    sync(visible) { shown = paintMeter.on && visible; el.hidden = !shown; if (shown) paint(performance.now()); },
    toggle() { paintMeter.on = !paintMeter.on; paintMeter.endFrame(); hist.length = 0; sinceCheck = 0; checks = 0; mismatches = 0; skipNext = false; return paintMeter.on; },
    snapshot: () => stats(performance.now()),
  };
}
