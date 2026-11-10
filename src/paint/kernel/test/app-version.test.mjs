// parseAppVersion：0.4 纪元版本换制的解析器（src/backend/ora.ts）。
// 这组比较错了，「文档由新版本写入」守卫（session-state）会对所有旧 ORA 误报——
// 旧制 /^v(\d+)/ 把 "v0.4.0" 解析成 0，v438(=438) > 0 → 每个旧文件都被当成未来文件。
import { describe, it, assert, eq } from "./runner.mjs";
import { parseAppVersion } from "../src/backend/ora.ts";

const p = parseAppVersion;

describe("parseAppVersion · 新旧两制解析", () => {
  it("新制 vM.m.p（带/不带日期后缀）", () => {
    eq(p("v0.4.0"), 4_000_000);
    eq(p("v0.4.0-2026-07-22"), 4_000_000);
    eq(p("v0.4.10"), 4_000_010);
    eq(p("v0.5.0"), 5_000_000);
    eq(p("v1.0.0"), 100_000_000);
  });

  it("旧制 vN 归入 0.3 纪元（v438 ≡ v0.3.438）", () => {
    eq(p("v438"), 3_000_438);
    eq(p("v438-2026-07-18"), 3_000_438);
    eq(p("v438"), p("v0.3.438"));
    eq(p("v71-2026-05-28"), 3_000_071);
  });

  it("垃圾输入 → null（caller 跳过比较）", () => {
    eq(p(null), null);
    eq(p(undefined), null);
    eq(p(""), null);
    eq(p("garbage"), null);
    eq(p("0.4.0"), null); // 没有 v 前缀不认
  });
});

describe("parseAppVersion · 全序（守卫的实际用法是 writerN > selfN）", () => {
  it("旧 < 新纪元 < 后续 minor/major", () => {
    assert(p("v438") < p("v0.4.0"), "v438 < v0.4.0");
    assert(p("v0.4.0") < p("v0.4.10"), "patch 单调");
    assert(p("v0.4.10") < p("v0.5.0"), "minor 越级");
    assert(p("v0.5.0") < p("v1.0.0"), "major 越级");
    assert(p("v71") < p("v438"), "旧制内部保序");
  });

  it("★旧 ORA(v438) 在 v0.4.0 下不误报「新版本写入」", () => {
    const writerN = p("v438-2026-07-18"), selfN = p("v0.4.0-2026-07-22");
    assert(!(writerN > selfN), "旧文件绝不能触发 docNewerWarning");
  });
});
