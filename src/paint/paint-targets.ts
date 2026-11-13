// paint/paint-targets.ts —— 一张画在世界里摆在哪几处 = 空间里的笔的名单（贴图主线 1-4b）。created 2026-11-11 by Claude Opus 5.5
// 从世界视图的槽里挑：池子是这张画画在上面的定义（网格体的根池；施工单十八第 2 刀 b 起可以有好几个 = paintDefsOf）的每一份摆放 = 一项目标（网格体、世界变换、那一套贴图坐标、画板实际的画布、哪些面走这张画、同一套排法上别的物件的面）。
// 走不走画只问 Scene.facePaint（全仓那一个问法）；画布用画板的实际宽高（统筹 11-11 裁定：画板可能比坐标大一截）。
import { faceMaterial } from "../mesh/reserved-columns.ts";
import type { PaintTarget } from "./space-target.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { uvMesh } from "../scene/uv.ts";
import type { Scene } from "../scene/scene.ts";
import type { WorldView } from "../scene/world-view.ts";
import { paintDefsOf, paintPlaceOf } from "../scene/paint.ts";
import { occupancyKey, uvSetOccupancy } from "./uvset-occupancy.ts";
import type { Guid } from "../format/guid.ts";

export function paintTargets(world: WorldView, scene: Scene, texture: Guid, canvas: { readonly width: number; readonly height: number }, chain?: readonly number[]): PaintTarget[] {
  const place = paintPlaceOf(scene, texture);
  if (!place) return [];
  const g = place.uvSet.guid, defs = new Set(paintDefsOf(scene, texture)), out: PaintTarget[] = [];   // 画在哪几个物件上（施工单十八第 2 刀 b：一张画可以在好几个物件上）
  for (const s of world.slots) {
    const def = s.pool.def;
    if (!defs.has(def) || s.pool.group !== null) continue;
    if (chain && s.chain.join(".") !== chain.join(".")) continue;   // 只认这一份摆放（画画工作台：正在编辑的那一份；1-7）
    const k = (s.kernel as { mesh?: MeshKernel }).mesh;   // 槽里的视图（预演时是影子内核）
    if (!k) continue;
    const mesh = uvMesh(k, scene.mesh(def).uvSetSlots);   // 施工单十八第 1½ 刀：贴图坐标只经 scene/uv.ts 的视图问（以前强转内核当目标，那时内核上有按排法分的列）
    out.push({
      id: `${texture}/${s.chain.join(".") || "root"}`, mesh, xform: s.xform, uvSet: g, pxPerM: place.uvSet.pxPerM, canvas,
      walks: (f) => scene.facePaint(def, faceMaterial(k, f))?.textureDoc.guid === texture,
      others: { key: occupancyKey(scene, g, def), rings: () => uvSetOccupancy(scene, g).filter((e) => e.def !== def).flatMap((e) => e.rings) },   // 别的物件的面：参加每格归谁，这一笔碰不到
    });
  }
  return out;
}
