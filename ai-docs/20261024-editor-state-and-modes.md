# 编辑器 state 架构重构 + 第二编辑模式（提案稿）

> created 20261024 · as-of v0.12.7 / 2026-10-24 · created by Claude Fable 5.1
> 出处：user 2026-10-24「拍板：你好好想一下编辑器state的架构重构，然后油漆桶算作第二个编辑模式，我们现在有两个编辑模式了，geometry，第二个你想个名字，包括油漆桶，碰撞元数据，各种贴图assignment，但是不是bodypaint」「所以油漆桶不属于第一个编辑模式，第二个编辑模式也许有选择，但是很多别工具会没有」。
> 性质：**提案**。拍了的只有：两个模式；油漆桶归第二模式；第二模式工具集另一套（也许有选择）；模式切换 = 左上下拉框（版图文档）；**第二模式名字 = 「表面」（user 2026-10-24「表面也是建筑里面的术语吗，如果这样就表面」；建筑里有「表面处理 / 表面材料」、精确些叫「饰面 / 面层」，游戏引擎 surface = material + physics，三边都认；edited by Claude Fable 5.1）**。state 切法、落地顺序仍等 user。

## 1. 现状 .h（api/src/editor/editor.d.ts 现值，节选）

`Editor` 是一个 ~2000 行的类，同时管：场景 + 历史（`loadScene / undo / redo / revision / sceneRef`）、上下文（`context / enterPool / exitContext / contextCrumbs`）、选区（`hasSelection / selectExpand / deleteSelection / makeGroup / makeComponent / explodeSelection / selectConnected`）、工具与手势（`tool / setTool / cancel / isGestureActive / pointerDown/Move/Up`、各工具的私有状态 `anchor3 / cursor3 / ppFace / rotCenter / scale…`、`handlers`）、推断（`charged / chargedEdges / snapInfo / grid`）、油漆（`paint / setPaint / paintFaces / paintSelection / softenEdges`）、视图（`cam / lineStyle / lineWeight / toggleProjection / zoomExtents / draw / viewExtras`）、VCB（`vcbState / applyVcb`）、参考几何（`addGuideLine / clearGuides / setContextAxes`）。
host 接口（`EditorHost`）：`hint / tip / changed / trace / error / marquee`。

**问题**：① 工具态和文档态混在一个对象里，模式切换 = 得知道哪些字段该清；② 油漆桶的 `paint / paintFaces / 油漆桶模式` 和几何工具平级地挂在 Editor 上；③ HUD（main.ts）靠几十个 getter 拼状态。

## 2. 提案：三层 state，一个模式位

```ts
// —— 文档态（进 undo / 进文件）——
interface DocState { scene: Scene; history: History; revision: number; }               // 现 Editor 的 scene/history 原样搬出
// —— 会话态（不进 undo；进文件的只有 grid / axes 已定）——
interface SessionState { ctx: EditContext; selection: Selection; selectedPools; charged; chargedEdges; grid: GridSettings; cam: OrbitCamera; lineWeight; }
// —— 模式态：当前模式 + 它的工具集 + 它的手势状态；切模式 = 整块换掉 ——
interface Mode {
  readonly id: ModeId;                     // "geometry" | <第二模式>
  readonly tools: readonly Tool[];         // 这个模式有哪些工具（左柱按它排；别的模式的工具不存在）
  readonly defaultTool: Tool;
  handlers: Partial<Record<Tool, ToolHandler>>;
  enter(ctx: EditorCore): void;            // 切进来：选区语义 / HUD 版图 / 渲染叠加层
  leave(ctx: EditorCore): void;            // 切出去：清手势、清模式专属选区
  viewExtras(): Partial<ViewState>;        // 模式自己的叠加层（第二模式：碰撞体 / 贴图投影预览）
}
// —— 核（给模式和 HUD 的窄接口；就是现在的 ToolCtx 往上长一层）——
interface EditorCore { doc: DocState; session: SessionState; commitOp(op): FaceEvent[]; world(): WorldView; snap(...); hint(); … }
```

