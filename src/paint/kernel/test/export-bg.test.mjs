// v0.9.14 导出底色行为锚（user 2026-08-19 拍板：视图级导出底色，PNG 默认透明/JPG 默认白，
// 三分立：导出底色 ≠ 画板底色 ≠ UI 主题，永不同步）。
// flattenToBg = 原 JPG 白底 inline 数学抽出共用；parseExportBg = 配置值防御收口。
import { describe, it } from "./runner.mjs";
import assert from "node:assert/strict";
import { flattenToBg, parseExportBg } from "../src/backend/algorithms/flatten-bg.ts";

describe("export-bg（v0.9.14 导出底色）", () => {
  it("parseExportBg：transparent/非法/缺省 = null；#rrggbb = rgb", () => {
    assert.equal(parseExportBg("transparent"), null);
    assert.equal(parseExportBg(undefined), null);
    assert.equal(parseExportBg("white"), null, "非 hex 不认（UI 层已 parse 成 hex 才进来）");
    assert.equal(parseExportBg("#fff"), null, "3 位 hex 不认（防御收口）");
    assert.deepEqual(parseExportBg("#102030"), { r: 16, g: 32, b: 48 });
  });

  it("flattenToBg：α=0 全落底色、α=255 保原色、半透明 src-over 数学、输出 α 恒 255", () => {
    const src = new Uint8ClampedArray([
      0, 0, 0, 0,          // 全透明
      200, 100, 50, 255,   // 实
      200, 100, 50, 128,   // 半透明
    ]);
    const out = flattenToBg(src, 255, 255, 255);
    assert.deepEqual([...out.slice(0, 4)], [255, 255, 255, 255], "透明 → 纯底色");
    assert.deepEqual([...out.slice(4, 8)], [200, 100, 50, 255], "实色不动");
    const a = 128 / 255;
    assert.equal(out[8], Math.round(200 * a + 255 * (1 - a)) | 0, "半透明 src-over（±clamp round）");
    assert.equal(out[11], 255, "输出 α 恒 255");
    assert.equal(src[3], 0, "输入不被原地改（返回新数组）");
  });

  it("flattenToBg 黑底：透明区 = 黑（JPG 换底色场景）", () => {
    const src = new Uint8ClampedArray([0, 0, 0, 0]);
    assert.deepEqual([...flattenToBg(src, 0, 0, 0)], [0, 0, 0, 255]);
  });
});
