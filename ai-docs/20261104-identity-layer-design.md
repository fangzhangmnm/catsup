# 身份层设计书：ID-4 把身份逻辑做成深模块（2026-11-04 深夜）

> created 2026-11-04 by Claude Fable 5.1 · as-of v0.18.34（main a587966，ID-1…ID-3 都合进去了，没推）· 状态：**设计书，等 user 过目 → 切 Opus 施工**。谈话 = `talks/20261104-identity-layer-deep-module.md`、`talks/20261104-paste-update-or-keep.md`；上游 = `20261104-identity-foundation-plan.md`（§15.3 末 Fable 审 ID-3 的记录；本书是它的第五张单，§16 指路）。
> 这是一张**重构单**：按家规要交付体重变化（§11），不改文件格式（§10），粘贴更新规则是它的第一个客户（§7–§8）。

## 0. 一句话 + 为什么现在

- **一句话**：文件是一张「条目有稳定身份、条目之间有引用」的对象图；身份层让所有把东西从一张图搬到另一张图的动作——拷贝、粘贴、导入、存盘重开、撤销重放、清理孤儿——都走同一层认得引用的代码。
- **和场景树的关系**（user 11-04 深夜「关系图很多时候和场景结构图反而是反的？大家都引用水分子，所以是越往下走越窄的树？」）：场景树 = 引用图沿每条路径**展开**（每份实例一个节点，越往下越宽；`EditContext.chain` 就是场景树节点的名字）；引用图 = 场景树按身份**折叠**（一百个水分子折成一条定义、一百条边进来，越往下越窄，材质 / 层在最底最窄）。文件存的是折叠的那张（定义 + 实例），画的时候展开（`Scene.pools`）。折叠的图是有向无环图不是树（氢被水和双氧水同时用 = 菱形），所以要查环、要有「断开」、更新一处所有份跟上。**形状是纺锤**（user 追问「场景树根是宇宙往下变宽，关系树根在最下面是基本粒子？」）：从一个根（宇宙）先变宽（中间一层组件最多）再收窄到底——材质 / 层 / 最基础的小组件，它们没有出边，一切压在它们上面。哪头叫「根」看问什么：**活死**从宇宙往下（本书的「根」= 这一头：模型根 + 素材架 + 常量）；**建造顺序 / 更新传播**从底往上（先有材质再有用它的组件 → 落地两遍或记忆表；改水分子所有含水的跟着变）；**闭包**从拷的那个往下走到底。
- **user 11-04 深夜**：「会不会身份逻辑实际上是一个深模块？甚至是库，就像ecs一样」「我以前以为只是guid + F。就是两句话的拾取 我在想的是我们现在好好把它做成一个深模块。我们一起设计一下」「即使不共享也是内部深模块」「我建议是一开始优先架构而不是ad hoc」「贴图独立，嗯做」「贴图成条目，以后还有别的，能不能开放条目类型」。
- **为什么现在**：取闭包、换号、查环、算活死、断开这五件事，今天按组件 / 材质 / 层各手写了一份（§2 盘点）；贴图独立成条目是下一波（材质纪元），会写第四遍。三次就抽。
- **模块 vs 库**（user 原话）：「模块就是只有一个用户的库，还是有api，窄接口」。所以放 CatsUp 自己的目录、接口按库的标准收窄、不 import 任何几何；要抽成 `@internal/` 时零改动搬走。全家族库现在不做（兄弟里有对象图引用需求的只有 CatsUp）。

## 1. 词表（本书只用这些词；代码里的名字在括号里）

