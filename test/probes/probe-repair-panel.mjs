// 修复面板（纪元排期 T6 / 账本 DT6 + DT9「检查」；v0.14.63 起拍平也管软边 → 微折软边应用后清零；v0.14.64 第五步恢复层级，默认不勾；v0.14.66 第一步拉正、默认勾——挪歪 1 mm 的角先被拉正挪回，吸格点就没事做了）：
// 右边「修复」机器钮 → 修复面板窗（第一行「修复：最外层」；「修复面板…」+ 九条修复；2026-10-28 Claude Fable 5.1：修复 = 车间里的一台机器，自己一窗，不进物体属性）→ 右下角马前炮（含子物体 / 检查 / 四步）→ 说明行计数 →「检查」把微折软边画成橙色 →
// 勾上吸到格点、应用 = 按固定顺序跑完 = 一步撤销 → 马后炮。场景：根上 ① 一个盒子，一个角被挪了 1 mm（折出硬折缝）② 一条断口 ③ 一张面被软折了一点点（微折软边）。
// created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = (x, y, z = 0) => ({ x, y, z });
  const rect = (x, y, w, h) => [[P(x, y), P(x + w, y)], [P(x + w, y), P(x + w, y + h)], [P(x + w, y + h), P(x, y + h)], [P(x, y + h), P(x, y)]];
  e.setGrid({ on: false });
  e.commitOp({ op: "addEdges", at, segs: rect(0, 0, 1, 1) });
  e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.commitOp({ op: "move", at, moves: [{ from: P(1, 1, 1), to: P(1.001, 1, 1.001) }] });                       // ① 硬折缝
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 3), P(1, 3)], [P(1, 3), P(2, 3)]] });                           // ② 断口 (1, 3)
  e.commitOp({ op: "addEdges", at, segs: rect(3, 0, 2, 2) });
  e.commitOp({ op: "move", at, moves: [{ from: P(5, 2), to: P(5, 2, 0.01) }], creaseLayers: ["soft", "smooth"] });   // ③ 软折了一点点（≈ 0.4°）
  e.deselectAll();
  e.cam.setView("iso"); e.zoomExtents?.(); e.draw(); await sleep(50);
  const out = { worth: e.repairWorth() };
  const orange = () => { e.draw(); const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl"); const px = new Uint8Array(c.width * c.height * 4); gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px); let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 190 && px[i + 1] > 90 && px[i + 1] < 150 && px[i + 2] < 60) n++; return n; };
  out.orangeBefore = orange();
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)"), click = (el) => el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  click(document.querySelector('.gizmo-machine[data-machine="repairWindow"]')); await sleep(60);
  out.window = { who: menu()?.querySelector(".menu-note")?.textContent ?? "", rows: [...(menu()?.querySelectorAll("[data-menu-id]") ?? [])].map((x) => x.dataset.menuId) };
  click(menu()?.querySelector('[data-menu-id="repairPanel"]')); await sleep(60);
  const pp = () => e.paramPanel();
  out.open = e.repairPanelOpen();
  out.fields = pp()?.fields.map((f) => f.key);
  out.note = pp()?.note ?? "";
  out.orangeOn = orange();
  e.setParam("inspect", false); out.orangeOff = orange(); e.setParam("inspect", true);
  e.setParam("snap", true);
  const n0 = e.history?.position?.() ?? null;
  e.pressParam("apply"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? "";
  out.after = pp() ? { phase: pp().phase, title: pp().title, note: pp().note ?? "" } : null;
  const k = e.kernel;
  out.cornerBack = (() => { const v = k.vertices().find((x) => Math.abs(x.x - 1) < 0.01 && Math.abs(x.y - 1) < 0.01 && Math.abs(x.z - 1) < 0.01); return !!v && Math.abs(v.x - 1) < 1e-9 && Math.abs(v.z - 1) < 1e-9; })();
  out.breaks = k.vertices().filter((v) => v.edges.size === 2 && k.isBreakJunction(v.id)).length;
  e.undo(); await sleep(30);
  out.undoBreaks = e.kernel.vertices().filter((v) => v.edges.size === 2 && e.kernel.isBreakJunction(v.id)).length;
  out.undoCorner = e.kernel.vertices().some((x) => Math.abs(x.x - 1.001) < 1e-9);
  return out;
});
console.log(JSON.stringify(res));
const ok = res.worth && res.orangeBefore === 0 && /修复：最外层/.test(res.window.who) && res.window.rows.includes("repairPanel") && res.window.rows.includes("action:brep.weld") && res.open && JSON.stringify(res.fields) === JSON.stringify(["children", "inspect", "brep.straighten", "brep.snap", "brep.cleanup", "brep.weld", "brep.planar", "brep.harden", "brep.fillHoles", "brep.resegment", "brep.hierarchy"])
  && /焊接断口 1/.test(res.note) && /微折软边/.test(res.note) && res.orangeOn > 20 && res.orangeOff === 0
  && /修复：/.test(res.hint) && /拉正了 \d+ 个点|吸了 \d+ 个点到格点/.test(res.hint) && /焊了 1 处断口/.test(res.hint)
  && res.after?.phase === "after" && res.after.title === "修复" && /没有剩下的微折软边/.test(res.after.note ?? "") && res.cornerBack && res.breaks === 0 && res.undoBreaks === 1 && res.undoCorner && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
