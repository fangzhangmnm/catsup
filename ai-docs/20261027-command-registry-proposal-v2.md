# 指令注册表 · 提案 v2.2（Fable 权衡稿；user 10-27 夜拍：两层 = 指令 / 动作，族名 = 单位种类；底座 v0.15.9 落地）

> **v2.2 相对 v2.1 改了什么（user 10-27 夜；全文在 §7，这里只列结论）**：① **分两层**：指令 = 带类型的内核动词（一条只吃一种单位、不重载、不认上下文），动作 = UX 动词（看选区 / 上下文 / 点几下，决定调哪几条指令）；放置表放的是动作；撤销记录和复现包记的是指令调用。② **族名 = 单位种类**：brep / mesh / object / select / view / doc / paint / sim——不按纪元（魔法 / 验证 / 绘制）、不按菜单（修复）、不按工作台起名；v2.1 里的 `geom.*` / `scene.*` / `physics.*` / `verify.*` / `tool.*` 作废，「通吃」的 `transform.*` / `edit.*` 也作废（它们就是重载）。③ 「同一个挪动工具，挪物体和挪顶点是同一个指令吗」——不是：三条带类型的指令，一个工具路由。④ §2 的 .h 是 v2.1 的形状，**以代码为准**：`src/editor/commands/{command,action,registry,index}.ts`；下面 §2 里和 ⑦ 矛盾的地方（`CommandId` 的族名、`geom.*` 例子、笔刷表的 `dab` 指向指令）读作「动作」。

> created 20261027 by Claude Fable 5.1 · as-of v0.15.1 / 2026-10-27 · 家族周账 F-108（原写 F-98，撞号改）
> 取代 `20261026-command-registry-proposal.md`（Opus 10-26 的 v1）。没动代码。
> **v2.1 相对 v2 改了什么**（user 10-27 下午答复）：① 作用域不写死，是每次调用的参数，另加「含子物体」一档，组件按定义去重并披露；② 放置表的「位置」是开放的（环形菜单 / VR / 搜索 / 脚本接口都算）；③ **改选区的指令也记成撤销的一步**（Blender 同款，user「这个我们要」）；④ ~~「要等很久先问」加「挂机不问」的口子，长跑不挡别的物体~~（**撤回**：AI 误读，见 §2.3；留下的只有 10-26 的「要等很久先问做 / 不做」）；⑤ 新增 §2.4 笔刷 = 配置好的指令 × 一笔（nudge / 生命之粉 / 绘制都是这一类）；⑥ 新增 §2.5 魔法纪元的「布置一半做别的」= 场景实体，不是 modal。
> user 2026-10-27 原话（权衡那一问）：「可以，让fable权衡一下，是先攒一堆屎山一起找规律还是先做。我倾向于先做，然后加上我说的生命之粉纪元，还有绘制纪元，一起想一下，不过确实，一直等总是有还可以再攒攒。但实际上有三个消费者就可以抽象了。做！发我过目」；第一轮答复：「1做」「2同意，不过一定要写死吗？然后对于组件和孩子hierarchy怎么办」「3到时候可能会重构，所以确实猜出来，重构的就是表了……类似blender的搜索和python api，6也算，关键是ux我们会变很多次，比如我最近在思考pinterest的长按弹出菜单」「4 blender怎么做的《撤销系统现在稳健吗还是现在是小学没毕业状态」「5 同意，但是如果用户说了要挂机长跑的话不应该停下来。我觉得可以先做其他的？」「前五个同意，我是没说非要python」「modal operator这个怎么办，特别是魔法纪元，不过那个可能就不是modal了而是可以布置一半做别的。然后绘制怎么办」「「撤销」也能撤选区 不借 这个我没想好，等等等。 这个我们要，weebpaint应该也是这个吧。不然很痛苦，而且也更容易出bug」「可扔 赞。魔法纪元和su插件现在都会出一大堆bloat的operator。可能会经常变动」「生命之粉 其实是一个球状的笔刷... 这么说就是有很大一类op是你配置好了，然后一笔笔刷，还是这个其实我们现在能接。最朴素的就是nudge的对齐设置和nudge」「以后可以开放改快捷键，虽然我不太想开，但是可以留个口子」。
> 更早的原话（10-25 / 10-26）：「能不能做成blender一样一个命令是一个类似函数的东西，你面板喂，而不是查面板。以及注意性能」「相当于每个指令我们可以自由数据驱动的放在不同的菜单里，或者工具栏里面，或者子工具模式里面」「要给以后的sculpt, body paint和node editing留位置」「做成可以扔的模块化的，最好是各种命令都这样」。

## 0. 结论（user 已拍「1做」）

**现在做，不再攒。** 三个消费者已经在代码里，而且三个长得一样：

| 已有的消费者 | 它现在是什么 | 它已经自带的「指令」要素 |
|---|---|---|
| 选区动作表（右键菜单 / 顶部上下文条 / VR 手腕面板共用一份） | `main.ts` 里 `edits()` 一个数组，28 项，每项 = id · 名字 · 图标 · 露不露（`editor.hasXxx()`） | 身份、名字、图标、**能不能做**（Blender 的 poll） |
| 快捷键 | `main.ts` keydown 里 21 条 if | 按键 → 身份（Blender 的 keymap） |
| 修复指令（`src/editor/repairs/`，10-26 做成的可扔模块） | 一个模块 = 身份 + 参数定义 + 默认值 + **按池规划出 ops** + 做完的话 + 菜单项 + 面板里那一步 | 参数、默认、纯规划、作用域、马后炮、预估要等多久 |

修复模块已经是一个指令接口，只是名字叫 `RepairModule`、只给修复用。选区动作表是「露不露 + 名字」那一半，快捷键是「放在哪」那一半。把这三份拼起来就是注册表。再攒的代价：自由建模这一轮约十个新动词各手接一遍、之后再搬。

