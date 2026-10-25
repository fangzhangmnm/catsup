// 单位深模块（units.ts）：米制读数与旧 fmtLen 逐字一致；英制念英尺英寸；面积跟单位；settings 往返。created 2026-10-24 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { fmtArea, fmtLen, fmtVcbLength, formatLength, setDisplayUnit, unitFromSettings, unitToSettings } from "../src/editor/units.ts";

describe("units: 一个深模块念所有读数", () => {
  it("米制（默认）：与旧 fmtLen 逐字一致（< 1 m 念厘米、取整带 ~）", () => {
    setDisplayUnit("m");
    eq(fmtLen(2), "2.0 m"); eq(fmtLen(0.5), "50.0 cm"); eq(fmtLen(1.23456), "~1.2 m"); eq(fmtLen(-0.3), "-30.0 cm");
    eq(fmtArea(2.5), "2.500 m²"); eq(fmtArea(0.5), "5000 cm²");
  });
  it("英尺英寸（user「dnd单位的时候你tooltip还是SI」）：5 ft = 5' 0\"、1.6 m ≈ 5' 3\"、面积念 ft²", () => {
    setDisplayUnit("ft");
    eq(fmtLen(1.524), "5' 0\""); eq(fmtLen(0.3048), "1' 0\""); eq(fmtLen(1.6), "~5' 3\"");
    eq(fmtArea(1.524 * 1.524), "25.0 ft²");
    setDisplayUnit("m");
  });
  it("cm / mm / in 各念各的；formatLength 不吃当前单位（栅格制式自带单位用它）", () => {
    eq(formatLength(1.5, "cm"), "150.0 cm"); eq(formatLength(0.0123, "mm"), "12.3 mm"); eq(formatLength(0.0254, "in"), "1\"");
    setDisplayUnit("ft"); eq(formatLength(1, "m"), "1.0 m"); setDisplayUnit("m");
    eq(fmtVcbLength(1.524, "ft"), "5' 0\""); eq(fmtVcbLength(1.2346, "m"), "1.235 m");
  });
  it("文档 settings.displayUnit：英尺英寸写 ft-in，读回 ft；坏值回米", () => {
    eq(unitToSettings("ft"), "ft-in"); eq(unitFromSettings({ displayUnit: "ft-in" }), "ft"); eq(unitFromSettings({ displayUnit: "mm" }), "mm");
    eq(unitFromSettings({ displayUnit: "furlong" }), "m"); eq(unitFromSettings({}), "m");
  });
});
