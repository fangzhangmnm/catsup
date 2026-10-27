# 指令注册表 · 提案 v2（Fable 权衡稿，等 user 过目）

> created 20261027 by Claude Fable 5.1 · as-of v0.15.1 / 2026-10-27 · 家族周账 F-108（原写 F-98，撞号改）
> 取代 `20261026-command-registry-proposal.md`（Opus 10-26 的 v1；形状上有三处改，§3 列出）。没动代码。
> user 2026-10-27：「可以，让fable权衡一下，是先攒一堆屎山一起找规律还是先做。我倾向于先做，然后加上我说的生命之粉纪元，还有绘制纪元，一起想一下，不过确实，一直等总是有还可以再攒攒。但实际上有三个消费者就可以抽象了。做！发我过目」
> 更早的原话（10-25 / 10-26）：「能不能做成blender一样一个命令是一个类似函数的东西，你面板喂，而不是查面板。以及注意性能」「相当于每个指令我们可以自由数据驱动的放在不同的菜单里，或者工具栏里面，或者子工具模式里面，思考一下blender的python控制台」「要给以后的sculpt, body paint和node editing留位置」「以及这些修复的东西即使可能代码量不大，但是也做成可以扔的模块化的，最好是各种命令都这样」。

## 0. 结论先行

**现在做，不再攒。** 不是因为攒够了例子，是因为**三个消费者已经在代码里，而且三个长得一样**：

| 已有的消费者 | 它现在是什么 | 它已经自带的「指令」要素 |
|---|---|---|
| 选区动作表（右键菜单 / 顶部上下文条 / VR 手腕面板共用一份） | `main.ts` 里 `edits()` 一个数组，28 项，每项 = id · 名字 · 图标 · 露不露（`editor.hasXxx()`） | 身份、名字、图标、**能不能做**（Blender 的 poll） |
| 快捷键 | `main.ts` keydown 里 21 条 if | 按键 → 身份（Blender 的 keymap） |
| 修复指令（`src/editor/repairs/`，10-26 做成的可扔模块） | 一个模块 = 身份 + 参数定义 + 默认值 + **按池规划出 ops** + 做完的话 + 菜单项 + 面板里那一步 | 参数、默认、纯规划、作用域（有选区 = 选中的 / 没选 = 整个物体）、马后炮、预估要等多久 |

修复模块已经是一个指令接口，只是名字叫 `RepairModule`、只给修复用。选区动作表是「指令的露不露 + 名字」那一半，快捷键是「放在哪」那一半。**把这三份拼起来就是注册表**，不需要再等。

再攒的代价：自由建模这一轮要加约十个新动词（合、填、溶解、扩缩选区、环选、镜像开关……），每个都要照旧手接进右键 / 浮条 / 快捷键 / 搜索，之后再搬一遍——正好是本周周账说的「利滚利」。

**后面三个纪元都装得下**（§5 逐个对过）：生命之粉的「做到静止就停」= 有参数、有预估时长、跑完出一串 ops 的指令；绘制的「右键创建画布」= 作用在选中面上的带参指令；验证的「放一个猫娘」= 作用在点上的指令。它们不要求接口多长任何新东西，只要求**现在就把「可能要等很久」和「结果可以是换一种物体」这两条口子留着**（§2 的 `estimate` 和 `Effect`）。

## 1. 从 Blender 借什么、不借什么