## 1. 从 Blender 借什么、不借什么（user：前五条同意；「撤销也撤选区」改成借）

| Blender | 借不借 | CatsUp 里对应 |
|---|---|---|
| 一个 operator = `idname` + 带类型的属性（有默认值）+ `poll()` + `execute()` | 借 | `Command`：id · params · `available()` · `plan()` |
| F9「调整上一步」：改属性、重跑 | 借（已有） | 马后炮 `offerAfterthought`，注册表让它变成框架行为 |
| 菜单 / 键位表只写 `layout.operator("mesh.xxx")`，operator 不知道自己在哪个菜单 | 借 | 放置表（§2.3）：指令 × 位置 × 工作台；UX 要变很多次，变的只是这张表 |
| F3 搜索 | 借（白得） | 注册表 `list()` 过一遍 `available()` |
| 控制台 `bpy.ops.mesh.xxx(a=1)`：一次调用 = (id, 作用域, 参数) | 借形状，**不是非要 Python**（user） | `runCommand(id, scope, params)`；复现包 / 宏 / 以后的脚本接口都按它记 |
| modal operator（拖着走的手势） | **不进表，但手势只剩三种语法**（§2.4） | 取量型 `steps`（画线 / 推拉…）、直接操作型 `direct`（框选 / 拖柄）、**笔刷型 `brush`（新，数据驱动）**；表里只登记「切到工具 X」 |
| operator 直接改数据 | 不借（user 同意） | 指令是纯函数，产出 ops |
| 「撤销」也能撤选区 | **借**（user「这个我们要」；WeebPaint 的选区也是记账写，核过 `selection-component.ts`） | 改选区的指令记成一步（§2.2 撤销那段） |

## 2. 形状（提案 .h；钉住的契约，实现中形状变了要回写这里）

```ts
// src/editor/commands/command.ts（新）——指令 = 纯函数：(环境, 作用域, 参数) → 效果。指令永远不读 UI、不查面板。

export type CommandId = `${string}.${string}`;   // 族.名：repair.weld · select.invert · scene.group · view.zoomExtents · tool.line · physics.cloth · paint.canvas

/**
 * 作用域（10-26 DT5：同一个动词、量词不同）。**不写死**：它是每次调用的参数，放置表可以钉、马后炮里可以改（user 10-27）。
 * 两个正交的旋钮：范围（选中的 / 当前在编辑的整个物体 / 指定的那几处）× 深度（含不含子物体）。
 */
export interface Scope {
  readonly range: "selection" | "context" | "auto" | { picked: Picked };   // auto = 有选区用 selection、没选用 context（默认；user 10-27「同意」）
  readonly children: boolean;                                              // 含子物体（嵌套的组 / 组件）；默认 = 工具记住的上一次
}
export type Picked = { faces?: FaceKey[]; edges?: EdgeKey[]; verts?: Pt3[]; instances?: InstId[]; groups?: GroupId[] };

/** 指令能看到的东西（只读快照）。 */
export interface CommandEnv {
  readonly scene: Scene;
  readonly ctx: EditContext;              // 在哪个组件里
  readonly selection: SelectionSnapshot;
  readonly settings: DocSettings;         // 格距、单位
  readonly options: ToolConfigView;       // 工具记住的选项；只读，真正用的值一律走 params
  readonly mode: ModeId;                  // 哪个工作台
}

/**
 * 作用域解开之后的一个单位 = 一个池（组件定义里的一个组）+ 这个池里选中的部分（null = 整个池）+ 池到当前上下文的变换。
 * 框架解（§2.1），指令只写「对一个池做什么」。
 */
export interface ScopeUnit { readonly at: PoolRef; readonly sel: Selection | null; readonly xf: Xform; readonly instances: number; }   // instances = 这个定义在场景里有几份（披露用）

export interface CommandParam { readonly key: string; readonly def: ParamFieldDef; }   // = 参数小窗的字段定义（枚举 / 数值 / 开关）
export type Params = Readonly<Record<string, ParamValue>>;

/** 指令的效果，三种。记不记成撤销的一步由种类定（§2.2）。 */
export type Effect =
  | { kind: "ops"; ops: Op[]; count: number; extra?: number; skipped?: number; notes?: string[] }   // 改文档：一步（join），可预演、可重放、可马后炮
  | { kind: "session"; apply(core: EditorCore): void }                                                // 改选区 / 进出组件：**也记成一步**（0 条 op，只有会话状态变了）
  | { kind: "view"; apply(core: EditorCore): void };                                                   // 改视图 / 开关：不记步

export interface Command {
  readonly id: CommandId;
  readonly label: string;
  readonly icon?: string;
  readonly hint?: string;
  readonly params: readonly CommandParam[];
  defaults(env: CommandEnv): Params;
  readonly ranges: readonly Scope["range"][] | "any";     // 支持哪些范围；接受 picked 的指令才能当笔刷的「一笔」（§2.4）
  /** 能不能做：true / 不能的人话原因。每次重画菜单都调，必须 O(选区) 或更便宜。 */
  available(env: CommandEnv, scope: Scope): true | string;
  /** 纯规划（不改任何东西）。ops 型按 ScopeUnit 逐池调、框架汇总；session / view 型 unit 为 null、只调一次。做不了 = 人话原因。 */
  plan(env: CommandEnv, unit: ScopeUnit | null, params: Params): Effect | { error: string } | Promise<Effect | { error: string }>;   // Promise = 长跑 → 撤回（§2.3 误读）；代码里 plan 是同步的
  done(count: number, extra: number, params: Params): string;
  readonly none?: string;
  /** 可能要等很久的指令（擦线、物理）：先估；框架按家族规矩问「做 / 不做 / 这次会话别再问」。量纲：秒。 */
  estimate?(env: CommandEnv, units: readonly ScopeUnit[], params: Params): { seconds: number; what: string } | null;
  readonly afterthought?: readonly string[];   // 马后炮里能改的参数（缺 = 全部）；「作用于」「含子物体」由框架加
  readonly deepFirst?: boolean;
  quickCount?(env: CommandEnv, unit: ScopeUnit): number;
  /** 一笔笔刷里的一个点（§2.4）：这个指令接受「指定的那几处」时，笔刷工具每个落点调一次；连着的落点能并成一条 op 的就并（moveVertices 批量）。 */
  readonly dab?: { readonly coalesce: boolean };
}

// src/editor/commands/placement.ts（新）——指令放在哪。指令自己不知道；放置是数据，UX 改多少次都只改这里。
export type Surface = "contextMenu" | "contextBar" | "radial" | "hamburger" | "viewMenu" | "toolStrip" | "repairPanel" | "wristPanel" | "search" | "api";   // 开放集：新的 UI 面 = 加一个词 + 一个渲染器
export interface Placement {
  readonly command: CommandId;
  readonly where: Surface;
  readonly modes?: readonly ModeId[];     // 缺 = 所有工作台
  readonly section?: string;
  readonly order: number;
  readonly scope?: Partial<Scope>;        // 这个入口钉的作用域（缺 = auto + 记住的「含子物体」）
  readonly params?: Params;               // 这个入口钉死的参数（同一指令两个入口不同参数 = 两行）
  readonly key?: Keystroke;               // 快捷键；以后开放改键 = 这一列搬进设置（device 级），表里的变成出厂值（user「留个口子」）
}

// src/editor/commands/brush.ts（新，§2.4）——笔刷 = 配置好的指令 × 一笔。一张表，可扔。
export interface Brush {
  readonly id: string;
  readonly label: string;
  readonly dab: CommandId;                // 每个落点做什么（必须接受 picked）
  readonly params: Params;                // 配置好的参数（nudge 的对齐设置、生命之粉的物理种类……）
  readonly shape: { kind: "point" } | { kind: "disk"; radiusPx: number } | { kind: "sphere"; radius: number; falloff: "smooth" | "linear" | "constant" };
  readonly spacing?: number;              // 落点间距（屏幕 px 或世界长度，随 shape）
  readonly preview: boolean;              // 拖的时候在克隆上逐点预演
}

// src/editor/commands/index.ts（新）——清单：族 = 一个文件夹（repairs/ 是第一个），每族 commands + placements + brushes 三个数组；核心只 import 这里。
export const FAMILIES: readonly { commands: readonly Command[]; placements: readonly Placement[]; brushes?: readonly Brush[] }[];

// Editor 上的入口（其余全部是读表 + 凑参数）：
//   runCommand(id, scope?, params?)   一步提交；有参数的做完自动给马后炮。（原来的 { ask?: boolean } / ask:false「挂机免问」撤回：§2.3 误读；脚本接口要不要免问以后另议）
//   previewCommand(id, scope?, params?)                  同一组参数在克隆上跑一遍画出来（对话框式 / 修复面板的马前炮）
//   笔刷工具（tool.brush，一个通用 ToolHandler）：按 Brush 表落点 → 每点 plan（picked）→ 克隆上预演 → 松手一步提交
```

