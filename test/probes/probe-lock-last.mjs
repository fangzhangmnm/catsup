// 锁是最后一道（统筹 11-13，锁的一轮第三步；created 2026-11-13 by Claude Opus 5.5）：每把吃锁的工具（按 ToolHandler.lock 字段现列，不手写名单）锁着往各个方向拖，结果都在锁的线 / 面上。
// 起因：v0.19.111 之前移动工具先套锁、后过意图门，锁着 X 往垂直方向拖会沿 Z 走（施工单第五节「第三步开工前的只读核对」第 2 条）。
// 硬表面：吃 axis 的 = 锁 X（按钮那条路 setAxisLock），按下以后往屏幕上六个方向拖，光标落点（editor.cursor3）离过锚点的 X 线 < 1e-6；
//         吃 plane 的 = 锁 XY 面（setPlaneLock z），落点和锚点同高（不写光标落点的工具 = 它正在用的面法向是 Z）。整格开 / 关各跑一遍。
// 自由建模：吃锁的工具锁 X，按在顶面上往四个方向拖、落定：旋转 = 每个点的 x 不变（绕 X 转）；别的 = 每个点的 (y, z) 在原来那些点的 (y, z) 里（只沿 X 走）。
// 反方向（统筹 11-13：吃不吃约束只问 ToolHandler.lock）：没声明 lock 的工具手势里按 X = 不记（不限制）、不画锁线、提示「这把工具不吃轴键」——硬表面推拉、自由建模插入各一格（先确认它们真没声明 lock）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-lock-last.mjs [地址]
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
  const kd = (k, o = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: o.code ?? (k.length === 1 ? "Key" + k.toUpperCase() : k), ctrlKey: !!o.ctrl, shiftKey: !!o.shift, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const DIRS = [0, 60, 120, 180, 240, 300].map((deg) => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) }));
  const out = { hard: [], free: [], hardTools: [], freeTools: [] };
  // ---------------- 硬表面
  box(0, 0, 0, 1, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.8; e.draw(); await sleep(20);
  const hardTools = e.mode.tools.filter((t) => e.handlers[t]?.lock);
  out.hardTools = hardTools.map((t) => `${t}:${e.handlers[t].lock}`);
  for (const grid of [false, true]) for (const t of hardTools) {
    const style = e.handlers[t].lock, start = t === "move" ? P(1, 1, 1) : P(2.2, 1.7, 0);
    for (const d of DIRS) {
      e.setTool(t); e.setGrid({ ...e.grid, on: grid }); e.deselectAll?.(); if (t === "rotate") e.selectAll();   // 旋转要有东西可转才起手（第一下 = 转轴中心）
      if (style === "axis") e.setAxisLock("x"); else e.setPlaneLock("z");
      const s0 = px(start);
      fire("pointermove", s0.x, s0.y, 0); await sleep(15); fire("pointerdown", s0.x, s0.y, 1); await sleep(15);
      for (let i = 1; i <= 8; i++) { fire("pointermove", s0.x + d.x * 70 * i / 8, s0.y + d.y * 70 * i / 8, 1); await sleep(12); }
      const a = e.anchor3, cur = e.cursor3;
      const pn = e.handlers[t].plane?.plane?.n ?? null;   // 先定平面的工具不一定写通用的光标落点（旋转 = 转的那个面）：那就看它正在用的面
      const ok = !!a && (style === "axis" ? !!cur && Math.abs(cur.y - a.y) < 1e-6 && Math.abs(cur.z - a.z) < 1e-6 : cur ? Math.abs(cur.z - a.z) < 1e-6 : !!pn && Math.abs(Math.abs(pn.z) - 1) < 1e-9);
      out.hard.push({ t, style, grid, deg: Math.round((Math.atan2(d.y, d.x) * 180) / Math.PI), ok, a: a && [a.x, a.y, a.z].map((v) => +v.toFixed(4)), cur: cur && [cur.x, cur.y, cur.z].map((v) => +v.toFixed(4)), pn: pn && [pn.x, pn.y, pn.z].map((v) => +v.toFixed(4)), kind: e.snapInfo?.kind ?? null });
      kd("Escape", { code: "Escape" }); await sleep(15); fire("pointerup", s0.x + d.x * 70, s0.y + d.y * 70, 0); await sleep(20);
      e.cancel?.(); e.setAxisLock(null); await sleep(10);
    }
  }
  const hint = () => document.getElementById("hint")?.textContent ?? "";
  const notEat = async (label) => { kd("x"); await sleep(30); const k = e.axisConstraintNow(); return { label, tool: e.tool, lock: e.handlers[e.tool]?.lock ?? null, gesture: e.isGestureActive(), kind: k.kind, guide: e.lockGuide() === null, hint: hint() }; };
  {   // 反方向：硬表面推拉（按在顶面上往上拖一点，手势里按 X）
    e.setTool("pp"); e.setGrid({ ...e.grid, on: false }); const q = px(P(0.5, 0.5, 1));
    fire("pointermove", q.x, q.y, 0); await sleep(15); fire("pointerdown", q.x, q.y, 1); await sleep(15); for (let i = 1; i <= 5; i++) { fire("pointermove", q.x, q.y - 6 * i, 1); await sleep(12); }
    out.notEat = [await notEat("硬表面推拉")];
    kd("Escape", { code: "Escape" }); await sleep(20); fire("pointerup", q.x, q.y - 30, 0); await sleep(20); e.cancel?.();
  }
  // ---------------- 自由建模（网格体方块）
  e.setGrid({ ...e.grid, on: false });
  const S = () => e.scene, root = () => S().def(S().root);
  e.setTool("select"); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  out.freeMode = e.modeId;
  const freeTools = e.mode.tools.filter((t) => e.handlers[t]?.lock);
  out.freeTools = freeTools.map((t) => `${t}:${e.handlers[t].lock}`);
  const pts = () => m().verts().map((v) => { const p = m().pt(v); return [v, p.x, p.y, p.z]; });
  for (const t of freeTools) for (const d of DIRS.filter((_, i) => i % 2 === 0)) {
    e.setTool(t); e.selectAll(); await sleep(10); e.setAxisLock("x");
    const before = pts(), yz = new Set(before.map(([, , y, z]) => `${y.toFixed(6)},${z.toFixed(6)}`)), xs = new Set(before.map(([, x]) => x.toFixed(6))), pos0 = e.history.position();
    const s0 = px(P(0.5, 0.5, 1));
    fire("pointermove", s0.x, s0.y, 0); await sleep(15); fire("pointerdown", s0.x, s0.y, 1); await sleep(15);
    for (let i = 1; i <= 8; i++) { fire("pointermove", s0.x + d.x * 60 * i / 8, s0.y + d.y * 60 * i / 8, 1); await sleep(12); }
    fire("pointerup", s0.x + d.x * 60, s0.y + d.y * 60, 0); await sleep(40);
    const after = pts(), committed = e.history.position() - pos0;
    const moved = after.filter(([v, x, y, z]) => { const o = before.find((q) => q[0] === v); return !o || Math.abs(o[1] - x) + Math.abs(o[2] - y) + Math.abs(o[3] - z) > 1e-6; }).length;
    const ok = t === "rotate" ? after.every(([, x]) => xs.has(x.toFixed(6))) : after.every(([, , y, z]) => yz.has(`${y.toFixed(6)},${z.toFixed(6)}`));
    out.free.push({ t, deg: Math.round((Math.atan2(d.y, d.x) * 180) / Math.PI), committed, moved, ok });
    if (committed > 0) { kd("z", { ctrl: true }); await sleep(40); }
    e.setAxisLock(null);
  }
  {   // 反方向：自由建模插入（选顶面、光标放在上面按 I 起手，手势里按 X）
    e.setTool("select"); e.deselectAll(); await sleep(300); const q = px(P(0.5, 0.5, 1)); fire("pointermove", q.x, q.y, 0); await sleep(15); fire("pointerdown", q.x, q.y, 1); await sleep(10); fire("pointerup", q.x, q.y, 0); await sleep(40);
    fire("pointermove", q.x + 3, q.y + 3, 0); await sleep(20); kd("i"); await sleep(30);
    out.notEat.push(await notEat("自由建模插入"));
    kd("Escape", { code: "Escape" }); await sleep(30);
  }
  return out;
});
const hardBad = res.hard.filter((x) => !x.ok), freeBad = res.free.filter((x) => !x.ok), freeIdle = res.free.filter((x) => x.committed > 0 && x.moved === 0);
const checks = [
  ["硬表面吃锁的工具从工具表里列出来了（不止一把）", res.hardTools.length >= 5],
  [`硬表面：锁着往六个方向拖、整格开关各一遍，落点都在锁的线 / 面上（${res.hard.length} 次）`, hardBad.length === 0],
  ["自由建模吃锁的工具从工具表里列出来了（沿法线不在里面：它不吃锁）", res.freeTools.length >= 3 && !res.freeTools.some((x) => x.startsWith("shrink"))],
  [`自由建模：锁 X 往四个方向拖、落定，结果都没离开 X（旋转 = 绕 X）（${res.free.length} 次）`, freeBad.length === 0],
  ["自由建模：落定了的都真动了（不是什么都没做的假绿）", freeIdle.length === 0 && res.free.some((x) => x.moved > 0)],
  ["反方向：硬表面推拉、自由建模插入都没声明 lock，手势里按 X = 不记、不画锁线、提示「这把工具不吃轴键」", res.notEat.length === 2 && res.notEat.every((x) => x.lock === null && x.gesture && x.kind === "free" && x.guide && x.hint.includes("不吃轴键"))],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
console.log(`硬表面工具：${res.hardTools.join(" ")}；自由建模工具：${res.freeTools.join(" ")}`);
if (hardBad.length) console.log("硬表面离开锁的：", JSON.stringify(hardBad.slice(0, 12)));
if (freeBad.length || freeIdle.length) console.log("自由建模：", JSON.stringify([...freeBad, ...freeIdle].slice(0, 12)));
if (!(res.notEat.length === 2 && res.notEat.every((x) => x.lock === null && x.gesture && x.kind === "free" && x.guide && x.hint.includes("不吃轴键")))) console.log("反方向：", JSON.stringify(res.notEat));
if (errs.length) console.log(errs.join("\n"));
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
await b.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
