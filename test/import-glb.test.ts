// 导入外来 glb（纪元排期 T11 / 账本 DT2）+ 三角 → 膜 + 多级空间网格。created 2026-10-26 by Claude Opus 5.5
// 样本全在这里现造（user 10-25「测试不要用那个坦克。不要引用外面的东西」）：一个最小 glTF（节点树 / 共用网格 / 空节点 / 三角带 / 法线），
// 和几个三角网（盒子、T 字缝、同平面盖住）。
import { describe, it, eq, assert } from "./runner.mjs";
import { encodeGlb } from "../src/format/glb.ts";
import { IMPORT_UNITS, isForeignGlb, readForeignGlb, reorientImport } from "../src/format/gltf-import.ts";
import { kernelFromTriangles } from "../src/kernel/from-triangles.ts";
import { Kernel, type Pt3 } from "../src/kernel/kernel.ts";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { quantize3 } from "../src/kernel/geom.ts";
import { Scene } from "../src/scene/scene.ts";
import { castImport } from "../src/scene/import-build.ts";
import { History } from "../src/editor/history.ts";
import { applyOp } from "../src/editor/ops.ts";
import { IDENTITY, applyPt, compose } from "../src/scene/xform.ts";
import { decodeGlb } from "../src/format/glb.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import { checkInvariants } from "./kernel-fuzz.test.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const near = (a: Pt3, b: Pt3, tol = 1e-6): boolean => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= tol;

/** 单位立方体（Y-up 文件坐标）：8 点 12 三角。 */
const CUBE_POS = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
const CUBE_IDX = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];

/** 现造一个外来 glb：根「rig」（平移 + 绕 Y 转 90°）→ 孩子「box_a」（立方体）、「box_b」（同一个网格，平移）、「marker」（空节点）；第二个网格 = 三角带的一张方片 + 法线。 */
function makeGlb(): Uint8Array {
  const f32 = new Float32Array([...CUBE_POS, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]);
  const u16 = new Uint16Array([...CUBE_IDX, 0, 1, 2, 3]);
  const nrm = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const bin = new Uint8Array(f32.byteLength + u16.byteLength + 2 + nrm.byteLength);
  bin.set(new Uint8Array(f32.buffer), 0);
  bin.set(new Uint8Array(u16.buffer), f32.byteLength);
  const nOff = f32.byteLength + u16.byteLength + 2;
  bin.set(new Uint8Array(nrm.buffer), nOff);
  const s = Math.SQRT1_2;
  const json = {
    asset: { version: "2.0", generator: "test" },
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: f32.byteLength }, { buffer: 0, byteOffset: f32.byteLength, byteLength: u16.byteLength }, { buffer: 0, byteOffset: nOff, byteLength: nrm.byteLength }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: "VEC3" },
      { bufferView: 1, componentType: 5123, count: 36, type: "SCALAR" },
      { bufferView: 0, byteOffset: 96, componentType: 5126, count: 4, type: "VEC3" },
      { bufferView: 1, byteOffset: 72, componentType: 5123, count: 4, type: "SCALAR" },
      { bufferView: 2, componentType: 5126, count: 4, type: "VEC3" },
    ],
    meshes: [{ name: "cube", primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }, { name: "strip", primitives: [{ attributes: { POSITION: 2, NORMAL: 4 }, indices: 3, mode: 5 }] }],
    nodes: [
      { name: "rig", translation: [10, 2, 0], rotation: [0, s, 0, s], children: [1, 2, 3, 4] },
      { name: "box_a", mesh: 0 },
      { name: "box_b", mesh: 0, translation: [3, 0, 0] },
      { name: "marker", translation: [0, 5, 0] },
      { name: "plate", mesh: 1, scale: [2, 2, 2] },
    ],
    scenes: [{ nodes: [0] }], scene: 0,
  };
  return encodeGlb(json, bin);
}

