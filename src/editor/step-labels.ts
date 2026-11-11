// editor/step-labels.ts —— 一步的标签：op → 撤销 / 重做时提示行说的中文动词（从 editor.ts 搬出来：行数棘轮让本体别长；created 2026-11-10 by Claude Opus 5.5，W-7）。
// 显式给了 step() 标签的用那个；没登记的 op 用它的名字（开放集）。2026-11-10 补 addTexture / purgeTextures（贴图主线 1-0½ 漏的：第一次涂图那一步的标签以前会是英文指令名）。
import type { Op } from "./ops.ts";
import type { StepLabel } from "./history.ts";

/** op → 一步的默认标签（中文动词；显式给了 step() 标签的用那个）。开放集：没登记的用 op 名。 */
export const OP_TITLES: Readonly<Record<string, string>> = {
  addEdges: "画线", eraseEdges: "擦边", eraseFaces: "擦面", eraseSelection: "删除", move: "移动", pushpull: "推拉", followme: "跟随", absorb: "合并", weldEdges: "焊接", dissolveVertices: "溶解点",
  explodeCurves: "炸开曲线", setEdgeLayers: "软化 / 硬化", paintFaces: "上色", flipFaceSides: "翻面", plugin: "修复", mirror: "镜像", setHidden: "隐藏 / 显示", unhideAll: "全部显示", transformInstance: "移动物件", placeInstance: "放置",
  eraseInstance: "删除物件", moveInstance: "挪物件", purgeDefs: "清理组件", purgeMaterials: "清理材质", eraseGroup: "删除组", setLocked: "锁定 / 解锁", assignLayer: "分层", addLayer: "加层", renameLayer: "改层名", setLayerVisible: "层显隐", removeLayer: "删层", addMaterial: "加材质", addTexture: "加贴图", purgeTextures: "清理贴图",
  setAxes: "改原点", setDrawFrame: "坐标架", castDefinition: "转换身体", addGuide: "参考线", eraseGuides: "删参考线", clearGuides: "清参考线", makeGroup: "建组", makeComponent: "建组件", explode: "炸开",
  shelfPut: "放上素材架", shelfTake: "从素材架取下", shelfMove: "挪素材", shelfFolderAdd: "建素材文件夹", shelfFolderRename: "改素材文件夹名", shelfFolderRemove: "删素材文件夹", copyGroup: "复制", transformPool: "移动组", applyScale: "应用缩放", importScene: "导入", batch: "一步", clear: "清空", preset: "预置",
  meshEdgeMarks: "标边", meshSmoothDefault: "默认平滑", meshBevel: "倒角", meshBevelVerts: "倒角", meshSymmetrize: "对称", setMeshMirror: "镜像设置", meshSymmetrySnap: "对称对齐", meshSubdivide: "细分", meshMerge: "合并", meshMove: "移动", meshExtrude: "挤出", meshKnife: "切割", meshLoopCut: "环切", meshDelete: "删除", meshInset: "插入", meshAddPrimitive: "新建",
};
/** 画的一步（贴图主线 1-8a：一笔 = 三维的一步，没有指令、只有成分记录）。 */
export const PAINT_STEP_LABELS = { stroke: { title: "画一笔" }, erase: { title: "擦一笔" } } as const satisfies Record<string, StepLabel>;
export function opLabel(op: Op): StepLabel { return { title: OP_TITLES[op.op] ?? op.op }; }
export function labelText(l: StepLabel | undefined): string { return l ? (l.count ? `${l.title}（${l.count}）` : l.title) : "一步"; }
