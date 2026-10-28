// mesh/edge-smooth.ts —— 网格体的边是棱还是光滑过渡（几何）：一条边「平滑吗 / 画线吗」的唯一判定（渲染、拾取、导出、转换都问这里）。created 2026-10-28 by Claude Opus 5.5
// 设计稿 ai-docs/20261027-mesh-hard-soft-edges.md（user 10-28「明暗同意」）+ 纪元账本 FM129 / FM131（model vs view：这是 model 的语义，要数学上有定义）/ FM138（怎么画）。
// 定义（写死，任何实现都得照这个算）：
//   · 手标优先：F_SHARP = 棱（不平滑、画线）；F_SMOOTH = 平滑（明暗连续）；F_SOFT = 不画线。手标平滑在命令里同时设 F_SOFT | F_SMOOTH。
//   · 没手标的边（三位都没）按网格体的「默认平滑」：hard = 全是棱；smooth = 恰好挨两张面就平滑；angle = 恰好挨两张面且两侧面法向的 |cos| ≥ cos(deg) 就平滑（夹角严格小于 deg；
//     用 |cos| 和 mesh/ops/shade.ts 同：外来文件绕向可能不一致）。平滑的没手标边同时不画线（「线跟着明暗走」，设计稿 §6 第 5 问默认）。
//   · 只挨一张面 / 三张以上（边界、非流形）= 棱。面法向 = Newell（MeshKernel.faceNormal，环的绕向）。
import { F_SHARP, F_SMOOTH, F_SOFT, MeshKernel } from "./mesh-kernel.ts";

const MARKS = F_SHARP | F_SMOOTH | F_SOFT;

/** 没手标的边按「默认平滑」判。 */
function autoSmooth(m: MeshKernel, e: number): boolean {
  const sh = m.smoothDefault;
  if (sh.mode === "hard") return false;
  const fs = m.eFaces(e);
  if (fs.length !== 2 || fs[0] === fs[1]) return false;
  if (sh.mode === "smooth") return true;
  const a = m.faceNormal(fs[0]), b = m.faceNormal(fs[1]);
  return Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) >= Math.cos((sh.deg * Math.PI) / 180) - 1e-12;
}
/** 这条边两侧明暗连续吗。 */
export function edgeSmooth(m: MeshKernel, e: number): boolean {
  const fl = m.edgeFlags[e];
  if (fl & F_SHARP) return false;
  if (fl & F_SMOOTH) return true;
  return autoSmooth(m, e);
}
/** 这条边不画线吗（SketchUp 的「软」）：手标的软边，或没手标、按「默认平滑」平滑的边。 */
export function edgeSoft(m: MeshKernel, e: number): boolean {
  const fl = m.edgeFlags[e];
  if (fl & F_SOFT) return true;
  if (fl & MARKS) return false;
  return autoSmooth(m, e);
}
/** 手标：sharp = 棱 / smooth = 平滑且不画线 / none = 清掉，交给「默认平滑」。别的位（接缝 / 隐藏 / 裸线）不动。 */
export function markEdges(m: MeshKernel, edges: readonly number[], mark: "sharp" | "smooth" | "none"): void {
  const bits = mark === "sharp" ? F_SHARP : mark === "smooth" ? F_SOFT | F_SMOOTH : 0;
  for (const e of edges) if (m.hasE(e)) m.setEdgeFlags(e, (m.edgeFlags[e] & ~MARKS) | bits);
}
/**
 * SU 体转过来（scene/kinds.ts brepToMesh）以后保住原来的样子：「默认平滑」设成「按角度 deg」，SU 里本来是硬的、但夹角小于 deg 的边手标成棱
 * （不然它们会被自动平滑掉）。返回手标了几条。
 */
export function keepLookUnderAngle(m: MeshKernel, deg: number): number {
  m.setSmoothDefault({ mode: "angle", deg });
  let n = 0;
  for (const e of m.edges()) {
    if (m.edgeFlags[e] & MARKS) continue;
    if (autoSmooth(m, e)) { m.setEdgeFlags(e, m.edgeFlags[e] | F_SHARP); n++; }
  }
  return n;
}
