// 平滑管线全局参数的**出厂默认**（纯数据；C8 迁 common）。
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
