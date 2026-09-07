// locomotion.ts —— app 层的移动接线：PlayerSim（src/player/）+ 碰撞世界（内核膜）+ 输入适配器 + 驱动相机。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 职责边界：player 模块不认识 editor/three/DOM；本文件把它们接起来——
//   · 世界：editor.revision 变了才 rebuild 碰撞世界（手势中不重建 = 与 freeze/coyote 同口径）；
//   · 冻结票：editor.isGestureActive() → sim.setFrozen("gesture")（user：动词进行到一半 freeze 物理，commit 后才惩罚）；
//   · flat：键盘（FlatInput）+ 右键拖视角（look）→ 每帧把 rig 姿态写成 OrbitCamera（第一人称 = 眼在 headWorld、target 沿视线 D 米）；
//   · VR：xr-input 喂 InputFrame（vr.ts 接），rig 姿态交给 render3 的 rig Group；相机由 XR 写。
// 出入步行模式：进 = 把人放到轨道相机 target 的地面上、朝相机前向；出 = 恢复轨道相机原状。

import type { Editor } from "../editor/editor.ts";
import { KernelCollisionWorld } from "../editor/collision-world.ts";
import { PlayerSim, type RigPose, DEFAULT_CONFIG } from "../player/player.ts";
import { FlatInput } from "../player/flat-input.ts";
import type { InputFrame } from "../player/input.ts";
import type { Ray } from "../player/world-query.ts";

const LOOK_SENS = 0.004;        // rad / px
const PITCH_LIMIT = 1.5;
const TARGET_DIST = 5;          // 第一人称 OrbitCamera 的 target 距离（只影响 near/far 布置与 zoom 语义）
const FIRST_PERSON_NEAR = 0.05;

export type LocomotionMode = "orbit" | "walk";

export class Locomotion {
  readonly world = new KernelCollisionWorld();
  readonly sim = new PlayerSim(this.world, DEFAULT_CONFIG);
  readonly flat = new FlatInput();
  private mode: LocomotionMode = "orbit";
  private lookPitch = 0;
  private saved: { target: { x: number; y: number; z: number }; yaw: number; pitch: number; halfH: number; projection: "ortho" | "persp"; nearMin: number } | null = null;
  private cursor = { x: 0, y: 0 };
  /** 外部输入源（VR）：非 null 时代替键盘。 */
  externalInput: ((dt: number) => InputFrame) | null = null;
  private editor: Editor;
  private canvas: HTMLCanvasElement;

  constructor(editor: Editor, canvas: HTMLCanvasElement) {
    this.editor = editor; this.canvas = canvas;
    this.flat.attach();
    canvas.addEventListener("pointermove", (ev) => {
      const r = canvas.getBoundingClientRect();
      this.cursor = { x: ev.clientX - r.left, y: ev.clientY - r.top };
    });
  }

  getMode(): LocomotionMode { return this.mode; }
  isWalking(): boolean { return this.mode === "walk"; }
  get noclip(): boolean { return this.sim.state.noclip; }
  setNoclip(on: boolean): void { this.sim.state.noclip = on; }

