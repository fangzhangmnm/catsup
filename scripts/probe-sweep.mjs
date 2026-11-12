#!/usr/bin/env node
// scripts/probe-sweep.mjs —— 全部探针串行整跑一遍，和底账 test/probes/probe-ledger.json 比，只报三样：新红、新绿、还红着的。created 2026-11-11 by Claude Opus 5.5
// 统筹 11-11 定的规矩：每批收尾整跑一次；新红 = 停下来（这个脚本退出码 1）；目标是施工单开工时底账里「已知红」那一栏是空的。
// 用法：node scripts/probe-sweep.mjs [--only=probe-a,probe-b] [--models=<真模型文件夹>] [--timeout=900] [--logs=<目录>] [--compare=v0.19.47]
//   跑的是这个仓现在的构建：脚本自己在仓根起一个 http.server（端口自选），不用手边开着的服务。先 bash scripts/build.sh。
//   串行跑（不并行：软件显卡抢核会跑出假红）。退出码 0 = 绿；红的用 scripts/probe-why-red.mjs 打出红在哪一条。
//   --compare=<版本>：新红的那几个，再拿那一版的发版提交干净构建出来的跑一遍（临时 git worktree --detach + 自己起服务），说清那一版红不红。
//     规矩写死：比旧版本只用从发版提交干净构建出来的，不收网址、不用手边开着的服务（统筹 11-11：用了不干净的服务出过一次错判）。
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { whyRed } from "./probe-why-red.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d = null) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const only = arg("only")?.split(",").map((s) => s.replace(/\.m[jt]s$/, "")) ?? null;
const models = arg("models"), timeoutS = Number(arg("timeout", "900")), compare = arg("compare");
const logs = arg("logs", path.join(tmpdir(), `catsup-probe-sweep-${Date.now()}`));
mkdirSync(logs, { recursive: true });
const ledger = JSON.parse(readFileSync(path.join(root, "test/probes/probe-ledger.json"), "utf8")).probes;
const files = readdirSync(path.join(root, "test/probes")).filter((f) => /\.m[jt]s$/.test(f) && !f.startsWith("_") && ledger[f]?.state !== "helper").filter((f) => !only || only.includes(f.replace(/\.m[jt]s$/, ""))).sort();

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
    const args = [path.join(root, "test/probes", file), url, ...(file === "probe-paint-scale.mjs" && models ? [`--models=${models}`] : [])];
    const t0 = Date.now(), log = path.join(logs, `${tag}-${file}.log`);
    const p = spawn("node", args, { cwd: root, env: { ...process.env, PROBE_URL: url } });
    let out = ""; p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => { out += `\n（超时 ${timeoutS} 秒，杀掉）`; p.kill("SIGKILL"); }, timeoutS * 1000);
    p.on("close", (code) => { clearTimeout(timer); writeFileSync(log, out); resolve({ code: code ?? 1, s: Math.round((Date.now() - t0) / 1000), log, out }); });
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

const here = await serve(root);
console.log(`整跑 ${files.length} 个探针（${here.url}，日志 ${logs}）`);
const rows = [];
for (const f of files) {
  const r = await runProbe(f, here.url, "now"), was = ledger[f]?.state ?? "（底账里没有）", red = r.code !== 0;
  const kind = !red ? (was === "known-red" ? "新绿" : "绿") : was === "green" || was === "（底账里没有）" ? "新红" : was === "flaky" ? "偶发这次红" : "还红着";
  rows.push({ f, kind, ...r });
  console.log(`${kind.padEnd(5, "　")} ${f}  ${r.s}s`);
}
here.stop();
const pick = (k) => rows.filter((r) => r.kind === k);
const report = (title, list) => { if (!list.length) return; console.log(`\n${title}（${list.length}）`); for (const r of list) { console.log(`  ${r.f}（日志 ${r.log}）`); for (const l of whyRed(readFileSync(path.join(root, "test/probes", r.f), "utf8"), r.out).slice(0, 6)) console.log(`    ${l}`); } };
report("新红", pick("新红"));
report("还红着", pick("还红着"));
report("偶发这次红", pick("偶发这次红"));
const greens = pick("新绿"); if (greens.length) console.log(`\n新绿（${greens.length}）：${greens.map((r) => r.f).join("、")}——底账里改成 green`);
if (compare && pick("新红").length) {
  const c = releaseCommit(compare);
  if (!c) console.log(`\n--compare=${compare}：找不到这一版的发版提交，不比（不收网址、不用手边的服务）`);
  else {
    const dir = path.join(tmpdir(), `catsup-compare-${compare}-${Date.now()}`);
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
console.log(`\n${rows.length} 个：绿 ${pick("绿").length + greens.length}、新红 ${pick("新红").length}、还红着 ${pick("还红着").length}、偶发这次红 ${pick("偶发这次红").length}、新绿 ${greens.length}`);
process.exit(pick("新红").length ? 1 : 0);
