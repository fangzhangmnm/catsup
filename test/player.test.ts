// test/player.test.ts —— player 深模块 golden：步进/冲刺/snap turn/跳/挡墙/台阶/安全地板/noclip/freeze(coyote)/dpad/teleport。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）。世界替身 = 盒子世界（AABB + 无限地板），不碰内核。
import { describe, it, assert, eq } from "./runner.mjs";
import { DEFAULT_CONFIG, PlayerSim, createPlayerState, stepPlayer, fwdOf, PHYS_DT, type PlayerState } from "../src/player/player.ts";
import { Dpad, DoubleTap, HoldLatch, emptyInput, type InputFrame } from "../src/player/input.ts";
import { SPEED_TIERS, simulateArc, stepTeleport, initialTeleport, BACK_COOLDOWN, BACK_HOLD } from "../src/player/teleport.ts";
import { flatFloorWorld, type WorldQuery, type WorldHit } from "../src/player/world-query.ts";

// ---------- 盒子世界替身 ----------
interface Box { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; }
function boxWorld(boxes: Box[], floor = 0): WorldQuery {
  const inside = (b: Box, p: { x: number; y: number; z: number }): boolean => p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z;
  return {
    floorZ: () => floor,
    pushOut: (c, r) => {
      let out = { x: 0, y: 0, z: 0 }, any = false;
      for (const b of boxes) {
        if (inside(b, c)) {
          const cands = [
            { d: c.x - b.min.x, v: { x: -1, y: 0, z: 0 } }, { d: b.max.x - c.x, v: { x: 1, y: 0, z: 0 } },
            { d: c.y - b.min.y, v: { x: 0, y: -1, z: 0 } }, { d: b.max.y - c.y, v: { x: 0, y: 1, z: 0 } },
            { d: c.z - b.min.z, v: { x: 0, y: 0, z: -1 } }, { d: b.max.z - c.z, v: { x: 0, y: 0, z: 1 } },
          ].sort((p, q) => p.d - q.d)[0];
          out = { x: out.x + cands.v.x * (cands.d + r), y: out.y + cands.v.y * (cands.d + r), z: out.z + cands.v.z * (cands.d + r) };
          any = true; continue;
        }
        const q = { x: Math.max(b.min.x, Math.min(b.max.x, c.x)), y: Math.max(b.min.y, Math.min(b.max.y, c.y)), z: Math.max(b.min.z, Math.min(b.max.z, c.z)) };
        const dx = c.x - q.x, dy = c.y - q.y, dz = c.z - q.z;
        const d = Math.hypot(dx, dy, dz);
        if (d < r && d > 1e-12) { const k = (r - d) / d; out = { x: out.x + dx * k, y: out.y + dy * k, z: out.z + dz * k }; any = true; }
      }
      return any ? out : null;
    },
    floorBelow: (x, y, zTop, zMin) => {
      let best: number | null = floor >= zMin - 1e-9 && floor <= zTop + 1e-9 ? floor : null;
      for (const b of boxes) {
        if (x < b.min.x || x > b.max.x || y < b.min.y || y > b.max.y) continue;
        const z = b.max.z;
        if (z <= zTop + 1e-9 && z >= zMin - 1e-9 && (best === null || z > best)) best = z;
      }
      return best;
    },
    segmentHit: (a, b) => {
      let best: WorldHit | null = null;
      const consider = (h: WorldHit | null): void => { if (h && (!best || h.t < best.t)) best = h; };
      consider(flatFloorWorld(floor).segmentHit(a, b));
      const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      for (const bx of boxes) {
        let t0 = 0, t1 = 1, nEnter = { x: 0, y: 0, z: 0 };
        let ok = true;
        for (const ax of ["x", "y", "z"] as const) {
          const da = d[ax], oa = a[ax];
          if (Math.abs(da) < 1e-12) { if (oa < bx.min[ax] || oa > bx.max[ax]) { ok = false; break; } continue; }
          let ta = (bx.min[ax] - oa) / da, tb = (bx.max[ax] - oa) / da;
          let n = { x: 0, y: 0, z: 0 }; (n as { [k: string]: number })[ax] = -Math.sign(da);
          if (ta > tb) { [ta, tb] = [tb, ta]; }
          if (ta > t0) { t0 = ta; nEnter = n; }
          t1 = Math.min(t1, tb);
          if (t0 > t1) { ok = false; break; }
        }
        if (ok && t0 > 0) consider({ p: { x: a.x + d.x * t0, y: a.y + d.y * t0, z: a.z + d.z * t0 }, n: nEnter, t: t0 });
      }
      return best;
    },
  };
}