### 2.1 作用域怎么解（user「一定要写死吗？组件和孩子 hierarchy 怎么办」）

- **不写死**。`Scope` 是每次调用的参数：放置表可以钉（右键「焊接全部断口」= context），马后炮和修复面板顶上有「作用于：选中的 / 整个物体」+「含子物体」两个开关，改了 = 撤掉按新值重做。`auto` 只是默认。
- **解成池的规矩**（框架一份代码，所有 ops 型指令共用）：
  1. 范围 = selection → 选中的几何按所在池分组；选中的整个组 / 组件实例 → 它的定义池（children 开 → 连里面嵌套的组和组件一起）。
  2. 范围 = context → 当前在编辑的那个池（children 开 → 它下面全部嵌套）。
  3. **组件按定义去重**：同一个定义在场景里有 N 份，只处理一次，结果 N 份一起变（和现在进组件编辑一样；Blender 的 linked duplicates 也是）。提示里**披露**：「会改到组件「轮子」的全部 4 份」。
  4. **按世界坐标架的指令**（吸到世界格点）碰到多份实例：定义只有一份，世界位置却有 N 个，没法都对齐。规矩：按**你选中的 / 你正在里面的那一份**的位置算，提示里说明；马后炮多一档「只改这一份（先独立成新组件）」——「独立」= 一条 `scene.makeUnique` 指令（SU 的 Make Unique），顺手也该有。
  5. 深的池先跑（deepFirst）照修复现状。
- 「含子物体」默认 = 工具记住的上一次（现在修复面板就是这样，`repairChildren`）。

### 2.2 撤销（user「blender 怎么做的？我们现在稳健吗？」）

**Blender 怎么做**：一条全局的撤销栈，每个 operator 跑完压一步。物体模式的一步 = 整个文件在内存里的快照（按差异存）；编辑模式的一步 = 正在编辑的那个网格的一份拷贝。**选中状态存在网格 / 物体的数据里**（顶点 / 边 / 面上的旗子），所以它天然在快照里——这就是为什么 Blender 里点一下选择也是一步、Ctrl+Z 会先把刚才几下选择撤掉。代价是每点一下都拷一份网格，Blender 2.9 起靠共享没变的数组来省。

