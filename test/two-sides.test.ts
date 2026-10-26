// 两个表面（纪元账本 DT8，契约 §5.2「面无朝向：material = [+n 侧, −n 侧]」）+ 按侧灌（DT10）。created 2026-10-26 by Claude Opus 5.5（周二 Fable 审）
// 不变量：**颜色跟着实物的那一面走**——面的「侧」= 法向那边的半空间，变换下法向按逆转置走（p 在 n 那侧 ⇔ M p 在 M⁻ᵀn 那侧）；
// 存储按平面记录的规范法向分 +n / −n 两槽，所以规范法向和实物法向反了就要两槽互换。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel, type Pt3 } from "../src/kernel/kernel.ts";
import { floodFaces, floodSides, gates } from "../src/kernel/flood.ts";
import { kernelFromTriangles } from "../src/kernel/from-triangles.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { applyNormal, rotationAbout, translation, type Xform } from "../src/scene/xform.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import { checkInvariants } from "./kernel-fuzz.test.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const RED = 3;
const rect = (pts: Pt3[]): [Pt3, Pt3][] => pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
/** 涂了红色的那一面的实物法向（世界方向）：front 槽 → +n，back 槽 → −n；两槽都红 / 都不红 → null。 */
function paintedDir(k: Kernel, fid: number): Pt3 | null {
  const n = k.planeOf(fid)!.plane.n, f = k.faceMaterialOf(fid, 0), b = k.faceMaterialOf(fid, 1);
  if ((f === RED) === (b === RED)) return null;
  return f === RED ? n : P(-n.x, -n.y, -n.z);
}
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const only = (k: Kernel): number => { eq(k.faces().length, 1, "一张面"); return k.faces()[0].id; };

