// scene/kernel-view.ts —— 内核的「显示契约」：渲染（editor/pool-mesh.ts）、合成视图（scene/world-view.ts）、拾取 / 吸附 / 屏幕索引（经 WorldView）读内核只经这份接口。
// 两个内核各自真正实现它：brep 的 Kernel 结构上就满足（这里的记录类型就是它的）；mesh 内核经 mesh/mesh-view.ts 的派生视图满足（面环、每面的朝向平面、邻接、自己的改动日志、自己的面显隐）。
// 场景层只认这份契约（Scene.viewOf），不认具体内核；加内核 = 加一个实现，渲染 / 拾取 / 吸附不改。
// created 2026-10-27 by Claude Fable 5.1（user 10-27「不要monkey patch。基础打扎实」——不是让网格假装成 brep，是把契约立出来、两边各自真做）
import type { Edge, EdgeId, FaceId, Pt3, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import type { Curve } from "../kernel/curves.ts";
import type { ChangeLog } from "../kernel/change-log.ts";

export interface KernelView {
  /** 池版本号：拓扑或坐标改了就变（合成视图按它缓存每槽的世界坐标几何）。 */
  readonly rev: number;
  /** 共面容差 τ（米）：编辑器判「点在哪张面的平面上」与内核同一把尺子。 */
  readonly coplanarTol: number;
  /** 改动日志（编号 + 族谱）：渲染缓存按它算「谁变了」，只重建那几张面 / 边；预演副本按族谱找共同祖先。 */
  readonly changes: ChangeLog;
  vertices(): Vertex[];
  edges(): Edge[];
  faces(): Face[];
  face(id: FaceId): Face | undefined;
  /** 面的平面与基：brep = 膜所在平面；mesh = 这张面的朝向平面（环的 Newell 法向；环绕 +n 逆时针 = 正面朝 +n）。 */
  planeOf(id: FaceId): PlaneRec | undefined;
  /** 曲线实体（圆 / 弧：圆心进吸附）；没有 = 空。 */
  curves(): Curve[];
  /** 软边集（不画线、两侧算一片曲面）。 */
  readonly soft: Set<EdgeId>;
  /** 边层：smooth / fold / hidden……（没有的层 = 空集）。 */
  readonly edgeLayers: { layer(name: string): Set<EdgeId> };
  isSoft(id: EdgeId): boolean;
  isSmooth(id: EdgeId): boolean;
  isFold(id: EdgeId): boolean;
  isEdgeHidden(id: EdgeId): boolean;
  isFaceHidden(id: FaceId): boolean;
  /** 面的材质槽（side 0 正面 / 1 背面；undefined = 默认）。单面的身体（mesh）背面永远 undefined，渲染剔掉背面。 */
  faceMaterialOf(id: FaceId, side?: 0 | 1): number | undefined;
  readonly graph: { pt(id: VertexId): Pt3; edge(id: EdgeId): Edge; vertex(id: VertexId): Vertex; hasEdge(id: EdgeId): boolean; hasVertex(id: VertexId): boolean };
}
