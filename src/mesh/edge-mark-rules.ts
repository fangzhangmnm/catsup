// mesh/edge-mark-rules.ts —— 每个拓扑操作给新的边、新的面申报哪种来历（看得见的表；施工单二十二 A 起头，属性地基轮 3c 改成按来历、3d 改成测试读的数据）。
// created 2026-11-12 by Claude Opus 5.5 · edited 2026-11-13 by Claude Opus 5.5（3c、3d）
// 边上的标记、面上的隐藏 / 材质、角上的贴图坐标都是属性表里的列，跟着来历走、不按位手抄：
//   一块 piece（劈开的、切开的）/ 一份 copy（复制、镜像、挤出的帽、倒角时挨着的边、改了环的面）= 全部列照抄；
//   并成 joined（溶解二度点、合并点、并面）= 每一列按自己声明的 merge 并；
//   新长 grown（ensureEdge、面里切出来的、侧墙、倒角带）= 全是缺省值（面上声明了「跟旁边」的列跟旁边那张）；凭空来的 fresh（基本体、建面、补洞 / 桥接）= 调用的人给的值，没给 = 缺省值。
//   来历在建边 / 建面那一刻申报（addEdge / declareRingEdges / absorbIntoEdge / addFace / setFaceRing），不在事后补写；
//   操作本意要写的标记（倒角圆角中间标平滑、手标指令、硬表面转过来、导入、读文件）按保留名写（reserved-columns.ts setEdgeMark / edge-smooth.ts markEdges）。
// 这张表是测试的输入（test/probe-columns.test.ts，「探针列」：一列全 1 的边列、一列全 7 的面列，照表逐个操作跑一个典型例子）：
//   表里写了 piece / copy / joined = 这个例子里一定有带着值的新元素；写了 grown / fresh = 一定有缺省值的新元素；没写的那一类一个都不许有；没动的元素值不变。
//   「新元素」= 编号新的，或者编号没变但两头 / 环变了的（改了环的面是它自己的一份）。
// 守卫 test/edge-mark-rules.test.ts：src/mesh/ops/ 每个文件在这里有一行；每个导出的函数不是在 ops 里就是在 helpers 里；操作里不许按位手抄标记。
// ops 文件夹以外也造元素的地方在 ELSEWHERE（键 = src 下的路径）：镜像 / 对称化（mesh/mirror.ts，整个文件的导出都要表态）、并物件（editor/ops.ts appendMesh，只管列出来的这一个）。

/** 新元素的来历种类（columns.ts EdgeOrigin / FaceOrigin 的 kind）；given = 凭空来的、但带着调用的人给的值（并物件把整张面 / 整条边连同每一列搬过来）——算带值的那一类。 */
export type Birth = "piece" | "copy" | "joined" | "grown" | "fresh" | "given";
/** 一个操作在典型例子里造出来的新边、新面各是哪几种来历。 */
export interface OpBirths { readonly edges: readonly Birth[]; readonly faces: readonly Birth[] }
/** 一个文件：一句话说清楚 + 改元素的函数各自的来历 + 不造元素的函数（纯算、查询、只挪点不算——只挪点的照样进 ops，来历写空，测试看它不改值）。 */
export interface OpsRow { readonly say: string; readonly ops: Readonly<Record<string, OpBirths>>; readonly helpers?: readonly string[] }
const B = (edges: readonly Birth[], faces: readonly Birth[]): OpBirths => ({ edges, faces });
const NONE = B([], []);

