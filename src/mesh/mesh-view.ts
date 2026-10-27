// mesh/mesh-view.ts —— mesh 内核的显示视图：实现 scene/kernel-view.ts 的契约（渲染 / 拾取 / 吸附读的那份）。created 2026-10-27 by Claude Fable 5.1
// 派生表（点 / 边 / 面记录、每面的朝向平面）按内核 rev 缓存，改了整表重算 O(n)；改动日志直接是内核自己的（渲染缓存据此只重建改过的面 / 边；增量重算派生表是以后的事）。
// 面 = 简单环，没有洞；平面 = 环的 Newell 法向（单面：环的绕向就是正面）；不平的 n 边形投影到自己的最佳拟合平面给 2D 环（拾取 / 三角化用，和 Blender 画 n 边形同一做法）。
import type { KernelView } from "../scene/kernel-view.ts";
import type { Edge, EdgeId, FaceId, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import { bboxOfRing } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import type { Ring } from "../kernel/facefind.ts";
import type { Curve } from "../kernel/curves.ts";
import type { ChangeLog } from "../kernel/change-log.ts";
import { COPLANAR_TOL_DEFAULT, planeBasis, projectToPlane } from "../kernel/geom.ts";
import { MeshKernel, F_SOFT, F_SMOOTH, F_HIDDEN, FF_HIDDEN } from "./mesh-kernel.ts";

interface Tables { rev: number; verts: Map<VertexId, Vertex>; edges: Map<EdgeId, Edge>; faces: Map<FaceId, Face>; planes: Map<FaceId, PlaneRec>; soft: Set<EdgeId>; smooth: Set<EdgeId>; hidden: Set<EdgeId>; }

export class MeshView implements KernelView {
  readonly mesh: MeshKernel;
  readonly coplanarTol = COPLANAR_TOL_DEFAULT;
  readonly graph: KernelView["graph"];
  readonly edgeLayers: { layer(name: string): Set<EdgeId> };
  private t: Tables | null = null;
  constructor(mesh: MeshKernel) {
    this.mesh = mesh;
    this.graph = {
      pt: (id) => { if (!mesh.hasV(id)) throw new Error(`vertex ${id} 不存在`); return mesh.pt(id); },
      edge: (id) => { const e = this.tables().edges.get(id); if (!e) throw new Error(`edge ${id} 不存在`); return e; },
      vertex: (id) => { const v = this.tables().verts.get(id); if (!v) throw new Error(`vertex ${id} 不存在`); return v; },
      hasEdge: (id) => mesh.hasE(id),
      hasVertex: (id) => mesh.hasV(id),
    };
    this.edgeLayers = { layer: (name) => { const t = this.tables(); return name === "smooth" ? t.smooth : name === "soft" ? t.soft : name === "hidden" ? t.hidden : new Set(); } };
  }
  get rev(): number { return this.mesh.rev; }
  get changes(): ChangeLog { return this.mesh.changes; }
  get soft(): Set<EdgeId> { return this.tables().soft; }

  private tables(): Tables {
    if (this.t && this.t.rev === this.mesh.rev) return this.t;
    const m = this.mesh, verts = new Map<VertexId, Vertex>(), edges = new Map<EdgeId, Edge>(), faces = new Map<FaceId, Face>(), planes = new Map<FaceId, PlaneRec>();
    const soft = new Set<EdgeId>(), smooth = new Set<EdgeId>(), hidden = new Set<EdgeId>();
    for (const v of m.verts()) { const p = m.pt(v); verts.set(v, { id: v, x: p.x, y: p.y, z: p.z, edges: new Set(m.vEdges(v)) }); }
    for (const e of m.edges()) {
      edges.set(e, { id: e, a: m.edgeA[e], b: m.edgeB[e], faceLinks: [...m.eFaces(e)] });
      const fl = m.edgeFlags[e];
      if (fl & F_SOFT) soft.add(e);
      if (fl & F_SMOOTH) smooth.add(e);
      if (fl & F_HIDDEN) hidden.add(e);
    }
    for (const f of m.faces()) {
      const vs = m.faceVerts(f), pts = m.facePts(f), n = m.faceNormal(f);
      let cx = 0, cy = 0, cz = 0;
      for (const p of pts) { cx += p.x; cy += p.y; cz += p.z; }
      const k = 1 / pts.length;
      const plane = { n, d: n.x * cx * k + n.y * cy * k + n.z * cz * k }, basis = planeBasis(plane);   // 过形心、法向 = 环的绕向
      const ring: Ring = {
        edges: vs.map((v, i) => { const e = m.edgeOf(v, vs[(i + 1) % vs.length]); return { edge: e, forward: m.edgeA[e] === v }; }),
        pts: pts.map((p) => projectToPlane(p, basis)),
        vids: [...vs],
      };
      faces.set(f, { id: f, planeId: f, outer: ring, holes: [], bbox: bboxOfRing(ring) });
      planes.set(f, { id: f, plane, basis });
    }
    return (this.t = { rev: m.rev, verts, edges, faces, planes, soft, smooth, hidden });
  }

  vertices(): Vertex[] { return [...this.tables().verts.values()]; }
  edges(): Edge[] { return [...this.tables().edges.values()]; }
  faces(): Face[] { return [...this.tables().faces.values()]; }
  face(id: FaceId): Face | undefined { return this.tables().faces.get(id); }
  planeOf(id: FaceId): PlaneRec | undefined { return this.tables().planes.get(id); }
  curves(): Curve[] { return []; }
  isSoft(id: EdgeId): boolean { return this.mesh.hasFlag(id, F_SOFT); }
  isSmooth(id: EdgeId): boolean { return this.mesh.hasFlag(id, F_SMOOTH); }
  /** mesh 没有折线：面内的折痕就是一条软 + 平滑的边。 */
  isFold(): boolean { return false; }
  isEdgeHidden(id: EdgeId): boolean { return this.mesh.hasFlag(id, F_HIDDEN); }
  isFaceHidden(id: FaceId): boolean { return this.mesh.hasF(id) && (this.mesh.faceFlags[id] & FF_HIDDEN) !== 0; }
  /** 单面：背面没有材质（渲染剔掉背面，user 10-27「enforce backface culling」）。 */
  faceMaterialOf(id: FaceId, side: 0 | 1 = 0): number | undefined {
    if (side === 1 || !this.mesh.hasF(id)) return undefined;
    const s = this.mesh.faceMat[id];
    return s >= 0 ? s : undefined;
  }
}

/** 每个 mesh 内核对象一份视图（身份稳定：渲染缓存按它认「本来就画着它的那份」；预演副本是新内核 = 新视图，族谱接得上）。 */
const VIEWS = new WeakMap<MeshKernel, MeshView>();
export function meshViewOf(m: MeshKernel): MeshView { let v = VIEWS.get(m); if (!v) { v = new MeshView(m); VIEWS.set(m, v); } return v; }
