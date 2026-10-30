// tools/mesh-handles.ts —— 自由建模的操纵手柄（移动 / 旋转 / 缩放）。created 2026-10-30 by Claude Opus 5.5
// user 10-29 夜「mesh模式移动的时候单击新图元或者单击选区的时候应该出现gizmos……不过这个是mesh的行为，和brep没关系。brep还是su的手感」
// 「然后rotate scale也一样，单击选区可以弹gizmos，然后右下小窗也有弹gizmos的功能。好好设计一下深模块窄接口」；设计稿 ai-docs/20261027-gizmo-design.md §1 / §2。
// 窄接口：手柄 = 锁轴 / 锁面的另一个入口。工具只问两件事——
//   · grip(ctx, 按下处)：按在哪个把手上 → 这一下的锁（axis = 只沿 / 绕这根、plane = 只在这个面里、都没有 = 中心 = 这把工具的默认做法）；没按在把手上 = null，照常走选法；
//   · view(ctx, 正在拖的那一刻)：这一帧画什么（ViewState.xformGizmo，透视画）。
// 几何 / 拾取的数学和硬表面的变换工具同一份（transform-gizmo.ts）；这里只多「哪一家把手」「轴朝哪」「什么时候开」。硬表面不走这里（SketchUp 的点 → 挪 → 点不变）。
// 开关 / 朝向住 tool-config 的 handles 组（三把工具共用一个值，右下工具条露）；点一下开不开按设备 = stance.ts HANDLES_ON_TAP。
import { type Pt3, add3, cross3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { applyNormal, applyPt } from "../../scene/xform.ts";
import { extrudeNormalDirs, selectionVerts } from "../../mesh/ops/index.ts";
import { type AxisName, type XformGizmo, type XformHandle, type XformLayout, XG_ARROW_PX, XG_CUBE_PX, hitXformGizmo, planeAxes, xformGizmoGeom } from "../transform-gizmo.ts";
import { pickHandle } from "../handle-pick.ts";
import { HANDLES_ON_TAP, deviceOf } from "../../controller/stance.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";

export type HandleFamily = "move" | "rotate" | "scale";
/** 按下抓到的把手：axis = 只沿 / 绕这根（世界、单位长）；plane = 只在这个面里（它的法向）；两个都没有 = 中心。say = 提示行里怎么说。 */
export interface Grip { readonly id: XformHandle | "mc"; readonly axis: Pt3 | null; readonly plane: Pt3 | null; readonly say: string }
/** 手柄画哪几样（ViewState.xformGizmo.parts）。 */
export type HandlePart = "arrows" | "rings" | "cubes" | "planes" | "center";

/** 每一家有哪几样把手（设计稿 §1：移动 = 箭头、旋转 = 环、缩放 = 方头；中心 = 默认做法；平面块 = 在两根轴张成的面里，移动和缩放都有）。 */
const PARTS: Readonly<Record<HandleFamily, readonly HandlePart[]>> = {
  move: ["arrows", "planes", "center"],
  rotate: ["rings", "center"],
  scale: ["cubes", "planes", "center"],
};
const PART_OF = (h: XformHandle): HandlePart => (h[0] === "m" ? "arrows" : h[0] === "r" ? "rings" : h[0] === "p" ? "planes" : "cubes");
/** 缩放没有箭头：方块挪到箭头尖那里、杆从环外画到方块（= 方头箭头，设计稿 §1「缩放 = 方头」）；不挤在中心旁边，手指也分得开。 */
const LAYOUT: Readonly<Record<HandleFamily, XformLayout>> = { move: {}, rotate: {}, scale: { cubePx: XG_ARROW_PX - XG_CUBE_PX } };
const CENTER_SAY: Readonly<Record<HandleFamily, string>> = { move: "中心 = 随手拖", rotate: "中心 = 绕视线转", scale: "中心 = 等比缩放" };
const WORLD = { x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } as const;

export class MeshHandles {
  /** 鼠标悬停的把手（高亮；拖着的时候换成正抓着的那个）。 */
  private hot: string | null = null;
  readonly family: HandleFamily;
  constructor(family: HandleFamily) { this.family = family; }

  /** 这一刻的手柄：开着 ∧ 有选区才有。原点 = 选区的点的平均（世界）；轴 = 朝向（物件 / 世界 / 法向）。 */
  gizmo(ctx: ToolCtx): XformGizmo | null {
    if (!ctx.config.get("handles", "show")) return null;
    const sel = ctx.selection();
    if (sel.kind !== "mesh" || !(sel.verts.size || sel.edges.size || sel.faces.size)) return null;
    const m = ctx.mesh(), vids = selectionVerts(m, sel);
    if (!vids.length) return null;
    const X = ctx.ctxXform();
    let c = { x: 0, y: 0, z: 0 };
    for (const v of vids) c = add3(c, m.pt(v));
    return { origin: applyPt(X, scale3(c, 1 / vids.length)), axes: this.axes(ctx, vids) };
  }
  /** 三根轴（世界、单位长、右手系）。物件 = 上下文坐标架（和 X / Y / Z 锁轴同一套）；法向 = 选中的面的法向当 Z（边 / 点 = 连着的面的平均），X 取物件 X 去掉法向那一份。 */
  private axes(ctx: ToolCtx, vids: readonly number[]): Readonly<Record<AxisName, Pt3>> {
    const F = ctx.contextFrame(), obj = { x: normalize3(F.x), y: normalize3(F.y), z: normalize3(F.z) }, orient = ctx.config.get("handles", "orient");
    if (orient === "world") return WORLD;
    if (orient !== "normal") return obj;
    const m = ctx.mesh(), sel = ctx.selection(), X = ctx.ctxXform(), faces = [...sel.faces].filter((f) => m.hasF(f));
    let n = { x: 0, y: 0, z: 0 };
    if (faces.length) for (const f of faces) n = add3(n, normalize3(applyNormal(X, m.faceNormal(f))));
    else for (const d of extrudeNormalDirs(m, { verts: [...vids] }).values()) n = add3(n, normalize3(applyNormal(X, d)));
    if (len3(n) < 1e-9) return obj;   // 法向互相抵消（选了一圈朝外的面）= 没有法向可言，退回物件
    n = normalize3(n);
    let x = sub3(obj.x, scale3(n, dot3(obj.x, n)));
    if (len3(x) < 1e-6) x = sub3(obj.y, scale3(n, dot3(obj.y, n)));
    x = normalize3(x);
    return { x, y: cross3(n, x), z: n };
  }

  /** 按下处抓到哪个把手（屏距最近；中心 / 箭头 / 方块 / 平面块先比，都不在圈里才看环——和硬表面的变换工具同一个挑法）；没开 / 没抓到 = null。 */
  grip(ctx: ToolCtx, s: { x: number; y: number }): Grip | null {
    const g = this.gizmo(ctx);
    if (!g) return null;
    const parts = PARTS[this.family], pts: { id: XformHandle | "mc"; d: number; z: number }[] = [], rings: typeof pts = [];
    const q = ctx.frame().project?.(g.origin, ctx.vp());
    if (q) pts.push({ id: "mc", d: Math.hypot(q.x - s.x, q.y - s.y), z: -1 });
    for (const c of hitXformGizmo(g, ctx.frame(), ctx.vp(), s.x, s.y, LAYOUT[this.family])) if (parts.includes(PART_OF(c.handle))) (c.handle[0] === "r" ? rings : pts).push({ id: c.handle, d: c.d, z: c.z });
    const hit = ctx.eps().hit, i = pickHandle(pts, hit), j = i < 0 ? pickHandle(rings, hit) : -1;
    const p = i >= 0 ? pts[i] : j >= 0 ? rings[j] : null;
    if (!p) return null;
    if (p.id === "mc") return { id: "mc", axis: null, plane: null, say: CENTER_SAY[this.family] };
    if (p.id[0] === "p") { const { a, b, n } = planeAxes(p.id); return { id: p.id, axis: null, plane: g.axes[n], say: `在 ${a.toUpperCase()}${b.toUpperCase()} 面里` }; }
    const ax = p.id[1] as AxisName;
    return { id: p.id, axis: g.axes[ax], plane: null, say: `${this.family === "rotate" ? "绕" : "沿"} ${ax.toUpperCase()} 轴` };
  }
  /** 鼠标悬停：记下光标下的把手（高亮）。 */
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { this.hot = this.grip(ctx, s)?.id ?? null; }
  /** 点一下之后：选到东西 = 开、点空了 = 关（这台设备点一下弹不弹 = stance.ts HANDLES_ON_TAP）。返回现在开没开。 */
  afterTap(ctx: ToolCtx, ev: ToolPointer): boolean {
    if (HANDLES_ON_TAP[deviceOf(ev.pointerType)]) ctx.config.set("handles", "show", ctx.hasSelection());
    return this.gizmo(ctx) !== null;
  }
  /** 这一帧画什么。drag = 正在拖：原点跟着预演走（被挪的点现在的平均，世界），高亮正抓着的那个；没开 = 什么都不加。 */
  view(ctx: ToolCtx, drag: { origin: Pt3 | null; id: string | null } | null): Partial<ViewState> {
    const g0 = this.gizmo(ctx);
    if (!g0) return {};
    const g = drag?.origin ? { ...g0, origin: drag.origin } : g0;
    return { xformGizmo: { ...xformGizmoGeom(g, ctx.frame(), ctx.vp(), LAYOUT[this.family]), hot: drag ? drag.id : this.hot, uniform: null, parts: PARTS[this.family] } };
  }
}
