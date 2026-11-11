// 画画路径上的容量上限（贴图主线 1-4c，统筹 11-11：每个压缩格式旁边写容量，每个上限一条顶到它的测试；到了 = 抛 PaintLimitError 带人话，不静默画错）。created 2026-11-11 by Claude Opus 5.5
// 清单和行为 = ai-docs/20261111-paint-workorders-14.md 1-4c 施工记录「容量清单」。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpaceLayer, cellTable, packCell, checkLayerLimits, MAX_TRIS, MAX_FACES, MAX_POLYS, MAX_CANVAS_SIDE } from "../src/paint/space-layer.ts";
import { SpacePathPlacer } from "../src/paint/space-path.ts";
import type { TexelTable } from "../src/paint/texel-table.ts";
import { SpacePrep } from "../src/paint/space-prep.ts";
import { PaintLimitError } from "../src/paint/paint-limit.ts";
import { buildTargetGeo, type TargetGeo } from "../src/paint/space-target.ts";
import { sampleOffset } from "../src/paint/texel-table.ts";
import { tipReach, sphereTriDist } from "../src/paint/tip-reach.ts";
import type { InkTip } from "../src/paint/tip-truth.ts";
import { P, boxMesh, gridMesh, laidOut, targetOf } from "./paint-space-kit.ts";

const ngon = (n: number): MeshKernel => { const m = new MeshKernel(); m.addFace(Array.from({ length: n }, (_, i) => m.addVertex(P(Math.cos((2 * Math.PI * i) / n), Math.sin((2 * Math.PI * i) / n), 0))), -1, FRESH); return m; };
const startTri = (g: TargetGeo, p: { x: number; y: number; z: number }): number => { let b = -1, bd = Infinity; for (let t = 0; t < g.grid.face.length; t++) { const d = sphereTriDist(p.x, p.y, p.z, g.wpos, 9 * t); if (d < bd) { bd = d; b = t; } } return b; };
const limitSay = (f: () => unknown): string => { try { f(); } catch (e) { if (e instanceof PaintLimitError) return e.say; throw e; } return ""; };

