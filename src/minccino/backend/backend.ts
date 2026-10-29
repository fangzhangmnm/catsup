// minccino/backend/backend.ts —— 后端接口：引擎这边只认这张脸；three 的实现在 backend/three/（不变量 10：three 关后端，初中换掉）。
// 步 2 只钉名字和能力位；步 5 把现状 render3 的几何上传 / 材质 / 线 / 渲染目标 / XR 会话钩子收进来时填方法。created 2026-10-29 by Claude Fable 5.1
import type { BackendCaps } from "../contract/cost.ts";

export interface Backend {
  readonly name: string;
  caps(): BackendCaps;
  /** 释放一切 GPU 资源（丢上下文 / 换后端 / 测试结束）。 */
  dispose(): void;
}
