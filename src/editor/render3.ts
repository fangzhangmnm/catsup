// render3.ts —— three.js 适配层：把 kernel 状态 + 相机参数 + 预演影子副本画出来。
// 边界纪律：three 只在本文件出现；相机数学在 camera.ts、拾取/求解在 pick.ts/solver.ts（都不碰 three）。
// created by Claude Fable 5 2026-09-01（playground 耗材版）；**Workbench 雏形重写 2026-09-06 by Claude Fable 5.1**
//   （user：「perspective camera」「所有的面同一层灰色，好看一点」「线之间的 z fighting 和有时候有些线看不见…现在需要好好处理」
//    「可以开始做 workbench(blender renderer) 雏形」）。
// **retained-mode 重写 2026-09-07 by Claude Fable 5.1**（VR 首轮反馈；user：「你优化过 drawcall 吗……别还是当 direct mode 画的……」
//   「背景比如轴，地板网格也可以 batch」「尽量打包东西尽量少」）——此前每帧 dispose 整组 + 每张膜一个 Mesh/材质/earcut（direct mode），
//   XR 90 Hz 下就是 CPU 与 GC 的主要开销。现在：
//   - **draw call 清单（常态 3 个）**：① 网格+三轴 = 一份 LineSegments2（顶点色）；② 全部膜 = 一份 BufferGeometry（位置/法向/顶点色）
//     + 一个 ShaderMaterial（光照在 shader 里算，光向是 uniform，头一转不重建）；③ 全部边 = 一份 LineSegments2（顶点色分类别）。
//     吸附提示线 / 吸附小球 / teleport 弧线与落点环 = 持久节点，只在出现时 visible，各 +1。
//   - **缓存键**：膜几何键 = 内核身份 + revision + 选区/悬停；边几何键 = 内核身份 + revision + 选区/刮擦/悬停。键不变 = 零重建、零分配；
//     预演影子副本每次更新都是新 Kernel 对象（editor.ts clone），身份变 = 自然失效。
//   - 每帧只做：相机同步、光向 uniform、键比对、指示物位姿。不 new 几何/材质（除了键变时的那一次）。
//
// Workbench 雏形 = Blender 实体模式的观感：
//   - 面：统一灰、不透明、**按法向的平光**（key light 钉在相机系：|n·L| 映射亮度，双面对称、零灯光配置；颜色在 sRGB 空间直接乘亮度，
//     shader 不再过 colorspace 编码——与旧版 shade() 逐像素同值）；选中/悬停换蓝灰色。
//   - 边（0.9.2 翻案，user 2026-10-21「线稿能不能不要用实体的几何，而是用带像素宽度的线，不然vr很难看，pc也很卡通，伤性能」）：
//     **默认 = 原生 GL 线（THREE.LineSegments，1 设备像素，2 顶点/段，最省）**；选中 / 刮擦 / 悬停的边仍走粗线（要看得见）；
//     视图菜单「粗线稿」= 全部边走粗线（旧默认，setLineStyle("thick")）。原生线没有 polygonOffset，靠面后推（DEPTH.face）让共面线赢面。
//     旧注：1px LineBasicMaterial 在 iPad DPR2 下细成半 CSS 像素 = 「有些线看不见」的真身之一——所以粗线留作选项，不删。
//     粗线 = three addons LineSegments2（屏幕像素宽，DPR 无关），是三角形 → polygonOffset 生效：**面后推（DEPTH 阶梯）、线 −1/−2 前拉**，
//     共面线永远赢面、被真正挡住的线仍被挡——z-fight 的结构性修法，不再靠 depthOnly 预通道。
//   - 相机：两制（cam.projection）——正交 OrthographicCamera / 透视 PerspectiveCamera，near/far 随眼距布置（小零件贴近也不裁）。
//   - 顶点点不再常显（SU 观感）；吸附指示按屏幕像素定尺寸（透视按深度换算；XR 按角尺寸，比桌面小一半——user「vr 里面点球太大了」），
//     **走深度测试**（墙后的吸附点不再透视穿墙——user「workbench 的遮挡逻辑还是应该做好」）；充能源点不再显示（user「充能的点能不能不显示」，
//     机制照旧，对齐命中时提示线仍会出现）。
//   - XR 画质：three 默认 fixed foveation = 1.0（周边降分辨率）——白底细线是最吃这个的场景，本文件默认关到 0；framebuffer 缩放 1.0；
//     两者可由 setXRQuality 覆盖（main.ts 读 URL ?xrfov= ?xrscale= 给真机 A/B）。粗线的 resolution/linewidth 在 XR 每帧按每眼 viewport 换算
//     （此前沿用桌面 canvas 尺寸——XR 里线宽/纵横比都是错的）。

import * as THREE from "three";
import { type WorldLabel, anchorCenter, rasterizeLabel } from "./world-labels.ts";
import { LineSegments2 } from "../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../vendor/three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "../vendor/three/addons/lines/LineMaterial.js";
import { perf } from "./perf-stats.ts";
import type { EdgeId, FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView, PoolSlot, WorldView } from "../scene/world-view.ts";
import { ID_STRIDE, slotKey } from "../scene/world-view.ts";
import { poolKey } from "../scene/scene.ts";
import type { Kernel } from "../kernel/kernel.ts";
import type { Material, Scene } from "../scene/scene.ts";
import { type Frame, type Xform, WORLD_FRAME } from "../scene/xform.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import type { Snap3 } from "./pick.ts";
import { cross3, dot3, sub3 } from "../kernel/geom.ts";
import { PoolMesh, type PoolMeshEnv, type TexSide, fanNormal } from "./pool-mesh.ts";
import { SPHERE_RINGS, circlePoints } from "./guide-pick.ts";
import type { RigPose } from "../player/player.ts";
import type { Ray } from "../player/world-query.ts";

/** XR 会话面（vr.ts 消费；three 对象一律 any，不出本文件）。 */
export interface XRFacade {
  isPresenting(): boolean;
  setSession(session: XRSession | null): Promise<void>;
  session(): XRSession | null;
  frame(): XRFrame | null;
  refSpace(): XRReferenceSpace | null;
  on(type: "sessionstart" | "sessionend", cb: () => void): void;
}
export type XRHand = "left" | "right";

export const PALETTE = {
  background: 0xf2f0ea,
  face: 0xd6d6d6,
  faceSelected: 0x8fb4e8,
  faceHover: 0xb6cff0,
  faceDim: 0xe9e9e9,        // 上下文之外的几何（淡出）
  edgeDim: 0xb8b8b8,
  edge: 0x2a2a2a,
  edgeWire: 0x111111,
  edgeSelected: 0x2b6cb0,
  edgeHot: 0xcc3333,      // 刮擦/悬停将删
  edgeWarn: 0xd97706,     // 修复面板「检查」：微折软边
  grid: 0xd9d6cf,
  /** 网格正片叠底的系数色（× 背景 ≈ 原 grid 灰）：主线 / 细线；压在深色材质上只暗 ~10% / ~5%。 */
  gridMajor: 0xe3e1dc, gridMinor: 0xf0eeea,
  axisX: 0xcc3333,
  axisY: 0x2e8b57,
  axisZ: 0x2b6cb0,
} as const;

const SNAP_COLORS: Record<string, number> = {
  endpoint: 0x2e8b57,
  midpoint: 0x00a5a5,
  "on-edge": 0xcc3333,
  origin: 0x8b5cf6,
  align: 0x8b5cf6,
  "align-combo": 0x8b5cf6,
  "edge-align": 0xcc3333,
  intersection: 0x111111,
  "cross-line": 0x111111,
  "axis-x": PALETTE.axisX,
  "axis-y": PALETTE.axisY,
  "axis-z": PALETTE.axisZ,
  "h-stop": 0xd97706,
  "on-face": 0x2b6cb0,
  "on-guide": 0x6b7280,
  "guide-point": 0x6b7280,
  "guide-cross": 0x111111,
  "grid-point": 0x9ca3af,
  increment: 0xd97706,
  "on-extension": 0x8b5cf6,
  center: 0x2b6cb0,
  "pool-origin": 0x111111,
};
const CHARGED_COLOR = 0x8b5cf6, CHARGED_EXT_COLOR = 0xd4d0f5, CHARGED_PX = 5;
/** 选中的点：圆点直径（CSS px）。 */
const SEL_VERT_DOT_PX = 9;
/** DT15 选中的组 / 组件的轴：每根短轴的屏幕长度（CSS px）。 */
export const POOL_AXES_PX = 22;
/** 平面 gizmo 的颜色（常态 / 悬停）。 */
const GIZMO_COLOR = 0x2b6cb0, GIZMO_HOT = 0xd97706;
/** 参考几何（0.11 尺规纪元）：参考线画到视野最远处（视觉上 = 无限；2026-10-26 以前写死 ±200 m），参考点画三轴小叉（像素尺寸）。 */
const GUIDE_COLOR = 0x6b7280, GUIDE_SEL_COLOR = 0x2b6cb0, GUIDE_POINT_PX = 6;   // 选中 = 与选中膜同一个蓝（A31）
/** A33 断口小垂线：半长 px + 颜色（提醒色，与参考线 / 充能区分）。 */
/** A33 断口小垂线：半长 = 线宽 × TICK_K、颜色 = 边线色、粗细 = 边线（user 2026-10-24「首先应该黑色，其次应该小一点不显眼……线宽的多少倍……相当于线上面多一个鼓包这样，但是看得出是一个线头」；此前橙色、半长固定 5 px）。 */
const TICK_K = 2;

const AXIS_COLORS: Record<string, number> = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ, u: 0x888888, v: 0x888888, i: 0x111111 };
const TP_OK = 0x2e8b57, TP_BAD = 0xcc3333;

/** 线稿风格：pixel = 原生 GL 线 1 设备像素（默认）；thick = 屏幕像素宽粗线（LineSegments2）。 */
export type LineStyle = "pixel" | "thick";
/** X 光下被挡住的边画多淡（不透明度，0–1）。 */
const XRAY_OPACITY = 0.35;
const EDGE_PX = 1.6;        // 边线宽（CSS px；旧 thick 风格 + 选中 / 刮擦 / 悬停边的基准；0.12.3 起由 lineWeight 覆盖）
/**
 * 线稿粗细（0.12.3；user 2026-10-24「ipad上面细线稿是不舒服。但是粗线稿又太粗了，有1.5这种选项吗」「sketchup里面粗细线是有区分的啊, dangling edge和轮廓是粗线」）：
 * 单位 = **设备像素**。1 = 原生 GL 线（最细、最快，没有轮廓区分）；> 1 = 屏幕空间粗线（LineSegments2，不是 3D 实体），
 * 并按 SU 轮廓线规则加粗：零面边（悬空）/ 单面边（边界）/ 两张面朝向相反的边（剪影）= 轮廓，比内边粗 profileAdd；判定在顶点着色器里按实例做，相机转动不重建几何。
 */
export const LINE_WEIGHTS: readonly number[] = [1, 1.5, 2, 3];
const profileAddFor = (w: number): number => Math.min(w, 5 - w);   // 轮廓 ≈ 两倍粗，总宽不超过 5 设备像素
const OTHER_KEY = { other: true } as const;   // rebuildFaces 分组键：别的池的纯色面
const HINT_PX = 1.2;        // 吸附提示线宽
const STATIC_PX = 1.2;      // 网格 + 三轴（同一份粗线，只能一个宽度；轴靠颜色区分）
const ARC_PX = 2.5;
const SNAP_MARKER_PX = 5;
/** 网格：1 m 一格、±50 m（PC/VR 同一份；user 2026-09-07「vr 和 pc 的网格都是 1m，不应跟 branch」；无限/自适应网格 = A12）。 */
const GRID_STEP = 1, GRID_N = 50;
/** XR 里「屏幕像素」的定义：指示物角尺寸 = px / XR_PX_PER_DEG 度。桌面 800 px / 50° = 16 px/°；VR 取 32 = 同 px 数只有桌面一半大。 */
const XR_PX_PER_DEG = 32;
/** XR 粗线 px → 设备像素倍率：每眼 viewport 高 / 900（桌面里这个角色是 DPR）。 */
const XR_LINE_REF_H = 900;
const XR_DEFAULT = { foveation: 0, framebufferScale: 1.0 };

/** 一个 kernel（池）的一份 GPU 几何（本地坐标；同 definition 的所有实例共用，各自一个矩阵）。变体键 = 池版本 | definition | 材质表长 | 淡出 | 线稿风格。 */
/** 贴图网格画哪一侧（DT8 两个表面）：double = 两侧同一张贴图；front / back = 只画 +n / −n 那侧。 */
/**
 * 一个池网格（pool-mesh.ts）在显卡上的样子（DT96，2026-10-26）：每组面一对几何（正常 / 淡出），共用位置、法线缓冲，只是 aColor 绑的颜色缓冲不同；
 * 线同理。每份几何都把「另一套颜色」也挂在一个着色器不用的名字下——three 画一份几何时把它挂着的缓冲全传上去，
 * 这样没被画的那套颜色的局部上传也不会一直攒着。缓冲直接包池网格的大数组（不拷），改过哪段只传哪段（addUpdateRange）。
 */
interface GpuFaces { readonly key: string; readonly mat: Material | null; readonly side: TexSide | null; readonly attrs: Record<string, any>; readonly geo: any; readonly geoDim: any; }
interface GpuLines { readonly thick: boolean; readonly bufs: Record<string, any>; readonly geo: any; readonly geoDim: any; }
interface PoolGpu { readonly mesh: PoolMesh; faces: Map<string, GpuFaces>; lines: GpuLines | null; gen: number; }
/** 一个槽（实例 / group 出现的一个位置）的 three 节点：一个 Group 带矩阵，下面纯色面 / 贴图面 / 原生线 / 粗线，几何全是共享引用。 */
interface SlotNodes { root: any; plain: any; tex: { mesh: any }[]; pixel: any; thick: any; /** X 光（DT17）：同一份线几何再画一遍，不做深度测试、半透明 = 被面挡住的边透出来。 */ xpixel: any; xthick: any; gen: number; }

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
  /** 修复面板「检查」要标出来的边（橙色；软边也画——标的就是看起来平、其实折过的软边，DT9）。null / 缺 = 没有。 */
  warnEdges?: ReadonlySet<EdgeId> | null;
  hoverEdge: EdgeId | null;
  hoverFace: FaceId | null;
  preview: GeomView | null;    // 影子副本（预演即提交；WYSIWYG 期间整场景画它）；2026-10-21 起编辑器直接递合成好的世界视图，此字段多为 null
  snap: Snap3 | null;
  snapAnchor: Pt3 | null;      // axis 锁的虚线起点
  /** checkpoint 代数（editor.revision）：几何缓存键的一部分。 */
  revision?: number;
  /** 透视近平面下限（第一人称 0.05；轨道默认 0.5）。 */
  near?: number;
  /** teleport 弧线（充能中）：折线 + 合法性 + 落点。 */
  teleport?: { points: readonly Pt3[]; valid: boolean; landing: Pt3 | null } | null;
  /** 变暗的池槽序号（进了 group / 组件后，上下文之外的几何；SU 同款淡出）。null = 不变暗。2026-10-21 */
  dimSlots?: ReadonlySet<number> | null;
  /** 缩放柄（世界点；active = 正在拖的那个）。 */
  handles?: readonly { p: Pt3; active: boolean }[] | null;
  /** 量角器：圆心 + 转轴 + 参考点 + 当前角（弧度）。 */
  protractor?: { center: Pt3; axis: Pt3; ref: Pt3 | null; angle: number } | null;
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
  /** 变换工具的移动箭头 + 旋转环（transform-gizmo.ts xformGizmoGeom 的输出 + 悬停 / 拖着的把手）：RGB = XYZ，透视画（2026-10-26）。 */
  xformGizmo?: { origin: Pt3; axes: { x: Pt3; y: Pt3; z: Pt3 }; arrow: number; ring: number; start: number; cube?: number; cubeHalf?: number; plane?: number; planeHalf?: number; uniform?: Pt3 | null; hot: string | null } | null;
  /** 卷尺预演：量线 a→b + 候选参考线 / 参考点（0.11）。 */
  tape?: { a: Pt3; b: Pt3; guide?: { p: Pt3; dir: Pt3 } | null; point?: Pt3 | null } | null;
}

