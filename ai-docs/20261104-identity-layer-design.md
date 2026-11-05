# 身份层设计书：ID-4 把身份逻辑做成深模块（2026-11-04 深夜）

> created 2026-11-04 by Claude Fable 5.1 · as-of v0.18.34（main a587966，ID-1…ID-3 都合进去了，没推）· 状态：**ID-4a / 4b / 4c 施工完（分支 `identity-id4`，v0.18.35，2026-11-04 Claude Opus 5.5；§15 实施记录），等 Fable 审 → 合 main → 推 dev**。§4 / §7 已回写成实际形状。谈话 = `talks/20261104-identity-layer-deep-module.md`、`talks/20261104-paste-update-or-keep.md`；上游 = `20261104-identity-foundation-plan.md`（§15.3 末 Fable 审 ID-3 的记录；本书是它的第五张单，§16 指路）。
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

目录 `src/identity/`。**红线：这个目录只 import 自己**（`guid.ts` 搬进来之后就是这样；守卫 §9），不 import kernel / mesh / scene / format。模块只认文件形状的条目和一个抽象的「店」（`EntryStore`）。

**实施回写（和最初提案不一样的地方，§15 有原因）**：店多 `refsOf` + `modelRoot`；`Decision.materials` → `except`（模块不认识「材质」这个词）；`Frontier` 多 `visited`、`MergePlan` 多 `kept / path`、去掉 `refMap`；声明的 `rewrite` 连自己的 GUID 也过 map；`wouldCycle` 的 from 是一组；三种条目的声明和规范形住 `format/entry-kinds.ts` / `format/entry-canon.ts`，店和落地住 `format/scene-store.ts`（`scene-doc.ts` 留「文件形状 ↔ 运行时」）；粘贴流程住 `editor/paste-plan.ts`。

