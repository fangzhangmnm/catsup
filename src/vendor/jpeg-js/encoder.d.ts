// 类型壳（vendored jpeg-js 0.4.4 encoder）。created 2026-09-20 by Claude Fable 5.1
export interface RawImageData { width: number; height: number; data: Uint8Array | Uint8ClampedArray; }
export default function encode(imgData: RawImageData, quality?: number): { width: number; height: number; data: Uint8Array };
