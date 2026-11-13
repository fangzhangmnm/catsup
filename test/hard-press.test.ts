// 重按（controller/hard-press.ts）：拿造出来的压力曲线喂判法（笔的设计稿第七节第 2 步；统筹 11-13 点名的五条 + 几条边角）。created 2026-11-13 by Claude Opus 5.5
// 曲线 = 每隔 dt 毫秒一个样本（Apple Pencil 在 iPad 上 120 Hz 左右，也试 60 Hz）；时间从 1000 起（事件时间不从 0 起）。
import { describe, it, assert, eq } from "./runner.mjs";
import { pressDown, pressMove, type PressHit, type PressSample, type PressState } from "../src/controller/hard-press.ts";
import { HARD_PRESS } from "../src/controller/feel.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string, o: { recursive: boolean }): string[] };

/** 一段曲线：ms 毫秒里压力从 p0 线性走到 p1、位置从 (x0, y) 走到 (x1, y)。 */
interface Seg { ms: number; p0: number; p1: number; x0?: number; x1?: number; }
function curve(segs: Seg[], dt = 1000 / 120): PressSample[] {
  const out: PressSample[] = []; let t = 1000, x = 100;
  for (const g of segs) {
    const n = Math.max(1, Math.round(g.ms / dt)), xa = g.x0 ?? x, xb = g.x1 ?? xa;
    for (let i = 0; i < n; i++) { const u = (i + 1) / n; out.push({ t, p: g.p0 + (g.p1 - g.p0) * u, x: xa + (xb - xa) * u, y: 200 }); t += dt; }
    x = xb;
  }
  return out;
}
/** 整条喂进去：返回判到的几次 + 最后的状态。 */
function run(samples: readonly PressSample[]): { hits: PressHit[]; state: PressState } {
  let r = pressDown(samples[0]); const hits: PressHit[] = r.hit ? [r.hit] : [];
  for (const s of samples.slice(1)) { r = pressMove(r.state, s); if (r.hit) hits.push(r.hit); }
  return { hits, state: r.state };
}
/** 带一点抖的平稳轻按（±0.01，确定的抖，不用随机数）。 */
function steady(ms: number, p: number, dt = 1000 / 120, x0 = 100, x1 = x0): Seg[] {
  const n = Math.round(ms / (dt * 4)), out: Seg[] = [];
  for (let i = 0; i < n; i++) out.push({ ms: dt * 4, p0: p + (i % 2 ? 0.01 : -0.01), p1: p + (i % 2 ? -0.01 : 0.01), x0: x0 + ((x1 - x0) * i) / n, x1: x0 + ((x1 - x0) * (i + 1)) / n });
  return out;
}
/** 轻轻落笔：60 ms 从 0.02 涨到 p。 */
const land = (p: number): Seg => ({ ms: 60, p0: 0.02, p1: p });

describe("重按：短时间里压力猛地变重才算", () => {
  it("轻按着滑一会、然后猛地按下去 = 一次，点在猛升之前", () => {
    const s = curve([land(0.15), ...steady(300, 0.15, undefined, 100, 160), { ms: 60, p0: 0.15, p1: 0.6 }, { ms: 200, p0: 0.6, p1: 0.6 }]);
    const { hits } = run(s);
    eq(hits.length, 1, "一次");
    eq(hits[0].how, "rise");
    assert(Math.abs(hits[0].x - 160) < 1, `点在猛升之前（x ${hits[0].x.toFixed(1)}，应该 ≈ 160）`);
    assert(hits[0].after > 360 && hits[0].after < 440, `落笔后多少毫秒判到（${hits[0].after.toFixed(0)}，猛升在 360–420 之间）`);
  });
  it("慢慢加重（0.1 → 0.7 用了 1 秒）= 不算", () => {
    eq(run(curve([land(0.1), { ms: 1000, p0: 0.1, p1: 0.7 }, { ms: 200, p0: 0.7, p1: 0.7 }])).hits.length, 0);
  });
  it("落笔那一下就很重 = 一次，点在落笔那一点", () => {
    const s = curve([{ ms: 30, p0: 0.3, p1: 0.75, x0: 50, x1: 54 }, { ms: 300, p0: 0.75, p1: 0.7, x0: 54, x1: 90 }]), { hits } = run(s);
    eq(hits.length, 1);
    eq(hits[0].how, "down");
    eq(hits[0].x, s[0].x, "落笔那一点（第一个样本）");
    assert(hits[0].after >= 0 && hits[0].after < HARD_PRESS.downMs, `落笔那一段里判到（after ${hits[0].after.toFixed(1)} ms）`);
  });
  it("重按着当中压力上下晃 = 还是一次", () => {
    const s = curve([land(0.15), ...steady(200, 0.15), { ms: 50, p0: 0.15, p1: 0.62 },
      { ms: 40, p0: 0.62, p1: 0.48 }, { ms: 40, p0: 0.48, p1: 0.66 }, { ms: 40, p0: 0.66, p1: 0.5 }, { ms: 40, p0: 0.5, p1: 0.64 }, { ms: 100, p0: 0.64, p1: 0.6 }]);
    eq(run(s).hits.length, 1);
  });
  it("猛升那一下笔滑了 6 px = 点取猛升之前那一刻，不算这 6 px", () => {
    const s = curve([land(0.15), ...steady(200, 0.15, undefined, 100, 100), { ms: 50, p0: 0.15, p1: 0.6, x0: 100, x1: 106 }, { ms: 100, p0: 0.6, p1: 0.6, x0: 106, x1: 106 }]);
    const { hits } = run(s);
    eq(hits.length, 1);
    assert(Math.abs(hits[0].x - 100) < 1.5, `x ${hits[0].x.toFixed(2)} 应该 ≈ 100（猛升之前），不是 106`);
  });
});

