// unit-systems.ts —— 单位制一张表：一行一个单位制，写全它的一切。created 2026-11-13 by Claude Opus 5.5
// 施工单 ai-docs/20261112-unit-system-mm-workorder.md 第四节（统筹 11-13）：以前按单位制分支的地方三十来处散在七个文件里，公制、英制之后加过 D&D，
//   再照样加一行就又要改七个文件。现在：名字和说明、显示怎么写、不带单位的数按什么、网格进位表、吸附的几档和默认档、给旧版本照写的旧键，都在这一行；
//   对外的函数（grid-settings.ts gridLadder / snapLevels / DEFAULT_SNAP、units.ts setUnitSystem / fmtStep / fmtLen……）签名不动、里面查表。
//   加一个单位制 = 这里加一行（+ 文件的读写门口 format/migrate/settings.ts 认它）。守卫 test/unit-systems.test.ts 钉住每一行都齐。
// 住 format/：单位制是文件设置的一项，读写门口要认 id 和旧键；这里纯数据、不 import 任何东西（format 不 import editor）。
// 数据一律存米（SI）；这张表只管显示和输入（user 10-22「引擎统一吃 SI，显示层换」）。

export type UnitSystem = "metric" | "imperial" | "dnd";

/** 显示 / 输入的长度单位（units.ts LengthUnit 的一部分）：不带单位的数按它算。 */
export type SystemDisplay = "m" | "mm" | "ft";

export interface UnitSystemRow {
  readonly id: UnitSystem;
  readonly label: string;
  /** 下拉里的说明。 */
  readonly hint: string;
  /** 显示 / 不带单位的数按什么。 */
  readonly display: SystemDisplay;
  /** 读数（提示、吸附标签、数值回显）怎么写：auto-si = 按大小自动挑 fm … Gm；ft-in = 英尺英寸。 */
  readonly readout: "auto-si" | "ft-in";
  /** 整齐长度（网格一层 / 吸附一档）的短写：si = 按大小挑；imperial = 英寸分数 / 英寸 / 英尺。 */
  readonly stepStyle: "si" | "imperial";
  /** 网格自动换层的进位表（米，从细到粗；相邻两层整数倍）。 */
  readonly ladder: readonly number[];
  /** 吸附的几档（米，从细到粗；每档整除进位表里比它粗的下一层）。 */
  readonly snaps: readonly number[];
  /** 换到这个单位制时吸附落在哪一档（米；在 snaps 里）。 */
  readonly defaultSnap: number;
  /** ≥ 1 英里后面加「约 x mi」。 */
  readonly miles: boolean;
  /** 速度那半按哪一家（D&D 当英制）。 */
  readonly speedFamily: "metric" | "imperial";
  /** 给旧版本照写的旧键（3.4 之前的读者靠 displayUnit 显示、靠 gridPreset 认制式；gridPreset 缺 = 公制）。 */
  readonly legacy: { readonly displayUnit: "m" | "mm" | "ft-in"; readonly gridPreset?: "architectural" | "dnd" };
}

export const IN_M = 0.0254, FT_M = 0.3048;
const range = (lo: number, hi: number): number[] => { const out: number[] = []; for (let e = lo; e <= hi; e++) out.push(10 ** e); return out; };
const FEET_UP = range(1, 7).map((k) => k * FT_M);   // 10 ft、100 ft … 一路英尺 ×10（不进码 / 链 / 浪 / 英里：user「工业也不这么用吧」「dnd如果自己发明一个5000ft的mile感觉也不大好」）
const INCH_FRACTIONS = [1 / 64, 1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1].map((k) => k * IN_M);
/** 公制 = ×10 一路从 1 fm 到 1 Gm（user「至少在ux层面支持从fm 更小到Mm Gm之类的」）。 */
const SI_LADDER = range(-15, 9);

/**
 * 表（顺序 = 下拉里的顺序）。单位制 2026-10-30 user「把显示长度单位，grid制式，格距收成一个东西。就是单位。格子跟着单位。公制 英制 dnd三种」；
 * 吸附档 / 默认档 user 10-30 拍（「米的默认是0.2 dnd的默认是1ft」「dnd吸附为什么只有两档，没有更细的」「然后英制没有ft的snapping也奇怪」）。
 */
export const UNIT_SYSTEM_ROWS: readonly UnitSystemRow[] = [
  {
    id: "metric", label: "公制", hint: "米；按大小自动写 mm / cm / m / km…",
    display: "m", readout: "auto-si", stepStyle: "si",
    ladder: SI_LADDER, snaps: [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1], defaultSnap: 0.2,
    miles: false, speedFamily: "metric", legacy: { displayUnit: "m" },
  },
  {
    id: "imperial", label: "英制", hint: "英尺英寸",
    display: "ft", readout: "ft-in", stepStyle: "imperial",
    ladder: [...INCH_FRACTIONS, FT_M, ...FEET_UP],   // 1/64 … 1/2 in、1 in、1 ft（×12）、10 ft、100 ft…
    snaps: [...[1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 6].map((k) => k * IN_M), FT_M, 5 * FT_M, 10 * FT_M], defaultSnap: IN_M,
    miles: true, speedFamily: "imperial", legacy: { displayUnit: "ft-in", gridPreset: "architectural" },
  },
  {
    id: "dnd", label: "D&D", hint: "英尺；5 ft 一格",
    display: "ft", readout: "ft-in", stepStyle: "imperial",
    ladder: [...INCH_FRACTIONS, FT_M, 5 * FT_M, ...range(1, 6).map((k) => 5 * k * FT_M)],   // 英寸那段同英制、1 ft、5 ft（一格）、50 ft（十格）、500 ft…
    snaps: [IN_M, 6 * IN_M, FT_M, 5 * FT_M, 10 * FT_M], defaultSnap: FT_M,
    miles: true, speedFamily: "imperial", legacy: { displayUnit: "ft-in", gridPreset: "dnd" },
  },
];

const BY_ID: ReadonlyMap<UnitSystem, UnitSystemRow> = new Map(UNIT_SYSTEM_ROWS.map((r) => [r.id, r]));
export const isUnitSystem = (x: unknown): x is UnitSystem => typeof x === "string" && BY_ID.has(x as UnitSystem);
/** 这一行（id 不认识 = 公制那一行；过了读的门口的 id 一定认识）。 */
export const unitSystemRow = (id: UnitSystem): UnitSystemRow => BY_ID.get(id) ?? UNIT_SYSTEM_ROWS[0];
