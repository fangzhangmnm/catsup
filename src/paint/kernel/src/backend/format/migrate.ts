// src/backend/format/ —— WeebPaint 的格式版本纪律：每个子结构自己的拍子 + 升级代码全住本文件夹（家族规矩 = 家族根
//   `ai-docs/20261021-format-version-discipline.md`；user 2026-10-21「版本纪律能做成 catsup moonsinger 一样不同 component 有自己的拍子，
//   然后有一个专门的代码文件夹放升级代码吗？这个变成全家的版本纪律」「三级语义 同意」；形状抄 WXHW `src/project/migrate/`）。
// created 2026-09-29 by Claude Fable 5.1（持久化立宪：整数拍 + 迁移链）· 2026-10-21 Claude Opus 5.5 改成三级拍子（F-69）
//
// 子结构（component）= 各自独立演化的五样（参考目录 `.weebpaint/references/` 归 @internal/reference-window 自己管拍子，这里零知识）：
//   一张 .ora 里的三样——
//   ora       = stack.xml 的 `weebpaint:format` + 整个 zip 的布局（entry 叫什么、住哪）。升级 = layout.ts 的布局归一化表（不走 STEPS）。
//   desk      = .weebpaint/editor-state.json（workbench-state.ts 的 freshGroups 形状）。major 键 `version`。
//   timelapse = .weebpaint/timelapse.json（TimelapseJsonV1）。major 键 `v`（出生就叫 v；改名 = 现网版本读不了新文件，照旧）。
//   笔架 collection「brush-rack」里的两样（逐条目带拍，形状抄 JRB `src/format/migrate/`）——
//   brush     = 每支笔一个条目（brush-types.ts Brush）。major 键 `version`。笔向来整支浅拷贝着改，未知字段天然活着，不需要 extra 袋。
//   rackMeta  = `.meta` 条目（{ folderOrder, order }）。major 键 `version`。纯函数改它时 `...meta` 保住未知键（brushes.ts）。
//   咽喉 = src/rack-format-guard.ts：读时判拍子（major 更新的条目不显示、不写、不删），写时盖本版拍。
//   设置 collection（synced-user-preference / synced-app-state）**不带拍**：一键一值、app 只读登记过的键、从不整表重写，
//   每个键的值形状就是它自己的契约——不认识的键 app 不读不写，collection 原样留着，天然直通。要给某个键换形状 = 换个键名（先例：#8 defringe → defringePng）。
// 拍子 = major.minor.patch 三个整数，互不联动；写入器只写当前拍（FORMAT），读取器按拍判：
//   · major 比本版大 = 不可兼容 / 重大安全问题 → 那一块拒读、**永不写回**：
//       ora → 整张画只读（session-state：所有落盘路径都不写，显式保存提示另存为）；desk / timelapse → 原字节原样带着存回，编辑器用默认值。
//   · minor 比本版大 = 缺功能 / 行为变化 → 能开能改能存：不认识的键原样带回（desk / timelapse 顶层 extra 袋；`.weebpaint/` 下不认识的
//       entry 也原样带回），告诉用户一次（src/format-notice.ts）。
//   · patch 比本版大 = 可以无脑降 → 静默。
//   · 比本版小：major 小 = ora 走 layout.ts / JSON 走 STEPS 链式升级（纯函数，一步 +1）；minor / patch 小 = 缺的当默认，不用代码。
//   · 同 major 内只加不改；删字段 = 保留读、停止写；真要删 = major +1 + 一条 STEP + 冻结样本。
//   · 嵌在已知对象里的未知子键不直通（desk.refPanel.xxx 这种）：要加子字段就把它做成顶层键，或改父字段的解析。
//   · **stack.xml 内部（<image> / <stack> / <layer> 的属性与子元素）没有直通**（test/format-stack-xml-unknown.test.mjs 钉住）：
//     同一个 ora major 里不准往 stack.xml 加新属性 / 元素——要加就放 `.weebpaint/` 新 entry（直通）或 ora major +1。
//     兜底的是第二层「写这画的 app 版本比我新 → 说一次 + 落盘前确认」（session-state；和拍子并存，2026-10-21 审计恢复）。
// 物理形状：沿用整数 major 键（已发出去的老读者只认它，它们的 too-new 逻辑继续有效），再加两个可选整数键 `minor` / `patch`（缺 = 0）；
//   stack.xml 是属性 `weebpaint:format`（major）+ `weebpaint:format-minor` / `weebpaint:format-patch`。不改成字符串。
// 改格式 = ① FORMAT 里对应子结构 +1 ② major 变了：JSON 在 STEPS 登记一条 / ora 在 layout.ts 加一条归一化 ③ `node tools/freeze-format-sample.mjs <新目录>`
//   冻样本（笔架：test/fixtures/format/rack/ 手冻一条）④ desk / timelapse 的已知键表（workbench-state.ts deskKnownKeys / timelapse-state.ts KNOWN_TIMELAPSE_FIELDS）
//   ⑤ CLAUDE.md 记一笔。
//   少一样守卫红（test/format-migrate.test.mjs / test/format-samples.test.mjs）。

