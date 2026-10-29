// minccino/contract/view.ts —— 视图是一等对象（骨架稿 v2 不变量 9）：视图 = 相机 + 画到哪 + 预算 + 画质档。
// 主视口一个、VR 两个（共一份提取，T35：VR native 从第一天）、小地图 / 缩略图 / UV 画布各一个。created 2026-10-29 by Claude Fable 5.1
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

/** 后台预算（空闲 / 不在前台时给烤作业、串流预拉、着色器预热；不变量 3）。小学：空对象占位，形状先钉。 */
export interface BackgroundBudget {
  readonly msPerIdle: number;
  readonly vramMb: number;
  /** 电量感知：默认开、跟设备的省电模式走、设置里可关（T35）；降档时披露。 */
  readonly batteryAware: boolean;
}
