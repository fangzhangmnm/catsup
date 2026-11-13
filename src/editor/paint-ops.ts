// editor/paint-ops.ts —— 画的三条指令（贴图主线 1-3b，施工单 ai-docs/20261110-paint-workorders-8.md 第四节）：startPaint / meshPaintFaces / meshLayoutPaint。created 2026-11-10 by Claude Opus 5.5
// 这里只改场景。拒绝 = 返回原因（ops.ts 抛 OpRejected，进提示行、场景一个字节不变）；目标没了 = 返回 { target }（ops.ts 抛 OpTargetError）。
// 场景的排法表（施工单十八：从网格体身上搬到场景这一层）只在这里加（startPaint）和换高（meshLayoutPaint）（守卫 test/paint-start-guard.test.ts）。
// 只 import 类型的 ops.ts（不在运行时互相 import）。
import type { Op } from "./ops.ts";
import { uvSetAutoPlaces, type DefId, type Scene } from "../scene/scene.ts";
import { COLOR_CHANNEL, COLOR_VALUE, paintIn } from "../format/document.ts";
import { gapForCanvas, layoutAppend, layoutFaces } from "../paint/layout.ts";
import { unplacedPaintFaces } from "../scene/paint.ts";
import { onUvSet, placeFace, unplaceFace, uvMesh } from "../scene/uv.ts";

export type PaintOutcome = null | { readonly rejected: string } | { readonly target: string };
type StartPaint = Extract<Op, { op: "startPaint" }>;
type MeshPaintFaces = Extract<Op, { op: "meshPaintFaces" }>;
type MeshLayoutPaint = Extract<Op, { op: "meshLayoutPaint" }>;

/** 换别的定义的画上来的原因（startPaint / meshPaintFaces 共用）。 */
export const OTHER_DEF_PAINT = "这张画是别的物件的：画只能换到它自己那个物件的面上";

/**
 * 给网格体的面换材质（meshPaintFaces 那一段；startPaint 第 5 步也走它）。material = 文档材质的下标；null = 回默认。先全部查完再动手（拒绝 = 什么都没改）。
 * 可以换成任何材质，包括这个定义自己的画；换成别的定义的画 = 拒绝。从画换成别的材质 = 角上的数留着不清（再换回来还是原来那一块）。
 */
function paintMeshFaces(s: Scene, def: DefId, faces: readonly number[], material: number | null): PaintOutcome {
  const d = s.defs.get(def);
  if (!d || d.body.kind !== "mesh") return { target: `definition ${def} (not a mesh)` };
  const k = d.body.kernel;
  for (const f of faces) if (!k.hasF(f)) return { target: `face ${f}` };
  if (material !== null) {
    const m = s.materials[material];
    if (!m) return { target: `material ${material}` };
    const p = paintIn(s.textures, m);
    if (p && !onUvSet(d.body.uvSetSlots, p.uvSet)) return { rejected: OTHER_DEF_PAINT };   // 这个网格体不在那张画的排法上（施工单十八第 1 刀：判法换成看列，行为照旧——放开是第 3 刀）
  }
  const slot = material === null ? -1 : s.slotFor(def, material);
  for (const f of faces) k.setFaceMat(f, slot);
  return null;
}

export function applyMeshPaintFaces(s: Scene, op: MeshPaintFaces): PaintOutcome { return paintMeshFaces(s, op.def, [...new Set(op.faces)].sort((a, c) => a - c), op.material); }

/**
 * 开始画（一步撤销）：场景的排法表加一行 + 内核加同 GUID、种类 uv 的一列 → 用 1-3a 的铺法给这些面铺上（没给密度 = 1024 见方里找放得下的最大密度，记进这一行）
 * → 贴图表加一行（分层的、没有字节、value = 颜色、layout = { uvSet }：挂在这套排法上；施工单十八 3.3）→ 材质表加一个（颜色那一槽指着它）→ 这些面换成它（paintMeshFaces）。
 * 拒绝（什么都不改）：不是网格体；一张活着的面都没有；三个 GUID 里有已经存在的；铺不下（1-3a 的原因）。
 */
