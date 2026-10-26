import type { ImportNode, ImportScene } from "../format/gltf-import.ts";
import { type BrepSnapshot } from "../kernel/kernel.ts";
import { type TriangleCastReport } from "../kernel/from-triangles.ts";
import { type PoolRef, Scene } from "./scene.ts";
import { type Xform } from "./xform.ts";
/** op 带的东西：节点树 + 每个网格**已经装好的**膜（存档同款快照）。三角 → 膜只在提交前跑一次（castImport）；撤销重放 / 复现包只做装载，
 *  不受以后改装法的影响。 */
export interface ImportedScene {
    name: string;
    nodes: ImportNode[];
    roots: number[];
    meshes: {
        name: string;
        brep: BrepSnapshot;
    }[];
}
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
/** 三角 → 膜（每个网格一次）：纯函数，提交前在编辑器里跑。 */
export declare function castImport(data: ImportScene, softDeg: number): {
    scene: ImportedScene;
    report: TriangleCastReport;
};
/** 把装好的导入装进场景 s 的 at 池里；place = 文件坐标 → at 所在定义坐标。直接改 s（op 语义）。 */
export declare function buildImport(s: Scene, at: PoolRef, data: ImportedScene, place: Xform): ImportBuildReport;
