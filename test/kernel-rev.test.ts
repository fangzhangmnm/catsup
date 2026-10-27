// 池版本号（#22 池级局部性，2026-10-21，Claude Fable 5.1）：Kernel.rev 是渲染 / 合成视图按池缓存的键——每个改写动词必须 +1，
// 漏一个 = 画面陈旧（看着没变其实变了）。第二条是反射守卫：Kernel 上任何不在「查询」白名单里的方法都必须出现在动词表里，加新动词得来这里表态。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z = 0) => ({ x, y, z });
const box = (k: Kernel): void => {
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const segs: [ReturnType<typeof P>, ReturnType<typeof P>][] = [];
  for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(b[0], b[1], 0)]); segs.push([P(a[0], a[1], 1), P(b[0], b[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  k.addEdges(segs);
};

/** 查询 / 构造类方法（不改状态，不要求 bump）。 */
const QUERIES = new Set(["constructor", "toBrep", "clone", "rewindMark", "touchedClosure", "restoreFromSource", "extractDelta", "deltaAgainst", "vertices", "edges", "isSoft", "isCurve", "isSmooth", "isFold", "foldPlan", "attachLog", "dihedralDeg", "bendDeg", "inwardAcross", "faceMaterial", "faces", "face", "log", "hitTest", "planeOf", "faceMaterialOf", "faceRings3", "curves", "curveById", "curveOf", "curveProblems", "isBreakJunction", "isFaceHidden", "isEdgeHidden"]);
/** 改写动词：每个在这里被调一次，rev 必须严格递增。 */
const VERBS: Record<string, (k: Kernel) => void> = {
  rewindTo: (k) => { const base = k.clone(), mark = k.rewindMark(); k.rewindTo(base, mark); },   // 倒带（O1）：rev 取新值
  swapTablesWith: (k) => { const o = k.clone(); o.rewindTo(k, o.rewindMark()); k.swapTablesWith(o); },   // 影子换真身：表搬进来（rev 跟表走，影子的 rev 更新）
  applyDelta: (k) => { const d = k.extractDelta({ V: new Set(), E: new Set(), F: new Set(), P: new Set(), C: new Set() }); k.applyDelta(d); },   // 差量（A3）：rev 取新值
  addEdges: (k) => { k.addEdges([[P(5, 5), P(6, 5)]]); },
  eraseEdges: (k) => { k.eraseEdges([k.edges()[0].id]); },
  eraseFaces: (k) => { k.eraseFaces([k.faces()[0].id]); },
  moveVertices: (k) => { const v = k.vertices()[0]; k.moveVertices([{ id: v.id, to: P(v.x + 0.1, v.y, v.z) }]); },
  pushPull: (k) => { const top = k.faces().find((f) => k.planeOf(f.id)!.plane.n.z > 0.9 && k.faceRings3(f.id)!.outer[0].z > 0.5)!; k.pushPull(top.id, 0.5); },
  followMe: (k) => { k.addEdges([[P(3, 0, 0), P(3.2, 0, 0)], [P(3.2, 0, 0), P(3.2, 0, 0.2)], [P(3.2, 0, 0.2), P(3, 0, 0)]]); const tri = k.faces().find((f) => Math.abs(k.planeOf(f.id)!.plane.n.y) > 0.9)!; k.followMe(tri.id, [P(3, 0, 0), P(3, 1, 0)], { closed: false }); },
  absorb: (k) => { k.absorb([[[P(8, 8, 0), P(9, 8, 0), P(9, 9, 0)]]], []); },
  transformAll: (k) => { k.transformAll((p) => P(p.x + 1, p.y, p.z)); },
  setFaceMaterial: (k) => { k.setFaceMaterial([k.faces()[0].id], 1); },
  setEdgeLayer: (k) => { k.setEdgeLayer("soft", [k.edges()[0].id], true); },
  setFaceHidden: (k) => { k.setFaceHidden([k.faces()[0].id], true); },   // DT49 隐藏的面（2026-10-25 Opus）
  weldEdges: (k) => { const before = new Set(k.edges().map((e) => e.id)); k.addEdges([[P(5, 5), P(6, 5)], [P(6, 5), P(6, 6)]]); k.weldEdges(k.edges().map((e) => e.id).filter((id) => !before.has(id))); },
  dissolveVertices: (k) => { k.addEdges([[P(5, 5), P(6, 5)], [P(6, 5), P(7, 5)]]); k.dissolveVertices(k.vertices().filter((v) => v.x === 6 && v.y === 5).map((v) => v.id)); },
  explodeCurves: (k) => { k.addEdges([[P(5, 5), P(6, 5)], [P(6, 5), P(6, 6)], [P(6, 6), P(5, 5)]], { curve: { kind: "polyline", closed: true } }); k.explodeCurves(k.curves().map((c) => c.id)); },
};

describe("kernel.rev: 池版本号", () => {
  it("每个改写动词严格 +1 以上；clone 继承版本、之后各走各的", () => {
    for (const [name, run] of Object.entries(VERBS)) {
      const k = new Kernel();
      box(k);
      const before = k.rev;
      run(k);
      assert(k.rev > before, `${name} 没有 bump rev（${before} → ${k.rev}）`);
    }
    const k = new Kernel(); box(k);
    const c = k.clone();
    eq(c.rev, k.rev, "clone 继承版本");
    c.addEdges([[P(5, 5), P(6, 5)]]);
    assert(c.rev > k.rev, "副本 bump 不影响原件");
  });
  it("反射守卫：Kernel 的每个方法要么在查询白名单、要么在动词表（加新动词必须来这里表态）", () => {
    const names = Object.getOwnPropertyNames(Kernel.prototype).filter((n) => {
      const d = Object.getOwnPropertyDescriptor(Kernel.prototype, n)!;
      return typeof d.value === "function" && !n.startsWith("_");
    });
    const missing = names.filter((n) => !QUERIES.has(n) && !(n in VERBS) && !["emit", "absorbVertex"].includes(n));
    eq(missing.join(","), "", `未登记的方法：${missing.join(", ")}`);
  });
});
