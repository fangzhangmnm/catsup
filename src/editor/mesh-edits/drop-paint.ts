// mesh-edits/drop-paint.ts —— 「把画拿掉」（第 1 版第五节第 2 条：物体窗口「材质和贴图」页的出口；user 11-13「如果有drop贴图我也能逃生」；created 2026-11-13 by Claude Opus 5.5）。
// 只换材质（第五节 2½ 第三稿，user 11-13 夜「原则上现在不用丢 UV」）：这个物体身上走画的面整批换回默认材质（现成的 meshPaintFaces，material = null），一步撤销。
// 贴图坐标（角上的数、面上的代号、速查表）一样不动；画（贴图表那一行）、它的材质、排法表那一行都留在文件里（删贴图全家只有 purgeTextures 一处）。
// 逃生靠的是那道拦只问「有没有面在显示画」（scene/paint.ts paintMoveBlocked）：拿掉之后这个物体能转、能炸开、能分出去；带不过去的（转硬表面丢角上的数）在那一步的询问里报。
// 〔小弟定的，交统筹过目〕换回的是默认材质，不是画底下原来的颜色：画的材质本来就是「开始画」时新铸的，没有「原来那个」可回。
// 提示行不说「涂回去就回来」：指令层把画的材质涂回这些面确实原样回来（test/drop-paint.test.ts），但界面上选不到它——材质面板只列图片贴图，画的材质吸色得到的是纯颜色，
// 「把这几张面加进来」只认还有面显示着的画。所以只说「还在文件里」（第三稿第 5 条）。
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
  done: (n) => `把画拿掉了：${n} 张面换回默认材质。画和贴图坐标都还在文件里`,   // 第五节 2½ 第三稿第 5 条（后半句核过不成立，见头注释）
  none: "把画拿掉：这个物体上没有画",
};