```ts
// src/identity/guid.ts（format/guid.ts 只转发）
export type Guid = string;
export function mintGuid(): Guid; export const isGuid: (s: unknown) => s is Guid;
export function recordMints<T>(fn: () => T, done: (minted: Guid[]) => void): T;
export function replayMints<T>(minted: readonly Guid[], fn: () => T): T;   // 铸得比录的多 / 少 → 抛（重放只走校验路径）
export function ownGuid(raw: unknown, seen: Set<Guid>, onRemint?: () => void): Guid;   // 写了身份但重复 / 不合法 → 现铸并回调；老文件没写不回调
export const DEFAULT_LAYER_GUID: Guid; export const BUILTIN_FRONT_GUID: Guid; export const BUILTIN_BACK_GUID: Guid;

// src/identity/kinds.ts —— 条目种类的声明（开放集）
export type EntryKind = string;
export interface Ref { readonly kind: EntryKind; readonly guid: Guid }
export const refKey: (r: Ref) => string;
export interface EntryKindDef<Doc = unknown> {
  readonly kind: EntryKind;
  readonly carry: boolean;                                    // 跟闭包走
  readonly structural: boolean;                               // 引用它会不会成环要管（只有定义）
  readonly overwrite: boolean;                                // 合并时允许「更新」（层 = false；= false 的永远不比内容、永远算一样）
  readonly constants: readonly Guid[];                        // 每份文件固有、永不搬、永不清、永不更新
  guidOf(doc: Doc): Guid; nameOf(doc: Doc): string;
  refs(doc: Doc): readonly Ref[];                             // 枚举引用；顺序 = 落地顺序（没有出边的排前面）
  rewrite(doc: Doc, map: (r: Ref) => Guid): Doc;              // 改写身份：自己的 GUID 和每条引用都过 map；附属的 GUID 归 remintOwned
  remintOwned(doc: Doc): Doc;                                 // 断开时附属（实例 / 组）也铸新身份
  canon(doc: Doc): unknown;                                   // 规范形（§7）
}
export const KINDS: ReadonlyMap<EntryKind, EntryKindDef>; export function registerKind<Doc>(def: EntryKindDef<Doc>): void;

// src/identity/store.ts —— 一份模型在这层眼里的样子
export interface EntryStore {
  has(r: Ref): boolean;
  docOf(r: Ref): unknown | undefined;                         // 文件形状（场景店这一步要序列化，别在普查里调）
  all(kind: EntryKind): readonly Guid[];
  roots(): readonly Ref[];                                    // 模型根 + 素材架 + 常量；不认识的种类也列（走不下去、永不算孤儿）
  refsOf(r: Ref): readonly Ref[];                             // 场景店不序列化就能答（测试守「和声明的 refs(docOf) 一字不差」）
  usage(r: Ref): Usage;
  readonly modelRoot?: Ref;                                   // 永不更新、永不断开
}
export interface Usage { readonly placed: number; readonly faces: number; readonly orphanFaces: number; readonly locked: number; readonly shelved: boolean }
export function tableStore(docs, roots, usage?, modelRoot?): EntryStore;   // 一张表的店（纯文档 / 测试）

// src/identity/graph.ts —— 通用图算法（全部纯函数，只认店和声明）
export function closure(store: EntryStore, roots: readonly Ref[], opts?: { carryOnly?: boolean }): Ref[];   // 前序；店里有的（常量店里有就算：默认层那行是层代号对照表的一部分）
export interface Bundle { readonly docs: readonly { kind: EntryKind; doc: unknown }[]; readonly roots: readonly Ref[] }
export function bundleOf(store: EntryStore, roots: readonly Ref[]): Bundle;   // 取闭包成文件形状（拷贝 / 导入共用）
export function census(store: EntryStore): Census;           // isLive / orphans / usedBy
export function wouldCycle(edges: (r: Ref) => readonly Ref[], from: readonly Ref[], to: Ref): boolean;   // 只走 structural
export const canonEqual: (k: EntryKindDef, a: unknown, b: unknown) => boolean;   // 结构相等（不分配字符串：贴图字节不用先变字符串）
export interface FrontierDiff { ref: Ref; usage: Usage; here: unknown; incoming: unknown }
export interface Frontier { create: readonly Ref[]; same: readonly Ref[]; differ: readonly FrontierDiff[]; visited: readonly Ref[] }
export function frontier(store: EntryStore, bundle: Bundle): Frontier;   // 没有 = create；有 = 比内容，一样 = same、不一样 = differ，**都往下走**（§7）；比不了 / 永不更新 / 模型根 = same 并停
export interface Decision { readonly entries: "update" | "keep" | "detach"; readonly except?: readonly EntryKind[] }   // except = 这几种不跟（留这里的）；keep 不看
export const KEEP: Decision;
export interface MergePlan { create: readonly Ref[]; update: readonly Ref[]; remint: ReadonlyMap<Guid, Guid>; kept: readonly Ref[]; path: readonly Ref[] }
export function plan(store: EntryStore, bundle: Bundle, d: Decision): MergePlan;   // keep：走到有的就停、不比内容；update / detach 走 frontier
export function docsNeeded(bundle: Bundle, p: MergePlan): Set<string>;   // 指令流要留哪几条文件形状
export function planWouldCycle(store: EntryStore, bundle: Bundle, p: MergePlan, into: Ref): boolean;   // 按落地之后的样子查 + 更新后会不会绕回自己

// src/format/entry-kinds.ts —— 三种条目的声明
export interface DefinitionEntry { readonly def: DefinitionDoc; readonly layerGuid: (code: number) => Guid | undefined }   // 定义 = 文件形状 + 层代号对照表（离开那份文件就得带着表走）
// src/format/scene-store.ts —— 场景 / 纯文档适配（唯一一处店的实现 + 落地）
export function sceneStore(s: Scene): SceneStore;            // + defIdOf(guid)
export function docStore(doc: CatsupDocument): EntryStore;
export interface Landing { idOf(r: Ref): number | undefined; guidOf(r: Ref): Guid }
export function applyPlan(s: Scene, bundle: Bundle, p: MergePlan): Landing;
export function uniqueCopy(s: Scene, id: DefId): DefId;      // 做成唯一 = 声明的 rewrite + remintOwned + 同一份落地
// src/editor/paste-plan.ts —— 客户：载荷 → 包 → 计划 → 落地
planPaste / pasteBlocked / landPayload / trimClosure / pasteConflict / conflictRows / preparePaste / payloadFromDocument / importCandidates / shelfImportOp / pasteWouldCycle / pasteBefore / pasteReport / pasteSay
```

