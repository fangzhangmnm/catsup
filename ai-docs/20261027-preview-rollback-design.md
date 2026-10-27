# 拖动预演「拷一次 + 每帧退回」· 设计稿（O1 ❶，user 10-27 拍）

> created 20261027 by Claude Fable 5.1 · as-of v0.15.6 / 2026-10-27 · 家族周账 F-97 ② / Fable 账单 O1 / 纪元账本 DT96 · user：「同意1，我也喜欢1，如果你能写得好，4如果比1麻烦就算了」
> 现状：拖动时每帧 `Editor.computeLive` 从真内核 `clone()` 一份、在拷贝上跑工具、画出来；全合并坦克每帧拷 95–166 ms。渲染那半（只重建改过的面）已做。没动代码；这是形状 + 证明口径，实现排在 mesh M1–M3 之后。

## 1. 要什么

拖动开始时拷一次（`shadow = kernel.clone()`）；之后每帧：**先把 shadow 退回到拷贝时的样子，再在 shadow 上跑这一帧的动词**。每帧的代价 = 上一帧改动的量（拖一个点 ≈ 几十条记录），不再是整份内核。

## 2. 为什么不能靠现在的改动日志

`kernel/change-log.ts` 只记**编号**（种类 + id），不记旧值——它是给渲染缓存问「谁变了」用的。退回需要**旧值**（备忘录）：顶点坐标、边的端点 / faceLinks、膜的环 / 平面、层的值、平面登记、曲线登记、事件日志长度、`_rev`。所以要在改动日志旁边加一本**倒带日志**（journal）：只在「预演会话」开着时记，提交 / 松手时关。

## 3. 不变量（证明口径）

**退回 = 没动过**，严格到：
- (R1) 每张表的内容相同（按键逐值）。
- (R2) **每张表的遍历顺序相同**。内核里几处结果依赖 Map / Set 的插入序：`FaceStore.faces()`（膜表插入序 → 结算机铸新膜的顺序 → 事件里的 id）、`g.vertex(v).edges`（Set 序 → 环追踪起点 / 溶解判定）、faceLinks 数组序（已按 id 排，不依赖）、层的 Map 序（applyEvents 遍历）。JS Map 删了再插会挪到表尾 → 单纯「把值放回去」不等于「没动过」。
- (R3) 派生缓存一致：空间网格（topology 的边网格）、`vertByKey`、`byPlane` 索引、曲线登记的边 → 曲线映射。
- (R4) 日志自身：改动日志的 seq 不要求退回（渲染缓存按族谱 diff，多记几条只是多重建几张面，不影响正确性）；事件日志截断回拷贝时的长度。

(R2) 是难点。两条路：
- **A. 表换成「不挪位的」实现**：LoggedMap 下面用「槽位 + 墓碑」（删 = 标墓碑、插回同一个 id = 复活同一槽位；遍历跳过墓碑）。插入序 = 槽位序 = 第一次插入的顺序；复活不改变序。代价：每张表多一层；遍历多一次墓碑判断；槽位要定期紧缩（只在没有预演会话时）。
- **B. 退回时整表重排**：退回后把受影响的表按「拷贝时的键序」重建一遍（每张表 O(表长)）——退回变成 O(模型)，白做。不选。
- **C. 让依赖序的地方不依赖序**：膜表遍历按 id 排、`vertex.edges` 按 id 排……每处排序 O(k log k)，而且「哪些地方依赖序」要穷举、容易漏（这正是 10-26 池网格对拍抓到 `[1,4] → [4,1]` 那类 bug 的来源）。不选作主路，但 A 落地后可以顺手把已知依赖序的地方都改成按 id，双保险。

**选 A。**

## 4. 倒带日志的形状

```ts
// kernel/rewind.ts（新）
interface Rewind {
  // 记录（写路径调用；预演会话没开 = 空函数）
  vertexMoved(id, oldPt); vertexAdded(id); vertexRemoved(id, oldRecord);
  edgeAdded(id); edgeRemoved(id, oldRecord); edgeRelinked(id, oldA, oldB); faceLinksChanged(id, old);
  faceAdded(id); faceRemoved(id, oldRecord); faceReplaced(id, oldRecord);
  layerSet(layer, id, oldVal | undefined); planeAdded(id); planeRemoved(id, oldRec); curveChanged(id, oldRec);
  // 退回：按记录倒序逐条还原；表是「槽位 + 墓碑」实现 → 复活回原槽位
  rewind(k: Kernel): void;
}
```
记录点 = 现在已经为改动日志装了 LoggedMap / LoggedSet 的那几处 + 显式记编号的那几处（topology relocate*、mergeVertex、settle spliceRing）——倒带日志挂在同一组口子上，多存一个旧值。

