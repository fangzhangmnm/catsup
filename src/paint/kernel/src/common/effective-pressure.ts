// 压感取值（纯函数，零 DOM；抽自 input.ts effectivePressureFor）。created 2026-09-02 by Claude Fable 5.1
//
// 语义（历史原样，别改手感）：
//   - mouse：恒 0.5——鼠标没有传感器，0.5 是它的真值不是开关（「禁用笔压」toggle 2026-08-28 已 sunset）。
//   - pen/touch：抬笔瞬间 pressure === 0 → 沿用 rec.lastP（v4）；起手 warmup 也 0 但 lastP 还没 → 0.2
//     （v6，原本 0.5 → 起手鼓 bulb）。
//   - 算完 raw 过一道一阶 EMA（rec.smP，α = SMOOTH.pressureAlpha）做 stabilizer：damp 10Hz 抖动 + 削传感器尖刺；
//     smP 未初始化 / NaN / 负哨兵 → 首颗用 raw（v0.7.26 硬化：NaN 压感曾让引擎 spacing 走步死循环）。
//   - **fallback（2026-09-02）**：笔画只吃 getCoalescedEvents() 列表（input.ts _move）。若某浏览器的 coalesced 样本
//     不带 pressure（0 / 缺失 / NaN）而派发事件本身带，先回退派发事件的 pressure（规范：派发事件的属性 = 最新状态；
//     每帧一档压感也比整笔冻在落笔那一瞬强），再回退 lastP。合规浏览器（coalesced 各自带 pressure）零行为变化。
//     案由：iPad 测试者 Procreate 有压感、WeebPaint 勾线笔没有；作者更旧的 iPad 无痕模式有——差异只剩她那台
//     Safari 交给 app 的事件数据；此修不依赖真机复现，两种情况都成立。
export interface PressureRec { lastP?: number | null; smP?: number }

function num(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }

export function effectivePressure(
  rec: PressureRec,
  pointerType: string | undefined,
  pressure: number | undefined,
  fallback: number | undefined,
  alpha: number,
): number {
  let raw: number;
  if (pointerType === "mouse") {
    raw = 0.5;
  } else {
    let r = num(pressure);
    if (r == null || r === 0) { const f = num(fallback); if (f != null && f > 0) r = f; }
    if (r == null || r === 0) {
      raw = rec.lastP != null ? rec.lastP : 0.2;
    } else {
      raw = Math.max(0.05, Math.min(1, r));
      rec.lastP = raw;
    }
  }
  if (!(rec.smP! >= 0)) rec.smP = raw;
  else rec.smP! += alpha * (raw - rec.smP!);
  return rec.smP!;
}