| 词 | 意思 |
|---|---|
| **条目**（entry） | 有 GUID、能被别的条目引用、能共享、能上架、能成孤儿的东西。今天三种：组件定义、材质、层。 |
| **层**（layer） | SketchUp 的 Tag：带名字的开关，物件归进去一起藏 / 显示（user 11-04 深夜问「什么是层」）。名字 + 可见 + 可选颜色；文件里一张层表，默认层身份是全家常量；**只有实例归层**（组不是物体、面边不归，10-24 契约 §4），没归的继承外面那一层。不可见 = 不画、不吸、点不中。是条目因为实例引用它、跨文件要按身份合回；合并永不更新因为显不显示是看法不是内容。**撞名**：代码里「边层 / 面层」是每边 / 每面一列的属性层（软边、折线、材质号），WeebPaint 的图层是第三个意思；本书的「层」只指这个开关。 |
| **附属**（owned） | 跟着主人走、不单独算的东西：实例、组、参考几何、面边点。它们有 GUID（实例 / 组）但身份归主人管。 |
| **种类**（kind） | 条目的类别，开放集（§3）。每种一份声明。 |
| **引用**（ref） | 一条目指向另一条目：`{ kind, guid }`。实例 → 定义、槽表 → 材质、实例的层代号 → 层。 |
| **根**（roots） | 活着的起点：模型根 + 素材架上的每一格 + 每种条目的固有常量（默认层、内置正 / 背面）。 |
| **闭包**（closure） | 数学的「传递闭包」，不是函数闭包（user 11-04 深夜问「闭包是什么意思」）：从一组条目出发，沿「跟闭包走」的引用一直走到走不动，碰到的全部条目（文件形状）= 要让这些东西完整必须一起带走的全部。例：椅子里摆椅腿、用木头材质、在家具层；椅腿里摆螺丝、用金属材质 → 椅子的闭包 = 椅子、椅腿、螺丝、木头、金属、家具层六样，少一样贴过去就有一条引用指着不存在的东西。素材架不带（根不是内容）、固有常量不带（那边本来就有）。**边是单向的「我需要谁」**（user 问「那不是六度定理就是全世界吗」）：材质不知道谁用它、椅腿不指回椅子，所以椅腿的闭包 = 椅腿、螺丝、金属，不含椅子；只有从模型根出发闭包才是整份模型。「谁在用它」是反向索引（普查算，给面板和弹窗用），不进闭包。以后动画引用组件也是动画需要组件：拷组件不拉动画、拷动画拉组件（Blender 链接物体带网格材质、不带包含它的场景，同理）。 |
| **包**（bundle） | 一次要搬进来的闭包 + 它从谁往下走（roots）。粘贴载荷的 `closure` 和 `materials` 合起来就是包。 |
| **前沿**（frontier） | 包和这份模型对一遍：要新建的 / 已有且一样的 / 已有且不一样的，各带使用统计。 |
| **决定**（decision） | 人（或规则）对前沿的处理方式：更新 / 留这里的 / 断开。一次搬运只一种（§7）。 |
| **计划**（plan） | 决定落到每条条目上的结果：新建哪些、更新哪些、断开哪些及其新 GUID、每个引用怎么换。纯数据。 |
| **落地**（materialize） | 按计划把文件形状的条目装进场景（打开文件和粘贴同一份）。 |
| **普查**（census） | 从根走一遍：谁活着、谁是孤儿、谁被谁引用了几次。面板、清理、粘贴报告共用。 |
| **断开**（detach） | 给内容不一样的条目和包内指着它们的上层铸新身份（SketchUp Make Unique 的一般化）。 |
| **录音带**（tape） | 提交时录下这条指令铸的 GUID、重放时按原样放回（`recordMints / replayMints`）。 |

## 2. 现状盘点（v0.18.34）：这层的手工版散在哪

