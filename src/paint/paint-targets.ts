// paint/paint-targets.ts —— 一张画在世界里摆在哪几处 = 空间里的笔的名单（贴图主线 1-4b）。created 2026-11-11 by Claude Opus 5.5
// 从世界视图的槽里挑：池子是这张画铺的那个定义（网格体的根池）的每一份摆放 = 一项目标（网格体、世界变换、那一套贴图坐标、画板实际的画布、哪些面走这张画）。
// 走不走画只问 Scene.facePaint（全仓那一个问法）；画布用画板的实际宽高（统筹 11-11 裁定：画板可能比坐标大一截）。
import type { PaintTarget, TargetMesh } from "./space-target.ts";
import type { Scene } from "../scene/scene.ts";
import type { WorldView } from "../scene/world-view.ts";
import { paintPlaceOf } from "../scene/paint.ts";
import type { Guid } from "../format/guid.ts";

export function paintTargets(world: WorldView, scene: Scene, texture: Guid, canvas: { readonly width: number; readonly height: number }): PaintTarget[] {
  const place = paintPlaceOf(scene, texture);
  if (!place) return [];
  const out: PaintTarget[] = [];
  for (const s of world.slots) {
    if (s.pool.def !== place.def || s.pool.group !== null) continue;
    const mesh = (s.kernel as unknown as { mesh?: TargetMesh & { faceMat: ArrayLike<number> } }).mesh;
    if (!mesh) continue;
    out.push({
      id: `${texture}/${s.chain.join(".") || "root"}`, mesh, xform: s.xform, uvSet: place.uvSet.guid, pxPerM: place.uvSet.pxPerM, canvas,
      walks: (f) => scene.facePaint(place.def, mesh.faceMat[f])?.textureDoc.guid === texture,
    });
  }
  return out;
}
