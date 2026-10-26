// 镜像指令（狗咬坦克纪元 DT23；user 2026-10-25「Mirror一个cube中间不会多一条割线。然后Mirror默认是删掉对面吧」「组件……就是负transform嘛」）。
// created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey, type Op } from "../src/editor/ops.ts";
import { det3, translation } from "../src/scene/xform.ts";
import { sceneBox, sceneCylinder } from "./format-scenes.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const X = P(1, 0, 0);
const rootAt = (s: Scene) => ({ def: s.root, group: null });
/** 盒子 [x0, x0+w] × [0, 2] × [0, 1.5]。 */
function box(x0: number, w: number): Kernel {
  const k = new Kernel();
  const B = [[x0, 0], [x0 + w, 0], [x0 + w, 2], [x0, 2]];
  const loop = (pts: Pt3[]): void => { k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [Pt3, Pt3])); };
  loop(B.map(([x, y]) => P(x, y, 0)));
  for (let i = 0; i < 4; i++) { const [ax, ay] = B[i], [bx, by] = B[(i + 1) % 4]; loop([P(ax, ay, 0), P(bx, by, 0), P(bx, by, 1.5), P(ax, ay, 1.5)]); }
  return k;
}
const mirrorAll = (s: Scene, origin: Pt3, extra: Partial<Op & { op: "mirror" }> = {}): Scene => {
  const k = s.kernelOf(rootAt(s));
  return applyOp(s, { op: "mirror", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), plane: { origin, normal: X }, deleteOpposite: true, mergeSeam: true, weld: 0, ...extra } as Op).scene;
};
const xs = (k: Kernel): number[] => [...new Set(k.vertices().map((v) => +v.x.toFixed(6)))].sort((a, b) => a - b);

