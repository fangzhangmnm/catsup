# 整版施工单：第 2 版 = 工具的底座

> created 2026-11-13 by Claude Fable 5.2（Catsup统筹）· as-of 三维开发版 v0.19.113，第 1 版（物体的管理）还在分支 `objects-wave1` 上
> 第二稿（同日晚，Claude Fable 5.2）：user 看了第一稿之后说「没事多设计一下深模块窄接口」，统筹读了推拉、自由式变换、画线、移动四把工具，把接口往深里定了一层——工具收成一个纯函数。第一稿里「形状清点后定」的三处现在都钉了形状。
> 施工：Catsup小弟。第 1 版合了之后开新分支 `tool-base-wave2`，整版做完合一次 = 一个补丁号。
> 出处：总表「系统性的毛病」第 1、3 条；user 11-13 夜「tool和command分开来，command就是一个变换，预览的时候也调用。tool是手势。mcp只读command」「对硬表面、网格体、子物体都适用，以后的曲线也一样」。
> 标〔默认〕的是统筹先定的，user 没说过。「四种要法」和「两族移动是同一条命令」统筹问过 user、user 没答，先照统筹的读法做。

## 零、这一版怎么做

和第 1 版同一套：一口气做完，做完统筹一口气审、小弟一口气修；施工单没写到的细节照已有的规矩先定、记进施工记录；顾虑和小调整记进第九节，不停工。**停下报统筹只有三种**：会丢数据或写坏文件；挡住做不下去；要动文件格式、撤销里存什么、存盘、修改锁。

这一版**看得见的应该不变**（例外只有第四节第 5 条那一种，要列出来）。

## 一、毛病、它会长成什么、收了之后的样子

- **毛病**：同一件事每把工具各做一遍。取点那一串（求吸附 → 意图门 → 粘性 → 套锁 → 取整 → 充能 → 画光标）硬表面 12 把工具各拼一遍，拼得不齐；24 个工具文件各自直接提交指令；「给一个数」有三套（硬表面做完再打数、自由建模拖着打数、马后炮小窗），各接各的；`ToolHandler` 约 31 个口子里有十来个说的是「这一下怎么开始、怎么结束」，每把工具各答一遍。
- **它反映的结构**：人的输入有很多种（鼠标、笔的轻按重按、手指、键盘起手、打数、回车），工具有很多把，现在是两两相乘。每多一种输入，每把工具都要改；每改一遍多一处拼得不齐。
- **收了之后分三层，每层不认识另外两层**：
  1. **底座**：把人的输入变成答案。所有输入方式只在这里。
  2. **工具**：一个纯函数——已经要到了什么 → 还要什么、现在停手会交哪条命令。不认识指针、视口、设备。
  3. **命令**：参数 → 变换。不认识手和屏幕。
- **顺带买到的**：工具和命令不开浏览器就能测（喂答案、看交出来的命令；喂参数、看指令）。无头浏览器的探针只需要守底座和几条从头到尾的路。

## 二、两层之间的接口（钉住的是形状；字段清点后可以回写，一次发统筹）