| 五件事 | 组件定义 | 材质 | 层 |
|---|---|---|---|
| 取闭包 | `transfer.ts extract.closureOut`（`resources.ts reachableDefs`）、`payloadFromDocument.walk` | `extract.codeOf` 顺手收、`payloadFromDocument` 过滤 | `extract.layerGuid` 顺手收、`payloadFromDocument` 过滤 |
| 换号 / 落地 | `scene-doc.ts definitionsToMake + materializeDefinitions`、`ops.ts mergeClosure.defOf` | `mergeClosure.materialOf`、`pastedMaterial` | `mergeClosure.layerByGuid`、`materializeDefinitions.layerOf` |
| 查环 | `transfer.ts pasteWouldCycle`、`Scene.references`、`materializeDefinitions` 末尾防线 | —（不会成环） | —（不会成环） |
| 算活死 | `resources.ts liveDefs / shelvedDefs / census` | `resources.ts materialUse`（faces / orphanFaces / shelved） | 没有（层没人算活死） |
| 断开 / 克隆 | `ops.ts cloneDefinition`（makeUnique） | — | — |
| 身份查找 | `Scene.defByGuid`（线性） | `Scene.materialByGuid`（线性） | `s.layers.find` 散在三处 |

- 文件形状 `format/document.ts`：`DefinitionDoc { guid, name, kind, mesh, brep, groups[], instances[], materialSlots: (Guid|null)[], guides, drawFrame }`、`InstanceDoc { guid, definition: Guid, parent: Guid|null, layer?: number }`（层是文档层表 `LayerDoc.id` 的代号）、`MaterialDoc { guid, name, color, texture?: ImageAsset }`、`LayerDoc { id, guid, name, visible, color }`、`ShelfDoc { folders, items: { guid, kind, ref, folder } }`。面上的材质代号在 `MeshDoc.faceMat` / brep 快照里，查每个定义自己的槽表。
- 读取 `format/read.ts`：`ownGuid(raw, seen)` 每类一个 seen 集；**重复的 GUID 头一条留身份、后面的现铸、引用都指头一条，不披露**（§9 要改成披露）。
- 行数：`transfer.ts` 253、`scene-doc.ts` 159、`resources.ts` 107、`guid.ts` 60、`ops.ts` 里 paste / mergeClosure / mintPasted / cloneDefinition / 六条 shelf ≈ 170。
- 客户（谁 import 这些）：`app/hierarchy-window.ts`、`app/shelf-actions.ts`、`editor/history.ts`、`editor/object-tree.ts`、`editor/objects/verbs.ts`、`editor/ops.ts`、`editor/transfer.ts`、`scene/builtin-materials.ts`、`scene/kinds.ts`（`reachableDefs`）、`scene/scene.ts`。

## 3. 条目种类：开放的注册表 + 政策表

**所有种类在同一张图上**（user 11-04 深夜问「不同的类型是同一张网吗」）：节点带种类、边带种类，组件 → 组件 / 组件 → 材质 / 组件 → 层 / 以后材质 → 贴图都是这张图的边，根也是混的（模型根是组件、架上一格可以是材质）；闭包、普查、断开一次遍历跑完所有种类。种类只在三处起作用：政策（跟不跟、查不查环、能不能更新）、存储（文件里按种类分节各自拍子 = 存储分区，不是分开的图）、声明（每种自己说边在哪）。断开往上传也是沿边走、不分种类（材质不一样 → 用它的组件也铸新）。

**声明一种条目 = 一份 `EntryKindDef`（§4）**，登在注册表里。加一种 = 加一份声明，不改既有的（和 `scene/kinds.ts` 身体种类的登记表同一个写法）。

| 种类 | 顶层 / 附属 | 跟闭包走 | 成环要管 | 合并可更新 | 固有常量 | 今天 |
|---|---|---|---|---|---|---|
| 组件定义 `definition` | 顶层 | 是 | 是 | 是（问人） | 模型根不更新 | 有 |
| 材质 `material` | 顶层 | 是 | 否 | 是（跟组件、带开关） | 内置正 / 背面（永不进表） | 有 |
| 层 `layer` | 顶层 | 是（缺就建） | 否 | **否**（可见性是看法不是内容） | 默认层 | 有 |
| 贴图 `texture` | 顶层 | 是 | 否 | 跟材质 | — | **材质纪元做**（user 拍「贴图独立」）；本单只留位 |
| 实例 / 组 / 参考几何 / 面边点 | 附属 | — | — | — | — | 跟主人 |
| 素材架 | 根的来源，不是条目 | 否 | — | — | — | 有 |

