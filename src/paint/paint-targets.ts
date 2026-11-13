// paint/paint-targets.ts —— 一张画在世界里摆在哪几处 = 空间里的笔的名单（贴图主线 1-4b）。created 2026-11-11 by Claude Opus 5.5
// 从世界视图的槽里挑：池子是这张画铺的那个定义（网格体的根池）的每一份摆放 = 一项目标（网格体、世界变换、那一套贴图坐标、画板实际的画布、哪些面走这张画）。
// 走不走画只问 Scene.facePaint（全仓那一个问法）；画布用画板的实际宽高（统筹 11-11 裁定：画板可能比坐标大一截）。
import type { PaintTarget } from "./space-target.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { uvMesh } from "../scene/uv.ts";
import type { Scene } from "../scene/scene.ts";
import type { WorldView } from "../scene/world-view.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import type { Guid } from "../format/guid.ts";

export function paintTargets(world: WorldView, scene: Scene, texture: Guid, canvas: { readonly width: number; readonly height: number }, chain?: readonly number[]): PaintTarget[] {
  const place = paintPlaceOf(scene, texture);
  if (!place) return [];
  const out: PaintTarget[] = [];
  for (const s of world.slots) {
    if (s.pool.def !== place.def || s.pool.group !== null) continue;
    if (chain && s.chain.join(".") !== chain.join(".")) continue;   // 只认这一份摆放（画画工作台：正在编辑的那一份；1-7）
    const k = (s.kernel as { mesh?: MeshKernel }).mesh;   // 槽里的视图（预演时是影子内核）
    if (!k) continue;
    const mesh = uvMesh(k, scene.mesh(place.def).uvSetSlots);   // 施工单十八第 1½ 刀：贴图坐标只经 scene/uv.ts 的视图问（以前强转内核当目标，那时内核上有按排法分的列）
    out.push({
      id: `${texture}/${s.chain.join(".") || "root"}`, mesh, xform: s.xform, uvSet: place.uvSet.guid, pxPerM: place.uvSet.pxPerM, canvas,
      walks: (f) => scene.facePaint(place.def, k.faceMat[f])?.textureDoc.guid === texture,
    });
  }
  return out;
}
