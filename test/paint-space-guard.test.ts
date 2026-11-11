// 空间里的笔（贴图主线 1-4a）的守卫：读仓里的源码。created 2026-11-11 by Claude Opus 5.5
//   ① 打射线求落点只有 1-3a 那一处（surface-pick.ts castRay；space-target.ts 把世界里的射线换进定义坐标交给它）。
//   ② 球和三角形求最近点只有一处（tip-reach.ts sphereTriDist）。
//   ③ 标准答案里笔尖边缘的那条曲线是内核导出的那一个（soft-shaders.ts stampFalloff），src/paint/ 里不许自己抄一份算式。
// 范围 = src/paint/（不含拷来的内核 src/paint/kernel/）：画这一路。别处的射线 / 三角形求交（编辑器拾取、W-13 抓住的点）不归这里管。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean } };
const join = (...p: string[]): string => p.join("/");

const files = (() => { const out: string[] = []; const walk = (d: string): void => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (p !== join("src", "paint", "kernel")) walk(p); } else if (/\.ts$/.test(n)) out.push(p); } }; walk(join("src", "paint")); return out.sort(); })();
const code = (f: string): string => readFileSync(f, "utf8").split("\n").map((l: string) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const hits = (re: RegExp): string[] => files.filter((f) => re.test(code(f)));

describe("空间里的笔：守卫（1-4a）", () => {
  it("① 射线和三角形求交（Möller–Trumbore）在 src/paint/ 里只有 surface-pick.ts 一处；space-target.ts 用它的 castRay", () => {
    eq(hits(/\be1x\b[\s\S]*\be2x\b/).join(","), join("src", "paint", "surface-pick.ts"));
    assert(/import \{[^}]*\bcastRay\b[^}]*\} from "\.\/surface-pick\.ts"/.test(code(join("src", "paint", "space-target.ts"))), "space-target.ts 用 castRay");
  });
  it("② 球和三角形求最近点只有 tip-reach.ts 的 sphereTriDist", () => {
    eq(hits(/d1 <= 0 && d2 <= 0/).join(","), join("src", "paint", "tip-reach.ts"));
    eq(hits(/export function sphereTriDist\(/).join(","), join("src", "paint", "tip-reach.ts"));
  });
  it("③ 标准答案的笔尖边缘曲线 = 内核导出的 stampFalloff；src/paint/ 里没有自己抄的 smoothstep 算式", () => {
    assert(/import \{[^}]*\bstampFalloff\b[^}]*\} from "\.\/kernel\/src\/backend\/soft-shaders\.ts"/.test(code(join("src", "paint", "tip-truth.ts"))), "tip-truth.ts 用内核导出的 stampFalloff");
    eq(hits(/(\b\w+)\s*\*\s*\1\s*\*\s*\(\s*3(?:\.0)?\s*-\s*2(?:\.0)?\s*\*\s*\1\s*\)|\bsmoothstep\s*\(/).join(","), "", "src/paint/ 里没有 smoothstep 的算式");
  });
});