**开放种类的两条配套规矩**（user「能不能开放条目类型」）：
1. **每种条目在文件里是自己的一节、自己的格式拍子**（`CATSUP_definitions` / `CATSUP_material` / `CATSUP_document.layers` 已是；贴图独立时开 `CATSUP_texture`）。老版本读到不认识的节原样带回（家族格式纪律「未知键直通」）。
2. **本版不认识的条目种类永不清理、只披露**：架子上 `kind` 不认识的格今天已是「（更新版的素材）」一行；推广到普查——不认识的种类当作「活着但看不见」，清理钮灰掉并说原因（和太新架子 `shelfFrozen` 同一个精神，ID-3 §15.3 ③）。

## 4. 接口（提案 .h；pin 住，实现中形状变了回写这里）

目录 `src/identity/`。**红线：这个目录只 import 自己和 `format/guid.ts` 的类型**，不 import kernel / mesh / scene / format 其他文件（守卫 §9）。模块只认文件形状的条目和一个抽象的「店」（`EntryStore`），场景适配在 `format/scene-doc.ts`。

```ts
// src/identity/guid.ts（从 format/guid.ts 搬过来，format 改从这里 re-export）
export type Guid = string;
export function mintGuid(): Guid; export const isGuid: (s: unknown) => s is Guid;
export function recordMints<T>(fn: () => T, done: (minted: Guid[]) => void): T;
export function replayMints<T>(minted: readonly Guid[], fn: () => T): T;   // 读完校验：铸得比录的多 / 少 → 抛（重放只走校验路径）
export function ownGuid(raw: unknown, seen: Set<Guid>, onRemint?: () => void): Guid;   // 重复 / 非法 → 现铸并回调（读取侧披露用）
export const DEFAULT_LAYER_GUID: Guid; export const BUILTIN_FRONT_GUID: Guid; export const BUILTIN_BACK_GUID: Guid;

// src/identity/kinds.ts —— 条目种类的声明（开放集）
export type EntryKind = string;                               // "definition" | "material" | "layer" | "texture"（以后）| …
export interface Ref { readonly kind: EntryKind; readonly guid: Guid }
export interface EntryKindDef<Doc = unknown> {
  readonly kind: EntryKind;
  readonly carry: boolean;                                    // 跟闭包走
  readonly structural: boolean;                               // 引用它会不会成环要管（只有定义）
  readonly overwrite: boolean;                                // 合并时允许「更新」（层 = false）
  readonly constants: readonly Guid[];                        // 每份文件固有、永不搬、永不清、永不更新
  guidOf(doc: Doc): Guid; nameOf(doc: Doc): string;
  refs(doc: Doc): readonly Ref[];                             // 枚举引用（附属里的也算：定义里实例的 definition / layer、槽表的 material）
  rewrite(doc: Doc, map: (r: Ref) => Guid): Doc;              // 改写引用（换号 / 断开）；附属的 GUID 由 remintOwned 管
  remintOwned(doc: Doc): Doc;                                 // 断开时附属（实例 / 组）也铸新身份（文档内 GUID 唯一）
  canon(doc: Doc): unknown;                                   // 规范形：只对自己知道「存盘重开会乱序」的部分排序，其余原样；模块按确定性序列化逐字比
}
export const KINDS: ReadonlyMap<EntryKind, EntryKindDef>;    // 登记表；carryKinds() / structuralKinds()

// src/identity/store.ts —— 一份模型在这层眼里的样子（场景和纯文档各实现一份）
export interface EntryStore {
  has(r: Ref): boolean;
  docOf(r: Ref): unknown | undefined;                         // 文件形状（比较 / 导出 / 普查用）
  all(kind: EntryKind): readonly Guid[];
  roots(): readonly Ref[];                                    // 模型根 + 素材架 + 常量
  usage(r: Ref): Usage;                                       // 摆了几份 / 几张面在用 / 几份锁着 / 在架上（弹窗和面板的事实）
}
export interface Usage { readonly placed: number; readonly faces: number; readonly locked: number; readonly shelved: boolean }

// src/identity/graph.ts —— 通用图算法（全部纯函数，只认 refs()）
export function closure(store: EntryStore, roots: readonly Ref[], opts?: { carryOnly?: boolean }): Ref[];        // 可达集（文件形状由 store.docOf 取）
export function census(store: EntryStore): Census;           // live / orphans / 反向索引 usedBy(ref) / 每条 Usage
export function wouldCycle(edges: (r: Ref) => readonly Ref[], from: Ref, to: Ref): boolean;   // 只看 structural 种类
export interface Bundle { readonly docs: readonly { kind: EntryKind; doc: unknown }[]; readonly roots: readonly Ref[] }
export interface Frontier { readonly create: Ref[]; readonly same: Ref[]; readonly differ: { ref: Ref; usage: Usage; here: unknown; incoming: unknown }[] }
export function frontier(store: EntryStore, bundle: Bundle): Frontier;   // 从 roots 走：没有 = create；有且 canon 相等 = same（它下面不再看）；有且不等 = differ（它下面继续看）
export type Decision = { readonly entries: "update" | "keep" | "detach"; readonly materials?: boolean };   // 一次一种；materials 缺 = 跟 entries
export interface MergePlan { readonly create: Ref[]; readonly update: Ref[]; readonly remint: ReadonlyMap<Guid, Guid>; readonly refMap: (r: Ref) => Guid }
export function plan(store: EntryStore, bundle: Bundle, d: Decision): MergePlan;   // detach：differ ∪ 包内指着它们的上层都铸新；update：层永不更新、常量永不更新、store 根永不更新
export function planWouldCycle(store: EntryStore, bundle: Bundle, p: MergePlan, into: Ref): boolean;   // 按落地之后的样子查
export function canonEqual(k: EntryKindDef, a: unknown, b: unknown): boolean;   // 确定性序列化逐字比（键排序、TypedArray 逐元素）

// src/format/scene-doc.ts —— 场景适配（唯一一处文件形状 ↔ 运行时）
export function sceneStore(s: Scene): EntryStore;
export function docStore(doc: CatsupDocument): EntryStore;   // 素材导入只读那份文件
export function applyPlan(s: Scene, bundle: Bundle, p: MergePlan): { idOf: (r: Ref) => number }   // 落地：create 走 materialize、update 原地换身体（句柄 / GUID 不变）、材质原地换条、层缺就建；返回 GUID → 运行时句柄
export function bundleOf(s: Scene, roots: readonly Ref[]): Bundle;   // 取闭包成文件形状（extract / 导出 / 上架共用）
```

