// test/redline-guard.test.mjs —— 红线守卫：结构性 grep，不跑行为。app 长出第二条存储/云路径 = 直接红。
// 白名单 = 单一接缝 src/app-store.ts + device-kv 器官 + config；pwa-shell 可碰 caches（SW 壳）；crash-store 可碰 indexedDB（崩溃影子，逐案批）。
// 缩略图 IDB 在 @internal/gallery 包内（idbThumbStore），app 源码不直接碰。
// 照 pwa-cloud-store skill §4 + JRB test/redline-guard.test.mjs。created 2026-09-20 by Claude Fable 5.1
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SEAM = new Set(["src/app-store.ts", "src/app/device-kv.ts", "src/config.ts"]);
const BAD = [
  { re: /\blocalStorage\b/, what: "localStorage" },
  { re: /\bindexedDB\b/, what: "indexedDB", allow: new Set(["src/app/crash-store.ts"]) },   // T-crash 附加层的独立 IDB（user 2026-09-20 批）
  { re: /PublicClientApplication|msal-browser/, what: "MSAL" },
  { re: /graph\.microsoft\.com/, what: "Graph" },
  { re: /\bcaches\b\s*\.\s*open/, what: "caches.open", allow: new Set(["src/app/pwa-shell.ts"]) },
];
function* walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (f !== "vendor") yield* walk(p); } else if (/\.(ts|mjs|js)$/.test(f)) yield p; } }
const hits = [];
for (const abs of walk(join(ROOT, "src"))) {
  const rel = abs.slice(ROOT.length).replace(/\\/g, "/");
  if (SEAM.has(rel)) continue;
  readFileSync(abs, "utf8").split("\n").forEach((l, i) => {
    const code = l.replace(/\/\/.*$/, "");
    for (const b of BAD) if (b.re.test(code) && !(b.allow?.has(rel))) hits.push(`${rel}:${i + 1}: [${b.what}] ${l.trim()}`);
  });
}
// 单一接缝：value-level @internal/store 只准在 src/app-store.ts；@internal/encryption 只准在 src/encryption.ts
const seamRe = /^import\s+(?!type\s)[^;]*?from\s+["']@internal\/(store|encryption)["']/m;
for (const abs of walk(join(ROOT, "src"))) {
  const rel = abs.slice(ROOT.length).replace(/\\/g, "/");
  const src = readFileSync(abs, "utf8");
  const m = src.match(seamRe);
  if (m && !((m[1] === "store" && rel === "src/app-store.ts") || (m[1] === "encryption" && rel === "src/encryption.ts"))) hits.push(`${rel}: value-level import of @internal/${m[1]} outside the seam`);
}
// files 写路径只准在 session（保存动词唯一出口）
for (const abs of walk(join(ROOT, "src"))) {
  const rel = abs.slice(ROOT.length).replace(/\\/g, "/");
  if (rel === "src/app/session.ts" || rel === "src/app-store.ts") continue;
  readFileSync(abs, "utf8").split("\n").forEach((l, i) => { if (/\)\s*\.save\(/.test(l.replace(/\/\/.*$/, ""))) hits.push(`${rel}:${i + 1}: store .save( outside session.ts`); });
}
// 清缓存只许动自己的（家族 CLAUDE.md「共享模型库 · 命名与共享规矩」第 2 条；2026-10-01 by Claude Fable 5.1）：
//   同域名下还有兄弟 app 的离线壳和家族共享的模型缓存 pwa-models——不许「注销全部 service worker」，删缓存必须先按自己的前缀筛。
for (const abs of walk(join(ROOT, "src"))) {
  const rel = abs.slice(ROOT.length).replace(/\\/g, "/");
  readFileSync(abs, "utf8").split("\n").forEach((l, i) => {
    const code = l.replace(/\/\/.*$/, "");
    if (/getRegistrations\s*\(/.test(code)) hits.push(`${rel}:${i + 1}: getRegistrations() — unregister only the registration that controls this page (getRegistration())`);
    if (/caches\s*\.\s*delete\s*\(/.test(code) && !/startsWith\(SHELL_CACHE_PREFIX\)/.test(code)) hits.push(`${rel}:${i + 1}: caches.delete without the own-prefix filter`);
  });
}
if (hits.length) { console.error("red-line guard: storage/cloud access outside the seam:\n" + hits.join("\n")); process.exit(1); }
console.log("  ✓ red-line guard（接缝 = app-store / device-kv / config；写路径 = session）");
