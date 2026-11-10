// 选区写面行为锁（v0.8.2 S2 立；T4a 换 SelectionComponent 基座；T5 换纯 v2：SelectionFace 门面死，
// 预览 tx 收编组件、记账归调用方 history.withPoint——前身 selection-face.test.mjs，锚语义逐条保留）。
// 守的契约：
//   - beginPreview：write 换预览（旧预览 ≠origin 就地 dispose；write(origin) 合法）；
//     commit 无变化 changed:false / 有变化交回 before（调用方 withPoint 记账）后 undo/redo 往返；
//     abort 无痕还原 origin、预览产物 dispose；收口后再用 → throw。
//   - commitPreApplied：pre-applied swap 的唯一记账 verb（withPoint 里直调；undo 回 before）。
//   - 令牌墙：无令牌直调组件记账 verb → throw；token cancel 倒序回滚无痕；
//     同 token 多次记账 = 首捕获赢（中间产物即弃、一步一 entry）。
import { describe, it, assert, eq } from "./runner.mjs";
import { Selection } from "../src/backend/selection.ts";
import { PaintingWorkpiece } from "../src/backend/workpiece/painting-workpiece.ts";
import { PaintingView } from "../src/backend/workpiece/painting-view.ts";
import { History } from "../src/backend/workpiece/history.ts";

const _ctxs = [];
function mk() {
  const h = new History({ maxQuotaBytes: 1 << 30 })   // onUnrecoverable 缺省即抛（2026-10-13）;
  const wp2 = new PaintingWorkpiece({ undo: h.stack, tree: { width: 64, height: 64 }, onTokenLeak: () => {} });
  const doc = new PaintingView(wp2);
  h.attach(wp2);
  _ctxs.push({ doc, h });
  return { doc, h, wp2 };
}
const box = (x, y, wd, ht) => {
  const g = new Uint8Array(wd * ht).fill(255);
  return Selection.fromGray8Region(x, y, wd, ht, g);
};
// 调用方记账形态（toolbar/_finishSelEdit 同款）：commit 变了才 withPoint 一步。
const recordCommit = (h, wp2, r) => {
  if (r.changed) h.withPoint("selection", {}, () => wp2.selection.commitPreApplied(r.before));
};

describe("selection-preview · 预览 tx", () => {
  it("write 换预览：旧预览就地 dispose、origin 保管；write(origin) 回原选区", () => {
    const { doc, wp2 } = mk();
    const origin = box(0, 0, 4, 4);
    doc.selection = origin;   // 装载态（测试播种，直写口）
    const tx = wp2.selection.beginPreview();
    const p1 = box(0, 0, 8, 8);
    tx.write(p1);
    eq(doc.selection, p1, "预览上台");
    assert(!origin.disposed, "origin 保管不 dispose");
    const p2 = box(2, 2, 8, 8);
    tx.write(p2);
    assert(p1.disposed, "旧预览就地 dispose");
    tx.write(origin);
    eq(doc.selection, origin, "write(origin) 回原选区");
    assert(p2.disposed, "预览产物 dispose");
    tx.abort();   // 收口（已在 origin，无事发生）
    eq(doc.selection, origin, "abort 后仍 origin");
    assert(!origin.disposed, "origin 存活");
  });

  it("commit 无变化 → 不占 undo 步；有变化 → 调用方记账后 undo/redo 往返", () => {
    const { doc, h, wp2 } = mk();
    const t0 = wp2.selection.beginPreview();
    eq(t0.commit().changed, false, "无变化 commit");
    eq(h.depth, 0, "栈未动");
    const tx = wp2.selection.beginPreview();   // origin = null
    const p = box(0, 0, 6, 6);
    tx.write(p);
    const r = tx.commit();
    assert(r.changed, "有变化");
    recordCommit(h, wp2, r);
    eq(h.depth, 1, "一条 entry");
    h.undo();
    eq(doc.selection, null, "undo 回 origin(null)");
    assert(!p.disposed, "预览在 redo 包里存活");
    h.redo();
    eq(doc.selection, p, "redo 回预览");
  });

  it("abort 无痕还原 origin、预览 dispose；收口后再用 throw", () => {
    const { doc, wp2 } = mk();
    const origin = box(0, 0, 3, 3);
    doc.selection = origin;
    const tx = wp2.selection.beginPreview();
    const p = box(1, 1, 5, 5);
    tx.write(p);
    tx.abort();
    eq(doc.selection, origin, "还原 origin");
    assert(p.disposed, "预览 dispose");
    let threw = false;
    try { tx.write(null); } catch { threw = true; }
    assert(threw, "收口后 write throw");
  });
});

