// xr-input.ts —— WebXR 手柄/头显 → InputFrame（xr-standard 映射）+ 参考系（Y 上）→ rig 局部（Z 上）→ 世界 的姿态代数。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；键位抄 RealHome src/xrControls.js，user 真实 gamedev 经验）
//
// 零 three：直接读 WebXR（frame.getPose / session.inputSources），three 只在 render3 画控制器射线（它也从同一帧姿态更新）。
// xr-standard gamepad：buttons[0] trigger · [1] grip · [3] 摇杆按下 · [4] A/X · [5] B/Y；axes[2],[3] = 摇杆 x, y（y 前推为负）。
// 键位（A13 user 拍板）：左摇杆走、按下冲刺；右摇杆 = dpad：左右 snap turn、前推 teleport 充能、后推回上一点；
//   充能中左摇杆 dpad：上下 = 发射速度档、左右 = 落地朝向；A 跳 B 蹲；noclip 时 A/B = 上下飞。
//   左 X/Y（[4]/[5]）= 撤销/重做 边沿（本文件只报边沿，app 层接）；trigger = 工具指针（app 层接）。
// 触觉：hapticActuators[0].pulse(强度, 毫秒) 标准写法，不打补丁（user：「先不用做 monkey patch，就按照正确的写」）。
//
// 坐标：WebXR local-floor 参考系 Y 上、前 −Z；rig 局部 Z 上、x 右、y 前 → M: (x, y, z)_ref → (x, −z, y)_rig。
// 世界 = rig 原点 + Rz(heading)·局部（rigPose 见 player.ts）。

import { type HeadFrame, type InputFrame, Dpad, DirEdge, ButtonEdge, emptyInput } from "./input.ts";
import { localToWorld2, type RigPose, type Vec3 } from "./player.ts";
import type { Ray } from "./world-query.ts";

export interface Quat { x: number; y: number; z: number; w: number; }
export interface RefPose { position: { x: number; y: number; z: number }; orientation: Quat; }

/** 参考系（Y 上）向量 → rig 局部（Z 上）。 */
export const refToRig = (v: { x: number; y: number; z: number }): Vec3 => ({ x: v.x, y: -v.z, z: v.y });
/** 四元数旋转向量。 */
export function rotateByQuat(q: Quat, v: { x: number; y: number; z: number }): Vec3 {
  const { x: qx, y: qy, z: qz, w: qw } = q;
  // t = 2 q×v ; v' = v + w t + q×t
  const tx = 2 * (qy * v.z - qz * v.y), ty = 2 * (qz * v.x - qx * v.z), tz = 2 * (qx * v.y - qy * v.x);
  return { x: v.x + qw * tx + (qy * tz - qz * ty), y: v.y + qw * ty + (qz * tx - qx * tz), z: v.z + qw * tz + (qx * ty - qy * tx) };
}
/** 姿态的前向（参考系 −Z）→ rig 局部。 */
export const forwardRig = (q: Quat): Vec3 => refToRig(rotateByQuat(q, { x: 0, y: 0, z: -1 }));
export const upRig = (q: Quat): Vec3 => refToRig(rotateByQuat(q, { x: 0, y: 1, z: 0 }));

/** rig 局部点 → 世界（含 heading 与 rig 原点）。 */
export function rigToWorld(rig: RigPose, p: Vec3): Vec3 {
  const w = localToWorld2(rig.heading, p.x, p.y);
  return { x: rig.origin.x + w.x, y: rig.origin.y + w.y, z: rig.origin.z + p.z };
}
/** rig 局部方向 → 世界方向（只转不平移）。 */
export function rigDirToWorld(rig: RigPose, d: Vec3): Vec3 {
  const w = localToWorld2(rig.heading, d.x, d.y);
  return { x: w.x, y: w.y, z: d.z };
}
/** 参考系姿态 → 世界射线（targetRay：原点 + 前向）。 */
export function poseRayWorld(pose: RefPose, rig: RigPose): Ray {
  return { origin: rigToWorld(rig, refToRig(pose.position)), dir: rigDirToWorld(rig, forwardRig(pose.orientation)) };
}
/** 头显姿态 → HeadFrame（rig 局部）。 */
export function headFrameOf(pose: RefPose): HeadFrame {
  return { local: refToRig(pose.position), fwdLocal: forwardRig(pose.orientation) };
}

export interface XRHandState {
  present: boolean;
  ray: Ray | null;          // 世界
  gripRay: Ray | null;      // 世界（手腕面板挂点）
  trigger: boolean; triggerValue: number;
  squeeze: boolean;
  stickPress: boolean;
  a: boolean; b: boolean;
  axes: { x: number; y: number };
}
const emptyHand = (): XRHandState => ({ present: false, ray: null, gripRay: null, trigger: false, triggerValue: 0, squeeze: false, stickPress: false, a: false, b: false, axes: { x: 0, y: 0 } });

