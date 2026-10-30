// tools/mesh-handles.ts —— 自由建模的操纵手柄（移动 / 旋转 / 缩放）。created 2026-10-30 by Claude Opus 5.5
// user 10-29 夜「mesh模式移动的时候单击新图元或者单击选区的时候应该出现gizmos……不过这个是mesh的行为，和brep没关系。brep还是su的手感」
// 「然后rotate scale也一样，单击选区可以弹gizmos，然后右下小窗也有弹gizmos的功能。好好设计一下深模块窄接口」；设计稿 ai-docs/20261027-gizmo-design.md §1 / §2。
// 窄接口：手柄 = 锁轴 / 锁面的另一个入口。工具只问两件事——
//   · grip(ctx, 按下处)：按在哪个把手上 → 这一下的锁（axis = 只沿 / 绕这根、plane = 只在这个面里、都没有 = 中心 = 这把工具的默认做法）；没按在把手上 = null，照常走选法；
//   · view(ctx, 正在拖的那一刻)：这一帧画什么（ViewState.xformGizmo，透视画）。
// 几何 / 拾取的数学和硬表面的变换工具同一份（transform-gizmo.ts）；这里只多「哪一家把手」「轴朝哪」「什么时候开」。硬表面不走这里（SketchUp 的点 → 挪 → 点不变）。
// 开关 / 朝向住 tool-config 的 handles 组（几把工具共用）。**怎么叫出来 = 点第二下**（v0.17.61，user 10-30「要不gizmo和选区统一一下二次点击再跳？然后多次点击是切不同的对齐。
// 但是要和双击分开来？」「就是手柄统一是点第二下？」「手柄开关可能不需要有」）：第一下 = 选；隔过连击窗口再点选区 = 出手柄；手柄出来以后再点选区 / 点手柄（没拖）= 换朝向
// （物件 → 世界 → 法向）；选到别的 / 点空处 = 收起。和选择工具「再点一下选区 = 扩缩条」同一个手势。第二下弹不弹按设备 = stance.ts HANDLES_ON_TAP。
import { type Pt3, add3, cross3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { applyNormal, applyPt } from "../../scene/xform.ts";
import { extrudeNormalDirs, selectionVerts } from "../../mesh/ops/index.ts";
import { type AxisName, type XformGizmo, type XformHandle, type XformLayout, XG_ARROW_PX, XG_CUBE_PX, XG_UNIFORM_OFFSET_PX, hitXformGizmo, planeAxes, xformGizmoGeom } from "../transform-gizmo.ts";
import { rayPlane } from "../camera.ts";
import { pickHandle } from "../handle-pick.ts";
import { HANDLES_ON_TAP, deviceOf } from "../../controller/stance.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";

/** 哪一家：移动 / 旋转 / 缩放 / 挤出（箭头 + 中心）/ 变换（三家一起，一直挂着）。 */
export type HandleFamily = "move" | "rotate" | "scale" | "pull" | "transform";
/**
 * 按下抓到的把手：axis = 只沿 / 绕这根（世界、单位长）；plane = 只在这个面里（它的法向）；两个都没有 = 中心（或变换的等比块）。
 * op = 这一下做哪种（变换工具按把手定：箭头 / 中心 = 挪、环 = 转、方块 / 平面块 / 等比块 = 缩，和硬表面的变换工具同一套意思；别的家 = 自己那种，挤出没有）。say = 提示行里怎么说。
 */
export interface Grip { readonly id: XformHandle | "mc"; readonly axis: Pt3 | null; readonly plane: Pt3 | null; readonly op?: "move" | "rotate" | "scale"; readonly say: string }
/** 手柄画哪几样（ViewState.xformGizmo.parts）。 */
export type HandlePart = "arrows" | "rings" | "cubes" | "planes" | "center";

/** 每一家有哪几样把手（设计稿 §1：移动 = 箭头、旋转 = 环、缩放 = 方头；中心 = 默认做法；平面块 = 在两根轴张成的面里，移动和缩放都有）。 */
const PARTS: Readonly<Record<HandleFamily, readonly HandlePart[]>> = {
  move: ["arrows", "planes", "center"],
  rotate: ["rings", "center"],
  scale: ["cubes", "planes", "center"],
  pull: ["arrows", "center"],
  transform: ["arrows", "rings", "cubes", "planes", "center"],   // + 等比块（中心右上方的屏幕把手，硬表面变换工具同款）
};
const PART_OF = (h: XformHandle): HandlePart => (h[0] === "m" ? "arrows" : h[0] === "r" ? "rings" : h[0] === "p" ? "planes" : "cubes");
/** 缩放没有箭头：方块挪到箭头尖那里、杆从环外画到方块（= 方头箭头，设计稿 §1「缩放 = 方头」）；不挤在中心旁边，手指也分得开。 */
const LAYOUT: Readonly<Record<HandleFamily, XformLayout>> = { move: {}, rotate: {}, scale: { cubePx: XG_ARROW_PX - XG_CUBE_PX }, pull: {}, transform: {} };
const CENTER_SAY: Readonly<Record<HandleFamily, string>> = { move: "中心 = 随手拖", rotate: "中心 = 绕视线转", scale: "中心 = 等比缩放", pull: "中心 = 换一种拖法", transform: "中心 = 随手挪" };
/** 变换工具抓的把手 → 做哪种（硬表面变换工具 tools/transform.ts 同一套：m = 挪、r = 转、其余 = 缩）。 */
const OP_OF = (h: XformHandle | "mc"): "move" | "rotate" | "scale" => (h === "mc" || h[0] === "m" ? "move" : h[0] === "r" ? "rotate" : "scale");
/** 朝向的轮换顺序（点第二下以后每点一下换一个）。 */
const ORIENTS = ["object", "world", "normal"] as const;
const ORIENT_SAY: Readonly<Record<(typeof ORIENTS)[number], string>> = { object: "物件（这个网格体自己的轴）", world: "世界", normal: "法向（选中的面朝外 = Z）" };
const WORLD = { x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } } as const;

