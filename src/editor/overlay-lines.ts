// overlay-lines.ts —— 编辑器这边的叠加层（线段族）：把 ViewState 里的量角器 / 参考线 / 充能 / 断口刻度 / 平面 gizmo / 变换 gizmo / 三轴 / 锁轴线 / 卷尺 /
// 刀线 / 吸附提示线 / teleport 弧 / 胶囊 / 平滑边算成世界坐标线段 + 线性颜色 + 缓存键，交给引擎（Minccino 叠加层契约）。
// Tron 第一刀步 6a（v0.17.6，Claude Fable 5.1）：从 render3 原样搬出——每组的几何、颜色、键**逐字一样**（基线 0 像素差）；量尺（一像素多长 / 视野多远 / 相机三轴）
// 由引擎经 OverlayCtx 给，这里不知道是桌面还是 XR。
import type { OverlayCtx, OverlayLines } from "../minccino/index.ts";

/** 每组线的画法 = 引擎认的几个 GL 参数（线宽 CSS px / 深度模式 / 透明度 / 叠放次序）；**名字留在这里**，引擎那边没有样式表（刀 a，v0.17.17）。值 = 以前 LINE_STYLES 逐字搬来。 */
export type Look = Pick<OverlayLines, "widthPx" | "depth" | "alpha" | "layer" | "depthWrite" | "shared">;
const HINT_PX = 1.2, ARC_PX = 2.5, SOFT_EDGE_PX = 1;
const plain = (widthPx: number): Look => ({ widthPx, depth: "visible" });
const onTop = (widthPx: number, layer: number, alpha?: number): Look => (alpha === undefined ? { widthPx, depth: "through", layer } : { widthPx, depth: "through", layer, alpha });
export const LOOK = {
  hint: plain(HINT_PX),
  arc: plain(ARC_PX),
  capsule: { widthPx: ARC_PX, depth: "through", depthWrite: true, layer: 9 },
  protractor: plain(HINT_PX),
  guide: plain(HINT_PX),
  tape: plain(HINT_PX),
  knife: onTop(HINT_PX + 0.5, 10),
  charged: plain(HINT_PX),
  soft: plain(SOFT_EDGE_PX),
  /** 断口小垂线：线宽跟线稿粗细走（鼓包，不是另一种线）。 */
  tick: { widthPx: "edge", depth: "visible" },
  poolAxes: onTop(HINT_PX, 10),
  emptyAxes: onTop(HINT_PX, 10),
  originAxes: onTop(HINT_PX, 10, 0.4),
  lock: onTop(HINT_PX, 11, 0.75),
  gizmo: onTop(HINT_PX * 1.5, 11),
  xg: onTop(HINT_PX * 1.5, 11),
  /** 选中 / 刮擦 / 悬停 / 检查的边（6c）：后端边线自己的材质（shared），定死最后画（layer 2）= 盖得住底下同材质的黑边。 */
  edge: { widthPx: 1.6, depth: "visible", layer: 2, shared: "edge" },
} as const satisfies Record<string, Look>;
import { hexToLinear, PALETTE } from "../minccino/index.ts";
import type { ViewState } from "./view-state.ts";
import type { Pt3 } from "../kernel/kernel.ts";

/** DT15 选中的组 / 组件的轴：每根短轴的屏幕长度（CSS px）。6c 从 render3 搬来（编辑器的内容，引擎不认识）。 */
export const POOL_AXES_PX = 22;
/** 锁着时画的轴线（controller/lock-guide.ts）两头各伸多长（屏幕 px，按线过的那一点的一像素多长换算）：够横穿画面，像 Blender 的无限长线。 */
export const LOCK_LINE_SPAN_PX = 2400;
import { cross3, sub3 } from "../kernel/geom.ts";
import type { Frame } from "../scene/xform.ts";
import { SPHERE_RINGS, circlePoints } from "./guide-pick.ts";