| Blender | 借不借 | CatsUp 里对应 |
|---|---|---|
| 一个 operator = `idname` + 带类型的属性（有默认值）+ `poll()` + `execute()` | **借** | `Command`：id · params · `available()` · `plan()` |
| F9「调整上一步」：改属性、重跑 | **借**（已有） | 马后炮 `offerAfterthought`：撤掉 N 个 op 按新值重做。注册表让它变成框架行为，不用每处手写 |
| 菜单 / 键位表只写 `layout.operator("mesh.xxx")`，operator 不知道自己在哪个菜单 | **借**，这是 user 要的「数据驱动地放」 | 放置表（§2.3）：指令 × 位置 × 工作台 |
| F3 搜索：所有 `poll()` 为真的 operator | **借**（白得） | 注册表 `list()` 过一遍 `available()` |
| Python 控制台 `bpy.ops.mesh.xxx(a=1)` | **借形状**：一次调用 = (id, 作用域, 参数) | `runCommand(id, scope, params)`；复现包 / 宏 / 以后的脚本都按它记 |
| modal operator（拖着走的手势） | **不进表**，照旧是 `ToolHandler` | 表里只登记「切到这个工具」一种条目，手势不进表 |
| operator 直接改数据 | **不借** | 指令是纯函数，产出 ops；提交 / 预演 / 重放都走 ops（历史和撤销已经是 op 日志） |
| 「撤销」也能撤选区 | **不借**（现状不变） | 只改选区 / 进出组件的指令不记成一步；撤销重设计已经把会话状态 M 挂在每一步上 |

## 2. 形状（提案 .h；这是钉住的契约，实现中形状变了要回写这里）

```ts
// src/editor/commands/command.ts（新）——指令 = 纯函数：(环境, 作用域, 参数) → 效果。指令永远不读 UI、不查面板。

export type CommandId = `${string}.${string}`;   // 族.名：repair.weld · select.invert · scene.group · view.zoomExtents · tool.line · physics.cloth · paint.canvas

/** 作用域（10-26 DT5：同一个动词、量词不同）。 */
export type Scope =
  | { kind: "selection" }                 // 选中的
  | { kind: "context" }                   // 当前在编辑的整个物体
  | { kind: "auto" }                      // 有选区 = selection，没选 = context（修复现在就是这样；要 user 拍 §6-2）
  | { kind: "picked"; faces?: FaceKey[]; edges?: EdgeKey[]; verts?: Pt3[]; instances?: InstId[]; groups?: GroupId[] };   // 橡皮刮到的、右键点到的

/** 指令能看到的东西（只读快照）。 */
export interface CommandEnv {
  readonly scene: Scene;
  readonly ctx: EditContext;              // 在哪个组件里
  readonly selection: SelectionSnapshot;  // = 撤销里存的那份
  readonly settings: DocSettings;         // 格距、单位
  readonly options: ToolConfigView;       // 工具记住的选项；只读，真正用的值一律走 params
  readonly mode: ModeId;                  // 哪个工作台（有的指令只在某个工作台有意义）
}

/** 作用域解开之后的一个单位：一个池 + 这个池里选中的部分（null = 整个池）+ 池到当前上下文的变换。框架解，指令只写「对一个池做什么」。 */
export interface ScopeUnit { readonly at: PoolRef; readonly sel: Selection | null; readonly xf: Xform; }

/** 参数 = 参数小窗现成的字段定义（param-panel.ts）：枚举 / 数值 / 开关。对话框、马后炮、修复面板、搜索的参数行都按它长出来。 */
export interface CommandParam { readonly key: string; readonly def: ParamFieldDef; }
export type Params = Readonly<Record<string, ParamValue>>;

/** 指令的效果，三种。框架按种类决定记不记成一步。 */
export type Effect =
  | { kind: "ops"; ops: Op[]; count: number; extra?: number; skipped?: number; notes?: string[] }   // 改文档：记成一步（join），可预演、可重放、可马后炮
  | { kind: "session"; apply(core: EditorCore): void }                                                // 改选区 / 进出组件 / 隐藏显示：不记步（现状）
  | { kind: "view"; apply(core: EditorCore): void };                                                   // 改视图 / 开关：不记步

export interface Command {
  readonly id: CommandId;
  readonly label: string;                 // 界面上的名字（「焊接断口」）
  readonly icon?: string;                 // 图标库 id
  readonly hint?: string;                 // 一句人话
  readonly params: readonly CommandParam[];
  defaults(env: CommandEnv): Params;      // 默认参数（可以读文档设置 / 工具选项）
  readonly scopes: readonly Scope["kind"][];
  /** 能不能做：true / 不能的人话原因。每次重画菜单都调，必须 O(选区) 或更便宜，不许扫整个场景。 */
  available(env: CommandEnv, scope: Scope): true | string;
  /**
   * 纯规划（不改任何东西）。kind="ops" 的指令按 ScopeUnit 逐池调，框架汇总 count / notes、合成一步；
   * session / view 指令 units 为空数组、只调一次。做不了 = 人话原因。
   */
  plan(env: CommandEnv, unit: ScopeUnit | null, params: Params): Effect | { error: string };
  /** 做完的话（「焊了 12 处断口」）和没事做的话。 */
  done(count: number, extra: number, params: Params): string;
  readonly none?: string;
  /** 可能要等很久的指令（擦线、物理）：先估，框架按家族规矩弹「做 / 不做」，不替人静默跳过。量纲：秒。 */
  estimate?(env: CommandEnv, units: readonly ScopeUnit[], params: Params): { seconds: number; what: string } | null;
  /** 马后炮里能改的参数（缺 = params 全部）；「含子物体」这类由框架加。 */
  afterthought?: readonly string[];
  /** 深的池先跑（恢复层级那种）。 */
  readonly deepFirst?: boolean;
  /** 菜单 / 「修复…」露不露时用的便宜数法（完整规划太贵的给它）。 */
  quickCount?(env: CommandEnv, unit: ScopeUnit): number;
}

// src/editor/commands/placement.ts（新）——指令放在哪。指令自己不知道；放置是数据。
export type Surface = "contextMenu" | "contextBar" | "hamburger" | "viewMenu" | "toolStrip" | "repairPanel" | "search";
export interface Placement {
  readonly command: CommandId;
  readonly where: Surface;
  readonly modes?: readonly ModeId[];     // 缺 = 所有工作台（user 10-26「右键菜单按工作台分开显示」）
  readonly section?: string;              // 菜单里的分区（popup-menu 已支持分区）
  readonly order: number;
  readonly scope?: Scope;                 // 这个入口用哪个作用域（缺 = auto）
  readonly params?: Params;               // 这个入口钉死的参数（同一指令两个入口不同参数 = 两行）
  readonly key?: Keystroke;               // 快捷键（只对 search 以外有意义的表里也写在这里，一张表）
}

// src/editor/commands/index.ts（新）——清单：族 = 一个文件夹（repairs/ 就是第一个族），每族一个 commands 数组 + 一个 placements 数组；核心只 import 这里。
export const FAMILIES: readonly { commands: readonly Command[]; placements: readonly Placement[] }[];

// Editor 上唯一的两个入口（其余全部是读表 + 凑参数）：
//   runCommand(id, scope?, params?)      一步提交（原子，任何一条失败整步回滚，已有）；有参数的做完自动给马后炮
//   previewCommand(id, scope?, params?)  同一组参数在克隆上跑一遍画出来（对话框式 / 修复面板的马前炮）
// 菜单 / 浮条 / ☰ / 视图菜单 / 快捷键 / 搜索 / 修复面板 = 放置表的视图：按 where + mode 筛 → 按 order 排 → 每项问一次 available。
```

