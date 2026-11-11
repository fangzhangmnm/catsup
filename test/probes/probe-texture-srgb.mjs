// probe-texture-srgb.mjs —— 贴图显示的颜色 = 它的字节（W-14，2026-11-11，Claude Opus 5.5；统筹 11-11 裁定 ③）。
// 以前贴图按 sRGB 存、采样出来是线性的，着色器把线性值直接写出去：导入的图比它的字节暗（128 显示成 55）。修了之后：
// ① 灰阶：一张 64×64 的图，16×16 块、每块 4×4 格一级（0…255 全有），贴在正对着的面上，白模、不打光：面里每一级都读到它自己的字节（按块数像素，逐级相等）。
// ② 同一个颜色，纯色面 vs 一张单色的图：两张面并排，不打光 / 打光各比一次（纯色面的顶点色是 7 位的，所以允许差一，多了 = 红）。
// ③ 每种画风：同样两张面，看贴图在这种画风里显示不显示、和纯色面差多少（只记，判断写进记录）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-texture-srgb.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
import { encodePng } from "./lib/png.mjs";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const b64 = (px, w, h) => encodePng(px, w, h).toString("base64");
const RAMP = (() => { const n = 64, px = new Uint8Array(n * n * 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = (y >> 2) * 16 + (x >> 2), o = (y * n + x) * 4; px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 255; } return b64(px, n, n); })();
const SOLID = (r, g, b) => { const px = new Uint8Array(4 * 4 * 4); for (let i = 0; i < px.length; i += 4) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; } return b64(px, 4, 4); };
const COLORS = [[0, 0, 0], [32, 32, 32], [64, 64, 64], [128, 128, 128], [200, 200, 200], [255, 255, 255], [230, 120, 30], [40, 90, 200]];

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async ({ RAMP, SOLIDS, COLORS }) => {
  const C = globalThis.__catsup, e = C.editor, r3 = e.renderer3, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bytes = (s) => { const t = atob(s), u = new Uint8Array(t.length); for (let i = 0; i < u.length; i++) u[i] = t.charCodeAt(i); return u; };
  e.setGrid({ ...e.grid, on: false });
  const square = (x0, y0, s) => e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(x0, y0), P(x0 + s, y0)], [P(x0 + s, y0), P(x0 + s, y0 + s)], [P(x0 + s, y0 + s), P(x0, y0 + s)], [P(x0, y0 + s), P(x0, y0)]] });
  square(0, 0, 1); square(1.5, 0, 1);
  const k = e.kernel, at = e.activePool(), faceAt = (x) => k.faces().find((f) => k.faceRings3(f.id).outer.some((p) => Math.abs(p.x - x) < 1e-6));
  const A = faceAt(0), B = faceAt(1.5);
  const mat = (name, color, png) => { let ch; if (png) { const tg = crypto.randomUUID(); e.commitOp({ op: "addTexture", guid: tg, name, mimeType: "image/png", bytes: bytes(png), sizeM: [1, 1] }); ch = { color: [tg] }; }
    e.commitOp({ op: "addMaterial", name, color, ...(ch ? { channels: ch } : {}) }); return e.sceneRef.materials.length - 1; };
  const paint = (f, m) => { for (const side of [0, 1]) e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(f.id).outer], material: m, sides: [side] }); };
  const waitTex = async () => { for (let i = 0; i < 100; i++) { e.draw(); const ts = [...(r3.texCache?.values() ?? [])]; if (ts.length && ts.every((t) => t.image && (t.image.width ?? 0) > 1)) return; await sleep(20); } throw new Error("textures never decoded"); };
  const white = r3.preset, shade0 = white.material.shade, unlit = (on) => { white.material.shade = on ? "none" : shade0; };   // 探针：白模的明暗换成不打光（就地改这一页里的预设对象；换成一个拷贝 = 预设的身份变了，渲染器另走一条路，读数不对）
  e.cam.setView("top"); e.zoomExtents();
  const c = document.getElementById("board"), gl = c.getContext("webgl2"), dpr = c.width / c.clientWidth;
  const read = () => { e.draw(); const w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); return { w, h, px }; };
  const at3 = (snap, p) => { const s = e.cam.angularPx(p, e.vp()), x = Math.round(s.x * dpr), y = snap.h - 1 - Math.round(s.y * dpr), o = (y * snap.w + x) * 4; return [snap.px[o], snap.px[o + 1], snap.px[o + 2]]; };
  const out = {};
  // ① 灰阶
  paint(A, mat("灰阶", [1, 1, 1], RAMP)); await waitTex(); unlit(true);
  { const snap = read(), a = e.cam.angularPx(P(0.005, 0.005), e.vp()), z = e.cam.angularPx(P(0.995, 0.995), e.vp());
    const x0 = Math.round(Math.min(a.x, z.x) * dpr), x1 = Math.round(Math.max(a.x, z.x) * dpr), y0 = Math.round(Math.min(a.y, z.y) * dpr), y1 = Math.round(Math.max(a.y, z.y) * dpr);
    const hist = new Map(); let nonGray = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const o = ((snap.h - 1 - y) * snap.w + x) * 4, r = snap.px[o]; if (r !== snap.px[o + 1] || r !== snap.px[o + 2]) { nonGray++; continue; } hist.set(r, (hist.get(r) ?? 0) + 1); }
    const area = (x1 - x0 + 1) * (y1 - y0 + 1), each = area / 256, solid = [...hist].filter(([, n]) => n > each * 0.3).map(([v]) => v).sort((p, q) => p - q);
    const missing = []; for (let v = 0; v < 256; v++) if (!solid.includes(v)) missing.push(v);
    out.ramp = { levelsSeen: solid.length, missing: missing.slice(0, 40), extra: solid.filter((v) => v > 255).length, nonGray, blockPx: Math.round(each) }; }
  // ② / ③ 纯色面 vs 单色的图（每种画风、不打光 / 打光）
  const pairs = [];
  for (let i = 0; i < COLORS.length; i++) { const [r, g, b] = COLORS[i]; pairs.push({ rgb: COLORS[i], plain: mat(`色${i}`, [r / 255, g / 255, b / 255], null), img: mat(`图${i}`, [1, 1, 1], SOLIDS[i]) }); }
  const cmp = async (preset) => {
    const rows = [];
    for (const p of pairs) { paint(A, p.plain); paint(B, p.img); await waitTex(); await sleep(20); const snap = read(); rows.push({ rgb: p.rgb, plain: at3(snap, P(0.4, 0.6)), img: at3(snap, P(1.9, 0.6)) }); }   // 读的点避开整米的地面网格线（x = 2 那条压在面上）
    const d = Math.max(...rows.map((r) => Math.max(...[0, 1, 2].map((i) => Math.abs(r.plain[i] - r.img[i])))));
    return { preset, maxDiff: d, rows };
  };
  unlit(true); out.unlit = await cmp("white(不打光)");
  unlit(false); out.lit = await cmp("white(打光)");
  out.styles = [];
  for (const id of ["pixelOutline", "onebit", "papercut", "tron", "realistic", "bronze"]) { r3.setPreset(id); await sleep(30); out.styles.push(await cmp(id)); }
  r3.setPreset("white"); unlit(false);
  return out;
}, { RAMP, SOLIDS: COLORS.map(([r, g, b]) => SOLID(r, g, b)), COLORS });
await browser.close();
const brief = (c) => `${c.preset}: 最大差 ${c.maxDiff}；` + c.rows.map((r) => `${r.rgb.join(",")}→纯色 ${r.plain.join(",")} / 图 ${r.img.join(",")}`).join("；");
console.log("灰阶：", JSON.stringify(res.ramp));
console.log(brief(res.unlit)); console.log(brief(res.lit));
for (const s of res.styles) console.log(brief(s));
const ok = res.ramp.levelsSeen === 256 && res.ramp.missing.length === 0 && res.unlit.maxDiff <= 1 && res.lit.maxDiff <= 1 && errs.length === 0;
if (errs.length) console.log("页面错误：", errs);
console.log(ok ? "probe-texture-srgb OK" : "probe-texture-srgb FAIL");
process.exit(ok ? 0 : 1);
