// 一笔的手感拆出来之前先冻的样本（贴图主线 0-6 的主门；施工单 CatsUp ai-docs/20261110-paint-workorders-5.md 第二节第 2 条）。created 2026-11-10 by Claude Opus 5.5
// 十来条造出来的笔画（快的、慢的、中途停顿的、压感乱跳的、带起笔和收笔渐细的、椭圆笔尖的、极小的笔、极大的笔、只有一个点的、弯的、橡皮、叠加模式），
// 用拆之前（画画仓 main 0eecc80）的 BrushEngine 每喂一个点收集一次 collectStamps()，连同抬笔后的最终结果，按位记下取 sha256。
// 拆完之后同样的输入，结果按位相等。重冻：FREEZE_STROKE=1 跑这一个文件，把打出来的表贴回 GOLDEN（只有画画软件的手感本来就该变时才重冻）。
// 内核自己的测试：只 import 内核（src/backend、src/common）和测试工具，不读仓里的文件。
import { describe, it, eq, assert } from "./runner.mjs";
import { createHash } from "node:crypto";
import { BrushEngine } from "../src/backend/brush.ts";
import { resolveBrush } from "../src/common/resolved-brush.ts";

const env = globalThis.process?.env ?? {};
const LAYER = { docW: 512, docH: 512 };   // 缓冲的笔只读图层的宽高（包围盒夹边）
const base = { color: "#203040", hardness: 0.8, spacing: 0.1, flow: 1, opacity: 1, sizeCoeff: 1, flowCoeff: 0, opaCoeff: 0, pressureGamma: 1, pressureLPF: 0, taperIn: 0, taperOut: 0, streamline: 0, stabilization: 0 };
const B = (o) => resolveBrush({ ...base, ...o });
let seed = 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

