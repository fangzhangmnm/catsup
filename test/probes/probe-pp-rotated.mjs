// 转过的组件里推拉，面跟着手走（2026-10-26）。user：「某个负重轮推拉的时候面的移动方向反了。det可能不是负的，可能就是你忘了算正确的变换」
// 「我是说你可能怪行列式是负的。但我那个正的行列式也会bug」。根因：工具拿了规范化过的世界法向（共面的面共用平面记录，朝向被翻到固定半球），
// 组件里的 +x 到世界是 −x、被翻回 +x，换回组件内部时只换了长度没换正负。
// 盒 [0,1]³ 建组件（轴默认底面中心），再放一份绕竖轴转 180°（行列式 +1）、一份镜像（行列式 −1）；三份各进去推拉「世界里朝 +x 的那面」往 +x 拖 → 都往 +x 长。
// created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1);
  e.selectAll(); e.makeComponent("块"); e.cancel();
  const S = () => e.scene, root = () => S().def(S().root);
  const [i0] = [...root().instances.values()];
  const def = i0.def;
  // 转 180°（x→−x, y→−y）放在 x∈[2.5,3.5]；镜像（x→−x）放在 x∈[5,6]（都留在画面里）
  e.commitOp({ op: "placeInstance", at: { def: S().root, group: null }, definition: def, xform: [-1, 0, 0, 3, 0, -1, 0, 0.5, 0, 0, 1, 0] });
  e.commitOp({ op: "placeInstance", at: { def: S().root, group: null }, definition: def, xform: [-1, 0, 0, 5.5, 0, 1, 0, 0.5, 0, 0, 1, 0] });
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.3; e.draw();
  const ap = (X, p) => ({ x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] });
  const out = [];
  for (const inst of [...root().instances.values()]) {
    const X = inst.xform;
    const worldMaxX = () => Math.max(...S().def(def).body.kernel.vertices().map((v) => ap(X, v).x));
    // 世界里朝 +x 的那面的中心：本地找一张面，变换后所有点 x = 世界最大 x
    const k = S().def(def).body.kernel, wmx = worldMaxX();
    const f = k.faces().find((F) => k.faceRings3(F.id).outer.every((q) => Math.abs(ap(X, q).x - wmx) < 1e-9));
    const o = k.faceRings3(f.id).outer, cl = o.reduce((a, q) => ({ x: a.x + q.x / o.length, y: a.y + q.y / o.length, z: a.z + q.z / o.length }), P(0, 0, 0));
    const w = ap(X, cl);
    e.setTool("select"); e.cancel();
    e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
    e.setTool("pp"); await sleep(20);
    const a = px(w), z = px({ x: w.x + 0.5, y: w.y, z: w.z });
    fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1);
    for (let i = 1; i <= 10; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 10, a.y + (z.y - a.y) * i / 10, 1); await sleep(16); }
    await sleep(60);
    const lv = e.liveWorld(), part = lv.parts[lv.activeSlot().index];
    const previewMaxX = Math.max(...[...part.verts.values()].map((v) => v.x));
    fire("pointerup", z.x, z.y, 0); await sleep(60);
    out.push({ det: Math.sign(X[0] * X[5] - X[1] * X[4]), rot: X[5] < 0, before: +wmx.toFixed(3), preview: +previewMaxX.toFixed(3), after: +worldMaxX().toFixed(3) });
    e.exitContext();
    e.undo();   // 下一份从原始盒子开始（三份是同一个定义）；撤销会把人带回那一步所在的组件里（会话跟着撤）→ 退回最外层
    while (e.contextCrumbs().length > 1) e.exitContext();
  }
  return out;
});
console.log(JSON.stringify(res));
const ok = res.length === 3 && res.every((o) => o.preview > o.before + 0.1 && o.after > o.before + 0.1) && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
