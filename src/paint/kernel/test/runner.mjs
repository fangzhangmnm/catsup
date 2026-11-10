// 零依赖 test runner（spec §5.5：不引 jest/vitest）。
// ESM 模块是单例 → test 文件与 run.mjs 共享同一 _tests 数组。
let _suite = "";
const _tests = [];
const _todos = [];

// 每测默认 10s 超时墙（user 2026-08-10：「每个测试给一个可发起时申请 extension 的 10 秒上限」）
// ——把「挂死」永久变成响亮红（当日 boot smoke 无限挂把整套件吊死 34min+ 的教训）。
// 确需更久的测试在声明处自带延长：it(name, fn, { timeout: 30_000 })。
// JS 限制：超时只能判负+继续跑后面的（杀不掉泄逸的 promise，其残余输出可能穿插）。
const DEFAULT_TEST_TIMEOUT_MS = 10_000;
export function describe(name, fn) { _suite = name; fn(); _suite = ""; }
export function it(name, fn, opts) { _tests.push({ name: `${_suite} › ${name}`, fn, timeoutMs: opts?.timeout ?? DEFAULT_TEST_TIMEOUT_MS }); }
// 家族 store 引擎测试（从 JRP 的 _harness.ts 风格移植）用扁平 test()/tick()——注册进同一 _tests 队列，
// 与 describe/it 共存、同一 run() 执行。import 从 ./_harness.ts 改指 ./runner.mjs 即可。
export function test(name, fn, opts) { _tests.push({ name: `${_suite ? _suite + " › " : ""}${name}`, fn, timeoutMs: opts?.timeout ?? DEFAULT_TEST_TIMEOUT_MS }); }
export function tick() { return new Promise((r) => setTimeout(r, 0)); }
// 待办规格：描述 Store（C1+）必须满足、但当前代码还没实现的行为。
// 不执行、不计失败——是验收标准 / TDD 的红线清单，落地后改成 it() 即可。
export function todo(name) { _todos.push(`${_suite ? _suite + " › " : ""}${name}`); }

export function assert(cond, msg) { if (!cond) throw new Error(msg || "断言失败"); }
export function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || "不相等"}: 期望 ${JSON.stringify(expected)}，实得 ${JSON.stringify(actual)}`);
}
export async function throwsStatus(fn, status, msg) {
  try { await fn(); }
  catch (e) {
    if (e.status === status) return e;
    throw new Error(`${msg || "错误状态不符"}: 期望 status=${status}，实得 status=${e.status} (${e.message})`);
  }
  throw new Error(`${msg || "应当抛错"}: 期望 status=${status}，但没抛`);
}

export async function run() {
  // C8 测试分级：TEST_FILTER=<子串> 只跑名字匹配的测试（中间棒「只跑相关模块+tsc」的开发期快捷）。
  // 只是过滤器不是分层——交付验收仍跑全量 npm test（+test:full 全量层）；被跳过的文件级收尾
  // （如 shape-brush 的 tile 释放 it）可能一并被跳，FR 泄漏警告刷屏属预期噪音。
  const filter = process.env.TEST_FILTER;
  const tests = filter ? _tests.filter((t) => t.name.includes(filter)) : _tests;
  if (filter) console.log(`\n  TEST_FILTER="${filter}" → ${tests.length}/${_tests.length} 条（开发期快捷，交付仍跑全量）\n`);
  let pass = 0, fail = 0;
  const t0all = performance.now();
  // 全量硬线（user 2026-08-10）：<1min 随便；1-2min 需要干预（下面黄警告）；2min 硬切——
  // watchdog 直接 exit 1 并报当前在跑的测试（与每测 10s 墙互补：单测挂死归 10s 墙，整体膨胀归这里）。
  let _current = "(未开始)";
  const hardWall = setTimeout(() => {
    console.log(`\n  \x1b[31m✗ 全量 >2min 硬切\x1b[0m（硬线 <1min；当前在跑：${_current}）\n`);
    process.exit(1);
  }, 120_000);
  for (const t of tests) {
    _current = t.name;
    // 每条测试立刻 flush 耗时（user 2026-08-10：计时别梭哈）；≥1s 标黄，肉眼即抓大头。
    const t0 = performance.now();
    const ms = () => { const v = performance.now() - t0; return v >= 1000 ? `\x1b[33m${(v / 1000).toFixed(1)}s\x1b[0m` : `\x1b[90m${v.toFixed(0)}ms\x1b[0m`; };
    let wall = null;
    const timedOut = new Promise((_, rej) => { wall = setTimeout(() => rej(new Error(`超时 >${t.timeoutMs / 1000}s（挂死？需更久在声明处 it(name,fn,{timeout:ms}) 申请）`)), t.timeoutMs); });
    try { await Promise.race([t.fn(), timedOut]); console.log(`  \x1b[32m✓\x1b[0m ${t.name} ${ms()}`); pass++; }
    catch (e) { console.log(`  \x1b[31m✗\x1b[0m ${t.name} ${ms()}\n      `, e.message); fail++; }
    finally { clearTimeout(wall); }
  }
  clearTimeout(hardWall);
  const totalMs = performance.now() - t0all;
  const totalS = (totalMs / 1000).toFixed(1);
  if (totalMs > 60_000) console.log(`\n  \x1b[33m⚠ 全量 ${totalS}s 超过 1min 硬线——需要干预（拆慢测/查挂死；2min 会被硬切）\x1b[0m`);
  if (_todos.length) {
    console.log("");
    for (const name of _todos) console.log("  \x1b[33m○ todo\x1b[0m", name);
  }
  console.log(`\n  ${pass} passed, ${fail} failed, ${_todos.length} todo — ${totalS}s\n`);
  if (fail) process.exit(1);
}
