// player.ts —— 玩家/角色控制器深模块：固定步进的纯状态机 step(state, input, dt, world)。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；user：「player.ts 帮我好好模块化一个，尽量不要和别的代码混乱」）
//
// 移植自 RealHome（user 真实 gamedev 经验，docs/20260521-vr-locomotion.md + 20260629-character-controller.md）并改成 Z 上：
//   三层模型：gameplay 状态（本文件 SSoT：pos / heading / trackingOrigin / headZ …）→ rig（引擎内 three Group，只在 render3）
//   → 相机（VR 由 XR 写、flat 由我们从 rig 姿态推）。**固定 60 Hz 步进**、渲染帧插值 rig、**HMD 姿态永不插值**；
//   身体是连续运动的物理实体，只有 teleport / reset 是设计内的跳（render 那帧不插值）。
//   碰撞体 = 悬浮胶囊三球（顶/中/腹，腹球下缘 = 台阶高，腿区对墙不可见 → 自动上台阶）+ 竖直探针悬挂（脚下 stepUp 上、stickDown 下，
//   五点采样，一阶缓动跟地）+ 水平扫掠子步（防穿薄墙）+ 蹲=角色头高与 HMD 解耦（下自由、上受净空钳）。
//   roomscale：无摇杆时身体追 HMD（XOR）；单步追头位移 > maxRoomscaleStep 视为追踪跳变→只重锚不动身。
//   snap turn 以 pos 为轴（先强制追头、再重锚、再转）。max slope（user：「行」）：|n.z| < cos(maxSlope) 的面不算地。
//   安全地板 = min(0, 模型最低 z)（user：「地板用 min(0,min(model))」）——掉不到无穷，不需要 respawn。
//   noclip：无重力无碰撞；摇杆/WASD **水平**飞（Minecraft 约定，不跟头俯仰——user 2026-09-07：「vr 里面飞的时候 wasd 是水平的，
//   不应跟有高度变化」），up/down（A/B、Q/E）竖直；双击跳 = noclip 开关（input.noclipToggle 边沿，适配器判双击）。
//
// **freeze / coyote 机制（user 2026-09-07：「加一个 coyote 机制，一个 verb 进行到一半的 freeze 物理。免得玩家踩自己脚或者被卡的时候
//   导致鼠标乱飞。等 commit 之后才惩罚玩家」「模块里做一个 freeze 机制…不是简单的几个 monkey patch」）**：
//   - freeze(token)/thaw(token) 计数集（手势、菜单…多来源各持一票）；frozen = 集非空。
//   - 冻结期间**被动物理停摆**：重力、悬挂贴地、静止去穿透、teleport 结算、跳——velZ/grounded 原样保留（真·悬在半空，Wile E. Coyote）。
//   - **主动动作照常**：摇杆步行（仍带扫掠碰撞——那是对自己动作的响应，不是惩罚）、roomscale 身体跟头（user：「平时都是头移动会导致
//     身体跟着的」——冻结期不断开，解冻时就没有「身体追头」的大跳）、snap turn、蹲。
//   - **防瞬移护栏（结构性，不只解冻期）**：静止去穿透永远限速（三球共享预算 passivePushCap/步 ≈ 3 m/s）；身体正被推着（嵌在几何里）
//     的那一步不施重力、不往下贴地（只准向上贴地）——否则悬挂会把脚往「板子底下的地板」拉，和去穿透僵持，最后一步弹飞（实测过）。
//     主动扫掠（步行）仍即时解算（子步很小）。解冻不打 discontinuity（渲染继续插值）。用户在手势里给自己脚下画了板子 / 把自己
//     关进盒子，commit 后才被**连续地**「惩罚」出来。
//
// 单位：米（A10 纪律「内部单位永远是 SI」）；heading：绕 +Z 弧度，0 = 面向 +Y（北），逆时针为正；前向 = (−sin h, cos h)，右向 = (cos h, sin h)。
// 本文件不 import kernel / three / DOM。

/** 可变三维向量（player 状态原地更新；结构上兼容 kernel 的只读 Vec3）。 */
export interface Vec3 { x: number; y: number; z: number; }
import { type InputFrame, stripEdges } from "./input.ts";
import { type TeleportState, initialTeleport, stepTeleport } from "./teleport.ts";
import type { WorldQuery } from "./world-query.ts";