/** 文件坐标（Y-up）→ 世界（Z-up）：(x, y, z) → (x, −z, y)。 */
const C = (p: Pt3): Pt3 => P(p.x, -p.z, p.y);

describe("导入外来 glb（T11）：glb → 中间数据", () => {
  it("节点树、名字、共用网格、空节点、三角带都读出来；Y-up → Z-up 只在文件边界换一次（世界位置 = C·M·p）；丢的东西列出来", () => {
    const bytes = makeGlb();
    assert(isForeignGlb(bytes), "外来 glb 认得出来");
    const s = readForeignGlb(bytes, "toy");
    eq(s.roots.join(), "0");
    eq(s.nodes.map((n) => n.name).join(), "rig,box_a,box_b,marker,plate");
    eq(s.nodes[1].mesh, 0); eq(s.nodes[2].mesh, 0); eq(s.nodes[3].mesh, null);
    eq(s.meshes[0].tris.length, 36);
    eq(s.meshes[1].tris.length, 6, "三角带 4 点 = 2 个三角");
    assert(s.losses.includes("顶点法线"), `丢的东西要列出来：${s.losses.join("、")}`);
    // 世界位置：rig ∘ box_b ∘ 顶点 (1,1,1)。文件里：R_y(90°)·((1,1,1) + (3,0,0)) + (10,2,0) = (10+1, 2+1, -4) → Z-up (11, 4, 3)
    const world = applyPt(compose(s.nodes[0].xform, s.nodes[2].xform), s.meshes[0].positions[6]);
    assert(near(world, C(P(11, 3, -4))), `世界位置 ${JSON.stringify(world)}`);
    // 空节点的位置：rig ∘ (0,5,0) = (10, 7, 0) → Z-up (10, 0, 7)
    assert(near(applyPt(compose(s.nodes[0].xform, s.nodes[3].xform), P(0, 0, 0)), C(P(10, 7, 0))), "空节点位置");
  });
  it("参数小窗的两项（DT84）：文件其实 Z 朝上 → 文件里的 (x, y, z) 原样就是世界坐标；文件单位厘米 → 点和节点平移 × 0.01；转换不碰原数据", () => {
    const s = readForeignGlb(makeGlb(), "toy");
    const z = reorientImport(s, "z", 1);
    // 空节点：文件 rig ∘ (0,5,0)。按 Z 朝上读 = 不换轴：rig 是绕（文件的）Y 转 90° + 平移 (10,2,0) → (10, 7, 0) 直接就是世界
    assert(near(applyPt(compose(z.nodes[0].xform, z.nodes[3].xform), P(0, 0, 0)), P(10, 7, 0)), "Z 朝上：空节点在 (10,7,0)");
    assert(near(z.meshes[0].positions[6], P(1, 1, 1)), "顶点不换轴");
    const cm = reorientImport(s, "y", IMPORT_UNITS.cm);
    assert(near(applyPt(compose(cm.nodes[0].xform, cm.nodes[3].xform), P(0, 0, 0)), P(0.1, 0, 0.07)), "厘米：空节点 (10,0,7) cm = (0.1,0,0.07) m");
    assert(near(cm.meshes[0].positions[6], P(0.01, -0.01, 0.01)), "厘米：顶点 × 0.01");
    assert(near(s.meshes[0].positions[6], P(1, -1, 1)), "原数据没被改");
  });
  it("CatsUp 自己的文件不算外来（打开走老路）", () => {
    const bytes = writeCatsup(documentFromScene(new Scene(), "t"));
    assert(!isForeignGlb(bytes), "CatsUp 文件不是外来 glb");
    assert(!isForeignGlb(new Uint8Array([1, 2, 3])), "不是 glb 的字节也不算");
  });
});

