// 手写类型（vendored jpeg-js@0.4.4 encoder half，见 jpeg-encoder.mjs 头注释）。
export interface JpegEncodeInput {
  data: Uint8Array | Uint8ClampedArray;   // RGBA, w*h*4
  width: number;
  height: number;
  exifBuffer?: Uint8Array;
}
export interface JpegEncodeResult {
  data: Uint8Array;
  width: number;
  height: number;
}
export function encode(imgData: JpegEncodeInput, quality?: number): JpegEncodeResult;
