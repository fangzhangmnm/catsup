// mesh-edits/drop-paint.ts —— 「把画拿掉」（第 1 版第五节第 2 条：物体窗口「材质和贴图」页的出口；user 11-13「如果有drop贴图我也能逃生」；created 2026-11-13 by Claude Opus 5.5）。
// 这个物体身上走画的面整批换回默认材质（现成的 meshPaintFaces，material = null），一步撤销。画本身（贴图表那一行、它的材质、那一套贴图坐标）留在文件里，
// 没人用了 = 资源页能清；不在这里删（删贴图全家只有 purgeTextures 一处）。〔小弟定的，交统筹过目〕换回的是默认材质，不是画底下原来的颜色：画的材质本来就是
// 「开始画」时新铸的，没有「原来那个」可回；要颜色 = 拿掉之后油漆桶再涂。
import { faceMaterial } from "../../mesh/reserved-columns.ts";
import type { Command, MeshUnit } from "../commands/command.ts";
import type { Scene } from "../../scene/scene.ts";

/** 这个物体上走画的面（不看选区：物件级）。 */
export function paintedFaces(s: Scene, def: number): number[] {
  const body = s.def(def).body;
  if (body.kind !== "mesh") return [];
  const k = body.kernel;
  return k.faces().filter((f) => s.facePaint(def, faceMaterial(k, f)) !== null);
}

export const dropPaint: Command<MeshUnit> = {
  id: "mesh.dropPaint", unit: "mesh", title: "把画拿掉",
  defaults: () => ({}), params: () => [],
  quickCount: (env, u) => paintedFaces(env.scene, u.def).length,
  plan(env, u) {
    const faces = paintedFaces(env.scene, u.def);
    return faces.length ? { ops: [{ op: "meshPaintFaces", def: u.def, faces, material: null }], count: faces.length } : { ops: [], count: 0 };
  },
  done: (n) => `把画拿掉了：${n} 张面换回默认材质（画还在文件里，没人用了，资源页能清；撤销一下就回来）`,
  none: "把画拿掉：这个物体上没有画",
};
