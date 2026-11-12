#!/usr/bin/env node
// scripts/probe-why-red.mjs —— 一个探针红了，红在哪一条（不靠人眼在输出里抓 false）。created 2026-11-11 by Claude Opus 5.5（统筹 11-11：留在仓里，整跑脚本用它）
// 用法：node scripts/probe-why-red.mjs <探针文件> <那次的输出日志>
//   判据写成 `const ok = …;` 的探针：按顶层 && 拆开，拿日志里第一个 JSON 结果逐条算，打出不成立的那几条（结果对象的每个顶层键也当变量，r1 / rUp 这种写法也能算）。
//   用到探针自己定义的函数（has / nice …）的那几条算不了，照实说「算不了」，不当成红。
//   ✓ / ✗ 风格的探针（check(...) 打行）：打出 ✗ 那几行。
import { readFileSync } from "node:fs";

export function whyRed(src, log) {
  const out = [];
  const crosses = log.split("\n").filter((l) => /^\s*✗/.test(l) || /\[31m✗/.test(l));
  if (crosses.length) return crosses.map((l) => l.replace(/\u001b\[[0-9;]*m/g, "").trim());
  const i = src.indexOf("const ok = ");
  if (i < 0) return ["（这个探针没有 const ok = … 也没有 ✗ 行：看日志末尾）"];
  const end = src.indexOf(";\n", i), expr = src.slice(i + 11, end).replace(/\/\*[\s\S]*?\*\//g, "");
  const j0 = log.indexOf("{");
  if (j0 < 0) return ["（日志里没有结果 JSON：多半没跑到判据就崩了，看日志末尾）"];
  let depth = 0, j1 = -1; for (let k = j0; k < log.length; k++) { if (log[k] === "{") depth++; else if (log[k] === "}") { depth--; if (!depth) { j1 = k; break; } } }
  let res; try { res = JSON.parse(log.slice(j0, j1 + 1)); } catch { return ["（结果 JSON 读不出来）"]; }
  const parts = []; let d = 0, cur = "";
  for (let k = 0; k < expr.length; k++) { const c = expr[k]; if ("([{".includes(c)) d++; if (")]}".includes(c)) d--; if (!d && expr.startsWith("&&", k)) { parts.push(cur.trim()); cur = ""; k++; continue; } cur += c; }
  parts.push(cur.trim());
  const names = ["res", "out", "r", "errs", ...Object.keys(res).filter((k) => /^[A-Za-z_]\w*$/.test(k))];
  const vals = [res, res, res, res.errs ?? [], ...names.slice(4).map((k) => res[k])];
  for (const p of parts) {
    let v; try { v = Function(...names, `return (${p});`)(...vals); } catch (e) { v = /is not defined/.test(String(e)) ? "（算不了：用到探针里的函数）" : "ERR " + e.message; }
    if (v !== true && !(typeof v === "string" && v.startsWith("（算不了"))) out.push(`✗ ${p.replace(/\s+/g, " ").slice(0, 200)} → ${JSON.stringify(v)}`);
  }
  return out.length ? out : ["（逐条算都成立：红的原因在判据之外——页面错误 / 退出码 / 超时，看日志末尾）"];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, logFile] = process.argv.slice(2);
  if (!file || !logFile) { console.error("用法：node scripts/probe-why-red.mjs <探针文件> <日志>"); process.exit(2); }
  for (const l of whyRed(readFileSync(file, "utf8"), readFileSync(logFile, "utf8"))) console.log("  " + l);
}
