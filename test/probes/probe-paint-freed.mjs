// probe-paint-freed.mjs —— 空出来的地方跟着撤销 / 重做走，真的编辑器一步（施工单十八第 2 刀统筹放行前补的 A）。created 2026-11-13 by Claude Opus 5.5
// 一步里两条指令（编辑器自己的 step / commitIn，和按键、菜单走的是同一个口；对外没有「一步里提交两条」的公开接口，探针直接调这两个内部方法）：
//   ① 溶解两张画过的面之间的边 → 并出来的那张两边位置对不上 → 收尾拿掉位置、补面之前先记一次空位（中途那次 setFreed）→ 重新找地方；
//   ② 删掉另一张画过的面 → 整步最后再记一次（setFreed）。
// 查：这一步里有两条 setFreed；撤销一次 → 那一行的 freed 和每张面的位置逐个回到这一步之前；重做 → 和做完时逐个一样；
//     再撤销、做一步别的（删一张画过的面）→ freed 只多了那张面的旧框（基线是那一步开始时的，不乱）；没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-paint-freed.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = () => e.sceneRef, def = [...S().def(S().root).instances.values()][0].def, G = crypto.randomUUID(), g = () => crypto.randomUUID(), k = () => S().mesh(def).kernel;
  e.commitOp({ op: "startPaint", def, faces: k().faces(), uvSet: G, textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 16 });
  /** 一张面占的格（layout.ts cellRect 同一个算法：floor 最小、ceil 最大、至少一格）。 */
  const boxOf = (f) => { const v = C.paint.uv.at(def, f, G); if (!v) return null; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i + 1 < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); } const a = Math.floor(x0), b = Math.floor(y0); return [a, b, Math.max(a + 1, Math.ceil(x1)), Math.max(b + 1, Math.ceil(y1))]; };
  const freed = () => [...(S().uvSets.get(G)?.freed ?? [])];
  const snap = () => JSON.stringify({ freed: freed(), faces: k().faces().map((f) => [f, C.paint.uv.at(def, f, G)]) });
  // ① 一步两条：溶解一条边（中途记一次）+ 删掉另一张（最后再记一次）
  const kk = k(), edge = kk.edges().find((x) => kk.eFaces(x).length === 2), [fa, fb] = kk.eFaces(edge), other = kk.faces().find((f) => f !== fa && f !== fb);
  const before = snap(), n0 = e.history.log().length;
  e.step((pass) => { e.commitIn(pass, { op: "meshDelete", def, edges: [edge], dissolve: true }); e.commitIn(pass, { op: "meshDelete", def, faces: [other] }); });
  out.stepOps = e.history.log().slice(n0).map((o) => o.op);
  const after = snap();
  out.afterFreed = freed().length / 4;
  e.undo(); out.undoBack = snap() === before;
  e.redo(); out.redoSame = snap() === after;
  // ③ 再撤销、做一步别的：删一张画过的面
  e.undo(); out.undoAgain = snap() === before;
  const f3 = k().faces().find((f) => f !== fa && f !== fb && f !== other) ?? k().faces()[0], b3 = boxOf(f3), wasFreed = freed();
  e.commitOp({ op: "meshDelete", def, faces: [f3] });
  const now = freed(), rs = []; for (let i = 0; i < now.length; i += 4) rs.push(now.slice(i, i + 4));
  const within = (r, o) => o[0] <= r[0] && o[1] <= r[1] && o[2] >= r[2] && o[3] >= r[3];
  const olds = []; for (let i = 0; i < wasFreed.length; i += 4) olds.push(wasFreed.slice(i, i + 4));
  out.third = { box: b3, freed: rs, covers: rs.some((r) => within(b3, r)), onlyThat: rs.every((r) => within(r, b3) || olds.some((o) => within(r, o))) };
  return out;
});
await browser.close();
res.errs = errs;
const checks = {
  "① 这一步里记了两次空位（中途 + 最后）": res.stepOps.filter((o) => o === "setFreed").length === 2,
  "① 这一步里补过位置": res.stepOps.includes("meshLayoutPaint"),
  "① 做完 freed 不是空的": res.afterFreed > 0,
  "② 撤销：freed 和每张面的位置回到这一步之前": res.undoBack,
  "② 重做：和做完时逐个一样": res.redoSame,
  "③ 再撤销回到之前": res.undoAgain,
  "③ 做一步别的：删掉那张的旧框记了": res.third.covers,
  "③ 做一步别的：没多出别的框（基线不乱）": res.third.onlyThat,
  "④ 没有页面错误": errs.length === 0,
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, res }, null, 1));
console.log(ok ? "probe-paint-freed OK" : "probe-paint-freed FAIL");
process.exit(ok ? 0 : 1);
