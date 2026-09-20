// migrate/index.ts —— 持久化立宪（契约 §7）：每个 CATSUP_* 子结构独立版本；迁移 = 纯函数，全住本文件夹
// `<extension>/v<N>-to-v<N+1>.ts`；读取器链式升到当前版，写入器只写当前版；比 app 新 → 拒开报版本（不降级不猜）。
// 语料 = test/fixtures/format/<extension>/v<N>/（每发过一版冻结一份）。created 2026-09-20 by Claude Fable 5.1

export const EXTENSION_VERSIONS = {
  CATSUP_document: 1,
  CATSUP_brep: 1,
  CATSUP_definitions: 1,
  CATSUP_instance: 1,
} as const;
export type CatsupExtension = keyof typeof EXTENSION_VERSIONS;

export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
/** STEPS[ext][fromVersion] = 升到 fromVersion+1 的纯函数。加迁移 = 在这里登记一条 + 冻结样本。 */
const STEPS: { [K in CatsupExtension]?: Record<number, MigrationStep> } = {};

export class FormatTooNewError extends Error {
  readonly extension: string;
  readonly fileVersion: number;
  readonly appVersion: number;
  constructor(extension: string, fileVersion: number, appVersion: number) {   // 不用参数属性：node strip-types 不支持
    super(`${extension} version ${fileVersion} is newer than this app supports (${appVersion}); refusing to open (never downgrade or guess)`);
    this.name = "FormatTooNewError";
    this.extension = extension; this.fileVersion = fileVersion; this.appVersion = appVersion;
  }
}

/** 把一个扩展的 JSON 从文件版本链式升到当前版；缺 version 视为 1（首版）。 */
export function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>): Record<string, unknown> {
  const target = EXTENSION_VERSIONS[ext];
  let v = typeof json.version === "number" ? json.version : 1;
  if (v > target) throw new FormatTooNewError(ext, v, target);
  let cur = json;
  while (v < target) {
    const step = STEPS[ext]?.[v];
    if (!step) throw new Error(`migrate: no step registered for ${ext} v${v} → v${v + 1} (constitution §7 violated)`);
    cur = step(cur);
    v++;
    if (cur.version !== v) throw new Error(`migrate: step ${ext} v${v - 1}→v${v} did not set version`);
  }
  return cur;
}
