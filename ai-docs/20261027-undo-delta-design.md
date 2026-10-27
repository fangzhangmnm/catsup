# 撤销重设计 · 设计稿（Fable 账单 A3 / 家族周账 F-93 的审计结论 + 新设计）

> created 20261027 by Claude Fable 5.1 · as-of v0.15.14 / 2026-10-27 · 没动代码；这是形状 + 证明口径 + 搬迁顺序。
> user 10-27 夜拍的方向：「我是更喜欢逆指令。不过这样是不是以后每一个操作都得想明白怎么写？还是有备份兜底？」「我们的undo quota有多大」「每八步存一份整个场景……会不会浪费内存quota，仔细权衡一下？」「关键是这个兜底的是高频还是小频率？」「CatsUp为什么不128，我们以后也会碰到大模型，以及也是需要画画的，不过画画要不要走自己的undo stack我不知道，我建议不走。免得blender那样confusion，保存都走两套，恶心」「撤销也能撤选区……这个我们要，weebpaint应该也是这个吧」。
> 10-26 Opus 的重设计（`20261026-undo-session-redesign.md`：每一步带会话、换场景只有一个入口）审过：**I1–I6 六条不变量都对，保留**；底下的「op 日志 + 每 8 步整场景快照 + 回到快照重放」换掉。

## 1. 审计结论（F-93）

- **稳健的**：历史模块一张表管指令 + 会话（I3）；撤销 = 场景与会话一起回去（I2）；换场景只有一个入口 `installScene`（I4）；撤销不在手势中途发生（I5）；视图态不进历史（I6）。探针 `probe-undo-session` 覆盖了组件外撤组件里的改动、撤过「建组件」那一步、一路重做。
- **要换的底子**：
  1. **内存**：`KEEP_SNAPS = 8` 份整场景拷贝常驻。坦克量级一份几十 MB，八份几百 MB——iPad 会被系统杀。
  2. **深撤销慢**：超过 64 步要从打开时重放到那一步（O(全部指令)），对但卡。
  3. **只改选区不是一步**（user 要 Blender 同款）。
  4. **重放依赖确定性**（公理 5）：对，但它把「撤销」和「复现」绑在一条机制上——复现包 / 联机要的是指令流，撤销要的是快。分开。
- **没有数据安全问题**：撤销失败回滚走 `installScene`，场景对象不会半坏（提交失败 = 整步丢弃）。

## 2. 结论（形状）

**一条撤销栈，WeebPaint `undo-stack.ts` 同款**（纯数据记录 + 自反交换 + 字节配额 + 从最老端整步驱逐、最新一步永不驱逐）：

```ts
// src/editor/undo/stack.ts（新；照抄 WeebPaint src/backend/workpiece/undo-stack.ts 的形状，零 import、node 可测）
interface UndoStep { readonly id: number; entries: { c: UndoComponent; data: unknown }[]; label?: string }
interface UndoComponent { readonly kind: string; swapRecord(data: unknown): unknown; recordBytes(data: unknown): number; disposeRecord?(data: unknown): void }
class UndoStack { constructor(opts: { maxQuotaBytes: number; onChange?(): void }); push(step): void; undo(): UndoStep | null; redo(): UndoStep | null; canUndo/canRedo; clear(); usageBytes(): number }
```
配额 **128 MB**（user：「CatsUp 为什么不 128」；WeebPaint 同值）。一步 = 若干条「部件 + 纯数据记录」；撤销 = 倒序对每条 `swapRecord`（应用后记录被换成反向包），重做 = 正序再调一次。**画画（以后的贴图 / 绘制）、选区、几何、场景结构全在这一条栈上**，不分家（user：免得 Blender 那样）。

### 2.1 三种部件