**深在哪**：接口 = 每种条目一份声明（9 个成员，其中 5 个是一两行）+ 店的 5 个方法 + 七个纯函数；里面藏着可达性遍历、两遍建附属、查环、规范化比较、断开的重铸映射、反向索引、录音带。**客户看到的只有 `frontier → plan → applyPlan` 三步**和 `census`。

**声明方式的取舍（已定，user 「取舍我没懂」后解释过）**：引用怎么告诉模块——「一张路径表数据驱动」vs「每种条目两个小函数」。选后者：面上的代号在 Int32Array 里、层代号要过两级表，通用路径走子会比它替换的东西还重；面板的「看得见」从 `refs()` 的输出来，一样看得见。**user 11-04 深夜拍：「算法就是数据结构，ai时代更是这样。小函数」。**

## 5. 粘贴 / 导入 / 打开 / 清理各走哪几步（客户怎么改）

| 动作 | 今天 | 改后 |
|---|---|---|
| 拷贝（`extract`） | 自己攒闭包 + 对照表 | `bundleOf(s, 摆放的定义)`；摆放和面编号对照表照旧（它们不是条目） |
| 粘贴（`pasteNow` → `paste` op） | `trimClosure` → op 带 `closure` → `mergeClosure` 用目标那条 | `frontier(sceneStore, bundle)` → 同一次打开 / 没有 differ → `Decision = keep`，不问；有 differ → 问（§8）→ op 带 `closure` + `merge: Decision` → apply 里 `plan → planWouldCycle → applyPlan` → 摆放 |
| 素材导入（`shelfImportOp`） | `payloadFromDocument` → 纯合并 paste + shelfPut | `closure(docStore(doc), picks)` 成 bundle → 同一条路（同一弹窗同一默认，待拍 ③） |
| 打开文件（`sceneFromDocument`） | `materializeDefinitions(fillExisting)` | `applyPlan(空场景, 整份文档, plan(create 全部))`——打开 = 往空店里落地 |
| 清理（`purgeDefs / purgeMaterials`） | `liveDefs` / `materialUse` | `census(sceneStore).orphans`；不认识的种类 = 活着（§3 规矩 2） |
| 资源页 | `census` + `shelfRows` | `census` 多了反向索引：面板能列「谁引用了它」（引用和孤儿管理面板的下一半，不在本单） |
| 做成唯一（`makeUnique`） | `cloneDefinition` 手写两遍 | `plan(detach)` 对单条定义 + `applyPlan`（同一份重铸逻辑） |
| 撤销重放 | 录音带 | 不变；加读完校验 |