### 2.1 和 v1 比，三处改

1. **多了放置表**。v1 只有快捷键表；user 要的「自由数据驱动地放在不同的菜单 / 工具栏 / 子工具模式」= 指令和位置分开，位置是数据。FM35「不常用命令的收纳规则」以后就是改放置表，不改指令。
2. **`run` 改成按池的 `plan`**。v1 的 `run(env, scope) → ops` 把作用域解开、逐池、汇总、deepFirst 这些都塞给每条指令自己写；修复那一族已经证明这些是框架的活（`runRepair` 一份代码管九个模块）。指令只回答「对一个池做什么」。
3. **效果分三种**。v1 只有「出 ops」；但选区动作表里有一半是改选区 / 进出组件 / 视图的（反选、取消选择、进入编辑、退出一层、缩放到全部、X 光）。它们要进表（能搜、能改键），但不记成撤销的一步。不分开，要么把它们排除在表外（表就不完整），要么逼它们假装出 ops。

### 2.2 性能（user「以及注意性能」）

- `available` 每次重画菜单都调：现在 `edits()` 的 28 个 `hasXxx()` 都是 O(选区)，照旧；新指令的 `available` 过不了 O(选区) 就给 `quickCount`。
- `plan` 只碰作用域里的池；一个池里的点一次 `moveVertices` 批量挪（修复已经这样）。组件按定义去重：一个定义只处理一次。
- 预演（`previewCommand`）= 场景克隆上应用 ops。**现在的预演只克隆活动池那一个内核**（`computeLive`），跨好几个物体的指令预演不了——这是 Fable 账单 K5，和注册表是两件事；注册表先接现有的那条路（单池指令能预演），K5 定了再换底。对话框式的预演只在参数变时重跑，不是每帧，所以克隆一次的代价能接受。
- 放置表按 where + mode 筛是每次开菜单 O(表长)，表长几十到一百，不是问题；真到几百再加索引。

