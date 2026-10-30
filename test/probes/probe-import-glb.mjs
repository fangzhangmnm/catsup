// 导入外来 glb（纪元排期 T11 / 账本 DT2）界面：☰「导入 glb…」的文件框喂一个现造的 glb（不用仓外任何东西）→ 层级变成组件、选中导进来的那一份、
// 通知报数 + 列出没带进来的；空节点的小三轴点得中（点它 = 选中它）；「打开」同一个文件 = 拒，说清去哪导入；撤销一步全没。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
import { encodeGlb } from "../../src/format/glb.ts";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");

// 现造：根「rig」→ 「box」（1 m 立方体，平移 (−2, 0, 0)）+ 「marker」（空节点，平移 (2, 0, 0)）；立方体带法线（= 一条丢失）
const CUBE_POS = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
const CUBE_IDX = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
const f32 = new Float32Array(CUBE_POS), u16 = new Uint16Array(CUBE_IDX), nrm = new Float32Array(24).fill(0);
const bin = new Uint8Array(f32.byteLength + u16.byteLength + nrm.byteLength);
bin.set(new Uint8Array(f32.buffer), 0); bin.set(new Uint8Array(u16.buffer), f32.byteLength); bin.set(new Uint8Array(nrm.buffer), f32.byteLength + u16.byteLength);
const glb = encodeGlb({
  asset: { version: "2.0" }, buffers: [{ byteLength: bin.byteLength }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: f32.byteLength }, { buffer: 0, byteOffset: f32.byteLength, byteLength: u16.byteLength }, { buffer: 0, byteOffset: f32.byteLength + u16.byteLength, byteLength: nrm.byteLength }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: "VEC3" }, { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" }, { bufferView: 2, componentType: 5126, count: 8, type: "VEC3" }],
  meshes: [{ name: "cube", primitives: [{ attributes: { POSITION: 0, NORMAL: 2 }, indices: 1 }] }],
  nodes: [{ name: "rig", children: [1, 2] }, { name: "box", mesh: 0, translation: [-2, 0, 0] }, { name: "marker", translation: [2, 0, 0] }],
  scenes: [{ nodes: [0] }], scene: 0,
}, bin);

const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const notices = () => page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "");
const out = {};
// ① 导入
await page.setInputFiles("#glbImportFile", { name: "toy.glb", mimeType: "model/gltf-binary", buffer: Buffer.from(glb) });
await page.waitForFunction(() => (document.getElementById("noticeStack")?.textContent ?? "").includes("导入 toy.glb"), null, { timeout: 10000 }).catch(() => {});
out.notice = (await notices()).slice(0, 200);
Object.assign(out, await page.evaluate(() => {
  const e = globalThis.__catsup.editor, s = e.scene;
  const top = [...s.def(s.root).instances.values()];
  const rig = top[0] ? s.def(top[0].def) : null;
  return { top: top.map((i) => i.name), kids: rig ? [...rig.instances.values()].map((i) => i.name) : [], selected: e.hud?.().selection ?? null, selPools: e.selectedPools?.size ?? null };
}));
// ①½ 参数小窗（DT84）：导完就有「上方向 / 文件单位」；改单位 = 撤掉按新值重做（立方体 1 m → 1 cm），改回来复原
Object.assign(out, await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pp = e.paramPanel();
  const size = () => { const s = e.scene, top = [...s.def(s.root).instances.values()][0]; const box = [...s.def(top.def).instances.values()].find((i) => i.name === "box"); const pts = s.pointsOfDef(box.def); const xs = pts.map((p) => p.x); return Math.max(...xs) - Math.min(...xs); };
  const o = { panel: pp ? { title: pp.title, fields: pp.fields.map((f) => f.key) } : null, size0: size() };
  e.setParam("unit", "cm"); await sleep(50);
  o.sizeCm = size(); o.topsCm = e.scene.def(e.scene.root).instances.size;
  e.setParam("unit", "m"); await sleep(50);
  o.sizeBack = size();
  return o;
}));
// ② 点空节点的小三轴 = 选中它（先进 rig 这一层，marker 才是直接子项）
const sel = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, s = e.scene, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const top = [...s.def(s.root).instances.values()][0];
  globalThis.__catsup.hud.pick("select");
  e.enterPool({ kind: "instance", instance: top.id }); await sleep(30);
  e.deselectAll(); await sleep(10);
  const marker = [...s.def(top.def).instances.values()].find((i) => i.name === "marker");
  const o = { x: 2, y: 0, z: 0 };   // 文件 (2,0,0) → Z-up 世界 (2, 0, 0)
  const sp = e.cam.angularPx(o, e.vp());   // CSS px（frame().project 是指针度量单位，不是 CSS px）
  return { sp, marker: marker?.id ?? null, ctx: e.ctx.chain.length };
});
out.markerScreen = sel.sp;
if (sel.sp) {
  const box = await page.locator("#board").boundingBox();
  await page.mouse.move(box.x + sel.sp.x + 6, box.y + sel.sp.y - 1); await page.waitForTimeout(40);   // 点在原点旁边一点（短轴上）
  await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(400);
}
Object.assign(out, await page.evaluate((mid) => {
  const e = globalThis.__catsup.editor;
  return { markerPicked: !!e.selectedPools && [...e.selectedPools.values()].some((p) => p.kind === "instance" && p.instance === mid) };
}, sel.marker));
// ③ 撤销：② 的点选自己是一步（v0.15.15 起选区进撤销栈、v0.15.30 撤销制度——这条探针写在那之前，期望一下全没；2026-10-28 Opus 改）
//   → 第一下撤点选（导入还在）、第二下导入整个没了（导入仍是一步）
Object.assign(out, await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.undo(); await sleep(50);
  const afterUndo1 = { instances: e.scene.def(e.scene.root).instances.size, selPools: e.selectedPools.size };
  e.undo(); await sleep(50);
  return { afterUndo1, afterUndo: e.scene.def(e.scene.root).instances.size };
}));
// ④ 「打开」外来 glb = 拒，说清去哪导入
await page.setInputFiles("#glbFile", { name: "toy.glb", mimeType: "model/gltf-binary", buffer: Buffer.from(glb) });
await page.waitForFunction(() => (document.getElementById("noticeStack")?.textContent ?? "").includes("别的软件做的 glb"), null, { timeout: 10000 }).catch(() => {});
out.openNotice = /别的软件做的 glb.*导入 glb/.test(await notices());
console.log(JSON.stringify(out));
const ok = out.panel?.title === "导入 toy" && out.panel.fields.join() === "up,unit" && Math.abs(out.size0 - 1) < 1e-6 && Math.abs(out.sizeCm - 0.01) < 1e-6 && out.topsCm === 1 && Math.abs(out.sizeBack - 1) < 1e-6
  && out.top?.[0] === "rig" && out.kids?.join() === "box,marker" && /导入 toy\.glb：/.test(out.notice) && !/顶点法线/.test(out.notice) && /个面/.test(out.notice) && /1 个空节点/.test(out.notice)
  && out.markerPicked && out.afterUndo1?.instances === 1 && out.afterUndo1?.selPools === 0 && out.afterUndo === 0 && out.openNotice && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
