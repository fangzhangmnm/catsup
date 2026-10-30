// overlay.ts —— 编辑器这边的全部辅助几何：线段族（overlay-lines.ts）+ 点 / 标记 / 三角 / 文字（这里）。Tron 第一刀步 6b（v0.17.7，Claude Fable 5.1）：
// 从 render3 原样搬出——缩放柄、顶点小点、X 光面点、中缝点、选中点、平面 gizmo 方块、变换 gizmo 的锥 / 块 / 片、吸附小球、落点环、文字；
// 朝向的矩阵数学（锥沿轴、块按三轴摆）交给后端，这里只说「让 +Y 指向 d / 按这三根轴」。
// 2026-10-29 Opus 5.5（切刀第 1 步，设计稿 §7.1）：这里只说「这是什么」（语义种类）和「什么颜色角色」；点的大小 / 形状 / 深度 / 层、标记的形状、颜色值
// 全归画风表 look/aux.ts（以前的 DOT / MARK / TRI 表逐字搬过去）。
import type { OverlayCtx } from "../minccino/index.ts";
import type { AuxColor, AuxItem } from "../look/aux.ts";
import type { ViewState } from "./view-state.ts";
import type { Pt3 } from "../kernel/kernel.ts";
import { overlayLines, SNAP_COLORS } from "./overlay-lines.ts";

const SNAP_MARKER_PX = 5;
const flat = (pts: readonly Pt3[]): number[] => pts.flatMap((q) => [q.x, q.y, q.z]);

