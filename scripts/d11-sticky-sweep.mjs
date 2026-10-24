// scripts/d11-sticky-sweep.mjs —— D11 研究稿的仪表（ai-docs/20261024-d11-tau-band-study.md §7）：sticky 半径 r = k·Q 扫一遍 nasty / clean fuzz，
// 数守恒断言拒绝 + 分类。用法：node scripts/d11-sticky-sweep.mjs 1,3,5 [list]。不改任何默认值（进程内设旋钮）。created 2026-10-24 by Claude Fable 5.1
import { STICKY } from "../src/kernel/subdivide.ts";
import { Q } from "../src/kernel/geom.ts";
import { run, classify, onReject } from "../test/kernel-fuzz.test.ts";

const ks = (process.argv[2] ?? "1,3,5").split(",").map(Number);
const list = process.argv[3] === "list";
for (const k of ks) {
  STICKY.r = k * Q;
  const R = [];
  onReject.fn = ({ seed, step, op, k: kern }) => R.push({ seed, step, op, ...classify(kern) });
  let rejected = 0, nastyOtherFail = 0, cleanFail = 0;
  for (let seed = 1; seed <= 80; seed++) { try { rejected += run(seed * 104729, 12, false, "nasty"); } catch { nastyOtherFail++; } }
  for (let seed = 1; seed <= 80; seed++) { try { run(seed * 104729, 12, false, "clean"); } catch { cleanFail++; } }
  if (list) for (const r of R) console.log(`  seed ${r.seed} step ${r.step} [${r.op}] minVert=${r.minVert.toExponential(2)} minVertSeg=${r.minVertSeg.toExponential(2)} nearParallel=${r.nearParallel}${r.nearParallel ? `(${r.nearParallelMin.toExponential(2)})` : ""}`);
  console.log(JSON.stringify({ r_um: k, rejected, vertSegLe10um: R.filter((r) => r.minVertSeg < 1e-5).length, vertVertLe10um: R.filter((r) => r.minVert < 1e-5).length, nearParallel: R.filter((r) => r.nearParallel > 0).length, nastyOtherFail, cleanFail }));
}
STICKY.r = Q;
