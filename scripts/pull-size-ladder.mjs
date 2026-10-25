#!/usr/bin/env node
// 从物体尺寸梯子仓鼠的交货区取货（宿主 pull、库永不 push；CatsUp 不改仓鼠仓里的文件）。B43「人的尺度参考」。
// 用法：node scripts/pull-size-ladder.mjs
//   数据 ladder-v3.json → vendor/size-ladder/（运行时懒加载，订阅了才拉）
//   参考实现 ladder-query.mjs → src/vendor/size-ladder/（打进包，原样不改）
// 两个文件的 sha256 钉在下面：交货换了版本（v4…）就是有意识地改这两个钉 + 测试里的期望，不会静默漂。
// 交接说明 = 仓鼠仓 export/catsup/HANDOFF.md。created 2026-10-25 by Claude Opus 5.5
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(homedir(), "jupyter/20260813 MyLlamaReborn/20261024 物体尺寸梯子/export/catsup");
const PIN = {
  "ladder-v3.json": "e161c8835a16024192b6206fe0ca977aa8b472f7f7981039ca15a11e6b5f278f",   // = 仓鼠 HANDOFF / catalog.json 写的那个（v3 = schema size-ladder/4，提交 74a2d09）
  "ladder-query.mjs": "850dba2ba499b5f7028f7e66b3a99bbae36e235e313facdf7ea356896eccac80",
};
const DEST = { "ladder-v3.json": "vendor/size-ladder", "ladder-query.mjs": "src/vendor/size-ladder" };
const root = fileURLToPath(new URL("..", import.meta.url));   // 不用 .pathname：仓库路径里有空格，pathname 会编成 %20
for (const [name, sha] of Object.entries(PIN)) {
  const bytes = readFileSync(join(SRC, name));
  const got = createHash("sha256").update(bytes).digest("hex");
  if (got !== sha) { console.error(`✗ ${name} sha256 = ${got}，钉的是 ${sha}（仓鼠出了新版本？先读 HANDOFF.md 再改钉）`); process.exit(1); }
  const dir = join(root, DEST[name]);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), bytes);
  console.log(`✓ ${name} → ${DEST[name]}/（sha256 ${sha.slice(0, 12)}…）`);
}
writeFileSync(join(root, "vendor/size-ladder/README.md"), [
  "# 物体尺寸梯子（仓鼠交货的快照，生成物勿手改）",
  "",
  "- 出处：`~/jupyter/20260813 MyLlamaReborn/20261024 物体尺寸梯子/export/catsup/`（独立 git；v3 在 74a2d09 发布）。",
  "- 取货：`node scripts/pull-size-ladder.mjs`（核 sha256 再拷；钉在脚本里）。",
  "- `ladder-v3.json`：schema size-ladder/4，516 个概念、845 个值，数据一律存米；选单项带 inherits（继承）+ reminders（新手提醒 id），概念带 replaces（删掉父类）。",
  "- 参考实现 `ladder-query.mjs` 拷在 `src/vendor/size-ladder/`（打进包）。",
  "- 要改数据：在 CatsUp 总账记一条，或者告诉 user 让仓鼠改；不在这里改。",
  "- 新手提醒（`reminders[]`，CatsUp 界面上也叫「新手提醒」，user 2026-10-25 定）按选单项给（`menu[].reminders`），要让用户看得到；DnD 的值来自 SRD 5.1（第五版 2014 规则），CatsUp 另写一行 CC BY 4.0 署名。",
  "",
].join("\n"));
console.log("✓ vendor/size-ladder/README.md");
