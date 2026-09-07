// render3.ts —— three.js 适配层：把 kernel 状态 + 相机参数 + 预演影子副本画出来。
// 边界纪律：three 只在本文件出现；相机数学在 camera.ts、拾取/求解在 pick.ts/solver.ts（都不碰 three）。
// created by Claude Fable 5 2026-09-01（playground 耗材版）；**Workbench 雏形重写 2026-09-06 by Claude Fable 5.1**
//   （user：「perspective camera」「所有的面同一层灰色，好看一点」「线之间的 z fighting 和有时候有些线看不见…现在需要好好处理」
//    「可以开始做 workbench(blender renderer) 雏形」）。
//
// Workbench 雏形 = Blender 实体模式的观感：
//   - 面：统一灰、不透明、**按法向手算的平光**（key light 钉在相机系：|n·L| 映射亮度，双面对称、零灯光配置——
//     three r155+ 物理光强单位下 Lambert 出来一片黑，手算更可预测）；选中/悬停换蓝灰色（不再叠半透明高亮 mesh）。
//   - 边：three addons 粗线（LineSegments2，屏幕像素宽，DPR 无关——1px LineBasicMaterial 在 iPad DPR2 下细成半像素
//     = 「有些线看不见」的真身之一）。粗线是三角形 → polygonOffset 生效：**面 +1/+1 后推、线 −1/−2 前拉**，
//     共面线永远赢面、被真正挡住的线仍被挡——z-fight 的结构性修法，不再靠 depthOnly 预通道。
//   - 相机：两制（cam.projection）——正交 OrthographicCamera / 透视 PerspectiveCamera，near/far 随眼距布置，
//     深度精度不再是 0.1..20000 一刀切。
//   - 顶点点不再常显（SU 观感）；吸附/充能指示按屏幕像素定尺寸（透视下按深度换算）。
// 每帧整组重建（dispose 旧几何）；当前规模无压力，慢了再做增量。

import * as THREE from "three";
import { LineSegments2 } from "../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../vendor/three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "../vendor/three/addons/lines/LineMaterial.js";
import type { EdgeId, FaceId, Kernel, Pt3 } from "../kernel/kernel.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import type { Snap3 } from "./pick.ts";
import { dot3, sub3 } from "../kernel/geom.ts";
import type { RigPose } from "../player/player.ts";
import type { Ray } from "../player/world-query.ts";

/** XR 会话面（vr.ts 消费；three 对象一律 any，不出本文件）。 */
export interface XRFacade {
  isPresenting(): boolean;
  setSession(session: XRSession | null): Promise<void>;
  session(): XRSession | null;
  frame(): XRFrame | null;
  refSpace(): XRReferenceSpace | null;
  on(type: "sessionstart" | "sessionend", cb: () => void): void;
}
export type XRHand = "left" | "right";

export const PALETTE = {
  background: 0xf2f0ea,
  face: 0xd6d6d6,
  faceSelected: 0x8fb4e8,
  faceHover: 0xb6cff0,
  edge: 0x2a2a2a,
  edgeWire: 0x111111,
  edgeSelected: 0x2b6cb0,
  edgeHot: 0xcc3333,      // 刮擦/悬停将删
  grid: 0xd9d6cf,
  axisX: 0xcc3333,
  axisY: 0x2e8b57,
  axisZ: 0x2b6cb0,
  charged: 0x8b5cf6,
} as const;

const SNAP_COLORS: Record<string, number> = {
  endpoint: 0x2e8b57,
  midpoint: 0x00a5a5,
  "on-edge": 0xcc3333,
  origin: 0x8b5cf6,
  align: 0x8b5cf6,
  "align-combo": 0x8b5cf6,
  "edge-align": 0xcc3333,
  intersection: 0x111111,
  "cross-line": 0x111111,
  "axis-x": PALETTE.axisX,
  "axis-y": PALETTE.axisY,
  "axis-z": PALETTE.axisZ,
  "h-stop": 0xd97706,
  "on-face": 0x2b6cb0,
};
const AXIS_COLORS: Record<string, number> = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ, u: 0x888888, v: 0x888888, i: 0x111111 };