```ts
// —— 工具能要的四样 ——
export type Ask = ThingAsk | PointAsk | QuantityAsk | StrokeAsk;

/** 要东西（一个或一些）。底座怎么给：点、Shift 点、框、套索——以后加的选法都加在底座，工具不知道。 */
export interface ThingAsk {
  readonly want: "thing";
  /** 现成的选区就算数（先选后做、键盘起手）：有选区 = 这一问当场答完。 */
  readonly selectionCounts?: boolean;
  /** 要哪几级（点 / 边 / 面）；缺 = 跟着拾取范围的开关。 */
  readonly kinds?: PickKinds;
  /** 软边也算。 */
  readonly soft?: boolean;
  /** 够得着哪几档：第 1 版那张表的哪一行（缺 = click 那一行）。 */
  readonly reach?: ReachRowId;
  /** 在哪个世界里拾：live = 带着这一下的预演（缺省）；static = 真身。 */
  readonly view?: "live" | "static";
  /** 要一些：答案是一组。 */
  readonly many?: boolean;
  /** 光标悬着就预演（擦面）。 */
  readonly previewOnHover?: boolean;
}

/** 要一个点。 */
export interface PointAsk {
  readonly want: "point";
  readonly view?: "live" | "static";
  /** 工具自己的几何限制：落在一张平面上 / 一根轴上 / 过某点正对眼睛的平面上。人按的轴锁叠在它上面，归底座。 */
  readonly on?:
    | { readonly kind: "plane"; readonly plane: DrawPlane }
    | { readonly kind: "axis"; readonly origin: Pt3; readonly dir: Pt3 }
    | { readonly kind: "view"; readonly through: Pt3 };
  /** 从哪一点量起：有它 = 一段的另一头（对齐、意图门、锁、取整都相对它；打数 = 从它沿当前方向走这么长）。缺 = 第一点。 */
  readonly anchor?: Pt3;
  /** 手里的东西：哪些点在手里（不吸自己）、手里的膜挡不挡、是不是只算这一下新生的。 */
  readonly hand?: { readonly moving?: (vid: VertexId) => boolean; readonly opaque?: boolean; readonly freshOnly?: boolean };
  /** 另加的吸附目标（现在的 toolTargets）。 */
  readonly targets?: AlignQuery["toolTargets"];
  /** 落在轴上时另加的停靠位置（推拉的高度集）。 */
  readonly stops?: readonly number[];
  /** 这一问可以不答、直接收（画线收笔、刀收刀）。同一处再点一下 / 回车 / 「收」钮 / 第一下 Esc 都归底座。 */
  readonly finish?: { readonly label: string };
}

/** 要一个量 = 要一个点 + 把点读成数。打数、取整只在底座做一次。 */
export interface QuantityAsk {
  readonly want: "quantity";
  /** 长度 / 角度 / 倍数。 */
  readonly tag: QuantityTag;
  /** 手怎么给：一个受限制的点。 */
  readonly point: PointAsk;
  /** 点 → 数（沿轴的高度、到圆心的距离、绕轴的角度、到轴心的距离之比）。 */
  readonly read: (p: Pt3) => number;
  /** 数 → 点（打了数、取了整之后光标画在哪）。 */
  readonly write: (v: number) => Pt3;
  /** 右键 = 照 0 落定（挤出之后留在原地）；缺 = 右键是取消。 */
  readonly zeroCommits?: boolean;
}

/** 要一笔（一串带压力和时间的样本）。这一版只登记、不搬：画画和雕塑照旧走原来的路。 */
export interface StrokeAsk { readonly want: "stroke" }

// —— 底座给的答案 ——
export type Answer =
  | { readonly got: "thing"; readonly things: readonly Classified[] }
  | { readonly got: "point"; readonly p: Pt3; readonly how: How; readonly snap: Snap3; readonly under: Snap3;
      readonly ray: { readonly origin: Pt3; readonly dir: Pt3 }; readonly lock: AxisConstraint }
  | { readonly got: "quantity"; readonly value: number; readonly how: How; readonly p: Pt3; readonly lock: AxisConstraint };
/** 这个答案是怎么来的（尺寸文案、提示用）。 */
export type How = "typed" | "snap" | "stop" | "grid" | "free";

// —— 工具 ——
export interface Step {
  /** 现在停手会做什么：底座拿它预演；null = 还没东西可做。 */
  readonly call: CommandCall | null;
  /** 还要什么；null = 要齐了，落定 call。 */
  readonly ask: Ask | null;
  /** 落定之后带着这些答案接着来（画线连画 = 上一段的终点）。 */
  readonly chain?: readonly Answer[];
  /** 提示行。做不了（call 和 ask 都是 null）时这里说原因。 */
  readonly hint?: string;
  /** 工具自己的辅助线（量线、候选参考线）。 */
  readonly extras?: Partial<ViewState>;
}
export interface GestureTool {
  readonly tool: Tool;
  /** 吃哪种约束、要几个方向。闲着时锁钮亮不亮也问这里（照 v0.19.112：只问一处）。 */
  readonly lock?: "axis" | "plane";
  readonly axisWants?: 1 | 2;
  /** 纯函数。底座在悬停、拖动的每一帧拿「已经要到的 + 光标下的候选答案」再调一次 = 预演。 */
  step(got: readonly Answer[], env: StepEnv): Step;
  /** 工具条上另外露哪几组选项（照旧）。 */
  stripGroups?(cfg: CatsUpToolConfig): readonly { readonly group: string; readonly keys?: readonly string[] }[];
}
/** 工具看得到的：只读；没有指针、没有视口、没有设备。 */
export interface StepEnv {
  readonly scene: Scene; readonly context: EditContext; readonly selection: Readonly<Selection>;
  /** 真身的世界（求面的平面、法向这类）。 */
  readonly world: WorldView;
  readonly config: CatsUpToolConfig;
  /** 同一把工具的另一种起法（切割的环切）。 */
  readonly variant?: string;
  kernel(): Kernel; mesh(): MeshKernel;
}
```