describe("三角 → 膜（kernel/from-triangles.ts）", () => {
  const cube = (): { pos: Pt3[]; tris: number[] } => ({ pos: Array.from({ length: 8 }, (_, i) => P(CUBE_POS[i * 3], CUBE_POS[i * 3 + 1], CUBE_POS[i * 3 + 2])), tris: [...CUBE_IDX] });
  it("立方体：12 张三角面直接装（不走结算机），6 条同平面对角线变软（弯折 0 ≤ 20°），12 条棱硬；内核不变量全过", () => {
    const { pos, tris } = cube();
    const { kernel, report } = kernelFromTriangles(pos, tris, { softDeg: 20 });
    eq(kernel.faces().length, 12); eq(kernel.edges().length, 18);
    eq(report.repaired, 0); eq(report.softened, 6);
    eq(kernel.edges().filter((e) => kernel.isSoft(e.id) && kernel.isSmooth(e.id)).length, 6);
    checkInvariants(kernel, "cube");
  });
  it("退化（点重合 / 三点共线）和重复（同三点，含反面）丢掉并计数", () => {
    const { pos, tris } = cube();
    pos.push(P(0, 0, 0), P(0.5, 0, 0));
    const t2 = [...tris, 0, 8, 1, 0, 9, 1, 0, 1, 2, 2, 1, 0];   // 8 与 0 重合；9 在 0-1 上；两个重复（一正一反）
    const { kernel, report } = kernelFromTriangles(pos, t2, { softDeg: 20 });
    eq(report.degenerate, 2); eq(report.duplicate, 2);
    eq(kernel.faces().length, 12);
    checkInvariants(kernel, "dups");
  });
  it("T 字缝（一个三角的顶点骑在另一个三角的边上）：牵连到的三角交给结算机切好，不留骑边", () => {
    // 一张大三角 + 底边中点挂两张小三角（中点 = T 字缝）
    const pos = [P(0, 0, 0), P(2, 0, 0), P(1, 2, 0), P(1, 0, 0), P(0, -1, 0), P(2, -1, 0)];
    const tris = [0, 1, 2, 0, 4, 3, 3, 5, 1, 3, 4, 5];
    const { kernel, report } = kernelFromTriangles(pos, tris, { softDeg: 20 });
    assert(report.repaired > 0, `应当有修过的：${JSON.stringify(report)}`);
    eq(report.rejected, 0);
    const mid = kernel.vertices().find((v) => near(v, P(1, 0, 0)))!;
    assert(!!mid, "中点是顶点");
    assert(!kernel.edges().some((e) => { const a = kernel.graph.pt(e.a), b = kernel.graph.pt(e.b); return near(a, P(0, 0, 0)) && near(b, P(2, 0, 0)) || near(a, P(2, 0, 0)) && near(b, P(0, 0, 0)); }), "大三角的底边在中点被切开");
    checkInvariants(kernel, "tjunction");
  });
  it("同平面互相盖住的两个三角：交给结算机，不出重叠的面", () => {
    const pos = [P(0, 0, 0), P(4, 0, 0), P(0, 4, 0), P(1, 1, 0), P(2, 1, 0), P(1, 2, 0)];
    const { kernel, report } = kernelFromTriangles(pos, [0, 1, 2, 3, 4, 5], { softDeg: 20 });
    assert(report.repaired === 2, `两个都交给结算机：${JSON.stringify(report)}`);
    checkInvariants(kernel, "overlap");
  });
  it("球（1536 三角）线性时间内装完、全部弯折 ≤ 20° 的边变软", () => {
    const pos: Pt3[] = [], tris: number[] = [], nu = 32, nv = 26;
    for (let j = 0; j <= nv; j++) for (let i = 0; i < nu; i++) { const th = (j / nv) * Math.PI, ph = (i / nu) * 2 * Math.PI; pos.push(P(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th))); }
    const id = (i: number, j: number): number => j * nu + (i % nu);
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { if (j > 0) tris.push(id(i, j), id(i, j + 1), id(i + 1, j)); if (j < nv - 1) tris.push(id(i + 1, j), id(i, j + 1), id(i + 1, j + 1)); }
    const t0 = performance.now();
    const { kernel, report } = kernelFromTriangles(pos, tris, { softDeg: 20 });
    const ms = performance.now() - t0;
    eq(kernel.faces().length, tris.length / 3);
    eq(report.softened, kernel.edges().length);
    assert(ms < 3000, `太慢：${ms.toFixed(0)} ms`);
  });
});

