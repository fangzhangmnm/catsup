// 组件里的子组件被移动 / 复制 / 删 / 在里面画线时，预演会不会坏（user 2026-10-26「如果一个component里面的subcomponent被进行移动 增删复制操作，preview会不会坏」）。
// 场景：组件 A（一块盒 + 里面放了一份子组件 B）放两份 A1 / A2；进 A1 编辑：
//   ① 移动 B：拖到一半看 A1 里的 B（在手里、跟着走）和 A2 里的 B（拖的时候跟不跟）；松手后两份都动了
//   ② 复制 B（Ctrl 拖）：拖到一半的影子；松手后两份 A 都多一个 B
//   ③ 删 B：两份都没了；④ 在 A1 里画线：拖到一半 A2 跟不跟（孪生槽）
// 只报事实（拖的时候另一份跟不跟），不判对错；页面错误 = 坏。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons, ctrlKey: !!extra.ctrl }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  e.setGrid({ ...e.grid, on: false });
  // A = 一块盒 (0..2)²×(0..1)，放两份；进 A1，在里面画小盒 (0.2..0.6)²×(1..1.4) 做成子组件 B（= A 的定义里放了一份 B）
  box(0, 0, 0, 2, 2, 1);
  // 轴放回包围盒角（2026-10-26 起默认底面中心）：本探针按「组件内部坐标 = 世界坐标」写的
  e.selectAll(); e.makeComponent("A"); e.setParam("origin", "corner"); e.copyInstance(P(4, 0, 0)); e.cancel();
  { const Ad = [...e.scene.def(e.scene.root).instances.values()][0].def;   // 第三份 A3：转 90°（测「本地变换换到孪生的世界系」，光平移测不出来）
    e.commitOp({ op: "placeInstance", at: { def: e.scene.root, group: null }, definition: Ad, xform: [0, -1, 0, 9, 1, 0, 0, 0, 0, 0, 1, 0] }); }
  e.cam.setView("iso"); e.zoomExtents();
  const S = () => e.scene, root = () => S().def(S().root);
  const [A1, A2, A3] = [...root().instances.values()].map((i) => i.id);
  const Adef = root().instances.get(A1).def;
  const bSlots = (view) => view.slots.filter((sl) => sl.chain.length === 2).map((sl) => ({ chain: sl.chain.join("/"), m: sl.xform.map((v) => +v.toFixed(6)).join(","), x: +sl.xform[3].toFixed(3), y: +sl.xform[7].toFixed(3), inHand: !!sl.overridden, ghost: !!sl.ghost }));
  const out = {};
  e.selectedPools.clear(); e.selectedPools.set(`i${A1}`, { kind: "instance", instance: A1 }); e.enterSelected();
  out.ctx = e.contextCrumbs().length;
  const before = new Set(S().def(Adef).body.kernel.faces().map((f) => f.id));
  const B = [[0.2, 0.2], [0.6, 0.2], [0.6, 0.6], [0.2, 0.6]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 1.4), P(d[0], d[1], 1.4)]); segs.push([P(a[0], a[1], 1), P(a[0], a[1], 1.4)]); }
  e.addSegments(segs);
  // 选 B 的面 / 边（新长出来的、都在 z ≥ 1 上方的）→ 建组件 B
  const k = e.kernel;
  e.cancel();
  for (const f of k.faces()) { const ring = k.faceRings3(f.id).outer; if (ring.every((q) => q.z >= 1 - 1e-9) && ring.some((q) => q.z > 1 + 1e-9 || (q.x > 0.15 && q.x < 0.65 && q.y > 0.15 && q.y < 0.65)) && ring.every((q) => q.x > 0.15 && q.x < 0.65 && q.y > 0.15 && q.y < 0.65)) e.selection.faces.add(f.id); }
  for (const ed of k.edges()) { const a = k.graph.pt(ed.a), d = k.graph.pt(ed.b); if ([a, d].every((q) => q.z >= 1 - 1e-9 && q.x > 0.15 && q.x < 0.65 && q.y > 0.15 && q.y < 0.65)) e.selection.edges.add(ed.id); }
  e.makeComponent("B"); e.setParam("origin", "corner"); e.cancel();
  out.bInA = [...S().def(Adef).instances.values()].length;
  out.bSlots0 = bSlots(e.worldGeom());
  void before;
  const bId = () => [...S().def(Adef).instances.values()][0]?.id;
  // ① 移动 B（A1 里），拖到一半
  e.selectedPools.clear(); e.selectedPools.set(`i${bId()}`, { kind: "instance", instance: bId() });
  e.setTool("move");
  const a0 = px(P(0.4, 0.4, 1.4)), a1 = px(P(1.4, 0.4, 1.4));
  fire("pointerdown", a0.x, a0.y, 1);
  for (let i = 1; i <= 6; i++) { fire("pointermove", a0.x + (a1.x - a0.x) * i / 6, a0.y + (a1.y - a0.y) * i / 6, 1); await sleep(16); }
  out.moveMid = bSlots(e.liveWorld());
  fire("pointerup", a1.x, a1.y, 0); await sleep(40);
  out.moveAfter = bSlots(e.worldGeom());
  // ② Ctrl 复制 B
  e.selectedPools.clear(); e.selectedPools.set(`i${bId()}`, { kind: "instance", instance: bId() });
  const bx = [...S().def(Adef).instances.values()][0].xform[3];
  const c0 = px(P(bx + 0.4, 0.4, 1.4)), c1 = px(P(bx + 0.4, 1.4, 1.4));
  fire("pointerdown", c0.x, c0.y, 1, { ctrl: true });
  for (let i = 1; i <= 6; i++) { fire("pointermove", c0.x + (c1.x - c0.x) * i / 6, c0.y + (c1.y - c0.y) * i / 6, 1, { ctrl: true }); await sleep(16); }
  out.copyMid = bSlots(e.liveWorld());
  fire("pointerup", c1.x, c1.y, 0, { ctrl: true }); await sleep(40);
  out.copyAfterSlots = bSlots(e.worldGeom()); out.copyAfter = out.copyAfterSlots.length;
  // ③ 删一个 B
  e.setTool("select"); e.selectedPools.clear(); e.selectedPools.set(`i${bId()}`, { kind: "instance", instance: bId() }); e.deleteSelection();
  out.deleteAfter = bSlots(e.worldGeom()).length;
  // ④ 在 A1 里画线，拖到一半：A2 的盒用不用预演内核（孪生槽）
  e.cancel(); e.setTool("line");
  const l0 = px(P(0.5, 1.5, 1)), l1 = px(P(1.5, 1.5, 1));
  fire("pointerdown", l0.x, l0.y, 1);
  for (let i = 1; i <= 6; i++) { fire("pointermove", l0.x + (l1.x - l0.x) * i / 6, l0.y + (l1.y - l0.y) * i / 6, 1); await sleep(16); }
  const lv = e.liveWorld();
  out.lineMid = lv.slots.filter((sl) => sl.chain.length === 1).map((sl) => ({ chain: sl.chain.join("/"), active: sl.active, inHand: !!sl.overridden, live: sl.kernel !== S().kernelOf({ def: Adef, group: null }) }));
  fire("pointerup", l1.x, l1.y, 0); await sleep(40); e.cancel();
  out.A1 = A1; out.A2 = A2; out.A3 = A3;
  return out;
});
console.log(JSON.stringify(res, null, 0));
// 不变量 = 预演和落定一样：拖到一半每份 B 的变换 == 松手后的；复制影子 == 松手后新长出来的那几份；画线时孪生用预演内核
const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const moveOk = sameSet(res.moveMid.map((q) => `${q.chain}|${q.m}`), res.moveAfter.map((q) => `${q.chain}|${q.m}`)) && res.moveMid.every((q) => q.inHand) && res.moveMid.length === 3;
const ghosts = res.copyMid.filter((q) => q.ghost);
// 影子带的是原件的链（外层 A 那份 / 原件 B），新长出来的 B 是新 id → 按「外层哪份 A + 变换」比
const outer = (q) => `${q.chain.split("/")[0]}|${q.m}`;
const olds = new Set(res.moveAfter.map(outer)), news = res.copyAfterSlots.map(outer).filter((k) => !olds.has(k));
const ghostOk = sameSet(ghosts.map(outer), news);
const ok = res.bInA === 1 && moveOk && ghosts.length === 3 && ghostOk && res.copyAfter === 6 && res.deleteAfter === 3 && res.lineMid.filter((q) => !q.active).every((q) => q.inHand && q.live) && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
process.exitCode = ok ? 0 : 1;
await b.close();
