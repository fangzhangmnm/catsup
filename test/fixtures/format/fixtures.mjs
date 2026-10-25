// 冻结样本的 I/O（.mjs：test/*.ts 不拉 @types/node，node 内建只在 JS 里碰）。created 2026-09-20 by Claude Fable 5.1
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// 目录名 = `v<tag>`：整数时代 v1…v6（= 当时子结构 major 里最大的那个）；2026-10-25 起 tag = 全部拍子的签名（formatTag，如 v3.1.0-4.0.0-6.0.0-1.0.0-1.0.0-1.0.0）——
// 任何一个拍子动了就是新目录、新语料，守卫机械执法（test/format.test.ts「冻结样本语料」）。
export function fixtureDir(tag) { return join(here, `v${tag}`); }
export function hasFixtureDir(tag) { return existsSync(fixtureDir(tag)); }
export function listFixtures(tag) { return readdirSync(fixtureDir(tag)).filter((f) => f.endsWith(".glb")).sort(); }
export function readFixture(tag, name) { return new Uint8Array(readFileSync(join(fixtureDir(tag), name))); }
export function writeFixture(tag, name, bytes) { mkdirSync(fixtureDir(tag), { recursive: true }); writeFileSync(join(fixtureDir(tag), name), bytes); }
/** 全部语料目录的 tag（整数的在前按数值，签名的在后按字典序）。 */
export function listCorpusDirs() {
  const tags = readdirSync(here, { withFileTypes: true }).filter((d) => d.isDirectory() && /^v/.test(d.name)).map((d) => d.name.slice(1));
  const isInt = (t) => /^\d+$/.test(t);
  return tags.sort((a, b) => (isInt(a) && isInt(b) ? Number(a) - Number(b) : isInt(a) ? -1 : isInt(b) ? 1 : a.localeCompare(b)));
}