**CatsUp 现状（实话）**：
- 底子 = op 日志 + 每 8 条一份场景快照，撤销 = 回到快照重放（09-20 user 定的「联机友好的指令式」）；28 条单测 + 逐步往返对拍（每个动作后记指纹，一路撤回去、一路重做回来）。底子不是小学，是初中：形状对、确定性靠内核公理 5 撑着。
- **10-26 才补的那块**：每一步带着「之前 / 之后」的会话状态（在哪个组件里 + 选区），撤销 = 场景和会话一起回去——这是你说「undo 全坏了」之后 Opus 的重设计，**我还没审**（家族周账 F-93，在我的单子上）。
- **没做的**：只改选区的动作不是一步。

**要做成 Blender 那样（user「这个我们要」）**：比 Blender 便宜。选区在 CatsUp 不在内核数据里，是会话状态 M；10-26 起 M 已经随每一步记了，所以「选区变了」= 一步 0 条 op、只有 M 变 —— 不拷场景、不重放。鼠标点选 / 框选 / 套索 / 反选 / 扩缩 / 环选都走这条；连续几步选区变化先**不合并**（Blender 也不合并；要合并以后是 History 上一条策略，不动表）。这一条并进 F-93 的审计一起设计：审撤销重设计 + 把选区做成一等的撤销数据。

**三种效果 × 记不记步**：ops 型 = 记（join 成一步）；session 型 = 记（0 op 步）；view 型（缩放到全部、X 光开关）= 不记。

### 2.3 ~~长跑与「挂机」~~ → 整节撤回（2026-10-27 夜；Claude Fable 5.1 记）

user 原话：「长跑与挂机你完全理解错了，那段能撤掉吗。我说的是今天我能挂机让你产品吗。我不是说catsup」「不知道你这个错误理解造成了多少混乱」「或者错误的决策」。

错在哪：user 第 5 条答复「5 同意，但是如果用户说了要挂机长跑的话不应该停下来。我觉得可以先做其他的？」说的是**这个会话**——他离开（挂机）让 AI 自己跑的时候，AI 不该停下来等他拍板，可以先做别的。AI 把它读成了 CatsUp 的产品功能，编出了一整节：「做 / 不做 / 这次会话别再问」第三个按钮（挂机开关）、脚本调用 `ask:false` 免问、长跑在后台跑不挡别的物体（池标「忙」、`plan` 返回 Promise）、「实现留到物理纪元」。**这些全部作废，不是需求。**

牵连核对（10-27 夜查）：代码里没有落任何一条——`Command.estimate` + 两个按钮「做 / 不做」来自 10-26 本来就拍过的「不要因为性能静默不做，宁愿弹警告问 yes no」，留着；没有「别再问」开关、没有 `ask` 参数、`plan` 是同步的、没有后台跑。文档里引用过这一节的地方（本文件开头 ④、§2 .h 两处注释、§2.5、§5 表、§6「已拍」第 5 条；纪元账本 FM70；家族周账 20261027 第 69 行）同日全部改成「撤回」。以后物理纪元真要长跑，另起讨论，不从这节继承。

### 2.4 笔刷 = 配置好的指令 × 一笔（user「有很大一类 op 是你配置好了，然后一笔笔刷……最朴素的就是 nudge 的对齐设置和 nudge」）

这一类现在就能接，而且不用每个笔刷写一个 modal 工具：

- **一个通用的笔刷工具**（`tool.brush`，`direct` 语法）+ **一张笔刷表**（`Brush`：每个落点调哪条指令、配好的参数、形状、间距、要不要逐点预演）。
- 一笔 = 一串落点；每个落点把它底下的东西（点 / 边 / 面，按形状是一个点、屏幕上一个圆、世界里一个球带衰减）解成 `picked` 作用域，调那条指令的 `plan`；拖的时候在克隆上逐点预演；松手 = 一步提交；同一指令连着的落点能并成一条批量 op 的就并（`dab.coalesce`）。
- 例子，都是同一个壳：

| 笔刷 | 每个落点做的指令 | 配置好的参数 | 形状 |
|---|---|---|---|
| nudge（最朴素） | `geom.move`（挪 picked 的点） | 对齐设置、步长 | point |
| 橡皮（现在的「刮」就是这个形状） | `geom.dissolveEdge` | 哪种橡皮（焊 / 软 / 普通） | point |
| 软挪 / 雕 | `geom.move` 带衰减权重 | 半径、衰减 | sphere |
| 生命之粉 | `physics.tag`（给 picked 的面打上「布 / 枕头 / 碎」的标记层，标记是原子不是历史） | 哪种粉、细分 | sphere |
| 绘制 | `paint.dab`（往画布上落一笔） | 语义通道、颜色、硬度 | disk |
| 猫娘验证 | `verify.spawn` | 身高、能跳多高 | point（点一下） |

- 性能：预演在克隆上逐点累加（不是每点从头拷一次）；大物体上的软挪是 Fable 账单 O1 的问题，不是笔刷表的问题。

### 2.5 魔法纪元的「布置一半做别的」（user「那个可能就不是 modal 了」）

对。施法分两段，都不是 modal：
1. **布置** = 场景里的实体（发射口、落点、布料区域的标记、风向……），像参考线和猫娘一样是文件里的原子，用普通工具摆、挪、删，放一半去干别的、明天回来接着摆。
2. **施法** = 一条指令（`physics.cast`），读这些实体 + 标记层，可能要跑很久（怎么跑另议；§2.3 那套已撤回），结果一步提交；实体留不留当参数（留着 = 还能再施一次）。

绘制同理：画布是实体（`paint.canvas` 创建），笔是笔刷（§2.4），语义通道是工具选项。

### 2.6 性能（user「以及注意性能」）

