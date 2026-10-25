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
//   CATSUP_brep        v3 → v4（2026-10-24 曲线与曲面纪元）：curves[] 本版读写（有序边链 + 种类 + 闭合 + 圆弧参数，契约 §5）；v3 文件的 curves 一直是空表 = 无曲线。
//   CATSUP_definitions v3 → v4（2026-10-24 尺规纪元）：list[i].guides 与 groups[j].guides（参考线 / 参考点，池本地坐标）；缺 = 空。
//   CATSUP_document    v1 → v2（2026-10-24 尺规纪元）：axes（绘图轴，世界坐标 Frame）；缺 = 世界帧。
//   CATSUP_document    v2 → v3（2026-10-24 0.14 物体模型）：layers（层表；缺 = 只有默认层 {id 0}）。minor：加可选键。
//   CATSUP_definitions v4 → v5（2026-10-24 0.14 物体模型）：instances[j].layer（缺 = 继承）；list[i].kind = card 时 list[i].card{image 索引, sizeM, anchor, billboard}、= mesh 时 list[i].mesh{positions/indices/… bufferView}；
//   CATSUP_definitions v5 → v6（2026-10-24 深夜 CardBody sunset，user「cardbody需要sunset」「拆」）：list[i].kind = card 的定义降成**空 brep 定义**（name / instances / 空 brep 占位留，card 载荷丢；dev 里从没有文件存过 card，拆在零成本窗口里）。
//                      groups[j].locked **丢弃**（组不是物体，user 2026-10-24）。minor：老读者只是少看见一个可选键 / 不认的 kind 本来就拒开。

export const EXTENSION_VERSIONS = {
  CATSUP_document: 3,
  CATSUP_brep: 4,
  CATSUP_definitions: 6,
  CATSUP_instance: 1,
  CATSUP_material: 1,
} as const;
export type CatsupExtension = keyof typeof EXTENSION_VERSIONS;

export type MigrationStep = (json: Record<string, unknown>) => Record<string, unknown>;
/** STEPS[ext][fromVersion] = 升到 fromVersion+1 的纯函数。加迁移 = 在这里登记一条 + 冻结样本。 */
const NO_GUIDES = (): Record<string, unknown> => ({ lines: [], points: [] });
const STEPS: { [K in CatsupExtension]?: Record<number, MigrationStep> } = {
  CATSUP_document: {
    1: (j) => ({ ...j, version: 2, axes: isPlainObject(j.axes) ? j.axes : { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] } }),
    2: (j) => ({ ...j, version: 3, layers: Array.isArray(j.layers) ? j.layers : [{ id: 0, name: "默认", visible: true }] }),
  },
  CATSUP_brep: {
    1: (j) => { const { groups: _groups, ...rest } = j; void _groups; return { ...rest, version: 2 }; },
    2: (j) => ({ ...j, version: 3 }),   // v2 文件没有 face.material 层 = 全默认；层本身是可选的
    3: (j) => ({ ...j, version: 4, curves: Array.isArray(j.curves) ? j.curves : [] }),   // v3 的 curves 是空占位 = 无曲线
  },
  CATSUP_definitions: {
    1: (j) => ({
      ...j,
      version: 2,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, groups: Array.isArray(d.groups) ? d.groups : [], instances: Array.isArray(d.instances) ? d.instances : [] })) : j.list,
    }),
    2: (j) => ({ ...j, version: 3, list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, materialSlots: Array.isArray(d.materialSlots) ? d.materialSlots : [] })) : j.list }),
    3: (j) => ({
      ...j,
      version: 4,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({
        ...d,
        guides: isPlainObject(d.guides) ? d.guides : NO_GUIDES(),
        groups: Array.isArray(d.groups) ? (d.groups as Record<string, unknown>[]).map((g) => ({ ...g, guides: isPlainObject(g.guides) ? g.guides : NO_GUIDES() })) : d.groups,
      })) : j.list,
    }),
    4: (j) => ({
      ...j,
      version: 5,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({
        ...d,
        groups: Array.isArray(d.groups) ? (d.groups as Record<string, unknown>[]).map((g) => { const { locked: _l, ...rest } = g; void _l; return rest; }) : d.groups,   // 组不是物体：锁丢弃
      })) : j.list,
    }),
    5: (j) => ({
      ...j,
      version: 6,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => { if (d.kind !== "card") return d; const { card: _c, kind: _k, ...rest } = d; void _c; void _k; return rest; }) : j.list,   // CardBody sunset：card → 空 brep 定义
    }),
  },
};
const isPlainObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

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
