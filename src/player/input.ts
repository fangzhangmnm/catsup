// input.ts —— player 的输入帧类型 + 摇杆判定小机器（dpad 扇区/磁滞、边沿、保持、冷却）。零 DOM、零 WebXR，node 直测。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 两个适配器（flat-input.ts 键鼠 / xr-input.ts 手柄）都把自己翻译成同一个 InputFrame——player 不知道谁在喂它
// （user：「以后想加什么，键鼠，触屏，vr 一起做」；不戴头显也能验证全部移动逻辑）。
// 边沿类字段（turn / tierStep / yawStep）由适配器用下面的机器做好边沿再填；PlayerSim 一帧多步时只让第一步吃边沿。

import type { Pt3 } from "../kernel/geom.ts";
import type { Ray } from "./world-query.ts";

/** HMD / 相机在 rig 局部（Z 上、x 右、y 前、脚底原点）的姿态。flat：local=(0,0,眼高)、fwd=(0,1,0)。 */
export interface HeadFrame {
  local: Pt3;
  /** 头的完整前向（rig 局部单位向量，含俯仰；noclip 飞行沿它飞，步行只取水平分量）。 */
  fwdLocal: Pt3;
}

export interface InputFrame {
  /** 左摇杆：x 右+，y 前+（原始幅值，死区由 player 处理）。 */
  walkX: number; walkY: number;
  dash: boolean;
  /** snap turn 边沿：+1 = 向左（逆时针）一档，−1 = 向右；0 = 无。 */
  turn: -1 | 0 | 1;
  /** 右摇杆前推（dpad 上）保持中 = teleport 充能。 */
  tpCharge: boolean;
  /** 右摇杆后拉（dpad 下）保持中（冷却/保持判定在 teleport 模块）。 */
  tpBack: boolean;
  /** 充能中左摇杆 dpad 上下**边沿**：发射速度档 ±1。 */
  tierStep: -1 | 0 | 1;
  /** 充能中左摇杆 dpad 左右**边沿**：落地朝向 ±1 档（45°）。 */
  yawStep: -1 | 0 | 1;
  jump: boolean;
  crouch: boolean;
  /** noclip 上/下（A/B 或 Q/E）。 */
  up: boolean; down: boolean;
  /** 双击跳（A / 空格）**边沿** = 切换 noclip（Minecraft 约定；user 2026-09-07 VR 首轮反馈）。 */
  noclipToggle: boolean;
  head: HeadFrame;
  /** 瞄准射线（世界坐标）：VR = 手柄 targetRay；flat = 相机/光标射线。null = 没在瞄。 */
  aim: Ray | null;
}

export function emptyInput(eyeHeight = 1.7): InputFrame {
  return {
    walkX: 0, walkY: 0, dash: false, turn: 0, tpCharge: false, tpBack: false, tierStep: 0, yawStep: 0,
    jump: false, crouch: false, up: false, down: false, noclipToggle: false,
    head: { local: { x: 0, y: 0, z: eyeHeight }, fwdLocal: { x: 0, y: 1, z: 0 } },
    aim: null,
  };
}

/** 一帧多步：第 2 步起把边沿类字段清零（同一帧的 turn 不许触发两次）。 */
export function stripEdges(f: InputFrame): InputFrame {
  return { ...f, turn: 0, tierStep: 0, yawStep: 0, noclipToggle: false };
}

// ---------------------------------------------------------------------------
// dpad：摇杆当十字键（user：「这个时候 left joystick 必须是 dpad 模式，不能上下的时候误动左右」）
//   进入：幅值 ≥ ENTER 且方向落在某轴 ±SECTOR/2（60° 扇区）内；
//   保持：已判定的方向在幅值 ≥ EXIT 且偏角 ≤ HOLD_HALF（磁滞，比进入扇区宽）内一直算数——不串轴；
//   切换：只有先离开保持区（回中或转出）再满足进入条件才换方向。
export type DpadDir = "none" | "up" | "down" | "left" | "right";
export const DPAD = { ENTER: 0.6, EXIT: 0.4, SECTOR_HALF: (30 * Math.PI) / 180, HOLD_HALF: (45 * Math.PI) / 180 } as const;

const AXIS_ANGLE: Record<Exclude<DpadDir, "none">, number> = { right: 0, up: Math.PI / 2, left: Math.PI, down: -Math.PI / 2 };
const angDiff = (a: number, b: number): number => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };

export class Dpad {
  dir: DpadDir = "none";
  /** x 右+，y 前/上+。返回当前方向（含磁滞）。 */
  update(x: number, y: number): DpadDir {
    const mag = Math.hypot(x, y);
    const ang = Math.atan2(y, x);
    if (this.dir !== "none") {
      if (mag >= DPAD.EXIT && angDiff(ang, AXIS_ANGLE[this.dir]) <= DPAD.HOLD_HALF) return this.dir;
      this.dir = "none";
    }
    if (mag >= DPAD.ENTER) {
      for (const d of ["up", "down", "left", "right"] as const) {
        if (angDiff(ang, AXIS_ANGLE[d]) <= DPAD.SECTOR_HALF) { this.dir = d; break; }
      }
    }
    return this.dir;
  }
}

/** 方向边沿：dpad 方向从非 d 变成 d 的那一帧返回 true。 */
export class DirEdge {
  private was = false;
  update(dir: DpadDir, d: DpadDir): boolean {
    const now = dir === d;
    const fired = now && !this.was;
    this.was = now;
    return fired;
  }
}

/** 按钮边沿（按下瞬间）。 */
export class ButtonEdge {
  private was = false;
  update(pressed: boolean): boolean {
    const fired = pressed && !this.was;
    this.was = pressed;
    return fired;
  }
}

/** 双击判定（Minecraft 双击跳切飞行）：两次按下边沿间隔 ≤ windowSec 的第二次返回 true；第三次重新计。 */
export class DoubleTap {
  private lastDown = -Infinity;
  private was = false;
  private windowSec: number;
  constructor(windowSec = 0.35) { this.windowSec = windowSec; }
  /** pressed = 当前按住；now = 单调秒。 */
  update(pressed: boolean, now: number): boolean {
    const edge = pressed && !this.was;
    this.was = pressed;
    if (!edge) return false;
    const fired = now - this.lastDown <= this.windowSec;
    this.lastDown = fired ? -Infinity : now;
    return fired;
  }
}

/** 保持判定：条件连续成立 ≥ holdSec 的那一刻返回 true（一次），松开重置。 */
export class HoldLatch {
  private held = 0;
  private fired = false;
  private holdSec: number;
  constructor(holdSec: number) { this.holdSec = holdSec; }
  update(active: boolean, dt: number): boolean {
    if (!active) { this.held = 0; this.fired = false; return false; }
    this.held += dt;
    if (!this.fired && this.held >= this.holdSec) { this.fired = true; return true; }
    return false;
  }
  reset(): void { this.held = 0; this.fired = false; }
}