| 部件 | 记录（纯数据） | swap 怎么做 | 字节 |
|---|---|---|---|
| **kernel 池**（brep；mesh 同形） | `KernelDelta`：触碰集里每条记录的「之前」= 顶点 / 边 / 膜 / 平面 / 曲线的深拷（或 null = 之前不存在）+ 层的归属 / 值 + 计数器 + 事件日志长度 | `kernel.applyDelta(delta)`：和 v0.15.14 的 `rewindTo` 同一套 `restoreFrom`（照 delta 而不是照真身），**返回逆 delta**（写回之前先把现值抽出来） | O(触碰)：挪一个点几百字节；推拉一张面几 KB；擦线局部化后 O(影响域) |
| **场景结构**（definitions / instances / groups / materials / layers / axes / guides） | 该指令改过的那几张表项的「之前」（实例矩阵、组件名、材质槽表、层表……）；表项小、数量少 | 同形：写回、返回逆 | 小 |
| **会话**（在哪个组件里 + 选区） | `{ ctx, sel }` 之前 / 之后（10-26 的 `Session`） | 换上去；逆 = 现在的 | 小（选区按 id 列表） |

一步 = 这次提交碰到的池各一条 kernel 记录 + 一条场景结构记录（有的话）+ 一条会话记录。**只改选区的一步** = 只有会话记录（0 条几何）——这就是「撤销也撤选区」（I2 的推广，user 拍）。

### 2.2 KernelDelta 怎么来（不用每个动词写逆）

**提交 = 影子换真身**。现在的提交路径：在真身上 `applyOp`。改成：
1. 预演已经在影子上跑过这一步（v0.15.14 影子复用）；提交时**影子直接成为真身**（对象换掉；WorldView / 渲染缓存按对象 + 族谱认，换对象 = 从族谱找共同祖先，还是增量）。
2. 旧真身此刻是「之前」。从影子的改动日志拿触碰编号、按邻接扩全（`rewindTo` 已经在做的那一步），**只把触碰集里的记录从旧真身深拷出来** = `KernelDelta`（O(触碰)）。旧真身随即丢掉。
3. 没走预演的指令（菜单一次性指令、脚本、复现包）：先 `clone()` 一份当影子跑、再按 1–2 处理——这就是「兜底」：**任何指令都自动有逆，不用手写**（user「不好写的有另外一条兜底的路？」= 有，而且是唯一一条路）。
4. 逆指令（挪 / 转 / 缩的反向、改层的反向）**不另写**：delta 本身就是它们的逆，而且更小（挪一个点的 delta = 那个点的旧坐标 + 它的星里几条边的空间格记录）。user 想要的「逆指令」语义（撤销 = 反着做一遍）在数据上等价，没有第二套代码。

**证明口径**：`applyDelta(delta)` 之后内核 = 提交前的内核（逐字，同 `test/preview-rewind.test.ts` 的 canon：记录、星序、膜 id 序、层、曲线、事件日志长度、计数器）；`applyDelta(applyDelta(d))` = 恒等（自反）；对拍网 = 现在的 undo 测试（28 条单测 + 逐步往返指纹）照跑，再加随机动词串「做 → 撤 → 重做」逐字。

### 2.3 指令流（op 日志）留着，但不再是撤销的底子

- `history.ts` 的 `ops[]` 继续记（可序列化、按坐标寻址）：复现包 / 黑匣子 / 以后的联机 / 脚本接口都读它。它很小，不占配额，不驱逐。
- **快照环（SNAP_EVERY_OPS / KEEP_SNAPS）删除**。深撤销 = 栈里有多深撤多深（配额内），再深 = 灰掉（WeebPaint 同款，user：「超过配额的撤销和 WeebPaint 一样灰掉，不重放」）。
- 重放只剩两个低频用途：复现包重跑（开发）、以后的联机对账。不在编辑热路径。

### 2.4 崩溃恢复：学 WeebPaint 盲快照，不学 Procreate 重放

CatsUp 已有 `src/app/crash-store.ts`（无地 T-crash，WeebPaint 同形）：空闲时盲存整文件字节。保持；**不**用指令流重放恢复（Procreate 那样「来不及保存要重放很久」）。文件小，盲快照是常数时间。

### 2.5 配额怎么算

