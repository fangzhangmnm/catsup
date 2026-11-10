// PerspComponent 行为锁（T4d：docTransform persp 信封退役 → 组件 record 同 step 还原）。
// 守的契约：
//   - remapForDocTransform = token 记账写：doc 几何 undo 时透视随同一 step 还原（ADR-0006 实测
//     的「undo 不同步还原 = 透视静默错位」在 v2 下结构性修复）；
//   - 与 layerTiles/layerTree 同 token → 一个 step 多 entry，undo/redo 两账同向翻；
//   - 无 VP（remap no-op）→ 不占 entry；无令牌 remap → throw（令牌墙）；
//   - v0.8.29：VP 编辑器也进记账面（user 2026-08-10「拖一次可以undo一次」——commitPreApplied
//     每拖一步；旧「VP setting 不进 undo history」收窄 supersede）。
import { describe, it, assert, eq } from "./runner.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";

const _ctxs = [];
// 迷你 desk host：形状对齐 workbench-state 的 persp 结构（组件零结构知识，remap 由 host 实现）
function mkHost() {
  let g = { lockHorizon: true, p1: { vp1: { x: 100.5, y: 50.5 } }, p2: { vp1: null, vp2: null } };
  return {
    read: () => g,
    snapshot: () => JSON.parse(JSON.stringify(g)),
    restore: (s) => { g = JSON.parse(JSON.stringify(s)); },
    remap: (f, opts) => {
      if (g.p1.vp1) g.p1.vp1 = f(g.p1.vp1);
      if (opts?.unlockHorizon && g.p2.vp1) g.lockHorizon = false;
    },
  };
}
function mk() {
  const stack = new UndoStack({ maxQuotaBytes: 1 << 20 });
  const host = mkHost();
  const wp2 = new PaintingWorkpiece({ undo: stack, tree: { width: 32, height: 32 }, persp: host });
  _ctxs.push({ stack, wp2 });
  return { wp2, stack, host, persp: wp2.persp };
}

describe("persp-component · doc 变换 remap 记账", () => {
  it("remap 与像素写同 token → 一步；undo 透视随 step 还原、redo 再映射", () => {
    const { wp2, stack, host, persp } = mk();
    const t = wp2.begin("docTransform");
    wp2.layerTiles.putRegion(1, 0, 0, 1, 1, new Uint8ClampedArray([9, 9, 9, 255]));   // 同 step 的像素账
    persp.remapForDocTransform((p) => ({ x: p.x - 10, y: p.y }));   // 模拟裁剪平移
    t.commit();
    eq(stack.depth(), 1, "一个 step 两 entry");
    eq(host.read().p1.vp1.x, 90.5, "VP 已映射");
    stack.undo();
    eq(host.read().p1.vp1.x, 100.5, "undo：透视随 step 还原（信封退役后的结构性保证）");
    stack.redo();
    eq(host.read().p1.vp1.x, 90.5, "redo：再映射");
    stack.undo();
    eq(host.read().p1.vp1.x, 100.5, "二次往返无衰减");
  });

  it("undo 盖回整包快照：remap 之后的 desk 直写被一并还原（与旧信封 wholesale 行为一致）", () => {
    const { wp2, stack, host, persp } = mk();
    const t = wp2.begin("docTransform");
    persp.remapForDocTransform((p) => ({ x: p.x + 5, y: p.y }));
    t.commit();
    host.read().p1.vp1 = { x: 999.5, y: 1.5 };   // VP 编辑器 desk 直写（不进栈）
    stack.undo();
    eq(host.read().p1.vp1.x, 100.5, "undo 盖回 before 快照（直写被清——旧信封同款语义）");
  });

  it("无 VP（remap 净 no-op）→ 不占 entry；同 token 其他组件照常成步", () => {
    const { wp2, stack, host, persp } = mk();
    host.restore({ lockHorizon: true, p1: { vp1: null }, p2: { vp1: null, vp2: null } });
    const t = wp2.begin("docTransform");
    wp2.layerTiles.putRegion(1, 0, 0, 1, 1, new Uint8ClampedArray([9, 9, 9, 255]));
    persp.remapForDocTransform((p) => ({ x: p.x + 5, y: p.y }));
    t.commit();
    eq(stack.depth(), 1, "像素账成步");
    stack.undo();
    eq(host.read().p1.vp1, null, "persp 无 entry、无副作用");
  });

  it("token cancel → remap 无痕回滚；无令牌 remap → throw（令牌墙）", () => {
    const { wp2, stack, host, persp } = mk();
    const t = wp2.begin("docTransform");
    persp.remapForDocTransform((p) => ({ x: p.x + 5, y: p.y }));
    eq(host.read().p1.vp1.x, 105.5, "token 内已映射");
    t.cancel();
    eq(host.read().p1.vp1.x, 100.5, "cancel 无痕");
    eq(stack.depth(), 0, "栈未动");
    let threw = false;
    try { persp.remapForDocTransform((p) => p); } catch { threw = true; }
    assert(threw, "无令牌必须 throw");
  });
});

describe("persp-component · VP 编辑拖动记账（v0.8.29，user「拖一次可以undo一次」）", () => {
  it("commitPreApplied：desk transient 直写到位 + before 快照收口 → 一步；undo/redo 逐拖往返", () => {
    const { wp2, stack, host, persp } = mk();
    const before = persp.view();                    // pointerdown 拍快照
    host.read().p1.vp1 = { x: 200.5, y: 80.5 };     // 拖动期间 desk 直写（transient 预览）
    const t = wp2.begin("perspEdit");
    persp.commitPreApplied(before);                 // pointerup 收口
    t.commit();
    eq(stack.depth(), 1, "一次拖动 = 一步");
    stack.undo();
    eq(host.read().p1.vp1.x, 100.5, "undo 回拖前");
    stack.redo();
    eq(host.read().p1.vp1.x, 200.5, "redo 回拖后");
    stack.undo();
    eq(host.read().p1.vp1.x, 100.5, "二次往返无衰减");
  });

  it("no-op 拖动（点一下就松）不占步；无令牌 commitPreApplied → throw", () => {
    const { wp2, stack, persp } = mk();
    const before = persp.view();
    const t = wp2.begin("perspEdit");
    persp.commitPreApplied(before);                 // 没动过 → JSON 比对净零
    t.commit();
    eq(stack.depth(), 0, "净变化为零 → 不入栈");
    let threw = false;
    try { persp.commitPreApplied(before); } catch { threw = true; }
    assert(threw, "令牌墙");
  });
});

describe("persp-component 收尾", () => {
  it("清栈", () => {
    for (const { stack } of _ctxs) stack.clear();
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
