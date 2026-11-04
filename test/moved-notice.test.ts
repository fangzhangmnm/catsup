// 旧地址的搬家一行（家族根 ai-docs/20261103-catsup-domain-move.md §0.2）。created 2026-11-03 by Claude Opus 5.5
//   真 bundle 那一半 = test/probes/probe-moved-notice.mjs；离线壳遇到 301 = test/probes/probe-sw-301.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { movedNoticeFor } from "../src/app/moved-notice.ts";
import { SITE_URL } from "../src/config.ts";

const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as {
  readFileSync: (p: string, e: string) => string; readdirSync: (p: string) => string[]; statSync: (p: string) => { isDirectory(): boolean };
};

describe("搬家一行", () => {
  it("旧地址正式版 → 新地址根", () => {
    eq(movedNoticeFor({ hostname: "fangzhangmnm.github.io", pathname: "/catsup/" })?.url, `${SITE_URL}/`);
  });
  it("旧地址开发版 → 新地址 /dev/", () => {
    eq(movedNoticeFor({ hostname: "fangzhangmnm.github.io", pathname: "/catsup/dev/" })?.url, `${SITE_URL}/dev/`);
  });
  it("新地址、本机预览、双击打开都没有", () => {
    for (const hostname of ["catsup.weebpaint.com", "127.0.0.1", "localhost", ""]) eq(movedNoticeFor({ hostname, pathname: "/dev/" }), null);
  });
  it("文案不分搬前搬后，不写「要搬」，要说全部导出和口令", () => {
    const t = movedNoticeFor({ hostname: "fangzhangmnm.github.io", pathname: "/catsup/" })!.text;
    assert(t.includes("catsup.weebpaint.com") && t.includes("全部导出") && t.includes("口令"), t);
    assert(!t.includes("要搬"), t);
  });
  it("官网网址只住 config.ts 一处", () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = `${d}/${n}`; return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });
    const hits = walk("src").filter((p) => readFileSync(p, "utf8").includes("catsup.weebpaint.com"));
    eq(hits.join(","), "src/config.ts");
  });
});