**深在哪**：接口 = 每种条目一份声明（9 个成员，其中 5 个是一两行）+ 店的 5 个方法 + 七个纯函数；里面藏着可达性遍历、两遍建附属、查环、规范化比较、断开的重铸映射、反向索引、录音带。**客户看到的只有 `frontier → plan → applyPlan` 三步**和 `census`（场景的资源页、清理走 `scene/resources.ts` 这层壳：材质能不能清理按**面**算不按槽表算，见 §15）。

**声明方式的取舍（已定，user 「取舍我没懂」后解释过）**：引用怎么告诉模块——「一张路径表数据驱动」vs「每种条目两个小函数」。选后者：面上的代号在 Int32Array 里、层代号要过两级表，通用路径走子会比它替换的东西还重；面板的「看得见」从 `refs()` 的输出来，一样看得见。**user 11-04 深夜拍：「算法就是数据结构，ai时代更是这样。小函数」。**

## 5. 粘贴 / 导入 / 打开 / 清理各走哪几步（客户怎么改）

| 动作 | 今天 | 改后 |
|---|---|---|
| 拷贝（`extract`） | 自己攒闭包 + 对照表 | `bundleOf(s, 摆放的定义)`；摆放和面编号对照表照旧（它们不是条目） |
| 粘贴（`pasteNow` → `paste` op） | `trimClosure` → op 带 `closure` → `mergeClosure` 用目标那条 | `frontier(sceneStore, bundle)` → 同一次打开 / 没有 differ → `Decision = keep`，不问；有 differ → 问（§8）→ op 带 `closure` + `merge: Decision` → apply 里 `plan → planWouldCycle → applyPlan` → 摆放 |
| 素材导入（`shelfImportOp`） | `payloadFromDocument` → 纯合并 paste + shelfPut | `closure(docStore(doc), picks)` 成 bundle → 同一条路（同一弹窗同一默认，待拍 ③） |
| 打开文件（`sceneFromDocument`） | `materializeDefinitions(fillExisting)` | 仍直接调 `materializeDefinitions`（同一份落地）：整张表原样装、层代号和下标字节级不变、没有要决定的事，不走 plan（施工时改的，§15） |
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

- **只在前沿里算**：同一次打开里贴（`clipboard.doc() === docEpoch`）不比、直接 keep（0.01 ms 量级）。
- **一样的也往下看（设计书原写「它下面不再看」是错的，施工时改）**：椅子没改、椅腿改过时，椅子的文件形状一字不差（它只记椅腿的 GUID），停在椅子就把椅腿的改动吞了。内容一样 = 引用也一样，往下走不会多建东西。只有 keep 走到有的就停（不然这边的旧版用不上的子组件会被建出来当孤儿，计划书 §15.1-B）。
- **构造必须「漏了字段 → 判不一样」**（Fable 审 Opus 原型的结论）：`format/entry-canon.ts` 从整份文件形状出发，只规范化已知会乱序或只是代号的部分，其余走 `...rest` 原样比：硬表面走**写盘那一份**规范序（`brep-codec canonicalize`，点 / 边 / 环 / 洞；现成的，没另写排序）+ 写盘的量化（坐标按 µm）；槽号换成材质 GUID（槽表只是代号对照表，不单独比）；层代号换成层 GUID；组按 GUID 排；网格体的点下标原样（可能有重合的点，按坐标认会把「焊了」和「没焊」判成一样），面从最小下标起转、面和边标记排序。实例顺序是数据，不排。`extras` 运行时不持有，比不了，不进比较。
- **不比的只有两种派生量**（由点决定，读回会被归一化挪 2^-30 量级，比了就是假的「不一样」）：面的平面（实测：圆柱侧面第一次存盘重开 `n` 差 1e-10）；圆弧的法向 / x 轴。
- **不加公差**：写盘怎么变就怎么比。材质颜色写盘要过一道色彩空间换算（来回 1.7e-16 噪声，存过一次之后不再变，6000 个分量实测），规范形里也走一遍这道换算，不按差值判。
- **比较**：`canonEqual` 是结构相等（对象按键、数组 / TypedArray 按元素），不是序列化成字符串，贴图字节不用先变字符串。
- **成本**：实测 402 面 10.35 ms（JIT 冷）、4002 面 71 ms（含把这边的定义 `toBrep`）；只在跨打开时算，一贴最多三次（弹窗前、提交前、指令里）。
- **不违反 10-30 否决**：身份还是 GUID；比内容只回答「同一条目两边分叉了没有」，不当身份、不去重（计划书 §15.1-B 更正照旧）。