describe("两个表面（DT8）：颜色跟着实物的那一面走", () => {
  it("只涂一侧：另一侧没颜色；两侧都涂 = 老行为", () => {
    const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]));
    const f = only(k);
    k.setFaceMaterial([f], RED, [0]);
    eq(k.faceMaterialOf(f, 0), RED); eq(k.faceMaterialOf(f, 1), undefined);
    k.setFaceMaterial([f], 5);
    eq(k.faceMaterialOf(f, 0), 5); eq(k.faceMaterialOf(f, 1), 5);
  });
  it("绕面内的轴转 180°（面翻过来）：红的那面原来朝 +z，现在朝 −z", () => {
    const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]));
    const f = only(k); k.setFaceMaterial([f], RED, [0]);
    assert(dot(paintedDir(k, f)!, P(0, 0, 1)) > 0.99, "起始朝上");
    k.transformAll((p) => P(p.x, -p.y, -p.z));
    const g = only(k);
    assert(dot(paintedDir(k, g)!, P(0, 0, -1)) > 0.99, `翻过来朝下：${JSON.stringify(paintedDir(k, g))}`);
  });
  it("平移 / 绕法向转：不换", () => {
    const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]));
    const f = only(k); k.setFaceMaterial([f], RED, [0]);
    k.transformAll((p) => P(p.x + 3, p.y + 1, p.z));
    k.transformAll((p) => P(-p.y, p.x, p.z));   // 绕 z 转 90°
    assert(dot(paintedDir(k, only(k))!, P(0, 0, 1)) > 0.99, "仍朝上");
  });
  it("镜像（行列式 < 0）：左右镜像 → 朝上的还朝上；上下镜像 → 朝上的变朝下（绕向反了不等于翻面）", () => {
    for (const [name, fn, want] of [["左右", (p: Pt3) => P(-p.x, p.y, p.z), P(0, 0, 1)], ["上下", (p: Pt3) => P(p.x, p.y, -p.z + 1), P(0, 0, -1)]] as const) {
      const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]));
      const f = only(k); k.setFaceMaterial([f], RED, [0]);
      k.transformAll(fn);
      assert(dot(paintedDir(k, only(k))!, want) > 0.99, `${name}镜像后 ${JSON.stringify(paintedDir(k, only(k)))}`);
    }
  });
  it("规范法向的符号在噪声带里翻（竖墙绕 z 轴微转 0.01 rad）：红的那面还朝 +y", () => {
    const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)]));
    const f = only(k);
    const n0 = k.planeOf(f)!.plane.n;
    k.setFaceMaterial([f], RED, [dot(n0, P(0, 1, 0)) > 0 ? 0 : 1]);   // 涂朝 +y 的那面
    const e = 0.01, c = Math.cos(e), s = Math.sin(e);
    k.transformAll((p) => P(p.x * c - p.y * s, p.x * s + p.y * c, p.z));
    const g = only(k), n1 = k.planeOf(g)!.plane.n;
    assert(Math.sign(n1.y) !== Math.sign(n0.y) || Math.sign(n1.x) !== Math.sign(n0.x), `规范法向确实翻了：${JSON.stringify(n0)} → ${JSON.stringify(n1)}`);
    assert(paintedDir(k, g)!.y > 0.99, `仍朝 +y：${JSON.stringify(paintedDir(k, g))}`);
  });
  it("一条线切开：两半都继承两侧", () => {
    const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]));
    const f = only(k); k.setFaceMaterial([f], RED, [1]); k.setFaceMaterial([f], 7, [0]);
    k.addEdges([[P(1, 0, 0), P(1, 1, 0)]]);
    eq(k.faces().length, 2);
    for (const g of k.faces()) { eq(k.faceMaterialOf(g.id, 0), 7); eq(k.faceMaterialOf(g.id, 1), RED); }
    checkInvariants(k, "split");
  });
  it("镜像放的组件炸开：每张面的红色仍在实物的同一面（按逆转置算的法向判）；组转着复制不再装不进去", () => {
    let s = new Scene();
    const at = { def: s.root, group: null };
    // 立方体做成组件，每张面只涂朝外的那一侧
    const box: [Pt3, Pt3][] = [];
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; box.push([P(a[0], a[1], 0), P(b[0], b[1], 0)], [P(a[0], a[1], 1), P(b[0], b[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    s = applyOp(s, { op: "addEdges", at, segs: box }).scene;
    s = applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }).scene;
    const k0 = s.kernelOf(at);
    const C = P(0.5, 0.5, 0.5);
    const outward = (k: Kernel, fid: number, c: Pt3): 0 | 1 => { const r = k.faceRings3(fid)!.outer, n = k.planeOf(fid)!.plane.n; const q = r[0]; return dot(n, P(q.x - c.x, q.y - c.y, q.z - c.z)) > 0 ? 0 : 1; };
    s = applyOp(s, { op: "paintFaces", at, faces: k0.faces().map((f) => faceKey(k0, f.id)), material: 0, sides: k0.faces().map((f) => outward(k0, f.id, C)) }).scene;
    const k1 = s.kernelOf(at);
    s = applyOp(s, { op: "makeComponent", at, faces: k1.faces().map((f) => faceKey(k1, f.id)), edges: [], name: "box" }).scene;
    const inst = [...s.def(s.root).instances.values()][0];
    // 镜像（x → −x）再挪开，然后炸开
    const M: Xform = [-1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0];
    s = applyOp(s, { op: "transformInstance", def: s.root, instance: inst.id, xform: M }).scene;
    s = applyOp(s, { op: "explode", at, instance: inst.id }).scene;
    const k2 = s.kernelOf(at);
    eq(k2.faces().length, 6);
    const slot = s.brep(s.root).materialSlots.indexOf(0);
    const C2 = P(5 - 0.5, 0.5, 0.5);
    for (const f of k2.faces()) {
      const want = outward(k2, f.id, C2);
      eq(k2.faceMaterialOf(f.id, want), slot, `面 ${f.id} 朝外那侧是红的`);
      eq(k2.faceMaterialOf(f.id, (1 - want) as 0 | 1), undefined, `面 ${f.id} 朝里那侧没颜色`);
    }
    checkInvariants(k2, "explode-mirror");
    // 组：转着复制（以前 fromBrep「outer ring is not CCW」）
    let s3 = new Scene();
    s3 = applyOp(s3, { op: "addEdges", at: { def: s3.root, group: null }, segs: box }).scene;
    const k3 = s3.kernelOf({ def: s3.root, group: null });
    s3 = applyOp(s3, { op: "makeGroup", at: { def: s3.root, group: null }, faces: k3.faces().map((f) => faceKey(k3, f.id)), edges: [] }).scene;
    const gid = [...s3.brep(s3.root).groups.keys()][0];
    for (const deg of [37, 90, 180]) s3 = applyOp(s3, { op: "copyGroup", at: { def: s3.root, group: null }, group: gid, xform: rotationAbout(P(3, 0, 0), P(0, 0, 1), (deg * Math.PI) / 180) }).scene;
    eq(s3.brep(s3.root).groups.size, 4, "三份转着的复制都装进去了");
  });
  it("transformSnapshot 的侧规则 = 逆转置法向：随机刚体 + 镜像 100 次，红色的实物法向始终 = M⁻ᵀ·原法向", () => {
    let seed = 7; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let t = 0; t < 100; t++) {
      const k = new Kernel(); k.addEdges(rect([P(0, 0, 0), P(1, 0, 0), P(1, 1, 0.3), P(0, 1, 0.3)]));
      const f = only(k), n0 = k.planeOf(f)!.plane.n;
      k.setFaceMaterial([f], RED, [0]);   // 红 = +n0 那面
      const R = rotationAbout(P(0, 0, 0), (() => { const v = P(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5), l = Math.hypot(v.x, v.y, v.z) || 1; return P(v.x / l, v.y / l, v.z / l); })(), rnd() * 6.28);
      const mir = rnd() < 0.5;
      const M: Xform = mir ? [-R[0], R[1], R[2], R[3], -R[4], R[5], R[6], R[7], -R[8], R[9], R[10], R[11]] : R;
      const k2 = new Kernel();
      const { absorbSnapshot } = SCENE;
      absorbSnapshot(k2, k.toBrep(), M);
      const g = only(k2), want = applyNormal(M, n0), wl = Math.hypot(want.x, want.y, want.z);
      const got = paintedDir(k2, g)!;
      assert(!!got && dot(got, P(want.x / wl, want.y / wl, want.z / wl)) > 0.99, `第 ${t} 次（${mir ? "镜像" : "刚体"}）：红在 ${JSON.stringify(got)}，应在 ${JSON.stringify(want)}`);
    }
  });
  it("存盘再读回：两侧不同的颜色都在", () => {
    let s = new Scene();
    const at = { def: s.root, group: null };
    s = applyOp(s, { op: "addEdges", at, segs: rect([P(0, 0, 0), P(2, 0, 0), P(2, 1, 0), P(0, 1, 0)]) }).scene;
    s = applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }).scene;
    s = applyOp(s, { op: "addMaterial", name: "蓝", color: [0, 0, 1] }).scene;
    const k = s.kernelOf(at), f = k.faces()[0];
    s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, f.id)], material: 0, sides: [0] }).scene;
    s = applyOp(s, { op: "paintFaces", at, faces: [faceKey(k, f.id)], material: 1, sides: [1] }).scene;
    const s2 = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    const k2 = s2.kernelOf({ def: s2.root, group: null }), g = k2.faces()[0];
    eq(s2.materialOfSlot(s2.root, k2.faceMaterialOf(g.id, 0))?.name, "红");
    eq(s2.materialOfSlot(s2.root, k2.faceMaterialOf(g.id, 1))?.name, "蓝");
  });
});

