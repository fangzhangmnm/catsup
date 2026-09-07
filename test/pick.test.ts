// 相机（纯数学正交轨道）+ 屏幕空间拾取/吸附。全程不经 three——渲染只是消费者。

import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { OrbitCamera, rayPlane } from "../src/editor/camera.ts";
import { GROUND, marqueeScreen, pickEntity, pickFace, snapPoint, NO_HAND } from "../src/editor/pick.ts";
import { rectSegments } from "../src/editor/tools.ts";
import { dist3 } from "../src/kernel/geom.ts";

const VP = { w: 1000, h: 800 };
const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

function cam(): OrbitCamera {
  const c = new OrbitCamera();
  c.target = { x: 5, y: 5, z: 0 };
  c.halfH = 50;
  return c;
}

describe("camera: 正交轨道", () => {
  it("worldToScreen ∘ screenRay∩地面 往返一致", () => {
    const c = cam();
    for (const p of [P(0, 0), P(10, 3), P(-4, 7)]) {
      const s = c.worldToScreen(p, VP);
      const r = c.screenRay(s.x, s.y, VP);
      const q = rayPlane(r.origin, r.dir, { x: 0, y: 0, z: 1 }, 0)!;
      assert(dist3(p, q) < 1e-6, `往返偏差 ${dist3(p, q)}`);
    }
  });

  it("zoom/orbit/pan 改变视图但往返仍一致", () => {
    const c = cam();
    c.orbit(120, -60);
    c.zoomBy(0.5);
    c.pan(30, 20, VP);
    const p = P(3, 8, 0);
    const s = c.worldToScreen(p, VP);
    const r = c.screenRay(s.x, s.y, VP);
    const q = rayPlane(r.origin, r.dir, { x: 0, y: 0, z: 1 }, 0)!;
    assert(dist3(p, q) < 1e-6, "变换后往返一致");
  });
});

describe("pick: 实体拾取", () => {
  it("顶点 > 边 > 面 优先级 + 面遮挡序（沿射线最近者胜）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 10 }));           // 地面方
    k.addEdges([
      [P(0, 0, 5), P(10, 0, 5)], [P(10, 0, 5), P(10, 10, 5)],
      [P(10, 10, 5), P(0, 10, 5)], [P(0, 10, 5), P(0, 0, 5)],
    ]);                                                                    // 上方悬浮方 z=5
    eq(k.faces().length, 2, "两面");
    const c = cam();
    // 相机从上方看：打在两面公共投影中心 → 命中 z=5 的上面那张（遮挡序）
    const s = c.worldToScreen(P(5, 5, 5), VP);
    const hit = pickEntity(k, c, VP, s.x, s.y, 4);
    assert(hit.face !== undefined, "命中面");
    const rings = k.faceRings3(hit.face!)!;
    assert(rings.outer.every((p) => Math.abs(p.z - 5) < 1e-9), "命中上层面");
    // 顶点优先
    const sv = c.worldToScreen(P(0, 0, 5), VP);
    assert(pickEntity(k, c, VP, sv.x, sv.y, 6).vertex !== undefined, "顶点优先");
  });
});

describe("pick: 吸附（endpoint > midpoint > on-edge > axis > 平面）", () => {
  function scene(): { k: Kernel; c: OrbitCamera } {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 10 }));
    return { k, c: cam() };
  }

  it("endpoint 吸附", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(0, 0), VP);
    const r = snapPoint(k, c, VP, s.x + 3, s.y + 2, 8, { hand: NO_HAND, plane: GROUND });
    eq(r.kind, "endpoint", "endpoint");
    assert(dist3(r.p, P(0, 0)) < 1e-9, "吸到角点");
  });

  it("midpoint 吸附", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(5, 0), VP);
    const r = snapPoint(k, c, VP, s.x + 2, s.y + 2, 6, { hand: NO_HAND, plane: GROUND });
    eq(r.kind, "midpoint", "midpoint");
    assert(dist3(r.p, P(5, 0)) < 1e-9, "吸到边中点");
  });

  it("on-edge 吸附（点落在 3D 边上）", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(3, 0), VP);
    const r = snapPoint(k, c, VP, s.x, s.y + 2, 5, { hand: NO_HAND, plane: GROUND });
    eq(r.kind, "on-edge", "on-edge");
    assert(Math.abs(r.p.y) < 1e-9 && Math.abs(r.p.z) < 1e-9, "在底边上");
    assert(Math.abs(r.p.x - 3) < 0.2, "x≈3");
  });

  it("axis 锁：地面锁 X/Y，锁完仍在平面上；无 anchor 不锁", () => {
    const { k, c } = scene();
    const anchor = P(20, 20, 0); // 远离几何，避免撞 endpoint/edge 吸附
    const sAim = c.worldToScreen(P(30, 20.2, 0), VP); // 几乎沿 +X
    const r = snapPoint(k, c, VP, sAim.x, sAim.y, 8, { hand: NO_HAND, plane: GROUND, anchor: anchor });
    eq(r.kind, "axis-x", "锁 X 轴");
    assert(Math.abs(r.p.y - 20) < 1e-6 && Math.abs(r.p.z) < 1e-6, "仍在 y=20、地面上");
    const r2 = snapPoint(k, c, VP, sAim.x, sAim.y, 8, { hand: NO_HAND, plane: GROUND });
    assert(r2.kind === null, "无 anchor 落平面");
  });

  it("落到画线平面（无任何吸附时）", () => {
    const { k, c } = scene();
    const s = c.worldToScreen(P(30, 30, 0), VP);
    const r = snapPoint(k, c, VP, s.x, s.y, 6, { hand: NO_HAND, plane: GROUND });
    eq(r.kind, null, "无吸附");
    assert(Math.abs(r.p.z) < 1e-9, "在地面上");
    assert(dist3(r.p, P(30, 30, 0)) < 1e-6, "就是指的那个点");
  });
});

