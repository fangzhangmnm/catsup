// 强行对称的定理（计划书 `ai-docs/20261109-audit-fixes-plan.md` §3；created 2026-11-09 by Claude Opus 5.5）。
// 这一版只钉第 0 层：强行对称自己绝不把模型删空（「看不出动的是哪边、默认 + 那半」碰上「+ 那半是空的」= 11-09 真 app 里 6 张面 → 0）。
// 对称检查是独立写的（不调 isSymmetric：它本身就是要审的对象）：按坐标配对点，再照定理的条文比面。后面几层的断言接着往这个文件里加。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { type MirrorAxis, pickSide, symmetrize } from "../src/mesh/mirror.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const TOL = 1e-9;
const coord = (p: Pt3, a: MirrorAxis): number => (a === 0 ? p.x : a === 1 ? p.y : p.z);
const reflect = (p: Pt3, a: MirrorAxis): Pt3 => (a === 0 ? P(-p.x, p.y, p.z) : a === 1 ? P(p.x, -p.y, p.z) : P(p.x, p.y, -p.z));
const key = (p: Pt3): string => [p.x, p.y, p.z].map((c) => Math.round(c / TOL)).join(",");

/**
 * 独立的对称检查（定理条文，计划书 §3）：返回对不上的地方（空 = 对称）。
 * 点：每个点的镜像位置上有一个点。面：躺在镜像面上的面 = 它自己；别的面的镜像（点序倒过来）是一张面、材质槽相同。边：镜像是一条边、标记相同。
 */
function asymmetries(m: MeshKernel, a: MirrorAxis): string[] {
  const at = new Map<string, number>(), out: string[] = [];
  for (const v of m.verts()) at.set(key(m.pt(v)), v);
  const twin = (v: number): number => at.get(key(reflect(m.pt(v), a))) ?? -1;
  for (const v of m.verts()) if (twin(v) < 0) out.push(`点 ${v} 对面没有点`);
  if (out.length) return out;
  const ringKey = (r: readonly number[]): string => { const i = r.indexOf(Math.min(...r)); return [...r.slice(i), ...r.slice(0, i)].join(","); };
  const faces = new Map<string, number>();
  for (const f of m.faces()) faces.set(ringKey(m.faceVerts(f)), f);
  for (const f of m.faces()) {
    const r = m.faceVerts(f);
    if (r.every((v) => Math.abs(coord(m.pt(v), a)) <= TOL)) continue;   // 躺在镜像面上 = 对应它自己
    const g = faces.get(ringKey(r.map(twin).reverse()));
    if (g === undefined) out.push(`面 ${f} 的镜像不在`);
    else if (m.faceMat[g] !== m.faceMat[f]) out.push(`面 ${f} 和镜像 ${g} 材质槽不同`);
  }
  for (const e of m.edges()) {
    const t = m.edgeOf(twin(m.edgeA[e]), twin(m.edgeB[e]));
    if (t < 0) out.push(`边 ${e} 的镜像不在`);
    else if (m.edgeFlags[t] !== m.edgeFlags[e]) out.push(`边 ${e} 和镜像 ${t} 标记不同`);
  }
  return out;
}
const box = (x0: number, x1: number): MeshKernel => { const m = new MeshKernel(); addBox(m, P(x0, 0, 0), P(x1, 1, 1)); return m; };
/** 整张在 side 那半（不碰镜像面、不跨）的面有几张。 */
const wholly = (m: MeshKernel, a: MirrorAxis, side: -1 | 1): number => m.faces().filter((f) => m.faceVerts(f).every((v) => coord(m.pt(v), a) * side > TOL)).length;