### 2.3 可扔（user「做成可以扔的模块化的」）

- 一族 = 一个文件夹 = `commands` + `placements` 两个数组；扔一条指令 = 删它的文件 + 两行。
- 守卫（把 `test/repairs-modular.test.ts` 推广）：核心只 import `commands/index.ts` 和 `command.ts` / `placement.ts`；族之间不互相 import；id 不重复、每条放置指向的 id 存在；每个工作台的右键菜单 / 快捷键在搬迁前后逐项一致（现有探针）。

## 3. 搬迁（行为零变化；每步一版、各自推开发版；每步加一条守卫）

0. 建 `commands/`（三个类型文件 + 空清单）+ `runCommand` / `previewCommand` + 放置表的视图函数（`menuItems(where, mode)`、`keyFor(keystroke)`）。
1. **修复那一族改名**：`RepairModule` → `Command`（字段几乎一一对应：`plan` / `fields` → `params` / `panel` → 一条 `repairPanel` 放置 / `menu` → 一条 `contextMenu` 放置 / `erases` → `estimate`）。修复面板改读放置表里 where = repairPanel 的那些。九个模块各改一次。
2. **选区动作表**：`edits()` 的 28 项拆成 `select.*`（反选 / 取消 / 连通体 / 进入 / 退出 = session）、`scene.*`（建组 / 建组件 / 炸开 / 镜像 / 锁 / 隐藏 / 应用缩放 / 改原点 = ops）、`geom.*`（软化 / 硬化 / 焊接 / 炸开曲线 / 删除 = ops）；`HudModel.edits()` 变成 `menuItems("contextMenu", mode)` 的包装；`selection-actions.ts` 的 SKIP 补丁消失。
3. **快捷键**：keydown 里的 G / Ctrl+G / Ctrl+Shift+G / H / Alt+H / Ctrl+A / Ctrl+I / Alt+A / Alt+Z / Delete / Shift+Z / `.` 改成查放置表的 `key`；工具快捷键 = `tool.*` 条目（同键循环照旧在 `tool.*` 的 plan 里做）。方向键锁轴、Esc、Shift 按住这些**不是指令**（是手势状态），留在 keydown。
4. **☰ 和视图菜单**里的场景 / 视图动作（全部显示、缩放到全部、重置轴、删除所有参考线、X 光）→ `view.*` / `scene.*`。
5. **搜索**（Blender F3 / Ctrl+K 风格；user 10-25「以后我们要做blender式的搜索」）：读表、过 `available`，白得。
6. 自由建模的新动词**直接按表写**：合（`geom.merge`：到中心 / 到游标 / 塌缩 = 一条指令三个参数值）、填（`geom.fill`）、溶解（`geom.dissolve`）、扩 / 缩选区（`select.grow` / `select.shrink`）、环选（`select.loop`）、镜像开关（`scene.mirror`）。它们从一开始就只在表里写一次。

每步验收：右键 / ☰ / 快捷键 / 浮条在搬迁前后行为逐项一致（现有探针 probe-context 等 + 新守卫「表里每一项都能在至少一个入口找到，或者明确标 search-only」）。

## 4. 不进表的（边界，防止它变成万能表）

- **工具 / 手势**（推拉、移动、刀、软变换、雕）：`ToolHandler`，表里只有「切到它」。
- **工具选项**（`tool-config.ts` 的声明式表）：生命周期不同（选项是记住的、跨次有效；指令参数是这一次的 + 马后炮）。指令的默认值可以读选项（`env.options`），不反过来写。
- **工作台**（`mode.ts`）：工作台定义自己有哪些工具；放置表引用工作台 id 决定指令露不露。两张表各管一半，不合并。
- **参数小窗 / 对话框 / 菜单的长相**：渲染器。表只说有什么。

