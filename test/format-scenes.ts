// golden 场景（格式测试与冻结样本共用；改这里 = 改语料，须同步重冻结并说明）。created 2026-09-20 by Claude Fable 5.1
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { circleSegmentsOnPlane, rectSegments } from "../src/editor/tools.ts";
import { Scene } from "../src/scene/scene.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { F_SOFT, F_SMOOTH, FF_HIDDEN } from "../src/mesh/mesh-kernel.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { GROUND } from "../src/editor/pick.ts";
import { translation } from "../src/scene/xform.ts";
import { newDocument, type CatsupDocument } from "../src/format/index.ts";

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
/** 网格体（CATSUP_mesh 1.0.0，2026-10-27 M3，Claude Fable 5.1）：根 brep 盒 + 一个由 brep 盒转成的 mesh 定义（6 张四边形），带一条软 + 平滑边、一张隐藏面、一张涂了材质的面。 */
export function sceneMeshed(): Scene {
  let s = new Scene(sceneBox(2, 1.5));
  s = applyOp(s, { op: "addMaterial", name: "蓝", color: [0.2, 0.3, 0.8] }).scene;
  const d = s.mintDef("网格盒", sceneBox(1, 1));
  const body = brepToMesh(s.brep(d.id)), m = body.kernel;
  m.setEdgeFlags(m.edges()[0], F_SOFT | F_SMOOTH); m.setFaceFlags(m.faces()[1], FF_HIDDEN, true); m.setFaceMat(m.faces()[2], 0); body.materialSlots = [0];
  d.body = body;
  s.mintInstance(s.root, null, d.id, translation({ x: 3, y: 0, z: 0 }));
  return s;
}
export const SCENE_DOCS: Record<string, () => Scene> = { grouped: sceneGrouped, painted: scenePainted, guided: sceneGuided, hidden: sceneHidden, twoSided: sceneTwoSided, drawFramed: sceneDrawFramed, compassed: sceneCompassed , meshed: sceneMeshed };
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
  for (const [i, m] of s.materials.entries()) parts.push(`mat ${i} ${m.name} ${m.color.map((c) => c.toFixed(4)).join(",")}${m.texture ? ` tex ${m.texture.mimeType} ${m.texture.bytes.length}B ${m.texture.sizeM.join("x")}` : ""}`);
  const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;
  const f3 = (p: Pt3): string => `${r6(p.x)},${r6(p.y)},${r6(p.z)}`;
  const guidesFp = (g: { lines: { id: number; p: Pt3; dir: Pt3 }[]; points: { id: number; p: Pt3 }[]; circles?: { id: number; c: Pt3; n: Pt3; r: number }[]; spheres?: { id: number; c: Pt3; r: number }[] }): string =>
    (g.lines.length || g.points.length || g.circles?.length || g.spheres?.length) ? ` guides=[${g.lines.map((l) => `L${l.id}:${f3(l.p)}>${f3(l.dir)}`).join(" ")} ${g.points.map((q) => `P${q.id}:${f3(q.p)}`).join(" ")}${(g.circles ?? []).map((c) => ` C${c.id}:${f3(c.c)}^${f3(c.n)}r${c.r.toFixed(6)}`).join("")}${(g.spheres ?? []).map((x) => ` S${x.id}:${f3(x.c)}r${x.r.toFixed(6)}`).join("")}]` : "";
  parts.push(`axes ${f3(s.axes.origin)} | ${f3(s.axes.x)} | ${f3(s.axes.y)} | ${f3(s.axes.z)}`);
  for (const d of [...s.defs.values()].sort((a, b) => label(a.id).localeCompare(label(b.id)))) {
    if (d.body.kind === "mesh") { const m = d.body.kernel, snap = m.toSnapshot(); parts.push(`def ${label(d.id)} kind=mesh slots=${d.body.materialSlots.join(",")}: ${JSON.stringify(snap)} faceFlags=${m.faces().map((f) => m.faceFlags[f]).join(",")}`); for (const i of d.instances.values()) parts.push(`  inst ${label(i.def)} parent=${i.parent} m=${i.xform.map((v) => Math.round(v * 1e6) / 1e6).join(",")}`); continue; }
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