describe("pick: 屏幕框选 + 批删", () => {
  it("window 语义 + Delete 批量（跨两个面）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 10 }));
    k.addEdges(rectSegments({ x: 30, y: 0 }, { x: 40, y: 10 }));
    const c = cam();
    // 旋转视角下两角点不构成包含盒——取左方区域四角投影的包围盒（模拟用户框住整个左方）
    const corners = [P(-2, -2), P(12, -2), P(12, 12), P(-2, 12)].map((p) => c.worldToScreen(p, VP));
    const sel = marqueeScreen(k, c, VP, {
      minX: Math.min(...corners.map((s) => s.x)), minY: Math.min(...corners.map((s) => s.y)),
      maxX: Math.max(...corners.map((s) => s.x)), maxY: Math.max(...corners.map((s) => s.y)),
    });
    eq(sel.edges.size, 4, "只选左方边");
    eq(sel.faces.size, 1, "只选左面");
    k.eraseFaces([...sel.faces]);
    k.eraseEdges([...sel.edges]);
    eq(k.faces().length, 1, "右面还在");
  });
});

// 2026-09-07 user「high：有时候选择会选到面后面的东西」——拾取此前纯屏幕距离，膜后的角/边照样中选。edited by Claude Fable 5.1
describe("pickEntity: 膜后的顶点/边不可选（遮挡）", () => {
  const VP2 = { w: 1000, h: 800 };
  function box(): Kernel {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 10, y: 20 }, { x: 110, y: 80 }));
    k.pushPull(k.faces()[0].id, 40);
    return k;
  }
  for (const proj of ["ortho", "persp"] as const) {
    it(`${proj}：光标压在背底边的投影上（落在正面剪影内）→ 选中正面膜，不是背底边`, () => {
      const k = box();
      const c = new OrbitCamera(); c.projection = proj; c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = { x: 60, y: 50, z: 20 };
      const s = c.worldToScreen({ x: 60, y: 80, z: 0 }, VP2);            // 背底边中点
      const hit = pickEntity(k, c, VP2, s.x, s.y, 6);
      assert(hit.edge === undefined && hit.vertex === undefined, `不该选到膜后的边/角：${JSON.stringify(hit)}`);
      assert(hit.face !== undefined, "应落到正面膜");
      const rec = k.planeOf(hit.face!)!;
      assert(Math.abs(rec.plane.n.y) > 0.99 && Math.abs(rec.plane.d - 20) < 1e-6 || Math.abs(rec.plane.d + 20) < 1e-6, `应是正面 y=20：n=${JSON.stringify(rec.plane.n)} d=${rec.plane.d}`);
    });
    it(`${proj}：光标压在背底角的投影上 → 不选到膜后的角`, () => {
      const k = box();
      const c = new OrbitCamera(); c.projection = proj; c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = { x: 60, y: 50, z: 20 };
      const s = c.worldToScreen({ x: 110, y: 80, z: 0 }, VP2);           // 背右底角（在盒子剪影内）
      const hit = pickEntity(k, c, VP2, s.x, s.y, 6);
      assert(hit.vertex === undefined, `不该选到膜后的角：${JSON.stringify(hit)}`);
    });
    it(`${proj}：可见的前底边/前底角照常可选（棱不被自己的邻膜挡）`, () => {
      const k = box();
      const c = new OrbitCamera(); c.projection = proj; c.yaw = -Math.PI / 2; c.pitch = 0.5; c.halfH = 120; c.target = { x: 60, y: 50, z: 20 };
      const se = c.worldToScreen({ x: 60, y: 20, z: 0 }, VP2);
      assert(pickEntity(k, c, VP2, se.x, se.y, 6).edge !== undefined, "前底边应可选");
      const sv = c.worldToScreen({ x: 10, y: 20, z: 40 }, VP2);
      assert(pickEntity(k, c, VP2, sv.x, sv.y, 6).vertex !== undefined, "前上角应可选");
    });
  }
});

// 2026-09-07 user「推拉的时候拾取不到细的面，是不是选取的时候不应该用和 snap 一样的捕捉逻辑？」——是：面动词只认面。
describe("pickFace: 细面（屏上几像素宽）推拉/删面拾得到", () => {
  it("2 单位宽的墙顶（≈8px）：pickEntity 让边赢（选择语义），pickFace 拾到顶面（面动词语义）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 10, y: 20 }, { x: 110, y: 22 }));   // 细墙脚印 100×2
    k.pushPull(k.faces()[0].id, 40);
    const c = new OrbitCamera(); c.setView("top"); c.halfH = 100; c.target = { x: 60, y: 21, z: 40 };
    const VP2 = { w: 1000, h: 800 };                                 // 4 px/单位 → 墙顶 8px 宽
    const s = c.worldToScreen({ x: 60, y: 21, z: 40 }, VP2);        // 墙顶正中
    const ent = pickEntity(k, c, VP2, s.x, s.y, 6);
    assert(ent.edge !== undefined, `选择语义下边应赢：${JSON.stringify(ent)}`);
    const f = pickFace(k, c, VP2, s.x, s.y);
    assert(f !== undefined, "面动词应拾到墙顶");
    const rec = k.planeOf(f!)!;
    assert(Math.abs(rec.plane.n.z) > 0.99 && Math.abs(Math.abs(rec.plane.d) - 40) < 1e-6, `应是 z=40 的墙顶：n=${JSON.stringify(rec.plane.n)} d=${rec.plane.d}`);
  });
});
