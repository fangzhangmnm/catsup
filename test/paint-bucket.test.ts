// 油漆桶（2026-11-13，统筹批的方案；src/paint/space-fill.ts）。created 2026-11-13 by Claude Opus 5.5
// ① 每块多边形有哪些格（polyRunsOf）= 归属表 owner 逐格一样；同一张表只算一次（缓存在表对象上），新表重算。
// ② 填哪块只看归属表：fillAimOf 给的块 = 这张面在表里的块；贴图坐标一样的两张面是同一块；没排进画布 / 一格都没分到 = 说不能填。
// ③ 填色程序（软件显卡那一半 = 标准答案）：填几块 = 正好这几块的格不透明、颜色对，别的格一格不碰。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { layoutFaces } from "../src/paint/layout.ts";
import { buildTexelTable, paintFaces, polyRunsOf, type TexelTable } from "../src/paint/texel-table.ts";
import { SPACE_FILL, fillAimOf } from "../src/paint/space-fill.ts";
import { SoftSpaceGpu } from "../src/paint/space-gpu-soft.ts";
import { placeOn, uvAtOf, uvOf, slotsOf } from "./uv-kit.ts";

const UV = "uv";
/** 一个铺好的盒子（六张面）；twin = 把第 1 张面的贴图坐标抄给第 2 张（= 镜像两半 / 复制出来的面：同一块画布多边形）。 */
function box(twin = false): { k: MeshKernel; t: TexelTable } {
  const k = new MeshKernel();
  addBox(k, { x: 0, y: 0, z: 0 }, { x: 0.7, y: 0.5, z: 0.9 });
  const lay = layoutFaces(k, k.faces(), { density: 30 });
  if (!lay.ok) throw new Error(lay.reason);
  for (const [f, v] of lay.values) placeOn(k, f, UV, [...v]);
  if (twin) { const [a, b] = k.faces(); placeOn(k, b, UV, [...uvAtOf(k, a, UV)!]); }
  return { k, t: buildTexelTable(lay.width, lay.height, paintFaces(uvOf(k), UV), 4) };
}

describe("油漆桶：每块多边形有哪些格（polyRunsOf）", () => {
  it("行段铺回去 = 归属表逐格一样（没人要的格不在任何一块里）", () => {
    const { t } = box(), pr = polyRunsOf(t), back = new Int32Array(t.width * t.height).fill(-1);
    eq(pr.runs.length, t.polys.length);
    pr.runs.forEach((r, p) => {
      let n = 0;
      for (let i = 0; i < r.length; i += 3) for (let x = r[i]; x < r[i] + r[i + 2]; x++) { const c = r[i + 1] * t.width + x; assert(back[c] === -1, `格 ${c} 出现在两块里`); back[c] = p; n++; }
      eq(n, pr.cells[p], `块 ${p} 的格数`);
    });
    for (let c = 0; c < back.length; c++) if (back[c] !== t.owner[c]) assert(false, `格 ${c}：行段说 ${back[c]}，归属表说 ${t.owner[c]}`);
  });
  it("同一张表只算一次；新建的表重算", () => {
    const { t } = box();
    assert(polyRunsOf(t) === polyRunsOf(t), "同一张表 = 同一份");
    const { t: t2 } = box();
    assert(polyRunsOf(t2) !== polyRunsOf(t), "新表 = 新算的一份");
  });
});

describe("油漆桶：填哪块只看归属表（fillAimOf）", () => {
  it("面 → 它在表里的那块、格数 = 那块的格数", () => {
    const { k, t } = box();
    for (const f of k.faces()) {
      const a = fillAimOf(t, f);
      assert("poly" in a, `面 ${f} 应该能填`);
      if ("poly" in a) { eq(a.poly, t.faces.get(f)!.poly); eq(a.cells, t.owner.reduce((s, o) => s + (o === a.poly ? 1 : 0), 0)); }
    }
  });
  it("贴图坐标一样的两张面 = 同一块（填一张另一张跟着变：共用像素）", () => {
    const { k, t } = box(true), [a, b] = k.faces(), pa = fillAimOf(t, a), pb = fillAimOf(t, b);
    assert("poly" in pa && "poly" in pb && pa.poly === pb.poly, JSON.stringify({ pa, pb }));
  });
  it("没排进画布（不在表里）= no-layout；那块一格都没分到 = no-cells", () => {
    const { t } = box();
    eq(JSON.stringify(fillAimOf(t, 9999)), JSON.stringify({ why: "no-layout" }));
    const tiny: TexelTable = { width: 4, height: 2, gap: 4, polys: [new Float64Array([0, 0, 4, 0, 4, 2, 0, 2]), new Float64Array([1, 1, 1.1, 1, 1.1, 1.1])], polyFaces: [[0], [1]], owner: new Int32Array(8).fill(0), faces: new Map([[0, { face: 0, poly: 0, tris: [] }], [1, { face: 1, poly: 1, tris: [] }]]), overlapCells: 0 };
    eq(JSON.stringify(fillAimOf(tiny, 1)), JSON.stringify({ why: "no-cells" }));
    eq(JSON.stringify(fillAimOf(tiny, 0)), JSON.stringify({ poly: 0, cells: 8 }));
  });
});

describe("油漆桶：填色程序（软件显卡 = 标准答案）", () => {
  it("填两块 = 正好这两块的格不透明、颜色对；别的格一格不碰", () => {
    const { t } = box(), gpu = new SoftSpaceGpu(), W = t.width, H = t.height, pr = polyRunsOf(t);
    gpu.register(SPACE_FILL);
    const img = gpu.image(W, H), color = [0.2, 0.6, 1] as const, want = new Set([0, 3]);
    for (const p of want) {
      const r = pr.runs[p], n = r.length / 3, inst = new Float32Array(4 * n);
      for (let k = 0; k < n; k++) { inst[4 * k] = r[3 * k]; inst[4 * k + 1] = r[3 * k + 1]; inst[4 * k + 2] = r[3 * k + 2]; inst[4 * k + 3] = 1; }
      gpu.draw({ program: SPACE_FILL.name, target: img, clear: false, accum: "max", instances: inst, count: n, uniforms: { u_size: [W, H], u_color: [...color] } });
    }
    const px = gpu.read(img);
    let filled = 0;
    for (let c = 0; c < W * H; c++) {
      const on = want.has(t.owner[c]), a = px[4 * c + 3];
      if (on) { filled++; eq(a, 255, `格 ${c} 该填`); eq([px[4 * c], px[4 * c + 1], px[4 * c + 2]].join(), [51, 153, 255].join(), `格 ${c} 的颜色`); }
      else eq(a, 0, `格 ${c} 不该碰（归 ${t.owner[c]}）`);
    }
    eq(filled, pr.cells[0] + pr.cells[3]);
  });
});
