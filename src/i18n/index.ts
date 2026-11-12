// i18n — runtime UI translation layer (zh = source language, en = translation).
//
// Design: the app's UI text is written inline in Chinese in ~700 files. Instead of wrapping every literal in t(),
// this layer translates what actually reaches the DOM: text nodes plus title / aria-label / placeholder / alt
// attributes, via a MutationObserver. Source-language text is never changed in code, so every existing test that
// asserts on Chinese strings keeps passing, and strings missing from the English table simply stay Chinese.
//
// Lookup order for one string: exact match in EN → pattern rules (numbers / names interpolated into a sentence) →
// "label（hint）" split → unchanged.  Debug: open the app with ?i18n=missing to log untranslated strings.
import { EN, EN_PATTERNS } from "./en.ts";
import { EN_TEMPLATES } from "./en-templates.ts";

export type Lang = "zh" | "en";

const CJK = /[　-〿一-鿿＀-￯]/;
const ATTRS = ["title", "aria-label", "placeholder", "alt"] as const;

let lang: Lang = "zh";
let observer: MutationObserver | null = null;
let rootEl: HTMLElement | null = null;
const origText = new WeakMap<Node, string>();                 // text node → original (zh) value
const appliedText = new WeakMap<Node, string>();              // text node → value we wrote (lets the observer ignore our own writes)
const origAttr = new WeakMap<Element, Map<string, string>>();
const appliedAttr = new WeakMap<Element, Map<string, string>>();
const missing = new Set<string>();
const logMissing = typeof location !== "undefined" && /[?&]i18n=missing\b/.test(location.search);

/** Browser language → default. Only English is offered besides Chinese. */
export function detectLang(saved: string | null, navLang: string): Lang {
  if (saved === "zh" || saved === "en") return saved;
  return /^zh\b/i.test(navLang) ? "zh" : "en";
}
export function getLang(): Lang { return lang; }

/** Translate one zh string. Returns the input unchanged when lang is zh or no translation exists. */
export function t(zh: string): string {
  if (lang === "zh" || !CJK.test(zh)) return zh;
  return translate(zh) ?? zh;
}

function translate(s: string): string | null {
  const lead = s.match(/^\s*/)![0], trail = s.match(/\s*$/)![0];
  const core = s.slice(lead.length, s.length - trail.length);
  if (!core) return null;
  const hit = lookup(core);
  if (hit == null) {
    if (logMissing && !missing.has(core)) { missing.add(core); console.info("[i18n:missing]", core); }
    return null;
  }
  return lead + hit + trail;
}

// Templates: "已分享 {1}" → "Shared {1}". {n} stands for a value spliced in at runtime; compiled lazily to anchored regexes.
// A cheap `includes` of the longest literal fragment skips most templates before any regex runs.
interface Tpl { re: RegExp; en: string; probe: string; }
let tpls: Tpl[] | null = null;
function compileTemplates(): Tpl[] {
  return Object.entries(EN_TEMPLATES).map(([zh, en]) => {
    const parts = zh.split(/\{\d+\}/);
    const re = new RegExp("^" + parts.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("([\\s\\S]*?)") + "$");
    return { re, en, probe: parts.reduce((a, b) => (b.length > a.length ? b : a), "") };
  }).sort((a, b) => b.probe.length - a.probe.length);   // more specific templates first
}
function fromTemplate(core: string): string | null {
  tpls ??= compileTemplates();
  for (const t of tpls) {
    if (!core.includes(t.probe)) continue;
    const m = core.match(t.re);
    if (!m) continue;
    const g = m.slice(1).map((x) => (x !== undefined && CJK.test(x) ? lookup(x) ?? x : x));
    return t.en.replace(/\{(\d+)\}/g, (_, n) => g[Number(n) - 1] ?? "");
  }
  return null;
}

const memo = new Map<string, string | null>();
function lookup(core: string): string | null {
  const hit = memo.get(core);
  if (hit !== undefined) return hit;
  const r = lookup1(core);
  if (memo.size > 5000) memo.clear();
  memo.set(core, r);
  return r;
}

