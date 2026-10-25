// 页面里不许有重复 id（2026-10-25 Opus）：图标 sprite 内联进 index.html，<symbol id="help"> 和使用手册面板 id="help" 撞名，
// getElementById 拿到图标 → 「使用手册」从 v0.3.0 起一直打不开。以后收新图标撞名会在这里红。
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string };
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("页面 id", () => {
  it("index.html 里没有重复 id（含内联的图标 sprite）", () => {
    const seen = new Map<string, number>();
    for (const m of html.matchAll(/\bid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
    const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
    assert(dup.length === 0, `重复 id：${dup.join(", ")}`);
  });
});
