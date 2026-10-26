// 圆 / 弧段数马后炮（纪元账本 DT95）界面：地上拖一个圆 → 右下角小窗「刚才：圆」+ 说明行（弦高 + 半径 + 对上的档）→ 档位选 lowpoly =
// 撤掉重画成 8 段、工具选项记住 8、说明行跟着变；再手改段数 17 = 档位显示「自定」；撤销一次 = 圆没了（马后炮的重做不多占一步）。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 744, height: 1133 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, c = document.getElementById("board"), r = c.getBoundingClientRect(), sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  e.setGrid({ on: false });
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, ...extra }));
  const drag = async (a, z, steps = 4) => { fire("pointerdown", a.x, a.y, { buttons: 1 }); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, { buttons: 1 }); await sleep(16); } fire("pointerup", z.x, z.y, { buttons: 0 }); await sleep(60); };
  const o = {};
  e.cam.setView("top"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 2; e.draw();
  e.setTool("circle");
  await drag(px({ x: 0, y: 0, z: 0 }), px({ x: 0.5, y: 0, z: 0 }));
  const pp = () => e.paramPanel();
  o.title = pp()?.title; o.note0 = pp()?.note ?? ""; o.tier0 = pp()?.values.tier; o.seg0 = pp()?.values.segments;
  o.curve0 = e.kernel.curve.size;
  await sleep(50); o.domNote = document.querySelector(".vcb-params-note")?.textContent ?? "";
  e.setParam("tier", "lowpoly"); await sleep(50);
  o.curve1 = e.kernel.curve.size; o.seg1 = pp()?.values.segments; o.tier1 = pp()?.values.tier; o.note1 = pp()?.note ?? "";
  o.remembered = e.config.get("circle", "segments");
  e.setParam("segments", 17); await sleep(50);
  o.curve2 = e.kernel.curve.size; o.tier2 = pp()?.values.tier;
  e.undo(); await sleep(50);
  o.facesAfterUndo = e.kernel.faces().length; o.curveAfterUndo = e.kernel.curve.size;
  e.config.set("circle", "segments", 24);
  return o;
});
console.log(JSON.stringify(out, null, 1));
const ok = out.title === "圆" && /^弦高 .+（半径 /.test(out.note0) && out.note0.includes("SketchUp 默认") && out.domNote === out.note0 && out.tier0 === "sketchup" && out.seg0 === 24 && out.curve0 === 24
  && out.curve1 === 8 && out.seg1 === 8 && out.tier1 === "lowpoly" && out.note1.includes("lowpoly") && out.remembered === 8
  && out.curve2 === 17 && out.tier2 === "custom" && out.facesAfterUndo === 0 && out.curveAfterUndo === 0 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