- `available` 每次重画菜单都调：现在 `edits()` 的 28 个 `hasXxx()` 都是 O(选区)，照旧；过不了 O(选区) 的给 `quickCount`。
- `plan` 只碰作用域里的池；一个池里的点一次 `moveVertices` 批量挪；组件按定义去重。
- 预演 = 场景克隆上应用 ops。现在的预演只克隆活动池那一个内核，跨好几个物体的指令预演不了——Fable 账单 K5，和注册表是两件事；注册表先接现有那条路，K5 定了再换底。
- 放置表按 where + mode 筛 = 开菜单时 O(表长)，几十到一百行，不是问题。

### 2.7 可扔（user「赞。魔法纪元和 SU 插件现在都会出一大堆 bloat 的 operator」）

- 一族 = 一个文件夹 = commands + placements + brushes 三个数组；扔一条 = 删它的文件 + 表里几行；扔一族 = 删文件夹 + 清单一行。老复现包里引用没装的指令 → 报「没装」（ops.ts 的插件指令已经这样）。
- 守卫（把 `test/repairs-modular.test.ts` 推广）：核心只 import `commands/index.ts` 和三个类型文件；族之间不互相 import；id 不重复；每条放置 / 每个笔刷指向的 id 存在；每个工作台的右键 / 快捷键在搬迁前后逐项一致。

## 3. 搬迁（行为零变化；每步一版、各自推开发版；每步加一条守卫）

0. **done v0.15.9（10-27 夜，Fable）**：`src/editor/commands/`——`command.ts`（指令 + 单位 + 环境 + 规划结果）、`action.ts`（动作 + 放置面 + 放置 + 族）、`registry.ts`（`commandById` / `actionById` / `placementsAt` / `allCommands` / `checkRegistry` 守卫）、`index.ts`（清单：一族一行）。`runCommand` / `previewCommand` 还没抽（修复那条跑法原地没动，等第二个消费者再抽）。
1. **done v0.15.9**：修复九条 = brep 族（`brep.straighten / snap / cleanup / weld / planar / harden / fillHoles / resegment / hierarchy`）；模块只剩指令（`fields` → `params`，`panel` / `menu` 拿掉）；菜单上的字 / 图标 → 动作（`repairs/index.ts actions`），浮条入口 → 放置（`contextBar`），面板的勾 / 标签 / 顺序 → 步骤表 `REPAIR_STEPS`（= 那条复合动作的定义）；`erases` 暂留（估时还是那条路）。插件 op 名不变（老复现包照开）。守卫 `test/repairs-modular.test.ts` 改成注册表守卫（核心只认 `commands/` 与各族清单、模块只认类型文件、`checkRegistry()` 空、步骤表 / 放置都指向登记过的东西）；843 绿；`probe-repair-panel` / `probe-repair-scope` OK（只改了探针里的 id）。
2. **选区动作表**：`edits()` 的 28 项拆成 `select.*`（session）、`scene.*`（建组 / 建组件 / 炸开 / 镜像 / 锁 / 隐藏 / 应用缩放 / 改原点 / 独立）、`geom.*`（软化 / 硬化 / 焊接 / 炸开曲线 / 删除）；`HudModel.edits()` 变成 `menuItems("contextMenu", mode)` 的包装；`selection-actions.ts` 的 SKIP 补丁消失。
3. **快捷键**：keydown 里 G / Ctrl+G / Ctrl+Shift+G / H / Alt+H / Ctrl+A / Ctrl+I / Alt+A / Alt+Z / Delete / Shift+Z / `.` 改成查放置表的 `key`；工具快捷键 = `tool.*` 条目（同键循环在 `tool.*` 的 plan 里）。方向键锁轴、Esc、Shift 按住这些是手势状态，留在 keydown。
4. **☰ 和视图菜单**里的场景 / 视图动作 → `view.*` / `scene.*`。
5. **搜索**（Blender F3 风格）：读表、过 `available`，白得。
6. **选区进撤销**（和 F-93 审计一起）：session 型记 0 op 步；鼠标点选 / 框选 / 套索走同一条。
7. **笔刷工具 + 笔刷表**：第一个笔刷 = 现在的橡皮「刮」改成表驱动（行为零变化），第二个 = nudge；软挪 / 雕 / 生命之粉 / 绘制以后只是加行。
8. 自由建模的新动词**直接按表写**：合（`geom.merge`：到中心 / 到游标 / 塌缩 = 一条指令三个参数值）、填（`geom.fill`）、溶解（`geom.dissolve`）、扩 / 缩（`select.grow` / `select.shrink`）、环选（`select.loop`）、镜像开关（`scene.mirror`）。

每步验收：右键 / ☰ / 快捷键 / 浮条在搬迁前后行为逐项一致（现有探针 + 新守卫「表里每一项都能在至少一个入口找到，或者明确标 search-only」）。

## 4. 不进表的（边界）

- **手势语法**：三种（取量型 / 直接操作型 / 笔刷型）是仅有的 modal 代码；具体工具只是语法 + 数据。
- **工具选项**（`tool-config.ts`）：生命周期不同（记住的、跨次有效）；指令默认值可以读它，不反过来写。
- **工作台**（`mode.ts`）：定义自己有哪些工具；放置表引用工作台 id。
- **参数小窗 / 对话框 / 菜单 / 环形菜单的长相**：渲染器。表只说有什么。

## 5. 后面三个纪元装不装得下（都装得下，只多族不改接口）

