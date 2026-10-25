# 狗咬坦克纪元（0.14）账本

> created 20261025 by Claude Opus 5.5 · as-of 2026-10-25（main = 5ed5699 / v0.13.74；纪元还没开工）
> **记账规矩**（user 2026-10-25 在 CatsUp 会话）：「所有的设计决策都得我在这里和你拍，那边的只是探索。我待会会一个一个和你说这个纪元要做的东西。」——「那边」= 私仓「建模历史」会话（`~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261025-*`，不在本仓，入口 `20261025-index.md`，主题三 `20261025-dog-vs-tank.md`）；「这里」= CatsUp 会话。
> 所以 §3 只收 user 在 CatsUp 会话里拍的；§4 是那边的探索，**没拍、不是要求**。本仓公开：从私仓只搬和 CatsUp 设计有关的结论和原话。

## 0. 一句话

user 2026-10-25：「简单来说是坦克被狗咬了一口不应该作为需要回炉重做的理由」。

名字来自 user 同日在建模历史会话里出的检验题：「如果我把坦克打印出来，作品丢了，然后坦克被椎菜的狗啃了一下。你能把tank.catsup.glb捞回来吗？」（椎菜 = 一部 galgame 里做塑料瓶火箭的小女孩，这里只当名字用。）

## 1. 开工前置（按顺序）

1. **Fable 收工**：main 工作区现在有 Fable 没提交的迁库改动（store 2.2.0 / gallery 0.8.7 / workbench-elements 0.1.3，`src/version.ts` 写到 v0.13.76）。user：「等fable做好我和你说可以之后就bump minor」。
2. **`refwin-v0.13.75` 分支**（10-25 Opus 接参考窗 0.5.0）没合、等 user。它和 Fable 的 v0.13.76 版本号挨着，合的时候要理顺序。
3. **bump minor 之前先问 user 要不要把之前的版本推 prod**（家族规矩；prod 现在 = v0.10.2，10-24）。
4. 本 worktree（`.claude/worktrees/dog-tank-ledger`，分支 `ledger-dog-tank-epoch`）merge 回 main。
5. bump 0.14.0，开工。

## 2. 为什么是狗（背景）

### 2.1 不是天空、不是贴图、也不是先画个坦克测引擎

| 候选 | 为什么不是它（user 原话） |
|---|---|
| 天空盒 / GI | 怕的是数据契约乱，不是天空本身：「然后天空盒我理清楚了，我怕的是数据契约乱掉，但是其实moonsinger里面小月相的配置也是屎山。只是和sheet music分租罢了」——各住各的扩展（分租）就解了，不挡路。 |
| 贴图 | 「后面的花」，不排在几何后面（§3 待确认的那条）。 |
| 先老老实实画坦克，测引擎完善没 | 那是适航标准，永远在做起飞前检查：「cessna就会stall，工程才是让我fear的东西，因为这样我会永远做preflight。而不是非一半爬出去修。但是weebpaint的collapse all, blender的snap to mirror，就是你交付了，飞一半之后，可以爬出去在机翼上装一个加特林」 |

### 2.2 真正挡路的：怕搞坏，坏了不能修

- 「其实不想造坦克是因为 我怕搞坏……坦克是一个没有卡在整数点上的vertex会把所有的邻居带歪……所以我一直不敢把它当桌子和夹具。」
- 「关键在于weebpaint和moonsinger都是app nuked了我可以靠一张朋友圈截图无痛复活。但是catsup那个坦克反而就是让你对着截图画坦克的工作。」——WeebPaint 有合成图（ORA 里的 `mergedimage.png`），MoonSinger 有谱子，存档坏了能照着复活；CatsUp 的模型没有这种「通用形式」。
- 「我怕的不是丢拓扑，而是那个obj里面差了1mm. su里面这种微调是不可能的，必须擦了重画。」
- 「a 1mm alternator belt dent dont just nuke the alternator. through 对齐引擎, it will keep producing the noise and viberation through the whole airframe. that is the biggest fear of a not-perfectly-aligned vertex」
- 「会不会是没有互导。如果catsup能接住gta逆向的rhino，即使我后来一辈子没用在用过gltf export。我也不怕catsup nuke……关键在于psp gta rhino不是brep。而是需要清理三角的。」
- 标准是艺术（博物馆修复），不是工程（适航）：「你的cessna方案反而是我的spiral，我们需要的是art……荷马是因为半首歌也是歌，残篇也是诗。」
- 真谛（user 自己的总结）：「所以其实可以超越minecraft。只是Minecraft是一刀切。quarantee。我们是先放开，然后看failure mode，然后做护栏，做recoverable，就是那个make planar, quantize, 互导和几何清理。这个应该也就是狗咬坦克纪元的真谛。这也是我们超过sketchup开始得开始创新的第一步」

