// minccino/backend/three/render3.ts —— three.js 后端（Tron 第一刀步 5 从 src/editor/render3.ts 整个搬进笼子；旧位置只剩转出口）。
// 边界纪律：three 只在 src/minccino/backend/three/ 出现（build.sh 0.7 + 守卫 ①）；相机数学在 editor/camera.ts、拾取/求解在 pick.ts/solver.ts（都不碰 three）。
// 6c（v0.17.9）起**零内容层 import**（守卫 ③′ 棘轮清零）：相机 / 视口 / 坐标架 / 材质 / XR 姿态全是引擎契约里的同形类型；选中高亮经叠加层契约（OverlayFaces + "edge" 线）；
// 场景包围球和内容键由流提供者给；计时走 PerfSink。编辑器的 ViewState 住 editor/view-state.ts，后端只看 FrameInput。
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
import { LineSegments2 } from "../../../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../../../vendor/three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "../../../vendor/three/addons/lines/LineMaterial.js";
import { PROFILE_LINE_VERTEX } from "./profile-line-shader.ts";
import { OverlayLinesDrawer, setLineGeometry } from "./overlay-lines.ts";
import { OverlayMarksDrawer } from "./overlay-marks.ts";
import { OverlayFacesDrawer } from "./overlay-faces.ts";
import type { OverlayCtx, OverlayFaces, OverlayItem, OverlayLines } from "../../overlay/index.ts";
import type { Backend, BackendCaps, FrameInput } from "../../index.ts";
import { DEFAULT_VIEW_BUDGET, WORLD_FRAME3, planFrame, checkBudget, type BudgetReport, type CameraSource, type Chunk, type ChunkSide, type ChunkStyle, type Frame3, type MaterialRef, type Measurement, type PassDecl, type StreamProvider, type Vec3, type View, type ViewportSize, type Xform12 } from "../../index.ts";   // 流契约：块 → 显卡（步 3）；视图 + frame graph（步 4）；相机来源 / 视口 / 坐标架（6c）
import { PALETTE } from "../../palette.ts";
import { NOOP_PERF, type PerfSink } from "../../perf.ts";
import { PRESETS, isStyled, presetPasses, type Preset, type PresetId } from "../../preset/index.ts";
import { PixelScreen } from "./screen-pixel.ts";
import { AoBaker } from "./ao-bake.ts";
import { PaperMaterials } from "./paper-shader.ts";
import { TronMaterials } from "./tron-shader.ts";
import { Bloom } from "./bloom.ts";
import { EnvSky } from "./env-sky.ts";
import { PbrMaterials } from "./pbr-shader.ts";

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
/** XR rig 姿态（player 每帧同步；与 player/player.ts RigPose 同形的那两样）。 */
export interface XRRigPose { readonly origin: Vec3; readonly heading: number }
/** 世界射线（与 player/world-query.ts Ray 同形）。 */
export interface XRRay { readonly origin: Vec3; readonly dir: Vec3 }

// 调色板 PALETTE 住 ../../palette.ts（6c 搬出：编辑器拿颜色不再碰后端）；POOL_AXES_PX / LOCK_LINE_SPAN_PX 住编辑器 overlay-lines.ts。


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
const STATIC_PX = 1.2;      // 网格 + 三轴（同一份粗线，只能一个宽度；轴靠颜色区分）
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
interface GpuFaces { readonly id: string; version: number; readonly mat: MaterialRef | null; readonly side: ChunkSide | null; readonly attrs: Record<string, any>; readonly geo: any; readonly geoDim: any; count: number; gen: number; }
interface GpuLines { readonly id: string; version: number; readonly instanced: boolean; readonly bufs: Record<string, any>; readonly geo: any; readonly geoDim: any; count: number; gen: number; }
/** 一个槽（实例 / group 出现的一个位置）的 three 节点：一个 Group 带矩阵，下面纯色面 / 贴图面 / 原生线 / 粗线，几何全是共享引用。 */
interface SlotNodes { root: any; plain: any; /** 选中 / 悬停的面（同一个节点、同一个材质、和面本身同一组三角，画在后面 = 替换颜色；2026-10-27 Opus 5.5）。 */ sel: any; /** 上次高亮的键（overlay-faces.ts 按它判要不要重建）。 */ selKey: string; /** 风格认领选中时的材质（Tron）；null = 跟面同一个。 */ selMat: any; tex: { mesh: any }[]; pixel: any; thick: any; /** X 光（DT17）：同一份线几何再画一遍，不做深度测试、半透明 = 被面挡住的边透出来。 */ xpixel: any; xthick: any; gen: number; }

