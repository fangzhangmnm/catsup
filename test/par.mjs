// test/par.mjs —— 并行跑测试 + 只跑被改到的。created 2026-11-10 by Claude Opus 5.5（测试分档第四节，ai-docs/20261110-test-tiers.md）
//
//   node test/par.mjs                          全套（npm test）：登记处 test/run.mjs 里的全部 + 红线守卫 + 画画内核那一套，一起并行
//   node test/par.mjs --changed [--since=提交]   只跑被改到的（npm run test:changed）；默认从和 main 分叉的地方算，加上没提交的、没跟踪的
//   node test/par.mjs --files=a.test.ts,b.test.ts   点名
//   --jobs=N（默认 min(8, 核数 − 2)）  --dry（只打选中了哪些，不跑）  --verbose（每条都打）  --times（打最慢的 15 个）  --no-retry
//
// 登记处只有一个 = test/run.mjs 的 import 行（串跑 `npm run test:serial` 照旧走它）。工人 = test/par-worker.mjs，一次一份文件。
// 并行红的文件最后单独再跑一遍：单跑绿 = 在总结里明说「并行红、单跑绿」（照 MoonSinger），单跑也红 = 真红。
// 每份文件的耗时记在 node_modules/.cache/catsup-test-times.json（副本里 node_modules 是链过去的，几个副本共用），下次按它从慢到快派活。
import { fork, spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "..");
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const args = process.argv.slice(2), flag = (n) => args.includes(`--${n}`), opt = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const JOBS = Number(opt("jobs")) || Math.max(1, Math.min(8, os.cpus().length - 2));
const VERBOSE = flag("verbose"), DRY = flag("dry");
const red = (s) => `\x1b[31m${s}\x1b[0m`, green = (s) => `\x1b[32m${s}\x1b[0m`, yellow = (s) => `\x1b[33m${s}\x1b[0m`, dim = (s) => `\x1b[90m${s}\x1b[0m`;

// ---------- 登记处 ----------
export const REGISTRY = [...fs.readFileSync(path.join(HERE, "run.mjs"), "utf8").matchAll(/^import "\.\/([^"]+\.test\.ts)";/gm)].map((m) => m[1]);
/** test/ 下写了却没登记的测试文件（不会跑）。守卫 test/test-tiers-guard.test.ts 也查这个。 */
export const unregistered = () => fs.readdirSync(HERE).filter((f) => f.endsWith(".test.ts") && !REGISTRY.includes(f));

// 不在登记处、单独一个进程跑的两套
const EXTRAS = {
  redline: { label: "红线守卫", argv: ["test/redline-guard.test.mjs"] },
  kernel: { label: "画画内核那一套", argv: ["--expose-gc", "src/paint/kernel/test/run-kernel.mjs"] },
};

// ---------- 「改了哪里」 ----------
/** 改到这些 = 这次得跑全套（登记处、运行器、包、类型配置、vendor 的库）。 */
export const FULL_TRIGGERS = ["test/run.mjs", "test/runner.mjs", "test/par.mjs", "test/par-worker.mjs", "package.json", "package-lock.json", "tsconfig.json", "vendor-pkgs/"];
/** 读源码 / 读文件的测试（沿 import 找不到它们管的东西）里**贵的**：只在改到右边这些地方时跑。不在表里的读文件测试每次都跑（便宜）。 */
export const EXPENSIVE_FILE_READERS = {   // 耗时 = 2026-11-10 并行全套量的（载入 + 跑）；> 0.5 秒的进这张表
  "scale-ref.test.ts": ["vendor/size-ladder/", "src/vendor/size-ladder/", "scripts/pull-size-ladder.mjs"],   // 1.9 s
  "change-log.test.ts": ["src/kernel/", "src/editor/pool-mesh.ts"],   // 1.8 s
  "identity-merge.test.ts": ["src/app/paste-actions.ts", "src/editor/paste-plan.ts"],   // 1.7 s
  "identity-guard.test.ts": ["src/format/", "src/editor/", "src/identity/"],   // 1.0 s
  "cloud-gate.test.ts": ["src/", "vendor-pkgs/"],   // 0.6 s；扫整个 src/
  "textures-table.test.ts": ["src/", "test/fixtures/"],   // 0.6 s；扫整个 src/ + 冻结样本
  "format.test.ts": ["test/fixtures/", "scripts/freeze-format-fixtures.mjs"],   // 2.2 s；经 test/fixtures/format/fixtures.mjs 读冻结样本（.glb 不在 import 图里）
  "uv-format.test.ts": ["test/fixtures/"],   // 1.4 s（2026-11-13 量）；读老目录里冻着的带画样本（施工单十八第五节）
};
/** 读文件的测试：直接用 fs，或者经工具模块读 test/fixtures/ 下的样本（样本文件不在 import 图里）。 */
const isFileReader = (src) => /\b(readFileSync|readdirSync|statSync|existsSync|readFile)\b|fixtures/.test(src);

