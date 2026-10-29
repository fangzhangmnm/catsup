// highlight.ts —— 选中 / 悬停的面与边的高亮，算成叠加层交给引擎（Tron 第一刀 6c，v0.17.9，Claude Fable 5.1）。从 render3 rebuildOverlay 原样搬出：
//   · 面（不带贴图、找得到槽）：**和面本身同一组三角**（pool-mesh buildFaceRec：同样的 Float32 坐标，池本地）+ 颜色 = 状态色和材质色对半 → 后端在那个槽的
//     节点下、同材质同深度偏移、画在面之后 = 深度逐位相同、后画的赢 = 换颜色，没有 z-fighting（user 10-27「高亮感觉还有时候有z fighting……就那么难嘛」）。
//   · 带贴图的面（少见）/ 找不到槽的：世界坐标那张（faceTriangles），贴图组带 uv。
//   · 边：选中蓝 / 刮擦·悬停红 / 检查橙（线性色；后端用边线自己的材质画粗线）；选中的软边 / 折边不画粗线（user 10-25「选中的时候软边显示了粗线」），「检查」标的照画。
// 引擎只拿到「哪个槽的哪些三角 + 颜色 / 贴图组 / 边段」，不再读 WorldView（守卫 ③′ 清零）。
// 键 = 世界身份 + 版本 + 选区 / 悬停 / 刮擦 / 检查集（和以前 render3 的 overlayKey 同构）；键没变 = 复用上一帧的 items，后端也不重建几何。
import type { OverlayFaces, OverlayItem, OverlayLines } from "../minccino/index.ts";
import { PALETTE, hexToLinear } from "../minccino/index.ts";
import type { EdgeId, FaceId } from "../kernel/kernel.ts";
import type { Material } from "../scene/scene.ts";
import { ID_STRIDE, slotKey, type WorldView } from "../scene/world-view.ts";
import { dot3 } from "../kernel/geom.ts";
import { buildFaceRec } from "./pool-mesh.ts";
import { faceTriangles } from "./face-triangles.ts";
import { perf } from "./perf-stats.ts";

export interface HighlightState {
  readonly selectionFaces: ReadonlySet<FaceId>;
  readonly hoverFace: FaceId | null;
  readonly selectionEdges: ReadonlySet<EdgeId>;
  readonly scrubEdges: ReadonlySet<EdgeId>;
  readonly warnEdges?: ReadonlySet<EdgeId> | null;
  readonly hoverEdge: EdgeId | null;
  readonly revision?: number;
}

/** 0xRRGGBB → sRGB 浮点三元（膜 shader 直接出，不过 three 的色彩管理）。 */
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

const worldIds = new WeakMap<object, number>();
let nextWorldId = 1;
const cache = new WeakMap<object, { key: string; items: OverlayItem[] }>();

export function highlightKey(world: WorldView, v: HighlightState): string {
  let wid = worldIds.get(world);
  if (wid === undefined) { wid = nextWorldId++; worldIds.set(world, wid); }
  return `${wid}:${v.revision ?? 0}:${[...v.selectionFaces].join(",")}:${v.hoverFace ?? ""}:${[...v.selectionEdges].join(",")}:${[...v.scrubEdges].join(",")}:${v.hoverEdge ?? ""}:${v.warnEdges ? `${v.warnEdges.size}|${[...v.warnEdges].slice(0, 16).join(",")}` : ""}`;
}

/** 这一帧的高亮叠加层（没选没悬停 = 空数组）；键没变就是上一帧那份。 */
export function highlightItems(world: WorldView, v: HighlightState): OverlayItem[] {
  const key = highlightKey(world, v);
  const hit = cache.get(world);
  if (hit && hit.key === key) return hit.items;
  const items = perf.time("rebuildOverlay", () => buildHighlight(world, v, key));
  cache.set(world, { key, items });
  return items;
}

