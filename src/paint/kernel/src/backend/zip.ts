// ZIP 读写 = vendored zip.js (gildas-lormeau)。
// UMD bundle 自挂 window.zip（浏览器 window ≡ globalThis；node 测试 shim 同挂）——
// C7 起本文件读 globalThis（backend 禁浏览器词；语义逐字节同旧）。HTML head 里以 classic <script> 加载。
//
// 只管明文 zip（外层加密容器 + .ora 本体）。payload 的加密走 .7z（src/sevenzip.js）。

// 整个 zip.js 是 vendored UMD（gildas-lormeau），无 .d.ts。它的 reader/writer 类
// 在这里只当不透明工厂用 → boundary any（reader/writer 实例也只在本文件内流转）。
type ZipLib = any;

function Z(): ZipLib {
  const g = globalThis as unknown as { zip?: ZipLib };
  if (!g.zip) {
    throw new Error("zip.js not loaded (must be included as a classic <script> before app.js: ./vendor/zip-js/zip-full.min.js)");
  }
  return g.zip;
}

// 首次访问时关掉 web workers —— inline worker 在某些场景被 CSP 拒；不开省心。
let _configured = false;
function ensureConfigured() {
  if (_configured) return;
  try { Z().configure({ useWebWorkers: false }); } catch (_) {}
  _configured = true;
}

function toZipReader(data: Blob | Uint8Array | ArrayBuffer | string) {
  const z = Z();
  if (data instanceof Blob) return new z.BlobReader(data);
  if (data instanceof Uint8Array) return new z.Uint8ArrayReader(data);
  if (data instanceof ArrayBuffer) return new z.Uint8ArrayReader(new Uint8Array(data));
  if (typeof data === "string") return new z.TextReader(data);
  throw new TypeError("zip: unsupported data type");
}

interface ZipEntry {
  path: string;
  data: Blob | Uint8Array | ArrayBuffer | string;
}

/** entries: [{ path, data: Blob|Uint8Array|ArrayBuffer|string }, ...]; return Blob
 *  opts.lastModDate：钉死 entry 时间戳 → **决定论 encode**（同内容 → 同字节；ADR-0009 方向，
 *  C7 backend round-trip 锚 + 云 diff 友好）。缺省 = zip.js 默认（当前时刻）。 */
export async function zipPack(entries: ZipEntry[], opts: { lastModDate?: Date } = {}) {
  ensureConfigured();
  const z = Z();
  const writer = new z.ZipWriter(new z.BlobWriter("application/zip"));
  for (const { path, data } of entries) {
    // level: 0 = STORE。PNG 已是压缩流，再 deflate 没意义还更慢。
    await writer.add(path, toZipReader(data), { level: 0, ...(opts.lastModDate ? { lastModDate: opts.lastModDate } : {}) });
  }
  return await writer.close();
}

// zip.js 只管**明文** zip（ora 本体 + 外层容器壳 + makePeek 抽缩略图）。
// **加解密一律走 .7z（src/sevenzip.js = 7z-wasm）**——7z-wasm 是真 7-Zip，连 v233-235 的老
// WinZip-AES **zip** payload 也能直接读（实测逐位还原），所以 zip.js 不需要任何加密 reader/writer。

/** 只读 zip 里**一个** entry（不解其余大块；CD 读目录 + 单 entry getData）。
 *  没有该 entry → null。makePeek（从 ora 抽缩略图）这类「大 zip 取小件」用。 */
export async function zipReadEntry(blob: Blob, path: string) {
  ensureConfigured();
  const z = Z();
  const reader = new z.ZipReader(new z.BlobReader(blob));
  try {
    const entries = await reader.getEntries();
    const e = entries.find((x: any) => !x.directory && x.filename === path);
    if (!e) return null;
    return await e.getData(new z.Uint8ArrayWriter());
  } finally { await reader.close(); }
}

/** @returns {Promise<Record<string, Uint8Array>>} { path: Uint8Array } */
export async function zipUnpack(blob: Blob) {
  ensureConfigured();
  const z = Z();
  const reader = new z.ZipReader(new z.BlobReader(blob));
  try {
    const entries = await reader.getEntries();
    /** @type {Record<string, Uint8Array>} */
    const out: Record<string, Uint8Array> = {};
    for (const e of entries) {
      if (e.directory) continue;
      out[e.filename] = await e.getData(new z.Uint8ArrayWriter());
    }
    return out;
  } finally { await reader.close(); }
}
