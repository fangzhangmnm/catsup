// 工程文件名字（账本 UX39 / 导出设计稿 §6；2026-10-28 Claude Opus 5.5）：新文档 .catsup、老 .glb 照认；改名保留后缀；
// 云库种类表两行（同一个 kind）不歧义、两种后缀都切得出主干；app-store 真的声明了两行（结构守卫）。
import { describe, it, eq, assert } from "./runner.mjs";
import { bareName, docSuffixOf, fullName, isDocName } from "../src/app/doc-names.ts";
import { DOC_EXT, DOC_EXTS, LEGACY_DOC_EXT } from "../src/config.ts";
import { createIdentifiers, validateDocKinds } from "../node_modules/@internal/store/dist/base/identifiers.js";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = (p: string): string => fs.readFileSync(url.fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("工程文件名字（doc-names.ts）", () => {
  it("新文档 = .catsup；老 .glb 也认；大小写不敏感；别的后缀不是文档", () => {
    eq(DOC_EXT, ".catsup"); eq(LEGACY_DOC_EXT, ".glb"); eq(DOC_EXTS.join(","), ".catsup,.glb");
    eq(fullName("夹", "房子"), "夹/房子.catsup"); eq(fullName("", "房子"), "房子.catsup");
    eq(bareName("夹/房子.catsup"), "房子"); eq(bareName("夹/房子.glb"), "房子"); eq(bareName("房子.GLB"), "房子"); eq(bareName("房子.catsup.glb"), "房子.catsup");
    assert(isDocName("a.catsup") && isDocName("a.glb") && isDocName("A.CATSUP")); assert(!isDocName("a.obj") && !isDocName("a.zip"));
    eq(docSuffixOf("夹/老的.glb"), ".glb"); eq(docSuffixOf("新的.catsup"), ".catsup"); eq(docSuffixOf("x.png"), "");
  });
  it("改名只改主干：老 .glb 工程改名还是 .glb", () => {
    const cur = "夹/老房子.glb";
    eq(fullName("夹", "新名字", docSuffixOf(cur)), "夹/新名字.glb");
  });
  it("云库种类表：两行同一个 kind 不歧义，两种后缀都切得出主干、拼回去不变", () => {
    const rows = [{ kind: "glb", suffix: DOC_EXT, container: "raw" as const }, { kind: "glb", suffix: LEGACY_DOC_EXT, container: "raw" as const }];
    validateDocKinds(rows);
    const ids = createIdentifiers(rows);
    for (const n of ["夹/房子.catsup", "夹/房子.glb"]) { const p = ids.parse(n)!; assert(!!p, n); eq(p.stem, "房子"); eq(ids.join(p), n); }
    eq(ids.parse("夹/房子.obj"), null);
  });
  it("app-store 真的声明了两行（.catsup + 老 .glb），图库缩略图种类仍是 glb", () => {
    const s = src("../src/app-store.ts");
    assert(/DOC_KINDS[^=]*=\s*\[\{ kind: "glb", suffix: DOC_EXT, container: "raw" \}, \{ kind: "glb", suffix: LEGACY_DOC_EXT, container: "raw" \}\]/.test(s), "DOC_KINDS 两行");
    assert(/kinds: \["glb"\]/.test(src("../src/app/gallery-host.ts")), "缩略图 kinds");
  });
});