type Acc = { pos: number[]; nor: number[]; col: number[]; uv: number[] };
function buildHighlight(kd: WorldView, view: HighlightState, key: string): OverlayItem[] {
  const out: OverlayItem[] = [];
  const ids = new Set<FaceId>(view.selectionFaces);
  if (view.hoverFace !== null) ids.add(view.hoverFace);
  const groups = new Map<Material | null, Acc>();
  const bySlot = new Map<number, { slot: string; pos: number[]; nor: number[]; col: number[] }>();
  for (const fid of ids) {
    const f = kd.face(fid), rec = kd.planeOf(fid);
    if (!f || !rec) continue;
    const mat = kd.faceMaterial(fid);
    if (!mat?.texture) {   // 同节点、同三角、后画
      const si = Math.floor(fid / ID_STRIDE), s = kd.slots.find((x) => x.index === si);
      if (s) {
        const r0 = buildFaceRec(s.kernel, fid - si * ID_STRIDE, (slot) => kd.scene.materialOfSlot(s.pool.def, slot));
        if (r0) {
          let [r, g, b] = srgb(view.selectionFaces.has(fid) ? PALETTE.faceSelected : PALETTE.faceHover);
          if (mat) { const [mr, mg, mb] = mat.color; r = (r + mr) / 2; g = (g + mg) / 2; b = (b + mb) / 2; }
          let acc = bySlot.get(si);
          if (!acc) { acc = { slot: slotKey(s), pos: [], nor: [], col: [] }; bySlot.set(si, acc); }
          for (let i = 0; i < r0.pos.length; i++) { acc.pos.push(r0.pos[i]); acc.nor.push(r0.nor[i]); }
          for (let i = 0; i < r0.pos.length / 3; i++) acc.col.push(r, g, b);
          continue;
        }
      }
    }
    let [r, g, b] = srgb(view.selectionFaces.has(fid) ? PALETTE.faceSelected : PALETTE.faceHover);
    if (mat && !mat.texture) { const [mr, mg, mb] = mat.color; r = (r + mr) / 2; g = (g + mg) / 2; b = (b + mb) / 2; }
    const gk = mat?.texture ? mat : null;
    let grp = groups.get(gk);
    if (!grp) { grp = { pos: [], nor: [], col: [], uv: [] }; groups.set(gk, grp); }
    const n = rec.plane.n;
    const texW = mat?.texture?.sizeM[0] ?? 1, texH = mat?.texture?.sizeM[1] ?? 1;
    for (const tri of faceTriangles(kd, fid)) for (const p of tri) {
      grp.pos.push(p.x, p.y, p.z); grp.nor.push(n.x, n.y, n.z); grp.col.push(r, g, b);
      if (gk) grp.uv.push(dot3(p, rec.basis.u) / texW, dot3(p, rec.basis.v) / texH);
    }
  }
  for (const acc of bySlot.values()) out.push({ kind: "faces", id: `sel:${acc.slot}`, key, slot: acc.slot, positions: acc.pos, normals: acc.nor, colors: acc.col } satisfies OverlayFaces);
  const plain = groups.get(null);
  if (plain && plain.pos.length) out.push({ kind: "faces", id: "selWorld", key, slot: null, positions: plain.pos, normals: plain.nor, colors: plain.col } satisfies OverlayFaces);
  let ti = 0;
  for (const [gk, grp] of groups) if (gk !== null) out.push({ kind: "faces", id: `selTex${ti++}`, key, slot: null, material: gk, positions: grp.pos, normals: grp.nor, colors: grp.col, uvs: grp.uv } satisfies OverlayFaces);
  // 边：选中 / 刮擦 / 悬停 / 检查 → 粗线（后端边线自己的材质；X 光下不被面挡）
  const pos: number[] = [], col: number[] = [];
  const eids = new Set<EdgeId>([...view.selectionEdges, ...view.scrubEdges, ...(view.warnEdges ?? [])]);
  if (view.hoverEdge !== null) eids.add(view.hoverEdge);
  for (const id of eids) {
    if (!kd.graph.hasEdge(id)) continue;
    const e = kd.graph.edge(id);
    const hot = view.scrubEdges.has(id) || view.hoverEdge === id, warn = !hot && !!view.warnEdges?.has(id);
    if ((kd.isSoft(id) || kd.isFold(id)) && !hot && !warn) continue;
    const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
    const [cr, cg, cb] = hexToLinear(hot ? PALETTE.edgeHot : warn ? PALETTE.edgeWarn : PALETTE.edgeSelected);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(cr, cg, cb, cr, cg, cb);
  }
  if (pos.length) out.push({ kind: "lines", id: "edgeSel", style: "edge", key, positions: pos, colors: col } satisfies OverlayLines);
  return out;
}
