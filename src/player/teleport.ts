// teleport.ts —— 抛射体 teleport：发射速度档 + 俯仰瞄准，弧线折线逐段命中，落在首个合法面；顶档=直线。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 措辞（user 2026-09-07 撤回「射程」一词）：一般 VR 游戏的结算 = **抛射体模拟**——沿手柄射线给发射速度 v₀ + 重力 g，
// 「距离」是 v₀ 与俯仰的涌现量，不是旋钮。**档位 = 发射速度档**：下限档 = 舒适值，往上几档，顶档 = 直线（v₀→∞，落在射线命中处，
// GM/超人跳楼跳浮空船的兜底）；v₀ 随玩家缩放 √s（缩小帽/高达：弧形相对身体不变）。
// 常数 SPEED_TIERS 是 **playtest 待定的占位**（user：「下限是舒适，上线是兜底…射程的调节你觉得用什么好」）——别当定稿。
//
// 手势（A13 第三轮）：右摇杆前推 = 充能（弧线可见）；充能中左摇杆 dpad：上下 = 速度档（跨次记忆）、左右 = 落地朝向 ±45°；
// 松手 = 落（合法）/ 取消（弧红）；充能中后拉 = 取消；落地后 300 ms 冷却忽略后拉（弹簧回中过冲）；
// 后拉 ≥0.6 保持 150 ms = 回上一点（来回可反复）。合法落点 = |n.z| ≥ cos(maxSlope) + 头顶净空（胶囊在落点不穿几何）。

import type { Pt3 } from "../kernel/geom.ts";
import type { Ray, WorldHit, WorldQuery } from "./world-query.ts";

export const SPEED_TIERS: readonly number[] = [5, 8, 12, Infinity];   // m/s；占位，playtest 定
export const DEFAULT_TIER = 1;
export const TELEPORT_G = 9.8;          // 弧线重力（只管弧形，不是角色重力）
export const ARC_DT = 0.04;             // 采样步（秒）
export const ARC_MAX_T = 3.0;           // 最长飞行（秒）；超时无落点 = 取消
export const LINE_REACH = 300;          // 直线档射线长度（米）
export const BACK_COOLDOWN = 0.3;       // 落地后忽略后拉（秒）
export const BACK_HOLD = 0.15;          // 回上一点需保持（秒）
export const YAW_STEP = Math.PI / 4;    // 落地朝向每档 45°

export interface ArcResult {
  points: Pt3[];             // 折线（含起点；命中则以命中点收尾）
  hit: WorldHit | null;
  valid: boolean;            // 可落
  reason: "ok" | "no-hit" | "slope" | "headroom";
}

/**
 * 抛射体折线求交（纯函数）。v0=Infinity → 直线。valid 需要 |n.z| ≥ minNz 且 headroomOk（由调用方注入胶囊净空判定）。
 */
export function simulateArc(
  world: WorldQuery,
  aim: Ray,
  v0: number,
  opts: { g?: number; minNz: number; headroomOk: (p: Pt3) => boolean },
): ArcResult {
  const g = opts.g ?? TELEPORT_G;
  const pts: Pt3[] = [aim.origin];
  let hit: WorldHit | null = null;
  if (!Number.isFinite(v0)) {
    const b = { x: aim.origin.x + aim.dir.x * LINE_REACH, y: aim.origin.y + aim.dir.y * LINE_REACH, z: aim.origin.z + aim.dir.z * LINE_REACH };
    hit = world.segmentHit(aim.origin, b);
    pts.push(hit ? hit.p : b);
  } else {
    const vx = aim.dir.x * v0, vy = aim.dir.y * v0, vz0 = aim.dir.z * v0;
    let prev = aim.origin;
    for (let t = ARC_DT; t <= ARC_MAX_T + 1e-9; t += ARC_DT) {
      const p = { x: aim.origin.x + vx * t, y: aim.origin.y + vy * t, z: aim.origin.z + vz0 * t - 0.5 * g * t * t };
      hit = world.segmentHit(prev, p);
      if (hit) { pts.push(hit.p); break; }
      pts.push(p);
      prev = p;
    }
  }
  if (!hit) return { points: pts, hit: null, valid: false, reason: "no-hit" };
  if (Math.abs(hit.n.z) < opts.minNz) return { points: pts, hit, valid: false, reason: "slope" };
  if (!opts.headroomOk(hit.p)) return { points: pts, hit, valid: false, reason: "headroom" };
  return { points: pts, hit, valid: true, reason: "ok" };
}

