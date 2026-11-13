// editor/last-step.ts —— 复现包「上一步」：刚提交的那条 op + 它之前的活动池 B-rep（成功但错的也能寄）。从 editor.ts 搬出来（贴图主线 1-8a 给编辑器腾行，2026-11-11 Claude Opus 5.5；算法一字没改）。
import type { History } from "./history.ts";
import type { Op } from "./ops.ts";
import type { PoolRef, Scene } from "../scene/scene.ts";
import type { BrepSnapshot } from "../kernel/kernel.ts";

/** 只记骨架（内核没动）的 op：复现包「上一步」的内核 = 现在这份。 */
const SKELETON_ONLY: ReadonlySet<string> = new Set(["setMeshMirror", "transformInstance", "placeInstance", "eraseInstance", "moveInstance", "purgeMaterials", "setLocked", "rename", "assignLayer", "addLayer", "renameLayer", "setLayerVisible", "removeLayer", "addMaterial", "addTexture", "purgeTextures", "setFreed", "setDrawFrame", "addGuide", "eraseGuides", "clearGuides", "shelfPut", "shelfTake", "shelfMove", "shelfFolderAdd", "shelfFolderRename", "shelfFolderRemove"]);

/** 没有 / 池不是 brep → null。按记录倒推，不重放指令流（v0.15.32）。 */
export function lastStepOf(history: History<unknown>, scene: Scene): { op: Op; brep: BrepSnapshot; pool: PoolRef } | null {
  const pos = history.position();
  if (pos === 0) return null;
  const op = history.log()[pos - 1];
  const pool: PoolRef = ("at" in op && op.at) ? op.at : { def: scene.root, group: null };
  try {
    if (!scene.hasPool(pool) || scene.kindOf(pool.def) !== "brep") return null;
    const k = history.beforeLastOp(pool) ?? (history.log()[pos - 1] && SKELETON_ONLY.has(op.op) ? scene.kernelOf(pool) : null);
    if (!k) return null;
    return { op, brep: k.toBrep(), pool };
  } catch { return null; }
}
