// overlay.ts —— 编辑器这边的整个叠加层：线段族（overlay-lines.ts）+ 点 / 标记 / 三角 / 文字（这里）。Tron 第一刀步 6b（v0.17.7，Claude Fable 5.1）：
// 从 render3 原样搬出——缩放柄、顶点小点、X 光面点、中缝点、选中点、平面 gizmo 方块、变换 gizmo 的锥 / 块 / 片、吸附小球、落点环、文字；
// 几何、颜色、键逐字一样（基线 0 像素差）；朝向的矩阵数学（锥沿轴、块按三轴摆）交给后端，这里只说「让 +Y 指向 d / 按这三根轴」。
import type { OverlayCtx, OverlayItem, OverlayMarker } from "../minccino/index.ts";
import type { ViewState } from "../minccino/backend/three/render3.ts";
import { PALETTE } from "../minccino/backend/three/render3.ts";
import type { Pt3 } from "../kernel/kernel.ts";
import { overlayLines, SNAP_COLORS } from "./overlay-lines.ts";

const GIZMO_HOT = 0xd97706;
const TP_OK = 0x2e8b57, TP_BAD = 0xcc3333;
const SNAP_MARKER_PX = 5;
const flat = (pts: readonly Pt3[]): number[] => pts.flatMap((q) => [q.x, q.y, q.z]);