export class MeshHandles {
  /** 鼠标悬停的把手（高亮；拖着的时候换成正抓着的那个）。 */
  private hot: string | null = null;
  readonly family: HandleFamily;
  constructor(family: HandleFamily) { this.family = family; }

  /** 这一刻的手柄：开着（变换 = 一直开着）∧ 有选区才有。原点 = 选区的点的平均（世界）；轴 = 朝向（物件 / 世界 / 法向）。 */
  gizmo(ctx: ToolCtx): XformGizmo | null {
    if (this.family !== "transform" && !ctx.config.get("handles", "show")) return null;
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
    if (q && this.family === "transform") pts.push({ id: "su", d: Math.hypot(q.x + XG_UNIFORM_OFFSET_PX - s.x, q.y - XG_UNIFORM_OFFSET_PX - s.y), z: -1 });
    for (const c of hitXformGizmo(g, ctx.frame(), ctx.vp(), s.x, s.y, LAYOUT[this.family])) if (parts.includes(PART_OF(c.handle))) (c.handle[0] === "r" ? rings : pts).push({ id: c.handle, d: c.d, z: c.z });
    const hit = ctx.eps().hit, i = pickHandle(pts, hit), j = i < 0 ? pickHandle(rings, hit) : -1;
    const p = i >= 0 ? pts[i] : j >= 0 ? rings[j] : null;
    if (!p) return null;
    const op = this.family === "transform" ? OP_OF(p.id) : this.family === "pull" ? undefined : this.family;
    if (p.id === "mc") return { id: "mc", axis: null, plane: null, op, say: CENTER_SAY[this.family] };
    if (p.id === "su") return { id: "su", axis: null, plane: null, op, say: "等比缩放" };
    if (p.id[0] === "p") { const { a, b, n } = planeAxes(p.id); return { id: p.id, axis: null, plane: g.axes[n], op, say: `在 ${a.toUpperCase()}${b.toUpperCase()} 面里${op === "scale" && this.family === "transform" ? "缩放" : ""}` }; }
    const ax = p.id[1] as AxisName;
    return { id: p.id, axis: g.axes[ax], plane: null, op, say: `${p.id[0] === "r" ? "绕" : "沿"} ${ax.toUpperCase()} 轴${this.family === "transform" ? (p.id[0] === "m" ? "挪" : p.id[0] === "r" ? "转" : "缩放") : ""}` };
  }
  /** 鼠标悬停：记下光标下的把手（高亮）。 */
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { this.hot = this.grip(ctx, s)?.id ?? null; }
  /** 换下一个朝向（物件 → 世界 → 法向 → 物件）；返回提示行那一句。 */
  cycleOrient(ctx: ToolCtx): string {
    const cur = ctx.config.get("handles", "orient"), next = ORIENTS[(ORIENTS.indexOf(cur as (typeof ORIENTS)[number]) + 1) % ORIENTS.length];
    ctx.config.set("handles", "orient", next);
    return `手柄朝向：${ORIENT_SAY[next]}（再点一下换下一个；右下「朝向」直接选）`;
  }
  /**
   * 点一下之后（选法已经跑完）：onSelection = 这一下点在已经选着的东西上、不是双击（selecting.ts clickSelect 的返回）。
   * 点第二下 = 出手柄；手柄已经在 = 换朝向；选到别的 / 点空了 = 收起（变换的手柄一直挂着，只换朝向）。返回提示行那一句（null = 不说）。
   */
  afterTap(ctx: ToolCtx, ev: ToolPointer, onSelection: boolean): string | null {
    const shown = this.gizmo(ctx) !== null;
    if (onSelection && shown) return this.cycleOrient(ctx);
    if (this.family === "transform") return null;
    if (onSelection && HANDLES_ON_TAP[deviceOf(ev.pointerType)]) { ctx.config.set("handles", "show", true); return this.say(); }
    ctx.config.set("handles", "show", false);
    return ctx.hasSelection() ? "选中了；再点一下选中的东西 = 出手柄（快速点两下 = 双击，那是另一回事）" : null;
  }
  private say(): string {
    const tail = "；再点一下 = 换朝向，点空处收起";
    return this.family === "move" ? `手柄：拖箭头 = 沿那根轴、拖小方片 = 在那个面里、拖中心 = 随手拖${tail}`
      : this.family === "rotate" ? `手柄：拖哪个环 = 绕哪根轴转、拖中心 = 绕视线转${tail}`
        : this.family === "scale" ? `手柄：拖方头箭头 = 沿那根轴、拖小方片 = 在那个面里、拖中心 = 等比${tail}`
          : `手柄：拖箭头 = 沿那根轴挤、拖中心 = 换一种拖法（面 = 随手拖、边 / 点 = 沿各自的垂直方向）${tail}`;
  }
  /** 这一帧画什么。drag = 正在拖：原点跟着预演走（被挪的点现在的平均，世界），高亮正抓着的那个；没开 = 什么都不加。 */
  view(ctx: ToolCtx, drag: { origin: Pt3 | null; id: string | null } | null): Partial<ViewState> {
    const g0 = this.gizmo(ctx);
    if (!g0) return {};
    const g = drag?.origin ? { ...g0, origin: drag.origin } : g0;
    let uniform: Pt3 | null = null;   // 变换的等比块：屏上中心右上方那一点，落在过原点、正对相机的平面上（硬表面变换工具同款）
    const q = this.family === "transform" ? ctx.frame().project?.(g.origin, ctx.vp()) : null;
    if (q) { const r = ctx.frame().ray(q.x + XG_UNIFORM_OFFSET_PX, q.y - XG_UNIFORM_OFFSET_PX, ctx.vp()), n = ctx.frame().viewDir(g.origin); uniform = rayPlane(r.origin, r.dir, n, dot3(n, g.origin)); }
    return { xformGizmo: { ...xformGizmoGeom(g, ctx.frame(), ctx.vp(), LAYOUT[this.family]), hot: drag ? drag.id : this.hot, uniform, parts: PARTS[this.family] } };
  }
}
