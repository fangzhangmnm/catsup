// 本仓用到的最小类型面（上游无类型）。
export interface UpngImage {
  width: number; height: number; depth: number; ctype: number;
  frames: unknown[]; tabs: Record<string, unknown>; data: Uint8Array;
}
declare const UPNG: {
  decode(buffer: ArrayBuffer | Uint8Array): UpngImage;
  toRGBA8(img: UpngImage): ArrayBuffer[];
  encode(frames: ArrayBuffer[], w: number, h: number, cnum: number, dels?: number[]): ArrayBuffer;
};
export function setDeflateLevel(l: number): void;
export default UPNG;
export { UPNG };
