// render3.ts —— three.js 适配层：把 kernel 状态 + 相机参数 + 预演影子副本画出来。
// 边界纪律：three 只在本文件出现；相机数学在 camera.ts、拾取/求解在 pick.ts/solver.ts（都不碰 three）。
// created by Claude Fable 5 2026-09-01（playground 耗材版）；**Workbench 雏形重写 2026-09-06 by Claude Fable 5.1**
//   （user：「perspective camera」「所有的面同一层灰色，好看一点」「线之间的 z fighting 和有时候有些线看不见…现在需要好好处理」
//    「可以开始做 workbench(blender renderer) 雏形」）。
// **retained-mode 重写 2026-09-07 by Claude Fable 5.1**（VR 首轮反馈；user：「你优化过 drawcall 吗……别还是当 direct mode 画的……」
//   「背景比如轴，地板网格也可以 batch」「尽量打包东西尽量少」）——此前每帧 dispose 整组 + 每张膜一个 Mesh/材质/earcut（direct mode），
//   XR 90 Hz 下就是 CPU 与 GC 的主要开销。现在：
//   - **draw call 清单（常态 3 个）**：① 网格+三轴 = 一份 LineSegments2（顶点色）；② 全部膜 = 一份 BufferGeometry（位置/法向/顶点色）
//     + 一个 ShaderMaterial（光照在 shader 里算，光向是 uniform，头一转不重建）；③ 全部边 = 一份 LineSegments2（顶点色分类别）。
//     吸附提示线 / 吸附小球 / teleport 弧线与落点环 = 持久节点，只在出现时 visible，各 +1。
//   - **缓存键**：膜几何键 = 内核身份 + revision + 选区/悬停；边几何键 = 内核身份 + revision + 选区/刮擦/悬停。键不变 = 零重建、零分配；
//     预演影子副本每次更新都是新 Kernel 对象（editor.ts clone），身份变 = 自然失效。
//   - 每帧只做：相机同步、光向 uniform、键比对、指示物位姿。不 new 几何/材质（除了键变时的那一次）。
//
// Workbench 雏形 = Blender 实体模式的观感：
//   - 面：统一灰、不透明、**按法向的平光**（key light 钉在相机系：|n·L| 映射亮度，双面对称、零灯光配置；颜色在 sRGB 空间直接乘亮度，
//     shader 不再过 colorspace 编码——与旧版 shade() 逐像素同值）；选中/悬停换蓝灰色。
//   - 边：three addons 粗线（LineSegments2，屏幕像素宽，DPR 无关——1px LineBasicMaterial 在 iPad DPR2 下细成半像素
//     = 「有些线看不见」的真身之一）。粗线是三角形 → polygonOffset 生效：**面 +1/+1 后推、线 −1/−2 前拉**，
//     共面线永远赢面、被真正挡住的线仍被挡——z-fight 的结构性修法，不再靠 depthOnly 预通道。
//   - 相机：两制（cam.projection）——正交 OrthographicCamera / 透视 PerspectiveCamera，near/far 随眼距布置（小零件贴近也不裁）。
//   - 顶点点不再常显（SU 观感）；吸附指示按屏幕像素定尺寸（透视按深度换算；XR 按角尺寸，比桌面小一半——user「vr 里面点球太大了」），
//     **走深度测试**（墙后的吸附点不再透视穿墙——user「workbench 的遮挡逻辑还是应该做好」）；充能源点不再显示（user「充能的点能不能不显示」，
//     机制照旧，对齐命中时提示线仍会出现）。
//   - XR 画质：three 默认 fixed foveation = 1.0（周边降分辨率）——白底细线是最吃这个的场景，本文件默认关到 0；framebuffer 缩放 1.0；
//     两者可由 setXRQuality 覆盖（main.ts 读 URL ?xrfov= ?xrscale= 给真机 A/B）。粗线的 resolution/linewidth 在 XR 每帧按每眼 viewport 换算
//     （此前沿用桌面 canvas 尺寸——XR 里线宽/纵横比都是错的）。

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
const TP_OK = 0x2e8b57, TP_BAD = 0xcc3333;

