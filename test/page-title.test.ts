// 网页标题 = 只是「CatsUp」：index.html 写死，运行时谁都不改 document.title。
// 文档名进标题 = 浏览器历史按文档名记那个地址（user 2026-10-14「就放一个自己的名字，不解释，google也这么干的」，全家族同一标准）。
// created 2026-10-14 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };
const at = (f: string) => new URL(`../${f}`, import.meta.url);
const read = (f: string) => fs.readFileSync(at(f), "utf8");

describe("网页标题", () => {
  it("index.html 的 <title> 只是 CatsUp", () => {
    const t = read("index.html").match(/<title>([^<]*)<\/title>/)?.[1];
    assert(t === "CatsUp", `<title> 是「${t}」`);
  });
  it("src 里没有人改 document.title", () => {
    const hits = fs.readdirSync(at("src"), { recursive: true }).filter((f) => /\.(ts|mjs|js)$/.test(f) && !f.includes("vendor") && /document\.title\s*=/.test(read(`src/${f}`)));
    assert(hits.length === 0, `这些文件在改 document.title：${hits}`);
  });
});
