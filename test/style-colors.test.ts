// 画风的四个颜色 → 标记色（minccino/preset/colors.ts）+ 界面日夜两档的判据。created 2026-10-30 by Claude Opus 5.5
// user 10-30「8你是说UI吗？可以」= 场景表 §3「每个画风只声明四个颜色，其余全由它们推出来」。推出来的要和以前手调的那几个差不多（不许偷偷变丑）。
import { describe, it, assert, eq } from "./runner.mjs";
import { PRESETS, PRESET_IDS, isDarkPaper, markColors, lift } from "../src/minccino/preset/index.ts";

const rgb = (h: number): [number, number, number] => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const dist = (a: number, b: number): number => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };

describe("画风四色 → 标记色（preset/colors.ts）", () => {
  it("选中的边 = 强调、将删 = 检查 = 警示", () => {
    const m = markColors(PRESETS.white.colors);
    eq(m.edgeSelected, PRESETS.white.colors.accent); eq(m.edgeHot, PRESETS.white.colors.warn); eq(m.edgeWarn, PRESETS.white.colors.warn);
    eq(markColors(PRESETS.white.colors, 0x123456).edgeWarn, 0x123456, "视图「选中色」撞色时检查可以单独换");
  });
  it("选中的面 / 悬停 ≈ 以前手调的那几个（线稿蓝 #8fb4e8 / #b6cff0、红 #f3a698、1-bit 灰 #8a8a8a）", () => {
    const blue = markColors(PRESETS.white.colors), red = markColors(PRESETS.pixelOutline.colors), ink = markColors(PRESETS.onebit.colors);
    assert(dist(blue.faceSelected, 0x8fb4e8) < 16, `蓝 选中面 ${blue.faceSelected.toString(16)}`);
    assert(dist(blue.faceHover, 0xb6cff0) < 16, `蓝 悬停 ${blue.faceHover.toString(16)}`);
    assert(dist(red.faceSelected, 0xf3a698) < 20, `红 选中面 ${red.faceSelected.toString(16)}`);
    assert(dist(ink.faceSelected, 0x8a8a8a) < 20, `1-bit 选中面 ${ink.faceSelected.toString(16)}`);
  });
  it("往白里提：k = 0 原样、k = 1 白、色相不变（蓝还是蓝）", () => {
    eq(lift(0x2b6cb0, 0), 0x2b6cb0); eq(lift(0x2b6cb0, 1), 0xffffff);
    const [r, , b] = rgb(lift(0x2b6cb0, 0.55)); assert(b > r + 40, "提完还是偏蓝");
  });
  it("深色纸 = 只有 Tron（界面换夜间那套）", () => {
    eq(PRESET_IDS.filter((id) => isDarkPaper(PRESETS[id].colors.paper)).join(","), "tron");
  });
});
