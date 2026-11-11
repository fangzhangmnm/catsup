# 贴图主线施工单（四）：画画内核的撤销出口

> created 20261110 by Claude Fable 5.2 · as-of 画画 v0.14.68 · 2026-11-10 深夜
> 给谁：Catsup小弟。**先别动**：等 Fable 发消息放行。排在 0-1 审过、合进两个仓的 main 之后。
> 这是施工方案第三节的 0-2。**只动画画仓**（`src/backend/workpiece/` 和 `weebpaint-backend.ts` 的一个入口）。三维仓这一张不动；三维的撤销栈接上它是 1-8 的事。
> 在分支上做（画画仓，分支名 `kernel-steps-host`，副本文件夹 `.claude/worktrees/kernel-steps-host`），停在分支等 Fable 审过再合。

## 要达到什么

user 定的：画画和建模是**一条撤销线**。在模型上画了一笔，切了一刀，又画了一笔，按三下撤销就按相反的顺序退回去。

画画内核现在自己管一个撤销栈：封好的每一步都进它自己的栈，撤销、重做、配额、丢掉哪一步，全是它自己说了算。三维那边有自己的撤销栈。两个栈各走各的，顺序就对不上。

做完之后：内核封好一步，可以**交给宿主的栈去存**；宿主的栈走到这一步，再叫内核把它翻过去。画画软件自己不变，还是用内核自带的栈。

这一张是纯加法：加一个新的类和一个入口。画画软件现在走的那条路，除了把一段循环提成共用的函数，不改。

## 一、形状（Fable 定的，照做；觉得不对停下来说）

现在的关系：`Workpiece` 把封好的步推给 `UndoStack`；步的号、「现在停在哪一步」、翻的顺序，都是 `UndoStack` 在管。`History` 自己建一个 `UndoStack`。

加一个和 `UndoStack` 并排的类，暂叫 `HostedSteps`（名字你定）。它对 `Workpiece` 来说和 `UndoStack` 长得一样（收一步、报「现在停在哪一步」、清空），区别是它**自己不存步**：

```ts
/** 宿主实现的两件事。 */
export interface StepHost {
  /** 内核封好了一步，交给宿主。宿主：先把自己还没重做的那一段丢掉（其中属于这件作品的，每一步都调 drop），再收下这一步。 */
  onStep(step: UndoStep): void;
  /** 这件作品以前的步全部作废了（装载了别的内容，或者状态不可信）。宿主把手上属于它的步都扔掉，不用再调 drop。 */
  onReset(): void;
}

export class HostedSteps {
  constructor(host: StepHost);
  // —— Workpiece 用的那一面，和 UndoStack 同形 ——
  push(step: UndoStepInput): void;     // 给这一步编号、记下它前一步是谁、把「现在停在哪」挪到它、交给 host.onStep
  cursorStepId(): number;
  clear(): void;                       // 手上记着的活步全部释放、「现在停在哪」回到 0、换一代、host.onReset
  // —— 宿主用的那一面 ——
  /** 宿主的栈走到这一步时调。方向内核自己认。 */
  flip(step: UndoStep): "undo" | "redo";
  /** 这一步占多少字节（宿主算配额用）。 */
  bytes(step: UndoStep): number;
  /** 宿主不要这一步了（截断重做段、配额驱逐）。同一步调第二次 = 什么都不做。 */
  drop(step: UndoStep): void;
}
```

逐条：

1. **每一步多记一个数：它前一步是谁**（`prevId`）。同一件作品的步，撤销和重做一定是一个接一个按顺序来的，所以有了这个数，内核不用看见宿主的栈，也知道现在停在哪：撤销一步之后停在它的前一步，重做一步之后停在它自己。
2. **方向内核自己认，顺序内核自己把关**：
   - 这一步正是「现在停着的那一步」→ 这是撤销。
   - 这一步的前一步是「现在停着的那一步」→ 这是重做。
   - 两样都不是 → 宿主弄错了顺序。抛一个专门的错（暂叫 `StepOrderError`），**什么都不碰**。