export interface TeleportState {
  charging: boolean;
  tier: number;                 // 速度档下标（跨次记忆）
  yawSteps: number;             // 充能中累计的落地朝向档（×45°）
  arc: ArcResult | null;        // 充能中每步刷新；渲染层画它
  cooldownUntil: number;        // sim 时间：此前忽略后拉
  backHeld: number;             // 后拉已保持秒数
  /** 上一次 teleport 的**出发点**（回上一点 = 撤销这次跳；再拉一次又跳回去，来回可反复）。 */
  last: { pos: Pt3; heading: number } | null;
}

export const initialTeleport = (): TeleportState => ({ charging: false, tier: DEFAULT_TIER, yawSteps: 0, arc: null, cooldownUntil: -1, backHeld: 0, last: null });

export type TeleportAction =
  | { kind: "none" }
  | { kind: "jump"; to: Pt3; headingDelta: number }
  | { kind: "back"; to: Pt3; heading: number };

/**
 * teleport 状态机一步（纯函数式：原地改 st，返回本步动作；pos/heading 的写入由 player 执行并登记 last）。
 * @param now      sim 时间（秒）
 * @param v0Scale  √rig 缩放
 */
export function stepTeleport(
  st: TeleportState,
  input: { tpCharge: boolean; tpBack: boolean; tierStep: -1 | 0 | 1; yawStep: -1 | 0 | 1; aim: Ray | null },
  now: number,
  dt: number,
  world: WorldQuery,
  opts: { minNz: number; headroomOk: (p: Pt3) => boolean; v0Scale: number },
): TeleportAction {
  if (st.charging) {
    if (input.tierStep) st.tier = Math.max(0, Math.min(SPEED_TIERS.length - 1, st.tier + input.tierStep));
    if (input.yawStep) st.yawSteps += input.yawStep;
    if (input.tpBack) {                       // 充能中后拉 = 取消
      st.charging = false; st.arc = null; st.yawSteps = 0;
      st.cooldownUntil = now + BACK_COOLDOWN; // 取消也冷却：同一次后拉别顺手当「回上一点」
      return { kind: "none" };
    }
    if (input.tpCharge) {
      st.arc = input.aim ? simulateArc(world, input.aim, SPEED_TIERS[st.tier] * opts.v0Scale, opts) : null;
      return { kind: "none" };
    }
    // 松手：落 / 取消
    st.charging = false;
    const arc = st.arc;
    const yaw = st.yawSteps * YAW_STEP;
    st.arc = null; st.yawSteps = 0;
    st.cooldownUntil = now + BACK_COOLDOWN;
    if (arc?.valid && arc.hit) return { kind: "jump", to: arc.hit.p, headingDelta: yaw };
    return { kind: "none" };
  }
  if (input.tpCharge) {
    st.charging = true; st.yawSteps = 0;
    st.arc = input.aim ? simulateArc(world, input.aim, SPEED_TIERS[st.tier] * opts.v0Scale, opts) : null;
    return { kind: "none" };
  }
  // 回上一点：冷却外、后拉保持 ≥ BACK_HOLD
  if (input.tpBack && now >= st.cooldownUntil) {
    st.backHeld += dt;
    if (st.backHeld >= BACK_HOLD && st.last) {
      st.backHeld = -Infinity;                 // 本次保持只触发一次（松开后 reset）
      st.cooldownUntil = now + BACK_COOLDOWN;
      return { kind: "back", to: st.last.pos, heading: st.last.heading };
    }
  } else {
    st.backHeld = 0;
  }
  return { kind: "none" };
}
