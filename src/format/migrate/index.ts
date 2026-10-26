// migrate/index.ts —— 持久化立宪（契约 §7）：每个 CATSUP_* 子结构独立拍子（major.minor.patch，见下）；迁移 = 纯函数，全住本文件夹
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
//   CATSUP_brep        4.1（2026-10-26 DT8 两个表面，Claude Opus 5.5，周二 Fable 审）：attributes.face.material 的两槽开始写不同值（[+n 侧, −n 侧]；4.0 及以前两槽同值）。
//   CATSUP_brep        4.2（2026-10-26 DT87 折线，Claude Opus 5.5）：边层多一个知名名字 fold（attributes.edge.fold，u8；只在有折线时写）——面内部的折痕：
//                      两侧是同一个多边形的两块平面片。老读者照编码规则原样带着这一层（边层是开放集），但不认它的意思 = 折线画成普通边、两块分开选（minor 语义）。
//                      minor：老读者只取 +n 侧——能开能存，背面单独涂的颜色会变成正面那份（提示一次）。
//   CATSUP_definitions v3 → v4（2026-10-24 尺规纪元）：list[i].guides 与 groups[j].guides（参考线 / 参考点，池本地坐标）；缺 = 空。
//   CATSUP_document    v1 → v2（2026-10-24 尺规纪元）：axes（绘图轴，世界坐标 Frame）；缺 = 世界帧。
//   CATSUP_document    v2 → v3（2026-10-24 0.14 物体模型）：layers（层表；缺 = 只有默认层 {id 0}）。minor：加可选键。
//   CATSUP_definitions v4 → v5（2026-10-24 0.14 物体模型）：instances[j].layer（缺 = 继承）；list[i].kind = card 时 list[i].card{image 索引, sizeM, anchor, billboard}、= mesh 时 list[i].mesh{positions/indices/… bufferView}；
//   CATSUP_definitions v5 → v6（2026-10-24 深夜 CardBody sunset，user「cardbody需要sunset」「拆」）：list[i].kind = card 的定义降成**空 brep 定义**（name / instances / 空 brep 占位留，card 载荷丢；dev 里从没有文件存过 card，拆在零成本窗口里）。
//                      groups[j].locked **丢弃**（组不是物体，user 2026-10-24）。minor：老读者只是少看见一个可选键 / 不认的 kind 本来就拒开。

