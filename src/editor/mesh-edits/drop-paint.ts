// mesh-edits/drop-paint.ts —— 「把画拿掉」（第 1 版第五节第 2 条：物体窗口「材质和贴图」页的出口；user 11-13「如果有drop贴图我也能逃生」；created 2026-11-13 by Claude Opus 5.5）。
// 这个物体退出它身上的画（指令 meshDropPaint，editor/paint-ops.ts）：面换回默认材质、交出在那套排法上的位置、速查表和没人用的画材质槽拿掉，一步撤销（统筹 11-13 第五节 2½：
// 要真能逃生——拿掉之后转硬表面、炸开、建组件不再被画拦）。画本身（贴图表那一行、它的材质、排法表那一行）留在文件里当孤儿，资源页能清；不在这里删（删贴图全家只有 purgeTextures 一处）。〔小弟定的，交统筹过目〕换回的是默认材质，不是画底下原来的颜色：画的材质本来就是
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
    return faces.length ? { ops: [{ op: "meshDropPaint", def: u.def }], count: faces.length } : { ops: [], count: 0 };
  },
  done: (n) => `把画拿掉了：${n} 张面换回默认材质，这个物体不在这张画上了。画留在文件里（资源页能清），要回来只能撤销`,   // 统筹 11-13 定的话
  none: "把画拿掉：这个物体上没有画",
};
