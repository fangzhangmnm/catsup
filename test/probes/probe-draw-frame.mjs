// 坐标架 / 组件原点拆开（纪元账本 DT86）界面全流程：组件两份 → 进去用坐标架工具点角 = 只搬坐标架（原点 / 几何 / 两份矩阵不动、提示披露、淡原点小三轴）
// → 工具条「设为组件原点」= 原点对过来（世界不动、小三轴没了）、一次撤销全回 → 出来选一份、右键「改组件原点…」点角 = 原点到那里（两份一起）、马后炮「底面中心」
// → 回到原来的工具；Esc 取消 = 什么都不改。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 744, height: 1133 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, s = () => e.scene, cv = document.getElementById("board"), R = cv.getBoundingClientRect(), sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  e.setGrid({ on: false });
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, extra = {}) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: R.left + x, clientY: R.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, ...extra }));
  const click = async (p) => { const q = px(p); fire("pointermove", q.x, q.y); await sleep(30); fire("pointerdown", q.x, q.y, { buttons: 1 }); fire("pointerup", q.x, q.y, { buttons: 0 }); await sleep(80); };
  const r6 = (v) => Math.round(v * 1e4) / 1e4, f3 = (p) => [r6(p.x), r6(p.y), r6(p.z)];
  const o = {};
  // 盒子 [0,1]×[0,1]×[0,1] → 组件 → 复制一份平移 (3,0,0)
  const P = (x, y, z) => ({ x, y, z });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  o.faces = e.kernel.faces().length;
  e.selectAll();
  e.makeComponent("盒"); await sleep(50);
  const root = () => s().def(s().root), insts = () => [...root().instances.values()];
  const i0 = insts()[0];
  e.commitOp({ op: "placeInstance", at: { def: s().root, group: null }, definition: i0.def, xform: [1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0] });
  o.copies = insts().length;
  const xf = () => insts().map((i) => i.xform.map(r6).join(",")).join("|");
  const world = () => { const W = e.worldGeom(); return W.slots.flatMap((sl, i) => [...W.parts[i].verts.values()]).map((v) => `${r6(v.x)},${r6(v.y)},${r6(v.z)}`).sort().join(" "); };
  const xf0 = xf(), w0 = world();
  // ① 进第一份，坐标架工具点一下角 (1,1,1) = 只搬坐标架
  e.cam.setView("iso"); e.zoomExtents(); await sleep(50);
  e.enterPool({ kind: "instance", instance: i0.id }); await sleep(50);
  e.setTool("axes"); await sleep(30);
  await click(P(1, 1, 1));
  o.frameO = f3(e.contextFrame().origin); o.originO = f3(s().originOfChain([i0.id]).origin);
  o.hint1 = document.getElementById("hint")?.textContent ?? "";
  o.sameAfterFrame = xf() === xf0 && world() === w0;
  o.marker = !!e.originMarker?.();
  await sleep(50);
  o.btn = [...document.querySelectorAll("button")].some((x) => x.textContent === "设为组件原点");
  // ② 设为组件原点（工具条按钮）
  [...document.querySelectorAll("button")].find((x) => x.textContent === "设为组件原点")?.click(); await sleep(80);
  o.originO2 = f3(s().originOfChain([i0.id]).origin); o.frameO2 = f3(e.contextFrame().origin);
  o.markerAfterSet = !!e.originMarker?.(); o.worldSame2 = world() === w0;
  o.xfChanged = xf() !== xf0;
  e.undo(); await sleep(50);
  o.undoOnce = xf() === xf0 && f3(s().originOfChain([i0.id]).origin).join() === o.originO.join() && f3(e.contextFrame().origin).join() === "1,1,1";
  // ③ 出来，选第二份，右键菜单「改组件原点…」
  e.exitContext(); await sleep(50);
  e.setTool("select"); e.deselectAll();
  const i1 = insts()[1];
  e.selectedPools.set(`i${i1.id}`, { kind: "instance", instance: i1.id });
  const keyOk = e.selectedPools.size === 1;
  o.menuHas = C.hud.edits().some((it) => it.id === "componentOrigin" && !it.hidden);
  o.began = e.beginComponentOrigin(); o.toolDuring = e.tool;
  const X = i1.xform, cornerW = { x: X[0] * 0.5 + X[1] * 0.5 + X[2] + X[3], y: X[4] * 0.5 + X[5] * 0.5 + X[6] + X[7], z: X[8] * 0.5 + X[9] * 0.5 + X[10] + X[11] };   // 定义坐标 (0.5, 0.5, 1) = 和第一份 (1,1,1) 同一个角（建组件默认原点 = 底面中心）
  o.corner2 = f3(cornerW);
  await click(cornerW);
  o.toolAfter = e.tool;
  o.origin3 = f3(s().originOfChain([i1.id]).origin);
  o.origin3first = f3(s().originOfChain([i0.id]).origin);   // 同一个定义：第一份的原点也跟着换
  o.world3 = world() === w0;
  const pp = e.paramPanel(); o.panelTitle = pp?.title ?? ""; o.panelVals = pp?.fields.map((f) => f.key).join(",");
  e.setParam("where", "bottom"); await sleep(50);
  o.originBottom = f3(s().originOfChain([i1.id]).origin);
  o.world4 = world() === w0;
  // ④ Esc 取消
  const xfBefore = xf();
  e.selectedPools.set(`i${i1.id}`, { kind: "instance", instance: i1.id });
  e.beginComponentOrigin(); e.cancel(); await sleep(30);
  o.cancelTool = e.tool; o.cancelSame = xf() === xfBefore; o.keyOk = keyOk;
  return o;
});
console.log(JSON.stringify(out, null, 1));
const ok = out.faces === 6 && out.copies === 2 && out.frameO.join() === "1,1,1" && out.originO.join() === "0.5,0.5,0" && /组件原点没动/.test(out.hint1) && out.sameAfterFrame && out.marker && out.btn
  && out.originO2.join() === "1,1,1" && out.frameO2.join() === "1,1,1" && !out.markerAfterSet && out.worldSame2 && out.xfChanged && out.undoOnce
  && out.menuHas && out.began && out.toolDuring === "axes" && out.toolAfter === "select" && out.origin3.join() === out.corner2.join() && out.origin3first.join() === "1,1,1" && out.world3
  && /改组件原点/.test(out.panelTitle) && out.panelVals === "where" && out.originBottom.join() === "3,0,0" && out.world4 && out.cancelTool === "select" && out.cancelSame && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
