// mesh/mirror-ops.ts —— 网格体每条 op / 每条菜单动作在镜像下归哪一类：镜像不变量的分类表（撤销护栏审计 F-113 的一层奶酪；created 2026-10-28 by Claude Fable 5.1）。
// 以前这三张集合散在 editor.ts 里手写，新加一条 mesh op 忘了登记 = 镜像编辑开着它悄悄改拓扑、强行对称不对称化。现在：表在这、编辑器按类取集合（强行对称管不管 = 内核版本号变没变 + 不是 meta）、
// 守卫 test/mirror-ops.test.ts 对着 ops.ts 的 op 清单和指令注册表逼每一条都登记（漏一条 = 测试红）。
// 类（挪点的纪律见 mirror.ts / 设计稿 20261028-mirror-redo-design.md §2）：
//   move   挪点：提交前改写（钉 / 不穿 / 并；镜像编辑补对面），强行对称做完再对称化
//   topo   改拓扑：镜像编辑开着、从工具 / 菜单来的先问「关掉镜像，照做 / 取消」；强行对称做完对称化
//   flags  只改标记（边的标记 / 面的材质）：镜像编辑补对面的边；强行对称做完对称化（标记 / 材质跟着镜）
//   whole  整体算子，对称进对称出：不问、不改写；强行对称做完查一下（已对称 = 什么都不做）
//   meta   镜像自己的 / 不碰形状的：从不对称化
export type MirrorOpClass = "move" | "topo" | "flags" | "whole" | "meta";
export const MIRROR_OP_CLASS = {
  meshMove: "move",
  meshExtrude: "topo", meshDuplicate: "topo", meshFill: "topo", meshFlip: "topo", meshKnife: "topo", meshLoopCut: "topo", meshDelete: "topo", meshInset: "topo", meshBevel: "topo", meshBevelVerts: "topo", meshMerge: "topo", meshAddPrimitive: "topo",
  meshEdgeMarks: "flags",
  // 画（贴图主线 1-3b，统筹 11-10 同意）：换材质 / 开始画只改面上的标记、不改拓扑（强行对称做完对称化，点名的面在 faces 里 → 选得出边）；
  //   给新面补位置只写贴图坐标那一列，不碰形状和材质 = meta（从不触发对称化，免得收尾自己套自己）。
  meshPaintFaces: "flags", startPaint: "flags", meshLayoutPaint: "meta",
  meshSubdivide: "whole",
  meshSymmetrize: "meta", meshSymmetrySnap: "meta", meshSmoothDefault: "meta", setMeshMirror: "meta",
  // 不叫 mesh* 但会改网格内核的（2026-11-09 Claude Opus 5.5；计划书 20261109-audit-fixes-plan §3 第 2 层）：以前强行对称按「名字以 mesh 开头」判，它们做完不对称化，
  // 之后在另一边做一步就被当成「另一半」删掉（11-09 真 app：左边贴进一张面，再在右边挪一个点，贴的那张没了）。现在编辑器按「内核版本号变没变」判（不看名字），这里登记是给人看 + 给守卫逼新 op 想一下。
  paste: "topo", mergeObject: "topo", explode: "topo", separateObject: "topo", plugin: "topo", makeComponent: "topo",
  setAxes: "whole",   // 换原点：会让模型整个对镜像面挪位——强行对称下先在拷贝上试，不对称就问（editor.ts forceOriginAsk = 第 1 层）
  castDefinition: "meta", setHidden: "meta", unhideAll: "meta",   // 换身体种类 / 只改看法（隐藏不算对称）：从不对称化
} as const satisfies Readonly<Record<string, MirrorOpClass>>;
export type MeshOpName = keyof typeof MIRROR_OP_CLASS;
/**
 * 指令点名的点 / 边 / 面（强行对称选边的第二顺位 =「点了谁」在之前的哪边，mirror.ts forceSide；计划书 20261109-audit-fixes-plan §3 第 5 层）。
 * 按字段名取（verts / edges / faces / edge / face / moves[].v），不认识的指令 = 空；id 在提交前那个内核的 id 空间里。
 */
export function namedElements(op: object): { verts: number[]; edges: number[]; faces: number[] } {
  const o = op as Record<string, unknown>, nums = (x: unknown): number[] => (Array.isArray(x) ? x.filter((n): n is number => typeof n === "number") : typeof x === "number" ? [x] : []);
  const moves = Array.isArray(o.moves) ? (o.moves as { v?: unknown }[]).map((mv) => mv?.v).filter((n): n is number => typeof n === "number") : [];
  return { verts: [...nums(o.verts), ...moves], edges: [...nums(o.edges), ...nums(o.edge)], faces: [...nums(o.faces), ...nums(o.face)] };
}
/** 某一类的 op 名（编辑器拿它造集合）。 */
export function opsOfClass(c: MirrorOpClass): MeshOpName[] { return (Object.keys(MIRROR_OP_CLASS) as MeshOpName[]).filter((k) => MIRROR_OP_CLASS[k] === c); }

/** 注册表里路由到网格体指令的动作：会改拓扑的（镜像编辑开着先问）vs 对称进对称出 / 只改标记 / 镜像自己的（直接做）。每个网格体动作必须在其中一张里（守卫查注册表）。 */
export const MIRROR_TOPO_ACTIONS: ReadonlySet<string> = new Set(["mesh.loopCut", "mesh.connect", "mesh.inset", "mesh.bevel", "mesh.bevelVerts", "mesh.mergeCenter", "mesh.duplicate", "mesh.fill", "mesh.flipNormals", "mesh.mergeReversed"]);
export const MIRROR_PASS_ACTIONS: ReadonlySet<string> = new Set(["move", "mesh.flatten.x", "mesh.flatten.y", "mesh.flatten.z", "mesh.flatten.normal", "mesh.flatten.mirror", "mesh.subdivide", "mesh.symmetrySnap", "mesh.originToSelection", "mesh.startPaint", "mesh.paintAddFaces", "mesh.markSharp", "mesh.markSmooth", "mesh.clearMarks", "mesh.markSeam", "mesh.clearSeam", "mesh.autoSeams", "mesh.smooth.angle", "mesh.smooth.smooth", "mesh.smooth.hard"]);
