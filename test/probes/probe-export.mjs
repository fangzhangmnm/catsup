// 导出（导出设计稿 ai-docs/20261028-export-design.md §7；账本 UX39）。created 2026-10-28 by Claude Opus 5.5
// ① ☰ 文件页「导出与另存…」：有「导出工程文件（.catsup）」「导出模型…」，没有旧的「导出 .glb（下载一份）」「导出 OBJ…」
// ② 导出工程文件 → 下载名以 .catsup 结尾、字节是完整工程（CATSUP_document + CATSUP_definitions + 参考牌组都在）、开回来 = 工程
// ③「导出模型…」= 模态 sheet：格式 / 范围 / 贴图 / 边线四行 + 说明行「不是工程备份」；切到 obj 只剩格式一行；Esc 取消不下载
// ④ glb 导出：下载名 .glb、没有任何 CATSUP_* 键、没有缩略图 / 参考图、asset 2.0；开回 CatsUp 被拒、指去导入
// ⑤ 选一个组件 → 范围多出「选中的 1 个物件」→ 只导它（根下一个孩子）⑥ 关边线 → 没有 LINES
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-export.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);   // 找不到元素就快点失败（别一个点等 30 s）
const step = (n) => process.stderr.write(`[probe-export] ${n}\n`);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
// 截下载：<a download> 被点时把 blob 字节和名字记下来（不真下载）
await page.evaluate(() => {
  globalThis.__dl = [];
  const orig = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { globalThis.__dl.push({ name: this.download, href: this.href }); return; } return orig.call(this); };
});
const toasts = () => page.evaluate(() => [...document.querySelectorAll("#noticeStack .toast-text")].map((x) => x.textContent).join(" ｜ "));   // session 的状态走通知条，不走提示行
const takeDownloads = () => page.evaluate(async () => { const out = []; for (const d of globalThis.__dl.splice(0)) { const buf = new Uint8Array(await (await fetch(d.href)).arrayBuffer()); out.push({ name: d.name, bytes: [...buf] }); } return out; });
const glbJson = (bytes) => { const buf = Buffer.from(bytes); const len = buf.readUInt32LE(12); return JSON.parse(buf.subarray(20, 20 + len).toString("utf8")); };
const catsupKeys = (j, path = "") => { if (!j || typeof j !== "object") return []; const out = []; for (const [k, v] of Object.entries(j)) { if (k.startsWith("CATSUP_")) out.push(path + k); out.push(...catsupKeys(v, `${path}${k}.`)); } return out; };
const r = {};
step("setup");
// 场景：盒子建组件 + 地上再画一个盒子；挂一张参考卡（工程里有、交付物里没有）
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0, y0, x1, y1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.addSegments(segs); };
  box(0, 0, 1, 1); e.selectAll(); e.makeComponent("块"); e.deselectAll();
  box(3, 0, 4, 1); e.deselectAll();
});
const menuLabels = async () => page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent));
step("hub");
await page.click("#btnMenu"); await page.waitForTimeout(100);
await page.click('.popup-menu [data-menu-tab="file"]', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60);
r.main = await menuLabels();
await page.click(".popup-menu .menu-item:has-text('导出与另存')"); await page.waitForTimeout(120);
r.hub = await menuLabels();
// ② 导出工程文件
step("export project");
await page.click(".popup-menu .menu-item:has-text('导出工程文件')"); await page.waitForTimeout(200);
{ const [d] = await takeDownloads(); const j = d ? glbJson(d.bytes) : null; r.project = d ? { name: d.name, doc: !!j?.extensions?.CATSUP_document, defs: !!j?.extensions?.CATSUP_definitions, hint: await toasts() } : null; r.projectBytes = d?.bytes; }
// ③ 导出模型 sheet
const openSheet = async () => { await page.click("#btnMenu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="file"]', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60); await page.click(".popup-menu .menu-item:has-text('导出与另存')"); await page.waitForTimeout(120); await page.click(".popup-menu .menu-item:has-text('导出模型')"); await page.waitForTimeout(150); };
const sheetState = () => page.evaluate(() => ({ open: !document.getElementById("sheet").hidden, title: document.getElementById("sheetTitle").textContent, fields: [...document.querySelectorAll("#sheetChoices .sheet-field")].map((f) => f.dataset.field), note: document.getElementById("sheetMessage").textContent, ok: document.getElementById("sheetConfirm").textContent, scopes: [...document.querySelectorAll('#sheetChoices [data-field="scope"] button')].map((x) => x.textContent) }));
step("sheet");
await openSheet();
r.sheet = await sheetState();
await page.click('#sheetChoices [data-field="format"] button[data-value="obj"]'); await page.waitForTimeout(50);
r.sheetObj = await sheetState();
await page.click('#sheetChoices [data-field="format"] button[data-value="glb"]'); await page.waitForTimeout(50);
await page.keyboard.press("Escape"); await page.waitForTimeout(100);
r.cancel = { closed: await page.evaluate(() => document.getElementById("sheet").hidden), downloads: (await takeDownloads()).length };
// ④ glb 整个模型
step("glb all");
await openSheet(); await page.click("#sheetConfirm"); await page.waitForTimeout(250);
{ const [d] = await takeDownloads(); const j = d ? glbJson(d.bytes) : null; r.model = d ? { name: d.name, catsup: catsupKeys(j), version: j.asset.version, thumb: "thumbnail" in j.asset, images: (j.images ?? []).length, roots: j.nodes[j.scenes[0].nodes[0]].children?.length ?? 0, lines: j.meshes.some((m) => m.primitives.some((p) => p.mode === 1)) } : null;
  r.reopen = { ok: await page.evaluate(async (arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "导出的.glb", null), d?.bytes ?? []) }; await page.waitForTimeout(80); r.reopen.hint = await toasts(); }
// ⑤ 选组件 → 只导选中的；⑥ 关边线
step("selection");
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); });
await openSheet();
r.sheetSel = await sheetState();
await page.click('#sheetChoices [data-field="scope"] button[data-value="sel"]'); await page.waitForTimeout(40);
await page.click('#sheetChoices [data-field="lines"] button[data-value="none"]'); await page.waitForTimeout(40);
await page.click("#sheetConfirm"); await page.waitForTimeout(250);
{ const [d] = await takeDownloads(); const j = d ? glbJson(d.bytes) : null; r.sel = d ? { kids: j.nodes[0].children?.length ?? 0, rootMesh: "mesh" in j.nodes[0], meshes: j.meshes.length, lines: j.meshes.some((m) => m.primitives.some((p) => p.mode === 1)), catsup: catsupKeys(j).length } : null; }
// ② 收尾：工程文件开回来是工程（最后做：它会换掉当前模型）
step("reopen project");
{ const pr = page.evaluate(async (arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "工程.catsup", null), r.projectBytes ?? []);
  await page.waitForTimeout(200);
  await page.click("#sheetChoices .sheet-choice:has-text('丢弃')", { timeout: 1500 }).catch(() => {});   // 当前模型没有家 → 离开前问一句：丢弃（探针不要它）
  r.projectReopen = await pr; }
