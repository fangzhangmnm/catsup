// S9：doc 图层树 → 合成像素的**唯一生产面**（GL render-tree compositeOnce readback）。
// 旧 2D 规范合成器 layer-composite.ts 已归档为对拍参照（test/gl-smoke/reference-2d.ts）——
// display / 导出 / 缩略图 / mergedimage / PSD / 参考窗镜像从此同一个合成引擎，观感零漂移。
// app.ts 开机注入 board 后端；GL 不可用（无 WebGL2 / context lost）→ 返 null，调用方各自兜
// （导出=报错、autosave mergedimage=透明占位不阻塞落盘、镜像=保留上帧）。

type Bitmap = HTMLCanvasElement | OffscreenCanvas;

// 节点 = doc.ts 的 Layer|LayerGroup（结构化收：GL 侧只读 id/opacity/mode/clippingMask/visible/pixels/children）。
export type DocCompositorFn = (nodes: readonly unknown[], docW: number, docH: number) => Bitmap | null;
export type DocCompositorBytesFn = (nodes: readonly unknown[], docW: number, docH: number) => { data: Uint8ClampedArray; w: number; h: number } | null;

let _fn: DocCompositorFn | null = null;
let _bytesFn: DocCompositorBytesFn | null = null;
export function setDocCompositor(fn: DocCompositorFn): void { _fn = fn; }
export function setDocCompositorBytes(fn: DocCompositorBytesFn | null): void { _bytesFn = fn; }
/** 现值读口（测试 save/restore 全局接缝用）。 */
export function getDocCompositorBytes(): DocCompositorBytesFn | null { return _bytesFn; }
// per-tenant 已落（C7 后棒）：WeebPaintBackend/LayersFace 各持 inject.compositorBytes（缺省回落本全局面）。
// 本全局接缝保留给**壳单租户消费者**（psd mergedimage / session 导出 / 参考窗镜像）——多 backend 并存时
// 它们只服务主 tab 的 board；embedding/MCP 面的合成恒走各自 backend 的注入面，不经这里。

/** nodes → 合成 canvas（**透明底**；doc 背景由调用方按需自铺）。null = GL 不可用。 */
export function renderNodesToCanvas(nodes: readonly unknown[], docW: number, docH: number): Bitmap | null {
  return _fn ? _fn(nodes, docW, docH) : null;
}

/** nodes → 合成 straight 字节（v0.6.39：merge-down 等「字节进出」op 用——同一 GL 引擎，零 canvas）。 */
export function renderNodesToBytes(nodes: readonly unknown[], docW: number, docH: number): { data: Uint8ClampedArray; w: number; h: number } | null {
  return _bytesFn ? _bytesFn(nodes, docW, docH) : null;
}
