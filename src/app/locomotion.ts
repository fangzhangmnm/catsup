// locomotion.ts —— app 层的移动接线：PlayerSim（src/player/）+ 碰撞世界（内核膜）+ 输入适配器 + 驱动相机。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 职责边界：player 模块不认识 editor/three/DOM；本文件把它们接起来——
//   · 世界：editor.revision 变了才 rebuild 碰撞世界（手势中不重建 = 与 freeze/coyote 同口径）；
//   · 冻结票：editor.isGestureActive() → sim.setFrozen("gesture")（user：动词进行到一半 freeze 物理，commit 后才惩罚）；
//   · flat：键盘（FlatInput）+ 右键拖视角（look）→ 每帧把 rig 姿态写成 OrbitCamera（第一人称 = 眼在 headWorld、target 沿视线 D 米）；
//   · VR：xr-input 喂 InputFrame（vr.ts 接），rig 姿态交给 render3 的 rig Group；相机由 XR 写。
// 出入步行模式（2026-10-28 改成 FPS，纪元账本 FM140 / FM141 / FM145 / FM151 / FM154；Claude Opus 5.5）：
//   平时（orbit）：步行不开，按什么键都不会进步行，只有视图菜单「步行相机」开（user「平时不行模式不开……按什么都不会去步行，得开」）。
//   放置（place）：光标 / 笔悬停处画一个胶囊虚影（半径 + 身高；绿 = 站得下、红 = 站不下），点一下 = 落在那里（placement.ts 深模块）；
//     马前炮小窗调眼高；Esc / 取消 = 回平时，什么都没发生。
//   走（walk）：锁鼠标的 FPS（WASD 走、空格跳、鼠标看）；锁不上的设备（触屏）照旧右键拖 / 双指看。
//     Esc = 离开步行、回到进来之前的视角，什么都没发生过（user「步行模式的时候esc回到平时模式。什么都没发生过」）；
//     Tab = 原地编辑（user「步行模式的时候tab是临时编辑模式，这时候有一个页面上方正中的小按钮说要不要回去。只有一个按钮」）。
//   原地编辑（edit）：镜头钉在眼睛这里、鼠标放出来，工具照常用；页面上方正中「继续走」= 回 FPS（重新锁鼠标要一次点击，按钮正好是）。
//   碰撞世界 = 全场景（WorldView，含网格体），不再只是当前那一层的硬表面内核。

import type { Editor } from "../editor/editor.ts";
import { KernelCollisionWorld } from "../editor/collision-world.ts";
import { PlayerSim, type RigPose, DEFAULT_CONFIG } from "../player/player.ts";
import { FlatInput } from "../player/flat-input.ts";
import type { InputFrame } from "../player/input.ts";
import type { Ray } from "../player/world-query.ts";
import { placeCapsule, type Placement } from "../player/placement.ts";

const LOOK_SENS = 0.004;        // rad / px
const PITCH_LIMIT = 1.5;
const TARGET_DIST = 5;          // 第一人称 OrbitCamera 的 target 距离（只影响 near/far 布置与 zoom 语义）
const FIRST_PERSON_NEAR = 0.05;
const SPAWN_SOUTH = 3;          // 默认出生点：原点正南 3 m，面朝北（看得见原点与三轴）

export type LocomotionMode = "orbit" | "walk" | "xr";
/** 步行的几个阶段（mode = walk 时 walk / edit；放置时 mode 还是 orbit）。 */
export type WalkPhase = "off" | "place" | "walk" | "edit";
/** 眼高的默认 / 上下限（米；马前炮可调）。 */
export const EYE_DEFAULT = DEFAULT_CONFIG.height, EYE_MIN = 0.3, EYE_MAX = 5;