- **几何模式（geometry）**：现在的全部工具减去油漆桶。
- **第二模式**：油漆桶、碰撞元数据（面 / 组件级：可碰撞 / 不可碰撞 / 触发器 / 物理材质）、贴图指派（材质 + UV 投影方式 + 平铺尺寸）、以后的「元数据分析」；**不是 bodypaint**（不画像素）。工具集另一套：选择（也许）、油漆桶、取样（吸管）、碰撞刷、贴图投影调整；没有画线 / 推拉 / 移动。
- **名字 = 「表面」surface（user 2026-10-24 拍板）**。原候选：**「表面」surface**（我的推荐：这些都是"这张面是什么"——材质、物理、贴图——对应几何模式的"面在哪"；游戏引擎里 surface = material + physics 正是这个集合）；「属性」attribute（更泛，连元数据分析也装得下，但 user 可能嫌抽象）；「涂装」livery / 「皮肤」skin（偏贴图，装不下碰撞）。
- **选区语义按模式**：几何模式选边 / 面 / 池；表面模式选「面集」（一张面 / 平滑组 / 到锐角 / 连通体 / 整组 = 现在油漆桶的「涂哪些」变成选区展开规则）。
- **切模式**：左上下拉框（版图 §2）；切出时清手势；选区能保留就保留（面选区两边都认）。
- **文件格式**：碰撞元数据 = 面属性层 `attributes.face.collision`（u8）+ 组件级 `extras`；贴图指派已在（材质槽 + sizeM），加 UV 投影方式字段时按格式纪律升 brep minor。

## 3. 切法（刀口顺序，每刀行为零变更）

① `EditorCore` 接口 = 现 `ToolCtx` 外加 doc / session 访问；main.ts 的 HUD 改读它（不再直接读 Editor 的几十个 getter）。
② `Mode` 接口 + `GeometryMode`：把 `handlers` 表和工具专属字段搬进去（偏移 / 跟随 / 弧 / 卷尺 / 轴 / 量角器已经是模块；画线 / 矩形 / 圆 / 移动 / 旋转 / 缩放 / 推拉 / 橡皮 / 选择 = 票 3 搬迁）。
③ `SurfaceMode`（表面模式）：油漆桶搬进去 = 第一个工具；左柱 / 工具条按 `mode.tools` 排；左上下拉框。
④ 碰撞元数据 / 贴图投影 = 新工具，各自一刀。

## 4. 等 user

- ~~第二模式叫什么~~ → **「表面」**（user 2026-10-24 拍板）。
- ~~第二模式里要不要「选择」工具~~ → **要**（user 2026-10-24「选择当然要」）：表面模式有独立选择工具，选的是面集；油漆桶照旧点一下就涂，五模式 = 面集展开规则，两边复用同一套。
- ~~② 的搬迁要不要和票 3 合并成一轮~~ → **合**（user 2026-10-24「23合并按你推荐」）：九个几何工具搬进模块只搬一次。
- **开不开刀 ①②**：等 user 一句（§5 的架构答案先过目）。

## 5. 以后的模式接得住吗（user 2026-10-24 问；Claude Fable 5.1 答，讨论记录）

> user：「选择当然要，然后大架构设计。我们以后会有blender，weebpaint，还会有animation，level design。sculpting， terrain，。。。。。。这个我们的架构接得住吗」「好，表面，把cad工程3d打印也接了。」

**直答：Mode 这一刀接得住一半。接得住「同一份模型、不同的手」，接不住「不同的模型本体」；后一半不是 Mode 的事，是 DocState 要开口。** 用 user 自己的 MVC 话说（memory `user_gamedev_habits`）：Mode = C；M 和 V 各要留一个口。

| 以后的模式 | 要的是什么 | 本提案接不接 |
|---|---|---|
| Blender 式建模（网格：任意拓扑、n-gon、非平面；G / R / S 模态键盘；顶点 / 边 / 面选择模式） | **另一种 M**（网格池）+ 另一套 C。**user 2026-10-24 纠正**：「blender和sketchup是不同的模型数据，可以互转，但是不建议blender直接动brep」 | **接一半**：C 是一个 Mode；M 要网格池（门 1）。B-rep ⇄ 网格 = **显式互转**（用户动作、按值拷进另一种池；B-rep → 网格无损，网格 → B-rep 只收平面面、有损要说清），不是 Blender 模式直接改 B-rep。共享的（选区 / 吸附 / 相机 / VCB / 历史）仍住 EditorCore |
| WeebPaint | 贴图像素编辑 | **不是模式**，是表面模式里的一个工具：iframe + ora 交接（B14 已裁） |
| 表面 / level design（摆组件、碰撞、触发器、出生点、导航） | 另一套 C + 场景级元数据 | **接**：Mode + 格式加可选键（面属性层 / instances.extras） |
| 3D 打印（水密 / 壁厚 / 悬垂检查；STL / 3MF 导出；体积） | 分析工具 + 叠加层 + 导出，全吃 bake 三角 | **接**：Mode（工具）+ viewExtras（叠加层）+ A4 bake 口；SU「实体」= 水密组，判定是内核查询 |
| CAD / 工程（精确尺寸、标注、2D 图纸、公差、BOM） | 标注 = 池里新一种元素；图纸 = V 的另一种投影；精确尺寸 VCB 已有；内部 SI 已定 | **半接**：Mode 接工具；标注要 M 加一种元素 kind；图纸要 V 开口 |
| 参数化 CAD（特征树 / 约束草图，Fusion 式） | **另一种 M**：几何由参数派生、历史记参数不记几何 | **不接，也不该硬接**：直接建模是我们的 core（SU 血统）。能接的形状 = **生成器层挂在组件边界**（SU Live / Dynamic Components 同款：参数 → 重生成组件内的 B-rep 池；B2 组件包的内存侧）；约束草图 = 另一种池 + 生成器 |
| sculpting（高密度三角网格、动态拓扑） | **另一种 M**（不是平面 B-rep） | **不接**：要 Scene 的池带 kind；雕刻池与 B-rep 池并存、**不自动互转**（显式转可以；user 10-24「不同 core 可混搭不能 fallback」） |
| terrain（高度场） | **另一种 M** | 同上：heightfield 池 |
| animation（时间轴、关键帧、骨骼） | M 加轨道、Session 加当前时间、V 要「t 时刻求值视图」 | **不接**：时间维横切三层。glTF 文件层本来就有 animation，缺的是内存模型与求值 |