/** 这一帧的全部辅助几何（没有的组不出现 = 后端藏起来）。 */
export function overlayItems(view: ViewState, ctx: OverlayCtx): AuxItem[] {
  const out: AuxItem[] = overlayLines(view, ctx);
  // ---- 缩放柄 ----
  const hs = view.handles ?? [];
  hs.forEach((h, i) => { out.push({ kind: "marker", role: "handle", id: `handle${i}`, at: h.p, scale: (h.active ? 9 : 6) * ctx.worldPerPx(h.p), color: h.active ? "handleHot" : "handle" }); });
  // ---- 全部顶点（自由建模）----
  const vd = view.vertDots;
  if (vd && vd.pts.length) out.push({ kind: "points", role: "vert", id: "vertDots", key: vd.key, positions: flat(vd.pts), color: "vert" });
  // ---- X 光面点：没选 / 选中两种颜色 ----
  const fd = view.faceDots;
  if (fd && fd.pts.length) out.push({ kind: "points", role: "faceDot", id: "faceDots", key: fd.key, positions: flat(fd.pts), colors: fd.sel.map((s): AuxColor => (s ? "faceDotOn" : "faceDotOff")) });
  // ---- 镜像中缝上的点 ----
  const mi = view.mirror;
  if (mi && mi.seam.length > 0) out.push({ kind: "points", role: "seam", id: "seam", key: mi.key, positions: flat(mi.seam), color: "mirror" });
  // ---- 选中的点 ----
  const sv = view.selVerts;
  if (sv && sv.length) out.push({ kind: "points", role: "selVert", id: "selVerts", key: sv.map((p) => `${p.x},${p.y},${p.z}`).join("|"), positions: flat(sv), color: "selected" });
  // ---- 平面 gizmo（镜像面）的半透明方块 ----
  const pg = view.planeGizmo;
  if (pg) {
    const k = `${pg.origin.x},${pg.origin.y},${pg.origin.z}/${pg.normal.x},${pg.normal.y},${pg.normal.z}/${pg.size.toExponential(3)}/${pg.hot ?? ""}`;
    const o = pg.origin, S = pg.size, P = (a: number, b: number): Pt3 => ({ x: o.x + pg.u.x * a + pg.v.x * b, y: o.y + pg.u.y * a + pg.v.y * b, z: o.z + pg.u.z * a + pg.v.z * b });
    const cs = [P(-S, -S), P(S, -S), P(S, S), P(-S, S)];
    out.push({ kind: "tris", role: "gizmoQuad", id: "gizmoQuad", key: k, positions: flat([cs[0], cs[1], cs[2], cs[0], cs[2], cs[3]]), color: "gizmo" });
  }
  // ---- 变换 gizmo 的实心小件：三个轴上缩放块 + 等比块 + 中心点 + 三个箭头锥 + 三个平面片 ----
  const xg = view.xformGizmo;
  if (xg) {
    const axisOf = { x: "gizmoX", y: "gizmoY", z: "gizmoZ" } as const;   // gizmo 的 XYZ = 通用色（不跟画风走）
    const has = (p: "arrows" | "cubes" | "planes" | "center"): boolean => !xg.parts || xg.parts.includes(p);   // 自由建模的手柄按工具分家（tools/mesh-handles.ts）
    if (has("arrows")) {   // 箭头锥：尖在 arrow，长 = 箭头段的 32%，粗 = 长的 0.36
      const hl = (xg.arrow - xg.start) * 0.32;
      for (const ax of ["x", "y", "z"] as const) {
        const d = xg.axes[ax], mid = xg.arrow - hl / 2;
        out.push({ kind: "marker", role: "xgCone", id: `xgCone${ax}`, at: { x: xg.origin.x + d.x * mid, y: xg.origin.y + d.y * mid, z: xg.origin.z + d.z * mid }, scale: { x: hl * 0.36, y: hl, z: hl * 0.36 }, color: xg.hot === `m${ax}` ? "gizmoHot" : axisOf[ax], orient: { kind: "upTo", dir: d } });
      }
    }
    if (xg.cube !== undefined && xg.cubeHalf !== undefined) {
      const basis = { kind: "basis", x: xg.axes.x, y: xg.axes.y, z: xg.axes.z } as const;
      const cube = (id: string, role: "xgCube" | "xgCenter", c: Pt3, size: number, color: AuxColor): void => { out.push({ kind: "marker", role, id, at: c, scale: size, color, orient: basis }); };
      if (has("cubes")) for (const ax of ["x", "y", "z"] as const) { const d = xg.axes[ax]; cube(`xgCube${ax}`, "xgCube", { x: xg.origin.x + d.x * xg.cube, y: xg.origin.y + d.y * xg.cube, z: xg.origin.z + d.z * xg.cube }, xg.cubeHalf * 2, xg.hot === `s${ax}` ? "gizmoHot" : axisOf[ax]); }
      if (xg.uniform) cube("xgCubeU", "xgCube", xg.uniform, xg.cubeHalf * 2.4, xg.hot === "su" ? "gizmoHot" : "gizmoUniform");
      if (has("center")) cube("xgCenter", "xgCenter", xg.origin, xg.cubeHalf * 2.2, xg.hot === "mc" ? "gizmoHot" : "gizmoCenter");
    }
    if (xg.plane !== undefined && xg.planeHalf !== undefined && has("planes")) {   // 平面块：方片铺在两根轴张成的面里，颜色 = 垂直于它的那根轴（Blender 同款）
      for (const [h, a, b, n] of [["pxy", "x", "y", "z"], ["pyz", "y", "z", "x"], ["pxz", "x", "z", "y"]] as const) {
        const A = xg.axes[a], B = xg.axes[b];
        const cr = { x: A.y * B.z - A.z * B.y, y: A.z * B.x - A.x * B.z, z: A.x * B.y - A.y * B.x };
        out.push({ kind: "marker", role: "xgPlane", id: `xgPlane${h}`, at: { x: xg.origin.x + (A.x + B.x) * xg.plane, y: xg.origin.y + (A.y + B.y) * xg.plane, z: xg.origin.z + (A.z + B.z) * xg.plane }, scale: { x: xg.planeHalf * 2, y: xg.planeHalf * 2, z: 1 }, color: xg.hot === h ? "gizmoHot" : axisOf[n], orient: { kind: "basis", x: A, y: B, z: cr } });
      }
    }
  }
  // ---- 文字 ----
  for (const lb of view.labels ?? []) out.push({ kind: "text", role: lb.role, id: lb.id, text: lb.text, at: lb.at, anchor: lb.anchor ?? "center", ...(lb.gapPx !== undefined ? { gapPx: lb.gapPx } : {}) });
  // ---- 吸附小球 ----
  const sn = view.snap;
  if (sn?.kind) out.push({ kind: "marker", role: "snap", id: "snap", at: sn.p, scale: SNAP_MARKER_PX * ctx.worldPerPx(sn.p), color: SNAP_COLORS[sn.kind] ?? "snapFace" });
  // ---- teleport 落点环 ----
  const tp = view.teleport;
  if (tp && tp.points.length >= 2 && tp.landing) out.push({ kind: "marker", role: "landing", id: "landing", at: { x: tp.landing.x, y: tp.landing.y, z: tp.landing.z + 0.01 }, scale: 1, color: tp.valid ? "ok" : "bad" });
  return out;
}