## 8. 弹窗（app 层；不进 `src/identity/`）

只在「跨模型 + 有 differ」弹一次。**文字不能说「从别的模型拷来的」**——剪贴板记的是第几次装载（同一文件重开也加一），只能说「拷来的版本和这份模型里的不一样」。

- **列**：每条 differ 的组件 / 材质：名字、这里摆了几份 / 几张面在用、几份锁着、在架上；两边各几张面（事实，不是「谁新」——文件里没有版本号，机器判不了，这是家族同步红线「无 LWW、冲突必 surface」在组件上的同一条）。
- **选**（一次只选一种，不逐行勾——逐行会造环，谈话第 4 条）：**用拷来的更新**（默认）/ **留这份模型的，只多摆一份** / **断开，贴成新组件** / 取消 = 不贴。**弹窗而不是直接更新 = user 11-04 深夜拍「2弹窗」。**
- **材质独立开关**「材质也跟着 ☑」（默认勾）：材质不会成环，可以单独选；断开时内容不一样的材质也铸新。**user 拍「3 跟，可开关」。**
- **导入素材**撞同一组件内容不一样：同一弹窗同一默认。**user 拍「4 用」。**
- 不能问的场合（没有 `host` 的面）= 不贴并说明；不静默二选一。
- 放哪：决定流程 `src/app/paste-actions.ts`；`editor.ts` 只加一个 `host.resolvePaste?(rows): Promise<Decision | null>` 钩子，胶水搬去 `paste-plan.preparePaste`（`editor.ts` 4146，棘轮 4147）。选「留这里的」时材质开关收起来（没有更新可跟）。

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
- **ID-4b 更新规则**：`frontier.differ` + `canon`（§7）+ `plan(update|detach)` + `applyPlan` 的 update 分支（§6）+ `paste` op 的 `merge` 字段 + `paste-actions.ts` 弹窗（§8；三件 user 11-04 深夜都拍了 = 弹窗 / 材质跟着可开关 / 导入同一弹窗）+ 导入走同一条 + 提示行文案改（不说「别的模型」）。验收：§9-5 / 9-6 / 9-7；`trimClosure` 留 differ；性能 = 前沿判定一次 ≤ 10 ms（400 面级）。
- **ID-4c 小账**：录音带校验（§9-4）、`ownGuid` 披露（§9-3）、`pasteReport.reusedDefs` 只算走到的、`object.shelve` 冻结时的 `none` 文案、`op-locks` 显式集合代替 `startsWith("shelf")`。
- **文档**：本书回写实施记录 + .h 形状；`20261026-pipelines.md`「粘贴」「文件」两条改成走 frontier → plan → applyPlan；计划书 §16 指路；`CLAUDE.md` 一行；`gen-api.sh` 重打；`./bump.sh`。

## 13. 施工时核了的（2026-11-04 Claude Opus 5.5）

- **存盘重开之后乱的是什么**：语料全部场景 + 动过刀的（推拉 + 网格体删面）实测，第一次重开硬表面点 / 边 / 面 / 环都换序，之后稳定；组、参考几何、网格体、坐标架顺序不变。规范形之后三次重开全部相等（测试 `identity-merge`）。
- **`Scene.meshMirrors`**：更新时跟源（源有就设、没有就删）。做成唯一现在也跟（走文件形状往返；以前丢）。
- **`materialIndexForPick`**：按名字 + 颜色找第一条，更新材质之后找到的是新颜色那条，老颜色再涂 = 新建一条；下标不变、面不受影响，不用改。
- **图库 `docFile(path)` 给 `docStore`**：`docStore` 只要 `CatsupDocument`，读得出来就能用；挑文件的界面仍是 wishlist，不在本单。
- **普查成本**：200 定义 + 3000 实例 `liveDefs` 3.2 ms、整份 `census` 6.6 ms，写进流程图。