**所以刀 ① 就要守住的三道门**（现在便宜、以后省命；是「不钉死」，不是「现在建」）：
1. **池带 kind，op 按池种分发**：`PoolRef` 现在只认 B-rep；DocState 写成 `pools: Map<id, Pool<kind>>`，`applyOp` 按 kind 派发（现在只有一种实现）。B2「type 当组件包」已同意，这是它的内存侧；glTF 本来就有 mesh / animation，文件层不用预留。
2. **选区 = 开放的元素引用集**：现在 face | edge | pool 三选一；写成 `{ pool, kind, id }` 的集合，模式决定能选哪些 kind、怎么展开（表面模式的面集展开 = 油漆桶五模式）。
3. **渲染只吃 bake（A4），模式只加叠加层**：每种池自己 bake 成三角 + 线；sculpt / terrain / 3D 打印导出都从这一个口出；模式 `viewExtras` 只画叠加。

**user 2026-10-24 对三件事的裁决**（AI 一句话解释后）：
- 参数化历史（Fusion / SolidWorks：存步骤和参数、改一个全重算）→ user「显然我不喜欢」→ **不做**（总账 E 节，免再问）。
- 时间维求值（动画：每个时刻一个状态，撤销 / 选择 / 渲染都要多问「哪个时刻」）→ user「很未来才头疼」→ **远期，不预留**。
- 多表示并存、不自动互转（各种池并存；显式互转 = 用户动作）→ user「这个建议现在就接好」→ **门 1 升格为刀 ① 必做**：Scene 的池带 `kind`、`applyOp` 按 kind 派发、WorldView 按 kind bake；当前只有 `brep` 一种实现，网格池 / 显式互转动词以后再开。
- **第二个物体类别已有实物 = 参考人卡片**（user 2026-10-24「马上有一个刚需就是参考人卡片，比如一个pngtuber的猫娘，带自己的关键帧动画集合和状态机。这个就是第二个物体类别」）：一张带贴图的卡（billboard / 定向面片）+ 帧集合 + 关键帧动画片段（clips）+ 状态机（idle / talk / blink…）；兼 SU 比例小人的位置（比例参考）。**对架构的意思**：definition 的 kind 从刀 ① 起就是 `"brep" | "card"` 两个真成员；card 不是 B-rep、不进肥皂膜内核；bake = 一张四边形 + 贴图；op = 换状态 / 换帧集 / 摆放（实例照旧走 instances）；它的动画是**物体自己的运行时状态机**（像游戏实体，住 Session / 播放器），不是场景时间轴 → 与「时间维很未来」不冲突。格式 = `CATSUP_definitions[i].kind = "card"` + card 载荷（贴图走 glTF images / textures）；细设计另开稿（A26）。各是一轮纪元，到时候再开（「先考期末考」，memory `feedback_graduation_exam_not_active_20261023`）；现在只保证池 kind / 选区 kind / bake 三个口没被钉成 B-rep 单例。

## 6. 模式 × 物体种类 + 排期（user 2026-10-24 拍板）

> user：「这么说的话不同的物体也会有不同的可用编辑模式，然后有一个统一的物体管理模式，你自己排期」「可以bump minor如果这是一把大刀的话」

