// migrate/settings.ts —— 文档 settings 的两个门口。created 2026-11-12 by Claude Opus 5.5
// user 11-13：「backward compatibility的税不应该太重，而且需要严格隔离，而不是渗透进每一个运行时逻辑」（统筹转；读法 = 家族 ai-docs/20261021-format-version-discipline.md 第 6 节）。
// 读：文件里的 settings（哪一版写的都行）→ 现在的形状 SettingsNow。单位制、吸附长度一定有且合法；尺度参考是现在的 id、旧的单选键已经并进来。
//     运行时（editor/grid-settings.ts gridFromSettings、editor/scale-ref.ts scaleRefsFromSettings）只收 SettingsNow，不再认任何旧键。
// 写：现在的几样 → 文件 settings，顺手给老读者照写 displayUnit / gridPreset / gridStep = 吸附长度 / gridSubdiv = 1（3.3 的读者吸附逐字一样；3.2 以前的读者认不出细分 1，
//     退回 1/5、提示一次），旧的单选键 scaleRef 不再写。
// 文件读进来的那份 CatsupDocument.settings 原样留着（老文件原样存回去字节不变）；门口只在「文件 ↔ 编辑器」那一下（app/session.ts 打开和存盘）。
// 以前这些住在 editor/grid-settings.ts、editor/scale-ref.ts 里（v0.19.64 及以前）；搬过来的时候逐条照搬，结果一样（test/settings-door.test.ts 拿旧写法对拍）。
import type { DocumentSettings } from "../document.ts";
import { isUnitSystem, unitSystemRow, type UnitSystem } from "../unit-systems.ts";

export type UnitSystemId = UnitSystem;   // 单位制一张表 = format/unit-systems.ts
/** 现在的形状（运行时只认它）。 */
export interface SettingsNow {
  readonly unitSystem: UnitSystemId;
  /** 吸附长度（米，> 0、有限）。 */
  readonly snapIncrement: number;
  readonly absoluteGrid: boolean;
  readonly gridPlane: "xy" | "yz" | "xz";
  /** 网格和三色轴不画。 */
  readonly gridHidden: boolean;
  /** 尺度参考勾了哪几项（现在的 id、去重；[] = 不显示）；undefined = 文件里没写 = 用默认。 */
  readonly scaleRefs?: readonly string[];
}

const isUnitSystemId = isUnitSystem;
/** 老文件缺吸附长度、也算不出来时的吸附长度：老默认 1 m ÷ 5。 */
const OLD_DEFAULT_SNAP = 0.2;
/** 尺度参考选单改过名的 id（仓鼠 v3：人体 · 儿童 body/CHILD → body/KIDS）：读到旧的换成新的。 */
const RENAMED_SCALE_REFS: Readonly<Record<string, string>> = { "body/CHILD": "body/KIDS" };

/**
 * 读的门口。CATSUP_document 3.4 起 unitSystem + snapIncrement 是主的；
 * 老文件没有 unitSystem → 按老键猜（制式 D&D = D&D；建筑英尺英寸制式 / 显示单位英尺英寸或英寸 = 英制；否则公制）；
 * 吸附长度坏了（不是正的有限数）→ 格距 ÷ 细分（老文件里 snapIncrement 一直 = 这个，写入时算的），也坏了 → 1 m ÷ 5。
 * 尺度参考：`scaleRefs`（数组）；没有就看 v0.13.52–56 单选时写的 `scaleRef`（字符串，"none" = 不显示）；都没有 = undefined。认不出的 id 原样留着。
 */
export function settingsNow(s: DocumentSettings): SettingsNow {
  const unitSystem: UnitSystemId = isUnitSystemId(s.unitSystem) ? s.unitSystem : s.gridPreset === "dnd" ? "dnd" : s.gridPreset === "architectural" || s.displayUnit === "ft-in" || s.displayUnit === "in" ? "imperial" : "metric";
  const fromOld = typeof s.gridStep === "number" && s.gridStep > 1e-9 && typeof s.gridSubdiv === "number" && s.gridSubdiv >= 1 ? s.gridStep / s.gridSubdiv : OLD_DEFAULT_SNAP;
  const snapIncrement = typeof s.snapIncrement === "number" && s.snapIncrement > 1e-12 && Number.isFinite(s.snapIncrement) ? s.snapIncrement : fromOld;
  const fix = (v: string): string => RENAMED_SCALE_REFS[v] ?? v;
  const raw = s as { scaleRefs?: unknown; scaleRef?: unknown };
  const scaleRefs = Array.isArray(raw.scaleRefs) ? [...new Set(raw.scaleRefs.filter((v): v is string => typeof v === "string").map(fix))]
    : typeof raw.scaleRef === "string" ? (raw.scaleRef === "none" ? [] : [fix(raw.scaleRef)]) : undefined;
  return { unitSystem, snapIncrement, absoluteGrid: !!s.absoluteGrid, gridPlane: s.gridPlane === "yz" || s.gridPlane === "xz" ? s.gridPlane : "xy", gridHidden: s.gridHidden === true, ...(scaleRefs ? { scaleRefs } : {}) };
}

/**
 * 写的门口（网格那几样）：把现在的几样写进文件 settings，别的键原样留着、顺序不动；给老读者照写那几个旧键；旧的单选键 scaleRef 去掉。
 * 键的先后照 v0.19.64 及以前 editor/grid-settings.ts settingsFromGrid 那个对象的写法（写出去的 JSON 字节一样）。尺度参考那一项归 editor/scale-ref.ts scaleRefsToSettings（只管现在的键）。
 */
export function settingsForFile(s: DocumentSettings, now: { readonly absoluteGrid: boolean; readonly unitSystem: UnitSystemId; readonly snapIncrement: number; readonly gridPlane: "xy" | "yz" | "xz"; readonly gridHidden: boolean }): DocumentSettings {
  const { scaleRef: _oldSingle, ...rest } = s as DocumentSettings & { scaleRef?: string };
  const legacy = unitSystemRow(now.unitSystem).legacy, preset = legacy.gridPreset;   // 给旧版本照写的旧键（表里那一行说写什么）
  return { ...rest, absoluteGrid: now.absoluteGrid, unitSystem: now.unitSystem, snapIncrement: now.snapIncrement, gridStep: now.snapIncrement, gridSubdiv: 1, displayUnit: legacy.displayUnit, ...(now.gridPlane !== "xy" ? { gridPlane: now.gridPlane } : { gridPlane: undefined }), gridPreset: preset, gridHidden: now.gridHidden ? true : undefined };
}
