import type { MeshKernel } from "../mesh-kernel.ts";
export interface MeshSel {
    readonly faces?: readonly number[];
    readonly edges?: readonly number[];
    readonly verts?: readonly number[];
}
/** 复制：选中的面（连它们的点）、选中的边、选中的点各来一份新的，叠在原处；面带材质槽。返回新的点 / 边 / 面（顺序跟原件的 id 升序）。 */
export declare function duplicateGeometry(k: MeshKernel, sel: MeshSel): {
    verts: number[];
    edges: number[];
    faces: number[];
};
/** 选中的边（或只选了点时：选中点之间的开口边）连成的圈。每个点在圈里恰好连两条 = 合格；不合格 = 人话错误。 */
export declare function edgeLoops(k: MeshKernel, sel: MeshSel): number[][] | string;
/** 补洞 / 桥接：选中的边是一圈 = 补一张面；两圈点数一样 = 中间连一圈四边形（错位按距离挑最近的对齐）。返回新面；不合格 = 人话错误。 */
export declare function fillOrBridge(k: MeshKernel, sel: MeshSel): {
    kind: "fill" | "bridge";
    faces: number[];
} | string;
