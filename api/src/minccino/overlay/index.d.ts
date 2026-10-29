import type { Vec3 } from "../contract/geometry.ts";
import type { MaterialRef } from "../contract/stream.ts";
/** 一组线段（世界坐标，a b 成对）；颜色 = 每顶点线性空间 rgb（null = 用 color 整组一色）；key 没变 = 后端不重建几何。 */
export interface OverlayLines {
    readonly kind: "lines";
    readonly id: string;
    readonly style: LineStyleId;
    readonly key: string;
    readonly positions: readonly number[];
    readonly colors: readonly number[] | null;
    /** 整组一色（style.vertexColors = false 的那几种）；每帧可变、不进 key。 */
    readonly color?: number;
}
/** 一组点（世界坐标）；style 定大小 / 形状 / 往相机拉多少 / 颜色；faceDot 那种每点一色 = colors（**sRGB 浮点**，点的 shader 直接出，不过色彩管理）。 */
export interface OverlayPoints {
    readonly kind: "points";
    readonly id: string;
    readonly style: PointStyleId;
    readonly key: string;
    readonly positions: readonly number[];
    readonly colors?: readonly number[] | null;
}
/** 一个实心标记（球 / 方块 / 锥 / 环 / 方片）：位置 + 缩放 + 颜色 + 朝向（朝向的矩阵数学归后端：upTo = 让 +Y 指向 dir；basis = 按三根轴摆）。每帧可变、不进 key。 */
export interface OverlayMarker {
    readonly kind: "marker";
    readonly id: string;
    readonly style: MarkerStyleId;
    readonly at: Vec3;
    readonly scale: number | Vec3;
    readonly color: number;
    readonly orient?: {
        readonly kind: "upTo";
        readonly dir: Vec3;
    } | {
        readonly kind: "basis";
        readonly x: Vec3;
        readonly y: Vec3;
        readonly z: Vec3;
    };
}
/** 一组三角（世界坐标，每 3 个点一个）；key 没变不重建。 */
export interface OverlayTris {
    readonly kind: "tris";
    readonly id: string;
    readonly style: TrisStyleId;
    readonly key: string;
    readonly positions: readonly number[];
}
/** 一块文字：挂在 3D 某一点、固定屏幕大小（排版 / 光栅化归后端 label-raster）。 */
export interface OverlayLabel {
    readonly kind: "label";
    readonly id: string;
    readonly text: string;
    readonly at: Vec3;
    readonly style: "scale";
    readonly anchor?: "below" | "above" | "left" | "right" | "center";
    readonly gapPx?: number;
    readonly occlude?: boolean;
}
/**
 * 面高亮（选中 / 悬停；6c）：三角 + 法线 + 每顶点 sRGB 颜色（膜 shader 直接出，不过色彩管理）。
 * `slot` 给了 = 挂在那个放置槽（Placement.slot）的节点下：**池本地坐标**、和那个槽的面同一个材质同一个深度偏移、画在面之后——GPU 算出的深度逐位相同，
 * 后画的赢 = 换颜色，没有 z-fighting（内容方要给和面本身同一组三角）。`slot = null` = 世界坐标、覆盖层材质压在各槽面上；
 * `material` 给了 = 带贴图的面（世界坐标 + uv；引擎只拿 material 当贴图的钥匙）。key 没变不重建。
 */
