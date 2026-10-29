// minccino/backend/backend.ts —— 后端接口：引擎这边只认这张脸；three 的实现在 backend/three/（不变量 10：three 关后端，初中换掉）。
// 步 2 只钉名字和能力位；步 5 把现状 render3 的几何上传 / 材质 / 线 / 渲染目标 / XR 会话钩子收进来时填方法。created 2026-10-29 by Claude Fable 5.1
import type { BackendCaps } from "../contract/cost.ts";
import type { CameraSource, ViewportSize } from "../contract/view.ts";
import type { Frame3 } from "../contract/geometry.ts";
import type { OverlayCtx, OverlayItem } from "../overlay/index.ts";

/**
 * 一帧的输入（消费方 → 后端；6c）：相机 + 视口 + XR 近平面 + 地面网格 + 叠加层（含选中高亮）。
 * **内容不在这里**——走流提供者（`setProvider`，引擎拉）。编辑器的 ViewState 是编辑器自己的类型，后端只看到这几样。
 */
export interface FrameInput {
  readonly camera: CameraSource;
  readonly viewport: ViewportSize;
  /** XR 会话里透视近平面（米）；不给 = 0.05。 */
  readonly near?: number;
  /** 地面网格：跟哪个坐标架、格距（米）；不给 = 世界帧、1 m。 */
  readonly grid?: { readonly frame: Frame3; readonly step: number } | null;
  /** 叠加层内容（消费方算，引擎给量尺）；不给 = 没有。 */
  readonly overlay?: (ctx: OverlayCtx) => readonly OverlayItem[];
}

export interface Backend {
  readonly name: string;
  caps(): BackendCaps;
  /** 释放一切 GPU 资源（丢上下文 / 换后端 / 测试结束）。 */
  dispose(): void;
}