### 2.3 代码现状（核过 2026-10-25，main 5ed5699）

- 外来 glb 拒开：`src/format/read.ts:57` `fail("not a CatsUp document (no CATSUP_document extension)")`——连 CatsUp 自己导出的文件，私有扩展丢了也回不来。
- OBJ 导入只进边，面由内核长回来；三角汤（游戏里拆出来的全三角网格）进来就是一堆三角面，共面的对角线都还在。
- 没有镜像 / 对称工具；只有实例变换接受行列式 < 0（`src/scene/xform.ts:79`）。
- brep → mesh 有数据通路（`src/scene/kinds.ts:63 brepToMesh`），mesh 的渲染和 UI 没有。
- 共面容差 10 µm（v0.13.31）：挪一个点 1 mm，面就不平 → 自己折成三角，或者擦了重画。
- 吸附排序 = 周账 F-85（Fable 票，「边 > 轴 > 栅格」收成一张表）。和「1 mm 振动」挨着：已有的边压过栅格，一个歪顶点就成了后来画的东西的基准。

## 3. 这边的条目（只收 user 在 CatsUp 会话里提的 / 拍的）

状态词：**拍了** / **待拍**（user 提了，形状还有问题要定）/ **讨论中**（user 问的是「要不要」）。

| # | 条目 | user 原话 | 状态 |
|---|---|---|---|
| DT0 | 下一个 minor = 狗咬坦克纪元（0.14.0）；Fable 收工、user 说可以之后 bump | 「等fable做好我和你说可以之后就bump minor，狗咬坦克纪元」 | 拍了；等 §1 前置 |
| DT1 | 基建：Blender 式**指令注册表**（深模块窄接口）+ 通用接口 | 「首先是基建。不过可以sprint之后算周账让fable来做，取决于你是否能做好，就是类似blender，我们以后会有很多指令，能不能有一个深模块窄接口指令的注册表。以及通用接口」 | 待拍：谁做、提案 .h |
| DT2 | 送命题：要不要永远不用 mesh、统一用 brep | 「然后是一道送命题：要不要永远不用mesh，统一用brep。也许brep数据结构真的接不住。然后吃书变成vertex driven也不好」 | 讨论中 |
| DT3 | 要不要专门的修复 workflow 模式 | 「然后是要不要专门开一个修复的workflow模式，不过这个应该只是ux的花，不重要。类似blender不同的workflow只是可以看见不同的指令，不同的鼠标理解方式。」 | 讨论中（user 倾向：只是 UX 的花）→ 被 DT6 接走 |
| DT4 | 修复指令 ①：**吸到整数格点**，作用域 = 选中的物体；放右键菜单；点了弹对话框（含不含子物体 / 吸多少）；要预演 | 「然后我开始说指令了。首先是snap to 整数点，作用域是选择的物体。你帮我想一下叫什么好。我的建议是放在右键菜单里面。以后我们要做blender式的搜索，现在东西不多还不用整理。然后是点了之后弹出一个对话框。是否包括子物体，以及snap多少。我们的undo and editing engine支持preview吗，如果不支持周账给fable看一下有没有聪明的重构。反正就是snap to integer point。以及这个时候各种面破怎么办」 | 待拍：名字、坐标系、破面默认 |
| DT5 | 修复指令 ②：把共轴的线**全量焊接**起来 | 「然后第二个修复指令是把共轴的线给全量焊接起来」 | 待拍：名字、作用域 |
| DT6 | 修复的东西都整合进**一个修复面板** | 「aha，要不所有的东西整合到一个修复面板里面？」 | 讨论中 |

### 3.1 各条的现状和要定的点（AI 看法，没拍）

**DT1 指令注册表**
- 现状（核过）：「指令」散在五处——`src/app/main.ts` 的 keydown（工具键表 + 一串 if：G / Ctrl+G / Ctrl+A / Shift+Z / Delete…）、`HudModel.edits()`（选区动作：右键菜单 / 上下文条 / VR 手腕面板三个渲染器共用，`selection-actions.ts`）、☰ 和视图菜单、`tool-config.ts` 的工具动作、Editor 上的方法（makeGroup / explodeSelection / zoomExtents…）。底下的 `ops.ts` 有 37 种可序列化 op（撤销、复现包都吃它）。拖手势的工具另有 `ToolHandler`（≈ Blender 的 modal operator）。总账 A3「动词注册表」（2026-09）说的是工具手势那层，已被 0.13 刀 ② 的 `tools/` 搬迁做掉。
- 形状候选：一张表，一条 = `{ id, 名字, 图标, 快捷键, 什么时候可用（poll：模式 / 选区 / kind）, 参数表, 执行 → Op }`；右键菜单、☰、快捷键、以后的搜索、修复面板、数 op（GTA 毕业考要数）都只读这张表。工具 = 表里的一种条目（「切到这个工具」），手势仍走 `ToolHandler`。
- 谁做：注册表本身 + 把五处搬过去 = app / editor 层的活，探针能验；「通用接口」里跨 kind 那半（brep / mesh / 实例各吃哪些指令）挨着 Fable 的物体模型契约（`20261024-object-model-contract.md`）→ 建议 Opus 先写提案 .h 给 user 拍，sprint 里做表 + 搬迁，跨 kind 的 poll 那部分周账请 Fable 审。