export function applyStartPaint(s: Scene, op: StartPaint): PaintOutcome {
  const d = s.defs.get(op.def);
  if (!d) return { target: `definition ${op.def}` };
  if (d.body.kind !== "mesh") return { rejected: "开始画只能用在网格体上（硬表面的面不能画：先把它转成网格体）" };
  const b = d.body, k = b.kernel, faces = [...new Set(op.faces)].filter((f) => k.hasF(f)).sort((a, c) => a - c);
  if (!faces.length) return { rejected: "开始画：这些面一张都不在了，没有可画的面" };
  const uvTaken = s.uvSets.has(op.uvSet) || onUvSet(b.uvSetSlots, op.uvSet);
  const taken = [uvTaken ? `贴图坐标 ${op.uvSet}` : "", s.textures.has(op.textureGuid) ? `贴图 ${op.textureGuid}` : "", s.materials.some((m) => m.guid === op.materialGuid) ? `材质 ${op.materialGuid}` : ""].filter(Boolean);
  if (taken.length) return { rejected: `开始画：这些身份已经有了（${taken.join("、")}），换新的再来` };
  // 没给密度 = 画布 canvas 见方里找最大密度（缺 = 1024）；留的格数跟着画布走（1024 = 4，和以前一样）；铺法缺 = 一张面一块（施工单十五：缺的时候和以前逐位相同）
  // 按一格多大开（fit = density，施工单十六第四节）：画布取接近正方形、够用的最小宽高（留的格数跟着挑出来的宽）；别的照旧
  const base = op.canvas ?? 1024, gap = gapForCanvas(base), style = op.arrange === "patches" ? "patches" as const : "faces" as const, byDensity = op.fit === "density" && op.density !== undefined;
  const r = layoutFaces(k, faces, byDensity ? { density: op.density, style, squarish: true } : op.density !== undefined ? { density: op.density, gap, style } : { base, gap, style });
  if (!r.ok) return { rejected: `开始画：铺不下——${r.reason}` };
  // 查完了，动手
  for (const [f, v] of r.values) placeFace(k, b.uvSetSlots, f, op.uvSet, v);   // 唯一的写口（scene/uv.ts）；面原来在别的套上 = 盖掉（动作那一层数出来、说一句）
  s.uvSets.set(op.uvSet, Object.freeze({ guid: op.uvSet, name: op.names.uvSet, width: r.width, height: r.height, pxPerM: r.density, fit: byDensity ? "density" : "size" }));
  s.addTexture({ guid: op.textureGuid, name: op.names.paint, value: COLOR_VALUE, content: { kind: "layered", ora: null }, layout: { uvSet: op.uvSet } });
  const mi = s.addMaterial({ guid: op.materialGuid, name: op.names.material, color: [op.color[0], op.color[1], op.color[2]], channels: { [COLOR_CHANNEL]: [op.textureGuid] } });
  const why = paintMeshFaces(s, op.def, faces, mi);
  if (why) throw new Error(`startPaint: assigning the new painting failed after the checks passed (${JSON.stringify(why)})`);   // 走不到：面都活着、画就是这个定义的
  return null;
}

/**
 * 给走画但还没有位置的面补一块（1-3a 的「给新面补一块」，partial）：这个网格体上每一套被画用着的贴图坐标，找出走这张画、角上还没有值的面
 * （faces = 只看这些，收尾时 = 改动日志给的这一步动过的面；不给 = 全部），铺上；已经铺好的角一个数都不变。画布不够：按一格多大开的（fit = density）往下加高（256 的倍数），那一行换成新的高；
 * 按总大小开的（缺 fit，施工单十六第四节）不长大，放不下的面先没有位置（照底色）。
 * 加到上限（4096）还放不下：不拒绝、不抛，放得下的照铺，放不下的面留着没有值（收尾那一步数出来、明着说）。同样的网格体 = 同样的结果（面按编号的先后铺）。
 */
export function applyMeshLayoutPaint(s: Scene, op: MeshLayoutPaint): PaintOutcome {
  const d = s.defs.get(op.def);
  if (!d || d.body.kind !== "mesh") return { target: `definition ${op.def} (not a mesh)` };
  const b = d.body, k = b.kernel;
  for (const f of op.drop ?? []) if (k.hasF(f)) unplaceFace(k, b.uvSetSlots, f);   // 收尾读内核报告：并面时贴图坐标对不上的，先拿掉
  const pending = unplacedPaintFaces(s, op.def, op.faces ?? null);
  for (const g of [...pending.keys()].sort()) {
    const row = s.uvSets.get(g)!;
    if (!uvSetAutoPlaces(row)) continue;   // fit 不认识 / 行里带着不认识的 freed：这套排法什么都不自动动（施工单十八 3.1）
    const r = layoutAppend(uvMesh(k, b.uvSetSlots), g, [], pending.get(g)!, { width: row.width, height: row.height }, row.pxPerM, { partial: true, gap: gapForCanvas(row.width), grow: row.fit === "density" });   // 补面也按那张画布的宽留格（施工单十五第四节）；按总大小开的画布不长大（施工单十六第四节）
    if (!r.ok) continue;   // partial 不会走到这里（放不下的进 unplaced）
    for (const [f, v] of r.values) placeFace(k, b.uvSetSlots, f, g, v);
    if (r.height !== row.height) s.uvSets.set(g, Object.freeze({ ...row, height: r.height }));
  }
  return null;
}