export const OPS: Readonly<Record<string, OpsRow>> = {
  "bevel.ts": { say: "倒角：挨着被倒的边、自己没被倒的边换成新边 = 照抄（先建边再改面）；被倒的边变成倒角带，带上的边 = 新长（标记不往带上搬，Blender 默认也不搬）；圆角中间的线按操作本意标平滑；倒角带 / 角上的补片 = 新长、跟旁边；挨着的面改了环 = 它自己的一份",
    ops: { bevelEdges: B(["copy", "grown"], ["copy", "grown"]), bevelVerts: B(["copy", "grown"], ["copy", "grown"]) } },
  "build.ts": { say: "建面 / 建几何体：新边 = 新长，新面 = 凭空来的（材质由调用的人给）",
    ops: { addPolygon: B(["grown"], ["fresh"]), fillLoop: B(["grown"], ["fresh"]), addBox: B(["grown"], ["fresh"]) } },
  "cleanup.ts": { say: "整理：有限溶解 = 溶解二度点（并成）+ 并面（并成）；去重点 = 所有组一次交给内核的合并点原子（见 merge.ts）",
    ops: { limitedDissolve: B(["joined"], ["copy", "joined"]), removeDoubles: B(["joined"], ["copy"]) } },
  "delete.ts": { say: "删：剩下的边、面不动；删面留边时没了面的边设裸线位；删选中 + 溶解 = 并面（并成）",
    ops: { deleteFaces: NONE, deleteEdges: NONE, deleteVerts: NONE, deleteSelection: B([], ["joined"]) } },
  "duplicate.ts": { say: "复制（Shift+D）：面上的边和选中的边 = 照抄（单独复制出来的边是裸线）、面 = 照抄；补洞 / 桥接 / 造面：新边 = 新长、新面 = 凭空来的；造面两个点 = 一条凭空来的裸线",
    ops: { duplicateGeometry: B(["copy"], ["copy"]), fillOrBridge: B(["grown"], ["fresh"]), makeFaceRing: B(["grown", "fresh"], ["fresh"]) }, helpers: ["edgeLoops", "orientAsHole", "ringNewell", "faceBlocker", "faceExists", "looseFrame"] },   // 造面（F）：面的边 = 新长、两点的裸线 = 凭空来的、面 = 凭空来的
  "make-face.ts": { say: "造面（Blender F）的计划：只读，算选区说的是哪一种面、点序和朝向；造由 duplicate.ts makeFaceRing 做", ops: {}, helpers: ["planMakeFace"] },
  "extrude.ts": { say: "挤出面：帽上的边 = 照抄原来那条（全部列，含隐藏）、帽 = 原来那张面换到新点上（它自己的一份）；侧边、侧面 = 新长（侧面跟被挤的那张）。挤出边：墙 = 新长、跟那条边唯一挨着的面；挤出点 = 一条裸线",
    ops: { extrudeFaces: B(["copy", "grown"], ["copy", "grown"]), extrudeEdges: B(["grown"], ["grown"]), extrudeVerts: B(["grown"], []), extrudeAndOffset: B(["copy", "grown"], ["copy", "grown"]), extrudeAlongNormals: B(["grown"], ["grown"]) },
    helpers: ["extrudeNormalDirs"] },
  "flatten.ts": { say: "压平 / 单轴缩放：只算点的新位置，边、面不变", ops: {}, helpers: ["scaleAlong", "bestFitNormal", "flattenMoves"] },
  "geometry.ts": { say: "挪点 / 变换 / 换材质 / 翻面：只挪点、只改材质那一列、只把环倒过来，不造元素，别的列不动",
    ops: { moveVerts: NONE, translateVerts: NONE, transformVerts: NONE, setFaceMaterial: NONE, flipFaces: NONE }, helpers: ["selectionVerts"] },
  "index.ts": { say: "出口：不碰边", ops: {} },
  "inset.ts": { say: "插入：外圈的边不变，新长出来的内圈和连接边 = 新长（不照抄帽上的标记）；内圈那张面和四周的面都是原面的一块",
    ops: { insetFaces: B(["grown"], ["piece"]) }, helpers: ["insetRing", "maxInset"] },
  "join.ts": { say: "溶解二度点：两条边并成一条 = 并成（先建边再改面；那对点之间已经有边 = absorbIntoEdge 并进它，它排第一）、挨着的面改了环 = 它自己的一份；并面：两张面并成一张 = 并成，被并掉的公共边没了",
    ops: { joinFaces: B([], ["joined"]), dissolveVertex: B(["joined"], ["copy"]) } },
  "loopcut.ts": { say: "环切：被切的边劈成两半（走 split.ts，一块）；切出来的新环 = 新长；被切的面 = 一块",
    ops: { loopCut: B(["piece", "grown"], ["piece"]), loopCuts: B(["piece", "grown"], ["piece"]) } },
  "merge.ts": { say: "合到一点 = 内核的合并点原子（MeshKernel.mergePoints，规划在 mesh/merge-points.ts）：只换了一头的边还是那条边、列原样；几条并成同一对点 = absorbIntoEdge（留编号最小的那条、它排第一，每列按 merge 并）；环上剪下来的刺留成裸线；改了环的面 = 它自己的一份",
    ops: { mergeVerts: B(["joined"], ["copy"]) } },
  "orient.ts": { say: "法向一致化：只翻面的绕向，边不变、面的列不动", ops: { recalcNormals: NONE } },
  "primitives.ts": { say: "基本体：新边 = 新长，新面 = 凭空来的；只有边的圆圈 / 方框设裸线位", ops: { addPrimitive: B(["grown"], ["fresh"]) }, helpers: ["primitiveDims"] },
  "ring-edges.ts": { say: "工具：按面环的顺序先把缺的边建好、各自申报来历（declareRingEdges），给别的操作用；已经在的边又申报来历 = 核值，对不上抛", ops: {}, helpers: ["declareRingEdges"] },
  "split.ts": { say: "劈边：两半 = 一块（先建边再改面）、挨着的面改了环 = 它自己的一份；劈面 / 刀：面里切出来的新边 = 新长、两半面 = 一块（刀经过的边劈成两半 = 一块）",
    ops: { splitEdge: B(["piece"], ["copy"]), splitFaceAlong: B(["grown"], ["piece"]), knife: B(["piece", "grown"], ["piece"]) }, helpers: ["knifeCheck", "ringCrossing"] },
  "subdivide.ts": { say: "细分：被劈的边两半 = 一块；读 sharp_edge 当折痕；面里新长出来的边 = 新长；细出来的面 = 原面的一块",
    ops: { catmullClark: B(["piece", "grown"], ["piece"]), subdivide: B(["piece", "grown"], ["piece"]) }, helpers: ["looseBits"] },
};