| 纪元 | 例子 | 形状 |
|---|---|---|
| 自由建模（现在） | 合 / 填 / 溶解 / 扩缩 / 环选 / 镜像开关；软挪、雕 | 指令（ops / session）；笔刷 |
| 生命之粉 / 魔法 | 生命之粉（球状笔刷打标记）；布置（实体）；施法（长跑指令）；悬链线、积雪（指令） | 笔刷 + 实体 + `estimate`（Promise 撤回，§2.3）；结果是「换一种物体」要 ops.ts 加一条 op（那时加） |
| 绘制 | 创建画布（指令）；落笔（笔刷）；重新指派语义 / 重采样 / 烤（指令） | 指令 + 笔刷 |
| 验证 | 放猫娘（点一下的笔刷或指令）；射界叠加层开关（view） | 指令 |
| 雕刻 / bodypaint / 节点 | 主要是笔刷和工作台；一次性的「重细分」「烘」是指令 | 族名前缀 + 放置表 modes 就是留的位置 |

## 6. 状态：user 10-27 下午已拍 / 还开着

**已拍**：现在做（1）；作用域默认 auto 但不写死（2）；放置单独一张表，UX 要变很多次（3）；改选区也记撤销步（4，Blender 同款）；要等很久先问（5；「挂机不问」是 AI 误读，撤回，§2.3）；快捷键留口子、暂不开放（6）；可扔（赞）；笔刷这一类现在接。

**10-27 夜又拍**：表看过（「注册表我好像看过，先做吧。其实这种反而比数据契约吃书重构更容易一点」「注册表先这么做」）；两层 + 族名 = 单位种类（§7）；第 0 / 1 步 done v0.15.9。

**还开着**：
- 变换手势通吃三种后端（SU 点 / 网格点 / 画布蒙版）= AI 的提议（§7.4），user 没拍；模拟那一族叫 sim 还是 magic（AI 选 sim），user 没拍。
- 2.1 第 4 条「按世界坐标架的指令碰到多份实例：按你手里那一份算 + 可「先独立」」= AI 的提议，没拍。
- 连续几步选区变化要不要合并成一步：先不合并（Blender 同款），以后是 History 上一条策略。
- Pinterest 式长按环形菜单：`radial` 放置面留了，渲染器等 FM4 的实验。

## 7. v2.2：两层 + 族名 = 单位种类（user 10-27 夜；Claude Fable 5.1 记）

### 7.1 user 原话（按时间）

- 「不过geom是个坏名字吧，如果brep的move不是mesh的move的话」「还是他们会路由不同的类型，我觉得这个grill一下，就是是每个操作只吃自己的内核，还是能通吃？特别是物理那边」
- 「不过改指令名字应该很容易吧，不过我还是觉得你的指令名字和category起的很怪，能不能好好想一下」
- 「绘制的关键是我会有液化，拉锁选区变换，这些有了bodypaint才能用。液化反而不重要，lasso transform才是真正承重的」
- （AI 给了「族名 = 这个动词改的是什么东西，不按纪元 / 菜单 / 工作台起名」）「赞」
- 「变换 transform 选中东西的位置 不太同意，对于物体你move的是transform，但是对于vertex你move的是vector array access」「给你一个送命题：同一个move tool，移动物体和移动顶点是同一个指令吗」「我们UX和command kernel可以分开一下」「特别是我的创新一直变，然后tool的语义好多都合租的，比如分类型路由」「我觉得函数的话是有type的。然后我们也不需要重载，而是tool有自己的以后可能很复杂的智能规律」「比如拖动猫娘，点一下是梳毛，点第二下是摸头，点第三下是投喂。都是一个手tool，所以也许具体的动词和ux要分家」
- 「一个hand可以摸头，抓尾巴，拖动，或者drag in out物品栏。然后transform也可以移动，move也可以移动。select也可以移动。你难道要写几十个移动命令？」
- 「注册表我好像看过，先做吧。其实这种反而比数据契约吃书重构更容易一点」「注册表先这么做」

### 7.2 送命题的答案：不是同一个指令

| 层 | 是什么 | 谁记它 | 谁改它 |
|---|---|---|---|
| **指令**（`command.ts`） | 带类型的内核动词：(环境, **一种**单位, 参数) → 要提交的 op。不认上下文、不认菜单、不认工具、**不重载**。 | 撤销记录、复现包、以后的联机 / 脚本接口 | 内核纪元换代时 |
| **动作**（`action.ts`） | UX 动词：右键菜单项、快捷键、笔刷的一个落点、工具松手那一下。看选区、看上下文、看点了几下，决定调哪几条指令；一次松手的几条调用 join 成一步。 | 放置表 | user 的 UX 创新（经常） |
| **放置** | 动作放在哪个面、什么顺序、哪些工作台、钉什么作用域 | — | 更经常 |

挪物体改的是变换矩阵，挪 SU 点是写坐标再过结算机，挪网格点是往位置数组里写：`object.move` / `brep.move` / `mesh.move` 三条带类型的指令。一个挪动工具按手里的东西路由；混选一拖松手 = 一步里三条调用。猫娘的手工具同款：一下梳毛、两下摸头、三下投喂是三条猫娘实体上的指令，哪条由工具的聪明规则定。

**不会有几十个挪动指令**：指令按「什么东西有位置」数，不按工具数——场景里凡是摆着的（实例、组、猫娘、参考线、画布实体、发射口）都是带变换矩阵的物体 = 一条 `object.move`；SU 点一条；网格点一条；以后画布上的蒙版一条。四条。手、变换手柄、挪动工具、选择工具拖拽、nudge 笔刷、方向键、数值输入全是动作。摸头抓尾巴不是挪；拖进拖出物品栏是 `object.add` / `object.delete`。

### 7.3 族名 = 单位种类（规矩只有一条：族名 = 这个动词改的是什么东西）

