// .7z 加密原语 = vendored 7z-wasm（真 7-Zip 编译成 wasm；vendor/7z-wasm/）。CatsUp 2026-10-29 自 WeebPaint src/sevenzip.ts 搬来（周账 F-123；Claude Fable 5.1）：
//   去掉 WeebPaint 单文件 html 的内嵌读口（CatsUp 没有那个形态）。
// 加密容器的 payload 用它做（AES-256 + 强 KDF + 加密头 -mhe），换来 7-Zip 输密码直接打开
// （anti-abandonware；ADR-0012 2026-06-12「vendor 7z，兄弟项目有高安全需求」）。
//
// **惰性加载**：wasm 1.6MB，绝不在 boot 拉。首次加密/解密用到时才注入 vendored 脚本 + fetch wasm；
//   SW 的 fetch handler 对同源 GET 运行时缓存（msal 同款）→ 用过一次即离线可用。
//
// HOST-SEAM：crypto-container（store 底座）调 pack7z/unpack7z；浏览器走默认 loader，
//   node 测试经 setSevenZipLoader 注入 node 版（require + fs），不碰浏览器路径。

import type { SevenZipModuleFactory } from "../../vendor/7z-wasm/index.d.ts";

interface SevenZipConfig {
  factory: SevenZipModuleFactory;
  wasmBinary: ArrayBuffer;
}
type SevenZipLoader = () => Promise<SevenZipConfig>;

const VENDOR_JS = "./vendor/7z-wasm/7zz.umd.js";
const VENDOR_WASM = "./vendor/7z-wasm/7zz.wasm";

// loader: async () => { factory, wasmBinary }。factory = 7z-wasm 的 SevenZip 模块工厂。
let _loader: SevenZipLoader = _defaultBrowserLoader;
let _cached: SevenZipConfig | null = null;   // { factory, wasmBinary }（loader 跑一次即缓存）

/** node 测试注入点（浏览器不调用）。 */
export function setSevenZipLoader(fn: SevenZipLoader) { _loader = fn; _cached = null; }

async function _defaultBrowserLoader(): Promise<SevenZipConfig> {
  // 注入 vendored UMD 脚本（classic script → window.SevenZip 全局工厂）。不 import，保持惰性、不进 bundle。
  if (!(globalThis as unknown as { SevenZip?: SevenZipModuleFactory }).SevenZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = VENDOR_JS;
      s.onload = resolve;
      s.onerror = () => reject(new Error("7z-wasm script failed to load (offline and never cached?)"));
      document.head.appendChild(s);
    });
  }
  const factory = (globalThis as unknown as { SevenZip?: SevenZipModuleFactory }).SevenZip;
  if (!factory) throw new Error("7z-wasm factory not mounted (window.SevenZip)");
  const resp = await fetch(VENDOR_WASM);
  if (!resp.ok) throw new Error("7z-wasm wasm failed to load: " + resp.status);
  const wasmBinary = await resp.arrayBuffer();
  return { factory, wasmBinary };
}

async function _config() {
  if (!_cached) _cached = await _loader();
  return _cached;
}

// 每次操作起一个干净实例（MEMFS 不跨调用串味；编译 ~几十 ms，加解密是用户动作级非热路径，可接受）。
async function _instance() {
  const { factory, wasmBinary } = await _config();
  return await factory({ print: () => {}, printErr: () => {}, wasmBinary });
}

type SevenZipData = Uint8Array | ArrayBuffer | string;
interface SevenZipEntry {
  path: string;
  data: SevenZipData;
}
// .code 标错密码（消费方 crypto-container 按 code 分支）。
interface WrongPasswordError extends Error {
  code?: string;
}

const _UTF8 = new TextEncoder();
function _toU8(d: SevenZipData) {
  if (d instanceof Uint8Array) return d;
  if (d instanceof ArrayBuffer) return new Uint8Array(d);
  if (typeof d === "string") return _UTF8.encode(d);
  throw new TypeError("7z: unsupported data type");
}

/**
 * 打包加密 .7z。entries: [{ path, data }]，return Uint8Array（.7z 字节）。
 * -t7z AES-256 · -mhe=on 加密头（文件名也加密）· -mx=0 STORE（内容已压缩，不再 deflate）。
 */
export async function pack7z(entries: SevenZipEntry[], password: string) {
  if (!password) throw new Error("cannot encrypt without a password");
  const sz = await _instance();
  const names = [];
  for (const { path, data } of entries) {
    sz.FS.writeFile("/" + path, _toU8(data));
    names.push("/" + path);
  }
  try { sz.callMain(["a", "-t7z", "-mx=0", "-mhe=on", "-p" + password, "-bso0", "-bse0", "/out.7z", ...names]); }
  catch (_) { /* Emscripten exit() 可能抛 ExitStatus；下面以产物存在与否为准 */ }
  let out;
  try { out = sz.FS.readFile("/out.7z"); } catch (_) { out = null; }
  if (!out || !out.length) throw new Error("7z pack failed (no output)");
  return out;
}

/**
 * 解 .7z → { path: Uint8Array }。密码错 / 文件坏 → throw code=WRONG_PASSWORD。
 * -mhe 加密头：密码错时连目录都列不出 → 产物缺失即判错密码。
 * @returns {Promise<Record<string, Uint8Array>>}
 */
export async function unpack7z(bytes: SevenZipData, password: string) {
  const sz = await _instance();
  sz.FS.writeFile("/in.7z", _toU8(bytes));
  sz.FS.mkdir("/out");
  try { sz.callMain(["x", "-p" + password, "-y", "-bso0", "-bse0", "/in.7z", "-o/out"]); }
  catch (_) { /* 错密码 → callMain 非零退出可能抛；以产物为准 */ }
  let files: string[];
  try { files = sz.FS.readdir("/out").filter((n: string) => n !== "." && n !== ".."); }
  catch (_) { files = []; }
  if (!files.length) {
    const e: WrongPasswordError = new Error("wrong password or corrupted file"); e.code = "WRONG_PASSWORD"; throw e;
  }
  /** @type {Record<string, Uint8Array>} */
  const out: Record<string, Uint8Array> = {};
  for (const name of files) {
    try {
      const stat = sz.FS.stat("/out/" + name);
      if (sz.FS.isDir(stat.mode)) continue;
      out[name] = sz.FS.readFile("/out/" + name);
    } catch (_) { /* skip */ }
  }
  if (!Object.keys(out).length) {
    const e: WrongPasswordError = new Error("wrong password or corrupted file"); e.code = "WRONG_PASSWORD"; throw e;
  }
  return out;
}
