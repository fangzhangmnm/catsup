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
import { OverlayLinesDrawer, linToSrgb, setLineGeometry } from "./overlay-lines.ts";
import { Residency, type ResidentId, residentsOf } from "./residency.ts";
import { OverlayMarksDrawer } from "./overlay-marks.ts";
import type { OverlayCtx, OverlayItem, OverlayLines } from "../../overlay/index.ts";
import type { RenderProvider, MarkAccent, XRFacade, XRHand, XRRigPose, XRRay, LineStyle, ProviderCaps, FrameInput, Mark, FaceSlot, LineSlot } from "../../index.ts";
import { DEFAULT_VIEW_BUDGET, WORLD_FRAME3, planFrame, checkBudget, type BudgetReport, type CameraSource, type Chunk, type ChunkSide, type Frame3, type MaterialRef, type Measurement, type PassDecl, type StreamProvider, type Vec3, type View, type ViewportSize, type Xform12 } from "../../index.ts";   // 流契约：块 → 显卡（步 3）；视图 + frame graph（步 4）；相机来源 / 视口 / 坐标架（6c）
import { PALETTE } from "../../palette.ts";
import { hexToLinear } from "../../overlay/index.ts";
import { NOOP_PERF, type PerfSink } from "../../perf.ts";
import { PRESETS, SCREENS, isStyled, presetPasses, type Preset, type PresetId, type ScreenId, type ScreenPreset } from "../../preset/index.ts";
import { PixelScreen } from "./screen-pixel.ts";
import { AoBaker } from "./ao-bake.ts";
import { PaperMaterials } from "./paper-shader.ts";
import { TronMaterials } from "./tron-shader.ts";
import { Bloom } from "./bloom.ts";
import { EnvSky } from "./env-sky.ts";
import { PbrMaterials } from "./pbr-shader.ts";

/** X 光下被挡住的边画多淡（不透明度，0–1）。 */
const HIDDEN_OPACITY = 0.35;
const EDGE_PX = 1.6;        // 边线宽（CSS px；旧 thick 风格 + 选中 / 刮擦 / 悬停边的基准；0.12.3 起由 lineWeight 覆盖）
/**
 * 线稿粗细（0.12.3；user 2026-10-24「ipad上面细线稿是不舒服。但是粗线稿又太粗了，有1.5这种选项吗」「sketchup里面粗细线是有区分的啊, dangling edge和轮廓是粗线」）：
 * 单位 = **设备像素**。1 = 原生 GL 线（最细、最快，没有轮廓区分）；> 1 = 屏幕空间粗线（LineSegments2，不是 3D 实体），
 * 并按 SU 轮廓线规则加粗：零面边（悬空）/ 单面边（边界）/ 两张面朝向相反的边（剪影）= 轮廓，比内边粗 profileAdd；判定在顶点着色器里按实例做，相机转动不重建几何。
 */
