// mesh/mirror-ops.ts —— 网格体每条 op / 每条菜单动作在镜像下归哪一类：镜像不变量的分类表（撤销护栏审计 F-113 的一层奶酪；created 2026-10-28 by Claude Fable 5.1）。
// 以前这三张集合散在 editor.ts 里手写，新加一条 mesh op 忘了登记 = 镜像编辑开着它悄悄改拓扑、强行对称不对称化。现在：表在这、编辑器按类取集合、
// 守卫 test/mirror-ops.test.ts 对着 ops.ts 的 op 清单和指令注册表逼每一条都登记（漏一条 = 测试红）。
// 类（挪点的纪律见 mirror.ts / 设计稿 20261028-mirror-redo-design.md §2）：
//   move   挪点：提交前改写（钉 / 不穿 / 并；镜像编辑补对面），强行对称做完再对称化
//   topo   改拓扑：镜像编辑开着、从工具 / 菜单来的先问「关掉镜像，照做 / 取消」；强行对称做完对称化
//   flags  只改边标记：镜像编辑补对面的边；强行对称做完对称化（标记跟着镜）
//   whole  整体算子，对称进对称出：不问、不改写；强行对称做完查一下（已对称 = 什么都不做）
//   meta   镜像自己的 / 不碰形状的：从不对称化
export type MirrorOpClass = "move" | "topo" | "flags" | "whole" | "meta";
export const MIRROR_OP_CLASS = {
  meshMove: "move",
  meshExtrude: "topo", meshDuplicate: "topo", meshFill: "topo", meshFlip: "topo", meshKnife: "topo", meshLoopCut: "topo", meshDelete: "topo", meshInset: "topo", meshBevel: "topo", meshBevelVerts: "topo", meshMerge: "topo", meshAddPrimitive: "topo",
  meshEdgeMarks: "flags",
  meshSubdivide: "whole",
  meshSymmetrize: "meta", meshSymmetrySnap: "meta", meshSmoothDefault: "meta",
} as const satisfies Readonly<Record<string, MirrorOpClass>>;
export type MeshOpName = keyof typeof MIRROR_OP_CLASS;
/** 某一类的 op 名（编辑器拿它造集合）。 */
export function opsOfClass(c: MirrorOpClass): MeshOpName[] { return (Object.keys(MIRROR_OP_CLASS) as MeshOpName[]).filter((k) => MIRROR_OP_CLASS[k] === c); }

/** 注册表里路由到网格体指令的动作：会改拓扑的（镜像编辑开着先问）vs 对称进对称出 / 只改标记 / 镜像自己的（直接做）。每个网格体动作必须在其中一张里（守卫查注册表）。 */
export const MIRROR_TOPO_ACTIONS: ReadonlySet<string> = new Set(["mesh.loopCut", "mesh.connect", "mesh.inset", "mesh.bevel", "mesh.bevelVerts", "mesh.mergeCenter", "mesh.duplicate", "mesh.fill", "mesh.flipNormals"]);
export const MIRROR_PASS_ACTIONS: ReadonlySet<string> = new Set(["move", "mesh.subdivide", "mesh.symmetrySnap", "mesh.originToSelection", "mesh.markSharp", "mesh.markSmooth", "mesh.clearMarks", "mesh.smooth.angle", "mesh.smooth.smooth", "mesh.smooth.hard"]);