3. **别的乱用同样在动手之前拦下、抛同一种错、什么都不碰**：这一步不是这件作品的；这一步已经被 drop 过；这一步是上一代的（`clear` 之前的）；有写令牌开着。
4. **翻的那一段循环只有一份**：`UndoStack` 的 `undo` / `redo` 里倒序 / 正序 `swapRecord` 的那几行，提成一个函数，两个类都用它。翻完之后的顺序和现在一样：先 `hint`，再告诉 `Workpiece`（版本号加一、发信号）。
5. **`History` 多一种装法**：建的时候给它一个 `HostedSteps`，它就不自己建 `UndoStack`。这种装法下：
   - `history.undo()`、`redo()`、`canUndo()` 这些抛错（「这份历史归宿主管」），不许悄悄返回假。
   - 新入口 `history.flip(step): boolean`，宿主翻一步走它：
     - 有写令牌开着 → 抛 `StepOrderError`。**不替宿主封口**：封口会往宿主的栈里推一步新的，而宿主正翻到一半。宿主在开始撤销 / 重做之前，自己先叫 `sealCheckpoint()`。
     - 写门不让（这幅画锁着）→ 返回 `false`，什么都不碰。拿这一步的标签问门，和现在一样。
     - 翻的过程里 `swapRecord` 抛了 → 走现在的不可恢复那一套：弃掉开着的令牌、`HostedSteps.clear()`（宿主收到 `onReset`）、调 `onUnrecoverable`、返回 `false`。
     - `StepOrderError` 不算不可恢复（状态没被碰过），原样抛给宿主。
   - 这种装法下 `onUnrecoverable` 必须给，不给就在建的时候抛。
6. **`WeebPaintBackend` 的注入口加一项**：给了 `StepHost`，就按上面那种装法建历史；不给，和现在一模一样。
7. `Workpiece` 里 `undo` 这个选项的类型从 `UndoStack` 放宽成「这两个类共有的那一面」。预期 `workpiece.ts` 只改类型，不改逻辑；要改逻辑就停下来说。

## 二、为什么这么切（给审的人和以后的人看）

- 画画软件那条路不动：现有二十来个测试文件直接 `new UndoStack`、`new History`，一个都不用改。
- 顺序由内核把关，不交给宿主：这是画画软件 10-13 立的那两条撤销契约里的第二条，「调用的人乱用，要给规章定义的结果，在调用的地方响亮地报，不留到撤销时炸栈」（画画仓 ADR-0008 的修订）。每个宿主各写一遍顺序检查，早晚有一个写错。
- 一个 `HostedSteps` 只服务一件作品（和 `UndoStack` 一样）；一个宿主的栈可以装很多件作品的步，中间夹着别的步。不同作品的步互不相干，谁先谁后翻都行；同一件作品的步必须按顺序。
- 多个子步并成一步（`withPoint` 留开、最后封口）照旧，交到宿主手上的是并好的一步。

## 三、门

1. 画画仓 `npm test` 全过，逐像素基线不变，`tsc` 干净。现有测试文件一个字不改（要改哪个，先说）。
2. **新测试 A：两件作品共用一个栈。** 测试里写一个最小的宿主：一个数组，里面装两件作品的步，再夹一些假的「别的步」。随机做一串：在甲上画、在乙上画、别的步、撤销、重做、撤销之后做新动作（截断，丢掉的步调 `drop`）。每做一下，甲和乙的像素都和「各自用内核自带的栈、做同样的事」的对照组一样。最后全部丢掉，小块池的泄漏门是 0。
3. **新测试 B：乱用。** 顺序翻错、翻别的作品的步、翻已经 drop 的步、令牌开着的时候翻、`clear` 之后翻旧步：都抛 `StepOrderError`，像素和「现在停在哪」都没变，之后按对的顺序翻还能翻。同一步 drop 两次不出事。
4. **新测试 C：脏不脏。** 存一次（`markSaved`），画一步，撤销回去 → 不脏；重做 → 脏。和自带栈的行为逐条一样。
5. **新测试 D：不可恢复。** 故意让一个部件的 `swapRecord` 抛：`onUnrecoverable` 被叫一次，宿主收到 `onReset`，之后翻旧步抛 `StepOrderError`，泄漏门是 0。
6. **新测试 E：并步。** 留开的几个子步封口之后，宿主只收到一步。
7. **守卫**：翻的那段循环全仓只有一处；`workpiece.ts` 不 import `UndoStack` 的实现（只用类型）。
8. 画画仓 ADR-0008 末尾加一段修订（哪天、谁、为什么加了第二种存步的地方；那两条契约照旧）。`api/` 重新生成。0-1 定的「内核自己的测试」名单里加上新测试。
9. 升一个末位版本。

## 四、碰到这些就停下来报

- `workpiece.ts` 需要改逻辑。
- 现有测试要改。
- 某个部件的 `swapRecord` 会去读别的部件、或者别的作品此刻的状态（那就不满足「互不相干」，这个设计不成立）。
- 像素基线变了。

## 这一张不做的

三维的撤销栈怎么装这些步、配额怎么合起来算（1-8）；预算的出口（0-3）；一笔画在好几件作品上时，宿主怎么把它们并成自己的一步（1-4 / 1-8）。

## 施工记录