const SPEC_RES = [/\bfrom\s*["']([^"']+)["']/g, /\bimport\s*["']([^"']+)["']/g, /\bimport\(\s*["']([^"']+)["']\s*\)/g, /new URL\(\s*["'](\.{1,2}\/[^"']+)["']\s*,\s*import\.meta\.url/g];
const depsMemo = new Map();
/** 一个文件沿 import 直接走到的文件（只认相对路径；文本扫，宁多勿少）。 */
function depsOf(file) {
  let d = depsMemo.get(file);
  if (d) return d;
  d = [];
  depsMemo.set(file, d);
  let src = "";
  try { src = fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { return d; }
  const dir = path.posix.dirname(file);
  for (const re of SPEC_RES) for (const m of src.matchAll(re)) {
    const s = m[1];
    if (!s.startsWith(".")) continue;
    const base = path.posix.normalize(path.posix.join(dir, s));
    for (const cand of [base, `${base}.ts`, `${base}/index.ts`, `${base}.mjs`]) if (fs.existsSync(path.join(ROOT, cand)) && fs.statSync(path.join(ROOT, cand)).isFile()) { if (!d.includes(cand)) d.push(cand); break; }
  }
  return d;
}
/** 从一个测试文件出发能走到的全部文件 → 走到它的上一步（拼理由用）。 */
function closureOf(start) {
  const prev = new Map([[start, null]]), q = [start];
  while (q.length) { const f = q.shift(); for (const g of depsOf(f)) if (!prev.has(g)) { prev.set(g, f); q.push(g); } }
  return prev;
}
const chainTo = (prev, f) => { const c = []; for (let x = f; x; x = prev.get(x)) c.unshift(x); return c; };

function changedFiles(since) {
  const git = (...a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8" });
  const base = since ?? git("merge-base", "HEAD", "main").trim();
  const files = new Set([...git("diff", "--name-only", base).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter((f) => f && f !== "node_modules"));
  return { base, files: [...files].sort() };
}

/** 按改动选：返回 { full, files: [{ file, why }], extras: [...], probes: [{ probe, why }], notes: [] }。 */
export function selectForChanges(changed) {
  const notes = [];
  const trig = changed.filter((f) => FULL_TRIGGERS.some((t) => (t.endsWith("/") ? f.startsWith(t) : f === t)));
  if (trig.length) return { full: true, why: `改到了 ${trig.join("、")}`, files: REGISTRY.map((file) => ({ file, why: "全套" })), extras: Object.keys(EXTRAS), probes: suggestProbes(changed), notes };
  const set = new Set(changed), picked = [], hitCount = new Map();
  for (const t of REGISTRY) {
    const file = `test/${t}`, prev = closureOf(file), hits = [...prev.keys()].filter((f) => set.has(f));
    for (const h of hits) hitCount.set(h, (hitCount.get(h) ?? 0) + 1);
    const src = fs.readFileSync(path.join(ROOT, file), "utf8");
    if (hits.length) { const c = chainTo(prev, hits[0]); picked.push({ file: t, why: `${hits[0]}${c.length > 2 ? dim(`（经 ${c.slice(1, -1).join(" → ")}）`) : ""}${hits.length > 1 ? dim(` 等 ${hits.length} 个改过的文件`) : ""}` }); continue; }
    const dirs = EXPENSIVE_FILE_READERS[t];
    if (dirs) {
      const hit = changed.find((f) => dirs.some((d) => f.startsWith(d)));
      if (hit) picked.push({ file: t, why: `${hit}${dim("（贵的读文件测试，管 " + dirs.join("、") + "）")}` });
    } else if (isFileReader(src)) picked.push({ file: t, why: dim("读文件的守卫，便宜，每次都跑") });
  }
  for (const [f, n] of hitCount) if (n >= REGISTRY.length * 0.8) notes.push(`几乎所有测试（${n} / ${REGISTRY.length}）都沿 import 走到 ${f}：动它 ≈ 跑全套。要是天天碰它，得先想怎么拆（测试分档第四节「停下来说」那一条）`);
  const extras = ["redline"];
  if (changed.some((f) => f.startsWith("src/paint/"))) extras.push("kernel");
  return { full: false, files: picked, extras, probes: suggestProbes(changed), notes };
}

/** 探针表的 when：路径前缀；以 /* 结尾 = 只算这个文件夹里直接的文件。 */
export const matchesWhen = (f, w) => (w.endsWith("/*") ? f.startsWith(w.slice(0, -1)) && !f.slice(w.length - 1).includes("/") : f.startsWith(w));
/** 改了哪里 → 建议跑哪些探针（test/probes/probe-map.json，脚本和人都读它）。 */
export function suggestProbes(changed) {
  const map = JSON.parse(fs.readFileSync(path.join(HERE, "probes", "probe-map.json"), "utf8"));
  const out = new Map();
  for (const r of map.rules) {
    const hit = changed.find((f) => r.when.some((w) => matchesWhen(f, w)));
    if (!hit) continue;
    for (const p of r.probes) if (!out.has(p)) out.set(p, `${hit} → ${r.why}`);
  }
  return [...out].map(([probe, why]) => ({ probe, why }));
}

// ---------- 跑 ----------
const TIMES = path.join(ROOT, "node_modules", ".cache", "catsup-test-times.json");
const loadTimes = () => { try { return JSON.parse(fs.readFileSync(TIMES, "utf8")); } catch { return {}; } };
function saveTimes(results) {
  const t = loadTimes();
  for (const [f, r] of results) if (!r.crashed) t[f] = Math.round(r.importMs + r.runMs);
  try { fs.mkdirSync(path.dirname(TIMES), { recursive: true }); fs.writeFileSync(TIMES, JSON.stringify(t, null, 1)); } catch { /* 缓存写不了不要紧 */ }
}

function runExtra(key) {
  const e = EXTRAS[key], t0 = performance.now();
  return new Promise((resolve) => {
    const p = spawn(process.execPath, e.argv, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout.on("data", (d) => { out += d; }); p.stderr.on("data", (d) => { out += d; });
    p.on("close", (code) => resolve({ key, label: e.label, code, out, ms: performance.now() - t0 }));
  });
}

/** 把这些文件分给 jobs 个工人跑完。返回 Map(file → 结果) 和工人 stdout 里飞出来的字。 */
function runFiles(files, jobs) {
  const times = loadTimes(), queue = [...files].sort((a, b) => (times[b] ?? 1e9) - (times[a] ?? 1e9));
  const results = new Map(), strays = [];
  if (!queue.length) return Promise.resolve({ results, strays });
  return new Promise((resolve) => {
    let live = 0;
    const startWorker = () => {
      const w = fork(path.join(HERE, "par-worker.mjs"), [], { cwd: ROOT, silent: true });
      live++;
      let cur = null, timer = null;
      w.stdout.on("data", (d) => strays.push(String(d))); w.stderr.on("data", (d) => strays.push(String(d)));
      const next = () => {
        cur = queue.shift() ?? null;
        if (!cur) { w.kill(); return; }
        clearTimeout(timer);
        timer = setTimeout(() => { results.set(cur, { pass: 0, fail: 1, todo: 0, failed: [`${cur} 三分钟没跑完，工人杀掉了`], out: [], importMs: 0, runMs: 180000, crashed: true }); cur = null; w.kill(); }, 180000);
        w.send({ file: `./${cur}` });
      };
      w.on("message", (m) => {
        if (m.ready) return next();
        clearTimeout(timer);
        results.set(cur, m); next();
      });
      w.on("exit", (code) => {
        clearTimeout(timer); live--;
        if (cur && !results.has(cur)) results.set(cur, { pass: 0, fail: 1, todo: 0, failed: [`${cur}：工人进程退出了（${code}）`], out: [], importMs: 0, runMs: 0, crashed: true });
        if (cur && queue.length) startWorker();   // 倒掉的工人手上还有活：补一个
        if (live === 0) resolve({ results, strays });
      });
    };
    for (let i = 0; i < Math.min(jobs, queue.length); i++) startWorker();
  });
}

async function main() {
  const t0 = performance.now();
  if (unregistered().length) { console.error(red(`✗ 测试文件没登记进 test/run.mjs（不会跑）：${unregistered().join("、")}`)); process.exit(1); }
  let files, extras, header = "";
  if (opt("files")) {
    files = opt("files").split(",").map((s) => s.replace(/^test\//, "").trim()).filter(Boolean);
    const bad = files.filter((f) => !REGISTRY.includes(f));
    if (bad.length) { console.error(red(`✗ 不在登记处：${bad.join("、")}`)); process.exit(1); }
    extras = [];
  } else if (flag("changed")) {
    const { base, files: changed } = changedFiles(opt("since"));
    const sel = selectForChanges(changed);
    console.log(`改过的文件（从 ${base.slice(0, 9)} 算，含没提交的、没跟踪的）：${changed.length} 个${changed.length ? dim("  " + changed.slice(0, 12).join("  ") + (changed.length > 12 ? "  …" : "")) : ""}`);
    if (sel.full) console.log(yellow(`这次得跑全套：${sel.why}`));
    else {
      const real = sel.files.filter((x) => !/每次都跑/.test(x.why));
      console.log(real.length ? `沿 import 走到改动的测试 ${real.length} 个：` : yellow("没有测试沿 import 走到这次的改动（下面只跑便宜的守卫——这不等于测过）"));
      for (const x of real) console.log(`  ${x.file}  ← ${x.why}`);
      const cheap = sel.files.length - real.length;
      if (cheap) console.log(dim(`另跑便宜的读文件守卫 ${cheap} 个；${sel.extras.map((k) => EXTRAS[k].label).join("、")}`));
    }
    for (const n of sel.notes) console.log(yellow(`⚠ ${n}`));
    if (sel.probes.length) { console.log("这次改动建议跑的探针（不自动跑；node test/probes/<名字>，先起本地服务）："); for (const p of sel.probes) console.log(`  ${p.probe}  ${dim("← " + p.why)}`); }
    files = sel.files.map((x) => x.file); extras = sel.extras;
    header = sel.full ? "全套" : "被动过的";
  } else { files = [...REGISTRY]; extras = Object.keys(EXTRAS); header = "全套"; }
  if (DRY) return;

  const extraP = Promise.all(extras.map(runExtra));
  const { results, strays } = await runFiles(files, JOBS);
  // 并行红的单独再跑一遍（一个新工人、一次一份）
  const retried = new Map();
  if (!flag("no-retry")) for (const [f, r] of results) if (r.fail) { const again = await runFiles([f], 1); retried.set(f, again.results.get(f)); }
  const ex = await extraP;
  saveTimes(results);

  let pass = 0, fail = 0, todo = 0;
  const reds = [], flakes = [];
  for (const f of files) {
    const r = results.get(f); if (!r) continue;
    const again = retried.get(f);
    if (r.fail && again && !again.fail) { flakes.push(f); pass += again.pass; todo += again.todo; continue; }
    pass += r.pass; fail += r.fail; todo += r.todo;
    if (r.fail) reds.push([f, again ?? r]);
    if (VERBOSE) { console.log(dim(`── ${f}`)); for (const l of r.out) console.log(l); }
  }
  for (const [f, r] of reds) {
    console.log(red(`── ${f}（红${retried.has(f) ? "，单跑也红" : ""}）`));
    for (const l of r.out) if (!/✓|○ todo/.test(l) && l.trim()) console.log(l);
  }
  for (const e of ex) {
    if (e.code !== 0 || VERBOSE) { console.log((e.code ? red : dim)(`── ${e.label}（退出码 ${e.code}）`)); console.log(e.code ? e.out.split("\n").filter((l) => !/✓/.test(l)).join("\n") : e.out); }
  }
  if (strays.length && (reds.length || VERBOSE)) console.log(dim(`工人在测试之外打出来的字：\n${strays.join("").slice(0, 4000)}`));
  if (flag("times")) {
    const rows = [...results].sort((a, b) => b[1].importMs + b[1].runMs - (a[1].importMs + a[1].runMs)).slice(0, 15);
    console.log("最慢的 15 个（载入 + 跑，毫秒）："); for (const [f, r] of rows) console.log(`  ${String(Math.round(r.importMs + r.runMs)).padStart(6)}  ${f} ${dim(`（载入 ${Math.round(r.importMs)}）`)}`);
    for (const e of ex) console.log(`  ${String(Math.round(e.ms)).padStart(6)}  ${e.label}`);
  }
  for (const f of flakes) console.log(yellow(`⚠ 并行红、单跑绿：${f}（抢机器，或者和同一个工人里先跑的文件互相影响；记进施工记录）`));
  // 读文件的测试变贵了、没进表 → test:changed 会每次都跑它：点名提醒，让人把它和它管的地方写进 EXPENSIVE_FILE_READERS
  for (const [f, r] of results) if (r.importMs + r.runMs > 1000 && !EXPENSIVE_FILE_READERS[f] && isFileReader(fs.readFileSync(path.join(HERE, f), "utf8"))) console.log(yellow(`⚠ ${f} 读文件、花了 ${((r.importMs + r.runMs) / 1000).toFixed(1)} 秒，没进 test/par.mjs 的 EXPENSIVE_FILE_READERS：test:changed 每次都会跑它，写进表里（连同它管哪些文件夹）`));
  const exText = ex.map((e) => `${e.label} ${e.code ? red("红") : green("过")}${/(\d+) passed/.test(e.out) && !e.code ? ` ${e.out.match(/(\d+) passed/)[1]}` : ""}`).join(" · ");
  const ok = fail === 0 && ex.every((e) => e.code === 0);
  console.log(`\n  ${header ? header + " · " : ""}并行 ${JOBS} 条 · ${results.size} 个文件 · ${(ok ? green : (s) => s)(`${pass} 过`)} · ${fail ? red(`${fail} 红`) : "0 红"} · ${todo} 待办${exText ? " · " + exText : ""} · 墙上 ${((performance.now() - t0) / 1000).toFixed(1)} 秒\n`);
  if (!ok) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
