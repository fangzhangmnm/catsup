// test/xr-frames.test.ts —— XR 姿态代数（参考系 Y 上 → rig Z 上 → 世界）+ XRPointerFrame 与求解器的对接。
// created 2026-09-07 by Claude Fable 5.1
import { describe, it, assert } from "./runner.mjs";
import { refToRig, forwardRig, poseRayWorld, headFrameOf, rotateByQuat, XRInput } from "../src/player/xr-input.ts";
import { XRPointerFrame, XR_VIRTUAL_VP } from "../src/editor/xr-pointer-frame.ts";
import { rigPose, createPlayerState } from "../src/player/player.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { snapPoint, NO_HAND } from "../src/editor/solver.ts";
import { GROUND } from "../src/editor/pick.ts";

const near = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol;
const nearV = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, tol = 1e-9): boolean => near(a.x, b.x, tol) && near(a.y, b.y, tol) && near(a.z, b.z, tol);
const ident = { x: 0, y: 0, z: 0, w: 1 };
const yaw = (deg: number) => { const h = (deg * Math.PI) / 360; return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) }; };   // 绕参考系 Y

describe("xr-input: 姿态代数", () => {
  it("参考系 (x,y,z) → rig (x,−z,y)：头在 1.6 m 高、前向 −Z → rig 前向 +y", () => {
    assert(nearV(refToRig({ x: 0.2, y: 1.6, z: -0.5 }), { x: 0.2, y: 0.5, z: 1.6 }), "点");
    assert(nearV(forwardRig(ident), { x: 0, y: 1, z: 0 }), "前向");
    // 参考系绕 Y 转 +90°（左转）：前向 −Z → −X（左）；rig 里 = (−1,0,0)
    assert(nearV(forwardRig(yaw(90)), { x: -1, y: 0, z: 0 }, 1e-9), `左转 ${JSON.stringify(forwardRig(yaw(90)))}`);
    assert(nearV(rotateByQuat(yaw(90), { x: 1, y: 0, z: 0 }), { x: 0, y: 0, z: -1 }, 1e-9), "右向转成 −Z");
  });
  it("世界射线：heading 90°（面向 −X）时参考系前向 −Z → 世界 −X；rig 原点平移生效", () => {
    const st = createPlayerState(); st.heading = Math.PI / 2; st.pos = { x: 3, y: 4, z: 0 };
    const rig = rigPose(st, { x: 0, y: 0, z: 1.6 });
    const r = poseRayWorld({ position: { x: 0, y: 1.6, z: 0 }, orientation: ident }, rig);
    assert(nearV(r.origin, { x: 3, y: 4, z: 1.6 }) && nearV(r.dir, { x: -1, y: 0, z: 0 }), `ray=${JSON.stringify(r)}`);
    const h = headFrameOf({ position: { x: 0, y: 1.6, z: 0 }, orientation: yaw(-90) });   // 右转 90°
    assert(nearV(h.fwdLocal, { x: 1, y: 0, z: 0 }, 1e-9), "头右转 → rig 局部 +x");
  });
  it("XRInput.read：右摇杆前推=充能、左右=snap 边沿一次；充能中左摇杆上=档位边沿", () => {
    const xr = new XRInput();
    const rig = rigPose(createPlayerState(), { x: 0, y: 0, z: 1.6 });
    const mk = (l: number[], r: number[], lb: boolean[] = [], rb: boolean[] = []) => {
      const src = (hand: "left" | "right", axes: number[], btns: boolean[]) => ({
        handedness: hand, targetRayMode: "tracked-pointer", targetRaySpace: {} as XRSpace, profiles: [],
        gamepad: { axes, buttons: [0, 1, 2, 3, 4, 5].map((i) => ({ pressed: !!btns[i], touched: false, value: btns[i] ? 1 : 0 })), mapping: "xr-standard" },
      }) as unknown as XRInputSource;
      const session = { inputSources: [src("left", l, lb), src("right", r, rb)] } as unknown as XRSession;
      const frame = { getViewerPose: () => ({ transform: { position: { x: 0, y: 1.6, z: 0 }, orientation: ident } }), getPose: () => ({ transform: { position: { x: 0.2, y: 1.2, z: -0.1 }, orientation: ident } }) } as unknown as XRFrame;
      return xr.read(session, frame, {} as XRReferenceSpace, rig, false);
    };
    let f = mk([0, 0, 0, 0], [0, 0, 0.9, 0]);   // 右摇杆 x=0.9 → 右 → turn −1（一次）
    assert(f.input.turn === -1, "snap right edge");
    f = mk([0, 0, 0, 0], [0, 0, 0.9, 0]);
    assert(f.input.turn === 0, "保持不重复");
    f = mk([0, 0, 0, 0], [0, 0, 0, -0.9]);      // 前推（y 负）→ 充能
    assert(f.input.tpCharge && f.input.aim && near(f.input.aim.origin.z, 1.2), `charge aim=${JSON.stringify(f.input.aim)}`);
    f = mk([0, 0, 0, -0.9], [0, 0, 0, -0.9]);   // 充能中左摇杆前推 → tierStep +1，且不走
    assert(f.input.tierStep === 1 && f.input.walkY === 0, `tier=${f.input.tierStep} walkY=${f.input.walkY}`);
    f = mk([0, 0, 0, -0.9], [0, 0, 0, 0]);      // 松开右摇杆 → 左摇杆恢复走
    assert(!f.input.tpCharge && near(f.input.walkY, 0.9), "走");
    f = mk([0, 0, 0, 0], [0, 0, 0, 0], [], [false, false, false, false, true]);   // 右 A → 跳
    assert(f.input.jump, "A 跳");
    f = mk([0, 0, 0, 0], [0, 0, 0, 0], [false, false, false, false, true]);       // 左 X → 撤销边沿
    assert(f.undoEdge, "X 撤销");
    assert(near(f.input.head.local.z, 1.6) && nearV(f.input.head.fwdLocal, { x: 0, y: 1, z: 0 }), "头帧");
  });
});