// ViewState（编辑器这一帧的视图状态）6c 起住 src/editor/view-state.ts；后端只吃 FrameInput。

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
  uniform bool uUnlit;
  varying vec3 vColor;
  varying vec3 vColorB;
  varying vec3 vNormal;
  void main() {
    // 两个表面（DT8）：三角绕 +n 逆时针 → 正面朝着看 = 看到 +n 那侧（aColor），背面 = −n 那侧（aColorB）；负值 = 那侧归贴图网格画，这里不画
    vec3 c = gl_FrontFacing ? vColor : vColorB;
    if (c.r < 0.0) discard;
    float k = uUnlit ? 1.0 : 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));   // 不打光（风格：像素描边 = 纯色）
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
  uniform bool uUnlit;
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = uUnlit ? 1.0 : 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    vec3 c = texture2D(uMap, vUv).rgb * vColor;
    gl_FragColor = vec4(c * k, 1.0);
  }`;

/** 叠加层专用的 three 层（Tron 第 1 步）：编辑器的东西（网格、三轴、叠加层线点标记文字、X 光线）住这一层，风格那条路里按原分辨率最后画；
 *  白模那条路相机两层都看 = 和以前同一批对象同一个顺序。不用 1 / 2：three 的 XR 用它们分左右眼。 */
const OVERLAY_LAYER = 5;
/** 风格的地面 / 背景那一遍全屏（剪纸）住第 6 层：遮蔽烘焙的相机只看第 0 层，地面不挡自己。 */
const GROUND_LAYER = 6;
/** 改完模型停手多久才重烘遮蔽（毫秒）：拖着改的时候不烘，影子停手后跟上（披露在预设说明里）。 */
const AO_QUIET_MS = 250;
/** 0xRRGGBB → sRGB 浮点三元（膜 shader 用；不过 three 的色彩管理）。 */
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

export class Renderer3 implements Backend {
  readonly name = "three";
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
  private faceMat: any;
  // ---- 池级几何（#22 池级局部性，2026-10-21）：每个槽一组节点 + 每个 kernel 一份共享几何；选中 / 悬停走覆盖层 ----
  private faceMatTop: any;                          // 覆盖层材质（polygonOffset 0：压在底几何上）
  private pixelMat: any;                            // 原生线材质（顶点色，共享）
  private texMats = new Map<object, any>();         // 贴图材质对象 → 共享 ShaderMaterial（uMap）
  private slotNodes = new Map<string, SlotNodes>();
  /** 块（流契约 Chunk.id）→ 显卡几何：两代没人用的释放。池网格本体住编辑器那边的流提供者（stream-provider.ts），这里只有显卡副本。 */
  private chunkGpus = new Map<string, GpuFaces | GpuLines>();
  private provider: StreamProvider | null = null;
  /** 这一帧的视图对象（画到哪 + 分辨率 + 预算 + 画质档；Minccino 契约 View）和 frame graph 的规划（哪些 pass 跑）。探针 / 血槽位读。 */
  lastView: View | null = null;
  /** 血槽位（步 7）：上一帧实测（毫秒 / 显存估算 / draw call / 三角）和预算核对（超了哪几项 + 一句披露；披露的 UI 归 Opus / 上线后）。 */
  lastMeasurement: Measurement | null = null;
  lastBudget: BudgetReport | null = null;
  lastPlan: { order: readonly string[]; pruned: readonly string[] } | null = null;
  /** 这一帧 X 光那条 pass 在不在规划里（X 光的节点可见性只看它，不直接看 xray 开关）。 */
  private xrayPass = false;
  private syncGen = 0;
  private poolKey = "";
  /** 提供者没给内容键时的帧号（= 每帧都拉）。 */
  private frameNo = 0;
  private emptyGeo: any; private emptyLineGeo: any;
  private texCache = new Map<object, any>();                                  // Material 对象 → three Texture（原图解码一次）
  private faceMatOther: any;
  private faceMatFront: any; private faceMatOtherFront: any;   // 单面身体（mesh）的两份：只画正面（剔背面 = user 10-27「enforce backface culling」）
  private edgeMat: any;
  private lineStyle: LineStyle = "pixel";
  /** X 光（DT17）：开着 = 池的边透过面画淡的、选中的边不被挡。 */
  private xray = false;
  private xrayPixelMat: any; private xrayThickMat: any; private xrayOverlayMat: any;
  private lineWeight = 1;                              // 设备像素；1 = 原生线
  private readonly profileAdd = { value: 1 };          // 轮廓线加粗（设备像素）；edgeMat 的 shader uniform
  /** 风格（Tron 第 1 步；预设 = 数据，minccino/preset/）。白模 = 原来那一条渲染。 */
  private preset: Preset = PRESETS.white;
  /** 这一帧真正生效的预设（XR / 截图 = 白模）。 */
  private framePreset: Preset = PRESETS.white;
  private readonly unlitU = { value: false };          // 面 shader 的「不打光」（材质挂点 shade = none）
  private pixelScreen: PixelScreen | null = null;      // 风格那条路的小图 + 描边 + 放大（第一次用到才建）
  private aoBaker: AoBaker | null = null;              // 世界空间遮蔽（剪纸的多重阴影；第一次用到才建）
  private paper: PaperMaterials | null = null;         // 平涂的面材质 + 地面那一遍
  private tron: TronMaterials | null = null;           // CRT Tron 的面 / 线材质（第一次用到才建）
  private lastTarget: Vec3 = { x: 0, y: 0, z: 0 };     // 视野中心（正交下 Tron 地格的淡出按它）
  private bloom: Bloom | null = null;                  // 辉光（后处理）
  private envSky: EnvSky | null = null;                // 环境图（程序海天 + 球谐；铸铜）
  private pbr: PbrMaterials | null = null;             // 有光照的表面（铸铜）
  private aoSeen = ""; private aoBaked = ""; private aoChangedAt = 0; private aoTimer: ReturnType<typeof setTimeout> | null = null;
  /** 每画完一帧：预算核对 + 实测（app 层的血槽位披露接它）。 */
  onMeasured: ((b: BudgetReport | null, m: Measurement) => void) | null = null;
  /** 后端自己想再画一帧（遮蔽停手后重烘好了）：app 层接 editor.draw。 */
  onRedrawWanted: (() => void) | null = null;
  private overlayLines!: OverlayLinesDrawer;
  private overlayMarks!: OverlayMarksDrawer;
  private overlayFaces!: OverlayFacesDrawer;
  /** 计时口（消费方递进来的计数器；不给 = 不计）。 */
  private readonly perf: PerfSink;
   // 变换 gizmo（2026-10-26）
  private gridMesh: any = null; private gridMat: any = null; private axesObj: any = null;
  private gridKey = "";
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

  constructor(canvas: HTMLCanvasElement, perf: PerfSink = NOOP_PERF) {
    this.perf = perf;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.background);
    this.camOrtho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20000);
    this.camPersp = new THREE.PerspectiveCamera(50, 1, 1, 20000);
    this.camOrtho.layers.enable(OVERLAY_LAYER); this.camPersp.layers.enable(OVERLAY_LAYER);
    this.camOrtho.layers.enable(GROUND_LAYER); this.camPersp.layers.enable(GROUND_LAYER);
    this.resolution = new THREE.Vector2(1, 1);
    this.rebuildGrid(WORLD_FRAME3, 1, 1);

    // 膜：一份几何 + 一个 shader（光向 uniform）
    this.faceMat = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: { value: new THREE.Vector3(0, 0, 1) }, uUnlit: this.unlitU },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face,
    });
    // 别的池的面：同一 shader、polygonOffset 再往后推一格 → 共面重叠时活动池 / loose 几何赢（#25 user「overlap的时候优先显示loose geometry」）
    this.faceMatOther = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOther,
    });
    // 单面身体（mesh）：同两份 shader，只画正面
    this.faceMatFront = new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU }, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face });
    this.faceMatOtherFront = new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU }, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOther });
    // 覆盖层（选中 / 悬停的面）：同 shader、polygonOffset 0 → 压在各槽底几何（1 / 4）上面
    this.faceMatTop = new THREE.ShaderMaterial({
      vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
      uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU },
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOverlay,
    });
    this.pixelMat = new THREE.LineBasicMaterial({ vertexColors: true });
    this.emptyGeo = new THREE.BufferGeometry();
    this.emptyLineGeo = new LineSegmentsGeometry();
    // 边：一份粗线（顶点色）+ SU 轮廓线（per-instance 两侧面法向 + 面数 → 着色器里判剪影 / 边界 / 悬空，加粗 profileAdd）
    this.edgeMat = this.lineMat(EDGE_PX, { offset: true, vertexColors: true });
    // SU 轮廓线：自己的顶点着色器源（profile-line-shader.ts；以前是 onBeforeCompile 在 three 编译时改源——步 5 拔掉的漏点 ①）
    this.edgeMat.vertexShader = PROFILE_LINE_VERTEX;
    this.edgeMat.uniforms.profileAdd = this.profileAdd;
    // X 光（DT17，2026-10-26）：池的边再画一遍（共用几何、不另占内存）+ 覆盖层不做深度测试；半透明渲染那半留 Tron 纪元
    this.xrayPixelMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: XRAY_OPACITY, depthTest: false, depthWrite: false });
    this.xrayThickMat = this.lineMat(EDGE_PX, { vertexColors: true });
    Object.assign(this.xrayThickMat, { transparent: true, opacity: XRAY_OPACITY, depthTest: false, depthWrite: false });
    this.xrayOverlayMat = this.lineMat(EDGE_PX + 1, { vertexColors: true });
    Object.assign(this.xrayOverlayMat, { depthTest: false, depthWrite: false });
    // 选中 / 刮擦 / 悬停的边 = 叠加层 "edge" 样式（6c）：用边线本身的材质、同一个深度偏移 = 深度相等，LessEqual 下谁后画谁赢；
    // 不定先后就由 three 的排序随缘——粗线稿时黑边常常后画、把红线整条盖掉（user 2026-10-25「bug：橡皮擦的红线不见了。也许是zorder」）。
    // 样式表定死它最后画（renderOrder 2）；它没有轮廓属性 = 按悬空边加粗画，本来就比底下的黑边宽，盖得住。探针 probe-erase-red。X 光开着换成不做深度测试那份。
    // 叠加层线段族（步 6a；刀 a 起材质按 item 的画法参数按需建）；"edge" 不建材质
    const overlayHost = { add: (o: any): void => { o.layers.set(OVERLAY_LAYER); this.scene.add(o); }, remove: (o: any): void => { this.scene.remove(o); } };   // 叠加层的东西住 OVERLAY_LAYER
    this.overlayLines = new OverlayLinesDrawer(overlayHost, (px, o) => this.lineMat(px, o), { edge: () => (this.xrayPass ? this.xrayOverlayMat : this.edgeMat) });
    // 叠加层的点 / 标记 / 三角 / 文字（步 6b）：吸附小球、落点环、缩放柄、顶点 / 面 / 中缝 / 选中点、平面 gizmo 方块、变换 gizmo 的锥 / 块 / 片、文字
    this.overlayMarks = new OverlayMarksDrawer(overlayHost);
    // 面高亮（6c）：挂槽的 sel 网格 / 世界坐标一份（faceMatTop）/ 每种贴图材质一份（材质懒建 = 和以前第一次画带贴图的高亮时同一时机）
    this.overlayFaces = new OverlayFacesDrawer(this.scene, this.emptyGeo, this.faceMatTop,
      () => new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU, uMap: { value: null } }, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.faceOverlay }),
      (m) => this.textureFor(m));

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

  caps(): BackendCaps {
    const gl = this.renderer.getContext();
    return { webgl2: typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext, floatRenderTargets: !!this.renderer.extensions?.has?.("EXT_color_buffer_float"), maxTextureSize: this.renderer.capabilities?.maxTextureSize ?? 0, xr: !!this.renderer.xr };
  }
  dispose(): void { this.renderer.setAnimationLoop(null); this.renderer.dispose(); }
  /** XR 画质（会话开始前设才生效；dev A/B 用）。foveation 0=全分辨率…1=周边最低；framebufferScale 相对设备推荐值。 */
  setXRQuality(q: { foveation?: number; framebufferScale?: number }): void {
    if (q.foveation !== undefined) this.renderer.xr.setFoveation(Math.max(0, Math.min(1, q.foveation)));
    if (q.framebufferScale !== undefined) this.renderer.xr.setFramebufferScaleFactor(Math.max(0.5, Math.min(2, q.framebufferScale)));
  }

  /** rig 姿态（player 每帧同步；heading 绕 Z、origin 世界坐标）。 */
  setRig(pose: XRRigPose): void {
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
  wristHit(ray: XRRay): { u: number; v: number; dist: number } | null {
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
  private xrEye(): Vec3 | null {
    if (!this.renderer.xr.isPresenting) return null;
    const c = this.renderer.xr.getCamera();
    return this.scratchV.setFromMatrixPosition(c.matrixWorld);
  }

  /** 连续渲染循环（步行模式 / XR 会话）；null = 停（回到按需 draw）。three 的 setAnimationLoop 才能收 XR 帧。 */
  setLoop(cb: ((timeMs: number, frame?: unknown) => void) | null): void {
    this.renderer.setAnimationLoop(cb);
  }

  resize(vp: ViewportSize, dpr: number): void {
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
    if (this.overlayLines) this.overlayLines.edgeWidth(Math.max(this.lineWeight, 1) * k);   // 断口小垂线跟边线一样粗（鼓包，不是另一种线）
    if (this.axesObj) this.axesObj.material.linewidth = Math.min(STATIC_PX * scale, this.lineWeight > 1 ? this.lineWeight * k : 0.6 * k);   // 原生细线（1 px）覆盖的采样点和粗线插件不同，轴同宽会从缝里透红 → 细线模式下轴画 0.6 px   // 轴不比边粗：压在轴上的边要整条盖住轴（2× 屏上轴 2.4 px > 边 1.5 px → 边成了「红边夹黑芯」，2026-10-25）
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
  /** 调试 / 探针：现在挂着哪些字（id → 位图键 = 样式|dpr|文字）。 */
  labelKeys(): { id: string; key: string }[] { return this.overlayMarks.labelKeys(); }
  private worldPerPx(cam: CameraSource, vp: ViewportSize, p: Vec3): number {
    const eye = this.xrEye();
    if (eye) return (Math.max(0.2, Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z)) * (Math.PI / 180)) / XR_PX_PER_DEG;
    if (cam.projection === "persp") {
      const e = cam.eye(), f = cam.forward();
      const z = Math.max((p.x - e.x) * f.x + (p.y - e.y) * f.y + (p.z - e.z) * f.z, cam.nearClamp());
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
  private infLine(p: Vec3, dir: Vec3, target: Vec3): [Vec3, Vec3] {
    const t = (target.x - p.x) * dir.x + (target.y - p.y) * dir.y + (target.z - p.z) * dir.z;
    const c = { x: p.x + dir.x * t, y: p.y + dir.y * t, z: p.z + dir.z * t }, L = this.viewReach + Math.hypot(c.x - target.x, c.y - target.y, c.z - target.z);
    return [{ x: c.x - dir.x * L, y: c.y - dir.y * L, z: c.z - dir.z * L }, { x: c.x + dir.x * L, y: c.y + dir.y * L, z: c.z + dir.z * L }];
  }
  /** 画无限长线的缓存键：视野范围按对数分档、中心按范围量化（相机大挪才重建）。 */
  private reachKey(target: Vec3): string { const q = this.viewReach / 8; return `${Math.round(Math.log2(this.viewReach) * 2)}@${Math.round(target.x / q)},${Math.round(target.y / q)},${Math.round(target.z / q)}`; }
  private syncCamera(cam: CameraSource, vp: ViewportSize, sphere: { c: Vec3; r: number } | null): any {
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

  render(input: FrameInput): void {
    const cam = input.camera, vp = input.viewport;
    const presenting = !!this.renderer.xr.isPresenting;
    let cam3: any;
    if (presenting) {
      // XR：three 从 HMD 写 camPersp 姿态与投影；我们只管 near/far（会话 depthNear/Far）
      cam3 = this.camPersp;
      cam3.near = input.near ?? 0.05; cam3.far = 2000;
    } else {
      this.rig.position.set(0, 0, 0); this.rig.rotation.set(0, 0, 0);
      cam3 = this.syncCamera(cam, vp, this.provider?.bounds?.() ?? null);   // 场景包围球归提供者（内容有多大只有它知道）
    }
    this.syncLineScale(presenting);
    // ---- 视图对象 + frame graph（步 4）：现状 = 四组往一张画布上追加画的 pass（膜 / 边、地面网格、叠加层、X 光），还是 three 的一个渲染调用；
    //      规划器只决定哪几组存在（X 光关着 = 那条 pass 不在表里，不是画了再藏）。分目标的 pass（泛光 / 描边 / 整数倍放大）等后处理落地。
    cam3.updateMatrixWorld();
    const eye = cam.eye(); this.lastTarget = cam.target;
    this.lastView = { id: "main", camera: { view: cam3.matrixWorldInverse.elements, projection: cam3.projectionMatrix.elements, eye, kind: cam.projection === "persp" ? "persp" : "ortho" }, target: presenting ? { kind: "xr-eye", width: this.flatRes.w, height: this.flatRes.h } : { kind: "canvas", width: this.flatRes.w, height: this.flatRes.h }, budget: DEFAULT_VIEW_BUDGET, quality: "full" };
    this.framePreset = this.currentPreset();   // XR / 缩略图走白模
    this.lastPlan = planFrame(this.passes(), ["frame"]);
    const xrayPass = this.lastPlan.order.includes("xray");
    if (xrayPass !== this.xrayPass) { this.xrayPass = xrayPass; this.poolKey = ""; }

    // ---- 面：光向 uniform 每帧（视空间：法向走 normalMatrix）；几何只在键变时重建 ----
    const L = presenting ? this.xrKeyLight() : keyLight(cam);
    this.scratchV.set(L.x, L.y, L.z).transformDirection(cam3.matrixWorldInverse);
    this.faceMat.uniforms.uLight.value.copy(this.scratchV);
    // 池级路径：每槽一组节点 + 每池一份几何（只重建变了的池）。内容键由提供者给（世界身份 + 版本 + 淡出集 = 以前的 kid:rev:dimK）；没给 = 每帧都拉
    const styled = this.lastPlan.order.includes("upscale");   // 这一帧走风格那条路（规划器说了算：XR / 截图时它不在表里）
    this.unlitU.value = this.framePreset.material.shade === "none";
    this.ensurePaper();
    if (this.framePreset.material.tron && !this.tron) this.tron = new TronMaterials(DEPTH.face, DEPTH.faceOther);
    if (this.framePreset.material.pbr && !this.pbr && this.aoBaker) {   // 铸铜：环境图 + 表面材质（遮蔽烘焙器 ensurePaper 已建）
      this.envSky = new EnvSky(); this.pbr = new PbrMaterials(this.aoBaker.uniforms, this.envSky, DEPTH.face, DEPTH.faceOther);
      this.pbr.ground.layers.set(GROUND_LAYER); this.scene.add(this.pbr.ground);
    }
    const pk = `${this.provider?.contentKey?.() ?? `#${this.frameNo++}`}:${this.lineStyle}:${this.framePreset.id}`;
    if (pk !== this.poolKey) { this.poolKey = pk; this.perf.time("syncPools", () => this.syncPools()); }
    this.syncPaper(cam3);   // 平涂 / 地面 / 遮蔽（剪纸）：没用到 = 地面藏着、什么都不建

    // ---- 地面网格 + 三色轴：跟上下文的帧（绘图轴 / 组的轴）与格距走（0.11 ⑤）----
    // 显示不细分（user 2026-10-25「即使开了，grid也不应该在显示层细分」「sub incremental就是sub刻度的」）：吸附的 1/5、1/10 只管吸，像尺子上的小刻度，不画成网格线
    const gfr = input.grid?.frame ?? WORLD_FRAME3, gstep = input.grid?.step ?? 1, gsub = 1;
    const gk = `${gfr.origin.x},${gfr.origin.y},${gfr.origin.z}|${gfr.x.x},${gfr.x.y},${gfr.x.z}|${gfr.y.x},${gfr.y.y},${gfr.y.z}|${gfr.z.x},${gfr.z.y},${gfr.z.z}|${gstep}|${gsub}`;
    if (gk !== this.gridKey) { this.gridKey = gk; this.rebuildGrid(gfr, gstep, gsub); }

    // ---- 叠加层（步 6a 线段族 / 6b 点 标记 三角 文字）：内容归编辑器（view.overlay），量尺归这里（一像素多长 / 视野多远 / 相机三轴；XR 和桌面在 worldPerPx 里分）----
    const octx: OverlayCtx = {
      worldPerPx: (p) => this.worldPerPx(cam, vp, p),
      infLine: (p, dir) => this.infLine(p, dir, cam.target),
      reachKey: () => this.reachKey(cam.target),
      target: cam.target, forward: cam.forward(),
      right: { x: cam3.matrixWorld.elements[0], y: cam3.matrixWorld.elements[1], z: cam3.matrixWorld.elements[2] },
      up: { x: cam3.matrixWorld.elements[4], y: cam3.matrixWorld.elements[5], z: cam3.matrixWorld.elements[6] },
      lineWeightPx: this.lineWeight, dpr: this.renderer.getPixelRatio?.() || 1,
    };
    const items = input.overlay ? input.overlay(octx) : [];
    this.overlayFaces.sync(items.filter((it): it is OverlayFaces => it.kind === "faces"), this.slotNodes);   // 选中 / 悬停的面（6c）：挂槽 / 世界 / 贴图
    this.overlayLines.sync(items.filter((it): it is OverlayLines => it.kind === "lines"));
    this.overlayMarks.sync(items.filter((it) => it.kind !== "lines" && it.kind !== "faces") as Exclude<OverlayItem, OverlayLines | OverlayFaces>[], this.dpr, (p) => this.worldPerPx(cam, vp, p));

    const t0 = performance.now();
    const info3 = this.renderer.info;
    if (!styled) this.renderer.render(this.scene, cam3);
    else { info3.autoReset = false; info3.reset(); try { this.renderStyled(cam3); } finally { info3.autoReset = true; } }
    // ---- 血槽位（步 7）：三个数 + 预算核对。显存 = 块的显卡副本 + 贴图的估算（three 不报字节数）+ 风格的小图 ----
    const info = info3?.render;
    let bytes = (styled && this.pixelScreen ? this.pixelScreen.bytes() : 0) + (this.framePreset.light.ao && this.aoBaker ? this.aoBaker.bytes() : 0) + (this.framePreset.post.bloom && this.bloom ? this.bloom.bytes() : 0) + (this.framePreset.light.env && this.envSky ? this.envSky.bytes() : 0);
    for (const g of this.chunkGpus.values()) for (const a of Object.values("attrs" in g ? g.attrs : g.bufs) as any[]) bytes += a.array?.byteLength ?? 0;
    for (const t of this.texCache.values()) { const im = t.image; if (im && im.width) bytes += im.width * im.height * 4; }
    const m: Measurement = { frameMs: performance.now() - t0, vramMb: bytes / 1048576, drawCalls: info?.calls ?? 0, triangles: info?.triangles ?? 0, passes: this.lastPlan?.order.length ?? 0 };
    this.lastMeasurement = m; this.lastBudget = this.lastView ? checkBudget(m, this.lastView.budget) : null;
    const P = this.perf;
    P.last["render.ms"] = m.frameMs; P.last["render.drawCalls"] = m.drawCalls; P.last["render.triangles"] = m.triangles ?? 0; P.last["render.vramMb"] = m.vramMb;
    if (this.lastBudget?.over.length) P.count["budget.over"] = (P.count["budget.over"] ?? 0) + 1;
    if (!this.capturing) this.onMeasured?.(this.lastBudget, m);   // 血槽位披露（app 层决定什么时候说；截缩略图那帧不算）
  }

  /** 平涂的材质 / 地面 / 遮蔽烘焙器：第一次有预设要它们时才建（要在拉流之前：槽节点换材质要用）。 */
  private ensurePaper(): void {
    const p = this.framePreset;
    if (this.paper || (!p.light.ao && !p.light.ground && p.material.shade !== "flat")) return;
    this.aoBaker = new AoBaker();
    this.paper = new PaperMaterials(this.aoBaker.uniforms, DEPTH.face, DEPTH.faceOther, PALETTE.face);
    this.paper.ground.layers.set(GROUND_LAYER); this.scene.add(this.paper.ground);
  }
  /**
   * 平涂 / 地面 / 遮蔽（剪纸 · 色纸）：预设要地面或遮蔽才建。遮蔽 = 后台作业的小学版：内容键（提供者给）变了先记下，停手 AO_QUIET_MS 才重烘
   * （拖着改的时候影子停在上一份，停手后跟上；第一次立刻烘）；烘的时间记在 perf.last["aoBake"]。场景是空的（没有包围球）= 不烘、不遮。
   */
  private syncPaper(cam3: any): void {
    const p = this.framePreset, L = p.light;
    if (!this.paper || (!L.ao && !L.ground && p.material.shade !== "flat")) { this.paper?.hide(); return; }
    const sphere = this.provider?.bounds?.() ?? null;
    const env = L.env, az = (env?.sunAz ?? 0) * Math.PI / 180, el = (env?.sunEl ?? 0) * Math.PI / 180;
    const sunW = env ? { x: Math.sin(az) * Math.cos(el), y: Math.cos(az) * Math.cos(el), z: Math.sin(el) } : null;   // 世界（z 上）；实验室坐标 = (x, z, −y)
    if (L.ao && this.aoBaker) {
      const ck = this.provider?.contentKey?.() ?? "static", now = performance.now();
      if (ck !== this.aoSeen) {
        this.aoSeen = ck; this.aoChangedAt = now;
        if (this.aoBaked !== "") { if (this.aoTimer) clearTimeout(this.aoTimer); this.aoTimer = setTimeout(() => { this.aoTimer = null; this.onRedrawWanted?.(); }, AO_QUIET_MS + 10); }
      }
      const want = `${ck}|${sunW ? `${sunW.x.toFixed(4)},${sunW.y.toFixed(4)},${sunW.z.toFixed(4)}` : "-"}`;   // 太阳那格跟着预设走：只换了太阳（换风格）= 内容没变，立刻烘
      if (sphere && this.aoBaked !== want && (this.aoBaked === "" || this.aoBaked.startsWith(`${ck}|`) || now - this.aoChangedAt >= AO_QUIET_MS)) {
        const baker = this.aoBaker;
        this.perf.time("aoBake", () => baker.bake(this.renderer, this.scene, sphere, sunW));
        this.aoBaked = want;
      }
    }
    cam3.updateMatrixWorld();
    const fade = this.lastView?.camera.kind === "ortho" ? this.lastTarget : (this.lastView?.camera.eye ?? { x: 0, y: 0, z: 0 });
    if (p.material.pbr && this.pbr && this.envSky && env && sunW) {   // 铸铜：地面 / 背景归表面那份（环境图 + 太阳 + 遮蔽），纸的地面藏起来
      this.paper.hide();
      const es = this.envSky;
      if (es.ensure(this.renderer, env.recipe, [sunW.x, sunW.z, -sunW.y])) { this.perf.last.envBake = es.lastMs; this.perf.count.envBake = (this.perf.count.envBake ?? 0) + 1; }   // 真烘了才记
      this.pbr.sync(p.material.pbr, p.material.surface, p.material.colorize === "model", env, sunW, L.ao, !!sphere && this.aoBaked !== "", L.ground, cam3, fade);
      return;
    }
    this.pbr?.hide();
    this.paper.sync(p.material.flat ?? { base: PALETTE.face, shadowTint: 0xffffff, contrast: 0, ramp: 1, steps: 1, soft: 0, lightAz: 0, lightEl: 0 },
      L.ao, !!sphere && this.aoBaked !== "", L.ground, L.background ?? PALETTE.background, cam3,
      p.material.tron && L.ground?.grid ? { line: p.material.tron.line, r: sphere?.r ?? 1, fade: this.lastView?.camera.kind === "ortho" ? this.lastTarget : (this.lastView?.camera.eye ?? { x: 0, y: 0, z: 0 }) } : null);   // Tron 地格：场景半径 = 1 格；淡出按到眼（正交按到视野中心）
  }

  /**
   * 风格那条路（Tron 第 1 步：像素描边）：① 模型画进小图（画布设备像素 ÷ k，k = 像素化 × 设备像素比取整，整数倍）——相机用 view offset 让小图恰好盖住
   * 「k × 小图」那么大一块，画布外多出来的那一点裁掉，叠加层和小图逐像素对齐；② 描边（后处理挂点）③ 最近邻放大回画布并写回深度 ④ 叠加层那一层
   * （网格、三轴、选中边、吸附、gizmo、文字、X 光线）按原分辨率画在上面，被写回的深度挡。选中 / 悬停的面是槽里的节点，跟着模型一起像素化。
   */
  private renderStyled(cam3: any): void {
    const p = this.framePreset, W = this.flatRes.w, H = this.flatRes.h;
    const k = p.screen.rows ? Math.max(1, Math.floor(H / p.screen.rows)) : Math.max(1, Math.round(p.screen.pixelate * this.dpr));   // 行数上限：整数倍铺满、不留黑边
    const ps = (this.pixelScreen ??= new PixelScreen());
    const low = ps.prepare(W, H, k), target = this.renderer.getRenderTarget();
    const bg = this.scene.background, mask = cam3.layers.mask, auto = this.renderer.autoClear;
    const cc = this.renderer.getClearColor(new THREE.Color()), ca = this.renderer.getClearAlpha();
    try {
      // ① 模型 → 小图：清成全零（背景色在描边那遍补，渲染目标里 three 不给背景做色彩换算）
      this.scene.background = null; this.renderer.setClearColor(0x000000, 0);
      cam3.layers.mask = 1 | (1 << GROUND_LAYER);   // 模型 + 风格的地面（叠加层那一层后面单画）
      cam3.setViewOffset(W, H, 0, H - ps.h * k, ps.w * k, ps.h * k);
      if (p.material.tron && this.tron) this.tron.sync(p.material.tron, H / this.dpr / ps.h);   // 线宽按小图的像素（LineSegments2 按画布 CSS 视口算，见 tron-shader.ts 头）
      this.renderer.setRenderTarget(low); this.renderer.render(this.scene, cam3);
      if (p.post.bloom) {
        // 辉光那遍：同一个场景再画一遍进半精度的辉光图（面只出轮廓光、线全色、被挡的边 × 0.4、地格的光）
        const bl = (this.bloom ??= new Bloom()); bl.prepare(ps.w, ps.h);
        this.tron?.setGlowPass(true); this.paper?.setGlowPass(true);
        try { this.renderer.setRenderTarget(bl.glow); this.renderer.render(this.scene, cam3); } finally { this.tron?.setGlowPass(false); this.paper?.setGlowPass(false); }
        cam3.clearViewOffset();
        // ② 辉光合成（后处理挂点）③ 放大回画布（屏幕一刀：CRT 电视）
        bl.run(this.renderer, low.texture, ps.postTarget, p.post.bloom);
        ps.upscale(this.renderer, target, "post", p.screen.look);
      } else {
        cam3.clearViewOffset();
        // ② ③ 描边 + 放大（写回深度）
        ps.outline(this.renderer, { outline: p.post.pixelOutline, background: p.light.background ?? PALETTE.background, near: cam3.near, far: cam3.far, ortho: !!cam3.isOrthographicCamera });
        ps.upscale(this.renderer, target, "post", p.screen.look);
      }
      // ④ 叠加层那一层：不清屏，按原分辨率画在放大好的画面上
      this.renderer.autoClear = false; cam3.layers.mask = 1 << OVERLAY_LAYER;
      this.renderer.setRenderTarget(target); this.renderer.render(this.scene, cam3);
    } finally {
      this.scene.background = bg; cam3.layers.mask = mask; this.renderer.autoClear = auto; this.renderer.setClearColor(cc, ca);
      if (cam3.view?.enabled) cam3.clearViewOffset();
    }
  }

  /**
   * 离屏截图（缩略图；转正纪元 2026-09-20）：渲到 w×h 的 render target 再 readRenderTargetPixels。
   * 返回 RGBA、行序**自上而下**（three 读回是自下而上，这里翻好）。XR 会话中不截（相机归 XR）。
   */
  captureRgba(input: FrameInput): Uint8Array {
    if (this.renderer.xr.isPresenting) throw new Error("captureRgba: not available during an XR session");
    const vp = input.viewport;
    const rt = new THREE.WebGLRenderTarget(vp.w, vp.h, { depthBuffer: true });
    this.poolKey = "";   // 强制重拉；选区 / 悬停不进缩略图 = 调用方递的是干净视图（叠加层里没有高亮，画家自己藏）
    this.capturing = true;   // 缩略图 = 模型本身，画白模（风格是视图）
    try {
      this.renderer.setRenderTarget(rt);
      this.render(input);
      const buf = new Uint8Array(vp.w * vp.h * 4);
      this.renderer.readRenderTargetPixels(rt, 0, 0, vp.w, vp.h, buf);
      const out = new Uint8Array(buf.length);
      const row = vp.w * 4;
      for (let y = 0; y < vp.h; y++) out.set(buf.subarray(y * row, (y + 1) * row), (vp.h - 1 - y) * row);
      return out;
    } finally {
      this.renderer.setRenderTarget(null);
      rt.dispose();
      this.poolKey = ""; this.capturing = false;   // 下一帧按主视图重拉
    }
  }

  /**
   * 全部膜 → 几何：无贴图材质的一份（三角汤 + 法向 + sRGB 顶点色 = 材质颜色 × 状态色），每种贴图材质一份（+UV）。
   * 平滑组（0.8，user「平滑组是一个很重要的概念，好好设计一下」）：被 **smooth** 边连起来的膜 = 一个平滑组，组内顶点法向 = 含该顶点的膜法向按内角加权平均；
   * soft（不画线）与 smooth（插值法向）是两个独立的边层（SU 的 Soft / Smooth），推拉侧棱两者都给、软化工具默认两者都给。
   */
  private textureFor(mat: MaterialRef): any {
    let tex = this.texCache.get(mat);
    if (tex) return tex;
    tex = new THREE.DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    this.applyTexFilter(tex);
    this.texCache.set(mat, tex);
    const bytes = mat.texture?.bytes;
    if (bytes && typeof createImageBitmap === "function") {
      const blob = new Blob([bytes as BlobPart], { type: mat.texture!.mimeType });
      createImageBitmap(blob, { imageOrientation: "flipY" }).then((bmp) => {
        // 解好的位图要换成一张**普通** Texture：占位的是 DataTexture，three 按 `image.data` 上传，塞进去的 ImageBitmap 没有 data →
        // texSubImage2D「no pixels」→ 贴图面全黑（2026-10-29 截图基线 box-textured 抓到的；Claude Fable 5.1）。换对象、材质的 uMap 跟着换。
        if (this.texCache.get(mat) !== tex) { bmp.close?.(); return; }   // 材质已经换过贴图 / 被回收：这份解码作废
        const real = new THREE.Texture(bmp);
        real.colorSpace = THREE.SRGBColorSpace; real.wrapS = real.wrapT = THREE.RepeatWrapping;
        real.flipY = false; real.generateMipmaps = true; real.minFilter = THREE.LinearMipmapLinearFilter; real.needsUpdate = true; this.applyTexFilter(real);
        this.texCache.set(mat, real);
        for (const m of this.texMats.get(mat)?.values() ?? []) m.uniforms.uMap.value = real;
        const tu = this.texU.get(mat); if (tu) tu.value = real;   // 风格材质（写实）的那份也换
        tex.dispose();
        this.onTextureReady?.();
      }).catch(() => { /* 解码失败：留灰占位 */ });
    }
    return tex;
  }
  /** 贴图的 uniform 对象（风格的材质共用：解码完换贴图时在同一个对象里换值）。 */
  private texU = new Map<object, { value: unknown }>();
  private texUniform(mat: MaterialRef): { value: unknown } { let u = this.texU.get(mat); if (!u) { u = { value: this.textureFor(mat) }; this.texU.set(mat, u); } return u; }
  /** 贴图异步解好后的回调（app 层接 editor.draw）。 */
  onTextureReady: (() => void) | null = null;

  /** 线稿风格（视图菜单「粗线稿」）：池的边换粗线 / 像素线 = 重拉一次（块不变，槽节点换几何）。 */
  setLineStyle(style: LineStyle): void { if (this.lineStyle !== style) { this.lineStyle = style; this.poolKey = ""; } }
  setXray(on: boolean): void { this.xray = on; }   // 真正生效在下一帧的规划（xrayPass 变了才重建池 / 叠加层）
  /** 这一帧的 pass 声明：白模 = 膜 + 边直接画进 frame；风格 = 场景画进小图 → 后处理 → 放大（minccino/preset presetPasses）。地面网格 / 叠加层 / X 光往 frame 上追加画。开关 = 在不在表里。
   *  XR 会话里先只走白模（风格的小图 / 放大还没接两只眼——视图菜单那行的提示写着）。 */
  private passes(): PassDecl[] { return presetPasses(this.currentPreset(), this.xray); }
  /** 这一帧该用的预设：XR 会话里 / 截缩略图时 = 白模。 */
  private currentPreset(): Preset { return this.renderer.xr.isPresenting || this.capturing ? PRESETS.white : this.preset; }
  /** 风格（视图 ☰「风格」）：换了 = 重拉一次（线稿画不画）、面 shader 换明暗档、贴图换过滤。 */
  setPreset(id: PresetId): void {
    const p = PRESETS[id] ?? PRESETS.white;
    if (p === this.preset) return;
    this.preset = p; this.poolKey = "";
    for (const t of this.texCache.values()) this.applyTexFilter(t);
  }
  getPreset(): PresetId { return this.preset.id as PresetId; }
  /** 贴图过滤跟预设走（像素风 = 最近邻；不改资产，只改采样）。 */
  private applyTexFilter(t: any): void {
    const nearest = this.preset.material.texFilter === "nearest";
    const mag = nearest ? THREE.NearestFilter : THREE.LinearFilter, min = nearest ? THREE.NearestFilter : (t.isDataTexture ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter);
    if (t.magFilter !== mag || t.minFilter !== min) { t.magFilter = mag; t.minFilter = min; t.needsUpdate = true; }
  }
  /** 缩略图截图时只画白模（缩略图 = 模型，不是视图）。 */
  private capturing = false;
  getLineStyle(): LineStyle { return this.lineStyle; }
  /** 线稿粗细（设备像素）：1 = 原生线；> 1 = 粗线 + SU 轮廓线。 */
  setLineWeight(w: number): void { this.lineWeight = w; this.setLineStyle(w > 1 ? "thick" : "pixel"); }
  getLineWeight(): number { return this.lineWeight; }

  /** 探针：叠加层线段族里某个 id（lockLines / soft / guides / …）这一帧画着没有。 */
  overlayVisible(id: string): boolean { return this.overlayLines.isVisible(id) || this.overlayMarks.isVisible(id) || this.overlayFaces.isVisible(id); }
  /** 引擎这边的入口：流提供者（编辑器那边的 EditorStreamProvider；骨架稿 v2 不变量 2：引擎拉、提供者吐）。 */
  setProvider(p: StreamProvider): void { this.provider = p; this.poolKey = ""; }
  /** 样式那半给提供者（过渡期：面 / 边颜色和粗线 / 像素线还烤在顶点色里；材质模块 + 叠加层落地后退役）。 */
  chunkStyle(): ChunkStyle {
    const c = new THREE.Color(), hex = (h: number): readonly [number, number, number] => { c.setHex(h); return [c.r, c.g, c.b]; };
    const eDim = hex(PALETTE.edgeDim), eWire = hex(PALETTE.edgeWire), eFace = hex(PALETTE.edge);
    return {
      // 淡出（上下文之外）：底色换成 faceDim、纯色材质和它对半混；贴图材质 = faceDim 乘贴图（和以前的变体同一套规则）
      faceColor: (mat, dim) => {
        if (dim) { const d = srgb(PALETTE.faceDim); return mat && !mat.texture ? [(d[0] + mat.color[0]) / 2, (d[1] + mat.color[1]) / 2, (d[2] + mat.color[2]) / 2] : d; }
        if (mat && !mat.texture) return [mat.color[0], mat.color[1], mat.color[2]];
        return mat?.texture ? [1, 1, 1] : srgb(PALETTE.face);
      },
      edgeColor: (loose, dim) => (dim ? eDim : loose ? eWire : eFace),
      thick: () => this.lineStyle === "thick",
    };
  }
  /** 拉一帧流 → 块进显卡 → 每个放置一组槽节点（矩阵 + 按活动 / 淡出 / 单面挑材质和几何）。 */
  private syncPools(): void {
    if (!this.provider) throw new Error("render3: no stream provider (editor wires EditorStreamProvider before the first draw)");
    const frame = this.provider.pull({ view: "main", eye: this.lastView?.camera.eye, bands: [{ near: 0, far: Infinity }], budget: {} });   // 小学：一带、预算只记不裁
    this.syncGen++;
    const byPool = new Map<string, { plain: GpuFaces | null; tex: GpuFaces[]; lines: GpuLines | null }>();
    this.perf.time("poolMesh.upload", () => {
      for (const ch of frame.chunks) {
        let pb = byPool.get(ch.pool);
        if (!pb) { pb = { plain: null, tex: [], lines: null }; byPool.set(ch.pool, pb); }
        if (ch.kind === "lines") pb.lines = this.uploadLines(ch);
        else { const gf = this.uploadFaces(ch); if (gf.mat && gf.side) pb.tex.push(gf); else pb.plain = gf; }
      }
    });
    for (const pl of frame.placements) {
      let n = this.slotNodes.get(pl.slot);
      if (!n) { n = this.makeSlotNodes(); this.slotNodes.set(pl.slot, n); }
      n.gen = this.syncGen;
      n.root.visible = true;
      setMatrix(n.root, pl.xform);
      const pb = byPool.get(pl.pool), dimmed = pl.dim;
      // 面：活动池 DEPTH.face、别的池 DEPTH.faceOther（#25 重叠时活动池 / loose 几何赢）
      const paper = this.framePreset.material.shade === "flat" ? this.paper : null;   // 平涂（剪纸）：纸的那组材质，深度偏移档照旧
      const tron = this.framePreset.material.shade === "tron" ? this.tron : null;      // CRT Tron：深色面 + 青线；选中面认领成橙色
      const fside = pl.singleSided ? "front" : "double";
      const pbr = this.framePreset.material.shade === "pbr" ? this.pbr : null;          // 铸铜：有光照的表面，不借模型颜色
      n.plain.material = paper ? paper.face(fside, pl.active, false) : tron ? tron.face(fside, pl.active, false) : pbr ? pbr.face(fside, pl.active, false, false, null, this.framePreset.material.surface) : pl.singleSided ? (pl.active ? this.faceMatFront : this.faceMatOtherFront) : (pl.active ? this.faceMat : this.faceMatOther);
      n.selMat = tron ? tron.face(fside, pl.active, false, true) : pbr ? pbr.face(fside, pl.active, false, true, null, this.framePreset.material.surface) : null;
      const plain = pb?.plain ?? null, showPlain = !!plain && plain.count > 0;
      n.plain.geometry = showPlain ? (dimmed ? plain!.geoDim : plain!.geo) : this.emptyGeo; n.plain.visible = showPlain;
      let ti = 0;
      for (const gf of pb?.tex ?? []) {
        if (!(gf.count > 0)) continue;
        let slot = n.tex[ti];
        if (!slot) { const mesh = new THREE.Mesh(this.emptyGeo, this.texMatFor(gf.mat!, gf.side!)); mesh.frustumCulled = false; n.root.add(mesh); slot = { mesh }; n.tex.push(slot); }
        slot.mesh.material = paper ? paper.face(gf.side!, true, true) : tron ? tron.face(gf.side!, true, true) : pbr ? pbr.face(gf.side!, true, true, false, this.framePreset.material.colorize === "model" ? this.texUniform(gf.mat!) : null, this.framePreset.material.surface) : this.texMatFor(gf.mat!, gf.side!);   // 写实：贴图进底色   // 一件一色印不出贴图：贴图面 = 纸本色；Tron 不借模型颜色
        slot.mesh.geometry = dimmed ? gf.geoDim : gf.geo; slot.mesh.visible = true;
        ti++;
      }
      for (; ti < n.tex.length; ti++) n.tex[ti].mesh.visible = false;
      // 边
      const L = pb?.lines ?? null, hasL = !!L && L.count > 0, showL = hasL && this.framePreset.material.edges;   // 风格可以不画模型的线稿（像素描边）；X 光的线照画
      if (this.lineStyle === "thick") { n.thick.geometry = hasL ? (dimmed ? L!.geoDim : L!.geo) : this.emptyLineGeo; n.thick.visible = showL; n.pixel.visible = false; }
      else { n.pixel.geometry = hasL ? (dimmed ? L!.geoDim : L!.geo) : this.emptyGeo; n.pixel.visible = showL; n.thick.visible = false; }
      n.thick.material = tron ? tron.lineThick : this.edgeMat; n.pixel.material = tron ? tron.linePixel : this.pixelMat;
      // 被挡住的边：Tron 拿 X 光那两个节点（同一份线几何）换成「深度反测 + 半透明」画在模型那一层；别的风格 = X 光（叠加层那一层、不做深度测试）
      const xr = (this.xrayPass || !!tron) && hasL, xLayer = tron ? 1 : 1 << OVERLAY_LAYER;
      n.xthick.layers.mask = xLayer; n.xpixel.layers.mask = xLayer;
      n.xthick.material = tron ? tron.hiddenThick : this.xrayThickMat; n.xpixel.material = tron ? tron.hiddenPixel : this.xrayPixelMat;
      n.xthick.geometry = xr && this.lineStyle === "thick" ? n.thick.geometry : this.emptyLineGeo; n.xthick.visible = xr && this.lineStyle === "thick";
      n.xpixel.geometry = xr && this.lineStyle !== "thick" ? n.pixel.geometry : this.emptyGeo; n.xpixel.visible = xr && this.lineStyle !== "thick";
    }
    // 没了的槽：节点摘掉（几何是共享引用，不在这里释放）
    for (const [key, n] of this.slotNodes) if (n.gen !== this.syncGen) { this.scene.remove(n.root); this.slotNodes.delete(key); }
    // 块的显卡副本：两代没人用的释放
    for (const [id, g] of this.chunkGpus) if (g.gen < this.syncGen - 1) { g.geo.dispose(); g.geoDim.dispose(); this.chunkGpus.delete(id); }
  }
  private makeSlotNodes(): SlotNodes {
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    const plain = new THREE.Mesh(this.emptyGeo, this.faceMat); plain.frustumCulled = false; plain.visible = false;
    const sel = new THREE.Mesh(this.emptyGeo, this.faceMat); sel.frustumCulled = false; sel.visible = false; sel.renderOrder = 2;   // 画在面之后：深度一模一样时后画的赢
    const pixel = new THREE.LineSegments(this.emptyGeo, this.pixelMat); pixel.frustumCulled = false; pixel.visible = false;
    const thick = new LineSegments2(this.emptyLineGeo, this.edgeMat); thick.frustumCulled = false; thick.visible = false;
    const xpixel = new THREE.LineSegments(this.emptyGeo, this.xrayPixelMat); xpixel.frustumCulled = false; xpixel.visible = false; xpixel.renderOrder = 3; xpixel.layers.set(OVERLAY_LAYER);
    const xthick = new LineSegments2(this.emptyLineGeo, this.xrayThickMat); xthick.frustumCulled = false; xthick.visible = false; xthick.renderOrder = 3; xthick.layers.set(OVERLAY_LAYER);
    root.add(plain); root.add(sel); root.add(pixel); root.add(thick); root.add(xpixel); root.add(xthick);
    this.scene.add(root);
    return { root, plain, sel, selKey: "\u0000", selMat: null, tex: [], pixel, thick, xpixel, xthick, gen: 0 };
  }
  private texMatFor(mat: MaterialRef, side: ChunkSide = "double"): any {
    let bySide = this.texMats.get(mat);
    if (!bySide) { bySide = new Map(); this.texMats.set(mat, bySide); }
    let m = bySide.get(side);
    if (m) return m;
    m = new THREE.ShaderMaterial({ vertexShader: TEX_VERT, fragmentShader: TEX_FRAG, uniforms: { uLight: this.faceMat.uniforms.uLight, uUnlit: this.unlitU, uMap: { value: this.textureFor(mat) } }, side: side === "front" ? THREE.FrontSide : side === "back" ? THREE.BackSide : THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: DEPTH.face });
    bySide.set(side, m);
    return m;
  }
  /** 一块面 → 显卡。版本没变 = 不碰；数组换过 / 长大了 = 重建几何（直接包块的大数组，不拷）；否则只传改过的段。 */
  private uploadFaces(ch: Chunk): GpuFaces {
    let gf = this.chunkGpus.get(ch.id) as GpuFaces | undefined;
    const A = ch.attributes;
    if (gf && gf.version === ch.version) { gf.gen = this.syncGen; return gf; }
    if (!gf || ch.dirty.grown || gf.attrs.position.array !== A.position.array) {
      if (gf) { gf.geo.dispose(); gf.geoDim.dispose(); }
      // 法线 / 面颜色是归一化整数（pool-mesh 的 i16n / i8n）：显卡读成 −1…1 的浮点
      const at: Record<string, any> = {};
      for (const name of Object.keys(A)) { const x = new THREE.BufferAttribute(A[name].array, A[name].size, !!A[name].normalized); x.setUsage(THREE.DynamicDrawUsage); at[name] = x; }
      const mk = (dim: boolean): any => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", at.position); geo.setAttribute("normal", at.normal);
        geo.setAttribute("aColor", dim ? at.aColorDim : at.aColor); geo.setAttribute("_aColorOther", dim ? at.aColor : at.aColorDim);
        if (at.aUv) geo.setAttribute("aUv", at.aUv);
        else { geo.setAttribute("aColorB", dim ? at.aColorBDim : at.aColorB); geo.setAttribute("_aColorBOther", dim ? at.aColorB : at.aColorBDim); }
        return geo;
      };
      gf = { id: ch.id, version: ch.version, mat: ch.material ?? null, side: ch.side ?? null, attrs: at, geo: mk(false), geoDim: mk(true), count: ch.count, gen: this.syncGen };
      this.chunkGpus.set(ch.id, gf);
    } else { for (const a of Object.values(gf.attrs)) pushRanges(a, a.itemSize, ch.dirty.ranges); gf.version = ch.version; gf.count = ch.count; gf.gen = this.syncGen; }
    gf.geo.setDrawRange(0, ch.count); gf.geoDim.setDrawRange(0, ch.count);
    return gf;
  }
  /** 一块线 → 显卡：粗线 = LineSegments2 的实例缓冲（seg / col / colDim / w1 / w2 / flag），像素线 = 普通顶点缓冲。 */
  private uploadLines(ch: Chunk): GpuLines {
    let gl = this.chunkGpus.get(ch.id) as GpuLines | undefined;
    const A = ch.attributes, instanced = !!ch.instanced;
    if (gl && gl.version === ch.version) { gl.gen = this.syncGen; return gl; }
    if (!gl || ch.dirty.grown || gl.instanced !== instanced || gl.bufs.first.array !== A[instanced ? "seg" : "position"].array) {
      if (gl) { gl.geo.dispose(); gl.geoDim.dispose(); }
      if (instanced) {
        const ib = (name: string, stride: number): any => { const b = new THREE.InstancedInterleavedBuffer(A[name].array, stride, 1); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const ia = (name: string, size: number): any => { const b = new THREE.InstancedBufferAttribute(A[name].array, size); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const bufs: Record<string, any> = { first: ib("seg", 6), col: ib("col", 6), colDim: ib("colDim", 6), w1: ia("w1", 3), w2: ia("w2", 3), flag: ia("flag", 1) };
        const mk = (dim: boolean): any => {
          const geo = new LineSegmentsGeometry(), c = dim ? bufs.colDim : bufs.col, o = dim ? bufs.col : bufs.colDim;
          geo.setAttribute("instanceStart", new THREE.InterleavedBufferAttribute(bufs.first, 3, 0)); geo.setAttribute("instanceEnd", new THREE.InterleavedBufferAttribute(bufs.first, 3, 3));
          geo.setAttribute("instanceColorStart", new THREE.InterleavedBufferAttribute(c, 3, 0)); geo.setAttribute("instanceColorEnd", new THREE.InterleavedBufferAttribute(c, 3, 3));
          geo.setAttribute("_colorOther", new THREE.InterleavedBufferAttribute(o, 3, 0));
          geo.setAttribute("instanceW1", bufs.w1); geo.setAttribute("instanceW2", bufs.w2); geo.setAttribute("instanceFlag", bufs.flag);
          return geo;
        };
        gl = { id: ch.id, version: ch.version, instanced, bufs, geo: mk(false), geoDim: mk(true), count: ch.count, gen: this.syncGen };
      } else {
        const attr = (name: string): any => { const x = new THREE.BufferAttribute(A[name].array, 3); x.setUsage(THREE.DynamicDrawUsage); return x; };
        const bufs: Record<string, any> = { first: attr("position"), color: attr("color"), colorDim: attr("colorDim") };
        const mk = (dim: boolean): any => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", bufs.first); geo.setAttribute("color", dim ? bufs.colorDim : bufs.color); geo.setAttribute("_colorOther", dim ? bufs.color : bufs.colorDim);
          return geo;
        };
        gl = { id: ch.id, version: ch.version, instanced, bufs, geo: mk(false), geoDim: mk(true), count: ch.count, gen: this.syncGen };
      }
      this.chunkGpus.set(ch.id, gl);
    } else { for (const b of Object.values(gl.bufs)) pushRanges(b, b.stride ?? b.itemSize, ch.dirty.ranges); gl.version = ch.version; gl.count = ch.count; gl.gen = this.syncGen; }
    if (instanced) { gl.geo.instanceCount = ch.count; gl.geoDim.instanceCount = ch.count; }
    else { gl.geo.setDrawRange(0, ch.count); gl.geoDim.setDrawRange(0, ch.count); }
    return gl;
  }
  // 选中 / 悬停的面与边的高亮（原 rebuildOverlay）6c 起由编辑器算（editor/highlight.ts）、经叠加层契约进来，画在 overlay-faces.ts / overlay-lines.ts（"edge" 样式）。


  /** XR：key light 钉在 HMD 相机系（同 keyLight 公式）。 */
  private xrKeyLight(): Vec3 {
    const c = this.renderer.xr.getCamera();
    const m = c.matrixWorld.elements;
    const e = { x: m[8], y: m[9], z: m[10] }, u = { x: m[4], y: m[5], z: m[6] }, r = { x: m[0], y: m[1], z: m[2] };
    const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
    const n = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / n, y: v.y / n, z: v.z / n };
  }

  /** 共享粗线材质（resolution 共享 Vector2；linewidth 由 syncLineScale 每帧按 lineScale 写）。offset=true：深度前拉，共面线赢面。 */
  /** 一组小三轴（每个帧：原点出三根屏幕定长 POOL_AXES_PX 的短轴，RGB = XYZ）；key 没变就不重建。返回新 key。 */
  /** 锁着时的轴线：每根过 through、两头各伸 LOCK_LINE_SPAN_PX 屏幕像素那么长（按那一点的一像素多长换算）；颜色 = 轴色，斜面 = 中性灰。 */
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
  private rebuildGrid(frame: Frame3, step: number, sub: number): void {
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
      this.gridMesh.frustumCulled = false; this.gridMesh.renderOrder = -1; this.gridMesh.matrixAutoUpdate = false; this.gridMesh.layers.set(OVERLAY_LAYER);
      this.scene.add(this.gridMesh);
      const axesMat = this.lineMat(STATIC_PX, { vertexColors: true });   // 不前拉：轴在边后面（DEPTH 注释）
      axesMat.depthFunc = THREE.LessDepth; axesMat.polygonOffset = true; axesMat.polygonOffsetFactor = 0; axesMat.polygonOffsetUnits = DEPTH.guide;
      this.axesObj = new LineSegments2(new LineSegmentsGeometry(), axesMat);
      this.axesObj.frustumCulled = false; this.axesObj.layers.set(OVERLAY_LAYER);
      this.scene.add(this.axesObj);
    }
    this.gridMat.uniforms.uStep.value = step > 1e-6 ? step : 1;
    this.gridMat.uniforms.uSub.value = sub > 1 ? sub : 1;
    this.gridMesh.matrix.set(X.x, Y.x, Zd.x, o.x, X.y, Y.y, Zd.y, o.y, X.z, Y.z, Zd.z, o.z, 0, 0, 0, 1);
    this.gridMesh.matrixWorldNeedsUpdate = true;
    const at = (u: number, v: number, w: number): Vec3 => ({ x: o.x + X.x * u + Y.x * v + Zd.x * w, y: o.y + X.y * u + Y.y * v + Zd.y * w, z: o.z + X.z * u + Y.z * v + Zd.z * w });
    const apos: number[] = [], acol: number[] = [];
    const pushA = (a: Vec3, b: Vec3, hex: number): void => { apos.push(a.x, a.y, a.z, b.x, b.y, b.z); const c = this.tmpColor.setHex(hex); acol.push(c.r, c.g, c.b, c.r, c.g, c.b); };
    // 轴切成短段（2026-10-25 Opus）：LineMaterial 在屏幕上按两端点插值深度，一根 100 m 的线一端越过近平面被截断后插值误差很大，
    // 实测（2× 像素比）轴的深度会跑到压在它上面的边前面，多边形偏移也救不回来。短段各自插值，深度准。
    const AXIS_SEG = 2;   // 米
    const seg = (a: number, b: number, f: (t: number) => Vec3, hex: number): void => { for (let t = a; t < b - 1e-9; t += AXIS_SEG) pushA(f(t), f(Math.min(b, t + AXIS_SEG)), hex); };
    seg(-L, L, (t) => at(t, 0, 0), PALETTE.axisX);
    seg(-L, L, (t) => at(0, t, 0), PALETTE.axisY);
    seg(0, L, (t) => at(0, 0, t), PALETTE.axisZ);
    setLineGeometry(this.axesObj, apos, acol);
  }
}

/** 3×4 行主序 Xform → three 矩阵（Group 的本地矩阵；matrixAutoUpdate 关着）。 */
function setMatrix(obj: any, m: Xform12): void {
  obj.matrix.set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], 0, 0, 0, 1);
  obj.matrixWorldNeedsUpdate = true;
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


/** 相机系 key light：眼方向 + 上 0.55 + 右 0.35（Blender studio 光的最小近似）。 */
function keyLight(cam: CameraSource): Vec3 {
  const e = cam.eyeDir(), u = cam.up(), r = cam.right();
  const v = { x: e.x + u.x * 0.55 + r.x * 0.35, y: e.y + u.y * 0.55 + r.y * 0.35, z: e.z + u.z * 0.55 + r.z * 0.35 };
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

// faceTriangles（面的三角剖分：高亮的世界坐标那条路 + OBJ 导出）6c 起住 src/editor/face-triangles.ts，不再借 three 的 earcut。
