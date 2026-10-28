# 撤销 / 重做的制度：一步 = 一张通行证，被记的状态都是部件（CatsUp 的工件制）

> created 20261028 by Claude Fable 5.1 · as-of v0.15.29 / 2026-10-28 · 家族周账 F-113 · 纪元账本 FM144 / FM147
> user 2026-10-28 原话：「0.15.26 undo还是萎靡不振的，特别是物体模式下，比如建组之类的」「对，找到背后的深层系统性问题。然后思考能不能在静态甚至是写代码时就堵住」「然后记周帐，到时候让fable好好看一下undo redo的护栏，多做几层瑞士奶酪」「我们有一个系统的workpiece制度吗？」「切一下fable，你好好设计一下undo redo的系统，护栏」「我们以后会有各种元数据，节点编辑器，图片编辑，绘制，导入导出，whatsoever」
> 前情：`20261027-undo-delta-design.md`（A3：指令流 + 差量栈，自反交换，v0.15.15 落地）。本文不推翻它——栈的底子不动，动的是**栈上面那一层：谁有资格写、写了怎么成一步**。
> 对照：WeebPaint `ai-docs/adr/0008-workpiece-v2-token-collector.md`（令牌 + 部件收集器；user「我们有一个系统的workpiece制度吗」——WeebPaint 有，CatsUp 到 v0.15.28 为止没有）。

## 0. 一句话

**写之前先领一张「一步」的通行证；没通行证写不进（写出来就编译不过）；被撤销管的每样东西都是一个部件，各自收自己的记录；通行证还回去 = 一步。** 以后的元数据、节点图、图片层、导入导出，都是往部件表里加一行，不碰这套制度。

## 1. 根因（深层的系统性问题）

### 1.1 现状（到 v0.15.28）：三份真相靠自觉对齐

| 真相 | 住哪 | 谁保证它和别的一致 |
|---|---|---|
| 撤销栈：指令流 + 差量记录 + 每步的「之前 / 之后会话」 | `editor/history.ts` | — |
| 编辑器的活状态：场景、选区、上下文、马后炮会话、上一手势、充能、锁 | `editor/editor.ts` 的几十个字段 | 没有东西保证；选区在 editor.ts 里有 **38 处直接赋值** |
| 「一步」的边界 | `step()` 的一个计数器 `stepDepth` | 每个入口**自觉**包 `step()`；类型上随处都能提交 |

选区是事后对账：一步结束时拿现在的选区和上次记的比，变了就补记一条「0 条 op 的选区步」（`recordSession`）。这是**diff-after-the-fact**：它分不清「用户点了一下」和「某个动作做完顺手改了选区」。

### 1.2 这次抓到的失败类（10-28 复现 + 读码；都是同一个根）

1. **幻影步**：建组在步外提交 → 建组之后改选区（选中新组）被补记成一条空的选区步 → 按一次撤销「没反应」。同类入口 17 个（参考线、坐标架、设为组件原点、焊接、炸开曲线、上色、软化、全部显示、清空、预置、导入……），另外 2 个（镜像开头、切换工作台）是通行证逼出来的。
2. **拆步**：一个动作连着提交两条 op（设为组件原点 = 两条、隐藏 = 三条），在步外提交就是两三步撤销。
3. **马后炮不随工具关**：作废判据只看「之后有没有别的提交」；换了工具它还开着（user「马后炮我切换工具变成马前炮了之后还是显示着“刚才”」）。
4. **对外口和内部口不分**：`commitOp(op)` 既是探针 / 脚本的公开入口（147 处），又是内部的提交口——内部用它就天然在步外。
5. **重做失败只还原场景不还原会话**（`redo()` 的 catch 走 `installScene(err.restored)` 不带 session）——撤销栈和选区可能错位一格。
6. **驱逐后的「上一步复现包」重放整条指令流**（`lastStep()` 用 `stateAt`，O(指令数)）：不是错，是坑；大文件上会卡。

### 1.3 WeebPaint 的答案（ADR-0008）以及这里借什么、不借什么

借：**令牌制**（没令牌写不进，令牌关门 = 一步）；**部件制**（每种被记的状态自己收记录、自反交换）；**分类表**（recorded / silent / desk / transient，判据「这个值变了，用户期待 Ctrl+Z 撤它吗」）；**修订 10-13 的两条契约**（各部件记录两两可交换；调用者乱用时结果由规章定义、不是系统自己崩）。
不借：WeebPaint 的「拿到令牌后直接写 substrate、collector 扣押旧数据」——CatsUp 的内核记录已经是**影子换真身 + 差量**（A3），比扣押更省；形状不同，但「一步 = 各部件各一条记录」的骨架一样。
CatsUp 多一样 WeebPaint 没有的：**指令流**（op 可序列化、复现包 / 以后联机读它）。制度要保住它：部件记录是撤销的底子，指令流是解释「这一步干了什么」的底子，两边按步对齐（每步 = ops[i..j) + entries[i..j)）。

