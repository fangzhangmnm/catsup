// view-state.ts —— 编辑器这一帧的视图状态（选区 / 悬停 / 吸附 / 尺规 / gizmo / 网格 / 文字…）+ 交给后端的一帧输入 `frameInput`。
// Tron 第一刀 6c（v0.17.9，Claude Fable 5.1）：`ViewState` 从 render3 整个搬到编辑器侧——它是**编辑器的类型**（含内核 id / 吸附 / 参考几何 / 坐标架），
// 引擎不认识它；后端只看到 `FrameInput`（相机 + 视口 + XR 近平面 + 地面网格 + 叠加层回调）。内容走流提供者，不在这里。
import type { FrameInput, OverlayCtx, OverlayItem } from "../minccino/index.ts";
import { translateAux } from "../look/aux.ts";
import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { Snap3 } from "./pick.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import { type Frame, WORLD_FRAME } from "../scene/xform.ts";
import type { WorldLabel } from "./world-labels.ts";
import type { WorldView } from "../scene/world-view.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import { overlayItems } from "./overlay.ts";
import { highlightItems, highlightMarks, type MarkLayout } from "./highlight.ts";

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
  /** 修复面板「检查」要标出来的边（橙色；软边也画——标的就是看起来平、其实折过的软边，DT9）。null / 缺 = 没有。 */
  warnEdges?: ReadonlySet<EdgeId> | null;
  hoverEdge: EdgeId | null;
  hoverFace: FaceId | null;
  snap: Snap3 | null;
  snapAnchor: Pt3 | null;      // axis 锁的虚线起点
  /** checkpoint 代数（editor.revision）：几何缓存键的一部分。 */
  revision?: number;
  /** 透视近平面下限（第一人称 0.05；轨道默认 0.5）。 */
  near?: number;
  /** X 光开着（隐线标记 + 选中边透视；刀 d）。 */
  xray?: boolean;
  /** teleport 弧线（充能中）：折线 + 合法性 + 落点。 */
  teleport?: { points: readonly Pt3[]; valid: boolean; landing: Pt3 | null } | null;
  /** 放置的胶囊虚影（步行「点一下落在哪」；player/placement.ts）：脚底、半径、身高、站得下吗（绿 / 红）。 */
  capsule?: { feet: Pt3; radius: number; stature: number; ok: boolean } | null;
  /** 变暗的池槽序号（进了 group / 组件后，上下文之外的几何；SU 同款淡出）。null = 不变暗。2026-10-21 */
  dimSlots?: ReadonlySet<number> | null;
  /** 缩放柄（世界点；active = 正在拖的那个）。 */
  handles?: readonly { p: Pt3; active: boolean }[] | null;
  /** 量角器：圆心 + 转轴 + 参考点 + 当前角（弧度）。 */
  protractor?: { center: Pt3; axis: Pt3; ref: Pt3 | null; angle: number; /** 圆环至少多大（世界长度；新建第二步 = 套在基本体外面，不被它挡住）；不给 = 屏上 60 px。 */ minRadius?: number } | null;
  /** 参考几何（活动池，世界坐标；0.11 尺规纪元）。 */
  guides?: GuidesWorld | null;
  /** 选中的参考线 / 参考点 id（A31）：画成选中色。 */
  guideSel?: ReadonlySet<number>;
  /** A33 断口提示：一根直线中间断了一截的接点（世界坐标 + 边向）→ 屏幕定长的小垂线（焊边橡皮刮一下就没）。 */
  ticks?: readonly { p: Pt3; dir: Pt3 }[] | null;
  /** 世界里的文字（world-labels.ts 深模块；第一个用户 = X 轴 +1 个单位处的「1 m」）。 */
  labels?: readonly WorldLabel[] | null;
  /** Z 轴刻度间距（米；1 m 或 1 ft；user「我还是希望z轴有刻度。可以用那种我们之前用过的小短线」）；null = 不画。 */
  axisTickM?: number | null;
  /** X 轴 +1 个单位处那根小短线（跟「1 m」字一起，只在空场景）。 */
  axisUnitX?: number | null;   // X 轴上「一格多长」标记的位置（米；DT16 跟格子走）；null = 不画
  /** 上下文的帧（世界坐标）：不是世界帧时画三色上下文轴。 */
  frame?: Frame | null;
  /** 地面网格（0.11 ⑤）：跟上下文的帧走（user「网格帧 = 绘图轴」），格距 = 网格开着时的 step、否则 1 m；三色轴 = 帧的三轴。不给 = 世界帧 1 m。 */
  grid?: { frame: Frame; step: number; sub?: number; on?: boolean } | null;
  /** 选中的点（2026-10-26，user「以及我们还是希望我们能选点」「为什么不是简简单单高亮点？」）：只画实心圆点。世界坐标。 */
  selVerts?: readonly Pt3[] | null;
  /** 全部顶点的小点（自由建模；key 变了才重建）。 */
  vertDots?: { key: string; pts: readonly Pt3[] } | null;
  /** X 光面点（每张面中心一个小方点、不被挡；sel = 这张面选中着，画强调色）。 */
  faceDots?: { key: string; pts: readonly Pt3[]; sel: readonly boolean[] } | null;
  /** 正在编辑的网格体的平滑边（自由建模；淡色细线，和画出来的棱拉开差距——user 10-28「软边是编辑的时候和硬边拉开差距」；key 变了才重建）。 */
  softEdges?: { key: string; segs: readonly { a: Pt3; b: Pt3 }[] } | null;
  /** 镜像（自由建模，FM23「看得见：镜像面淡淡画出来，中缝上的点高亮」）：镜像面的淡框 + 中缝上的点。 */
  mirror?: { key: string; seam: readonly Pt3[] } | null;
  /** 充能点 / 充能边（0.11.6，user「让充能点有个小标记」）：点画小菱形，边画淡淡的延长线。 */
  charged?: { points: readonly Pt3[]; edges: readonly { a: Pt3; b: Pt3 }[] } | null;
  /** 平面 gizmo（镜像面，DT23 / DT26；plane-gizmo.ts gizmoGeom 的输出 + 悬停的把手）：半透明方块 + 描边 + 法线箭头 + 两个转动把手 + 中心，透视画。 */
  planeGizmo?: { origin: Pt3; normal: Pt3; u: Pt3; v: Pt3; size: number; hot: string | null } | null;
  /** 选中的组 / 组件的轴（世界帧，DT15）：透视画小三轴（被几何挡住也看得见），原点可吸。 */
  poolAxes?: readonly Frame[] | null;
  /** 空组件（导入的空节点，T11）的小三轴：常驻、透视画，长度同 poolAxes；点它的标记 = 点它（编辑器 emptyAt）。 */
  emptyAxes?: readonly Frame[] | null;
  /** 组件原点（DT86）：组件里另摆了坐标架、和原点不在一处时，原点处画一个淡小三轴（披露「现在是两个」）；同上画法、半透明。 */
  originAxes?: readonly Frame[] | null;
  /** 锁看得见：锁着的轴 / 面里的两根轴（过锚点或变换中心；controller/lock-guide.ts）。透视画在最上面。 */
  lockLines?: readonly { readonly through: Pt3; readonly dir: Pt3; readonly color: "x" | "y" | "z" | "n" }[] | null;
  /** 变换工具的移动箭头 + 旋转环（transform-gizmo.ts xformGizmoGeom 的输出 + 悬停 / 拖着的把手）：RGB = XYZ，透视画（2026-10-26）。 */
  xformGizmo?: { origin: Pt3; axes: { x: Pt3; y: Pt3; z: Pt3 }; arrow: number; ring: number; start: number; cube?: number; cubeHalf?: number; plane?: number; planeHalf?: number; uniform?: Pt3 | null; hot: string | null } | null;
  /** 卷尺预演：量线 a→b + 候选参考线 / 参考点（0.11）。 */
  tape?: { a: Pt3; b: Pt3; guide?: { p: Pt3; dir: Pt3 } | null; point?: Pt3 | null } | null;
  /** 切割的刀线（上一个落点 → 光标）：永远画在最上面、不被几何挡（user 10-27「线还是需要画的，以及线不要被别的遮挡了。这样用户知道自己没退出刀」）；valid = 这一刀切得出来。 */
  knifeLine?: { a: Pt3; b: Pt3; valid: boolean } | null;
}

