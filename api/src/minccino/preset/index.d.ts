import type { PassDecl } from "../graph/frame-graph.ts";
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
    readonly face: number;
    readonly back: number;
    readonly shade: number;
    readonly rim: number;
    readonly rimPower: number;
    readonly line: number;
    readonly core: number;
    readonly widthPx: number;
    readonly profile: number;
    readonly hidden: number;
    readonly select: number;
}
/** 辉光（后处理挂点）：强度、半径、上限（软削顶）、暗角。 */
export interface BloomPost {
    readonly amount: number;
    readonly radius: number;
    readonly cap: number;
    readonly vignette: number;
}
/** 世界空间遮蔽（实验室 20 方向深度图）：强度、模型上 / 地面上的长度（场景半径 = 1）、影子边的软（0 = 硬边碎片感，剪纸的多重阴影）。 */
export interface AoParams {
    readonly amount: number;
    readonly radius: number;
    readonly groundRadius: number;
    readonly soft: number;
}
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
     *  上色方式（model = 照模型：颜色 + 贴图；part = 一件一色：只认材质色、印不出贴图，没上色的面用纸色）。 */
    readonly material: {
        readonly shade: "camera" | "none" | "flat" | "tron";
        readonly texFilter: "asset" | "nearest";
        readonly edges: boolean;
        readonly colorize: "model" | "part";
        readonly flat: FlatShade | null;
        readonly tron: TronShade | null;
    };
    /** 光与环境挂点：背景色（null = 白模的背景）、地面（z = 0，null = 没有；grid > 0 = 用线色画 Tron 的地格）、世界空间遮蔽（null = 没有；要后台烘）。 */
    readonly light: {
        readonly background: number | null;
        readonly ground: {
            readonly color: number;
            readonly on: number;
            readonly grid: number;
        } | null;
        readonly ao: AoParams | null;
    };
    /** 后处理挂点。 */
    readonly post: {
        readonly pixelOutline: PixelOutlinePost | null;
        readonly bloom: BloomPost | null;
    };
    /** 屏幕一刀：像素化 = 一个画面像素放大几倍（CSS 像素；后端按设备像素比取整成整数倍放大）；1 = 原生。rows = 分辨率上限（画面最多几行，整数倍放大铺满，不留黑边）；
     *  look = 屏幕外观（none 最近邻 / crt-tv 电视）。 */
    readonly screen: {
        readonly pixelate: number;
        readonly rows: number | null;
        readonly look: "none" | "crt-tv";
    };
    /** 几何预处理挂点（小学的四个风格里像素描边用不到；剪纸 / Tron / 铸铜接边信息、零件、倒角时填）。 */
    readonly geometry: Readonly<Record<string, never>>;
}
export declare const PRESETS: {
    /** 白模（现状）：零成本兜底，不是风格。 */
    readonly white: {
        readonly id: "white";
        readonly name: "白模";
        readonly note: "现在的样子：跟着相机的平光、线稿照常";
        readonly brief: "现在的样子";
        readonly source: "CatsUp 现状（≈ 实验室「最省 · 白模」）";
        readonly material: {
            readonly shade: "camera";
            readonly texFilter: "asset";
            readonly edges: true;
            readonly colorize: "model";
            readonly flat: null;
            readonly tron: null;
        };
        readonly light: {
            readonly background: null;
            readonly ground: null;
            readonly ao: null;
        };
        readonly post: {
            readonly pixelOutline: null;
            readonly bloom: null;
        };
        readonly screen: {
            readonly pixelate: 1;
            readonly rows: null;
            readonly look: "none";
        };
        readonly geometry: {};
    };
    /** 像素描边（实验室「像素」分类的门面，10-28 user「像素描边是纯色的poster child」）。 */
    readonly pixelOutline: {
        readonly id: "pixelOutline";
        readonly name: "像素描边";
        readonly brief: "1/3 分辨率 + 一格黑描边";
        readonly note: "按 1/3 分辨率画、最近邻放大，模型外轮廓和前后错开处描一格黑线；不打光、贴图最近邻；模型自己的线稿不画（选中 / 悬停的边、网格、吸附照常按原分辨率画）";
        readonly source: "实验室 平涂 flat.js ·「像素描边」（contrast 0、pixelate 3、pixOutline、outlineTint 1、outlineShade 0.25、outlineDark；BASE 的 pixInner true、outline #1b1b1b、background #fde6bd）";
        readonly material: {
            readonly shade: "none";
            readonly texFilter: "nearest";
            readonly edges: false;
            readonly colorize: "model";
            readonly flat: null;
            readonly tron: null;
        };
        readonly light: {
            readonly background: 16639677;
            readonly ground: null;
            readonly ao: null;
        };
        readonly post: {
            readonly pixelOutline: {
                readonly color: 1776411;
                readonly tint: 1;
                readonly shade: 0.25;
                readonly darkSide: true;
                readonly inner: true;
                readonly width: 1;
            };
            readonly bloom: null;
        };
        readonly screen: {
            readonly pixelate: 3;
            readonly rows: null;
            readonly look: "none";
        };
        readonly geometry: {};
    };
    /** 剪纸 · 色纸（实验室「切面」分类；user 10-26「剪纸可能就是多重阴影？」「剪纸也是立体主义」）。 */
    readonly papercut: {
        readonly id: "papercut";
        readonly name: "剪纸 · 色纸";
        readonly brief: "色纸 + 多重阴影";
        readonly note: "一件一色的色纸：每个材质一张纸、没上色的是纸白，贴图印不上去；面按朝向分明暗（光跟着相机），零件之间、贴地处叠出一层层硬边的影子（多重阴影：从 20 个方向烘的遮蔽，改完模型停手约 0.25 秒后跟上）；地面是纸色；模型自己的线稿不画";
        readonly source: "实验室 平涂 flat.js ·「剪纸 · 色纸」（colMode part、shadowTint #a7859c、contrast 0.4、ramp 1、bands 2、soft 0.12、ao 0.8、aoSoft 0、aoRadius 0.8、aoGround 2、facet 1、light −30° / 60°、background #f7efe0、ground #efe4cf；BASE 的 base #f2efe8、groundOn 1）";
        readonly material: {
            readonly shade: "flat";
            readonly texFilter: "asset";
            readonly edges: false;
            readonly colorize: "part";
            readonly flat: {
                readonly base: 15921128;
                readonly shadowTint: 10978716;
                readonly contrast: 0.4;
                readonly ramp: 1;
                readonly steps: 1;
                readonly soft: 0.12;
                readonly lightAz: -30;
                readonly lightEl: 60;
            };
            readonly tron: null;
        };
        readonly light: {
            readonly background: 16248800;
            readonly ground: {
                readonly color: 15721679;
                readonly on: 1;
                readonly grid: 0;
            };
            readonly ao: {
                readonly amount: 0.8;
                readonly radius: 0.8;
                readonly groundRadius: 2;
                readonly soft: 0;
            };
        };
        readonly post: {
            readonly pixelOutline: null;
            readonly bloom: null;
        };
        readonly screen: {
            readonly pixelate: 1;
            readonly rows: null;
            readonly look: "none";
        };
        readonly geometry: {};
    };
    /** CRT Tron（实验室「霓虹」分类的门面，10-28 user「tron 复古当poster child」「霓虹除了tron复古都sunset吧」）。 */
    readonly tron: {
        readonly id: "tron";
        readonly name: "CRT Tron";
        readonly brief: "青线 + 辉光 + CRT 电视";
        readonly note: "深色的面、青色发光的硬边（轮廓加粗、线芯发白）、被挡住的边淡淡透出来、青色地格；画面最多 240 行、整数倍放大进 CRT 电视（扫描线、荫罩、色度横糊、四角暗）；选中的面被风格认领成 Clu 橙。和实验室不一样：屏幕先不弯、没有街机机框、扫描线那道光不跑、被挡住的边是实线不是虚线";
        readonly source: "实验室 硬边线 tron.js ·「青 Tron · 复古」（lineColor #3fe6ff、lineWidth 1、profile 1.3、lineCore 0.45、hiddenLines 0.12、faceColor #06141e、backColor #1c0b10、shade 0.55、facet 1、bloom 1.0、bloomRadius 0.7、rim 0.25、rimPower 3、background #010307、grid 0.55、vignette 0.55、glowCap 1.8、res ps1 = 240 行、screen crt-tv；Clu 橙 #ff9a2e 是 Opus 选的，待 user 调）";
        readonly material: {
            readonly shade: "tron";
            readonly texFilter: "asset";
            readonly edges: true;
            readonly colorize: "model";
            readonly flat: null;
            readonly tron: {
                readonly face: 398366;
                readonly back: 1837840;
                readonly shade: 0.55;
                readonly rim: 0.25;
                readonly rimPower: 3;
                readonly line: 4187903;
                readonly core: 0.45;
                readonly widthPx: 1;
                readonly profile: 1.3;
                readonly hidden: 0.12;
                readonly select: 16751150;
            };
        };
        readonly light: {
            readonly background: 66311;
            readonly ground: {
                readonly color: 66311;
                readonly on: 0;
                readonly grid: 0.55;
            };
            readonly ao: null;
        };
        readonly post: {
            readonly pixelOutline: null;
            readonly bloom: {
                readonly amount: 1;
                readonly radius: 0.7;
                readonly cap: 1.8;
                readonly vignette: 0.55;
            };
        };
        readonly screen: {
            readonly pixelate: 1;
            readonly rows: 240;
            readonly look: "crt-tv";
        };
        readonly geometry: {};
    };
};
export type PresetId = keyof typeof PRESETS;
export declare const PRESET_IDS: PresetId[];
export declare const isPresetId: (s: unknown) => s is PresetId;
/** 这个预设要不要走「屏幕」那条路（小图 → 后处理 → 放大 → 叠加层）；白模、剪纸（原生分辨率、没有后处理）= 不走，一次画完。 */
export declare function isStyled(p: Preset): boolean;
/**
 * 这一帧的 pass 声明（frame graph）：白模 = 膜 + 边直接画进 frame；风格 = 场景画进小图 → 后处理 → 放大进 frame；
 * 地面网格 / 叠加层 / X 光照旧往 frame 上追加画（编辑器的东西按原分辨率，不跟着风格像素化——不变量 7）。
 */
export declare function presetPasses(p: Preset, xray: boolean): PassDecl[];