export type Component = "ora" | "desk" | "timelapse" | "brush" | "rackMeta";
export type JsonComponent = Exclude<Component, "ora">;
export interface Stamp { major: number; minor: number; patch: number }

/** 本版写出的拍子（SSoT）。
 *  ora 3 = 2026-09-29 持久化立宪（参考清单独立成目录、desk 带 version）；minor / patch 键 2026-10-21 起写（之前 = 3.0.0）。
 *  desk 1 = 2026-09-29 起的形状；timelapse 1 = 2026-08-19 起的形状；brush 1 = v99 schema（brushes.ts 头）；rackMeta 1 = 2026-07 rack v2 起的形状。 */
export const FORMAT: Readonly<Record<Component, Readonly<Stamp>>> = {
  ora: { major: 3, minor: 0, patch: 0 },
  desk: { major: 1, minor: 1, patch: 0 },   // 1.1.0 = 2026-11-09 加顶层键 exportUpscale（导出放大倍数）：加可选字段 = minor，旧版本直通带回、提示一次
  timelapse: { major: 1, minor: 0, patch: 0 },
  brush: { major: 1, minor: 0, patch: 0 },
  rackMeta: { major: 1, minor: 0, patch: 0 },
};
/** 缺 major 键时当几：ora 无 `weebpaint:format` = 0（改名前的存量，照样能读）；其余从前没写过 = 1。 */
export const MISSING_MAJOR: Readonly<Record<Component, number>> = { ora: 0, desk: 1, timelapse: 1, brush: 1, rackMeta: 1 };
/** JSON 子结构的 major 键名。 */
export const MAJOR_KEY: Readonly<Record<JsonComponent, string>> = { desk: "version", timelapse: "v", brush: "version", rackMeta: "version" };
/** 拍子三键（写入器专属：直通的 extra 袋永远不含它们——拍子只写自己的）。 */
export const STAMP_KEYS: Readonly<Record<JsonComponent, readonly string[]>> = {
  desk: ["version", "minor", "patch"], timelapse: ["v", "minor", "patch"], brush: ["version", "minor", "patch"], rackMeta: ["version", "minor", "patch"],
};

export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
/** STEPS[子结构][major] = 把 major 升到 major+1 的纯函数（必须把 major 键写成 major+1）。今天空表：四样 JSON 都只有 1。
 *  （笔的 v82–v98 → v99 归一化 brushes.ts migrateBrush 早于拍子、只管「导入单支笔 JSON」那一条路，无拍可依——留在原处，不进链。） */
export const STEPS: Readonly<Partial<Record<JsonComponent, Readonly<Record<number, MigrationStep>>>>> = {};

export const fmt = (s: Stamp): string => `${s.major}.${s.minor}.${s.patch}`;

export class FormatTooNewError extends Error {
  readonly component: Component;
  readonly fileStamp: Stamp;
  readonly appStamp: Stamp;
  constructor(component: Component, fileStamp: Stamp, appStamp: Stamp) {   // 不用参数属性：node strip-types 不支持
    super(`${component} format ${fmt(fileStamp)} is newer than this app (${fmt(appStamp)}); not reading it and never writing it back (no downgrade, no guessing)`);
    this.name = "FormatTooNewError"; this.component = component; this.fileStamp = fileStamp; this.appStamp = appStamp;
  }
}

