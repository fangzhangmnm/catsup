#!/usr/bin/env node
// test/probes/probe-render-baseline.mjs —— 截图基线：渲染器搬进 src/minccino/ 笼子的尺子（Tron 纪元第一刀步 1，骨架稿 v2 §6）。
// 「现状原样搬进去、画面一个像素不变」= 每个场景在同一台 swiftshader 上读回画布像素，和冻结在 test/fixtures/render-baseline/ 的图逐像素比。
// 读的是 WebGL 画布本身（gl.readPixels 紧跟 editor.draw()），不是页面截图：HUD / 芯片 / gizmo 是 DOM，不进基线；选中 / 悬停 / 锁轴线 /
// 面点 / 参考线 / 轴这些叠加层是画布画的，进基线（第 6 步搬叠加层契约时就靠它盯「样子不变」）。
// 用法：python3 -m http.server 8765 → node test/probes/probe-render-baseline.mjs [--update] [scene …]
//   --update = 重新冻结（只在画面**本来就该变**时用，并在第一刀日志 ai-docs/20261029-minccino-first-cut.md 里写一行为什么）。差图写到 $PROBE_OUT（默认 /tmp）。
// created 2026-10-29 by Claude Fable 5.1
import { createRequire } from "node:module";
import path from "node:path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { encodePng, decodePng, diffRgba } from "./lib/png.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const BASE = path.join(here, "../fixtures/render-baseline");
const FIX = path.join(here, "../fixtures/format/v3.1.0-4.2.0-6.4.0-1.0.0-1.0.0-1.2.0-1.0.0-1.2.0");
const out = process.env.PROBE_OUT ?? "/tmp";
const args = process.argv.slice(2);
const update = args.includes("--update");
const only = args.filter((a) => !a.startsWith("--"));
const url = process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const VIEWPORT = { width: 744, height: 1133 }, DPR = 1;   // iPad mini 竖屏的 CSS 尺寸；DPR 1 = 基线图小一半、像素线走 GL 线那条路（粗线另有场景）
const TOL = 8;            // 单通道差 ≤ 8 不算不同（swiftshader 同机同 build 应该是 0，留一点余量给驱动）
const MAX_RATIO = 0.005;  // 不同像素 > 0.5% = 红（task #90 验收线）

// ---------- 场景：每个在一张新页面里摆好，再读回画布 ----------
// 页面内公用件（字符串化后注入）：盒子 / 进网格体 / 点一下 / 读回像素
const pageLib = `
  const e = globalThis.__catsup.editor, S = globalThis.__catsup.session;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0, y0, x1, y1, h) => { const at = e.activePool(); e.commitOp({ op: "addEdges", at, segs: [[P(x0, y0), P(x1, y0)], [P(x1, y0), P(x1, y1)], [P(x1, y1), P(x0, y1)], [P(x0, y1), P(x0, y0)]] }); e.commitOp({ op: "pushpull", at, face: [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], dist: h }); };
  const toMesh = async () => { e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20); const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set("i" + inst.id, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); };
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const fire = (type, x, y, buttons, mods = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 11, pointerType: "mouse", isPrimary: true, button: 0, buttons, ...mods }));
  const tap = async (x, y) => { fire("pointermove", x, y, 0); await sleep(10); fire("pointerdown", x, y, 1); await sleep(15); fire("pointerup", x, y, 0); await sleep(450); };
  const hover = async (x, y) => { fire("pointermove", x, y, 0); await sleep(40); };
  const sp = (p) => e.cam.angularPx(p, e.vp());
  const openFixture = async (b64, name) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i); if (!(await S.openLocalBytes(u, name, null))) throw new Error("openLocalBytes refused " + name); await sleep(60); };
  const frame = () => { e.cam.setView("iso"); e.zoomExtents(); };
  const waitTextures = async () => { e.draw(); for (let i = 0; i < 100; i++) { const ts = [...(e.renderer3.texCache?.values() ?? [])]; if (ts.every((t) => t.image && (t.image.width ?? 0) > 1)) return; await sleep(20); } throw new Error("textures never decoded"); };
  const capture = () => {
    e.draw();
    const gl = c.getContext("webgl2") ?? c.getContext("webgl"), w = c.width, h = c.height;
    const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const flip = new Uint8Array(w * h * 4), row = w * 4;
    for (let y = 0; y < h; y++) flip.set(px.subarray(y * row, (y + 1) * row), (h - 1 - y) * row);
    let s = ""; for (let i = 0; i < flip.length; i += 0x8000) s += String.fromCharCode.apply(null, flip.subarray(i, Math.min(i + 0x8000, flip.length)));
    return { w, h, b64: btoa(s) };
  };
`;

// 贴图场景用的格子图：16×16、4 px 一格、橙 / 蓝，node 里现编成 PNG（Chromium 一定解得开）
const CHECKER = (() => { const n = 16, px = new Uint8Array(n * n * 4); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const o = (y * n + x) * 4, a = ((x >> 2) + (y >> 2)) & 1; px[o] = a ? 230 : 40; px[o + 1] = a ? 120 : 90; px[o + 2] = a ? 30 : 200; px[o + 3] = 255; } return encodePng(px, n, n).toString("base64"); })();

