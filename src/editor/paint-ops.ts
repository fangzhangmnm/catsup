// editor/paint-ops.ts —— 画的三条指令（贴图主线 1-3b，施工单 ai-docs/20261110-paint-workorders-8.md 第四节）：startPaint / meshPaintFaces / meshLayoutPaint。created 2026-11-10 by Claude Opus 5.5
// 这里只改场景。拒绝 = 返回原因（ops.ts 抛 OpRejected，进提示行、场景一个字节不变）；目标没了 = 返回 { target }（ops.ts 抛 OpTargetError）。
// 网格体的 uvSets 只在这里加（startPaint）和换高（meshLayoutPaint）（守卫 test/paint-start-guard.test.ts）。
// 只 import 类型的 ops.ts（不在运行时互相 import）。
import type { Op } from "./ops.ts";
import type { DefId, Scene } from "../scene/scene.ts";
import { COLOR_CHANNEL, COLOR_VALUE, paintIn } from "../format/document.ts";
import { layoutAppend, layoutFaces } from "../paint/layout.ts";
import { unplacedPaintFaces } from "../scene/paint.ts";

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
    if (p && p.definition !== d.guid) return { rejected: OTHER_DEF_PAINT };
  }
  const slot = material === null ? -1 : s.slotFor(def, material);
  for (const f of faces) k.setFaceMat(f, slot);
  return null;
}

export function applyMeshPaintFaces(s: Scene, op: MeshPaintFaces): PaintOutcome { return paintMeshFaces(s, op.def, [...new Set(op.faces)].sort((a, c) => a - c), op.material); }

/**
 * 开始画（一步撤销）：uvSets 加一行 + 内核加同 GUID 的一列 → 用 1-3a 的铺法给这些面铺上（没给密度 = 1024 见方里找放得下的最大密度，记进这一行）
 * → 贴图表加一行（分层的、没有字节、value = 颜色、layout 指着这个定义和这一套）→ 材质表加一个（颜色那一槽指着它）→ 这些面换成它（paintMeshFaces）。
 * 拒绝（什么都不改）：不是网格体；一张活着的面都没有；三个 GUID 里有已经存在的；铺不下（1-3a 的原因）。
 */
export function applyStartPaint(s: Scene, op: StartPaint): PaintOutcome {
  const d = s.defs.get(op.def);
  if (!d) return { target: `definition ${op.def}` };
  if (d.body.kind !== "mesh") return { rejected: "开始画只能用在网格体上（硬表面的面不能画：先把它转成网格体）" };
  const b = d.body, k = b.kernel, faces = [...new Set(op.faces)].filter((f) => k.hasF(f)).sort((a, c) => a - c);
  if (!faces.length) return { rejected: "开始画：这些面一张都不在了，没有可画的面" };
  const uvTaken = [...s.defs.values()].some((x) => x.body.kind === "mesh" && x.body.uvSets.has(op.uvSet)) || k.columnDefs().some((c) => c.guid === op.uvSet);
  const taken = [uvTaken ? `贴图坐标 ${op.uvSet}` : "", s.textures.has(op.textureGuid) ? `贴图 ${op.textureGuid}` : "", s.materials.some((m) => m.guid === op.materialGuid) ? `材质 ${op.materialGuid}` : ""].filter(Boolean);
  if (taken.length) return { rejected: `开始画：这些身份已经有了（${taken.join("、")}），换新的再来` };
  const r = layoutFaces(k, faces, op.density !== undefined ? { density: op.density } : { base: op.canvas ?? 1024 });   // 没给密度 = 画布 canvas 见方里找最大密度（缺 = 1024）
  if (!r.ok) return { rejected: `开始画：铺不下——${r.reason}` };
  // 查完了，动手
  k.addColumn({ guid: op.uvSet, arity: 2 });
  for (const [f, v] of r.values) k.setFaceValues(f, op.uvSet, v);
  b.uvSets.set(op.uvSet, Object.freeze({ guid: op.uvSet, name: op.names.uvSet, width: r.width, height: r.height, pxPerM: r.density }));
  s.addTexture({ guid: op.textureGuid, name: op.names.paint, value: COLOR_VALUE, content: { kind: "layered", ora: null }, layout: { definition: d.guid, uvSet: op.uvSet } });
  const mi = s.addMaterial({ guid: op.materialGuid, name: op.names.material, color: [op.color[0], op.color[1], op.color[2]], channels: { [COLOR_CHANNEL]: [op.textureGuid] } });
  const why = paintMeshFaces(s, op.def, faces, mi);
  if (why) throw new Error(`startPaint: assigning the new painting failed after the checks passed (${JSON.stringify(why)})`);   // 走不到：面都活着、画就是这个定义的
  return null;
}

/**
 * 给走画但还没有位置的面补一块（1-3a 的「给新面补一块」，partial）：这个网格体上每一套被画用着的贴图坐标，找出走这张画、角上还没有值的面
 * （faces = 只看这些，收尾时 = 改动日志给的这一步动过的面；不给 = 全部），铺上；已经铺好的角一个数都不变。画布不够就往下加高（256 的倍数），那一行换成新的高。
 * 加到上限（4096）还放不下：不拒绝、不抛，放得下的照铺，放不下的面留着没有值（收尾那一步数出来、明着说）。同样的网格体 = 同样的结果（面按编号的先后铺）。
 */
export function applyMeshLayoutPaint(s: Scene, op: MeshLayoutPaint): PaintOutcome {
  const d = s.defs.get(op.def);
  if (!d || d.body.kind !== "mesh") return { target: `definition ${op.def} (not a mesh)` };
  const b = d.body, k = b.kernel, pending = unplacedPaintFaces(s, op.def, op.faces ?? null);
  for (const g of [...pending.keys()].sort()) {
    const row = b.uvSets.get(g)!, r = layoutAppend(k, g, [], pending.get(g)!, { width: row.width, height: row.height }, row.pxPerM, { partial: true });
    if (!r.ok) continue;   // partial 不会走到这里（放不下的进 unplaced）
    for (const [f, v] of r.values) k.setFaceValues(f, g, v);
    if (r.height !== row.height) b.uvSets.set(g, Object.freeze({ ...row, height: r.height }));
  }
  return null;
}
