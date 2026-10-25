#!/usr/bin/env node
// 冻结当前格式版本的 golden 样本进 test/fixtures/format/v<formatTag>/（立宪 §7：每发过一版冻结一份；目录名 = 全部拍子的签名，2026-10-25 起；已有同名文件不覆盖——
// 老样本是语料，永不改写；要更新语料 = 新版本目录）。用法：node scripts/freeze-format-fixtures.mjs [--force]
// created 2026-09-20 by Claude Fable 5.1
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SCENES, SCENE_DOCS } from "../test/format-scenes.ts";
import { newDocument, writeCatsup, documentFromScene, formatTag } from "../src/format/index.ts";
import { fixtureDir, writeFixture } from "../test/fixtures/format/fixtures.mjs";

const force = process.argv.includes("--force");
// 样本目录 = 全部拍子的签名（哪个子结构的 major / minor / patch 动了都要冻一份新语料）
const v = formatTag();
const all = [
  ...Object.entries(SCENES).map(([name, make]) => [name, () => newDocument(make().toBrep(), name)]),
  ...Object.entries(SCENE_DOCS).map(([name, make]) => [name, () => documentFromScene(make(), name)]),
];
for (const [name, mk] of all) {
  const file = `${name}.glb`;
  if (!force && existsSync(join(fixtureDir(v), file))) { console.log(`keep   v${v}/${file}`); continue; }
  const bytes = writeCatsup(mk());
  writeFixture(v, file, bytes);
  console.log(`freeze v${v}/${file} ${bytes.byteLength} B`);
}