/** 地面网格 = 一张 shader 平面（Blender 式；user 2026-10-24「根治，修……z-fight 加一个 z-offset」）：主线每 uStep、细线每 uStep/uSub，像素定宽（fwidth 抗锯齿），
 *  太密自动淡出；正片叠底只变暗底下的东西；polygonOffset 前拉 = 贴在 z=0 的面不再 z-fight，网格直接「印」在地面材质上。 */
const GRID_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
/**
 * 深度阶梯（polygonOffset units；factor 一律 1 / 0 / −1，见各处）——一处定，别处只引用（2026-10-24 Claude Opus 5.5，
 * user「边线应该优先于axis和grid，而不是被axes挡住」，10-25「画面」）。从后到前：
 *   面（别的池 9 → 活动池 6 → 覆盖层 5，factor +1）  <  栅格 / 三色轴（units +4、深度测试严格小于）  <  边（原生细线真实深度、粗线 −1/−2 前拉）。
 * 每一档至少差 1 个 unit：原生细线严格在轴前（10-25 实测：同深度时细线和轴按采样点各赢一半 → 暗红线）；轴也不比边粗（syncLineScale）。
 */
const DEPTH = { face: 6, faceOther: 9, faceOverlay: 5, guide: 4 } as const;   // guide = 栅格 / 三色轴：比原生细线（0）后 4 档（细线与粗线插件的深度插值有噪声）、比覆盖层面（5）前 1 档
const GRID_FRAG = /* glsl */`
  uniform float uStep, uSub, uPx;
  uniform vec3 uMajor, uMinor;
  varying vec2 vUv;
  float lineMask(vec2 coord, float spacing, vec2 d, float px) {
    vec2 g = abs(fract(coord / spacing - 0.5) - 0.5) * spacing;   // 到最近格线的距离（世界）
    vec2 w = d * px * 0.5;                                          // 半线宽（世界）
    vec2 a = vec2(1.0) - smoothstep(w - d, w + d, g);
    return max(a.x, a.y);
  }
  void main() {
    vec2 d = fwidth(vUv);
    float dm = max(d.x, d.y) + 1e-9;
    float major = lineMask(vUv, uStep, d, uPx) * smoothstep(3.0, 9.0, uStep / dm);
    float minor = 0.0;
    if (uSub > 1.5) { float sp = uStep / uSub; minor = lineMask(vUv, sp, d, uPx) * smoothstep(4.0, 14.0, sp / dm); }
    if (major < 0.004 && minor < 0.004) discard;
    vec3 col = mix(vec3(1.0), uMinor, minor);
    col = mix(col, uMajor, major);
    gl_FragColor = vec4(col, 1.0);   // MultiplyBlending：result = dst × col
  }`;
