// 快捷键拿起的工具是借的（controller/tool-borrow.ts；统筹 11-13 第 C 件，user 重做小屋子）。created 2026-11-13 by Claude Opus 5.5
// 网格体盒子、鼠标 + 键盘：
// ① 选着顶面按 G → 左柱「选」实心 + 「移动」蓝框 → 点一下落定 → 蓝框没了、还是「选」、历史 +1
// ② G 再 Esc → 回「选」、历史不多、几何不变
// ③ 借用结束不收马后炮：选一条边 Ctrl+B（倒角，键盘起手 = 借插入·倒角）→ 点落定 → 回到「选」、倒角小窗还在 → 改宽度 → 几何跟着变、历史还是一步
//   （自由建模的移动 G 没有记「刚才那一步」：既没有马后炮小窗、数值小窗也不收字，main 上本来就这样，不为 C 新加；统筹 11-13）
// ④ 拿着刀（点左柱）按 G 挪完 → 回到刀
// ⑤ G 途中按 R = 蓝框跳到旋转（G 那一下取消）；再按 R 起手旋转 → 点落定 → 回最开始的「选」
// ⑥ 没选区按 G → 蓝框借移动 → 点一个角点（选它）还借着 → 按住它拖走 → 回「选」
// ⑦ K → 借刀 → 在顶面两条对边上各点一下 → Esc 收刀 → 回「选」；K 之后什么都不做按 Esc = 回「选」、选区不清
// ⑧ 点左柱拿起的移动：拖完还在移动
// ⑨ 硬表面（出到根）：按 M = 一直拿着移动（没有蓝框）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-temp-tool.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), bar = document.getElementById("toolbar");
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const key = (k, code, more = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true, ...more }));
  const hover = async (s) => { fire("pointermove", s.x, s.y, 0); await sleep(15); };
  const clickAt = async (s) => { await hover(s); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(400); };   // 等过双击窗口
  const glide = async (a, z) => { for (let i = 1; i <= 6; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 6, a.y + (z.y - a.y) * i / 6, 0); await sleep(12); } };
  const drag = async (a, z) => { await hover(a); fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= 8; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 8, a.y + (z.y - a.y) * i / 8, 1); await sleep(12); } fire("pointerup", z.x, z.y, 0); await sleep(80); };
  const rail = async () => { await sleep(40); return { active: [...bar.querySelectorAll(".tool.active")].map((x) => x.dataset.holds), once: [...bar.querySelectorAll(".once")].map((x) => (x.classList.contains("rail-more") ? "…" : "") + x.dataset.holds) }; };
  const st = () => ({ tool: e.tool, base: e.toolHeld.base, temp: e.toolHeld.temp, steps: e.history.steps(), gesture: e.isGestureActive() });
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs, "box"); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const topZ = () => Math.max(...m().verts().map((v) => m().pt(v).z));
  const sum = () => m().verts().map((v) => { const p = m().pt(v); return `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`; }).join(";");
  const top = px(P(0.5, 0.5, 1));
  const selTop = async () => { hud.pick("select"); await sleep(20); e.deselectAll(); await clickAt(top); };
  // ①
  await selTop();
  { const s0 = st(); await hover(top); key("g", "KeyG"); await sleep(30);
    out.g1 = { during: st(), rail: await rail() };
    await glide(top, { x: top.x, y: top.y - 60 }); await clickAt({ x: top.x, y: top.y - 60 });
    out.g1.after = st(); out.g1.railAfter = await rail(); out.g1.dSteps = out.g1.after.steps - s0.steps; out.g1.moved = topZ() > 1.01;
    e.undo(); await sleep(20); }
  // ③
  { hud.pick("select"); await sleep(10); e.deselectAll();
    const zt = topZ(), ed = m().edges().find((x) => [m().edgeA[x], m().edgeB[x]].every((v) => Math.abs(m().pt(v).z - zt) < 1e-6) && Math.abs(m().pt(m().edgeA[x]).y - m().pt(m().edgeB[x]).y) < 1e-6);
    e.selection.edges.add(ed); e.draw();
    const mid = px(P((m().pt(m().edgeA[ed]).x + m().pt(m().edgeB[ed]).x) / 2, m().pt(m().edgeA[ed]).y, zt)), s0 = e.history.steps();
    await hover(mid); key("b", "KeyB", { ctrlKey: true }); await sleep(30); const dur = st();
    await glide(mid, { x: mid.x + 4, y: mid.y - 40 }); await clickAt({ x: mid.x + 4, y: mid.y - 40 });   // 横着离开这条边 = 有宽度（顺着边拖 = 宽度 0、不提交）
    const pp = e.paramPanel(); out.after = { during: dur, back: st(), title: pp?.title ?? null, fields: pp?.fields?.map((f) => f.key) ?? [], steps0: e.history.steps(), dStepsCommit: e.history.steps() - s0, sum0: sum() };
    if (pp && pp.fields.some((f) => f.key === "width")) { e.setParam("width", (pp.values.width ?? 0.1) * 0.5); await sleep(30); }
    out.after.changed = sum() !== out.after.sum0; out.after.dSteps = e.history.steps() - out.after.steps0; out.after.tool = e.tool;
    for (let i = 0; i < 2 && e.history.steps() > s0; i++) { e.undo(); await sleep(10); } }
  // ②
  await selTop();
  { const s0 = st(), g0 = sum(); await hover(top); key("g", "KeyG"); await sleep(30); await glide(top, { x: top.x + 30, y: top.y - 40 });
    key("Escape", "Escape"); await sleep(40);
    out.g2 = { after: st(), rail: await rail(), dSteps: e.history.steps() - s0.steps, same: sum() === g0 }; }
  // ④
  await selTop(); hud.pick("knife"); await sleep(20);
  { await hover(top); key("g", "KeyG"); await sleep(30); out.g4 = { during: st(), rail: await rail() };
    await glide(top, { x: top.x + 40, y: top.y }); await clickAt({ x: top.x + 40, y: top.y });
    out.g4.after = st(); out.g4.railAfter = await rail(); e.undo(); await sleep(20); }
  // ⑤
  await selTop();
  { const s0 = st(); await hover(top); key("g", "KeyG"); await sleep(30); await glide(top, { x: top.x, y: top.y - 30 });
    key("r", "KeyR"); await sleep(30); out.g5 = { afterR: st(), rail: await rail() };
    key("r", "KeyR"); await sleep(30); out.g5.afterRR = st();
    await glide(top, { x: top.x + 50, y: top.y + 20 }); await clickAt({ x: top.x + 50, y: top.y + 20 });
    out.g5.after = st(); out.g5.dSteps = e.history.steps() - s0.steps; e.undo(); await sleep(20); }
  // ⑥
  hud.pick("select"); await sleep(20); e.deselectAll(); await sleep(20);
  { const corner = px(P(1, 0, 1)), s0 = st();
    await hover({ x: corner.x + 80, y: corner.y + 80 }); key("g", "KeyG"); await sleep(30); out.g6 = { picked: st(), rail: await rail() };
    await clickAt(corner); out.g6.afterTap = st(); out.g6.selV = e.selection.verts?.size ?? 0;
    await drag(corner, { x: corner.x + 40, y: corner.y - 30 }); out.g6.after = st(); out.g6.dSteps = e.history.steps() - s0.steps;
    for (let i = 0; i < 3 && e.history.steps() > s0.steps; i++) { e.undo(); await sleep(10); } }
  // ⑦
  await selTop();
  { const s0 = st(), a = px(P(0.5, 0, 1)), z = px(P(0.5, 1, 1)), f0 = m().faceCount();
    await hover({ x: top.x + 300, y: top.y }); key("k", "KeyK"); await sleep(30); out.k = { picked: st(), rail: await rail() };
    await clickAt(a); await clickAt(z); key("Escape", "Escape"); await sleep(60);
    out.k.after = st(); out.k.faces = m().faceCount() - f0; out.k.dSteps = e.history.steps() - s0.steps;
    e.undo(); await sleep(20); await selTop();
    const n0 = e.selection.faces.size; key("k", "KeyK"); await sleep(30); key("Escape", "Escape"); await sleep(40);
    out.k.idleEsc = { after: st(), selKept: e.selection.faces.size === n0 && n0 > 0 }; }
  // ⑧
  await selTop(); hud.pick("move"); await sleep(20);
  { await drag(top, { x: top.x, y: top.y - 50 }); out.rail8 = { after: st(), rail: await rail() }; e.undo(); await sleep(20); }
  // ⑨ 硬表面：出到根
  hud.pick("select"); e.deselectAll(); e.exitContext?.(); await sleep(40);
  { key("m", "KeyM"); await sleep(30); out.hard = { mode: e.modeId, st: st(), rail: await rail() }; }
  return out;
});
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
const R = res;
chk("① G 起手：手上 = 移动、底 = 选、手势在", R.g1.during.tool === "move" && R.g1.during.base === "select" && R.g1.during.temp === "move" && R.g1.during.gesture, R.g1.during);
chk("① 左柱：「选」实心、「移动」蓝框", R.g1.rail.active.some((h) => h.split(",").includes("select")) && R.g1.rail.once.some((h) => h.split(",").includes("move")), R.g1.rail);
chk("① 点一下落定 → 回「选」、蓝框没了、挪了、历史 +1", R.g1.after.tool === "select" && R.g1.after.temp === null && R.g1.railAfter.once.length === 0 && R.g1.moved && R.g1.dSteps === 1, { after: R.g1.after, rail: R.g1.railAfter, moved: R.g1.moved, d: R.g1.dSteps });
chk("③ Ctrl+B 借插入·倒角（蓝框）→ 落定回到「选」、倒角小窗还在", R.after.during.temp === "offset" && R.after.back.tool === "select" && R.after.back.temp === null && R.after.title === "倒角" && R.after.dStepsCommit === 1, R.after);
chk("③ 在倒角小窗里改宽度 → 几何变了、历史还是一步、工具还是「选」", R.after.changed && R.after.dSteps === 0 && R.after.tool === "select", R.after);
chk("② G 再 Esc → 回「选」、历史不多、几何不变", R.g2.after.tool === "select" && R.g2.after.temp === null && R.g2.dSteps === 0 && R.g2.same && R.g2.rail.once.length === 0, R.g2);
chk("④ 拿着刀按 G：底 = 刀、借移动", R.g4.during.base === "knife" && R.g4.during.temp === "move", R.g4.during);
chk("④ 挪完回到刀", R.g4.after.tool === "knife" && R.g4.after.temp === null, R.g4.after);
chk("⑤ G 途中按 R：蓝框跳到旋转、底还是「选」、G 那一下取消了", R.g5.afterR.tool === "rotate" && R.g5.afterR.base === "select" && !R.g5.afterR.gesture && R.g5.rail.once.some((h) => h.split(",").includes("rotate")), R.g5);
chk("⑤ 再按 R 起手旋转 → 点落定 → 回最开始的「选」、一步", R.g5.afterRR.gesture && R.g5.after.tool === "select" && R.g5.after.temp === null && R.g5.dSteps === 1, R.g5);
chk("⑥ 没选区按 G：借移动（蓝框）、不起手", R.g6.picked.tool === "move" && R.g6.picked.temp === "move" && !R.g6.picked.gesture && R.g6.rail.once.some((h) => h.split(",").includes("move")), R.g6);
chk("⑥ 点一个角点（选它）= 还借着", R.g6.afterTap.temp === "move" && R.g6.selV === 1, R.g6);
chk("⑥ 按住拖走 → 回「选」", R.g6.after.tool === "select" && R.g6.after.temp === null, R.g6.after);
chk("⑦ K = 借刀（蓝框）", R.k.picked.tool === "knife" && R.k.picked.temp === "knife" && R.k.rail.once.some((h) => h.split(",").includes("knife")), R.k);
chk("⑦ 切一刀、Esc 收刀 → 切成了、回「选」", R.k.faces > 0 && R.k.after.tool === "select" && R.k.after.temp === null, R.k);
chk("⑦ K 之后什么都不做按 Esc = 回「选」、选区不清", R.k.idleEsc.after.tool === "select" && R.k.idleEsc.after.temp === null && R.k.idleEsc.selKept, R.k.idleEsc);
chk("⑧ 点左柱拿起的移动：拖完还在移动、没有蓝框", R.rail8.after.tool === "move" && R.rail8.after.temp === null && R.rail8.rail.once.length === 0, R.rail8);
chk("⑨ 硬表面按 M = 一直拿着移动、没有蓝框", R.hard.mode === "geometry" && R.hard.st.tool === "move" && R.hard.st.temp === null && R.hard.rail.once.length === 0, R.hard);
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);
