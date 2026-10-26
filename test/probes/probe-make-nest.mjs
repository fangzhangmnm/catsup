// 建组件把选中的组件一起装进去（2026-10-26，SketchUp 同款嵌套；user 回「建组件时选区里的组件不嵌套（SU 会嵌套）要不要改」：「当然要」）。
// 盒 A 建组件、挪到 x=3；再画一个散盒；全选按 G → 根上只剩一份新组件，里面有散盒 + 一份 A；新组件轴 = 全部内容的底面中心；Ctrl+Z 回原样。
// created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const key = (k, m = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: !!m.ctrl, bubbles: true, cancelable: true }));
  e.setGrid({ ...e.grid, on: false });
  box(3, 0, 0, 4, 1, 1); e.selectAll(); e.makeComponent("A"); e.cancel();
  box(0, 0, 0, 1, 1, 2);
  e.setTool("select"); e.selectAll(); await sleep(20);
  const S = e.scene, root0 = S.def(S.root), before = { inst: root0.instances.size, faces: e.kernel.faces().length };
  key("g"); await sleep(30);
  const s = e.scene, root = s.def(s.root), inst = [...root.instances.values()][0], d = s.def(inst.def);
  const out = { before, rootInst: root.instances.size, rootFaces: s.kernelOf({ def: s.root, group: null }).faces().length, innerFaces: s.brep(d.id).kernel.faces().length, innerInst: d.instances.size,
    origin: [inst.xform[3], inst.xform[7], inst.xform[11]].map((v) => +v.toFixed(4)), selNewest: e.selectedPools.size };
  key("z", { ctrl: true }); await sleep(30);
  const s2 = e.scene; out.undone = { inst: s2.def(s2.root).instances.size, faces: s2.kernelOf({ def: s2.root, group: null }).faces().length };
  return out;
});
console.log(JSON.stringify(res));
const ok = res.before.inst === 1 && res.before.faces === 6 && res.rootInst === 1 && res.rootFaces === 0 && res.innerFaces === 6 && res.innerInst === 1
  && JSON.stringify(res.origin) === JSON.stringify([2, 0.5, 0]) && res.selNewest === 1 && res.undone.inst === 1 && res.undone.faces === 6 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
