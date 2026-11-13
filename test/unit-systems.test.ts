// 单位制一张表（src/format/unit-systems.ts）：每一行都齐（施工单 ai-docs/20261112-unit-system-mm-workorder.md 第四节）。created 2026-11-13 by Claude Opus 5.5
// 加一个单位制 = 表里加一行（+ 读写门口认它）；这里钉住那一行不会缺东西、不会和网格对不上。
import { describe, it, eq, assert } from "./runner.mjs";
import { UNIT_SYSTEM_ROWS, isUnitSystem, unitSystemRow } from "../src/format/unit-systems.ts";
import { DEFAULT_SNAP, UNIT_SYSTEMS, gridLadder, snapLevels } from "../src/editor/grid-settings.ts";
import { settingsForFile, settingsNow } from "../src/format/migrate/settings.ts";
import { DEFAULT_SETTINGS } from "../src/format/document.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string };

describe("新文档的 settings 生下来就是现在的形状（统筹 11-13）", () => {
  it("DEFAULT_SETTINGS = 写盘门口给公制、默认吸附、吸附关着写出来的那一份（JSON 逐字一样）；读的门口不用猜", () => {
    const door = settingsForFile({} as never, { absoluteGrid: false, unitSystem: "metric", snapIncrement: unitSystemRow("metric").defaultSnap, gridPlane: "xy", gridHidden: false });
    eq(JSON.stringify(DEFAULT_SETTINGS), JSON.stringify(door));
    eq(DEFAULT_SETTINGS.unitSystem, "metric", "单位制写明（不靠按老键猜）");
    const now = settingsNow(DEFAULT_SETTINGS);
    eq(JSON.stringify(now), JSON.stringify({ unitSystem: "metric", snapIncrement: 0.2, absoluteGrid: false, gridPlane: "xy", gridHidden: false }));
  });
});

describe("单位制一张表：每一行都齐", () => {
  it("id 不重复；isUnitSystem / UNIT_SYSTEMS 从表里来", () => {
    const ids = UNIT_SYSTEM_ROWS.map((r) => r.id);
    eq(new Set(ids).size, ids.length);
    for (const id of ids) assert(isUnitSystem(id) && unitSystemRow(id).id === id);
    eq(UNIT_SYSTEMS.map((u) => u.id).join(","), ids.join(","));
    assert(!isUnitSystem("furlong"));
  });
  for (const r of UNIT_SYSTEM_ROWS) it(`「${r.label}」：名字说明、进位表、吸附档、默认档、旧键`, () => {
    assert(r.label.length > 0 && r.hint.length > 0, "名字和说明");
    const L = r.ladder, S = r.snaps;
    for (let i = 1; i < L.length; i++) { const k = L[i] / L[i - 1]; assert(k > 1 && Math.abs(k - Math.round(k)) < 1e-6, `进位表相邻两层整数倍：${L[i - 1]} → ${L[i]}`); }
    for (let i = 1; i < S.length; i++) assert(S[i] > S[i - 1], "吸附档从细到粗");
    for (const s of S) { const up = L.find((l) => l > s * (1 + 1e-9)); if (!up) continue; const k = up / s; assert(Math.abs(k - Math.round(k)) < 1e-6, `吸附 ${s} 整除比它粗的下一层 ${up}`); }
    assert(S.some((s) => Math.abs(s - r.defaultSnap) < 1e-12), "默认档在档位里");
    eq(DEFAULT_SNAP[r.id], r.defaultSnap); eq(gridLadder(r.id), L); eq(snapLevels(r.id), S);
    assert(r.legacy.displayUnit === undefined || ["m", "ft-in"].includes(r.legacy.displayUnit), "旧键 displayUnit：要么写得出来，要么不写（毫米：统筹 11-13 不给旧版本照顾）");
    const out = settingsForFile(DEFAULT_SETTINGS, { absoluteGrid: true, unitSystem: r.id, snapIncrement: r.defaultSnap, gridPlane: "xy", gridHidden: false });
    eq(out.displayUnit, r.legacy.displayUnit); eq(out.gridPreset, r.legacy.gridPreset);
    eq(settingsNow(out).unitSystem, r.id, "写出去读回来还是它");
  });
  it("按单位制写死分支的地方只剩登记过的（加一行不用再改别的文件）", () => {
    // 剩下的：读的门口按旧键猜老文件的单位制（读旧键归门口）；新文档默认公制；units.ts 速度那半按显示单位分家族（和表里 speedFamily 一致）
    const bad: string[] = [];
    for (const f of ["src/editor/grid-settings.ts", "src/editor/units.ts", "src/editor/editor.ts", "src/app/main.ts"]) {
      const src = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
      for (const m of src.matchAll(/(?:system|sys|unitSystem)\s*[!=]==\s*"(metric|imperial|dnd)"/g)) bad.push(`${f}: ${m[0]}`);
    }
    eq(bad.join("；"), "");
  });
});