/** 每条笔画：笔、平滑、点列 [x, y, 压感, 时间]。 */
const STROKES = {
  fast: () => ({ brush: B({ size: 24 }), smooth: { tau: 30, deadzone: 1 }, pts: Array.from({ length: 30 }, (_, i) => [40 + i * 14, 60 + i * 5, 0.7, i * 16]) }),
  slow: () => ({ brush: B({ size: 16 }), smooth: { tau: 60, deadzone: 1.5 }, pts: Array.from({ length: 80 }, (_, i) => [100 + i * 0.6, 100 + i * 0.3, 0.5, i * 16]) }),
  dwell: () => ({ brush: B({ size: 40, pressureLPF: 50, taperIn: 0.5, pressureGamma: 1.2, spacing: 0.06 }), smooth: { tau: 50, deadzone: 1.6 }, pts: [...Array.from({ length: 20 }, (_, i) => [200 + (i % 2 ? 0.05 : -0.05), 200, 1, i * 16]), ...Array.from({ length: 30 }, (_, i) => [200 + i * 4, 200 + i, 0.4, 320 + i * 16])] }),
  jumpyPressure: () => { seed = 7; return { brush: B({ size: 30, flowCoeff: 0.5, opaCoeff: 0.3, pressureLPF: 20 }), smooth: { tau: 40, deadzone: 1 }, pts: Array.from({ length: 50 }, (_, i) => [50 + i * 6, 300 + 20 * Math.sin(i / 4), rnd(), i * 16]) }; },
  tapers: () => ({ brush: B({ size: 36, taperIn: 1.5, taperOut: 2, taperFloor: 0.2 }), smooth: { tau: 30, deadzone: 1 }, pts: Array.from({ length: 40 }, (_, i) => [30 + i * 10, 400 - i * 3, 0.8, i * 16]) }),
  ellipse: () => ({ brush: B({ size: 28, shapeKind: "ellipse", shapeAspect: 0.4, shapeRotation: 30 }), smooth: { tau: 30, deadzone: 1 }, pts: Array.from({ length: 25 }, (_, i) => [60 + i * 9, 120 + i * 9, 0.6, i * 16]) }),
  tiny: () => ({ brush: B({ size: 1, spacing: 0.25 }), smooth: { tau: 20, deadzone: 0.5 }, pts: Array.from({ length: 40 }, (_, i) => [10 + i * 1.3, 10 + i * 0.7, 0.9, i * 16]) }),
  huge: () => ({ brush: B({ size: 400, spacing: 0.05 }), smooth: { tau: 30, deadzone: 2 }, pts: Array.from({ length: 20 }, (_, i) => [256 + i * 12, 256 - i * 8, 0.5, i * 16]) }),
  single: () => ({ brush: B({ size: 20 }), smooth: { tau: 30, deadzone: 1 }, pts: [] }),
  curvy: () => ({ brush: B({ size: 18, taperOut: 1 }), smooth: { tau: 80, deadzone: 1.2 }, pts: Array.from({ length: 60 }, (_, i) => [256 + 120 * Math.cos(i / 9), 256 + 120 * Math.sin(i / 9), 0.3 + 0.5 * Math.abs(Math.sin(i / 7)), i * 16]) }),
  erase: () => ({ brush: B({ size: 22 }), smooth: { tau: 30, deadzone: 1 }, mode: "erase", pts: Array.from({ length: 30 }, (_, i) => [400 - i * 7, 50 + i * 6, 0.7, i * 16]) }),
  buildup: () => ({ brush: B({ size: 26, compositeMode: "buildup", flow: 0.4 }), smooth: { tau: 30, deadzone: 1 }, pts: Array.from({ length: 30 }, (_, i) => [80 + i * 8, 470 - i * 2, 0.5 + 0.4 * Math.sin(i), i * 16]) }),
};

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const bits = (x) => { f64[0] = x; return `${u32[0].toString(16)}.${u32[1].toString(16)}`; };
const dumpOut = (o) => o === null ? "null" : `${o.bx},${o.by},${o.bw},${o.bh}|${o.mode}|${bits(o.opacity)}|${o.blendMode}|${JSON.stringify(o.shape)}|` + o.stamps.map((s) => `${bits(s.x)},${bits(s.y)},${bits(s.size)},${bits(s.alpha)}`).join(";");
/** 一条笔画按帧收集（每喂一个点收集一次）+ 抬笔后的最终结果 → 文本。 */
function run(name) {
  const S = STROKES[name](), eng = new BrushEngine(), frames = [];
  eng.beginStroke(LAYER, S.brush, 20 + 3 * name.length, 20 + 5 * name.length, 0.5, S.mode ?? "brush", S.smooth, 0);
  frames.push(dumpOut(eng.collectStamps()));
  for (const [x, y, p, t] of S.pts) { eng.extendStroke(x, y, p, t); frames.push(dumpOut(eng.collectStamps())); }
  frames.push("END " + dumpOut(eng.endStroke()));
  return frames.join("\n");
}
const hashOf = (name) => createHash("sha256").update(run(name)).digest("hex").slice(0, 32);

/** 拆之前（画画仓 main 0eecc80，2026-11-10）算出来的。 */
const GOLDEN = {
  fast: "e8f7526382ebe9dbba775c1c94566b36",
  slow: "6fb3d89700928bd00565e27c4bd2bfbb",
  dwell: "e41fd74362002002e92209013ad75218",
  jumpyPressure: "f5ad6ddefc638e1de1c58e009ecb3089",
  tapers: "512221e8f22d7ba966631c1417684a42",
  ellipse: "0071c175b416f2e57e6e32145bd0e30f",
  tiny: "c64215834f7066d69f77a3e4995677fc",
  huge: "2d1f1da95606af636fc6a3ef73716ba5",
  single: "1afd92583e0e06414def6198a45ec7d8",
  curvy: "dbebb7be5f9bd63e08309770bc1ac27e",
  erase: "022a5c7bcc2f93b8c50b8b7f79c36026",
  buildup: "4cfee21cc136cd5b1804cb25febb8bb6",
};

describe("一笔的手感：拆之前冻的样本（0-6 主门）", () => {
  if (env.FREEZE_STROKE) { const out = {}; for (const n of Object.keys(STROKES)) out[n] = hashOf(n); console.log(JSON.stringify(out, null, 1)); }
  for (const name of Object.keys(STROKES)) it(`${name}：每一帧的 collectStamps() 和抬笔后的结果按位相等`, () => {
    const h = hashOf(name);
    assert(run(name).split("\n").length >= 2, "真的收集了");
    eq(h, GOLDEN[name], name);
  });
});