delete r.projectBytes;
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.hub.some((l) => /导出工程文件/.test(l)) && r.hub.some((l) => /导出模型/.test(l)) && !r.hub.some((l) => /导出 \.glb|导出 OBJ/.test(l))
  && /\.catsup$/.test(r.project?.name ?? "") && r.project.doc && r.project.defs && /工程原样/.test(r.project.hint)
  && r.sheet.open && r.sheet.title === "导出模型" && r.sheet.fields.join() === "format,scope,textures,lines" && /不是工程备份/.test(r.sheet.note) && r.sheet.ok === "导出" && r.sheet.scopes.join() === "整个模型"
  && r.sheetObj.fields.join() === "format" && /OBJ 只导整个模型/.test(r.sheetObj.note)
  && r.cancel.closed && r.cancel.downloads === 0
  && /\.glb$/.test(r.model?.name ?? "") && r.model.catsup.length === 0 && r.model.version === "2.0" && !r.model.thumb && r.model.images === 0 && r.model.roots === 1 && r.model.lines
  && r.reopen.ok === false && /导入/.test(r.reopen.hint)
  && r.sheetSel.scopes.join() === "整个模型,选中的 1 个物件" && r.sel?.kids === 1 && !r.sel.rootMesh && r.sel.meshes === 1 && !r.sel.lines && r.sel.catsup === 0
  && r.projectReopen === true && errs.length === 0;
console.log(ok ? "probe-export OK" : "probe-export FAIL");
process.exit(ok ? 0 : 1);
