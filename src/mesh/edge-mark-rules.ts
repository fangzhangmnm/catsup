// mesh/edge-mark-rules.ts —— 每个拓扑操作给新边申报哪种来历（看得见的表；施工单二十二 A 起头，属性地基轮 3c 改成按来历）。created 2026-11-12 by Claude Opus 5.5 · edited 2026-11-13 by Claude Opus 5.5（3c）
// 3c 起边上的标记（棱 / 平滑 / 不画线 / 接缝 / 隐藏）是属性表里的五列（mesh/reserved-columns.ts），跟着来历走、不再按位手抄：
//   一份（piece：劈开的两半）/ 照抄（copy：复制、镜像、挤出的帽、倒角时挨着的边换成新边）= 全部列照抄；
//   并成（joined：溶解二度点、合并点并成同一对点）= 每一列按自己声明的 merge 并（棱、平滑、不画线、隐藏 = 都有才留；接缝 = 有一条就留）；
//   新长（grown / 不申报）= 全是缺省值。
//   来历在建边的那一刻申报（addEdge(a, b, origin) / declareRingEdges / absorbIntoEdge），不在事后补写；
//   操作本意要写的标记（倒角圆角中间标平滑、手标指令、硬表面转过来、导入、读文件）按保留名写（reserved-columns.ts setEdgeMark / edge-smooth.ts markEdges）。
// 以前的 JOIN / MOVE 两张位表、joinFlags、MOVING_MARKS 退役了（并 = 每列的 merge；搬家 = 一份就是全部列照抄）。
// 守卫 test/edge-mark-rules.test.ts：src/mesh/ops/ 每个文件在这里有一行；操作里不许按位手抄标记。

/**
 * 每个拓扑操作对边怎么申报来历（守卫：src/mesh/ops/ 里每个文件都要在这里有一行）。
 */
export const OPS: Readonly<Record<string, string>> = {
  "bevel.ts": "倒角：挨着被倒的边、自己没被倒的边换成新边 = 照抄（copy，先建边再改面）；被倒的边本身变成倒角带，标记不往带上搬（Blender 默认也不搬）；倒角带的新边 = 新长；圆角中间的线按操作本意标成平滑（markEdges smooth）",
  "build.ts": "建面 / 建几何体：新边 = 新长",
  "cleanup.ts": "整理：有限溶解里并边走 join.ts（并成）；去重点 = 所有组一次交给内核的合并点原子（见 merge.ts）",
  "delete.ts": "删：剩下的边不动；溶解二度点走 join.ts（并成）；留下的裸线设结构位（setWire）",
  "duplicate.ts": "复制（Shift+D）：面上的边和选中的边 = 照抄（copy，裸线位一起抄）；补洞 / 桥接的新边 = 新长",
  "extrude.ts": "挤出：帽上的边 = 照抄原来那条（copy，全部列，含隐藏）；新长出来的侧边 = 新长；插入（inset）的内圈不照抄 = 新长",
  "flatten.ts": "压平 / 单轴缩放：只挪点，边不变",
  "geometry.ts": "挪点 / 变换：只挪点，边不变",
  "index.ts": "出口：不碰边",
  "inset.ts": "插入：外圈的边不变，新长出来的内圈和连接边 = 新长",
  "join.ts": "溶解二度点：两条边并成一条 = 并成（joined，先建边再改面；那对点之间已经有边 = absorbIntoEdge 并进它，它排第一）；并面：被并掉的公共边没了",
  "loopcut.ts": "环切：被切的边劈成两半（走 split.ts，一份）；切出来的新环 = 新长",
  "merge.ts": "合到一点 = 内核的合并点原子（MeshKernel.mergePoints，规划在 mesh/merge-points.ts）：只换了一头的边还是那条边、列原样；几条并成同一对点 = absorbIntoEdge（留编号最小的那条、它排第一，每列按 merge 并）；环上剪下来的刺留成裸线",
  "orient.ts": "法向一致化：只翻面的绕向，边不变",
  "primitives.ts": "基本体：新边 = 新长；只有边的圆圈 / 方框设结构位（setWire）",
  "ring-edges.ts": "工具：按面环的顺序先把缺的边建好、各自申报来历（declareRingEdges），给别的操作用",
  "split.ts": "劈边：两半 = 一份（piece，先建边再改面）；劈面 / 刀在面里切出来的新边 = 新长",
  "subdivide.ts": "细分：被劈的边两半 = 一份（piece）；读 sharp_edge 当折痕；面里新长出来的边 = 新长",
};