const EDGE_PX = 1.6;        // 边线宽（CSS px）
const HINT_PX = 1.2;        // 吸附提示线宽
const AXIS_PX = 1.4;

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
  hoverEdge: EdgeId | null;
  hoverFace: FaceId | null;
  preview: Kernel | null;      // 影子副本（预演即提交；WYSIWYG 期间整场景画它）
  snap: Snap3 | null;
  snapAnchor: Pt3 | null;      // axis 锁的虚线起点
  /** 充能源点（from-point 共轴的登记源；紫点）。 */
  charged?: readonly Pt3[] | null;
  /** 透视近平面下限（第一人称 0.05；轨道默认 0.5）。 */
  near?: number;
  /** teleport 弧线（充能中）：折线 + 合法性 + 落点。 */
  teleport?: { points: readonly Pt3[]; valid: boolean; landing: Pt3 | null } | null;
}

export class Renderer3 {
  private renderer: any;
  private scene: any;
  private camOrtho: any;
  private camPersp: any;
  private staticGroup: any;
  private dyn: any = null;
  private dpr = 1;
  private lineMats: any[] = [];
  private resolution: any;
  // ---- XR（0.4 VR 纪元）----
  // rig = 三层模型的中间层：rig 局部 = WebXR 追踪空间（Y 上）；rig.quaternion = Rz(heading)·Rx(90°) 把它挂进 Z 上世界（渲染层的
  // Y-up 只活在 rig 子树里，世界坐标永远 Z 上——CatsUp 坐标约定）。camPersp 是 rig 的子节点：flat 由 syncCamera 写绝对姿态（rig 单位阵），
  // XR 会话中 three 的 WebXRManager 把 HMD 姿态写进 camPersp（rig 局部）。控制器/手腕面板也挂 rig 下。
  private rig: any;
  private controllers: any[] = [];
  private grips: any[] = [];
  private hands: ("none" | "left" | "right")[] = ["none", "none"];
  private pointerVis: { line: any; cursor: any }[] = [];
  private wrist: { mesh: any; tex: any; inv: any } | null = null;
  readonly xr: XRFacade;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.background);
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.camPersp = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    this.resolution = new THREE.Vector2(1, 1);
    this.staticGroup = this.buildStatic();
    this.scene.add(this.staticGroup);

    const xr = this.renderer.xr;
    xr.enabled = true;
    xr.setReferenceSpaceType("local-floor");
    this.rig = new THREE.Group();
    this.rig.add(this.camPersp);
    this.scene.add(this.rig);
    for (let i = 0; i < 2; i++) {
      const c = xr.getController(i);
      c.addEventListener("connected", (ev: any) => { this.hands[i] = ev.data?.handedness ?? "none"; });
      c.addEventListener("disconnected", () => { this.hands[i] = "none"; });
      // 射线 + 光标球（控制器局部：−Z 前）；不用 GLTF 控制器模型（不引依赖）
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x2b6cb0, transparent: true, opacity: 0.8 }));
      line.visible = false;
      const cursor = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2b6cb0, depthTest: false }));
      cursor.renderOrder = 11; cursor.visible = false;
      c.add(line); c.add(cursor);
      this.pointerVis.push({ line, cursor });
      this.controllers.push(c);
      this.rig.add(c);
      const g = xr.getControllerGrip(i);
      this.grips.push(g);
      this.rig.add(g);
    }
    this.xr = {
      isPresenting: () => !!xr.isPresenting,
      setSession: (session) => xr.setSession(session),
      session: () => xr.getSession() ?? null,
      frame: () => xr.getFrame() ?? null,
      refSpace: () => xr.getReferenceSpace() ?? null,
      on: (type, cb) => xr.addEventListener(type, cb),
    };
  }

  /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
  setRig(pose: RigPose): void {
    this.rig.position.set(pose.origin.x, pose.origin.y, pose.origin.z);
    this.rig.rotation.set(Math.PI / 2, 0, pose.heading, "ZYX");   // = Rz(heading)·Rx(90°)
    this.rig.updateMatrixWorld(true);
  }
  private ctrlIndex(hand: XRHand): number { return this.hands.indexOf(hand); }
  /** 控制器射线视觉：长度（到命中点）与颜色；null = 隐藏。 */
  setPointerVisual(hand: XRHand, v: { length: number; color: number } | null): void {
    const i = this.ctrlIndex(hand);
    if (i < 0) return;
    const pv = this.pointerVis[i];
    if (!v) { pv.line.visible = false; pv.cursor.visible = false; return; }
    pv.line.visible = true; pv.cursor.visible = true;
    pv.line.scale.set(1, 1, Math.max(0.05, v.length));
    pv.cursor.position.set(0, 0, -v.length);
    pv.line.material.color.setHex(v.color);
    pv.cursor.material.color.setHex(v.color);
  }
  /**
   * 手腕面板：挂在 hand 手的 grip 上（grip 空间：原点掌心、−Z 沿手柄向前、+Y 手背向上）。面板贴在手背上方偏向手腕，
   * 法向 +Y（手背朝天时正对眼睛）；纹理 = 传入的 canvas（UI 显示用途的 canvas 2D）。
   */
  attachWristPanel(canvas: HTMLCanvasElement, widthM: number, heightM: number, hand: XRHand): void {
    this.detachWristPanel();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthTest: false }));
    mesh.renderOrder = 12;
    mesh.position.set(0, 0.04, 0.09);
    mesh.rotation.set(-Math.PI / 2 + 0.35, 0, 0);   // 法向 +Y，略朝手腕（用户）倾 20°
    const i = this.ctrlIndex(hand);
    const parent = i >= 0 ? this.grips[i] : this.grips[hand === "left" ? 0 : 1];
    parent.add(mesh);
    this.wrist = { mesh, tex, inv: new THREE.Matrix4() };
  }
  detachWristPanel(): void {
    if (!this.wrist) return;
    this.wrist.mesh.parent?.remove(this.wrist.mesh);
    this.wrist.mesh.geometry.dispose(); this.wrist.mesh.material.dispose(); this.wrist.tex.dispose();
    this.wrist = null;
  }
  updateWristTexture(): void { if (this.wrist) this.wrist.tex.needsUpdate = true; }
  /** 世界射线 ∩ 面板平面 → 面板 uv（u 右 0..1、v 下 0..1，与 canvas 像素同向）及距离；不在面板内 → null。 */
  wristHit(ray: Ray): { u: number; v: number; dist: number } | null {
    if (!this.wrist) return null;
    const m = this.wrist.mesh;
    m.updateWorldMatrix(true, false);
    this.wrist.inv.copy(m.matrixWorld).invert();
    const o = new THREE.Vector3(ray.origin.x, ray.origin.y, ray.origin.z).applyMatrix4(this.wrist.inv);
    const d = new THREE.Vector3(ray.dir.x, ray.dir.y, ray.dir.z).transformDirection(this.wrist.inv);
    if (Math.abs(d.z) < 1e-6) return null;
    const t = -o.z / d.z;
    if (t <= 0) return null;
    const x = o.x + d.x * t, y = o.y + d.y * t;
    const hw = m.geometry.parameters.width / 2, hh = m.geometry.parameters.height / 2;
    if (x < -hw || x > hw || y < -hh || y > hh) return null;
    // 距离按世界尺度（局部无缩放）
    const dist = t * Math.hypot(ray.dir.x, ray.dir.y, ray.dir.z);
    return { u: (x + hw) / (2 * hw), v: 1 - (y + hh) / (2 * hh), dist };
  }
  /** XR 会话中 HMD 的世界位置（marker 尺寸/光照用）。 */
  private xrEye(): Pt3 | null {
    if (!this.renderer.xr.isPresenting) return null;
    const c = this.renderer.xr.getCamera();
    const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);
    return { x: p.x, y: p.y, z: p.z };
  }

  /** 连续渲染循环（步行模式 / XR 会话）；null = 停（回到按需 draw）。three 的 setAnimationLoop 才能收 XR 帧。 */
  setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void {
    this.renderer.setAnimationLoop(cb);
  }

  resize(vp: Viewport, dpr: number): void {
    if (this.renderer.xr.isPresenting) return;   // XR 会话中尺寸归 XR layer
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(vp.w, vp.h, false);
    this.resolution.set(vp.w * dpr, vp.h * dpr);
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离、fov 90°/1000px 折算。 */
  private worldPerPx(cam: OrbitCamera, vp: Viewport, p: Pt3): number {
    const eye = this.xrEye();
    if (eye) return (2 * Math.max(0.2, Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z))) / 1000;
    if (cam.projection === "persp") {
      const z = Math.max(dot3(sub3(p, cam.eye()), cam.forward()), 0.5);
      return (2 * z * Math.tan(cam.fovY / 2)) / vp.h;
    }
    return (2 * cam.halfH) / vp.h;
  }

  private syncCamera(cam: OrbitCamera, vp: Viewport, nearMin = 0.5): any {
    const eye = cam.eye(), up = cam.up();
    let c: any;
    if (cam.projection === "persp") {
      c = this.camPersp;
      const d = cam.eyeDist();
      c.fov = (cam.fovY * 180) / Math.PI;
      c.aspect = vp.w / vp.h;
      c.near = Math.max(nearMin, d * 0.02);
      c.far = d * 40 + 5000;
    } else {
      c = this.camOrtho;
      const halfW = cam.halfW(vp);
      c.left = -halfW; c.right = halfW;
      c.top = cam.halfH; c.bottom = -cam.halfH;
      c.near = 0.1; c.far = 20000;
    }
    c.position.set(eye.x, eye.y, eye.z);
    c.up.set(up.x, up.y, up.z);
    c.lookAt(cam.target.x, cam.target.y, cam.target.z);
    c.updateProjectionMatrix();
    return c;
  }

  render(k: Kernel, cam: OrbitCamera, vp: Viewport, view: ViewState): void {
    const presenting = !!this.renderer.xr.isPresenting;
    let cam3: any;
    if (presenting) {
      // XR：three 从 HMD 写 camPersp 姿态与投影；我们只管 near/far（会话 depthNear/Far）
      cam3 = this.camPersp;
      cam3.near = view.near ?? 0.05; cam3.far = 2000;
    } else {
      this.rig.position.set(0, 0, 0); this.rig.rotation.set(0, 0, 0);
      cam3 = this.syncCamera(cam, vp, view.near ?? 0.5);
    }

    if (this.dyn) {
      this.scene.remove(this.dyn);
      this.dyn.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }
    const g = new THREE.Group();

    // WYSIWYG（user 黄线）：拖拽期间整个场景渲染影子副本。
    const kd = view.preview ?? k;

    // ---- 面（统一灰，不透明，后推；平光=key light 钉在相机系右上前方；XR 取 HMD 相机系） ----
    const L = presenting ? this.xrKeyLight() : keyLight(cam);
    for (const f of kd.faces()) {
      const base = view.selectionFaces.has(f.id) ? PALETTE.faceSelected
        : view.hoverFace === f.id ? PALETTE.faceHover
        : PALETTE.face;
      const rec = kd.planeOf(f.id);
      const lambert = rec ? Math.abs(dot3(rec.plane.n, L)) : 1;
      const mesh = faceMesh(kd, f.id, shade(base, 0.66 + 0.34 * lambert));
      if (mesh) g.add(mesh);
    }

    // ---- 边（按类别分桶；粗线，前拉） ----
    const buckets = new Map<number, number[]>();
    for (const e of kd.edges()) {
      const color =
        view.scrubEdges.has(e.id) || view.hoverEdge === e.id ? PALETTE.edgeHot
        : view.selectionEdges.has(e.id) ? PALETTE.edgeSelected
        : e.faceLinks.length === 0 ? PALETTE.edgeWire
        : PALETTE.edge;
      const list = buckets.get(color) ?? buckets.set(color, []).get(color)!;
      const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
      list.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    for (const [color, pos] of buckets) g.add(this.fatLines(pos, color, EDGE_PX, { offset: true }));

    // ---- 充能源点（紫）----
    if (view.charged?.length) {
      for (const p of view.charged) g.add(this.marker(p, PALETTE.charged, 4, cam, vp));
    }

    // ---- 吸附指示 ----
    if (view.snap?.kind) {
      const color = SNAP_COLORS[view.snap.kind] ?? 0x2b6cb0;
      g.add(this.marker(view.snap.p, color, 5, cam, vp));
      if (view.snap.hints?.length) {
        // 提示线走深度测试：被膜遮住的引导段不显示（user 2026-09-03：z 轴要被面遮）
        for (const h of view.snap.hints) {
          g.add(this.fatLines([h.a.x, h.a.y, h.a.z, h.b.x, h.b.y, h.b.z], AXIS_COLORS[h.axis] ?? 0x888888, HINT_PX, { offset: true }));
        }
      } else if (view.snap.kind.startsWith("axis") && view.snapAnchor) {
        const a = view.snapAnchor, b = view.snap.p;
        g.add(this.fatLines([a.x, a.y, a.z, b.x, b.y, b.z], color, HINT_PX, { offset: true }));
      }
    }

    // ---- teleport 弧线（绿=可落 / 红=取消）+ 落点环 ----
    if (view.teleport && view.teleport.points.length >= 2) {
      const tp = view.teleport;
      const color = tp.valid ? 0x2e8b57 : 0xcc3333;
      const pos: number[] = [];
      for (let i = 0; i + 1 < tp.points.length; i++) {
        const a = tp.points[i], b = tp.points[i + 1];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      g.add(this.fatLines(pos, color, 2.5, { offset: true }));
      if (tp.landing) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 }));
        ring.position.set(tp.landing.x, tp.landing.y, tp.landing.z + 0.01);
        ring.renderOrder = 9;
        g.add(ring);
      }
    }

    this.dyn = g;
    this.scene.add(g);
    this.renderer.render(this.scene, cam3);
  }

  /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
  private xrKeyLight(): Pt3 {
    const c = this.renderer.xr.getCamera();
    const m = c.matrixWorld.elements;
    const e = { x: m[8], y: m[9], z: m[10] }, u = { x: m[4], y: m[5], z: m[6] }, r = { x: m[0], y: m[1], z: m[2] };
    const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
    const n = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / n, y: v.y / n, z: v.z / n };
  }

  /** 屏幕像素定尺寸的小球指示物（永远可见）。 */
  private marker(p: Pt3, color: number, px: number, cam: OrbitCamera, vp: Viewport): any {
    const r = px * this.worldPerPx(cam, vp, p);
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 8),
      new THREE.MeshBasicMaterial({ color, depthTest: false }),
    );
    m.renderOrder = 10;
    m.position.set(p.x, p.y, p.z);
    return m;
  }

  /** 粗线段（屏幕像素宽）。offset=true：深度前拉，共面线赢面。 */
  private fatLines(positions: number[], color: number, px: number, opts: { offset?: boolean; overlay?: boolean } = {}): any {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions);
    const mat = new LineMaterial({
      color,
      linewidth: px * this.dpr,
      resolution: this.resolution,
      depthTest: !opts.overlay,
      polygonOffset: !!opts.offset,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    const obj = new LineSegments2(geo, mat);
    if (opts.overlay) obj.renderOrder = 10;
    return obj;
  }

  /** 地面网格 + 三色轴（SU 约定：X 红 / Y 绿 / Z 蓝向上）。 */
  private buildStatic(): any {
    const g = new THREE.Group();
    const grid: number[] = [];
    const N = 20, STEP = 50;
    for (let i = -N; i <= N; i++) {
      if (i === 0) continue;   // 轴线单独画
      grid.push(i * STEP, -N * STEP, 0, i * STEP, N * STEP, 0);
      grid.push(-N * STEP, i * STEP, 0, N * STEP, i * STEP, 0);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));
    g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: PALETTE.grid })));
    const L = N * STEP;
    g.add(this.fatLines([-L, 0, 0, L, 0, 0], PALETTE.axisX, AXIS_PX));
    g.add(this.fatLines([0, -L, 0, 0, L, 0], PALETTE.axisY, AXIS_PX));
    g.add(this.fatLines([0, 0, 0, 0, 0, L], PALETTE.axisZ, AXIS_PX));
    return g;
  }
}