const CHARGED_COLOR = 0x8b5cf6, CHARGED_EXT_COLOR = 0xd4d0f5, CHARGED_PX = 5;
const GIZMO_COLOR = 0x2b6cb0, GIZMO_HOT = 0xd97706;
const GUIDE_COLOR = 0x6b7280, GUIDE_SEL_COLOR = 0x2b6cb0, GUIDE_POINT_PX = 6;   // 选中 = 与选中膜同一个蓝（A31）
/** A33 断口小垂线：半长 = 线宽 × TICK_K、颜色 = 边线色、粗细 = 边线。 */
const TICK_K = 2;
const AXIS_COLORS: Record<string, number> = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ, u: 0x888888, v: 0x888888, i: 0x111111 };
const TP_OK = 0x2e8b57, TP_BAD = 0xcc3333;
const SOFT_EDGE_COLOR = 0x6e6e6e;
/** Z 轴刻度画多远 = 地面网格的半边（render3 GRID_N × GRID_STEP）。 */
const AXIS_TICK_REACH_M = 50;

type Segs = { pos: number[]; col: number[] };
const segs = (): Segs => ({ pos: [], col: [] });
const push = (s: Segs, a: Pt3, b: Pt3, hex: number): void => { s.pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const [r, g, bb] = hexToLinear(hex); s.col.push(r, g, bb, r, g, bb); };
const lines = (id: string, look: Look, key: string, s: Segs, color?: number): OverlayLines => ({ kind: "lines", id, key, positions: s.pos, colors: s.col.length ? s.col : null, color, ...look });

