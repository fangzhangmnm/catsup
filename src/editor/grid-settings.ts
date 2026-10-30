// grid-settings.ts —— 绝对网格的设置（0.11 尺规纪元 ⑤，2026-10-24，Claude Fable 5.1）。纯数据 + 文档 settings 的换算；不 import editor.ts（测试直跑）。
import type { DocumentSettings } from "../format/document.ts";
import { fmtStep } from "./units.ts";
import type { Frame } from "../scene/xform.ts";

/** 网格住哪个坐标面（user 2026-10-24「grid可以配置成xy yz xz，这样方便我吸附画立面」）：xy = 地面；yz / xz = 立面。 */
export type GridPlane = "xy" | "yz" | "xz";
export const GRID_PLANES: readonly { id: GridPlane; label: string }[] = [{ id: "xy", label: "XY 地面" }, { id: "yz", label: "YZ 立面" }, { id: "xz", label: "XZ 立面" }];

/**
 * 单位制（2026-10-30 user「把显示长度单位，grid制式，格距收成一个东西。就是单位。格子跟着单位。公制 英制 dnd三种」「显示的格距都是一样的，但是吸附细分是有不同档的」
 * 「有了你的自动缩放之后显示格距意义不大了……自动缩放grid也要注意不同的进位」；Tron 账本 T172–T175 / T179 / T181，方案 ai-docs/20261030-units-design.md）：
 * 一个旋钮管三样——显示 / 输入的长度单位（units.ts）、网格怎么自动换层（gridLadder）、吸附有哪几档（snapLevels）。以前的「显示单位 / 栅格制式 / 格距 / 吸附细分」四个旋钮退役。
 */
export type UnitSystem = "metric" | "imperial" | "dnd";
export const UNIT_SYSTEMS: readonly { id: UnitSystem; label: string; hint: string }[] = [
  { id: "metric", label: "公制", hint: "米；按大小自动写 mm / cm / m / km…" },
  { id: "imperial", label: "英制", hint: "英尺英寸" },
  { id: "dnd", label: "D&D", hint: "英尺；5 ft 一格" },
];
export const isUnitSystem = (x: unknown): x is UnitSystem => x === "metric" || x === "imperial" || x === "dnd";
export const IN_M = 0.0254, FT_M = 0.3048;
/** on = 格点 + 整数长度同一开关；snap = 吸附长度（米；格点 / 整格 / 推拉停靠都按它）；plane = 网格住哪个坐标面；system = 单位制；
 *  shown = 画不画网格和三色轴（栅格面「关」= false；只管画，吸附照旧归 on——user 10-30「grid除了三个平面之外还能关。和坐标轴一起关」）。存进文档 settings、不进 undo。 */
