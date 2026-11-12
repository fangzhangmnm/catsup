// 文档 settings 的门口（format/migrate/settings.ts）和搬家之前的写法对拍。created 2026-11-12 by Claude Opus 5.5
// 2026-11-12 把网格设置的老键、尺度参考的旧单选键和改过名的 id 从 editor/grid-settings.ts、editor/scale-ref.ts 搬到读写文件的门口（user 11-13「backward compatibility的税……严格隔离」）。
// 硬线（统筹）：老文件读出来和以前一样。这里把 v0.19.64 的旧写法原样冻在下面（OLD_*），随机造各种老形状的 settings（缺键、坏值、老制式、旧单选键、改过名的 id），
//   ① 打开：旧 gridFromSettings(s) == 新 gridFromSettings(settingsNow(s))；旧 scaleRefsFromSettings(s) == 新 scaleRefsFromSettings(settingsNow(s))
//   ② 存盘：旧 scaleRefsToSettings(settingsFromGrid(s, g), refs) 和新的那条路写成 JSON 逐字节一样（键的先后也一样）。
// 冻样本那一头（读 → 写字节不变、打开 → 存字节不变）当时拿 main 的代码对拍过 414 份，记在施工单二十二的施工记录里；这里管样本走不到的老分支。
import { describe, it, eq } from "./runner.mjs";
import { DEFAULT_SETTINGS, type DocumentSettings } from "../src/format/document.ts";
import { settingsNow } from "../src/format/migrate/settings.ts";
import { gridFromSettings, settingsFromGrid, type GridSettings, type UnitSystem } from "../src/editor/grid-settings.ts";
import { DEFAULT_SCALE_REFS, scaleRefsFromSettings, scaleRefsToSettings } from "../src/editor/scale-ref.ts";

// ---------- v0.19.64 的旧写法（原样，不许改；editor/grid-settings.ts、editor/scale-ref.ts 搬家之前）----------
const isUnitSystem = (x: unknown): x is UnitSystem => x === "metric" || x === "imperial" || x === "dnd";
function OLD_gridFromSettings(s: DocumentSettings): GridSettings {
  const system: UnitSystem = isUnitSystem(s.unitSystem) ? s.unitSystem : s.gridPreset === "dnd" ? "dnd" : s.gridPreset === "architectural" || s.displayUnit === "ft-in" || s.displayUnit === "in" ? "imperial" : "metric";
  const legacy = typeof s.gridStep === "number" && s.gridStep > 1e-9 && typeof s.gridSubdiv === "number" && s.gridSubdiv >= 1 ? s.gridStep / s.gridSubdiv : 0.2;
  const snap = typeof s.snapIncrement === "number" && s.snapIncrement > 1e-12 && Number.isFinite(s.snapIncrement) ? s.snapIncrement : legacy;
  return { on: !!s.absoluteGrid, snap, plane: s.gridPlane === "yz" || s.gridPlane === "xz" ? s.gridPlane : "xy", system, shown: s.gridHidden !== true };
}
function OLD_settingsFromGrid(s: DocumentSettings, g: GridSettings): DocumentSettings {
  const preset = g.system === "metric" ? undefined : g.system === "imperial" ? "architectural" as const : "dnd" as const;
  return { ...s, absoluteGrid: g.on, unitSystem: g.system, snapIncrement: g.snap, gridStep: g.snap, gridSubdiv: 1, displayUnit: g.system === "metric" ? "m" : "ft-in", ...(g.plane !== "xy" ? { gridPlane: g.plane } : { gridPlane: undefined }), gridPreset: preset, gridHidden: g.shown ? undefined : true };
}
const OLD_RENAMED_REFS: Readonly<Record<string, string>> = { "body/CHILD": "body/KIDS" };
function OLD_scaleRefsFromSettings(s: { scaleRefs?: unknown; scaleRef?: unknown }): string[] {
  const fix = (v: string): string => OLD_RENAMED_REFS[v] ?? v;
  if (Array.isArray(s.scaleRefs)) return [...new Set(s.scaleRefs.filter((v): v is string => typeof v === "string").map(fix))];
  if (typeof s.scaleRef === "string") return s.scaleRef === "none" ? [] : [fix(s.scaleRef)];
  return [...DEFAULT_SCALE_REFS];
}
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));
function OLD_scaleRefsToSettings<T extends object>(s: T, refs: readonly string[]): T & { scaleRefs?: string[] } {
  const { scaleRef: _a, scaleRefs: _b, ...rest } = s as T & { scaleRef?: string; scaleRefs?: string[] };
  return (sameSet(refs, DEFAULT_SCALE_REFS) ? rest : { ...rest, scaleRefs: [...refs] }) as T & { scaleRefs?: string[] };
}

