// minccino/preset/ —— 预设 = 数据（骨架稿 v2 不变量 4：一个全量引擎 + 在四个挂点上拧的一组旋钮；要新挂点 = 改引擎、过 grill）。
// 四个挂点：材质翻译 / 光与环境 / 后处理 / 几何预处理；屏幕一刀单列（不变量 6）。每个预设写明它从 Shader 实验室哪个插件 · 哪个预设来（清单 = ai-docs/20261029-preset-inventory.md）。
// 白模 = 现状、零成本兜底：所有旋钮都是「不动」，走后端原来那一条渲染（截图基线 0 像素差）。
// created 2026-10-29 by Claude Opus 5.5（Tron 纪元第 1 步：像素描边）
import type { PassDecl } from "../graph/frame-graph.ts";
import type { EnvRecipeId, SurfaceRecipeId } from "../paintshop/index.ts";

/** 像素描边后处理（实验室公用件 `ShaderLab.pixelOutline`，lab/core.js）：背景挨着模型的那一格涂成描边色；可选内部深度跳变也描。 */
export interface PixelOutlinePost {
  /** 固定描边色（0xRRGGBB，sRGB）。 */
  readonly color: number;
  /** 描边跟着底色（0 = 固定色、1 = 邻格颜色压暗）。 */
  readonly tint: number;
  /** 跟着底色时：< 1 压暗（0.25 近黑），> 1 往白里提。 */
  readonly shade: number;
  /** 线色取两侧里暗的那一侧（红斗篷压在白裙上不渗色）。 */
  readonly darkSide: boolean;
  /** 内部深度跳变也描（场景铺满、没背景可挨时靠它）。 */
  readonly inner: boolean;
  /** 线宽（小图上的像素）。 */
  readonly width: 1 | 2;
}

/** 平涂明暗（实验室 flat.js 剪纸那几项）：光跟着相机（方位 / 高度，视空间）、色阶数、交界软硬、渐变（1 = 不分阶）、阴影乘的偏色、明暗强度；没上色的面用纸色 base。 */
export interface FlatShade {
  readonly base: number;
  readonly shadowTint: number;
  readonly contrast: number;
  readonly ramp: number;
  /** 色阶数 − 1（实验室 uSteps = max(1, round(bands) − 1)）。 */
  readonly steps: number;
  readonly soft: number;
  readonly lightAz: number;
  readonly lightEl: number;
}
/** CRT Tron 的面和线（实验室 tron.js「青 Tron · 复古」）：正面 / 背面色、明暗强度、轮廓光、线色、线芯发白、线宽（画面像素）、轮廓加粗倍数、被挡住的边的不透明度、认领的选中色。 */
export interface TronShade {
  readonly face: number; readonly back: number; readonly shade: number; readonly rim: number; readonly rimPower: number;
  readonly line: number; readonly core: number; readonly widthPx: number; readonly profile: number; readonly hidden: number; readonly select: number;
}
/** 写实的底子（实验室 material.js「表面」）：底色（材料本色；照模型上色时只给没上色的面）、金属、粗糙、清漆（强度 / 粗糙）、高光。真实材质 = 这几项 + 涂装车间的表面层。 */
export interface PbrShade { readonly base: number; readonly metal: number; readonly rough: number; readonly coat: number; readonly coatRough: number; readonly spec: number }
/** 涂装车间的一层表面纹理（minccino/paintshop/）：配方 id + 强度 + 颜色（铜绿那种要色的）。 */
export interface SurfaceLayer { readonly recipe: SurfaceRecipeId; readonly amount: number; readonly color: number }
/** 环境（光与环境挂点）：涂装车间的环境配方、环境光强度、曝光、太阳方位 / 高度（度）。 */
export interface EnvLight { readonly recipe: EnvRecipeId; readonly amount: number; readonly exposure: number; readonly sunAz: number; readonly sunEl: number }
/** 辉光（后处理挂点）：强度、半径、上限（软削顶）、暗角。 */
export interface BloomPost { readonly amount: number; readonly radius: number; readonly cap: number; readonly vignette: number }
/** 世界空间遮蔽（实验室 20 方向深度图）：强度、模型上 / 地面上的长度（场景半径 = 1）、影子边的软（0 = 硬边碎片感，剪纸的多重阴影）。 */
export interface AoParams { readonly amount: number; readonly radius: number; readonly groundRadius: number; readonly soft: number }

