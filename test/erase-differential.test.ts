// 擦边局部化的差分 oracle（2026-10-27 Claude Fable 5.1；家族周账 F-97 ① / Fable 账单 T2；证明留档 ai-docs/proofs/20261027-erase-localization.md）：
// 同一串擦边在两台内核上跑——local = 只在被碰平面上切胞腔（出货路径），global = 全平面全膜（settleMode: "global"，老路）——
// 每一步之后事件 + 快照（边 / 面环 / 边层）必须**逐字相同**。settle-differential 的随机串里也有擦边步；这里专门把擦边压重：
// 多平面（地面格 + 几座高度不同的盒子 + 裸线 + 空闭环）、单擦 / 批擦 / 擦到同平面共享边（MERGE）/ 擦洞边（ABSORB）/ 擦外边（BURST）/ 擦裸线。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const square = (x: number, y: number, s = 1, z = 0): [Pt3, Pt3][] => [[P(x, y, z), P(x + s, y, z)], [P(x + s, y, z), P(x + s, y + s, z)], [P(x + s, y + s, z), P(x, y + s, z)], [P(x, y + s, z), P(x, y, z)]];

/** 场景：3×3 地面格（9 张共面、共享边）；(0,0) (2,2) 两格推成盒子（高度不同 → 共享墙在不同平面）；(1,1) 格里一个空闭环（会成洞）+ 一条裸线。 */
function scene(mode: "local" | "global"): Kernel {
  const k = new Kernel({ settleMode: mode });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.addEdges(square(i, j));
  const faceAt = (x: number, y: number): number => k.faces().find((f) => { const r = k.faceRings3(f.id)!.outer; const cx = r.reduce((s, p) => s + p.x, 0) / r.length, cy = r.reduce((s, p) => s + p.y, 0) / r.length; return Math.abs(cx - x) < 1e-9 && Math.abs(cy - y) < 1e-9 && r.every((p) => p.z === 0); })!.id;
  k.pushPull(faceAt(0.5, 0.5), 1);
  k.pushPull(faceAt(2.5, 2.5), 1.5);
  k.addEdges(square(1.3, 1.3, 0.4));                 // (1,1) 格里的小方：会 DIVIDE 成环带 + 内方
  k.addEdges([[P(1.1, 1.1), P(1.2, 1.1)]]);         // 裸线（擦它 = 只删边无事件）
  return k;
}

const fingerprint = (k: Kernel): string => JSON.stringify(k.toBrep());

describe("擦边局部化：局部 = 全局（差分 oracle）", () => {
  it("同一场景两台机起手一致", () => {
    const a = scene("local"), b = scene("global");
    eq(fingerprint(a), fingerprint(b), "起手快照相同");
    assert(a.faces().length >= 9 + 5 + 5, `起手面数 ${a.faces().length}`);
  });
  it("随机擦边串（单擦 + 批擦，5 个种子 × 12 步）：每步事件 + 快照逐字相同", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const a = scene("local"), b = scene("global");
      let s = seed * 7919; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      for (let step = 0; step < 12; step++) {
        const ea = a.edges(), eb = b.edges();
        eq(ea.length, eb.length, `seed ${seed} step ${step}：边数`);
        if (!ea.length) break;
        const n = rnd() < 0.5 ? 1 : 1 + Math.floor(rnd() * 3);
        const picks = new Set<number>();
        for (let i = 0; i < n; i++) picks.add(Math.floor(rnd() * ea.length));
        const ids = [...picks].sort((x, y) => x - y);
        const eva = JSON.stringify(a.eraseEdges(ids.map((i) => ea[i].id)));
        const evb = JSON.stringify(b.eraseEdges(ids.map((i) => eb[i].id)));
        eq(eva, evb, `seed ${seed} step ${step}：事件`);
        eq(fingerprint(a), fingerprint(b), `seed ${seed} step ${step}：快照`);
      }
    }
  });
  it("定向：擦同平面共享边 → MERGE；擦洞边 → ABSORB；擦盒子的棱 → 两面各自 BURST；擦裸线 → 无事件——两台机逐字相同", () => {
    const a = scene("local"), b = scene("global");
    const pick = (k: Kernel, pred: (p: Pt3, q: Pt3) => boolean): number => k.edges().find((e) => pred(k.graph.pt(e.a), k.graph.pt(e.b)))!.id;
    const same = (p: Pt3, q: Pt3, u: Pt3, v: Pt3): boolean => (Math.hypot(p.x - u.x, p.y - u.y, p.z - u.z) < 1e-9 && Math.hypot(q.x - v.x, q.y - v.y, q.z - v.z) < 1e-9) || (Math.hypot(p.x - v.x, p.y - v.y, p.z - v.z) < 1e-9 && Math.hypot(q.x - u.x, q.y - u.y, q.z - u.z) < 1e-9);
    const cases: [string, Pt3, Pt3, string][] = [
      ["地面 (1,0)-(1,1) 共享边 → MERGE", P(1, 1), P(1, 2), "MERGE"],
      ["小方的一条边（环带 + 内方都有膜 → 同平面两膜共享）→ MERGE", P(1.3, 1.3), P(1.7, 1.3), "MERGE"],
      ["裸线 → 无事件", P(1.1, 1.1), P(1.2, 1.1), ""],
      ["高盒子的一条竖棱 → BURST", P(3, 3, 0), P(3, 3, 1.5), "BURST"],
    ];
    // 先把 (2,0) 格里再画一个小方、删掉它的膜 → 真正的空洞：擦洞边 = ABSORB
    for (const k of [a, b]) { k.addEdges(square(2.3, 0.3, 0.4)); const inner = k.faces().find((f) => { const r = k.faceRings3(f.id)!.outer; return r.length === 4 && r.every((p) => p.z === 0 && p.x >= 2.3 - 1e-9 && p.x <= 2.7 + 1e-9 && p.y >= 0.3 - 1e-9 && p.y <= 0.7 + 1e-9); })!; k.eraseFaces([inner.id]); }
    eq(fingerprint(a), fingerprint(b), "空洞场景一致");
    cases.push(["空洞的一条边 → ABSORB", P(2.3, 0.3), P(2.7, 0.3), "ABSORB"]);
    for (const [name, p, q, expect] of cases) {
      const ia = pick(a, (u, v) => same(p, q, u, v)), ib = pick(b, (u, v) => same(p, q, u, v));
      const eva = a.eraseEdges([ia]), evb = b.eraseEdges([ib]);
      eq(JSON.stringify(eva), JSON.stringify(evb), `${name}：事件`);
      if (expect) assert(eva.some((e) => e.type === expect), `${name}：期望 ${expect}，实得 ${eva.map((e) => e.type).join(",") || "无"}`);
      else eq(eva.length, 0, name);
      eq(fingerprint(a), fingerprint(b), `${name}：快照`);
    }
  });
});