export interface OverlayFaces {
    readonly kind: "faces";
    readonly id: string;
    readonly key: string;
    readonly slot: string | null;
    readonly positions: readonly number[];
    readonly normals: readonly number[];
    readonly colors: readonly number[];
    readonly material?: MaterialRef | null;
    readonly uvs?: readonly number[] | null;
}
export type OverlayItem = OverlayLines | OverlayPoints | OverlayMarker | OverlayTris | OverlayLabel | OverlayFaces;
/** 点的样式（= 现状四种 Points 的 shader 参数：CSS px 大小、圆 / 方、往相机拉的系数、颜色 null = 每点一色、不做深度测试、透明度、画序）。 */
export interface PointStyle {
    readonly sizePx: number;
    readonly shape: "round" | "square";
    readonly pull: number | null;
    readonly color: number | null;
    readonly depthTest: boolean;
    readonly alpha: number;
    readonly renderOrder: number;
}
export declare const POINT_STYLES: {
    readonly selVert: {
        readonly sizePx: 9;
        readonly shape: "round";
        readonly pull: 0.994;
        readonly color: 2845872;
        readonly depthTest: true;
        readonly alpha: 1;
        readonly renderOrder: 4;
    };
    readonly vert: {
        readonly sizePx: 5;
        readonly shape: "round";
        readonly pull: 0.996;
        readonly color: 2763306;
        readonly depthTest: true;
        readonly alpha: 1;
        readonly renderOrder: 3;
    };
    readonly faceDot: {
        readonly sizePx: 6;
        readonly shape: "square";
        readonly pull: null;
        readonly color: null;
        readonly depthTest: false;
        readonly alpha: 0.9;
        readonly renderOrder: 5;
    };
    readonly seam: {
        readonly sizePx: 7;
        readonly shape: "round";
        readonly pull: 0.995;
        readonly color: 9133302;
        readonly depthTest: true;
        readonly alpha: 1;
        readonly renderOrder: 3.5;
    };
};
export type PointStyleId = keyof typeof POINT_STYLES;
/** 标记的样式（= 现状各 Mesh 的几何 + MeshBasicMaterial 参数）。 */
export interface MarkerStyle {
    readonly geom: "sphere" | "sphereHalf" | "box" | "cone" | "ring" | "plane";
    readonly depthTest: boolean;
    readonly depthWrite: boolean;
    readonly transparent: boolean;
    readonly opacity: number;
    readonly doubleSide: boolean;
    readonly renderOrder: number;
    readonly frustumCulled: boolean;
}
export declare const MARKER_STYLES: {
    readonly snap: {
        readonly geom: "sphere";
        readonly depthTest: true;
        readonly depthWrite: true;
        readonly transparent: false;
        readonly opacity: 1;
        readonly doubleSide: false;
        readonly renderOrder: 0;
        readonly frustumCulled: true;
    };
    readonly landing: {
        readonly geom: "ring";
        readonly depthTest: false;
        readonly depthWrite: true;
        readonly transparent: true;
        readonly opacity: 0.85;
        readonly doubleSide: true;
        readonly renderOrder: 9;
        readonly frustumCulled: true;
    };
    readonly handle: MarkerStyle;
    readonly xgCube: MarkerStyle;
    readonly xgCenter: MarkerStyle;
    readonly xgCone: MarkerStyle;
    readonly xgPlane: MarkerStyle;
};
export type MarkerStyleId = keyof typeof MARKER_STYLES;
/** 三角组的样式。 */
export interface TrisStyle {
    readonly color: number;
    readonly transparent: boolean;
    readonly opacity: number;
    readonly doubleSide: boolean;
    readonly depthTest: boolean;
    readonly depthWrite: boolean;
    readonly renderOrder: number;
}
export declare const TRIS_STYLES: {
    readonly gizmoQuad: {
        readonly color: 2845872;
        readonly transparent: true;
        readonly opacity: 0.12;
        readonly doubleSide: true;
        readonly depthTest: false;
        readonly depthWrite: false;
        readonly renderOrder: 10;
    };
};
export type TrisStyleId = keyof typeof TRIS_STYLES;
/** 引擎给编辑器的量尺：都按当前视图（XR = HMD 位置 + 角尺寸；桌面 = 相机深度 / 正交半高）。 */
export interface OverlayCtx {
    /** 这一点处一个 CSS 像素多长（世界米）。 */
    worldPerPx(p: Vec3): number;
    /** 无限长直线能画多远（过 p、方向 dir）：从离视野中心最近的那点往两边各「视野范围 + 到中心的距离」。 */
    infLine(p: Vec3, dir: Vec3): readonly [Vec3, Vec3];
    /** 无限长线的缓存键（视野范围按对数分档、中心按范围量化）。 */
    reachKey(): string;
    readonly target: Vec3;
    readonly forward: Vec3;
    readonly right: Vec3;
    readonly up: Vec3;
    /** 边线宽（设备像素）和设备像素比（断口小垂线的半长跟边线宽走）。 */
    readonly lineWeightPx: number;
    readonly dpr: number;
}
/** 线的样式（= three LineMaterial 的参数；表的**声明顺序 = 材质创建顺序**，three 画家排序平手时按材质 id——别乱序）。 */
export interface LineStyle {
    readonly widthPx: number;
    readonly vertexColors: boolean;
    readonly offset: boolean;
    readonly depthTest: boolean;
    readonly depthWrite: boolean;
    readonly transparent?: boolean;
    readonly opacity?: number;
    readonly renderOrder: number;
    /** 不另建材质，用后端自己的那份（`"edge"` = 边线材质：线宽跟线稿粗细走、SU 轮廓线 shader、X 光下换成不做深度测试那份）。widthPx 等只是说明。 */
    readonly shared?: "edge";
}
export declare const LINE_STYLES: {
    readonly hint: LineStyle;
    readonly arc: LineStyle;
    readonly capsule: {
        widthPx: number;
        vertexColors: false;
        offset: false;
        depthTest: false;
        depthWrite: true;
        renderOrder: number;
    };
    readonly protractor: LineStyle;
    readonly guide: LineStyle;
    readonly tape: LineStyle;
    readonly knife: LineStyle;
    readonly charged: LineStyle;
    readonly soft: LineStyle;
    readonly tick: LineStyle;
    readonly poolAxes: LineStyle;
    readonly emptyAxes: LineStyle;
    readonly originAxes: LineStyle;
    readonly lock: LineStyle;
    readonly gizmo: LineStyle;
    readonly xg: LineStyle;
    /** 选中 / 刮擦 / 悬停 / 检查的边（6c）：后端边线自己的材质（shared），定死最后画（renderOrder 2）= 盖得住底下同材质的黑边（probe-erase-red）。不建材质 → 不动上面各样式的材质创建顺序。 */
    readonly edge: {
        readonly widthPx: 1.6;
        readonly vertexColors: true;
        readonly offset: true;
        readonly depthTest: true;
        readonly depthWrite: true;
        readonly renderOrder: 2;
        readonly shared: "edge";
    };
};
export type LineStyleId = keyof typeof LINE_STYLES;
/** 0xRRGGBB → 线性空间 rgb（= three Color.setHex 在默认色彩管理下的值；公式和 three ColorManagement.SRGBToLinear 逐字一样，结果位级相同）。 */
export declare function hexToLinear(hex: number): [number, number, number];