describe("selection-preview · commitPreApplied（withPoint 直调）", () => {
  it("pre-applied swap 记账：undo 回 before", () => {
    const { doc, h, wp2 } = mk();
    const before = box(0, 0, 4, 4);
    doc.selection = before;
    const after = box(0, 0, 9, 9);
    doc.selection = after;   // 引擎已换好（entry 契约形态）
    const st = h.withPoint("selection", {}, () => wp2.selection.commitPreApplied(before));
    assert(st.ok, "记账 ok");
    h.undo();
    eq(doc.selection, before, "undo 回 before");
    h.redo();
    eq(doc.selection, after, "redo 回 after");
  });
});

describe("selection-component · v2 令牌纪律", () => {
  it("无令牌直调记账 verb → throw（令牌墙）；直写口 _rawWrite 不受限（预览违规户声明态）", () => {
    const { doc, wp2 } = mk();
    let threw = false;
    try { wp2.selection.set(null); } catch { threw = true; }
    assert(threw, "无令牌 set 必须 throw");
    threw = false;
    try { wp2.selection.commitPreApplied(null); } catch { threw = true; }
    assert(threw, "无令牌 commitPreApplied 必须 throw");
    const s = box(0, 0, 2, 2);
    doc.selection = s;   // 直写口合法
    eq(doc.selection, s, "直写口生效");
  });

  it("token cancel → 倒序回滚无痕（origin 复位、cancel 前的新态 dispose）", () => {
    const { doc, h, wp2 } = mk();
    const origin = box(0, 0, 4, 4);
    doc.selection = origin;
    const after = box(0, 0, 8, 8);
    const token = wp2.begin("test");
    wp2.selection.set(after);
    token.cancel();
    eq(doc.selection, origin, "cancel 还原 origin");
    assert(after.disposed, "cancel 前的新态 dispose");
    assert(!origin.disposed, "origin 存活");
    eq(h.depth, 0, "栈未动");
  });

  it("同 token 多次记账 = 首捕获赢：中间产物即弃、undo 一步回 origin", () => {
    const { doc, h, wp2 } = mk();
    const origin = box(0, 0, 4, 4);
    doc.selection = origin;
    const mid = box(1, 1, 5, 5);
    const fin = box(2, 2, 6, 6);
    const token = wp2.begin("test");
    wp2.selection.set(mid);
    wp2.selection.set(fin);
    token.commit();
    assert(mid.disposed, "中间产物即弃");
    assert(!origin.disposed && !fin.disposed, "origin/终值存活");
    eq(h.depth, 1, "一步");
    h.undo();
    eq(doc.selection, origin, "undo 一步回 origin");
    h.redo();
    eq(doc.selection, fin, "redo 回终值");
  });

  it("set 净变化为零（回到 origin）→ 不占 undo 步", () => {
    const { doc, h, wp2 } = mk();
    const origin = box(0, 0, 4, 4);
    doc.selection = origin;
    const mid = box(1, 1, 5, 5);
    const token = wp2.begin("test");
    wp2.selection.set(mid);
    wp2.selection.set(origin);
    token.commit();
    eq(h.depth, 0, "净零变化不占步");
    eq(doc.selection, origin, "仍 origin");
    assert(mid.disposed, "中间产物即弃");
  });
});

// 测试卫生：清栈释放（栈内 Selection 由组件 disposeRecord 处理）
describe("selection-preview 收尾", () => {
  it("清栈并释放 selection/tilesets", () => {
    for (const { doc, h } of _ctxs) {
      h.clear();
      doc.clearSelectionOnLoad();
    }
    _ctxs.length = 0;
    assert(true, "disposed");
  });
});
