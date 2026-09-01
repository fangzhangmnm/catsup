// 零依赖 test runner（抄 WebPaint 现役 test/runner.mjs；家族纪律：不引 jest/vitest）。
// ESM 模块是单例 → test 文件与 run.mjs 共享同一 _tests 数组。
let _suite = "";
const _tests = [];
const _todos = [];

export function describe(name, fn) { _suite = name; fn(); _suite = ""; }
export function it(name, fn) { _tests.push({ name: `${_suite} › ${name}`, fn }); }
export function test(name, fn) { _tests.push({ name: `${_suite ? _suite + " › " : ""}${name}`, fn }); }
export function tick() { return new Promise((r) => setTimeout(r, 0)); }
// 待办规格：golden corpus 里当前里程碑还没实现的行为（M2+/3D 场景）。
// 不执行、不计失败——是验收标准的红线清单，落地后改成 it() 即可。
export function todo(name) { _todos.push(`${_suite ? _suite + " › " : ""}${name}`); }

export function assert(cond, msg) { if (!cond) throw new Error(msg || "断言失败"); }
export function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || "不相等"}: 期望 ${JSON.stringify(expected)}，实得 ${JSON.stringify(actual)}`);
}

export async function run() {
  let pass = 0, fail = 0;
  for (const t of _tests) {
    try { await t.fn(); console.log("  \x1b[32m✓\x1b[0m", t.name); pass++; }
    catch (e) { console.log("  \x1b[31m✗\x1b[0m", t.name, "\n      ", e.message); fail++; }
  }
  if (_todos.length) {
    console.log("");
    for (const name of _todos) console.log("  \x1b[33m○ todo\x1b[0m", name);
  }
  console.log(`\n  ${pass} passed, ${fail} failed, ${_todos.length} todo\n`);
  if (fail) process.exit(1);
}
