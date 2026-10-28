// 网格体的面不平时，角点不会被自己所在的面挡住（2026-10-27 Claude Opus 5.5；user「有些侧面的点选不中」）。
// 复现：圆柱顶圈绕 Z 扭一个角度 → 侧面四边形不平；以前遮挡按每张面的拟合平面判，角点不在自己邻面的拟合平面上，被自己的邻面挡掉，点它拿到的是那张面。
// 修法在 pick.ts：点只被「不含它的面」挡（点 = 连着的边两侧的面；边上的点 = 这条边两侧的面），按拓扑判、不按几何判。
// 「看得见」的标准答案：从点到眼睛的线段不穿过任何不含这个点的面的三角形（网格体自己的三角化，渲染同一份）。
import { describe, it, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addPrimitive } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { pickEntity } from "../src/editor/pick.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const VP = { w: 900, h: 700 };
const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
/** 线段 p → p + d 穿不穿过三角形 abc（不算两端）。 */
function segHitsTri(p: Pt3, d: Pt3, a: Pt3, b: Pt3, c: Pt3): boolean {
  const e1 = sub(b, a), e2 = sub(c, a), h = cross(d, e2), det = dot(e1, h);
  if (Math.abs(det) < 1e-12) return false;
  const s = sub(p, a), u = dot(s, h) / det;
  if (u < 0 || u > 1) return false;
  const q = cross(s, e1), v = dot(d, q) / det;
  if (v < 0 || u + v > 1) return false;
  const t = dot(e2, q) / det;
  return t > 1e-6 && t < 1 - 1e-6;
}

function twistedCylinderScene(twistDeg: number): { scene: Scene; m: MeshKernel; ctx: { chain: number[]; group: null } } {
  const s0 = new Scene(), d = s0.mintDef("圆柱", sceneBox()), inst = s0.mintInstance(s0.root, null, d.id, IDENTITY);   // 根是空的：别让根上的东西挡在前面
  const scene = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel();
  addPrimitive(m, "cylinder", { o: { x: 0, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } }, [0.5, 0.5, 1], 12);
  const a = (twistDeg * Math.PI) / 180;
  for (const v of m.verts()) { const p = m.pt(v); if (p.z > 0.5) m.setPos(v, { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a), z: p.z }); }
  scene.mesh(d.id).kernel = m;
  return { scene, m, ctx: { chain: [inst.id], group: null } };
}

describe("拾取：网格体的面不平时，角点不被自己的邻面挡住", () => {
  for (const twist of [0, 15, 25]) {
    it(`扭 ${twist}° 的圆柱：每个看得见的点，点它就拿到它`, () => {
      const { scene, m, ctx } = twistedCylinderScene(twist);
      const view = new WorldView(scene, ctx);
      const cam = new OrbitCamera();
      cam.projection = "persp"; cam.target = { x: 0, y: 0, z: 0.5 }; cam.yaw = 0.3; cam.pitch = 0.25; cam.halfH = 1.2;
      const eye = cam.eye(), { tris, faceOfTri } = m.triangles();
      const visibleVerts: number[] = [];
      for (const v of m.verts()) {
        const p = m.pt(v), dir = sub(eye, p), own = new Set<number>();
        for (const e of m.vEdges(v)) for (const f of m.eFaces(e)) own.add(f);
        let blocked = false;
        for (let i = 0; i < faceOfTri.length && !blocked; i++) {
          if (own.has(faceOfTri[i])) continue;
          blocked = segHitsTri(p, dir, m.pt(tris[3 * i]), m.pt(tris[3 * i + 1]), m.pt(tris[3 * i + 2]));
        }
        if (!blocked) visibleVerts.push(v);
      }
      assert(visibleVerts.length >= 10, `看得见的点太少（${visibleVerts.length}），相机摆错了`);
      const missed: string[] = [];
      for (const v of visibleVerts) {
        const s = cam.angularPx(m.pt(v), VP);
        const hit = pickEntity(view, cam, VP, s.x, s.y, 8);
        if (hit.vertex === undefined || view.local(hit.vertex).id !== v || !view.isActive(hit.vertex)) missed.push(`v${v}→${JSON.stringify(hit)}`);
      }
      assert(missed.length === 0, `点不中：${missed.join(" ")}`);
    });
  }
});

describe("自由建模的点拾取半径 = 常量（纪元账本 FM165 user「还是常量比较好」）", () => {
  it("离一个角 10 px：默认半径（6）拿不到点、自由建模的点半径（14）拿到点；边的半径不变", () => {
    const { scene, m, ctx } = twistedCylinderScene(0);
    const view = new WorldView(scene, ctx), cam = new OrbitCamera();
    cam.projection = "persp"; cam.target = { x: 0, y: 0, z: 0.5 }; cam.yaw = 0.3; cam.pitch = 0.25; cam.halfH = 1.2;
    // 屏幕上最左边的点（轮廓上）；往左挪 10 px（离开模型，旁边没有别的点）
    const v = m.verts().reduce((a, b) => (cam.angularPx(m.pt(a), VP).x < cam.angularPx(m.pt(b), VP).x ? a : b));
    const s = cam.angularPx(m.pt(v), VP);
    const near = pickEntity(view, cam, VP, s.x - 10, s.y, 6), far = pickEntity(view, cam, VP, s.x - 10, s.y, 6, { vertexPx: 14 });
    assert(near.vertex === undefined, `半径 6：拿不到点（${JSON.stringify(near)}）`);
    assert(far.vertex !== undefined && view.local(far.vertex).id === v, `半径 14：拿到那个点（${JSON.stringify(far)}）`);
  });
});