const near = (a: number, b: number, tol = 1e-3): boolean => Math.abs(a - b) <= tol;
function run(st: PlayerState, world: WorldQuery, input: InputFrame, seconds: number): void {
  const n = Math.round(seconds / PHYS_DT);
  for (let i = 0; i < n; i++) stepPlayer(st, input, PHYS_DT, world, DEFAULT_CONFIG);
}
const cfg = DEFAULT_CONFIG;
/** PlayerSim 按 60 Hz 帧推进 seconds 秒（advance 单帧最多 8 步，不能拿大 dt 当秒数）。 */
function simFrames(s: PlayerSim, input: InputFrame, seconds: number): void { for (let i = 0; i < Math.round(seconds / PHYS_DT); i++) s.advance(input, PHYS_DT); }

describe("player: 步行", () => {
  it("W 一秒 = walkSpeed 米，沿 heading 前向 (+Y)", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    run(st, w, { ...emptyInput(), walkY: 1 }, 1);
    assert(near(st.pos.y, cfg.walkSpeed, 1e-6) && near(st.pos.x, 0, 1e-9), `pos=${JSON.stringify(st.pos)}`);
    assert(st.grounded && near(st.pos.z, 0, 1e-9), "在地上");
  });
  it("斜向不比正向快；Shift 冲刺 = dashSpeed", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    run(st, w, { ...emptyInput(), walkX: 1, walkY: 1 }, 1);
    assert(near(Math.hypot(st.pos.x, st.pos.y), cfg.walkSpeed, 1e-6), "斜向归一化");
    const st2 = createPlayerState();
    run(st2, w, { ...emptyInput(), walkY: 1, dash: true }, 1);
    assert(near(st2.pos.y, cfg.dashSpeed, 1e-6), "冲刺");
  });
  it("snap turn +1 = 逆时针 45°，之后 W 沿新前向", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    stepPlayer(st, { ...emptyInput(), turn: 1 }, PHYS_DT, w, cfg);
    assert(near(st.heading, Math.PI / 4, 1e-12), "heading 45°");
    run(st, w, { ...emptyInput(), walkY: 1 }, 1);
    const f = fwdOf(Math.PI / 4);
    assert(near(st.pos.x, f.x * cfg.walkSpeed, 1e-6) && near(st.pos.y, f.y * cfg.walkSpeed, 1e-6), `pos=${JSON.stringify(st.pos)}`);
  });
  it("头朝哪走哪：HMD 前向偏 90°（朝 −X）时 W 往 −X 走", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    const inp = { ...emptyInput(), walkY: 1 }; inp.head = { ...inp.head, fwdLocal: { x: -1, y: 0, z: 0 } };
    run(st, w, inp, 1);
    assert(near(st.pos.x, -cfg.walkSpeed, 1e-6) && near(st.pos.y, 0, 1e-9), `pos=${JSON.stringify(st.pos)}`);
  });
});

