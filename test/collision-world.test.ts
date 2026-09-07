// test/collision-world.test.ts —— 内核膜碰撞世界 golden：盒子六膜的挡墙/站顶/线段命中、含洞面、安全地板；再拿 player 端到端走一遍。
// created 2026-09-07 by Claude Fable 5.1
import { describe, it, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { KernelCollisionWorld } from "../src/editor/collision-world.ts";
import { DEFAULT_CONFIG, PlayerSim, PHYS_DT } from "../src/player/player.ts";
import { emptyInput, type InputFrame } from "../src/player/input.ts";

const near = (a: number, b: number, tol = 1e-3): boolean => Math.abs(a - b) <= tol;
const P = (x: number, y: number, z = 0) => ({ x, y, z });
const rect = (x0: number, y0: number, x1: number, y1: number, z = 0): [ReturnType<typeof P>, ReturnType<typeof P>][] => [
  [P(x0, y0, z), P(x1, y0, z)], [P(x1, y0, z), P(x1, y1, z)], [P(x1, y1, z), P(x0, y1, z)], [P(x0, y1, z), P(x0, y0, z)],
];
/** 2×2×h 盒子（x∈[1,3]）：底面矩形 + pushPull。 */
function boxKernel(h = 1): Kernel {
  const k = new Kernel();
  k.addEdges(rect(1, -1, 3, 1));
  const fid = k.faces()[0].id;
  k.pushPull(fid, h);
  return k;
}
function frames(sim: PlayerSim, input: InputFrame, seconds: number): void { for (let i = 0; i < Math.round(seconds / PHYS_DT); i++) sim.advance(input, PHYS_DT); }

describe("collision-world: 盒子六膜", () => {
  const k = boxKernel(1);
  const w = new KernelCollisionWorld(k);
  it("六膜入库；安全地板 = 0", () => {
    assert(w.faceCount() === 6, `faces=${w.faceCount()}`);
    assert(w.floorZ() === 0, "floor");
  });
  it("floorBelow：盒顶 1；盒外地板 0；从盒内（zTop 在顶下）看到的是底面 0", () => {
    assert(near(w.floorBelow(2, 0, 2, -1, 0.5)!, 1), "顶");
    assert(near(w.floorBelow(0, 0, 2, -1, 0.5)!, 0), "地板");
    assert(near(w.floorBelow(2, 0, 0.5, -1, 0.5)!, 0), "底面");
    assert(w.floorBelow(2, 0, 2, 1.5, 0.5) === null, "zMin 之上没有地");
  });
  it("pushOut：贴墙外侧 x=0.8 r=0.3 → 推 −x 0.1；盒子中央（空心）不推；穿墙 0.1 深推出到外侧", () => {
    const d = w.pushOut({ x: 0.8, y: 0, z: 0.5 }, 0.3)!;
    assert(near(d.x, -0.1) && near(d.y, 0) && near(d.z, 0), `d=${JSON.stringify(d)}`);
    assert(w.pushOut({ x: 2, y: 0, z: 0.5 }, 0.3) === null, "空心");
    const d2 = w.pushOut({ x: 1.1, y: 0, z: 0.5 }, 0.3)!;
    assert(near(d2.x, 0.2), `穿墙推出 d=${JSON.stringify(d2)}`);   // 球心已过墙 0.1：沿膜法向推到同侧 r
    // 顶面角点外斜上方：最近边推
    const d3 = w.pushOut({ x: 3.2, y: 0, z: 1.2 }, 0.3)!;
    assert(d3.x > 0 && d3.z > 0 && near(Math.hypot(d3.x, d3.z), 0.3 - Math.hypot(0.2, 0.2)), `边推 d=${JSON.stringify(d3)}`);
  });
  it("segmentHit：竖直向下先撞顶（t=0.5）；穿盒横线撞近墙；擦边不中", () => {
    const h = w.segmentHit({ x: 2, y: 0, z: 3 }, { x: 2, y: 0, z: -1 })!;
    assert(near(h.t, 0.5) && near(h.p.z, 1) && near(Math.abs(h.n.z), 1), `h=${JSON.stringify(h)}`);
    const h2 = w.segmentHit({ x: 0, y: 0, z: 0.5 }, { x: 4, y: 0, z: 0.5 })!;
    assert(near(h2.p.x, 1) && near(Math.abs(h2.n.x), 1), `h2=${JSON.stringify(h2)}`);
    assert(w.segmentHit({ x: 0, y: 2, z: 0.5 }, { x: 4, y: 2, z: 0.5 }) === null, "擦边");
  });
});

describe("collision-world: 含洞面 + 抬高模型", () => {
  it("回字抬到 z=2：删内岛后洞里探不到 2（落到安全地板）；环带上探到 2；floorZ 仍 0", () => {
    const k = new Kernel();
    k.addEdges(rect(-2, -2, 2, 2, 2));
    k.addEdges(rect(-0.5, -0.5, 0.5, 0.5, 2));
    assert(k.faces().length === 2, "回字两膜");
    const island = k.faces().find((f) => f.holes.length === 0)!;
    k.eraseFaces([island.id]);
    const w = new KernelCollisionWorld(k);
    assert(w.floorZ() === 0, "floorZ=min(0,2)=0");
    assert(near(w.floorBelow(0, 0, 3, -1, 0.5)!, 0), "洞里 → 地板");
    assert(near(w.floorBelow(1.5, 0, 3, -1, 0.5)!, 2), "环带 → 2");
    const h = w.segmentHit({ x: 0, y: 0, z: 3 }, { x: 0, y: 0, z: -1 })!;
    assert(near(h.p.z, 0), "洞里线段穿过去落地板");
  });
  it("模型有负 z：floorZ 仍是 0（user 2026-09-07 吃书：地板永远 z=0，地下室以后另想办法）", () => {
    const k = new Kernel();
    k.addEdges(rect(-1, -1, 1, 1, -3));
    const w = new KernelCollisionWorld(k);
    assert(w.floorZ() === 0, `floor=${w.floorZ()}`);
  });
});

describe("collision-world × player 端到端", () => {
  it("朝 +X 走进盒子被挡在 x = 1 − r；跳不上 1 m 盒；盒 0.6 高能跳上去", () => {
    const sim = new PlayerSim(new KernelCollisionWorld(boxKernel(1)));
    sim.state.heading = -Math.PI / 2;
    frames(sim, { ...emptyInput(), walkY: 1 }, 1.5);
    assert(near(sim.state.pos.x, 1 - DEFAULT_CONFIG.radius, 0.01) && near(sim.state.pos.z, 0, 1e-6), `pos=${JSON.stringify(sim.state.pos)}`);
    const sim2 = new PlayerSim(new KernelCollisionWorld(boxKernel(0.6)));
    sim2.state.heading = -Math.PI / 2; sim2.state.pos.x = 0.2;
    let onTop = false;
    for (let i = 0; i < 150; i++) { sim2.advance({ ...emptyInput(), walkY: 1, jump: i < 30 }, PHYS_DT); if (sim2.state.grounded && sim2.state.pos.z > 0.5 && sim2.state.pos.x > 1) onTop = true; }
    assert(onTop, `没上去 pos=${JSON.stringify(sim2.state.pos)}`);
  });
  it("teleport 直线档打盒顶 = 合法落点；打墙 = slope 不合法", () => {
    const sim = new PlayerSim(new KernelCollisionWorld(boxKernel(1)));
    sim.state.teleport.tier = 3;   // 直线
    const top = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 2, y: 0, z: -0.6 } };   // 过 (2,0,1) = 盒顶中心
    const n = Math.hypot(top.dir.x, top.dir.y, top.dir.z); top.dir = { x: top.dir.x / n, y: top.dir.y / n, z: top.dir.z / n };
    sim.advance({ ...emptyInput(), tpCharge: true, aim: top }, PHYS_DT);
    assert(sim.state.teleport.arc?.valid && near(sim.state.teleport.arc.hit!.p.z, 1), `arc=${JSON.stringify(sim.state.teleport.arc?.hit)} ${sim.state.teleport.arc?.reason}`);
    const wall = { origin: { x: 0, y: 0, z: 0.5 }, dir: { x: 1, y: 0, z: 0 } };
    sim.advance({ ...emptyInput(), tpCharge: true, aim: wall }, PHYS_DT);
    assert(sim.state.teleport.arc && !sim.state.teleport.arc.valid && sim.state.teleport.arc.reason === "slope", `reason=${sim.state.teleport.arc?.reason}`);
  });
});
