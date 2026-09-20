// 冻结样本的 I/O（.mjs：test/*.ts 不拉 @types/node，node 内建只在 JS 里碰）。created 2026-09-20 by Claude Fable 5.1
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export function fixtureDir(version) { return join(here, `v${version}`); }
export function listFixtures(version) { return readdirSync(fixtureDir(version)).filter((f) => f.endsWith(".glb")).sort(); }
export function readFixture(version, name) { return new Uint8Array(readFileSync(join(fixtureDir(version), name))); }
export function writeFixture(version, name, bytes) { mkdirSync(fixtureDir(version), { recursive: true }); writeFileSync(join(fixtureDir(version), name), bytes); }
