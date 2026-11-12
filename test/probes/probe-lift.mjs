// test/probes/probe-lift.mjs —— 抬笔结算探针（A21，2026-10-21，Claude Fable 5.1）：Pencil 对齐到目标后、抬笔前的肌肉抖动不改变提交点。
// user 2026-10-21：「我抬笔的时候总是会抖一下……这会导致我对齐的点滑掉」「把屋脊抬起来的时候，我小心的对齐中间，但是抬笔的时候总是会抖一下然后歪掉」。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-lift.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏（user 2026-10-21「默认测试按 ipad mini」「我比较习惯竖屏」）*/ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
await page.evaluate(() => globalThis.__catsup.editor.applyPreset("日字"));
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp);
  // 手自己报事件时间（2026-11-12，照 probe-snap-base 的做法）：抬笔结算（A21）按事件自己的时间算停了多久；以前这里靠 setTimeout 等，机器一忙（负载 13）
  //   「抖完 20 ms 就抬」被拖成 100 ms 以上 = 在事件时间上真的停住了 → A21 按原意用抖开的那一点 → 偶发红。现在每一下的时间是这一段开始后的固定毫秒数，sleep 只是让画面跟上。
  let T0 = performance.now(); const seen = [];
  const section = () => { T0 = performance.now(); };
  const fire = (type, x, y, extra, at) => { const ev = new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 7, pointerType: "pen", isPrimary: true, button: extra.button ?? -1, buttons: extra.buttons ?? 0, pressure: extra.pressure ?? 0 }); Object.defineProperty(ev, "timeStamp", { value: T0 + at }); seen.push([T0 + at, ev.timeStamp]); c.dispatchEvent(ev); };
  const out = {};
  // 场景：日字（两格）。目标 = 中缝的中点 (0, 0, 0)。
  const mid = { x: 0, y: 0, z: 0 };
  const corner = e.kernel.vertices().find((v) => v.x === -1 && v.y === -0.6);
  // ① 画线：从角点落笔，拖到中缝中点（吸「中点」），抬笔前抖 18 px，抬笔 → 线的终点仍是中点
  e.setTool("line");
  const a = px(corner), m = px(mid);
  section();
  fire("pointerdown", a.x, a.y, { button: 0, buttons: 1, pressure: 0.5 }, 0);
  fire("pointermove", (a.x + m.x) / 2, (a.y + m.y) / 2, { buttons: 1, pressure: 0.5 }, 16);
  fire("pointermove", m.x, m.y, { buttons: 1, pressure: 0.5 }, 32); await sleep(60);
  out.lineTipBeforeLift = document.getElementById("tip").textContent;
  fire("pointermove", m.x + 18, m.y + 14, { buttons: 1, pressure: 0.2 }, 92); await sleep(20);   // 在中点停了 60 ms，抖动（离开吸附圈，< 150 ms）
  fire("pointerup", m.x + 18, m.y + 14, { button: 0, buttons: 0 }, 112);   // 抖完 20 ms 就抬
  const hitMid = e.kernel.vertices().some((v) => Math.abs(v.x - mid.x) < 1e-9 && Math.abs(v.y - mid.y) < 1e-9 && Math.abs(v.z) < 1e-9);
  const stray = e.kernel.vertices().filter((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y));
  out.lineEndsOnMidpoint = hitMid && stray.length === 0;
  out.strayVerts = stray.map((v) => [v.x, v.y, v.z]);
  // ② 移动：把刚画的线的角点端拖到另一个角点（吸「端点」= 合并），抬笔前抖，抬笔 → 合并发生、无歪点
  e.cancel(); e.setTool("move");
  const other = e.kernel.vertices().find((v) => v.x === -1 && v.y === 0.6);
  const vb = e.kernel.vertices().length;
  const p0 = px(corner), p1 = px(other);
  section();
  fire("pointerdown", p0.x, p0.y, { button: 0, buttons: 1, pressure: 0.5 }, 0);
  fire("pointermove", (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, { buttons: 1, pressure: 0.5 }, 16);
  fire("pointermove", p1.x, p1.y, { buttons: 1, pressure: 0.5 }, 32); await sleep(60);
  out.moveTipBeforeLift = document.getElementById("tip").textContent;
  fire("pointermove", p1.x - 16, p1.y + 12, { buttons: 1, pressure: 0.2 }, 92); await sleep(20);
  { const t = performance.now(); while (performance.now() - t < 150) { /* 机器卡了 150 ms 才轮到抬笔（手没停：事件时间照旧 20 ms 后抬）——按处理时刻算会当成「抖开之后停够 100 ms = 有意」（v0.19.49 及以前红） */ } }
  fire("pointerup", p1.x - 16, p1.y + 12, { button: 0, buttons: 0 }, 112);
  out.moveMerged = e.kernel.vertices().length === vb - 1;
  out.moveStray = e.kernel.vertices().filter((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y)).map((v) => [v.x, v.y, v.z]);
  // ③ 对照：抖动超过窗口（停 300 ms 再抬）→ 用抬笔位置（自由解），证明窗口是时间门不是永远黏住
  e.cancel(); e.setTool("line");
  const c2 = e.kernel.vertices().find((v) => v.x === 1 && v.y === -0.6);
  const q = px(c2);
  section();
  fire("pointerdown", q.x, q.y, { button: 0, buttons: 1, pressure: 0.5 }, 0);
  fire("pointermove", m.x, m.y, { buttons: 1, pressure: 0.5 }, 16); await sleep(60);
  fire("pointermove", m.x + 60, m.y + 50, { buttons: 1, pressure: 0.5 }, 76); await sleep(350);
  fire("pointerup", m.x + 60, m.y + 50, { button: 0, buttons: 0 }, 426);   // 抖开之后停了 350 ms 才抬 = 有意
  out.lateLiftUsesFreePoint = e.kernel.vertices().some((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y));
  // ④ 意图门（user 10-21 夜「如果是push的话所有snap到pull的应该都不合法」）：往上拉 1.0 时，指针正好压在一个**地面之下**的端点上
  //    （构造：过「拉到 0.2 的屏幕点」的视线与 z=−0.5 的交点放一条小线段）——旧行为会吸到它 = 推下去 0.5；意图门下应仍是拉 ≈ 1.0
  e.cancel(); e.clearAll(); e.applyPreset("日字");
  const cc = { x: -0.5, y: 0, z: 0 };                              // 左格中心
  const S = px({ x: cc.x, y: cc.y, z: 1.0 });                      // 拉到 h = 1.0 时指针该在的屏幕点（够高，屏上不压在邻格上——压邻格 = 「取面高度」h=0，那是另一条既有规则）
  const ry = e.cam.ray(S.x, S.y, vp);
  const tz = (-0.5 - ry.origin.z) / ry.dir.z;
  const Pb = { x: ry.origin.x + ry.dir.x * tz, y: ry.origin.y + ry.dir.y * tz, z: -0.5 };
  e.addSegments([[Pb, { x: Pb.x + 0.01, y: Pb.y, z: -0.5 }]], "probe");
  e.setTool("pp");
  out.ppSnapCandidateAtS = e.pickAt(S.x, S.y).vertex !== undefined;   // 证明那里确实有个可吸的端点（没有它这一段就没在考验意图门）
  const c0 = px(cc);
  section();
  fire("pointerdown", c0.x, c0.y, { button: 0, buttons: 1, pressure: 0.5 }, 0);
  for (let i = 1; i <= 6; i++) fire("pointermove", c0.x + (S.x - c0.x) * i / 6, c0.y + (S.y - c0.y) * i / 6, { buttons: 1, pressure: 0.5 }, 16 * i);
  await sleep(80);
  out.ppTipAtEnd = document.getElementById("hint").textContent;
  fire("pointerup", S.x, S.y, { button: 0, buttons: 0 }, 96 + 80);
  const zs = e.kernel.faces().flatMap((f) => e.kernel.faceRings3(f.id).outer.map((p) => p.z));
  out.ppMaxZ = Math.max(...zs); out.ppMinZ = Math.min(...zs);
  out.ppPulledNotPushed = out.ppMinZ >= -1e-9 && out.ppMaxZ > 0.7 && out.ppMaxZ < 1.3;
  out.handClockHonored = seen.length > 0 && seen.every(([want, got]) => want === got);   // 事件上的时间 = 手报的（实例上改得动 timeStamp；改不动 = 这里先红，不是悄悄偶发）
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.handClockHonored && res.lineEndsOnMidpoint && res.moveMerged && res.moveStray.length === 0 && res.lateLiftUsesFreePoint && res.ppSnapCandidateAtS && res.ppPulledNotPushed && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