**DT2 brep vs mesh**
- 现状（核过）：mesh 只有数据形（`positions / indices / triMaterial / materialSlots`，契约稿另写了可选 `uvs / normals`），`modes: []` 不能编辑；只通 brep → mesh 一个方向（`brepToMesh`）。
- brep 接得住的：三角汤的拓扑（每个三角都是平的，SU 导入网格就是三角 + 软边 / 隐藏边；CatsUp 有软边和平滑组）。
- brep 接不住（或者一进门就改了它）的：① 脏的外来数据原样——brep 进门就结算，重叠的贴花三角、穿插面会被切开 / 合并，残骸还没决定怎么修就被改了；② 每个角上的属性——UV、顶点法线 / 颜色（契约稿：「mesh = 显式 UV……别的软件进来的『被拉伸的贴图』只能住这里」；GTA mod 毕业考要把带 UV 的 Rhino 放回游戏）。
- 1 mm 的怕可以在 brep 里解，不用 mesh：现在挪点让面不平 → autofold 折出新的硬缝；折不了（结点多边形 k ≥ 4 还不平）→ BURST，面没了只剩边框。候选 = 「可逆的折」：折缝是软的，点挪回平面时自动消失。这是内核契约，归 Fable。
- AI 建议（没拍）：本纪元 brep 是唯一能编辑的；mesh 不做编辑，只当托盘装 ①② 这两样，显式 cast 成 brep 才能改；不变 vertex driven（不吃书）。「永远」先不拍——有机建模（Blender 模态）那条 10-24 说过是另一个内核。

**DT3 / DT6 修复模式 vs 修复面板**
- AI 看法：面板比模式合适。模式 = 换一套工具 + 换鼠标理解方式（`src/editor/mode.ts` 已有接缝）；修复指令都是「选好范围 → 设参数 → 看预演 → 一次应用」，不需要换鼠标。像 SU 第三方插件 CleanUp³ 那样一个面板勾几步，一次预演，一次应用 = 一个 `batch` op = 一次撤销（`batch` op 已有）。步骤按固定顺序跑（先吸格点，再焊断口——吸完会冒出新的共线断口）。
- 每一步同时是 DT1 表里的一条，所以右键菜单 / 以后的搜索也能单独叫它。

**DT4 吸到格点**
- 名字候选：「吸到格点…」（界面已有「吸附」「格点」两个词；带省略号 = 点了弹对话框）；内部 id `snapToGrid`。
- 对话框：含不含子物体；吸多少（默认 = 文档的格距 / 细分）；**要定：按谁的坐标系吸**——组件实例转了 30°，按世界格点吸会改它的定义，同一组件的别的实例就离格了。候选：默认按物体自己的轴吸（定义坐标），世界格点是选项。
- 预演（核过）：工具有预演（`Editor.computeLive` 把活动池的内核克隆一份跑工具）；**对话框式指令、跨好几个选中物体的预演没有通路**（只克隆活动池那一个内核）。→ 周账请 Fable 看：「任何 Op 都能预演」（History 本来就存 Scene 克隆，把 Op 跑在 Scene 克隆上画出来，应用 = 同一个 Op）。
- 面破（核过 `kernel.moveVertices`）：顶点被吸走时内核会 ① 两个点落到同一格点 → 合并（短于半格的边消失）；② 面不平 → autofold 折出新硬缝；③ 折不了 → BURST 面没了。候选：预演里报数并高亮「会合并 N 点 / 折 M 张面 / 破 K 张面」，破面的默认由 user 定：照吸并标出来 / 那几个点不吸 / 折缝用软边。不硬拦。

**DT5 焊上断口**
- 名字候选：「焊上断口」（界面已有「断口」——共线断开处的小鼓包，A33 / A35）；**不叫「焊接共轴线」**，因为「焊接」在 CatsUp 已经是 B19「边链 → 曲线」。
- 零件已有（核过）：`Kernel.isBreakJunction`（度 2、两边共线、两边面链接相同）+ `dissolveVertices` op（焊边橡皮用的同一份）+ `Editor.breakTicks()`（画小鼓包的那份集合）。要做的只是「范围里所有断口一次溶解」，作用域同 DT4。

