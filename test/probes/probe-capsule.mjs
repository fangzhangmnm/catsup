// 错误胶囊 + 上一步（v0.13.1；user「错误之后的小胶囊好像没有给下载上一步的包和操作的选项」）：画一条线 → lastStep 有 op + brep；
// 人造一个脚本错误 → 胶囊带「上一步」「日志」钮；调试 sheet 的「上一步」钮可见。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(2000);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor;
  const out = { stepBefore: e.lastStep() };
  e.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] });
  const st = e.lastStep();
  out.step = st ? { op: st.op.op, verts: st.brep.vertices.length, pool: st.pool } : null;
  window.dispatchEvent(new ErrorEvent("error", { error: new Error("probe-made error") }));
  await new Promise((r) => setTimeout(r, 100));
  const toast = document.querySelector(".toast-error");
  out.toastText = toast?.querySelector(".toast-text")?.textContent?.slice(0, 60) ?? null;
  out.actions = [...(toast?.querySelectorAll(".toast-actions button") ?? [])].map((x) => x.textContent);
  return out;
});
await page.evaluate(() => { for (const x of document.querySelectorAll(".toast-actions button")) if (x.textContent === "日志") x.click(); });
await page.waitForTimeout(300);
const sheet = await page.evaluate(() => ({ open: !document.getElementById("debugLog").hidden, lastStepBtnVisible: !document.getElementById("debugLogLastStep").hidden, reproBtnHidden: document.getElementById("debugLogRepro").hidden }));
console.log(JSON.stringify({ ...res, sheet }));
const ok = res.stepBefore === null && res.step?.op === "addEdges" && res.step.verts === 0 && res.actions.includes("上一步") && res.actions.includes("日志") && sheet.open && sheet.lastStepBtnVisible;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close();
process.exit(ok ? 0 : 1);