`trimClosure` 保留（指令流不攒闭包），但要**连 differ 的那几条一起留**（更新要用它们的身体）。

## 6. 「更新」在场景里怎么做（`applyPlan` 的 update 分支）

- **定义**：原地换身体——`body`、`groups`、内部 `instances`、`name`、`drawFrame`、`meshMirrors` 一起换，`DefId` 和 GUID 不变；别的份（实例）指的是 `DefId`，自然跟上。内部实例 / 组按源的 GUID 建（它们是这一条的附属结构）。种类变了（brep ↔ mesh）照换，渲染按 `kindOf` 重算。
- **材质**：`s.materials[i]` 原地换条（`Material` 不可变对象，换引用）；面上的槽号指的是定义槽表里的材质下标，下标不变。
- **层**：永不更新（§3）。缺就建、在就用这里的名字 / 可见 / 色。
- **拒绝的场合**（`OpRejected`，进提示行）：编辑上下文站在要被更新的定义里（`EditContext.chain` 里有它的实例）→「先退出来再贴」；计划会成环（`planWouldCycle`）；店的根在 update 名单里（不可能出现，防手改文件）。
- **撤销**：`paste` 是 scene 级快照，一步退回更新连带的所有份；只在没存盘关掉之前有效（所以不能拿撤销替代弹窗，§8）。
- **选区**：粘贴后清选区照旧；被更新定义的内部选区 / 充能一起清。

## 7. 比内容：规则和构造

- **只在前沿里算**：跨模型、同 GUID 才比；同一个文件里贴（`clipboard.doc() === docEpoch`）不比、直接 keep。
- **构造必须「漏了字段 → 判不一样」**（Fable 审 Opus 原型的结论）：`canon(doc)` 从整份文件形状出发，**只对已知「存盘重开会乱序」的部分做排序规范化**（硬表面快照的顶点 / 边 / 面 / 环顺序、网格体的面 / 边顺序；边按两端、面按环旋到最小 + 洞排序、面层值跟面走、槽号换成材质 GUID），**其余字段原样**进确定性序列化（键排序、TypedArray 逐元素）。以后加字段（贴图、动画）漏进规范化 = 多问一次，不会静默判「一样」。
- **不加公差**：坐标不做「差 1 µm 算一样」；写盘怎么量化就怎么比。Opus 11-04 原型里按 µm 取整——施工时先验「存盘重开三次逐字相等」是否只靠排序就成立；不成立 = 写入器的问题（写入时量化），不是比较器加公差。
- **成本**：原型 400 张面 4.4 ms；只在 differ 判定时算一次，不在热路径。
- **不违反 10-30 否决**：身份还是 GUID；比内容只回答「同一条目两边分叉了没有」，不当身份、不去重（计划书 §15.1-B 更正照旧）。