describe("按侧灌（DT10 第四个动词）", () => {
  const strip = (twist: boolean): Kernel => {
    const N = 24, pos: Pt3[] = [], tris: number[] = [];
    for (let i = 0; i < N; i++) {
      const u = (i / N) * 2 * Math.PI, h = twist ? u / 2 : 0;
      for (const v of [-0.3, 0.3]) pos.push(twist ? P((1 + v * Math.cos(h)) * Math.cos(u), (1 + v * Math.cos(h)) * Math.sin(u), v * Math.sin(h)) : P(Math.cos(u), Math.sin(u), v));
    }
    for (let i = 0; i < N; i++) {
      const a = 2 * i, b = 2 * i + 1, j = (i + 1) % N;
      let c = 2 * j, d = 2 * j + 1;
      if (twist && j === 0) [c, d] = [d, c];   // 转一圈回来正好上下颠倒
      tris.push(a, b, d, a, d, c);
    }
    return kernelFromTriangles(pos, tris, { softDeg: 20 }).kernel;
  };
  it("圆筒只灌满一侧；莫比乌斯环两侧都灌满（user 10-25 的例子）", () => {
    const tube = strip(false);
    const ft = floodSides(tube, tube.faces()[0].id, 0, gates.any());
    eq(ft.length, tube.faces().length, "圆筒：每张面一侧");
    eq(new Set(ft.map((x) => x.face)).size, tube.faces().length);
    const mob = strip(true);
    const fm = floodSides(mob, mob.faces()[0].id, 0, gates.any());
    eq(fm.length, 2 * mob.faces().length, "莫比乌斯：每张面两侧");
    eq(floodFaces(mob, mob.faces()[0].id, gates.any()).length, mob.faces().length, "按面灌照旧");
  });
  it("立方体朝外那侧灌出来全朝外", () => {
    const k = new Kernel();
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs: [Pt3, Pt3][] = [];
    for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(b[0], b[1], 0)], [P(a[0], a[1], 1), P(b[0], b[1], 1)], [P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
    k.addEdges(segs);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 1))!;
    const up = k.planeOf(top.id)!.plane.n.z > 0 ? 0 : 1;
    const out = floodSides(k, top.id, up, gates.any());
    eq(out.length, 6);
    for (const { face, side } of out) {
      const n = k.planeOf(face)!.plane.n, q = k.faceRings3(face)!.outer[0];
      const dir = side === 0 ? n : P(-n.x, -n.y, -n.z);
      assert(dot(dir, P(q.x - 0.5, q.y - 0.5, q.z - 0.5)) > 0, `面 ${face} 那侧朝外`);
    }
  });
});

import * as SCENE from "../src/scene/scene.ts";
void translation;