## 14. user 拍了（2026-11-04 深夜，原话「2弹窗 3 跟，可开关 4 用 dev等一起做好 1 没问题了我就切」）

1. 跨模型、同一组件两边内容不一样：**先弹窗问**（不直接更新）。
2. 材质内容不一样时**跟组件一起更新、默认开、弹窗里给开关**。
3. 导入素材撞同一组件内容不一样：**同一弹窗同一默认「更新」**。
4. **dev 等 ID-4 做完一起推**（main 上从 ID-1 起都没推；格式 7.0 大版本，推了别的设备旧 dev 要更新才能开新文件）。
5. **设计书放行**：user 切 Opus 从 §12 ID-4a 开工。

## 15. 实施记录（2026-11-04，Claude Opus 5.5；分支 `identity-id4`，v0.18.35）

**三个提交**：ID-4a `20a3896` 抽层行为不变 → ID-4b `c887a93` 更新规则 + 弹窗 → ID-4c 小账 + 把粘贴流程从 `transfer.ts` 分到 `editor/paste-plan.ts` → 文档 + 版本。

**和提案不一样的地方（都是读代码 / 实测之后改的）**
1. **普查不走文件形状**：`store.docOf` 要 `toBrep`，普查走它 = 每次刷资源页序列化全部几何。店加 `refsOf`（场景店直接读运行时），测试守「和声明的 `refs(docOf)` 一字不差，连顺序」。
2. **定义条目带层代号对照表**：实例上的层是源文件层表的代号（InstanceDoc.layer），只有 `DefinitionDoc` 说不出 GUID；提案的 `refs(doc)` 过不了这关。条目 = `{ def, layerGuid }`。
3. **常量进闭包**：提案说「固有常量不带」，但默认层那一行是层代号对照表的一部分（`layer: 0` = 明确归默认层，缺了就变成「继承」）。闭包店里有就算，搬不搬归前沿（前沿跳过常量）。
4. **材质的活死不走图**：现在的行为是「能不能清理按面算」（槽表占位不算有人用），图上它还算被引用（闭包照带）。行为不变单不能改，`purgeMaterials` 继续按 `usage` 判；`census.orphans` 给组件定义和以后的种类。
5. **一样的也往下看**（§7）。设计书的写法会吞改动，施工时查出来的。
6. **`Decision.materials` → `except: EntryKind[]`**：模块不认识「材质」，弹窗传 `except: ["material"]`。keep 不看 except（没有更新可跟）。
7. **打开文件不走 plan**（§5）。
8. **导入的上架进 `paste` 指令**（`shelve` 字段）：断开之后是新身份，另起一条 `shelfPut` 不知道该放谁。
9. **`pasteReport` 从计划算**（顺带 ID-3 小账「只算走到的」）。`kept` = 用这边那条、可能和拷来的不一样的；比过内容一样的不算，不再说「用的是本文件这版」误导人。
10. **做成唯一走文件形状往返**（`uniqueCopy`）：比 `kernel.clone()` 慢一点（用户点一下的事），换来「怎么拷一个定义」只有一份。对称设置跟到新定义上（以前丢）是这条带来的唯一行为变化。

**体重（实测行数；提案的目标多数没达到，如实写）**

