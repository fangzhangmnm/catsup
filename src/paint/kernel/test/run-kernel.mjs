// run-kernel.mjs —— 只跑「内核自己的测试」（test/kernel-tests.json 里那张名单）。created 2026-11-10 by Claude Opus 5.5
// 两处用它：① 本仓 `node --expose-gc test/run-kernel.mjs` = 内核那一圈单独跑一遍（npm test 照旧跑全量，这里只是子集）；
// ② CatsUp 把内核原样拷过去（scripts/pull-paint-kernel.sh 按名单拉文件，这个文件也拉），在那边接进 npm test。
// 和 run.mjs 的差别：不装 DOM 模拟（内核测试不该要它——要了就不是内核测试，名单守卫 test/kernel-boundary.test.mjs 会红）、不跑界面那一层。
// 泄漏门和 run.mjs 末尾那段同一个读法（开了 --expose-gc 才查）。
import "./kernel-shim.mjs";   // 第一个：ImageData（内核唯一要的全局）
import fs from "node:fs";
import { run } from "./runner.mjs";

const here = new URL(".", import.meta.url);
const list = JSON.parse(fs.readFileSync(new URL("./kernel-tests.json", here), "utf8"));
for (const t of list.tests) await import(new URL(`../${t}`, here).href);
await run();
if (globalThis.gc) {
  const { setTilePoolLeakReporter } = await import("../src/backend/tiles/app-tile-pool.ts");
  const { CpuTilePool } = await import("../src/backend/tiles/cpu-tile-pool.ts");
  setTilePoolLeakReporter((info) => { console.error("  [leak-gate] " + info); });
  for (let i = 0; i < 3; i++) { globalThis.gc(); await new Promise((r) => setTimeout(r, 30)); }
  const leaks = CpuTilePool.leaksSeen;
  if (leaks) { console.error(`\n  [leak-gate] ${leaks} TileHandle(s) leaked (still unreleased at GC) — fix the test/code that took a handle and never released it`); process.exit(1); }
  console.log("  [leak-gate] 0 leaks");
}
