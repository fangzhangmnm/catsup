// 倒角 + 「挤出直接按下只认面」接线（2026-10-28 Claude Opus 5.5；纪元账本 FM152 / FM165）。
// ① 自由建模点选一条边 → Ctrl+B → 往外拖 → 点一下落定：面 6 → 7、新面在选区、提示行说倒了几条 ② 马后炮小窗「倒角」改段数 3 → 面 9
// ③ 撤销一下回到 6 面 ④ 插入那一格选中一条边直接拖 = 倒角（不用 Ctrl+B；段数记着上一次的 3）⑤ 挤出、没选区、在一张很小的面上按下拖（以前点和边抢走）→ 挤出那张小面（面 +4）
// ⑥ 没有页面错误。跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-bevel.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const click = async (x, y) => { fire("pointermove", x, y, 0); await sleep(10); fire("pointerdown", x, y, 1); await sleep(10); fire("pointerup", x, y, 0); await sleep(40); };
  const drag = async (x0, y0, x1, y1) => { fire("pointermove", x0, y0, 0); await sleep(10); fire("pointerdown", x0, y0, 1); await sleep(10); for (let i = 1; i <= 6; i++) { fire("pointermove", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6, 1); await sleep(10); } fire("pointerup", x1, y1, 0); await sleep(40); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, px = (p) => e.cam.angularPx(p, e.vp()), hint = () => hud.status();
  const out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 2.2; e.cam.target = P(0.5, 0.5, 0.5); e.draw();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  out.mode = e.mode.id;
  // ① 点选顶面靠镜头那条边（中点），Ctrl+B，往外拖，点一下
  e.setTool("select"); await sleep(10);
  const edgeMid = P(1, 0.5, 1), s0 = px(edgeMid);
  await click(s0.x, s0.y);
  out.picked = { edges: e.selection.edges.size, verts: e.selection.verts.size, faces: e.selection.faces.size };
  fire("pointermove", s0.x + 10, s0.y + 10, 0); await sleep(10);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", code: "KeyB", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(20);
  out.modal = e.isGestureActive();
  for (let i = 1; i <= 5; i++) { fire("pointermove", s0.x + 10 + i * 8, s0.y + 10 + i * 8, 0); await sleep(10); }
  await click(s0.x + 50, s0.y + 50);
  out.one = { faces: m().faceCount(), selFaces: e.selection.faces.size, hint: hint() };
  // ② 马后炮：段数 3
  const panel = document.querySelector(".vcb-params:not([hidden])");
  out.two = { title: panel?.querySelector(".vcb-params-title")?.textContent ?? "" };
  e.setParam("segments", 3); await sleep(20);
  out.two.faces = m().faceCount();
  // ③ 撤销
  e.undo(); await sleep(20);
  out.three = { faces: m().faceCount(), hint: hint() };
  // ④ 插入那一格 + 选中一条边直接拖 = 倒角
  await click(s0.x, s0.y);
  e.setTool("offset"); await sleep(10);
  const pivot = px(edgeMid);
  await drag(pivot.x + 30, pivot.y + 30, pivot.x + 80, pivot.y + 80);
  out.four = { faces: m().faceCount(), hint: hint() };
  e.undo(); await sleep(20);
  // ⑤ 小面：顶面插 0.45 → 中间剩 0.1 × 0.1；取消选择；拉远到小面只有十几 px；挤出工具在它上面按下往上拖
  const top = m().faces().find((f) => m().faceVerts(f).every((v) => m().pt(v).z === 1));
  e.commitOp({ op: "meshInset", def: inst.def, faces: [top], dist: 0.45 });
  e.deselectAll(); e.cam.halfH = 3.5; e.draw(); await sleep(20);
  const tiny = px(P(0.5, 0.5, 1)), corner = px(P(0.45, 0.45, 1)), f0 = m().faceCount();
  out.five = { tinyPx: Math.round(Math.hypot(tiny.x - corner.x, tiny.y - corner.y) * 2) };
  e.setTool("pp"); await sleep(10);
  await drag(tiny.x, tiny.y, tiny.x, tiny.y - 60);
  out.five.dFaces = m().faceCount() - f0; out.five.hint = hint();
  return out;
});
await b.close();
res.errs = errs;
const ok = res.mode === "freeform" && res.picked.edges === 1 && res.modal
  && res.one.faces === 7 && res.one.selFaces === 1 && /倒角/.test(res.one.hint)
  && /倒角/.test(res.two.title) && res.two.faces === 9
  && res.three.faces === 6
  && res.four.faces === 9 && /3 段/.test(res.four.hint)   // 段数记着上一次马后炮改的 3（Blender 同款）
  && res.five.tinyPx < 28 && res.five.dFaces === 4
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-bevel OK" : "probe-mesh-bevel FAIL");
process.exit(ok ? 0 : 1);
