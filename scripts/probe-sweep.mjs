#!/usr/bin/env node
// scripts/probe-sweep.mjs —— 全部探针串行整跑一遍，和底账 test/probes/probe-ledger.json 比，只报三样：新红、新绿、还红着的。created 2026-11-11 by Claude Opus 5.5
// 统筹 11-11 定的规矩：每批收尾整跑一次，放后台跑、不卡队（照常做下一张单）；新红 = 停下来（这个脚本退出码 1）；目标是施工单开工时底账里「已知红」那一栏是空的。
// 用时用 performance.now()（墙上钟会被往回拨）；每个探针记开跑时的负载（1 分钟平均）；新红先重跑一次，重跑绿 = 偶发这次红（报出来、不停），重跑还红才是新红。
// 只跑底账里 role 是 guard 的（没写 = guard）；scaffold = 做某张单时对着看的细探针，不进整跑（--only 点名的照跑）。末尾报最慢的二十个和总用时（统筹 11-11：先量时间花在哪再定怎么省）。
// 用法：node scripts/probe-sweep.mjs [--only=probe-a,probe-b] [--models=<真模型文件夹>] [--timeout=900] [--logs=<目录>] [--compare=v0.19.47]
//   跑的是这个仓现在的构建：脚本自己在仓根起一个 http.server（端口自选），不用手边开着的服务。先 bash scripts/build.sh。
//   串行跑（不并行：软件显卡抢核会跑出假红）。退出码 0 = 绿；红的用 scripts/probe-why-red.mjs 打出红在哪一条。
//   --compare=<版本>：新红的那几个，再拿那一版的发版提交干净构建出来的跑一遍（临时 git worktree --detach + 自己起服务），说清那一版红不红。
//     规矩写死：比旧版本只用从发版提交干净构建出来的，不收网址、不用手边开着的服务（统筹 11-11：用了不干净的服务出过一次错判）。
//   档（统筹 11-12；测试分档页第五节）：默认 = 守卫档（role guard，没写 = guard）；--tier=perf = 性能档（role perf 的整个文件 + 守卫档文件里写了 perfArgs 的、带上那几个参数再跑一遍量的那一半）；
//   --redline = 只跑红线那一小组（底账 redline: true；守丢数据的：锁每层都拦、存盘前后一致、撤销逐位还原、文件格式来回、崩溃快照），每次跑完记一笔到仓的 .git/catsup-redline-runs.jsonl
//     （哪个提交、哪天、全绿没有；推正式版前查这个）。--at=<提交> = 对着那个提交干净构建（临时 git worktree --detach + build）跑；探针用的是这里的（和 --compare 一样）。
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir, loadavg, setPriority } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { whyRed } from "./probe-why-red.mjs";

try { setPriority(10); } catch { /* 改不了优先级就照常跑 */ }   // 整跑整个低优先级（统筹 11-11：这台机器上还有别的会话在跑）；子进程和它们起的浏览器跟着
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d = null) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const only = arg("only")?.split(",").map((s) => s.replace(/\.m[jt]s$/, "")) ?? null;
const models = arg("models"), timeoutS = Number(arg("timeout", "900")), compare = arg("compare"), tier = arg("tier", "guard"), redline = process.argv.includes("--redline"), at = arg("at");
if (tier !== "guard" && tier !== "perf") { console.error(`--tier 只认 guard / perf（给的是 ${tier}）`); process.exit(2); }
const logs = arg("logs", path.join(tmpdir(), `catsup-probe-sweep-${Date.now()}`));   // 墙上钟：只当文件夹名里不重复的后缀
mkdirSync(logs, { recursive: true });
const ledger = JSON.parse(readFileSync(path.join(root, "test/probes/probe-ledger.json"), "utf8")).probes;
const files = readdirSync(path.join(root, "test/probes")).filter((f) => /\.m[jt]s$/.test(f) && !f.startsWith("_") && ledger[f]?.state !== "helper")
  .filter((f) => only ? only.includes(f.replace(/\.m[jt]s$/, "")) : redline ? ledger[f]?.redline === true : tier === "perf" ? (ledger[f]?.role === "perf" || !!ledger[f]?.perfArgs) : (ledger[f]?.role ?? "guard") === "guard").sort();
if (!files.length) { console.error("一个探针都没选中 = 不算绿（一条都没查）"); process.exit(2); }
/** 这个文件这一档多带的参数（性能档：perfArgs）。 */
const extraArgs = (f) => (tier === "perf" && ledger[f]?.role !== "perf" ? ledger[f]?.perfArgs ?? [] : []);