describe("导入成组件（scene/import-build.ts + op importScene）", () => {
  const build = (): { s: Scene; h: History<null>; data: ReturnType<typeof readForeignGlb> } => {
    const data = readForeignGlb(makeGlb(), "toy");
    const s = new Scene(), h = new History<null>();
    const { scene } = castImport(data, 20);
    h.commit(s, { op: "importScene", at: { def: s.root, group: null }, scene, place: IDENTITY });
    return { s, h, data };
  };
  it("层级原样：根实例「rig」→ 四个孩子；两个用同一网格的节点 = 同一个定义的两份；空节点 = 空定义（isBare）；名字跟节点走", () => {
    const { s } = build();
    const top = [...s.def(s.root).instances.values()];
    eq(top.length, 1); eq(top[0].name, "rig");
    const rig = s.def(top[0].def);
    const kids = [...rig.instances.values()];
    eq(kids.map((i) => i.name).join(), "box_a,box_b,marker,plate");
    eq(kids[0].def, kids[1].def, "共用网格 = 共用定义");
    eq(s.def(kids[0].def).name, "cube");
    assert(s.isBare(kids[2].def), "空节点是空定义");
    assert(!s.isBare(kids[0].def), "立方体不是空的");
    eq(s.mesh(kids[0].def).kernel.faceCount(), 12, "导入直接成网格体（user 10-27）：12 个三角形一张不少");
    // 组件的轴 = 节点的原点和朝向：box_b 的原点在世界 (13 → 绕 Y 转后) 的位置
    const o = applyPt(compose(top[0].xform, kids[1].xform), P(0, 0, 0));
    assert(near(o, C(P(10, 2, -3))), `box_b 原点 ${JSON.stringify(o)}`);
  });
  it("撤销 / 重做：撤掉 = 一个都不剩；重做 = 同样的 id 同样的结构（op 带装好的膜，重放只装载）", () => {
    const { s, h } = build();
    const before = JSON.stringify([...s.defs.keys()]);
    const u = h.undo()!;
    eq(u.scene.def(u.scene.root).instances.size, 0);
    const r = h.redo(u.scene)!;
    eq(JSON.stringify([...r.scene.defs.keys()]), before);
    eq([...r.scene.def(r.scene.root).instances.values()][0].name, "rig");
  });
  it("存盘再读回：层级、名字、空节点都在；写出的 glb 里没有零个 primitive 的 mesh（glTF 不许）", () => {
    const { s } = build();
    const bytes = writeCatsup(documentFromScene(s, "t"));
    const { json } = decodeGlb(bytes) as { json: { meshes: { primitives: unknown[] }[]; nodes: { mesh?: number }[] } };
    assert(json.meshes.every((m) => m.primitives.length > 0), "每个 mesh 至少一个 primitive");
    for (const n of json.nodes) if (n.mesh !== undefined) assert(json.meshes[n.mesh] !== undefined, "节点挂的 mesh 存在");
    const s2 = sceneFromDocument(readCatsup(bytes));
    const top = [...s2.def(s2.root).instances.values()];
    eq(top[0].name, "rig");
    const kids = [...s2.def(top[0].def).instances.values()];
    eq(kids.map((i) => i.name).join(), "box_a,box_b,marker,plate");
    assert(s2.isBare(kids[2].def), "空节点读回来还是空的");
  });
});

