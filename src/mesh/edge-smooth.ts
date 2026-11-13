// mesh/edge-smooth.ts —— 网格体的边是棱还是光滑过渡（几何）：一条边「平滑吗 / 画线吗」的唯一判定（渲染、拾取、导出、转换都问这里）。created 2026-10-28 by Claude Opus 5.5
// 设计稿 ai-docs/20261027-mesh-hard-soft-edges.md（user 10-28「明暗同意」）+ 纪元账本 FM129 / FM131（model vs view：这是 model 的语义，要数学上有定义）/ FM138（怎么画）。
// 定义（写死，任何实现都得照这个算）：
//   · 手标优先：sharp_edge = 棱（不平滑、画线）；smooth = 平滑（明暗连续）；soft = 不画线。手标平滑在命令里同时设 soft + smooth。
//     3c 起这三样是带保留名的列（mesh/reserved-columns.ts），这里拿列对象读（没有那一列 = 全是 0）。
//   · 没手标的边（三位都没）按网格体的「默认平滑」：hard = 全是棱；smooth = 恰好挨两张面就平滑；angle = 恰好挨两张面且两侧面法向的 |cos| ≥ cos(deg) 就平滑（夹角严格小于 deg；
//     用 |cos| 和 mesh/ops/shade.ts 同：外来文件绕向可能不一致）。平滑的没手标边同时不画线（「线跟着明暗走」，设计稿 §6 第 5 问默认）。
//   · 只挨一张面 / 三张以上（边界、非流形）= 棱。面法向 = Newell（MeshKernel.faceNormal，环的绕向）。
import type { MeshKernel } from "./mesh-kernel.ts";
import type { ColumnDef } from "./columns.ts";
import { SHARP_EDGE, SMOOTH, SOFT, UV_SEAM, edgeMark, edgeMarkReader, setEdgeMark } from "./reserved-columns.ts";

/** 没手标的边按「默认平滑」判（any = 全部平滑；cosMin = 按角度的阈值）。单条判和成批判共用这一段。 */
function autoSmoothAt(m: MeshKernel, any: boolean, cosMin: number, e: number): boolean {
  const fs = m.eFaces(e);
  if (fs.length !== 2 || fs[0] === fs[1]) return false;
  if (any) return true;
  const a = m.faceNormal(fs[0]), b = m.faceNormal(fs[1]);
  return Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) >= cosMin;
}
const cosMinOf = (deg: number): number => Math.cos((deg * Math.PI) / 180) - 1e-12;
/** 单条判。 */
function autoSmooth(m: MeshKernel, e: number): boolean {
  const sh = m.smoothDefault;
  return sh.mode !== "hard" && autoSmoothAt(m, sh.mode === "smooth", cosMinOf(sh.deg), e);
}
/** 成批判：默认平滑和阈值只取一次。 */
function autoSmoothOf(m: MeshKernel): (e: number) => boolean {
  const sh = m.smoothDefault;
  if (sh.mode === "hard") return () => false;
  const any = sh.mode === "smooth", cosMin = cosMinOf(sh.deg);
  return (e) => autoSmoothAt(m, any, cosMin, e);
}
/** 这条边两侧明暗连续吗。 */
export function edgeSmooth(m: MeshKernel, e: number): boolean {
  if (edgeMark(m, e, SHARP_EDGE)) return false;
  if (edgeMark(m, e, SMOOTH)) return true;
  return autoSmooth(m, e);
}
/** 这条边不画线吗（SketchUp 的「软」）：手标的软边，或没手标、按「默认平滑」平滑的边。 */
export function edgeSoft(m: MeshKernel, e: number): boolean {
  if (edgeMark(m, e, SOFT)) return true;
  if (edgeMark(m, e, SHARP_EDGE) || edgeMark(m, e, SMOOTH)) return false;
  return autoSmooth(m, e);
}
/**
 * 成批判（每条边都问的：重建线、导出、转硬表面画线、导入计数、平滑组泛洪）：三列和「默认平滑」一次拿在手里，判法和上面两个逐字一样
 * （测试 test/mesh-edge-marks.test.ts 逐条边对拍）。只在这一趟用：内核改了要重拿。单条问的照旧用 edgeSmooth / edgeSoft。
 */
export interface EdgeLook { smooth(e: number): boolean; soft(e: number): boolean }
export function edgeLookOf(m: MeshKernel): EdgeLook {
  const sharp = edgeMarkReader(m, SHARP_EDGE), smooth = edgeMarkReader(m, SMOOTH), soft = edgeMarkReader(m, SOFT), auto = autoSmoothOf(m);
  return {
    smooth: (e) => !sharp(e) && (smooth(e) || auto(e)),
    soft: (e) => soft(e) || (!sharp(e) && !smooth(e) && auto(e)),
  };
}
/** 边上标什么（指令 meshEdgeMarks 的 mark）：手标三档（sharp / smooth / none——none = 清掉手标，不碰接缝）+ 接缝的标 / 清（施工单二十二第 1 刀）。 */
export type EdgeMark = "sharp" | "smooth" | "none" | "seam" | "unseam";
/** 这一档写哪几列、各写几（手标三档只动手标三列；接缝两档只动接缝那一列）。 */
export function markValues(mark: EdgeMark): readonly (readonly [ColumnDef, 0 | 1])[] {
  if (mark === "seam" || mark === "unseam") return [[UV_SEAM, mark === "seam" ? 1 : 0]];
  return mark === "sharp" ? [[SHARP_EDGE, 1], [SMOOTH, 0], [SOFT, 0]] : mark === "smooth" ? [[SHARP_EDGE, 0], [SMOOTH, 1], [SOFT, 1]] : [[SHARP_EDGE, 0], [SMOOTH, 0], [SOFT, 0]];
}
/** 这条边已经是这一档了吗（指令只算还要改的边）。 */
export function isMarked(m: MeshKernel, e: number, mark: EdgeMark): boolean { return markValues(mark).every(([d, v]) => (edgeMark(m, e, d) ? 1 : 0) === v); }
/** 指令点名写（操作本意，按保留名写；第一次写「有」才建那一列）。 */
export function markEdges(m: MeshKernel, edges: readonly number[], mark: EdgeMark): void {
  const vals = markValues(mark);
  for (const e of edges) if (m.hasE(e)) for (const [d, v] of vals) setEdgeMark(m, e, d, v === 1);
}
/**
 * SU 体转过来（scene/kinds.ts brepToMesh）以后保住原来的样子：「默认平滑」设成「按角度 deg」，SU 里本来是硬的、但夹角小于 deg 的边手标成棱
 * （不然它们会被自动平滑掉）。返回手标了几条。
 */
export function keepLookUnderAngle(m: MeshKernel, deg: number): number {
  m.setSmoothDefault({ mode: "angle", deg });
  let n = 0;
  for (const e of m.edges()) {
    if (edgeMark(m, e, SHARP_EDGE) || edgeMark(m, e, SMOOTH) || edgeMark(m, e, SOFT)) continue;
    if (autoSmooth(m, e)) { setEdgeMark(m, e, SHARP_EDGE, true); n++; }
  }
  return n;
}