export interface Preset {
  readonly id: string;
  /** 界面上的名字（视图 ☰「风格」）。 */
  readonly name: string;
  /** 一句话：这个风格是什么、画面上会怎样（选了之后的提示行 = 披露）。 */
  readonly note: string;
  /** 下拉里那一项的小字（几个字）。 */
  readonly brief: string;
  /** 出处：实验室插件 · 预设（视觉归 user 调，改默认值要说清改了什么）。 */
  readonly source: string;
  /** 材质翻译挂点：面怎么上明暗（camera = 白模的跟相机平光 / none = 不打光 / flat = 平涂）、贴图怎么过滤、模型的边画不画（边 = 编辑器的线稿；叠加层的选中边照画）、
   *  上色方式（实验室 COLOR_MODES：model = 照模型：颜色 + 贴图；part = 一件一色：只认材质色、印不出贴图，没上色的面用纸色；none = 不上色：材料本色，铸铜 / Tron）。 */
  /** material.edges 线稿三档：none 不画 / all 全画 / active 只画正在编辑那一层的（T60 像素里编辑中的东西显示网格；user 10-29「cube侧面画一个门…线没有显示出来」）。 */
  readonly material: { readonly shade: "camera" | "none" | "flat" | "tron" | "pbr"; readonly texFilter: "asset" | "nearest"; readonly edges: "none" | "all" | "active"; readonly colorize: "model" | "part" | "none"; readonly flat: FlatShade | null; readonly tron: TronShade | null; readonly pbr: PbrShade | null;
    /** 涂装车间的表面层（写实那条路按顺序叠；空 = 没有）。 */ readonly surface: readonly SurfaceLayer[] };
  /** 光与环境挂点：背景色（null = 白模的背景）、地面（z = 0，null = 没有；grid > 0 = 用线色画 Tron 的地格）、世界空间遮蔽（null = 没有；要后台烘）。 */
  readonly light: { readonly background: number | null; readonly ground: { readonly color: number; readonly on: number; readonly grid: number } | null; readonly ao: AoParams | null; readonly env: EnvLight | null };
  /** 后处理挂点。 */
  readonly post: { readonly pixelOutline: PixelOutlinePost | null; readonly bloom: BloomPost | null };
  /** 屏幕一刀：像素化 = 一个画面像素放大几倍（CSS 像素；后端按设备像素比取整成整数倍放大）；1 = 原生。rows = 分辨率上限（画面最多几行，整数倍放大铺满，不留黑边）；
   *  look = 屏幕外观（none 最近邻 / crt-tv 电视）。 */
  readonly screen: { readonly pixelate: number; readonly rows: number | null; readonly look: "none" | "crt-tv" };
  /** 几何预处理挂点（小学的四个风格里像素描边用不到；剪纸 / Tron / 铸铜接边信息、零件、倒角时填）。 */
  readonly geometry: Readonly<Record<string, never>>;
}