describe("空间网格（多级、不写死尺度）：超集保证", () => {
  it("毫米到公里的边混在一起：离查询点 / 线段 < 0.2 mm 的边全在 edgesNear 里；包围盒碰到的边全在 edgesInBox 里", () => {
    let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const g = new PlanarGraph();
    const segs: [Pt3, Pt3][] = [];
    for (let i = 0; i < 400; i++) {
      const L = 10 ** (-3 + rnd() * 6), c = P((rnd() - 0.5) * 50, (rnd() - 0.5) * 50, (rnd() - 0.5) * 50);
      const d = P(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5), n = Math.hypot(d.x, d.y, d.z) || 1;
      const a = quantize3(c), b = quantize3(P(c.x + (d.x / n) * L, c.y + (d.y / n) * L, c.z + (d.z / n) * L));
      const va = g.ensureVertex(a), vb = g.ensureVertex(b);
      if (va === vb || g.edgeBetween(va, vb) !== undefined) continue;
      g.addEdge(va, vb); segs.push([a, b]);
    }
    const distSeg = (p: Pt3, a: Pt3, b: Pt3): number => { const ab = P(b.x - a.x, b.y - a.y, b.z - a.z), L2 = ab.x ** 2 + ab.y ** 2 + ab.z ** 2; const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y + (p.z - a.z) * ab.z) / L2)) : 0; return Math.hypot(p.x - a.x - ab.x * t, p.y - a.y - ab.y * t, p.z - a.z - ab.z * t); };
    let checked = 0;
    for (const [a, b] of segs) for (const t of [0, 0.37, 1]) {
      // 查询点 = 边上一点再挪 0.1 mm（随机方向）：这条边必须在结果里
      const p = P(a.x + (b.x - a.x) * t + (rnd() - 0.5) * 1e-4, a.y + (b.y - a.y) * t + (rnd() - 0.5) * 1e-4, a.z + (b.z - a.z) * t + (rnd() - 0.5) * 1e-4);
      if (distSeg(p, a, b) >= 2e-4) continue;
      const hit = g.edgesNear(p, p).some((e) => { const pa = g.pt(e.a), pb = g.pt(e.b); return near(pa, a, 0) && near(pb, b, 0) || near(pa, b, 0) && near(pb, a, 0); });
      assert(hit, `漏了：查询点离边 ${distSeg(p, a, b).toExponential(2)} m，边长 ${Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z).toExponential(2)} m`);
      checked++;
    }
    assert(checked > 800, `检查得太少：${checked}`);
    // 包围盒：随机盒，暴力对照
    for (let i = 0; i < 50; i++) {
      const c = P((rnd() - 0.5) * 50, (rnd() - 0.5) * 50, (rnd() - 0.5) * 50), h = 10 ** (-2 + rnd() * 3);
      const lo = P(c.x - h, c.y - h, c.z - h), hi = P(c.x + h, c.y + h, c.z + h);
      const got = new Set(g.edgesInBox(lo, hi).map((e) => e.id));
      for (const e of g.edges()) {
        const a = g.pt(e.a), b = g.pt(e.b);
        // 线段与盒相交（采样够密的近似：盒内有采样点就算）
        let inside = false;
        for (let k = 0; k <= 200 && !inside; k++) { const t = k / 200, q = P(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t); inside = q.x >= lo.x && q.x <= hi.x && q.y >= lo.y && q.y <= hi.y && q.z >= lo.z && q.z <= hi.z; }
        if (inside) assert(got.has(e.id), `edgesInBox 漏了边 ${e.id}`);
      }
    }
  });
  it("结果按 id 排序（索引怎么摆不影响调用方看到的顺序）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(0, 0.5, 0), P(1, 0.5, 0)], [P(0, -0.5, 0), P(3000, -0.5, 0)]]);
    const ids = k.graph.edgesNear(P(0.5, 0, 0), P(0.5, 0.5, 0)).map((e) => e.id);
    eq(ids.join(), [...ids].sort((a, b) => a - b).join());
  });
});
