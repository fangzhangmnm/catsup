// 修复指令的作用范围 + 传播到子物件（DT85，user 10-26「默认传播，同一个组件只修一次，锁着的跳过，面板里放『含子物件』开关」= 默认 + 披露）：
// 根上一个断口；组件 A（两份：一份直接放、一份在组件 B 里 = 两条路径到同一个定义）；B 自己一个断口；锁着的组件 C。
// 没选东西 + 含子物件 = 焊 3 处（A 只修一次、C 跳过），提示行说清；小窗关掉含子物件 = 只焊根上 1 处。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, s = () => e.scene, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = (x, y) => ({ x, y, z: 0 });
  const brk = (y) => e.commitOp({ op: "addEdges", at, segs: [[P(0, y), P(1, y)], [P(1, y), P(2, y)]] });   // (1, y) = 断口
  const edgesAt = (y) => e.kernel.edges().filter((x) => { const a = e.kernel.graph.pt(x.a); return Math.abs(a.y - y) < 1e-9; }).map((x) => [e.kernel.graph.pt(x.a), e.kernel.graph.pt(x.b)]);
  const newest = () => Math.max(...s().def(s().root).instances.keys());
  brk(0);                                                    // 根上的
  brk(5); e.commitOp({ op: "makeComponent", at, faces: [], edges: edgesAt(5), name: "A" }); const a1 = newest(), A = s().def(s().root).instances.get(a1).def;
  e.commitOp({ op: "placeInstance", at, definition: A, xform: [1, 0, 0, 0, 0, 1, 0, 3, 0, 0, 1, 0] }); const a2 = newest();
  brk(10); e.commitOp({ op: "makeComponent", at, faces: [], edges: edgesAt(10), name: "B", instances: [a2] }); const bI = newest(), B = s().def(s().root).instances.get(bI).def;
  brk(15); e.commitOp({ op: "makeComponent", at, faces: [], edges: edgesAt(15), name: "C" }); const cI = newest();
  e.commitOp({ op: "setLocked", at, instance: cI, on: true });
  e.deselectAll();
  const breaks = (def) => { const k = s().kernelOf({ def, group: null }); return k.vertices().filter((v) => v.edges.size === 2 && k.isBreakJunction(v.id)).length; };
  const out = { count: e.repairCount("brep.weld"), before: { root: breaks(s().root), A: breaks(A), B: breaks(B) } };
  out.n = e.repair("brep.weld"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? "";
  out.after = { root: breaks(s().root), A: breaks(A), B: breaks(B) };
  const pp = e.paramPanel(); out.fields = pp ? pp.fields.map((f) => f.key) : null;
  e.setParam("children", false); await sleep(30);
  out.hintOff = document.getElementById("hint")?.textContent ?? "";
  out.afterOff = { root: breaks(s().root), A: breaks(A), B: breaks(B) };
  return out;
});
console.log(JSON.stringify(res));
const ok = res.count === 3 && res.n === 3 && res.before.root === 1 && res.before.A === 1 && res.before.B === 1 && res.after.root === 0 && res.after.A === 0 && res.after.B === 0
  && /焊了 3 处断口（作用于：整个物件；含 2 个组件、共 3 份；锁着的 1 个跳过）/.test(res.hint) && res.fields?.[0] === "children"
  && /焊了 1 处断口（作用于：整个物件/.test(res.hintOff) && res.afterOff.root === 0 && res.afterOff.A === 1 && res.afterOff.B === 1 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
