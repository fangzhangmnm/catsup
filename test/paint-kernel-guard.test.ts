// 画画内核拷贝的守卫（贴图主线 0-1；created 2026-11-10 by Claude Opus 5.5；施工单 ai-docs/20261110-paint-workorders-1.md）。
// ① src/paint/kernel/ 下每个文件的 sha256 = KERNEL-MANIFEST.json 里记的，不多不少（拦手改）。内核只在画画仓改；收新内核 = scripts/pull-paint-kernel.sh <提交> 再拉。
//    只看仓内的文件和清单，不去读画画仓（家规：测试不引用仓外的东西）。
// ② src/ 里除了 src/paint/ 自己，不许直接 import src/paint/kernel/ 的文件（要用经 src/paint/ 里自己的接缝）。
import { describe, it, eq, assert } from "./runner.mjs";
interface Dirent { name: string; isDirectory(): boolean }
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): Dirent[]; readFileSync(u: URL, enc?: "utf8"): string & Uint8Array };
const crypto = (await import("node:crypto" as string)) as { createHash(alg: string): { update(b: Uint8Array): { digest(enc: "hex"): string } } };

const SRC = new URL("../src/", import.meta.url);
const KERNEL = new URL("paint/kernel/", SRC);
function* walk(dir: URL, base: URL): Generator<string> {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(d.isDirectory() ? `${d.name}/` : d.name, dir);
    if (d.isDirectory()) yield* walk(u, base); else yield u.href.slice(base.href.length);
  }
}
const manifest = JSON.parse(fs.readFileSync(new URL("KERNEL-MANIFEST.json", KERNEL), "utf8")) as { source: { commit: string; version: string }; files: Record<string, string> };

describe("画画内核拷贝（src/paint/kernel/）", () => {
  it("每个文件的 sha256 和 KERNEL-MANIFEST.json 一致，不多不少（手改了 = 红；改内核去画画仓，再 pull-paint-kernel.sh）", () => {
    const onDisk = [...walk(KERNEL, KERNEL)].filter((f) => f !== "KERNEL-MANIFEST.json").sort();
    const listed = Object.keys(manifest.files).sort();
    const extra = onDisk.filter((f) => !(f in manifest.files)), missing = listed.filter((f) => !onDisk.includes(f));
    eq(extra.join(", "), "", "清单里没有的文件");
    eq(missing.join(", "), "", "清单里有、盘上没有的文件");
    const changed = onDisk.filter((f) => crypto.createHash("sha256").update(fs.readFileSync(new URL(f, KERNEL))).digest("hex") !== manifest.files[f]);
    eq(changed.join(", "), "", `被改过的内核文件（来源 WeebPaint ${manifest.source.version} @ ${manifest.source.commit.slice(0, 7)}）`);
  });
  it("src/paint/ 以外不直接 import 内核文件", () => {
    const bad: string[] = [];
    for (const rel of walk(SRC, SRC)) {
      if (rel.startsWith("paint/") || !/\.(m?[jt]s)$/.test(rel)) continue;
      const text = fs.readFileSync(new URL(rel, SRC), "utf8");
      for (const m of text.matchAll(/(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)) {
        if (!m[1].startsWith(".")) continue;
        const target = new URL(m[1], new URL(rel, SRC)).href;
        if (target.startsWith(KERNEL.href)) bad.push(`src/${rel} -> ${m[1]}`);
      }
    }
    assert(bad.length === 0, `直接 import 了内核（经 src/paint/ 的接缝走）：\n  ${bad.join("\n  ")}`);
  });
});
