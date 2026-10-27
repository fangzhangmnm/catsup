import type { KernelView } from "../scene/kernel-view.ts";
import type { Edge, EdgeId, FaceId, Vertex } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import type { Curve } from "../kernel/curves.ts";
import type { ChangeLog } from "../kernel/change-log.ts";
import { MeshKernel } from "./mesh-kernel.ts";
export declare class MeshView implements KernelView {
    readonly mesh: MeshKernel;
    readonly coplanarTol: number;
    readonly graph: KernelView["graph"];
    readonly edgeLayers: {
        layer(name: string): Set<EdgeId>;
    };
    private t;
    constructor(mesh: MeshKernel);
    get rev(): number;
    get changes(): ChangeLog;
    get soft(): Set<EdgeId>;
    private tables;
    vertices(): Vertex[];
    edges(): Edge[];
    faces(): Face[];
    face(id: FaceId): Face | undefined;
    planeOf(id: FaceId): PlaneRec | undefined;
    curves(): Curve[];
    isSoft(id: EdgeId): boolean;
    isSmooth(id: EdgeId): boolean;
    /** mesh 没有折线：面内的折痕就是一条软 + 平滑的边。 */
    isFold(): boolean;
    isEdgeHidden(id: EdgeId): boolean;
    isFaceHidden(id: FaceId): boolean;
    /** 单面：背面没有材质（渲染剔掉背面，user 10-27「enforce backface culling」）。 */
    faceMaterialOf(id: FaceId, side?: 0 | 1): number | undefined;
}
export declare function meshViewOf(m: MeshKernel): MeshView;