export const PRESETS = {
  /** 白模（现状）：零成本兜底，不是风格。 */
  white: {
    id: "white", name: "白模", note: "现在的样子：跟着相机的平光、线稿照常", brief: "现在的样子",
    source: "CatsUp 现状（≈ 实验室「最省 · 白模」）",
    material: { shade: "camera", texFilter: "asset", edges: "all", colorize: "model", flat: null, tron: null, pbr: null, surface: [] },
    light: { background: null, ground: null, ao: null, env: null },
    post: { pixelOutline: null, bloom: null },
    screen: { pixelate: 1, rows: null, look: "none" },
    geometry: {},
  },
  /** 像素描边（实验室「像素」分类的门面，10-28 user「像素描边是纯色的poster child」）。 */
  pixelOutline: {
    id: "pixelOutline", name: "像素描边", brief: "1/3 分辨率 + 一格黑描边", note: "按 1/3 分辨率画、最近邻放大，模型外轮廓和前后错开处描一格黑线；不打光、贴图最近邻；模型自己的线稿不画（选中 / 悬停的边、网格、吸附照常按原分辨率画）",
    source: "实验室 平涂 flat.js ·「像素描边」（contrast 0、pixelate 3、pixOutline、outlineTint 1、outlineShade 0.25、outlineDark；BASE 的 pixInner true、outline #1b1b1b、background #fde6bd）",
    material: { shade: "none", texFilter: "nearest", edges: "active", colorize: "model", flat: null, tron: null, pbr: null, surface: [] },
    light: { background: 0xfde6bd, ground: null, ao: null, env: null },
    post: { pixelOutline: { color: 0x1b1b1b, tint: 1, shade: 0.25, darkSide: true, inner: true, width: 1 }, bloom: null },
    screen: { pixelate: 3, rows: null, look: "none" },
    geometry: {},
  },
  /** 剪纸 · 色纸（实验室「切面」分类；user 10-26「剪纸可能就是多重阴影？」「剪纸也是立体主义」）。 */
  papercut: {
    id: "papercut", name: "剪纸 · 色纸", brief: "色纸 + 多重阴影",
    note: "一件一色的色纸：每个材质一张纸、没上色的是纸白，贴图印不上去；面按朝向分明暗（光跟着相机），零件之间、贴地处叠出一层层硬边的影子（多重阴影：从 20 个方向烘的遮蔽，改完模型停手约 0.25 秒后跟上）；地面是纸色；模型自己的线稿不画",
    source: "实验室 平涂 flat.js ·「剪纸 · 色纸」（colMode part、shadowTint #a7859c、contrast 0.4、ramp 1、bands 2、soft 0.12、ao 0.8、aoSoft 0、aoRadius 0.8、aoGround 2、facet 1、light −30° / 60°、background #f7efe0、ground #efe4cf；BASE 的 base #f2efe8、groundOn 1）",
    material: { shade: "flat", texFilter: "asset", edges: "none", colorize: "part", flat: { base: 0xf2efe8, shadowTint: 0xa7859c, contrast: 0.4, ramp: 1, steps: 1, soft: 0.12, lightAz: -30, lightEl: 60 }, tron: null, pbr: null, surface: [] },
    light: { background: 0xf7efe0, ground: { color: 0xefe4cf, on: 1, grid: 0 }, ao: { amount: 0.8, radius: 0.8, groundRadius: 2, soft: 0 }, env: null },
    post: { pixelOutline: null, bloom: null },
    screen: { pixelate: 1, rows: null, look: "none" },
    geometry: {},
  },
  /** CRT Tron（实验室「霓虹」分类的门面，10-28 user「tron 复古当poster child」「霓虹除了tron复古都sunset吧」）。 */
  tron: {
    id: "tron", name: "CRT Tron", brief: "青线 + 辉光 + CRT 电视",
    note: "深色的面、青色发光的硬边（轮廓加粗、线芯发白）、被挡住的边淡淡透出来、青色地格；画面最多 240 行、整数倍放大进 CRT 电视（扫描线、荫罩、色度横糊、四角暗）；选中的面被风格认领成 Clu 橙。和实验室不一样：屏幕先不弯、没有街机机框、扫描线那道光不跑、被挡住的边是实线不是虚线",
    source: "实验室 硬边线 tron.js ·「青 Tron · 复古」（lineColor #3fe6ff、lineWidth 1、profile 1.3、lineCore 0.45、hiddenLines 0.12、faceColor #06141e、backColor #1c0b10、shade 0.55、facet 1、bloom 1.0、bloomRadius 0.7、rim 0.25、rimPower 3、background #010307、grid 0.55、vignette 0.55、glowCap 1.8、res ps1 = 240 行、screen crt-tv；Clu 橙 #ff9a2e 是 Opus 选的，待 user 调）",
    material: { shade: "tron", texFilter: "asset", edges: "all", colorize: "none", flat: null, tron: { face: 0x06141e, back: 0x1c0b10, shade: 0.55, rim: 0.25, rimPower: 3, line: 0x3fe6ff, core: 0.45, widthPx: 1, profile: 1.3, hidden: 0.12, select: 0xff9a2e }, pbr: null, surface: [] },
    light: { background: 0x010307, ground: { color: 0x010307, on: 0, grid: 0.55 }, ao: null, env: null },
    post: { pixelOutline: null, bloom: { amount: 1.0, radius: 0.7, cap: 1.8, vignette: 0.55 } },
    screen: { pixelate: 1, rows: 240, look: "crt-tv" },
    geometry: {},
  },
  /** 写实（实验室「基础」分类，标准金属度 / 粗糙度那套）：照模型上色——材质色和贴图都进底色。**真实材质的底子**：铸铜等 = 写实 + 材料参数 + 涂装车间的表面层（user 10-29「应该是真实材质复用写实，而不是写实复用铸铜！」）。也是 user 场景 4「全量渲染视口」的起点。 */
  realistic: {
    id: "realistic", name: "写实", brief: "照模型上色 + 海天 + 投影",
    note: "照模型上色：材质色和贴图都进底色，光是程序海天（漫反射球谐、镜面按粗糙度）+ 太阳投影 + 世界空间遮蔽（改完模型停手约 0.25 秒后跟上）；背景是那片海天、地面浅灰；模型自己的线稿不画。粗糙度先统一 0.6、不是金属（CatsUp 的材质还没有粗糙度 / 金属度这两项）",
    source: "实验室 表面 material.js ·「写实」（colMode full、rough 0.6、spec 1、envAmt 1、envBg、aoMode 世界空间 × 1、exposure 0.9、ground #9a9a96；useOrm = 读模型的粗糙度 / 金属度——CatsUp 材质没有这两项，用滑杆值；BASE 的 sunAz 35 / sunEl 45、metal 0）",
    material: { shade: "pbr", texFilter: "asset", edges: "none", colorize: "model", flat: null, tron: null, pbr: { base: 0xd6d6d6, metal: 0, rough: 0.6, coat: 0, coatRough: 0.05, spec: 1 }, surface: [] },
    light: { background: null, ground: { color: 0x9a9a96, on: 1, grid: 0 }, ao: { amount: 1, radius: 0.5, groundRadius: 0.25, soft: 1 }, env: { recipe: "sky-sea", amount: 1, exposure: 0.9, sunAz: 35, sunEl: 45 } },
    post: { pixelOutline: null, bloom: null },
    screen: { pixelate: 1, rows: null, look: "none" },
    geometry: {},
  },
  /** 铸铜（实验室「雕塑与手办」分类的门面，10-28 user「铸铜是雕塑的poster child」）= 写实 + 青铜的材料参数（不上色、金属、蜡）+ 涂装车间两层（砂铸、铜绿）；露天大件 = 程序海天。 */
  bronze: {
    id: "bronze", name: "铸铜", brief: "青铜 + 铜绿 + 海天",
    note: "不借模型颜色的青铜：金属高光映出程序海天、太阳打出投影，缝里和凹处积着铜绿（世界空间遮蔽，改完模型停手约 0.25 秒后跟上），表面有砂铸的坑洼和一层蜡；背景是那片海天、地面浅灰；模型自己的线稿不画。和实验室不一样：没有倒角（CatsUp 还没给这个几何通道）、没有镜头炫光",
    source: "实验室 表面 material.js ·「铸铜」（base #b3804e、metal 1、rough 0.38、pattern 9 砂铸 × 0.5、patina 0.75 #3b4632、coat 0.25 / 0.22、spec 1、envSource 程序海天 × 1.1、sunAz 35 / sunEl 45、exposure 0.95、aoMode 世界空间 × 1、ground #9a9a96；BASE 的 aoSoft 1；遮蔽半径照 material.js 模型 0.5 / 地面 0.25；太阳色 1.7 / 1.6 / 1.45、天光 / 地光照 LIGHT 段）",
    material: { shade: "pbr", texFilter: "asset", edges: "none", colorize: "none", flat: null, tron: null, pbr: { base: 0xb3804e, metal: 1, rough: 0.38, coat: 0.25, coatRough: 0.22, spec: 1 },
      surface: [{ recipe: "sand-cast", amount: 0.5, color: 0 }, { recipe: "patina", amount: 0.75, color: 0x3b4632 }] },   // 写实 + 涂装车间：砂铸 → 铜绿
    light: { background: null, ground: { color: 0x9a9a96, on: 1, grid: 0 }, ao: { amount: 1, radius: 0.5, groundRadius: 0.25, soft: 1 }, env: { recipe: "sky-sea", amount: 1.1, exposure: 0.95, sunAz: 35, sunEl: 45 } },
    post: { pixelOutline: null, bloom: null },
    screen: { pixelate: 1, rows: null, look: "none" },
    geometry: {},
  },
} as const satisfies Record<string, Preset>;
export type PresetId = keyof typeof PRESETS;
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
export const isPresetId = (s: unknown): s is PresetId => typeof s === "string" && Object.prototype.hasOwnProperty.call(PRESETS, s);

