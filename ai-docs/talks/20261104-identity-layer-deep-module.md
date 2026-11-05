# 讨论日记：身份层做成深模块（2026-11-04 夜）

> created 2026-11-04 by Claude Fable 5.1 · 状态：**设计中，代码没动**（分支 `identity-id3` v0.18.34 等审；本话题是它之后的一张单）

## user 原话（11-04 夜，审 ID-3 报告、聊粘贴更新规则之后）

- 「我承认我最近心思不在开发上面。但是我们这个弄了蛮久的。会不会身份逻辑实际上是一个深模块？甚至是库，就像ecs一样。如果是的话，它是什么样子的？软件工程里面有实例吗？还是其实不是我们之前只是在修屎山。我们这些id sprint的本质是什么」
- 「倒不是，而是屎山风险，但是我觉得其实是反的。因为我也是当刚才才看到形状的。我以前以为只是guid + F。就是两句话的拾取 我在想的是我们现在好好把它做成一个深模块。我们一起设计一下」
- 「即使不共享也是内部深模块 顺便star citizen的entity graph和这个有关吗」
- 「我是真没想到scene graph之外还有这么一张图，可能就是我说要component之后就命中注定的吧」

## Fable 的回答：本质

- 文件 = 一张「条目有稳定身份、条目之间有引用」的对象图；身份层 = 让所有把东西从一张图搬到另一张图的动作（拷贝、粘贴、导入、存盘重开、撤销重放、清理孤儿）都走同一层认得引用的代码。
- 场景树之外的第二张图从「组件」（一份定义多份摆放 = 共享）那天起就注定存在：树里没有共享，共享就要身份，身份之间的引用就是第二张图。glTF 同形：nodes 是树，meshes / materials / textures 是按下标引用的表（下标 = 我们以前的序号问题，合并两份 glTF 要重排号）。
- 先例：Blender ID 系统（每种数据块一个「枚举我引用了谁」回调，链接 / 追加 / 重映射 / 孤儿清理 / Make Local 都是它上面的通用图算法；假用户 F = 素材架）；Unity GUID + fileID；Godot 4 `uid://` + 场景文件短 `id`；Bevy ECS 场景载入的 `MapEntities`；Fowler Identity Field / Identity Map；DDD 实体 vs 值对象；Star Citizen 的 Entity Graph（按 CIG 公开开发讲座：持久层里的实体 + 关系图，服务器从中流进流出实体——同一张图的分布式、多服务器版；他们重包含 / 归属，我们重共享）。
- 前三张单一半还债（下标 → GUID、面编号 → 对照表）、一半造新能力（闭包载荷、合并、普查、素材架当根、铸造录音带）；**还没做的 = 把按组件 / 材质 / 层各写一份的五件事（取闭包、换号、查环、算活死、断开）抽成一层**。

## 代码现状盘点（v0.18.34，这层的手工版散在哪）

- 文档形状 `src/format/document.ts`：`DefinitionDoc { guid, name, kind, mesh, brep, groups: GroupDoc[], instances: InstanceDoc[], materialSlots: (Guid|null)[], guides, drawFrame }`；`InstanceDoc { guid, definition: Guid, parent: Guid|null, layer?: number(代号→文档层表) }`；`GroupDoc { guid, parent: Guid|null }`（附属于定义）；`MaterialDoc { guid, name, color, texture?: ImageAsset }`（贴图现在嵌在材质里）；`LayerDoc { id(代号), guid, name, visible, color }`；`ShelfDoc { folders, items }`。面上的材质代号进 `MeshDoc.faceMat` / brep 快照，查每个定义自己的 `materialSlots` 表。
- 算法：`src/scene/resources.ts`（107 行）`shelvedDefs / liveDefs(reachableDefs 根 = 模型根 + 架上) / census / shelfRows`；`src/format/scene-doc.ts`（159 行）`definitionsToMake`（闭包减去已有）/ `materializeDefinitions`（换号、两遍建组、memo）/ `definitionToDoc`；`src/editor/transfer.ts`（253 行）`extract`（攒闭包）/ `trimClosure` / `payloadFromDocument` / `importCandidates` / `shelfImportOp` / `pasteWouldCycle`；`src/editor/ops.ts` `cloneDefinition`（两遍）/ `mergeClosure` / `mintPasted` / `purgeDefs` / `purgeMaterials`；`src/format/guid.ts`（60 行）`mintGuid / recordMints / replayMints`。
- 两级 id：运行时句柄（`DefId` / 材质下标 / 层号）↔ 文件 GUID；`Scene.defByGuid / materialByGuid`。

