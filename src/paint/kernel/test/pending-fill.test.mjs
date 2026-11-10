// PendingFill 行为锁（T4c：FillColorOp 锚迁移 + 色板 target 切换的新锚）。
// 守的契约：
//   - fill 预览期换色可撤销（v0.7.8 语义）：commitPreApplied 记账 → undo 回旧色 → redo 回新色；
//   - **笔刷色从此不被 undo 碰**（T4 蓝图行为锚）：undo/redo 只翻组件 substrate，
//     外部「笔刷色」值全程一字不动；
//   - begin/clear = 导航态声明写（无 token 合法、不记账）；setColorLive 中间值不记账；
//   - 同 token 首捕获赢 + 净变化为零不占步；无令牌 commitPreApplied → throw（令牌墙）。
import { describe, it, assert, eq } from "./runner.mjs";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { UndoStack } from "../src/backend/workpiece/undo-stack.ts";

const _ctxs = [];
function mk() {
  const stack = new UndoStack({ maxQuotaBytes: 1 << 20 });
  const wp2 = new PaintingWorkpiece({ undo: stack, tree: { width: 16, height: 16 } });
  _ctxs.push({ stack });
  return { wp2, stack, pf: wp2.pendingFill };
}

describe("pending-fill · 预览换色可撤销（v0.7.8 语义迁移）", () => {
  it("防抖 flush 形态：live 写 ×N + commitPreApplied(base) → 一步；undo/redo 往返", () => {
    const { wp2, stack, pf } = mk();
    pf.begin("#1b1b1b");                      // 进 fill（导航态，无 token）
    pf.setColorLive("#ff0000");               // 拖拽中间值
    pf.setColorLive("#ff8800");
    const t = wp2.begin("fillColor");
    pf.commitPreApplied("#1b1b1b");           // 防抖 flush：base = 窗口起点
    t.commit();
    eq(stack.depth(), 1, "一次拖拽 = 一步");
    eq(pf.view().color, "#ff8800");
    stack.undo();
    eq(pf.view().color, "#1b1b1b", "undo 回旧色");
    stack.redo();
    eq(pf.view().color, "#ff8800", "redo 回新色");
    stack.undo();
    eq(pf.view().color, "#1b1b1b", "二次 undo 仍精确（对称 swap 无衰减）");
  });

  it("**笔刷色不被 undo 碰**：换色/undo/redo 全程笔刷色一字不动", () => {
    const { wp2, stack, pf } = mk();
    let brushColor = "#123456";               // 外部笔刷色（dials）——组件根本拿不到它的引用
    pf.begin(brushColor);
    pf.setColorLive("#00ff00");
    const t = wp2.begin("fillColor");
    pf.commitPreApplied("#123456");
    t.commit();
    stack.undo(); stack.redo(); stack.undo();
    eq(brushColor, "#123456", "笔刷色全程不动（旧 FillColorOp 的 set 注入路径已死）");
    eq(pf.view().color, "#123456", "undo 后 pending 回起步色");
  });

  it("净变化为零（flush 时色已回 base）→ 不占 undo 步", () => {
    const { wp2, stack, pf } = mk();
    pf.begin("#111111");
    pf.setColorLive("#222222");
    pf.setColorLive("#111111");               // 拖回去了
    const t = wp2.begin("fillColor");
    pf.commitPreApplied("#111111");
    t.commit();
    eq(stack.depth(), 0, "净零变化不占步");
  });

  it("clear 后 undo 换色步：只翻 substrate（幽灵步无副作用），redo 再翻回", () => {
    const { wp2, stack, pf } = mk();
    pf.begin("#101010");
    pf.setColorLive("#eeeeee");
    const t = wp2.begin("fillColor");
    pf.commitPreApplied("#101010");
    t.commit();
    pf.clear();                               // 出 fill 工具（导航态）
    eq(pf.view(), null);
    stack.undo();                             // 撤到换色步：substrate 翻成 before 侧
    eq(pf.view()?.color, "#101010", "undo 复活 before 侧（无消费者，无副作用）");
    stack.redo();
    // 声明写（clear）不被 record 追踪：redo 翻回的是 swap 时刻的现场（= 已 clear 的 null）——
    // 自反契约如此；view 无消费者，幽灵态无副作用。
    eq(pf.view(), null, "redo 回 swap 现场（clear 后的 null）");
  });

  it("v0.8.29 clearRecorded：fill commit 步内清 seed；undo 还原 redo 再清（ADR-0008 §6 对齐）", () => {
    const { wp2, stack, pf } = mk();
    pf.begin("#123456");
    const t = wp2.begin("fill");
    pf.clearRecorded();
    t.commit();
    eq(stack.depth(), 1, "清 seed 占一步（真 app 里与 tiles/selection 同 token 一步）");
    eq(pf.view(), null, "commit 后 seed 已清");
    stack.undo();
    eq(pf.view()?.color, "#123456", "undo fill → seed 随 step 还原");
    stack.redo();
    eq(pf.view(), null, "redo → 再清");
    let threw = false;
    try { pf.clearRecorded(); } catch { threw = true; }
    assert(threw, "无令牌 clearRecorded → throw（令牌墙）");
  });

  it("无令牌 commitPreApplied → throw（令牌墙）；begin/clear/setColorLive 无 token 合法", () => {
    const { pf } = mk();
    pf.begin("#000000");
    pf.setColorLive("#333333");
    pf.clear();
    let threw = false;
    try { pf.commitPreApplied("#000000"); } catch { threw = true; }
    assert(threw, "记账写必须持令牌");
  });
});

describe("pending-fill 收尾", () => {
  it("清栈", () => {
    for (const { stack } of _ctxs) stack.clear();
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
