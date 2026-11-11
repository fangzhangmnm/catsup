// test/par-worker.mjs —— 并行运行器的工人（test/par.mjs fork 出来）。created 2026-11-10 by Claude Opus 5.5（测试分档第四节，ai-docs/20261110-test-tiers.md）
// 一次收一个测试文件：import（登记）→ runBatch（跑完、清空）→ 把计数、耗时、这份文件打出来的字交回去。
// 同一个工人里先后跑的文件共享模块单例，和串跑（test/run.mjs）一样；不一样的只是「邻居」是谁。
import { inspect } from "node:util";
import { runBatch } from "./runner.mjs";

let current = null;   // 正在跑的那一份：{ file, out, extraFail }
const say = (...a) => { if (current) current.out.push(a.map((x) => (typeof x === "string" ? x : inspect(x))).join(" ")); };
const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
// 测试之外飞出来的错（没接住的 promise / 异常）：记在正在跑的那一份头上，算红，不让工人整个倒掉
const stray = (kind) => (e) => { if (current) { current.extraFail.push(`${kind}: ${e?.stack ?? e}`); } else orig.error(`[par-worker] ${kind} 不在任何一份文件里：`, e); };
process.on("unhandledRejection", stray("没接住的 promise"));
process.on("uncaughtException", stray("没接住的异常"));

process.on("message", async (msg) => {
  if (!msg || typeof msg.file !== "string") return;
  current = { file: msg.file, out: [], extraFail: [] };
  console.log = console.error = console.warn = console.info = say;
  const t0 = performance.now();
  let importMs = 0, r;
  try {
    await import(new URL(msg.file, import.meta.url).href);
    importMs = performance.now() - t0;
    r = await runBatch();
  } catch (e) {
    importMs = performance.now() - t0;
    say(`  \x1b[31m✗\x1b[0m ${msg.file} 载入就炸了\n       ${e?.stack ?? e}`);
    r = { pass: 0, fail: 1, todo: 0, failed: [`${msg.file}（载入）`] };
  }
  await new Promise((res) => setTimeout(res, 0));   // 让这一份留下的 promise 错有机会落在它自己头上
  Object.assign(console, orig);
  const c = current; current = null;
  for (const x of c.extraFail) c.out.push(`  \x1b[31m✗\x1b[0m ${x}`);
  process.send({ file: c.file, importMs, runMs: performance.now() - t0 - importMs, pass: r.pass, fail: r.fail + c.extraFail.length, todo: r.todo, failed: [...r.failed, ...c.extraFail.map((x) => x.split("\n")[0])], out: c.out });
});
process.send({ ready: true });
