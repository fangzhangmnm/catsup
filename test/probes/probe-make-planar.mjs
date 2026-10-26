// 拍平（纪元排期 T9 / DT7）界面：☰ 模型页「拍平几乎共面的面（N 组）」→ 并成一张面、提示行报数 → 马后炮三项（弯折小于 / 拍到 / 擦内线）→ 关擦内线 = 撤了按新值重做。
// 场景：2×1 平面在 0.5 高 + 旁边 1×1 微翘面（远端两点 0.51）。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const loop = (pts) => e.commitOp({ op: "addEdges", segs: pts.map((p, i) => [p, pts[(i + 1) % pts.length]]) });
  loop([P(0, 0, 0.5), P(2, 0, 0.5), P(2, 1, 0.5), P(0, 1, 0.5)]);
  loop([P(2, 0, 0.5), P(3, 0, 0.51), P(3, 1, 0.51), P(2, 1, 0.5)]);
  const out = { groups: e.planarGroupsInScope("context"), faces0: e.kernel.faces().length };
  e.makePlanar("context"); await sleep(30);
  out.faces1 = e.kernel.faces().length; out.flat = e.kernel.vertices().every((v) => Math.abs(v.z - 0.5) < 1e-9);
  out.hint = document.querySelector("#hint")?.textContent ?? "";
  const pp = e.paramPanel(); out.panel = pp ? { title: pp.title, fields: pp.fields.map((f) => f.key) } : null;
  e.setParam("eraseInner", false); await sleep(30);
  out.faces2 = e.kernel.faces().length; out.flat2 = e.kernel.vertices().every((v) => Math.abs(v.z - 0.5) < 1e-9);
  e.undo(); await sleep(30);
  out.undone = { faces: e.kernel.faces().length, lifted: e.kernel.vertices().some((v) => Math.abs(v.z - 0.51) < 1e-9) };
  return out;
});
console.log(JSON.stringify(res));
const ok = res.groups === 1 && res.faces0 === 2 && res.faces1 === 1 && res.flat && /拍平了 1 组/.test(res.hint) && res.panel?.title === "拍平"
  && ["deg", "target", "eraseInner"].every((k) => res.panel.fields.includes(k)) && res.faces2 === 2 && res.flat2 && res.undone.faces === 2 && res.undone.lifted && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