const FACE_VERT = /* glsl */`
  attribute vec3 aColor;
  attribute vec3 aColorB;
  varying vec3 vColor;
  varying vec3 vColorB;
  varying vec3 vNormal;
  void main() {
    vColor = aColor; vColorB = aColorB;
    vNormal = normalMatrix * normal;   // 视空间（每槽自己的矩阵、非均匀缩放 / 镜像都对）；uLight 也按视空间喂
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const FACE_FRAG = /* glsl */`
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vColorB;
  varying vec3 vNormal;
  void main() {
    // 两个表面（DT8）：三角绕 +n 逆时针 → 正面朝着看 = 看到 +n 那侧（aColor），背面 = −n 那侧（aColorB）；负值 = 那侧归贴图网格画，这里不画
    vec3 c = gl_FrontFacing ? vColor : vColorB;
    if (c.r < 0.0) discard;
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    gl_FragColor = vec4(c * k, 1.0);   // 颜色已是 sRGB，直接出（与旧 shade() 同值）
  }`;
const TEX_VERT = /* glsl */`
  attribute vec2 aUv;
  attribute vec3 aColor;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() { vUv = aUv; vColor = aColor; vNormal = normalMatrix * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TEX_FRAG = /* glsl */`
  uniform vec3 uLight;
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    vec3 c = texture2D(uMap, vUv).rgb * vColor;
    gl_FragColor = vec4(c * k, 1.0);
  }`;

/** 0xRRGGBB → sRGB 浮点三元（膜 shader 用；不过 three 的色彩管理）。 */
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

export class Renderer3 {
  private renderer: any;
  private scene: any;
  private camOrtho: any;
  private camPersp: any;
  private dpr = 1;
  private flatRes = { w: 1, h: 1 };
  private resolution: any;               // 所有 LineMaterial 共享的 resolution uniform（Vector2，原地改）
  private lineMats: any[] = [];          // 共享粗线材质（linewidth 随 lineScale 原地改）
  private lineMatPx: number[] = [];
  // ---- 持久节点（retained）----
  private faceMesh: any; private faceMat: any;
  // ---- 池级几何（#22 池级局部性，2026-10-21）：每个槽一组节点 + 每个 kernel 一份共享几何；选中 / 悬停走覆盖层 ----
  private faceMatTop: any;                          // 覆盖层材质（polygonOffset 0：压在底几何上）
  private pixelMat: any;                            // 原生线材质（顶点色，共享）
  private texMats = new Map<object, any>();         // 贴图材质对象 → 共享 ShaderMaterial（uMap）
  private slotNodes = new Map<string, SlotNodes>();
  /** 池（poolKey）→ 池网格：通常一个；同一帧一个池要画两个不同的内核（少见）就多开一个。两代没人用的释放。 */
  private poolGpus = new Map<string, PoolGpu[]>();
  /** 材质对象 → 小整数（材质槽签名用：槽表只追加 = 池网格增量；别的变化 = 全量）。 */
  private matUids = new WeakMap<Material, number>(); private nextMatUid = 1;
  private syncGen = 0;
  private poolKey = ""; private overlayKey = "";
  private emptyGeo: any; private emptyLineGeo: any;
  private texMeshes: { mesh: any; mat: any; tex: any; key: string }[] = [];   // 每种贴图材质一份网格（自己的 UV）
  private texCache = new Map<object, any>();                                  // Material 对象 → three Texture（原图解码一次）
  private faceMeshOther: any; private faceMatOther: any;
  private edgeLines: any; private edgeMat: any;
  private edgePixel: any;                 // 原生 GL 线（1 设备像素）：默认线稿
  private lineStyle: LineStyle = "pixel";
  /** X 光（DT17）：开着 = 池的边透过面画淡的、选中的边不被挡。 */
  private xray = false;
  private xrayPixelMat: any; private xrayThickMat: any; private xrayOverlayMat: any;
  private lineWeight = 1;                              // 设备像素；1 = 原生线
  private readonly profileAdd = { value: 1 };          // 轮廓线加粗（设备像素）；edgeMat 的 shader uniform
  private hintLines: any;
  private snapMarker: any;
  private arcLines: any; private landingRing: any;
  private handleMarkers: any[] = [];
  private xgLines: any; private xgKey = ""; private xgSolids: any[] = [];   // 变换 gizmo（2026-10-26）
  private protractorLines: any;
  /** 世界里的文字：按 id 管面片（world-labels.ts 出位图；字 / 样式没变不重画）。 */
  private labelSprites = new Map<string, { sprite: any; key: string; w: number; h: number }>();
  private guideLines: any; private tapeLines: any; private gridMesh: any = null; private gridMat: any = null; private axesObj: any = null; private chargedLines: any; private selVertDots: any; private selVertKey = ""; private tickLines: any; private poolAxesLines: any; private poolAxesKey = ""; private emptyAxesLines: any; private emptyAxesKey = ""; private originAxesLines: any; private originAxesKey = ""; private gizmoLines: any; private gizmoQuad: any; private gizmoKey = "";
  private faceKey = ""; private edgeKey = ""; private hintKey = ""; private protKey = ""; private guideKey = ""; private tapeKey = ""; private gridKey = ""; private chargedKey = ""; private tickKey = "";
  private kernelIds = new WeakMap<object, number>();
  private nextKernelId = 1;
  private scratchV = new THREE.Vector3();
  private scratchV2 = new THREE.Vector3();
  private scratchM = new THREE.Matrix4();
  private tmpColor = new THREE.Color();
  // ---- XR（0.4 VR 纪元）----
  // rig = 三层模型的中间层：rig 局部 = WebXR 追踪空间（Y 上）；rig.quaternion = Rz(heading)·Rx(90°) 把它挂进 Z 上世界（渲染层的
  // Y-up 只活在 rig 子树里，世界坐标永远 Z 上——CatsUp 坐标约定）。camPersp 是 rig 的子节点：flat 由 syncCamera 写绝对姿态（rig 单位阵），
  // XR 会话中 three 的 WebXRManager 把 HMD 姿态写进 camPersp（rig 局部）。控制器/手腕面板也挂 rig 下。
  private rig: any;
  private controllers: any[] = [];
  private grips: any[] = [];
  private hands: ("none" | "left" | "right")[] = ["none", "none"];
  private pointerVis: { line: any; cursor: any }[] = [];
  private wrist: { mesh: any; tex: any; inv: any } | null = null;
  readonly xr: XRFacade;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.background);
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.camPersp = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    this.resolution = new THREE.Vector2(1, 1);
    this.rebuildGrid(WORLD_FRAME, 1, 1);

    // 膜：一份几何 + 一个 shader（光向 uniform）
    this.faceMat = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: { value: new THREE.Vector3(0, 0, 1) } },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face,
    });
    this.faceMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.faceMat);
    this.faceMesh.frustumCulled = false; this.faceMesh.visible = false;
    this.scene.add(this.faceMesh);
    // 别的池的面：同一 shader、polygonOffset 再往后推一格 → 共面重叠时活动池 / loose 几何赢（#25 user「overlap的时候优先显示loose geometry」）
    this.faceMatOther = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: this.faceMat.uniforms.uLight },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOther,
    });
    this.faceMeshOther = new THREE.Mesh(new THREE.BufferGeometry(), this.faceMatOther);
    this.faceMeshOther.frustumCulled = false; this.faceMeshOther.visible = false;
    this.scene.add(this.faceMeshOther);
    // 覆盖层（选中 / 悬停的面）：同 shader、polygonOffset 0 → 压在各槽底几何（1 / 4）上面
    this.faceMatTop = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: this.faceMat.uniforms.uLight },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOverlay,
    });
    this.pixelMat = new THREE.LineBasicMaterial({ vertexColors: true });
    this.emptyGeo = new THREE.BufferGeometry();
    this.emptyLineGeo = new LineSegmentsGeometry();
    // 边：一份粗线（顶点色）+ SU 轮廓线（per-instance 两侧面法向 + 面数 → 着色器里判剪影 / 边界 / 悬空，加粗 profileAdd）
    this.edgeMat = this.lineMat(EDGE_PX, { offset: true, vertexColors: true });
    const profileAdd = this.profileAdd;
    this.edgeMat.onBeforeCompile = (shader: { uniforms: Record<string, unknown>; vertexShader: string }): void => {
      shader.uniforms.profileAdd = profileAdd;
      shader.vertexShader = shader.vertexShader
        .replace("uniform float linewidth;", "uniform float linewidth;\nuniform float profileAdd;\nattribute vec3 instanceW1;\nattribute vec3 instanceW2;\nattribute float instanceFlag;")
        .replace("float aspect = resolution.x / resolution.y;", `float aspect = resolution.x / resolution.y;
			// SU 轮廓线：flag = 这条边的面数（0 悬空 / 1 边界 / 2 内边或剪影 / 3+ 非流形）。剪影 = 两张面伸向「过这条边和视线的平面」的同一侧
			// （W1 / W2 = 两张面各自从这条边往面里走的方向；= profile-edges.ts isSilhouette 的 GLSL 镜像，改一边改另一边；F-87 / 2026-10-26）
			vec4 csA = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 csB = modelViewMatrix * vec4( instanceEnd, 1.0 );
			vec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? csA.xyz : vec3( 0.0, 0.0, - 1.0 );
			vec3 sm = cross( csB.xyz - csA.xyz, vdir );
			float sa = dot( mat3( modelViewMatrix ) * instanceW1, sm );
			float sb = dot( mat3( modelViewMatrix ) * instanceW2, sm );
			bool isProfile = instanceFlag < 1.5 || instanceFlag > 2.5 || ( sa * sb > 0.0 );
			float lw = linewidth + ( isProfile ? profileAdd : 0.0 );`)
        .replace("float hw = linewidth * 0.5;", "float hw = lw * 0.5;")
        .replace("offset *= linewidth;", "offset *= lw;");
    };
    this.edgeMat.customProgramCacheKey = (): string => "catsup-profile-edges";
    // X 光（DT17，2026-10-26）：池的边再画一遍（共用几何、不另占内存）+ 覆盖层不做深度测试；半透明渲染那半留 Tron 纪元
    this.xrayPixelMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: XRAY_OPACITY, depthTest: false, depthWrite: false });
    this.xrayThickMat = this.lineMat(EDGE_PX, { vertexColors: true });
    Object.assign(this.xrayThickMat, { transparent: true, opacity: XRAY_OPACITY, depthTest: false, depthWrite: false });
    this.xrayOverlayMat = this.lineMat(EDGE_PX + 1, { vertexColors: true });
    Object.assign(this.xrayOverlayMat, { depthTest: false, depthWrite: false });
    this.edgeLines = new LineSegments2(new LineSegmentsGeometry(), this.edgeMat);
    this.edgeLines.frustumCulled = false; this.edgeLines.visible = false;
    // 覆盖层（选中蓝 / 刮擦·悬停红）和底下的边同一个材质、同一个深度偏移 = 深度相等，LessEqual 下谁后画谁赢；
    // 不定先后就由 three 的排序随缘——粗线稿时黑边常常后画、把红线整条盖掉（user 2026-10-25「bug：橡皮擦的红线不见了。也许是zorder」）。
    // 定死覆盖层最后画；它没有轮廓属性 = 按悬空边加粗画，本来就比底下的黑边宽，盖得住。探针 probe-erase-red。
    this.edgeLines.renderOrder = 2;
    this.scene.add(this.edgeLines);
    // 边：原生 GL 线（默认线稿；顶点色）
    this.edgePixel = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true }));
    this.edgePixel.frustumCulled = false; this.edgePixel.visible = false;
    this.scene.add(this.edgePixel);
    // 吸附提示线（顶点色：轴色）
    this.hintLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.hintLines.frustumCulled = false; this.hintLines.visible = false;
    this.scene.add(this.hintLines);
    // 吸附小球（单位球，按屏幕像素缩放；走深度测试）
    this.snapMarker = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.snapMarker.visible = false;
    this.scene.add(this.snapMarker);
    // teleport 弧线 + 落点环
    this.arcLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(ARC_PX, { offset: true }));
    this.arcLines.frustumCulled = false; this.arcLines.visible = false;
    this.scene.add(this.arcLines);
    this.landingRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: TP_OK, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.85 }));
    this.landingRing.renderOrder = 9; this.landingRing.visible = false;
    this.scene.add(this.landingRing);
    // 缩放柄（14 个小方块，按屏幕像素定尺寸）：透视画、永远在最上面（user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」——看不见就点不中）
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x2e8b57, depthTest: false, depthWrite: false }));
      m.renderOrder = 10; m.visible = false;
      this.scene.add(m);
      this.handleMarkers.push(m);
    }
    // 量角器（圆环 + 刻度 + 参考线 + 当前角线）
    this.protractorLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.protractorLines.frustumCulled = false; this.protractorLines.visible = false;
    this.scene.add(this.protractorLines);
    // 参考几何（0.11）+ 上下文轴：各一份粗线
    this.guideLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.guideLines.frustumCulled = false; this.guideLines.visible = false;
    this.scene.add(this.guideLines);
    this.tapeLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.tapeLines.frustumCulled = false; this.tapeLines.visible = false;
    this.scene.add(this.tapeLines);
    this.chargedLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.chargedLines.frustumCulled = false; this.chargedLines.visible = false;
    this.scene.add(this.chargedLines);
    // 选中的点：实心圆点（屏幕像素大小、往相机拉一点不被自己的面吃掉）
    this.selVertDots = new THREE.Points(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Vector3(((PALETTE.edgeSelected >> 16) & 255) / 255, ((PALETTE.edgeSelected >> 8) & 255) / 255, (PALETTE.edgeSelected & 255) / 255) }, uSize: { value: SEL_VERT_DOT_PX } },   // 原样 sRGB 数值（ShaderMaterial 不做色彩空间换算；用 Color 会被转成线性、显得发暗）
      vertexShader: "uniform float uSize; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z -= 0.002 * gl_Position.w; gl_PointSize = uSize; }",
      fragmentShader: "uniform vec3 uColor; void main(){ vec2 d = gl_PointCoord - 0.5; if (dot(d, d) > 0.25) discard; gl_FragColor = vec4(uColor, 1.0); }",
    }));
    this.selVertDots.frustumCulled = false; this.selVertDots.visible = false; this.selVertDots.renderOrder = 4;
    this.scene.add(this.selVertDots);
    this.tickLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.tickLines.frustumCulled = false; this.tickLines.visible = false;
    this.scene.add(this.tickLines);
    // DT15 选中的组 / 组件的轴：透视（不做深度测试、最后画）——轴埋在几何里也看得见
    this.poolAxesLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { vertexColors: true }));
    this.poolAxesLines.material.depthTest = false; this.poolAxesLines.material.depthWrite = false;
    this.poolAxesLines.renderOrder = 10; this.poolAxesLines.frustumCulled = false; this.poolAxesLines.visible = false;
    this.scene.add(this.poolAxesLines);
    this.emptyAxesLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { vertexColors: true }));
    this.emptyAxesLines.material.depthTest = false; this.emptyAxesLines.material.depthWrite = false;
    this.emptyAxesLines.renderOrder = 10; this.emptyAxesLines.frustumCulled = false; this.emptyAxesLines.visible = false;
    this.scene.add(this.emptyAxesLines);
    this.originAxesLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { vertexColors: true }));
    this.originAxesLines.material.depthTest = false; this.originAxesLines.material.depthWrite = false;
    this.originAxesLines.material.transparent = true; this.originAxesLines.material.opacity = 0.4;
    this.originAxesLines.renderOrder = 10; this.originAxesLines.frustumCulled = false; this.originAxesLines.visible = false;
    this.scene.add(this.originAxesLines);
    // 平面 gizmo（镜像面）：描边 / 箭头 / 把手 = 透视粗线；面 = 很淡的半透明方块（也透视，被几何挡住也看得见在哪）
    this.gizmoLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX * 1.5, { vertexColors: true }));
    this.gizmoLines.material.depthTest = false; this.gizmoLines.material.depthWrite = false;
    this.gizmoLines.renderOrder = 11; this.gizmoLines.frustumCulled = false; this.gizmoLines.visible = false;
    this.scene.add(this.gizmoLines);
    this.gizmoQuad = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: GIZMO_COLOR, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthTest: false, depthWrite: false }));
    this.gizmoQuad.renderOrder = 10; this.gizmoQuad.frustumCulled = false; this.gizmoQuad.visible = false;
    this.scene.add(this.gizmoQuad);
    // 变换 gizmo（移动箭头 + 旋转环；透视画，同缩放柄）
    this.xgLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX * 1.5, { vertexColors: true }));
    this.xgLines.material.depthTest = false; this.xgLines.material.depthWrite = false;
    this.xgLines.renderOrder = 11; this.xgLines.frustumCulled = false; this.xgLines.visible = false;
    this.scene.add(this.xgLines);
    // 变换 gizmo 的实心小件：三个轴上缩放块 + 等比块（方块）+ 中心点（圆）+ 三个箭头锥；透视画、在线条上面
    for (let i = 0; i < 8; i++) {   // 0–3 方块（三轴缩放 + 等比）· 4 中心点（圆）· 5–7 箭头锥
      const m = new THREE.Mesh(i < 4 ? new THREE.BoxGeometry(1, 1, 1) : i === 4 ? new THREE.SphereGeometry(0.5, 16, 10) : new THREE.ConeGeometry(1, 1, 16), new THREE.MeshBasicMaterial({ color: 0x777777, depthTest: false, depthWrite: false }));
      m.renderOrder = 12; m.visible = false; m.frustumCulled = false;
      this.scene.add(m); this.xgSolids.push(m);
    }
    for (let i = 0; i < 3; i++) {   // 8–10 平面（双轴）缩放块：xy / yz / xz 小方片（2026-10-26）
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x777777, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }));
      m.renderOrder = 12; m.visible = false; m.frustumCulled = false;
      this.scene.add(m); this.xgSolids.push(m);
    }

    const xr = this.renderer.xr;
    xr.enabled = true;
    xr.setReferenceSpaceType("local-floor");
    xr.setFoveation(XR_DEFAULT.foveation);
    xr.setFramebufferScaleFactor(XR_DEFAULT.framebufferScale);
    this.rig = new THREE.Group();
    this.rig.add(this.camPersp);
    this.scene.add(this.rig);
    for (let i = 0; i < 2; i++) {
      const c = xr.getController(i);
      c.addEventListener("connected", (ev: any) => { this.hands[i] = ev.data?.handedness ?? "none"; });
      c.addEventListener("disconnected", () => { this.hands[i] = "none"; });
      // 射线 + 光标球（控制器局部：−Z 前）；不用 GLTF 控制器模型（不引依赖）。光标球 = 指针本体，永远可见（不走深度），按距离定角尺寸
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x2b6cb0, transparent: true, opacity: 0.8 }));
      line.visible = false;
      const cursor = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x2b6cb0, depthTest: false }));
      cursor.renderOrder = 11; cursor.visible = false;
      c.add(line); c.add(cursor);
      this.pointerVis.push({ line, cursor });
      this.controllers.push(c);
      this.rig.add(c);
      const g = xr.getControllerGrip(i);
      this.grips.push(g);
      this.rig.add(g);
    }
    this.xr = {
      isPresenting: () => !!xr.isPresenting,
      setSession: (session) => xr.setSession(session),
      session: () => xr.getSession() ?? null,
      frame: () => xr.getFrame() ?? null,
      refSpace: () => xr.getReferenceSpace() ?? null,
      on: (type, cb) => xr.addEventListener(type, cb),
    };
  }

  /** XR 画质（会话开始前设才生效；dev A/B 用）。foveation 0=全分辨率…1=周边最低；framebufferScale 相对设备推荐值。 */
  setXRQuality(q: { foveation?: number; framebufferScale?: number }): void {
    if (q.foveation !== undefined) this.renderer.xr.setFoveation(Math.max(0, Math.min(1, q.foveation)));
    if (q.framebufferScale !== undefined) this.renderer.xr.setFramebufferScaleFactor(Math.max(0.5, Math.min(2, q.framebufferScale)));
  }

  /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
  setRig(pose: RigPose): void {
    this.rig.position.set(pose.origin.x, pose.origin.y, pose.origin.z);
    this.rig.rotation.set(Math.PI / 2, 0, pose.heading, "ZYX");   // = Rz(heading)·Rx(90°)
    this.rig.updateMatrixWorld(true);
  }
  private ctrlIndex(hand: XRHand): number { return this.hands.indexOf(hand); }
  /** 控制器射线视觉：长度（到命中点）与颜色；null = 隐藏。光标球半径 ≈ 0.23° 角（1 m 处 4 mm）。 */
  setPointerVisual(hand: XRHand, v: { length: number; color: number } | null): void {
    const i = this.ctrlIndex(hand);
    if (i < 0) return;
    const pv = this.pointerVis[i];
    if (!v) { pv.line.visible = false; pv.cursor.visible = false; return; }
    const len = Math.max(0.05, v.length);
    pv.line.visible = true; pv.cursor.visible = true;
    pv.line.scale.set(1, 1, len);
    pv.cursor.position.set(0, 0, -len);
    pv.cursor.scale.setScalar(Math.max(0.002, len * 0.004));
    pv.line.material.color.setHex(v.color);
    pv.cursor.material.color.setHex(v.color);
  }
  /**
   * 手腕面板：挂在 hand 手的 grip 上（grip 空间：原点掌心、−Z 沿手柄向前、+Y 手背向上）。面板贴在手背上方偏向手腕，
   * 法向 +Y（手背朝天时正对眼睛）；纹理 = 传入的 canvas（UI 显示用途的 canvas 2D）。
   */
  attachWristPanel(canvas: HTMLCanvasElement, widthM: number, heightM: number, hand: XRHand): void {
    this.detachWristPanel();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthTest: false }));
    mesh.renderOrder = 12;
    mesh.position.set(0, 0.04, 0.09);
    mesh.rotation.set(-Math.PI / 2 + 0.35, 0, 0);   // 法向 +Y，略朝手腕（用户）倾 20°
    const i = this.ctrlIndex(hand);
    const parent = i >= 0 ? this.grips[i] : this.grips[hand === "left" ? 0 : 1];
    parent.add(mesh);
    this.wrist = { mesh, tex, inv: new THREE.Matrix4() };
  }
  detachWristPanel(): void {
    if (!this.wrist) return;
    this.wrist.mesh.parent?.remove(this.wrist.mesh);
    this.wrist.mesh.geometry.dispose(); this.wrist.mesh.material.dispose(); this.wrist.tex.dispose();
    this.wrist = null;
  }
  updateWristTexture(): void { if (this.wrist) this.wrist.tex.needsUpdate = true; }
  /** 世界射线 ∩ 面板平面 → 面板 uv（u 右 0..1、v 下 0..1，与 canvas 像素同向）及距离；不在面板内 → null。 */
  wristHit(ray: Ray): { u: number; v: number; dist: number } | null {
    if (!this.wrist) return null;
    const m = this.wrist.mesh;
    m.updateWorldMatrix(true, false);
    this.wrist.inv.copy(m.matrixWorld).invert();
    const o = this.scratchV.set(ray.origin.x, ray.origin.y, ray.origin.z).applyMatrix4(this.wrist.inv);
    const d = this.scratchV2.set(ray.dir.x, ray.dir.y, ray.dir.z).transformDirection(this.wrist.inv);
    if (Math.abs(d.z) < 1e-6) return null;
    const t = -o.z / d.z;
    if (t <= 0) return null;
    const x = o.x + d.x * t, y = o.y + d.y * t;
    const hw = m.geometry.parameters.width / 2, hh = m.geometry.parameters.height / 2;
    if (x < -hw || x > hw || y < -hh || y > hh) return null;
    // 距离按世界尺度（局部无缩放）
    const dist = t * Math.hypot(ray.dir.x, ray.dir.y, ray.dir.z);
    return { u: (x + hw) / (2 * hw), v: 1 - (y + hh) / (2 * hh), dist };
  }
  // ---- 字幕位 toast（挂 camPersp 子节点 = 头锁定：XR 中 three 把 HMD 姿态写进 camPersp）----
  private subtitle: { mesh: any; tex: any } | null = null;
  attachSubtitle(canvas: HTMLCanvasElement, widthM: number, heightM: number): void {
    this.detachSubtitle();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(widthM, heightM), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
    mesh.renderOrder = 20;
    mesh.position.set(0, -0.30, -1.2);   // 相机系：前 1.2 m、下 0.30 m ≈ 视野下沿 14°
    this.camPersp.add(mesh);
    this.subtitle = { mesh, tex };
  }
  detachSubtitle(): void {
    if (!this.subtitle) return;
    this.subtitle.mesh.parent?.remove(this.subtitle.mesh);
    this.subtitle.mesh.geometry.dispose(); this.subtitle.mesh.material.dispose(); this.subtitle.tex.dispose();
    this.subtitle = null;
  }
  /** XR 会话中 HMD 的世界位置（marker 尺寸用；返回共享 scratch，勿保存）。 */
  private xrEye(): Pt3 | null {
    if (!this.renderer.xr.isPresenting) return null;
    const c = this.renderer.xr.getCamera();
    return this.scratchV.setFromMatrixPosition(c.matrixWorld);
  }

  /** 连续渲染循环（步行模式 / XR 会话）；null = 停（回到按需 draw）。three 的 setAnimationLoop 才能收 XR 帧。 */
  setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void {
    this.renderer.setAnimationLoop(cb);
  }

  resize(vp: Viewport, dpr: number): void {
    if (this.renderer.xr.isPresenting) return;   // XR 会话中尺寸归 XR layer
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(vp.w, vp.h, false);
    this.flatRes = { w: vp.w * dpr, h: vp.h * dpr };
  }

  /** 粗线 resolution / linewidth：桌面 = canvas 设备像素 + DPR；XR = 每眼 viewport（每帧，WebXRManager 在回调前写好）。 */
  private syncLineScale(presenting: boolean): void {
    let scale = this.dpr, w = this.flatRes.w, h = this.flatRes.h;
    if (presenting) {
      const v = this.renderer.xr.getCamera().cameras?.[0]?.viewport;
      if (v && v.w > 0) { w = v.z; h = v.w; scale = v.w / XR_LINE_REF_H; }
    }
    this.resolution.set(w, h);
    for (let i = 0; i < this.lineMats.length; i++) this.lineMats[i].linewidth = this.lineMatPx[i] * scale;
    // 边线：lineWeight 是设备像素（桌面 scale = dpr 已经折进 resolution；XR 按 viewport 高折算）
    const k = presenting ? scale : 1;
    this.edgeMat.linewidth = Math.max(this.lineWeight, 1) * k;
    this.profileAdd.value = profileAddFor(Math.max(this.lineWeight, 1)) * k;
    if (this.tickLines) this.tickLines.material.linewidth = Math.max(this.lineWeight, 1) * k;   // 断口小垂线跟边线一样粗（鼓包，不是另一种线）
    if (this.axesObj) this.axesObj.material.linewidth = Math.min(STATIC_PX * scale, this.lineWeight > 1 ? this.lineWeight * k : 0.6 * k);   // 原生细线（1 px）覆盖的采样点和粗线插件不同，轴同宽会从缝里透红 → 细线模式下轴画 0.6 px   // 轴不比边粗：压在轴上的边要整条盖住轴（2× 屏上轴 2.4 px > 边 1.5 px → 边成了「红边夹黑芯」，2026-10-25）
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
  /** 世界里的文字：按 id 增删改面片；位图归 world-labels.ts（字 / 样式 / dpr 没变就沿用）；每帧按 worldPerPx 换算成固定屏幕大小。 */
  private syncLabels(labels: readonly WorldLabel[], cam: OrbitCamera, vp: Viewport): void {
    const dpr = this.renderer.getPixelRatio?.() || 1, seen = new Set<string>();
    for (const lb of labels) {
      seen.add(lb.id);
      const bm = rasterizeLabel(lb.text, lb.style, dpr);
      let e = this.labelSprites.get(lb.id);
      if (!e) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
        sprite.renderOrder = 3; sprite.frustumCulled = false;
        this.scene.add(sprite);
        e = { sprite, key: "", w: 0, h: 0 };
        this.labelSprites.set(lb.id, e);
      }
      if (e.key !== bm.key) {
        const tex = new THREE.CanvasTexture(bm.canvas);
        tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
        e.sprite.material.map?.dispose(); e.sprite.material.map = tex; e.sprite.material.needsUpdate = true;
        e.key = bm.key; e.w = bm.w; e.h = bm.h;
      }
      e.sprite.material.depthTest = lb.occlude !== false;
      const [cx, cy] = anchorCenter(lb.anchor ?? "center", e.w, e.h, lb.gapPx ?? 3);
      e.sprite.center.set(cx, cy);
      e.sprite.position.set(lb.at.x, lb.at.y, lb.at.z);
      const wpp = this.worldPerPx(cam, vp, lb.at);
      e.sprite.scale.set(e.w * wpp, e.h * wpp, 1);
      e.sprite.visible = true;
    }
    for (const [id, e] of this.labelSprites) if (!seen.has(id)) { e.sprite.material.map?.dispose(); e.sprite.material.dispose(); this.scene.remove(e.sprite); this.labelSprites.delete(id); }
  }
  /** 调试 / 探针：现在挂着哪些字（id → 位图键 = 样式|dpr|文字）。 */
  labelKeys(): { id: string; key: string }[] { return [...this.labelSprites].map(([id, e]) => ({ id, key: e.key })); }
  private worldPerPx(cam: OrbitCamera, vp: Viewport, p: Pt3): number {
    const eye = this.xrEye();
    if (eye) return (Math.max(0.2, Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z)) * (Math.PI / 180)) / XR_PX_PER_DEG;
    if (cam.projection === "persp") {
      const z = Math.max(dot3(sub3(p, cam.eye()), cam.forward()), cam.nearClamp());
      return (2 * z * Math.tan(cam.fovY / 2)) / vp.h;
    }
    return (2 * cam.halfH) / vp.h;
  }

  /**
   * 远处能看到多远（世界长度，从视野中心 target 量）：透视 = 远平面，正交 = 深度窗口半宽。无限长的线（参考线 / 充能延长线）画到这么远；
   * 和远平面一起按**场景包围球**定（2026-10-26，user「不应该写死特征长度。我们的普朗克长度到哈勃半径也跨了蛮多数量级了」：
   * 以前远平面 = 眼距×40 + 100 m、正交窗口下限 500 m、参考线 ±200 m——100 m / 500 m / 200 m 在毫米零件和公里场景两头都不对）。
   */
  private viewReach = 1;
  /** 无限长直线（过 p、方向 dir 单位）的可画两端：从离视野中心最近的那点往两边各 viewReach + 那点到中心的距离。 */
  private infLine(p: Pt3, dir: Pt3, target: Pt3): [Pt3, Pt3] {
    const t = (target.x - p.x) * dir.x + (target.y - p.y) * dir.y + (target.z - p.z) * dir.z;
    const c = { x: p.x + dir.x * t, y: p.y + dir.y * t, z: p.z + dir.z * t }, L = this.viewReach + Math.hypot(c.x - target.x, c.y - target.y, c.z - target.z);
    return [{ x: c.x - dir.x * L, y: c.y - dir.y * L, z: c.z - dir.z * L }, { x: c.x + dir.x * L, y: c.y + dir.y * L, z: c.z + dir.z * L }];
  }
  /** 画无限长线的缓存键：视野范围按对数分档、中心按范围量化（相机大挪才重建）。 */
  private reachKey(target: Pt3): string { const q = this.viewReach / 8; return `${Math.round(Math.log2(this.viewReach) * 2)}@${Math.round(target.x / q)},${Math.round(target.y / q)},${Math.round(target.z / q)}`; }
  private boundsKey = ""; private sceneSphere: { c: Pt3; r: number } | null = null;
  private sceneBounds(k: GeomView, rev: number): { c: Pt3; r: number } | null {
    const key = `${this.kernelId(k)}:${rev}`;
    if (key !== this.boundsKey) {
      this.boundsKey = key;
      let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
      for (const v of k.vertices()) { if (v.x < min.x) min.x = v.x; if (v.y < min.y) min.y = v.y; if (v.z < min.z) min.z = v.z; if (v.x > max.x) max.x = v.x; if (v.y > max.y) max.y = v.y; if (v.z > max.z) max.z = v.z; }
      this.sceneSphere = Number.isFinite(min.x) ? { c: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }, r: Math.hypot(max.x - min.x, max.y - min.y, max.z - min.z) / 2 } : null;
    }
    return this.sceneSphere;
  }
  private syncCamera(cam: OrbitCamera, vp: Viewport, sphere: { c: Pt3; r: number } | null): any {
    const eye = cam.eye(), up = cam.up();
    let c: any;
    if (cam.projection === "persp") {
      c = this.camPersp;
      const d = cam.eyeDist();
      c.fov = (cam.fovY * 180) / Math.PI;
      c.aspect = vp.w / vp.h;
      c.near = Math.max(cam.nearClamp(), d * 0.02);
      const toScene = sphere ? Math.hypot(sphere.c.x - eye.x, sphere.c.y - eye.y, sphere.c.z - eye.z) + sphere.r : 0;
      c.far = Math.max(d * 40, toScene * 1.05, c.near * 100);   // 拉近看小零件时场景的其余部分也不被裁（以前 +100 m 补）
      this.viewReach = c.far;
    } else {
      c = this.camOrtho;
      const halfW = cam.halfW(vp);
      c.left = -halfW; c.right = halfW;
      c.top = cam.halfH; c.bottom = -cam.halfH;
      // 深度窗口围着 target（眼在 5000 m 外）：R 随 zoom 走、并且盖住整个场景（以前下限写死 500 m）；小零件也有细的深度分辨率
      const D = cam.eyeDist(), toScene = sphere ? Math.hypot(sphere.c.x - cam.target.x, sphere.c.y - cam.target.y, sphere.c.z - cam.target.z) + sphere.r : 0;
      const R = Math.max(cam.halfH * 100, toScene * 1.05);
      c.near = Math.max(D * 1e-6, D - R); c.far = D + R;
      this.viewReach = R;
    }
    c.position.set(eye.x, eye.y, eye.z);
    c.up.set(up.x, up.y, up.z);
    c.lookAt(cam.target.x, cam.target.y, cam.target.z);
    c.updateProjectionMatrix();
    return c;
  }

  private kernelId(k: GeomView): number {
    let id = this.kernelIds.get(k);
    if (id === undefined) { id = this.nextKernelId++; this.kernelIds.set(k, id); }
    return id;
  }

  render(k: GeomView, cam: OrbitCamera, vp: Viewport, view: ViewState): void {
    const presenting = !!this.renderer.xr.isPresenting;
    let cam3: any;
    if (presenting) {
      // XR：three 从 HMD 写 camPersp 姿态与投影；我们只管 near/far（会话 depthNear/Far）
      cam3 = this.camPersp;
      cam3.near = view.near ?? 0.05; cam3.far = 2000;
    } else {
      this.rig.position.set(0, 0, 0); this.rig.rotation.set(0, 0, 0);
      cam3 = this.syncCamera(cam, vp, this.sceneBounds(k, view.revision ?? 0));
    }
    this.syncLineScale(presenting);

    // WYSIWYG（user 黄线）：拖拽期间整个场景渲染影子副本。
    const kd = view.preview ?? k;
    const kid = this.kernelId(kd), rev = view.revision ?? 0;
    const selF = [...view.selectionFaces].join(","), selE = [...view.selectionEdges].join(",");

    // ---- 面：光向 uniform 每帧（视空间：法向走 normalMatrix）；几何只在键变时重建 ----
    const L = presenting ? this.xrKeyLight() : keyLight(cam);
    cam3.updateMatrixWorld();
    this.scratchV.set(L.x, L.y, L.z).transformDirection(cam3.matrixWorldInverse);
    this.faceMat.uniforms.uLight.value.copy(this.scratchV);
    const dimK = view.dimSlots ? [...view.dimSlots].join(",") : "";
    const wv = kd as Partial<WorldView>;
    if (wv.slots && wv.scene) {
      // 池级路径：每槽一组节点 + 每 kernel 一份几何（只重建变了的池）；选中 / 悬停 = 覆盖层
      const pk = `${kid}:${rev}:${dimK}:${this.lineStyle}`;
      if (pk !== this.poolKey) { this.poolKey = pk; perf.time("syncPools", () => this.syncPools(kd as WorldView, view)); }
      const ok = `${kid}:${rev}:${selF}:${view.hoverFace ?? ""}:${selE}:${[...view.scrubEdges].join(",")}:${view.hoverEdge ?? ""}:${view.warnEdges ? `${view.warnEdges.size}|${[...view.warnEdges].slice(0, 16).join(",")}` : ""}`;
      if (ok !== this.overlayKey) { this.overlayKey = ok; perf.time("rebuildOverlay", () => this.rebuildOverlay(kd, view)); }
      this.faceKey = ""; this.edgeKey = "";
    } else {
      // 平铺路径（没有槽的裸 GeomView）：整场景一份几何
      this.hidePools();
      const fk = `${kid}:${rev}:${selF}:${view.hoverFace ?? ""}:${dimK}`;
      if (fk !== this.faceKey) { this.faceKey = fk; perf.time("rebuildFaces", () => this.rebuildFaces(kd, view)); }
      const ek = `${kid}:${rev}:${selE}:${[...view.scrubEdges].join(",")}:${view.hoverEdge ?? ""}:${dimK}`;
      if (ek !== this.edgeKey) { this.edgeKey = ek; perf.time("rebuildEdges", () => this.rebuildEdges(kd, view)); }
      this.poolKey = ""; this.overlayKey = "";
    }

    // ---- 缩放柄 ----
    const hs = view.handles ?? [];
    for (let i = 0; i < this.handleMarkers.length; i++) {
      const m = this.handleMarkers[i], h = hs[i];
      if (!h) { m.visible = false; continue; }
      m.visible = true;
      m.position.set(h.p.x, h.p.y, h.p.z);
      m.scale.setScalar((h.active ? 9 : 6) * this.worldPerPx(cam, vp, h.p));
      m.material.color.setHex(h.active ? 0xd97706 : 0x2e8b57);
    }
    // ---- 量角器 ----
    const pr = view.protractor;
    if (pr) {
      const pk = `${pr.center.x},${pr.center.y},${pr.center.z}|${pr.axis.x},${pr.axis.y},${pr.axis.z}|${pr.ref ? `${pr.ref.x},${pr.ref.y},${pr.ref.z}` : "-"}|${pr.angle.toFixed(4)}|${this.worldPerPx(cam, vp, pr.center).toExponential(2)}`;
      if (pk !== this.protKey) {
        this.protKey = pk;
        const R = 60 * this.worldPerPx(cam, vp, pr.center);
        const n = pr.axis;
        const seed = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
        const ux0 = { x: n.y * seed.z - n.z * seed.y, y: n.z * seed.x - n.x * seed.z, z: n.x * seed.y - n.y * seed.x };
        const ul = Math.hypot(ux0.x, ux0.y, ux0.z) || 1;
        let u = { x: ux0.x / ul, y: ux0.y / ul, z: ux0.z / ul };
        if (pr.ref) { const r = { x: pr.ref.x - pr.center.x, y: pr.ref.y - pr.center.y, z: pr.ref.z - pr.center.z }; const rl = Math.hypot(r.x, r.y, r.z) || 1; u = { x: r.x / rl, y: r.y / rl, z: r.z / rl }; }
        const v = { x: n.y * u.z - n.z * u.y, y: n.z * u.x - n.x * u.z, z: n.x * u.y - n.y * u.x };
        const at = (a: number, rr: number): Pt3 => ({ x: pr.center.x + rr * (Math.cos(a) * u.x + Math.sin(a) * v.x), y: pr.center.y + rr * (Math.cos(a) * u.y + Math.sin(a) * v.y), z: pr.center.z + rr * (Math.cos(a) * u.z + Math.sin(a) * v.z) });
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        const N = 72;
        for (let i = 0; i < N; i++) push(at((2 * Math.PI * i) / N, R), at((2 * Math.PI * (i + 1)) / N, R), 0x8b5cf6);
        for (let i = 0; i < 24; i++) { const a = (2 * Math.PI * i) / 24; push(at(a, R), at(a, i % 6 === 0 ? R * 0.8 : R * 0.9), 0x8b5cf6); }
        if (pr.ref) { push(pr.center, at(0, R * 1.15), 0x111111); push(pr.center, at(pr.angle, R * 1.15), 0xd97706); }
        this.setLineGeometry(this.protractorLines, pos, col);
      }
      this.protractorLines.visible = true;
    } else { this.protractorLines.visible = false; this.protKey = ""; }

    // ---- 参考几何（0.11 尺规纪元）：参考线 = 长线；参考点 = 像素尺寸的小叉 ----
    const gd = view.guides;
    if (gd && (gd.lines.length || gd.points.length || gd.circles.length || gd.spheres.length)) {
      const px = gd.points.length ? this.worldPerPx(cam, vp, gd.points[0].p) : 0;
      const gsel = view.guideSel, gcol = (id: number): number => (gsel?.has(id) ? GUIDE_SEL_COLOR : GUIDE_COLOR);
      const gk = `${gd.lines.map((l) => `${l.id}:${l.p.x},${l.p.y},${l.p.z}>${l.dir.x},${l.dir.y},${l.dir.z}`).join("|")}#${gd.points.map((q) => `${q.id}:${q.p.x},${q.p.y},${q.p.z}`).join("|")}#${gd.circles.map((c) => `${c.id}:${c.c.x},${c.c.y},${c.c.z}^${c.n.x},${c.n.y},${c.n.z}r${c.r}`).join("|")}#${gd.spheres.map((x) => `${x.id}:${x.c.x},${x.c.y},${x.c.z}r${x.r}`).join("|")}#${px.toExponential(2)}#${gsel ? [...gsel].join(",") : ""}#${this.reachKey(cam.target)}`;
      if (gk !== this.guideKey) {
        this.guideKey = gk;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        for (const l of gd.lines) { const [a, b] = this.infLine(l.p, l.dir, cam.target); push(a, b, gcol(l.id)); }
        // 参考圆 = 一圈折线；参考球 = 过球心、垂直于 x / y / z 的三圈（圆规 / 球规，DT50）
        const ring = (pts: Pt3[], hex: number): void => { for (let i = 0; i < pts.length; i++) push(pts[i], pts[(i + 1) % pts.length], hex); };
        for (const c of gd.circles) ring(circlePoints(c.c, c.n, c.r), gcol(c.id));
        for (const x of gd.spheres) for (const n of SPHERE_RINGS) ring(circlePoints(x.c, n, x.r), gcol(x.id));
        for (const q of gd.points) {
          const r = GUIDE_POINT_PX * this.worldPerPx(cam, vp, q.p);
          push({ x: q.p.x - r, y: q.p.y, z: q.p.z }, { x: q.p.x + r, y: q.p.y, z: q.p.z }, gcol(q.id));
          push({ x: q.p.x, y: q.p.y - r, z: q.p.z }, { x: q.p.x, y: q.p.y + r, z: q.p.z }, gcol(q.id));
          push({ x: q.p.x, y: q.p.y, z: q.p.z - r }, { x: q.p.x, y: q.p.y, z: q.p.z + r }, gcol(q.id));
        }
        this.setLineGeometry(this.guideLines, pos, col);
      }
      this.guideLines.visible = true;
    } else { this.guideLines.visible = false; this.guideKey = ""; }
    // ---- 地面网格 + 三色轴：跟上下文的帧（绘图轴 / 组的轴）与格距走（0.11 ⑤）----
    // 显示不细分（user 2026-10-25「即使开了，grid也不应该在显示层细分」「sub incremental就是sub刻度的」）：吸附的 1/5、1/10 只管吸，像尺子上的小刻度，不画成网格线
    const gfr = view.grid?.frame ?? view.frame ?? WORLD_FRAME, gstep = view.grid?.step ?? 1, gsub = 1;
    const gk = `${gfr.origin.x},${gfr.origin.y},${gfr.origin.z}|${gfr.x.x},${gfr.x.y},${gfr.x.z}|${gfr.y.x},${gfr.y.y},${gfr.y.z}|${gfr.z.x},${gfr.z.y},${gfr.z.z}|${gstep}|${gsub}`;
    if (gk !== this.gridKey) { this.gridKey = gk; this.rebuildGrid(gfr, gstep, gsub); }

    // ---- 选中的点 ----
    const sv = view.selVerts;
    if (sv && sv.length) {
      const k2 = sv.map((p) => `${p.x},${p.y},${p.z}`).join("|");
      if (k2 !== this.selVertKey) {
        this.selVertKey = k2;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(sv.flatMap((p) => [p.x, p.y, p.z]), 3));
        this.selVertDots.geometry.dispose(); this.selVertDots.geometry = g;
      }
      this.selVertDots.material.uniforms.uSize.value = SEL_VERT_DOT_PX * this.dpr;
      this.selVertDots.visible = true;
    } else { this.selVertDots.visible = false; this.selVertKey = ""; }

    // ---- 充能标记：点 = 小菱形（像素尺寸），边 = 淡淡的延长线 ----
    const ch = view.charged;
    if (ch && (ch.points.length || ch.edges.length)) {
      const px0 = ch.points.length ? this.worldPerPx(cam, vp, ch.points[0]) : 0;
      const ck = `${ch.points.map((p) => `${p.x},${p.y},${p.z}`).join("|")}#${ch.edges.map((e) => `${e.a.x},${e.a.y},${e.a.z}>${e.b.x},${e.b.y},${e.b.z}`).join("|")}#${px0.toExponential(2)}#${this.reachKey(cam.target)}`;
      if (ck !== this.chargedKey) {
        this.chargedKey = ck;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        for (const e of ch.edges) {
          const d = sub3(e.b, e.a), l = Math.hypot(d.x, d.y, d.z) || 1, u = { x: d.x / l, y: d.y / l, z: d.z / l };
          const [far0, far1] = this.infLine(e.a, u, cam.target);   // 延长线画到视野最远处（以前写死 ±200 m）
          push(far0, e.a, CHARGED_EXT_COLOR);
          push(e.b, far1, CHARGED_EXT_COLOR);
        }
        const right = { x: cam3.matrixWorld.elements[0], y: cam3.matrixWorld.elements[1], z: cam3.matrixWorld.elements[2] };
        const up = { x: cam3.matrixWorld.elements[4], y: cam3.matrixWorld.elements[5], z: cam3.matrixWorld.elements[6] };
        for (const p of ch.points) {
          const r = CHARGED_PX * this.worldPerPx(cam, vp, p);
          const N = { x: p.x + up.x * r, y: p.y + up.y * r, z: p.z + up.z * r }, S = { x: p.x - up.x * r, y: p.y - up.y * r, z: p.z - up.z * r };
          const E2 = { x: p.x + right.x * r, y: p.y + right.y * r, z: p.z + right.z * r }, W = { x: p.x - right.x * r, y: p.y - right.y * r, z: p.z - right.z * r };
          push(N, E2, CHARGED_COLOR); push(E2, S, CHARGED_COLOR); push(S, W, CHARGED_COLOR); push(W, N, CHARGED_COLOR);
        }
        this.setLineGeometry(this.chargedLines, pos, col);
      }
      this.chargedLines.visible = true;
    } else { this.chargedLines.visible = false; this.chargedKey = ""; }

    // ---- A33 断口小垂线：线上一个小鼓包（半长 = 线宽 × TICK_K，边线色），垂直于边、面向相机 ----
    // 同一套小短线也画轴的刻度（user 2026-10-25「我还是希望z轴有刻度。可以用那种我们之前用过的小短线」）：Z 轴每 axisTickM 一根（屏上挤到 < 6 px 就改成每 10 个一根），
    // X 轴 +1 个单位处一根（「1 m」字标在它下面）；颜色 = 那根轴的颜色。
    const tks: { p: Pt3; dir: Pt3; color?: number }[] = [...(view.ticks ?? [])];
    const atm = view.axisTickM, afr = view.frame;
    if (atm && atm > 0 && afr) {
      const o = afr.origin, zd = afr.z, xd = afr.x;
      let step = atm;
      const wpp0 = this.worldPerPx(cam, vp, o);
      while (step / wpp0 < 6 && step < 1e6) step *= 10;
      const L = GRID_N * GRID_STEP;
      for (let k = 1; k * step <= L + 1e-9; k++) tks.push({ p: { x: o.x + zd.x * k * step, y: o.y + zd.y * k * step, z: o.z + zd.z * k * step }, dir: zd, color: PALETTE.axisZ });
      if (view.axisUnitX) { const ux = view.axisUnitX; tks.push({ p: { x: o.x + xd.x * ux, y: o.y + xd.y * ux, z: o.z + xd.z * ux }, dir: xd, color: PALETTE.axisX }); }
    }
    if (tks.length) {
      const px = this.worldPerPx(cam, vp, tks[0].p);
      const fwd = cam.forward();
      const halfCss = TICK_K * Math.max(this.lineWeight, 1) / (this.renderer.getPixelRatio?.() || 1);   // 线宽是设备像素，worldPerPx 按 CSS 像素
      const kk = `${tks.map((t) => `${t.p.x},${t.p.y},${t.p.z}>${t.dir.x},${t.dir.y},${t.dir.z}`).join("|")}#${px.toExponential(2)}#${fwd.x.toFixed(3)},${fwd.y.toFixed(3)},${fwd.z.toFixed(3)}#${halfCss}`;
      if (kk !== this.tickKey) {
        this.tickKey = kk;
        const pos: number[] = [], col: number[] = [];
        for (const t of tks) {
          const c = this.tmpColor.setHex(t.color ?? PALETTE.edge);
          let n = cross3(t.dir, fwd);
          let l = Math.hypot(n.x, n.y, n.z);
          if (l < 1e-6) { n = Math.abs(t.dir.z) < 0.9 ? cross3(t.dir, { x: 0, y: 0, z: 1 }) : cross3(t.dir, { x: 1, y: 0, z: 0 }); l = Math.hypot(n.x, n.y, n.z); }
          const r = halfCss * this.worldPerPx(cam, vp, t.p) / l;
          pos.push(t.p.x - n.x * r, t.p.y - n.y * r, t.p.z - n.z * r, t.p.x + n.x * r, t.p.y + n.y * r, t.p.z + n.z * r);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
        this.setLineGeometry(this.tickLines, pos, col);
      }
      this.tickLines.visible = true;
    } else { this.tickLines.visible = false; this.tickKey = ""; }

    // ---- 平面 gizmo（镜像面）----
    const pg = view.planeGizmo;
    if (pg) {
      const k = `${pg.origin.x},${pg.origin.y},${pg.origin.z}/${pg.normal.x},${pg.normal.y},${pg.normal.z}/${pg.size.toExponential(3)}/${pg.hot ?? ""}`;
      if (k !== this.gizmoKey) {
        this.gizmoKey = k;
        const o = pg.origin, S = pg.size, P = (a: number, b: number, c = 0): Pt3 => ({ x: o.x + pg.u.x * a + pg.v.x * b + pg.normal.x * c, y: o.y + pg.u.y * a + pg.v.y * b + pg.normal.y * c, z: o.z + pg.u.z * a + pg.v.z * b + pg.normal.z * c });
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        const colOf = (h: string): number => (pg.hot === h ? GIZMO_HOT : GIZMO_COLOR);
        const cs = [P(-S, -S), P(S, -S), P(S, S), P(-S, S)];
        for (let i = 0; i < 4; i++) push(cs[i], cs[(i + 1) % 4], GIZMO_COLOR);
        push(o, P(0, 0, S * 1.3), colOf("push"));                                      // 法线箭头
        const tip = S * 1.3, h = S * 0.12;
        push(P(0, 0, tip), P(h, 0, tip - h * 1.5), colOf("push")); push(P(0, 0, tip), P(-h, 0, tip - h * 1.5), colOf("push"));
        const ring = (cx: number, cy: number, hx: string): void => { const r = S * 0.12, N = 12; for (let i = 0; i < N; i++) { const a0 = (2 * Math.PI * i) / N, a1 = (2 * Math.PI * (i + 1)) / N; push(P(cx + r * Math.cos(a0), cy + r * Math.sin(a0)), P(cx + r * Math.cos(a1), cy + r * Math.sin(a1)), colOf(hx)); } };
        ring(0, S, "rotU"); ring(S, 0, "rotV");                                          // 转动把手（边中点）
        const m = S * 0.07;
        push(P(-m, -m), P(m, -m), colOf("move")); push(P(m, -m), P(m, m), colOf("move")); push(P(m, m), P(-m, m), colOf("move")); push(P(-m, m), P(-m, -m), colOf("move"));
        this.setLineGeometry(this.gizmoLines, pos, col);
        const qg = new THREE.BufferGeometry();
        qg.setAttribute("position", new THREE.Float32BufferAttribute([cs[0], cs[1], cs[2], cs[0], cs[2], cs[3]].flatMap((p) => [p.x, p.y, p.z]), 3));
        const oldQ = this.gizmoQuad.geometry; this.gizmoQuad.geometry = qg; oldQ.dispose();
      }
      this.gizmoLines.visible = true; this.gizmoQuad.visible = true;
    } else { this.gizmoLines.visible = false; this.gizmoQuad.visible = false; this.gizmoKey = ""; }

    // ---- 变换 gizmo：三根箭头（箭杆 + 箭头）+ 三个环，RGB = XYZ，悬停 / 拖着的那个换橙 ----
    const xg = view.xformGizmo;
    if (xg) {
      const r6 = (p: Pt3): string => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
      const k = `${r6(xg.origin)}/${r6(xg.axes.x)}/${r6(xg.axes.y)}/${r6(xg.axes.z)}/${xg.arrow.toExponential(3)}/${xg.hot ?? ""}/${xg.uniform ? r6(xg.uniform) : "-"}`;
      if (k !== this.xgKey) {
        this.xgKey = k;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        const at = (d: Pt3, t: number): Pt3 => ({ x: xg.origin.x + d.x * t, y: xg.origin.y + d.y * t, z: xg.origin.z + d.z * t });
        const hexOf = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const;
        for (const ax of ["x", "y", "z"] as const) {
          const d = xg.axes[ax], others = (["x", "y", "z"] as const).filter((o) => o !== ax).map((o) => xg.axes[o]);
          const hm = xg.hot === `m${ax}` ? GIZMO_HOT : hexOf[ax], hr = xg.hot === `r${ax}` ? GIZMO_HOT : hexOf[ax];
          push(at(d, xg.start), at(d, xg.arrow - (xg.arrow - xg.start) * 0.32), hm);   // 箭杆；箭头 = 实心锥（下面 xgSolids）
          void others;
          const ref = ax === "z" ? xg.axes.x : ax === "x" ? xg.axes.y : xg.axes.z, N = 48;
          const v = { x: d.y * ref.z - d.z * ref.y, y: d.z * ref.x - d.x * ref.z, z: d.x * ref.y - d.y * ref.x };
          const P = (i: number): Pt3 => { const a = (2 * Math.PI * i) / N, c = Math.cos(a) * xg.ring, sn = Math.sin(a) * xg.ring; return { x: xg.origin.x + ref.x * c + v.x * sn, y: xg.origin.y + ref.y * c + v.y * sn, z: xg.origin.z + ref.z * c + v.z * sn }; };
          for (let i = 0; i < N; i++) push(P(i), P(i + 1), hr);
        }
        this.setLineGeometry(this.xgLines, pos, col);
      }
      this.xgLines.visible = true;
      // 缩放块（轴上的 = 沿那根轴、右上方的 = 等比）+ 中心点（= 移动）：实心小件（user 2026-10-26「变换的resize handle为什么是线框方块，好难看哈哈」），方块顺着 gizmo 三轴摆
      const [sx, sy, sz, su, mc, cx, cy, cz, pxy, pyz, pxz] = this.xgSolids;
      {   // 箭头锥：尖在 arrow，长 = 箭头段的 32%，粗 = 长的 0.36
        const hl = (xg.arrow - xg.start) * 0.32, up = new THREE.Vector3(0, 1, 0);
        (["x", "y", "z"] as const).forEach((ax, i) => {
          const d = xg.axes[ax], m = [cx, cy, cz][i], mid = xg.arrow - hl / 2;
          m.visible = true; m.position.set(xg.origin.x + d.x * mid, xg.origin.y + d.y * mid, xg.origin.z + d.z * mid);
          m.quaternion.setFromUnitVectors(up, new THREE.Vector3(d.x, d.y, d.z).normalize());
          m.scale.set(hl * 0.36, hl, hl * 0.36);
          m.material.color.setHex(xg.hot === `m${ax}` ? GIZMO_HOT : ({ x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const)[ax]);
        });
      }
      if (xg.cube !== undefined && xg.cubeHalf !== undefined) {
        const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(xg.axes.x.x, xg.axes.x.y, xg.axes.x.z), new THREE.Vector3(xg.axes.y.x, xg.axes.y.y, xg.axes.y.z), new THREE.Vector3(xg.axes.z.x, xg.axes.z.y, xg.axes.z.z));
        const place = (m: any, c: Pt3, size: number, hex: number): void => { m.visible = true; m.position.set(c.x, c.y, c.z); m.quaternion.setFromRotationMatrix(basis); m.scale.setScalar(size); m.material.color.setHex(hex); };
        const hexOf2 = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const;
        (["x", "y", "z"] as const).forEach((ax, i) => { const d = xg.axes[ax]; place([sx, sy, sz][i], { x: xg.origin.x + d.x * xg.cube!, y: xg.origin.y + d.y * xg.cube!, z: xg.origin.z + d.z * xg.cube! }, xg.cubeHalf! * 2, xg.hot === `s${ax}` ? GIZMO_HOT : hexOf2[ax]); });
        if (xg.uniform) place(su, xg.uniform, xg.cubeHalf * 2.4, xg.hot === "su" ? GIZMO_HOT : 0x777777); else su.visible = false;
        place(mc, xg.origin, xg.cubeHalf * 2.2, xg.hot === "mc" ? GIZMO_HOT : 0x333333);
      } else for (const m of [sx, sy, sz, su, mc]) m.visible = false;
      if (xg.plane !== undefined && xg.planeHalf !== undefined) {   // 平面块：方片铺在两根轴张成的面里，颜色 = 垂直于它的那根轴（Blender 同款）
        const V = (p: Pt3): any => new THREE.Vector3(p.x, p.y, p.z);
        ([["pxy", "x", "y", "z"], ["pyz", "y", "z", "x"], ["pxz", "x", "z", "y"]] as const).forEach(([h, a, b, n], i) => {
          const m = [pxy, pyz, pxz][i], A = xg.axes[a], B = xg.axes[b];
          m.visible = true;
          m.position.set(xg.origin.x + (A.x + B.x) * xg.plane!, xg.origin.y + (A.y + B.y) * xg.plane!, xg.origin.z + (A.z + B.z) * xg.plane!);
          m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(A), V(B), V(A).cross(V(B))));
          m.scale.set(xg.planeHalf! * 2, xg.planeHalf! * 2, 1);
          m.material.color.setHex(xg.hot === h ? GIZMO_HOT : ({ x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ } as const)[n]);
        });
      } else for (const m of [pxy, pyz, pxz]) m.visible = false;
    } else { this.xgLines.visible = false; this.xgKey = ""; for (const m of this.xgSolids) m.visible = false; }

    // ---- DT15 选中组件的原点 / T11 空组件的常驻标记 / DT86 组件原点（淡）：原点出三根屏幕定长的短轴（RGB = XYZ），透视 ----
    this.poolAxesKey = this.drawTriads(this.poolAxesLines, view.poolAxes, this.poolAxesKey, cam, vp);
    this.emptyAxesKey = this.drawTriads(this.emptyAxesLines, view.emptyAxes, this.emptyAxesKey, cam, vp);
    this.originAxesKey = this.drawTriads(this.originAxesLines, view.originAxes, this.originAxesKey, cam, vp);

    this.syncLabels(view.labels ?? [], cam, vp);

    // ---- 卷尺预演：量线 + 候选参考线 / 参考点 ----
    const tp0 = view.tape;
    if (tp0) {
      const r = GUIDE_POINT_PX * this.worldPerPx(cam, vp, tp0.b);
      const tk = `${tp0.a.x},${tp0.a.y},${tp0.a.z}>${tp0.b.x},${tp0.b.y},${tp0.b.z}|${tp0.guide ? `${tp0.guide.p.x},${tp0.guide.p.y},${tp0.guide.p.z}/${tp0.guide.dir.x},${tp0.guide.dir.y},${tp0.guide.dir.z}` : ""}|${tp0.point ? "P" : ""}|${r.toExponential(2)}|${this.reachKey(cam.target)}`;
      if (tk !== this.tapeKey) {
        this.tapeKey = tk;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        push(tp0.a, tp0.b, 0x111111);
        if (tp0.guide) { const g = tp0.guide, [a, b] = this.infLine(g.p, g.dir, cam.target); push(a, b, GUIDE_COLOR); }
        if (tp0.point) { const q = tp0.point; push({ x: q.x - r, y: q.y, z: q.z }, { x: q.x + r, y: q.y, z: q.z }, GUIDE_COLOR); push({ x: q.x, y: q.y - r, z: q.z }, { x: q.x, y: q.y + r, z: q.z }, GUIDE_COLOR); push({ x: q.x, y: q.y, z: q.z - r }, { x: q.x, y: q.y, z: q.z + r }, GUIDE_COLOR); }
        this.setLineGeometry(this.tapeLines, pos, col);
      }
      this.tapeLines.visible = true;
    } else { this.tapeLines.visible = false; this.tapeKey = ""; }

    // ---- 吸附指示（小球 + 提示线）----
    const sn = view.snap;
    if (sn?.kind) {
      const color = SNAP_COLORS[sn.kind] ?? 0x2b6cb0;
      const m = this.snapMarker;
      m.visible = true;
      m.position.set(sn.p.x, sn.p.y, sn.p.z);
      m.scale.setScalar(SNAP_MARKER_PX * this.worldPerPx(cam, vp, sn.p));
      m.material.color.setHex(color);
      let segs: { a: Pt3; b: Pt3; color: number }[] | null = null;
      if (sn.hints?.length) segs = sn.hints.map((h) => ({ a: h.a, b: h.b, color: AXIS_COLORS[h.axis] ?? 0x888888 }));
      else if (sn.kind.startsWith("axis") && view.snapAnchor) segs = [{ a: view.snapAnchor, b: sn.p, color }];
      if (segs) {
        const hk = segs.map((s) => `${s.color}:${s.a.x},${s.a.y},${s.a.z},${s.b.x},${s.b.y},${s.b.z}`).join("|");
        if (hk !== this.hintKey) {
          this.hintKey = hk;
          const pos: number[] = [], col: number[] = [];
          for (const s of segs) {
            pos.push(s.a.x, s.a.y, s.a.z, s.b.x, s.b.y, s.b.z);
            const c = this.tmpColor.setHex(s.color);
            col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          }
          this.setLineGeometry(this.hintLines, pos, col);
        }
        this.hintLines.visible = true;
      } else this.hintLines.visible = false;
    } else { this.snapMarker.visible = false; this.hintLines.visible = false; }

    // ---- teleport 弧线（绿=可落 / 红=取消）+ 落点环（只在充能中存在，位置每帧变 → 每帧重建这几十段）----
    const tp = view.teleport;
    if (tp && tp.points.length >= 2) {
      const color = tp.valid ? TP_OK : TP_BAD;
      const pos: number[] = [];
      for (let i = 0; i + 1 < tp.points.length; i++) {
        const a = tp.points[i], b = tp.points[i + 1];
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
      this.setLineGeometry(this.arcLines, pos, null);
      this.arcLines.material.color.setHex(color);
      this.arcLines.visible = true;
      if (tp.landing) {
        this.landingRing.visible = true;
        this.landingRing.position.set(tp.landing.x, tp.landing.y, tp.landing.z + 0.01);
        this.landingRing.material.color.setHex(color);
      } else this.landingRing.visible = false;
    } else { this.arcLines.visible = false; this.landingRing.visible = false; }

    this.renderer.render(this.scene, cam3);
  }

  /**
   * 离屏截图（缩略图；转正纪元 2026-09-20）：渲到 w×h 的 render target 再 readRenderTargetPixels。
   * 返回 RGBA、行序**自上而下**（three 读回是自下而上，这里翻好）。XR 会话中不截（相机归 XR）。
   */
  captureRgba(k: GeomView, cam: OrbitCamera, vp: Viewport, view: ViewState): Uint8Array {
    if (this.renderer.xr.isPresenting) throw new Error("captureRgba: not available during an XR session");
    const rt = new THREE.WebGLRenderTarget(vp.w, vp.h, { depthBuffer: true });
    const prevKeys = { f: this.faceKey, e: this.edgeKey };
    this.faceKey = ""; this.edgeKey = ""; this.poolKey = ""; this.overlayKey = "";   // 强制按干净视图重建（选区/悬停不进缩略图）
    try {
      this.renderer.setRenderTarget(rt);
      this.render(k, cam, vp, view);
      const buf = new Uint8Array(vp.w * vp.h * 4);
      this.renderer.readRenderTargetPixels(rt, 0, 0, vp.w, vp.h, buf);
      const out = new Uint8Array(buf.length);
      const row = vp.w * 4;
      for (let y = 0; y < vp.h; y++) out.set(buf.subarray(y * row, (y + 1) * row), (vp.h - 1 - y) * row);
      return out;
    } finally {
      this.renderer.setRenderTarget(null);
      rt.dispose();
      this.faceKey = prevKeys.f === "" ? "" : "";   // 下一帧按主视图键重建
      this.edgeKey = ""; this.poolKey = ""; this.overlayKey = "";
    }
  }

  /**
   * 全部膜 → 几何：无贴图材质的一份（三角汤 + 法向 + sRGB 顶点色 = 材质颜色 × 状态色），每种贴图材质一份（+UV）。
   * 平滑组（0.8，user「平滑组是一个很重要的概念，好好设计一下」）：被 **smooth** 边连起来的膜 = 一个平滑组，组内顶点法向 = 含该顶点的膜法向按内角加权平均；
   * soft（不画线）与 smooth（插值法向）是两个独立的边层（SU 的 Soft / Smooth），推拉侧棱两者都给、软化工具默认两者都给。
   */
  private rebuildFaces(kd: GeomView, view: ViewState): void {
    const dim = view.dimSlots;
    const activeIndex = (kd as unknown as { activeSlot?: () => { index: number } }).activeSlot?.().index ?? null;
    const smooth = perf.time("smoothNormals", () => flatSmoothNormals(kd));
    const groups = new Map<object | null, { pos: number[]; nor: number[]; col: number[]; uv: number[]; mat: { texture?: { mimeType: string; bytes: Uint8Array; sizeM: readonly [number, number] } } | null }>();
    for (const f of kd.faces()) {
      const rec = kd.planeOf(f.id);
      if (!rec) continue;
      const mat = kd.faceMaterial(f.id);
      const state = view.selectionFaces.has(f.id) ? PALETTE.faceSelected : view.hoverFace === f.id ? PALETTE.faceHover : dim?.has(Math.floor(f.id / ID_STRIDE)) ? PALETTE.faceDim : null;
      let r: number, g: number, b: number;
      if (state !== null) { [r, g, b] = srgb(state); if (mat && !mat.texture) { const [mr, mg, mb] = mat.color; r = (r + mr) / 2; g = (g + mg) / 2; b = (b + mb) / 2; } }
      else if (mat && !mat.texture) [r, g, b] = mat.color;
      else if (mat?.texture) [r, g, b] = [1, 1, 1];
      else [r, g, b] = srgb(PALETTE.face);
      const key = mat?.texture ? mat : (activeIndex !== null && Math.floor(f.id / ID_STRIDE) !== activeIndex ? OTHER_KEY : null);
      let grp = groups.get(key);
      if (!grp) { grp = { pos: [], nor: [], col: [], uv: [], mat: mat?.texture ? mat : null }; groups.set(key, grp); }
      const n = rec.plane.n;
      const sm = smooth.get(f.id);
      const texW = mat?.texture?.sizeM[0] ?? 1, texH = mat?.texture?.sizeM[1] ?? 1;
      for (const tri of faceTriangles(kd, f.id)) {
        for (const p of tri) {
          grp.pos.push(p.x, p.y, p.z);
          const nn = sm?.get(vkey(p)) ?? n;
          grp.nor.push(nn.x, nn.y, nn.z);
          grp.col.push(r, g, b);
          if (key) grp.uv.push(dot3(p, rec.basis.u) / texW, dot3(p, rec.basis.v) / texH);
        }
      }
    }
    // 默认 / 纯色材质：活动池一份、别的池一份（后者 polygonOffset 更靠后）
    const setPlain = (mesh: any, grp: { pos: number[]; nor: number[]; col: number[] } | undefined): void => {
      const old = mesh.geometry;
      if (!grp || !grp.pos.length) { mesh.visible = false; return; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(grp.pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(grp.nor, 3));
      geo.setAttribute("aColor", new THREE.Float32BufferAttribute(grp.col, 3));
      geo.setAttribute("aColorB", new THREE.Float32BufferAttribute(grp.col, 3));   // 平铺路径不分两侧（DT8 两个表面只在池级路径上画）
      mesh.geometry = geo; mesh.visible = true; old.dispose();
    };
    setPlain(this.faceMesh, groups.get(null));
    setPlain(this.faceMeshOther, groups.get(OTHER_KEY));
    // 贴图材质：每种一份网格（复用已有节点，多退少补）
    const texGroups = [...groups.entries()].filter(([k]) => k !== null && k !== OTHER_KEY);
    for (let i = 0; i < Math.max(texGroups.length, this.texMeshes.length); i++) {
      const tg = texGroups[i];
      let slot = this.texMeshes[i];
      if (!tg) { if (slot) slot.mesh.visible = false; continue; }
      const [matObj, grp] = tg as [object, { pos: number[]; nor: number[]; col: number[]; uv: number[]; mat: object | null }];
      if (!slot) {
        const mat = new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uMap: { value: null } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face });
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        slot = { mesh, mat, tex: null, key: "" };
        this.texMeshes.push(slot);
      }
      const tex = this.textureFor(matObj as { texture?: { mimeType: string; bytes: Uint8Array } });
      slot.mat.uniforms.uMap.value = tex;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(grp!.pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(grp!.nor, 3));
      geo.setAttribute("aColor", new THREE.Float32BufferAttribute(grp!.col, 3));
      geo.setAttribute("aUv", new THREE.Float32BufferAttribute(grp!.uv, 2));
      const oldG = slot.mesh.geometry;
      slot.mesh.geometry = geo;
      slot.mesh.visible = true;
      oldG.dispose();
    }
  }
  /** 材质对象 → three 纹理（原图字节解码一次缓存；解码是异步的，先给 1×1 灰占位，解好后 needsUpdate 并请求重画）。 */
  private textureFor(mat: { texture?: { mimeType: string; bytes: Uint8Array } }): any {
    let tex = this.texCache.get(mat);
    if (tex) return tex;
    tex = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this.texCache.set(mat, tex);
    const bytes = mat.texture?.bytes;
    if (bytes && typeof createImageBitmap === "function") {
      const blob = new Blob([bytes as BlobPart], { type: mat.texture!.mimeType });
      createImageBitmap(blob, { imageOrientation: "flipY" }).then((bmp) => {
        tex.image = bmp;
        tex.flipY = false;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.needsUpdate = true;
        this.onTextureReady?.();
      }).catch(() => { /* 解码失败：留灰占位 */ });
    }
    return tex;
  }
  /** 贴图异步解好后的回调（app 层接 editor.draw）。 */
  onTextureReady: (() => void) | null = null;

  /** 全部边 → 一份粗线（顶点色按类别）。 */
  /** 线稿风格（视图菜单「粗线稿」）。 */
  setLineStyle(style: LineStyle): void { if (this.lineStyle !== style) { this.lineStyle = style; this.edgeKey = ""; this.poolKey = ""; } }
  setXray(on: boolean): void { if (this.xray !== on) { this.xray = on; this.poolKey = ""; this.overlayKey = ""; } }
  getLineStyle(): LineStyle { return this.lineStyle; }
  /** 线稿粗细（设备像素）：1 = 原生线；> 1 = 粗线 + SU 轮廓线。 */
  setLineWeight(w: number): void { this.lineWeight = w; this.setLineStyle(w > 1 ? "thick" : "pixel"); }
  getLineWeight(): number { return this.lineWeight; }

  private rebuildEdges(kd: GeomView, view: ViewState): void {
    // thick：全部边进粗线。pixel：强调边（选中 / 刮擦 / 悬停）进粗线，其余进原生 GL 线。
    const pos: number[] = [], col: number[] = [];       // 粗线
    const ppos: number[] = [], pcol: number[] = [];     // 原生线
    const dim = view.dimSlots;
    for (const e of kd.edges()) {
      const selected = view.selectionEdges.has(e.id);
      const hot = view.scrubEdges.has(e.id) || view.hoverEdge === e.id;
      if ((kd.isSoft(e.id) || kd.isFold(e.id)) && !hot) continue;   // 软边不画（圆柱不长竖纹）；选中了也不画（user 2026-10-25「选中的时候软边显示了粗线」），只有刮擦 / 悬停高亮时画
      const hex =
        hot ? PALETTE.edgeHot
        : selected ? PALETTE.edgeSelected
        : dim?.has(Math.floor(e.id / ID_STRIDE)) ? PALETTE.edgeDim
        : e.faceLinks.length === 0 ? PALETTE.edgeWire
        : PALETTE.edge;
      const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
      const c = this.tmpColor.setHex(hex);
      const thick = this.lineStyle === "thick" || selected || hot;
      const P = thick ? pos : ppos, C = thick ? col : pcol;
      P.push(a.x, a.y, a.z, b.x, b.y, b.z);
      C.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    if (pos.length) { this.setLineGeometry(this.edgeLines, pos, col); this.edgeLines.visible = true; } else this.edgeLines.visible = false;
    if (ppos.length) {
      const old = this.edgePixel.geometry;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(ppos, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(pcol, 3));
      this.edgePixel.geometry = geo; old.dispose();
      this.edgePixel.visible = true;
    } else this.edgePixel.visible = false;
  }


  // ================= 池级几何（#22 池级局部性，2026-10-21，Claude Fable 5.1；DT96 池网格，2026-10-26，Claude Opus 5.5）=================
  // 每个槽一个 Group（矩阵 = 槽的世界变换）→ 下面的网格引用「这个池的共享几何」（本地坐标）。
  // 同 definition 的 N 个实例 = 一份几何 N 个矩阵；拖整棵子树 = 只改矩阵。
  // 几何 = 池网格（pool-mesh.ts）：跟着池现在显示的内核走（原件 / 预演副本 / 撤销快照之间按克隆族谱 + 改动日志算差），
  // 只重建改过的面 / 边、只上传改过的那几段。淡出 / 线稿风格不再是几何变体：淡出 = 同一份几何换一套颜色缓冲，线稿风格变了 = 池网格全量重建。
  private syncPools(kd: WorldView, view: ViewState): void {
    this.syncGen++;
    const dim = view.dimSlots;
    const taken = new Map<PoolGpu, Kernel>();   // 这一帧哪份池网格画的是哪个内核
    for (const s of kd.slots) {
      const key = slotKey(s);
      let n = this.slotNodes.get(key);
      if (!n) { n = this.makeSlotNodes(); this.slotNodes.set(key, n); }
      n.gen = this.syncGen;
      n.root.visible = true;
      setMatrix(n.root, s.xform);
      const pg = this.poolGpu(s, kd.scene, taken), dimmed = !!dim?.has(s.index);
      // 面：活动池 DEPTH.face、别的池 DEPTH.faceOther（#25 重叠时活动池 / loose 几何赢）
      n.plain.material = s.active ? this.faceMat : this.faceMatOther;
      const plain = pg.faces.get("plain"), showPlain = !!plain && (pg.mesh.groups.get("plain")?.store.count ?? 0) > 0;
      n.plain.geometry = showPlain ? (dimmed ? plain!.geoDim : plain!.geo) : this.emptyGeo; n.plain.visible = showPlain;
      let ti = 0;
      for (const gf of pg.faces.values()) {
        if (!gf.side || !gf.mat || !(pg.mesh.groups.get(gf.key)?.store.count)) continue;
        let slot = n.tex[ti];
        if (!slot) { const mesh = new THREE.Mesh(this.emptyGeo, this.texMatFor(gf.mat, gf.side)); mesh.frustumCulled = false; n.root.add(mesh); slot = { mesh }; n.tex.push(slot); }
        slot.mesh.material = this.texMatFor(gf.mat, gf.side);
        slot.mesh.geometry = dimmed ? gf.geoDim : gf.geo; slot.mesh.visible = true;
        ti++;
      }
      for (; ti < n.tex.length; ti++) n.tex[ti].mesh.visible = false;
      // 边
      const L = pg.lines, showL = !!L && pg.mesh.lines.count > 0;
      if (this.lineStyle === "thick") { n.thick.geometry = showL ? (dimmed ? L!.geoDim : L!.geo) : this.emptyLineGeo; n.thick.visible = showL; n.pixel.visible = false; }
      else { n.pixel.geometry = showL ? (dimmed ? L!.geoDim : L!.geo) : this.emptyGeo; n.pixel.visible = showL; n.thick.visible = false; }
      const xr = this.xray && showL;
      n.xthick.geometry = xr && this.lineStyle === "thick" ? n.thick.geometry : this.emptyLineGeo; n.xthick.visible = xr && this.lineStyle === "thick";
      n.xpixel.geometry = xr && this.lineStyle !== "thick" ? n.pixel.geometry : this.emptyGeo; n.xpixel.visible = xr && this.lineStyle !== "thick";
    }
    // 没了的槽：节点摘掉（几何是共享引用，不在这里释放）
    for (const [key, n] of this.slotNodes) if (n.gen !== this.syncGen) { this.scene.remove(n.root); this.slotNodes.delete(key); }
    // 池网格：两代没人用的释放（隔离看一个组件再出来 = 别的池全量重建一次，和以前一样）
    for (const [key, list] of this.poolGpus) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].gen < this.syncGen - 1) { this.disposePoolGpu(list[i]); list.splice(i, 1); }
      if (!list.length) this.poolGpus.delete(key);
    }
    this.faceMeshOther.visible = false;   // 平铺路径的节点
  }
  private hidePools(): void { for (const n of this.slotNodes.values()) n.root.visible = false; }
  private makeSlotNodes(): SlotNodes {
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    const plain = new THREE.Mesh(this.emptyGeo, this.faceMat); plain.frustumCulled = false; plain.visible = false;
    const pixel = new THREE.LineSegments(this.emptyGeo, this.pixelMat); pixel.frustumCulled = false; pixel.visible = false;
    const thick = new LineSegments2(this.emptyLineGeo, this.edgeMat); thick.frustumCulled = false; thick.visible = false;
    const xpixel = new THREE.LineSegments(this.emptyGeo, this.xrayPixelMat); xpixel.frustumCulled = false; xpixel.visible = false; xpixel.renderOrder = 3;
    const xthick = new LineSegments2(this.emptyLineGeo, this.xrayThickMat); xthick.frustumCulled = false; xthick.visible = false; xthick.renderOrder = 3;
    root.add(plain); root.add(pixel); root.add(thick); root.add(xpixel); root.add(xthick);
    this.scene.add(root);
    return { root, plain, tex: [], pixel, thick, xpixel, xthick, gen: 0 };
  }
  private texMatFor(mat: Material, side: TexSide = "double"): any {
    let bySide = this.texMats.get(mat);
    if (!bySide) { bySide = new Map(); this.texMats.set(mat, bySide); }
    let m = bySide.get(side);
    if (m) return m;
    m = new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uMap: { value: this.textureFor(mat) } }, side: side === "front" ? THREE.FrontSide : side === "back" ? THREE.BackSide : THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face });
    bySide.set(side, m);
    return m;
  }
  /** 槽 s 用哪份池网格（同步到 s 的内核、传上显卡）。同一帧同一个内核只同步一次。 */
  private poolGpu(s: PoolSlot, scene: Scene, taken: Map<PoolGpu, Kernel>): PoolGpu {
    const key = poolKey(s.pool), k = s.kernel;
    let list = this.poolGpus.get(key);
    if (!list) { list = []; this.poolGpus.set(key, list); }
    let pg = list.find((p) => taken.get(p) === k);
    if (pg) return pg;
    pg = list.find((p) => !taken.has(p) && p.mesh.source === k) ?? list.find((p) => !taken.has(p));
    if (!pg) { pg = { mesh: new PoolMesh(), faces: new Map(), lines: null, gen: 0 }; list.push(pg); }
    taken.set(pg, k); pg.gen = this.syncGen;
    const P = pg, env = this.poolEnv(scene, s.pool.def);
    const r = perf.time("poolMesh.sync", () => P.mesh.sync(k, env));
    if (r.full) perf.count["poolMesh.full"] = (perf.count["poolMesh.full"] ?? 0) + 1;   // 全量重建了几次（探针 / 黑匣子：拖动预演里不该涨）
    perf.time("poolMesh.upload", () => this.uploadPool(P));
    return pg;
  }
  private poolEnv(scene: Scene, defId: number): PoolMeshEnv {
    const uid = (m: Material | undefined): number => { if (!m) return 0; let u = this.matUids.get(m); if (u === undefined) { u = this.nextMatUid++; this.matUids.set(m, u); } return u; };
    const c = new THREE.Color(), hex = (h: number): readonly [number, number, number] => { c.setHex(h); return [c.r, c.g, c.b]; };
    const eDim = hex(PALETTE.edgeDim), eWire = hex(PALETTE.edgeWire), eFace = hex(PALETTE.edge);
    return {
      matOf: (slot) => scene.materialOfSlot(defId, slot),
      slotsSig: scene.brep(defId).materialSlots.map((i) => uid(scene.materials[i])).join(","),
      // 淡出（上下文之外）：底色换成 faceDim、纯色材质和它对半混；贴图材质 = faceDim 乘贴图（和以前的变体同一套规则）
      faceColor: (mat, dim) => {
        if (dim) { const d = srgb(PALETTE.faceDim); return mat && !mat.texture ? [(d[0] + mat.color[0]) / 2, (d[1] + mat.color[1]) / 2, (d[2] + mat.color[2]) / 2] : d; }
        if (mat && !mat.texture) return [mat.color[0], mat.color[1], mat.color[2]];
        return mat?.texture ? [1, 1, 1] : srgb(PALETTE.face);
      },
      edgeColor: (loose, dim) => (dim ? eDim : loose ? eWire : eFace),
      thick: this.lineStyle === "thick",
    };
  }
  /** 池网格改过的段 → 显卡。数组换过（长大了 / 全量重建换了线仓库）= 那份几何重建。 */
  private uploadPool(pg: PoolGpu): void {
    for (const [key, gf] of pg.faces) if (!pg.mesh.groups.has(key)) { gf.geo.dispose(); gf.geoDim.dispose(); pg.faces.delete(key); }   // 全量重建后不再有的组
    for (const g of pg.mesh.groups.values()) {
      const d = g.store.takeDirty();
      let gf = pg.faces.get(g.key);
      if (!gf || d.grown || gf.attrs.position.array !== g.store.arrays.position) {
        if (gf) { gf.geo.dispose(); gf.geoDim.dispose(); }
        // 法线 / 面颜色是归一化整数（pool-mesh 的 i16n / i8n）：显卡读成 −1…1 的浮点
        const A = g.store.arrays, attr = (name: string, size: number): any => { const x = new THREE.BufferAttribute(A[name], size, !(A[name] instanceof Float32Array)); x.setUsage(THREE.DynamicDrawUsage); return x; };
        const at: Record<string, any> = { position: attr("position", 3), normal: attr("normal", 3), aColor: attr("aColor", 3), aColorDim: attr("aColorDim", 3) };
        if (g.side) at.aUv = attr("aUv", 2); else { at.aColorB = attr("aColorB", 3); at.aColorBDim = attr("aColorBDim", 3); }
        const mk = (dim: boolean): any => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", at.position); geo.setAttribute("normal", at.normal);
          geo.setAttribute("aColor", dim ? at.aColorDim : at.aColor); geo.setAttribute("_aColorOther", dim ? at.aColor : at.aColorDim);
          if (g.side) geo.setAttribute("aUv", at.aUv);
          else { geo.setAttribute("aColorB", dim ? at.aColorBDim : at.aColorB); geo.setAttribute("_aColorBOther", dim ? at.aColorB : at.aColorBDim); }
          return geo;
        };
        gf = { key: g.key, mat: g.mat, side: g.side, attrs: at, geo: mk(false), geoDim: mk(true) };
        pg.faces.set(g.key, gf);
      } else for (const a of Object.values(gf.attrs)) pushRanges(a, a.itemSize, d.ranges);
      gf.geo.setDrawRange(0, g.store.end); gf.geoDim.setDrawRange(0, g.store.end);
    }
    const L = pg.mesh.lines, d = L.takeDirty(), thick = this.lineStyle === "thick";
    let gl = pg.lines;
    const A = L.arrays;
    if (!gl || d.grown || gl.thick !== thick || gl.bufs.first.array !== A[thick ? "seg" : "position"]) {
      if (gl) { gl.geo.dispose(); gl.geoDim.dispose(); }
      if (thick) {
        const ib = (name: string, stride: number): any => { const b = new THREE.InstancedInterleavedBuffer(A[name], stride, 1); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const ia = (name: string, size: number): any => { const b = new THREE.InstancedBufferAttribute(A[name], size); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const bufs: Record<string, any> = { first: ib("seg", 6), col: ib("col", 6), colDim: ib("colDim", 6), w1: ia("w1", 3), w2: ia("w2", 3), flag: ia("flag", 1) };
        const mk = (dim: boolean): any => {
          const geo = new LineSegmentsGeometry(), c = dim ? bufs.colDim : bufs.col, o = dim ? bufs.col : bufs.colDim;
          geo.setAttribute("instanceStart", new THREE.InterleavedBufferAttribute(bufs.first, 3, 0)); geo.setAttribute("instanceEnd", new THREE.InterleavedBufferAttribute(bufs.first, 3, 3));
          geo.setAttribute("instanceColorStart", new THREE.InterleavedBufferAttribute(c, 3, 0)); geo.setAttribute("instanceColorEnd", new THREE.InterleavedBufferAttribute(c, 3, 3));
          geo.setAttribute("_colorOther", new THREE.InterleavedBufferAttribute(o, 3, 0));
          geo.setAttribute("instanceW1", bufs.w1); geo.setAttribute("instanceW2", bufs.w2); geo.setAttribute("instanceFlag", bufs.flag);
          return geo;
        };
        gl = { thick, bufs, geo: mk(false), geoDim: mk(true) };
      } else {
        const attr = (name: string): any => { const x = new THREE.BufferAttribute(A[name], 3); x.setUsage(THREE.DynamicDrawUsage); return x; };
        const bufs: Record<string, any> = { first: attr("position"), color: attr("color"), colorDim: attr("colorDim") };
        const mk = (dim: boolean): any => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", bufs.first); geo.setAttribute("color", dim ? bufs.colorDim : bufs.color); geo.setAttribute("_colorOther", dim ? bufs.color : bufs.colorDim);
          return geo;
        };
        gl = { thick, bufs, geo: mk(false), geoDim: mk(true) };
      }
      pg.lines = gl;
    } else for (const b of Object.values(gl.bufs)) pushRanges(b, b.stride ?? b.itemSize, d.ranges);
    if (thick) { gl.geo.instanceCount = L.count; gl.geoDim.instanceCount = L.count; }
    else { gl.geo.setDrawRange(0, L.end); gl.geoDim.setDrawRange(0, L.end); }
  }
  private disposePoolGpu(pg: PoolGpu): void {
    for (const gf of pg.faces.values()) { gf.geo.dispose(); gf.geoDim.dispose(); }
    if (pg.lines) { pg.lines.geo.dispose(); pg.lines.geoDim.dispose(); }
  }
  /** 覆盖层：选中 / 悬停的面（世界坐标，只这几张）+ 选中 / 刮擦 / 悬停的边（粗线）。 */
  private rebuildOverlay(kd: GeomView, view: ViewState): void {
    const ids = new Set<FaceId>(view.selectionFaces);
    if (view.hoverFace !== null) ids.add(view.hoverFace);
    const groups = new Map<object | null, { pos: number[]; nor: number[]; col: number[]; uv: number[] }>();
    for (const fid of ids) {
      const f = kd.face(fid), rec = kd.planeOf(fid);
      if (!f || !rec) continue;
      const mat = kd.faceMaterial(fid);
      let [r, g, b] = srgb(view.selectionFaces.has(fid) ? PALETTE.faceSelected : PALETTE.faceHover);
      if (mat && !mat.texture) { const [mr, mg, mb] = mat.color; r = (r + mr) / 2; g = (g + mg) / 2; b = (b + mb) / 2; }
      const key = mat?.texture ? mat : null;
      let grp = groups.get(key);
      if (!grp) { grp = { pos: [], nor: [], col: [], uv: [] }; groups.set(key, grp); }
      const n = rec.plane.n;
      const texW = mat?.texture?.sizeM[0] ?? 1, texH = mat?.texture?.sizeM[1] ?? 1;
      for (const tri of faceTriangles(kd, fid)) for (const p of tri) {
        grp.pos.push(p.x, p.y, p.z); grp.nor.push(n.x, n.y, n.z); grp.col.push(r, g, b);
        if (key) grp.uv.push(dot3(p, rec.basis.u) / texW, dot3(p, rec.basis.v) / texH);
      }
    }
    const plain = groups.get(null);
    this.faceMesh.material = this.faceMatTop;
    if (plain && plain.pos.length) {
      const old = this.faceMesh.geometry;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(plain.pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(plain.nor, 3));
      geo.setAttribute("aColor", new THREE.Float32BufferAttribute(plain.col, 3));
      geo.setAttribute("aColorB", new THREE.Float32BufferAttribute(plain.col, 3));   // 覆盖层（选中 / 悬停）两侧同色
      this.faceMesh.geometry = geo; this.faceMesh.visible = true; if (old !== this.emptyGeo) old.dispose();
    } else this.faceMesh.visible = false;
    const texGroups = [...groups.entries()].filter(([k]) => k !== null) as [Material, { pos: number[]; nor: number[]; col: number[]; uv: number[] }][];
    for (let i = 0; i < Math.max(texGroups.length, this.texMeshes.length); i++) {
      const tg = texGroups[i];
      let slot = this.texMeshes[i];
      if (!tg) { if (slot) slot.mesh.visible = false; continue; }
      if (!slot) {
        const mat = new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uMap: { value: null } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOverlay });
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        slot = { mesh, mat, tex: null, key: "" };
        this.texMeshes.push(slot);
      }
      slot.mat.uniforms.uMap.value = this.textureFor(tg[0]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(tg[1].pos, 3));
      geo.setAttribute("normal", new THREE.Float32BufferAttribute(tg[1].nor, 3));
      geo.setAttribute("aColor", new THREE.Float32BufferAttribute(tg[1].col, 3));
      geo.setAttribute("aUv", new THREE.Float32BufferAttribute(tg[1].uv, 2));
      const oldG = slot.mesh.geometry; slot.mesh.geometry = geo; slot.mesh.visible = true; oldG.dispose();
    }
    // 边覆盖层：选中 / 刮擦 / 悬停 → 粗线
    const pos: number[] = [], col: number[] = [];
    const eids = new Set<EdgeId>([...view.selectionEdges, ...view.scrubEdges, ...(view.warnEdges ?? [])]);
    if (view.hoverEdge !== null) eids.add(view.hoverEdge);
    for (const id of eids) {
      if (!kd.graph.hasEdge(id)) continue;
      const e = kd.graph.edge(id);
      const hot = view.scrubEdges.has(id) || view.hoverEdge === id, warn = !hot && !!view.warnEdges?.has(id);
      if ((kd.isSoft(id) || kd.isFold(id)) && !hot && !warn) continue;   // 选中的软边不画粗线（user 2026-10-25「选中的时候软边显示了粗线」）；「检查」标的软边照画
      const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
      const c = this.tmpColor.setHex(hot ? PALETTE.edgeHot : warn ? PALETTE.edgeWarn : PALETTE.edgeSelected);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    this.edgeLines.material = this.xray ? this.xrayOverlayMat : this.edgeMat;   // X 光：选中 / 悬停 / 检查标的边不被面挡
    if (pos.length) { this.setLineGeometry(this.edgeLines, pos, col); this.edgeLines.visible = true; } else this.edgeLines.visible = false;
    this.edgePixel.visible = false;
  }

  /** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起/止顶点色，线性空间）或 null。 */
  private setLineGeometry(obj: any, pos: number[], col: number[] | null): void {
    const old = obj.geometry;
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pos);
    if (col) geo.setColors(col);
    obj.geometry = geo;
    old.dispose();
  }

  /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
  private xrKeyLight(): Pt3 {
    const c = this.renderer.xr.getCamera();
    const m = c.matrixWorld.elements;
    const e = { x: m[8], y: m[9], z: m[10] }, u = { x: m[4], y: m[5], z: m[6] }, r = { x: m[0], y: m[1], z: m[2] };
    const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
    const n = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / n, y: v.y / n, z: v.z / n };
  }

  /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
  /** 一组小三轴（每个帧：原点出三根屏幕定长 POOL_AXES_PX 的短轴，RGB = XYZ）；key 没变就不重建。返回新 key。 */
  private drawTriads(lines: any, frames: readonly Frame[] | null | undefined, key: string, cam: any, vp: any): string {
    if (!frames || !frames.length) { lines.visible = false; return ""; }
    const wpp = frames.map((f) => this.worldPerPx(cam, vp, f.origin));
    const k = frames.map((f, i) => `${f.origin.x},${f.origin.y},${f.origin.z}/${f.x.x},${f.x.y},${f.x.z}/${f.y.x},${f.y.y},${f.y.z}/${f.z.x},${f.z.y},${f.z.z}@${wpp[i].toExponential(2)}`).join("|");
    if (k !== key) {
      const pos: number[] = [], col: number[] = [];
      frames.forEach((f, i) => {
        const L = POOL_AXES_PX * wpp[i], o = f.origin;
        for (const [d, hex] of [[f.x, PALETTE.axisX], [f.y, PALETTE.axisY], [f.z, PALETTE.axisZ]] as const) {
          pos.push(o.x, o.y, o.z, o.x + d.x * L, o.y + d.y * L, o.z + d.z * L);
          const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      });
      this.setLineGeometry(lines, pos, col);
    }
    lines.visible = true;
    return k;
  }
  private lineMat(px: number, opts: { offset?: boolean; vertexColors?: boolean; blend?: "multiply" } = {}): any {
    const mat = new LineMaterial({
      color: 0xffffff,
      linewidth: px,
      resolution: this.resolution,
      vertexColors: !!opts.vertexColors,
      polygonOffset: !!opts.offset,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -2,
    });
    if (opts.blend === "multiply") { mat.blending = THREE.MultiplyBlending; mat.premultipliedAlpha = true; mat.transparent = true; mat.depthWrite = false; }   // 正片叠底：只变暗底下的东西，不盖色；three 要求 premultipliedAlpha
    this.lineMats.push(mat); this.lineMatPx.push(px);
    return mat;
  }

  /**
   * 地面网格 = 一张 shader 平面（GRID_FRAG；0.13.23 起不再一条条线）+ 三色轴一份粗线（SU 约定：X 红 / Y 绿 / Z 蓝向上）。
   * 0.11 ⑤ 起跟帧与格距走：平面贴在帧的 XY 面上、过帧原点；格距 / 细分是 uniform。网格关着时只画 1 m 主线（sub = 1）。
   */
  private rebuildGrid(frame: Frame, step: number, sub: number): void {
    const o = frame.origin, X = frame.x, Y = frame.y, Zd = frame.z;
    const L = GRID_N * GRID_STEP;
    if (!this.gridMesh) {
      this.gridMat = new THREE.ShaderMaterial({
        uniforms: { uStep: { value: 1 }, uSub: { value: 1 }, uPx: { value: STATIC_PX }, uMajor: { value: new THREE.Color(PALETTE.gridMajor) }, uMinor: { value: new THREE.Color(PALETTE.gridMinor) } },
        vertexShader: GRID_VERT, fragmentShader: GRID_FRAG,
        transparent: true, depthWrite: false, blending: THREE.MultiplyBlending, premultipliedAlpha: true, side: THREE.DoubleSide,   // three 的 MultiplyBlending 只在 premultipliedAlpha 下生效（否则只报错不混合 = 白格子盖满地面）
        depthFunc: THREE.LessDepth, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: DEPTH.guide,   // 深度阶梯（DEPTH 注释）：面后、边前，不 z-fight（user「加一个 z-offset 的事情」）
      });
      this.gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * L), this.gridMat);
      this.gridMesh.frustumCulled = false; this.gridMesh.renderOrder = -1; this.gridMesh.matrixAutoUpdate = false;
      this.scene.add(this.gridMesh);
      const axesMat = this.lineMat(STATIC_PX, { vertexColors: true });   // 不前拉：轴在边后面（DEPTH 注释）
      axesMat.depthFunc = THREE.LessDepth; axesMat.polygonOffset = true; axesMat.polygonOffsetFactor = 0; axesMat.polygonOffsetUnits = DEPTH.guide;
      this.axesObj = new LineSegments2(new LineSegmentsGeometry(), axesMat);
      this.axesObj.frustumCulled = false;
      this.scene.add(this.axesObj);
    }
    this.gridMat.uniforms.uStep.value = step > 1e-6 ? step : 1;
    this.gridMat.uniforms.uSub.value = sub > 1 ? sub : 1;
    this.gridMesh.matrix.set(X.x, Y.x, Zd.x, o.x, X.y, Y.y, Zd.y, o.y, X.z, Y.z, Zd.z, o.z, 0, 0, 0, 1);
    this.gridMesh.matrixWorldNeedsUpdate = true;
    const at = (u: number, v: number, w: number): Pt3 => ({ x: o.x + X.x * u + Y.x * v + Zd.x * w, y: o.y + X.y * u + Y.y * v + Zd.y * w, z: o.z + X.z * u + Y.z * v + Zd.z * w });
    const apos: number[] = [], acol: number[] = [];
    const pushA = (a: Pt3, b: Pt3, hex: number): void => { apos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); acol.push(c.r, c.g, c.b, c.r, c.g, c.b); };
    // 轴切成短段（2026-10-25 Opus）：LineMaterial 在屏幕上按两端点插值深度，一根 100 m 的线一端越过近平面被截断后插值误差很大，
    // 实测（2× 像素比）轴的深度会跑到压在它上面的边前面，多边形偏移也救不回来。短段各自插值，深度准。
    const AXIS_SEG = 2;   // 米
    const seg = (a: number, b: number, f: (t: number) => Pt3, hex: number): void => { for (let t = a; t < b - 1e-9; t += AXIS_SEG) pushA(f(t), f(Math.min(b, t + AXIS_SEG)), hex); };
    seg(-L, L, (t) => at(t, 0, 0), PALETTE.axisX);
    seg(-L, L, (t) => at(0, t, 0), PALETTE.axisY);
    seg(0, L, (t) => at(0, 0, t), PALETTE.axisZ);
    this.setLineGeometry(this.axesObj, apos, acol);
  }
}

