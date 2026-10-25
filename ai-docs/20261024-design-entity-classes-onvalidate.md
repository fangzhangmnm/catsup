# 设计稿（建模历史）：实体分类与 OnValidate

> created 20261024 by Claude Opus 5.5（私仓「建模历史」会话的 handoff 原稿 `~/jupyter/20260520 私仓/20261023 建模历史/handoff/20261024-catsup-design-blender-mode-and-verification.md`）· 2026-10-24 由 Claude Fable 5.1 按主题拆成几份拷入 CatsUp（user「帮我把猫娘验证和blender的那堆研究和rant分开来放两个ai docs」「或者拆更多也行，按主题」），**正文逐字未动** · as-of 2026-10-24 · 状态：讨论定下的方向，未排期（排期归 user）
> 出处：user 2026-10-24 在「建模历史」会话里的讨论（私仓 `~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261024-discussions.md` D-1 … D-14；背景 = 同仓 `ai-docs/20261023-vr-scene-postmortem.md`，user 2024 年一个放弃的 VR 场景的 postmortem）。只收和 CatsUp 设计有关的结论与 user 原话；引用一律原样。
> 同批拆出的几份：见 `20261024-design-from-modeling-history-index.md`。

## 6. 实体分类与 OnValidate（定）

- 「所以是这种实体，有不同的类。验证猫娘和非人型验证。然后billboard/note，然后用户可以全局定义类型，比如EnemySpawnPoint和字段结构，类似custom inspector，只是只有数据没有代码，或者顶多onvalidate的一些可编程选项……不过我们也拦不住策划用comment说这里有boss.不过here should be a boss fight. vs anchor for boss spawn and wave configuration语义上本来就不一样」。
- 引擎直接读的玩法实体（刷怪点、剧情触发）是另一个单一职责；让引擎读注释 = 滥用。注释可以**明确地**晋升成带类型的实体，引擎永不直接读牌子上的字。
- OnValidate：「一辆车，ssot是engine power，但是我调的时候我希望看到的是百公里加速和最大速度。所以还是验证……然后range这种护栏当然要，当然这个不用元编程就行。所以这么说的话就是字段还是不让元编程自己动，只是加一个validate算出来的面板允许scripting，包括可以更换显示属性。猫娘寻路也是一个例子」→ 字段 = 引擎读的唯一事实（数据 + 声明式护栏）；验证面板 = 脚本只读不写的估算（要一眼看出是估算；慢的异步）。
- 要定清楚的：每个类声明「只在编辑器」还是「导出」；人形验证器读全局「角色档」（速度、胶囊体、眼高、跳高、台阶高，可多套）；注释标签（TODO / BUG / 意图）汇总成清单；用户类按家族格式版本纪律演进（未知字段原样保留）。