const nat = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
const natStr = (v: string | null | undefined): number | null => (v != null && /^\d+$/.test(v.trim()) ? parseInt(v.trim(), 10) : null);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** JSON 子结构的拍子：major 键缺 → MISSING_MAJOR；minor / patch 缺或非法 = 0。major 键在但不是非负整数（如老 timelapse 的浮点 / 字符串）→ 截断 / 当 1。 */
export function readStamp(c: JsonComponent, json: unknown): Stamp {
  const o = isObj(json) ? json : {};
  const raw = o[MAJOR_KEY[c]];
  const major = nat(raw) ?? (typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.trunc(raw)) : MISSING_MAJOR[c]);
  return { major, minor: nat(o.minor) ?? 0, patch: nat(o.patch) ?? 0 };
}
/** stack.xml 的拍子（parseStackXml 读出的三个属性原文）。 */
export function readOraStamp(attrs: { format?: string | null; minor?: string | null; patch?: string | null }): Stamp {
  return { major: natStr(attrs.format) ?? MISSING_MAJOR.ora, minor: natStr(attrs.minor) ?? 0, patch: natStr(attrs.patch) ?? 0 };
}

/** 判决：too-new = major 比本版大（拒读、永不写回）；其余 = 同 major（或已升到本版 major）下的 minor / patch 比较。 */
export type Verdict = "too-new" | "same" | "older" | "newer-minor" | "newer-patch";
export function judge(c: Component, file: Stamp): Verdict {
  const mine = FORMAT[c];
  if (file.major > mine.major) return "too-new";
  if (file.major < mine.major) return "older";
  if (file.minor > mine.minor) return "newer-minor";
  if (file.minor < mine.minor) return "older";
  if (file.patch > mine.patch) return "newer-patch";
  if (file.patch < mine.patch) return "older";
  return "same";
}

/** JSON 子结构读进来：升到本版 major（STEPS 链），给出文件的拍子与判决。major 比本版大 → FormatTooNewError（调用方原字节带着、永不写回）。
 *  不是对象 → 原样返回、判 same（调用方当缺失 / 损坏处理）。缺 major 键 = MISSING_MAJOR（把键补上，下游形状检查不用开例外）。steps 可注入（测试）。 */
export function migrate(c: JsonComponent, json: unknown, steps: typeof STEPS = STEPS): { json: unknown; stamp: Stamp; verdict: Verdict } {
  if (!isObj(json)) return { json, stamp: { ...FORMAT[c] }, verdict: "same" };
  const key = MAJOR_KEY[c];
  const stamp = readStamp(c, json);
  const verdict = judge(c, stamp);
  if (verdict === "too-new") throw new FormatTooNewError(c, stamp, FORMAT[c]);
  let cur: Record<string, unknown> = nat(json[key]) === stamp.major ? json : { ...json, [key]: stamp.major };
  let v = stamp.major;
  while (v < FORMAT[c].major) {
    const step = steps[c]?.[v];
    if (!step) throw new Error(`migrate: no step registered for ${c} v${v} → v${v + 1} (format discipline violated: every major bump needs a STEP)`);
    cur = step(cur); v++;
    if (cur[key] !== v) throw new Error(`migrate: step ${c} v${v - 1}→v${v} did not set ${key}`);
  }
  return { json: cur, stamp, verdict };
}

/** 写入器用：本版的拍子落成三个键（desk = version / minor / patch；timelapse = v / minor / patch）。 */
export function stampFields(c: JsonComponent): Record<string, number> {
  const s = FORMAT[c]; const [k0, k1, k2] = STAMP_KEYS[c];
  return { [k0]: s.major, [k1]: s.minor, [k2]: s.patch };
}

/** 直通：JSON 顶层里本版不认识的键（不含拍子三键）装进 extra 袋，写入器先铺 extra 再铺已知键（已知键永远赢）。 */
export function splitExtra(c: JsonComponent, json: unknown, known: readonly string[]): Record<string, unknown> {
  if (!isObj(json)) return {};
  const skip = new Set([...known, ...STAMP_KEYS[c]]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) if (!skip.has(k)) out[k] = v;
  return out;
}