describe("player: 竖直", () => {
  it("跳：顶点 ≈ v²/2g（持键 gravityHeld），落回地面 grounded", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    let apex = 0;
    // 持键到顶点（吃 gravityHeld）再松（否则悬挂在离地 stickDown 内就判 grounded、按住会立刻再跳）
    for (let i = 0; i < 120; i++) { stepPlayer(st, { ...emptyInput(), jump: st.velZ >= 0 && i < 30 }, PHYS_DT, w, cfg); apex = Math.max(apex, st.pos.z); }
    const expect = (cfg.jumpVel * cfg.jumpVel) / (2 * cfg.gravityHeld);   // 解析值；半隐式欧拉在 dt=1/60 下低 ~5%
    assert(near(apex, expect, 0.08), `apex=${apex} expect≈${expect}`);
    run(st, w, emptyInput(), 2);
    assert(st.grounded && near(st.pos.z, 0, 1e-6), "落地");
  });
  it("安全地板 = floorZ：从 3 m 掉到 −2 m 地板停住", () => {
    const st = createPlayerState(); const w = flatFloorWorld(-2);
    st.pos.z = 3; st.grounded = false;
    run(st, w, emptyInput(), 3);
    assert(near(st.pos.z, -2, 1e-6) && st.grounded, `z=${st.pos.z}`);
  });
  it("noclip：无重力，up/down 竖直飞，W 水平飞不跟头俯仰（Minecraft 约定）", () => {
    const st = createPlayerState(); st.noclip = true; st.pos.z = 5;
    const w = flatFloorWorld();
    run(st, w, { ...emptyInput(), up: true }, 1);
    assert(near(st.pos.z, 5 + cfg.flySpeed, 1e-6), `z=${st.pos.z}`);
    const inp = { ...emptyInput(), walkY: 1 }; inp.head = { ...inp.head, fwdLocal: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } };
    run(st, w, inp, 1);
    // 低头 45° 往前推：水平走满 flySpeed，高度不变
    assert(near(st.pos.y, cfg.flySpeed, 1e-6) && near(st.pos.z, 5 + cfg.flySpeed, 1e-6), `pos=${JSON.stringify(st.pos)}`);
  });
  it("双击跳 = noclip 开关：开 → 悬停不落；关 → 重力接管落地", () => {
    const st = createPlayerState(); st.pos.z = 3; st.grounded = false;
    const w = flatFloorWorld();
    stepPlayer(st, { ...emptyInput(), noclipToggle: true }, PHYS_DT, w, cfg);
    assert(st.noclip, "toggle on");
    run(st, w, emptyInput(), 1);
    assert(near(st.pos.z, 3, 0.01), `hover z=${st.pos.z}`);
    stepPlayer(st, { ...emptyInput(), noclipToggle: true }, PHYS_DT, w, cfg);
    assert(!st.noclip, "toggle off");
    run(st, w, emptyInput(), 3);
    assert(near(st.pos.z, 0, 1e-6) && st.grounded, `landed z=${st.pos.z}`);
  });
  it("DoubleTap：两次按下 ≤0.35 s 触发一次；慢按不触发；第三次重新计", () => {
    const d = new DoubleTap();
    eq(d.update(true, 0), false); eq(d.update(false, 0.05), false);
    eq(d.update(true, 0.2), true);                       // 第二击
    eq(d.update(false, 0.25), false);
    eq(d.update(true, 0.4), false);                      // 触发后重新计：这是新的第一击
    eq(d.update(false, 0.45), false);
    eq(d.update(true, 1.0), false);                      // 隔太久
    eq(d.update(false, 1.05), false);
    eq(d.update(true, 1.2), true);
  });
});

