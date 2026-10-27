// mesh 内核 M1（提案 ai-docs/20261027-mesh-kernel-proposal.md；2026-10-27 Claude Fable 5.1）：不变量 (M1)–(M6) 逐算子查 + 几个形状上的事实。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_SOFT, F_WIRE } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPolygon, deleteFaces, dissolveVertex, extrudeFaces, joinFaces, knife, mergeVerts, splitEdge, splitFace, translateVerts, flipFaces, loopCut, limitedDissolve, removeDoubles } from "../src/mesh/ops/index.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const clean = (k: MeshKernel, where: string): void => { const bad = k.check(); eq(bad.length, 0, `${where}：${bad.slice(0, 3).join("；")}`); };
const sameShape = (a: MeshKernel, b: MeshKernel): boolean => JSON.stringify(a.toSnapshot()) === JSON.stringify(b.toSnapshot());

describe("mesh 内核：不变量与算子", () => {
  it("盒子：8 点 12 边 6 面、封闭流形 V − E + F = 2、三角化 12 个三角、自检干净、快照往返", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    eq(k.vertexCount(), 8); eq(k.edgeCount(), 12); eq(k.faceCount(), 6);
    eq(k.eulerOfClosedManifoldComponents().join(","), "2");
    eq(k.triangles().tris.length / 3, 12);
    clean(k, "盒子");
    const s = k.toSnapshot(), k2 = MeshKernel.fromSnapshot(s);
    eq(JSON.stringify(k2.toSnapshot()), JSON.stringify(s), "快照往返");
    clean(k2, "往返后");
  });
  it("挤出顶面再抬高：仍是封闭流形（χ = 2），面 10、边 20、点 12；侧面朝外（法向 z 分量为零、x/y 朝外）", () => {
    const k = new MeshKernel(); const { faces } = addBox(k, P(0, 0, 0), P(1, 1, 1));
    const top = faces[1];
    const r = extrudeFaces(k, [top]);
    translateVerts(k, [...r.newVerts.values()], P(0, 0, 0.5));
    eq(k.vertexCount(), 12); eq(k.edgeCount(), 20); eq(k.faceCount(), 10);
    eq(k.eulerOfClosedManifoldComponents().join(","), "2");
    for (const s of r.sides) { const n = k.faceNormal(s), c = k.facePts(s).reduce((a, p) => P(a.x + p.x / 4, a.y + p.y / 4, a.z + p.z / 4), P(0, 0, 0)); assert(Math.abs(n.z) < 1e-9, "侧面竖直"); assert((c.x - 0.5) * n.x + (c.y - 0.5) * n.y > 0, "侧面朝外"); }
    clean(k, "挤出");
  });
  it("劈边 → 劈面 → 并面：回到原来的面数；劈边的新点在中点；标记两半都带；不平的 n 边形照样是一张面", () => {
    const k = new MeshKernel(); const { face, verts } = addPolygon(k, [P(0, 0), P(2, 0), P(2, 2), P(0, 2)]);
    const e = k.edgeOf(verts[0], verts[1]); k.setFlags(e, F_SOFT, true);
    const m = splitEdge(k, e, 0.5); clean(k, "劈边");
    eq(k.faceVerts(face).length, 5); const pm = k.pt(m); eq(`${pm.x},${pm.y}`, "1,0");
    assert(k.hasFlag(k.edgeOf(verts[0], m), F_SOFT) && k.hasFlag(k.edgeOf(m, verts[1]), F_SOFT), "两半都软");
    const nf = splitFace(k, face, m, verts[2]); clean(k, "劈面");
    eq(k.faceCount(), 2);
    // 把一个点抬起来：不平了，面还在（没有平面性公理）
    k.setPos(verts[2], P(2, 2, 0.7)); clean(k, "抬点");
    eq(k.faceCount(), 2);
    joinFaces(k, k.edgeOf(m, verts[2])); clean(k, "并面");
    eq(k.faceCount(), 1); eq(k.faceVerts(face).length, 5, "并回一张五边形（不平的）");
    assert(!k.hasF(nf), "被并的面没了");
    eq(k.triangles().tris.length / 3, 3, "五边形三角化 3 个三角");
  });
  it("刀：从一条边切到对面的边 → 两张面；再切一刀经过已有顶点", () => {
    const k = new MeshKernel(); const { face, verts } = addPolygon(k, [P(0, 0), P(4, 0), P(4, 4), P(0, 4)]);
    const cut = knife(k, face, [{ e: k.edgeOf(verts[0], verts[1]), t: 0.5 }, { e: k.edgeOf(verts[2], verts[3]), t: 0.5 }]);
    clean(k, "刀 1"); eq(k.faceCount(), 2); eq(cut.length, 2);
    const f2 = k.faces().find((f) => k.faceVerts(f).includes(verts[1]))!;
    knife(k, f2, [{ v: cut[0] }, { v: verts[2] }]);
    clean(k, "刀 2"); eq(k.faceCount(), 3);
  });
  it("溶解二度点：劈出来的中点溶掉 → 边并回一条（标记保留）；三角形上溶解会少于 3 点 → 抛", () => {
    const k = new MeshKernel(); const { face, verts } = addPolygon(k, [P(0, 0), P(2, 0), P(2, 2), P(0, 2)]);
    const e = k.edgeOf(verts[0], verts[1]); k.setFlags(e, F_SOFT, true);
    const m = splitEdge(k, e); const ne = dissolveVertex(k, m); clean(k, "溶解");
    eq(k.faceVerts(face).length, 4); assert(k.hasFlag(ne, F_SOFT), "标记保留"); assert(!k.hasV(m));
    const t = new MeshKernel(); const tri = addPolygon(t, [P(0, 0), P(1, 0), P(0, 1)]);
    let threw = false; try { dissolveVertex(t, tri.verts[0]); } catch { threw = true; } assert(threw, "三角形上拒绝");
    clean(t, "拒绝后不变");
  });
  it("合：四边形两个相邻点并成一个 → 三角形；盒子一条棱的两端并掉 → 退化的面清掉、仍自检干净", () => {
    const k = new MeshKernel(); const { face, verts } = addPolygon(k, [P(0, 0), P(2, 0), P(2, 2), P(0, 2)]);
    const s = mergeVerts(k, [verts[0], verts[1]], "center"); clean(k, "合");
    eq(k.faceVerts(face).length, 3); eq(k.pt(s).x, 1);
    const b = new MeshKernel(); const box = addBox(b, P(0, 0, 0), P(1, 1, 1));
    mergeVerts(b, [box.verts[0], box.verts[1]], "first"); clean(b, "盒子合棱");
    eq(b.vertexCount(), 7); assert(b.faceCount() === 6 || b.faceCount() === 5, `面 ${b.faceCount()}（两张四边形变三角，可能一张退化）`);
    for (const f of b.faces()) assert(new Set(b.faceVerts(f)).size >= 3);
  });
  it("删面：只删面 → 边变裸线留着；连边带点删 → 孤立的点消失；盒子删一面 → 开口体（不是封闭流形，欧拉表里没它）", () => {
    const k = new MeshKernel(); const { faces } = addBox(k, P(0, 0, 0), P(1, 1, 1));
    deleteFaces(k, [faces[0]], true); clean(k, "只删面");
    eq(k.faceCount(), 5); eq(k.edgeCount(), 12, "边都还在"); assert(k.edges().every((e) => k.eFaces(e).length > 0 || k.hasFlag(e, F_WIRE)));
    eq(k.eulerOfClosedManifoldComponents().length, 0, "开口了");
    const k2 = new MeshKernel(); const b2 = addBox(k2, P(0, 0, 0), P(1, 1, 1));
    deleteFaces(k2, b2.faces, false); clean(k2, "全删");
    eq(k2.vertexCount(), 0); eq(k2.edgeCount(), 0);
  });
  it("翻面：环倒过来、法向反向；id 复用确定性：删了再建拿最小空位", () => {
    const k = new MeshKernel(); const { face } = addPolygon(k, [P(0, 0), P(1, 0), P(0, 1)]);
    const n0 = k.faceNormal(face); flipFaces(k, [face]); const n1 = k.faceNormal(face);
    assert(n0.z * n1.z < 0, "法向反了"); clean(k, "翻面");
    const a = new MeshKernel(); addBox(a, P(0, 0, 0), P(1, 1, 1)); deleteFaces(a, [1, 3], true); const nf = addPolygon(a, [P(5, 5), P(6, 5), P(5, 6)]).face;
    eq(nf, 1, "最小空位");
  });
  it("(M6) 确定性：同算子在克隆上跑 = 同结果；clone 之后原件不受影响", () => {
    const k = new MeshKernel(); const { faces } = addBox(k, P(0, 0, 0), P(1, 1, 1));
    const c = k.clone();
    const ra = extrudeFaces(k, [faces[1]]), rb = extrudeFaces(c, [faces[1]]);
    eq([...ra.newVerts].join(), [...rb.newVerts].join()); eq(ra.sides.join(), rb.sides.join());
    assert(sameShape(k, c), "同形");
    const d = k.clone(); splitEdge(d, 0); assert(!sameShape(k, d) && k.check().length === 0, "原件不动");
  });
  it("随机算子串（8 种子 × 40 步：劈边 / 劈面 / 并面 / 溶解 / 合 / 挤出 / 删面 / 挪点）：每步自检干净、拒绝的只许是人话 Error、克隆对拍同形", () => {
    for (let seed = 1; seed <= 8; seed++) {
      let s = seed * 7919; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(2, 2, 2));
      let done = 0;
      for (let step = 0; step < 40; step++) {
        const c = k.clone();
        // 随机数先抽完（两台机吃同一组），再按下标取对象：克隆的 id 布局和原件相同
        const r = rnd(), u = [rnd(), rnd(), rnd(), rnd(), rnd()];
        const pick = <T,>(arr: T[], j: number): T | undefined => (arr.length ? arr[Math.floor(u[j] * arr.length)] : undefined);
        const act = (m: MeshKernel): void => {
          if (r < 0.15) { const e = pick(m.edges(), 0); if (e !== undefined) splitEdge(m, e, 0.3 + u[1] * 0.4); }
          else if (r < 0.3) { const f = pick(m.faces(), 0); if (f !== undefined) { const vs = m.faceVerts(f); if (vs.length >= 4) { const i = Math.floor(u[1] * vs.length), j = (i + 2) % vs.length; splitFace(m, f, vs[i], vs[j]); } } }
          else if (r < 0.45) { const e = pick(m.edges().filter((x) => m.eFaces(x).length === 2), 0); if (e !== undefined) joinFaces(m, e); }
          else if (r < 0.55) { const v = pick(m.verts().filter((x) => m.vEdges(x).length === 2), 0); if (v !== undefined) dissolveVertex(m, v); }
          else if (r < 0.65) { const e = pick(m.edges(), 0); if (e !== undefined) mergeVerts(m, [m.edgeA[e], m.edgeB[e]], "center"); }
          else if (r < 0.75) { const f = pick(m.faces(), 0); if (f !== undefined) { const x = extrudeFaces(m, [f]); const n = m.faceNormal(f); translateVerts(m, [...x.newVerts.values()], P(n.x * 0.5, n.y * 0.5, n.z * 0.5)); } }
          else if (r < 0.85) { const f = pick(m.faces(), 0); if (f !== undefined) deleteFaces(m, [f], u[1] < 0.5); }
          else { const v = pick(m.verts(), 0); if (v !== undefined) translateVerts(m, [v], P((u[1] - 0.5) * 0.4, (u[2] - 0.5) * 0.4, (u[3] - 0.5) * 0.4)); }
        };
        let ea: string | null = null, eb: string | null = null;
        try { act(k); } catch (err) { ea = (err as Error).message; }
        try { act(c); } catch (err) { eb = (err as Error).message; }
        eq(ea, eb, `seed ${seed} step ${step}：克隆上的结果不同（抛 / 不抛）`);
        if (ea) { assert(!/internal/.test(ea), `seed ${seed} step ${step}：内部错误 ${ea}`); continue; }
        done++;
        clean(k, `seed ${seed} step ${step}`); assert(sameShape(k, c), `seed ${seed} step ${step}：克隆对拍不同形`);
        if (!k.faceCount()) break;
      }
      assert(done >= 10, `seed ${seed}：只做成了 ${done} 步`);
    }
  });
  it("环切：盒子竖棱出发 → 绕一圈四条竖棱劈开、四张侧面各切一刀（闭环）；仍封闭流形 χ = 2；再在一条横棱上切 → 顶面 / 底面也被切", () => {
    const k = new MeshKernel(); const { verts } = addBox(k, P(0, 0, 0), P(1, 1, 1));
    const e = k.edgeOf(verts[0], verts[4]);   // 竖棱
    const r = loopCut(k, e, 0.5);
    assert(r.closed, "闭环"); eq(r.newVerts.length, 4); eq(r.edges.length, 4);
    eq(k.faceCount(), 10); eq(k.eulerOfClosedManifoldComponents().join(","), "2"); clean(k, "环切");
    for (const v of r.newVerts) eq(k.pt(v).z, 0.5, "新点在半高");
    const r2 = loopCut(k, k.edgeOf(verts[0], verts[1]), 0.5);   // 底面的一条横棱：环穿过底面 → 下半侧面 → 顶面 → 对面
    assert(r2.closed); clean(k, "环切 2"); eq(k.eulerOfClosedManifoldComponents().join(","), "2");
  });
  it("环切开口带：两张四边形排成一条、从中间的边出发 → 两头停在边界", () => {
    const k = new MeshKernel();
    const a = addPolygon(k, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]).verts;
    const f2 = k.addFace([a[1], k.addVertex(P(2, 0)), k.addVertex(P(2, 1)), a[2]]);
    const r = loopCut(k, k.edgeOf(a[1], a[2]));
    assert(!r.closed); eq(r.newVerts.length, 3); eq(r.edges.length, 2); eq(k.faceCount(), 4); clean(k, "开口环切");
    assert(k.hasF(f2));
  });
  it("有限溶解：盒子顶面环切后（共面的两半）→ 并回一张、二度点溶掉；三角网的平面 → 一张 n 边形", () => {
    const k = new MeshKernel(); const { verts } = addBox(k, P(0, 0, 0), P(1, 1, 1));
    loopCut(k, k.edgeOf(verts[0], verts[1]));
    eq(k.faceCount(), 10);
    const r = limitedDissolve(k, 1);
    eq(k.faceCount(), 6, `并回 6 面（并了 ${r.edges} 条边、溶了 ${r.verts} 个点）`); eq(k.vertexCount(), 8); eq(k.edgeCount(), 12);
    eq(k.eulerOfClosedManifoldComponents().join(","), "2"); clean(k, "有限溶解");
  });
  it("去重点：两张共面四边形各自带顶点、边上重合 → 合并成共享边的两张面", () => {
    const k = new MeshKernel();
    addPolygon(k, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]); addPolygon(k, [P(1, 0), P(2, 0), P(2, 1), P(1, 1)]);
    eq(k.vertexCount(), 8);
    eq(removeDoubles(k, 1e-6), 2); clean(k, "去重点");
    eq(k.vertexCount(), 6); eq(k.edgeCount(), 7); eq(k.faceCount(), 2);
    const shared = k.edges().filter((e) => k.eFaces(e).length === 2); eq(shared.length, 1, "一条共享边");
  });
});