export interface PlayerConfig {
  walkSpeed: number; dashSpeed: number;        // m/s 硬钳（无加速度）
  flySpeed: number; flyDashSpeed: number;      // noclip
  jumpVel: number; gravity: number; gravityHeld: number; terminalVel: number;
  height: number;                              // flat 眼高 / 站立头高
  radius: number; stepHeight: number; stickDown: number; followTau: number;
  crouchMinHead: number; crouchDrop: number;   // 蹲：角色头高地板 / 主动蹲（B / Ctrl）下沉量
  substepLen: number; substepCap: number;
  maxRoomscaleStep: number;
  snapTurnDeg: number;
  maxSlopeDeg: number;
  stickDeadzone: number;
  passivePushCap: number;                      // 静止去穿透每步位移上限（米）——身体永不瞬移的护栏
}

export const DEFAULT_CONFIG: PlayerConfig = {
  walkSpeed: 3, dashSpeed: 6,
  flySpeed: 5, flyDashSpeed: 12,
  jumpVel: 5.5, gravity: 25, gravityHeld: 15, terminalVel: 50,
  height: 1.7,
  radius: 0.3, stepHeight: 0.3, stickDown: 0.3, followTau: 0.06,
  crouchMinHead: 0.75, crouchDrop: 0.7,
  substepLen: 0.3, substepCap: 8,
  maxRoomscaleStep: 0.5,
  snapTurnDeg: 45,
  maxSlopeDeg: 50,
  stickDeadzone: 0.15,
  passivePushCap: 0.05,
};

export const PHYS_DT = 1 / 60;
export const MAX_STEPS_PER_FRAME = 8;

export interface PlayerState {
  pos: Vec3;                      // 脚底世界坐标
  heading: number;               // 绕 +Z
  trackingOrigin: { x: number; y: number };   // rig 局部：HMD 平面位置的锚（VR 校准）；flat=(0,0)
  headZ: number;                 // 角色头高（脚上方；碰撞体用，与 HMD 解耦）
  crouchDrop: number;            // 主动蹲的当前下沉（缓动）
  velZ: number;
  grounded: boolean;
  noclip: boolean;
  scale: number;                 // rig 缩放（phase 2 缩小帽/高达；本轮恒 1）
  t: number;                     // sim 时间（秒）
  freezeReasons: Set<string>;
  discontinuity: boolean;        // 本步发生设计内的跳（teleport/reset/snap）→ 渲染不插值
  teleport: TeleportState;
}

export function createPlayerState(cfg: PlayerConfig = DEFAULT_CONFIG): PlayerState {
  return {
    pos: { x: 0, y: 0, z: 0 }, heading: 0, trackingOrigin: { x: 0, y: 0 },
    headZ: cfg.height, crouchDrop: 0, velZ: 0, grounded: true, noclip: false, scale: 1, t: 0,
    freezeReasons: new Set(), discontinuity: false, teleport: initialTeleport(),
  };
}

export const isFrozen = (st: PlayerState): boolean => st.freezeReasons.size > 0;

// ---------- 方向代数 ----------
export const fwdOf = (h: number): { x: number; y: number } => ({ x: -Math.sin(h), y: Math.cos(h) });
export const rightOf = (h: number): { x: number; y: number } => ({ x: Math.cos(h), y: Math.sin(h) });
/** rig 局部 (x 右, y 前) → 世界平面向量。 */
export function localToWorld2(h: number, lx: number, ly: number): { x: number; y: number } {
  const f = fwdOf(h), r = rightOf(h);
  return { x: r.x * lx + f.x * ly, y: r.y * lx + f.y * ly };
}
/** 世界平面向量 → rig 局部。 */
export function worldToLocal2(h: number, wx: number, wy: number): { x: number; y: number } {
  const f = fwdOf(h), r = rightOf(h);
  return { x: r.x * wx + r.y * wy, y: f.x * wx + f.y * wy };
}

// ---------- 胶囊 ----------
export interface CapsuleSpheres { r: number; topZ: number; bottomZ: number; midZ: number; degenerate: boolean; }
/** 顶球上缘 = 头高；腹球 = min(台阶+r, 顶)——站立时钉在台阶高，蹲低了跟顶球塌成一球。腹球下缘 = 腿区上界（对墙不可见）。 */
export function capsuleSpheres(headZ: number, cfg: PlayerConfig): CapsuleSpheres {
  const r = cfg.radius;
  const topZ = headZ - r;
  const bottomZ = Math.min(cfg.stepHeight + r, topZ);
  const midZ = (bottomZ + topZ) * 0.5;
  return { r, topZ, bottomZ, midZ, degenerate: topZ <= bottomZ + 0.01 };
}

