// golden 场景（格式测试与冻结样本共用；改这里 = 改语料，须同步重冻结并说明）。created 2026-09-20 by Claude Fable 5.1
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { circleSegmentsOnPlane, rectSegments } from "../src/editor/tools.ts";
import { Scene } from "../src/scene/scene.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { BUILTIN_BACK_SLOT } from "../src/scene/builtin-materials.ts";
import { F_SOFT, F_SMOOTH, FF_HIDDEN } from "../src/mesh/mesh-kernel.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { GROUND } from "../src/editor/pick.ts";
import { translation } from "../src/scene/xform.ts";
import { newDocument, type CatsupDocument } from "../src/format/index.ts";
import { mintGuid } from "../src/format/guid.ts";
import { paintBytesSum } from "../src/format/document.ts";

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
/** DT87 折线（brep 4.2，2026-10-26 Claude Opus 5.5）：一块不平的四边形 = 两张三角形，对角线是折线（两块算一个面）。 */
export function sceneFolded(): Kernel {
  const k = new Kernel();
  const A = { x: 0, y: 0, z: 0 }, B = { x: 1, y: 0, z: 0 }, C = { x: 1, y: 1, z: 0.25 }, D = { x: 0, y: 1, z: 0 };
  k.addEdges([[A, B], [B, C], [C, D], [D, A], [A, C]]);
  const diag = k.edges().find((e) => { const p = k.graph.pt(e.a), q = k.graph.pt(e.b); return (p.x + q.x === 1) && (p.y + q.y === 1) && p.x !== q.x; })!;
  k.setEdgeLayer("fold", [diag.id], true);
  return k;
}
export const SCENES: Record<string, () => Kernel> = { box: sceneBox, holed: sceneHoledOpen, house: sceneHouse, cylinder: sceneCylinder, folded: sceneFolded };

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
  const tex = mintGuid();   // 贴图是贴图表里的一行（2026-11-10 贴图主线 1-0½），材质用 channels 指它
  s = applyOp(s, { op: "addTexture", guid: tex, name: "格子", mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.5, 0.5] }).scene;
  s = applyOp(s, { op: "addMaterial", name: "格子", color: [1, 1, 1], channels: { color: [tex] } }).scene;
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
/** 尺规纪元（0.11）：参考线 / 参考点（根池 + group 里各一份）+ 绘图轴搬到 (1,2,0) 转 45°。 */
export function sceneGuided(): Scene {
  let s = sceneGrouped();
  s = applyOp(s, { op: "addGuide", at: { def: s.root, group: null }, line: { p: { x: 0.5, y: 0, z: 0 }, dir: { x: 0, y: 1, z: 0 } } }).scene;
  s = applyOp(s, { op: "addGuide", at: { def: s.root, group: null }, point: { x: 1.5, y: 2.5, z: 0 } }).scene;
  const gid = [...s.brep(s.root).groups.keys()][0];
  if (gid !== undefined) s = applyOp(s, { op: "addGuide", at: { def: s.root, group: gid }, line: { p: { x: 0, y: 0, z: 1.5 }, dir: { x: 1, y: 0, z: 0 } } }).scene;
  const c = Math.SQRT1_2;
  s = applyOp(s, { op: "setDrawFrame", at: { def: s.root, group: null }, frame: { origin: { x: 1, y: 2, z: 0 }, x: { x: c, y: c, z: 0 }, y: { x: -c, y: c, z: 0 }, z: { x: 0, y: 0, z: 1 } } }).scene;   // 搬最外层的绘图轴（2026-10-30 起 setAxes 落在根上 = 换根的原点、挪内容；搬轴归 setDrawFrame，样本语义不变）
  return s;
}
/** 隐藏（DT49，definitions 6.1）：grouped + 藏一面墙、一条边、第二份圆柱（实例 hidden + 面层 / 边层 hidden）。 */
export function sceneHidden(): Scene {
  let s = sceneGrouped();
  const R = { def: s.root, group: null }, k = rootK(s);
  const wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
  const edge = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return a.z === 0 && b.z === 0 && a.y > 0 && b.y > 0 && a.x < 3 && b.x < 3; })!;   // 盒子底面后沿
  s = applyOp(s, { op: "setHidden", at: R, faces: [faceKey(k, wall.id)], edges: [edgeKey(k, edge.id)], on: true }).scene;
  const second = [...s.def(s.root).instances.values()][1];
  s = applyOp(s, { op: "setHidden", at: R, instance: second.id, on: true }).scene;
  return s;
}
/** DT86 坐标架（definitions 6.2，2026-10-26 Claude Opus 5.5）：组件里另摆一个斜的坐标架（组件原点不动）。 */
export function sceneDrawFramed(): Scene {
  let s = sceneGrouped();
  const inst = [...s.def(s.root).instances.values()][0];
  const c = Math.cos(0.3), sn = Math.sin(0.3);
  s = applyOp(s, { op: "setDrawFrame", at: { def: inst.def, group: null }, frame: { origin: { x: 0.25, y: 0.5, z: 0 }, x: { x: c, y: 0, z: sn }, y: { x: 0, y: 1, z: 0 }, z: { x: -sn, y: 0, z: c } } }).scene;
  return s;
}
/** DT8 两个表面（brep 4.1，2026-10-26）：顶面正面赭石、背面蓝；墙只涂了背面。 */
export function sceneTwoSided(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  s = applyOp(s, { op: "addMaterial", name: "赭石", color: [0x86 / 255, 0x26 / 255, 0x17 / 255] }).scene;
  s = applyOp(s, { op: "addMaterial", name: "蓝", color: [0.2, 0.3, 0.8] }).scene;
  const k = rootK(s);
  const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!;
  const wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
  const at = { def: s.root, group: null };
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, top.id)], material: 0, sides: [0] }).scene;
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, top.id)], material: 1, sides: [1] }).scene;
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, wall.id)], material: 1, sides: [1] }).scene;
  // 顶面做成组件、再放一份（组件里两个表面跟着走）
  const k2 = rootK(s);
  const top2 = k2.faces().find((f) => k2.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!;
  s = applyOp(s, { op: "makeComponent", at, faces: [faceKey(k2, top2.id)], edges: [], name: "lid" }).scene;
  const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at, definition: defId, xform: translation({ x: 0, y: 0, z: 1 }) }).scene;
  return s;
}
/** 圆规 / 球规（definitions 6.3，DT50，2026-10-26 Claude Opus 5.5）：根上一个参考圆（斜的）+ 组里一个参考球。 */
export function sceneCompassed(): Scene {
  let s = sceneGrouped();
  s = applyOp(s, { op: "addGuide", at: { def: s.root, group: null }, circle: { c: { x: 1, y: 1, z: 0.5 }, n: { x: 0, y: 0.6, z: 0.8 }, r: 0.75 } }).scene;
  const gid = [...s.brep(s.root).groups.keys()][0];
  if (gid !== undefined) s = applyOp(s, { op: "addGuide", at: { def: s.root, group: gid }, sphere: { c: { x: 0.5, y: 0.5, z: 1 }, r: 1.25 } }).scene;
  return s;
}
/** 这个定义的封闭壳每张面朝里那侧涂默认背面（用工具画出来的盒子本来就长这样；老文件没有）。转网格体 = 朝外的单层。 */
export function oneSided(s: Scene, def: number): void {
  const k = s.brep(def).kernel, slot = s.slotFor(def, BUILTIN_BACK_SLOT), vs = k.vertices();
  const c = { x: vs.reduce((a, v) => a + v.x, 0) / vs.length, y: vs.reduce((a, v) => a + v.y, 0) / vs.length, z: vs.reduce((a, v) => a + v.z, 0) / vs.length };
  for (const f of k.faces()) { const n = k.planeOf(f.id)!.plane.n, p = k.faceRings3(f.id)!.outer[0]; k.setFaceMaterial([f.id], slot, [n.x * (p.x - c.x) + n.y * (p.y - c.y) + n.z * (p.z - c.z) > 0 ? 1 : 0]); }
}
/** 网格体（CATSUP_mesh 1.0.0，2026-10-27 M3，Claude Fable 5.1）：根 brep 盒 + 一个由 brep 盒转成的 mesh 定义（6 张四边形），带一条软 + 平滑边、一张隐藏面、一张涂了材质的面。 */
export function sceneMeshed(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  s = applyOp(s, { op: "addMaterial", name: "蓝", color: [0.2, 0.3, 0.8] }).scene;
  const d = s.mintDef("网格盒", sceneBox(1, 1));
  oneSided(s, d.id);
  const body = brepToMesh(s.brep(d.id)), m = body.kernel;
  m.setEdgeFlags(m.edgeOf(0, 1), F_SOFT | F_SMOOTH); m.setFaceFlags(m.faces()[1], FF_HIDDEN, true); m.setFaceMat(m.faces()[2], 0); body.materialSlots = [0];
  d.body = body;
  s.mintInstance(s.root, null, d.id, translation({ x: 3, y: 0, z: 0 }));
  return s;
}
/** 单面 / 双面第四版（2026-11-04）：盒子里面涂内置默认背面（槽表引用内置 GUID）；一张面两侧不同真材质、一张面两侧都是默认背面（导出整张不出）。 */
export function sceneSided(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  oneSided(s, s.root);
  s = applyOp(s, { op: "addMaterial", name: "红", color: [0.8, 0.2, 0.2] }).scene;
  s = applyOp(s, { op: "addMaterial", name: "蓝", color: [0.2, 0.3, 0.8] }).scene;
  const k = rootK(s), at = { def: s.root, group: null };
  const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1.5))!, wall = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.y === 0))!;
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, top.id)], material: 0, sides: [0] }).scene;
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, top.id)], material: 1, sides: [1] }).scene;
  s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, wall.id)], material: BUILTIN_BACK_SLOT }).scene;
  const d = s.mintDef("单面盒", sceneBox(1, 1)); oneSided(s, d.id);   // 组件里的默认背面跟着定义走
  s.mintInstance(s.root, null, d.id, translation({ x: 3, y: 0, z: 0 }));
  return s;
}
/** 贴图表（CATSUP_textures 1.0，2026-11-10）：两个材质共用一张图各涂一面 + 一张没人用的孤儿图 + 一张分层的画（这一版只带着）。 */
export function sceneSharedTextures(): Scene {
  let s = new Scene(sceneBox(1, 1));
  const shared = mintGuid(), orphan = mintGuid();
  s = applyOp(s, { op: "addTexture", guid: shared, name: "共用", mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.5, 0.25] }).scene;
  s = applyOp(s, { op: "addTexture", guid: orphan, name: "孤儿", mimeType: "image/png", bytes: TINY_PNG.slice(), sizeM: [2, 2] }).scene;
  s.addTexture({ guid: mintGuid(), name: "分层", value: { kind: "color" }, content: { kind: "layered", ora: new Uint8Array([80, 75, 3, 4, 20, 0]) }, sizeM: [1, 1] });
  s = applyOp(s, { op: "addMaterial", name: "甲", color: [1, 1, 1], channels: { color: [shared] } }).scene;
  s = applyOp(s, { op: "addMaterial", name: "乙", color: [0.8, 0.7, 0.6], channels: { color: [shared] } }).scene;
  const k = rootK(s), [f0, f1] = k.faces();
  s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: [faceKey(k, f0.id)], material: 0 }).scene;
  s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: [faceKey(k, f1.id)], material: 1 }).scene;
  const k2 = rootK(s), g1 = k2.faces().find((f) => f.id !== k2.faces()[0].id && k2.faceMaterialOf(f.id, 0) !== null)!;   // 涂了「乙」的那张面
  s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: [faceKey(k2, g1.id)], edges: [], name: "乙面" }).scene;   // 贴图跨定义用到（槽表在组件里）
  const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: translation({ x: 2, y: 0, z: 0 }) }).scene;
  return s;
}
/** 一张真的两层 ORA（1024 × 256；「底」64 × 32 浅色、「线」32 × 4 半透明深色）：画画内核 encodeDocToOra 编一次、存成常量（冻样本要逐字稳定，现编会带 zip 时间戳）。贴图主线 1-2½。 */
export const ORA_TWO_LAYERS_1024x256 = Uint8Array.from(atob("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"), (c) => c.charCodeAt(0));
/** 上面那张两层的画合成在底色 [0.9, 0.85, 0.7] 上的合成图（PNG，不透明；贴图主线 1-8b 的 textures 1.1 合成图键）。用真的内核生成：解开 → 画板 → 合成 → 读回 → PNG（2026-11-11 Catsup小弟，作业临时目录的脚本）。 */
export const COMPOSITE_TWO_LAYERS_PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAABAAAAAEAAgMAAABQS+y3AAAACVBMVEXmyKDm2bNiV0ipNofxAAACA0lEQVR4nO3UMRGAQAADQUxiEpU0VAj4LXKnILNFrn/3WAEEEEAAAQSwDvB8BRBAAJsA8ycYQAABBBBAAAEEEEAAAQSgB50ugAACCCCAaQA9QBeAHqALQA/QBaAH6ALQA3QB6AG6APQAXQB6gC4APUAXgB6gC0AP0AWgB+gC0AN0AegBugD0AF0AeoAuAD1AF4AeoAtAD9AFoAfoAtADdAHoAboA9ABdAHqALgA9QBeAHqALQA/QBaAH6ALQA3QB6AG6APQAXQB6gC4APUAXgB6gC0AP0AWgB+gC0AN0AegBugD0AF0AeoAuAD1AF4AeoAtAD9AFoAfoAtADdAHoAboA9ABdAHqALgA9QBeAHqALQA/QBaAH6ALQA3QB6AG6APQAXQB6gC4APUAXgB6gC0AP0AWgB+gC0AN0AegBugD0AF0AeoAuAD1AF4AeoAtAD9AFoAfoAtADdAHoAboA9ABdAHqALgA9QBeAHqALQA/QBaAH6ALQA3QB6AG6APQAXQB6gC4APUAXgB6gC0AP0AWgB+gC0AN0AegBugD0AF0AeoAuAD1AF4AeoAtAD9AFoAfoAtADdAHoAboA9ABdAHqALgA9QBeAHqALQA/QBaAH6ALQA3QB6AG6APQAXQB6gC4APUAXgB6gC0AP0AWgB+gC0AN0AegBugD0AF0AeoBuHuAFxH1wLZ2z1LgAAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
/** 画板比贴图坐标高的画：1024 × 512 两层（第 0 行一小块、第 300–339 行一条蓝的 = 下面多出来的行有内容，存盘不砍）；同上用真的内核编。 */
export const ORA_TALL_1024x512 = Uint8Array.from(atob("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"), (c) => c.charCodeAt(0));
/** 上面那张高的画合成在底色 [0.9, 0.85, 0.7] 上的合成图（1024 × 512）。 */
export const COMPOSITE_TALL_PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAABAAAAAIAAgMAAABho/YqAAAACVBMVEXmyKDm2bMoWsiMLXKKAAAD3ElEQVR4nO3QMQqAQBAEQT/pJ32luXCBIFfgdqeTDHU8O4cVQAABBBBAAAEEEEAAAQQQQAABBBCAPrS7AAIIIIAAAggggAACCCCAmQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAEsl+t1+15/WADLJYAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIA/AwwpAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3QB6AO6APQBXQD6gC4AfUAXgD6gC0Af0AWgD+gC0Ad0AegDugD0AV0A+oAuAH1AF4A+oAtAH9AFoA/oAtAHdAHoA7oA9AFdAPqALgB9QBeAPqALQB/QBaAP6ALQB3TjAW7StfgWlXp7jwAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
/** 盒子转网格体（世界 3..4），对 6 张面开始画；画的字节换成上面那张两层的 ORA（这一版格式层不解释它，画布正好 = 那一套的宽高）。 */
function paintedMesh(s0: Scene, faces: (all: number[]) => number[]): { s: Scene; def: number; uv: string; tex: string; mat: string } {
  let s = s0;
  const d = s.mintDef("画盒", sceneBox(1, 1)); d.body = brepToMesh(s.brep(d.id));
  s.mintInstance(s.root, null, d.id, translation({ x: 3, y: 0, z: 0 }));
  const uv = mintGuid(), tex = mintGuid(), mat = mintGuid(), k = s.mesh(d.id).kernel;
  s = applyOp(s, { op: "startPaint", def: d.id, faces: faces(k.faces()), uvSet: uv, textureGuid: tex, materialGuid: mat, names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.9, 0.85, 0.7], density: 16 }).scene;
  s.addTexture({ ...s.textures.get(tex)!, content: { kind: "layered", ora: ORA_TWO_LAYERS_1024x256 } });
  return { s, def: d.id, uv, tex, mat };
}
/** 带贴图坐标的网格体（CATSUP_mesh 2.0；贴图主线 1-2½，契约第六节）：一套贴图坐标 + 一张两层的颜色贴图。 */
export function sceneUvPainted(): Scene { return paintedMesh(new Scene(sceneBox(2, 1.5)), (all) => all).s; }
/** 同上，画带着存盘时另存的合成图（textures 1.1，贴图主线 1-8b）。 */
export function sceneUvPaintedComposite(): Scene {
  const p = paintedMesh(new Scene(sceneBox(2, 1.5)), (all) => all), row = p.s.textures.get(p.tex)!;
  p.s.addTexture({ ...row, composite: { png: COMPOSITE_TWO_LAYERS_PNG, of: { bytes: ORA_TWO_LAYERS_1024x256.length, sum: paintBytesSum(ORA_TWO_LAYERS_1024x256) }, base: [0.9, 0.85, 0.7] } });
  return p.s;
}
/** 画板比那一套贴图坐标高（1024 × 512 对 1024 × 256）、多出来的行有内容（贴图主线 1-8b 第五节：存盘不砍），带合成图。 */
export function sceneUvPaintedTall(): Scene {
  const p = paintedMesh(new Scene(sceneBox(2, 1.5)), (all) => all), row = p.s.textures.get(p.tex)!;
  p.s.addTexture({ ...row, content: { kind: "layered", ora: ORA_TALL_1024x512 }, composite: { png: COMPOSITE_TALL_PNG, of: { bytes: ORA_TALL_1024x512.length, sum: paintBytesSum(ORA_TALL_1024x512) }, base: [0.9, 0.85, 0.7] } });
  return p.s;
}
/** 两套贴图坐标、其中一套没有贴图引用（契约第六节：孤儿读得进、写得回）：前三张面开始画（A），其余的面再开始画（B）；其余的面换成一个普通材质，B 的材质和贴图清掉
 *  ——B 那一套留着、面上的数还在（契约「面从画的材质换成别的材质：它在画布上的那一块留着不清」）。 */