const EDGE_PX = 1.6;        // 边线宽（CSS px）
const HINT_PX = 1.2;        // 吸附提示线宽
const STATIC_PX = 1.2;      // 网格 + 三轴（同一份粗线，只能一个宽度；轴靠颜色区分）
const ARC_PX = 2.5;
const SNAP_MARKER_PX = 5;
/** 网格：1 m 一格、±50 m（PC/VR 同一份；user 2026-09-07「vr 和 pc 的网格都是 1m，不应跟 branch」；无限/自适应网格 = A12）。 */
const GRID_STEP = 1, GRID_N = 50;
/** XR 里「屏幕像素」的定义：指示物角尺寸 = px / XR_PX_PER_DEG 度。桌面 800 px / 50° = 16 px/°；VR 取 32 = 同 px 数只有桌面一半大。 */
const XR_PX_PER_DEG = 32;
/** XR 粗线 px → 设备像素倍率：每眼 viewport 高 / 900（桌面里这个角色是 DPR）。 */
const XR_LINE_REF_H = 900;
const XR_DEFAULT = { foveation: 0, framebufferScale: 1.0 };

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
  hoverEdge: EdgeId | null;
  hoverFace: FaceId | null;
  preview: Kernel | null;      // 影子副本（预演即提交；WYSIWYG 期间整场景画它）
  snap: Snap3 | null;
  snapAnchor: Pt3 | null;      // axis 锁的虚线起点
  /** checkpoint 代数（editor.revision）：几何缓存键的一部分。 */
  revision?: number;
  /** 透视近平面下限（第一人称 0.05；轨道默认 0.5）。 */
  near?: number;
  /** teleport 弧线（充能中）：折线 + 合法性 + 落点。 */
  teleport?: { points: readonly Pt3[]; valid: boolean; landing: Pt3 | null } | null;
}