export class Locomotion {
  readonly world = new KernelCollisionWorld();
  readonly sim = new PlayerSim(this.world, DEFAULT_CONFIG);
  readonly flat = new FlatInput();
  private mode: LocomotionMode = "orbit";
  private lookPitch = 0;
  private saved: { target: { x: number; y: number; z: number }; yaw: number; pitch: number; halfH: number; projection: "ortho" | "persp"; nearMin: number } | null = null;
  private cursor = { x: 0, y: 0 };
  private phase: WalkPhase = "off";
  /** 放置的眼高（马前炮；落下去以后就是这个人的身高）。 */
  eyeHeight = EYE_DEFAULT;
  /** 悬停处的放置结果（画虚影用）。 */
  private ghost: Placement | null = null;
  /** 自己为了原地编辑放开鼠标（区别于 Esc 被浏览器放开）。 */
  private unlockForEdit = false;
  /** 阶段变了（app 刷新上方那颗按钮 / 提示）。 */
  onPhase: (() => void) | null = null;
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
      if (this.phase === "place") this.updateGhost();
    });
    // 放置：点一下 = 落下去（工具层在放置时被挡住，gestures toolBlocked）。鼠标 / 笔 = 按下就落；手指 = 轻点才落（拖 = 照常转视角）
    let touchDown: { x: number; y: number; t: number } | null = null;
    const placeAt = (ev: PointerEvent): void => {
      const r = canvas.getBoundingClientRect();
      this.cursor = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      this.updateGhost();
      this.commitPlace();
    };
    canvas.addEventListener("pointerdown", (ev) => {
      if (this.phase !== "place" || ev.button !== 0) return;
      if (ev.pointerType === "touch") { touchDown = { x: ev.clientX, y: ev.clientY, t: performance.now() }; return; }
      placeAt(ev);
    });
    canvas.addEventListener("pointerup", (ev) => {
      const d = touchDown; touchDown = null;
      if (this.phase !== "place" || ev.pointerType !== "touch" || !d) return;
      if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 12 && performance.now() - d.t < 400) placeAt(ev);
    });
    // 锁鼠标的 FPS：鼠标动 = 看
    document.addEventListener("mousemove", (ev) => { if (document.pointerLockElement === canvas && this.phase === "walk") this.look(ev.movementX, ev.movementY); });
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === canvas) return;
      if (this.unlockForEdit) { this.unlockForEdit = false; return; }
      if (this.phase === "walk") this.exitWalk();   // 锁着时按 Esc：浏览器放开鼠标 = 离开步行（什么都没发生过）
    });
  }
  walkPhase(): WalkPhase { return this.phase; }
  isPlacing(): boolean { return this.phase === "place"; }
  /** FPS 进行中（不是原地编辑）：键盘归走路，工具键不响应。 */
  isFps(): boolean { return this.phase === "walk"; }
  isEditInPlace(): boolean { return this.phase === "edit"; }
  private setPhase(p: WalkPhase): void { this.phase = p; this.onPhase?.(); }

  /** 视图菜单「步行相机」：进放置（先点一下落在哪）。 */
  beginPlace(): void {
    if (this.mode !== "orbit" || this.phase !== "off") return;
    this.syncWorld(true);
    this.setPhase("place");
    this.updateGhost();
  }
  cancelPlace(): void { if (this.phase !== "place") return; this.ghost = null; this.setPhase("off"); this.editor.draw(); }
  /** 眼高改了：虚影跟着重画。 */
  refreshGhost(): void { if (this.phase === "place") this.updateGhost(); }
  private updateGhost(): void {
    const vp = this.editor.vp();
    if (!(vp.w > 0 && vp.h > 0)) return;
    this.ghost = placeCapsule(this.world, this.editor.cam.ray(this.cursor.x, this.cursor.y, vp), { radius: DEFAULT_CONFIG.radius, height: this.eyeHeight });
    this.editor.draw();
  }
  /** 放置的虚影（渲染用；不在放置 = null）。 */
  placeGhost(): { feet: { x: number; y: number; z: number }; radius: number; height: number; ok: boolean } | null {
    return this.phase === "place" && this.ghost ? { feet: this.ghost.feet, radius: DEFAULT_CONFIG.radius, height: this.eyeHeight, ok: this.ghost.ok } : null;
  }
  placeWhy(): string | null { return this.phase === "place" ? (this.ghost ? this.ghost.why ?? null : "往地面上点（朝天看点不到地方）") : null; }
  private commitPlace(): void {
    const g = this.ghost;
    if (!g || !g.ok) return;
    const cam = this.editor.cam;
    this.saved = { target: { ...cam.target }, yaw: cam.yaw, pitch: cam.pitch, halfH: cam.halfH, projection: cam.projection, nearMin: cam.nearMin };
    const fwd = cam.forward(), heading = Math.atan2(-fwd.x, fwd.y);
    this.sim.cfg = { ...DEFAULT_CONFIG, height: this.eyeHeight };
    this.sim.reset({ ...g.feet }, heading, { x: 0, y: 0, z: this.eyeHeight });
    this.lookPitch = 0;
    this.ghost = null;
    this.mode = "walk";
    cam.projection = "persp";
    cam.nearMin = FIRST_PERSON_NEAR;
    this.syncCamera();
    this.resumeWalk();
  }
  /** 回 FPS（放置落下 / 原地编辑里点「继续走」）：要一次用户点击才锁得上鼠标，这两个入口都是点击。 */
  resumeWalk(): void {
    if (this.mode !== "walk") return;
    this.flat.setEnabled(true);
    this.setPhase("walk");
    try { const r = this.canvas.requestPointerLock?.() as unknown; if (r instanceof Promise) r.catch(() => {}); } catch { /* 锁不上（触屏）：照旧右键拖 / 双指看 */ }
  }
  /** Tab：原地编辑（镜头钉住、鼠标放出来、键盘归工具）。 */
  editInPlace(): void {
    if (this.phase !== "walk") return;
    this.flat.setEnabled(false);
    if (document.pointerLockElement === this.canvas) { this.unlockForEdit = true; document.exitPointerLock(); }
    this.setPhase("edit");
  }

  getMode(): LocomotionMode { return this.mode; }
  isWalking(): boolean { return this.mode === "walk"; }
  isXR(): boolean { return this.mode === "xr"; }
  /** 上次 VR 站位（视图态；无地期只在内存，A13：进 VR 落在上次站位）。 */
  private lastStance: { pos: { x: number; y: number; z: number }; heading: number } | null = null;

  /** 进 XR：输入改由 vr.ts 每帧喂；相机由 XR 写；站位 = 上次站位或轨道相机 target 落地。返回出生点（首帧 reset 用）。 */
  enterXR(read: (dt: number) => InputFrame): { pos: { x: number; y: number; z: number }; heading: number } {
    const cam = this.editor.cam;
    if (this.mode === "orbit") this.saved = { target: { ...cam.target }, yaw: cam.yaw, pitch: cam.pitch, halfH: cam.halfH, projection: cam.projection, nearMin: cam.nearMin };
    this.flat.setEnabled(false);
    this.syncWorld(true);
    let spawn = this.lastStance;
    if (!spawn) spawn = this.defaultSpawn();
    this.mode = "xr";
    this.externalInput = read;
    return spawn;
  }
  /** 默认出生点（user 2026-09-07：「vr 里出生点是面对正北 +y 的吧，保证一下，以及不要在原点出生，而是能看到原点的地方」）：
   *  原点正南 3 m、面朝 +Y（heading 0 = 北），脚落地面。 */
  defaultSpawn(): { pos: { x: number; y: number; z: number }; heading: number } {
    const x = 0, y = -SPAWN_SOUTH;
    const ground = this.world.floorBelow(x, y, 50, this.world.floorZ() - 1, 0.5);
    return { pos: { x, y, z: ground ?? Math.max(0, this.world.floorZ()) }, heading: 0 };
  }
  exitXR(): void {
    if (this.mode !== "xr") return;
    this.lastStance = { pos: { ...this.sim.state.pos }, heading: this.sim.state.heading };
    this.externalInput = null;
    this.mode = "orbit";
    const cam = this.editor.cam;
    if (this.saved) {
      cam.target = this.saved.target; cam.yaw = this.saved.yaw; cam.pitch = this.saved.pitch; cam.halfH = this.saved.halfH; cam.projection = this.saved.projection; cam.nearMin = this.saved.nearMin;
    }
    this.editor.draw();
  }
  get noclip(): boolean { return this.sim.state.noclip; }
  setNoclip(on: boolean): void { this.sim.state.noclip = on; }

  /** 直接进步行（不经放置；测试 / 探针用）：落到轨道相机 target 的地面上，朝相机前向。 */
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
    this.setPhase("walk");
  }
  /** 离开步行：回到进来之前的视角（什么都没发生过）。放置中 = 取消放置。 */
  exitWalk(): void {
    if (this.phase === "place") { this.cancelPlace(); return; }
    if (this.mode !== "walk") return;
    this.mode = "orbit";
    this.flat.setEnabled(false);
    if (document.pointerLockElement === this.canvas) { this.unlockForEdit = true; document.exitPointerLock(); }
    this.sim.cfg = DEFAULT_CONFIG;
    this.setPhase("off");
    const cam = this.editor.cam;
    if (this.saved) {
      cam.target = this.saved.target; cam.yaw = this.saved.yaw; cam.pitch = this.saved.pitch; cam.halfH = this.saved.halfH; cam.projection = this.saved.projection; cam.nearMin = this.saved.nearMin;
    }
    this.editor.draw();
  }
  toggleWalk(): void { if (this.mode === "walk" || this.phase === "place") this.exitWalk(); else this.beginPlace(); }

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
    if (force || this.world.revision !== this.editor.revision) this.world.rebuild(this.editor.worldGeom(), this.editor.revision);   // 全场景（世界坐标，含网格体）
  }

  /** 每渲染帧：喂输入、步进、写相机（XR 模式相机归 XR，只步进）。 */
  tick(dt: number): void {
    if (this.mode === "orbit") return;
    this.syncWorld();
    this.sim.setFrozen("gesture", this.editor.isGestureActive());
    const input = this.mode === "xr" && this.externalInput ? this.externalInput(dt) : this.readFlat();
    this.sim.advance(input, dt);
    if (this.mode === "walk") this.syncCamera();
  }

  private readFlat(): InputFrame {
    const p = this.lookPitch;
    const head = { local: { x: 0, y: 0, z: this.sim.cfg.height }, fwdLocal: { x: 0, y: Math.cos(p), z: Math.sin(p) } };
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