export function sceneUvTwoSets(): Scene {
  const a = paintedMesh(new Scene(sceneBox(2, 1.5)), (all) => all.slice(0, 3));
  let s = a.s;
  const k = s.mesh(a.def).kernel, rest = k.faces().slice(3), uvB = mintGuid(), texB = mintGuid(), matB = mintGuid();
  s = applyOp(s, { op: "startPaint", def: a.def, faces: rest, uvSet: uvB, textureGuid: texB, materialGuid: matB, names: { uvSet: "UV 2", paint: "画 2", material: "画 2" }, color: [0.5, 0.6, 0.9], density: 16 }).scene;
  s = applyOp(s, { op: "addMaterial", name: "灰", color: [0.6, 0.6, 0.6] }).scene;
  s = applyOp(s, { op: "meshPaintFaces", def: a.def, faces: rest, material: s.materials.length - 1 }).scene;
  s = applyOp(s, { op: "purgeMaterials", materials: [s.materials.findIndex((m) => m.guid === matB)] }).scene;
  s = applyOp(s, { op: "purgeTextures", textures: [texB] }).scene;
  return s;
}
export const SCENE_DOCS: Record<string, () => Scene> = { uvPaintedComposite: sceneUvPaintedComposite, uvPaintedTall: sceneUvPaintedTall, uvPainted: sceneUvPainted, uvTwoSets: sceneUvTwoSets, sharedTextures: sceneSharedTextures, sided: sceneSided, grouped: sceneGrouped, painted: scenePainted, guided: sceneGuided, hidden: sceneHidden, twoSided: sceneTwoSided, drawFramed: sceneDrawFramed, compassed: sceneCompassed , meshed: sceneMeshed };
/** 参考窗牌组（CATSUP_references 1.0 + desk 1.1 refPanel；2026-10-25 Opus）：清单字节 = @internal/reference-window 0.5.0 encodeDeck 的真实输出
 *  （一张图、一张文字、一张只放内存的视频——后者只在清单里记大小、没有字节），窗开着。format 层不懂清单：这里只钉「目录原样进出」。 */