describe("player: 碰撞", () => {
  const wall = { min: { x: 1, y: -5, z: 0 }, max: { x: 2, y: 5, z: 3 } };
  it("撞墙静默停：走向 +X 的墙被挡在 x = 1 − r", () => {
    const st = createPlayerState(); st.heading = -Math.PI / 2;   // 前向 +X
    const w = boxWorld([wall]);
    run(st, w, { ...emptyInput(), walkY: 1 }, 1.5);
    assert(near(st.pos.x, 1 - cfg.radius, 0.01) && near(st.pos.y, 0, 1e-6), `pos=${JSON.stringify(st.pos)}`);
  });
  it("台阶 0.25 < stepHeight：走上去，脚跟着地面缓动升高", () => {
    const st = createPlayerState(); st.heading = -Math.PI / 2;
    const step = { min: { x: 1, y: -5, z: 0 }, max: { x: 3, y: 5, z: 0.25 } };
    run(st, boxWorld([step]), { ...emptyInput(), walkY: 1 }, 1);
    assert(st.pos.x > 1.5 && near(st.pos.z, 0.25, 0.01) && st.grounded, `pos=${JSON.stringify(st.pos)}`);
  });
  it("矮箱 0.6：直走被挡；跳+走能上去；走出边缘掉回地面", () => {
    const box = { min: { x: 1, y: -5, z: 0 }, max: { x: 2.5, y: 5, z: 0.6 } };
    const w = boxWorld([box]);
    const st = createPlayerState(); st.heading = -Math.PI / 2;
    run(st, w, { ...emptyInput(), walkY: 1 }, 1);
    assert(st.pos.x < 1, "被挡");
    // 后退一点起跳
    st.pos.x = 0.2;
    let onTop = false;
    const inp = { ...emptyInput(), walkY: 1, jump: true };
    for (let i = 0; i < 120; i++) { stepPlayer(st, inp, PHYS_DT, w, cfg); if (st.grounded && st.pos.z > 0.5 && st.pos.x > 1) onTop = true; }
    assert(onTop, `没上去 pos=${JSON.stringify(st.pos)}`);
    run(st, w, { ...emptyInput(), walkY: 1 }, 1.5);
    assert(st.pos.x > 2.5 && near(st.pos.z, 0, 0.01), `没掉回地面 pos=${JSON.stringify(st.pos)}`);
  });
  it("蹲：Ctrl 让头高降到 height − crouchDrop；净空不够时头上不去", () => {
    const st = createPlayerState(); const w = flatFloorWorld();
    run(st, w, { ...emptyInput(), crouch: true }, 1);
    assert(near(st.headZ, cfg.height - cfg.crouchDrop, 0.01), `headZ=${st.headZ}`);
    // 头顶 1.3 m 处一块板：站起来被钳在板下
    const slab = { min: { x: -5, y: -5, z: 1.3 }, max: { x: 5, y: 5, z: 1.4 } };
    run(st, boxWorld([slab]), emptyInput(), 1);
    assert(st.headZ < 1.3 && st.headZ > 1.0, `headZ=${st.headZ}`);
  });
});

