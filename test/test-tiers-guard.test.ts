// 测试分档的守卫（ai-docs/20261110-test-tiers.md 第四节第 5 条）。created 2026-11-10 by Claude Opus 5.5
// ① 不许有写了却没人跑的测试（原来在 test/run.mjs 末尾，2026-10-29 Opus 立；挪到这里，串跑和并行都算一条测试）
// ② 测试文件之间不互相 import（被 import 的那一份的测试会被并行运行器多登记、多跑一遍——kernel-fuzz 的公共检查就这么多跑过两条）
// ③ 探针表里的探针、路径都存在 ④ test/par.mjs 里两张表（全套触发、贵的读文件测试）指的东西都存在
// ⑤ 探针不把地址写死（命令行里 http 开头的参数 / 环境变量 PROBE_URL 能改；2026-11-11 W-9 加，Claude Opus 5.5）
// ⑥ 探针底账 test/probes/probe-ledger.json 每个探针一行、状态该写的都写了、role 只能是 guard / scaffold（统筹 11-11 定，2026-11-11 Claude Opus 5.5 加；整跑脚本 scripts/probe-sweep.mjs 拿它比）
// ⑦ test/、scripts/ 里每个墙上钟（Date.now）都写明为什么，量时长 / 判超时用 performance.now（统筹 11-11；2026-11-11 Claude Opus 5.5 加）
import { describe, it, eq } from "./runner.mjs";
import { REGISTRY, unregistered, FULL_TRIGGERS, EXPENSIVE_FILE_READERS } from "./par.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; existsSync(p: string): boolean; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };

/** 前缀指着存在的东西：以 / 或 /* 结尾 = 文件夹存在；否则 = 这个文件存在，或者它那个文件夹里有以它开头的文件。 */
const prefixExists = (w: string): boolean => {
  if (w.endsWith("/") || w.endsWith("/*")) { const d = w.replace(/\/\*?$/, ""); return fs.existsSync(d) && fs.statSync(d).isDirectory(); }
  if (fs.existsSync(w)) return true;
  const i = w.lastIndexOf("/"), dir = i < 0 ? "." : w.slice(0, i), stem = w.slice(i + 1);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((n) => n.startsWith(stem));
};