const SCENES = {
  // 硬表面盒子，像素线（GL 线 1 px）
  "box-iso": `box(0, 0, 1, 1, 1); frame();`,
  // 粗线（LineSegments2 + onBeforeCompile 的轮廓逻辑 = 第 5 步要拔的漏点）+ 选中顶面 + 悬停侧面 + 锁 Z 轴线（移动工具）
  "box-thick-sel-hover-lock": `box(0, 0, 1, 1, 1); frame(); e.setLineWeight(2); e.setTool("select"); const t = sp(P(0.5, 0.5, 1)); await tap(t.x, t.y); e.setTool("move"); e.setAxisLock("x"); const s = sp(P(1, 0.5, 0.5)); await hover(s.x, s.y);`,   // 锁 X：过选区中心的红线和世界红轴错开，看得出是锁轴线（锁 Z 在 iso 里会和世界蓝轴重叠）
  // 贴图：顶面 + 一张侧面刷上格子材质（贴图走后端那条路；探针等贴图解码完才读像素）
  "box-textured": `box(0, 0, 1, 1, 1); frame(); const tb = atob(${JSON.stringify(CHECKER)}), tbytes = new Uint8Array(tb.length); for (let i = 0; i < tbytes.length; i++) tbytes[i] = tb.charCodeAt(i);
    e.commitOp({ op: "addMaterial", name: "格子", color: [1, 1, 1], texture: { mimeType: "image/png", bytes: tbytes, sizeM: [0.5, 0.5] } });
    const mid = [...e.scene.materials.keys()].pop(), k = e.kernel, at = e.activePool();
    const top = k.faces().find((f) => k.faceRings3(f.id).outer.every((p) => Math.abs(p.z - 1) < 1e-6)), side = k.faces().find((f) => k.faceRings3(f.id).outer.every((p) => Math.abs(p.x - 1) < 1e-6));
    e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(top.id).outer, k.faceRings3(side.id).outer], material: mid });`,
  // 硬表面 X 光：边透过面
  "box-xray": `box(0, 0, 1, 1, 1); frame(); e.setXray(true);`,
  // 网格体（自由建模：顶点小点、软边淡线）+ 选中一张面
  "mesh-sel": `box(0, 0, 1, 1, 1); await toMesh(); frame(); e.setTool("select"); const t = sp(P(0.5, 0.5, 1)); await tap(t.x, t.y);`,
  // 网格体 X 光：面点（每张面中心一个小方点）
  "mesh-xray-dots": `box(0, 0, 1, 1, 1); await toMesh(); frame(); e.setXray(true);`,
  // 冻结样本：房子（组 / 组件 / 层级）、上色（材质 + 贴图）、尺规（参考线 / 参考点 / 轴）、网格体样本、双面
  "fixture-house": { fixture: "house.glb" },
  // 上色样本：面上的材质色（它那张 82 字节的格子 PNG 是测试手搓的、Chromium 解不开 → 底面永远是占位灰，不等贴图；贴图那条路由 box-textured 盖）
  "fixture-painted": { fixture: "painted.glb", noTexWait: true },
  "fixture-guided": { fixture: "guided.glb" },
  "fixture-meshed": { fixture: "meshed.glb" },
  "fixture-twoSided": { fixture: "twoSided.glb" },
  // 风格（Tron 纪元第 1 步，2026-10-29 Opus）：像素描边 = 1/3 分辨率 + 像素描边后处理 + 整数倍放大 + 叠加层按原分辨率（选中顶面 + 悬停 + 锁 X 轴线）
  "style-pixel-sel": `e.renderer3.setPreset("pixelOutline"); box(0, 0, 1, 1, 1); frame(); e.setTool("select"); const t = sp(P(0.5, 0.5, 1)); await tap(t.x, t.y); e.setTool("move"); e.setAxisLock("x"); const s = sp(P(1, 0.5, 0.5)); await hover(s.x, s.y);`,
  // 风格 × 有颜色的样本（材质色 + 组 / 组件，场景铺开：内部深度跳变也描）
  "style-pixel-house": { fixture: "house.glb", after: `e.renderer3.setPreset("pixelOutline"); e.draw();` },
  // 剪纸 · 色纸（Tron 第 1 步第二个风格）：一件一色 + 平涂 + 多重阴影（20 方向遮蔽）+ 纸色地面；两个盒子叠出零件之间的影子
  "style-papercut-boxes": `e.renderer3.setPreset("papercut"); box(0, 0, 1, 1, 1); box(1.4, 0.2, 2.0, 0.8, 0.6); frame(); e.draw();`,
  // 剪纸 × 有材质色的样本（材质色 = 色纸）
  "style-papercut-painted": { fixture: "painted.glb", noTexWait: true, after: `e.renderer3.setPreset("papercut"); e.draw();` },
  // CRT Tron（Tron 第 1 步第三个风格）：深色面 + 青线 + 被挡住的边 + 辉光 + 地格 + 240 行 CRT；选中顶面 = 认领色（Clu 橙）
  "style-tron-sel": `e.renderer3.setPreset("tron"); box(0, 0, 1, 1, 1); box(1.4, 0.2, 2.0, 0.8, 0.6); frame(); e.setTool("select"); const t = sp(P(0.5, 0.5, 1)); await tap(t.x, t.y); e.draw();`,
  // Tron × 粗线（轮廓加粗那条路）× 房子样本
  "style-tron-house-thick": { fixture: "house.glb", after: `e.renderer3.setPreset("tron"); e.setLineWeight(2); e.draw();` },
  // 风格 × 贴图（最近邻覆盖）
  "style-pixel-textured": `e.renderer3.setPreset("pixelOutline"); box(0, 0, 1, 1, 1); frame(); const tb = atob(${JSON.stringify(CHECKER)}), tbytes = new Uint8Array(tb.length); for (let i = 0; i < tbytes.length; i++) tbytes[i] = tb.charCodeAt(i);
    e.commitOp({ op: "addMaterial", name: "格子", color: [1, 1, 1], texture: { mimeType: "image/png", bytes: tbytes, sizeM: [0.5, 0.5] } });
    const mid = [...e.scene.materials.keys()].pop(), k = e.kernel, at = e.activePool();
    const top = k.faces().find((f) => k.faceRings3(f.id).outer.every((p) => Math.abs(p.z - 1) < 1e-6)), side = k.faces().find((f) => k.faceRings3(f.id).outer.every((p) => Math.abs(p.x - 1) < 1e-6));
    e.commitOp({ op: "paintFaces", at, faces: [k.faceRings3(top.id).outer, k.faceRings3(side.id).outer], material: mid });`,
};