/** 在 dir 起 http.server，返回 { url, stop }。 */
async function serve(dir) {
  const port = 8900 + Math.floor(Math.random() * 90);
  const p = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: dir, stdio: "ignore" });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) { try { const r = await fetch(url); if (r.ok) break; } catch { /* 还没起来 */ } await new Promise((r) => setTimeout(r, 100)); }
  return { url, stop: () => p.kill() };
}
/** 跑一个探针：退出码、用时、日志路径。 */
function runProbe(file, url, tag) {
  return new Promise((resolve) => {
    const args = [path.join(root, "test/probes", file), url, ...extraArgs(file), ...(file === "probe-paint-scale.mjs" && models ? [`--models=${models}`] : [])];
    const t0 = performance.now(), load = loadavg()[0], log = path.join(logs, `${tag}-${file}.log`);
    const p = spawn("node", args, { cwd: root, env: { ...process.env, PROBE_URL: url } });
    let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => { out += `\n（超时 ${timeoutS} 秒，杀掉）`; p.kill("SIGKILL"); }, timeoutS * 1000);
    p.on("close", (code) => { clearTimeout(timer); writeFileSync(log, out); resolve({ code: code ?? 1, ms: Math.round(performance.now() - t0), s: Math.round((performance.now() - t0) / 1000), load: Math.round(load * 10) / 10, log, out }); });
  });
}
/** 那一版的发版提交（src/version.ts 改成那一版的那个提交）。 */
function releaseCommit(version) {
  for (const c of execFileSync("git", ["log", "--format=%h", "--", "src/version.ts"], { cwd: root, encoding: "utf8" }).trim().split("\n")) {
    const v = /APP_VERSION = "(v[0-9.]+)/.exec(execFileSync("git", ["show", `${c}:src/version.ts`], { cwd: root, encoding: "utf8" }))?.[1];
    if (v === version) return c;
  }
  return null;
}