## 5. 对拍（落地前要有的网）

- `test/preview-rewind.test.ts`：随机场景 → 开预演会话、拷一份 → 随机 N 帧（每帧随机动词：挪点 / 推拉 / 画线 / 擦边，每帧先退回再做）→ 每帧断言 `canon(shadow) === canon(freshClone)`（和「每帧新拷一份」逐字相同：事件 JSON、toBrep JSON、**faces() 的 id 顺序**、每个顶点的 edges 顺序）。
- 现有 `settle-differential` / `erase-differential` / `loaded-differential` 全绿不变。
- 性能：坦克拖一个点每帧 ≤ 5 ms（退回 + 动词 + 渲染差量）。

## 6. 和 mesh 的关系

mesh 内核列式：拷贝 = memcpy，倒带 = 把改过的下标的旧值写回（倒带日志就是「下标 + 旧值」的数组），(R2) 不存在（数组没有插入序）。所以 mesh 不需要 A 的槽位 + 墓碑，天然满足。brep 做 A 的价值 = SU 工作台拖大物体；user 判断「mesh 分家了 brep 不会特别大」→ 优先级在 mesh M1–M3 之后。

## 7. 追记（2026-10-27 夜，v0.15.13）：(R2) 由数组制度解决

user「如果map难的话，要不要直接一口气做成数组制度的？」→ 没做 §3 的 A 路（槽位 + 墓碑的 Map 包装），直接把内核六处表换成 `kernel/id-table.ts` 的 `IdMap` / `IdSet`（按 id 下标、遍历按 id 升序）。**(R2) 自然成立**：退回只要把值放回去，顺序由 id 定。§4 的倒带日志（记旧值）照原样接在同一组口子上（表的 onTouch 回调 + 显式记编号的几处），下一步实现。

## 8. 落地（v0.15.14，2026-10-27 夜，Claude Fable 5.1）：不记旧值，对照真身恢复

§4 的「倒带日志记旧值」没做——预演期间**真身一个字节没动**，旧值就在真身里。做法（`Kernel.rewindTo(base, mark)`）：
1. 改动日志给出从 mark 起碰过的编号（顶点 / 边 / 膜；DT96 fuzz 保证完整）；
2. 按邻接扩全：碰过的点的星、碰过的边的端点与两侧膜、碰过的膜的环边（影子里的 + 真身里的都看）；
3. 这些记录照真身深拷回来、真身没有的删掉（`PlanarGraph / FaceStore / PlaneRegistry / CurveRegistry / EdgeLayers / FaceLayers .restoreFrom`）；派生索引（格点键、空间网格、平面 → 膜、边 → 曲线、平面桶）只对它们重算；计数器 / 删过的表照真身；事件日志截回；
4. rev 取一个没用过的新值（缓存键不回绕）；表的记账钩子顺手把恢复的编号记进改动日志 = 渲染缓存知道它们又变了（增量，不全量）。
日志丢段（太长）→ 返回 null，编辑器重新拷。全局结算模式不用影子（那条路全量改 faceLinks 不记账）。

编辑器 `Editor.shadowKernel()`：真身同一对象、同一 rev → 倒回上一帧的影子再用；否则重新拷。影子对象跨帧稳定 → 渲染缓存的族谱对拍也从「每帧找共同祖先」变成同一支。

**差分网** `test/preview-rewind.test.ts`：5 种子 × 24 帧随机动词（挪点 / 推拉 / 画线 / 擦边 / 软化）——倒回后的影子 = 真身新拷一份（顶点 / 边 / 膜记录、星的顺序、膜 id 顺序、层、曲线、事件日志长度、计数器逐字），动词在倒回的影子上跑 = 在新拷贝上跑；真身全程不动。884 绿。
**实测**（node，1600 个盒 = 9600 膜 / 19200 边，每帧挪一个点）：每帧新拷 **66 ms** + 动词 6 ms → 拷一次 + 每帧倒回 **0.32 ms** + 动词 6 ms。(R2) 由数组制度（v0.15.13）保证。
