#!/usr/bin/env node
// 从家族色彩库 pull 一份油漆桶色板（宿主 pull、库永不 push）：取中国传统色里一组常用名，生成 src/app/palette.ts。
// 用法：node scripts/pull-palette.mjs（色库 = ../20260730 ColorNames/colors.json）。created 2026-10-21 by Claude Fable 5.1
import { readFileSync, writeFileSync } from "node:fs";
const src = new URL("../../20260730 ColorNames/colors.json", import.meta.url);
const db = JSON.parse(readFileSync(src, "utf8"));
// 自动挑：中国传统色按色相 12 档 × 明暗 2 档各取 1 + 4 档灰（饱和度低的按明度分档），共 ≤ 28 色；名字取库里的原名
const hexToHsl = (hex) => { const n = parseInt(hex.slice(1), 16); const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; const d = mx - mn; const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); let h = 0; if (d > 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [h, sat, l]; };
const zh = db.words.filter((w) => w[0] === "zh-trad").map((w) => ({ name: w[1], hex: w[2], hsl: hexToHsl(w[2]) }));
const bins = new Map();
for (const c of zh) {
  const [h, sat, l] = c.hsl;
  const key = sat < 0.12 ? `g${Math.min(3, Math.floor(l * 4))}` : `${Math.floor(h / 30)}:${l < 0.5 ? "d" : "l"}`;
  const cur = bins.get(key);
  // 每档取饱和度最高、明度居中的
  const score = (x) => (x.hsl[1] * (1 - Math.abs(x.hsl[2] - (key.endsWith("d") ? 0.35 : 0.65))));
  if (!cur || score(c) > score(cur)) bins.set(key, c);
}
const order = (k) => (k.startsWith("g") ? 1000 + Number(k[1]) : Number(k.split(":")[0]) * 2 + (k.endsWith("d") ? 1 : 0));
const picked = [...bins.entries()].sort((a, b) => order(a[0]) - order(b[0])).map(([, c]) => [c.name, c.hex]);
const missing = [];
const lines = [
  "// palette.ts —— 油漆桶色板（生成物勿手改：node scripts/pull-palette.mjs 从 ../20260730 ColorNames/colors.json 取中国传统色）。",
  `// 共 ${picked.length} 色；色名是跨仓契约（家族色彩库 SSoT）。generated ${new Date().toISOString().slice(0, 10)} by Claude Fable 5.1`,
  "export const PALETTE_ZH: readonly { name: string; hex: string }[] = [",
  ...picked.map(([n, hex]) => `  { name: ${JSON.stringify(n)}, hex: ${JSON.stringify(hex)} },`),
  "];",
  "",
];
writeFileSync(new URL("../src/app/palette.ts", import.meta.url), lines.join("\n"));
console.log(`palette: ${picked.length} colors${missing.length ? `; missing in library: ${missing.join(" ")}` : ""}`);
