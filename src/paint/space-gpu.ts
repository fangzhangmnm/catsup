// paint/space-gpu.ts —— 三维内核自己的显卡接口（贴图主线 1-4b；统筹 11-11 定的：画画内核的显卡那一层是它的内部零件，三维另开一套）。created 2026-11-11 by Claude Opus 5.5
// 接口本身住在渲染器的契约里（minccino/contract/offscreen-gpu.ts，引擎不认识「画」），这里给三维内核起它自己的名字。
// 两份实现：真显卡版 = 渲染器那半边（minccino/providers/three/offscreen-gpu-gl.ts）；软件版 = space-gpu-soft.ts（纯计算）。和画画内核无关。
export type {
  OffscreenImage as SpaceImage, OffscreenData as SpaceData, OffscreenCpuCtx as SpaceCpuCtx, OffscreenCpuProgram as SpaceCpuProgram,
  OffscreenProgram as SpaceProgram, OffscreenAccum as SpaceAccum, OffscreenDraw as SpaceDraw, OffscreenGpu as SpaceGpu,
} from "../minccino/contract/offscreen-gpu.ts";
