// UI translation layer (src/i18n): lookup order, templates, and table hygiene. DOM walking is covered by the browser probe, not here.
import { describe, it, eq, assert } from "./runner.mjs";
import { t, setLang, getLang, detectLang } from "../src/i18n/index.ts";
import { EN } from "../src/i18n/en.ts";
import { EN_TEMPLATES } from "../src/i18n/en-templates.ts";

describe("i18n", () => {
  it("zh is the source language: t() is the identity", () => {
    setLang("zh");
    eq(t("画线"), "画线");
    eq(getLang(), "zh");
  });
  it("detectLang: saved choice wins, else browser language", () => {
    eq(detectLang("zh", "en-AU"), "zh");
    eq(detectLang("en", "zh-CN"), "en");
    eq(detectLang(null, "zh-CN"), "zh");
    eq(detectLang(null, "en-AU"), "en");
  });
  it("en: exact, template, label（hint） and unknown strings", () => {
    setLang("en");
    eq(t("画线"), "Line");
    eq(t("  画线 "), "  Line ", "surrounding whitespace is kept");
    eq(t("已分享 a.glb"), "Shared a.glb");
    eq(t("选择（Space · Tab）"), "Select (Space · Tab)");
    eq(t("这句话不在表里"), "这句话不在表里", "untranslated stays Chinese");
    eq(t("No Chinese here"), "No Chinese here");
    setLang("zh");
  });
  it("tables: every template keeps its placeholders, no empty values", () => {
    const ph = (s: string): string => (s.match(/\{\d+\}/g) ?? []).sort().join(",");
    for (const [k, v] of Object.entries(EN_TEMPLATES)) { assert(v.trim().length > 0, `empty: ${k}`); eq(ph(v), ph(k), `placeholders: ${k}`); }
    for (const [k, v] of Object.entries(EN)) assert(v.trim().length > 0, `empty: ${k}`);
  });
});
