#!/usr/bin/env node
// 冻结当前格式版本的 golden 样本进 test/fixtures/format/v<N>/（立宪 §7：每发过一版冻结一份；已有同名文件不覆盖——
// 老样本是语料，永不改写；要更新语料 = 新版本目录）。用法：node scripts/freeze-format-fixtures.mjs [--force]
// created 2026-09-20 by Claude Fable 5.1
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SCENES } from "../test/format-scenes.ts";
import { newDocument, writeCatsup, EXTENSION_VERSIONS } from "../src/format/index.ts";
import { fixtureDir, writeFixture } from "../test/fixtures/format/fixtures.mjs";

const force = process.argv.includes("--force");
const v = EXTENSION_VERSIONS.CATSUP_brep;
for (const [name, make] of Object.entries(SCENES)) {
  const file = `${name}.glb`;
  if (!force && existsSync(join(fixtureDir(v), file))) { console.log(`keep   v${v}/${file}`); continue; }
  const bytes = writeCatsup(newDocument(make().toBrep(), name));
  writeFixture(v, file, bytes);
  console.log(`freeze v${v}/${file} ${bytes.byteLength} B`);
}
