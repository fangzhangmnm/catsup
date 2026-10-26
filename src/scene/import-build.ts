// import-build.ts —— 导入的后半段：中间数据（format/gltf-import.ts 的节点树）→ 场景里的组件（纪元排期 T11 / 账本 DT2）。created 2026-10-26 by Claude Opus 5.5
// user 拍的（10-25）：层级原样留、变换不动、节点映射成组件、挂在当前上下文下面；组件的轴 = 节点的原点和朝向；空节点留着（画小三轴、点得中）；
//   「不出 dummy」的规则不在导入时跑，以后做成事后的批量整理指令。
// 映射：
//   · 有网格、没孩子的节点 → 那个网格的定义的一份实例（同一个网格被几个节点用 = 同一个定义的几份实例，GTA 的六个轮子就是一个定义六份）；
//   · 有孩子的节点 → 自己一个定义（网格几何 + 孩子们的实例）；
//   · 没网格、没孩子 → 空定义（编辑器画三轴标记）；
//   · 文件只有一个根 → 这个根就是放进来的那一份；好几个根 → 外面包一层，名字 = 文件名（导进来是一个能整体选中的东西）。
// 网格几何走 kernel/from-triangles.ts（三角 → 膜；弯折 ≤ softDeg 的边变 soft + smooth），在 castImport 里、提交前跑一次。以后有 mesh 了，换掉的只是 castImport。
import type { ImportNode, ImportScene } from "../format/gltf-import.ts";
import { type BrepSnapshot, Kernel } from "../kernel/kernel.ts";
import { type TriangleCastReport, kernelFromTriangles } from "../kernel/from-triangles.ts";
import { type DefId, type PoolRef, Scene } from "./scene.ts";
import { type Xform, compose } from "./xform.ts";

/** op 带的东西：节点树 + 每个网格**已经装好的**膜（存档同款快照）。三角 → 膜只在提交前跑一次（castImport）；撤销重放 / 复现包只做装载，
 *  不受以后改装法的影响。 */
export interface ImportedScene { name: string; nodes: ImportNode[]; roots: number[]; meshes: { name: string; brep: BrepSnapshot }[] }

export interface ImportBuildReport {
  /** 新建的定义数（含空的、包一层的）。 */
  definitions: number;
  /** 新放的实例数（含最外面那一份）。 */
  instances: number;
  /** 空节点数。 */
  empties: number;
  /** 最外面那一份的实例 id（在 at 的定义里）。 */
  top: number;
}

const MAX_DEPTH = 64;

/** 三角 → 膜（每个网格一次）：纯函数，提交前在编辑器里跑。 */
export function castImport(data: ImportScene, softDeg: number): { scene: ImportedScene; report: TriangleCastReport } {
  const report: TriangleCastReport = { triangles: 0, degenerate: 0, duplicate: 0, repaired: 0, rejected: 0, softened: 0 };
  const meshes = data.meshes.map((m) => {
    const r = kernelFromTriangles(m.positions, m.tris, { softDeg });
    for (const key of Object.keys(report) as (keyof TriangleCastReport)[]) report[key] += r.report[key];
    return { name: m.name, brep: r.kernel.toBrep() };
  });
  return { scene: { name: data.name, nodes: data.nodes, roots: data.roots, meshes }, report };
}

/** 把装好的导入装进场景 s 的 at 池里；place = 文件坐标 → at 所在定义坐标。直接改 s（op 语义）。 */
export function buildImport(s: Scene, at: PoolRef, data: ImportedScene, place: Xform): ImportBuildReport {
  let definitions = 0, instances = 0, empties = 0;
  const meshKernel = new Map<number, Kernel>();
  const kernelOfMesh = (mi: number): Kernel => {
    let k = meshKernel.get(mi);
    if (!k) { k = Kernel.fromBrep(data.meshes[mi].brep); meshKernel.set(mi, k); }
    return k;
  };
  const leafDef = new Map<number, DefId>();   // 网格号 → 共用的定义（没孩子的节点用）
  const visiting = new Set<number>();
  const defOf = (ni: number, depth: number): DefId => {
    const n = data.nodes[ni];
    if (!n) throw new Error(`导入：节点 ${ni} 不存在`);
    if (visiting.has(ni) || depth > MAX_DEPTH) throw new Error("导入：节点树有环或太深");
    const mesh = n.mesh !== null && data.meshes[n.mesh] ? n.mesh : null;
    if (mesh !== null && !n.children.length) {
      let id = leafDef.get(mesh);
      if (id === undefined) { id = s.mintDef(data.meshes[mesh].name, kernelOfMesh(mesh).clone()).id; leafDef.set(mesh, id); definitions++; }
      return id;
    }
    visiting.add(ni);
    const d = s.mintDef(n.name, mesh !== null ? kernelOfMesh(mesh).clone() : new Kernel());
    definitions++;
    if (mesh === null && !n.children.length) empties++;
    for (const ci of n.children) {
      const child = defOf(ci, depth + 1);
      const inst = s.mintInstance(d.id, null, child, data.nodes[ci].xform);
      inst.name = data.nodes[ci].name;
      instances++;
    }
    visiting.delete(ni);
    return d.id;
  };
  let topDef: DefId, topXform: Xform, topName: string;
  if (data.roots.length === 1) {
    const r = data.roots[0];
    topDef = defOf(r, 0); topXform = compose(place, data.nodes[r].xform); topName = data.nodes[r].name;
  } else {
    const w = s.mintDef(data.name, new Kernel());
    definitions++;
    for (const r of data.roots) { const inst = s.mintInstance(w.id, null, defOf(r, 1), data.nodes[r].xform); inst.name = data.nodes[r].name; instances++; }
    topDef = w.id; topXform = place; topName = data.name;
  }
  const top = s.mintInstance(at.def, at.group, topDef, topXform);
  top.name = topName;
  instances++;
  return { definitions, instances, empties, top: top.id };
}
