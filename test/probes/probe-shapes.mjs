// 形状批（v0.13.17）：形状格小三角含旋转矩形；旋转矩形三下（第三下 89° → 90° 强吸）→ 4 边 1 面；矩形从中心（选项）→ 以首点为中心；
// 弧画法 = 扇形：三下 → 1 面 + 1 条弧曲线 + 2 条半径，一次撤销；圆心弧 Shift 15° 咬合。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const click = async (p) => { await page.mouse.move(box.x + p.x, box.y + p.y, { steps: 4 }); await page.waitForTimeout(40); await page.mouse.down(); await page.waitForTimeout(30); await page.mouse.up(); await page.waitForTimeout(120); };
const px = async (pts) => page.evaluate((pts) => { const e = globalThis.__catsup.editor, vp = e.vp(); return pts.map((p) => e.cam.angularPx(p, vp)); }, pts);
const kstate = async () => page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel; return { edges: k.edges().length, faces: k.faces().length, curves: k.curves().length, pts: k.vertices().map((v) => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]).sort(), hint: document.querySelector("#hint")?.textContent ?? "", tool: e.tool }; });
// 1. 形状格 flyout 含旋转矩形
await page.evaluate(() => globalThis.__catsup.hud.pick("rrect"));
const rail = await page.evaluate(() => [...document.querySelectorAll(".tool .tool-label")].map((x) => x.textContent));
// 2. 旋转矩形（2026-10-26 改三下对齐：边 → 绕边的角度 → 长度）：A(0,0) → B(2,0) → 角度点在 (2.03, 1)（≈ 平躺，吸 Y 轴 = 0°）→ 长度点同处 = 1
const [A, B, C, CL] = await px([{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2.03, y: 1, z: 0 }, { x: 2, y: 1, z: 0 }]);
await click(A); await click(B);
const mid = await page.evaluate(() => globalThis.__catsup.editor.liveLabel?.() ?? "");
await click(C); await click(CL);   // 长度点正落在第二边那条线上（斜着看时偏一点 = 投到线上会差一点，那是对的）
const r1 = await kstate();
// 2½. 立起来：A(0,0) → B(2,0) → 角度点在 B 正上方（吸 Z 轴 = 90°）→ 长度点 (2,0,1.5) → 竖直矩形 x 0..2、z 0..1.5、y 全是 0
await page.evaluate(() => { globalThis.__catsup.editor.commitOp({ op: "clear" }); globalThis.__catsup.hud.pick("rrect"); });
const [SA, SB, SU, SL] = await px([{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 0.02, z: 1 }, { x: 2, y: 0, z: 1.5 }]);
await click(SA); await click(SB); await click(SU); await click(SL);
const rUp = await kstate();
await page.evaluate(() => globalThis.__catsup.editor.commitOp({ op: "clear" }));
// 3. 矩形从中心：选项 → 首点 (5,5) 第二点 (6,5.5) → x 4..6, y 4.5..5.5
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); e.config.set("rect", "from", "center"); globalThis.__catsup.hud.pick("rect"); });
const [R0, R1] = await px([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0.5, z: 0 }]);
await click(R0); await click(R1);
const r2 = await kstate();
// 4. 扇形：圆心 (0,0) 起点 (1,0) 终点方向 (0,1)（90°，Shift 咬合）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); e.config.set("rect", "from", "corner"); e.config.set("arc", "mode", "pie"); e.config.set("arc", "segments", 6); globalThis.__catsup.hud.pick("arc"); });
const [O, S, E] = await px([{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.05, y: 1, z: 0 }]);
await click(O); await click(S);
await page.keyboard.down("Shift"); await click(E); await page.keyboard.up("Shift");
const r3 = await kstate();
const undo = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); return e.kernel.edges().length; });
// 5. 两点弧仍是默认流程：A → B → 凸度
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); e.config.set("arc", "mode", "two"); e.config.set("arc", "segments", 12); globalThis.__catsup.hud.pick("arc"); });
const [T0, T1, T2] = await px([{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 1, y: 0.6, z: 0 }]);
await click(T0); await click(T1); await click(T2);
const r4 = await kstate();
const res = { rail, mid, r1, rUp, r2, r3, undo, r4 };
console.log(JSON.stringify(res));
const has = (pts, p) => pts.some(([x, y, z]) => Math.abs(x - p[0]) < 0.02 && Math.abs(y - p[1]) < 0.02 && Math.abs(z - p[2]) < 0.02);
const ok = rail.includes("旋转矩形")
  && r1.edges === 4 && r1.faces === 1 && has(r1.pts, [2, 1, 0]) && has(r1.pts, [0, 1, 0])
  && rUp.edges === 4 && rUp.faces === 1 && has(rUp.pts, [0, 0, 1.5]) && has(rUp.pts, [2, 0, 1.5]) && rUp.pts.every((q) => q[1] === 0)
  && r2.edges === 4 && r2.faces === 1 && has(r2.pts, [-1, -0.5, 0]) && has(r2.pts, [1, 0.5, 0])
  && r3.faces === 1 && r3.curves === 1 && r3.edges === 8 && has(r3.pts, [0, 1, 0]) && r3.hint.includes("90.0°") && undo === 0
  && r4.edges === 12 && r4.curves === 1 && r4.faces === 0;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);
