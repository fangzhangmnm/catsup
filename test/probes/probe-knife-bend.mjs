// probe-knife-bend.mjs —— 刀在面中间拐弯（笔的设计稿第七节第 4 步 / 第八节第 6 条验收里要真编辑器的几条）。created 2026-11-13 by Claude Opus 5.5
// 鼠标点（点一下 = 下点）：
//   ① 方块右侧面：从前竖边进、面里点两下拐弯、切到上边 = 一刀 = 一条指令 = 一步撤销，面 +1、自检干净；撤销一步回去。
//   ② 顶面上折线自己交叉 = 不切、提示行说「刀线自己交叉了」，一条指令都没有；Esc 放弃 = 什么都没发生。
//   ③ 拐了一个弯之后点到另一张面上 = 不下点、说原因。
//   ④ 画过的方块（开始画、一张面一块）：右侧面拐弯切一刀 → 两张新面每个角的贴图坐标 = 原面那张平面映射在那一点的值（画都在原位），空出来的地方一个框都不多。
//   ⑤ 强行对称开着（X 轴）：右侧面拐弯切一刀 → 左侧面也切出对称的一刀，所有点都有镜像的孪生点。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-knife-bend.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
/** 新开一页：一个方块（x 从 x0 到 x0 + 1，y / z 0–1）变成网格体组件、进去、拿起刀。setup / body 在页面里跑，从 globalThis.__kbEnv 拿工具（setup 在拿刀之前：开始画 / 开镜像）。 */
async function run(x0, setup, body) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1000);
  await page.evaluate(async (x0) => {
    const C = globalThis.__catsup, e = C.editor, hud = C.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
    const fire = (type, q, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + q.x, clientY: r.top + q.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
    const tap = async (p) => { const q = px(p); fire("pointermove", { x: q.x + 2, y: q.y + 2 }, 0); await sleep(10); fire("pointermove", q, 0); await sleep(15); fire("pointerdown", q, 1); await sleep(10); fire("pointerup", q, 0); await sleep(30); };
    const esc = async () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(30); };
    const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = [];
    for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    e.setGrid({ ...e.grid, on: false });
    e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
    const S = () => e.scene, inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
    e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw();
    e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
    globalThis.__kbEnv = { C, e, hud, P, sleep, tap, esc, m, def, S };
  }, x0);
  await page.evaluate(setup);   // 拿刀之前（开始画 / 开镜像）：函数直接递进页面（页面的 CSP 不许 eval 字符串）
  await page.evaluate(async () => { globalThis.__kbEnv.e.setTool("knife"); await new Promise((r) => setTimeout(r, 20)); });
  const out = await page.evaluate(body);
  await page.close();
  return out;
}
const res = {};
// ①②③ 白方块
res.plain = await run(0, async () => {}, async () => { const { e, hud, P, tap, esc, m } = globalThis.__kbEnv;
  const out = {}, f0 = m().faceCount(), pos0 = e.history.position();
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6));
  out.pending = { steps: e.history.position() - pos0, bend: e.handlers.knife.describe().meshKnife.bend, hint: hud.status() };
  await tap(P(1, 0.75, 1));
  out.cut = { df: m().faceCount() - f0, steps: e.history.position() - pos0, check: m().check().join(";"), hint: hud.status(), active: e.isGestureActive() };
  await esc(); e.undo(); await new Promise((r) => setTimeout(r, 30));
  out.undo = { df: m().faceCount() - f0 };
  e.redo(); await new Promise((r) => setTimeout(r, 30));
  // ② 顶面：折线自己交叉
  const f1 = m().faceCount(), pos1 = e.history.position();
  for (const q of [P(0.5, 0, 1), P(0.2, 0.7, 1), P(0.8, 0.7, 1), P(0.2, 0.3, 1), P(0.8, 0.3, 1), P(0.5, 1, 1)]) await tap(q);
  out.cross = { df: m().faceCount() - f1, steps: e.history.position() - pos1, hint: hud.status() };
  await esc(); out.crossEsc = { df: m().faceCount() - f1, steps: e.history.position() - pos1 };
  // ③ 顶面拐了一个弯，再点右侧面上的一点
  await tap(P(0.3, 0, 1)); await tap(P(0.3, 0.5, 1)); await tap(P(1, 0.3, 0.2));
  out.other = { bend: e.handlers.knife.describe().meshKnife.bend, hint: hud.status(), steps: e.history.position() - pos1 };
  await esc();
  return out;
});
// ④ 画过的方块
res.paint = await run(0, async () => { const { e, def, m } = globalThis.__kbEnv;
  const G = crypto.randomUUID(), g = () => crypto.randomUUID();
  e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: G, textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 16 });
  globalThis.__kb = { G };
}, async () => { const { C, P, tap, esc, m, def, S } = globalThis.__kbEnv;
  const G = globalThis.__kb.G, mx = Math.max(...m().verts().map((v) => m().pt(v).x)), right = m().faces().find((f) => m().facePts(f).every((p) => Math.abs(p.x - mx) < 1e-9));   // 右侧面（组件的定义坐标：原点在底面中心）
  /** 右侧面上 (y, z) → 贴图坐标：用原面三个角定一个平面映射（方的面 = 仿射），第四个角拿来核。 */
  const ps = m().facePts(right), uv = C.paint.uv.at(def, right, G), at = (i) => [uv[2 * i], uv[2 * i + 1]];
  const [A, Bp, Cp] = [0, 1, 2].map((i) => ({ y: ps[i].y, z: ps[i].z, uv: at(i) }));
  const det = (Bp.y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (Bp.z - A.z);
  const map = (y, z) => { const s = ((y - A.y) * (Cp.z - A.z) - (Cp.y - A.y) * (z - A.z)) / det, t = ((Bp.y - A.y) * (z - A.z) - (y - A.y) * (Bp.z - A.z)) / det; return [0, 1].map((k) => A.uv[k] + (Bp.uv[k] - A.uv[k]) * s + (Cp.uv[k] - A.uv[k]) * t); };
  const fourthOk = Math.hypot(map(ps[3].y, ps[3].z)[0] - at(3)[0], map(ps[3].y, ps[3].z)[1] - at(3)[1]) < 1e-9;
  const freed0 = [...(S().uvSets.get(G)?.freed ?? [])].join(), before = new Set(m().faces());
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6)); await tap(P(1, 0.75, 1)); await esc();
  const fresh = m().faces().filter((f) => !before.has(f)), two = [right, ...fresh];
  let worst = 0;
  for (const f of two) { const q = m().facePts(f), u = C.paint.uv.at(def, f, G); if (!u) { worst = Infinity; continue; } q.forEach((p, i) => { const w = map(p.y, p.z); worst = Math.max(worst, Math.hypot(w[0] - u[2 * i], w[1] - u[2 * i + 1])); }); }
  const uvMax = Math.max(...two.flatMap((f) => [...(C.paint.uv.at(def, f, G) ?? [])].map(Math.abs))), uvArr = C.paint.uv.at(def, right, G)?.constructor?.name;
  return { fourthOk, newFaces: fresh.length, worstUvOff: worst, uvMax, uvArr, freedSame: [...(S().uvSets.get(G)?.freed ?? [])].join() === freed0, check: m().check().join(";") };
});
// ⑤ 强行对称（组件的定义坐标原点在底面中心 = 方块本来就跨着 X 镜像面）
res.mirror = await run(0, async () => { globalThis.__kbEnv.e.setMirror("force", 0); }, async () => { const { P, tap, esc, m } = globalThis.__kbEnv;
  const f0 = m().faceCount();
  await tap(P(1, 0, 0.5)); await tap(P(1, 0.4, 0.3)); await tap(P(1, 0.6, 0.6)); await tap(P(1, 0.75, 1)); await esc();
  const vs = m().verts().map((v) => m().pt(v)), has = (q) => vs.some((p) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-6);
  return { df: m().faceCount() - f0, twins: vs.every((p) => has({ x: -p.x, y: p.y, z: p.z })), check: m().check().join(";") };
});
await browser.close();
res.errs = errs;
const checks = {
  "① 拐弯途中不提交（只是预演）、记着两个拐点": res.plain.pending.steps === 0 && res.plain.pending.bend?.n === 2,
  "① 切到边 = 一条指令一步撤销、面 +1、自检干净": res.plain.cut.df === 1 && res.plain.cut.steps === 1 && res.plain.cut.check === "" && res.plain.cut.active,
  "① 撤销一步回去": res.plain.undo.df === 0,
  "② 折线自己交叉 = 不切、说原因": res.plain.cross.df === 0 && res.plain.cross.steps === 0 && /刀线自己交叉了/.test(res.plain.cross.hint),
  "② Esc 放弃 = 什么都没发生": res.plain.crossEsc.df === 0 && res.plain.crossEsc.steps === 0,
  "③ 拐弯后点到另一张面 = 不下点、说原因": res.plain.other.bend?.n === 1 && /另一张面/.test(res.plain.other.hint) && res.plain.other.steps === 0,
  "④ 原面的映射是平面映射（第四个角对得上）": res.paint.fourthOk,
  "④ 切出两张面、每个角的贴图坐标 = 原面映射在那一点（画都在原位；贴图坐标存在 1/1024 格的网格上 = 施工单十八第四节，差不超过一格）": res.paint.newFaces === 1 && res.paint.worstUvOff <= 1 / 1024,
  "④ 空出来的地方一个框都不多": res.paint.freedSame,
  "④ 自检干净": res.paint.check === "",
  "⑤ 强行对称：两边都切了（跨镜像面的四张面也被劈开，强行对称本来的做法）、每个点都有镜像孪生": res.mirror.df >= 2 && res.mirror.twins && res.mirror.check === "",
  "⑥ 没有页面错误": errs.length === 0,
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, res }, null, 1));
console.log(ok ? "probe-knife-bend OK" : "probe-knife-bend FAIL");
process.exit(ok ? 0 : 1);