/** 3×4 行主序 Xform → three 矩阵（Group 的本地矩阵；matrixAutoUpdate 关着）。 */
function setMatrix(obj: any, m: Xform): void {
  obj.matrix.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], 0, 0, 0, 1);
  obj.matrixWorldNeedsUpdate = true;
}

/**
 * 平铺路径的平滑法线（DT96 起和池网格、导出同一个算法：扇内法线，pool-mesh.ts fanNormal——硬边在平滑组里也断开明暗）。
 * 返回 面 id → (顶点坐标键 → 法向)；外环上没有平滑边 / 折线的面不在表里（用平面法向）。
 */
function flatSmoothNormals(kd: GeomView): Map<FaceId, Map<string, Pt3>> {
  const out = new Map<FaceId, Map<string, Pt3>>();
  for (const f of kd.faces()) {
    if (!kd.planeOf(f.id) || !f.outer.edges.some((d) => kd.isSmooth(d.edge) || kd.isFold(d.edge))) continue;
    const m = new Map<string, Pt3>();
    f.outer.vids.forEach((v, j) => m.set(vkey(kd.graph.pt(v)), fanNormal(kd, f.id, j)));
    out.set(f.id, m);
  }
  return out;
}

/** 把改过的单位区间登记成局部上传（元素数 = 单位 × 每单位几个数；相隔不远的并成一段，攒多了并成一整段）。 */
function pushRanges(a: any, per: number, ranges: readonly (readonly [number, number])[]): void {
  if (!ranges.length) return;
  let cs = ranges[0][0], ce = ranges[0][1];
  const flush = (): void => a.addUpdateRange(cs * per, (ce - cs) * per);
  for (let i = 1; i < ranges.length; i++) { const [rs, re] = ranges[i]; if (rs - ce <= 256) ce = Math.max(ce, re); else { flush(); cs = rs; ce = re; } }
  flush();
  if (a.updateRanges.length > 64) {
    let lo = Infinity, hi = 0;
    for (const r of a.updateRanges) { lo = Math.min(lo, r.start); hi = Math.max(hi, r.start + r.count); }
    a.clearUpdateRanges(); a.addUpdateRange(lo, hi - lo);
  }
  a.needsUpdate = true;
}