## 8. 弹窗（app 层；不进 `src/identity/`）

只在「跨模型 + 有 differ」弹一次。**文字不能说「从别的模型拷来的」**——剪贴板记的是第几次装载（同一文件重开也加一），只能说「拷来的版本和这份模型里的不一样」。

- **列**：每条 differ 的组件 / 材质：名字、这里摆了几份 / 几张面在用、几份锁着、在架上；两边各几张面（事实，不是「谁新」——文件里没有版本号，机器判不了，这是家族同步红线「无 LWW、冲突必 surface」在组件上的同一条）。
- **选**（一次只选一种，不逐行勾——逐行会造环，谈话第 4 条）：**用拷来的更新**（默认，待拍 ①）/ **留这份模型的，只多摆一份** / **断开，贴成新组件** / 取消 = 不贴。
- **材质独立开关**「材质也跟着 ☑」（默认勾，待拍 ②）：材质不会成环，可以单独选；断开时内容不一样的材质也铸新。
- **导入素材**撞同一组件内容不一样：同一弹窗同一默认（待拍 ③）。
- 不能问的场合（没有 `host` 的面）= 不贴并说明；不静默二选一。
- 放哪：决定流程 `src/app/paste-actions.ts`（和 `shelf-actions.ts` 同形）；`editor.ts` 只加一个 `host.resolvePaste?(frontier): Promise<Decision | null>` 钩子——**editor.ts 棘轮 ≤ 4147，现在 4144**，塞不下就把 `pasteNow` 的报告半句搬去 transfer.ts。

## 9. 不变量与守卫（都是测试，不靠口头）

1. **`src/identity/**` 只 import 自己**（结构守卫：读文件扫 import 行）。
2. **玩具种类测试**：测试里注册一种假条目（比如 `note`，引用别的 `note`），跑闭包 / 前沿 / 计划 / 断开 / 普查全绿 → 证明通用，不是三种硬编码。
3. **文档内 GUID 唯一，读取时披露**：`ownGuid` 重铸时计数进 `FormatReadNotes.remintedGuids`，`format-notes.ts` 说一句「文件里有 N 条身份重复 / 不合法，换了新身份」（机械、看得见；不再静默）。
4. **录音带读完校验**：`replayMints` 结束时 `at !== list.length` → 抛。
5. **规范化比较**：没改 = 相等；存盘重开三次 = 相等；改一笔 = 不等；**故意漏一个字段的规范化** = 判不等（守「漏字段 → 判不一样」）。
6. **断开后文档内无重复 GUID**（附属也铸新）；**update 后别的份跟上**；**层永不被更新**；**同一次打开里贴永不问**。
7. **撤销一致性 fuzz**（`probe-undo-fuzz`）动作表加 `pasteUpdate / pasteDetach / importConflict`；`guidsOf` 照旧全量比。
8. 现有 1623 条单测、`identity-guard` / `identity-id3` 全绿；`redline-guard`；`tsc`。

## 10. 文件格式：本单不动

不 bump 任何 `CATSUP_*`。读写字节的代码（`format/read.ts` / `write.ts`）只多一个披露计数（§9-3）。贴图独立成 `texture` 条目是材质纪元的格式改动，本单只在注册表留位、政策表写好。

## 11. 体重承诺（重构单必交）

- 搬出去并删掉的：`transfer.ts` 的 closureOut / trimClosure 的闭包部分 / payloadFromDocument.walk / pasteWouldCycle；`scene-doc.ts` 的 definitionsToMake / materializeDefinitions 的合并部分；`resources.ts` 的 reachableDefs / liveDefs / shelvedDefs / materialUse 的遍历；`ops.ts` 的 mergeClosure / cloneDefinition 的重铸 / `pastedMaterial`。
- 目标：`transfer.ts` 253 → ≤ 160；`scene-doc.ts` 159 → ≤ 130（变成适配器）；`resources.ts` 107 → ≤ 70（普查变成 `census` 的壳）；`ops.ts` −60 左右；新增 `src/identity/` ≈ 400。**总行数大约持平，但五件事从三份变一份**，第四种条目（贴图）加进来 = 一份声明 + 一节格式，不加算法。
- `editor.ts` ≤ 4147 不变。
- 交付时写实测行数进 §15.3 同形的「实施记录」。

