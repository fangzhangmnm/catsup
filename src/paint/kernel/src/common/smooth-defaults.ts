// 平滑管线全局参数的**出厂默认**（纯数据；C8 迁 common）+ 从笔的两个旋钮推出平滑器参数的那一个换算（resolveSmooth，2026-11-12 Claude Opus 5.5）。
// 运行时可变副本 SMOOTH + synced-pref 持久化在 src/smooth-config.ts（frontend 域）；
// backend 档口（weebpaint-backend strokeBegin）吃这份 DEFAULTS 做 streamline/stabilization →
// {tau, deadzone} 推导——headless 无 prefs，决定论要求常数固定（同输入序列 → 同输出）。
// 详 ai-docs/20260613-brush-procreate-smoothing.md。

export const SMOOTH_DEFAULTS = Object.freeze({
  tauMaxMs:           500, // streamline=1 时的时间常数 tau（ms）。二阶 SmoothDamp，smoothTime=tau，吃真实 dt。
                           //   稳态滞后≈速度×tau（与笔速/采样率/几何无关）；转角自然减速→滞后缩小→顿涌现。
                           //   0.5→250ms；嫌拖就调小、嫌抖就调大此值。
  tailBow:            1,   // 弧 tail 动量增益：1=自然、>1 更鼓、0=直连光标。直行段恒直线。
  stabMaxPx:          8,   // stabilization=1 时死区半径（screen px）；半径内 raw 不拉动落点（与 tau 正交的硬阈值）
  rawStaticSq:        0.005, // raw 静止门限（screen px²）：动得比这小的 event 跳过
  pressureAlpha:      0.4,   // 压感 smP 一阶 EMA α（input 端传感器去尖刺）
});

/**
 * 笔的跟手（streamline）、防抖（stabilization）→ 平滑器的参数 {tau, deadzone, tailBow}（BrushEngine.beginStroke 的 smooth）。
 * 2026-11-12（CatsUp 施工单二十 1b，统筹定「平滑只有一个内核函数」）：以前后端起笔自己算一份、三维那边要再抄一份；收成这一个，后端和三维都调它。
 * - streamline / stabilization 先夹到 0..1，不是数就当 0（和后端起笔原来的写法逐字一样）。
 * - tau（毫秒）= 跟手 × SMOOTH_DEFAULTS.tauMaxMs；deadzone = 防抖 × stabMaxPx ÷ scale；tailBow = 出厂值。
 * - scale = 一个画布像素占几个屏幕像素：deadzone 在出厂表里是屏幕像素，平滑器吃的是画布像素，所以除它。
 *   没有视口的地方（后端起笔、三维的屏幕空间笔）传 1。不是正数当 1。
 * - 常数只吃出厂表，不吃用户改过的那份（前端 input.ts 的 _resolveSmooth 吃运行时副本 SMOOTH，那份不归内核）：同样的输入 → 同样的输出。
 * - pixelMode 的笔不平滑，那是调用方的事（这里不看笔的别的字段）。
 */
export function resolveSmooth(streamline: unknown, stabilization: unknown, scale: number): { tau: number; deadzone: number; tailBow: number } {
  const clamp01 = (v: unknown) => Math.max(0, Math.min(1, typeof v === "number" ? v : 0));
  const sc = scale > 0 ? scale : 1;
  return {
    tau: clamp01(streamline) * SMOOTH_DEFAULTS.tauMaxMs,
    deadzone: clamp01(stabilization) * SMOOTH_DEFAULTS.stabMaxPx / sc,
    tailBow: SMOOTH_DEFAULTS.tailBow,
  };
}
