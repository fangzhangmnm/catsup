// 单位深模块（units.ts）：米制读数与旧 fmtLen 逐字一致；英制念英尺英寸；面积跟单位；settings 往返。created 2026-10-24 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { fmtArea, fmtLen, fmtVcbLength, formatLength, setUnitSystem, formatQuantity, parseQuantity, nudgeQuantity, setSpeedUnit, speedUnitFor } from "../src/editor/units.ts";

describe("units: 一个深模块念所有读数", () => {
  it("米制（默认）：与旧 fmtLen 逐字一致（< 1 m 念厘米、取整带 ~）", () => {
    setUnitSystem("metric");
    eq(fmtLen(2), "2.0 m"); eq(fmtLen(0.5), "50.0 cm"); eq(fmtLen(1.23456), "~1.2 m"); eq(fmtLen(-0.3), "-30.0 cm");
    eq(fmtArea(2.5), "2.500 m²"); eq(fmtArea(0.5), "5000 cm²");
  });
  it("英尺英寸（user「dnd单位的时候你tooltip还是SI」）：5 ft = 5' 0\"、1.6 m ≈ 5' 3\"、面积念 ft²", () => {
    setUnitSystem("imperial");
    eq(fmtLen(1.524), "5' 0\""); eq(fmtLen(0.3048), "1' 0\""); eq(fmtLen(1.6), "~5' 3\"");
    eq(fmtArea(1.524 * 1.524), "25.0 ft²");
    setUnitSystem("metric");
  });
  it("cm / mm / in 各念各的；formatLength 不吃当前单位（栅格制式自带单位用它）", () => {
    eq(formatLength(1.5, "cm"), "150.0 cm"); eq(formatLength(0.0123, "mm"), "12.3 mm"); eq(formatLength(0.0254, "in"), "1\"");
    setUnitSystem("imperial"); eq(formatLength(1, "m"), "1.0 m"); setUnitSystem("metric");
    eq(fmtVcbLength(1.524, "ft"), "5' 0\""); eq(fmtVcbLength(1.2346, "m"), "1.2346 m");   // 回显不截位（公制自动词头，toPrecision 7）
  });
});

describe("units: 量（长度 / 速度）的显示、读输入、− +（2026-10-28 Opus；user「都单位和用户选择单位对齐」「速度可以识别配速，然后你可以输入其他单位文本框能接住」）", () => {
  const L = { q: "length" } as const, FOOT = { q: "speed", mover: "foot" } as const, ROAD = { q: "speed", mover: "road" } as const, AIR = { q: "speed", mover: "air" } as const;
  const near = (a: number | { error: string }, b: number, tol = 1e-6): boolean => typeof a === "number" && Math.abs(a - b) <= tol;
  it("速度：走路默认配速、车 km/h、飞机节；英制下走路 min/mi、车 mph；覆盖能改、null 回默认", () => {
    setUnitSystem("metric");
    eq(formatQuantity(1000 / 333, FOOT), "5'33\"/km"); eq(formatQuantity(10, ROAD), "36 km/h"); eq(formatQuantity(1852 / 3600 * 120, AIR), "120 kn");
    setUnitSystem("imperial"); eq(speedUnitFor("foot"), "min/mi"); eq(formatQuantity(1609.344 / 3600 * 60, ROAD), "60 mph"); setUnitSystem("metric");
    setSpeedUnit("foot", "km/h"); eq(formatQuantity(3, FOOT), "10.8 km/h"); setSpeedUnit("foot", null); eq(speedUnitFor("foot"), "min/km");
  });
  it("速度读输入：什么单位都接（配速 5:30 / 5'30\" / 9:00/mi / 5.5 min/km、km/h、kph、mph、kn、节、m/s；裸数 = 当前显示单位）", () => {
    setUnitSystem("metric");
    for (const t of ["5:30", "5'30\"", "5:30/km", "5:30 min/km", "5.5 min/km", "5.5/km"]) assert(near(parseQuantity(t, FOOT), 1000 / 330, 1e-9), t);
    assert(near(parseQuantity("9:00/mi", FOOT), 1609.344 / 540, 1e-9), "min/mi");
    assert(near(parseQuantity("12 km/h", FOOT), 12 / 3.6) && near(parseQuantity("12kph", FOOT), 12 / 3.6) && near(parseQuantity("6 mph", FOOT), 6 * 1609.344 / 3600), "km/h mph");
    assert(near(parseQuantity("10 kn", FOOT), 10 * 1852 / 3600) && near(parseQuantity("10节", FOOT), 10 * 1852 / 3600) && near(parseQuantity("3 m/s", FOOT), 3), "kn m/s");
    assert(near(parseQuantity("36", ROAD), 10), "车：裸数 = km/h");
    assert(typeof parseQuantity("0:00", FOOT) !== "number" && typeof parseQuantity("快", FOOT) !== "number" && typeof parseQuantity("0", ROAD) !== "number", "坏的 / 0 → 人话错误");
  });
  it("长度读输入：任何长度写法都接（3'6\"、1.2m、120cm、裸数 = 当前单位）；显示精确", () => {
    setUnitSystem("metric");
    assert(near(parseQuantity("3'6\"", L), 42 * 0.0254) && near(parseQuantity("120cm", L), 1.2) && near(parseQuantity("1.72", L), 1.72) && near(parseQuantity("1.5米", L), 1.5), "长度");
    eq(formatQuantity(1.72, L), "1.72 m"); setUnitSystem("imperial"); eq(formatQuantity(1.524, L), "5' 0\""); assert(near(parseQuantity("66", L), 66 * 0.3048), "英尺英寸下裸数 = 英尺"); setUnitSystem("metric");
    assert(typeof parseQuantity("5°", L) !== "number", "长度不收度");
  });
  it("− +：按显示单位的整格走（米制 5 cm 格先落到格上；英制按英寸格；配速 5 秒一格、+ = 更快）", () => {
    setUnitSystem("metric");
    assert(near(nudgeQuantity(1.72, 1, L, 0.05), 1.75) && near(nudgeQuantity(1.72, -1, L, 0.05), 1.7) && near(nudgeQuantity(1.75, 1, L, 0.05), 1.8), "米制");
    setUnitSystem("imperial"); assert(near(nudgeQuantity(1.72, 1, L, 0.05), Math.ceil(1.72 / 0.0254 / 2) * 2 * 0.0254), `英制 2″ 格：${nudgeQuantity(1.72, 1, L, 0.05) / 0.0254}`); setUnitSystem("metric");
    const v = 1000 / 333, faster = nudgeQuantity(v, 1, FOOT, 0.1), slower = nudgeQuantity(v, -1, FOOT, 0.1);
    assert(near(faster, 1000 / 330) && near(slower, 1000 / 335), `配速：${1000 / faster} / ${1000 / slower}`);
    assert(near(nudgeQuantity(10, 1, ROAD, 0.1), 36.5 / 3.6), "km/h 0.5 一格");
  });
});