| 文件 | 之前 | 现在 | 提案目标 |
|---|---|---|---|
| `editor/transfer.ts` | 253 | 181 | ≤ 160（差 21：`extract` 和种类转换是几何，不是身份） |
| `editor/paste-plan.ts`（新） | — | 152 | — |
| `format/scene-doc.ts` | 159 | 165 | ≤ 130（**没降**：落地留在这里，还长了「更新」分支） |
| `scene/resources.ts` | 107 | 97 | ≤ 70（差 27：资源页的形状和 `shelfRows` 不是图算法） |
| `editor/ops.ts` | 1140 | 1079 | −60 左右（−61，达到） |
| `identity/`（guid 65 + kinds 43 + store 47 + graph 177） | 60（guid） | 332 | ≈ 400 |
| `format/entry-kinds.ts` + `entry-canon.ts` + `scene-store.ts`（新） | — | 54 + 49 + 115 | 提案算在 scene-doc 里 |
| `app/paste-actions.ts`（新） | — | 42 | — |
| `editor/editor.ts` | 4144 | 4146 | ≤ 4147 |

**总账**：这五个文件原来 1719 行，现在连新文件 2268 行，**多了 549 行，不是提案说的「大约持平」**。其中 ID-4a（只抽层、行为不变）多 273 行，其余是 4b 的新功能（比内容、更新、断开、弹窗）。提案低估了：场景适配要一套店的实现，声明本身也占地方。换来的是提案说的那一半：取闭包 / 查环 / 落地 / 断开 / 活死从「每种各写一份」变成一份；第四种条目 = 一份声明 + 一节格式，不加算法（玩具种类的测试就是这样注册的）。

**验收**：单测 1681 绿 0 红 4 todo；`redline-guard`、`tsc` 干净；探针 `probe-clipboard / probe-shelf / probe-hierarchy / probe-paste-conflict`（新）绿；`probe-undo-fuzz 16×45` 绿（动作表加 `pasteUpdate / pasteDetach / pasteKeep / pasteNoMats / importConflict / renameDef`）。§9 八条都有测试。

**没做 / 没测到**：真机没测（iPad / Edge）；弹窗的版面（行多的时候）只看了无头跑通，没看样子；`probe-touch-stick` 和 4 个过时探针（`probe-cleanup / fill-holes / straighten / resegment`）没动，和本单无关。

## 16. 门审结论（2026-11-05，Claude Fable 5.1；审的是 `b22a0ba`，分支 `identity-id4`）

**过。合 main、推 dev（从 ID-1 起攒的格式大版本一起上）。**

**审了什么**：`src/identity/` 四个文件逐行；三份声明、规范形、场景店 / 落地、粘贴流程；`ops.ts` 的 paste 指令、`editor.ts` 的两个方法、`scene-doc.ts` 的更新分支、`resources.ts` 壳、读取侧的披露；§15 的 10 条逐条对代码。全量单测自己重跑（1681 绿 0 红 4 todo，44 s）、`redline-guard`、`tsc`、`editor.ts` 4146 ≤ 4147；重跑 `build.sh` 哈希不变（`fd694950cf30`）、重打 `api/` 工作区干净。探针四个 + fuzz 16×45 是 Opus 在同一个包上跑绿的（哈希对得上），没重跑。

**核过的要害（都对）**
- **重放确定**：录音带只包 `applyOp`（`history.ts`），`preparePaste` 里 `plan()` 铸的废号不进带子；指令里重算计划用的是剪过的闭包，`docsNeeded` 保证要建 / 要更新 / 要断开的和它们路上的上层都还在，所以提交和重放算出同一组 create / update / remint；铸号顺序 = `frontier.visited` 的前序，确定。
- **比内容不误报**：写盘只量化硬表面坐标（µm），实例矩阵 / 网格体坐标 / 轴是原样双精度，`canon` 只对量化过的做量化；§9-5「三次重开相等」有测试。
- **断开**：`above` 沿包内的边走、不分种类，材质不一样 → 用它的组件也铸新；一样的子组件继续共用；`planWouldCycle` 对被断开的 `into` 不报环（新身份碰不到它）。
- **行为不变**：`materialUse` / `census` / `liveDefs` 换成走店之后语义逐条对过（活死按定义、能不能清理按面、架上的材质只进普查的根不影响 `liveDefs`）。

