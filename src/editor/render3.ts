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
import type { Kernel } from "../kernel/kernel.ts";
import type { Material, Scene } from "../scene/scene.ts";
import { type Frame, type Xform, WORLD_FRAME } from "../scene/xform.ts";
import type { GuidesWorld } from "../scene/guides.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import type { Snap3 } from "./pick.ts";
import { cross3, dot3, sub3 } from "../kernel/geom.ts";
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
};
const CHARGED_COLOR = 0x8b5cf6, CHARGED_EXT_COLOR = 0xd4d0f5, CHARGED_PX = 5;
/** 参考几何（0.11 尺规纪元）：参考线画 ±GUIDE_LEN 的长线（视觉上 = 无限），参考点画三轴小叉（像素尺寸）。 */
const GUIDE_COLOR = 0x6b7280, GUIDE_SEL_COLOR = 0x2b6cb0, GUIDE_LEN = 200, GUIDE_POINT_PX = 6;   // 选中 = 与选中膜同一个蓝（A31）
/** A33 断口小垂线：半长 px + 颜色（提醒色，与参考线 / 充能区分）。 */
/** A33 断口小垂线：半长 = 线宽 × TICK_K、颜色 = 边线色、粗细 = 边线（user 2026-10-24「首先应该黑色，其次应该小一点不显眼……线宽的多少倍……相当于线上面多一个鼓包这样，但是看得出是一个线头」；此前橙色、半长固定 5 px）。 */
const TICK_K = 2;

const AXIS_COLORS: Record<string, number> = { x: PALETTE.axisX, y: PALETTE.axisY, z: PALETTE.axisZ, u: 0x888888, v: 0x888888, i: 0x111111 };
const TP_OK = 0x2e8b57, TP_BAD = 0xcc3333;

/** 线稿风格：pixel = 原生 GL 线 1 设备像素（默认）；thick = 屏幕像素宽粗线（LineSegments2）。 */
export type LineStyle = "pixel" | "thick";
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
interface KernelGeom { key: string; kernel: Kernel; plain: any; tex: { mat: Material; geo: any }[]; pixel: any; thick: any; gen: number; }
/** 一个槽（实例 / group 出现的一个位置）的 three 节点：一个 Group 带矩阵，下面纯色面 / 贴图面 / 原生线 / 粗线，几何全是共享引用。 */
interface SlotNodes { root: any; plain: any; tex: { mesh: any }[]; pixel: any; thick: any; gen: number; }