/** 相机系 key light：眼方向 + 上 0.55 + 右 0.35（Blender studio 光的最小近似）。 */
function keyLight(cam: OrbitCamera): Pt3 {
  const e = cam.eyeDir(), u = cam.up(), r = cam.right();
  const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}
/** 0xRRGGBB × 亮度系数（各通道钳 255）。 */
function shade(color: number, k: number): number {
  const ch = (c: number): number => Math.max(0, Math.min(255, Math.round(c * k)));
  return (ch((color >> 16) & 255) << 16) | (ch((color >> 8) & 255) << 8) | ch(color & 255);
}

/** face → ShapeGeometry（在平面基 2D 建形，再用基矩阵变换到世界）。 */
function faceMesh(k: Kernel, id: FaceId, color: number): any | null {
  const f = k.face(id);
  const rec = k.planeOf(id);
  if (!f || !rec) return null;
  const shape = new THREE.Shape(f.outer.pts.map((p) => new THREE.Vector2(p.x, p.y)));
  for (const h of f.holes) shape.holes.push(new THREE.Path(h.pts.map((p) => new THREE.Vector2(p.x, p.y))));
  const geo = new THREE.ShapeGeometry(shape);
  const { u, v } = rec.basis;
  const n = rec.plane.n, d = rec.plane.d;
  const m = new THREE.Matrix4();
  m.set(
    u.x, v.x, n.x, n.x * d,
    u.y, v.y, n.y, n.y * d,
    u.z, v.z, n.z, n.z * d,
    0, 0, 0, 1,
  );
  geo.applyMatrix4(m);
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  return new THREE.Mesh(geo, mat);
}

/**
 * 面的三角剖分（世界坐标；含洞）——给 OBJ 导出等「字节出口」用，three 的 earcut 不出本文件。
 */
export function faceTriangles(k: Kernel, id: FaceId): [Pt3, Pt3, Pt3][] {
  const f = k.face(id);
  const rec = k.planeOf(id);
  if (!f || !rec) return [];
  const contour = f.outer.pts.map((p) => new THREE.Vector2(p.x, p.y));
  const holes = f.holes.map((h) => h.pts.map((p) => new THREE.Vector2(p.x, p.y)));
  const tris: number[][] = THREE.ShapeUtils.triangulateShape(contour, holes);
  const all = [...contour, ...holes.flat()];
  const { u, v } = rec.basis;
  const n = rec.plane.n, d = rec.plane.d;
  const lift = (q: { x: number; y: number }): Pt3 => ({
    x: u.x * q.x + v.x * q.y + n.x * d,
    y: u.y * q.x + v.y * q.y + n.y * d,
    z: u.z * q.x + v.z * q.y + n.z * d,
  });
  return tris.map(([a, b, c]) => [lift(all[a]), lift(all[b]), lift(all[c])]);
}
