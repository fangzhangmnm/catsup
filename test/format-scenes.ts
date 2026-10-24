// golden 场景（格式测试与冻结样本共用；改这里 = 改语料，须同步重冻结并说明）。created 2026-09-20 by Claude Fable 5.1
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { circleSegmentsOnPlane, rectSegments } from "../src/editor/tools.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { GROUND } from "../src/editor/pick.ts";
import { translation } from "../src/scene/xform.ts";

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
/** 圆柱（0.10 曲线与曲面纪元）：圆 = circle 曲线，推拉后顶圈 = 新曲线、侧棱软；v4 语料的曲线样本。 */
export function sceneCylinder(): Kernel {
  const k = new Kernel();
  const Z = { x: 0, y: 0, z: 1 }, X = { x: 1, y: 0, z: 0 }, Y = { x: 0, y: 1, z: 0 };
  const segs = circleSegmentsOnPlane({ n: Z, d: 0 }, { u: X, v: Y }, P(1, 1), P(2, 1), 12);
  k.addEdges(segs, { curve: { kind: "circle", closed: true, params: { center: P(1, 1), radius: 1, normal: Z, xaxis: X, segments: 12 } } });
  k.pushPull(k.faces()[0].id, 1.5);
  return k;
}
export const SCENES: Record<string, () => Kernel> = { box: sceneBox, holed: sceneHoledOpen, house: sceneHouse, cylinder: sceneCylinder };

// ---- v2（2026-10-21，group / component 纪元）：场景级 golden ----
const rootK = (s: Scene): Kernel => s.kernelOf({ def: s.root, group: null });
/** 盒子 + 顶面建组（四墙留根池）+ 一个圆柱组件放两份。 */
export function sceneGrouped(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  const k = rootK(s);
  const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!;
  s = applyOp(s, { op: "makeGroup", at: { def: s.root, group: null }, faces: [faceKey(k, top.id)], edges: [] }).scene;
  // 圆柱：地上画圆 → 推拉 → 建组件 → 再放一份
  const k2 = rootK(s);
  const segs = circleSegmentsOnPlane(GROUND.plane, GROUND.basis, P(4, 1, 0), P(4.5, 1, 0), 12);
  s = applyOp(s, { op: "addEdges", at: { def: s.root, group: null }, segs, curve: true }).scene;
  const disk = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.every((p) => p.z === 0 && p.x >= 3.4))!;
  s = applyOp(s, { op: "pushpull", at: { def: s.root, group: null }, face: faceKey(k2, disk.id), dist: 1 }).scene;
  const k3 = rootK(s);
  const cyl = k3.faces().filter((f) => k3.faceRings3(f.id)!.outer.every((p) => p.x >= 3.4));
  const cylEdges = k3.edges().filter((e) => k3.graph.pt(e.a).x >= 3.4 && k3.graph.pt(e.b).x >= 3.4);
  s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: cyl.map((f) => faceKey(k3, f.id)), edges: cylEdges.map((e) => edgeKey(k3, e.id)), name: "cylinder" }).scene;
  const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: translation({ x: 2, y: 3, z: 0 }) }).scene;
  return s;
}
/** 2×2 PNG（红 / 绿 / 蓝 / 白，zlib stored 块），当贴图样本：不依赖任何编码库。 */
export const TINY_PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 25, 73, 68, 65, 84, 120, 1, 1, 14, 0, 241, 255, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 255, 36, 151, 5, 253, 45, 31, 36, 196, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
/** 盒子 + 顶面涂「赭石」色、一面墙贴 2×2 贴图、顶面建组件再放一份（槽号跨 definition）。 */
export function scenePainted(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  s = applyOp(s, { op: "addMaterial", name: "赭石", color: [0x86 / 255, 0x26 / 255, 0x17 / 255] }).scene;
  s = applyOp(s, { op: "addMaterial", name: "格子", color: [1, 1, 1], texture: { mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.5, 0.5] } }).scene;
  const k = rootK(s);
  const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!;
  const wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
  s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: [faceKey(k, top.id)], material: 0 }).scene;
  s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: [faceKey(k, wall.id)], material: 1 }).scene;
  const k2 = rootK(s);
  const top2 = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!;
  s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: [faceKey(k2, top2.id)], edges: [], name: "lid" }).scene;
  const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: translation({ x: 0, y: 0, z: 1 }) }).scene;
  return s;
}
export const SCENE_DOCS: Record<string, () => Scene> = { grouped: sceneGrouped, painted: scenePainted };
/** 场景指纹：每个池的指纹 + group / instance 结构。 */
export function sceneFingerprint(s: Scene): string {
  const parts: string[] = [];
  const label = (id: number): string => (id === s.root ? "(root)" : s.def(id).name);   // 根 definition 的名字 = 文档名（保存时改写），不进指纹
  for (const [i, m] of s.materials.entries()) parts.push(`mat ${i} ${m.name} ${m.color.map((c) => c.toFixed(4)).join(",")}${m.texture ? ` tex ${m.texture.mimeType} ${m.texture.bytes.length}B ${m.texture.sizeM.join("x")}` : ""}`);
  for (const d of [...s.defs.values()].sort((a, b) => label(a.id).localeCompare(label(b.id)))) {
    parts.push(`def ${label(d.id)} slots=${d.materialSlots.join(",")}: ${fingerprint(d.kernel)} mats=${d.kernel.faces().map((f) => d.kernel.faceMaterialOf(f.id) ?? -1).sort().join(",")}`);
    for (const g of d.groups.values()) parts.push(`  group parent=${g.parent} axes=${[g.axes.origin.x, g.axes.origin.y, g.axes.origin.z].join(",")}: ${fingerprint(g.kernel)}`);
    for (const i of d.instances.values()) parts.push(`  inst ${label(i.def)} parent=${i.parent} m=${i.xform.map((v) => Math.round(v * 1e6) / 1e6).join(",")}`);
  }
  return parts.join("\n");
}
/** 拓扑 + 几何指纹（与 id 无关）。 */
export function fingerprint(k: Kernel): string {
  const key = (p: Pt3): string => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)},${Math.round(p.z * 1e6)}`;
  const edges = k.edges().map((e) => [key(k.graph.pt(e.a)), key(k.graph.pt(e.b))].sort().join("~")).sort();
  const faces = k.faces().map((f) => { const r = k.faceRings3(f.id)!; return [r.outer, ...r.holes].map((ring) => ring.map(key).sort().join(";")).join("|"); }).sort();
  return `${k.vertices().length}/${edges.join(" ")}/${faces.join(" ")}`;
}