`recordBytes`：kernel delta 按记录数 × 常数估（顶点 ≈ 64 B、边 ≈ 48 B + faceLinks、膜 ≈ 环长 × 40 B）；场景结构记录按 JSON 长度；会话记录按选区大小。128 MB 大约能装：挪点几十万步、推拉几万步、大擦线几百步。超了从最老端整步驱逐，最新一步永不驱逐。

## 3. 和现有东西的关系

- **马后炮**（改参数重做）：现在是「撤 n 条 op 再提交」；改成「撤栈顶 n 步再提交」（步 = op 的 join 组）。`afterthought.undoN` 的语义不变。
- **预演失败回滚**：影子扔掉、真身没碰，照旧。
- **组件实例实时跟**（DT13 孪生槽）：影子换真身后，同一定义的其他实例本来就读同一个内核对象 → 不变。
- **mesh 内核**：`MeshKernel` 列式，delta = 触碰下标的旧值数组（更简单）；`changes` 已经在记（M2）。同一个 `UndoComponent` 接口两份实现。
- **撤销把人带回那一步所在的组件里**（10-26 留给审计的问题）：保留（I2 的直接结果；Blender 同款）。

## 4. 搬迁顺序（每步一版、各自推开发版、每步加一条网）

1. `src/editor/undo/stack.ts`（照抄 WeebPaint，node 单测）。
2. `Kernel.extractDelta(touched)` / `Kernel.applyDelta(delta) → inverse`（在 `restoreFrom` 上长一层：照 delta 而不是照真身）；`test/kernel-delta.test.ts`：随机动词串「做 → 抽 delta → 撤 → 重做」逐字。
3. 提交路径：影子换真身 + 抽 delta → 压栈；`history.ts` 只留 `ops[]` + 会话；快照环删。现有 28 条 undo 单测 + `probe-undo-session` 照过。
4. 选区进撤销：鼠标点选 / 框选 / 套索 / 反选 / 扩缩 / 环选 = 一步只有会话记录（连续几步先不合并，Blender 同款）。
5. 场景结构记录（建组 / 建组件 / 炸开 / 挪实例……）：op 层逐条给「之前」；先用「整张 definitions 表的小快照」兜底（表项少），再逐条细化。
6. 配额与驱逐；设置里显示用量（披露）。

## 5. 要 user 拍的（一个回合）

1. **提交 = 影子换真身**（对象换掉）是实现细节，但它意味着「没走预演的指令也要先拷一份」——大物体上菜单指令多一次 clone（坦克 ≈ 100 ms）。接受 / 还是给菜单指令另开一条「记旧值的日志」路（多一套代码）？我选接受。
2. **连续几步选区变化不合并**（Blender 同款，Ctrl+Z 会先撤几下点选）。接受 / 还是合并成一步？我选不合并（先照 Blender，用着别扭再说）。
3. 配额 128 MB、深过配额灰掉——已拍，这里只是复述。

## 6. 追记（10-27 更晚）：两问拍了 + 护栏

- user：「影子换真身好主意」「连续几步选区变化不合并 当然」→ 两问按推荐定。
- **护栏（user「之前一些觉得影子坏了无所谓的premise会出问题，可能得小心点」）**：升真身的永远是**提交时从真身新拷的那份**，只跑这一条指令、成功才换、失败真身原封不动；拖动用的预演影子（被倒回几十次、跑过各种试探）永远可丢、永远不升真身。两种影子，两种待遇。
- user 问「为什么我觉得两个要拷的东西是一样多的」：撤销记录一样多（都是被碰的那几条）；差在中间过程——拷一份当影子要先整抄一遍池再抽那几条，写入口加钩子只在改到那一刻抄那一条。列式后整抄几毫秒，所以选前者。
- **落地进度**：步 2 done（`Kernel.extractDelta / applyDelta / deltaAgainst`，`kernel/delta.ts`，各表 restoreFrom 读「来源」接口、倒带和撤销同一条路；`test/kernel-delta.test.ts` 5 种子 × 20 步撤 / 重做逐字；差分抓到一处：端点处曲线重新分链要把端点的星再扩一圈）。