**小尾巴（不拦合并，记功能账）**
1. **一贴比三次内容**：`pasteConflict`（问之前）→ `preparePaste`（计划）→ `applyOpInner`（指令里再算）各算一次前沿，4002 面 71 ms × 3。点一下的事，先不管；真慢了把 `pasteConflict` 算好的前沿递给 `planPaste`。
2. **站在要更新的组件里**：弹窗照常弹、默认「更新」，点了才被 `pasteBlocked` 拒「先退出来再贴」= 默认选项走进死胡同。该在弹窗里把「更新」灰掉并写原因（事实在手：`plan.update` ∩ 上下文链）。**规则（11-05 定，user「小尾巴让opus做」）**：问之前对三种处理各查一次能不能贴，走不通的选项灰掉、原因写在下面，默认 = 更新 → 留这里的 → 断开里第一个走得通的；三个都走不通不弹窗、提示行说原因；点了之后 `pasteBlocked` 照旧再查（瑞士奶酪）。细则 = 功能账 `20261103-forward-ledger.md` §1「ID-4 审出的小尾巴」①。
3. **`identity/graph.ts census()` 生产代码还没人用**（资源页走 `closure` + `store.usage`）：它是「引用和孤儿」面板的接口，留着，面板做的时候接。
4. **跨打开、内容一样、不问的那条路**：提示行说「组件「X」本文件已有，用的是本文件这版」——是事实，但其实比过是一样的；`keepPlan` 不比内容所以说不出。噪音不是误导，先留。

**设计上留一笔**：断开时，包里新建的上层（这边没有）如果指着被改过的子组件，也跟着铸新身份（`above` 不分新旧）。站得住：它在这边指的是新的那份子组件，内容已经和源头不一样，留原身份下次贴回来反而要再问一次。

## 17. 小尾巴施工记录（2026-11-05，Claude Opus 5.5；v0.18.36，分支 `identity-id4-tail`）

§16 的 1、2 两条做了，3、4 没动（规则见功能账）。

- **第 2 条（弹窗灰掉）**：`pasteConflict(s, p, ctx = 根)` 现在返回 `{ rows, ways, frontier, stuck }`；`ways` = 三种处理各自走不通的原因（`null` = 走得通），随 `rows` 递给 `host.resolvePaste`；`stuck` = 三种都走不通时的人话，不弹窗，粘贴走提示行、导入走通知。表单选项加了 `blocked` 字段（灰掉、点不了、原因写在分段钮下面）。原因文字在 `whyBlocked`（`pasteBlocked` 外面加「粘贴：」）。
- **第 1 条（只比一次）**：`plan(store, bundle, d, known?)`、`planPaste / preparePaste / pasteBefore / shelfImportOp` 都收一个算好的前沿。问的时候算的那份一路用到底，指令里那一次留着。问的期间场景变过就作废重算：前沿是某一刻的快照，不赌。（原写「弹窗模态，正常走不到」，错了：普通弹窗当时不锁键盘，见本节末「补」。把关也从「`scene` 换了或 `opCount` 变了」换成 `revision`。edited by Claude Opus 5.5 2026-11-05）单测用计数器钉住：预查 = 一遍前沿，之后准备指令和提示行记账 0 次。
- **和规则写的不一样的一处**：功能账写「探针 ⑦ 站在里面 → 默认落在留这里的」。实测站在椅子里贴同一把椅子时，**留这里的也会成环**（贴的就是自己），所以按「第一个走得通的」落在**断开**。规则没动，探针按规则写：⑦ = 更新、留这里的都灰、默认断开、贴得出；另加 ⑨ = 这边的上层不再指着站的这一层时，只有更新灰、默认留这里的（规则设想的那种）；⑩ = 三种都走不通（不一样的只是旁边的兄弟，断开救不了）不弹窗。
- **没预查的组合**：`ways` 按「材质跟」（默认）算。断开 + 材质不跟 可能和断开 + 材质跟结果不同：只有材质不一样时，不跟 = 上层不铸新 = 站在里面又成环。这一种选了点「贴」才被 `pasteBlocked` 拒（没贴、提示行说原因，数据没事）。没有为它把表单做成随另一行变灰。