/**
 * 平滑法向表的顶点键：坐标按 1 µm 取整（内核的格点）。三角化出来的点是从平面基二维坐标抬回来的，和环上的点差浮点尾数——
 * 以前按原样字符串查，三分之二对不上、退回面法向 = 圆柱侧面一条条（DT11，2026-10-26 核过：24 边圆柱 96 个角 64 个没查到）。
 */
const vkey = (p: Pt3): string => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)},${Math.round(p.z * 1e6)}`;

/** 相机系 key light：眼方向 + 上 0.55 + 右 0.35（Blender studio 光的最小近似）。 */
function keyLight(cam: OrbitCamera): Pt3 {
  const e = cam.eyeDir(), u = cam.up(), r = cam.right();
  const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

/**
 * 面的三角剖分（世界坐标；含洞）——膜批几何与 OBJ 导出等「字节出口」共用，three 的 earcut 不出本文件。
 */
export function faceTriangles(k: GeomView, id: FaceId): [Pt3, Pt3, Pt3][] {
  const f = k.face(id);
  const rec = k.planeOf(id);
  if (!f || !rec) return [];
  const contour = f.outer.pts.map((p) => new THREE.Vector2(p.x, p.y));
  const holes = f.holes.map((h) => h.pts.map((p) => new THREE.Vector2(p.x, p.y)));
  const tris: number[][] = THREE.ShapeUtils.triangulateShape(contour, holes);
  const all = [...contour, ...holes.flat()];
  const { u, v } = rec.basis;
  const n = rec.plane.n, d = rec.plane.d;
  const lift = (q: { x: number; y: number }): Pt3 => ({
    x: u.x * q.x + v.x * q.y + n.x * d,
    y: u.y * q.x + v.y * q.y + n.y * d,
    z: u.z * q.x + v.z * q.y + n.z * d,
  });
  // 绕向统一成「绕 +n 逆时针」（平面基里逆时针；u × v = n）：两个表面（DT8）靠 gl_FrontFacing 分正反，三角的绕向必须一致
  return tris.map(([a, b, c]) => {
    const A = all[a], B = all[b], C = all[c];
    const ccw = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) >= 0;
    return ccw ? [lift(A), lift(B), lift(C)] : [lift(A), lift(C), lift(B)];
  });
}