**待这里确认**（那边 user 自己标了「决策」；按上面的规矩，要在这边再拍一次才算数）：
- 建模历史 U47：「再拍一个点。决策：alternator belt（几何引擎）可以带伤飞，不要用它来做拖延后面的花，比如贴图，地形，花花草草的借口。可以每个scope bleeding都在数据契约上面互相quarantee。这样可以随时sunset」（「quarantee」按上下文读作 quarantine = 隔离）

## 4. 探索期的候选（建模历史会话；**没拍，不是要求**）

「出处」列是私仓 `20261025-dog-vs-tank.md` 的节号。

| 候选 | 谁提的 | 出处 |
|---|---|---|
| 量化：硬点卡在格子上，小于半格的噪声吸回精确值（已有 v0.11.4 绝对网格 + 整数长度、v0.13.64 新文档默认吸附） | AI 读法，接 user「没有卡在整数点上的vertex」 | §4、§5.2 |
| 可打破的镜像：半个组件 + 翻转实例，改一边两边变，最后炸开打破对称；snap to mirror 当修复动词 | user（「只要我们没有automirror……我做的几个模型都是只敢拉不对称的」「little red的时候之所以敢apply mirror modifier也是因为画歪了有snap to mirror的功能」）+ AI 读法 | §5.2 |
| make planar 是用户选的动词，不是内核每一步都要过的法律（面可以略微不平） | user 提了 make planar；「动词不是法律」是 AI 读法 | §5.2、§6 |
| 互导：外来 glb / 三角汤能进来 | user（建模历史 rantlist R-28） | §5.1 |
| 描红：外来网格当半透明鬼影铺在场景里照着描；吸附只吸鬼影的顶点、吸完再落格，引擎不被它带歪 | user（「the 描红 is a snapping solution where you can put a transparent Rhino as overlay and the snapping engine dont nuke you」）+ AI 细化；user 另一句「可能需要的不是reference window，而是layer opacity. 小学生需要的是描红纸。 但真正的护栏是铅笔和橡皮」 | §5.2、§7 |
| brep → mesh 的 collapse（WeebPaint「collapse all」的 3D 版）+ mesh 上的小修复台（显示 / 带衰减挪点 / 合并 / snap to mirror / 外来网格当残骸进来）；brep 仍是机床，collapse 单向 | AI 读法，接 user 的 collapse all | §6 |
| 救不回的残骸塌成三视图（三张已知尺度的正交图）再描 | user 脑洞（「if the rhino is fundamentally nonredeemable, we can collapse it to three 三视图 for 描」） | §7 |
| 吸附按信任排：基准（栅格 / 轴）和格上几何先；离格几何只在明确吸那个端点时用、不产生推断；鬼影最后——治公差累积 | AI 读法；挨着 F-85 | §7 |
| 自动清理三角汤：一次「溶解共面边」 | AI 读法 | §5.2 |
| 三个验收：① 狗咬测试（从照片 / 扫描捞回，不要求逐字节）② PSP Rhino 三角汤进来，焊一挺加特林，存档 ③ 故意挪一个点 1 mm，用镜像或格子吸回，邻居不跟着振 | AI 提；user「the dog vs tank test is a solid fix」 | §9 |
| 毕业考 = 一个真的 GTA mod（Claude 写代码、解包打包，user 只建模并数 op），毕业后停车换方向 | user（「I like you kid modding gta graduation test」「id happy to park it a while」） | §8 |

## 5. 和现有账的关系

- 总账顶部「方向」那条（Fable 10-25 记「下一个minor开始搞光影或者贴图」）→ 被 DT0 换掉。渲染模式纪元 / 贴图纪元（总账「七」）照旧没排期；§3 那条 U47 如果在这边拍了，它们就不排在狗后面。
- F-85 吸附排序（Fable 票）是这个纪元的一块地。
- 描红纸的两种底：鬼影网格；带长度尺度的参考图（B42「每一个图片必须有一个长度尺度」）做成场景里的一块平面。`refwin-v0.13.75` 接的参考窗是浮窗，不是场景里的底。

## 6. 流水

- 2026-10-25 Claude Opus 5.5：开账（worktree `.claude/worktrees/dog-tank-ledger`，分支 `ledger-dog-tank-epoch`，从 main 5ed5699 起）；总账顶部挂指针。等 user 逐条说要做的。
- 同晚：user 给了 DT1–DT6（基建注册表、brep / mesh 送命题、修复模式、吸到格点、焊上断口、修复面板）；AI 看法记在 §3.1，都没拍。Fable 迁库（v0.13.76）还在 main 工作区里没提交。
