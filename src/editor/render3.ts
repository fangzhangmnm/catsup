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

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.background);
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.camPersp = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    this.resolution = new THREE.Vector2(1, 1);
    this.staticGroup = this.buildStatic();
    this.scene.add(this.staticGroup);
  }

  resize(vp: Viewport, dpr: number): void {
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(vp.w, vp.h, false);
    this.resolution.set(vp.w * dpr, vp.h * dpr);
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。 */
  private worldPerPx(cam: OrbitCamera, vp: Viewport, p: Pt3): number {
    if (cam.projection === "persp") {
      const z = Math.max(dot3(sub3(p, cam.eye()), cam.forward()), 0.5);
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
      c.near = Math.max(0.5, d * 0.02);
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
    const cam3 = this.syncCamera(cam, vp);

    if (this.dyn) {
      this.scene.remove(this.dyn);
      this.dyn.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }
    const g = new THREE.Group();

    // WYSIWYG（user 黄线）：拖拽期间整个场景渲染影子副本。
    const kd = view.preview ?? k;

    // ---- 面（统一灰，不透明，后推；平光=key light 钉在相机系右上前方） ----
    const L = keyLight(cam);
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

    this.dyn = g;
    this.scene.add(g);
    this.renderer.render(this.scene, cam3);
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