const profileAddFor = (w: number): number => Math.min(w, 5 - w);   // 轮廓 ≈ 两倍粗，总宽不超过 5 设备像素
const STATIC_PX = 1.2;      // 网格 + 三轴（同一份粗线，只能一个宽度；轴靠颜色区分）
/** 网格：1 m 一格、±50 m（PC/VR 同一份；user 2026-09-07「vr 和 pc 的网格都是 1m，不应跟 branch」；无限/自适应网格 = A12）。 */
const GRID_STEP = 1, GRID_N = 50;
/** 像素化风格的网格：屏幕上格距至少几个小图像素才画（再密 = 地平线压成深色带）。 */
const PIXEL_GRID_MIN_PX = 8;
/** 长线切段（米）：一根很长、穿过近平面的线在软件光栅里整条被裁掉；三色轴 / 网格都切。 */
const AXIS_SEG_M = 2;
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
interface GpuFaces { readonly id: string; version: number; readonly mat: MaterialRef | null; readonly side: ChunkSide | null; readonly attrs: Record<string, any>; readonly geo: any; count: number; gen: number; }
interface GpuLines { readonly id: string; version: number; readonly instanced: boolean; readonly bufs: Record<string, any>; readonly geo: any; count: number; gen: number; }
/** 一个槽（实例 / group 出现的一个位置）的 three 节点：一个 Group 带矩阵，下面纯色面 / 贴图面 / 原生线 / 粗线，几何全是共享引用。 */
interface SlotNodes { thickOwn?: ThickOwn | null; root: any; plain: any; /** 这个槽的面现在用的源几何 / 材质 / 块 id（标记按它分段，刀 b）。 */ plainSrc: any; plainMat: any; plainChunk: string | null; tex: { mesh: any; src: any; mat: any; chunk: string | null }[]; pixel: any; thick: any; /** 线现在的底材质 / 块 id（线的标记按它换材质，刀 c）。 */ thickMat: any; pixelMat: any; linesChunk: string | null; /** 原生线的源几何（选中边按段分材质用）/ 粗线被标记那几条的拷贝 + 它的隐线版（X 光）。 */ pixelSrc: any; thickMark: any; thickMarkHidden: any; /** 这个槽的线这一帧画不画、粗线还是像素线（隐线标记按它开节点）。 */ linesVisible: boolean; thickLines: boolean; xpixel: any; xthick: any; gen: number; /** 上次应用的标记签名；标记的几何 = 共享源几何的属性 + 自己的索引分段（块 id → 几何）。 */ markKey: string; marked: Map<string, MarkedGeo> }
// SlotNodes.thickOwn：见 ThickOwn（syncThickMarks 用；没标记 = null，底线用共享块）
interface MarkedGeo { geo: any; src: any; index: any }
/** 被标记的槽的粗线底线：共享块的位置 / 颜色 / 两侧面，只有「旗」那一列自己拷（被标记的写 -1 = 着色器收成零宽 = 不画）。 */
interface ThickOwn { geo: any; flag: any; src: any }

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
const DEPTH = { face: 6, faceOther: 9, grid: 4 } as const;   // guide = 栅格 / 三色轴：比原生细线（0）后 4 档（细线与粗线插件的深度插值有噪声）、比覆盖层面（5）前 1 档
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
  uniform vec3 uMark;
  varying vec3 vColor;
  varying vec3 vColorB;
  varying vec3 vNormal;
  void main() {
    // 两个表面（DT8）：三角绕 +n 逆时针 → 正面朝着看 = 看到 +n 那侧（aColor），背面 = −n 那侧（aColorB）；负值 = 那侧归贴图网格画，这里不画
    vec3 c = gl_FrontFacing ? vColor : vColorB;
    if (c.r < 0.0) discard;
    #ifdef SEL
    c = uMark;   // 标记（选中 / 悬停）：换成状态色（刀 b；白模的材质表 = 替换）
    #endif
    #ifdef DIM
    c = mix(c, uMark, 0.5);   // 淡出（上下文之外）：往淡出色拉一半（刀 c；以前没上色的面是纯淡出色，现在一律拉一半）
    #endif
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
  uniform vec3 uMark;
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = uUnlit ? 1.0 : 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    vec3 c = texture2D(uMap, vUv).rgb * vColor;
    #ifdef SEL
    c = texture2D(uMap, vUv).rgb * uMark;   // 标记：贴图 × 状态色（和以前的贴图高亮同值）
    #endif
    #ifdef DIM
    c = texture2D(uMap, vUv).rgb * uMark;   // 淡出：贴图 × 淡出色（= 以前烤进顶点色的那个值）
    #endif
    gl_FragColor = vec4(c * k, 1.0);
  }`;

/** three 的层（不用 1 / 2：three 的 XR 用它们分左右眼）。2026-10-29 Opus 5.5 切刀第 2 步：没有「叠加层那一遍」了——
 *  辅助几何缺省住第 10 层、和模型（第 0 层）同一遍画（风格那条路里一起进小图）；第 8 层 = 排在后处理之后（同一张小图、同一块深度）；
 *  第 5 层 = 原分辨率（混合分辨率这项功能，缺省没人用）。第 0 层只放模型：遮蔽烘焙的相机只看它（辅助几何烘进影子 = 错）。不走风格那条路时相机全都看 = 一遍画完。 */
const NATIVE_LAYER = 5;
const LATE_LAYER = 8;
const AUX_LAYER = 10;
/** 原分辨率的网格（shader 网格 + 粗线三色轴）：不走风格那条路时画；风格那条路用第 7 层的 1 像素线版进小图。 */
const GRID_LAYER = 9;
/** 风格的地面 / 背景那一遍全屏（剪纸）住第 6 层：遮蔽烘焙的相机只看第 0 层，地面不挡自己。 */
const GROUND_LAYER = 6;
/** 网格 + 三色轴的原生 1 像素线版（像素化的风格把它们画进小图用；T101 user「像素网格也用线元？不要断断续续」）：平时不画，小图那遍才打开这一层。 */
const PIXEL_GRID_LAYER = 7;
/** 改完模型停手多久才重烘遮蔽（毫秒）：拖着改的时候不烘，影子停手后跟上（披露在预设说明里）。 */
const AO_QUIET_MS = 250;
/** 0xRRGGBB → sRGB 浮点三元（膜 shader 用；不过 three 的色彩管理）。 */
const srgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

export class Renderer3 implements RenderProvider {
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
  private pixelMat: any;                            // 原生线材质（顶点色，共享）
  private edgeDimMat: any; private pixelDimMat: any;   // 淡出的边（刀 c）：整组一色
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
  /** 被挡住的边（edgeHidden 标记，刀 d）：深度模式 hidden（深度大于才画）+ 半透明，画在模型那一层。 */
  private hiddenPixelMat: any; private hiddenThickMat: any;
  private lineWeight = 1;                              // 设备像素；1 = 原生线
  private readonly profileAdd = { value: 1 };          // 轮廓线加粗（设备像素）；edgeMat 的 shader uniform
  /** 风格（Tron 第 1 步；预设 = 数据，minccino/preset/）。白模 = 原来那一条渲染。 */
  private preset: Preset = PRESETS.white;
  /** 这一帧真正生效的预设（XR / 截图 = 白模）。 */
  private framePreset: Preset = PRESETS.white;
  /** 屏幕（T106：和画风分开选）：null = 跟画风默认；frameScreen = 这一帧实际套的屏（XR / 缩略图 = 原生）。 */
  private screen: ScreenId | null = null;
  private frameScreen: ScreenPreset = SCREENS.native;
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
  /** 计时口（消费方递进来的计数器；不给 = 不计）。 */
  private readonly perf: PerfSink;
   // 变换 gizmo（2026-10-26）
  private gridMesh: any = null; private gridMat: any = null; private axesObj: any = null;
  /** 网格 / 三色轴的原生 1 像素线版（PIXEL_GRID_LAYER；像素化的风格画进小图，光栅器自己的 Bresenham = 不糊不断）。 */
  private gridPix: any = null; private axesPix: any = null;
  /** 点线网格的材质（line stipple：沿线的主方向隔一个小图像素画一个；1-bit 线稿）。gridPixBase = 平常那份实色线材质。 */
  private gridStippleMat: any = null; private gridPixBase: any = null;
  private stippleMat(w: number, h: number, color: number): any {
    if (!this.gridStippleMat) {
      this.gridStippleMat = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, depthWrite: false, depthFunc: THREE.LessEqualDepth,
        uniforms: { uRes: { value: new THREE.Vector2(1, 1) }, uColor: { value: new THREE.Vector3() } },
        // 每个顶点知道这一段的另一头（other）：两头算出同一个「主方向」（屏幕上横着走 = 按 x 隔、竖着走 = 按 y 隔）
        vertexShader: `uniform vec2 uRes; in vec3 other; out float vX;
          void main() { vec4 a = projectionMatrix * modelViewMatrix * vec4(position, 1.0), b = projectionMatrix * modelViewMatrix * vec4(other, 1.0);
            vec2 d = (b.xy / max(abs(b.w), 1e-6) - a.xy / max(abs(a.w), 1e-6)) * uRes; vX = abs(d.x) >= abs(d.y) ? 1.0 : 0.0; gl_Position = a; }`,
        fragmentShader: `uniform vec3 uColor; in float vX; layout(location = 0) out vec4 oColor;
          void main() { ivec2 p = ivec2(gl_FragCoord.xy); if ((((vX > 0.5) ? p.x : p.y) & 1) == 1) discard; oColor = vec4(uColor, 1.0); }`,
      });
    }
    const u = this.gridStippleMat.uniforms; u.uRes.value.set(w, h); u.uColor.value.set(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255);   // 原样写进小图（sRGB 原值）
    return this.gridStippleMat;
  }
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
    for (const c of [this.camOrtho, this.camPersp]) for (const l of [NATIVE_LAYER, GROUND_LAYER, LATE_LAYER, GRID_LAYER, AUX_LAYER]) c.layers.enable(l);
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
    this.pixelMat = new THREE.LineBasicMaterial({ vertexColors: true });
    this.emptyGeo = new THREE.BufferGeometry();
    this.emptyLineGeo = new LineSegmentsGeometry();
    // 边：一份粗线（顶点色）+ SU 轮廓线（per-instance 两侧面法向 + 面数 → 着色器里判剪影 / 边界 / 悬空，加粗 profileAdd）
    this.edgeMat = this.lineMat(EDGE_PX, { offset: true, vertexColors: true });
    // SU 轮廓线：自己的顶点着色器源（profile-line-shader.ts；以前是 onBeforeCompile 在 three 编译时改源——步 5 拔掉的漏点 ①）
    this.edgeMat.vertexShader = PROFILE_LINE_VERTEX;
    this.edgeMat.uniforms.profileAdd = this.profileAdd;
    // 淡出的边（刀 c）：同一套轮廓线 shader、整组一色（PALETTE.edgeDim），不要顶点色；线宽每帧跟 edgeMat（syncLineScale）
    this.edgeDimMat = this.lineMat(EDGE_PX, { offset: true, vertexColors: false });
    this.edgeDimMat.vertexShader = PROFILE_LINE_VERTEX; this.edgeDimMat.uniforms.profileAdd = this.profileAdd; this.edgeDimMat.color.setHex(PALETTE.edgeDim);
    this.pixelDimMat = new THREE.LineBasicMaterial({ color: PALETTE.edgeDim });
    // X 光（DT17，2026-10-26）：池的边再画一遍（共用几何、不另占内存）+ 覆盖层不做深度测试；半透明渲染那半留 Tron 纪元
    this.hiddenPixelMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: HIDDEN_OPACITY, depthWrite: false, depthFunc: THREE.GreaterDepth });
    this.hiddenThickMat = this.lineMat(EDGE_PX, { vertexColors: true });
    Object.assign(this.hiddenThickMat, { transparent: true, opacity: HIDDEN_OPACITY, depthWrite: false, depthFunc: THREE.GreaterDepth });
    // 选中 / 刮擦 / 悬停的边 = 叠加层 "edge" 样式（6c）：用边线本身的材质、同一个深度偏移 = 深度相等，LessEqual 下谁后画谁赢；
    // 不定先后就由 three 的排序随缘——粗线稿时黑边常常后画、把红线整条盖掉（user 2026-10-25「bug：橡皮擦的红线不见了。也许是zorder」）。
    // 样式表定死它最后画（renderOrder 2）；它没有轮廓属性 = 按悬空边加粗画，本来就比底下的黑边宽，盖得住。探针 probe-erase-red。X 光开着换成不做深度测试那份。
    // 辅助几何（步 6a / 6b；刀 a 起材质按 item 的画法参数按需建；切刀第 2 步起按 stage / resolution 挂三层，缺省跟内容）
    const auxHost = { add: (o: any): void => { this.scene.add(o); }, remove: (o: any): void => { this.scene.remove(o); } };
    const auxLayers = { main: AUX_LAYER, late: LATE_LAYER, native: NATIVE_LAYER } as const;
    this.overlayLines = new OverlayLinesDrawer(auxHost, (px, o) => this.lineMat(px, o), { edge: () => this.edgeMat }, auxLayers);
    this.overlayMarks = new OverlayMarksDrawer(auxHost, auxLayers);
    // 画风专属东西登记进常驻表（对象第一次用到时才建；钩子按当时有没有建好去碰）
    this.residency.register("paperGround", { hide: () => this.paper?.hide(), bytes: () => 0 });
    this.residency.register("pbrGround", { hide: () => this.pbr?.hide(), bytes: () => 0 });
    this.residency.register("pixelScreen", { release: () => this.pixelScreen?.release(), bytes: () => this.pixelScreen?.bytes() ?? 0 });
    this.residency.register("bloom", { release: () => this.bloom?.release(), bytes: () => this.bloom?.bytes() ?? 0 });
    this.residency.register("envMap", { release: () => this.envSky?.release(), bytes: () => this.envSky?.bytes() ?? 0 });
    this.residency.register("aoAtlas", { release: () => { this.aoBaker?.release(); this.aoBaked = ""; }, bytes: () => this.aoBaker?.bytes() ?? 0 });

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

  caps(): ProviderCaps {
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
    this.edgeMat.linewidth = Math.max(this.lineWeight, 1) * k; this.edgeDimMat.linewidth = this.edgeMat.linewidth;
    this.profileAdd.value = profileAddFor(Math.max(this.lineWeight, 1)) * k;
    if (this.overlayLines) this.overlayLines.edgeWidth(Math.max(this.lineWeight, 1) * k);   // 断口小垂线跟边线一样粗（鼓包，不是另一种线）
    if (this.axesObj) this.axesObj.material.linewidth = Math.min(STATIC_PX * scale, this.lineWeight > 1 ? this.lineWeight * k : 0.6 * k);   // 原生细线（1 px）覆盖的采样点和粗线插件不同，轴同宽会从缝里透红 → 细线模式下轴画 0.6 px   // 轴不比边粗：压在轴上的边要整条盖住轴（2× 屏上轴 2.4 px > 边 1.5 px → 边成了「红边夹黑芯」，2026-10-25）
  }

  /** 世界单位/CSS 像素（在点 p 的深度处）——指示物按屏幕尺寸定大小用。XR：按到 HMD 的距离与 XR_PX_PER_DEG 折算。 */
  /** 调试 / 探针：画着的辅助几何的 id 和键（键里有什么归提交方）。 */
  auxKeys(): { id: string; key: string }[] { return [...this.overlayLines.keys(), ...this.overlayMarks.keys()]; }
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
    this.frameScreen = this.currentScreen();
    this.wanted = residentsOf(this.framePreset, this.frameScreen);
    this.residency.submit(this.wanted, performance.now());   // 画风递交名单：要的亮、不要的藏、久没要的放显存（常驻表）
    { const bl = this.framePreset.material.blink, on = !bl || Math.floor(performance.now() / (bl.periodMs / 2)) % 2 === 0;   // 标记闪：按钟点算这一拍（谁来叫重画归宿主）
      if (on !== this.blinkOn) { this.blinkOn = on; this.refreshMarkColors(); } }
    this.lastPlan = planFrame(this.passes(), ["frame"]);

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
    const pk = `${this.provider?.contentKey?.() ?? `#${this.frameNo++}`}:${this.lineStyleInUse()}:${this.framePreset.id}:${this.frameScreen.id}`;
    if (pk !== this.poolKey) { this.poolKey = pk; this.perf.time("syncPools", () => this.syncPools()); }
    this.syncPaper(cam3);   // 平涂 / 地面 / 遮蔽（剪纸）：没用到 = 地面藏着、什么都不建
    this.syncMarks(input.marks ? input.marks() : []);   // 标记（选中 / 悬停的面换材质槽；刀 b）：拉完流之后，块 id 才稳定

    // ---- 地面网格 + 三色轴：跟上下文的帧（绘图轴 / 组的轴）与格距走（0.11 ⑤）----
    // 显示不细分（user 2026-10-25「即使开了，grid也不应该在显示层细分」「sub incremental就是sub刻度的」）：吸附的 1/5、1/10 只管吸，像尺子上的小刻度，不画成网格线
    const gfr = input.grid?.frame ?? WORLD_FRAME3, gstep = input.grid?.step ?? 1, gsub = 1;
    const gk = `${gfr.origin.x},${gfr.origin.y},${gfr.origin.z}|${gfr.x.x},${gfr.x.y},${gfr.x.z}|${gfr.y.x},${gfr.y.y},${gfr.y.z}|${gfr.z.x},${gfr.z.y},${gfr.z.z}|${gstep}|${gsub}|${this.framePreset.light.axisColors?.join(",") ?? ""}`;
    if (gk !== this.gridKey) { this.gridKey = gk; this.rebuildGrid(gfr, gstep, gsub); }

    // ---- 叠加层（步 6a 线段族 / 6b 点 标记 三角 文字）：内容归编辑器（view.overlay），量尺归这里（一像素多长 / 视野多远 / 相机三轴；XR 和桌面在 worldPerPx 里分）----
    const octx: OverlayCtx = {
      worldPerPx: (p) => this.worldPerPx(cam, vp, p),
      infLine: (p, dir) => this.infLine(p, dir, cam.target),
      reachKey: () => this.reachKey(cam.target),
      target: cam.target, forward: cam.forward(),
      right: { x: cam3.matrixWorld.elements[0], y: cam3.matrixWorld.elements[1], z: cam3.matrixWorld.elements[2] },
      up: { x: cam3.matrixWorld.elements[4], y: cam3.matrixWorld.elements[5], z: cam3.matrixWorld.elements[6] },
      lineWeightPx: this.lineWeight, dpr: this.renderer.getPixelRatio?.() || 1, style: this.framePreset.id,
      pixelCss: styled ? this.styledK() / this.dpr : 1 / this.dpr, blinkOn: this.blinkOn,
      status: { selected: this.markHex("edgeSelected"), scrub: this.markHex("edgeHot"), warn: this.markHex("edgeWarn") },
    };
    const items = input.overlay ? input.overlay(octx) : [];
    this.overlayLines.sync(items.filter((it): it is OverlayLines => it.kind === "lines"), styled && this.lineStyleInUse() === "pixel", styled);   // 像素那条路：细线 = 1 像素 GL 线（和模型的边同一条规矩）
    this.overlayMarks.sync(items.filter((it) => it.kind !== "lines") as Exclude<OverlayItem, OverlayLines>[], this.dpr, styled ? this.styledK() : 1, styled);

    const t0 = performance.now();
    const info3 = this.renderer.info;
    if (!styled) this.renderer.render(this.scene, cam3);
    else { info3.autoReset = false; info3.reset(); try { this.renderStyled(cam3); } finally { info3.autoReset = true; } }
    // ---- 血槽位（步 7）：三个数 + 预算核对。显存 = 块的显卡副本 + 贴图的估算（three 不报字节数）+ 风格的小图 ----
    const info = info3?.render;
    // 显存 = 实际常驻的（常驻表；以前只算当前画风的那几块：切过别的画风后显存比显示的多）
    let bytes = this.residency.bytes();
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
    // 走哪条按画风递交的名单（residentsOf，和常驻表同一个来源）；藏 / 亮归常驻表，这里不开关任何东西（以前各条分支记得藏别人的——早退那条漏了写实的海天地面）
    if (!this.paper || !(this.wanted.has("paperGround") || this.wanted.has("pbrGround"))) return;
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
    if (this.wanted.has("pbrGround") && p.material.pbr && this.pbr && this.envSky && env && sunW) {   // 写实 / 铸铜：地面 / 背景归表面那份（环境图 + 太阳 + 遮蔽）
      const es = this.envSky;
      if (es.ensure(this.renderer, env.recipe, [sunW.x, sunW.z, -sunW.y])) { this.perf.last.envBake = es.lastMs; this.perf.count.envBake = (this.perf.count.envBake ?? 0) + 1; }   // 真烘了才记
      this.pbr.sync(p.material.pbr, p.material.surface, p.material.colorize === "model", env, sunW, L.ao, !!sphere && this.aoBaked !== "", L.ground, cam3, fade);
      return;
    }
    this.paper.sync(p.material.flat ?? { base: PALETTE.face, shadowTint: 0xffffff, contrast: 0, ramp: 1, steps: 1, soft: 0, lightAz: 0, lightEl: 0 },
      L.ao, !!sphere && this.aoBaked !== "", L.ground, L.background ?? PALETTE.background, cam3,
      p.material.tron && L.ground?.grid ? { line: p.material.tron.line, r: sphere?.r ?? 1, fade: this.lastView?.camera.kind === "ortho" ? this.lastTarget : (this.lastView?.camera.eye ?? { x: 0, y: 0, z: 0 }) } : null);   // Tron 地格：场景半径 = 1 格；淡出按到眼（正交按到视野中心）
  }

  /**
   * 风格那条路（Tron 第 1 步：像素描边）：① 模型画进小图（画布设备像素 ÷ k，k = 像素化 × 设备像素比取整，整数倍）——相机用 view offset 让小图恰好盖住
   * 「k × 小图」那么大一块，画布外多出来的那一点裁掉，叠加层和小图逐像素对齐；② 描边（后处理挂点）③ 最近邻放大回画布并写回深度 ④ 叠加层那一层
   * （网格、三轴、选中边、吸附、gizmo、文字、X 光线）按原分辨率画在上面，被写回的深度挡。选中 / 悬停的面是槽里的节点，跟着模型一起像素化。
   */
  /** 小图一格 = 几个设备像素（行数上限：整数倍铺满、不留黑边）。 */
  private styledK(): number { const sc = this.frameScreen, H = this.flatRes.h; return sc.rows ? Math.max(1, Math.floor(H / sc.rows)) : Math.max(1, Math.round(sc.pixelate * this.dpr)); }
  private renderStyled(cam3: any): void {
    const p = this.framePreset, W = this.flatRes.w, H = this.flatRes.h;
    const sc = this.frameScreen, k = this.styledK();
    const ps = (this.pixelScreen ??= new PixelScreen());
    const low = ps.prepare(W, H, k), target = this.renderer.getRenderTarget();
    const bg = this.scene.background, mask = cam3.layers.mask, auto = this.renderer.autoClear;
    const cc = this.renderer.getClearColor(new THREE.Color()), ca = this.renderer.getClearAlpha();
    // 辅助几何缺省跟内容一起进小图（切刀第 2 步）；排在后处理之后的 / 原分辨率的，这一帧有才多画那一遍（画风表开了白名单才有）
    const late = this.overlayLines.has("late") || this.overlayMarks.has("late"), native = this.overlayLines.has("native") || this.overlayMarks.has("native");
    const toLow = (): void => cam3.setViewOffset(W, H, 0, H - ps.h * k, ps.w * k, ps.h * k);
    try {
      // ① 模型 + 辅助几何 + 网格 → 小图：先清成画风背景色的原始 sRGB 数（setRGB 按线性空间存 = 原样写进渲染目标）；
      //    网格 / 轴用 1 像素线版跟内容一起进小图（T101；切刀第 2 步起走这条路的画风全都这样，Tron 用自己的网格色，T57）
      const b = p.light.background ?? PALETTE.background;
      this.scene.background = null;
      this.renderer.setClearColor(this.tmpColor.setRGB(((b >> 16) & 255) / 255, ((b >> 8) & 255) / 255, (b & 255) / 255, THREE.LinearSRGBColorSpace), 1);
      cam3.layers.mask = 1 | (1 << GROUND_LAYER) | (1 << PIXEL_GRID_LAYER) | (1 << AUX_LAYER);
      if (this.gridPix) { this.syncPixelGrid(cam3, ps.h, this.pixelGridColor(p)); this.gridPix.material = p.light.gridStipple ? this.stippleMat(ps.w, ps.h, this.pixelGridColor(p)) : this.gridPixBase; }
      toLow();
      const pxScale = H / this.dpr / ps.h;   // LineSegments2 按画布 CSS 视口算像素：小图里线宽要乘回去（tron-shader.ts 头）——不乘 = 粗线在小图里只有几分之一像素宽、画成断断续续的虚线（user 10-29 iPad 截图：线稿粗细 1.5 的粗线路）
      if (p.material.tron && this.tron) this.tron.sync(p.material.tron, pxScale);
      const lw0 = this.edgeMat.linewidth, lwd0 = this.edgeDimMat.linewidth, pa0 = this.profileAdd.value;
      this.edgeMat.linewidth = lw0 * pxScale; this.edgeDimMat.linewidth = lwd0 * pxScale; this.profileAdd.value = pa0 * pxScale;
      this.overlayLines.scaleMain(pxScale);   // 主分辨率的粗线在小图里按小图像素
      const restoreLines = (): void => { this.edgeMat.linewidth = lw0; this.edgeDimMat.linewidth = lwd0; this.profileAdd.value = pa0; this.overlayLines.scaleMain(1); };
      try {
      this.renderer.setRenderTarget(low); this.renderer.render(this.scene, cam3);
      if (p.post.bloom) {
        // 辉光那遍：同一个场景再画一遍进半精度的辉光图（面只出轮廓光、线全色、被挡的边 × 0.4、地格的光）
        const bl = (this.bloom ??= new Bloom()); bl.prepare(ps.w, ps.h);
        this.tron?.setGlowPass(true); this.paper?.setGlowPass(true);
        try { this.renderer.setRenderTarget(bl.glow); this.renderer.render(this.scene, cam3); } finally { this.tron?.setGlowPass(false); this.paper?.setGlowPass(false); }
        if (late) this.renderLayer(cam3, LATE_LAYER, low);   // 排在辉光之后：画进小图（辉光图已经取过样了 = 它们不发光）
        cam3.clearViewOffset();
        // ② 辉光合成（后处理挂点）③ 放大回画布（屏幕一刀：CRT 电视）
        bl.run(this.renderer, low.texture, ps.postTarget, p.post.bloom);
        ps.upscale(this.renderer, target, "post", sc.look, native);
      } else {
        cam3.clearViewOffset();
        // ② 描边（后处理挂点；把小图的深度一起写进描边后的那张）③ 放大
        ps.outline(this.renderer, { outline: p.post.pixelOutline, background: b, near: cam3.near, far: cam3.far, ortho: !!cam3.isOrthographicCamera, bgInTex: true, dither: p.post.dither ?? null });
        if (late) { toLow(); this.renderLayer(cam3, LATE_LAYER, ps.postTarget); cam3.clearViewOffset(); }   // 排在描边之后：同一张小图、同一块深度
        ps.upscale(this.renderer, target, "post", sc.look, native);
      }
      } finally { restoreLines(); }
      // ④ 原分辨率那层（混合分辨率这项功能；缺省没人用 = 这一遍不画）：放大那遍把小图的深度写回了画布，照样被模型挡
      if (native) this.renderLayer(cam3, NATIVE_LAYER, target);
    } finally {
      this.scene.background = bg; cam3.layers.mask = mask; this.renderer.autoClear = auto; this.renderer.setClearColor(cc, ca);
      if (cam3.view?.enabled) cam3.clearViewOffset();
    }
  }
  /** 只画一层、不清屏、画进 target（风格那条路里排在后处理之后 / 原分辨率那两遍）。 */
  private renderLayer(cam3: any, layer: number, target: any): void {
    const auto = this.renderer.autoClear;
    this.renderer.autoClear = false; cam3.layers.mask = 1 << layer;
    try { this.renderer.setRenderTarget(target); this.renderer.render(this.scene, cam3); } finally { this.renderer.autoClear = auto; }
  }
  /** 风格那条路里网格线的颜色（原始 sRGB）：画风写了就用；没写 = 背景 × 网格系数（和以前的 1 像素网格同一个算法：背景的 sRGB 数 × 系数的线性值）。 */
  private pixelGridColor(p: Preset): number {
    if (p.light.gridColor !== undefined) return p.light.gridColor;
    const bgc = p.light.background ?? PALETTE.background, m = hexToLinear(PALETTE.gridMajor);
    const ch = (sh: number, f: number): number => Math.min(255, Math.round(((bgc >> sh) & 255) * f));
    return (ch(16, m[0]) << 16) | (ch(8, m[1]) << 8) | ch(0, m[2]);
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
  /** 这一帧的 pass 声明：白模 = 膜 + 边直接画进 frame；风格 = 场景画进小图 → 后处理 → 放大（minccino/preset presetPasses）。地面网格 / 叠加层 / X 光往 frame 上追加画。开关 = 在不在表里。
   *  XR 会话里先只走白模（风格的小图 / 放大还没接两只眼——视图菜单那行的提示写着）。 */
  private passes(): PassDecl[] { return presetPasses(this.currentPreset(), this.currentScreen()); }
  /** 这一帧该用的预设：XR 会话里 / 截缩略图时 = 白模。 */
  private currentPreset(): Preset { return this.renderer.xr.isPresenting || this.capturing ? PRESETS.white : this.preset; }
  private currentScreen(): ScreenPreset { return this.renderer.xr.isPresenting || this.capturing ? SCREENS.native : SCREENS[this.screen ?? this.preset.screen]; }
  setScreen(id: ScreenId | null): void { if (this.screen !== id) { this.screen = id; this.poolKey = ""; } }
  getScreen(): ScreenId | null { return this.screen; }
  private accent: MarkAccent | null = null;
  setAccent(a: MarkAccent | null): void { if (this.accent !== a) { this.accent = a; this.poolKey = ""; } }   // 重跑标记（颜色在材质 / 拷贝里）
  getAccent(): MarkAccent | null { return this.accent; }
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
  /** 实际画的线：像素化的风格（像素描边等）锁成原生 1 像素线——光栅器自己的 Bresenham = 像素准确；粗线是三角形拼的，放大后台阶不匀（user 10-29「调成1px就lineart perfect了……像素的时候锁1px加这么一条风格覆盖」）。Tron 例外：它自己的发光粗线。 */
  lineStyleInUse(): LineStyle { const p = this.framePreset; return isStyled(p, this.frameScreen) && !p.material.tron ? "pixel" : this.lineStyle; }
  /** 线稿粗细（设备像素）：1 = 原生线；> 1 = 粗线 + SU 轮廓线。 */
  setLineWeight(w: number): void { this.lineWeight = w; this.setLineStyle(w > 1 ? "thick" : "pixel"); }
  getLineWeight(): number { return this.lineWeight; }

  /** 探针：这一帧不在主分辨率画的 / 排在后处理之后的辅助几何 id（缺省都空：画风表开了白名单才有）。 */
  nativeIds(): string[] { return [...this.overlayLines.idsIn("native"), ...this.overlayMarks.idsIn("native")]; }
  lateIds(): string[] { return [...this.overlayLines.idsIn("late"), ...this.overlayMarks.idsIn("late")]; }
  overlayVisible(id: string): boolean { return this.overlayLines.isVisible(id) || this.overlayMarks.isVisible(id); }
  /** 引擎这边的入口：流提供者（编辑器那边的 EditorStreamProvider；骨架稿 v2 不变量 2：引擎拉、提供者吐）。 */
  setProvider(p: StreamProvider): void { this.provider = p; this.poolKey = ""; }
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
      const pb = byPool.get(pl.pool), front = pl.tier === 1;   // 深度优先级档：共面时赢的那一层（面 DEPTH.face，别的 DEPTH.faceOther）
      // 面：活动池 DEPTH.face、别的池 DEPTH.faceOther（#25 重叠时活动池 / loose 几何赢）
      const paper = this.framePreset.material.shade === "flat" ? this.paper : null;   // 平涂（剪纸）：纸的那组材质，深度偏移档照旧
      const tron = this.framePreset.material.shade === "tron" ? this.tron : null;      // CRT Tron：深色面 + 青线；选中面认领成橙色
      const fside = pl.singleSided ? "front" : "double";
      const pbr = this.framePreset.material.shade === "pbr" ? this.pbr : null;          // 铸铜：有光照的表面，不借模型颜色
      n.plain.material = paper ? paper.face(fside, front, false) : tron ? tron.face(fside, front, false) : pbr ? pbr.face(fside, front, false, false, null, this.framePreset.material.surface) : pl.singleSided ? (front ? this.faceMatFront : this.faceMatOtherFront) : (front ? this.faceMat : this.faceMatOther);
      const plain = pb?.plain ?? null, showPlain = !!plain && plain.count > 0;
      n.plain.geometry = showPlain ? plain!.geo : this.emptyGeo; n.plain.visible = showPlain;
      n.plainSrc = n.plain.geometry; n.plainMat = n.plain.material; n.plainChunk = plain?.id ?? null; n.markKey = "\u0000";   // 标记下一帧按新的源几何重分段
      let ti = 0;
      for (const gf of pb?.tex ?? []) {
        if (!(gf.count > 0)) continue;
        let slot = n.tex[ti];
        if (!slot) { const mesh = new THREE.Mesh(this.emptyGeo, this.texMatFor(gf.mat!, gf.side!)); mesh.frustumCulled = false; n.root.add(mesh); slot = { mesh, src: null, mat: null, chunk: null }; n.tex.push(slot); }
        slot.mesh.material = paper ? paper.face(gf.side!, true, true) : tron ? tron.face(gf.side!, true, true) : pbr ? pbr.face(gf.side!, true, true, false, this.framePreset.material.colorize === "model" ? this.texUniform(gf.mat!) : null, this.framePreset.material.surface) : this.texMatFor(gf.mat!, gf.side!);   // 写实：贴图进底色   // 一件一色印不出贴图：贴图面 = 纸本色；Tron 不借模型颜色
        slot.mesh.geometry = gf.geo; slot.mesh.visible = true;
        slot.src = slot.mesh.geometry; slot.mat = slot.mesh.material; slot.chunk = gf.id;
        ti++;
      }
      for (; ti < n.tex.length; ti++) n.tex[ti].mesh.visible = false;
      // 边
      const edgesMode = this.framePreset.material.edges, L = pb?.lines ?? null, hasL = !!L && L.count > 0, showL = hasL && (edgesMode === "all" || front);   // 画不画线（ai-docs/20261029-edge-display-scenarios.md）：线稿线归画风（all / none），正在编辑的那一个（tier 1）的结构线任何画风都画   // 风格的线稿三档：none / all / active（只画正在编辑那一层的，T60）；X 光的线照画
      const thickLines = this.lineStyleInUse() === "thick";
      if (thickLines) { n.thick.geometry = hasL ? L!.geo : this.emptyLineGeo; n.thick.visible = showL; n.pixel.visible = false; }
      else { n.pixel.geometry = hasL ? L!.geo : this.emptyGeo; n.pixel.visible = showL; n.thick.visible = false; }
      n.thick.material = tron ? tron.lineThick : this.edgeMat; n.pixel.material = tron ? tron.linePixel : this.pixelMat;
      n.thickMat = n.thick.material; n.pixelMat = n.pixel.material; n.linesChunk = L?.id ?? null;   // 线的标记（淡出）按它换材质
      // 被挡住的边（edgeHidden 标记，刀 d）：同一份线几何再画一遍、深度大于才画；显不显示由标记定（syncMarks），这里只备好几何 / 材质
      n.xthick.material = tron ? tron.hiddenThick : this.hiddenThickMat; n.xpixel.material = tron ? tron.hiddenPixel : this.hiddenPixelMat;
      n.xthick.geometry = n.thick.geometry; n.xpixel.geometry = n.pixel.geometry;
      n.linesVisible = showL; n.thickLines = thickLines; n.xthick.visible = false; n.xpixel.visible = false; n.pixelSrc = n.pixel.geometry; n.markKey = "\u0000";
    }
    // 没了的槽：节点摘掉（几何是共享引用，不在这里释放）
    for (const [key, n] of this.slotNodes) if (n.gen !== this.syncGen) { this.dropThickOwn(n); this.scene.remove(n.root); this.slotNodes.delete(key); }
    // 块的显卡副本：两代没人用的释放
    for (const [id, g] of this.chunkGpus) if (g.gen < this.syncGen - 1) { g.geo.dispose(); this.chunkGpus.delete(id); }
  }
  // ---- 标记（契约 v2 第 ② 批，刀 b；user 10-29「我想的是画原色但是踢掉选中的，然后画选中的」「index赞！」）----
  // 有标记的网格换成「共享源几何的属性 + 自己的索引」：索引把顶点分成几段——普通的在前、每个材质槽的标记段接在后面 → 永远几个 draw call，
  // 不管选区多碎；不重叠、不画两遍。标记变了只重写这个槽的索引（O(池的顶点数)），顶点属性一个字节不动。没标记的网格还是直接用源几何。
  private syncMarks(marks: readonly Mark[]): void {
    const bySlot = new Map<string, Mark[]>();
    for (const m of marks) { let l = bySlot.get(m.slot); if (!l) { l = []; bySlot.set(m.slot, l); } l.push(m); }
    for (const [slot, n] of this.slotNodes) {
      const ms = bySlot.get(slot) ?? [];
      const key = ms.length ? ms.map((m) => `${m.chunk}:${m.start}+${m.count}=${m.material}`).sort().join("|") : "";
      if (n.markKey === key) continue;
      n.markKey = key;
      this.applyMarks(n.plain, n.plainSrc, n.plainMat, n.plainChunk, ms, n.marked);
      for (const t of n.tex) if (t.mesh.visible) this.applyMarks(t.mesh, t.src, t.mat, t.chunk, ms, n.marked);
      // 线：淡出 = 底材质整块换（edgeDim）；选中 / 悬停 / 检查 = 按段换材质（不走叠加层，点线面同一个标准）；隐线（X 光）= 同一份几何再画一遍、深度大于才画
      const L = n.linesChunk, onL = (m: Mark): boolean => m.chunk === L;
      const dim = !!L && ms.some((m) => onL(m) && m.material === "edgeDim");
      const hidden = !!L && ms.some((m) => onL(m) && m.material === "edgeHidden");
      const sel = L ? ms.filter((m) => onL(m) && Renderer3.EDGE_SLOTS.includes(m.material as LineSlot)) : [];
      const baseThick = dim ? this.lineSlotMaterial(n.thickMat, "edgeDim") : n.thickMat, basePixel = dim ? this.lineSlotMaterial(n.pixelMat, "edgeDim") : n.pixelMat;
      if (n.thickLines) {
        n.thick.material = baseThick;
        n.xthick.visible = hidden && n.linesVisible; n.xpixel.visible = false;
        this.syncThickMarks(n, sel, hidden);
      } else {
        this.applyPixelLineMarks(n, basePixel, sel, hidden);
      }
    }
  }
  private static readonly EDGE_SLOTS: readonly LineSlot[] = ["edgeSelected", "edgeHot", "edgeWarn"];
  /** 标记色：这一帧画风写了就用（预设 material.marks），没写 = 全局色板。 */
  /** 画风专属东西的常驻表（residency.ts）：每帧画风递交「要哪几样」，表去对账（要的亮、不要的藏、久没要的放显存）。 */
  private readonly residency = new Residency();
  private wanted: Set<ResidentId> = new Set();
  /** 这一帧标记闪在亮的那一拍吗（画风没写闪 = 永远亮）。 */
  private blinkOn = true;
  private markHex(slot: "faceSelected" | "faceHover" | "faceDim" | LineSlot): number {
    const bl = this.framePreset.material.blink;
    if (bl && !this.blinkOn && (slot === "edgeSelected" || slot === "edgeHot" || slot === "edgeWarn")) return bl.off;   // 闪的暗拍：选中 / 将删 / 检查的边换成 off 色（面先不闪，user 10-29「面可以先不闪」）
    const a = this.accent;
    if (a !== null && !this.framePreset.material.ownMarks) {   // 视口设置「选中色」：选中 = 它、面 = 它往白调淡（悬停再淡一档）；撞色的将删 / 检查换成它带的那份
      const mix = (f: number): number => { const c = (sh: number): number => { const v = (a.selected >> sh) & 255; return Math.round(v + (255 - v) * f); }; return (c(16) << 16) | (c(8) << 8) | c(0); };
      if (slot === "edgeSelected") return a.selected; if (slot === "faceSelected") return mix(0.55); if (slot === "faceHover") return mix(0.75);
      if (slot === "edgeHot" && a.scrub !== undefined) return a.scrub; if (slot === "edgeWarn" && a.warn !== undefined) return a.warn;
    }
    const m = this.framePreset.material.marks as Partial<Record<string, number>> | undefined;
    return m?.[slot] ?? (slot === "edgeHot" ? PALETTE.edgeHot : slot === "edgeWarn" ? PALETTE.edgeWarn : slot === "faceSelected" ? PALETTE.faceSelected : slot === "faceHover" ? PALETTE.faceHover : slot === "faceDim" ? PALETTE.faceDim : PALETTE.edgeSelected);
  }
  private lineMarkMats = new Map<string, any>();
  /** 闪换拍：已经建好的标记材质按这一拍重写颜色（材质很少：每种槽一份；不用重跑分段）。 */
  private refreshMarkColors(): void {
    for (const [key, m] of this.lineMarkMats) { const hex = this.markHex(key.split("|")[0] as LineSlot); m.color.setRGB(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, THREE.LinearSRGBColorSpace); }
    for (const n of this.slotNodes.values()) n.markKey = "\u0000";   // 粗线的标记拷贝颜色烘在几何里：重跑一次（只有走粗线的画风才有）
  }
  /** 原生线的标记材质：可见那份（换成标记色）/ 隐线那份（深度大于才画、半透明）。 */
  private lineMarkMaterial(slot: LineSlot, hidden: boolean): any {
    const key = `${slot}|${hidden ? 1 : 0}`;
    let m = this.lineMarkMats.get(key);
    if (!m) {
      m = hidden ? new THREE.LineBasicMaterial({ transparent: true, opacity: HIDDEN_OPACITY, depthWrite: false, depthFunc: THREE.GreaterDepth }) : new THREE.LineBasicMaterial();
      this.lineMarkMats.set(key, m);
    }
    // 只在风格那条路用（小图按 sRGB 原值存）：颜色按 sRGB 原值写；每次都按这一帧的画风重写（换画风会重跑标记）
    const hex = this.markHex(slot); m.color.setRGB(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, THREE.LinearSRGBColorSpace);
    return m;
  }
  /** 原生（1 像素）线：索引把顶点分成「普通的 / 每个标记槽一段」（同面的踢掉再画）；底线不画的风格（剪纸 / 写实…）只画标记那几段。隐线那份同一套分段。 */
  private applyPixelLineMarks(n: SlotNodes, base: any, sel: readonly Mark[], hidden: boolean): void {
    const src = n.pixelSrc, chunk = n.linesChunk;
    const count: number = !src || src === this.emptyGeo ? 0 : Number.isFinite(src.drawRange.count) ? src.drawRange.count : src.attributes.position.count;
    if (!sel.length || !count || !chunk) {
      n.thickMark.visible = false; n.thickMarkHidden.visible = false;
      n.pixel.geometry = src; n.pixel.material = base; n.pixel.visible = n.linesVisible && count > 0;
      n.xpixel.geometry = src; n.xpixel.visible = hidden && n.linesVisible;
      if (chunk) this.dropMarked(n.marked, chunk);
      return;
    }
    let e = n.marked.get(chunk);
    if (e && (e.src !== src || e.index.count !== count)) { this.dropMarked(n.marked, chunk); e = undefined; }
    if (!e) {
      const geo = new THREE.BufferGeometry();
      for (const name of Object.keys(src.attributes)) geo.setAttribute(name, src.attributes[name]);
      const index = new THREE.BufferAttribute(new Uint32Array(count), 1); index.setUsage(THREE.DynamicDrawUsage);
      geo.setIndex(index); e = { geo, src, index }; n.marked.set(chunk, e);
    }
    const slots = Renderer3.EDGE_SLOTS, taken = new Uint8Array(count);
    for (const m of sel) { const si = slots.indexOf(m.material as LineSlot) + 1, end = Math.min(m.start + m.count, count); for (let i = Math.max(m.start, 0); i < end; i++) taken[i] = si; }
    // 不走小图（白模 / 线稿粗细 1）：标记的边照旧画成粗线（v0.9.2「边默认原生细线，选中 / 悬停仍粗线」——看得清），拷一份进 thickMark；原生线里只剩普通的
    const thickSel = !this.lastPlan?.order.includes("upscale");
    if (thickSel) {
      const pos = src.attributes.position.array as Float32Array, S: number[] = [], C: number[] = [];
      for (const m of sel) { const c = this.tmpColor.setHex(this.markHex(m.material as LineSlot)), end = Math.min(m.start + m.count, count); for (let i = Math.max(m.start, 0); i + 1 < end; i += 2) { for (let q = 0; q < 6; q++) S.push(pos[i * 3 + q]); C.push(c.r, c.g, c.b, c.r, c.g, c.b); } }
      this.setMarkCopy(n, S, C, null, hidden);
    } else { n.thickMark.visible = false; n.thickMarkHidden.visible = false; }
    const idx = e.index.array as Uint32Array, mats: any[] = [], hmats: any[] = [];
    let w = 0;
    e.geo.clearGroups();
    if (n.linesVisible) { for (let i = 0; i < count; i++) if (taken[i] === 0) idx[w++] = i; e.geo.addGroup(0, w, 0); mats.push(base); hmats.push(n.xpixel.material instanceof Array ? n.xpixel.material[0] : n.xpixel.material); }
    if (!thickSel) slots.forEach((sl, k) => {
      const s0 = w;
      for (let i = 0; i < count; i++) if (taken[i] === k + 1) idx[w++] = i;
      if (w > s0) { e!.geo.addGroup(s0, w - s0, mats.length); mats.push(this.lineMarkMaterial(sl, false)); hmats.push(this.lineMarkMaterial(sl, true)); }
    });
    e.index.needsUpdate = true; e.geo.setDrawRange(0, w);
    n.pixel.geometry = e.geo; n.pixel.material = mats; n.pixel.visible = mats.length > 0;
    n.xpixel.geometry = e.geo; n.xpixel.material = hmats; n.xpixel.visible = hidden && hmats.length > 0;
  }
  /** 粗线（实例化）：被标记的那几条拷一份（位置 / 两侧面 / 轮廓旗照抄，颜色换成标记色），用边线材质画；底线换成「旗」自己拷的那份、被标记的旗写 -1（着色器收成零宽）
   *  = 每条线只画一遍（2026-10-29 Opus；Fable 元规则「一遍」：以前底线照画、拷贝靠画序盖上去）。X 光再配一份「深度大于才画」的，隐线那份底线同样踢掉被标记的。 */
  private syncThickMarks(n: SlotNodes, sel: readonly Mark[], hidden: boolean): void {
    const gl = n.linesChunk ? (this.chunkGpus.get(n.linesChunk) as GpuLines | undefined) : undefined;
    if (!sel.length || !gl || !gl.instanced) {
      n.thickMark.visible = false; n.thickMarkHidden.visible = false;
      if (n.thickOwn) { if (gl) { n.thick.geometry = gl.geo; n.xthick.geometry = gl.geo; } this.dropThickOwn(n); }
      return;
    }
    const seg = gl.bufs.first.array as Float32Array, w1 = gl.bufs.w1.array as Float32Array, w2 = gl.bufs.w2.array as Float32Array, flag = gl.bufs.flag.array as Float32Array;
    const S: number[] = [], C: number[] = [], W1: number[] = [], W2: number[] = [], F: number[] = [];
    for (const m of sel) {
      const c = this.tmpColor.setHex(this.markHex(m.material as LineSlot)), end = Math.min(m.start + m.count, gl.count);
      for (let i = Math.max(m.start, 0); i < end; i++) {
        for (let q = 0; q < 6; q++) S.push(seg[i * 6 + q]);
        C.push(c.r, c.g, c.b, c.r, c.g, c.b);
        for (let q = 0; q < 3; q++) { W1.push(w1[i * 3 + q]); W2.push(w2[i * 3 + q]); }
        F.push(flag[i]);
      }
    }
    this.setMarkCopy(n, S, C, { W1, W2, F }, hidden);
    // 底线：被标记的那几条踢掉
    let own = n.thickOwn;
    if (own && (own.src !== gl.geo || own.flag.count < gl.count)) { this.dropThickOwn(n); own = null; }
    if (!own) {
      const geo = new LineSegmentsGeometry(), cap = (gl.bufs.flag.array as Float32Array).length;
      for (const name of ["instanceStart", "instanceEnd", "instanceColorStart", "instanceColorEnd", "instanceW1", "instanceW2"]) geo.setAttribute(name, gl.geo.attributes[name]);
      const fa = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1); fa.setUsage(THREE.DynamicDrawUsage); geo.setAttribute("instanceFlag", fa);
      own = { geo, flag: fa, src: gl.geo }; n.thickOwn = own;
    }
    const f = own.flag.array as Float32Array;
    f.set(flag.subarray(0, gl.count));
    for (const m of sel) { const end = Math.min(m.start + m.count, gl.count); for (let i = Math.max(m.start, 0); i < end; i++) f[i] = -1; }
    own.flag.needsUpdate = true; own.geo.instanceCount = gl.count;
    n.thick.geometry = own.geo; n.xthick.geometry = own.geo;
  }
  /** 放掉槽自己那份粗线底线（共享的属性先摘下来，不跟着释放；只放掉自己的旗和底板四边形）。 */
  private dropThickOwn(n: SlotNodes): void {
    const own = n.thickOwn; if (!own) return;
    for (const name of ["instanceStart", "instanceEnd", "instanceColorStart", "instanceColorEnd", "instanceW1", "instanceW2"]) own.geo.deleteAttribute(name);
    own.geo.dispose(); n.thickOwn = null;
  }
  /** 被标记的边的粗线拷贝（边线材质、颜色 = 标记色）；轮廓旗没有（原生线来的）= 按内边画。 */
  private setMarkCopy(n: SlotNodes, S: number[], C: number[], prof: { W1: number[]; W2: number[]; F: number[] } | null, hidden: boolean): void {
    if (!S.length) { n.thickMark.visible = false; n.thickMarkHidden.visible = false; return; }
    const geo = new LineSegmentsGeometry(), m = S.length / 6;
    geo.setPositions(S); geo.setColors(C);
    const arr = (a: number[] | undefined, n: number): Float32Array => (a ? new Float32Array(a) : new Float32Array(n));
    geo.setAttribute("instanceW1", new THREE.InstancedBufferAttribute(arr(prof?.W1, m * 3), 3)); geo.setAttribute("instanceW2", new THREE.InstancedBufferAttribute(arr(prof?.W2, m * 3), 3)); geo.setAttribute("instanceFlag", new THREE.InstancedBufferAttribute(arr(prof?.F, m), 1));
    const old = n.thickMark.geometry; n.thickMark.geometry = geo; n.thickMarkHidden.geometry = geo; if (old !== this.emptyLineGeo) old.dispose();
    n.thickMark.visible = true; n.thickMarkHidden.visible = hidden;
  }
  /** 线的材质槽（刀 c：只有 edgeDim）：白模的边 → 淡出那份；别的风格（Tron）的线材质自己不认淡出 = 照旧。 */
  private lineSlotMaterial(base: any, slot: LineSlot): any {
    if (slot === "edgeDim") { if (base === this.edgeMat) return this.edgeDimMat; if (base === this.pixelMat) return this.pixelDimMat; }
    return base;
  }
  private static readonly MARK_SLOTS: readonly FaceSlot[] = ["faceSelected", "faceHover"];   // 分段的槽；faceDim 是整块的（底材质换掉）
  private applyMarks(mesh: any, src: any, mat: any, chunk: string | null, ms: readonly Mark[], cache: Map<string, MarkedGeo>): void {
    const all = chunk ? ms.filter((m) => m.chunk === chunk) : [];
    const count: number = !src || src === this.emptyGeo ? 0 : Number.isFinite(src.drawRange.count) ? src.drawRange.count : src.attributes.position.count;
    // 整块的标记（淡出 faceDim）= 底材质换掉，不分段；分段只管选中 / 悬停
    const full = all.find((m) => m.material === "faceDim" && m.start <= 0 && m.start + m.count >= count);
    if (full) mat = this.markMaterial(mat, "faceDim");
    const mine = all.filter((m) => m.material !== "faceDim" && m.material !== "edgeDim");
    if (!mine.length || !count) { mesh.geometry = src ?? this.emptyGeo; mesh.material = mat; if (chunk) this.dropMarked(cache, chunk); return; }
    let e = cache.get(chunk!);
    if (e && (e.src !== src || e.index.count !== count)) { this.dropMarked(cache, chunk!); e = undefined; }
    if (!e) {
      const geo = new THREE.BufferGeometry();
      for (const name of Object.keys(src.attributes)) geo.setAttribute(name, src.attributes[name]);   // 属性共享，不拷
      const index = new THREE.BufferAttribute(new Uint32Array(count), 1); index.setUsage(THREE.DynamicDrawUsage);
      geo.setIndex(index);
      e = { geo, src, index }; cache.set(chunk!, e);
    }
    const slots = Renderer3.MARK_SLOTS, taken = new Uint8Array(count);   // 0 = 普通；k + 1 = 第 k 个材质槽
    for (const m of mine) { const si = slots.indexOf(m.material as FaceSlot) + 1; if (!si) continue; const end = Math.min(m.start + m.count, count); for (let i = Math.max(m.start, 0); i < end; i++) taken[i] = si; }
    const idx = e.index.array as Uint32Array;
    let w = 0;
    for (let i = 0; i < count; i++) if (taken[i] === 0) idx[w++] = i;
    e.geo.clearGroups(); e.geo.addGroup(0, w, 0);
    const mats: any[] = [mat];
    slots.forEach((sl, k) => {
      const s0 = w;
      for (let i = 0; i < count; i++) if (taken[i] === k + 1) idx[w++] = i;
      if (w > s0) { e!.geo.addGroup(s0, w - s0, mats.length); mats.push(this.markMaterial(mat, sl as FaceSlot)); }
    });
    e.index.needsUpdate = true;
    e.geo.setDrawRange(0, w);
    mesh.geometry = e.geo; mesh.material = mats;
  }
  private dropMarked(cache: Map<string, MarkedGeo>, chunk: string): void {
    const e = cache.get(chunk); if (!e) return;
    for (const name of Object.keys(e.geo.attributes)) e.geo.deleteAttribute(name);   // 属性是源几何的，不跟着释放；只放掉自己的索引
    e.geo.dispose(); cache.delete(chunk);
  }
  private markMats = new Map<any, Map<FaceSlot, any>>();
  /** 标记的材质 = 这个槽的面材质 + SEL / DIM 变体（同一套 shader / uniforms / 深度偏移；每个风格的 shader 自己说变体长什么样：白模 = 换成状态色 / 往淡出色拉一半、写实 = 叠色、Tron = Clu 橙 + 辉光）。uMark = 调色板里那个槽位的颜色。 */
  private markMaterial(plain: any, slot: FaceSlot): any {
    let by = this.markMats.get(plain); if (!by) { by = new Map(); this.markMats.set(plain, by); }
    const hex = this.markHex(slot);
    let m = by.get(slot);
    if (m) { m.uniforms.uMark.value.set(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255); return m; }   // 同一份底材质（白模 / 像素描边共用）换画风 = 换标记色
    m = new THREE.ShaderMaterial({
      glslVersion: plain.glslVersion, vertexShader: plain.vertexShader, fragmentShader: plain.fragmentShader, defines: { ...plain.defines, [slot === "faceDim" ? "DIM" : "SEL"]: 1 },
      uniforms: { ...plain.uniforms, uMark: { value: new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255) } },
      side: plain.side, transparent: plain.transparent, depthTest: plain.depthTest, depthWrite: plain.depthWrite, blending: plain.blending,
      polygonOffset: plain.polygonOffset, polygonOffsetFactor: plain.polygonOffsetFactor, polygonOffsetUnits: plain.polygonOffsetUnits,
    });
    by.set(slot, m); return m;
  }
  private makeSlotNodes(): SlotNodes {
    const root = new THREE.Group();
    root.matrixAutoUpdate = false;
    const plain = new THREE.Mesh(this.emptyGeo, this.faceMat); plain.frustumCulled = false; plain.visible = false;
    const pixel = new THREE.LineSegments(this.emptyGeo, this.pixelMat); pixel.frustumCulled = false; pixel.visible = false;
    const thick = new LineSegments2(this.emptyLineGeo, this.edgeMat); thick.frustumCulled = false; thick.visible = false;
    const xpixel = new THREE.LineSegments(this.emptyGeo, this.hiddenPixelMat); xpixel.frustumCulled = false; xpixel.visible = false; xpixel.renderOrder = 3;
    const xthick = new LineSegments2(this.emptyLineGeo, this.hiddenThickMat); xthick.frustumCulled = false; xthick.visible = false; xthick.renderOrder = 3;
    // 粗线被标记（选中 / 悬停 / 检查）那几条的拷贝：同一种边线材质、颜色换成标记色，画在底线之后 = 同深度后画的赢（实例化的线没法按索引分段，拷几条比整块重排便宜）
    const thickMark = new LineSegments2(new LineSegmentsGeometry(), this.edgeMat); thickMark.frustumCulled = false; thickMark.visible = false; thickMark.renderOrder = 1;
    const thickMarkHidden = new LineSegments2(thickMark.geometry, this.hiddenThickMat); thickMarkHidden.frustumCulled = false; thickMarkHidden.visible = false; thickMarkHidden.renderOrder = 3;
    root.add(plain); root.add(pixel); root.add(thick); root.add(xpixel); root.add(xthick); root.add(thickMark); root.add(thickMarkHidden);
    this.scene.add(root);
    return { root, plain, plainSrc: this.emptyGeo, plainMat: this.faceMat, plainChunk: null, tex: [], pixel, thick, thickMat: this.edgeMat, pixelMat: this.pixelMat, linesChunk: null, pixelSrc: this.emptyGeo, thickMark, thickMarkHidden, linesVisible: false, thickLines: false, xpixel, xthick, gen: 0, markKey: "\u0000", marked: new Map() };
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
      if (gf) gf.geo.dispose();
      // 法线 / 面颜色是归一化整数（pool-mesh 的 i16n / i8n）：显卡读成 −1…1 的浮点
      const at: Record<string, any> = {};
      for (const name of Object.keys(A)) { const x = new THREE.BufferAttribute(A[name].array, A[name].size, !!A[name].normalized); x.setUsage(THREE.DynamicDrawUsage); at[name] = x; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", at.position); geo.setAttribute("normal", at.normal); geo.setAttribute("aColor", at.aColor);
      if (at.aUv) geo.setAttribute("aUv", at.aUv); else geo.setAttribute("aColorB", at.aColorB);
      gf = { id: ch.id, version: ch.version, mat: ch.material ?? null, side: ch.side ?? null, attrs: at, geo, count: ch.count, gen: this.syncGen };
      this.chunkGpus.set(ch.id, gf);
    } else { for (const a of Object.values(gf.attrs)) pushRanges(a, a.itemSize, ch.dirty.ranges); gf.version = ch.version; gf.count = ch.count; gf.gen = this.syncGen; }
    gf.geo.setDrawRange(0, ch.count);
    return gf;
  }
  /** 一块线 → 显卡：粗线 = LineSegments2 的实例缓冲（seg / col / w1 / w2 / flag），像素线 = 普通顶点缓冲。 */
  private uploadLines(ch: Chunk): GpuLines {
    let gl = this.chunkGpus.get(ch.id) as GpuLines | undefined;
    const A = ch.attributes, instanced = !!ch.instanced;
    if (gl && gl.version === ch.version) { gl.gen = this.syncGen; return gl; }
    if (!gl || ch.dirty.grown || gl.instanced !== instanced || gl.bufs.first.array !== A[instanced ? "seg" : "position"].array) {
      if (gl) gl.geo.dispose();
      if (instanced) {
        const ib = (name: string, stride: number): any => { const b = new THREE.InstancedInterleavedBuffer(A[name].array, stride, 1); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const ia = (name: string, size: number): any => { const b = new THREE.InstancedBufferAttribute(A[name].array, size); b.setUsage(THREE.DynamicDrawUsage); return b; };
        const bufs: Record<string, any> = { first: ib("seg", 6), col: ib("col", 6), w1: ia("w1", 3), w2: ia("w2", 3), flag: ia("flag", 1) };
        const geo = new LineSegmentsGeometry();
        geo.setAttribute("instanceStart", new THREE.InterleavedBufferAttribute(bufs.first, 3, 0)); geo.setAttribute("instanceEnd", new THREE.InterleavedBufferAttribute(bufs.first, 3, 3));
        geo.setAttribute("instanceColorStart", new THREE.InterleavedBufferAttribute(bufs.col, 3, 0)); geo.setAttribute("instanceColorEnd", new THREE.InterleavedBufferAttribute(bufs.col, 3, 3));
        geo.setAttribute("instanceW1", bufs.w1); geo.setAttribute("instanceW2", bufs.w2); geo.setAttribute("instanceFlag", bufs.flag);
        gl = { id: ch.id, version: ch.version, instanced, bufs, geo, count: ch.count, gen: this.syncGen };
      } else {
        const attr = (name: string): any => { const x = new THREE.BufferAttribute(A[name].array, 3); x.setUsage(THREE.DynamicDrawUsage); return x; };
        const bufs: Record<string, any> = { first: attr("position"), color: attr("color") };
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", bufs.first); geo.setAttribute("color", bufs.color);
        gl = { id: ch.id, version: ch.version, instanced, bufs, geo, count: ch.count, gen: this.syncGen };
      }
      this.chunkGpus.set(ch.id, gl);
    } else { for (const b of Object.values(gl.bufs)) pushRanges(b, b.stride ?? b.itemSize, ch.dirty.ranges); gl.version = ch.version; gl.count = ch.count; gl.gen = this.syncGen; }
    if (instanced) gl.geo.instanceCount = ch.count; else gl.geo.setDrawRange(0, ch.count);
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
        depthFunc: THREE.LessDepth, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: DEPTH.grid,   // 深度阶梯（DEPTH 注释）：面后、边前，不 z-fight（user「加一个 z-offset 的事情」）
      });
      this.gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * L), this.gridMat);
      this.gridMesh.frustumCulled = false; this.gridMesh.renderOrder = -1; this.gridMesh.matrixAutoUpdate = false; this.gridMesh.layers.set(GRID_LAYER);
      this.scene.add(this.gridMesh);
      const axesMat = this.lineMat(STATIC_PX, { vertexColors: true });   // 不前拉：轴在边后面（DEPTH 注释）
      axesMat.depthFunc = THREE.LessDepth; axesMat.polygonOffset = true; axesMat.polygonOffsetFactor = 0; axesMat.polygonOffsetUnits = DEPTH.grid;
      this.axesObj = new LineSegments2(new LineSegmentsGeometry(), axesMat);
      this.axesObj.frustumCulled = false; this.axesObj.layers.set(GRID_LAYER);
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
    const ax = this.framePreset.light.axisColors ?? [PALETTE.axisX, PALETTE.axisY, PALETTE.axisZ];   // 画风可以换（Tron = 三根都是主色调）
    seg(-L, L, (t) => at(t, 0, 0), ax[0]);
    seg(-L, L, (t) => at(0, t, 0), ax[1]);
    seg(0, L, (t) => at(0, 0, t), ax[2]);
    setLineGeometry(this.axesObj, apos, acol);
    // 原生 1 像素线版（像素化的风格用）：三色轴在这里建；网格跟相机走、每帧按需重建（syncPixelGrid）。都不写深度（写了会被像素描边当成物体描一圈）
    if (!this.gridPix) {
      this.gridPixBase = new THREE.LineBasicMaterial({ color: 0xffffff, depthWrite: false, depthFunc: THREE.LessEqualDepth });
      this.gridPix = new THREE.LineSegments(new THREE.BufferGeometry(), this.gridPixBase);   // 实色、不混合（user「半透明对移动设备不友好」）
      this.axesPix = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, depthWrite: false, depthFunc: THREE.LessEqualDepth }));
      for (const o of [this.gridPix, this.axesPix]) { o.frustumCulled = false; o.layers.set(PIXEL_GRID_LAYER); this.scene.add(o); }
      this.gridPix.renderOrder = -1;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(apos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(acol.map(linToSrgb), 3));   // 只画进小图：sRGB 原值（小图的约定，overlay-lines.ts linToSrgb）
    this.axesPix.geometry.dispose(); this.axesPix.geometry = g;
    this.gridFrame = frame; this.gridStep = step > 1e-6 ? step : 1; this.gridPixKey = "";
  }
  private gridFrame: Frame3 = WORLD_FRAME3; private gridStep = 1; private gridPixKey = "";
  /**
   * 像素化风格的网格（T101 / user 10-29「地平线不应该是变深，而且半透明对移动设备不友好吧」）：原生 1 像素实色线，**只画屏幕上格距 ≥ PIXEL_GRID_MIN_PX 个小图像素的那一圈**——
   * 透视：离眼睛 D 远处横向格距 ≈ 格距 × 焦距 ÷ D、纵深格距 ≈ 格距 × 焦距 × 眼高 ÷ D²（焦距 = 小图高 ÷ 2 tan(fov/2)），取 D ≤ D_max 的那一圈（地面上以眼睛脚下为圆心）；格距太细一圈都没有就换粗一档（× 10）。正交：格距按像素算、不够就换粗。
   * 远处不画 = 地平线不再被挤成一条深色带；颜色 = 画风的网格色（没写 = 背景 × 网格系数；原始 sRGB 数，不混合）。圈 / 格距变了才重建（键）。
   */
  private syncPixelGrid(cam3: any, lowH: number, color: number): void {
    if (!this.gridPix) return;
    const f = this.gridFrame, o = f.origin, X = f.x, Y = f.y, Z = f.z, eye = cam3.getWorldPosition(new THREE.Vector3());
    const dx = eye.x - o.x, dy = eye.y - o.y, dz = eye.z - o.z, u0 = dx * X.x + dy * X.y + dz * X.z, v0 = dx * Y.x + dy * Y.y + dz * Y.z, h = Math.abs(dx * Z.x + dy * Z.y + dz * Z.z);
    let st = this.gridStep, r = 0;
    const L = GRID_N * GRID_STEP;
    if (cam3.isOrthographicCamera) {
      const halfH = (cam3.top - cam3.bottom) / (2 * (cam3.zoom || 1)), pxPerM = lowH / (2 * halfH);
      for (let k = 0; k < 4 && st * pxPerM < PIXEL_GRID_MIN_PX; k++) st *= 10;
      r = st * pxPerM >= PIXEL_GRID_MIN_PX ? halfH * 3 : 0;
    } else {
      const t = Math.tan(((cam3.fov ?? 50) * Math.PI) / 360);
      // 贴地斜看：纵深方向的格距还要再乘「眼高 ÷ 距离」（透视压缩）≈ 格距 × 焦距 × 眼高 ÷ 距离² —— 比横向的「格距 × 焦距 ÷ 距离」严，取两者里近的那个
      const fpx = lowH / (2 * t);
      for (let k = 0; k < 4; k++) { const dmax = Math.min((st * fpx) / PIXEL_GRID_MIN_PX, Math.sqrt((st * fpx * Math.max(h, 1e-3)) / PIXEL_GRID_MIN_PX)); if (dmax > h * 1.02) { r = Math.sqrt(dmax * dmax - h * h); break; } st *= 10; }
    }
    r = Math.min(r, L);
    const key = `${st}|${Math.round(u0 / st)}|${Math.round(v0 / st)}|${Math.round(r / st)}|${color}`;
    if (key === this.gridPixKey) return;
    this.gridPixKey = key;
    this.gridPixBase.color.setRGB(((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255, THREE.LinearSRGBColorSpace);   // 原样写进小图（同背景的原始 sRGB 数）
    const pos: number[] = [], at = (u: number, v: number): void => { pos.push(o.x + X.x * u + Y.x * v, o.y + X.y * u + Y.y * v, o.z + X.z * u + Y.z * v); };
    const SEG = Math.max(AXIS_SEG_M, st);   // 切段（软件光栅里穿过近平面的长线整条被裁掉）
    const line = (fixed: number, from: number, to: number, alongU: boolean): void => { for (let a = from; a < to - 1e-9; a += SEG) { const b2 = Math.min(to, a + SEG); if (alongU) { at(a, fixed); at(b2, fixed); } else { at(fixed, a); at(fixed, b2); } } };
    if (r > 0) for (let i = Math.ceil((u0 - r) / st); i * st <= u0 + r; i++) {
      const u = i * st, half = Math.sqrt(Math.max(0, r * r - (u - u0) * (u - u0)));
      if (Math.abs(u) > 1e-9) line(u, v0 - half, v0 + half, false);
    }
    if (r > 0) for (let j = Math.ceil((v0 - r) / st); j * st <= v0 + r; j++) {
      const v = j * st, half = Math.sqrt(Math.max(0, r * r - (v - v0) * (v - v0)));
      if (Math.abs(v) > 1e-9) line(v, u0 - half, u0 + half, true);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    { const other = new Float32Array(pos.length); for (let i = 0; i + 5 < pos.length; i += 6) { other.set(pos.slice(i + 3, i + 6), i); other.set(pos.slice(i, i + 3), i + 3); } geo.setAttribute("other", new THREE.Float32BufferAttribute(other, 3)); }   // 点线要知道这一段往哪走
    this.gridPix.geometry.dispose(); this.gridPix.geometry = geo;
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