describe("测试分档守卫", () => {
  it("test/ 下每个 *.test.ts 都登记进了 test/run.mjs（不许有写了却没人跑的测试）", () => {
    eq(unregistered().join("、"), "");
    eq(REGISTRY.length > 100, true, "登记处读出来了");
  });
  it("测试文件之间不互相 import（公共的东西放进不叫 .test.ts 的工具文件）", () => {
    const bad: string[] = [];
    for (const f of REGISTRY) {
      const src = fs.readFileSync(`test/${f}`, "utf8");
      for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["'](\.{1,2}\/[^"']+\.test\.[mt]?[jt]s)["']/g)) bad.push(`${f} → ${m[1]}`);
    }
    eq(bad.join("；"), "");
  });
  it("探针表（test/probes/probe-map.json）：每个探针脚本都在、每个路径前缀都指着存在的东西", () => {
    const map = JSON.parse(fs.readFileSync("test/probes/probe-map.json", "utf8")) as { rules: { when: string[]; probes: string[]; why: string }[] };
    const missingProbe = map.rules.flatMap((r) => r.probes).filter((p) => !fs.existsSync(`test/probes/${p}`));
    const missingWhen = map.rules.flatMap((r) => r.when).filter((w) => !prefixExists(w));
    eq(missingProbe.join("、"), "", "探针不存在");
    eq(missingWhen.join("、"), "", "路径不存在");
    eq(map.rules.every((r) => r.why && r.when.length && r.probes.length), true, "每条都有 when / probes / why");
  });
  it("test/par.mjs 的两张表：全套触发的路径都存在；贵的读文件测试都登记了、管的地方都存在", () => {
    eq(FULL_TRIGGERS.filter((t: string) => !prefixExists(t)).join("、"), "");
    const exp = EXPENSIVE_FILE_READERS as Record<string, string[]>;
    eq(Object.keys(exp).filter((f) => !REGISTRY.includes(f)).join("、"), "", "没登记");
    eq(Object.values(exp).flat().filter((w) => !prefixExists(w)).join("、"), "", "管的地方不存在");
  });
  it("探针底账（test/probes/probe-ledger.json）：每个探针文件一行、每行都有文件、每种状态该写的都写了（统筹 11-11；2026-11-11 Opus 加）", () => {
    const led = JSON.parse(fs.readFileSync("test/probes/probe-ledger.json", "utf8")) as { probes: Record<string, Record<string, string>> };   // 值是字符串 / true / 数组，按用到的地方各自看
    const files = fs.readdirSync("test/probes").filter((n) => /\.(mjs|mts)$/.test(n) && !n.startsWith("_"));
    eq(files.filter((f) => !led.probes[f]).join("、"), "", "探针文件没有底账行（新探针加一行，跑绿了写 green）");
    eq(Object.keys(led.probes).filter((f) => !files.includes(f)).join("、"), "", "底账行的文件不在了");
    const need: Record<string, string[]> = { green: [], helper: ["why"], "known-red": ["reason", "since", "fixBy"], flaky: ["symptom", "seen", "fixBy"] };
    const bad = Object.entries(led.probes).flatMap(([f, r]) => !need[r.state] ? [`${f}：状态「${r.state}」不认识`] : need[r.state].filter((k) => !r[k]).map((k) => `${f}：${r.state} 缺 ${k}`));
    for (const [f, r] of Object.entries(led.probes) as [string, Record<string, unknown>][]) {
      if (r.role !== undefined && r.role !== "guard" && r.role !== "scaffold" && r.role !== "perf") bad.push(`${f}：role「${r.role}」只能是 guard / scaffold / perf（没写 = guard）`);   // 统筹 11-12：分档本身
      if (r.redline !== undefined && (r.redline !== true || (r.role ?? "guard") !== "guard" || (r.state !== "green" && r.state !== "flaky"))) bad.push(`${f}：redline 只能写 true，而且得是守卫档、现在是绿的（红线那一小组不许放已知红的）`);
      if (r.perfArgs !== undefined && (!Array.isArray(r.perfArgs) || !r.perfArgs.length || !r.perfArgs.every((x) => typeof x === "string" && x.startsWith("--")))) bad.push(`${f}：perfArgs 是一串 --开头的参数`);
    }
    const reds = Object.entries(led.probes).filter(([, r]) => (r as Record<string, unknown>).redline === true).map(([f]) => f);
    if (reds.length < 5) bad.push(`红线那一小组只有 ${reds.length} 个（锁、存盘、撤销、文件格式、崩溃快照至少各一个）`);
    eq(bad.join("；"), "");
  });
  it("test/、scripts/、src/app/session.ts 里用墙上钟（Date.now）的每一行都写明为什么；量时长、判超时一律 performance.now（统筹 11-11：这台 WSL 的墙上钟约每 32 秒往回拨 1.8 秒）", () => {
    const rd = fs as unknown as { readdirSync(p: string, o: { recursive: true }): string[] };
    const bad: string[] = [];
    const files = ["test", "scripts"].flatMap((dir) => rd.readdirSync(dir, { recursive: true }).filter((f) => /\.(m?[jt]s|mts)$/.test(f) && !f.startsWith("fixtures")).map((f) => `${dir}/${f}`));
    files.push("src/app/session.ts");   // 存盘那条路的计时（自动保存 / 崩溃快照的空闲、重载前等推送）只用只往前走的钟（统筹 11-11，v0.19.52）；剩下的墙上钟也得写明为什么
    for (const f of files) fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => { if (/Date\.now\(\)/.test(line) && !line.includes("墙上钟：")) bad.push(`${f}:${i + 1}`); });
    eq(bad.join("、"), "", "用墙上钟的行要在同一行写「// 墙上钟：为什么」，量时长换 performance.now()");
  });
  it("探针不把地址写死：page.goto 的地址能从命令行或环境变量 PROBE_URL 改（分支构建要在别的端口上跑）", () => {
    const bad = fs.readdirSync("test/probes").filter((n) => /\.(mjs|mts)$/.test(n) && /page\.goto\(\s*["'`]http/.test(fs.readFileSync(`test/probes/${n}`, "utf8")));
    eq(bad.join("、"), "");
  });
});
