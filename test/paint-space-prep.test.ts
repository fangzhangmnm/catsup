// 画画的准备（贴图主线 1-4c）：整份几何 + 每格的表缓存着，落笔只取现成的；改了模型 = 过期、从不拿旧的画；放得干净。created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { SpacePrep, PrepPendingError } from "../src/paint/space-prep.ts";
import { SpaceLayer } from "../src/paint/space-layer.ts";
import { tipReach, sphereTriDist } from "../src/paint/tip-reach.ts";
import type { InkTip } from "../src/paint/tip-truth.ts";
import type { TargetGeo } from "../src/paint/space-target.ts";
import { boxMesh, laidOut, targetOf } from "./paint-space-kit.ts";

const rig = () => { const m = boxMesh(2), uv = laidOut(m, "uv", m.faces(), { density: 40 }); return { m, uv, t: targetOf(m, uv) }; };
const pending = (f: () => unknown): boolean => { try { f(); } catch (e) { return e instanceof PrepPendingError; } return false; };

describe("画画的准备：缓存、过期、放（1-4c）", () => {
  it("建一次；键没变再 ensure 不重建，取到的是同一张每格的表；目标换成这次传进来的那份（「走不走画」不进键）", () => {
    const gpu = new SoftSpaceGpu(), prep = new SpacePrep(() => gpu), { t } = rig();
    eq(prep.problem([t]), "pending", "没建 = 还不能画");
    assert(pending(() => prep.take(t)), "没建就取 = PrepPendingError（不现建）");
    prep.ensure([t]); const a = prep.take(t);
    const t2 = { ...t, walks: () => false };
    prep.ensure([t2]); const b = prep.take(t2);
    eq(prep.builds, 1, "只建了一次"); assert(a.cells === b.cells, "同一张表"); assert(b.geo.target === t2, "几何里的目标 = 这次的"); eq(gpu.live, 1, "显卡上只占一张");
  });
  it("改了模型（修改号变了）= 过期：问 = pending、取 = 抛，从不拿旧的画；重建后旧表放掉", () => {
    const gpu = new SoftSpaceGpu(), prep = new SpacePrep(() => gpu), { m, t } = rig();
    prep.ensure([t]); const old = prep.take(t).cells;
    const v = m.faceVerts(m.faces()[0])[0], p = m.pt(v); m.setPos(v, { ...p, z: p.z + 0.01 });
    eq(prep.problem([t]), "pending"); assert(pending(() => prep.take(t)), "过期的不给");
    prep.ensure([t]); const fresh = prep.take(t);
    assert(fresh.cells !== old, "重建了"); eq(prep.builds, 2); eq(gpu.live, 1, "旧表放掉了");
  });
  it("撤销式换回（同一个对象、修改号换成从没用过的新值）照样认成过期；换回来的那份重建后画在对的位置上", () => {
    const gpu = new SoftSpaceGpu(), prep = new SpacePrep(() => gpu), { m, t } = rig();
    const v = m.faceVerts(m.faces()[0])[0], p0 = m.pt(v);
    m.setPos(v, { ...p0, z: p0.z + 0.2 }); prep.ensure([t]);
    m.setPos(v, p0);   // 「撤销」：内容回到原样、修改号是新的
    eq(prep.problem([t]), "pending");
    prep.ensure([t]); const g: TargetGeo = prep.take(t).geo;
    const at = (z: number): boolean => { for (let i = 0; i < g.wpos.length; i += 3) if (g.wpos[i] === p0.x && g.wpos[i + 1] === p0.y && g.wpos[i + 2] === z) return true; return false; };
    assert(at(p0.z) && !at(p0.z + 0.2), "几何是撤销后的（那个点在原处，没有抬高的那份）");
  });
  it("ensure 只留这次给的；release 全放；换文件（文档号变）自己放", () => {
    const gpu = new SoftSpaceGpu(); let epoch = 1;
    const prep = new SpacePrep(() => gpu, () => epoch), A = rig().t, B = { ...rig().t, id: "B" };
    prep.ensure([A, B]); eq(gpu.live, 2); eq(prep.stats().gpuBytes, 2 * A.canvas.width * A.canvas.height * 8, "每格 8 字节");
    prep.ensure([B]); eq(gpu.live, 1, "A 放掉了"); eq(prep.problem([A]), "pending");
    prep.release(); eq(gpu.live, 0); eq(prep.stats().entries, 0);
    prep.ensure([A]); eq(gpu.live, 1);
    epoch = 2; prep.checkEpoch(); eq(gpu.live, 0, "换文件 = 全放"); eq(prep.problem([A]), "pending");
  });
  it("换了显卡接口（比如画面丢了又回来）= 过期", () => {
    let gpu = new SoftSpaceGpu(); const prep = new SpacePrep(() => gpu), { t } = rig();
    prep.ensure([t]); gpu = new SoftSpaceGpu();
    eq(prep.problem([t]), "pending");
  });
  it("借来的表：一笔画完 dispose 不放它（下一笔接着用）；画出来和自己建表的一样", () => {
    const gpu = new SoftSpaceGpu(), prep = new SpacePrep(() => gpu), { t } = rig();
    prep.ensure([t]); const { geo, cells } = prep.take(t);
    let best = -1, bd = Infinity; const tip: InkTip = { x: 0.3, y: 0.2, z: 0.5, r: 0.15, alpha: 0.8 };
    for (let k = 0; k < geo.grid.face.length; k++) { const d = sphereTriDist(tip.x, tip.y, tip.z, geo.wpos, 9 * k); if (d < bd) { bd = d; best = k; } }
    const tips = [{ tip, reach: tipReach([geo], tip, [{ ti: 0, tri: best }]) }];
    const draw = (c?: typeof cells): Uint8Array => { const L = new SpaceLayer(gpu, geo, 0, { hardness: 0.4, color: [0.2, 0.4, 0.9], accum: "over", origin: tip, ...(c ? { cells: c } : {}) }); L.update(tips, 1); const px = gpu.read(L.frame); L.dispose(); return px; };
    const live0 = gpu.live, a = draw(cells);
    eq(gpu.live, live0, "借来的那张还在、别的都放了");
    const b = draw();
    eq(gpu.live, live0, "自己建的那张也放了");
    let inked = 0, same = true; for (let i = 0; i < a.length; i++) { if (a[i] !== b[i]) same = false; if (i % 4 === 3 && a[i]) inked++; }
    assert(same && inked > 20, `一样（吃墨 ${inked} 格）`);
  });
});
