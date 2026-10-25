// 参考窗单一接缝（同 MoonSinger test/reference-guard.test.ts）：src 里只有 src/app/reference-host.ts 认识 @internal/reference-window；
// format 层（零 DOM、node 可跑）永远不认识它——参考窗的目录对 format 是不透明字节（契约 §5.8）。sprite 里有库要的全部图标。created 2026-10-25 by Claude Opus 5.5
import { describe, it, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: true }): string[] };
const at = (f: string) => new URL(`../${f}`, import.meta.url);
const read = (f: string) => fs.readFileSync(at(f), "utf8");

describe("参考窗接缝", () => {
  it("src 里只有 src/app/reference-host.ts import @internal/reference-window", () => {
    const hits = fs.readdirSync(at("src"), { recursive: true }).filter((f) => /\.ts$/.test(f) && !f.includes("vendor") && /from\s+["']@internal\/reference-window|import\s+["']@internal\/reference-window/.test(read(`src/${f}`)));
    assert(hits.length === 1 && hits[0].replace(/\\/g, "/") === "app/reference-host.ts", `这些文件认识参考窗库：${hits}`);
  });
  it("index.html 内联的 sprite 有参考窗库要的全部图标（REF_ICON_IDS）", () => {
    const ids = ["folder", "paste", "cloud", "picture-in-picture", "one-to-one", "trash-can", "x", "new", "chevron-left", "chevron-right", "back", "forward", "check", "play", "pause", "skip-prev", "skip-next"];
    const html = read("index.html");
    const missing = ids.filter((id) => !new RegExp(`<symbol[^>]*id="${id}"`).test(html) || new RegExp(`<symbol data-missing="1" id="${id}"`).test(html));
    assert(missing.length === 0, `缺图标：${missing}（python3 "../20260708 SVG Icons/extract-icons.py" assets/icons.svg … → python3 scripts/inline-sprites.py）`);
  });
});