## 12. 工单切片（Opus 施工；每片单独绿、单独提交）

- **ID-4a 抽层，行为不变**：建 `src/identity/`（guid 搬家 + kinds + store + graph），注册 definition / material / layer 三种，`scene-doc.ts` 实现 `sceneStore / docStore / bundleOf / applyPlan(create 分支)`；extract / paste / 导入 / 打开 / 清理 / makeUnique 换成走这层；`Decision` 固定 `keep`。验收：现有全部测试绿、`probe-clipboard` / `probe-shelf` / `probe-hierarchy` / `probe-undo-fuzz 16×45` 绿、§9-1 / 9-2 守卫新增、体重数字。
- **ID-4b 更新规则**：`frontier.differ` + `canon`（§7）+ `plan(update|detach)` + `applyPlan` 的 update 分支（§6）+ `paste` op 的 `merge` 字段 + `paste-actions.ts` 弹窗（§8，三件待拍的默认先按 Fable 推荐做，user 拍了再改一个常量）+ 导入走同一条 + 提示行文案改（不说「别的模型」）。验收：§9-5 / 9-6 / 9-7；`trimClosure` 留 differ；性能 = 前沿判定一次 ≤ 10 ms（400 面级）。
- **ID-4c 小账**：录音带校验（§9-4）、`ownGuid` 披露（§9-3）、`pasteReport.reusedDefs` 只算走到的、`object.shelve` 冻结时的 `none` 文案、`op-locks` 显式集合代替 `startsWith("shelf")`。
- **文档**：本书回写实施记录 + .h 形状；`20261026-pipelines.md`「粘贴」「文件」两条改成走 frontier → plan → applyPlan；计划书 §16 指路；`CLAUDE.md` 一行；`gen-api.sh` 重打；`./bump.sh`。

## 13. 我没核、施工时要核的

- 存盘重开后顺序乱的只有顶点 / 边 / 面 / 环吗（§7 第二条）——Opus 原型只验了硬表面根池；组 / 参考几何 / 网格体 / 坐标架要补验。
- `Scene.meshMirrors` 按 `DefId` 记、不进撤销：update 换身体时它跟不跟（提案：跟源的 `mesh.mirror`）。
- `materialIndexForPick`（涂材质按名字 + 颜色找第一条）在更新材质之后行为不变——核一下。
- 图库 `docFile(path)` 能不能直接给 `docStore`（素材从 OneDrive 图库挑 = wishlist，不在本单）。
- 普查的反向索引对几千个实例的成本（一次遍历，应该毫秒级；量一下写进流程图）。

## 14. 等 user 拍（都带「选了会怎样」，在 `20261103-forward-ledger.md` §4 也记了）

1. 跨模型、同一组件两边内容不一样：**先弹窗问**（Fable 推荐；不知情时不会改掉别的实例），还是直接更新、事后通知里给撤销（少点一下；存盘后撤不回、没看到通知就静默盖掉）。
2. 材质内容不一样时**跟组件一起更新、默认开、弹窗里给开关**（推荐；贴出来是修好的样子，这份模型里用同一材质的别的面也会变），还是不跟（别的不受影响，组件颜色可能和你修的不一样）。
3. 导入素材撞同一组件内容不一样：**同一弹窗同一默认「更新」**（推荐；一套规则），还是导入默认「留这里的」（导入本意是上架不是修模型）。

不拍也能开工：ID-4a 不碰这三件；ID-4b 先按推荐做，拍了改一个常量。