export const REF_MANIFEST = '{"version":1,"minor":1,"patch":0,"index":1,"items":[{"kind":"image","src":".catsup/references/r0.png","vp":null,"name":"格子.png"},{"kind":"text","src":".catsup/references/r1.txt","vp":null,"name":"尺寸"},{"kind":"video","vp":null,"name":"walk.webm","mime":"video/webm","ram":{"bytes":10}}]}';
export function docReferenced(): CatsupDocument {
  const doc = newDocument(sceneBox().toBrep(), "referenced");
  const enc = (t: string): Uint8Array => new TextEncoder().encode(t);
  doc.references = { files: [
    { path: ".catsup/references/manifest.json", mimeType: "application/json", bytes: enc(REF_MANIFEST) },
    { path: ".catsup/references/r0.png", mimeType: "image/png", bytes: TINY_PNG },
    { path: ".catsup/references/r1.txt", mimeType: "text/plain", bytes: enc("门高 2.1 m") },
  ], extra: {} };
  doc.desk.refPanel = { open: true, left: 400, top: 60, width: 320, height: 240 };
  doc.desk.style = "pixelOutline"; doc.desk.screen = "pixel2";   // desk 1.3：风格 / 屏幕跟文件走
  return doc;
}
/** 整份文档级的样本（场景之外还带文档 / 桌面态内容的）：冻结样本脚本与语料测试共用。 */
/** 吸附细分 1/20（CATSUP_document 3.2 起 2 / 20 / 50 / 100 也能存）。 */
export function docSnap20(): CatsupDocument { const doc = newDocument(sceneBox().toBrep(), "snap20"); doc.settings = { ...doc.settings, gridSubdiv: 20, gridStep: 1, snapIncrement: 0.05 }; return doc; }
export const DOC_SAMPLES: Record<string, () => CatsupDocument> = { referenced: docReferenced, snap20: docSnap20 };
/** 场景指纹：每个池的指纹 + group / instance 结构。 */
export function sceneFingerprint(s: Scene): string {
  const parts: string[] = [];
  const label = (id: number): string => (id === s.root ? "(root)" : s.def(id).name);   // 根 definition 的名字 = 文档名（保存时改写），不进指纹
  for (const [i, m] of s.materials.entries()) parts.push(`mat ${i} ${m.name} ${m.color.map((c) => c.toFixed(4)).join(",")}${(() => { const t = s.colorMapOf(m); return t ? ` tex ${t.content.mimeType} ${t.content.bytes.length}B ${t.sizeM.join("x")}` : ""; })()}`);
  parts.push(`texture-table ${s.textures.size}`);   // 贴图表几行（GUID 不进指纹：老样本读进来现铸）
  const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;
  const f3 = (p: Pt3): string => `${r6(p.x)},${r6(p.y)},${r6(p.z)}`;
  const guidesFp = (g: { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[]; circles?: { id: number; c: Pt3; n: Pt3; r: number }[]; spheres?: { id: number; c: Pt3; r: number }[] }): string =>
    (g.lines.length || g.points.length || g.circles?.length || g.spheres?.length) ? ` guides=[${g.lines.map((l) => `L${l.id}:${f3(l.p)}>${f3(l.dir)}`).join(" ")} ${g.points.map((q) => `P${q.id}:${f3(q.p)}`).join(" ")}${(g.circles ?? []).map((c) => ` C${c.id}:${f3(c.c)}^${f3(c.n)}r${c.r.toFixed(6)}`).join("")}${(g.spheres ?? []).map((x) => ` S${x.id}:${f3(x.c)}r${x.r.toFixed(6)}`).join("")}]` : "";
  parts.push(`axes ${f3(s.axes.origin)} | ${f3(s.axes.x)} | ${f3(s.axes.y)} | ${f3(s.axes.z)}`);
  for (const d of [...s.defs.values()].sort((a, b) => label(a.id).localeCompare(label(b.id)))) {
    if (d.body.kind === "mesh") {
      const m = d.body.kernel, rows = d.body.uvSets, raw = m.toSnapshot();   // 贴图坐标（1-2½）：列的身份号是现铸的，不进指纹，换成那一套的名字；每套的宽高密度另记
      const snap = raw.columns ? { ...raw, columns: raw.columns.map((c) => ({ ...c, guid: `uv:${rows.get(c.guid)?.name ?? "?"}` })) } : raw;
      const uv = [...rows.values()].map((u) => `${u.name} ${u.width}x${u.height}@${u.pxPerM}`).sort().join(" | ");
      parts.push(`def ${label(d.id)} kind=mesh slots=${d.body.materialSlots.join(",")}${uv ? ` uvSets=${uv}` : ""}: ${JSON.stringify(snap)} faceFlags=${m.faces().map((f) => m.faceFlags[f]).join(",")}`); for (const i of d.instances.values()) parts.push(`  inst ${label(i.def)} parent=${i.parent} m=${i.xform.map((v) => Math.round(v * 1e6) / 1e6).join(",")}`); continue; }
    const b = s.brep(d.id);
    parts.push(`def ${label(d.id)} slots=${b.materialSlots.join(",")}: ${fingerprint(b.kernel)} mats=${b.kernel.faces().map((f) => `${b.kernel.faceMaterialOf(f.id) ?? -1}/${b.kernel.faceMaterialOf(f.id, 1) ?? -1}`).sort().join(",")}${guidesFp(b.guides)}${b.drawFrame ? ` drawFrame=${f3(b.drawFrame.origin)}|${f3(b.drawFrame.x)}|${f3(b.drawFrame.y)}|${f3(b.drawFrame.z)}` : ""}`);
    for (const g of b.groups.values()) parts.push(`  group parent=${g.parent} axes=${[g.axes.origin.x, g.axes.origin.y, g.axes.origin.z].join(",")}: ${fingerprint(g.kernel)}${guidesFp(g.guides)}`);
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


/**
 * 把一份本版文件的 JSON 改回 definitions 6.4 的形状（测试用；2026-11-04 Claude Opus 5.5）：root / 实例的 definition / 组和实例的 parent 换回下标和整数 id，去掉 guid。
 * 冻结语料里 6.x 的样本都是干净的；老 bug 留下的重复（同 id 写两次）得靠这个造。mutate = 改回去之后、编码之前再动一下 JSON。
 */
export function downgradeDefinitionsToV6(json: Record<string, unknown>, mutate?: (defs: { root: number; list: Record<string, any>[] }) => void): void {
  const ext = (json.extensions as Record<string, any>).CATSUP_definitions, list = ext.list as Record<string, any>[];
  const defIdx = new Map<string, number>(list.map((d, i) => [d.guid as string, i]));
  const matIdx = new Map<string, number>(((json.materials ?? []) as Record<string, any>[]).map((m, i) => [m.extensions.CATSUP_material.guid as string, i]));
  for (const m of (json.materials ?? []) as Record<string, any>[]) delete m.extensions.CATSUP_material.guid;
  ext.version = 6; ext.minor = 4; ext.root = defIdx.get(ext.root);
  for (const d of list) {
    const gid = new Map<string, number>((d.groups as Record<string, any>[]).map((g, i) => [g.guid as string, i + 1]));
    d.groups = (d.groups as Record<string, any>[]).map((g, i) => { const { guid: _g, ...r } = g; void _g; return { ...r, id: i + 1, parent: g.parent ? gid.get(g.parent) ?? null : null }; });
    d.instances = (d.instances as Record<string, any>[]).map((n, i) => { const { guid: _g, ...r } = n; void _g; return { ...r, id: i + 1, definition: defIdx.get(n.definition), parent: n.parent ? gid.get(n.parent) ?? null : null }; });
    d.materialSlots = (d.materialSlots as (string | null)[]).map((g) => (g ? matIdx.get(g) ?? -1 : -1));
    delete d.guid;
  }
  mutate?.(ext);
}