## 5. 后面三个纪元的指令长什么样（user「加上我说的生命之粉纪元，还有绘制纪元，一起想一下」）

| 纪元 | 指令例子 | id | 作用域 | 参数 | 效果 | 接口要不要多长东西 |
|---|---|---|---|---|---|---|
| 自由建模（现在） | 合到中心 / 填洞 / 溶解 / 扩选区 / 环选 / 镜像开关 | `geom.merge` … `select.grow` … `scene.mirror` | selection / auto | 合的方式；填的三角化方式 | ops / session | 不用 |
| 生命之粉 | 选一张面变布 / 枕头；打碎一堵墙；倒一堆垃圾；积雪；悬链线 | `physics.cloth` `physics.shatter` `physics.pile` `physics.snow` `physics.catenary` | selection（面）/ picked（点一下地面） | 布料参数、细分、重力、停下来的阈值 | ops（结果是**换一种物体**：面 → 网格体；要 ops.ts 有「替换物体 / 插入网格体」这两条 op，物理纪元再加，不是现在） | **`estimate`**（要等几秒 → 先问）；`plan` 以后要能是异步的（放 worker 跑、能取消）。接口现在就按 `Effect | Promise<Effect>` 写，实现留到那时 |
| 绘制 | 右键创建画布；重新指派语义；重采样；烤成漫反射导出 | `paint.canvas` `paint.assign` `paint.resample` `paint.bake` | selection（面）| 分辨率、像素对齐、语义名 | ops（面 ↔ 画布的绑定进格式扩展） | 不用。画笔本身是工具，不进表 |
| 验证（猫娘） | 放一个猫娘；清空猫娘；射界检查开关 | `verify.spawn` `verify.clear` `view.sightlines` | picked（点地） | 身高 / 能跳多高 | ops / view | 不用 |
| 雕刻 / bodypaint / 节点（user 要留位置） | 它们主要是工具和工作台；指令只有「重新细分」「烘」这类一次性的 | `sculpt.remesh` … | selection | 密度 | ops | 不用；留的「位置」就是族名前缀 + 放置表的 modes |

结论：三个纪元都只是**多几个族**，接口不变。要现在留的口子只有两个，都已经写进 §2：`estimate`（诚实地问「要等一会儿」）和 `Effect` 里 ops 的「结果可以是换一种物体」（这一条落在 ops.ts，不在注册表）。

## 6. 要 user 拍的（一次列齐）

1. **现在做还是再攒**：推荐**现在做**（§0）。不做的话，自由建模那十来个动词各手接一遍、以后再搬。
2. **作用域的默认**（10-26 留的，user 当时「我一开始想的是只对selected」）：推荐 **有选区 = 只对选中的；什么都没选 = 当前在编辑的整个物体**（修复现在就是这样，右下角说明行写明「作用于：选中的 N 张面 / 整个物体」）。另一条路 = 永远只对选中的、没选就灰掉——更简单，但「修复整个物体」要先全选。
3. **放置是不是单独一张表**：推荐**是**（§2.1 第 1 条；Blender 同款）。另一条路 = 每条指令自己写在哪个菜单（修复现在的 `menu` 字段就是这样）——改收纳规则要逐条指令改。
4. **只改选区 / 视图的指令要不要进表**：推荐**进**（能搜、能改键），但不记成撤销的一步（现状不变）。
5. **可能要等很久的指令**：推荐接口现在就带 `estimate`，把 10-26 擦线前「做 / 不做」那一问做成框架行为（物理、擦线、大物体的吸格点都走它）。
6. 以后给用户改快捷键：user 10-26「以后做」——表的 `key` 字段现在只是内部数据，开放改键时存进设置，另算。

拍完我写第 0 步和第 1 步（建表 + 修复那一族改名，行为零变化），推开发版；第 2 步起和自由建模的选择那一块错开做，不撞车。