describe("画画路径上的容量上限（1-4c）", () => {
  it("每格的表：每格 8 字节，解开 = 归属表 + 量化过的取样点偏移（逐格全对）；默认密度 1024² = 8 MB", () => {
    const m = boxMesh(4), uv = laidOut(m), g = buildTargetGeo(targetOf(m, uv)), t = g.table, tab = cellTable(t);
    eq(`${t.width}x${t.height}`, "1024x1024", "默认密度铺满 1024 见方"); eq(tab.byteLength, 1024 * 1024 * 8, "8 MB");
    let edge = 0;
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
      const c = y * t.width + x, b = 4 * c, id = (tab[b] | (tab[b + 1] << 16)) - 1;
      if (id !== t.owner[c]) throw new Error(`格 (${x}, ${y})：表里 ${id}，归属表 ${t.owner[c]}`);
      if (id < 0) { if (tab[b + 2] || tab[b + 3]) throw new Error("没人要的格子偏移该是 0"); continue; }
      const o = sampleOffset(t, x, y)!;
      if (tab[b + 2] - 32768 !== o[0] || tab[b + 3] - 32768 !== o[1]) throw new Error(`格 (${x}, ${y}) 偏移不对`);
      if (o[0] || o[1]) edge++;
    }
    assert(edge > 10000, `块边上的格子 ${edge} 个都进了表（以前的取样点表最多 65535 个，96 张面就放不下）`);
  });
  it("每格的表顶到容量：编号 + 1 = 2^32 − 1 放得下、2^32 / 0 抛；偏移 −32768 / 32767 放得下、再多一份抛", () => {
    const out = new Uint16Array(4);
    packCell(out, 0, 0xffffffff, -32768, 32767); eq(`${[...out]}`, "65535,65535,0,65535");
    for (const [id, ox, oy] of [[2 ** 32, 0, 0], [0, 0, 0], [1, 32768, 0], [1, 0, -32769], [1, 0.5, 0]]) {
      let threw = false; try { packCell(out, 0, id, ox, oy); } catch { threw = true; }
      assert(threw, `(${id}, ${ox}, ${oy}) 要抛`);
    }
  });
  it(`每张面三角形上限 ${MAX_TRIS}：1024 个的面准备得了、画得上；1025 个的面准备时就报那句人话（点出是哪张面），这一笔不开始`, () => {
    const ok = ngon(MAX_TRIS + 2), bad = ngon(MAX_TRIS + 3), gpu = new SoftSpaceGpu();
    eq(ok.faceTriangles(ok.faces()[0]).length, MAX_TRIS); eq(bad.faceTriangles(bad.faces()[0]).length, MAX_TRIS + 1);
    const tOk = targetOf(ok, laidOut(ok, "uv", ok.faces(), { density: 12 })), tBad = targetOf(bad, laidOut(bad, "uv", bad.faces(), { density: 12 }), { id: "bad" });
    const prep = new SpacePrep(() => gpu);
    prep.ensure([tOk]); eq(prep.problem([tOk]), null, "1024 个三角形的面准备好了");
    const { geo, cells } = prep.take(tOk), tip: InkTip = { x: 0.1, y: 0.05, z: 0, r: 0.3, alpha: 1 };
    const L = new SpaceLayer(gpu, geo, 0, { hardness: 0.5, color: [1, 0, 0], accum: "max", origin: tip, cells });
    L.update([{ tip, reach: tipReach([geo], tip, [{ ti: 0, tri: startTri(geo, tip) }]) }], 1);
    const px = gpu.read(L.frame); let inked = 0; for (let i = 3; i < px.length; i += 4) if (px[i]) inked++;
    assert(inked > 20, `画上了 ${inked} 格`); L.dispose();
    prep.ensure([tBad]);
    const p = prep.problem([tBad]);
    assert(p instanceof PaintLimitError, "1025 个三角形：准备时记下了上限的错");
    const say = (p as PaintLimitError).say;
    assert(/这张面太大了/.test(say) && say.includes(`面 ${bad.faces()[0]}`) && say.includes(`${MAX_TRIS + 1} 个三角形`) && say.includes(`最多 ${MAX_TRIS} 个`), say);
    eq(limitSay(() => prep.take(tBad)), say, "落笔时取 = 交出同一句");
  });
  it("数据图放不下（显卡每边上限调小去顶）：三角形表超了 → 准备时报人话；画布比显卡大 → 报人话", () => {
    const m = gridMesh(12, 2), uv = laidOut(m, "uv", m.faces(), { density: 4 });
    const g = buildTargetGeo(targetOf(m, { ...uv, width: 2, height: 2 }));   // 画布 2 × 2（放得进每边 2 的显卡）；288 个三角形 × 15 = 4320 个数 > 2 行 × 2048
    eq(limitSay(() => checkLayerLimits(new SoftSpaceGpu({ maxSize: 2 }), g.table)), "这个物件画不了：面太多，笔的数据表放不下");
    checkLayerLimits(new SoftSpaceGpu({ maxSize: 3 }), g.table);   // 3 行 × 2048 = 6144 个数放得下 = 不抛
    const big = buildTargetGeo(targetOf(m, uv));
    const say = limitSay(() => checkLayerLimits(new SoftSpaceGpu({ maxSize: big.table.width - 1 }), big.table));
    assert(/画布（\d+ × \d+）比这台设备的显卡能放的（每边 \d+）大/.test(say), say);
  });
  it(`一颗笔尖下同一块画布多边形挂的面最多 ${MAX_FACES} 张：9 张叠在一起、贴图坐标一样的面 → 这一帧报人话`, () => {
    const m = new MeshKernel(), q = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)];
    for (let k = 0; k <= MAX_FACES; k++) m.addFace(q.map((p) => m.addVertex(P(p.x, p.y, p.z + k * 1e-4))), -1, FRESH);
    m.addColumn({ guid: "uv", arity: 2 });
    for (const f of m.faces()) m.setFaceValues(f, "uv", [4, 4, 36, 4, 36, 36, 4, 36]);
    const gpu = new SoftSpaceGpu(), t = { ...targetOf(m, { guid: "uv", width: 40, height: 40, pxPerM: 32 }) }, g = buildTargetGeo(t);
    eq(g.table.polys.length, 1, "九张面并成同一块"); eq(g.table.polyFaces[0].length, MAX_FACES + 1);
    const tip: InkTip = { x: 0.5, y: 0.5, z: 0, r: 0.2, alpha: 1 }, L = new SpaceLayer(gpu, g, 0, { hardness: 0.5, color: [1, 1, 1], accum: "max", origin: tip });
    const reach = new Map([[0, new Map([[0, Array.from(g.grid.face, (_, k) => k)]])]]);   // 叠着的面互不相连（各自的点）：这颗笔尖碰到的三角形直接给全部
    const say = limitSay(() => L.update([{ tip, reach }], 1));
    eq(say, `这一笔画不了：笔下有 ${MAX_FACES + 1} 张面共用画布上同一块地方（最多 ${MAX_FACES} 张）`);
    L.dispose();
  });
  it(`画布多边形最多 ${MAX_POLYS} 块（实例表是 32 位浮点，2^24 以内的编号才精确）：多一块 = 准备时报人话`, () => {
    const m = gridMesh(2, 1), g = buildTargetGeo(targetOf(m, laidOut(m, "uv", m.faces(), { density: 8 })));
    const fake = (n: number): TexelTable => ({ ...g.table, polys: { length: n } as unknown as TexelTable["polys"] });   // 只假装块数（真建一千六百多万块放不进测试）：上限只看块数
    checkLayerLimits(new SoftSpaceGpu(), fake(MAX_POLYS));
    eq(limitSay(() => checkLayerLimits(new SoftSpaceGpu(), fake(MAX_POLYS + 1))), `这个物件画不了：画布上的块太多（${MAX_POLYS + 1} 块，最多 ${MAX_POLYS} 块）`);
  });
  it(`画布每边最多 ${MAX_CANVAS_SIDE} 格（取样点在 32 位浮点里精确）：显卡放得下更大的也照样报人话`, () => {
    const m = gridMesh(2, 1), g = buildTargetGeo(targetOf(m, laidOut(m, "uv", m.faces(), { density: 8 }))), big = new SoftSpaceGpu({ maxSize: 32768 });
    const side = (w: number): TexelTable => ({ ...g.table, width: w });
    checkLayerLimits(big, side(MAX_CANVAS_SIDE));
    eq(limitSay(() => checkLayerLimits(big, side(MAX_CANVAS_SIDE + 1))), `这张画画不了：画布（${MAX_CANVAS_SIDE + 1} × ${g.table.height}）每边超过 ${MAX_CANVAS_SIDE} 格，笔对不准格子`);
    for (const o of [32767, -32768]) { const x = MAX_CANVAS_SIDE - 1 + 0.5 + o / 1024, y = 0.5 + o / 1024; eq(Math.fround(x), x, `最右边一格、偏移 ${o} 份：32 位浮点里正好`); eq(Math.fround(y), y); }
    const over = MAX_CANVAS_SIDE + 0.5 + 32767 / 1024; assert(Math.fround(over) !== over, "再宽一格就不精确了（上限是顶着算的）");
  });
  it("一帧的数据表放不下 = 分几批画（1-4d 第 4 条）：表的上限压到很小，逼出几十批；叠色 / 取最大两种，和一批画完逐字节一样；不取消这一笔", () => {
    const m = gridMesh(6, 1), uv = laidOut(m, "uv", m.faces(), { density: 24 }), g = buildTargetGeo(targetOf(m, uv));
    const startOf = (p: { x: number; y: number; z: number }): number => { let b = -1, bd = Infinity; for (let k = 0; k < g.grid.face.length; k++) { const d = sphereTriDist(p.x, p.y, p.z, g.wpos, 9 * k); if (d < bd) { bd = d; b = k; } } return b; };
    // 一笔斜着走过很多张面，笔尖大到一颗碰好几块（item 多、面单子长）；分两帧：第一帧定型一半、第二帧画剩下的当尾巴
    const tips = Array.from({ length: 40 }, (_, i) => ({ x: -0.45 + 0.9 * (i / 39), y: -0.4 + 0.8 * (i / 39), z: 0, r: 0.12, alpha: 0.35 + 0.015 * i }) as InkTip);
    const fresh = tips.map((tip) => ({ tip, reach: tipReach([g], tip, [{ ti: 0, tri: startOf(tip) }]) }));
    for (const accum of ["over", "max"] as const) {
      const run = (maxValues?: number) => {
        const gpu = new SoftSpaceGpu(), L = new SpaceLayer(gpu, g, 0, { hardness: 0.4, color: [0.9, 0.3, 0.1], accum, origin: tips[0], ...(maxValues ? { maxValues } : {}) });
        L.update(fresh, 20); L.update(fresh.slice(20), 0);
        const px = gpu.read(L.frame), peak = { ...L.peak }; L.dispose();
        return { px, peak };
      };
      const one = run(), many = run(24);
      assert(one.peak.batches === 1, `不压上限 = 一批（${one.peak.batches}）`);
      assert(many.peak.batches >= 10, `上限压到 24 个数：分了 ${many.peak.batches} 批`);
      let diff = 0, ink = 0; for (let i = 0; i < one.px.length; i++) { if (one.px[i] !== many.px[i]) diff++; if (i % 4 === 3 && one.px[i]) ink++; }
      eq(diff, 0, `${accum}：分批 = 一批画完，逐字节`);
      assert(ink > 100, `${accum}：真画上了（${ink} 格有墨）`);
    }
  });
  it("落成路时一对相邻点的射线有上限（maxRays）：到了 = 剩下的当断开、记进 stats.capped（自动退路，不卡死）", () => {
    const hit = (sx: number) => ({ kind: "target" as const, ti: 0, tri: 0, pos: P(sx, 0, 0), t: 1 });
    const run = (maxRays: number) => { const pl = new SpacePathPlacer({ hit, unit: 0.01, stepMax: 0.5, minPx: 1e-9, maxRays }); pl.place([0, 64], [0, 0], [1, 1], 2, 0); return pl.stats; };
    const ok = run(4096), cut = run(8);
    eq(ok.capped, 0, `一路分到步长以内（打了 ${ok.rays} 条）`); assert(ok.rays > 8, "要分很多次");
    eq(cut.capped, 1, "上限 8 条：到了，记一笔"); assert(cut.rays <= 8 + 2 + 1, `只打了 ${cut.rays} 条（8 条对半分 + 两头的点 + 到上限那一下）`);
  });
});