//   CATSUP_document    3.1（2026-10-25 追认）：settings 里 10-24/25 加的可选键 gridPlane / gridPreset / scaleRefs（老读者原样带回、minor 提示一次）。
//   CATSUP_desk        1.0（2026-10-25，Claude Fable 5.1）：桌面态子结构 = WeebPaint `.weebpaint/editor-state.json` 在 glb 里的镜像（user「不是应该跟文件吗，看一下weebpaint…」）：
//                      menuTabs（两个 ☰ 停在哪页）、lastView（相机；从 CATSUP_document 搬来 = 契约 §7.2「保留读、停止写」）。不进定稿指纹、不标脏、新建必 reset；
//                      **major 比本版新 → 不拒开**：原字节带回、桌面用默认（只有 document / brep / definitions 太新才拒开）。
//   CATSUP_definitions 6.1（2026-10-25，Claude Opus 5.5；DT49 隐藏）：可选键 instances[j].hidden（只写 true）；同时 glTF 节点带 Khronos KHR_node_visibility { visible: false }
//                      （契约 §5 早定的「hide = KHR_node_visibility」；extensionsUsed 只在有隐藏时列）。老读者少看见一个键 = 藏起来的会显示出来、存回去会丢掉隐藏（minor 语义）。
//   CATSUP_definitions 6.2（2026-10-26，Claude Opus 5.5；DT86 坐标架 / 组件原点拆开）：可选键 list[i].drawFrame { origin, x, y, z }（进这个组件画图用的坐标架，定义坐标；
//                      只在摆过时写，根定义不写——根的在 document.axes）。老读者少看见它 = 进组件时坐标架回到组件原点（minor 语义：能开能存，丢的是画图辅助）。
//   CATSUP_definitions 6.3（2026-10-26，Claude Opus 5.5；DT50 圆规 / 球规）：可选键 guides.circles[{ id, c, n, r }]（参考圆：圆心 / 法向 / 半径，池本地坐标）、
//                      guides.spheres[{ id, c, r }]（参考球）；只在有时写（老文件字节 / 定稿指纹不变）。老读者看不见它们 = 参考圆 / 球不显示也不参与吸附（minor 语义：能开能存，
//                      存回去时丢的是画图辅助——参考几何本来就是辅助线）。
//   CATSUP_desk        1.1（2026-10-25，Claude Opus 5.5）：可选键 refPanel { open, left, top, width, height }（参考窗开着没有 + 在哪；视图态，同 MoonSinger view.ref）。
//   CATSUP_references  1.0（2026-10-25，Claude Opus 5.5；契约 §5.8）：参考窗牌组 = @internal/reference-window 的目录 `.catsup/references/`（manifest.json + 每张卡）原样进 glb：
//                      files[] = { path, mimeType, bufferView }；**本层不懂清单**（清单的拍子 / 迁移归库）。空牌组不写这个扩展（抠）。不进定稿指纹、不进撤销；
//                      **major 比本版新 → 不拒开**（同 desk）：原字节带回、参考窗先不显示、提示一次。user 2026-10-25「咱们是不忘了接reference window. 先看懂我们的文件规范」。
//
// 三级拍子（家族纪律 ai-docs/20261021-format-version-discipline.md；user 2026-10-21「三级语义 同意」；CatsUp 2026-10-25 补齐，Claude Fable 5.1）：
//   每个 CATSUP_* 一个拍子 major.minor.patch，互不联动。物理形状 = 整数键 `version` 原地当 major（已发出去的老读者只认它，它们的 too-new 逻辑继续有效）
//   + 两个可选整数键 `minor` / `patch`（缺 = 0）。写入器只写当前拍（FORMAT）；读取器：
//   · major 比本版大 = 不可兼容 → FormatTooNewError 拒开（desk 例外，见上）；比本版小 = STEPS 链式升级。
//   · minor 比本版大 = 缺功能 / 行为变化 → 能开能存，未知键直通，readNotes.newerMinor 记一笔 → 宿主提示一次。
//   · patch 比本版大 = 可无脑降 → 静默。
//   改格式 = ① FORMAT 对应子结构 +1（major 变了在 STEPS 登记一条）② `node scripts/freeze-format-fixtures.mjs` 冻样本（目录名 = 全部拍子的签名 formatTag）③ 本头注释记一笔。
//   少一样守卫红（test/format.test.ts「冻结样本语料」）。