export interface GridSettings { on: boolean; snap: number; plane: GridPlane; system: UnitSystem; shown: boolean; }
const range = (lo: number, hi: number): number[] => { const out: number[] = []; for (let e = lo; e <= hi; e++) out.push(10 ** e); return out; };
const FEET_UP = range(1, 7).map((k) => k * FT_M);   // 10 ft、100 ft … 一路英尺 ×10（不进码 / 链 / 浪 / 英里：user「工业也不这么用吧」「dnd如果自己发明一个5000ft的mile感觉也不大好」）
const INCH_FRACTIONS = [1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map((k) => k * IN_M);
/**
 * 网格自动换层的进位表（米，从细到粗；相邻两层是整数倍，粗的线一定落在细的线上）。渲染每帧按视角挑出看得清的几层（minccino/grid-ladder.ts）。
 * 公制 = ×10 一路从 1 fm 到 1 Gm（user「至少在ux层面支持从fm 更小到Mm Gm之类的」）；英制 = 1/64 … 1/2 in、1 in、1 ft（×12）、10 ft、100 ft…；
 * D&D = 英寸那段同英制、1 ft、5 ft（一格）、50 ft（十格）、500 ft…（user 10-30 拍）。
 */
export function gridLadder(sys: UnitSystem): readonly number[] {
  if (sys === "metric") return range(-15, 9);
  if (sys === "imperial") return [...INCH_FRACTIONS, FT_M, ...FEET_UP];
  return [...INCH_FRACTIONS, FT_M, 5 * FT_M, ...range(1, 6).map((k) => 5 * k * FT_M)];
}
/**
 * 画出来的网格 / 轴标记 / 刻度用的进位表 = 单位制的进位表从吸附长度那层起（user 10-30「比选的snap还细的格子不应该显示，因为没snap」）：
 * 比吸附细的层去掉；吸附长度不在表上但能整除上一层（5 cm → 10 cm、50 cm → 1 m、6 in → 1 ft）就补成最细一层 = 画出来的线永远落在吸得到的点上。
 */
export function displayLadder(sys: UnitSystem, snap: number): readonly number[] {
  const L = gridLadder(sys).filter((s) => s >= snap * (1 - 1e-9));
  if (!L.length) return [snap];
  const r = L[0] / snap;
  return Math.abs(r - 1) > 1e-9 && Math.abs(r - Math.round(r)) < 1e-6 ? [snap, ...L] : L;
}
/** 吸附的几档（米，从细到粗；user 10-30 拍）。 */
export function snapLevels(sys: UnitSystem): readonly number[] {
  if (sys === "metric") return [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1];
  if (sys === "imperial") return [1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 6, 12].map((k) => k * IN_M);
  return [FT_M, 5 * FT_M];
}
/** 换单位制时吸附落到哪一档。 */
export const DEFAULT_SNAP: Readonly<Record<UnitSystem, number>> = { metric: 0.2, imperial: IN_M, dnd: FT_M };   // user 10-30「米的默认是0.2 dnd的默认是1ft」
/** 吸附长度的短写（钮右上角 / 下拉）：和网格标记同一个写法（units.ts fmtStep）。 */
export const snapLabel = (m: number, sys: UnitSystem): string => fmtStep(m, sys);
/** 轴上的标记 / 刻度落在哪层：标记 = 屏上至少这么宽的那层（字放得下）、刻度 = 至少这么密的那层（CSS px；minccino/grid-ladder.ts ladderLevelAt）。 */
export const UNIT_LABEL_MIN_PX = 30, AXIS_TICK_MIN_PX = 10;
export const DEFAULT_GRID: GridSettings = { on: false, snap: 0.2, plane: "xy", system: "metric", shown: true };   // 读老文件缺键时的语义（老默认 = 1 m ÷ 5）
/** 新文档的栅格：吸附默认开（user 2026-10-25「以及默认snap开」）、公制 10 cm 一档。 */
export const NEW_DOC_GRID: GridSettings = { on: true, snap: DEFAULT_SNAP.metric, plane: "xy", system: "metric", shown: true };
/** 网格帧：把上下文帧的轴换到网格面上（右手系；网格画在帧的 XY、法向 = 帧的 Z）。xy = 原样；yz：x←y, y←z, z←x；xz：x←x, y←z, z←−y。 */
export function gridFrame(F: Frame, plane: GridPlane): Frame {
  if (plane === "yz") return { origin: F.origin, x: F.y, y: F.z, z: F.x };
  if (plane === "xz") return { origin: F.origin, x: F.x, y: F.z, z: { x: -F.y.x, y: -F.y.y, z: -F.y.z } };
  return F;
}

/**
 * 文档 settings → 网格状态（缺 / 坏值回默认）。CATSUP_document 3.4 起 unitSystem + snapIncrement 是主的；老文件没有 unitSystem → 按老键猜
 * （制式 D&D = D&D；建筑英尺英寸制式 / 显示单位英尺英寸或英寸 = 英制；否则公制），吸附 = snapIncrement（老文件里它一直 = 格距 ÷ 细分，写入时算的）。
 */
export function gridFromSettings(s: DocumentSettings): GridSettings {
  const system: UnitSystem = isUnitSystem(s.unitSystem) ? s.unitSystem : s.gridPreset === "dnd" ? "dnd" : s.gridPreset === "architectural" || s.displayUnit === "ft-in" || s.displayUnit === "in" ? "imperial" : "metric";
  const legacy = typeof s.gridStep === "number" && s.gridStep > 1e-9 && typeof s.gridSubdiv === "number" && s.gridSubdiv >= 1 ? s.gridStep / s.gridSubdiv : DEFAULT_GRID.snap;
  const snap = typeof s.snapIncrement === "number" && s.snapIncrement > 1e-12 && Number.isFinite(s.snapIncrement) ? s.snapIncrement : legacy;
  return { on: !!s.absoluteGrid, snap, plane: s.gridPlane === "yz" || s.gridPlane === "xz" ? s.gridPlane : "xy", system, shown: s.gridHidden !== true };
}
/**
 * 网格状态 → 文档 settings。主的：unitSystem / snapIncrement；给老读者照写的：displayUnit（公制 m、英制 / D&D ft-in）、gridPreset、gridStep = 吸附长度、gridSubdiv = 1
 * （3.3 读者吸附逐字一样；3.2 以前的读者认不出细分 1 → 退回 1/5，minor 提示一次）。
 */
export function settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings {
  const preset = g.system === "metric" ? undefined : g.system === "imperial" ? "architectural" as const : "dnd" as const;
  return { ...s, absoluteGrid: g.on, unitSystem: g.system, snapIncrement: g.snap, gridStep: g.snap, gridSubdiv: 1, displayUnit: g.system === "metric" ? "m" : "ft-in", ...(g.plane !== "xy" ? { gridPlane: g.plane } : { gridPlane: undefined }), gridPreset: preset, gridHidden: g.shown ? undefined : true };
}