function lookup1(core: string): string | null {
  const exact = EN[core];
  if (exact !== undefined) return exact;
  for (const [re, fn] of EN_PATTERNS) {
    const m = core.match(re);
    if (m) { const r = fn(...(m.slice(1) as string[]).map((g) => (g !== undefined && CJK.test(g) ? lookup(g) ?? g : g))); if (r != null) return r; }
  }
  const wrapped = core.match(/^（(.+)）$/);   // "（在网格体里）" — a whole string wrapped in fullwidth parens
  if (wrapped) { const a = lookup(wrapped[1]!); if (a != null) return `(${a})`; }
  const tpl = fromTemplate(core);   // after the hand-written patterns: those are more specific than the generated templates
  if (tpl != null) return tpl;
  // "label（hint）"  /  "label：detail"  /  "a · b" — translate the halves separately
  let m = core.match(/^(.+?)（(.+)）$/);
  if (m) { const a = lookup(m[1]!), b = lookup(m[2]!); if (a != null && b != null) return `${a} (${b})`; }
  m = core.match(/^([^：]+)：(.+)$/);
  if (m) { const a = lookup(m[1]!), b = lookup(m[2]!); if (a != null && b != null) return `${a}: ${b}`; }
  for (const sep of [" · ", " / ", "；"]) {   // lists: translate each part, all or nothing
    if (!core.includes(sep)) continue;
    const parts = core.split(sep), out = parts.map((p) => lookup(p.trim()));
    if (out.every((x) => x != null)) return out.join(sep === "；" ? "; " : sep);
  }
  return null;
}

// ---------------------------------------------------------------- DOM walking

function applyText(n: Node): void {
  const cur = n.nodeValue ?? "";
  if (appliedText.get(n) === cur) return;                     // our own write
  if (!CJK.test(cur)) { origText.delete(n); return; }          // text is no longer source text; forget it
  origText.set(n, cur);
  if (lang === "zh") return;
  const out = translate(cur);
  if (out != null && out !== cur) { appliedText.set(n, out); n.nodeValue = out; }
}

function applyAttr(el: Element, a: string): void {
  const cur = el.getAttribute(a);
  if (cur == null) return;
  if (appliedAttr.get(el)?.get(a) === cur) return;
  if (!CJK.test(cur)) { origAttr.get(el)?.delete(a); return; }
  let o = origAttr.get(el); if (!o) origAttr.set(el, (o = new Map()));
  o.set(a, cur);
  if (lang === "zh") return;
  const out = translate(cur);
  if (out != null && out !== cur) {
    let ap = appliedAttr.get(el); if (!ap) appliedAttr.set(el, (ap = new Map()));
    ap.set(a, out); el.setAttribute(a, out);
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) { applyText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || el.closest?.("[data-i18n-skip]")) return;   // user-typed content is never translated
  for (const a of ATTRS) applyAttr(el, a);
  for (let c = el.firstChild; c; c = c.nextSibling) walk(c);
}

/** zh → restore every remembered original; en → translate the whole tree again. */
function restoreOrTranslate(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const o = origText.get(root);
    if (lang === "zh") { if (o != null && root.nodeValue !== o) { appliedText.delete(root); root.nodeValue = o; } } else applyText(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (lang === "zh") {
    const o = origAttr.get(el);
    if (o) for (const [a, v] of o) { appliedAttr.get(el)?.delete(a); el.setAttribute(a, v); }
  } else for (const a of ATTRS) applyAttr(el, a);
  for (let c = el.firstChild; c; c = c.nextSibling) restoreOrTranslate(c);
}

export function setLang(next: Lang): void {
  lang = next;
  if (typeof document === "undefined") return;
  document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  if (rootEl) { observer?.disconnect(); restoreOrTranslate(document.documentElement); observe(); }
}

function observe(): void {
  observer?.disconnect();
  if (!rootEl) return;
  observer = new MutationObserver((muts) => {
    observer!.disconnect();                                    // our writes must not re-enter
    try {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach((n) => walk(n));
        else if (m.type === "characterData") applyText(m.target);
        else if (m.type === "attributes") applyAttr(m.target as Element, m.attributeName!);
      }
    } finally { observe(); }
  });
  observer.observe(rootEl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}

/** Start translating `root` (default document.body) and everything added to it later. */
export function installI18n(initial: Lang, root: HTMLElement = document.body): void {
  rootEl = root;
  lang = initial;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  walk(root);
  observe();
}
