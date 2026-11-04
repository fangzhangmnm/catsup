// 锁着的上下文里开镜像会话（计划书 §14，created 2026-11-04 by Claude Opus 5.5）。编辑器要真 canvas，node 单测造不出来，所以放探针。
// 以前：预演不画也没字，人调半天按「应用」才知道被锁了。现在：开会话这一下就用提交同一把尺查，直接说「已锁定」、不开。
// Ⓐ 站在组件里、这份组件被锁上：beginMirror 返回 false、不进会话、没有参数面板、提示行说已锁定
// Ⓑ 被拒不动任何东西：撤销栈不长、模型不变
// Ⓒ 解锁后同一个选区能开（证明Ⓐ不是因为什么都开不了），取消后回到没开的样子
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mirror-locked.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hint = () => document.getElementById("hint")?.textContent ?? "";
  const root = { def: e.scene.root, group: null };
  const B = [P(0, 0), P(2, 0), P(2, 2), P(0, 2)];
  e.commitOp({ op: "addEdges", at: root, segs: B.map((p, i) => [p, B[(i + 1) % 4]]) }); await sleep(20);
  e.selectAll(); e.makeComponent("件"); await sleep(20);
  const inst = [...e.scene.def(e.scene.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.commitOp({ op: "setLocked", at: root, instance: inst.id, on: true }); await sleep(20);
  e.selectAll(); await sleep(10);
  const sel = e.selection.faces.size + e.selection.edges.size, n0 = e.opCount, faces0 = e.kernel.faces().length;
  const ret = e.beginMirror(); await sleep(20);
  const locked = { sel, ret, active: e.mirrorActive(), panel: !!e.paramPanel(), hint: hint(), ops: e.opCount - n0, faces: e.kernel.faces().length - faces0 };
  e.commitOp({ op: "setLocked", at: root, instance: inst.id, on: false }); await sleep(20);
  e.selectAll(); await sleep(10);
  const ret2 = e.beginMirror(); await sleep(20);
  const open = { ret: ret2, active: e.mirrorActive(), panel: !!e.paramPanel() };
  e.pressParam("cancel"); await sleep(20);
  return { locked, open, closed: !e.mirrorActive() };
});
await b.close();
console.log(JSON.stringify(res));
const fails = [], need = (c, m) => { if (!c) fails.push(m); };
need(res.locked.sel > 0, "前提：选区是空的，这条没测到东西");
need(res.locked.ret === false, "Ⓐ 锁着 beginMirror 没返回 false");
need(!res.locked.active, "Ⓐ 锁着还是进了镜像会话");
need(!res.locked.panel, "Ⓐ 锁着还是开了参数面板");
need(/已锁定/.test(res.locked.hint), `Ⓐ 提示行没说已锁定：${res.locked.hint}`);
need(res.locked.ops === 0 && res.locked.faces === 0, "Ⓑ 被拒还动了东西");
need(res.open.ret === true && res.open.active && res.open.panel, "Ⓒ 解锁后同一个选区开不了");
need(res.closed, "Ⓒ 取消后还在镜像会话里");
need(errs.length === 0, `页面错误：${errs.join(" | ")}`);
console.log(fails.length ? `probe-mirror-locked FAIL\n- ${fails.join("\n- ")}` : "probe-mirror-locked OK");
process.exit(fails.length ? 1 : 0);