/** 本帧解析出的 XR 输入（InputFrame 之外 app 层要用的：两手状态 + 撤销/重做边沿）。 */
export interface XRFrameInput {
  input: InputFrame;
  left: XRHandState; right: XRHandState;
  undoEdge: boolean; redoEdge: boolean;
  head: RefPose | null;
}

export class XRInput {
  private dpadL = new Dpad();
  private dpadR = new Dpad();
  private turnL = new DirEdge(); private turnR = new DirEdge();
  private tierUp = new DirEdge(); private tierDown = new DirEdge();
  private yawL = new DirEdge(); private yawR = new DirEdge();
  private xEdge = new ButtonEdge(); private yEdge = new ButtonEdge();
  private lastHead: HeadFrame = { local: { x: 0, y: 0, z: 1.6 }, fwdLocal: { x: 0, y: 1, z: 0 } };

  /** 每 XR 帧一次：读 session.inputSources 与头显姿态，产 InputFrame（世界射线按当前 rig 姿态算）。 */
  read(session: XRSession, frame: XRFrame, ref: XRReferenceSpace, rig: RigPose, noclip: boolean): XRFrameInput {
    const left = emptyHand(), right = emptyHand();
    let head: RefPose | null = null;
    const vp = frame.getViewerPose(ref);
    if (vp) {
      head = { position: vp.transform.position, orientation: vp.transform.orientation };
      this.lastHead = headFrameOf(head);
    }
    for (const src of session.inputSources) {
      if (src.handedness !== "left" && src.handedness !== "right") continue;
      const h = src.handedness === "left" ? left : right;
      h.present = true;
      const pose = frame.getPose(src.targetRaySpace, ref);
      if (pose) h.ray = poseRayWorld({ position: pose.transform.position, orientation: pose.transform.orientation }, rig);
      if (src.gripSpace) {
        const gp = frame.getPose(src.gripSpace, ref);
        if (gp) h.gripRay = poseRayWorld({ position: gp.transform.position, orientation: gp.transform.orientation }, rig);
      }
      const g = src.gamepad;
      if (g) {
        const ax = g.axes;
        // xr-standard：摇杆在 axes[2],[3]；老 profile 只有 [0],[1]（RealHome 同款兜底：谁幅值大用谁）
        const a23 = Math.abs(ax[2] ?? 0) + Math.abs(ax[3] ?? 0), a01 = Math.abs(ax[0] ?? 0) + Math.abs(ax[1] ?? 0);
        h.axes = a23 >= a01 ? { x: ax[2] ?? 0, y: -(ax[3] ?? 0) } : { x: ax[0] ?? 0, y: -(ax[1] ?? 0) };
        h.trigger = !!g.buttons[0]?.pressed; h.triggerValue = g.buttons[0]?.value ?? 0;
        h.squeeze = !!g.buttons[1]?.pressed;
        h.stickPress = !!g.buttons[3]?.pressed;
        h.a = !!g.buttons[4]?.pressed; h.b = !!g.buttons[5]?.pressed;
      }
    }

    const f = emptyInput();
    f.head = this.lastHead;
    f.aim = right.ray;
    // 右摇杆 dpad：左右 snap turn 边沿、前推充能、后拉回上一点
    const dr = this.dpadR.update(right.axes.x, right.axes.y);
    if (this.turnL.update(dr, "left")) f.turn = 1;
    if (this.turnR.update(dr, "right")) f.turn = -1;
    f.tpCharge = dr === "up";
    f.tpBack = dr === "down";
    // 左摇杆：充能中 = dpad（档位/朝向），否则走
    const dl = this.dpadL.update(left.axes.x, left.axes.y);
    if (f.tpCharge) {
      if (this.tierUp.update(dl, "up")) f.tierStep = 1;
      if (this.tierDown.update(dl, "down")) f.tierStep = -1;
      if (this.yawL.update(dl, "left")) f.yawStep = 1;
      if (this.yawR.update(dl, "right")) f.yawStep = -1;
    } else {
      f.walkX = left.axes.x; f.walkY = left.axes.y;
      this.tierUp.update("none", "up"); this.tierDown.update("none", "down"); this.yawL.update("none", "left"); this.yawR.update("none", "right");
    }
    f.dash = left.stickPress;
    if (noclip) { f.up = right.a; f.down = right.b; }
    else { f.jump = right.a; f.crouch = right.b; }
    const undoEdge = this.xEdge.update(left.a);
    const redoEdge = this.yEdge.update(left.b);
    return { input: f, left, right, undoEdge, redoEdge, head };
  }
}

/** 震一下（标准 pulse；没有 actuator 静默）。 */
export function pulse(session: XRSession | null, hand: "left" | "right" | "both", intensity = 0.7, ms = 60): void {
  if (!session) return;
  for (const src of session.inputSources) {
    if (hand !== "both" && src.handedness !== hand) continue;
    const act = src.gamepad?.hapticActuators?.[0];
    if (act?.pulse) act.pulse(intensity, ms).catch(() => {});
  }
}
