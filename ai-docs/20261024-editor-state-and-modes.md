# 编辑器 state 架构重构 + 第二编辑模式（提案稿）

> created 20261024 · as-of v0.12.7 / 2026-10-24 · created by Claude Fable 5.1
> 出处：user 2026-10-24「拍板：你好好想一下编辑器state的架构重构，然后油漆桶算作第二个编辑模式，我们现在有两个编辑模式了，geometry，第二个你想个名字，包括油漆桶，碰撞元数据，各种贴图assignment，但是不是bodypaint」「所以油漆桶不属于第一个编辑模式，第二个编辑模式也许有选择，但是很多别工具会没有」。
> 性质：**提案**。拍了的只有：两个模式；油漆桶归第二模式；第二模式工具集另一套（也许有选择）；模式切换 = 左上下拉框（版图文档）。名字、state 切法、落地顺序都等 user。

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
- **名字候选**（等 user）：**「表面」surface**（我的推荐：这些都是"这张面是什么"——材质、物理、贴图——对应几何模式的"面在哪"；游戏引擎里 surface = material + physics 正是这个集合）；「属性」attribute（更泛，连元数据分析也装得下，但 user 可能嫌抽象）；「涂装」livery / 「皮肤」skin（偏贴图，装不下碰撞）。
- **选区语义按模式**：几何模式选边 / 面 / 池；表面模式选「面集」（一张面 / 平滑组 / 到锐角 / 连通体 / 整组 = 现在油漆桶的「涂哪些」变成选区展开规则）。
- **切模式**：左上下拉框（版图 §2）；切出时清手势；选区能保留就保留（面选区两边都认）。
- **文件格式**：碰撞元数据 = 面属性层 `attributes.face.collision`（u8）+ 组件级 `extras`；贴图指派已在（材质槽 + sizeM），加 UV 投影方式字段时按格式纪律升 brep minor。

## 3. 切法（刀口顺序，每刀行为零变更）

① `EditorCore` 接口 = 现 `ToolCtx` 外加 doc / session 访问；main.ts 的 HUD 改读它（不再直接读 Editor 的几十个 getter）。
② `Mode` 接口 + `GeometryMode`：把 `handlers` 表和工具专属字段搬进去（偏移 / 跟随 / 弧 / 卷尺 / 轴 / 量角器已经是模块；画线 / 矩形 / 圆 / 移动 / 旋转 / 缩放 / 推拉 / 橡皮 / 选择 = 票 3 搬迁）。
③ `SurfaceMode`（名字待定）：油漆桶搬进去 = 第一个工具；左柱 / 工具条按 `mode.tools` 排；左上下拉框。
④ 碰撞元数据 / 贴图投影 = 新工具，各自一刀。

## 4. 等 user

- 第二模式叫什么（表面 / 属性 / 其他）。
- 第二模式里要不要「选择」工具，还是油漆桶自己就是选择（点 = 涂 / 长按 = 选面集）。
- ② 的搬迁要不要和票 3 合并成一轮（架构自审 0.8 的「动词注册表 A3 + 工具配置合成一刀」）。