拿四把工具套了一遍（统筹读代码套的，没跑）：
- **推拉**：要一张面 → 要一个长度（点限制在过抓点、沿法向的轴上，`stops` = 现在的高度集，`read` = 沿法向的高度）→ 交「推拉这张面这么高」。曲面的一片、子物体里的面 = `hint` 说原因。
- **画线**：要一个点 → 要一个点（`anchor` = 上一点，`finish` = 收笔）→ 交「画一段」，`chain` = 终点。
- **对齐式移动**：要东西（选区算数）→ 要一个点 → 要一个点（`anchor` = 第一点，`hand` = 在动的点）→ 交「移动这么一段」。
- **自由式移动 / 旋转 / 缩放**：要东西（选区算数）→ 要一个量或一个点（`on` = 正对眼睛的平面）→ 交同一条移动 / 旋转 / 缩放。答案里的 `lock` 就是人锁的轴，进命令的参数。

**`step` 每一帧都会被调**：贵的东西（停靠位置这一类）只在算 `ask` 的那个分支里算；「已经要到的」没变时，底座对那一步的 `ask` 只算一次。

## 三、底座：输入 → 答案（新模块，不进 editor.ts）

下面这些从工具里搬走，各只有一处：

1. **取点的顺序**：求吸附 → 意图门 → 粘性 → 套锁（最后一道）→ 取整 → 充能充 `under` → 画光标和吸附标签。照 v0.19.112 定的，`probe-lock-last` 照旧守。悬停取点是同一条路「没有 anchor」的那一种。
2. **要东西**：拾取 → 拾取范围 → 够不够得着（第 1 版那张表）→ 分类。现在的 `pick` / `pickStatic` / `pickFace` / `classify` 合成它。
3. **要量**：`read(点)` → 打了数就是打的数，否则照整格的规矩取整（`increments.ts` 一处）→ `write` 回去画光标。三套「给一个数」收成这一处：拖着打数、做完再打数、马后炮改数，都是「换一个量的答案」。
4. **怎么开始、怎么结束**：点两下还是按住拖、笔的轻按找重按落、键盘起手（第一问是「选区算数」的工具都能键盘起手）、回车、右键、Esc、同一处再点一下、连着做、手指轻点。现在 `ToolHandler` 上的 `startModal` / `tap` / `awaitsClick` / `commitInPlace` / `sameSpotEnds` / `escFinishes` / `finishLabel` / `pressKind` / `typedQuantity` / `previewOnHover` / `active` / `cancel` / `down` / `track` / `up` / `hover` / `live` 都归这里，照这一步的 `ask` 和立场表办。
5. **顺带归底座的**：尺寸文案（从量的答案出）、人的尺度参考（`scaleGeom`）、抬笔结算的样本（存的就是每帧的候选答案）、复现包（已经要到的 + 交出来的命令）、取消（丢掉已经要到的）。

**做法**：先把这条路做成底座里的函数，老工具里那一串换成调它（每把几行，不改行为，全部探针守着）；工具改写成 `step` 是第六节第 4 刀的事，每把工具只重写一次。

## 四、命令：参数 → 变换

规矩（user 定的）：**命令 = 给参数做一次变换，不认手和屏幕；工具 = 只管手势；预演和落定是同一条命令、同一组参数，只差作用在影子还是真身。**

