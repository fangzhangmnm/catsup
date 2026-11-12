// 测试分档的守卫（ai-docs/20261110-test-tiers.md 第四节第 5 条）。created 2026-11-10 by Claude Opus 5.5
// ① 不许有写了却没人跑的测试（原来在 test/run.mjs 末尾，2026-10-29 Opus 立；挪到这里，串跑和并行都算一条测试）
// ② 测试文件之间不互相 import（被 import 的那一份的测试会被并行运行器多登记、多跑一遍——kernel-fuzz 的公共检查就这么多跑过两条）
// ③ 探针表里的探针、路径都存在 ④ test/par.mjs 里两张表（全套触发、贵的读文件测试）指的东西都存在
// ⑤ 探针不把地址写死（命令行里 http 开头的参数 / 环境变量 PROBE_URL 能改；2026-11-11 W-9 加，Claude Opus 5.5）
// ⑥ 探针底账 test/probes/probe-ledger.json 每个探针一行、状态该写的都写了、role 只能是 guard / scaffold（统筹 11-11 定，2026-11-11 Claude Opus 5.5 加；整跑脚本 scripts/probe-sweep.mjs 拿它比）
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
    const led = JSON.parse(fs.readFileSync("test/probes/probe-ledger.json", "utf8")) as { probes: Record<string, Record<string, string>> };
    const files = fs.readdirSync("test/probes").filter((n) => /\.(mjs|mts)$/.test(n) && !n.startsWith("_"));
    eq(files.filter((f) => !led.probes[f]).join("、"), "", "探针文件没有底账行（新探针加一行，跑绿了写 green）");
    eq(Object.keys(led.probes).filter((f) => !files.includes(f)).join("、"), "", "底账行的文件不在了");
    const need: Record<string, string[]> = { green: [], helper: ["why"], "known-red": ["reason", "since", "fixBy"], flaky: ["symptom", "seen", "fixBy"] };
    const bad = Object.entries(led.probes).flatMap(([f, r]) => !need[r.state] ? [`${f}：状态「${r.state}」不认识`] : need[r.state].filter((k) => !r[k]).map((k) => `${f}：${r.state} 缺 ${k}`));
    for (const [f, r] of Object.entries(led.probes)) if (r.role !== undefined && r.role !== "guard" && r.role !== "scaffold") bad.push(`${f}：role「${r.role}」只能是 guard / scaffold（没写 = guard）`);   // 统筹 11-11：整跑只跑 guard
    eq(bad.join("；"), "");
  });
  it("探针不把地址写死：page.goto 的地址能从命令行或环境变量 PROBE_URL 改（分支构建要在别的端口上跑）", () => {
    const bad = fs.readdirSync("test/probes").filter((n) => /\.(mjs|mts)$/.test(n) && /page\.goto\(\s*["'`]http/.test(fs.readFileSync(`test/probes/${n}`, "utf8")));
    eq(bad.join("、"), "");
  });
});
