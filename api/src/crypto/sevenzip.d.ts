import type { SevenZipModuleFactory } from "../../vendor/7z-wasm/index.d.ts";
interface SevenZipConfig {
    factory: SevenZipModuleFactory;
    wasmBinary: ArrayBuffer;
}
type SevenZipLoader = () => Promise<SevenZipConfig>;
/** node 测试注入点（浏览器不调用）。 */
export declare function setSevenZipLoader(fn: SevenZipLoader): void;
type SevenZipData = Uint8Array | ArrayBuffer | string;
interface SevenZipEntry {
    path: string;
    data: SevenZipData;
}
/**
 * 打包加密 .7z。entries: [{ path, data }]，return Uint8Array（.7z 字节）。
 * -t7z AES-256 · -mhe=on 加密头（文件名也加密）· -mx=0 STORE（内容已压缩，不再 deflate）。
 */
export declare function pack7z(entries: SevenZipEntry[], password: string): Promise<Uint8Array<ArrayBufferLike>>;
/**
 * 解 .7z → { path: Uint8Array }。密码错 / 文件坏 → throw code=WRONG_PASSWORD。
 * -mhe 加密头：密码错时连目录都列不出 → 产物缺失即判错密码。
 * @returns {Promise<Record<string, Uint8Array>>}
 */
export declare function unpack7z(bytes: SevenZipData, password: string): Promise<Record<string, Uint8Array<ArrayBufferLike>>>;
export {};