export interface ViewState {
  selectionEdges: ReadonlySet<EdgeId>;
  selectionFaces: ReadonlySet<FaceId>;
  scrubEdges: ReadonlySet<EdgeId>;
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
  /** 上下文的帧（世界坐标）：不是世界帧时画三色上下文轴。 */
  frame?: Frame | null;
  /** 地面网格（0.11 ⑤）：跟上下文的帧走（user「网格帧 = 绘图轴」），格距 = 网格开着时的 step、否则 1 m；三色轴 = 帧的三轴。不给 = 世界帧 1 m。 */
  grid?: { frame: Frame; step: number; sub?: number; on?: boolean } | null;
  /** 充能点 / 充能边（0.11.6，user「让充能点有个小标记」）：点画小菱形，边画淡淡的延长线。 */
  charged?: { points: readonly Pt3[]; edges: readonly { a: Pt3; b: Pt3 }[] } | null;
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
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    vColor = aColor;
    vNormal = normalMatrix * normal;   // 视空间（每槽自己的矩阵、非均匀缩放 / 镜像都对）；uLight 也按视空间喂
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const FACE_FRAG = /* glsl */`
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    gl_FragColor = vec4(vColor * k, 1.0);   // vColor 已是 sRGB，直接出（与旧 shade() 同值）
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
  private geomCache = new WeakMap<Kernel, KernelGeom[]>();
  private geomsAlive = new Set<KernelGeom>();
  private syncGen = 0;
  private poolKey = ""; private overlayKey = "";
  private emptyGeo: any; private emptyLineGeo: any;
  private texMeshes: { mesh: any; mat: any; tex: any; key: string }[] = [];   // 每种贴图材质一份网格（自己的 UV）
  private texCache = new Map<object, any>();                                  // Material 对象 → three Texture（原图解码一次）
  private faceMeshOther: any; private faceMatOther: any;
  private edgeLines: any; private edgeMat: any;
  private edgePixel: any;                 // 原生 GL 线（1 设备像素）：默认线稿
  private lineStyle: LineStyle = "pixel";
  private lineWeight = 1;                              // 设备像素；1 = 原生线
  private readonly profileAdd = { value: 1 };          // 轮廓线加粗（设备像素）；edgeMat 的 shader uniform
  private hintLines: any;
  private snapMarker: any;
  private arcLines: any; private landingRing: any;
  private handleMarkers: any[] = [];
  private protractorLines: any;
  /** 世界里的文字：按 id 管面片（world-labels.ts 出位图；字 / 样式没变不重画）。 */
  private labelSprites = new Map<string, { sprite: any; key: string; w: number; h: number }>();
  private guideLines: any; private tapeLines: any; private gridMesh: any = null; private gridMat: any = null; private axesObj: any = null; private chargedLines: any; private tickLines: any;
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
        .replace("uniform float linewidth;", "uniform float linewidth;\nuniform float profileAdd;\nattribute vec3 instanceN1;\nattribute vec3 instanceN2;\nattribute float instanceFlag;")
        .replace("float aspect = resolution.x / resolution.y;", `float aspect = resolution.x / resolution.y;
			// SU 轮廓线：flag = 这条边的面数（0 悬空 / 1 边界 / 2 内边或剪影 / 3+ 非流形）；两面朝向相反 = 剪影
			vec4 csA = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? normalize( csA.xyz ) : vec3( 0.0, 0.0, - 1.0 );
			bool fa = dot( normalMatrix * instanceN1, vdir ) < 0.0;
			bool fb = dot( normalMatrix * instanceN2, vdir ) < 0.0;
			bool isProfile = instanceFlag < 1.5 || instanceFlag > 2.5 || ( fa != fb );
			float lw = linewidth + ( isProfile ? profileAdd : 0.0 );`)
        .replace("float hw = linewidth * 0.5;", "float hw = lw * 0.5;")
        .replace("offset *= linewidth;", "offset *= lw;");
    };
    this.edgeMat.customProgramCacheKey = (): string => "catsup-profile-edges";
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
    // 缩放柄（14 个小方块，按屏幕像素定尺寸；走深度测试）
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x2e8b57 }));
      m.visible = false;
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
    this.tickLines = new LineSegments2(new LineSegmentsGeometry(), this.lineMat(HINT_PX, { offset: true, vertexColors: true }));
    this.tickLines.frustumCulled = false; this.tickLines.visible = false;
    this.scene.add(this.tickLines);

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

  private syncCamera(cam: OrbitCamera, vp: Viewport): any {
    const eye = cam.eye(), up = cam.up();
    let c: any;
    if (cam.projection === "persp") {
      c = this.camPersp;
      const d = cam.eyeDist();
      c.fov = (cam.fovY * 180) / Math.PI;
      c.aspect = vp.w / vp.h;
      c.near = Math.max(cam.nearClamp(), d * 0.02);
      c.far = d * 40 + 100;
    } else {
      c = this.camOrtho;
      const halfW = cam.halfW(vp);
      c.left = -halfW; c.right = halfW;
      c.top = cam.halfH; c.bottom = -cam.halfH;
      // 深度窗口围着 target（眼在 5000 m 外）：R 随 zoom 走，小零件也有毫米级深度分辨率
      const D = cam.eyeDist(), R = Math.max(500, cam.halfH * 100);
      c.near = Math.max(0.1, D - R); c.far = D + R;
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
      cam3 = this.syncCamera(cam, vp);
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
      const ok = `${kid}:${rev}:${selF}:${view.hoverFace ?? ""}:${selE}:${[...view.scrubEdges].join(",")}:${view.hoverEdge ?? ""}`;
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
    if (gd && (gd.lines.length || gd.points.length)) {
      const px = gd.points.length ? this.worldPerPx(cam, vp, gd.points[0].p) : 0;
      const gsel = view.guideSel, gcol = (id: number): number => (gsel?.has(id) ? GUIDE_SEL_COLOR : GUIDE_COLOR);
      const gk = `${gd.lines.map((l) => `${l.id}:${l.p.x},${l.p.y},${l.p.z}>${l.dir.x},${l.dir.y},${l.dir.z}`).join("|")}#${gd.points.map((q) => `${q.id}:${q.p.x},${q.p.y},${q.p.z}`).join("|")}#${px.toExponential(2)}#${gsel ? [...gsel].join(",") : ""}`;
      if (gk !== this.guideKey) {
        this.guideKey = gk;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        for (const l of gd.lines) push({ x: l.p.x - l.dir.x * GUIDE_LEN, y: l.p.y - l.dir.y * GUIDE_LEN, z: l.p.z - l.dir.z * GUIDE_LEN }, { x: l.p.x + l.dir.x * GUIDE_LEN, y: l.p.y + l.dir.y * GUIDE_LEN, z: l.p.z + l.dir.z * GUIDE_LEN }, gcol(l.id));
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
    const gfr = view.grid?.frame ?? view.frame ?? WORLD_FRAME, gstep = view.grid?.step ?? 1, gsub = view.grid?.on ? (view.grid?.sub ?? 1) : 1;
    const gk = `${gfr.origin.x},${gfr.origin.y},${gfr.origin.z}|${gfr.x.x},${gfr.x.y},${gfr.x.z}|${gfr.y.x},${gfr.y.y},${gfr.y.z}|${gfr.z.x},${gfr.z.y},${gfr.z.z}|${gstep}|${gsub}`;
    if (gk !== this.gridKey) { this.gridKey = gk; this.rebuildGrid(gfr, gstep, gsub); }

    // ---- 充能标记：点 = 小菱形（像素尺寸），边 = 淡淡的延长线 ----
    const ch = view.charged;
    if (ch && (ch.points.length || ch.edges.length)) {
      const px0 = ch.points.length ? this.worldPerPx(cam, vp, ch.points[0]) : 0;
      const ck = `${ch.points.map((p) => `${p.x},${p.y},${p.z}`).join("|")}#${ch.edges.map((e) => `${e.a.x},${e.a.y},${e.a.z}>${e.b.x},${e.b.y},${e.b.z}`).join("|")}#${px0.toExponential(2)}`;
      if (ck !== this.chargedKey) {
        this.chargedKey = ck;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        for (const e of ch.edges) {
          const d = sub3(e.b, e.a), l = Math.hypot(d.x, d.y, d.z) || 1, u = { x: d.x / l, y: d.y / l, z: d.z / l };
          push({ x: e.a.x - u.x * GUIDE_LEN, y: e.a.y - u.y * GUIDE_LEN, z: e.a.z - u.z * GUIDE_LEN }, e.a, CHARGED_EXT_COLOR);
          push(e.b, { x: e.b.x + u.x * GUIDE_LEN, y: e.b.y + u.y * GUIDE_LEN, z: e.b.z + u.z * GUIDE_LEN }, CHARGED_EXT_COLOR);
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
      tks.push({ p: { x: o.x + xd.x * atm, y: o.y + xd.y * atm, z: o.z + xd.z * atm }, dir: xd, color: PALETTE.axisX });
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

    this.syncLabels(view.labels ?? [], cam, vp);

    // ---- 卷尺预演：量线 + 候选参考线 / 参考点 ----
    const tp0 = view.tape;
    if (tp0) {
      const r = GUIDE_POINT_PX * this.worldPerPx(cam, vp, tp0.b);
      const tk = `${tp0.a.x},${tp0.a.y},${tp0.a.z}>${tp0.b.x},${tp0.b.y},${tp0.b.z}|${tp0.guide ? `${tp0.guide.p.x},${tp0.guide.p.y},${tp0.guide.p.z}/${tp0.guide.dir.x},${tp0.guide.dir.y},${tp0.guide.dir.z}` : ""}|${tp0.point ? "P" : ""}|${r.toExponential(2)}`;
      if (tk !== this.tapeKey) {
        this.tapeKey = tk;
        const pos: number[] = [], col: number[] = [];
        const push = (a: Pt3, b: Pt3, hex: number): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
        push(tp0.a, tp0.b, 0x111111);
        if (tp0.guide) { const g = tp0.guide; push({ x: g.p.x - g.dir.x * GUIDE_LEN, y: g.p.y - g.dir.y * GUIDE_LEN, z: g.p.z - g.dir.z * GUIDE_LEN }, { x: g.p.x + g.dir.x * GUIDE_LEN, y: g.p.y + g.dir.y * GUIDE_LEN, z: g.p.z + g.dir.z * GUIDE_LEN }, GUIDE_COLOR); }
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
    const smooth = perf.time("smoothNormals", () => smoothNormals(kd));
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
          const nn = sm?.get(`${p.x},${p.y},${p.z}`) ?? n;
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
      if (kd.isSoft(e.id) && !selected && !hot) continue;   // 软边不画（圆柱不长竖纹）
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


  // ================= 池级几何（#22 池级局部性，2026-10-21，Claude Fable 5.1）=================
  // 每个槽一个 Group（矩阵 = 槽的世界变换）→ 下面的网格引用「这个 kernel 的共享几何」（本地坐标）。
  // 同 definition 的 N 个实例 = 一份几何 N 个矩阵；编辑某个池 = 只重建它那份；拖整棵子树 = 只改矩阵。
  // 几何变体按 (池版本 rev, definition, 材质表长, 淡出, 线稿风格) 缓存；两代没人用的变体释放 GPU 缓冲。
  private syncPools(kd: WorldView, view: ViewState): void {
    this.syncGen++;
    const dim = view.dimSlots;
    const used = new Set<KernelGeom>();
    for (const s of kd.slots) {
      const key = slotKey(s);
      let n = this.slotNodes.get(key);
      if (!n) { n = this.makeSlotNodes(); this.slotNodes.set(key, n); }
      n.gen = this.syncGen;
      n.root.visible = true;
      setMatrix(n.root, s.xform);
      const g = this.kernelGeom(s.kernel, kd.scene, s.pool.def, !!dim?.has(s.index));
      used.add(g);
      // 面：活动池 DEPTH.face、别的池 DEPTH.faceOther（#25 重叠时活动池 / loose 几何赢）
      n.plain.material = s.active ? this.faceMat : this.faceMatOther;
      n.plain.geometry = g.plain ?? this.emptyGeo; n.plain.visible = !!g.plain;
      for (let i = 0; i < Math.max(g.tex.length, n.tex.length); i++) {
        const t = g.tex[i];
        let slot = n.tex[i];
        if (!t) { if (slot) slot.mesh.visible = false; continue; }
        if (!slot) { const mesh = new THREE.Mesh(this.emptyGeo, this.texMatFor(t.mat)); mesh.frustumCulled = false; n.root.add(mesh); slot = { mesh }; n.tex.push(slot); }
        slot.mesh.material = this.texMatFor(t.mat);
        slot.mesh.geometry = t.geo; slot.mesh.visible = true;
      }
      // 边
      if (this.lineStyle === "thick") { n.thick.geometry = g.thick ?? this.emptyLineGeo; n.thick.visible = !!g.thick; n.pixel.visible = false; }
      else { n.pixel.geometry = g.pixel ?? this.emptyGeo; n.pixel.visible = !!g.pixel; n.thick.visible = false; }
    }
    // 没了的槽：节点摘掉（几何是共享引用，不在这里释放）
    for (const [key, n] of this.slotNodes) if (n.gen !== this.syncGen) { this.scene.remove(n.root); this.slotNodes.delete(key); }
    // 几何变体：本代用到的续命；两代没人用的释放（预演影子副本每帧一个新 kernel → 上一帧的那份下下帧释放；checkpoint 的那份手势结束回来还在）
    for (const g of this.geomsAlive) {
      if (used.has(g)) { g.gen = this.syncGen; continue; }
      if (g.gen < this.syncGen - 1) this.disposeGeom(g);
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
    root.add(plain); root.add(pixel); root.add(thick);
    this.scene.add(root);
    return { root, plain, tex: [], pixel, thick, gen: 0 };
  }
  private texMatFor(mat: Material): any {
    let m = this.texMats.get(mat);
    if (m) return m;
    m = new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uMap: { value: this.textureFor(mat) } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face });
    this.texMats.set(mat, m);
    return m;
  }
  private kernelGeom(k: Kernel, scene: Scene, defId: number, dim: boolean): KernelGeom {
    const key = `${k.rev}|${defId}|${scene.materials.length}|${dim ? 1 : 0}|${this.lineStyle}`;
    let arr = this.geomCache.get(k);
    if (!arr) { arr = []; this.geomCache.set(k, arr); }
    let g = arr.find((x) => x.key === key);
    if (g) return g;
    g = perf.time("buildKernelGeom", () => buildKernelGeom(k, scene, defId, dim, this.lineStyle));
    g.key = key; g.gen = this.syncGen;
    arr.push(g); this.geomsAlive.add(g);
    return g;
  }
  private disposeGeom(g: KernelGeom): void {
    g.plain?.dispose(); for (const t of g.tex) t.geo.dispose(); g.pixel?.dispose(); g.thick?.dispose();
    this.geomsAlive.delete(g);
    const arr = this.geomCache.get(g.kernel);
    if (arr) { const i = arr.indexOf(g); if (i >= 0) arr.splice(i, 1); }
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
    const eids = new Set<EdgeId>([...view.selectionEdges, ...view.scrubEdges]);
    if (view.hoverEdge !== null) eids.add(view.hoverEdge);
    for (const id of eids) {
      if (!kd.graph.hasEdge(id)) continue;
      const e = kd.graph.edge(id);
      const hot = view.scrubEdges.has(id) || view.hoverEdge === id;
      const a = kd.graph.pt(e.a), b = kd.graph.pt(e.b);
      const c = this.tmpColor.setHex(hot ? PALETTE.edgeHot : PALETTE.edgeSelected);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
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
 * 一个 kernel（池）的全部膜 / 边 → 本地坐标几何：纯色一份、每种贴图材质一份（+UV，用本地平面基 → 贴图跟着实例走）、原生线 / 粗线各一份。
 * 淡出（上下文之外）烤进顶点色（dim 是变体键的一部分）。选中 / 悬停不在这里（覆盖层）。
 */
function buildKernelGeom(k: Kernel, scene: Scene, defId: number, dim: boolean, style: LineStyle): KernelGeom {
  const kv = k as unknown as GeomView;
  const smooth = smoothNormals(kv);
  const groups = new Map<Material | null, { pos: number[]; nor: number[]; col: number[]; uv: number[] }>();
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id);
    if (!rec) continue;
    const mat = scene.materialOfSlot(defId, k.faceMaterialOf(f.id));
    let r: number, g: number, b: number;
    if (dim) { [r, g, b] = srgb(PALETTE.faceDim); if (mat && !mat.texture) { const [mr, mg, mb] = mat.color; r = (r + mr) / 2; g = (g + mg) / 2; b = (b + mb) / 2; } }
    else if (mat && !mat.texture) [r, g, b] = mat.color;
    else if (mat?.texture) [r, g, b] = [1, 1, 1];
    else [r, g, b] = srgb(PALETTE.face);
    const key = mat?.texture ? mat : null;
    let grp = groups.get(key);
    if (!grp) { grp = { pos: [], nor: [], col: [], uv: [] }; groups.set(key, grp); }
    const n = rec.plane.n;
    const sm = smooth.get(f.id);
    const texW = mat?.texture?.sizeM[0] ?? 1, texH = mat?.texture?.sizeM[1] ?? 1;
    for (const tri of faceTriangles(kv, f.id)) for (const p of tri) {
      grp.pos.push(p.x, p.y, p.z);
      const nn = sm?.get(`${p.x},${p.y},${p.z}`) ?? n;
      grp.nor.push(nn.x, nn.y, nn.z);
      grp.col.push(r, g, b);
      if (key) grp.uv.push(dot3(p, rec.basis.u) / texW, dot3(p, rec.basis.v) / texH);
    }
  }
  const mk = (grp: { pos: number[]; nor: number[]; col: number[]; uv: number[] }, uv: boolean): any => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(grp.pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(grp.nor, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(grp.col, 3));
    if (uv) geo.setAttribute("aUv", new THREE.Float32BufferAttribute(grp.uv, 2));
    return geo;
  };
  const plainG = groups.get(null);
  const plain = plainG && plainG.pos.length ? mk(plainG, false) : null;
  const tex: { mat: Material; geo: any }[] = [];
  for (const [key, grp] of groups) if (key !== null && grp.pos.length) tex.push({ mat: key, geo: mk(grp, true) });
  // 边：软边不画；裸线 / 膜边两色；淡出一色
  const pos: number[] = [], col: number[] = [];
  const c = new THREE.Color();
  const n1: number[] = [], n2: number[] = [], flag: number[] = [];   // SU 轮廓线：两侧面法向（本地坐标）+ 面数（着色器按视向判剪影）
  for (const e of k.edges()) {
    if (k.isSoft(e.id)) continue;
    const hex = dim ? PALETTE.edgeDim : e.faceLinks.length === 0 ? PALETTE.edgeWire : PALETTE.edge;
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    c.setHex(hex);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (style === "thick") {
      const fa = e.faceLinks[0] !== undefined ? k.planeOf(e.faceLinks[0])?.plane.n : undefined;
      const fb = e.faceLinks[1] !== undefined ? k.planeOf(e.faceLinks[1])?.plane.n : undefined;
      const A = fa ?? { x: 0, y: 0, z: 0 }, B = fb ?? A;
      n1.push(A.x, A.y, A.z); n2.push(B.x, B.y, B.z); flag.push(Math.min(e.faceLinks.length, 3));
    }
  }
  let pixel: any = null, thick: any = null;
  if (pos.length) {
    if (style === "thick") {
      thick = new LineSegmentsGeometry(); thick.setPositions(pos); thick.setColors(col);
      thick.setAttribute("instanceN1", new THREE.InstancedBufferAttribute(new Float32Array(n1), 3));
      thick.setAttribute("instanceN2", new THREE.InstancedBufferAttribute(new Float32Array(n2), 3));
      thick.setAttribute("instanceFlag", new THREE.InstancedBufferAttribute(new Float32Array(flag), 1));
    }
    else { pixel = new THREE.BufferGeometry(); pixel.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); pixel.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); }
  }
  return { key: "", kernel: k, plain, tex, pixel, thick, gen: 0 };
}

/**
 * 平滑组法向：smooth 边两侧的膜视为同一曲面——对每张膜的每个角点，取「经 smooth 边连通、且含该顶点」的膜的法向按内角加权平均。
 * 返回 面 id → (顶点坐标键 → 法向)；没有软边邻接的膜不出现在表里（用平面法向）。
 */
function smoothNormals(kd: GeomView): Map<FaceId, Map<string, Pt3>> {
  const out = new Map<FaceId, Map<string, Pt3>>();
  // 软边 → 其两侧膜连通（并查集）
  const parent = new Map<FaceId, FaceId>();
  const find = (x: FaceId): FaceId => { let r = x; while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!; return r; };
  const union = (a: FaceId, b: FaceId): void => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  let any = false;
  for (const e of kd.edges()) {
    if (!kd.isSmooth(e.id) || e.faceLinks.length < 2) continue;
    const fl = [...new Set(e.faceLinks)];
    for (let i = 1; i < fl.length; i++) union(fl[0], fl[i]);
    any = true;
  }
  if (!any) return out;
  // 组内：顶点 → [膜法向 × 该膜在此顶点的内角]
  const groupOf = (f: FaceId): FaceId | null => (parent.has(f) ? find(f) : null);
  const acc = new Map<string, Pt3>();   // `${group}|${vertexKey}` → 加权法向和
  const faceInfo = new Map<FaceId, { n: Pt3; ring: Pt3[]; g: FaceId }>();
  for (const f of kd.faces()) {
    const g = groupOf(f.id);
    if (g === null) continue;
    const rec = kd.planeOf(f.id);
    const rings = kd.faceRings3(f.id);
    if (!rec || !rings) continue;
    const n = rec.plane.n;
    faceInfo.set(f.id, { n, ring: rings.outer, g });
    const ring = rings.outer;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
      const u = sub3(a, p), v = sub3(b, p);
      const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
      const w = lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, dot3(u, v) / (lu * lv)))) : 0;
      const key = `${g}|${p.x},${p.y},${p.z}`;
      const cur = acc.get(key) ?? { x: 0, y: 0, z: 0 };
      // 法向取与「组里第一张膜」同侧（膜无朝向：n 可能翻；按 dot 校正）
      acc.set(key, { x: cur.x + n.x * w, y: cur.y + n.y * w, z: cur.z + n.z * w });
    }
  }
  for (const [fid, info] of faceInfo) {
    const m = new Map<string, Pt3>();
    for (const p of info.ring) {
      const v = acc.get(`${info.g}|${p.x},${p.y},${p.z}`);
      if (!v) continue;
      const l = Math.hypot(v.x, v.y, v.z);
      if (l < 1e-9) continue;
      let nn = { x: v.x / l, y: v.y / l, z: v.z / l };
      if (dot3(nn, info.n) < 0) nn = { x: -nn.x, y: -nn.y, z: -nn.z };   // 与本膜同侧（双面光照取 |n·L|，侧向一致即可）
      m.set(`${p.x},${p.y},${p.z}`, nn);
    }
    out.set(fid, m);
  }
  return out;
}

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
  return tris.map(([a, b, c]) => [lift(all[a]), lift(all[b]), lift(all[c])]);
}