/** 去穿透一轮（三球各推一次，累计到 pos）。返回本轮总位移长度。budget = 本轮位移总预算（解冻护栏；三球共享）。 */
function resolveCapsuleOnce(pos: Vec3, headZ: number, world: WorldQuery, cfg: PlayerConfig, budget: number): number {
  const cs = capsuleSpheres(headZ, cfg);
  let moved = 0;
  const push = (offZ: number): void => {
    if (budget - moved <= 1e-9) return;
    const d = world.pushOut({ x: pos.x, y: pos.y, z: pos.z + offZ }, cs.r);
    if (!d) return;
    let len = Math.hypot(d.x, d.y, d.z);
    if (len === 0) return;
    let k = 1;
    const room = budget - moved;
    if (len > room) { k = room / len; len = room; }
    pos.x += d.x * k; pos.y += d.y * k; pos.z += d.z * k;
    moved += len;
  };
  push(cs.bottomZ);
  if (!cs.degenerate) { push(cs.midZ); push(cs.topZ); }
  return moved;
}
/** 去穿透（≤5 轮收敛）；cap = 本步总位移预算。返回实际位移总长（>0 = 身体正嵌在几何里被推）。 */
export function resolveCapsule(pos: Vec3, headZ: number, world: WorldQuery, cfg: PlayerConfig, cap = Infinity): number {
  let budget = cap, total = 0;
  for (let i = 0; i < 5; i++) {
    const m = resolveCapsuleOnce(pos, headZ, world, cfg, budget);
    total += m;
    if (m < 1e-6) break;
    if (Number.isFinite(budget)) { budget -= m; if (budget <= 1e-6) break; }
  }
  return total;
}