| 族 | 单位 | 例子 |
|---|---|---|
| `object` | 组 / 组件 / 实例这些容器 | group · component · explode · makeUnique · lock · hide · duplicate · delete · applyScale · origin · toMesh · toBrep · add（猫娘 / 参考线也是物体，带种类参数） |
| `brep` | 一个 SU 池（今天的 `PoolUnit`） | pushpull · followme · offset · explodeCurves · resegment · planar · snap · fillHoles · cleanup · weld · harden · straighten · hierarchy · move |
| `mesh` | 一个网格体（M2 时加） | extrude · inset · bevel · loopCut · knife · dissolve · merge · fill · bridge · subdivide · mirrorWeld · move |
| `select` | 选区（会话态；记成 0 op 步） | all · none · invert · grow · shrink · loop · linked |
| `view` | 相机和显示（不记撤销） | zoomExtents · xray · isolate · showAll |
| `doc` | 文件和文档设置 | open · save · import · export · units · grid |
| `paint` | 画布像素 | canvas · dab · liquify · resample · bake |
| `sim` | 读任何几何的三角形视图、产出一个类型声明好的新物体 | tag · cast |

作废：`geom.*`（重载）、`scene.*`（改叫 object）、`physics.*` / `verify.*`（按纪元起的名）、`repair.*`（按菜单起的名——修复面板只是一个放置面，九条各归 brep）、`tool.*`（切工具是动作不是指令）、`transform.*` / `edit.*`（v2.2 草稿里的「通吃族」，就是重载）。

### 7.4 分型路由（user「每个操作只吃自己的内核，还是能通吃？特别是物理那边」）

- **指令只吃自己的那种单位。** 作用域解开后每一块都带着自己的种类（brep 池 / mesh 体 / 物体）；动作按种类把块分给指令；直接按 id 调一条指令（脚本 / 复现包）时，不是它那种的块跳过并在结果里说出来（「跳过了 2 个网格体：推拉只对 SU 体有效」），一块都不剩 = 不可用并给原因。不静默。
- **物理（`sim`）**：既不是只吃自己也不是通吃动词——它吃两个内核都能给的三角形视图，产出一个类型声明好的新物体（布 / 枕头 → 网格体；碎裂切口是平面 → SU 体；积雪只改材质或网格）。永远不调内核动词，内核分家牵连不到它。
- **绘制**（user「lasso transform 才是真正承重的」）：画布蒙版 = 第四种有位置的单位。**AI 的提议（没拍）**：变换手势通吃三种后端（SU 点 / 网格点 / 画布像素），选中什么就变换什么，WeebPaint 的拉索 → 变换感觉直接搬过来；说实话：画布上的变换是沿表面的二维变形不是三维刚体变换，共用的是手势和选区模型，数学另一份。
- **动作层就是「合租」的地方**（user「tool 的语义好多都合租的，比如分类型路由」）：路由、点几下、混选，全在动作和工具里长；指令和文件格式纹丝不动。

### 7.5 今天落地的（v0.15.9）

`src/editor/commands/`：`command.ts`（`CommandFamily` / `CommandId` / `PoolUnit` / `CommandEnv` / `PlanOut` / `Command`）、`action.ts`（`Action` / `Surface` / `Placement` / `Family`）、`registry.ts`（查法 + `checkRegistry`）、`index.ts`（清单）。修复一族 = `repairs/index.ts`（`commands` + `actions` + `placements` + `REPAIR_STEPS`）。今天只有最笨的动作（一条指令一个同 id 的动作）；路由型动作等 mesh M2 / 物体族来了在 `action.ts` 里长（`run(env, units) → CommandCall[]`）。

### 7.6 追记（user 10-27 更晚）

- 「变换手势叫什么意思」→ 就是拖着手柄挪 / 转 / 缩那一下（移动、旋转、缩放三个工具共用的手柄 + 吸附）；「通吃三种后端」= 同一套手柄，选的是 SU 点就挪点、网格点就挪网格点、拉索圈的像素就沿表面挪。手势一套、数学三份。仍是 AI 提议。
- 「magic里面有sim也有过程生成以及geometry node之类的，不过改名快」→ 魔法纪元 = 模拟 + 过程生成 + 几何节点；到时按「吃什么、产什么」分族（模拟吃三角形视图产物体；过程生成吃参数产物体；节点吃图产物体），族名到时候定，改名是字符串替换，不卡。
- 「fable继续做，加油」→ 下一块 = mesh M2（网格接进场景），brep 数组制度排它后面（冲刺要的是能自由建模）。
- 「二次元显然逻辑和三次元不一样，而且weebpaint的transform很复杂的。到时候专门弄。brep mesh object倒是ux可以统一」→ §7.4 里「变换手势通吃三种后端（含画布像素）」的提议**作废**：变换手势只在 brep / mesh / 物体三者之间统一；绘制的变换到时候专门做。

### 7.7 第二族落地（v0.15.12）

物体族 `src/editor/objects/`：单位 = 定义（`ObjectUnit`），两条指令 `object.toMesh` / `object.toBrep`。`Command<U>` 按单位种类泛型化、`unit` 字段 = 族名（守卫）、`estimate` 进接口；编辑器 `commandMenu` / `runCommand` 按单位种类派发（brep 族 = 池作用域；object 族 = 选中的组件）。第三步（选区动作表 28 项拆成动作）仍归 Opus。
- 「模拟叫sim，或者长一点的，不简写。magic是ux概念，而且我可能到时候会换别的」→ 族名 `simulation`（代码里已改）；UX 上叫什么（魔法 / 别的）随 user 换，指令族名不动。

### 7.8 两道接缝落地（v0.15.16，2026-10-27 夜，Claude Fable 5.1）——给 M4（Opus）的底子

user 10-27 夜「以后会有各种不同的物体类型，有些可能你根本想不到」→ 接缝全部按**种类**开口，不写 `if brep else mesh`：