const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DPR });
mkdirSync(BASE, { recursive: true }); mkdirSync(out, { recursive: true });
const manifestPath = path.join(BASE, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { note: "截图基线：test/probes/probe-render-baseline.mjs 冻结 / 比对。重冻只在画面本来就该变时（--update），并在 Tron 账本写一行。", viewport: VIEWPORT, dpr: DPR, scenes: {} };
let failed = 0, version = "";
for (const [name, def] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !BENIGN.test(m.text())) errs.push(`console.${m.type()}: ${m.text()}`); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.editor);
  await page.waitForTimeout(300);
  version ||= await page.evaluate(() => globalThis.__catsup.version);
  const body = typeof def === "string" ? def : `await openFixture(${JSON.stringify(readFileSync(path.join(FIX, def.fixture)).toString("base64"))}, ${JSON.stringify(def.fixture.replace(/\.glb$/, ".catsup"))}); frame(); ${def.after ?? ""}`;
  let shot;
  try {
    shot = await page.evaluate(`(async () => { ${pageLib} ${body} await sleep(30); ${def.noTexWait ? "" : "await waitTextures();"} return capture(); })()`);
  } catch (e) { console.log(`  ✗ ${name}: 场景摆不出来 ${String(e).slice(0, 200)}`); failed++; await page.close(); continue; }
  const rgba = new Uint8Array(Buffer.from(shot.b64, "base64"));
  const file = path.join(BASE, `${name}.png`);
  if (update || !existsSync(file)) {
    writeFileSync(file, encodePng(rgba, shot.w, shot.h));
    manifest.scenes[name] = { w: shot.w, h: shot.h, frozenAt: new Date().toISOString().slice(0, 10), version };
    console.log(`  ✦ ${name}: 冻结 ${shot.w}×${shot.h}（${version}）${errs.length ? " errs=" + errs.join(" | ").slice(0, 200) : ""}`);
  } else {
    const base = decodePng(readFileSync(file));
    if (base.w !== shot.w || base.h !== shot.h) { console.log(`  ✗ ${name}: 尺寸变了 ${base.w}×${base.h} → ${shot.w}×${shot.h}`); failed++; }
    else {
      const d = diffRgba(base.rgba, rgba, shot.w, shot.h, TOL);
      const ratio = d.differing / (shot.w * shot.h);
      const ok = ratio <= MAX_RATIO;
      if (!ok || d.differing) { writeFileSync(path.join(out, `baseline-${name}-diff.png`), encodePng(d.image, shot.w, shot.h)); writeFileSync(path.join(out, `baseline-${name}-now.png`), encodePng(rgba, shot.w, shot.h)); }
      console.log(`  ${ok ? "✓" : "✗"} ${name}: 不同像素 ${d.differing} / ${shot.w * shot.h}（${(ratio * 100).toFixed(3)}%）${d.differing ? `  差图 ${out}/baseline-${name}-diff.png` : ""}${errs.length ? " errs=" + errs.join(" | ").slice(0, 200) : ""}`);
      if (!ok) failed++;
    }
  }
  if (errs.some((x) => /pageerror/.test(x))) { console.log(`  ✗ ${name}: 页面报错 ${errs.join(" | ").slice(0, 300)}`); failed++; }   // 报错的页面上比出来的像素不算数
  await page.close();
}
await browser.close();
if (update || Object.keys(manifest.scenes).length) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
if (failed) { console.log(`FAILED: ${failed}`); process.exit(1); }
console.log(update ? "baseline frozen" : "baseline ok");
