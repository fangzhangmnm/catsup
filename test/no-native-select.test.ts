// 不许再出现原生下拉（user 2026-10-24「和weebpaint一样用多媒体下拉框深模块，不要用ios自带的。丑」）：一律走 src/app/ui/select-field.ts。
// created 2026-10-24 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };
const at = (f: string) => new URL(`../${f}`, import.meta.url);
const read = (f: string) => fs.readFileSync(at(f), "utf8");

describe("下拉标准件", () => {
  it("index.html 没有 <select> / <option>", () => {
    assert(!/<select\b|<option\b/i.test(read("index.html")), "index.html 里还有原生下拉");
  });
  it("src 里没有人建原生 select / option", () => {
    const hits = fs.readdirSync(at("src"), { recursive: true }).filter((f) => /\.ts$/.test(f) && !f.includes("vendor") && /createElement\(\s*["'](select|option)["']\s*\)|HTMLSelectElement/.test(read(`src/${f}`)));
    assert(hits.length === 0, `这些文件在用原生下拉：${hits}`);
  });
});
