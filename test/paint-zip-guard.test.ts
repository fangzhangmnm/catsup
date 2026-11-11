// 画画内核靠一个全局的 zip（贴图主线 1-8b 第七节）：三维在用内核之前把它备好，不改内核。created 2026-11-11 by Claude Opus 5.5
// ① index.html 里 zip.js 是 classic defer 脚本，排在主模块前面（defer 和 module 都按文档顺序执行 → 主模块执行时 window.zip 已经在）。
// ② 内核拷来的 zip.js 和三维 vendor 的那份逐字节相同（同一个库、同一个版本）。③ 存盘那条路第一步先查 globalThis.zip（paint/save.ts），不在 = 明说存不了。
import { describe, it, eq, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc?: string): string | Uint8Array };

describe("zip.js 在内核之前备好（1-8b）", () => {
  it("index.html：zip.js 是 classic defer、排在主模块前面", () => {
    const html = fs.readFileSync("index.html", "utf8") as string;
    const zipAt = html.search(/<script\s+defer\s+src="\.\/vendor\/zip-js\/zip-full\.min\.js"><\/script>/), modAt = html.search(/<script\s+type="module"\s+src="\.\/dist\//);
    assert(zipAt >= 0, "有 zip.js 那一行（classic defer）"); assert(modAt >= 0, "有主模块那一行");
    assert(zipAt < modAt, "zip.js 在主模块前面");
  });
  it("内核拷来的 zip.js = 三维 vendor 的那份（逐字节）", () => {
    const a = fs.readFileSync("vendor/zip-js/zip-full.min.js") as Uint8Array, b = fs.readFileSync("src/paint/kernel/vendor/zip-js/zip-full.min.js") as Uint8Array;
    eq(a.length, b.length, "长度"); assert(a.every((x, i) => x === b[i]), "逐字节");
  });
  it("存盘那条路：确实有画要编码时才查 globalThis.zip（行为在 paint-save.test.ts「zip 没加载上」那条）", () => {
    const src = fs.readFileSync("src/paint/save.ts", "utf8") as string;
    assert(/\.some\(\(p\) => \(p\.kind === "encode" && !p\.reuseOra\) \|\| p\.kind === "blank"\) && !\(globalThis as \{ zip\?: unknown \}\)\.zip\) throw new ZipMissingError/.test(src), "只在要编码时查");
  });
});
