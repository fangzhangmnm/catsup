// highlight.ts —— 选中 / 悬停的面与边的高亮，算成引擎契约交给后端（Tron 第一刀 6c，v0.17.9，Claude Fable 5.1；窄接口刀 b，v0.17.18）。
//   · 面 = **标记**（契约 v2 第 ② 批 `Mark`）：哪个槽的哪个块的哪一段（池网格里一张面本来就是一段连续顶点）换成哪个材质槽（faceSelected / faceHover）画。
//     后端把那个槽的面分成两段索引（普通的 / 标记的）——不重叠、不画两遍、顶点一个字节不传（user 10-29「画原色但是踢掉选中的，然后画选中的」「index赞！」）。
//     颜色不在这里：材质槽长什么样归风格的材质表（白模 = 换成状态色、写实 = 叠色、Tron = Clu 橙 + 辉光）。
//   · 淡出（上下文之外的槽）= 整槽的 faceDim / edgeDim 标记（刀 c，v0.17.19）：整块换材质，不烤顶点色。
//   · 边：选中蓝 / 刮擦·悬停红 / 检查橙（线性色；后端用边线自己的材质画粗线）；选中的软边 / 折边不画粗线（user 10-25「选中的时候软边显示了粗线」），「检查」标的照画。
// 引擎只拿到「段 + 材质槽」和「边段 + 颜色」，不再读 WorldView（守卫 ③′ 清零）。
// 键 = 世界身份 + 版本 + 选区 / 悬停 / 刮擦 / 检查集；键没变 = 复用上一帧的结果，后端也不重建。
import type { Mark, OverlayItem, OverlayLines } from "../minccino/index.ts";
import { PALETTE, hexToLinear } from "../minccino/index.ts";
import type { EdgeId, FaceId } from "../kernel/kernel.ts";
import { ID_STRIDE, slotKey, type WorldView } from "../scene/world-view.ts";
import { perf } from "./perf-stats.ts";
import { LOOK } from "./overlay-lines.ts";

export interface HighlightState {
  readonly selectionFaces: ReadonlySet<FaceId>;
  readonly hoverFace: FaceId | null;
  readonly selectionEdges: ReadonlySet<EdgeId>;
  readonly scrubEdges: ReadonlySet<EdgeId>;
  readonly warnEdges?: ReadonlySet<EdgeId> | null;
  readonly hoverEdge: EdgeId | null;
  readonly revision?: number;
  /** 上下文之外的槽（淡出）= 整槽的 faceDim / edgeDim 标记（刀 c）。 */
  readonly dimSlots?: ReadonlySet<number> | null;
}
/** 池网格的布局（流提供者给）：某个槽里一张面（池本地 id）在哪些块的哪一段。 */
export interface MarkLayout {
  rangeOf(slot: string, fid: FaceId): readonly { readonly chunk: string; readonly start: number; readonly count: number }[];
  /** 某个槽的全部块（整槽标记用：淡出）。 */
  chunksOf(slot: string): readonly { readonly chunk: string; readonly count: number; readonly kind: "tris" | "lines" }[];
}

const worldIds = new WeakMap<object, number>();
let nextWorldId = 1;
const cache = new WeakMap<object, { key: string; items: OverlayItem[] }>();
const markCache = new WeakMap<object, { key: string; marks: Mark[] }>();

export function highlightKey(world: WorldView, v: HighlightState): string {
  let wid = worldIds.get(world);
  if (wid === undefined) { wid = nextWorldId++; worldIds.set(world, wid); }
  return `${wid}:${v.revision ?? 0}:${[...v.selectionFaces].join(",")}:${v.hoverFace ?? ""}:${[...v.selectionEdges].join(",")}:${[...v.scrubEdges].join(",")}:${v.hoverEdge ?? ""}:${v.warnEdges ? `${v.warnEdges.size}|${[...v.warnEdges].join(",")}` : ""}:${v.dimSlots ? [...v.dimSlots].join(",") : ""}`;
}

/** 这一帧的高亮叠加层（边；没选没悬停 = 空数组）；键没变就是上一帧那份。 */
export function highlightItems(world: WorldView, v: HighlightState): OverlayItem[] {
  const key = highlightKey(world, v);
  const hit = cache.get(world);
  if (hit && hit.key === key) return hit.items;
  const items = perf.time("rebuildOverlay", () => buildEdges(world, v, key));
  cache.set(world, { key, items });
  return items;
}
/** 这一帧的面标记（选中 = faceSelected、悬停 = faceHover）；键没变就是上一帧那份。拉完流之后才调（布局那时才稳定）。 */
export function highlightMarks(world: WorldView, v: HighlightState, layout: MarkLayout): Mark[] {
  const key = highlightKey(world, v);
  const hit = markCache.get(world);
  if (hit && hit.key === key) return hit.marks;
  const marks = perf.time("rebuildMarks", () => buildMarks(world, v, layout));
  markCache.set(world, { key, marks });
  return marks;
}

function buildMarks(kd: WorldView, view: HighlightState, layout: MarkLayout): Mark[] {
  const out: Mark[] = [];
  const ids = new Set<FaceId>(view.selectionFaces);
  if (view.hoverFace !== null) ids.add(view.hoverFace);
  for (const fid of ids) {
    if (!kd.face(fid)) continue;
    const si = Math.floor(fid / ID_STRIDE), s = kd.slots.find((x) => x.index === si);
    if (!s) continue;
    const slot = slotKey(s), material = view.selectionFaces.has(fid) ? "faceSelected" : "faceHover";
    for (const r of layout.rangeOf(slot, fid - si * ID_STRIDE)) out.push({ slot, chunk: r.chunk, start: r.start, count: r.count, material });
  }
  // 淡出：上下文之外的槽整槽换材质槽（面 faceDim / 边 edgeDim）
  if (view.dimSlots) for (const si of view.dimSlots) {
    const s = kd.slots.find((x) => x.index === si);
    if (!s) continue;
    const slot = slotKey(s);
    for (const c of layout.chunksOf(slot)) out.push({ slot, chunk: c.chunk, start: 0, count: c.count, material: c.kind === "lines" ? "edgeDim" : "faceDim" });
  }
  return out;
}

function buildEdges(kd: WorldView, view: HighlightState, key: string): OverlayItem[] {
  const out: OverlayItem[] = [];
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
  if (pos.length) out.push({ kind: "lines", id: "edgeSel", ...LOOK.edge, key, positions: pos, colors: col } satisfies OverlayLines);
  return out;
}
