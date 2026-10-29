export type MirrorOpClass = "move" | "topo" | "flags" | "whole" | "meta";
export declare const MIRROR_OP_CLASS: {
    readonly meshMove: "move";
    readonly meshExtrude: "topo";
    readonly meshDuplicate: "topo";
    readonly meshFill: "topo";
    readonly meshFlip: "topo";
    readonly meshKnife: "topo";
    readonly meshLoopCut: "topo";
    readonly meshDelete: "topo";
    readonly meshInset: "topo";
    readonly meshBevel: "topo";
    readonly meshBevelVerts: "topo";
    readonly meshMerge: "topo";
    readonly meshAddPrimitive: "topo";
    readonly meshEdgeMarks: "flags";
    readonly meshSubdivide: "whole";
    readonly meshSymmetrize: "meta";
    readonly meshSymmetrySnap: "meta";
    readonly meshSmoothDefault: "meta";
};
export type MeshOpName = keyof typeof MIRROR_OP_CLASS;
/** 某一类的 op 名（编辑器拿它造集合）。 */
export declare function opsOfClass(c: MirrorOpClass): MeshOpName[];
/** 注册表里路由到网格体指令的动作：会改拓扑的（镜像编辑开着先问）vs 对称进对称出 / 只改标记 / 镜像自己的（直接做）。每个网格体动作必须在其中一张里（守卫查注册表）。 */
export declare const MIRROR_TOPO_ACTIONS: ReadonlySet<string>;
export declare const MIRROR_PASS_ACTIONS: ReadonlySet<string>;
