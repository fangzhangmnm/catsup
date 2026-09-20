// golden 场景（格式测试与冻结样本共用；改这里 = 改语料，须同步重冻结并说明）。created 2026-09-20 by Claude Fable 5.1
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { rectSegments } from "../src/editor/tools.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
function loop(k: Kernel, pts: Pt3[]): void {
  const segs: [Pt3, Pt3][] = [];
  for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  k.addEdges(segs);
}
export function sceneBox(S = 2, H = 1.5): Kernel {
  const k = new Kernel();
  loop(k, [P(0, 0), P(S, 0), P(S, S), P(0, S)]);
  loop(k, [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)]);
  loop(k, [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)]);
  loop(k, [P(S, S), P(0, S), P(0, S, H), P(S, S, H)]);
  loop(k, [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]);
  return k;
}
/** 带洞地面 + 擦掉的顶面（「闭环无面」状态）。 */
export function sceneHoledOpen(): Kernel {
  const k = sceneBox(4, 2);
  const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 2))!;
  k.eraseFaces([top.id]);
  k.addEdges(rectSegments({ x: 1, y: 1 }, { x: 2, y: 2 }));
  const island = k.faces().find((f) => f.holes.length === 0 && k.faceRings3(f.id)!.outer.every((p) => p.z === 0 && p.x >= 1 && p.x <= 2))!;
  k.eraseFaces([island.id]);
  return k;
}
/** 小房子：盒子 + 顶面分脊抬起（山墙五边形），非轴对齐斜面。 */
export function sceneHouse(): Kernel {
  const k = sceneBox(3, 2);
  k.addEdges([[P(1.5, 0, 2), P(1.5, 3, 2)]]);                                  // 顶面分一刀（脊线）
  const ridge = k.vertices().filter((v) => v.x === 1.5 && v.z === 2);
  k.moveVertices(ridge.map((v) => ({ id: v.id, to: P(v.x, v.y, 3) })));         // 抬脊 → 两坡 + 山墙五边形
  return k;
}
export const SCENES: Record<string, () => Kernel> = { box: sceneBox, holed: sceneHoledOpen, house: sceneHouse };
/** 拓扑 + 几何指纹（与 id 无关）。 */
export function fingerprint(k: Kernel): string {
  const key = (p: Pt3): string => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)},${Math.round(p.z * 1e6)}`;
  const edges = k.edges().map((e) => [key(k.graph.pt(e.a)), key(k.graph.pt(e.b))].sort().join("~")).sort();
  const faces = k.faces().map((f) => { const r = k.faceRings3(f.id)!; return [r.outer, ...r.holes].map((ring) => ring.map(key).sort().join(";")).join("|"); }).sort();
  return `${k.vertices().length}/${edges.join(" ")}/${faces.join(" ")}`;
}