单测 1689 绿（多 8 条）、`probe-paste-conflict` 全绿（含 ⑦ ⑨ ⑩）、`probe-shelf`、`probe-move-copy`、`probe-undo-fuzz`（4×28）绿，弹窗截图看过（1000 宽、390 宽）。`editor.ts` 4146 行没涨。真机没测。

**审（2026-11-05，Claude Fable 5.1）：过。** 重跑了类型检查、红线守卫、全量单测（1689 绿）、`probe-paste-conflict`。守住的：身份层只多一个可选参数；复用前沿靠「场景对象没换 + 指令数没变」把关——每次提交都换新场景对象，所以撤销也抓得住；`stuck` 不会误拒——「材质跟」是三种处理里最不容易成环的一档（不跟 = 更多条目保留原身份 = 更容易贴进自己），按它算全堵则不跟也全堵；两层拒绝都在。**一条顺手补（不拦）**：导入素材的预查把站的地方写死成根（`pasteConflict(s0, payload)`），站在被导入更新的组件里时「更新」不灰、贴完 `bump() → validCtx` 悄悄把人退到还在的一层（不丢数据、能撤销，但是「被踢下去」，且和手动粘贴不一致）；修法 = 递 `editor.context` 进去 + `probe-shelf` 补一句。小尾巴之前导入素材根本不查，这不是这批引入的。小事不动：`openFormSheet` 调用方若把默认值设成灰掉的选项会显示成「选中但点不了」，现在唯一调用方不会。

**补（2026-11-05，Claude Opus 5.5，v0.18.37；user「opus补」）**：上面那条顺手补做了。动手前核实，审语和本节各有地方要更正：

1. **修法不是「递 `editor.context`」**。`pasteConflict` 拿同一个 `ctx` 算「站的这一路」和「贴进哪」；导入落在根、不摆放，直接递的话站在椅子里导入椅子，留这里的 / 断开会被误判成「贴进它自己」。所以分开：`pasteConflict(s, p, ctx, into = s.defOfContext(ctx))`，导入传 `editor.context` + `s.root`。结果 = 只有更新灰，默认留这里的。
2. **「每次提交都换新场景对象」不对**。kernel / mesh / skeleton 档提交是原地改、场景对象不变（`opCount` 抓这个）；每一档的记录都带一份骨架快照，所以撤销 / 重做才换对象（对象比较抓这个）。旧把关是对的，理由写错了。现在两条路都用 `editor.revision`（提交 / 撤销 / 重做 / 载入 / 进出上下文都 +1），不用靠这个细节。
3. **「弹窗模态，正常走不到」是错的，这条最要紧**（第 1 条是施工时写的，审语跟着信了）。无头实测：普通弹窗（`#sheet`）开着时，Ctrl+Z 真的撤销、工具键真的换工具，只有同步闸门锁了键盘；Esc 关掉弹窗之后还继续传给编辑器，取消弹窗顺手把人从组件里退出来。指针没问题（罩子挡着）。修在根上：`app/main.ts` 键盘入口 `if (isAnyFaceUp()) return`，`ui/sheets.ts` 的 Esc `stopPropagation`。**影响全部普通弹窗，不只粘贴。**

导入这条路还补了第二道：点了之后 `importBlocked` 用当时的场景和站的地方再查一遍（和 `preparePaste` 同款；指令只知道贴进根，站的这一路只有编辑器知道）。「不比内容」的单测把它一起钉成 0 次。

验证：类型检查、红线、单测 1691 绿（多 2 条）；`probe-shelf`（加：站在要更新的组件里导入 = 只有更新灰、默认留这里的、点完人还站在里面；键盘不穿过弹窗；Esc 只关弹窗）、`probe-paste-conflict`（加：键盘不穿过；问的时候场景变了 = 前沿重算）绿；同时碰弹窗和键盘的探针共 11 个，10 个绿。`probe-c2` 两个版本都没绿过（v0.18.36 跑 4 次、v0.18.37 跑 6 次），第 115 行（「恢复」按钮被 `idb cache closed (disposed)` 那条通知挡住，时有时无）和第 59 行（新建图库文档被一个弹窗挡住）两边都见过，不是这批引入，**没查因**，记在功能账。`editor.ts` 4146 行没涨。真机没测。
