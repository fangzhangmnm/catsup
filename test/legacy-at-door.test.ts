// 照顾旧东西的代码只住在门口（user 11-13「backward compatibility的税不应该太重，而且需要严格隔离，而不是渗透进每一个运行时逻辑」；统筹转，读法 = 家族 ai-docs/20261021-format-version-discipline.md 第 6 节）。
// created 2026-11-12 by Claude Opus 5.5
// 门口 = src/format/（读写文件，含 format/migrate/）和画画内核那份拷贝（src/paint/kernel/，正本在画画仓）。门口以外：
//   ① 名字带 legacy 的标识符只许是下面名单上的（注释和字符串不算）。名单只许减不许加：新冒出来一个 = 红；名单上的从代码里没了 = 也红（把名单那一项删掉）。
//   ② 2026-11-12 搬到门口的那几样旧东西，门口以外不许再出现（网格设置的老键、尺度参考的旧单选键和改过名的 id、搬成插件之前的指令名、网格内核里「老文件的默认平滑」）。
// 加一样要照顾的旧东西 = 放进 src/format/（读的时候换成现在的形状，必要时写的时候给老读者照写），不是在运行时加「如果是旧的」。
import { describe, it, eq } from "./runner.mjs";
const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };

/** 门口以外、名字带 legacy 的：文件 → 标识符 → 为什么留着。 */
const ALLOWED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "src/config.ts": { LEGACY_DOC_EXT: "旧的文件后缀 .glb：告诉图库「哪些文件名算文档」的声明，本来就在门口，不是运行时分支" },
  "src/app-store.ts": {
    LEGACY_DOC_EXT: "同上（DOC_KINDS 声明）",
    LEGACY_DB: "旧图库搬家：同步那一头，照规矩不动（只列名）", legacyLibraryExists: "旧图库搬家（同上）", legacyStore: "旧图库搬家（同上）",
  },
  "src/app/main.ts": {
    legacyLibraryExists: "旧图库搬家（同上）", legacyStore: "旧图库搬家（同上）", legacyScan: "旧图库搬家（同上）", KV_LEGACY_RETIRED: "旧图库搬家（同上）", legacyFiles: "旧图库搬家的探针钩子（同上）",
    migrateLegacyUiPrefs: "开机时把 0.4 时代的设备偏好键换一次 = 门口",
  },
  "src/app/device-kv.ts": { migrateLegacyUiPrefs: "开机时把 0.4 时代的设备偏好键换一次 = 门口" },
};
/** 搬到门口的旧东西（门口以外不许再出现；正则对剥掉注释、但留着字符串的代码）。 */
const MOVED: readonly { re: RegExp; what: string }[] = [
  { re: /\.(gridStep|gridSubdiv|gridPreset)\b/, what: "网格设置的老键（读：format/migrate/settings.ts settingsNow；写给老读者：settingsForFile）" },
  { re: /\.scaleRef\b|["']body\/CHILD["']|RENAMED_REFS/, what: "尺度参考的旧单选键、改过名的 id（format/migrate/settings.ts）" },
  { re: /["'](makePlanar|snapToGrid|restoreHierarchy)["']|LEGACY_PLUGIN_OPS|normalizeLegacy/, what: "搬成插件之前的指令名（读复现包的门口 scripts/replay-repro.mjs）" },
  { re: /SMOOTH_DEFAULT_LEGACY/, what: "网格内核里「老文件的默认平滑」（format/migrate/mesh.ts smoothDefaultOf）" },
];

const isDoor = (p: string): boolean => p.startsWith("src/format/") || p.startsWith("src/paint/kernel/");
function files(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) { const p = `${dir}/${n}`; if (statSync(p).isDirectory()) out.push(...files(p)); else if (p.endsWith(".ts")) out.push(p); }
  return out;
}
const noComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const noStrings = (s: string): string => s.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');

describe("照顾旧东西的代码只住在门口（legacy-at-door）", () => {
  const outside = files("src").filter((p) => !isDoor(p)).sort();
  it("门口以外名字带 legacy 的标识符 = 名单上的（只许减不许加；名单上的没了也要从名单删）", () => {
    const found: Record<string, Set<string>> = {};
    for (const p of outside) {
      const code = noStrings(noComments(readFileSync(p, "utf8")));
      for (const m of code.matchAll(/\b\w*(?:legacy|Legacy|LEGACY)\w*\b/g)) (found[p] ??= new Set()).add(m[0]);
    }
    const extra: string[] = [], stale: string[] = [];
    for (const [p, ids] of Object.entries(found)) for (const id of ids) if (!ALLOWED[p]?.[id]) extra.push(`${p}: ${id}`);
    for (const [p, ids] of Object.entries(ALLOWED)) for (const id of Object.keys(ids)) if (!found[p]?.has(id)) stale.push(`${p}: ${id}`);
    eq(extra.join("\n"), "", "新冒出来的照顾旧东西的代码：搬进 src/format/（读的时候换成现在的形状），别在运行时加「如果是旧的」");
    eq(stale.join("\n"), "", "名单上的已经没了：从 ALLOWED 删掉这一项（名单只许减）");
  });
  it("2026-11-12 搬到门口的旧东西，门口以外不再出现", () => {
    const bad: string[] = [];
    for (const p of outside) {
      const code = noComments(readFileSync(p, "utf8"));
      for (const { re, what } of MOVED) if (re.test(code)) bad.push(`${p}：${what}`);
    }
    eq(bad.join("\n"), "");
  });
});