describe("player: freeze / coyote", () => {
  it("冻结期悬在半空不掉；解冻后才掉", () => {
    const sim = new PlayerSim(flatFloorWorld());
    sim.state.pos.z = 2; sim.state.grounded = false;
    sim.freeze("gesture");
    simFrames(sim, emptyInput(), 0.5);
    assert(near(sim.state.pos.z, 2, 1e-9), "冻结不掉");
    sim.thaw("gesture");
    simFrames(sim, emptyInput(), 1);
    assert(near(sim.state.pos.z, 0, 1e-3), "解冻后落地（悬挂一阶缓动，指数收敛）");
  });
  it("多来源计数：两票冻结，退一票仍冻", () => {
    const sim = new PlayerSim(flatFloorWorld());
    sim.freeze("a"); sim.freeze("b"); sim.thaw("a");
    assert(sim.isFrozen(), "仍冻"); sim.thaw("b"); assert(!sim.isFrozen(), "解冻");
  });
  it("冻结期主动步行照常（带碰撞），roomscale 照常跟头", () => {
    const wall = { min: { x: 1, y: -5, z: 0 }, max: { x: 2, y: 5, z: 3 } };
    const sim = new PlayerSim(boxWorld([wall]));
    sim.state.heading = -Math.PI / 2;
    sim.freeze("g");
    simFrames(sim, { ...emptyInput(), walkY: 1 }, 1);
    assert(near(sim.state.pos.x, 1 - cfg.radius, 0.01), `走到墙边 x=${sim.state.pos.x}`);
    const sim2 = new PlayerSim(flatFloorWorld()); sim2.freeze("g");
    const inp = emptyInput(); inp.head = { ...inp.head, local: { x: 0, y: 0.3, z: 1.7 } };   // 头往前挪 0.3
    sim2.advance(inp, 0.1);
    assert(near(sim2.state.pos.y, 0.3, 1e-6) && near(sim2.state.trackingOrigin.y, 0.3, 1e-6), "身体跟头、重锚");
  });
  it("脚下画了板子：冻结期不动；解冻后连续滑出（每步 ≤ passivePushCap），最终站上板", () => {
    // 玩家站在原点，手势中脚下出现 1 m 厚板（腹球/中球/顶球都被埋）
    const slab = { min: { x: -5, y: -5, z: 0 }, max: { x: 5, y: 5, z: 1.0 } };
    const sim = new PlayerSim(boxWorld([slab]));
    sim.freeze("gesture");
    simFrames(sim, emptyInput(), 0.5);
    assert(near(sim.state.pos.z, 0, 1e-9), "冻结期不动");
    sim.thaw("gesture");
    let maxStep = 0, prevZ = sim.state.pos.z;
    for (let i = 0; i < 90; i++) {
      sim.advance(emptyInput(), PHYS_DT);
      maxStep = Math.max(maxStep, Math.abs(sim.state.pos.z - prevZ)); prevZ = sim.state.pos.z;
    }
    assert(maxStep <= cfg.passivePushCap + 0.08, `单步跳 ${maxStep} 超过护栏（去穿透 ≤ cap；出来后贴地缓动 ≤ 0.3·a）`);
    assert(near(sim.state.pos.z, 1.0, 0.02) && sim.state.grounded, `没站上板 z=${sim.state.pos.z}`);
  });
  it("冻结期 teleport 不结算；跳不起", () => {
    const sim = new PlayerSim(flatFloorWorld()); sim.freeze("g");
    const aim = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } };
    sim.advance({ ...emptyInput(), tpCharge: true, aim }, 0.2);
    sim.advance({ ...emptyInput(), aim }, 0.2);
    assert(near(sim.state.pos.y, 0, 1e-9), "没跳走");
    sim.advance({ ...emptyInput(), jump: true }, 0.2);
    assert(near(sim.state.pos.z, 0, 1e-9), "跳不起");
  });
});

describe("input: dpad / hold", () => {
  it("幅值 <0.6 无；上推 0.8 = up；转到 47° 不串轴（先 none）；右推 = right；磁滞 0.4 保持", () => {
    const d = new Dpad();
    eq(d.update(0, 0.5), "none");
    eq(d.update(0, 0.8), "up");
    eq(d.update(0.3, 0.75), "up");            // 22° 内保持
    eq(d.update(0.62, 0.45), "none");         // 54°：出保持区，且不在 right 的 30° 扇区
    eq(d.update(0.8, 0.1), "right");
    eq(d.update(0.45, 0.05), "right");        // 幅值 0.45 ≥ EXIT 保持
    eq(d.update(0.3, 0), "none");
  });
  it("HoldLatch：保持 ≥ 0.15 s 触发一次，松开重置", () => {
    const h = new HoldLatch(0.15);
    let fired = 0;
    for (let i = 0; i < 20; i++) if (h.update(true, 0.02)) fired++;
    eq(fired, 1);
    h.update(false, 0.02);
    for (let i = 0; i < 20; i++) if (h.update(true, 0.02)) fired++;
    eq(fired, 2);
  });
});

