// 口令探针（headless，借 WeebPaint 的 playwright；周账 F-123）。没登录 OneDrive：只在本机的模型照样能加密（库：从没同步过的文件没有云端那份要换）——
//   ① 图库家存一个模型 → 「加密保护…」（脚本答题：设新口令两遍）→ 文件变成容器、验证器落进 collection、口令在内存
//   ② 锁定 → 从图库打开：先弹口令（错一次再对）→ 打开成功、编辑器里有几何 ③ 锁着保存被如实拒；解锁后能存、仍是加密的
//   ④ 解除加密 → 明文；再加密（验证器在 = 走「输入原口令」）⑤ 记住：keeper 记一把 → 新页面开机静默解锁、开加密模型不问；忘记 → 再开机锁着
//   ⑥ 本地加密文件（文件输入）→ 问口令 → 当临时模型打开 ⑦ ☰ 设置页有「锁定」行 ⑧ CSP 零拦截。
// 用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-password.mjs [url]`。created 2026-10-29 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 1000, height: 800 } });
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 400)));
const out = {}, ok = (k, v) => { out[k] = v; if (!v) process.exitCode = 1; };
const PW = "猫猫口令";
const isEnc = (p) => page.evaluate(async (p) => globalThis.__catsup.store().file(p, { mode: "existing" }).isEncrypted(), p);
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__catsup?.session);
// ① 图库家存一个模型 → 加密
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(2, 0)], [P(2, 0), P(2, 2)], [P(2, 2), P(0, 2)], [P(0, 2), P(0, 0)]] }); });
await page.waitForFunction(() => !globalThis.__catsup.session.lazy && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 10000 });
const path1 = await page.evaluate(() => globalThis.__catsup.session.home.path);
ok("savedInGallery", typeof path1 === "string" && path1.endsWith(".catsup"));
const enc1 = await page.evaluate(async (pw) => {
  const asks = []; globalThis.__catsup.crypto.answer(async (o) => { asks.push({ t: o.title, purpose: o.purpose ?? "current", remember: !!o.offerRemember }); return pw; });
  const r = await globalThis.__catsup.session.encryptCurrent();
  const col = globalThis.__catsup.store().collection("app-state"); await col.init();
  return { r, asks, encrypted: globalThis.__catsup.session.encrypted, unlocked: globalThis.__catsup.crypto.isUnlocked(), verifier: col.getItem("galleryPasswordVerifier")?.v ?? null };
}, PW);
ok("encrypted", enc1.r === true && enc1.encrypted === true && enc1.unlocked === true && await isEnc(path1));
ok("setPasswordTwiceNewForm", enc1.asks.length === 2 && enc1.asks.every((a) => a.purpose === "new") && enc1.asks[1].remember === true && enc1.asks[0].remember === false);
ok("verifierStored", enc1.verifier === 1);
// ② 锁定 → 从图库打开：错一次再对
const opened = await page.evaluate(async ([p, pw]) => {
  const c = globalThis.__catsup.crypto; c.lock();
  const asks = []; let n = 0; c.answer(async (o) => { asks.push({ msg: o.message, remember: !!o.offerRemember }); n++; return n === 1 ? "错的" : pw; });
  await globalThis.__catsup.session.newDoc?.();   // 先离开（没有也行）
  const r = await globalThis.__catsup.session.openFromGallery(p);
  const e = globalThis.__catsup.editor;
  return { r, asks, encrypted: globalThis.__catsup.session.encrypted, unlocked: c.isUnlocked(), defs: e.sceneRef.defs.size };
}, [path1, PW]);
ok("lockedOpenAsks", opened.asks.length === 2 && /不对/.test(opened.asks[1].msg) && opened.asks[0].remember === true);
ok("openedAfterRetry", opened.r === true && opened.encrypted === true && opened.unlocked === true && opened.defs >= 1);
// ③ 锁着保存被拒；解锁后能存、仍加密
const s3 = await page.evaluate(async (pw) => { const s = globalThis.__catsup.session, e = globalThis.__catsup.editor, c = globalThis.__catsup.crypto;
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[{ x: 0, y: 5, z: 0 }, { x: 1, y: 5, z: 0 }]] });
  c.lock(); const r1 = await s.save(); const dirty1 = s.dirty();
  c.setPassword(pw); const r2 = await s.save(); const dirty2 = s.dirty();
  return { r1, dirty1, r2, dirty2 }; }, PW);