/** 悬挂探针：脚心 + 0.7r 四点环，任一样本找到地就站得住；取最高。 */
const GROUND_SAMPLES: readonly [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
export function groundProbe(pos: Vec3, world: WorldQuery, cfg: PlayerConfig): number | null {
  const top = pos.z + cfg.stepHeight, lo = pos.z - cfg.stickDown;
  const off = cfg.radius * 0.7;
  const minNz = Math.cos((cfg.maxSlopeDeg * Math.PI) / 180);
  let best: number | null = null;
  for (const [sx, sy] of GROUND_SAMPLES) {
    const z = world.floorBelow(pos.x + sx * off, pos.y + sy * off, top, lo, minNz);
    if (z !== null && (best === null || z > best)) best = z;
  }
  return best;
}

/** 头顶净空：从 lo 向 hi 连续上扫（5 cm 步），顶球撞到就停——不是端点测试，薄顶不会被穿过去。 */
export function clearHeadHeight(pos: Vec3, lo: number, hi: number, world: WorldQuery, cfg: PlayerConfig, slack = 0.02): number {
  if (hi <= lo) return hi;
  const r = cfg.radius;
  const blocked = (h: number): boolean => {
    const d = world.pushOut({ x: pos.x, y: pos.y, z: pos.z + h - r }, r - slack);
    return !!d;
  };
  let reached = lo;
  for (let h = lo + 0.05; h < hi; h += 0.05) { if (blocked(h)) return reached; reached = h; }
  return blocked(hi) ? reached : hi;
}

/** 落点净空（teleport 合法性）：站立胶囊在该点不穿几何。 */
export function standingClear(p: Vec3, world: WorldQuery, cfg: PlayerConfig): boolean {
  const cs = capsuleSpheres(cfg.height, cfg);
  const slack = 0.02;
  if (world.pushOut({ x: p.x, y: p.y, z: p.z + cs.bottomZ }, cs.r - slack)) return false;
  if (!cs.degenerate) {
    if (world.pushOut({ x: p.x, y: p.y, z: p.z + cs.midZ }, cs.r - slack)) return false;
    if (world.pushOut({ x: p.x, y: p.y, z: p.z + cs.topZ }, cs.r - slack)) return false;
  }
  return true;
}

// ---------- 步进 ----------
function sweepMove(st: PlayerState, dx: number, dy: number, world: WorldQuery, cfg: PlayerConfig): void {
  if (st.noclip) { st.pos.x += dx; st.pos.y += dy; return; }
  const dist = Math.hypot(dx, dy);
  const n = Math.min(cfg.substepCap, Math.max(1, Math.ceil(dist / cfg.substepLen)));
  const sx = dx / n, sy = dy / n;
  for (let i = 0; i < n; i++) {
    st.pos.x += sx; st.pos.y += sy;
    resolveCapsule(st.pos, st.headZ, world, cfg);
  }
}

function snapTurn(st: PlayerState, delta: number, input: InputFrame, world: WorldQuery, cfg: PlayerConfig): void {
  // 1. 强制追头（接受碰撞允许的量） 2. 重锚（头回到身上） 3. 转
  const il = { x: input.head.local.x - st.trackingOrigin.x, y: input.head.local.y - st.trackingOrigin.y };
  const iw = localToWorld2(st.heading, il.x, il.y);
  st.pos.x += iw.x; st.pos.y += iw.y;
  if (!st.noclip) resolveCapsule(st.pos, st.headZ, world, cfg);
  st.trackingOrigin = { x: input.head.local.x, y: input.head.local.y };
  st.heading += delta;
  st.discontinuity = true;
}

/**
 * 一步固定 dt。顺序：① 蹲/头高 ② snap turn ③ 水平（摇杆 XOR roomscale）④ 竖直（跳/重力/悬挂）⑤ teleport。
 * 冻结（coyote）：③ 照常（主动），④⑤ 与跳停摆；被动去穿透永远限速（见文件头）。
 */
export function stepPlayer(st: PlayerState, input: InputFrame, dt: number, world: WorldQuery, cfg: PlayerConfig = DEFAULT_CONFIG): void {
  st.t += dt;
  const frozen = isFrozen(st);

  // ① 角色头高：HMD 意图（flat = 眼高）− 主动蹲下沉；下自由，上受净空钳，地板 crouchMinHead
  {
    const a = 1 - Math.exp(-dt / 0.1);
    st.crouchDrop += ((input.crouch ? cfg.crouchDrop : 0) - st.crouchDrop) * a;
    const desired = Math.max(cfg.crouchMinHead, input.head.local.z - st.crouchDrop);
    if (st.noclip) st.headZ = desired;
    else if (desired <= st.headZ) st.headZ = desired;
    else st.headZ = Math.max(cfg.crouchMinHead, clearHeadHeight(st.pos, st.headZ, desired, world, cfg));
  }

  // ② snap turn（边沿已由适配器/PlayerSim 保证一帧一次）
  if (input.turn) snapTurn(st, (input.turn * cfg.snapTurnDeg * Math.PI) / 180, input, world, cfg);
  // ②' 双击跳 = noclip 开关（Minecraft）：开 = 悬停在原地；关 = 从当前位置照常受重力
  if (input.noclipToggle) { st.noclip = !st.noclip; st.velZ = 0; if (!st.noclip) st.grounded = false; }

  // ③ 水平：摇杆 XOR roomscale
  const mag = Math.hypot(input.walkX, input.walkY);
  if (mag >= cfg.stickDeadzone) {
    const k = Math.min(mag, 1) / mag;
    const f3 = localToWorldFwd(st.heading, input.head.fwdLocal);
    // 步行与飞行都只取头前向的水平分量（飞行的竖直由 up/down 单独管，Minecraft 约定）
    const fh = Math.hypot(f3.x, f3.y) || 1;
    const fx = f3.x / fh, fy = f3.y / fh;
    const rx = fy, ry = -fx;   // 右 = 前 × 上（Z 上）：(fx,fy,0)×(0,0,1) = (fy, −fx, 0)
    const speed = (st.noclip ? (input.dash ? cfg.flyDashSpeed : cfg.flySpeed) : (input.dash ? cfg.dashSpeed : cfg.walkSpeed)) * dt * k;
    sweepMove(st, (fx * input.walkY + rx * input.walkX) * speed, (fy * input.walkY + ry * input.walkX) * speed, world, cfg);
  } else {
    // roomscale：身体追 HMD（冻结期照旧——user：「平时都是头移动会导致身体跟着的」）
    const il = { x: input.head.local.x - st.trackingOrigin.x, y: input.head.local.y - st.trackingOrigin.y };
    const iw = localToWorld2(st.heading, il.x, il.y);
    const d = Math.hypot(iw.x, iw.y);
    if (d > cfg.maxRoomscaleStep) {
      // 追踪跳变护栏：非物理的姿态跳（recenter/丢追踪）→ 只重锚不动身，不发明旋转
      st.trackingOrigin = { x: input.head.local.x, y: input.head.local.y };
    } else if (d > 1e-9) {
      const before = { x: st.pos.x, y: st.pos.y };
      sweepMove(st, iw.x, iw.y, world, cfg);
      const aw = { x: st.pos.x - before.x, y: st.pos.y - before.y };
      const al = worldToLocal2(st.heading, aw.x, aw.y);
      st.trackingOrigin = { x: st.trackingOrigin.x + al.x, y: st.trackingOrigin.y + al.y };
    }
  }

  // ④ 竖直
  if (st.noclip) {
    const speed = (input.dash ? cfg.flyDashSpeed : cfg.flySpeed) * dt;
    if (input.up) st.pos.z += speed;
    if (input.down) st.pos.z -= speed;
    st.velZ = 0; st.grounded = true;
  } else if (!frozen) {
    if (input.jump && st.grounded) { st.velZ = cfg.jumpVel; st.grounded = false; }
    const zBefore = st.pos.z;
    const pushed = resolveCapsule(st.pos, st.headZ, world, cfg, cfg.passivePushCap);
    if (st.velZ > 0 && st.pos.z < zBefore - 1e-4) st.velZ = 0;   // 撞头
    const embedded = pushed > 1e-6;
    const g = st.velZ <= 0 ? groundProbe(st.pos, world, cfg) : null;
    if (g !== null && (!embedded || g >= st.pos.z - 1e-6)) {
      // 悬挂：脚一阶缓动跟地（永不瞬移）；嵌在几何里时只准向上贴（下面那层地板在实体内部，不是地）
      const a = 1 - Math.exp(-dt / cfg.followTau);
      st.pos.z += (g - st.pos.z) * a;
      st.velZ = 0; st.grounded = true;
    } else if (embedded) {
      st.velZ = 0;   // 去穿透拥有身体：不施重力
    } else {
      st.grounded = false;
      const gg = input.jump && st.velZ > 0 ? cfg.gravityHeld : cfg.gravity;
      st.velZ -= gg * dt;
      if (st.velZ < -cfg.terminalVel) st.velZ = -cfg.terminalVel;
      st.pos.z += st.velZ * dt;
      const floor = world.floorZ();
      if (st.pos.z <= floor) { st.pos.z = floor; st.velZ = 0; st.grounded = true; }
    }
  }

  // ⑤ teleport（冻结期停摆：手势中不结算）
  if (!frozen) {
    const minNz = Math.cos((cfg.maxSlopeDeg * Math.PI) / 180);
    const act = stepTeleport(st.teleport, input, st.t, dt, world, {
      minNz, headroomOk: (p) => standingClear(p, world, cfg), v0Scale: Math.sqrt(st.scale),
    });
    if (act.kind === "jump") {
      st.teleport.last = { pos: { ...st.pos }, heading: st.heading };
      jumpTo(st, act.to, st.heading + act.headingDelta, input);
    } else if (act.kind === "back") {
      const here = { pos: { ...st.pos }, heading: st.heading };
      jumpTo(st, act.to, act.heading, input);
      st.teleport.last = here;   // 再拉一次跳回去
    }
  } else if (st.teleport.charging) {
    st.teleport.charging = false; st.teleport.arc = null; st.teleport.yawSteps = 0;
  }
}

/** rig 局部前向（含俯仰）→ 世界。 */
function localToWorldFwd(h: number, f: Vec3): Vec3 {
  const w = localToWorld2(h, f.x, f.y);
  return { x: w.x, y: w.y, z: f.z };
}

/** 设计内的跳：落点 + 朝向；头重锚到身上（落点就是脚下）。 */
export function jumpTo(st: PlayerState, to: Vec3, heading: number, input: InputFrame): void {
  st.pos = { ...to };
  st.heading = heading;
  st.trackingOrigin = { x: input.head.local.x, y: input.head.local.y };
  st.velZ = 0; st.grounded = true;
  st.discontinuity = true;
}

// ---------- rig 姿态（引擎消费） ----------
export interface RigPose {
  origin: Vec3;        // rig 原点（世界）：pos − R(h)·trackingOrigin，z 含蹲下沉
  heading: number;
  headWorld: Vec3;     // = origin + R(h)·head.local
}
export function rigPose(st: PlayerState, head: Vec3): RigPose {
  const to = localToWorld2(st.heading, st.trackingOrigin.x, st.trackingOrigin.y);
  const origin = { x: st.pos.x - to.x, y: st.pos.y - to.y, z: st.pos.z - st.crouchDrop };
  const hw = localToWorld2(st.heading, head.x, head.y);
  return { origin, heading: st.heading, headWorld: { x: origin.x + hw.x, y: origin.y + hw.y, z: origin.z + head.z } };
}

// ---------- 固定步进 + 渲染插值 ----------
/**
 * PlayerSim：累加器固定 60 Hz 步进；渲染帧读 pose(alpha) 得插值 rig 原点（heading 取最新，不插值）；
 * 一帧多步只有第一步吃边沿；discontinuity 那帧 prev=cur（不抹跳）。
 */
export class PlayerSim {
  readonly state: PlayerState;
  private acc = 0;
  private prev: RigPose;
  private cur: RigPose;
  private lastHead: Vec3 = { x: 0, y: 0, z: 1.7 };
  world: WorldQuery;
  cfg: PlayerConfig;
  constructor(world: WorldQuery, cfg: PlayerConfig = DEFAULT_CONFIG) {
    this.world = world; this.cfg = cfg;
    this.state = createPlayerState(cfg);
    this.prev = this.cur = rigPose(this.state, this.lastHead);
  }

  freeze(token: string): void { this.state.freezeReasons.add(token); }
  thaw(token: string): void { this.state.freezeReasons.delete(token); }
  setFrozen(token: string, on: boolean): void { if (on) this.freeze(token); else this.thaw(token); }
  isFrozen(): boolean { return isFrozen(this.state); }

  /** 推进 renderDt 秒（可含多步或零步）。 */
  advance(input: InputFrame, renderDt: number): void {
    this.lastHead = input.head.local;
    this.acc += Math.min(renderDt, 0.25);
    let steps = 0;
    let discontinuity = false;
    let f = input;
    while (this.acc >= PHYS_DT && steps < MAX_STEPS_PER_FRAME) {
      this.prev = rigPose(this.state, this.lastHead);
      stepPlayer(this.state, f, PHYS_DT, this.world, this.cfg);
      if (this.state.discontinuity) { discontinuity = true; this.state.discontinuity = false; }
      this.acc -= PHYS_DT;
      steps++;
      f = stripEdges(f);
    }
    if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;   // 后台节流尖峰：丢余量
    this.cur = rigPose(this.state, this.lastHead);
    if (discontinuity) this.prev = this.cur;
  }

  /** 渲染帧用：插值后的 rig 姿态。 */
  pose(): RigPose {
    const a = Math.max(0, Math.min(1, this.acc / PHYS_DT));
    const o = { x: this.prev.origin.x + (this.cur.origin.x - this.prev.origin.x) * a, y: this.prev.origin.y + (this.cur.origin.y - this.prev.origin.y) * a, z: this.prev.origin.z + (this.cur.origin.z - this.prev.origin.z) * a };
    const hw = localToWorld2(this.cur.heading, this.lastHead.x, this.lastHead.y);
    return { origin: o, heading: this.cur.heading, headWorld: { x: o.x + hw.x, y: o.y + hw.y, z: o.z + this.lastHead.z } };
  }

  /** 出生/重置：脚落 pos、朝 heading；头重锚到当前 HMD。 */
  reset(pos: Vec3, heading: number, head: Vec3): void {
    const st = this.state;
    st.pos = { ...pos }; st.heading = heading;
    st.trackingOrigin = { x: head.x, y: head.y };
    st.headZ = Math.max(this.cfg.crouchMinHead, head.z);
    st.velZ = 0; st.grounded = true; st.crouchDrop = 0;
    st.teleport = initialTeleport();
    st.discontinuity = false;
    this.lastHead = head;
    this.acc = 0;
    this.prev = this.cur = rigPose(st, head);
  }

  /** Quest「Reset View」：参考系重锚 + 报告的 yaw 偏移 → 世界朝向稳定、身体不动。 */
  handleTrackingReset(yawShift: number, head: Vec3): void {
    const st = this.state;
    st.heading += yawShift;
    st.trackingOrigin = { x: head.x, y: head.y };
    this.lastHead = head;
    this.prev = this.cur = rigPose(st, head);
  }
}