describe("teleport: 抛射体", () => {
  const ok = { minNz: Math.cos((50 * Math.PI) / 180), headroomOk: () => true };
  it("45° 下抛 v0=8 从 1.6 m：落点距离 = 解析解（±5 cm）", () => {
    const w = flatFloorWorld();
    const aim = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } };
    const r = simulateArc(w, aim, 8, ok);
    assert(r.valid && r.hit, `valid=${r.valid} reason=${r.reason}`);
    // z(t)=1.6 − 8·√½ t − 4.9 t² = 0 → t；y = 8·√½·t
    const vz = -8 * Math.SQRT1_2, vy = 8 * Math.SQRT1_2;
    const t = (vz + Math.sqrt(vz * vz + 4 * 4.9 * 1.6)) / (-2 * 4.9) * -1;   // 正根
    const tPos = (-vz - Math.sqrt(vz * vz + 2 * 9.8 * 1.6)) / -9.8;
    void t;
    assert(near(r.hit!.p.y, vy * tPos, 0.05), `y=${r.hit!.p.y} expect=${vy * tPos}`);
  });
  it("上抛也会回落到地；顶档直线落在射线命中处；瞄天直线 = 无落点取消", () => {
    const w = flatFloorWorld();
    const up = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 } };
    assert(simulateArc(w, up, 8, ok).valid, "上抛回落");
    const line = simulateArc(w, { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } }, Infinity, ok);
    assert(line.valid && near(line.hit!.p.y, 1.6, 1e-6), `直线落点 y=${line.hit?.p.y}`);
    const sky = simulateArc(w, up, Infinity, ok);
    assert(!sky.valid && sky.reason === "no-hit", "瞄天取消");
  });
  it("落在墙上 = 不合法（slope）；净空不够 = 不合法（headroom）", () => {
    const wall = { min: { x: -5, y: 2, z: 0 }, max: { x: 5, y: 3, z: 3 } };
    const w = boxWorld([wall]);
    const aim = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: 1, z: 0 } };
    const r = simulateArc(w, aim, Infinity, ok);
    assert(!r.valid && r.reason === "slope", `reason=${r.reason}`);
    const r2 = simulateArc(flatFloorWorld(), { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } }, 8, { ...ok, headroomOk: () => false });
    assert(!r2.valid && r2.reason === "headroom", "净空");
  });
  it("v0 随 √scale：scale 4 → 落点距离 ×4", () => {
    const w = flatFloorWorld();
    const aim = { origin: { x: 0, y: 0, z: 1 }, dir: { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 } };
    const range = (v: number): number => { const vy = v * Math.SQRT1_2, vz = v * Math.SQRT1_2; const t = (vz + Math.sqrt(vz * vz + 2 * 9.8 * 1)) / 9.8; return vy * t; };
    const a = simulateArc(w, aim, 8, ok), b = simulateArc(w, aim, 8 * Math.sqrt(4), ok);
    assert(near(a.hit!.p.y, range(8), 0.05) && near(b.hit!.p.y, range(16), 0.1), `a=${a.hit!.p.y}/${range(8)} b=${b.hit!.p.y}/${range(16)}`);
  });
});