### 0-2（11-10 深夜 → 11-11，Claude Opus 5.5；画画仓分支 `kernel-steps-host` 最后一个提交 94055b4；**等 Fable 看**，没合）

施工细则（侦察之后）：`Workpiece` 和子类对撤销栈只用四样（独占绑定、收一步、「现在停在哪一步」、清空；`painting-workpiece.ts` 装载时清空）——共有的那一面就定这四样（`StepSink`）。后端靠 History 的变化回调数「真落了一步」（`strokeEnd` / `filterCommit` 的返回值），宿主模式下这个信号得照样有。没读的便条（撞名后缀、隐藏窗口、剪纸山树、后台流式、导入）和撤销无关，没动。

做完：
- `src/backend/workpiece/hosted-steps.ts`：`StepHost` / `StepOrderError` / `HostedSteps`（每步记前一步；`directionOf` 认方向、把关顺序；`flip` / `bytes` / `drop` / `clear`）。
- `undo-stack.ts`：翻一步的循环提成 `applyStep`（两个类共用）；`StepSink` 接口。
- `history.ts`：`hosted` 装法；`stack` 改成取值器（步归宿主管时抛），新 `steps`（给 Workpiece）、`hosted`、`flip(step)`。
- `workpiece.ts`：只改类型（`UndoStack` → `StepSink`，4 行）。
- `weebpaint-backend.ts`：注入口 `stepHost`；宿主模式下「真落了一步」的计数从 `HostedSteps` 的变化回调来，不发 `onHistChange`（能不能撤销归宿主）。
- 测试：`test/hosted-steps.test.mjs`（进内核名单 `test/kernel-tests.json`）—— A 两件作品共用一个宿主栈、夹别的步、随机撤销 / 重做 / 截断，12 个种子 × 60 步，每一下甲乙像素都和各用自带栈的对照组一样，最后全丢掉活步为零；B 乱用五种都抛 `StepOrderError`、像素和停的位置没变、之后按对的顺序能翻、同一步 drop 两次不出事；C 脏不脏两种装法逐条一样；D 不可恢复（onUnrecoverable 一次、宿主 onReset、旧步再翻抛错、活步为零）；E 并步（三个子步封口后宿主只收到一步，标签 `sub0+sub1+sub2`）；宿主模式下 undo / redo / canUndo / peekLabel 抛且没替宿主封口；没给 onUnrecoverable 建不起来；后端注入口（画一笔落一步、宿主翻回去像素回原样、`backend.undo` 抛）。`test/hosted-steps-guard.test.mjs`（扫源码，不进内核名单）：swapRecord 循环全仓只在 `applyStep`；`workpiece.ts` 只 import type 撤销栈。
- ADR-0008 末尾加修订一段；`api/` 重打。

门：
1. 画画仓 `npm test`：1751 过 / 1 红——红的是总账 lint 的「指针文件都存在」，行 31 指针 `../ai-docs/…` 在副本路径下找不到（副本的老问题，主目录不红；画画仓 CLAUDE.md 11-09 那条也记过）。内核那一套 `run-kernel.mjs` 557 过（含新测试）、泄漏门 0。全量层 `run-full.mjs` 3 过。显卡冒烟 PASSED。`tsc` 干净。现有测试文件一个字没改（只在登记处 `test/run.mjs` 加了两行、内核名单加了一行）。
2–7. 见上。
8. ADR 修订、api 重打、内核名单加上了。
9. **版本号没在这个分支升**：0-2 / 0-6 / 0-5 三张各开分支、等 Fable 都看过后一起合进画画仓 main（施工方案第 5 步），三个分支各升版本、各构建会在 `version.ts` / `dist/` / `index.html` 上互相冲突——合并时一次升一个末位版本、构建一次。

和施工单不一样的地方：
- `HostedSteps` 的构造多一个可选的 `opts.onChange`（收一步 / 翻一步 / 清空时调）：后端靠它数「真落了一步」，不给的话宿主模式下 `strokeEnd` 永远返回「没落」。
- `History` 加了 `directionOf` 之外的 `steps` / `hosted` 两个取值器；`stack` 从字段改成取值器（自带栈时照旧返回 `UndoStack`，现有用法不变）。
- 宿主模式下 `canRedo` / `peekLabel` 也抛（施工单写了 undo / redo / canUndo「这些」）。

不放心的：
- 后端在建的时候装载会清一次步，宿主在还没收到任何一步时先收到一次 `onReset`（测试里遇到过：宿主那边拿作品的引用要能处理「还没建好」）。1-8 接三维时注意。
- 宿主翻步之前要自己先 `sealCheckpoint()`；忘了会得到 `StepOrderError`（响亮，不会悄悄出错）。