ok("lockedSaveRefused", s3.r1 === false && s3.dirty1 === true);
ok("unlockedSaves", s3.r2 === true && s3.dirty2 === false && await isEnc(path1));
// ④ 解除加密 → 明文；再加密走「输入原口令」（验证器在）
const dec = await page.evaluate(async (pw) => { const c = globalThis.__catsup.crypto; c.answer(async () => pw); const r = await globalThis.__catsup.session.decryptCurrent(); return { r, encrypted: globalThis.__catsup.session.encrypted }; }, PW);
ok("decrypted", dec.r === true && dec.encrypted === false && !(await isEnc(path1)));
const re = await page.evaluate(async (pw) => { const c = globalThis.__catsup.crypto; c.lock(); const asks = []; c.answer(async (o) => { asks.push(o.title); return pw; }); const r = await globalThis.__catsup.session.encryptCurrent(); return { r, asks }; }, PW);
ok("reEncryptAsksExisting", re.r === true && re.asks.length === 1 && /输入图库口令/.test(re.asks[0]) && await isEnc(path1));
// ⑤ 记住 → 新页面开机静默解锁、开加密模型不问；忘记 → 锁着
await page.evaluate(async (pw) => { await globalThis.__catsup.crypto.keeper().remember(pw); globalThis.__catsup.crypto.lock(); }, PW);
const page2 = await ctx.newPage(); page2.on("pageerror", (e) => errs.push("p2 " + String(e.stack ?? e).slice(0, 300)));
await page2.goto(url, { waitUntil: "load", timeout: 30000 }); await page2.waitForFunction(() => globalThis.__catsup?.session); await page2.waitForTimeout(1200);
const boot2 = await page2.evaluate(async (p) => { const c = globalThis.__catsup.crypto; c.answer(async () => { throw new Error("should not ask"); });
  const unlocked = c.isUnlocked(), until = c.rememberedUntil();
  const r = await globalThis.__catsup.session.openFromGallery(p);
  return { unlocked, until, r, encrypted: globalThis.__catsup.session.encrypted }; }, path1);
ok("rememberedBootUnlocks", boot2.unlocked === true && typeof boot2.until === "number" && boot2.until > Date.now());
ok("rememberedOpensWithoutAsking", boot2.r === true && boot2.encrypted === true);
await page2.evaluate(async () => { await globalThis.__catsup.crypto.forgetRemembered(); });
const page3 = await ctx.newPage(); await page3.goto(url, { waitUntil: "load", timeout: 30000 }); await page3.waitForFunction(() => globalThis.__catsup?.session); await page3.waitForTimeout(1000);
ok("forgottenBootLocked", await page3.evaluate(() => !globalThis.__catsup.crypto.isUnlocked() && globalThis.__catsup.crypto.rememberedUntil() === null));
await page2.close(); await page3.close();
// ⑥ 本地加密文件：当临时模型打开
const local = await page.evaluate(async () => {
  const s = globalThis.__catsup.session, E = globalThis.__catsup.encryption;
  const blob = await E.packContainer({ dataBytes: s.encode(), fileName: "本地加密", ext: "catsup", password: "本地口令" });
  globalThis.__catsup.crypto.answer(async () => "本地口令");
  const okOpen = await s.openLocalBytes(new Uint8Array(await blob.arrayBuffer()), "本地加密.catsup.zip", null);
  return { okOpen, home: s.home.kind, name: s.home.name ?? null };
});
ok("localEncryptedOpensTransient", local.okOpen === true && local.home === "transient" && local.name === "本地加密");
// ⑦ ☰ 设置页「口令」节
await page.evaluate(() => globalThis.__catsup.crypto.setPassword("x"));
await page.click("#btnMenu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="settings"]', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60);
const settingsLabels = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent));
ok("settingsHasLockRow", settingsLabels.some((l) => /锁定（忘掉口令）/.test(l)));
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ⑧ CSP 零拦截
const csp = await page.evaluate(() => (globalThis.__catsup.debugLog.toText() ?? "").split("\n").filter((l) => /\[csp\]/.test(l)));
ok("cspClean", csp.length === 0); if (csp.length) out.cspLines = csp.slice(0, 5);
console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
if (errs.length) process.exitCode = 1;
await b.close();