/** --at：对着那个提交干净构建（临时 detached worktree + node_modules 链接 + build），在那里起服务。 */
let atDir = null, atCommit = null;
if (at) {
  atCommit = execFileSync("git", ["rev-parse", at], { cwd: root, encoding: "utf8" }).trim();
  atDir = path.join(tmpdir(), `catsup-at-${atCommit.slice(0, 8)}-${process.pid}`);
  execFileSync("git", ["worktree", "add", "--detach", atDir, atCommit], { cwd: root, stdio: "ignore" });
  execFileSync("ln", ["-s", path.join(root, "node_modules"), path.join(atDir, "node_modules")]);
  execFileSync("bash", ["scripts/build.sh"], { cwd: atDir, stdio: "ignore" });
}
const here = await serve(atDir ?? root);
console.log(`${redline ? "红线组" : tier === "perf" ? "性能档" : "整跑"} ${files.length} 个探针（${atCommit ? `提交 ${atCommit.slice(0, 8)} 干净构建，` : ""}${here.url}，日志 ${logs}）`);
const rows = [];
for (const f of files) {
  let r = await runProbe(f, here.url, "now");
  const was = ledger[f]?.state ?? "（底账里没有）";
  let kind = r.code === 0 ? (was === "known-red" ? "新绿" : "绿") : was === "green" || was === "（底账里没有）" ? "新红" : was === "flaky" ? "偶发这次红" : "还红着";
  if (kind === "新红") {   // 统筹 11-11：别的会话也在这台机器上跑，冒出新红先单独重跑一次，重跑还红才算红
    const again = await runProbe(f, here.url, "again");
    if (again.code === 0) { kind = "偶发这次红"; r = { ...r, again: `重跑绿（负载 ${again.load}）` }; } else r = { ...r, again: `重跑也红（负载 ${again.load}）` };
  }
  rows.push({ f, kind, ...r });
  console.log(`${kind.padEnd(5, "　")} ${f}  ${r.s}s  负载 ${r.load}${r.again ? `  ${r.again}` : ""}`);
}
here.stop();
if (atDir) { execFileSync("rm", [path.join(atDir, "node_modules")]); execFileSync("git", ["worktree", "remove", "--force", atDir], { cwd: root, stdio: "ignore" }); }   // 临时的只读副本：先摘 node_modules 链接再删
const pick = (k) => rows.filter((r) => r.kind === k);
const report = (title, list) => { if (!list.length) return; console.log(`\n${title}（${list.length}）`); for (const r of list) { console.log(`  ${r.f}（日志 ${r.log}）`); for (const l of whyRed(readFileSync(path.join(root, "test/probes", r.f), "utf8"), r.out).slice(0, 6)) console.log(`    ${l}`); } };
report("新红", pick("新红"));
report("还红着", pick("还红着"));
report("偶发这次红", pick("偶发这次红"));
const sus = rows.filter((r) => (r.kind === "绿" || r.kind === "新绿") && r.ms < 1400);   // 统筹 11-12：绿了、但比开一次 app 的固定开销（1.4 秒）还快 = 多半一条都没查（截图基线、update-conflict 都这样假绿过）
if (sus.length) console.log(`\n可疑的绿（${sus.length}，比开一次 app 还快、多半一条都没查，看日志）：${sus.map((r) => `${r.f} ${r.ms} ms`).join("、")}`);
const greens = pick("新绿"); if (greens.length) console.log(`\n新绿（${greens.length}）：${greens.map((r) => r.f).join("、")}——底账里改成 green`);
if (compare && pick("新红").length) {
  const c = releaseCommit(compare);
  if (!c) console.log(`\n--compare=${compare}：找不到这一版的发版提交，不比（不收网址、不用手边的服务）`);
  else {
    const dir = path.join(tmpdir(), `catsup-compare-${compare}-${Date.now()}`);   // 墙上钟：只当文件夹名里不重复的后缀
    execFileSync("git", ["worktree", "add", "--detach", dir, c], { cwd: root, stdio: "ignore" });
    const old = await serve(dir);
    try {
      console.log(`\n拿 ${compare}（发版提交 ${c}，干净构建）比新红的那几个：`);
      for (const r of pick("新红")) { const o = await runProbe(r.f, old.url, compare); console.log(`  ${r.f}：${compare} 上${o.code === 0 ? "是绿的 = 这次改出来的" : "也红 = 不是这次改出来的"}`); }
    } finally {
      old.stop();
      execFileSync("git", ["worktree", "remove", "--force", dir], { cwd: root, stdio: "ignore" });   // 临时的只读副本（--detach 在发版提交上），里面没有改动
    }
  }
}
const slow = [...rows].sort((a, b) => b.s - a.s).slice(0, 20), total = rows.reduce((t, r) => t + r.s, 0);
console.log(`\n最慢的 ${slow.length} 个（共 ${total} 秒，平均 ${rows.length ? (total / rows.length).toFixed(1) : 0} 秒）：${slow.map((r) => `${r.f.replace(/\.m[jt]s$/, "")} ${r.s}s`).join("、")}`);
writeFileSync(path.join(logs, "timings.json"), JSON.stringify(Object.fromEntries(rows.map((r) => [r.f, { s: r.s, load: r.load, kind: r.kind, ...(r.again ? { again: r.again } : {}) }])), null, 1));
if (redline) {   // 记一笔：哪个提交、哪天、全绿没有（推正式版前查；统筹 11-12）
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" }).trim();
  const commit = atCommit ?? git("rev-parse", "HEAD"), dirty = !atCommit && git("status", "--porcelain", "--untracked-files=no").length > 0;
  const version = /APP_VERSION = "([^"]+)"/.exec(git("show", `${commit}:src/version.ts`))?.[1] ?? null;
  const red = rows.filter((r) => r.kind !== "绿" && r.kind !== "新绿" && r.kind !== "偶发这次红").map((r) => r.f), flaky = pick("偶发这次红").map((r) => r.f);
  const rec = { commit, version, dirty, at: new Date().toISOString(), probes: rows.map((r) => r.f), green: red.length === 0, red, flaky, seconds: Math.round(rows.reduce((t, r) => t + r.ms, 0) / 1000) };   // 墙上钟：记的是「哪天」，不是量时长
  const file = path.join(path.resolve(root, git("rev-parse", "--git-common-dir")), "catsup-redline-runs.jsonl");
  writeFileSync(file, JSON.stringify(rec) + "\n", { flag: "a" });
  console.log(`\n红线组记了一笔：${commit.slice(0, 8)}${dirty ? "（工作区有没提交的改动）" : ""} ${version ?? ""} ${rec.green ? "全绿" : `红：${red.join("、")}`} → ${file}`);
}
console.log(`\n${rows.length} 个：绿 ${pick("绿").length + greens.length}、新红 ${pick("新红").length}、还红着 ${pick("还红着").length}、偶发这次红 ${pick("偶发这次红").length}、新绿 ${greens.length}`);
process.exit(pick("新红").length ? 1 : 0);
