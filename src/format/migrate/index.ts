// migrate/index.ts —— 持久化立宪（契约 §7）：每个 CATSUP_* 子结构独立版本；迁移 = 纯函数，全住本文件夹
// （小步直接登记在 STEPS 里）；读取器链式升到当前版，写入器只写当前版；比 app 新 → 拒开报版本（不降级不猜）。
// 语料 = test/fixtures/format/v<N>/（每发过一版冻结一份）。created 2026-09-20 by Claude Fable 5.1
//
// 版本史：
//   CATSUP_brep        v1 → v2（2026-10-21）：去掉 v1 的占位 `groups`（group 搬到 definition 层）；新增属性层 attributes.edge.soft（软边，每边 1 字节）。
//   CATSUP_definitions v1 → v2（2026-10-21）：list[i] 新增 `groups`（各自 B-rep + 轴框 + 父）与 `instances`（definition 索引 + 3×4 变换 + 父 group）。
//   CATSUP_brep        v2 → v3（2026-10-21 贴图纪元）：属性层 attributes.face.material（u16x2：[+n 侧槽, −n 侧槽]，0xFFFF = 无）本版读写。
//   CATSUP_definitions v2 → v3（2026-10-21 贴图纪元）：list[i].materialSlots 生效（槽号 → glTF core materials 索引；v2 一直写空表）。
//   CATSUP_material    v1（2026-10-21）：挂在 glTF core material 上的 authoring 补充 { sizeM:[w,h] }（贴图物理尺寸，米）。

export const EXTENSION_VERSIONS = {
  CATSUP_document: 1,
  CATSUP_brep: 3,
  CATSUP_definitions: 3,
  CATSUP_instance: 1,
  CATSUP_material: 1,
} as const;
export type CatsupExtension = keyof typeof EXTENSION_VERSIONS;

export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
/** STEPS[ext][fromVersion] = 升到 fromVersion+1 的纯函数。加迁移 = 在这里登记一条 + 冻结样本。 */
const STEPS: { [K in CatsupExtension]?: Record<number, MigrationStep> } = {
  CATSUP_brep: {
    1: (j) => { const { groups: _groups, ...rest } = j; void _groups; return { ...rest, version: 2 }; },
    2: (j) => ({ ...j, version: 3 }),   // v2 文件没有 face.material 层 = 全默认；层本身是可选的
  },
  CATSUP_definitions: {
    1: (j) => ({
      ...j,
      version: 2,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, groups: Array.isArray(d.groups) ? d.groups : [], instances: Array.isArray(d.instances) ? d.instances : [] })) : j.list,
    }),
    2: (j) => ({ ...j, version: 3, list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, materialSlots: Array.isArray(d.materialSlots) ? d.materialSlots : [] })) : j.list }),
  },
};

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