## 2. 制度：五条不变量

- **I1 一个用户动作 = 一步。** 一步里的全部 op、全部部件记录、会话变化一起撤 / 一起重做。只改选区的点按也是一步（user FM102「连续几步选区变化不合并」）。
- **I2 没通行证写不进。** 通行证只由 `step()` 发；提交口、选区口、上下文口都要它。静态：类型上没通行证的调用编译不过。
- **I3 被撤销管的每样东西都是部件。** 部件 = `{ kind, swap(record) → record, bytes(record) }`，记录是纯数据、自反交换。今天四种：brep 池差量、网格体整表、场景骨架 / 整份、**会话**。以后加一种状态 = 加一个部件，不动 History。
- **I4 会话（在哪个组件里 + 选中了什么）是部件，不是事后对账。** 选区 / 上下文的写都走通行证，记录在步里当场收，`recordSession` 退役。
- **I5 调用者乱用时结果由规章定义。** 步外提交、重复开步、撤销时手势没完、重做碰到目标不在——每种都有写明的结果（下表），不是系统自己崩或静默吃掉。

| 乱用 | 规章定义的结果 |
|---|---|
| 步外提交（通行证被闭包带出去用） | 自成一步 + 黑匣子记一条 + `stepViolations` +1（测试 / 探针读它，应当永远 0） |
| 一步里前面的 op 成功、后面的失败 | 整步回滚（已有 `rollbackStep`），重做尾巴不留半截 |
| 撤销时手势进行中 | = 取消手势，不动栈（已有） |
| 重做时目标不在（文件被别的路径改了） | 场景 **和会话** 一起回到重做前；提示「重做失败：…」；栈不动 |
| 马后炮改值时这一步已不是栈顶 / 工具换了 / 撤销过 | 会话作废、小窗关（关的时候说一句） |
| 撤到被驱逐的边界 | 「撤到头了（更早的 N 步超过 128 MB 配额，撤不回去）」 |

## 3. 瑞士奶酪：七层，每层写明挡什么、挡不住什么

| 层 | 是什么 | 挡什么 | 挡不住什么 | 状态 |
|---|---|---|---|---|
| **0 分类表** | 每样状态归 recorded / silent / desk / transient（§4 表） | 「该进撤销的没进、不该进的进了」这类设计错 | 分类本身判错 | 本文 §4 定，等 user 过目 |
| **1 静态** | `StepPass` 通行证（`step()` 发、`commitIn(pass, op)` 收）+ 守卫测试 `test/step-pass-guard.test.ts`（STEP_PASS 只在两处、内部不调对外 commitOp、history.commit 只有一个调用处） | 漏包 step 的入口写出来就编译不过（这次 17 + 2 个全是这么逼出来的）；对外口和内部口分开 | 把通行证存起来、在步外的闭包里用（例：马后炮的 redo 闭包——它由 `pressParam` / `setParam` 重新包步，合法）；工具边界 `toolPass()` 是运行时发证（工具只在包好的指针事件里被调，但类型上保证不了） | **done v0.15.29** |
| **2 运行时** | 步外提交 → 自成一步 + trace + 计数；重做失败回滚带会话；马后炮寿命 = 栈顶未变 ∧ 工具未换 ∧ 没撤销过 | 层 1 挡不住的闭包泄漏；§2 表的乱用 | 逻辑上成步、语义上错的步（例：一个动作拆成两次 `step()` 调用） | 计数 done v0.15.29；重做回滚 + 马后炮寿命 = Phase A 第二刀 |
| **3 结构** | 会话部件：`setSelection(pass, …)` / `setContext(pass, …)` 唯一写口，记录在步里当场收，`recordSession` 删 | 幻影步整类消失（不再事后 diff）；选区写散落 38 处 → 1 处 | 部件记录之间的隐性依赖（WeebPaint 10-13 那种）——靠 I3 第二问 + fuzz | Phase A 第二刀 |
| **4 差分 oracle** | ① 每步之后 `history.replay()` 指纹 == 活场景（测试里已有，探针加）② **编辑器级 fuzz**：随机的用户动作序列（建组 / 进出 / 点选 / 挪 / 挤出 / 撤 / 重做），每步断言：步数 == 有效动作数（没有幻影步）、撤到 0 再重做到底逐字一致、撤销后的会话 == 步前会话、`stepViolations === 0` | 实现错（记录错、交换不自反、会话错位） | 没被随机到的动作组合 | Phase A 第三刀（fuzz 接 `test/kernel-fuzz.test.ts` 的骨架） |
| **5 披露** | 撤销 / 重做提示行：「撤销：建组」「重做：移动 8 个点」「撤到头了」「重做失败：…」；步带标签（动作的名字；注册表指令有 title，op 有 describe） | user 看不出撤了什么（FM144） | — | Phase A 第二刀 |
| **6 黑匣子** | trace 已记 op / undo / redo；加：步的开合、`stepViolations`、幻影步（0 op 且会话没变）、马后炮作废原因 | 真机报「撤销不对」时能从黑匣子定位到哪一步 | — | Phase A 第二刀 |
| **7 审计** | F-113：Fable 周期性对抗审计（重点：新部件进来有没有绕过通行证、记录可交换性） | 制度被慢慢绕开 | — | 家族周账 |

