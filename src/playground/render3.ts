// render3.ts —— three.js 适配层：把 kernel 状态 + 相机参数 + 预览 diff 画出来。
// 边界纪律：three 只在本文件出现；相机数学在 camera.ts、拾取在 pick.ts（都不碰 three）。
// 遮挡交给 z-buffer（用户拍板：canvas painter 排序才是大坑）。
// playground 是耗材：每帧整组重建（dispose 旧几何），M 阶段规模无压力。

import * as THREE from "three";
import type { EdgeId, FaceId, Kernel, Pt3 } from "../kernel/kernel.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import type { Snap3 } from "./pick.ts";

const FACE_COLORS = [0x7fb069, 0x5b8dbb, 0xc2984e, 0xa06fb0, 0xbb6b6b, 0x58a89a];
const SNAP_COLORS: Record<string, number> = {
  endpoint: 0x2e8b57,
  midpoint: 0x00a5a5,
  "on-edge": 0xcc3333,
  origin: 0x8b5cf6,
  align: 0x8b5cf6,
  "align-combo": 0x8b5cf6,
  "axis-x": 0xcc3333,
  "axis-y": 0x2e8b57,
  "axis-z": 0x2b6cb0,
};

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
  hoverEdge: EdgeId | null;
  hoverFace: FaceId | null;
  preview: Kernel | null;      // 影子副本（预览即提交）
  snap: Snap3 | null;
  snapAnchor: Pt3 | null;      // axis 锁的虚线起点
  /** move 拖拽纯 ghost（零拓扑裁决，spec=20260901-move-spec.md §1；松手才结算）。added by Claude Fable 5 2026-09-01 */
  ghostSegs?: readonly (readonly [Pt3, Pt3])[] | null;
}