/** 这一帧的全部叠加层（没有的组不出现 = 后端藏起来）。 */
export function overlayItems(view: ViewState, ctx: OverlayCtx): OverlayItem[] {
  const out: OverlayItem[] = overlayLines(view, ctx);
  // ---- 缩放柄 ----
  const hs = view.handles ?? [];
  hs.forEach((h, i) => { out.push({ kind: "marker", id: `handle${i}`, style: "handle", at: h.p, scale: (h.active ? 9 : 6) * ctx.worldPerPx(h.p), color: h.active ? 0xd97706 : 0x2e8b57 }); });
  // ---- 全部顶点（自由建模）----
  const vd = view.vertDots;
  if (vd && vd.pts.length) out.push({ kind: "points", id: "vertDots", style: "vert", key: vd.key, positions: flat(vd.pts) });
  // ---- X 光面点：没选 = 深灰，选中 = 选中色（sRGB 浮点，点的 shader 直接出）----
  const fd = view.faceDots;
  if (fd && fd.pts.length) {
    const col: number[] = [];
    const on = [((PALETTE.faceSelected >> 16) & 255) / 255 * 0.6, ((PALETTE.faceSelected >> 8) & 255) / 255 * 0.6, (PALETTE.faceSelected & 255) / 255 * 0.85], off = [0.33, 0.33, 0.33];
    for (const s of fd.sel) col.push(...(s ? on : off));
    out.push({ kind: "points", id: "faceDots", style: "faceDot", key: fd.key, positions: flat(fd.pts), colors: col });
  }
  // ---- 镜像中缝上的点 ----
  const mi = view.mirror;
  if (mi && mi.seam.length > 0) out.push({ kind: "points", id: "seam", style: "seam", key: mi.key, positions: flat(mi.seam) });
  // ---- 选中的点 ----
  const sv = view.selVerts;
  if (sv && sv.length) out.push({ kind: "points", id: "selVerts", style: "selVert", key: sv.map((p) => `${p.x},${p.y},${p.z}`).join("|"), positions: flat(sv) });
  // ---- 平面 gizmo（镜像面）的半透明方块 ----
  const pg = view.planeGizmo;
  if (pg) {
    const k = `${pg.origin.x},${pg.origin.y},${pg.origin.z}/${pg.normal.x},${pg.normal.y},${pg.normal.z}/${pg.size.toExponential(3)}/${pg.hot ?? ""}`;
    const o = pg.origin, S = pg.size, P = (a: number, b: number): Pt3 => ({ x: o.x + pg.u.x * a + pg.v.x * b, y: o.y + pg.u.y * a + pg.v.y * b, z: o.z + pg.u.z * a + pg.v.z * b });
    const cs = [P(-S, -S), P(S, -S), P(S, S), P(-S, S)];
    out.push({ kind: "tris", id: "gizmoQuad", style: "gizmoQuad", key: k, positions: flat([cs[0], cs[1], cs[2], cs[0], cs[2], cs[3]]) });
  }
  // ---- 变换 gizmo 的实心小件：三个轴上缩放块 + 等比块 + 中心点 + 三个箭头锥 + 三个平面片 ----
  const xg = view.xformGizmo;
  if (xg) {
    const hexOf = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const;
    {   // 箭头锥：尖在 arrow，长 = 箭头段的 32%，粗 = 长的 0.36
      const hl = (xg.arrow - xg.start) * 0.32;
      for (const ax of ["x", "y", "z"] as const) {
        const d = xg.axes[ax], mid = xg.arrow - hl / 2;
        out.push({ kind: "marker", id: `xgCone${ax}`, style: "xgCone", at: { x: xg.origin.x + d.x * mid, y: xg.origin.y + d.y * mid, z: xg.origin.z + d.z * mid }, scale: { x: hl * 0.36, y: hl, z: hl * 0.36 }, color: xg.hot === `m${ax}` ? GIZMO_HOT : hexOf[ax], orient: { kind: "upTo", dir: d } });
      }
    }
    if (xg.cube !== undefined && xg.cubeHalf !== undefined) {
      const basis = { kind: "basis", x: xg.axes.x, y: xg.axes.y, z: xg.axes.z } as const;
      const cube = (id: string, style: OverlayMarker["style"], c: Pt3, size: number, hex: number): void => { out.push({ kind: "marker", id, style, at: c, scale: size, color: hex, orient: basis }); };
      for (const ax of ["x", "y", "z"] as const) { const d = xg.axes[ax]; cube(`xgCube${ax}`, "xgCube", { x: xg.origin.x + d.x * xg.cube, y: xg.origin.y + d.y * xg.cube, z: xg.origin.z + d.z * xg.cube }, xg.cubeHalf * 2, xg.hot === `s${ax}` ? GIZMO_HOT : hexOf[ax]); }
      if (xg.uniform) cube("xgCubeU", "xgCube", xg.uniform, xg.cubeHalf * 2.4, xg.hot === "su" ? GIZMO_HOT : 0x777777);
      cube("xgCenter", "xgCenter", xg.origin, xg.cubeHalf * 2.2, xg.hot === "mc" ? GIZMO_HOT : 0x333333);
    }
    if (xg.plane !== undefined && xg.planeHalf !== undefined) {   // 平面块：方片铺在两根轴张成的面里，颜色 = 垂直于它的那根轴（Blender 同款）
      for (const [h, a, b, n] of [["pxy", "x", "y", "z"], ["pyz", "y", "z", "x"], ["pxz", "x", "z", "y"]] as const) {
        const A = xg.axes[a], B = xg.axes[b];
        const cr = { x: A.y * B.z - A.z * B.y, y: A.z * B.x - A.x * B.z, z: A.x * B.y - A.y * B.x };
        out.push({ kind: "marker", id: `xgPlane${h}`, style: "xgPlane", at: { x: xg.origin.x + (A.x + B.x) * xg.plane, y: xg.origin.y + (A.y + B.y) * xg.plane, z: xg.origin.z + (A.z + B.z) * xg.plane }, scale: { x: xg.planeHalf * 2, y: xg.planeHalf * 2, z: 1 }, color: xg.hot === h ? GIZMO_HOT : hexOf[n], orient: { kind: "basis", x: A, y: B, z: cr } });
      }
    }
  }
  // ---- 文字 ----
  for (const lb of view.labels ?? []) out.push({ kind: "label", id: lb.id, text: lb.text, at: lb.at, style: lb.style, anchor: lb.anchor, gapPx: lb.gapPx, occlude: lb.occlude });
  // ---- 吸附小球 ----
  const sn = view.snap;
  if (sn?.kind) out.push({ kind: "marker", id: "snap", style: "snap", at: sn.p, scale: SNAP_MARKER_PX * ctx.worldPerPx(sn.p), color: SNAP_COLORS[sn.kind] ?? 0x2b6cb0 });
  // ---- teleport 落点环 ----
  const tp = view.teleport;
  if (tp && tp.points.length >= 2 && tp.landing) out.push({ kind: "marker", id: "landing", style: "landing", at: { x: tp.landing.x, y: tp.landing.y, z: tp.landing.z + 0.01 }, scale: 1, color: tp.valid ? TP_OK : TP_BAD });
  return out;
}