describe("重按：边角", () => {
  it("轻轻落笔、轻轻滑 = 一次都没有（落笔时压力往上冲不算）", () => {
    eq(run(curve([land(0.2), ...steady(500, 0.2, undefined, 100, 300)])).hits.length, 0);
  });
  it("按两下（中间压力退回去）= 两次", () => {
    const s = curve([land(0.15), ...steady(200, 0.15), { ms: 50, p0: 0.15, p1: 0.6 }, { ms: 80, p0: 0.6, p1: 0.6 }, { ms: 60, p0: 0.6, p1: 0.15 },
      ...steady(150, 0.15), { ms: 50, p0: 0.15, p1: 0.6 }, { ms: 80, p0: 0.6, p1: 0.6 }]);
    eq(run(s).hits.length, 2);
  });
  it("本来就按得重，要多按得更多（底 0.4：涨到 0.6 不算，涨到 0.9 算）", () => {
    eq(run(curve([land(0.4), ...steady(300, 0.4), { ms: 50, p0: 0.4, p1: 0.6 }, { ms: 100, p0: 0.6, p1: 0.6 }])).hits.length, 0, "0.4 → 0.6");
    eq(run(curve([land(0.4), ...steady(300, 0.4), { ms: 50, p0: 0.4, p1: 0.9 }, { ms: 100, p0: 0.9, p1: 0.9 }])).hits.length, 1, "0.4 → 0.9");
  });
  it("不报压感的笔（恒 0.5）= 判不出，varied 是假；真笔 varied 是真", () => {
    const flat = run(curve([{ ms: 400, p0: 0.5, p1: 0.5, x0: 100, x1: 200 }]));
    eq(flat.hits.length, 0); eq(flat.state.varied, false);
    eq(run(curve([land(0.2), ...steady(200, 0.2)])).state.varied, true);
  });
  it("中途有样本报 0 = 用上一个（不当成压力掉到 0、再回来就算猛升）", () => {
    const s = curve([land(0.2), ...steady(200, 0.2)]);
    const mid = s.length - 6;
    const holed = s.map((v, i) => (i === mid ? { ...v, p: 0 } : v));
    eq(run(holed).hits.length, 0);
  });
  it("60 Hz 的样本也判得出（一次，点在猛升之前）", () => {
    const dt = 1000 / 60, s = curve([land(0.15), ...steady(300, 0.15, dt, 100, 160), { ms: 50, p0: 0.15, p1: 0.6 }, { ms: 200, p0: 0.6, p1: 0.6 }], dt);
    const { hits } = run(s);
    eq(hits.length, 1);
    assert(Math.abs(hits[0].x - 160) < 1, `x ${hits[0].x.toFixed(1)}`);
  });
  it("纯函数：不改传进来的状态", () => {
    const a = pressDown({ t: 1000, p: 0.2, x: 0, y: 0 }), frozen = JSON.stringify(a.state);
    pressMove(a.state, { t: 1010, p: 0.25, x: 1, y: 0 });
    eq(JSON.stringify(a.state), frozen);
  });
  it("手感表的数：都是有限正数、成数都在 0..1 里、落笔够重 > 0.5（不报压感的笔恒 0.5）", () => {
    for (const [k, v] of Object.entries(HARD_PRESS)) assert(Number.isFinite(v) && v > 0, k);
    for (const k of ["riseMin", "riseRel", "startFrac", "downHeavy", "rearmFrac"] as const) assert(HARD_PRESS[k] < 1, k);
    assert(HARD_PRESS.downHeavy > 0.5, "downHeavy");
  });
});

describe("重按：只有输入层喂压力，工具不读设备（设计稿第五节）", () => {
  const src = (p: string): string => fs.readFileSync(decodeURIComponent(new URL(`../src/${p}`, import.meta.url).pathname), "utf8");
  it("自由建模的工具（src/editor/tools/）一个都不碰 pressure", () => {
    const bad = fs.readdirSync(decodeURIComponent(new URL("../src/editor/tools/", import.meta.url).pathname), { recursive: true }).filter((f) => f.endsWith(".ts") && /\bpressure\b/.test(src(`editor/tools/${f}`)));
    eq(bad.join(), "", "工具里出现 pressure");
  });
  it("喂判法（pressDown / pressMove）的只有 app/gestures.ts", () => {
    const all = fs.readdirSync(decodeURIComponent(new URL("../src/", import.meta.url).pathname), { recursive: true }).filter((f) => f.endsWith(".ts") && f !== "controller/hard-press.ts");
    eq(all.filter((f) => /\bpress(Down|Move)\(/.test(src(f))).join(), "app/gestures.ts");
  });
  it("工具（src/editor/tools/）不直接看指针上的 press / lift：翻译只在 editor/seek-input.ts", () => {
    const bad = fs.readdirSync(decodeURIComponent(new URL("../src/editor/tools/", import.meta.url).pathname), { recursive: true }).filter((f) => f.endsWith(".ts") && /\bev\??\.(press|lift)\b/.test(src(`editor/tools/${f}`)));
    eq(bad.join(), "", "工具里直接读了 ev.press / ev.lift");
  });
  it("判到的重按不进 lastTool（相机动了会重放 lastTool，重按不许递第二遍）", () => {
    const g = src("app/gestures.ts");
    assert(!/lastTool\.press\s*=/.test(g) && !/lastTool\s*=\s*\{[^}]*press/.test(g), "gestures.ts 把 press 存进了 lastTool");
  });
});