## Fable 提案：这层的形状

三件事：① 身份与查找（两级 id、按 GUID 找、铸造 + 撤销重放录音带）；② 引用图（枚举 / 改写引用 → 闭包、换号、查环、活死普查、反向索引）；③ 搬运政策（哪种条目跟闭包走、同 GUID 两边不一样怎么办、断开 = 给子图铸新身份）。

**每种条目交四件**：`refs(doc)` 枚举引用（kind + guid）；`rewrite(doc, f)` 改写引用（换号、断开都用它）；`canon(doc)` 规范形（只对自己知道存盘重开会乱序的部分排序，其余原样；模块逐字比）；政策行（`carry` 跟闭包走？`structural` 引用成环要管？`overwrite` 合并时允许更新？`constants` 每份文件固有、永不搬的 GUID）。

**模块给**：`closure(roots)`；`frontier(bundle, has)` → 要新建的 / 已有且一样的 / 已有且不一样的（带使用统计：摆了几份、几张面、几份锁着、在架上）；`materialize(bundle, decision: update|keep|detach)`（memo、两遍建附属、先查环）；`census(roots)` 活死 + 反向索引（面板 / 清理 / 粘贴报告共用）；`wouldCycle(edges)`；`detach(subgraph)`（内容不一样的条目 + 包内指着它们的上层铸新 GUID；Make Unique 的一般化）；`clone(entry)`；`mint / record / replay`。

**政策表（提案）**

| 条目 | 顶层 / 附属 | 跟闭包走 | 成环要管 | 合并可更新 | 固有常量 |
|---|---|---|---|---|---|
| 组件定义 | 顶层 | 是 | 是 | 是（问人） | — |
| 材质 | 顶层 | 是 | 否 | 是（跟组件、带开关） | 内置正 / 背面 |
| 层 | 顶层 | 是（缺就建） | 否 | **否**（可见性是看法） | 默认层 |
| 贴图（下一波） | 顶层（建议从材质里独立出来） | 是 | 否 | 跟材质 | — |
| 实例 / 组 / 参考几何 / 面边点 | 附属（跟主人走） | — | — | — | — |
| 素材架 | 根（假用户），不是条目 | 否 | — | — | — |

**不进这层**：几何内核、弹窗 UI、摆放 / 变换、撤销栏本身（只有录音带）、文件格式版本与迁移、素材架的 UI 顺序。

**放哪**：`src/identity/`，不 import 任何几何；测试里用一个玩具条目种类证明通用（像 ECS 库的测试）；要抽成 `@internal/` 时零改动搬走。全家族库现在不做：兄弟里有对象图引用需求的只有 CatsUp。

**声明方式的取舍**：考虑过「一张路径表数据驱动」（更机械、面板直接读表）；推荐每种条目两个小函数，因为面上的代号在 Int32Array 里、层代号要过两级表，通用路径走子比它要替换的东西还重；面板的「看得见」从 `refs()` 的输出来。user 若偏好路径表，说一句。

## 等 user 拍

1. 顺序：先审 ID-3 → 合 main → 这层当 ID-4，粘贴更新规则当它第一个客户（推荐）；还是先在现有代码上改粘贴规则、以后再抽。
2. 条目名单对不对（上表）；贴图下一波是否独立成条目。
3. 之前三件（弹窗 / 材质开关 / 导入默认）进这层就是合并政策的参数，可以设计定了再拍。
