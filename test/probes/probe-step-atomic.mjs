// probe-step-atomic.mjs —— 一步全有或全无（统筹 11-13；起因 = user 的 a12b：带画的面点「建组件」，状态栏说「建了组件」、其实什么都没做）。created 2026-11-13 by Claude Opus 5.5
// 一步里只要有一条提交被拒（护栏 / 物件锁 / 演示锁）：这一步整个不算——场景、历史、重做、选区、「有没有改动」（docRevision、session.dirty）、画板都和这一步之前一样；
// 收尾时状态栏是被拒的原因（这一步里后来写的成功的话不作数）。
// ① a12b：网格体里带画的面「建组件」→ 状态栏 = 「这些面上有画……」，历史 / 重做 / 选区 / 改动号都没动；另外闪一条 info 档的瞬态提示（user 11-13「非抢占的弹窗…不要用error」）。
// ② 一步里先挪带画物件上的一个点（成功，画板那一头跟着走），再删锁着的那份摆放（物件锁拒）→ 前一条回滚；画板像素、贴图表、重做都照旧；状态栏 = 锁着的原因。
// ③ 同样两条，第二条之前演示锁锁上 → 同上，状态栏 = 演示锁的原因。
// ⑤ 这一步之前没有重做：一步里先成功一条、再被拒一条 → 收尾后按重做什么都不发生（半截不留在重做里）；全程停放的重做尾巴没漏过一步（parkedLeaks = 0）。
// 每段之前先做一步再撤销，留一条重做：失败的一步什么都没改，重做照旧能用。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-step-atomic.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
  const S = () => e.sceneRef, hint = () => document.querySelector("#hint")?.textContent ?? "", g = () => crypto.randomUUID();
  e.setGrid({ ...e.grid, on: false });
  const box = (x0) => { const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  // 只选几何：全选会把已有的物件也装进新组件
  const meshObject = (x0, name) => { e.deselectAll(); box(x0); e.selectAll(); e.selectedPools.clear(); e.runAction("brep.orientOutward", { curvature: 3 }); e.selectAll(); e.selectedPools.clear(); e.makeComponent(name); e.runAction("object.toMesh"); e.deselectAll(); return [...S().def(S().root).instances.values()].find((i) => S().def(i.def).name === name); };
  const A = meshObject(0, "甲"), B = meshObject(3, "乙");
  e.commitOp({ op: "startPaint", def: A.def, faces: S().mesh(A.def).kernel.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 100 });
  e.cam.setView("top"); e.zoomExtents(); e.draw(); await sleep(30);
  const info = C.paint.ensure(), guid = info.guid, vp = e.vp();
  const pts = []; for (let i = 0; i <= 20; i++) { const q = e.cam.project(P(0.2 + 0.6 * i / 20, 0.5, 1), vp); pts.push({ x: q.x, y: q.y }); }
  C.paint.stroke({ points: pts, size: 14, hardness: 1, color: [0.9, 0.1, 0.1], accum: "over" });
  const hash = (u) => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const px = () => { const b = C.paint.boards.get(guid); if (!b) return "没有画板"; return b.wp.exportData().nodes.map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${hash(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空")).join("|") + ` ${b.width}x${b.height}`; };
  const kSnap = (def) => JSON.stringify(S().mesh(def).kernel.toSnapshot());
  /** 留一条重做：挪 A 的一个点再撤销。 */
  const makeRedo = () => { const k = S().mesh(A.def).kernel, v = k.verts()[0], p = k.pt(v); e.commitOp({ op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.01 } }] }); e.undo(); };
  const state = () => ({ pos: e.history.position(), doc: e.docRevision, dirty: C.session.dirty(), tex: S().textures.size, px: px(), kA: kSnap(A.def), inst: S().def(S().root).instances.size, selF: e.selection.faces.size, selP: e.selectedPools.size, top: e.history.topLabel()?.title ?? "" });
  const hasRedo = () => e.history.position() < e.history.ops.length;   // 有没有能重做的
  const same = (a, b) => Object.keys(a).filter((k) => a[k] !== b[k]);
  /** 重做还在：重做一下位置前进一格，再撤回去。 */
  const redoWorks = () => { const p0 = e.history.position(); e.redo(); const ok = e.history.position() === p0 + 1; if (ok) e.undo(); return ok; };
  // ① a12b
  e.selectPools([{ kind: "instance", instance: A.id }]); e.enterSelected(); makeRedo();
  e.deselectAll(); for (const f of S().mesh(A.def).kernel.faces()) e.selection.faces.add(f);
  const toasts = () => [...document.querySelectorAll("#noticeStack .toast")].map((t) => ({ text: t.textContent ?? "", info: t.classList.contains("toast-info"), err: t.classList.contains("toast-error") || t.classList.contains("toast-warning") }));
  const t0 = toasts().length;
  const s1 = state(); const r1 = e.makeComponent("ab12"); await sleep(20);
  const t1 = toasts().slice(t0);
  out.one = { ret: r1, hint: hint(), changed: same(s1, state()), redo: redoWorks(), toast: t1.length === 1 && /这些面上有画/.test(t1[0].text) && t1[0].info && !t1[0].err };
  e.exitTo(0);
  // ② 一步里：挪 A 的点（成功）→ 删锁着的 B（物件锁拒）
  e.commitOp({ op: "setLocked", at: { def: S().root, group: null }, instance: B.id, on: true });
  e.deselectAll(); makeRedo();   // 先取消选择再做出重做（取消选择本身是一步，会清掉重做）
  const redoBefore2 = hasRedo(), s2 = state(), k = S().mesh(A.def).kernel, v = k.verts()[1], p = k.pt(v);
  e.step((pass) => { e.commitIn(pass, { op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.2 } }] }); e.commitIn(pass, { op: "eraseInstance", def: S().root, instance: B.id }); return true; }); await sleep(20);
  out.two = { hint: hint(), changed: same(s2, state()), redoBefore: redoBefore2, redo: redoWorks(), bStill: S().def(S().root).instances.has(B.id) };
  // ③ 同样两条，第二条之前演示锁锁上
  const host = e.host, hold0 = host.editHold, pos3 = e.history.position();
  host.editHold = () => (e.history.position() > pos3 ? { kind: "lock", why: "演示锁：探针锁上了" } : hold0?.call(host) ?? null);
  const redoBefore3 = hasRedo(), s3 = state();
  e.step((pass) => { e.commitIn(pass, { op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.3 } }] }); e.commitIn(pass, { op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.4 } }] }); return true; }); await sleep(20);
  host.editHold = hold0;
  out.three = { hint: hint(), changed: same(s3, state()), redoBefore: redoBefore3, redo: redoWorks() };
  // ⑤ 这一步之前重做是空的：一步里先成功一条、再被拒一条 → 收尾后不能重做（失败那一步的半截不许留在重做里，统筹审 11-13）
  { const kk = S().mesh(A.def).kernel, vv = kk.verts()[2], pp = kk.pt(vv); e.commitOp({ op: "meshMove", def: A.def, moves: [{ v: vv, to: { x: pp.x, y: pp.y, z: pp.z + 0.02 } }] }); }   // 新的一步 = 重做尾巴清空
  const s5 = state(), pos5 = e.history.position();
  e.step((pass) => { e.commitIn(pass, { op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.25 } }] }); e.commitIn(pass, { op: "eraseInstance", def: S().root, instance: B.id }); return true; }); await sleep(20);
  e.redo();
  out.five = { changed: same(s5, state()), noRedo: e.history.position() === pos5, hint: hint() };
  // ④ 能成的一步照旧算改过（docRevision 加了、历史前进）
  const s4 = state(), t4 = toasts().length; e.commitOp({ op: "meshMove", def: A.def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.5 } }] });
  out.four = { posUp: e.history.position() === s4.pos + 1, docUp: e.docRevision > s4.doc, noToast: toasts().length <= t4 };
  out.leaks = e.history.parkedLeaks;   // 停放的重做尾巴从没漏过一步
  return out;
});
await browser.close();
console.log(JSON.stringify(res, null, 1));
const quiet = (c) => c.length === 0;
const checks = {
  "① 带画的面建组件：状态栏是原因、什么都没变（历史 / 改动号 / 选区 / 画板）、没说成功、重做还在": /这些面上有画/.test(res.one.hint) && !/建了组件/.test(res.one.hint) && quiet(res.one.changed) && res.one.ret === false && res.one.redo,
  "② 一步里后一条碰锁着的物件：前一条回滚、画板和贴图表照旧、重做还在、状态栏是锁着的原因": /已锁定/.test(res.two.hint) && quiet(res.two.changed) && res.two.redoBefore && res.two.redo && res.two.bStill,
  "③ 一步里后一条撞上演示锁：同上、状态栏是演示锁的原因": /演示锁/.test(res.three.hint) && quiet(res.three.changed) && res.three.redoBefore && res.three.redo,
  "①½ 被拒的原因另外闪一条瞬态提示（漏斗 info 档，不是 error / warning）": res.one.toast,
  "④ 能成的一步照旧前进、算改过、不弹提示": res.four.posUp && res.four.docUp && res.four.noToast,
  "⑤ 之前没有重做：失败那一步的半截不留在重做里（按重做什么都不发生）": quiet(res.five.changed) && res.five.noRedo,
  "停放的重做尾巴从没漏过一步（parkedLeaks = 0）": res.leaks === 0,
  "页面没报错": errs.length === 0,
};
let bad = 0; for (const [k, ok] of Object.entries(checks)) { console.log(`${ok ? "✓" : "✗"} ${k}`); if (!ok) bad++; }
if (errs.length) console.log(errs.join("\n"));
process.exit(bad ? 1 : 0);