1. 底座拿 `Step.call` 跑 `plan`：作用在影子上 = 预演，作用在真身上 = 落定。
2. **马后炮 = 同一条命令换参数重跑**，和菜单里的命令同一条路。各工具手写的重做闭包拿掉。
3. `ToolCtx` 上直接提交的口子（`commitOp` / `commitXform` / `commitCopies` / `previewXform` / `xformMoveOp` / `copyPayload` / `offerAfterthought` 这一类）拿掉，变成命令里面的事。卷尺、量角器留参考线也走命令。
4. **命令不读屏幕**：参数里带齐（点用这个单位的本地坐标、数、元素的 id）。`CommandEnv.eye()` 那笔欠账在这里还：造面要的「朝着哪」由工具从点的答案里的 `ray` 填进参数；`CommandEnv` 上不留和视图有关的读法。
5. **拼得不齐的怎么办**〔默认〕：以前某把工具少了意图门、充能、锁、打数，清点时分清是**有意的**（写出原因，变成 `ask` 里一个说得出理由的选项）还是**漏的**。漏的收进来之后自然就有了——这是这一版唯一看得见的变化，版末逐把列出来给 user 判。
6. **两族移动 / 旋转 / 缩放 = 同一条命令两种要法**：对齐式和自由式是两把工具，`step` 交出来的是同一条命令（移动 = 一个位移；旋转 = 轴心、轴、角度；缩放 = 轴心、坐标架、倍数）。硬表面的选区、网格体的选区、子物体各是一种单位，照现有的「一个动词在每种单位上一条命令」。
7. **撤销里存什么不变**（还是指令）。`CommandCall` 进不进撤销记录、复现包的格式，不在这一版——要动就是停下报统筹的那一种。
8. **快慢**：每帧预演不许比现在慢。整体移动这类现在有快路（影子场景 + 子池叠加变换），要留着：底座认得「计划结果是纯变换」。改前改后在同一次运行里各量一遍（真显卡的无头浏览器），数字进施工记录。
9. 尺子（守卫）：`src/editor/commands/` 不许 import 工具、指针帧、拾取、视口；随便拿一条命令，只给「名字、单位、参数、场景」就能在单元测试里跑。工具那一侧同理：`step` 的文件不许 import 指针帧、视口、编辑器。
10. **窗口里改模型的字段也交命令调用**：物体窗口每个种类自己报的那几行（`app/kind-pages.ts KindPageRow`）现在的 `set` 是直接调编辑器动词的闭包（第 1 版先搬家留下的）。改成交一次命令调用（哪条命令、什么参数），由底座提交：开强行对称 = 一条命令计划出「设置 + 对称一次」两条指令，一步撤销。`KindPageCtx` 跟着收窄成只读的，不再递整个编辑器。改模型的入口到这里只剩三种来路（菜单、手势工具、窗口字段），交出来的都是命令调用。

## 五、不照这个形状的工具

操纵手柄、雕塑、画画的笔、相机和步行这几类直接接指针，留着现在的 `ToolHandler`。版末这张名单每一把写明为什么不是 `step`。**不许有「还没来得及搬」的**：搬不了的写原因，统筹判。

## 六、自动测试不写死按键

225 个探针里 26 个直接按字母键（93 处）。不是专门测键位的探针改成按名字拿工具、按名字发动作（帮手去现行键表里查这个名字现在是哪个键再按，键的那条路照样走到）。专门测键位的探针留着按键，列一张名单。键表一改，名单上的和用了帮手的都要跑。

## 七、先后

0. **清点（只读）**，一张表，每把工具一行：照第二节的形状写不写得出来（写得出 = 列出它依次要什么、交哪条命令、参数有哪些；写不出 = 缺什么）；取点那一串缺的零件是有意还是漏；第三节第 4 条那批口子它实现了哪几个、特殊在哪。**一次发统筹**，统筹回了再动第 3 刀之后的。
1. 第六节（探针按名字）。不用等统筹。
2. 取点的那条路做成底座的函数，老工具换成调它（第三节末尾的做法）。不用等统筹。
3. 底座剩下的：要东西、要量、怎么开始怎么结束；命令的预演和落定（第四节第 1–3 条）。
4. 工具一族一族改写成 `step`：先移动 / 旋转 / 缩放两族，再画线类，再推拉 / 偏移 / 挤出 / 刀这一类，最后只读的。每改一族，那一族的老口子当场删。
5. 收尾：`ToolCtx` 和 `ToolHandler` 上没人用的口子删掉；第五节的名单。

## 八、版末交给统筹的

1. 体重：`ToolCtx` 有几个口子（现在 103）、`ToolHandler` 有几个（现在约 31）、工具文件夹的行数，改前改后各一个数。照 `step` 写的工具，自己的口子应该只剩第二节 `GestureTool` 那几个。
2. 清单：做了什么；小弟自己定了哪些；没验到什么；第四节第 5 条那张「哪把工具因此多了什么」的表；第五节的名单。
3. 接口：`scripts/gen-api.sh` 重打；第二节钉的接口和做出来的不一样的地方回写。
4. 流程图 `ai-docs/20261026-pipelines.md` 同一个提交更新（取点、预演、落定三条路都变了）。
5. 第九节两张清单的处理结果。

## 九、小调整和顾虑（小弟边做边记，版末一起处理）

小调整：

顾虑：

## 十、施工记录

（小弟写）