describe("镜像（DT23）", () => {
  it("立方体在正中镜像（默认：留右半、删对面、消中缝）：还是 6 面 8 点、中间没有割线", () => {
    const s = mirrorAll(new Scene(box(0, 2)), P(1, 0, 0));
    const k = s.kernelOf(rootAt(s));
    eq(k.faces().length, 6, "6 面"); eq(k.vertices().length, 8, "8 点");
    eq(JSON.stringify(xs(k)), JSON.stringify([0, 2]), "x 只有 0 和 2（缝上 x=1 没有点）");
  });
  it("半个盒子（右半 x∈[0,1]，左边封着一面贴在镜像面上）镜过去：变成 x∈[−1,1] 的整盒、隔墙删掉、上下前后合成一面", () => {
    const s = mirrorAll(new Scene(box(0, 1)), P(0, 0, 0));
    const k = s.kernelOf(rootAt(s));
    eq(JSON.stringify(xs(k)), JSON.stringify([-1, 1]), "x ∈ {−1, 1}");
    eq(k.faces().length, 6, "6 面（隔墙删了、缝上并面）"); eq(k.vertices().length, 8);
  });
  it("删掉对面关掉 = 复制：盒子在 x∈[1,2]，镜像面 x=0 → 对面多一份，原件不动", () => {
    const s = mirrorAll(new Scene(box(1, 1)), P(0, 0, 0), { deleteOpposite: false });
    const k = s.kernelOf(rootAt(s));
    eq(k.faces().length, 12, "两个盒子");
    eq(JSON.stringify(xs(k)), JSON.stringify([-2, -1, 1, 2]));
  });
  it("默认删对面：盒子横跨镜像面（x∈[−0.5, 2]，面在 x=0.7）→ 留右边 [0.7, 2] 镜成 [−0.6, 2]", () => {
    const s = mirrorAll(new Scene(box(-0.5, 2.5)), P(0.7, 0, 0));
    const k = s.kernelOf(rootAt(s));
    eq(JSON.stringify(xs(k)), JSON.stringify([-0.6, 2]), "左边那截删了、右边镜过去");
    eq(k.faces().length, 6, "缝上并面、6 面");
  });
  it("圆柱镜像（复制）：圆的身份跟着镜过去，圆心在镜像位置", () => {
    const s = mirrorAll(new Scene(sceneCylinder()), P(-1, 0, 0), { deleteOpposite: false });   // 圆柱 x∈[0,2] 在留下这侧（+X）
    const cs = new WorldView(s, ROOT_CONTEXT).centers();
    assert(cs.some((c) => Math.abs(c.x + 3) < 1e-6 && Math.abs(c.y - 1) < 1e-6), `镜像圆心 (−3,1)：${JSON.stringify(cs)}`);
    eq(s.kernelOf(rootAt(s)).curves().length, 4, "四条曲线（两份 × 上下圈）");
  });
  it("正中切开同一个圆：缝上自愈开 = 两段弧焊回圆；关 = 留四段弧（user「正中切开同圆心，和是否删中线一样共享一个选项」「因为它们语义就是自愈」）", () => {
    const on = mirrorAll(new Scene(sceneCylinder()), P(1, 0, 0));   // 圆柱圆心 (1,1)：镜像面过圆心
    const kc = on.kernelOf(rootAt(on)).curves();
    eq(kc.length, 2, `上下两个圆：${JSON.stringify(kc.map((c) => c.kind))}`);
    assert(kc.every((c) => c.kind === "circle"), "都是整圆");
    const off = mirrorAll(new Scene(sceneCylinder()), P(1, 0, 0), { mergeSeam: false });
    const ko = off.kernelOf(rootAt(off)).curves();
    assert(ko.length === 4 && ko.every((c) => c.kind === "arc"), `关掉 = 四段弧：${JSON.stringify(ko.map((c) => c.kind))}`);
  });
  it("不在正中切：两段弧圆心不同、不焊", () => {
    const s = mirrorAll(new Scene(sceneCylinder()), P(1.4, 0, 0));
    const kc = s.kernelOf(rootAt(s)).curves();
    assert(kc.length >= 2 && kc.every((c) => c.kind === "arc"), `都还是弧：${JSON.stringify(kc.map((c) => c.kind))}`);
  });
  it("切点护栏：镜像面正好过顶点 / 离顶点 50 µm 时不切出零长度或几微米的碎边（user「切到点不要出零长度的线，然后非常近的点也有护栏」）", () => {
    for (const x0 of [0, 5e-5]) {
      const k = new Kernel(); k.addEdges([[P(0, 0), P(2, 1)], [P(2, 1), P(2, -1)], [P(2, -1), P(0, 0)]]);   // 三角形，尖在 x = 0
      const s = mirrorAll(new Scene(k), P(x0, 0, 0), { deleteOpposite: false });
      const kk = s.kernelOf(rootAt(s));
      const shortest = Math.min(...kk.edges().map((e) => { const a = kk.graph.pt(e.a), b = kk.graph.pt(e.b); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }));
      assert(shortest > 1e-4, `面过 x=${x0}：最短的边 ${shortest}`);
      eq(kk.faces().length, 2, "原三角 + 镜过去的一个");
    }
  });
  it("组件 = 负变换：右边的那份镜一份到左边（行列式 < 0）；左边的那份（删对面开着）删掉", () => {
    let s = new Scene(sceneBox(1, 1));
    const k = s.kernelOf(rootAt(s));
    s = applyOp(s, { op: "makeComponent", at: rootAt(s), faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "块" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    s = applyOp(s, { op: "placeInstance", at: rootAt(s), definition: defId, xform: translation(P(3, 0, 0)) }).scene;
    s = applyOp(s, { op: "placeInstance", at: rootAt(s), definition: defId, xform: translation(P(-5, 0, 0)) }).scene;
    const ids = [...s.def(s.root).instances.values()].map((i) => i.id);
    const right = [...s.def(s.root).instances.values()].find((i) => i.xform[3] === 3)!.id;
    const left = [...s.def(s.root).instances.values()].find((i) => i.xform[3] === -5)!.id;
    s = applyOp(s, { op: "mirror", at: rootAt(s), faces: [], edges: [], instances: [right, left], plane: { origin: P(0, 0, 0), normal: X }, deleteOpposite: true, mergeSeam: true, weld: 0 }).scene;
    const insts = [...s.def(s.root).instances.values()];
    assert(!insts.some((i) => i.id === left), "左边那份删了");
    const mirrored = insts.find((i) => !ids.includes(i.id))!;
    assert(mirrored && det3(mirrored.xform) < 0, "新的一份是负变换");
    eq(+mirrored.xform[3].toFixed(6), -3, "原点镜到 x = −3");
    // 世界视图接得住：负变换实例的面数照常、顶点在 x ∈ [−4, −3]
    const v = new WorldView(s, ROOT_CONTEXT).vertices().filter((p) => p.x < -2.5);
    eq(v.length, 8); assert(v.every((p) => p.x >= -4 - 1e-9 && p.x <= -3 + 1e-9), "镜像实例落在 [−4, −3]");
    // 文件接得住：写出再读回，负变换原样在、世界顶点一样
    const back = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "m"))));
    const m2 = [...back.def(back.root).instances.values()].find((i) => det3(i.xform) < 0);
    assert(!!m2 && Math.abs(m2.xform[3] + 3) < 1e-6, "读回来还是负变换、原点 x = −3");
    const key = (sc: Scene): string => new WorldView(sc, ROOT_CONTEXT).vertices().map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`).sort().join("|");
    eq(key(back), key(s), "世界顶点一样");
  });
  it("零破面：选区里只有一条横跨镜像面的裸线 → 切开、删左半、镜右半（线还是一条直线）", () => {
    const k = new Kernel(); k.addEdges([[P(-1, 0), P(3, 0)]]);
    const s = mirrorAll(new Scene(k), P(1, 0, 0));
    const kk = s.kernelOf(rootAt(s));
    eq(JSON.stringify(xs(kk)), JSON.stringify([-1, 3]), "−1..3：左半 [−1,1] 换成右半的镜像，缝上断口焊掉");
    eq(kk.edges().length, 1, "一条边");
  });
});