describe("XRPointerFrame: 控制器射线当指针", () => {
  it("光标在虚拟屏正中；ray(中心) = 控制器射线；angularPx 与 ray 往返一致；viewDir 指向控制器", () => {
    const pf = new XRPointerFrame();
    pf.set({ origin: { x: 0, y: 0, z: 1.2 }, dir: { x: 0, y: 1, z: -0.3 } });
    const c = pf.cursor();
    const r = pf.ray(c.x, c.y, XR_VIRTUAL_VP);
    assert(nearV(r.dir, pf.forward()), "中心射线");
    const p = { x: 0.5, y: 3, z: 0.4 };
    const s = pf.angularPx(p, XR_VIRTUAL_VP);
    const r2 = pf.ray(s.x, s.y, XR_VIRTUAL_VP);
    // 往返：ray(angularPx(p)) 应指向 p
    const d = { x: p.x - r2.origin.x, y: p.y - r2.origin.y, z: p.z - r2.origin.z };
    const n = Math.hypot(d.x, d.y, d.z);
    assert(nearV(r2.dir, { x: d.x / n, y: d.y / n, z: d.z / n }, 1e-9), `往返 ${JSON.stringify(r2.dir)}`);
    assert(nearV(pf.viewDir(p), { x: -d.x / n, y: -d.y / n, z: -d.z / n }, 1e-9), "viewDir");
  });
  it("求解器吃 XR 帧：射线打在地面矩形角点 1° 内 → 吸到端点", () => {
    const k = new Kernel();
    k.addEdges([[{ x: 0, y: 2 }, { x: 1, y: 2 }], [{ x: 1, y: 2 }, { x: 1, y: 3 }], [{ x: 1, y: 3 }, { x: 0, y: 3 }], [{ x: 0, y: 3 }, { x: 0, y: 2 }]]);
    const pf = new XRPointerFrame();
    const origin = { x: 0.3, y: 0, z: 1.3 };
    const target = { x: 1, y: 2, z: 0 };
    const d0 = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };
    // 偏 0.6°（在 10px≈1° 的端点 ε 内）
    const ang = (0.6 * Math.PI) / 180;
    const dir = { x: d0.x * Math.cos(ang) - d0.y * Math.sin(ang), y: d0.x * Math.sin(ang) + d0.y * Math.cos(ang), z: d0.z };
    pf.set({ origin, dir });
    const c = pf.cursor();
    const sn = snapPoint(k, pf, XR_VIRTUAL_VP, c.x, c.y, 8, { plane: GROUND, hand: NO_HAND });
    assert(sn.kind === "endpoint" && nearV(sn.p, target, 1e-6), `snap=${JSON.stringify(sn)}`);
    // travelPx：射线转过的夹角 / fov × 800（绕 Z 转 8° 的倾斜射线夹角 < 8°，按向量夹角算期望）
    pf.markDown();
    const a8 = (8 * Math.PI) / 180;
    const d1 = { x: d0.x * Math.cos(a8) - d0.y * Math.sin(a8), y: d0.x * Math.sin(a8) + d0.y * Math.cos(a8), z: d0.z };
    pf.set({ origin, dir: d1 });
    const n0 = Math.hypot(dir.x, dir.y, dir.z), n1 = Math.hypot(d1.x, d1.y, d1.z);
    const expect = (Math.acos((dir.x * d1.x + dir.y * d1.y + dir.z * d1.z) / (n0 * n1)) / pf.fovY) * 800;
    assert(near(pf.travelPx(), expect, 1e-6), `travel=${pf.travelPx()} expect=${expect}`);
  });
});