/**
 * 这一帧交给后端的输入：相机 / 视口原样（轨道相机结构上满足引擎的 CameraSource）、XR 近平面、地面网格（跟上下文帧与格距走），
 * 叠加层 = 选中高亮（editor/highlight.ts，按键缓存）+ 其余（editor/overlay.ts），引擎调回调时才算、并给量尺。
 */
export function frameInput(world: WorldView, cam: OrbitCamera, vp: Viewport, view: ViewState, layout: MarkLayout): FrameInput {
  return {
    camera: cam,
    viewport: vp,
    near: view.near,
    // 显示不细分（user 2026-10-25「即使开了，grid也不应该在显示层细分」）：吸附的 1/5、1/10 只管吸，不画成网格线——所以只递 step
    grid: { frame: view.grid?.frame ?? view.frame ?? WORLD_FRAME, step: view.grid?.step ?? 1 },
    marks: () => highlightMarks(world, view, layout),   // 选中 / 悬停的面 = 换材质槽的段（刀 b）
    // 辅助几何：编辑器只说「这是什么」，画风表翻成小栗鼠的 GL 量（look/aux.ts；设计稿 §7.1）
    overlay: (ctx: OverlayCtx): OverlayItem[] => translateAux([...highlightItems(world, view, layout), ...overlayItems(view, ctx)], ctx),
  };
}