export interface Stamp { readonly major: number; readonly minor: number; readonly patch: number }
/** 本版写出的拍子（SSoT）。 */
export const FORMAT = {
  CATSUP_document: { major: 3, minor: 1, patch: 0 },
  CATSUP_brep: { major: 4, minor: 2, patch: 0 },
  CATSUP_definitions: { major: 6, minor: 3, patch: 0 },
  CATSUP_instance: { major: 1, minor: 0, patch: 0 },
  CATSUP_material: { major: 1, minor: 0, patch: 0 },
  CATSUP_desk: { major: 1, minor: 1, patch: 0 },
  CATSUP_references: { major: 1, minor: 0, patch: 0 },
} as const satisfies Record<string, Stamp>;
export type CatsupExtension = keyof typeof FORMAT;
export const CATSUP_EXTENSION_ORDER: readonly CatsupExtension[] = ["CATSUP_document", "CATSUP_brep", "CATSUP_definitions", "CATSUP_instance", "CATSUP_material", "CATSUP_desk", "CATSUP_references"];
/** 各子结构的 major（老名字，读写两端的 too-new 判定与 STEPS 索引都用它）。 */
export const EXTENSION_VERSIONS: Readonly<Record<CatsupExtension, number>> = Object.fromEntries(CATSUP_EXTENSION_ORDER.map((k) => [k, FORMAT[k].major])) as Record<CatsupExtension, number>;
/** 写入器盖拍子：`version` 必写；`minor` / `patch` 是可选键（缺 = 0），为 0 时不写——省字节（§3.2「抠」），字节照样确定。 */
export const stampOf = (ext: CatsupExtension): { version: number; minor?: number; patch?: number } => {
  const f = FORMAT[ext];
  return { version: f.major, ...(f.minor ? { minor: f.minor } : {}), ...(f.patch ? { patch: f.patch } : {}) };
};
export const fmtStamp = (s: Stamp): string => `${s.major}.${s.minor}.${s.patch}`;
/** 全部拍子的签名（冻结样本目录名 `v<签名>`；任何一个拍子动了 = 新目录 = 新语料，机械执法）。 */
export const formatTag = (f: Readonly<Record<CatsupExtension, Stamp>> = FORMAT): string => CATSUP_EXTENSION_ORDER.map((k) => fmtStamp(f[k])).join("-");
/** 文件里的拍子：缺 version = 1（首版），缺 minor / patch = 0；非整数当 0 / 1（不猜更多）。 */
export function readStamp(json: Record<string, unknown>): Stamp {
  const int = (v: unknown, dflt: number): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : dflt);
  return { major: int(json.version, 1), minor: int(json.minor, 0), patch: int(json.patch, 0) };
}
export type StampVerdict = "same" | "older" | "newer-minor" | "newer-patch";
/** 同 major 下文件拍子 vs 本版：minor 大 = newer-minor（提示一次），patch 大 = newer-patch（静默），其余 older / same。 */
export function compareStamp(file: Stamp, mine: Stamp): StampVerdict {
  if (file.minor > mine.minor) return "newer-minor";
  if (file.minor < mine.minor) return "older";
  if (file.patch > mine.patch) return "newer-patch";
  if (file.patch < mine.patch) return "older";
  return "same";
}
/** 读取时攒的判决（不持久化）：newerMinor = 哪些子结构比本版新一个 minor（宿主提示一次）；deskTooNew = 桌面态 major 比本版新（原字节带回、用默认）；
 *  referencesTooNew = 参考窗牌组 major 比本版新（原字节带回、参考窗先不显示）。 */
export interface FormatReadNotes { newerMinor: { ext: CatsupExtension; file: Stamp; mine: Stamp }[]; newerPatch: { ext: CatsupExtension; file: Stamp; mine: Stamp }[]; deskTooNew?: Stamp; referencesTooNew?: Stamp }
export const emptyReadNotes = (): FormatReadNotes => ({ newerMinor: [], newerPatch: [] });

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

/** 把一个扩展的 JSON 从文件 major 链式升到当前版；缺 version 视为 1（首版）。同 major 下 minor / patch 比本版新 → 记进 notes（有的话），不改 JSON。 */
export function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>, notes?: FormatReadNotes): Record<string, unknown> {
  const target = EXTENSION_VERSIONS[ext];
  const file = readStamp(json);
  let v = file.major;
  if (v > target) throw new FormatTooNewError(ext, v, target);
  if (notes && v === target) {
    const verdict = compareStamp(file, FORMAT[ext]);
    const seen = (arr: { ext: CatsupExtension }[]): boolean => arr.some((n) => n.ext === ext);   // brep / material 一个文件里出现多次：同一子结构只记一笔
    if (verdict === "newer-minor" && !seen(notes.newerMinor)) notes.newerMinor.push({ ext, file, mine: FORMAT[ext] });
    else if (verdict === "newer-patch" && !seen(notes.newerPatch)) notes.newerPatch.push({ ext, file, mine: FORMAT[ext] });
  }
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