「可交换性没有机械执法」（WeebPaint 10-13 自认的软肋）在这里同样成立：靠 I3 两问 + 层 4 fuzz。

## 4. 分类表（层 0；判据 = 「这个值变了，用户期待 Ctrl+Z 撤它吗」）

| 状态 | 归属 | 部件 / 记录 | why |
|---|---|---|---|
| 内核几何（brep 池、网格体）、边 / 面的标记层（软硬、折痕、材质槽、隐藏、以后的自定义标记） | recorded | kernel 差量 / mesh 整表（已有） | 内容本体 |
| 场景骨架：实例变换、定义、组、材质表、坐标架、参考几何、锁定、层 | recorded | scene 骨架 / 整份（已有） | 内容本体 |
| **会话：在哪个组件里 + 选区** | recorded | **会话部件（新）** | user FM102 / FM106 定的；撤销 = 场景和选区一起回去 |
| 文档设置：单位、格距、尺度参考订阅 | silent | 不记、标脏 | 「调好的手感是偏好不是创作」（WeebPaint §4 同判）；现状如此 |
| 参考窗牌组 | silent | 不记、标脏 | WeebPaint referenceGallery 同判；现状如此 |
| 桌面态：☰ 停哪页、视角、窗的位置、线稿粗细 | desk | 不记、不标脏 | 现状如此（`CATSUP_desk`） |
| 工具、工作台、锁轴 / 锁面、充能、X 光、隔离、悬停 | transient | 不记 | 导航 / 工具态；撤销不撤手里的工具 |
| 马后炮 / 马前炮会话 | transient，**但寿命挂在步上** | 不记；栈顶变 / 工具换 / 撤销 = 作废 | 它是「刚才那一步」的把手，那一步不在栈顶就没有意义 |
| 上一手势（数值小窗用的 `last`） | transient，寿命同上 | 不记 | 同上 |
| 相机 | transient | 不记；以后可学 WeebPaint step.hint（非权威的「撤销时跳回去看」） | 舒适度 |

以后的部件（user：「各种元数据，节点编辑器，图片编辑，绘制，导入导出」）：

| 以后的东西 | 进来的样子 | 归属 |
|---|---|---|
| 物体级元数据、自定义标记（FM135） | 住内核的标记层 / 定义上的 json → 已有部件覆盖；定义级的 json 走 scene 骨架记录 | recorded |
| 节点图 / 配方（FM131：只当附件、不是真相） | 一个 json 部件：记录 = 整份 json（结构共享，小） | recorded（它是用户编辑的东西）；它生成的几何烘进内核 = 普通 op |
| 图片层 / 绘制（和 WeebPaint 结婚） | 直接抬 WeebPaint 的 LayerTiles 部件（tile 句柄记录、引用计数）——形状完全对得上 | recorded |
| 导入 / 导出 | 导入 = 一条 op（已有 `importScene`，scene 整份记录）；导出不改状态 | recorded / — |
| 模拟 / 过程生成（魔法纪元） | 产出是物体 = 普通 op | recorded |

## 5. 施工序（Phase A 三刀，每刀一版、各自推开发版；Phase B 等第一个新部件）