// ---------- 随机造老形状的 settings ----------
function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const MISSING = Symbol("missing");
function randomSettings(r: () => number): DocumentSettings {
  const o: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  const put = (k: string, vs: readonly unknown[]): void => { const v = pick(r, vs); if (v === MISSING) delete o[k]; else o[k] = v; };
  put("unitSystem", [MISSING, MISSING, "metric", "imperial", "dnd", "mars", 3, null]);
  put("gridPreset", [MISSING, MISSING, "si", "architectural", "dnd", "x"]);
  put("displayUnit", [MISSING, "m", "cm", "mm", "ft-in", "in", ""]);
  put("snapIncrement", [MISSING, 0.2, 0.05, 0.0254, 0, -1, NaN, Infinity, "0.1", 1e-13]);
  put("gridStep", [MISSING, 1, 0.5, 0.3048, 0, -2, 1e-10, "1"]);
  put("gridSubdiv", [MISSING, 5, 10, 1, 2, 0, 0.5, "5"]);
  put("absoluteGrid", [MISSING, true, false, 1, 0, "yes"]);
  put("gridPlane", [MISSING, "xy", "yz", "xz", "zz"]);
  put("gridHidden", [MISSING, true, false, 1]);
  put("scaleRefs", [MISSING, MISSING, [], ["interior/ALL"], ["body/CHILD", "garden/JPSTYLE", "body/CHILD"], ["exterior/ALL", "interior/ALL"], [3, "body/KIDS"], "notarray"]);
  put("scaleRef", [MISSING, MISSING, "none", "interior/DND", "body/CHILD", 7]);
  return o as unknown as DocumentSettings;
}
function randomGrid(r: () => number): GridSettings {
  return { on: r() < 0.5, snap: pick(r, [0.2, 0.05, 0.0254, 0.3048, 1.524]), plane: pick(r, ["xy", "yz", "xz"] as const), system: pick(r, ["metric", "imperial", "dnd"] as const), shown: r() < 0.7 };
}
const N = 3000;

describe("文档 settings 的门口（和搬家之前的写法对拍）", () => {
  it(`打开：${N} 份随机的老形状 settings，网格状态和尺度参考和旧写法逐项一样`, () => {
    const r = rng(20261112);
    for (let i = 0; i < N; i++) {
      const s = randomSettings(r), now = settingsNow(s);
      eq(JSON.stringify(gridFromSettings(now)), JSON.stringify(OLD_gridFromSettings(s)), `第 ${i} 份网格：${JSON.stringify(s)}`);
      eq(JSON.stringify(scaleRefsFromSettings(now)), JSON.stringify(OLD_scaleRefsFromSettings(s as never)), `第 ${i} 份尺度参考：${JSON.stringify(s)}`);
    }
  });
  it(`存盘：${N} 份随机的老形状 settings × 随机的网格状态 × 随机的尺度参考，写成 JSON 和旧写法逐字节一样`, () => {
    const r = rng(11131113);
    for (let i = 0; i < N; i++) {
      const s = randomSettings(r), g = randomGrid(r), refs = pick(r, [[...DEFAULT_SCALE_REFS], [], ["interior/DND"], ["exterior/ALL", "interior/ALL"], ["body/KIDS", "garden/JPSTYLE"]]);
      eq(JSON.stringify(scaleRefsToSettings(settingsFromGrid(s, g), refs)), JSON.stringify(OLD_scaleRefsToSettings(OLD_settingsFromGrid(s, g), refs)), `第 ${i} 份：${JSON.stringify({ s, g, refs })}`);
    }
  });
});