/** 这一帧的线段族叠加层（没有的组不出现 = 后端藏起来）。 */
export function overlayLines(view: ViewState, ctx: OverlayCtx): OverlayLines[] {
  const out: OverlayLines[] = [];
  // ---- 量角器 ----
  const pr = view.protractor;
  if (pr) {
    const pk = `${pr.center.x},${pr.center.y},${pr.center.z}|${pr.axis.x},${pr.axis.y},${pr.axis.z}|${pr.ref ? `${pr.ref.x},${pr.ref.y},${pr.ref.z}` : "-"}|${pr.angle.toFixed(4)}|${ctx.worldPerPx(pr.center).toExponential(2)}|${pr.minRadius ?? 0}`;
    const R = Math.max(60 * ctx.worldPerPx(pr.center), pr.minRadius ?? 0);
    const n = pr.axis;
    const seed = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    const ux0 = { x: n.y * seed.z - n.z * seed.y, y: n.z * seed.x - n.x * seed.z, z: n.x * seed.y - n.y * seed.x };
    const ul = Math.hypot(ux0.x, ux0.y, ux0.z) || 1;
    let u = { x: ux0.x / ul, y: ux0.y / ul, z: ux0.z / ul };
    if (pr.ref) { const r = { x: pr.ref.x - pr.center.x, y: pr.ref.y - pr.center.y, z: pr.ref.z - pr.center.z }; const rl = Math.hypot(r.x, r.y, r.z) || 1; u = { x: r.x / rl, y: r.y / rl, z: r.z / rl }; }
    const v = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
    const at = (a: number, rr: number): Pt3 => ({ x: pr.center.x + rr * (Math.cos(a) * u.x + Math.sin(a) * v.x), y: pr.center.y + rr * (Math.cos(a) * u.y + Math.sin(a) * v.y), z: pr.center.z + rr * (Math.cos(a) * u.z + Math.sin(a) * v.z) });
    const s = segs(), N = 72;
    for (let i = 0; i < N; i++) push(s, at((2 * Math.PI * i) / N, R), at((2 * Math.PI * (i + 1)) / N, R), 0x8b5cf6);
    for (let i = 0; i < 24; i++) { const a = (2 * Math.PI * i) / 24; push(s, at(a, R), at(a, i % 6 === 0 ? R * 0.8 : R * 0.9), 0x8b5cf6); }
    if (pr.ref) { push(s, pr.center, at(0, R * 1.15), 0x111111); push(s, pr.center, at(pr.angle, R * 1.15), 0xd97706); }
    out.push(lines("protractor", LOOK.protractor, pk, s));
  }
  // ---- 参考几何（0.11 尺规纪元）：参考线 = 长线；参考点 = 像素尺寸的小叉 ----
  const gd = view.guides;
  if (gd && (gd.lines.length || gd.points.length || gd.circles.length || gd.spheres.length)) {
    const px = gd.points.length ? ctx.worldPerPx(gd.points[0].p) : 0;
    const gsel = view.guideSel, gcol = (id: number): number => (gsel?.has(id) ? GUIDE_SEL_COLOR : GUIDE_COLOR);
    const gk = `${gd.lines.map((l) => `${l.id}:${l.p.x},${l.p.y},${l.p.z}>${l.dir.x},${l.dir.y},${l.dir.z}`).join("|")}#${gd.points.map((q) => `${q.id}:${q.p.x},${q.p.y},${q.p.z}`).join("|")}#${gd.circles.map((c) => `${c.id}:${c.c.x},${c.c.y},${c.c.z}^${c.n.x},${c.n.y},${c.n.z}r${c.r}`).join("|")}#${gd.spheres.map((x) => `${x.id}:${x.c.x},${x.c.y},${x.c.z}r${x.r}`).join("|")}#${px.toExponential(2)}#${gsel ? [...gsel].join(",") : ""}#${ctx.reachKey()}`;
    const s = segs();
    for (const l of gd.lines) { const [a, b] = ctx.infLine(l.p, l.dir); push(s, a, b, gcol(l.id)); }
    // 参考圆 = 一圈折线；参考球 = 过球心、垂直于 x / y / z 的三圈（圆规 / 球规，DT50）
    const ring = (pts: Pt3[], hex: number): void => { for (let i = 0; i < pts.length; i++) push(s, pts[i], pts[(i + 1) % pts.length], hex); };
    for (const c of gd.circles) ring(circlePoints(c.c, c.n, c.r), gcol(c.id));
    for (const x of gd.spheres) for (const n of SPHERE_RINGS) ring(circlePoints(x.c, n, x.r), gcol(x.id));
    for (const q of gd.points) {
      const r = GUIDE_POINT_PX * ctx.worldPerPx(q.p);
      push(s, { x: q.p.x - r, y: q.p.y, z: q.p.z }, { x: q.p.x + r, y: q.p.y, z: q.p.z }, gcol(q.id));
      push(s, { x: q.p.x, y: q.p.y - r, z: q.p.z }, { x: q.p.x, y: q.p.y + r, z: q.p.z }, gcol(q.id));
      push(s, { x: q.p.x, y: q.p.y, z: q.p.z - r }, { x: q.p.x, y: q.p.y, z: q.p.z + r }, gcol(q.id));
    }
    out.push(lines("guides", LOOK.guide, gk, s));
  }
  // ---- 平滑边（自由建模）----
  const se = view.softEdges;
  if (se && se.segs.length) {
    const s = segs();
    for (const g of se.segs) push(s, g.a, g.b, SOFT_EDGE_COLOR);
    out.push(lines("soft", LOOK.soft, se.key, s));
  }
  // ---- 充能标记：点 = 小菱形（像素尺寸），边 = 淡淡的延长线 ----
  const ch = view.charged;
  if (ch && (ch.points.length || ch.edges.length)) {
    const px0 = ch.points.length ? ctx.worldPerPx(ch.points[0]) : 0;
    const ck = `${ch.points.map((p) => `${p.x},${p.y},${p.z}`).join("|")}#${ch.edges.map((e) => `${e.a.x},${e.a.y},${e.a.z}>${e.b.x},${e.b.y},${e.b.z}`).join("|")}#${px0.toExponential(2)}#${ctx.reachKey()}`;
    const s = segs();
    for (const e of ch.edges) {
      const d = sub3(e.b, e.a), l = Math.hypot(d.x, d.y, d.z) || 1, u = { x: d.x / l, y: d.y / l, z: d.z / l };
      const [far0, far1] = ctx.infLine(e.a, u);   // 延长线画到视野最远处（以前写死 ±200 m）
      push(s, far0, e.a, CHARGED_EXT_COLOR);
      push(s, e.b, far1, CHARGED_EXT_COLOR);
    }
    const right = ctx.right, up = ctx.up;
    for (const p of ch.points) {
      const r = CHARGED_PX * ctx.worldPerPx(p);
      const N = { x: p.x + up.x * r, y: p.y + up.y * r, z: p.z + up.z * r }, S = { x: p.x - up.x * r, y: p.y - up.y * r, z: p.z - up.z * r };
      const E2 = { x: p.x + right.x * r, y: p.y + right.y * r, z: p.z + right.z * r }, W = { x: p.x - right.x * r, y: p.y - right.y * r, z: p.z - right.z * r };
      push(s, N, E2, CHARGED_COLOR); push(s, E2, S, CHARGED_COLOR); push(s, S, W, CHARGED_COLOR); push(s, W, N, CHARGED_COLOR);
    }
    out.push(lines("charged", LOOK.charged, ck, s));
  }
  // ---- A33 断口小垂线：线上一个小鼓包（半长 = 线宽 × TICK_K，边线色），垂直于边、面向相机 ----
  // 同一套小短线也画轴的刻度（user 2026-10-25「我还是希望z轴有刻度。可以用那种我们之前用过的小短线」）：Z 轴每 axisTickM 一根（屏上挤到 < 6 px 就改成每 10 个一根），
  // X 轴 +1 个单位处一根（「1 m」字标在它下面）；颜色 = 那根轴的颜色。
  const tks: { p: Pt3; dir: Pt3; color?: number }[] = [...(view.ticks ?? [])];
  const atm = view.axisTickM, afr = view.frame;
  if (atm && atm > 0 && afr) {
    const o = afr.origin, zd = afr.z, xd = afr.x;
    let step = atm;
    const wpp0 = ctx.worldPerPx(o);
    while (step / wpp0 < 6 && step < 1e6) step *= 10;
    const L = AXIS_TICK_REACH_M;
    for (let k = 1; k * step <= L + 1e-9; k++) tks.push({ p: { x: o.x + zd.x * k * step, y: o.y + zd.y * k * step, z: o.z + zd.z * k * step }, dir: zd, color: PALETTE.axisZ });
    if (view.axisUnitX) { const ux = view.axisUnitX; tks.push({ p: { x: o.x + xd.x * ux, y: o.y + xd.y * ux, z: o.z + xd.z * ux }, dir: xd, color: PALETTE.axisX }); }
  }
  if (tks.length) {
    const px = ctx.worldPerPx(tks[0].p);
    const fwd = ctx.forward;
    const halfCss = TICK_K * Math.max(ctx.lineWeightPx, 1) / ctx.dpr;   // 线宽是设备像素，worldPerPx 按 CSS 像素
    const kk = `${tks.map((t) => `${t.p.x},${t.p.y},${t.p.z}>${t.dir.x},${t.dir.y},${t.dir.z}`).join("|")}#${px.toExponential(2)}#${fwd.x.toFixed(3)},${fwd.y.toFixed(3)},${fwd.z.toFixed(3)}#${halfCss}`;
    const s = segs();
    for (const t of tks) {
      const [cr, cg, cb] = hexToLinear(t.color ?? PALETTE.edge);
      let n = cross3(t.dir, fwd);
      let l = Math.hypot(n.x, n.y, n.z);
      if (l < 1e-6) { n = Math.abs(t.dir.z) < 0.9 ? cross3(t.dir, { x: 0, y: 0, z: 1 }) : cross3(t.dir, { x: 1, y: 0, z: 0 }); l = Math.hypot(n.x, n.y, n.z); }
      const r = halfCss * ctx.worldPerPx(t.p) / l;
      s.pos.push(t.p.x - n.x * r, t.p.y - n.y * r, t.p.z - n.z * r, t.p.x + n.x * r, t.p.y + n.y * r, t.p.z + n.z * r);
      s.col.push(cr, cg, cb, cr, cg, cb);
    }
    out.push(lines("ticks", LOOK.tick, kk, s));
  }
  // ---- 平面 gizmo（镜像面）的线：描边 / 法线箭头 / 转动把手 / 中心小框（半透明方块归后端的标记）----
  const pg = view.planeGizmo;
  if (pg) {
    const k = `${pg.origin.x},${pg.origin.y},${pg.origin.z}/${pg.normal.x},${pg.normal.y},${pg.normal.z}/${pg.size.toExponential(3)}/${pg.hot ?? ""}`;
    const o = pg.origin, S = pg.size, P = (a: number, b: number, c = 0): Pt3 => ({ x: o.x + pg.u.x * a + pg.v.x * b + pg.normal.x * c, y: o.y + pg.u.y * a + pg.v.y * b + pg.normal.y * c, z: o.z + pg.u.z * a + pg.v.z * b + pg.normal.z * c });
    const s = segs();
    const colOf = (h: string): number => (pg.hot === h ? GIZMO_HOT : GIZMO_COLOR);
    const cs = [P(-S, -S), P(S, -S), P(S, S), P(-S, S)];
    for (let i = 0; i < 4; i++) push(s, cs[i], cs[(i + 1) % 4], GIZMO_COLOR);
    push(s, o, P(0, 0, S * 1.3), colOf("push"));                                      // 法线箭头
    const tip = S * 1.3, h = S * 0.12;
    push(s, P(0, 0, tip), P(h, 0, tip - h * 1.5), colOf("push")); push(s, P(0, 0, tip), P(-h, 0, tip - h * 1.5), colOf("push"));
    const ring = (cx: number, cy: number, hx: string): void => { const r = S * 0.12, N = 12; for (let i = 0; i < N; i++) { const a0 = (2 * Math.PI * i) / N, a1 = (2 * Math.PI * (i + 1)) / N; push(s, P(cx + r * Math.cos(a0), cy + r * Math.sin(a0)), P(cx + r * Math.cos(a1), cy + r * Math.sin(a1)), colOf(hx)); } };
    ring(0, S, "rotU"); ring(S, 0, "rotV");                                          // 转动把手（边中点）
    const m = S * 0.07;
    push(s, P(-m, -m), P(m, -m), colOf("move")); push(s, P(m, -m), P(m, m), colOf("move")); push(s, P(m, m), P(-m, m), colOf("move")); push(s, P(-m, m), P(-m, -m), colOf("move"));
    out.push(lines("planeGizmo", LOOK.gizmo, k, s));
  }
  // ---- 变换 gizmo 的线：三根箭杆 + 三个环，RGB = XYZ，悬停 / 拖着的那个换橙（锥 / 块 / 片归后端的标记）----
  const xg = view.xformGizmo;
  if (xg) {
    const r6 = (p: Pt3): string => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
    const k = `${r6(xg.origin)}/${r6(xg.axes.x)}/${r6(xg.axes.y)}/${r6(xg.axes.z)}/${xg.arrow.toExponential(3)}/${xg.hot ?? ""}/${xg.uniform ? r6(xg.uniform) : "-"}`;
    const s = segs();
    const at = (d: Pt3, t: number): Pt3 => ({ x: xg.origin.x + d.x * t, y: xg.origin.y + d.y * t, z: xg.origin.z + d.z * t });
    const hexOf = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const;
    for (const ax of ["x", "y", "z"] as const) {
      const d = xg.axes[ax];
      const hm = xg.hot === `m${ax}` ? GIZMO_HOT : hexOf[ax], hr = xg.hot === `r${ax}` ? GIZMO_HOT : hexOf[ax];
      push(s, at(d, xg.start), at(d, xg.arrow - (xg.arrow - xg.start) * 0.32), hm);   // 箭杆；箭头 = 实心锥（后端标记）
      const ref = ax === "z" ? xg.axes.x : ax === "x" ? xg.axes.y : xg.axes.z, N = 48;
      const v = { x: d.y * ref.z - d.z * ref.y, y: d.z * ref.x - d.x * ref.z, z: d.x * ref.y - d.y * ref.x };
      const Pp = (i: number): Pt3 => { const a = (2 * Math.PI * i) / N, c = Math.cos(a) * xg.ring, sn = Math.sin(a) * xg.ring; return { x: xg.origin.x + ref.x * c + v.x * sn, y: xg.origin.y + ref.y * c + v.y * sn, z: xg.origin.z + ref.z * c + v.z * sn }; };
      for (let i = 0; i < N; i++) push(s, Pp(i), Pp(i + 1), hr);
    }
    out.push(lines("xformGizmo", LOOK.xg, k, s));
  }
  // ---- DT15 选中组件的原点 / T11 空组件的常驻标记 / DT86 组件原点（淡）：原点出三根屏幕定长的短轴（RGB = XYZ），透视 ----
  const triads = (id: string, look: Look, frames: readonly Frame[] | null | undefined): void => {
    if (!frames || !frames.length) return;
    const wpp = frames.map((f) => ctx.worldPerPx(f.origin));
    const k = frames.map((f, i) => `${f.origin.x},${f.origin.y},${f.origin.z}/${f.x.x},${f.x.y},${f.x.z}/${f.y.x},${f.y.y},${f.y.z}/${f.z.x},${f.z.y},${f.z.z}@${wpp[i].toExponential(2)}`).join("|");
    const s = segs();
    frames.forEach((f, i) => {
      const L = POOL_AXES_PX * wpp[i], o = f.origin;
      for (const [d, hex] of [[f.x, PALETTE.axisX], [f.y, PALETTE.axisY], [f.z, PALETTE.axisZ]] as const) push(s, o, { x: o.x + d.x * L, y: o.y + d.y * L, z: o.z + d.z * L }, hex);
    });
    out.push(lines(id, look, k, s));
  };
  triads("poolAxes", LOOK.poolAxes, view.poolAxes);
  triads("emptyAxes", LOOK.emptyAxes, view.emptyAxes);
  triads("originAxes", LOOK.originAxes, view.originAxes);
  // ---- 锁看得见：轴色长线、透视 ----
  const lk = view.lockLines;
  if (lk && lk.length) {
    const k = lk.map((l) => `${l.through.x},${l.through.y},${l.through.z}/${l.dir.x},${l.dir.y},${l.dir.z}/${l.color}@${ctx.worldPerPx(l.through).toExponential(2)}`).join("|");
    const s = segs();
    for (const l of lk) {
      const L = LOCK_LINE_SPAN_PX * ctx.worldPerPx(l.through), o = l.through, d = l.dir;
      push(s, { x: o.x - d.x * L, y: o.y - d.y * L, z: o.z - d.z * L }, { x: o.x + d.x * L, y: o.y + d.y * L, z: o.z + d.z * L }, l.color === "n" ? 0x888888 : AXIS_COLORS[l.color]);
    }
    out.push(lines("lockLines", LOOK.lock, k, s));
  }
  // ---- 卷尺预演：量线 + 候选参考线 / 参考点 ----
  const tp0 = view.tape;
  if (tp0) {
    const r = GUIDE_POINT_PX * ctx.worldPerPx(tp0.b);
    const tk = `${tp0.a.x},${tp0.a.y},${tp0.a.z}>${tp0.b.x},${tp0.b.y},${tp0.b.z}|${tp0.guide ? `${tp0.guide.p.x},${tp0.guide.p.y},${tp0.guide.p.z}/${tp0.guide.dir.x},${tp0.guide.dir.y},${tp0.guide.dir.z}` : ""}|${tp0.point ? "P" : ""}|${r.toExponential(2)}|${ctx.reachKey()}`;
    const s = segs();
    push(s, tp0.a, tp0.b, 0x111111);
    if (tp0.guide) { const g = tp0.guide, [a, b] = ctx.infLine(g.p, g.dir); push(s, a, b, GUIDE_COLOR); }
    if (tp0.point) { const q = tp0.point; push(s, { x: q.x - r, y: q.y, z: q.z }, { x: q.x + r, y: q.y, z: q.z }, GUIDE_COLOR); push(s, { x: q.x, y: q.y - r, z: q.z }, { x: q.x, y: q.y + r, z: q.z }, GUIDE_COLOR); push(s, { x: q.x, y: q.y, z: q.z - r }, { x: q.x, y: q.y, z: q.z + r }, GUIDE_COLOR); }
    out.push(lines("tape", LOOK.tape, tk, s));
  }
  // ---- 切割的刀线（最上层）----
  const kl = view.knifeLine;
  if (kl) {
    const kk = `${kl.a.x},${kl.a.y},${kl.a.z}>${kl.b.x},${kl.b.y},${kl.b.z}|${kl.valid}`;
    const s = segs();
    push(s, kl.a, kl.b, kl.valid ? PALETTE.edgeSelected : 0x8a8a8a);
    out.push(lines("knife", LOOK.knife, kk, s));
  }
  // ---- 吸附提示线（小球归后端的标记）----
  const sn = view.snap;
  if (sn?.kind) {
    const color = SNAP_COLORS[sn.kind] ?? 0x2b6cb0;
    let hs: { a: Pt3; b: Pt3; color: number }[] | null = null;
    if (sn.hints?.length) hs = sn.hints.map((h) => ({ a: h.a, b: h.b, color: AXIS_COLORS[h.axis] ?? 0x888888 }));
    else if (sn.kind.startsWith("axis") && view.snapAnchor) hs = [{ a: view.snapAnchor, b: sn.p, color }];
    if (hs) {
      const hk = hs.map((h) => `${h.color}:${h.a.x},${h.a.y},${h.a.z},${h.b.x},${h.b.y},${h.b.z}`).join("|");
      const s = segs();
      for (const h of hs) push(s, h.a, h.b, h.color);
      out.push(lines("hint", LOOK.hint, hk, s));
    }
  }
  // ---- teleport 弧线（绿=可落 / 红=取消；落点环归后端的标记；位置每帧变 → 每帧重建这几十段）----
  const tp = view.teleport;
  if (tp && tp.points.length >= 2) {
    const s = segs();
    for (let i = 0; i + 1 < tp.points.length; i++) { const a = tp.points[i], b = tp.points[i + 1]; s.pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    out.push({ kind: "lines", id: "arc", ...LOOK.arc, key: `arc${s.pos.length}@${s.pos.join(",")}`, positions: s.pos, colors: null, color: tp.valid ? TP_OK : TP_BAD });
  }
  // ---- 放置的胶囊虚影（每帧位置都可能变，几十段，现建）----
  const cp = view.capsule;
  if (cp) {
    const pos: number[] = [], N = 24, f = cp.feet, r = cp.radius;
    const ring = (z: number, rr: number): void => { for (let i = 0; i < N; i++) { const a = (i / N) * 2 * Math.PI, b = ((i + 1) / N) * 2 * Math.PI; pos.push(f.x + rr * Math.cos(a), f.y + rr * Math.sin(a), z, f.x + rr * Math.cos(b), f.y + rr * Math.sin(b), z); } };
    ring(f.z + 0.01, r); ring(f.z + cp.stature, r);   // 脚底 / 头顶（不画眼睛：user 10-28「消费者不应该知道你有眼睛」）
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * Math.PI; pos.push(f.x + r * Math.cos(a), f.y + r * Math.sin(a), f.z + 0.01, f.x + r * Math.cos(a), f.y + r * Math.sin(a), f.z + cp.stature); }
    out.push({ kind: "lines", id: "capsule", ...LOOK.capsule, key: `cap@${pos.join(",")}`, positions: pos, colors: null, color: cp.ok ? TP_OK : TP_BAD });
  }
  return out;
}

/** 吸附种类 → 颜色（和 render3 的小球同一张表；提示线只用「axis」那几种和 hint 自带的轴）。 */
export const SNAP_COLORS: Record<string, number> = {
  endpoint: 0x2e8b57, midpoint: 0x00a5a5, "on-edge": 0xcc3333, origin: 0x8b5cf6, align: 0x8b5cf6, "align-combo": 0x8b5cf6, "edge-align": 0xcc3333,
  intersection: 0x111111, "cross-line": 0x111111, "axis-x": PALETTE.axisX, "axis-y": PALETTE.axisY, "axis-z": PALETTE.axisZ, "h-stop": 0xd97706,
  "on-face": 0x2b6cb0, "on-guide": 0x6b7280, "guide-point": 0x6b7280, "guide-cross": 0x111111, "grid-point": 0x9ca3af, increment: 0xd97706,
  "on-extension": 0x8b5cf6, center: 0x2b6cb0, "pool-origin": 0x111111,
};
