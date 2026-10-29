import type { Mat4, Vec3 } from "./geometry.ts";
/** 相机：两个矩阵就够（透视 / 正交都是 projection 的事）。eye 给提供者算视锥带用。 */
export interface ViewCamera {
    readonly view: Mat4;
    readonly projection: Mat4;
    readonly eye: Vec3;
    readonly kind: "persp" | "ortho";
}
/** 画到哪：主画布 / XR 的一只眼 / 离屏（缩略图、小地图）。尺寸是**设备像素**。 */
export interface RenderTarget {
    readonly kind: "canvas" | "xr-eye" | "offscreen";
    readonly width: number;
    readonly height: number;
    /** 画到 XR 眼时：那只眼在 XR 帧缓冲里的视口（x y w h，设备像素）。 */
    readonly viewport?: readonly [number, number, number, number];
}
/** 预算挂在视图上（不变量 3）：每帧毫秒、显存 MB、draw call。超了走降档梯子并披露（血槽位），不静默。 */
export interface ViewBudget {
    readonly frameMs: number;
    readonly vramMb: number;
    readonly drawCalls: number;
}
/** 小学的默认视图预算（数据，步 7 实测后校；超了走降档梯子并披露）。 */
export declare const DEFAULT_VIEW_BUDGET: ViewBudget;
/** 画质档。小学只有 full；still = 静帧（不动不画，Tron 动画播放时才开，T28）；留口：降档梯子的各级。 */
export type QualityTier = "full" | "still";
export interface View {
    readonly id: string;
    readonly camera: ViewCamera;
    readonly target: RenderTarget;
    readonly budget: ViewBudget;
    readonly quality: QualityTier;
    /** 目标的有效期（performance.now 毫秒）：没过期且输入没变 = 只 present、不重画。缺 = 每次都画。 */
    readonly validUntil?: number;
}
/** 视口大小（CSS 像素；与编辑器 `Viewport` 同形）。 */
export interface ViewportSize {
    readonly w: number;
    readonly h: number;
}
/**
 * 相机的来源（6c，过渡期）：编辑器的轨道相机**结构上**满足它，引擎只读这几样、不认识编辑器的类。
 * 初中换后端时收成 `ViewCamera` 的两个矩阵——现在 near / far 还要后端按场景包围球（提供者 `bounds()`）算，所以先拿轨道量。
 */
export interface CameraSource {
    readonly projection: "persp" | "ortho";
    readonly target: Vec3;
    /** 透视：竖直视场角（弧度）。 */
    readonly fovY: number;
    /** 正交：target 深度处的视野半高（米）。 */
    readonly halfH: number;
    eye(): Vec3;
    up(): Vec3;
    forward(): Vec3;
    right(): Vec3;
    eyeDir(): Vec3;
    eyeDist(): number;
    /** 透视近平面下限（米）。 */
    nearClamp(): number;
    halfW(vp: ViewportSize): number;
}
/** 后台预算（空闲 / 不在前台时给烤作业、串流预拉、着色器预热；不变量 3）。小学：空对象占位，形状先钉。 */
export interface BackgroundBudget {
    readonly msPerIdle: number;
    readonly vramMb: number;
    /** 电量感知：默认开、跟设备的省电模式走、设置里可关（T35）；降档时披露。 */
    readonly batteryAware: boolean;
}
