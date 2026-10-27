// mesh/ops/index.ts —— mesh 算子清单（一个文件 = 一族，可扔；指令注册表的 `mesh.*` 族包这里）。created 2026-10-27 by Claude Fable 5.1
export { splitEdge, splitFace, knife } from "./split.ts";
export { joinFaces, dissolveVertex } from "./join.ts";
export { mergeVerts } from "./merge.ts";
export { deleteFaces, deleteEdges, deleteVerts } from "./delete.ts";
export { extrudeFaces, type ExtrudeResult } from "./extrude.ts";
export { addPolygon, fillLoop, addBox } from "./build.ts";
export { moveVerts, translateVerts, transformVerts, setEdgeFlags, setFaceMaterial, flipFaces } from "./geometry.ts";
export { loopCut, type LoopCutResult } from "./loopcut.ts";
export { limitedDissolve, removeDoubles } from "./cleanup.ts";
export { recalcNormals } from "./orient.ts";
export { smoothByAngle } from "./shade.ts";
