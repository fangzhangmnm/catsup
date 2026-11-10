// kernel-shim.mjs —— 内核测试在 node 里唯一要补的全局：ImageData（created 2026-11-10 by Claude Opus 5.5）。
// 内核拿 `new ImageData(data, w, h)` 当像素容器（getImageData 读口；白名单 = test/kernel-boundary.test.mjs），node 没有这个类。
// 这里和 dom-shim-first.mjs 里那一段是同一个最小实现（{data,width,height}）；不装别的 DOM 模拟——内核测试要了别的就不算内核测试。
if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = class ImageData {
    constructor(data, width, height) {
      if (typeof data === "number") { height = width; width = data; data = new Uint8ClampedArray(width * height * 4); }
      this.data = data; this.width = width; this.height = height ?? (data.length / 4 / width);
    }
  };
}

// zip.js：内核的 src/backend/zip.ts 不 import 它，读的是 globalThis.zip（浏览器里由 index.html 的 classic <script> 挂上）。
// node 里照 test/zip-node.mjs ensureZipLoaded 那几行挂一份（那个文件不能进名单：它另一个函数会 import 内核以外的 src/sevenzip.ts）。
// 以前 full-painting-roundtrip 能过，是靠全量里排在前面的测试先挂好了 zip；单独跑内核这一圈就得自己挂。
import fs from "node:fs";
if (!(globalThis.zip && globalThis.zip.ZipWriter)) {
  const code = fs.readFileSync(new URL("../vendor/zip-js/zip-full.min.js", import.meta.url), "utf8");
  const exp = {};
  new Function("exports", "module", "define", code).call(globalThis, exp, { exports: exp }, undefined);
  if (!exp.ZipWriter) throw new Error("kernel-shim: vendored zip.js did not load");
  globalThis.zip = exp;
}