/** 这个预设要不要走「屏幕」那条路（小图 → 后处理 → 放大 → 叠加层）；白模、剪纸（原生分辨率、没有后处理）= 不走，一次画完。 */
export function isStyled(p: Preset): boolean { return p.screen.pixelate > 1 || p.screen.rows !== null || p.screen.look !== "none" || p.post.pixelOutline !== null || p.post.bloom !== null; }

/**
 * 这一帧的 pass 声明（frame graph）：白模 = 膜 + 边直接画进 frame；风格 = 场景画进小图 → 后处理 → 放大进 frame；
 * 地面网格 / 叠加层 / X 光照旧往 frame 上追加画（编辑器的东西按原分辨率，不跟着风格像素化——不变量 7）。
 */
export function presetPasses(p: Preset): PassDecl[] {
  const tgt = isStyled(p) ? "lowres" : "frame";
  const ps: PassDecl[] = [];
  if (p.light.ao) ps.push({ id: "aoBake", reads: ["stream"], writes: ["ao"] });
  if (p.light.env) ps.push({ id: "envBake", writes: ["env"] });   // 环境图：太阳 / 天空变了才重烘
  const baked = [...(p.light.ao ? ["ao"] : []), ...(p.light.env ? ["env"] : [])];
  if (p.light.ao || p.light.ground || p.light.env) {
    // 地面 / 背景一遍全屏先画，模型追加在上面；遮蔽 = 后台烘的图（内容变了、停手才重烘），地面和模型都读
    ps.push({ id: "ground", reads: baked, writes: [tgt] }, { id: "scene", reads: ["stream", ...baked], appends: [tgt] });
  } else ps.push({ id: "scene", reads: ["stream"], writes: [tgt] });
  if (isStyled(p)) {
    let cur = "lowres";
    if (p.post.bloom) { ps.push({ id: "glow", reads: ["stream"], writes: ["glow"] }, { id: "bloom", reads: ["glow"], writes: ["bloomLevels"] }, { id: "composite", reads: [cur, "bloomLevels"], writes: ["styled"] }); cur = "styled"; }
    else if (p.post.pixelOutline) { ps.push({ id: "pixelOutline", reads: [cur], writes: ["styled"] }); cur = "styled"; }
    ps.push({ id: "upscale", reads: [cur], writes: ["frame"] });
  }
  ps.push({ id: "grid", appends: ["frame"] }, { id: "overlay", reads: ["stream", "editor"], appends: ["frame"] });
  return ps;
}