- **刀 1（done v0.15.29）**：通行证 + 守卫测试；17 + 2 个入口包成一步；对外 `commitOp(op)` 一次调用 = 一步、内部 `commitIn(pass, op)`；步外提交计数。
- **刀 2**：会话部件（`setSelection` / `setContext` 唯一写口，38 处收口；`recordSession` 删）；重做失败回滚带会话；马后炮寿命规则（换工具就关、关时说一句）；撤销 / 重做提示行 + 步标签；黑匣子加步边界。
- **刀 3**：编辑器级 fuzz + 探针加 replay 对照；`lastStep()` 改读「这一步之前的记录」而不是重放指令流。
- **Phase B**：`History` 的记录从 4 个写死的种类改成部件注册表（`registerComponent(kind, swap, bytes)`），第一个消费者 = 节点图或图片层，到时按 WeebPaint ADR-0008 §2 的形状做；今天不做（没有消费者就是元编程）。

## 6. 提案 .h（刀 2 / 刀 3 的目标签名；现状见 `api/src/editor/history.d.ts` / `editor.d.ts`）

```ts
// editor/history.ts —— 不变：commit / undo / undoOp / redo / dropRedo / log / position / depth / replay / stateAt
export interface StepLabel { readonly title: string; readonly count?: number }        // 「建组」「移动 8 个点」
commit(s: Scene, op: Op, join?: boolean, before?: Session, label?: StepLabel): ApplyResult;
commitSession(before: Session, after: Session, label?: StepLabel): void;              // 会话部件：之前 / 之后当场给，不再事后 diff
undo(): { scene; before: Session | undefined; label: StepLabel | undefined } | null;  // 提示行用 label
redo(): (ApplyResult & { after: Session | undefined; label }) | null;
evictedSteps(): number;                                                               // 「撤到头了（更早的 N 步超过配额）」

// editor/editor.ts
declare const STEP_PASS_BRAND: unique symbol;
export interface StepPass { readonly [STEP_PASS_BRAND]: true }
private step<T>(fn: (pass: StepPass) => T, label?: StepLabel): T;                     // 唯一发证处
private commitIn(pass: StepPass, op: Op): FaceEvent[];                                // 唯一提交口
commitOp(op: Op): FaceEvent[];                                                        // 对外：一次调用 = 一步
private setSelection(pass: StepPass, sel: SelSnap, mode: "replace" | "add" | "toggle"): void;   // 会话部件的唯一写口（替掉 38 处直接赋值）
private setContext(pass: StepPass, ctx: EditContext): void;
readonly stepViolations: number;                                                      // 探针 / 测试：应当永远 0
```

## 7. 要 user 拍的（一个回合；每条有默认，不拍就按默认做）

1. **刀 2 动不动**：它要把 editor.ts 里 38 处直接改选区的代码收成一个口，是编辑器核心的一次收口（app 层，不是 store 红区；家规「大胆重写不留恋」）。**默认：做**，排在自由建模这一波里、放置模块之前——撤销是数据安全，比新功能先。
2. **文档设置（单位 / 格距 / 尺度参考）进不进撤销**：现状不进、只标脏。WeebPaint 把透视网格升成了 recorded（因为它随几何重映射）。**默认：不进**（CatsUp 的格距不随几何变）。
3. **撤销 / 重做提示行的样子**：「撤销：建组」「重做：移动 8 个点」「撤到头了（更早的 3 步超过配额）」。**默认：这样**，不带时间戳、不带编号。
4. **马后炮寿命**：栈顶没变 ∧ 工具没换 ∧ 没撤销过；换工具就关，关的时候提示行说一句「刚才那步的参数已收起」。**默认：这样**。
5. **Phase B 的时机**：等第一个新部件（节点图 / 图片层）再把 History 改成部件注册表。**默认：等**。

## 8. 已落地（v0.15.29，2026-10-28；diff 主体由 Claude Opus 5.5 写于切换模型前，Claude Fable 5.1 核过、分开对外 / 内部口、补守卫测试后提交）

- `StepPass` 通行证：`step()` 发、`commitIn(pass, op)` 收；`toolPass()` 是工具边界唯一的运行时发证口；步外提交自成一步 + trace + `stepViolations`。
- 对外 `commitOp(op)` = 一次调用一步（探针 / 脚本 147 处照旧）；内部 62 处全走 `commitIn(pass, …)`。
- 包进一步的入口（19）：参考线 ×4、坐标架 ×2、设为组件原点、清空、预置、加段、导入、焊接、炸开曲线、建组、全部显示、上色、软化、镜像开头、切换工作台、修复面板开头。
- 守卫 `test/step-pass-guard.test.ts`；复现脚本（建组 → 撤销）：撤销栈从 `addEdges, 选区, makeGroup, 选区(空)` 变成 `addEdges, 选区, makeGroup`。
- 验证：915 单测、开机 / 冒烟、undo-session / mesh 五个 / context / plane-lock / new-primitive / submenu 探针全绿（无头）。