const FACE_VERT = /* glsl */`
  attribute vec3 aColor;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    vColor = aColor;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const FACE_FRAG = /* glsl */`
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    gl_FragColor = vec4(vColor * k, 1.0);   // vColor 已是 sRGB，直接出（与旧 shade() 同值）
  }`;

/** 0xRRGGBB → sRGB 浮点三元（膜 shader 用；不过 three 的色彩管理）。 */
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

export class Renderer3 {
  private renderer: any;
  private scene: any;
  private camOrtho: any;
  private camPersp: any;
  private dpr = 1;
  private flatRes = { w: 1, h: 1 };
  private resolution: any;               // 所有 LineMaterial 共享的 resolution uniform（Vector2，原地改）
  private lineMats: any[] = [];          // 共享粗线材质（linewidth 随 lineScale 原地改）
  private lineMatPx: number[] = [];
  // ---- 持久节点（retained）----
  private faceMesh: any; private faceMat: any;
  private edgeLines: any; private edgeMat: any;
  private hintLines: any;
  private snapMarker: any;
  private arcLines: any; private landingRing: any;
  private faceKey = ""; private edgeKey = ""; private hintKey = "";
  private kernelIds = new WeakMap<object, number>();
  private nextKernelId = 1;
  private scratchV = new THREE.Vector3();
  private scratchV2 = new THREE.Vector3();
  private scratchM = new THREE.Matrix4();
  private tmpColor = new THREE.Color();
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
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.background);
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.camPersp = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    this.resolution = new THREE.Vector2(1, 1);
    this.scene.add(this.buildStatic());

    // 膜：一份几何 + 一个 shader（光向 uniform）
    this.faceMat = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: { value: new THREE.Vector3(0, 0, 1) } },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    this.faceMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.faceMat);
    this.faceMesh.frustumCulled = false; this.faceMesh.visible = false;
    this.scene.add(this.faceMesh);
    // 边：一份粗线（顶点色）
    this.edgeMat = this.lineMat(EDGE_PX, { offset: true, vertexColors: true });
    this.edgeLines = new LineSegments2(new LineSegmentsGeometry(), this.edgeMat);
    this.edgeLines.frustumCulled = false; this.edgeLines.visible = false;
    this.scene.add(this.edgeLines);
    // 吸附提示线（顶点色：轴色）
    this.hintLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.hintLines.frustumCulled = false; this.hintLines.visible = false;
    this.scene.add(this.hintLines);
    // 吸附小球（单位球，按屏幕像素缩放；走深度测试）
    this.snapMarker = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.snapMarker.visible = false;
    this.scene.add(this.snapMarker);
    // teleport 弧线 + 落点环
    this.arcLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(ARC_PX, { offset: true }));
    this.arcLines.frustumCulled = false; this.arcLines.visible = false;
    this.scene.add(this.arcLines);
    this.landingRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: TP_OK, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 }));
    this.landingRing.renderOrder = 9; this.landingRing.visible = false;
    this.scene.add(this.landingRing);

    const xr = this.renderer.xr;
    xr.enabled = true;
    xr.setReferenceSpaceType("local-floor");
    xr.setFoveation(XR_DEFAULT.foveation);
    xr.setFramebufferScaleFactor(XR_DEFAULT.framebufferScale);
    this.rig = new THREE.Group();
    this.rig.add(this.camPersp);
    this.scene.add(this.rig);
    for (let i = 0; i < 2; i++) {
      const c = xr.getController(i);
      c.addEventListener("connected", (ev: any) => { this.hands[i] = ev.data?.handedness ?? "none"; });
      c.addEventListener("disconnected", () => { this.hands[i] = "none"; });
      // 射线 + 光标球（控制器局部：−Z 前）；不用 GLTF 控制器模型（不引依赖）。光标球 = 指针本体，永远可见（不走深度），按距离定角尺寸
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x2b6cb0, transparent: true, opacity: 0.8 }));
      line.visible = false;
      const cursor = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2b6cb0, depthTest: false }));
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

  /** XR 画质（会话开始前设才生效；dev A/B 用）。foveation 0=全分辨率…1=周边最低；framebufferScale 相对设备推荐值。 */
  setXRQuality(q: { foveation?: number; framebufferScale?: number }): void {
    if (q.foveation !== undefined) this.renderer.xr.setFoveation(Math.max(0, Math.min(1, q.foveation)));
    if (q.framebufferScale !== undefined) this.renderer.xr.setFramebufferScaleFactor(Math.max(0.5, Math.min(2, q.framebufferScale)));
  }

  /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
  setRig(pose: RigPose): void {
    this.rig.position.set(pose.origin.x, pose.origin.y, pose.origin.z);
    this.rig.rotation.set(Math.PI / 2, 0, pose.heading, "ZYX");   // = Rz(heading)·Rx(90°)
    this.rig.updateMatrixWorld(true);
  }
  private ctrlIndex(hand: XRHand): number { return this.hands.indexOf(hand); }
  /** 控制器射线视觉：长度（到命中点）与颜色；null = 隐藏。光标球半径 ≈ 0.23° 角（1 m 处 4 mm）。 */
  setPointerVisual(hand: XRHand, v: { length: number; color: number } | null): void {
    const i = this.ctrlIndex(hand);
    if (i < 0) return;
    const pv = this.pointerVis[i];
    if (!v) { pv.line.visible = false; pv.cursor.visible = false; return; }
    const len = Math.max(0.05, v.length);
    pv.line.visible = true; pv.cursor.visible = true;
    pv.line.scale.set(1, 1, len);
    pv.cursor.position.set(0, 0, -len);
    pv.cursor.scale.setScalar(Math.max(0.002, len * 0.004));
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
    const o = this.scratchV.set(ray.origin.x, ray.origin.y, ray.origin.z).applyMatrix4(this.wrist.inv);
    const d = this.scratchV2.set(ray.dir.x, ray.dir.y, ray.dir.z).transformDirection(this.wrist.inv);
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
  // ---- 字幕位 toast（挂 camPersp 子节点 = 头锁定：XR 中 three 把 HMD 姿态写进 camPersp）----
  private subtitle: { mesh: any; tex: any } | null = null;
  attachSubtitle(canvas: HTMLCanvasElement, widthM: number, heightM: number): void {
    this.detachSubtitle();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
    mesh.renderOrder = 20;
    mesh.position.set(0, -0.30, -1.2);   // 相机系：前 1.2 m、下 0.30 m ≈ 视野下沿 14°
    this.camPersp.add(mesh);
    this.subtitle = { mesh, tex };
  }
  detachSubtitle(): void {
    if (!this.subtitle) return;
    this.subtitle.mesh.parent?.remove(this.subtitle.mesh);
    this.subtitle.mesh.geometry.dispose(); this.subtitle.mesh.material.dispose(); this.subtitle.tex.dispose();
    this.subtitle = null;
  }
  /** XR 会话中 HMD 的世界位置（marker 尺寸用；返回共享 scratch，勿保存）。 */
  private xrEye(): Pt3 | null {
    if (!this.renderer.xr.isPresenting) return null;
    const c = this.renderer.xr.getCamera();
    return this.scratchV.setFromMatrixPosition(c.matrixWorld);
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
    this.flatRes = { w: vp.w * dpr, h: vp.h * dpr };
  }

  /** 粗线 resolution / linewidth：桌面 = canvas 设备像素 + DPR；XR = 每眼 viewport（每帧，WebXRManager 在回调前写好）。 */
  private syncLineScale(presenting: boolean): void {
    let scale = this.dpr, w = this.flatRes.w, h = this.flatRes.h;
    if (presenting) {
      const v = this.renderer.xr.getCamera().cameras?.[0]?.viewport;
      if (v && v.w > 0) { w = v.z; h = v.w; scale = v.w / XR_LINE_REF_H; }
    }
    this.resolution.set(w, h);
    for (let i = 0; i < this.lineMats.length; i++) this.lineMats[i].linewidth = this.lineMatPx[i] * scale;
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
  private worldPerPx(cam: OrbitCamera, vp: Viewport, p: Pt3): number {
    const eye = this.xrEye();
    if (eye) return (Math.max(0.2, Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z)) * (Math.PI / 180)) / XR_PX_PER_DEG;
    if (cam.projection === "persp") {
      const z = Math.max(dot3(sub3(p, cam.eye()), cam.forward()), cam.nearClamp());
      return (2 * z * Math.tan(cam.fovY / 2)) / vp.h;
    }
    return (2 * cam.halfH) / vp.h;
  }

  private syncCamera(cam: OrbitCamera, vp: Viewport): any {
    const eye = cam.eye(), up = cam.up();
    let c: any;
    if (cam.projection === "persp") {
      c = this.camPersp;
      const d = cam.eyeDist();
      c.fov = (cam.fovY * 180) / Math.PI;
      c.aspect = vp.w / vp.h;
      c.near = Math.max(cam.nearClamp(), d * 0.02);
      c.far = d * 40 + 100;
    } else {
      c = this.camOrtho;
      const halfW = cam.halfW(vp);
      c.left = -halfW; c.right = halfW;
      c.top = cam.halfH; c.bottom = -cam.halfH;
      // 深度窗口围着 target（眼在 5000 m 外）：R 随 zoom 走，小零件也有毫米级深度分辨率
      const D = cam.eyeDist(), R = Math.max(500, cam.halfH * 100);
      c.near = Math.max(0.1, D - R); c.far = D + R;
    }
    c.position.set(eye.x, eye.y, eye.z);
    c.up.set(up.x, up.y, up.z);
    c.lookAt(cam.target.x, cam.target.y, cam.target.z);
    c.updateProjectionMatrix();
    return c;
  }

  private kernelId(k: Kernel): number {
    let id = this.kernelIds.get(k);
    if (id === undefined) { id = this.nextKernelId++; this.kernelIds.set(k, id); }
    return id;
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
      cam3 = this.syncCamera(cam, vp);
    }
    this.syncLineScale(presenting);

    // WYSIWYG（user 黄线）：拖拽期间整个场景渲染影子副本。
    const kd = view.preview ?? k;
    const kid = this.kernelId(kd), rev = view.revision ?? 0;
    const selF = [...view.selectionFaces].join(","), selE = [...view.selectionEdges].join(",");

    // ---- 面：光向 uniform 每帧；几何只在键变时重建 ----
    const L = presenting ? this.xrKeyLight() : keyLight(cam);
    this.faceMat.uniforms.uLight.value.set(L.x, L.y, L.z);
    const fk = `${kid}:${rev}:${selF}:${view.hoverFace ?? ""}`;
    if (fk !== this.faceKey) { this.faceKey = fk; this.rebuildFaces(kd, view); }

    // ---- 边 ----
    const ek = `${kid}:${rev}:${selE}:${[...view.scrubEdges].join(",")}:${view.hoverEdge ?? ""}`;
    if (ek !== this.edgeKey) { this.edgeKey = ek; this.rebuildEdges(kd, view); }

    // ---- 吸附指示（小球 + 提示线）----
    const sn = view.snap;
    if (sn?.kind) {
      const color = SNAP_COLORS[sn.kind] ?? 0x2b6cb0;
      const m = this.snapMarker;
      m.visible = true;
      m.position.set(sn.p.x, sn.p.y, sn.p.z);
      m.scale.setScalar(SNAP_MARKER_PX * this.worldPerPx(cam, vp, sn.p));
      m.material.color.setHex(color);
      let segs: { a: Pt3; b: Pt3; color: number }[] | null = null;
      if (sn.hints?.length) segs = sn.hints.map((h) => ({ a: h.a, b: h.b, color: AXIS_COLORS[h.axis] ?? 0x888888 }));
      else if (sn.kind.startsWith("axis") && view.snapAnchor) segs = [{ a: view.snapAnchor, b: sn.p, color }];
      if (segs) {
        const hk = segs.map((s) => `${s.color}:${s.a.x},${s.a.y},${s.a.z},${s.b.x},${s.b.y},${s.b.z}`).join("|");
        if (hk !== this.hintKey) {
          this.hintKey = hk;
          const pos: number[] = [], col: number[] = [];
          for (const s of segs) {
            pos.push(s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z);
            const c = this.tmpColor.setHex(s.color);
            col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          }
          this.setLineGeometry(this.hintLines, pos, col);
        }
        this.hintLines.visible = true;
      } else this.hintLines.visible = false;
    } else { this.snapMarker.visible = false; this.hintLines.visible = false; }

    // ---- teleport 弧线（绿=可落 / 红=取消）+ 落点环（只在充能中存在，位置每帧变 → 每帧重建这几十段）----
    const tp = view.teleport;
    if (tp && tp.points.length >= 2) {
      const color = tp.valid ? TP_OK : TP_BAD;
      const pos: number[] = [];
      for (let i = 0; i + 1 < tp.points.length; i++) {
        const a = tp.points[i], b = tp.points[i + 1];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      this.setLineGeometry(this.arcLines, pos, null);
      this.arcLines.material.color.setHex(color);
      this.arcLines.visible = true;
      if (tp.landing) {
        this.landingRing.visible = true;
        this.landingRing.position.set(tp.landing.x, tp.landing.y, tp.landing.z + 0.01);
        this.landingRing.material.color.setHex(color);
      } else this.landingRing.visible = false;
    } else { this.arcLines.visible = false; this.landingRing.visible = false; }

    this.renderer.render(this.scene, cam3);
  }

  /** 全部膜 → 一份几何（三角汤 + 平法向 + sRGB 顶点色）。 */
  private rebuildFaces(kd: Kernel, view: ViewState): void {
    const pos: number[] = [], nor: number[] = [], col: number[] = [];
    for (const f of kd.faces()) {
      const base = view.selectionFaces.has(f.id) ? PALETTE.faceSelected
        : view.hoverFace === f.id ? PALETTE.faceHover
        : PALETTE.face;
      const rec = kd.planeOf(f.id);
      if (!rec) continue;
      const n = rec.plane.n;
      const [r, g, b] = srgb(base);
      for (const tri of faceTriangles(kd, f.id)) {
        for (const p of tri) { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(r, g, b); }
      }
    }
    const old = this.faceMesh.geometry;
    if (!pos.length) { this.faceMesh.visible = false; return; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
    this.faceMesh.geometry = geo;
    this.faceMesh.visible = true;
    old.dispose();
  }

  /** 全部边 → 一份粗线（顶点色按类别）。 */
  private rebuildEdges(kd: Kernel, view: ViewState): void {
    const pos: number[] = [], col: number[] = [];
    for (const e of kd.edges()) {
      const hex =
        view.scrubEdges.has(e.id) || view.hoverEdge === e.id ? PALETTE.edgeHot
        : view.selectionEdges.has(e.id) ? PALETTE.edgeSelected
        : e.faceLinks.length === 0 ? PALETTE.edgeWire
        : PALETTE.edge;
      const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const c = this.tmpColor.setHex(hex);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    if (!pos.length) { this.edgeLines.visible = false; return; }
    this.setLineGeometry(this.edgeLines, pos, col);
    this.edgeLines.visible = true;
  }

  /** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起/止顶点色，线性空间）或 null。 */
  private setLineGeometry(obj: any, pos: number[], col: number[] | null): void {
    const old = obj.geometry;
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pos);
    if (col) geo.setColors(col);
    obj.geometry = geo;
    old.dispose();
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

  /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
  private lineMat(px: number, opts: { offset?: boolean; vertexColors?: boolean } = {}): any {
    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth: px,
      resolution: this.resolution,
      vertexColors: !!opts.vertexColors,
      polygonOffset: !!opts.offset,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    this.lineMats.push(mat); this.lineMatPx.push(px);
    return mat;
  }

  /** 地面网格 + 三色轴（SU 约定：X 红 / Y 绿 / Z 蓝向上）= 一份粗线、一个 draw call。 */
  private buildStatic(): any {
    const pos: number[] = [], col: number[] = [];
    const push = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, hex: number): void => {
      pos.push(ax, ay, az, bx, by, bz);
      const c = this.tmpColor.setHex(hex);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };
    const L = GRID_N * GRID_STEP;
    for (let i = -GRID_N; i <= GRID_N; i++) {
      if (i === 0) continue;   // 轴线单独画
      push(i * GRID_STEP, -L, 0, i * GRID_STEP, L, 0, PALETTE.grid);
      push(-L, i * GRID_STEP, 0, L, i * GRID_STEP, 0, PALETTE.grid);
    }
    push(-L, 0, 0, L, 0, 0, PALETTE.axisX);
    push(0, -L, 0, 0, L, 0, PALETTE.axisY);
    push(0, 0, 0, 0, 0, L, PALETTE.axisZ);
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pos); geo.setColors(col);
    const obj = new LineSegments2(geo, this.lineMat(STATIC_PX, { vertexColors: true }));
    obj.frustumCulled = false;
    return obj;
  }
}

/** 相机系 key light：眼方向 + 上 0.55 + 右 0.35（Blender studio 光的最小近似）。 */
function keyLight(cam: OrbitCamera): Pt3 {
  const e = cam.eyeDir(), u = cam.up(), r = cam.right();
  const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

/**
 * 面的三角剖分（世界坐标；含洞）——膜批几何与 OBJ 导出等「字节出口」共用，three 的 earcut 不出本文件。
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