export class Renderer3 {
  private renderer: any;
  private scene: any;
  private cam3: any;
  private staticGroup: any;
  private dyn: any = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f2ec);
    this.cam3 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.staticGroup = buildStatic();
    this.scene.add(this.staticGroup);
  }

  resize(vp: Viewport, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(vp.w, vp.h, false);
  }

  render(k: Kernel, cam: OrbitCamera, vp: Viewport, view: ViewState): void {
    // 相机同步
    const halfW = cam.halfW(vp);
    this.cam3.left = -halfW; this.cam3.right = halfW;
    this.cam3.top = cam.halfH; this.cam3.bottom = -cam.halfH;
    const eye = cam.eye(), up = cam.up();
    this.cam3.position.set(eye.x, eye.y, eye.z);
    this.cam3.up.set(up.x, up.y, up.z);
    this.cam3.lookAt(cam.target.x, cam.target.y, cam.target.z);
    this.cam3.updateProjectionMatrix();

    // 动态组整体重建
    if (this.dyn) {
      this.scene.remove(this.dyn);
      this.dyn.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }
    const g = new THREE.Group();

    // ---- 面 ----
    for (const f of k.faces()) {
      const mesh = faceMesh(k, f.id, {
        color: FACE_COLORS[f.id % FACE_COLORS.length],
        opacity: 0.55,
      });
      if (mesh) g.add(mesh);
      if (view.selectionFaces.has(f.id) || view.hoverFace === f.id) {
        const hl = faceMesh(k, f.id, { color: 0x2b6cb0, opacity: view.hoverFace === f.id ? 0.25 : 0.35, offset: -2 });
        if (hl) g.add(hl);
      }
    }
    // ---- 边（按类别分桶上色；wire 黑、普通深灰、选中蓝、刮擦/hover 红） ----
    const buckets = new Map<number, Pt3[]>();
    for (const e of k.edges()) {
      const color =
        view.scrubEdges.has(e.id) || view.hoverEdge === e.id ? 0xcc3333
        : view.selectionEdges.has(e.id) ? 0x2b6cb0
        : e.faceLinks.length === 0 ? 0x111111
        : 0x444444;
      const list = buckets.get(color) ?? buckets.set(color, []).get(color)!;
      list.push(k.graph.pt(e.a), k.graph.pt(e.b));
    }
    for (const [color, pts] of buckets) g.add(lineSegments(pts, color, 1));

    // ---- 顶点 ----
    const vpts: number[] = [];
    for (const v of k.vertices()) vpts.push(v.x, v.y, v.z);
    if (vpts.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(vpts, 3));
      g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x222222, size: 5, sizeAttenuation: false })));
    }

    // ---- 预览 diff（会死灰罩 / 新生蓝面 / 新增蓝边） ----
    if (view.preview) {
      const pk = view.preview;
      for (const f of k.faces()) {
        if (!pk.face(f.id)) {
          const dead = faceMesh(k, f.id, { color: 0x333333, opacity: 0.35, offset: -3 });
          if (dead) g.add(dead);
        }
      }
      const realEdges = new Map(k.edges().map((e) => [e.id, e]));
      const ghost: Pt3[] = [];
      for (const e of pk.edges()) {
        const a = pk.graph.pt(e.a), b = pk.graph.pt(e.b);
        const re = realEdges.get(e.id);
        if (re) {
          const ra = k.graph.pt(re.a), rb = k.graph.pt(re.b);
          if (ra.x === a.x && ra.y === a.y && ra.z === a.z && rb.x === b.x && rb.y === b.y && rb.z === b.z) continue;
        }
        ghost.push(a, b);
      }
      if (ghost.length) g.add(lineSegments(ghost, 0x2b6cb0, 1));
      for (const f of pk.faces()) {
        const rf = k.face(f.id);
        if (rf && rf.planeId === f.planeId && ringsEq(rf.outer.pts, f.outer.pts) && rf.holes.length === f.holes.length) continue;
        const nm = faceMesh(pk, f.id, { color: 0x2b6cb0, opacity: 0.18, offset: -1 });
        if (nm) g.add(nm);
      }
    }

    // ---- move 纯 ghost（灰线；不预演拓扑） ----
    if (view.ghostSegs?.length) {
      const pts: Pt3[] = [];
      for (const [a, b] of view.ghostSegs) pts.push(a, b);
      g.add(lineSegments(pts, 0x999999, 1));
    }

    // ---- 吸附指示 ----
    if (view.snap?.kind) {
      const color = SNAP_COLORS[view.snap.kind] ?? 0x2b6cb0;
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(cam.halfH * 0.012, 12, 8),
        new THREE.MeshBasicMaterial({ color }),
      );
      s.position.set(view.snap.p.x, view.snap.p.y, view.snap.p.z);
      g.add(s);
      // 1-DOF 约束提示线（from-point 共轴/轴锁；per-hint 按轴配色）
      const AXIS_COLORS: Record<string, number> = { x: 0xcc3333, y: 0x2e8b57, z: 0x2b6cb0, u: 0x888888, v: 0x888888 };
      if (view.snap.hints?.length) {
        for (const h of view.snap.hints) g.add(lineSegments([h.a, h.b], AXIS_COLORS[h.axis] ?? 0x888888, 1));
      } else if (view.snap.kind.startsWith("axis") && view.snapAnchor) {
        g.add(lineSegments([view.snapAnchor, view.snap.p], color, 1));
      }
    }

    this.dyn = g;
    this.scene.add(g);
    this.renderer.render(this.scene, this.cam3);
  }
}

function ringsEq(a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  return true;
}

/** face → ShapeGeometry（在平面基 2D 建形，再用基矩阵变换到世界）。 */
function faceMesh(k: Kernel, id: FaceId, opts: { color: number; opacity: number; offset?: number }): any | null {
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
    color: opts.color,
    transparent: true,
    opacity: opts.opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: opts.offset ?? 0,
    polygonOffsetUnits: 1,
  });
  return new THREE.Mesh(geo, mat);
}

function lineSegments(pts: Pt3[], color: number, _width: number): any {
  const arr: number[] = [];
  for (const p of pts) arr.push(p.x, p.y, p.z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color }));
}

/** 地面网格 + 三色轴（SU 约定：X 红 / Y 绿 / Z 蓝向上）。 */
function buildStatic(): any {
  const g = new THREE.Group();
  const grid: number[] = [];
  const N = 20, STEP = 50;
  for (let i = -N; i <= N; i++) {
    grid.push(i * STEP, -N * STEP, 0, i * STEP, N * STEP, 0);
    grid.push(-N * STEP, i * STEP, 0, N * STEP, i * STEP, 0);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));
  g.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xdddddd })));
  const axis = (to: Pt3, color: number): any => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, to.x, to.y, to.z], 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
  };
  g.add(axis({ x: N * STEP, y: 0, z: 0 }, 0xcc3333));
  g.add(axis({ x: 0, y: N * STEP, z: 0 }, 0x2e8b57));
  g.add(axis({ x: 0, y: 0, z: N * STEP }, 0x2b6cb0));
  return g;
}