- **两层模式**（= Blender 的 Object Mode / Edit Mode 分法）：**物体模式**（统一，kind 无关：选物体、摆放、移 / 旋 / 缩、复制、打组 / 炸开、锁定、元数据）+ **编辑模式按 kind**：brep → 几何 / 表面；card → 卡片自己的（帧 / 状态机）。左上下拉框只列当前物体 kind 可用的模式。`Mode.kinds: PoolKind[]` 声明自己管哪些 kind。
- **锁定（A27）**是物体层属性：`Group.locked / Instance.locked`，所有 kind 通用；WorldView 不看锁（锁住的照样当推断参考），Editor 在 commitOp / 整体变换 / 进入三处拦。user 思考题「用 brep 画立面图，然后锁住，推到旁边做拉几何的对齐参考，你要能接住，而不是把立面图搞坏」= 分池（不粘）+ 锁（不坏）+ 推断照吃（能参考）。
- **排期（0.13 编辑模式纪元；AI 排、user 可改）**：0.13.0 刀 ① → A27 锁定 → 0.13.x 刀 ②（九工具搬迁，含票 3）→ 0.13.x 刀 ③ 表面模式 → 0.14 物体模式 + 卡片（A26）。物体模式晚到的理由：只有一种物体时 SU 式混编就是它，拆早了多一层空壳。
- **刀 ① 的实际形状（回写提案，与 §2 的差别）**：Editor 类保留为 HUD 的 facade（main.ts 的几十个 getter 不改——HUD 改读 EditorCore 的收益配不上 churn）；EditorCore = ToolCtx 往上长一层（加 scene / context / revision / grid 只读口），模式与工具只认它；`handlers` 表从 Editor 搬进 `GeometryMode`；门 1 在 Scene / ops / 格式三处落地，`kind` 只在非 brep 时写进文件（golden 字节不变）。

## 7. 工具 = 子步序列（user 2026-10-24 提出；**user 同日「合理的形状……同意」= 拍板**；刀 ② 按它搬）

> user：「我建议是充能只影响下一个按下。就是比如你点第一下之前可以充能一下，然后可以获得第一个点的推断。然后这时候充能已经全部消费掉了，这个时候如果你是直线，你可以充能别的。所以充能的生命周期应该是每一下点，是工具的子步的生命周期。以及几个工具几步的模型你做的是什么，是否合理？可以think critically」

**现状（批判）**：没有模型。每个工具各自手搓阶段——线 = `anchor3` 非空即第二步（连画 = 落定后 anchor 换成 b 再来）、旋转 = `rotStage` 0 / 1 / 2、推拉 = `ppFace` 非空、缩放 = 拖柄一步、偏移 = 拖、卷尺 / 轴 / 量角器各数各的。底座只认 down / track / up 三个原始事件，于是「点两下」(armable)、数值小窗的 last、充能、笔的悬浮 / 按、Esc 退一步、箭头锁轴，每样都要每个工具再接一遍——A29「偏移还是拖拽」、充能挂屏（D19）、B25 笔输入不统一，同一个根。

**形状**：**工具 = 子步序列**。一子步 = 「取一个量」：点 / 方向 / 距离 / 角度 / 目标面（/ 以后的倍率）。子步声明：推断查询（AlignQuery 怎么配：平面 / 锚点 / 手 / 工具目标）、预览（拿到候选值怎么画）、提示文案、VCB 字段。底座跑同一台状态机：
- **悬浮** = 推断实时跑、充能在**这一子步内**累积（蹭点 / 蹭边）；
- **按下** = 取值、**消费全部充能**、进下一子步；
- **拖 = 按住不放，松手就是下一子步的按下**（SU 的 click-move-click 与 click-drag 等价 → A29 全工具统一）；
- **Esc = 退一子步**；换工具 = 清全部；
- **笔 = 悬浮 / 按**天然对上（B25 的笔输入深模块就是这一层的输入适配）；箭头 / 虚拟轴键 = 给当前子步的推断查询加锁轴（A9）。

**两类工具**：**取量型**（线 / 矩形 / 圆 / 弧 / 移动 / 旋转 / 推拉 / 偏移 / 卷尺 / 轴 / 量角器）走子步机，底座提供 `StepTool` 适配器把子步列表变成 ToolHandler；**直接操作型**（橡皮刮、框选、缩放拖柄、油漆桶点涂）仍直接实现 down / track / up。两者都只认 ToolCtx。

**代价（说清）**：矩形两个角都想对齐同一个远处参考点，第二步要再蹭一次（充能按子步消费）；换来的是不再有旧充能点隔着半个屏幕拉光标。

**已落地（v0.13.2）**：充能按子步消费（每次按下 / 落定清、换工具清、画线落定不再自动充能两端）；格点 = 地板（D16）。子步机本体 = 刀 ② 搬迁时写。

