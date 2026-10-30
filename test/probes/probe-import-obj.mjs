// OBJ 导入 = 网格体（2026-10-29 Claude Opus 5.5；user 10-29「导入的glb obj当然应该是mesh，以后想导入skp的才是brep」，账本 T121）：
// ☰「导入 OBJ…」的文件框喂一个现造的 OBJ（立方体：8 点 6 个四边形、每角法线朝外 = 平滑）→ 一个组件、网格体、6 个四边形、默认平滑 = 平滑；导入参数小窗在；一步撤销。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const C = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const Q = [[1, 4, 3, 2], [5, 6, 7, 8], [1, 2, 6, 5], [2, 3, 7, 6], [3, 4, 8, 7], [4, 1, 5, 8]];
const obj = ["# cube", "o cube", ...C.map(([x, y, z]) => `v ${x} ${z} ${-y}`), ...C.map(([x, y, z]) => { const l = Math.hypot(x - 0.5, y - 0.5, z - 0.5); return `vn ${(x - 0.5) / l} ${(z - 0.5) / l} ${-(y - 0.5) / l}`; }), "s 1", ...Q.map((q) => `f ${q.map((i) => `${i}//${i}`).join(" ")}`)].join("\n");
await page.setInputFiles("#objFile", { name: "cube.obj", mimeType: "text/plain", buffer: Buffer.from(obj) });
await page.waitForFunction(() => (document.getElementById("noticeStack")?.textContent ?? "").includes("导入 cube.obj"), null, { timeout: 10000 }).catch(() => {});
const r = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, s = e.scene;
  const notice = [...document.querySelectorAll("#noticeStack *")].map((x) => x.textContent).find((t) => t.includes("导入 cube.obj")) ?? "";
  const d = [...s.defs.values()].find((x) => x.body.kind === "mesh"), m = d?.body.kernel;
  const top = [...s.def(s.root).instances.values()].map((i) => i.name);
  const panel = document.querySelector("#paramPanel, .param-panel")?.textContent ?? "";
  const out = { notice, top, faces: m?.faceCount(), quads: m ? m.faces().filter((f) => m.faceLen[f] === 4).length : 0, smooth: m?.smoothDefault.mode, panelUp: /朝上/.test(document.body.textContent ?? "") };
  return out;
});
// 撤销 = 装回一份新的场景对象：撤完重新取 e.scene（别拿撤之前存的那份）
const u = await page.evaluate(async () => { const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((res) => setTimeout(res, ms)); e.undo(); await sleep(60); return { a: e.scene.def(e.scene.root).instances.size, hint: document.querySelector("#hint")?.textContent ?? "" }; });
r.afterUndo = u.a; r.undoHint = u.hint;
console.log(JSON.stringify(r));
const ok = /1 个组件/.test(r.notice) && /6 个面/.test(r.notice) && r.top.join() === "cube" && r.faces === 6 && r.quads === 6 && r.smooth === "smooth" && r.panelUp && r.afterUndo === 0 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