/**
 * ops 文件夹以外造元素的地方（统筹 11-13 深夜：探针列和守卫的名单扩到这几处）。allExports = 这个文件每个导出的函数都要在 ops 或 helpers 里；
 * 否则只核列出来的函数还在、还导出着。走剪贴板 / 文件的（editor/transfer.ts、mesh/mesh-doc.ts）现在不盖：等用户自己加的列进文件时一起。
 */
export const ELSEWHERE: Readonly<Record<string, OpsRow & { readonly allExports: boolean }>> = {
  "mesh/mirror.ts": { allExports: true,
    say: "镜像：沿镜像面切开 = 跨面的边劈成两半（一块）、面里切出来的新边（新长）、两半面（一块）；对称化 = 切开 + 这一边的面、边镜过去（一份，裸线位照抄）；去掉夹在镜像面上的面、对称对齐（只挪点）不造元素",
    ops: { bisectPlane: B(["piece", "grown"], ["piece"]), symmetrize: B(["piece", "copy", "grown"], ["piece", "copy"]), removeSeamWalls: NONE, snapToSymmetry: NONE },
    helpers: ["mirrorPairs", "mirrorMoves", "sideOfChange", "sideOfMoved", "sideOfElements", "pickSide", "forceSide", "withMirrorCounterparts", "mirrorTwins", "isSymmetric", "straddlingFaces", "trySymmetrize"] },
  "editor/ops.ts": { allExports: false,
    say: "并物件（炸开 / 合并进一份网格体）：源的面、边连同每一列（材质槽号、排法代号换成这边的号，别的列原样）整张搬过来 = 凭空来的、带着给的值；不挂面的线带裸线位",
    ops: { appendMesh: B(["given"], ["given"]) } },
};