describe("强行对称第 0 层：空的那半不当准（mesh/mirror.ts pickSide）", () => {
  it("11-09 那一案：模型整个在 −X 那半，想要 +X → 换成 −X；对称化之后 12 张面、对称（以前 6 → 0）", () => {
    const m = box(-3, -1);
    eq(pickSide(m, 0, 1), -1); eq(pickSide(m, 0, -1), -1);
    symmetrize(m, 0, pickSide(m, 0, 1)!);
    eq(m.faceCount(), 12); eq(asymmetries(m, 0).join("；"), "");
  });
  it("整个在 +X 那半，想要 −X → 换成 +X", () => {
    const m = box(1, 3);
    eq(pickSide(m, 0, -1), 1);
    symmetrize(m, 0, pickSide(m, 0, -1)!);
    eq(m.faceCount(), 12); eq(asymmetries(m, 0).join("；"), "");
  });
  it("「设置原点到选择中心」那一案：模型在 −X、有一张面贴着镜像面 → 换成 −X；对称化后 10 张面（贴着的那张变夹层被清掉）、对称", () => {
    const m = box(-2, 0);
    eq(pickSide(m, 0, 1), -1);
    symmetrize(m, 0, -1);
    eq(m.faceCount(), 10); eq(asymmetries(m, 0).join("；"), "");
  });
  it("跨过镜像面的盒子两半都有东西：想要哪半就是哪半（不换）", () => {
    const m = box(-1, 2);
    eq(pickSide(m, 0, 1), 1); eq(pickSide(m, 0, -1), -1);
  });
  it("两半都没有面 = null（这一步不对称化）：空模型；只有一张躺在镜像面上的面；只有一条在 −X 的裸线（对称化现在不镜裸线，按哪半做都会删掉东西）", () => {
    eq(pickSide(new MeshKernel(), 0, 1), null);
    const flat = new MeshKernel(), q = [P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)].map((p) => flat.addVertex(p));
    flat.addFace(q); eq(pickSide(flat, 0, 1), null); eq(pickSide(flat, 0, -1), null);
    const wire = new MeshKernel(); wire.ensureEdge(wire.addVertex(P(-2, 0, 0)), wire.addVertex(P(-1, 0, 0)));
    eq(pickSide(wire, 0, 1), null);
  });
  it("三根轴都一样：盒子整个在 −Y / −Z 那半 → 换过去、对称化后面数翻倍", () => {
    for (const a of [1, 2] as const) {
      const m = new MeshKernel(); addBox(m, a === 1 ? P(0, -3, 0) : P(0, 0, -3), a === 1 ? P(1, -1, 1) : P(1, 1, -1));
      eq(pickSide(m, a, 1), -1);
      symmetrize(m, a, -1);
      eq(m.faceCount(), 12); eq(asymmetries(m, a).join("；"), "");
    }
  });
  it("随机：盒子随便摆（可能偏在一边、贴着、跨过镜像面），随便想要哪半 → 只要有面不躺在镜像面上，pickSide 不是 null，对称化后那半原来整张在它那边的面一张不少、面数不为 0、结果对称", () => {
    let seed = 20261109;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 80; i++) {
      const a = (i % 3) as MirrorAxis, lo = Math.round((rnd() * 6 - 3) * 4) / 4, hi = lo + 0.25 + Math.round(rnd() * 12) / 4, want: -1 | 1 = rnd() < 0.5 ? -1 : 1;
      const m = new MeshKernel(), mn = [0, 0, 0], mx = [1, 1, 1]; mn[a] = lo; mx[a] = hi;
      addBox(m, P(mn[0], mn[1], mn[2]), P(mx[0], mx[1], mx[2]));
      const side = pickSide(m, a, want);
      assert(side !== null, `#${i}：盒子 [${lo}, ${hi}] 有面，pickSide 不该是 null`);
      const keep = wholly(m, a, side!);
      symmetrize(m, a, side!);
      assert(m.faceCount() > 0, `#${i}：[${lo}, ${hi}] 想要 ${want} → ${side}，对称化删光了`);
      assert(wholly(m, a, side!) >= keep, `#${i}：[${lo}, ${hi}] 按 ${side} 对称化后那半少了面`);
      eq(asymmetries(m, a).join("；"), "", `#${i}：[${lo}, ${hi}] 按 ${side} 对称化后不对称`);
    }
  });
});
