// touch-stick.ts —— 触屏虚拟摇杆的数学（吃鸡式：左半屏浮动摇杆走、右半屏拖动看）。零 DOM、node 直测。created 2026-10-28 by Claude Opus 5.5
// user 10-28「所有任务做完之后顺手把吃鸡虚拟摇杆也做了吧。」「吃鸡有几种武器还没想好，先把locomotion这里都接上，这种东西手感敏感你好好调查一下。」
// 「对了，写虚拟摇杆的时候我很多时候ipad都是竖屏哦」（纪元账本 FM142；调查与参数表 = ai-docs/20261028-virtual-joystick.md）。
// 调参纪律（全仓）：每个量按自己的量纲单独定义（CSS px / 比例 / 弧度每 px），不从别的参数推。
// 输出 = player 的 InputFrame 那几个字段（walkX / walkY / dash）：模拟器不知道是谁在喂它。

/** 摇杆的手感参数（CSS px = 物理尺寸：iPad mini 竖屏 1 CSS px ≈ 0.16 mm）。 */
export interface StickConfig {
  /** 推满（= 全速走）要离底座中心多远。56 px ≈ 9 mm：拇指不挪手腕够得着、又不至于抖一下就满速。 */
  readonly radius: number;
  /** 底座中心附近这么一圈（占 radius 的比例）不算推（拇指刚放下的抖动）。 */
  readonly deadzone: number;
  /** 推过底座边缘多少（占 radius 的比例，> 1）= 冲刺（吃鸡「推到底再往外 = 跑」的肌肉记忆）。 */
  readonly dashAt: number;
  /** 手指离底座中心超过这么远（占 radius 的比例）底座就跟过去（浮动摇杆不丢：拇指滑出去了，摇杆跟着拇指）。 */
  readonly followAt: number;
  /** 模拟器自己的死区（player.ts DEFAULT_CONFIG.stickDeadzone）：输出从它开始，过了摇杆死区就是最慢的那一档走，不出现「推了不动」的一段。 */
  readonly simDeadzone: number;
}
export const STICK: StickConfig = { radius: 56, deadzone: 0.12, dashAt: 1.3, followAt: 2.2, simDeadzone: 0.15 };
/** 右半屏拖动看：弧度每 CSS px（0.0045 ≈ 0.26°/px：iPad mini 竖屏右半屏一整划 ≈ 370 px ≈ 95°）。不加速、不平滑：跟手第一。 */
export const TOUCH_LOOK_RAD_PER_PX = 0.0045;

export interface StickOut { walkX: number; walkY: number; dash: boolean }
/**
 * 手指相对底座中心的位移（屏幕 px，y 向下为正）→ 走的方向和快慢：x 右+、y 前+（屏幕往上推 = 往前走）。
 * 死区里 = 0；过了死区按距离线性给到 1（从模拟器死区起算）；超过 radius 封顶 1；超过 dashAt × radius = 冲刺。
 */
export function stickOutput(dx: number, dy: number, cfg: StickConfig = STICK): StickOut {
  const d = Math.hypot(dx, dy), r = d / cfg.radius;
  if (r <= cfg.deadzone || d === 0) return { walkX: 0, walkY: 0, dash: false };
  const t = Math.min(1, (r - cfg.deadzone) / (1 - cfg.deadzone)), mag = cfg.simDeadzone + (1 - cfg.simDeadzone) * t;
  return { walkX: (dx / d) * mag, walkY: (-dy / d) * mag, dash: r >= cfg.dashAt };
}

/** 浮动底座跟手：手指离底座中心超过 followAt × radius → 底座沿那条线挪到正好 followAt × radius 远（方向不变）。返回新的底座中心。 */
export function followBase(base: { x: number; y: number }, finger: { x: number; y: number }, cfg: StickConfig = STICK): { x: number; y: number } {
  const dx = finger.x - base.x, dy = finger.y - base.y, d = Math.hypot(dx, dy), max = cfg.followAt * cfg.radius;
  if (d <= max) return base;
  const k = (d - max) / d;
  return { x: base.x + dx * k, y: base.y + dy * k };
}

/** 底座出现的位置：按下处，但整个底座（radius）留在区域里（贴边按下 = 底座往里挪，摇杆不被屏幕边切掉）。 */
export function placeBase(at: { x: number; y: number }, zone: { x: number; y: number; w: number; h: number }, cfg: StickConfig = STICK): { x: number; y: number } {
  const m = cfg.radius;
  return { x: Math.max(zone.x + m, Math.min(zone.x + zone.w - m, at.x)), y: Math.max(zone.y + m, Math.min(zone.y + zone.h - m, at.y)) };
}