  /** 进步行模式：落到轨道相机 target 的地面上，朝相机前向。 */
  enterWalk(): void {
    if (this.mode === "walk") return;
    const cam = this.editor.cam;
    this.saved = { target: { ...cam.target }, yaw: cam.yaw, pitch: cam.pitch, halfH: cam.halfH, projection: cam.projection, nearMin: cam.nearMin };
    this.syncWorld(true);
    const fwd = cam.forward();
    const heading = Math.atan2(-fwd.x, fwd.y);      // 前向 (−sin h, cos h)
    const t = cam.target;
    const ground = this.world.floorBelow(t.x, t.y, t.z + 50, this.world.floorZ() - 1, 0.5);
    const z = ground ?? Math.max(t.z, this.world.floorZ());
    this.sim.reset({ x: t.x, y: t.y, z }, heading, { x: 0, y: 0, z: DEFAULT_CONFIG.height });
    this.lookPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, Math.asin(Math.max(-1, Math.min(1, fwd.z)))));
    this.mode = "walk";
    this.flat.setEnabled(true);
    cam.projection = "persp";
    cam.nearMin = FIRST_PERSON_NEAR;
    this.syncCamera();
  }
  exitWalk(): void {
    if (this.mode !== "walk") return;
    this.mode = "orbit";
    this.flat.setEnabled(false);
    const cam = this.editor.cam;
    if (this.saved) {
      cam.target = this.saved.target; cam.yaw = this.saved.yaw; cam.pitch = this.saved.pitch; cam.halfH = this.saved.halfH; cam.projection = this.saved.projection; cam.nearMin = this.saved.nearMin;
    }
    this.editor.draw();
  }
  toggleWalk(): void { if (this.mode === "walk") this.exitWalk(); else this.enterWalk(); }

  /** 鼠标视角（app 手势路由在步行模式下把右键拖喂进来）。返回 false = 不在步行模式，调用方走轨道。 */
  look(dxPx: number, dyPx: number): boolean {
    if (this.mode !== "walk") return false;
    this.sim.state.heading -= dxPx * LOOK_SENS;
    this.lookPitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.lookPitch - dyPx * LOOK_SENS));
    this.syncCamera();
    return true;
  }

  /** 碰撞世界跟 checkpoint（force = 无视 revision）。 */
  syncWorld(force = false): void {
    if (force || this.world.revision !== this.editor.revision) this.world.rebuild(this.editor.kernel, this.editor.revision);
  }

  /** 每渲染帧：喂输入、步进、写相机。 */
  tick(dt: number): void {
    if (this.mode !== "walk" && !this.externalInput) return;
    this.syncWorld();
    this.sim.setFrozen("gesture", this.editor.isGestureActive());
    const input = this.externalInput ? this.externalInput(dt) : this.readFlat();
    this.sim.advance(input, dt);
    if (!this.externalInput) this.syncCamera();
  }

  private readFlat(): InputFrame {
    const p = this.lookPitch;
    const head = { local: { x: 0, y: 0, z: DEFAULT_CONFIG.height }, fwdLocal: { x: 0, y: Math.cos(p), z: Math.sin(p) } };
    const vp = this.editor.vp();
    const aim: Ray | null = vp.w > 0 && vp.h > 0 ? this.editor.cam.ray(this.cursor.x, this.cursor.y, vp) : null;
    return this.flat.read(head, aim);
  }

  pose(): RigPose { return this.sim.pose(); }

  /** 第一人称：把 rig 姿态写成 OrbitCamera（眼 = headWorld；yaw/pitch 换算见 camera.ts 约定）。 */
  private syncCamera(): void {
    const cam = this.editor.cam;
    const pose = this.sim.pose();
    const h = pose.heading, p = this.lookPitch;
    const fwd = { x: -Math.sin(h) * Math.cos(p), y: Math.cos(h) * Math.cos(p), z: Math.sin(p) };
    const eye = pose.headWorld;
    cam.target = { x: eye.x + fwd.x * TARGET_DIST, y: eye.y + fwd.y * TARGET_DIST, z: eye.z + fwd.z * TARGET_DIST };
    cam.yaw = h - Math.PI / 2;
    cam.pitch = -p;
    cam.halfH = TARGET_DIST * Math.tan(cam.fovY / 2);
  }

  /** 渲染层要的 teleport 弧线（充能中才有）。 */
  teleportArc(): { points: { x: number; y: number; z: number }[]; valid: boolean; landing: { x: number; y: number; z: number } | null } | null {
    const a = this.sim.state.teleport.arc;
    if (!a) return null;
    return { points: a.points, valid: a.valid, landing: a.valid && a.hit ? a.hit.p : null };
  }

  dispose(): void { this.flat.detach(); }
}