describe("teleport: 手势状态机", () => {
  const w = flatFloorWorld();
  const aim = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } };
  const opts = { minNz: 0.5, headroomOk: () => true, v0Scale: 1 };
  it("充能→松手=跳；档位/朝向边沿在充能中生效；落地后 300 ms 内后拉忽略；之后后拉保持 150 ms 回上一点；再拉又跳回", () => {
    const st = initialTeleport(); let now = 0; const dt = 0.01;
    const tick = (inp: Partial<Parameters<typeof stepTeleport>[1]>) => { now += dt; return stepTeleport(st, { tpCharge: false, tpBack: false, tierStep: 0, yawStep: 0, aim, ...inp }, now, dt, w, opts); };
    eq(tick({ tpCharge: true }).kind, "none"); assert(st.charging && st.arc?.valid, "充能中弧线合法");
    tick({ tpCharge: true, tierStep: 1 }); eq(st.tier, 2);
    tick({ tpCharge: true, yawStep: 1 }); tick({ tpCharge: true, yawStep: 1 });
    const jump = tick({});
    assert(jump.kind === "jump" && near(jump.headingDelta, Math.PI / 2, 1e-12), `jump=${JSON.stringify(jump)}`);
    eq(st.tier, 2, "档位跨次记忆");
    // 模拟 player 登记 last
    st.last = { pos: { x: 0, y: 0, z: 0 }, heading: 0 };
    // 弹簧回中过冲：后拉 0.25 s 内
    let backs = 0;
    for (let i = 0; i < 20; i++) if (tick({ tpBack: true }).kind === "back") backs++;
    eq(backs, 0, "冷却内忽略");
    tick({}); now += BACK_COOLDOWN;
    for (let i = 0; i < Math.round(BACK_HOLD / dt) - 2; i++) if (tick({ tpBack: true }).kind === "back") backs++;
    eq(backs, 0, "保持不够不触发");
    for (let i = 0; i < 5; i++) if (tick({ tpBack: true }).kind === "back") backs++;
    eq(backs, 1, "保持够了触发一次");
    for (let i = 0; i < 30; i++) if (tick({ tpBack: true }).kind === "back") backs++;
    eq(backs, 1, "按住不重复触发");
  });
  it("充能中后拉 = 取消（不跳）；瞄天松手 = 取消", () => {
    const st = initialTeleport(); let now = 0;
    const tick = (inp: Partial<Parameters<typeof stepTeleport>[1]>) => { now += 0.01; return stepTeleport(st, { tpCharge: false, tpBack: false, tierStep: 0, yawStep: 0, aim, ...inp }, now, 0.01, w, opts); };
    tick({ tpCharge: true }); tick({ tpCharge: true, tpBack: true });
    assert(!st.charging && st.arc === null, "取消");
    eq(tick({}).kind, "none");
    const sky = { origin: aim.origin, dir: { x: 0, y: 0, z: 1 } };
    st.tier = SPEED_TIERS.length - 1;
    tick({ tpCharge: true, aim: sky }); assert(st.arc && !st.arc.valid, "红弧");
    eq(tick({ aim: sky }).kind, "none");
  });
  it("PlayerSim 端到端：跳过去朝向变了、头重锚；回上一点恢复", () => {
    const sim = new PlayerSim(flatFloorWorld());
    const a = { ...emptyInput(), tpCharge: true, aim };
    sim.advance(a, 0.1);
    sim.advance({ ...a, yawStep: 1 }, PHYS_DT);
    sim.advance({ ...emptyInput(), aim }, PHYS_DT);
    assert(sim.state.pos.y > 1 && near(sim.state.heading, Math.PI / 4, 1e-9), `pos=${JSON.stringify(sim.state.pos)} h=${sim.state.heading}`);
    const p = sim.pose();
    assert(near(p.headWorld.x, sim.state.pos.x, 1e-9) && near(p.headWorld.y, sim.state.pos.y, 1e-9), "跳后头在身上");
    simFrames(sim, emptyInput(), 0.4);
    simFrames(sim, { ...emptyInput(), tpBack: true }, 0.3);
    assert(near(sim.state.pos.y, 0, 1e-9) && near(sim.state.heading, 0, 1e-12), `回上一点 pos=${JSON.stringify(sim.state.pos)}`);
  });
});

describe("PlayerSim: 插值与边沿", () => {
  it("一帧多步只吃一次 turn；半步时 pose 插值在 prev/cur 之间", () => {
    const sim = new PlayerSim(flatFloorWorld());
    sim.advance({ ...emptyInput(), turn: 1 }, 3 * PHYS_DT);
    assert(near(sim.state.heading, Math.PI / 4, 1e-12), `heading=${sim.state.heading}`);
    const sim2 = new PlayerSim(flatFloorWorld());
    sim2.advance({ ...emptyInput(), walkY: 1 }, 1.5 * PHYS_DT);
    const p = sim2.pose();
    const step = cfg.walkSpeed * PHYS_DT;
    // Gaffer 插值：渲染落后 ≤ 1 步——一步走完(acc 剩 0.5dt) 渲染 lerp(prev=0, cur=step, 0.5)
    assert(near(p.origin.y, 0.5 * step, 1e-9), `y=${p.origin.y} expect=${0.5 * step}`);
  });
  it("teleport 那帧不插值（prev=cur）", () => {
    const sim = new PlayerSim(flatFloorWorld());
    const aim = { origin: { x: 0, y: 0, z: 1.6 }, dir: { x: 0, y: Math.SQRT1_2, z: -Math.SQRT1_2 } };
    sim.advance({ ...emptyInput(), tpCharge: true, aim }, 0.1);
    sim.advance({ ...emptyInput(), aim }, 1.5 * PHYS_DT);
    assert(near(sim.pose().origin.y, sim.state.pos.y, 1e-9), "落点即渲染点");
  });
});