- **三种单位齐了**（`commands/command.ts`）：`PoolUnit`（brep 池 + BrepSelection）/ `MeshUnit`（网格体定义 + MeshSelection；网格体没有组，池 = 定义）/ `ObjectUnit`（**摆着的一份实例**：at 池 + instance + def + body + copies + xf）。物体族改成实例级：挪 / 转 / 缩 / 锁 / 藏改的是这一份；改定义的指令（转换）声明 `perDefinition`，框架按定义去重、披露「N 份一起变」。
- **动作 = 按单位种类的路由表**（`action.ts` `commands: Partial<Record<UnitKind, CommandId>>`）：挪 = `{ brep: brep.move, mesh: mesh.move, object: object.move }`；修复 / 转换的动作只有一行。守卫（`registry.ts checkRegistry`）：路由指向的指令吃的正是那种单位。更聪明的路由（点几下、猫娘）以后在这里长成函数。
- **第一个路由型动作「挪」**（`src/editor/move/index.ts`，一个可扔的模块装三条不同族的指令——**文件夹 = 按功能分的模块，族 = id 前缀 = 单位种类**，两者不是一回事）：`brep.move`（选区解成点集、按坐标寻址、过结算机）/ `mesh.move`（新 op `meshMove`：按 id 写位置数组，不过结算机）/ `object.move`（实例矩阵左乘平移）。参数 (dx, dy, dz) 米，坐标系 = 当前上下文（定义坐标）。今天只登记在 api / search 面；挪动工具 / 变换手柄 / 方向键 / nudge 以后都路由到这三条。
- **通用跑法** `Editor.runAction(id, params?)`：`unitsOf(kind)`（brep / mesh = 活动池 + 几何选区；object = 选中的没锁的实例）→ 每种单位喂它那条指令 → 全部 op 合成一步；表里没有的种类跳过并说出来；没事做把各指令的 `none` 连起来说。混选一挪 = 一步两条调用（探针 ⑥：网格体实例 + 根池的膜，Ctrl+Z 一次全回）。两个特例等第三步（28 条选区动作进表）折进来：只路由 brep 一种 = 修复那条路；只路由 object 一种 = 物体那条路。HUD 的 id 前缀 `repair:` → `action:`。
- **撤销的 mesh 记录**（`history.ts` tier `mesh`）：提交前整份拷（类型数组）→ 影子换真身（`MeshKernel.swapWith`，对象身份不变）→ 记录 = 整表互换、自反。差量版等网格大了再做（和 brep 的 KernelDelta 同形）。
- **选区带种类标签**（`tools.ts`：`Selection = BrepSelection | MeshSelection`，`kind` 判别；参考几何只在 brep 上）= Fable 账单 A2。不变量 selection.kind === 活动池的身体种类（`Editor.blankSelection`，进出上下文 / 换场景时重造，`pruneSelection` 遇到种类不符整个作废）。
- **自由建模工作台的边界**：`ModeId` += `freeform`，`MESH_KIND.modes = ["freeform"]`，`modes/freeform.ts` = 壳 + 选择工具；`enterPool` 按 KindDef.modes + 装了的 Mode 放行（没有的种类诚实拦住）；进出上下文 / 换场景后 `ensureModeForKind` 切工作台；左上下拉只列管这种身体的工作台。编辑器里的通用路径（点击族 `selectExpandView`、全选、缩放到选区、状态行、剪选区）只认显示契约 `KernelView`——新种类的内核给了 KernelView 就自动有选择；brep 专属动词（删除几何 / 建组 / 建组件 / 炸开 / 镜像 / 隐藏 / 软化 / 焊接 / 炸开曲线）在别的池里 `requireBrep` 提示一句、HUD 不露（露了点不动 = 误导）。
- **顺手修的撤销 bug（v0.15.15 的）**：鼠标点选 / 框选发生在指针事件那一步里，`afterSelect` 只在步深 0 记录、却无条件推进 lastSession → 点选永远进不了撤销栈。现在选区记录在一步结束时做（`step()` 的 finally：这一步没 op → `recordSession`；有 op → 只推进 lastSession）。探针：点选一张面 → Ctrl+Z 选区清、Ctrl+Y 回来。
- 网：`test/registry-seams.test.ts`（守卫 / 三条挪 / meshMove 目标缺席 / mesh 记录自反 / 种类登记）+ 无头 `test/probes/probe-mesh-workbench.mjs`（进网格体池 → 自由建模 / mesh 选区 → 点面 / 撤点选 / 全选 → brep 动词拒绝不崩不记步 → 挪网格点 + 撤 → 退出回硬表面建模 → 混选一挪一步 → 没选说清 → 撤到头 / 重做到头不崩）。893 单测绿；修复 / 撤销 / 开机探针全过；六个 v0.15.9 起就坏的修复探针（还在调 `repairMenu()` / 短 id）顺手修好。
- **给 Opus 的 M4 清单**：① 工具进 `modes/freeform.ts handlers`（刀 / 拉 / 环切 / 溶解 / 合并 / 填 / 挤出……算子在 `src/mesh/ops/`），动词写成 `mesh.*` 指令 + op（照 `meshMove` 加进 `ops.ts` 的 mesh 族 + `history.ts MESH_OPS`）；② 挪动工具 / 变换手柄路由到「挪」的三条指令（`runAction` 或直接 `routesOf`）；③ 第三步：28 条选区动作进表、两个特例折进 `runAction`；④ mesh 池里的删除 / 隐藏 / 建组件（含子实例）= `mesh.delete` / `mesh.hide` + 物体族；⑤ 点击族三下的连通体在 mesh 上只沿 faceLinks 泛洪（没有软边 / 曲面概念，够用）；⑥ 种类再多时把「撤销怎么记」挂到 KindDef 上（今天 brep / mesh 各一段）。
