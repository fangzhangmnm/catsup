# 计划书：身份地基（文件里的条目换 GUID、编号只当对照表代号、有序表、素材架存盘、跨文件粘贴载荷、单面 / 双面跟身体种类走）

> created 20261104 by Claude Fable 5.1 · as-of dev v0.18.26 / main 0a71021 · 来源 = `20261103-forward-ledger.md` §2 第 1、2 件（user 11-03「fable操作opus做完，然后bump minor」「要不先fable基建」）
> 读者 = 实施的 Opus 子代理 + 以后的 Fable。user 看的是会话里的人话摘要，不是这份。
> 分工：这份里标 **〔Fable 定〕** 的是我按已有拍板推出来的设计决定，user 随时可改；标 **〔user 拍〕** 的带出处；没标的是代码事实（11-04 读 `src/scene/scene.ts`、`src/format/document.ts`、`src/format/scene-doc.ts`、`src/format/brep-codec.ts`、`src/format/migrate/index.ts`、`src/editor/transfer.ts`、`src/scene/resources.ts`）。
> 终点：四张工单落地 → 问 user 推不推正式版 → bump minor 进材质纪元。操作手感不在这份里（user 11-03「操作ux不用阻塞」）。

## 0. 为什么先做这个（一句）

文件里组件按「列表里第几个」引用、材质按「第几个」引用，删一个后面全挪号；素材架、跨文件粘贴、材质清理、以后的骨骼对照表全压在它上面——每多一样引用组件或材质的功能，以后迁移就多一份（forward-ledger §0）。家规 10-30 已立（家族 CLAUDE.md「文件里条目的身份 = GUID，不用序号」），CatsUp 还欠着。

## 1. 现状（代码事实，11-04）

| 条目 | 运行时身份 | 文件里怎么引用 | 问题 |
|---|---|---|---|
| 组件定义 `Definition` | `DefId = number`，`Scene.nextDef++` 顺序铸造 | `CATSUP_definitions.list` 的下标；`instances[j].definition = 下标`；`root = 下标`（`scene-doc.ts` 头注释「索引 i ↔ DefId i+1」） | 下标 = 序号；删一个后面全挪 |
| 实例 `Instance` | `InstId = number`，每个定义自己的 `nextInst++` | `instances[j].id`（定义内局部整数，原样存） | 自增编号；没有跨文件身份 |
| 组 `Group` | `GroupId = number`，定义内局部，文件原样保留（`scene-doc.ts:50`） | `groups[j].id` / `parent` / `instances[j].parent` 按它 | 自增编号；见 §2.4：**也换 GUID**（11-04 改口） |
| 材质 `Material` | `Scene.materials: Material[]`，「只增不删（面按索引引用）」 | 顶层 `materials[]` 下标；每个定义 `materialSlots: number[]` = 下标表；面存槽号（brep `u16x2` [+n 侧, −n 侧]，`0xFFFF` = 无；mesh `faceMat` i32，−1 = 默认槽） | 面 → 槽号 → 槽表这一层合规（槽表 = 对照表）；**槽表 → 材质仍是下标** |
| 贴图 | 没有独立条目：`Material.texture` 内嵌字节 + `sizeM` | 随材质 | 材质纪元若拆成共享贴图表再给 GUID（§2.6） |
| 层 `LayerDoc` | `id: number`，0 = 默认层 | `CATSUP_document.layers[].id`；`instances[j].layer` 按 id | 跨文件粘贴对不上 |
| 剪贴板载荷 `TransferPayload` | 内存；`instances[].def: DefId`、`mesh.faces[].mat` / brep 面 = **文档材质下标** | 不落盘；换了模型拒贴（v0.16.50 `Editor.docEpoch`） | 跨文件要带值走、要能对上身份 |
| 拍子 | `FORMAT`：document 3.4 · brep 4.2 · definitions 6.4 · instance 1.0 · material 1.1 · desk 1.3 · references 1.0 · mesh 1.2 | 冻结样本目录 = `v<formatTag>` | — |

## 2. 设计决定

### 2.1 GUID 是什么、长什么样 〔Fable 定〕
- 标准 UUID v4，小写 36 字符文本（`crypto.randomUUID()`），JSON 里就是字符串。铸出来就不变；撤销 / 重做不重铸（守卫 §4）。
- **文件里条目之间的引用一律写 GUID**：`instances[j].definition = <guid>`、`root = <guid>`、`materialSlots = [<guid>…]`、组的 `parent` 与实例的 `parent = <组 guid> | null`、素材架条目 `ref = <guid>`。
- **运行时保留数字句柄**：`DefId` / `InstId` 照旧是数字（会话内有效、不落盘、撤销栈和 op 继续按它寻址），每个条目多一个 `guid` 字段；文件边界（`scene-doc.ts`）做 guid ↔ 句柄的换算。理由：热路径（合成视图、拾取、结算）零改动；家规管的是文件。
- **没起名的显示码 = GUID 前四位十六进制**（取代 v0.18.17 单独随手生成的四位码）：仍然「不是身份、只是标签」，但稳定（存一次就定下来，和 10-30 拍的行为一致），少一个字段。实施时核：若现有短码另有字段，删掉、迁移时丢。

### 2.2 编号只能是对照表的代号 〔user 拍 10-30，家规〕
- 面上的材质槽号（brep 两侧 / mesh 一侧）= 代号；对照表 = 该定义的 `materialSlots`（槽号 → 材质 GUID）。这一层现在就合规，只改表的值的类型（下标 → GUID）。
- 层：`instances[j].layer` 仍是小整数代号；对照表 = `layers[]`，每层加 `guid`；跨文件粘贴按 GUID 合并（§2.7）。
- 以后的自定义标签（材质纪元）照同一个形：面上小编号 + 定义或文档级标签表 `[{guid, name, …}]`。**合并按 GUID 不按名字**〔Fable 定，answer §2 第 2 件最后一问〕：名字只是显示、可重名（user 10-30「可以重名」），按名字合并会把两家碰巧同名的「雪」偷偷揉成一个；同名不同 GUID 就并排两条，想合用显式动作「合并同名标签」（做一次、烘进状态）。

### 2.3 同级顺序 = 有序表 〔user 拍 10-30「改文件格式，为什么不是有序表？」〕
- `CATSUP_definitions.list[i].instances` 的列表顺序**有意义**（层级窗同级的先后）：读保住、写按运行时顺序写、拍子声明。运行时 `Definition.instances: Map` 的插入顺序就是它；新增 = 追加；加一条 op `reorderInstance(def, inst, index)`（撤销照 op 记）。
- 组、定义列表、材质列表的顺序**没有语义**（不承诺）。素材架条目顺序有意义（user 摆的）。

### 2.4 组也换 GUID（11-04 改口）〔Fable 定〕
- **先写结论**：组也给 GUID——文件里 `groups[j].guid`，组的 `parent`、实例的 `parent` 写 GUID；运行时 `GroupId` 仍是数字句柄（和定义同一个办法，池地址 `定义/组` 不动，热路径零改）。理由：家规字面「自增编号也算序号」，组当唯一例外要多守一条边界；顺手消掉下面「重开后号会复用」的怪现象。user 11-04 两问「那为什么组不用 guid」后 Fable 改口；user 可再改。下面是改口前的记录，留着当理由对照：
组「不是物体层级，是同一碗汤里的整理，地位类似选区」（user 10-21 / 10-24），只在自己的定义里被引用，不上架、不跨文件保身份（跨文件粘贴时组是载荷里的子树、下标重排）；id 已经是稳定整数不是位置。所以留局部整数。user 想换一句话就换。
- **user 11-04 问「用什么 id、删的时候怎么办」**（Fable 答，代码核过）：组 id = 定义内部递增编号，铸了不变、文件原样存、孩子和实例的 `parent` 按它引用；删组 = 连内容一起删（想留内容用炸开），其他组的号不动，引用不挪。计数器**不存文件**，重开按「最大号 + 1」续（`scene-doc.ts:56`）→ 删了号最大的组再存再开，新组会拿到同一个号；无害，因为组只被自己定义里的东西引用、删组时引用一起消失、撤销是整份快照。**条件**：一旦有定义外面的东西要指着组（动画目标、约束……），组就成了条目，那时给 GUID。

### 2.5 生死按引用 〔user 拍 10-30，家规〕
- 活着 = 从根够得着（根 / 活着的定义里摆着它）**或** 被素材架收着（组件、材质都算）。层不参与生死（纯管理，不自动删）。
- **没有任何动词顺手删条目**。删条目只有三个显式动作：「清理没人用的组件」（已有，v0.18.3）/「清理没人用的材质」（新，等 GUID）/「从架子取下」（只去引用，不删条目）。强行删还被引用的 = wishlist，不做。
- 资源页（`scene/resources.ts`）照旧是唯一回答「谁用谁 / 活没活」的地方；加材质的清理。

### 2.6 材质 / 贴图 〔Fable 定〕
- `materials[]` 每条加 `guid`；运行时 `Scene.materials` 从数组改成按 GUID 索引（`Map<MaterialId, Material>`，`MaterialId = string`）；只增不删的注释作废（可被清理）。
- 贴图这轮**不拆**成独立条目（现在内嵌在材质里，没人跨材质共享）；材质纪元若做共享贴图表，照 §2.2 的形加 `textures: [{guid, …}]` + 材质引用 GUID。这里只定形，不占拍子。

### 2.7 跨文件粘贴载荷 〔user 拍 10-30：带值走、这个纪元做、先不按内容哈希去重〕
- `TransferPayload` 升 v2：除了几何，带上**闭包**——用到的定义（递归，连带它们的身体快照、槽表、参考几何）、材质（整条含贴图字节）、层，全部带 GUID。`instances[].def` 从 `DefId` 改成 GUID；面材质从文档下标改成材质 GUID。
- 粘贴时的合并规矩（对照表合并）：
  - 目标文件**已有同 GUID** 的定义 / 材质 / 层 → **复用目标那条**（同一出身 = 同一条目；贴了什么提示行说一句「用了本文件已有的 X」），不造第二份；想分叉用已有的「做成唯一」。〔**user 11-04 拍**：「粘贴复用：同一文件内不变，跨文件粘贴时第一次新建组件，之后再贴同一组件只多摆一份可以」；10-30 §9.2「永远新建一份」说的是不按内容去重，GUID 不是内容哈希〕
  - 没有 → 带着原 GUID 新建（保留出身，下次再贴能认得）；名字原样，同名并排（不加 2、不加码）。
  - 槽号重排：面上的槽号按目标定义的槽表重新对上，**不许原样拷编号**（家规）。
- 同一文件内粘贴的行为不变。换了模型拒贴（`docEpoch`）**撤**，剪贴板跨模型可用（仍只在内存，不进系统剪贴板）。
- 「素材导入别的 .catsup」（只读打开另一份、挑组件进本模型素材架）= 同一条路：读文件 → 抠闭包 → 合并 → 上架。界面归后面的工单。

### 2.8 素材架存盘形状 〔user 拍 10-30：架子上放引用、只放标记进来的组件、进架必须命名、可重名、不同文件夹〕
新顶层子结构 **`CATSUP_shelf` 1.0.0**（缺 = 没有架子；老读者当未知扩展原样带回，契约 §7.1）：
```jsonc
{ "version": 1,
  "folders": [ { "guid": "…", "name": "角色", "parent": null } ],
  "items":   [ { "guid": "…", "kind": "definition", "ref": "<定义 guid>", "folder": "<文件夹 guid>|null" },
               { "guid": "…", "kind": "material",   "ref": "<材质 guid>",  "folder": null } ] }
```
- 条目和文件夹都有 GUID（文件夹被条目引用；条目以后可能被别的东西引用）。`items` 顺序有意义。
- 放上架的定义 / 材质必须有名字（没名字先弹改名）；取下不删条目。
- 架子上一格 = 引用：原物改了架子看到的就是新的；拿进别的文件 = 拷贝（§2.7）。原物不存在了（引用悬空）= 读取时丢掉那一格并在读取记录里记一笔（`FormatReadNotes` 加一类），不猜、不造。
- 缩略图不进文件（10-30 拍，派生数据）。

### 2.9 硬表面的单面 / 双面：跟身体种类和导出规矩走，不进膜的数据 〔11-04 门审 user 改；原案 = Fable 定的 brep 面层保留值 `0xFFFE`「这一侧没有表面」，撤回〕
- 原案的由头：双面讨论第八轮 user 拍「跟规范、编辑器画的 = 引擎画的」；硬表面的膜天然两面都画，引擎材质默认单面；想要「老游戏一张面当墙」就得在膜上标一侧不存在。门审时 user 撤回，原话：「我其实不太认可没有背面，感觉这违反了brep的语义」「比如我画了一个cube转mesh应该是单面的」「什么时候才会识别双面？」「硬表面里面对象是片而不是体」「b里面转和导出对齐，非标准背面材质问用户是出双面还是丢」「能不能同时兜住单面墙？」「d也同意」。
- **规矩**：**硬表面体 = 每张面是一层膜、两面都在**（SketchUp）；**网格体 = 每张面一个朝向**（Blender），单面 / 双面由材质的 `doubleSided` 决定（材质纪元加字段，默认单面；user「d 也同意」）。膜上**不存**「这一侧有没有」：`0xFFFE` / −2 作废，brep 拍子仍是 4.2，没有新动词。「什么时候识别双面」= 不识别，看身体种类。
- **〔11-04 第四版，方向 user 定、编码是 Opus 提案；**没施工，等 Fable 审**；取代下面第三版和它的全部启发式〕** user 原话：「用2？其实我是担心不要弄的太复杂太静默。因为aha这个应该修复管。包括曲率。我们应该更机械。所以这个点子很好，记账，然后看看有没有更机械的思路」「就是不判类型。而是就是第一步是判哪些面不是背面」「被涂过的统一导出」「被涂过的如果是双面材质，正反本来就应该一样。不然的话即使正反是不是同一个材质还是算双面」「等等，太麻烦了，我们的纪律是不静默，不潜规则，那么答案很简单了」「和sketchup一样，有默认正面和默认背面。用户自己看得到，自己assign」「然后双面材质是一上色两个面一起更新这个你同意吧，然后朝向敏感的双面材质类似叶子也需要记哪边是正面，比如涂的那边」「聊好了不要施工，让fable检查，因为可能需要大改」。
  - **规矩（一句）**：每张面的两侧各存一个值 = 材质 / 默认正面 / 默认背面；**导出时默认背面不出，其余都出**；不判封闭、不算曲率、不 flood fill。用户在编辑器里看得见（默认背面画背面色），自己翻面 / 指定。
  - **编码（user 11-04「对，我说的就是各存一个值。brep我一开始提的就是不分正反」「默认正反应该是builtin材质」；取代 Opus 的保留值提案）**：**默认正面、默认背面是两个内置材质**。面层照旧只存普通槽号（≥ 0，或缺 = 默认正面），`0xFFFE` / −2 **不用**，brep 拍子仍 4.2；「这一侧是默认背面」= 面上的槽号指向槽表里一个写着内置背面 GUID 的格（家规「编号只当对照表的代号」原样成立）。内置材质 = 全家常量 GUID（照 `DEFAULT_LAYER_GUID`），**不写进文件的材质表**，文件里只有引用；样子归 app：背面色先试灰蓝，预设能覆盖（user「对背面有另外的颜色，先试试灰蓝，我觉得丑再说，预设能覆盖」）。好处：翻面 = 两槽互换、`swapSides`、镜像跟随全部现成；契约 §5.2「面无朝向」不推翻；老文件不用迁移（两侧都没写 = 两侧默认正面 = 今天的样子，两面都出）；指定默认背面就是油漆桶挑一个材质，不要新动词；清点 P9 那五处压负数的路不碰。
  - **运行时要核（Fable）**：槽表里内置材质的句柄怎么表示（Opus 想的是槽表值 −2、面层不变），会碰 `materialOfSlot`、`scene-doc.ts slotGuids / slotsOf`、`read.ts`（`matKnown` 要认内置 GUID）、`ops.ts purgeMaterials`（现在 `m >= 0 ? … : -1` 会把它压掉，要改）、`transfer.ts codeOf` + `pastedMaterial`（对照表里的内置材质不许被加成普通材质）、`explode` / `appendMesh` 的槽重映射。老版本读到内置 GUID 会读成没材质（默认正面）；definitions 7.0 还没推出去，能不能并进 7.0 不另动拍子，Fable 定。
  - **双正面 / 双背面（user「3不变 这样才能有intentionally双正面。然后也可以有双背面，根据规则不导出」）**：涂一侧不动另一侧。两侧都是默认正面 = 有意的两面都出；两侧都是默认背面 = 按规矩都不出。Opus 补：转网格体走同一条路，这张面也没了，报个数（待 Fable 看）。
  - **网格体不合并、和外部文件对齐（user 11-04「网络体导出当然是留两层，就是不要静默修复，它怎么说我们就怎么导入」「网络体为什么可以合并，我们brep转mesh的时候也是双面材质用两个面表示啊」「网络体应该和外部文件对齐」）**：网格体的面 = 外部文件（glTF 等）里的面，单双面 = 材质的 `doubleSided`，以后导入读材质时原样带进来。网格体一张面一个朝向，两面 = 两张面。导入原样、导出原样，机械透明，不静默修复（user 11-04「修复可以合并，导入导出的时候机械透明，原则就这么简单」）。**修复工具可以合并**，用户点了才跑：同材质的一对并成一张 + 双面材质（材质纪元前没有字段，工具上写明会丢一面），不同材质的并不了、跳过报数。只有网格体 → 硬表面才并：膜有两侧可存、内核要求重合即同一，两张重合反向的面并成一张膜，材质落到各自那侧；这不是修复，是这种身体的表示法。
  - **导出 / 转网格体（Opus 按 user 上句提的统一写法，待 user 确认）**：**要出几侧就几张面**。一侧 = 一张面，绕向朝它；两侧都出 = 两张面（同材质也一样，含两侧都默认正面）；glTF 材质一律按自己的单双面写，不再按需多一份。只有材质自己开了双面（叶子，材质纪元）才是一张面。两侧都出且材质不同：问一次（两层都出 / 只留一层；只留一层时先丢没涂的，再丢 −n 侧）；没有这种面绝不弹（user「如果没有双面不同材质是不应该弹框的」）。代价：老文件的白模两侧都是默认正面，方块转过去 12 张面，想单面先点修复工具「自动朝外」。网格体 → 硬表面：环朝的那侧 = 它的材质或默认正面，另一侧 = 默认背面，往返不丢。
  - **格式与选项（user 11-04「用户有一个勾选项」「对导出导入的时候可以有选项」「然后obj的支持可以sunset」，取代下一条的自动翻译）**：OBJ 可以下线；glb / glTF 能直接表达双面，导入导出都不翻译，往返逐字一样（前提：导入要读材质和 `doubleSided`，现在不读，材质纪元补）。要展开或合并 = **导入 / 导出面板上的勾选项**，默认不勾 = 原样；只有文件或模型里真有这种面才露出来：导出「双面材质展开成两张面」（给不认双面的下游）；导入「把重合反向的面读成一张双面」，判据同下一条。不勾就不动，不判断不自动。**待 user 定**：OBJ 是导入和导出都下，还是先只下导出——OBJ 现在是唯一保四边形 / n 边形和平滑组的路（`meshFromSplitPolygons`，user 10-29「应该keep quad。当然我知道gltf没法保quad」），下了导入这条就没了；导出那边现状也不写材质、朝向按内部规范方向（读代码推断），不值得修。
  - **〔被上一条取代的自动翻译，判据留作勾选项用〕** 格式不支持双面（user 11-04「我没想到有些文件支持双面，但是不支持的怎么办」；Opus 提案）：数据层规矩不变（要出几侧几张面，双面材质一张面）；**翻译只发生在导出那一步**：格式能表达（glTF `doubleSided`）= 原样写；不能（OBJ / MTL 没有这个字段）= 这种面机械展开成正反两张，导出面板如实写「N 张面展开成两张」。**导入也翻译，能往返（user 11-04「不支持双面的格式 如果导出的时候翻译的话，导入的时候也翻译。round trip」）**：翻译是这个格式自己的编解码，一对面就是它说「双面」的写法，和「它怎么说就怎么导入」不矛盾；glTF 能直接说，两边都不翻译。读回判据（Opus 提案，全部是精确条件，不猜）：同一圈点、绕向相反、同材质，**且这个材质的每张面都成对**（双面记在材质上，只有部分成对就标了会连累别的面）→ 材质标双面、并成一张；导出时先写正面，读回先出现的那张 = 正面，叶子的朝向因此保得住。不同材质 / 部分成对 / 文件没有材质 = 原样两张。导入如实说并了几对。不完全可逆处：有意的同材质两层（硬表面两面涂同一材质转来的）经 OBJ 往返会变成一张双面，样子一样、结构不同；别家做的假双面同样。Opus 判断可接受。前提：OBJ 现在不写也不读材质、双面字段在材质纪元，所以**这一对翻译归材质纪元做，这张单 OBJ 只按「要出几侧几张面」出**。代价如实：**重合反向的两层在不剔背面的软件（Blender 视口、光线追踪）里可能闪或出黑斑**；导出面板写清两侧都出的面数，要避开就选只留一层或进编辑器改。边角：双面材质占整张面，在它另一侧涂别的 = 整张换掉（否则这面的背面和新涂的正面重合），看得见、能撤销；待 Fable 核。
  - **双面材质（材质纪元的字段）**：涂一侧 = 那侧写材质、另一侧写默认背面，材质带 `doubleSided` 所以两侧都显示它；「涂的那侧」就是正面，叶子这类朝向敏感的材质靠它，不用另存（一张面 + 绕向，正好是 glTF 的形状）。这之前「两面涂同一材质」= 双面。
  - **新面默认（user「新的面规则同意」；确定性待 Fable 核）**：连着已有的面（且它有朝向信息） = 跟它朝向统一（新面 k=2 边接续邻面，一步内算完）；没邻面 = 朝向画的时候相机那侧（op 里带上，重放确定），背面那侧写内置背面。推拉出来的盒子因此全部朝外；往地下推是反的，看得见，自己翻（SketchUp 同款）。
  - **要加的动词**：翻面（选中的面两槽互换）、统一朝向（以这张面为准沿连通的面 flood，用户点了才跑）；指定默认正面 / 背面 = 油漆桶面板多一格内置材质。**曲率 / 体积判外侧 = 修复工具「自动朝外」，用户点了才跑、报改了几张**（功能账已记；§2.9 第三版的实测数字在那里）。
  - **要 Fable 审**：① 内置材质的运行时句柄和文件引用（上面「运行时要核」）；② 和第八轮「编辑器看到的 = 引擎画的」怎么对齐（Opus 提案：编辑时画背面色，风格 / 演示预览时剔，和导出一致；user 同意背面另有颜色，预览时剔这半句没明说）；③ 新面默认的确定性（op 重放、撤销）；④ 硬表面转网格体的两层：用各自的点（环切能用）还是共用点（拖点一起动）；导入照旧按位置焊（实测两层焊到同一批点时中间边挂 4 张面、环切切不动，user 定了不修）；⑤ 工单切法（提案：ID-2 已提交的部分不动，这块单开一张）；⑥ Opus 提议：既然网格体和外部文件对齐，硬表面导出能不能就是「转成网格体 + 按网格体导出」，砍掉 `bakeDefinition` 这第二条烤的路（工程文件每次保存都烤，要核速度）；⑦ 导入现有的按位置焊点、拼回四边形（user 10-29「导入的时候要respect平滑组」「应该keep quad」）和「对齐」是否算一回事，Opus 判断是：它们还原的是文件为了法线 / UV 劈开的东西，不算修复，保留。工作区里未提交的第三版草稿（`bake.ts` / `kinds.ts` / `orient.ts` / `write.ts` / `session.ts` / `objects/index.ts`）作废，开工时丢掉，`meshToBrep` 带材质和两张重合面的处理可以参考。
- **〔已被第四版取代〕〔11-04 第三版，user 定，取代上一版「只出正面 + 封闭壳朝外 + 开口片涂的那侧」；ID-2 施工中，第 1 条里「两侧涂了不同材质」待 user 一句话〕** 转换和导出走同一条路。user 原话：「等一下，我的规则更简单，就是有涂的时候只看面。只有两面都没有涂的面才按照启发规则。启发规则是，优先看同一个朝向的涂了的面。实在不行再看拓扑。比如莫比乌斯的话涂了一个面就会把整个环的两侧都标成需要导出。当然莫比乌斯本来也得两面导出，所以是flood fill，只有完全没涂的时候是先判断一个外，然后外flood fill。可以吗」「think critically about it in real usecases like a mix of plane fence, indoor scene, and almost manifold geometries」「所以不用看封闭不封闭，almost manifold也可以看谁的语义强」「而且只有完全没有涂的时候才会头疼」。同一轮更早：「封闭壳只有内侧涂了就朝内 同意，加，到时候让fable scrutiny一下」（被这一版涵盖）。
  1. **涂了的面只看自己**：涂哪侧出哪侧。两侧同材质 = 一张面标双面（不多几何）。两侧不同材质 = 〔待定；Opus 推荐两层都出：单层墙外砖内粉的房子不丢墙，「背面材质没导出」的提示随之不用〕。
  2. **两侧没涂、连着涂过的面**：顺同一朝向流过去（不绕开口边缘）；两边都流到 = 两面都出（莫比乌斯、一块墙两头涂了相反侧）。
  3. **整块都没涂**：从模型外面射一条线，先打到的那侧 = 外，从外流；流到开口边缘**绕得过去**（平面两面都出、敞口盒子和带门洞的房间里外都出；密封方块只出外面 = 「cube 转 mesh 应该是单面的」）。流不到的面（密封壳里的隔墙）也至少出，不丢几何。
  4. **不看封闭不封闭。** 过边的规矩〔Opus 落实 user「almost manifold」〕：恰好两张面就是那张；一条边上三张以上（T 字隔墙）按角度找紧挨着的那张——只认「恰好两张」会把房子外壳切成碎块、每块乱朝。
  - 代价（user 已听过，不加例外）：平面栅栏只涂一侧 = 背后看穿，连着的没涂栅栏一起单面；墙上涂一小块 = 整面墙变单面；敞口盒子只涂外面 = 里面不出；密封且没涂的房间 = 只出外面（唯一真头疼的，分不清屋子和实心块）。
  - 标双面在导出（glTF 材质 `doubleSided`，同一材质按需多出一份）；网格体里单面 / 双面的字段归材质纪元。
- 网格体 → 硬表面：那一侧 = 它的材质，另一侧默认（灰蓝背面色 = 「你在看背面」）；网格体 → 硬表面 → 网格体不丢。
- 现状差距（ID-2 做）：`bake.ts` 只导正面层、不翻、不标双面；`brepToMesh` 材质槽照抄正面槽、翻面时不换层；`mesh/ops/orient.ts` 只认恰好两张面。

### 2.10 拍子怎么动（一次定完）
| 子结构 | 现在 | 改成 | 级别 | 迁移 |
|---|---|---|---|---|
| `CATSUP_definitions` | 6.4 | **7.0**〔user 11-04「大版本同意」〕 | major：`instances[j].definition` / `root` 从下标改 GUID、`materialSlots` 下标 → GUID、每条定义 / 实例 / 组加 `guid`、`parent` 改组 GUID、实例顺序有意义 | `migrate/definitions/v6-to-v7.ts`：铸 GUID、下标换 GUID；老读者**拒开新文件**（三级语义：major = 不兼容 → 拒开，原文报版本）。user 自己只用开发版、正式版 = 开发版 v0.18.26，可接受；iPad 没更新时会看到「文件比 app 新，请更新」= 诚实 |
| `CATSUP_material` | 1.1 | 1.2 | minor：加 `guid` | 读时补铸 |
| `CATSUP_document` | 3.4 | 3.5 | minor：`layers[].guid` | 读时补铸 |
| `CATSUP_brep` | 4.2 | **不动** | 〔11-04 一度 4.3 = `0xFFFE`，门审 user 撤回，见 §2.9〕 | 无 |
| `CATSUP_shelf` | — | 1.0 | 新子结构，可选 | 无 |
| 其余 | 不动 | | | |
- 为什么 definitions 走 major 而不是「下标 + guid 双写」：双写 = 两套真相（下标仍是老读者的引用），正是 user 讨厌的屎山风险（10-30「同时留两套会有极端大的屎山风险」）；三级语义本来就给 major 留了「拒开」。
- 老文件读进来 GUID 是现铸的，存一次才定（和根的四位码 10-30 同一规矩）。同一老文件两台设备各开各铸 → 字节不同 → 走库的正常冲突面，不特殊处理。
- 每动一个拍子 → `node scripts/freeze-format-fixtures.mjs` 冻新样本目录；所有旧样本仍能开（现有守卫）。

## 3. 工单（Opus 施工，Fable 审；按依赖排，一张做完审完再开下一张）

**ID-0 清点（只读，可以立刻开，和文件夹图库那张并行）**：列表——① 持久化或跨容器搬运 `DefId` / 材质下标 / 层 id / `root` 的每一处（文件、载荷、op、撤销记录、探针夹具）；② 现有冻结样本目录与读样本的守卫怎么跑；③ 物品栏纪元 v0.18.0–19 和身份有关的路径（炸开不删定义的守卫、资源页清点、拖拽换父亲走的是哪条路、短码在哪生成）各在哪、各有什么测试；④ 复现 user 10-30 说的「材质按第几个编号、删一个后面全挪号」现在能不能发生（有没有删材质的路）。产出 = 一张表 + 风险点，不改码。= forward-ledger §2 第 1 件「物品栏纪元事后审」的材料，我按表审。

**ID-1 格式层**（等文件夹图库那张合进 main 后开；在自己的 worktree）：`src/format/guid.ts`（铸 / 校验 / 前四位显示码）；`document.ts` 类型按 §2.10；`scene.ts` 加 `guid`（定义 / 实例 / 材质 / 层）、`materials` 改 Map；`scene-doc.ts` 读写按 GUID；迁移 `migrate/definitions/v6-to-v7.ts` + material / document 补铸；~~brep-codec 认 `0xFFFE`~~（门审撤回，§2.9）；`CATSUP_shelf` 读写（空也能过）；`FORMAT` 改拍；冻结样本；读写再读逐字段一致（契约 §7.9）；`gen-api.sh` 重打。**不动编辑器行为**，只让文件和运行时结构换身份；全部现有测试 / 探针绿。

**ID-2 运行时换身份 + 有序表**〔11-04 Fable 审过 = 9.1，合 main 前重建 dist + 探针〕：「清理没人用的材质」动词（§8 ①）；`moveInstance` op（换父亲保身份 + 同级排序，§8 ②）+ 层级窗拖一行到同级某位置；粘贴载荷自带材质对照表；撤销 fuzz 加「GUID 不重铸」核对。**ID-2b 单面 / 双面第四版**〔清单 = §9.3，等 user 拍 §9.2 ①–④〕。

**ID-2b 单面 / 双面第四版**〔工单 = 9.3，实施记录 = §10；分支 `identity-id2b`，等 Fable 审〕。

**ID-3 跨文件粘贴 + 素材架数据**〔设计 + 工单 = **§15**（11-04 夜 Fable 观察后写的；取代这一行）〕：`TransferPayload` v2（闭包、GUID）、粘贴合并（§2.7）、撤 `docEpoch` 拒贴；素材架：标为素材 / 取下 / 建文件夹 / 改名 / 排序的 op + 资源页里能看见架上有什么（抽屉 UI 不在这张）；「素材导入别的 .catsup」的数据路（读文件 → 闭包 → 合并 → 上架），入口先放资源页一个钮；生死算上架子。

**之后（不属于身份地基，照 forward-ledger）**：问 user 推不推正式版 → bump minor 进材质纪元；素材抽屉 / 拖出来 / 缩略图现场画、材质编辑器字段、`doubleSided` 等归材质纪元或 Opus 随手。

每张工单的开场白由 Fable 在派单时写（含共同规矩：基线先测、headless、patch、不推远端、报告形状）。

## 4. 守卫（Fable 的活，随 ID-1 / ID-2 落地；红 = 不许合）
1. **身份守卫** `test/identity-guard.test.ts`：文件写出来的每个定义 / 实例 / 材质 / 层 / 架子条目 / 文件夹都有合法 UUID；`InstanceDoc.definition`、`root`、`materialSlots[]`、组 / 实例的 `parent`、架子 `ref` / `folder` 的类型是 GUID 字符串（静态读 `document.ts` 的类型 + 真写一份文件核值）；写入器源码里不再出现「按下标引用」（grep `idx.get(` 一类，棘轮到 0）。
2. **不重铸守卫**：读 → 写 → 再读 GUID 逐条相等；撤销到底再重做到底 GUID 相等（`probe-undo-fuzz` 加核对）；同一会话里改名 / 挪 / 换种类 / 做成唯一不改原条目 GUID（做成唯一 = 新定义新 GUID，实例 GUID 不变）。
3. **生死守卫**：`defs.delete(` / 材质删除只准出现在资源页的清理模块；炸开 / 合并 / 取下不删条目（扩现有 `object-ops-kinds` 那组）。
4. **粘贴守卫**：两份槽表不同、槽号撞号的文件互贴，面的材质对得上；同 GUID 复用、不同 GUID 同名并排且名字一字不改；槽号永远经重排不直拷（静态：`paste` 里不许直接写入载荷槽号）。
5. **旧文件守卫**：所有冻结样本能开、语义一致（现有）；6.x 老文件开了没动 = 不脏、不写新版本（forward-ledger §5 那条验收）；7.0 文件被 v0.18.26 读 → 原文报「比 app 新」（用旧 dist 跑一次读样本探针）。
6. **性能护栏**：`bench-pools` / 结算基准 ±5% 内（运行时句柄不变，预期 0 差）。

## 5. 提案 .h（pin 住的接口；实现中形状变了回写这里；现状 = `api/src/scene/scene.d.ts`、`api/src/format/document.d.ts` @ 570e1f1）
```ts
// src/format/guid.ts
export type Guid = string;                       // UUID v4 小写 36 字符
export function mintGuid(): Guid;
export function isGuid(s: unknown): s is Guid;
export function shortCode(g: Guid): string;      // 前四位十六进制，只做没起名的显示

// src/scene/scene.ts（增量）
export type MaterialId = Guid;
export interface Material { readonly guid: Guid; readonly name: string; readonly color: readonly [number, number, number]; readonly texture?: {…}; readonly doubleSided?: boolean /* 材质纪元 */ }
export interface Definition { readonly id: DefId; readonly guid: Guid; name: string; body: Body; instances: Map<InstId, Instance> /* 插入顺序 = 同级顺序 */; nextInst: number }
export interface Group     { readonly id: GroupId; readonly guid: Guid; parent: GroupId | null; … }
export interface Instance  { readonly id: InstId; readonly guid: Guid; def: DefId; parent: GroupId | null; xform: Xform; name?: string; locked?: boolean; layer?: number }
export interface BrepBody  { …; materialSlots: MaterialId[] }
export interface MeshBody  { …; materialSlots: MaterialId[] }
export interface LayerDoc  { id: number; guid: Guid; name: string; visible: boolean; color?: … }
export class Scene {
  readonly materials: Map<MaterialId, Material>;
  readonly shelf: Shelf;
  defByGuid(g: Guid): DefId | undefined;
  reorderInstance(def: DefId, inst: InstId, index: number): void;
  …
}
export interface Shelf { folders: ShelfFolder[]; items: ShelfItem[] }
export interface ShelfFolder { readonly guid: Guid; name: string; parent: Guid | null }
export interface ShelfItem   { readonly guid: Guid; kind: "definition" | "material"; ref: Guid; folder: Guid | null }
// NO_SURFACE = -2 作废（11-04 门审 user 撤回，§2.9）：膜上不存「这一侧有没有」；-1 = 默认材质（0xFFFF）照旧

// src/format/document.ts（增量）
export interface MaterialDoc   { guid: Guid; name: string; color: …; texture?: ImageAsset }
export interface GroupDoc      { guid: Guid; parent: Guid | null; axes: Frame; brep: BrepSnapshot; name?: string; guides: GuidesDoc }
export interface InstanceDoc   { guid: Guid; definition: Guid; parent: Guid | null; xform: Xform; … }
export interface DefinitionDoc { guid: Guid; name: string; kind?: BodyKind; mesh?: MeshDoc; materialSlots: Guid[]; … }
export interface ShelfDoc      { folders: ShelfFolder[]; items: ShelfItem[] }
export interface CatsupDocument { …; root: Guid; shelf?: ShelfDoc }
export interface FormatReadNotes { …; danglingShelfRefs: number }

// src/editor/transfer.ts（v2；11-04 §15.1-A 回写：闭包用文件形状，面上编号照旧是对照表代号——ID-0 P2）
export interface TransferInstance { parent: number | null; def: Guid; xform: Xform; name?: string; locked?: boolean; layer?: Guid; hidden?: boolean }
export interface TransferPayload {
  from: BodyKind; brep?: BrepSnapshot; groups?: TransferGroup[]; mesh?: MeshFragment; instances?: TransferInstance[];   // 摆放：面上的编号 = materials 的下标
  materials?: readonly Material[];                                   // 面编号的对照表 ∪ 闭包定义槽表引用的材质；整条含贴图字节、带 GUID
  closure?: { definitions: readonly DefinitionDoc[]; layers: readonly LayerDoc[]; roots?: readonly Guid[] };   // 闭包：被引用的定义（递归，文件形状、GUID 引用）+ 用到的层；roots = 合并从谁往下走（缺 = 摆放的实例；素材导入 = 挑中的）。11-04 实施回写（Opus）
}
export function payloadFromDocument(doc: CatsupDocument, picks: readonly Guid[]): TransferPayload;   // 素材导入：只有闭包、没有摆放
export function trimClosure(s: Scene, p: TransferPayload): TransferPayload;   // 进指令之前只留真要新建的定义（实施回写）
export function pasteWouldCycle(s: Scene, p: TransferPayload, into: DefId): boolean;   // 实施回写
export function pasteBefore(s: Scene): PasteBefore; export function pasteReport(before: PasteBefore, after: Scene, p: TransferPayload): PasteReport; export function pasteSay(r: PasteReport, fromOtherModel: boolean): string;   // 实施回写
export function importCandidates(doc: CatsupDocument): { rows: { guid: Guid; name: string; kind: BodyKind; placed: number }[]; unnamed: number };   // 实施回写
export function shelfImportOp(s: Scene, doc: CatsupDocument, picks: readonly Guid[]): { op: Op; payload: TransferPayload; already: number };   // 实施回写
// src/scene/scene.ts（增量）
export class Scene { constructor(rootKernel?: Kernel, rootGuid?: Guid); shelfFrozen: Stamp | null; defByGuid(g: Guid): Definition | undefined; materialByGuid(g: Guid): number /* −1 = 没有 */; }   // 实施回写：返回形状
// src/format/scene-doc.ts
export function materializeDefinitions(scene: Scene, defs: readonly DefinitionDoc[], materialOf: (g: Guid) => number, opts?: { fillExisting?: Guid; layerOf?: (code: number) => number | undefined }): Map<Guid, DefId>;   // 读文件和粘贴同一份（实施回写：材质 / 层按需加，用不上的不进目标文件）
export function definitionsToMake(scene: Scene, defs: readonly DefinitionDoc[], roots: Iterable<Guid>): DefinitionDoc[];   // 实施回写
export function definitionToDoc(scene: Scene, id: DefId, name?: string): DefinitionDoc;   // 实施回写
// src/format/guid.ts（实施回写）
export function recordMints<T>(fn: () => T, done: (minted: Guid[]) => void): T; export function replayMints<T>(minted: readonly Guid[], fn: () => T): T;   // 重放按当初铸的 GUID
// src/editor/ops.ts（增量）
//  | { op: "paste"; at; brep?; groups?; mesh?; instances?; materials?; closure? }
//  | { op: "shelfPut"; kind: "definition" | "material"; ref: Guid; folder: Guid | null; index?: number; guid: Guid }   // 实施回写：guid 必填，调用方铸（§15.3）
//  | { op: "shelfTake"; item: Guid } | { op: "shelfMove"; item: Guid; folder: Guid | null; index?: number }
//  | { op: "shelfFolderAdd"; name: string; parent: Guid | null; guid: Guid } | { op: "shelfFolderRename"; folder: Guid; name: string } | { op: "shelfFolderRemove"; folder: Guid }
export function extract(scene: Scene, ctx: EditContext, sel: Selection): TransferPayload;
export function mergeTables(scene: Scene, p: TransferPayload): { defs: Map<Guid, DefId>; materials: Map<Guid, MaterialId>; layers: Map<Guid, number>; reused: string[] };
```

## 6. 我没核、要实施时核的

> **11-04 ID-0 已答**（Claude Opus 5.5）：`20261104-identity-id0-inventory.md`。前三条的答案在它的 §3，**§5 有 9 条对本计划书的修改提案（P1–P9），待门审；实施前先读**。下面原文留着。

- 层级窗拖一行换父亲现在走的是剪切 + 粘贴还是直接改 `parent`（影响 ID-2 的 `reorderInstance` 怎么接）。
- v0.18.17 的四位短码是不是独立字段、存不存文件。
- `probe-undo-fuzz` 现在核不核材质表（ID-2 要加 GUID 核对）。
- 贴图字节随材质进载荷的体积（大贴图跨文件拷贝一次几 MB，内存里没问题；若要进系统剪贴板再说）。
- iPad 上 `crypto.randomUUID()` 在非安全上下文（http 本地预览）不可用 → `guid.ts` 要带 `getRandomValues` 后备。

## 7. ID-1 实施记录 + 门审看什么（2026-11-04，Claude Opus 5.5；分支 `identity-id1`，未合 main、未推）

**已做**：`format/guid.ts`；`document.ts` 类型；`migrate/definitions.ts`（6→7）；`read.ts` / `write.ts` / `scene-doc.ts` 按 GUID；`scene.ts` 每个条目带 `guid`（克隆保身份）；~~`brep-codec` 认 `0xFFFE`~~（门审撤回，§8）；`CATSUP_shelf` 读写；拍子 document 3.5 · brep 4.2（不动）· definitions 7.0 · instance 2.0 · material 1.2 · shelf 1.0；冻结语料新目录；`test/identity-guard.test.ts`；§4 守卫 1、2、5 落地。编辑器行为零变化。

**没做（ID-2 / ID-3）**：换父亲保身份、同级排序 op、导出背面 + §2.9 的开关和一问、材质清理、载荷 v2、撤 `docEpoch`、架子的动词和「架子上的也算活着」。

**实测**：`npm test` 1486 过 0 红；tsc 干净；redline 绿；无头 `probe-boot` / `probe-clipboard` / `probe-hierarchy` / `probe-hierarchy-drag` / `probe-undo-fuzz 2 20` 绿；`probe-update-conflict pair <main 包> <本分支>` 场景 1 更新后网盘写 0、eTag 不变，无页面错误；上一版代码读 7.0 样本 = `FormatTooNewError`「version 7 is newer」。`probe-render-baseline` 2 张红（`style-papercut-boxes`、`style-realistic-textured`），main 上同样 2 张、像素数逐字一样 = 这次之前就红了，和本单无关，记功能账。性能护栏（§4.6）没跑：运行时句柄和热路径没动，预期 0 差。

**和 §2 / §5 写的不一样的地方（都是清点 §5 的提案，请门审拍）**：
1. **P1 材质运行时留数字句柄**，不是 `Map<MaterialId, Material>`；槽表运行时 = 材质下标，文件里 = `(Guid | null)[]`（P6）。将来能删材质时再决定留洞还是 Map。
2. **`doc.root` 仍是对象、`doc.rootIndex` 留在内存**（文件里才是 GUID），不是 §5 的 `root: Guid`：`doc.root.brep` 这类用法多，改了没好处。
3. **P4** `CATSUP_instance` 升 2.0。
4. **P5** 迁移 step 多收一个上下文；材质先于定义读；去重在铸之前。
5. **P7** 没做 `shortCode`：四位码就是 `name` 的值，`hex4()` 照旧。
6. **新增决定 P10：默认层 GUID 是全家一个常量**（`guid.ts DEFAULT_LAYER_GUID`）：每份文件都有默认层，跨文件按 GUID 合并时才合得回去。
7. **文件里同身份重复（手改过的文件）的处理**：`ownGuid` 留头一个、后面现铸；不拒开。6.x 的老 bug 重复在迁移里合回一份，不走这条。
8. **素材架**：major 太新不拒开（同 desk）；不认识的 `kind` 原样带回不查引用；未知键直通。

**门审重点**：`src/format/migrate/definitions.ts`（数据安全：去重语义、坏数据不吞）；`read.ts` 新顺序；`scene-doc.ts` 重写（组 / 实例句柄读时现发，不再保留文件里的 id；全仓没找到依赖「重开后句柄不变」的地方，这条是 grep + 测试的结论，不是证明）。

**清点 §5 P9 补一处**：`brep-codec.ts canonicalize` 也有 `some(v >= 0)`，当时修了；门审撤回 `0xFFFE` 后随之还原（没有 −2 就不需要）。P9 整条作废。

## 8. 门审结论（2026-11-04，Claude Fable 5.1；user 在场）

**合。** 迁移的去重语义 = 旧读法（位置留先写的、内容留后写的）；坏数据原样留给 `read.ts` 照旧拒开；材质先读、定义后读的顺序正确；写入器全按 GUID 查表；§7 列的 8 处差异全认。

**门审改的两处（同分支补一个提交）**：① `0xFFFE`「这一侧没有表面」整个撤回（user，§2.9）：`brep-codec.ts` 回到 main 的版本、brep 拍子仍 4.2、守卫两条删、冻结目录按新签名重打。② `migrateExtension` 的材质表参数不再默认成空表——没传就抛（默认空表 = 老文件的材质槽静默清空，测试不一定抓到；加一条守卫）。

**ID-2 开工前定的（Fable）**：
① 删材质（清点 P8）：运行时 `materials` 数组 splice，**同一个 op 里**把所有定义槽表里的下标重排、指着被删材质的槽置 null（面上代号不动，落到「没材质」= 默认）；句柄只活会话，文件侧是 GUID 不受影响；撤销走 scene 记录（clone 拷材质数组）。不改成 Map。
② 换父亲 = 新 op `moveInstance { from: { def, inst }, into: { def, parent: GroupId | null }, xform, index? }`：实例对象从一个 Map 搬到另一个，**GUID 不变**，在目标定义里拿新句柄；同级排序 = 同一个 def 只给 `index`（重建 Map 的插入顺序）；先 `scene.references(inst.def, into.def)` 拒绝成环；撤销 = 骨架级。`reparentOp`（现在 = 删 + 贴，换新号）退役。
③ 导出 / 转网格体 = §2.9 第四版，单开 ID-2b（§9）。

**ID-3 注意**：① 太新的架子（原字节带回）+ 本版又往架子放东西 → 谁赢要定（现在 `write.ts` 是本版的覆盖原字节）。② 读时丢掉的悬空格（`danglingShelfRefs`）要在界面披露一次，不许只记 notes。③ `sceneFromDocument` 用 cast 覆盖根的 guid，`Scene` 构造器收 `rootGuid` 更干净（顺手）。

## 9. Fable 审：ID-2 第一半（4d851b6）+ §2.9 第四版（2026-11-04，Claude Fable 5.1；user 在场，「开始审」）

### 9.1 ID-2 已提交的代码：合（合 main 前两件事）
核了 `ops.ts`（`moveInstance` / `purgeMaterials` / `paste` 对照表 / 建组件保 GUID）、`resources.ts materialUse`、`transfer.ts codeOf`、`object-tree.ts moveRowOp`、`hierarchy-window.ts dropRow`、`history.ts` 分级、`test/identity-id2.test.ts`、两个探针的改动。
- **数据安全**：`purgeMaterials` 先按 `materialUse`（活着 / 孤儿 / 架子三样）拒绝，再同一步重排所有定义槽表、面上代号不动 → 对；撤销 = 骨架级场景交换（`cloneSkeleton` 拷 `materials` 和 `materialSlots`，内核共享、面层槽号没动）→ 对。`moveInstance` 跨定义 = 同一个 Instance 对象换 Map、GUID 不变、新句柄；成环先查；撤销骨架级 → 对。`pastedMaterial` 按 GUID 对回、不在了就带原 GUID 加回来（复活被清理的材质 = 生死按引用的正确读法）；老复现包没对照表照旧按下标 → 对。渲染缓存：`slotsSig` 按材质对象身份签，清理后下标挪了对象不变 → 不误重画、也不漏重画。
- **三条不挡合的话**：① `editor.ts` 体重棘轮（≤ 4154 行）是把两个 `if` 并成一行绕过去的——棘轮的意思是别往本体加；下次切 editor.ts 时把 `opTouchesLocked`（纯函数）搬出去。② `moveInstance` 跨定义时若编辑器上下文链里含被搬的实例，op 层不管、靠 UI 先 `exitTo(0)`（两条 UI 路都做了，fuzz 的 `reparent` 只在根层跑）；`installScene` 不校验链，链失效 `defOfContext` 会抛——ID-3 加一条防线（链上实例不在了 → 退到最近还在的那层）。③ fuzz 里 `purgeMats` 只跑到 1 次，单元测试已覆盖删 / 拒 / 撤销 / 重做 / 存盘，够。
- **合 main 前必做（施工 ritual，不是设计）**：这个提交**没带 dist / index.html**（Opus 当时的构建混进了第三版草稿），main 上的包还是 ID-1 门审时的；要在干净工作区 `bash scripts/build.sh`，再跑 `probe-hierarchy-drag` / `probe-undo-fuzz 8 45` / `probe-boot` / `probe-clipboard` / `probe-hierarchy`，绿了 `--ff-only` 合、bump patch、`gen-api.sh` 重打。

### 9.2 §2.9 第四版：方向合，六处要定形（其中 ①②③ 要 user 一句话）
- **A 编码 = 内置材质：合，加三条**：(a) **默认正面只有一种表示 = 槽缺**（面层没值）。油漆桶面板的「默认正面」格 = 清槽（已有 `paintFaces material: null`）；写入器永不写内置正面 GUID，读入器读到当 null 并在 notes 记一笔——否则两套真相。(b) **内置背面的运行时句柄 = 槽表值 −2**，`materialOfSlot` 返回模块常量 `BUILTIN_BACK`（guid 常量、颜色灰蓝、预设只换颜色不换对象）。否决「放进 `materials` 数组」：全部下标挪、老语料指纹 `mat <下标>` 全变、purge / paste 都要豁免。(c) GUID 用和 `DEFAULT_LAYER_GUID` 同一族的常量（版本位 4 / 变体位 8 让 `isGuid` 认）。**要碰的地方（核过）**：`scene.ts materialOfSlot`；`scene-doc.ts slotGuids / slotsOf`；`read.ts matKnown`；`write.ts slotToCore`（内置 → 无材质）；`ops.ts paintFaces` 校验（放过 −2）、`purgeMaterials` 重排（`m >= 0` 分支要保 −2）；`explode` / `appendMesh` / `explodeAcrossKinds` 三处 remap 经 `slotFor` 走、−2 直通（核过 482 / 920 / 997 行）；`transfer.ts codeOf`（对照表里放 `BUILTIN_BACK` 对象）+ `pastedMaterial`（内置 GUID → −2，不 `addMaterial`）；`resources.ts materialUse`（`out[-2]` 为 undefined 自然跳过）；**`stream-provider.ts slotsSig`：`uid(undefined)` = 0 和「无材质」同签名 → 把一侧从默认正面改成默认背面不会重画，要给内置一个 uid**；`pool-mesh.ts matOf` 自动拿到灰蓝；资源页不列内置。
- **B 拍子**：definitions 7.0 还没推出去 → **不 bump**，把「槽表可引用内置 GUID」写进 7.0 语义（契约 §5.3 补一行），冻结目录 `v3.5.0-4.2.0-7.0.0-…` 用 `--force` 重打 + 加一个带内置背面的场景。老 7.0 读者（本地 main）读到内置 GUID → 不在 `matKnown` → null → 默认正面，无害。
- **C 导出 / 转网格体：「要出几侧就几张面」合，弹框条件要改〔① 要 user〕**。字面「两侧都出且材质不同 → 问」在新编码下包括「真材质 + 默认正面」：user 17 个模型里 103 张面只涂一侧，每次导出都会弹——不是 user 要的（「没有双面不同材质不该弹」说的是两个真材质）。定形：**只有两侧都是真材质且不同（M 张）才问**；「真材质 + 默认正面」（N 张）不问、两张都出（默认正面那张出成无材质的白面）；导出面板说明行**写两个数**（「N 张面另一侧是默认正面、会多一张白面；M 张面两侧材质不同」）。**弹框只有「两张都出 / 取消去改」**，否决「只留一层」：两侧都是真材质时没有机械的留法（Opus 提的「先丢没涂的再丢 −n 侧」——−n 是规范法向的内部符号，用户看不见 = 潜规则）；想留一层 = 在编辑器里把那侧涂成默认背面，看得见。炸开跨种类 / 粘贴 cast 不问、都出（已约定）。双背面的面转过去消失、导出不出 → notes 报个数。
- **D 新面默认〔② 要 user〕**：Opus 的「没邻面 = 相机那侧（op 里带上）」否决——addEdges / pushpull / followme / absorb / paste / move 折面 / mirror / plugin 全要加字段，老复现包没有，联机 peer 相机不同，违反 `ops.ts` 头注释「共识只在确定性上」。定形：**只看邻面**：BIRTH 的面沿恰两张面的共享边看邻面哪侧是内置背面、按「过边反向」推自己；多条邻边按边长投票；平票或邻面都没朝向信息 → **不写**（两侧默认正面）。代价：孤立新画的第一张面、从它推拉出的盒子都两面出；用户涂一次背面或点一次「自动朝外」之后新长的几何就跟着对。执行点 = kernel `faceLayers.applyEvents` 处理 BIRTH（DIVIDE 继承 / MERGE 取首值已在那里；MERGE 对 back 层改成按边长投票，实施时核）。
- **E 第八轮「编辑器看到的 = 引擎画的」〔③ 要 user〕**：第八轮管的是网格体材质的单双面；硬表面的默认背面在编辑器画灰蓝正是披露（SketchUp 蓝灰背面 = 你在看里面）。定形：编辑态画灰蓝；**演示锁 / 风格预览**（已有 `desk.locked`、`desk.style`）剔默认背面 = 引擎所见。
- **F 两层共用点**（审查点 ④）：共用点——和导入焊点一致（= 「对齐」），拖点不裂；环切不灵写进转换 notes，修复工具合并解决。
- **G 砍 `bakeDefinition`**（⑥）：**不在这张单**。每次保存都烤、没速度数据；`brepToMesh` 多做法向一致化 + 默认平滑；bake 的平滑法向和 pool-mesh 同算法（屏幕所见），换路可能让冻结语料字节变。记功能账「两条烤路合一」，先量再做。
- **H 导入焊点 / 拼四边形**（⑦）：保留，不算修复；导入提示要露出 `castImport` report 里的焊 / 拼数（核一下有没有露）。
- **I 双面材质（叶子）**：材质纪元。否决 Opus「另一侧涂别的 = 整张换掉」（又一个潜规则）。定形：导出判据「材质 `doubleSided` 且另一侧是默认背面 → 一张双面」，否则按普通单面出；涂了就是涂了，编辑器照显示。
- **J OBJ**〔④ 要 user〕：建议**只下导出**（导入是唯一保四边形 / 平滑组的路，user 10-29 要的）。
- **K 工单切法**：ID-2 已提交部分合 main（9.1）；单面 / 双面 = **ID-2b** 单开（清单 9.3）；ID-3 不变。工作区的第三版草稿已 `git stash`（见 9.4），`carryMeshMaterials`（网格体 → 硬表面带材质、重合反向面认回）可参考。

### 9.2½ user 拍了（2026-11-04，原话；取代 9.2 里标〔要 user〕的四处）
- ① **不分「真材质 + 默认正面」和「两真材质」，不另弹确认框，用户自己修**：「只有两侧都是真材质且不同才问；「真材质 + 默认正面」不问 不同意，用户自己修，这样合理吗，以后建模会碰到麻烦的问题吗」「默认背面就是丢的语义啊，没有内部符号」。定形：**要出几侧就几张面，没有「只留一层」**，丢 = 把那侧涂成默认背面。Fable 答「合理」+ 四条看得见的麻烦（老文件一次性整理 / 屋里涂墙外面多一层白 / 有意两面出的面转网格体是两张叠着的面 / 邻面规矩的空档只会让面两面出、不丢面）。
- ② **导出永远有框，是 CatsUp 的规矩；选项记在文件的 workbench（desk），不记在 workpiece**：「以及导出的时候是都要弹框的，这个算catsup的规矩，就是导出的时候永远有个框，以后选项会越来越多。我建议文件workbench而不是workpiece记住」。定形：现有「导出模型」表单 sheet 就是那个框；加一行说明「N 张面两侧都会出（其中 M 张两侧材质不同）」，不加决定项；导出选项从设备 PREF 搬进 `CATSUP_desk`（**desk 1.3 → 1.4，minor，冻结样本**）。转网格体不是导出：照旧 notes 披露数、不问。
- ③ **新面：先试邻面；初始面带「意图」，很窄，不是相机**：「试试邻面，然后初始面怎么办我还是希望有相机的意图，但是你说得对，是意图，相机不进几何引擎，意图可以进非常窄的」。定形：造面的 op 可带一个**方向向量** `front?: Pt3`（编辑器从相机算出来写进 op；内核只见方向）：BIRTH 的面先按邻面（9.2-D），邻面给不出朝向时才看 `front`——法向和它同号那侧 = 正面、另一侧写默认背面；没有 `front`（老复现包）或正好侧视（点积 ≈ 0）= 不写。只有 `addEdges`（画闭合环）和 `pushpull`（底面没朝向时）真需要它；其余造面的路（followme / absorb / move 折面 / mirror / plugin / paste）走邻面或载荷自带的层。
- ④ **OBJ 有导出就得有导入，round trip 才有意义**：「obj 如果有导出的话导入也要，round trip才有意义」。定形：要么都留（导出补材质 + 按侧出面、导入读 MTL），要么都下（丢掉唯一保四边形 / n 边形 / 平滑组的导入路）。**不在 ID-2b**，记功能账，user 另拍。
- 预览剔默认背面（9.2-E）user 没反对，按 Fable 定形走。

### 9.3 ID-2b 工单（Opus 施工，Fable 审；user 拍完 ①–④ 开）
1. `format/guid.ts` 加 `BUILTIN_BACK_GUID`；新小模块 `scene/builtin-materials.ts`：`BUILTIN_BACK` 常量、句柄 `BUILTIN_BACK_SLOT = -2`、`isBuiltinHandle()`；颜色接预设。
2. 9.2-A 清单每一处；`stream-provider` 给内置 uid。
3. 油漆桶面板加「默认背面」格（内置）；吸色吸到内置背面 → 设成那格；网格体工作台里这格灰掉（网格体的面没有默认背面，按「和外部文件对齐」）。
4. 新 op：`flipFaceSides`（选中面两槽互换 = kernel `swapSides`，kernel 级撤销）；修复模块 `repairs/orient/`：「统一朝向（以选中面为准 flood）」「自动朝外」（曲率 / 体积判外侧，功能账那条）——都 op 化、报改了几张、不进任何默认路径。
5. 新面默认（9.2-D + 9.2½ ③）在 kernel BIRTH 处理：先邻面，再 op 里的 `front?: Pt3` 方向；`addEdges` / `pushpull` 加可选字段，编辑器提交时从相机算；确定性，fuzz 的差分 oracle 自然覆盖；测试：同一 op 序列两次 → 同层、没 `front` 的老 op 不写。
6. `brepToMesh`：按侧出面（共用点）、材质层跟侧、双背面计数；`meshToBrep`：环朝向那侧 = 材质 / 默认正面，另一侧 = 内置背面；重合反向的两张并一张膜、材质各落各侧。
7. `bake.ts bakeDefinition`：按侧出面（绕向 / 法向 / UV 按那侧）、默认背面不出、默认正面出成无材质；删掉「同材质按需多一份双面」那套；`writeGltfModel` report 两个数（N 张两侧都出 / 其中 M 张材质不同）；**导出表单 sheet 加说明行显示两个数，不加确认框、不加「只留一层」**（9.2½ ①②）；导出选项从 PREF 搬进 `CATSUP_desk`（desk 1.4，冻结样本）。toMesh 命令只在 notes 报数（含双背面消失数），不问。
8. 预览剔默认背面：`desk.locked` / 风格预览时 pool-mesh 跳过内置背面那一侧（先核 placements 的 side 机制）。
9. 格式：7.0 语义加一行、契约 §5.3 加注、冻结目录 7.0 `--force` 重打 + 新场景。
10. 守卫：identity-guard 加「内置 GUID 永不进材质表」「默认正面无第二表示（写出来的槽表里没有内置正面 GUID）」；bake 测试：三种侧组合各出几张面、法向朝对、UV 按侧；往返测试 brep → mesh → brep 两侧材质保住、双背面计数对；新面默认的确定性测试（同一 op 序列两次 → 同层）。
11. `20261026-pipelines.md` 文件 / 转换流程段；`gen-api.sh`。
**不在这张单**（材质纪元 / 功能账）：材质 `doubleSided` 字段、导入读材质和 doubleSided、面板勾选项（展开 / 合并）、修复工具「合并重合反向面」、OBJ 都留或都下（9.2½ ④）、两条烤路合一。

### 9.4 工作区
第三版草稿（`bake.ts` / `kinds.ts` / `orient.ts` / `write.ts` / `session.ts` / `objects/index.ts` + 混了草稿的 dist / index.html）作废，`git stash` 存着（stash 名「ID-2 第三版草稿（作废，meshToBrep 带材质可参考）」），工作区回到 4d851b6 之后的干净状态。

## 10. ID-2b 实施记录 + 审查看什么（2026-11-04，Claude Opus 5.5；分支 `identity-id2b`，从 main v0.18.30 开，未合、未推、版本号没动）

ID-2 第一半已按 9.1 合 main：干净重建 + 五个探针全绿，`--ff-only`，v0.18.30，没推。

**9.3 十一条的落点**：① `format/guid.ts`、`scene/builtin-materials.ts`。② 9.2-A 清单每处都改了，`stream-provider` 给内置 uid。③ 油漆桶「默认正面」「默认背面」两格；吸色吸到默认背面 = 设成那一格。④ `flipFaceSides`；`repairs/orient/`（`plan.ts` 纯函数）。⑤ `kernel/face-sides.ts`，`op-locks.ts withFront`。⑥ `scene/kinds.ts`。⑦ `format/bake.ts sideOut`、`exportSideCounts`、导出表单说明行、desk 1.4。⑧ `pool-mesh` + `stream-provider`。⑨ 7.0 语义写进 `migrate/index.ts` 和契约 §5.3。⑩ `test/face-sides.test.ts`、`identity-guard` 加一条。⑪ pipelines、gen-api。

**和 9.2 / 9.3 字面不一样的地方（要审）**：
1. **新面规矩的执行点在指令层，算法在 `kernel/face-sides.ts`**，不在 `faceLayers.applyEvents` 里：内核不知道哪个槽号是默认背面，槽表归 Scene。写默认背面要开槽，也只有指令层能做。
2. **推拉的 `front` 先定底面，再灌**：9.2½ ③ 字面是「BIRTH 的面看 `front`」，侧面各看各的相机会一半朝里。所以邻面给不出时：底面没朝向 → 按 `front` 定底面（那一侧涂过就不覆盖，只当灌的起点）→ 从它灌。**这会往一张旧面上写默认背面**：两侧默认正面的老面被推拉时。「有意的两面都出」被推拉也会这样，我判断可接受，请 Fable 看。
3. **`front` 只进工具这条路**（`toolCommit` 和 VCB 重画）：修复补洞、OBJ 导入喂线段、公开的 `Editor.commitOp`（探针、脚本）都不带。
4. **粘贴 / 炸开 / 镜像不跑邻面规矩**：9.2½ ③ 写「走邻面或载荷自带的层」。我只取「载荷自带的层」：两侧都是默认正面的面贴到有朝向的面旁边不被改，否则有意的两面都出一贴就没了。跟随、挪点跑邻面（不带 `front`）。
5. **并面不按边长投票**（9.2-D「实施时核」）：`applyEvents` 时死面的环已经没了。改成朝向跟第一张有朝向的面，和「取首个有值的」同一个规矩。内核靠 `faceLayers.backSlot` 认默认背面，`poolOf` 每条指令前设。
6. **两处 glTF 材质的 `doubleSided: true` 都删了**（工程文件和导出模型）：要出几侧就几张面之后不能再标。老文件重存字节会变（本来每次都重烤）。
7. **冻结目录没 `--force`**：desk 升 1.4，签名变了，自然是新目录 `v3.5.0-4.2.0-7.0.0-2.0.0-1.2.0-1.4.0-…`，多一个场景 `sided`；1.3 那份留着当语料。
8. **「网格体工作台灰掉」没做**：油漆桶只在表面模式（`SurfaceMode.kinds = ["brep"]`），网格体工作台到不了那个面板，加判断只会多一个 `modeId` 分叉（棘轮只准降）。
9. **「预设能覆盖」只留了接缝**：颜色在 `PALETTE.faceBack`，屏幕颜色在 `stream-provider faceColor` 一处。线稿之外的画风都不画默认背面，现在没有预设需要它，没加字段。
10. **网格体的槽表可能带内置那一格**：转网格体照抄槽表（往返要用），没有面引用它。
11. **统一朝向要求选中的面有朝向**：命令环境没有相机，两侧都不是默认背面时提示「分不出」，不猜。
12. 其他：`stream-provider` 构造函数改成普通字段（node 直跑不支持参数属性，测试要载它）；`opTouchesLocked` 搬到 `op-locks.ts`（9.1 ①），棘轮 4154 → 4149；格式体积预算 cylinder 6600 → 8400、folded 3200 → 3300（老式两面都出的场景翻倍）。

**审查建议看**：内置材质那十来处；`settleNewFaceSides` 的确定性；`bakeDefinition` 的绕向（`trisOf` 现在按法向对齐，`triangulateRings` 不保证）；`carryMeshSides` 切过的面用重心认三角。

**测过的**：`node test/run.mjs` 全绿（比 main 多约 50 条）。探针：新 `probe-default-back`（真矩形工具 + 像素：正面白模灰、背面灰蓝、演示锁和写实风格下背面露出后面的东西）；`probe-undo-fuzz 8 45`（加了翻面 / 涂背面 / 统一朝向 / 自动朝外四种动作，指纹含槽表和两侧）；跑了 46 个碰网格体 / 材质的探针。19 个老探针先搭没朝向的盒子再转网格体，按新规矩是 12 张面，setup 里加了一步「自动朝外」；另 `probe-clipboard` 的盒子带 `front`。
**没测到的**：真机和有头渲染；AO 深度那一遍仍看得见被剔的面（写实风格里影子可能对不上，没量）。
**不是这张单带来的红**：`probe-single-draw`、`probe-new-primitive` 在 main v0.18.30 的构建上也红（前者悬停软边的线组，后者菜单项数和提示行）。没修。

## 11. Fable 审 ID-2b（2026-11-04，Claude Fable 5.1；user「审」）

**结论：合。** §10 的 12 处全部接受。重点核过的三件：
- **内置材质碰的那十来处**（9.2-A 清单）：`materialOfSlot` / `slotsOf` / `slotGuids` / `read.ts matSeen` 预置 + 槽表读法 / `write.ts isBack` + `slotToCore` / `paintFaces` 放过 −2 / `purgeMaterials` 负值原样 / 三处 `slotFor` 重映射 −2 直通 / `materialUse` 的 `out[-2]` 跳过 / `codeOf` + `pastedMaterial` / `stream-provider` 内置 uid——都对。守卫还钉了「写的那一路源码不碰内置正面」。
- **新面规矩的确定性**（`kernel/face-sides.ts`）：候选按 id 排、按轮一起定、平票不写、T 字边不投；`front` 是写进 op 的方向，重放同结果。`viewDir(p)` = 从 p 望向眼睛，`fromFront` 的正负号对（探针像素也证了）。**§10 ②（推拉先按 front 定底面）接受**：被推的面搬走变成新实体的盖，盖的里侧写默认背面，是「拉成实体」的自然读法；有意两面都出的面被推拉后变单面，看得见、一步可改。
- **导出按侧出面的字节**（`bake.ts`）：`trisOf` 对齐 +n 后 side 1 反绕、法向取负（`+ 0` 收 −0 保字节幂等）、UV 按那侧的 `textureBasis`；省流档也分侧。`doubleSided: true` 两处都删了。

另外核了：翻面走 `IdMap` 日志（渲染会重画）；着色器 `c.r < 0 → discard` 本来就有（贴图那一侧的老机制），负颜色剔背面不用改 shader；镜像指令经 `transformSnapshot` 翻侧（DT8 老逻辑），镜出来的那份朝向对；kernel 级撤销记录带骨架，槽表随撤销回去；`exportPicks` 的 `def` 字段和 `exportSides(only)` 对得上。

**顺手修了一处**（随合入）：`FaceLayers.clone()` 没拷 `backSlot` → 预演影子（`shadowKernel`）并面时认不出默认背面，预演可能一闪两侧都背面、提交才对。一行。

**记账，不挡合**：
1. 预演不跑新面规矩（工具 `live` 直接调内核），松手那一刻背面才上灰蓝；只在拖的过程中能看见将成为背面的那侧时有一跳。
2. VCB 重画（`commitFront`）按当下相机算 `front`：画完转到另一侧再打尺寸，面会按新视角定朝向。存 `last.front` 复用更稳；先记。
3. 导出表单说明行走 `documentFromScene` 再 `countSides`，O(模型)，大模型开表单会顿一下；和 `scene/kinds.ts brepSideCounts` 是两份同义算法（隐藏面算不算不同）。以后合一。
4. **老文件重存会胖**：两侧都是默认正面的面烤成两层，烤的网格约翻倍（format 预算 cylinder 6600 → 8400 就是它）；点一次「自动朝外」就回来。设计后果（9.2½ ①「老文件一次性整理」），不是 bug。
5. `bornFaces` 的 ABSORB 把吞并方（可能是老面）标成新面；只在那张老面两侧都没写时才会被邻面规矩碰到。
6. 风格预览 / 演示锁下被剔的默认背面仍可拾取（演示锁本来拒改；风格预览里能选中看不见的面）。
7. `probe-single-draw` / `probe-new-primitive` 在 main 上就红（§10 已记），和这张单无关，另修。**`probe-render-baseline` 也有两张在 main 上就红**：`style-papercut-boxes`（11.3%，地上的遮蔽影子范围 + 面上一块十字残影）、`style-realistic-textured`（51%，两张贴图面 + 投影整片不同）——分支上重跑两遍、main v0.18.30 的包另起端口跑，像素差逐个一样 = 确定的、不是烘影子的时间飘，是基线比现在的渲染老。另 20 张 ≤ 0.2%。谁动过写实 / 剪纸的影子谁去对（T82 规矩：重冻要在第一刀日志写一行为什么）；这张单不重冻。**〔更正，Claude Opus 5.5 2026-11-04：「基线比渲染老」是错的，真因 = 探针截早了，影子还没烘，见 §13。〕**
8. user 11-04 在审查时拍的：「推拉一张没朝向的面会给它定朝向 同意」；「老文件 upgrade 用不智能，机械转比较安全对吧」= 对，打开老文件什么都不猜，想单面自己点「自动朝外」。

**合 main 的 ritual**（见下一行实施记录）：干净重建 → 探针（default-back / boot / export / clipboard / render-baseline / undo-fuzz）→ `--ff-only` → bump patch → `gen-api.sh`。不推。

## 12. ID-2c 收尾批（2026-11-04 夜，Claude Fable 5.1 定单；user 逐条拍了；Opus 施工，排在 ID-3 前面）

user 对 §11 记账的答复（原话）：「几个红的探针这次session修……应该交给opus就行」「预演不算两侧 think critically about it，然后我看sketchup是pull的一瞬间就有了」「大模型开导出表单会顿 记账，这次session做？」「转视角后打尺寸 做，必须做」「老文件重存会胖 没事」「风格预览里看不见的背面还能被选中 没事，expected behavior」。

**C1 预演 = 同一条指令在影子场景上跑（user「我觉得预演要做干净」，取代先写的「临时格号」做法）**。现状：`computeLive` 的 `run(fn)` 让工具直接在影子内核上调几何动词（`c.pushPull(…)`），提交时另造一条 op；两侧 / `front` / 镜像改写 / 锁 / 描硬边都只在提交那条路上，预演天然会和结果不一样。做法（一刀切过所有工具的预演路）：
- **影子场景**：`shadowScene = scene.cloneSkeleton()`（定义 / 实例 / 槽表拷贝，内核共享；核一下 `materialSlots` 是拷的——撤销的 `purgeMaterials` 靠它，应该是）+ 活动池的内核换成影子内核（`shadowKernel()` 那份，拷一次每帧倒回不变）。每帧：影子内核 `rewindTo`、骨架重拷（几百字节）。
- **工具不再拿内核**：`ToolHandler.live(ctx, preview)`，`preview(op)` → `Editor.previewOp(op)` = 和 `commitIn` **同一段前处理**（`withFront` → `mirrorRewrite` → 锁检查）再 `applyOp(shadowScene, op)`，返回事件。工具把这次手势造成 op 的那段代码只写一份（`opFor(gesture)`），预演 `preview(opFor(g))`、提交 `toolCommit(opFor(g))`。复制预演（`previewXform` 的载荷）= `absorb` op；挪点 = `move` op；子池 / 实例的整体变换照旧走叠加变换不进影子。
- **渲染**：provider 画影子那具身体时材质从影子场景取（`materialOfSlot` 的 scene 参数 = 影子场景；`setWorld` 多带一个影子场景或 WorldView 从它造）。槽表在影子副本上真开，**没有临时号、没有表外约定**。
- **网格体工作台**同一刀：`runMesh` 改成 mesh op 在影子场景跑（影子里的 `scene.mesh(def).kernel` = 拷贝）。Opus 看量，量大就第二步，但别留两种预演机制过夜。
- **守卫**：`test/preview-op-guard.test.ts`——`src/editor/tools/*.ts` 不出现内核动词（`.pushPull(` / `.addEdges(` / `.moveVertices(` / `.followMe(` / `.absorb(` / `.eraseEdges(` …）和 `run((c)`；预演入口只有 `Editor.previewOp`（同 step-pass 守卫的做法）。撤销 fuzz 每步加不变量：真身面层的槽号 < 槽表长度。
- **性能**：`applyOp` 比直调多一次坐标寻址（`resolveFace` / `resolveVertex`，id 表 O(1)；〔更正：`resolveFace` 当时是全表扫 O(面)，这张单一起改了，见 §13〕）；用 `bench-pools`（拖 200 盒）和推拉手势计时对照改前，不许退。
- 验收：探针 `probe-default-back` 加一段——矩形工具落第一点后、第二点悬停时（还没松手）从下面读像素是灰蓝；推拉拖到一半从外面看是白模灰、里面灰蓝；松手前后像素不变。预演失败（内核拒）照旧进黑匣子。

**C2 数值小窗重画复用第一次的 front**（user「做，必须做」）。现状：`commitFront` 每次按当下相机重算 → 画完转到另一侧再打尺寸，面翻了。做法：`toolCommit` 给 op 加 `front` 时同时记到这次手势的记录（`LastGesture` 加可选 `front`；记录由谁建就由谁带上）；`commitFront` 先用记录里的，没有（老复现包 / 没记录）才按当下相机算。单测：画一张面（front 朝上）→ 把 `frame().viewDir` 换成朝下 → VCB 重画 → 朝向不变。

**C3 导出表单的数直接在场景里数**（user「这次session做」）。现状：`session.exportSides` → `documentFromScene`（整个模型序列化一遍）→ `countSides`。做法：`scene/kinds.ts brepSideCounts(body, { skipHidden })` 一份算法两处用（转网格体 = 隐藏照算；导出 = 隐藏不算，和 bake 一致）；要数哪些定义 = 从根（或选中物件的定义）沿实例引用走一遍（`resources.ts` 有现成的活定义遍历，复用）。`format/write.ts exportSideCounts` 删或只留给测试；`test/face-sides.test.ts` 那几条改成走场景。O(面数)，不缓存。

**C4 红探针收尾**：
- `probe-single-draw`（悬停软边的线组）、`probe-new-primitive`（菜单项数 + 提示行）：先对照 0.18 的改动记录确认现在的行为是有意的（再点拿着的工具换做法 / 右键新建改过），是 → 改探针预期；不是 → 修 app。两种都在提交信息里写清是哪一种。
- `probe-render-baseline` 的 `style-papercut-boxes` / `style-realistic-textured`：**等 user 看图定哪张对**（已发「现在的画」和冻结原图）。〔结案，见 §13：不是谁对谁错，是探针没等影子烘完；user 看过等够之后的对比图「都用现在的」，两张都重冻了。〕现在的对 → `--update` 只重冻这两张 + 第一刀日志写一行「哪次改动动了影子」（`git log` 看 `ao-bake.ts` / `paper-shader.ts` / `pbr-shader.ts` / `env-sky.ts` 在基线冻结之后的提交）；原图对 → 找到那次改动修回来、基线不动。

**接受、不动**：老文件重存烤网格翻倍（user「没事」）；风格预览里被剔的默认背面仍可拾取（user「expected behavior」）。

做完：`node test/run.mjs` 全绿、`probe-default-back` / `probe-undo-fuzz 8 45` / `probe-boot` / `probe-render-baseline` 全绿，bump patch，回来给 Fable 看 C1 的提示怎么传、C3 两处共用那一份。

## 13. ID-2c 实施记录 + 审查看什么（2026-11-04，Claude Opus 5.5；分支 `identity-id2c`，从 main v0.18.31 开，v0.18.32，未合、未推）

**四件都做了。给 Fable 看的两处按 §12 末尾：C1 的提示怎么传（下面第 3 条）、C3 两处共用那一份（`kinds.ts brepSideCounts`）。**

**C1 预演 = 同一条指令**
1. 工具：`ToolHandler.live(ctx, preview)` 一个口（`liveMesh` 删了），造 op 只写一份（`opFor`，预演和提交都调）。硬表面 13 把、网格体 8 把都搬了。镜像会话 `cmdPreview` 也改成同一条 `mirror` op（`refreshCmdPreview` 不再 `kernel.clone()`，也吃上了倒回）。
2. `Editor.previewApply`：`withFront` → `prepareOp`（工作流亚种 + `mirrorRewrite`，从 `commitIn` 抽出来共用）→ 锁检查 → `previewableIn` 硬门 → `applyOp(影子场景, previewVariant(op))`。网格体多两步，和提交同一套：`mergeOp`、`meshSymmetrize`。`mirrorPreview` 删了。
3. **提示怎么传**：`mirrorRewrite` 不再自己写 `this.mirrorNote`，改成在返回值带 `note`，`commitIn` 才写；预演不写（每帧写就成了撒谎的披露）。锁着 = 预演不画、提示行说「已锁定」（`previewNote`，以前预演照画、松手才拒）。
4. 影子场景：`Scene.shadowOf(池, 影子内核)` = `cloneSkeleton` + 换活动池内核。`WorldView` 的 scene 用它（`liveScene`），provider 自然从它取材质。没有临时号。
5. 守卫 `test/preview-op-guard.test.ts`：工具里不出现内核动词 / `run((` / `liveMesh`；`applyOp` 在 editor.ts 只出现在 `previewApply`；硬门表；影子上跑完真身不动、结果 = 真提交；倒回后面层也回来。撤销 fuzz 加两条：每步面层槽号 < 槽表长度；新动作 `previewDrag`（真手势拖两下不落定，中途比指纹和槽表）。
6. 验收（`probe-default-back` ⑦⑧）：矩形第二点悬停时从下面读像素 = 灰蓝、落定前后不变；推拉拖到一半影子里全部朝外、真身还是一张面、侧面像素松手前后不变。**同一份探针跑旧 main 包这几条是红的**（证明探针抓得到）。

**和 §12 写的不一样、要过目的**
- **保留了一个差别**：`previewVariant` 给推拉带 `settleLanding: false`（落地不湮灭）。这是老设计：推平到底时压扁态还要看得见、吸得到（`test/pushpull.test.ts` 钉着）。一条 op 字段 + 一个函数，全家只此一处。
- **§12 说 `resolveFace` 是 O(1)，其实是全表扫 O(面)**，每帧走会变成新的「随模型涨」。改成只看第一个角上的面（挑号最小 = 和全表扫同一个结果；没找到再全表扫才报错，防 faceLinks 漏）。提交路也跟着快了。
- **硬门是我加的**（§12 没写）：影子场景只换了活动池的内核，别的池和真身共享，一条 `at` 写错的 op 就会写真身。`previewableIn` 白名单，缺 `at` 也不放（缺的语义是根池）。
- 手势转视角这一帧预演的 `front` 按当下相机算（提交也是这条）；松手那一刻提交带的是松手时的相机。只有转视角后没再动指针的那一帧能看到差别。
- 预演开了默认背面的槽、然后取消：那具身体的槽表签名变短，池网格全量重建一次。只在这个定义第一次出现默认背面时发生，接受。

**C2**：`LastGesture = GestureRecord & { front? }`，`toolCommit` 记下、`recordLast` 收进去，七处 `commitFront` 传 `L.front`。探针 ⑨：从上面画完转到下面打「3,3」朝向不翻；推拉同理（旧包这两条红）。

**C3**：`kinds.ts exportSideCounts(场景, only?)` + `brepSideCounts(body, { skipHidden })` 一份算法；`format/write.ts exportSideCounts`、`bake.ts countSides` / `noSides` / `SideCounts` 删了。比较按材质不按槽号（和 bake 看到的一样）。`resources.ts` 抽 `reachableDefs`，`liveDefs` 用它。

**C4**：`probe-single-draw`（v0.18.7 起软边进线块、由标记画 = 探针过时，改验「一遍」+ 画面确实变了）；`probe-new-primitive`（v0.16.43 起多了圆圈 / 方框 = 探针过时）；`probe-repair-panel`（ID-2b 加了「自动朝外」没改名单，这张单跑出来的）。**`probe-render-baseline` 两张：§11 说「基线比渲染老」是错的**，真因 = `commitOp` 从 v0.18.3 起每步都画 → 第一格烘了半成品影子 → 内容变了要停手 0.25 秒才重烘 → 探针 30 ms 就截。加 `waitShadows`。user 看过等够之后的对比图「都用现在的」，两张都重冻（第一刀日志 v0.18.32）。

**实测**（300 盒平铺、新旧包交替 4 轮、无头 swiftshader；单次 `bench-scene` 波动大，别信一次的数）

| 一帧中位 ms | v0.18.31 | v0.18.32 |
|---|---|---|
| 推拉拖动 | 58.4 | 56.6 |
| 全选拖动（2400 点） | 3034 | 2899 |

`bench-pools` 200 实例 / 大组：`dragPool` 31.8 → 25.5、8.8 → 7.9；`ppInPool` 38.0 → 42.8、33.6 → 24.6（单次，噪声内）。

**没做 / 记账**
- `probe-touch-stick` 在旧 main 包上同样红，没修：趴下头高约 1 秒到位、探针只等 0.4 秒；冲刺距离按墙钟量，无头帧率低就不够。判断 = 探针对机器速度敏感（看了数，没证完）。
- 全选拖动 2400 点一帧约 3 秒（新旧一样，这张单没引入）。大模型全选拖会很卡，值得单独量一次哪一步贵。
- `probe-render-baseline` 全跑要近 3 分钟，超过家规的一分钟。

**工作区**：分支 `identity-id2c`，等 Fable 审。`stash@{0}` 第三版草稿仍在、可丢。

## 14. Fable 审 ID-2c（2026-11-04 夜，Claude Fable 5.1；user「审」「之前opus审的也重新看一下推理一下」）

**合。** §13 和 Opus 自审标过「没问题」的那几条没有沿用，全部拿代码重推；加上它没核完的九处。没改任何文件。

**重推过、成立的**
- **影子写不到真身**：`Scene.cloneSkeleton` 的定义 / 实例表（含 `nextInst`）/ 组 / 槽表 / 材质表全是新对象，内核共享；`shadowOf` 只换活动池那一个内核。预演路上会写场景的只有两处——`sideNewFaces → s.slotFor`（拷出来的槽表 / 材质表）、`mirror` 的 `s.mintInstance` / `d.instances.delete`（拷出来的实例表）。`cmdPreview` 把 `instances` 清空、组件走 `cmdGhosts` 副本槽，不画两遍。`mirrorRewrite` 只读 `this.mirrors` / `this.scene`，不写编辑器状态；`meshMirrors` 共享但没有 op 写它。硬门 `previewableIn`：复制移动的预演 = `copyPayload` + `absorb`，和 `commitCopies` 同一条，`absorb` 在白名单、`at` 同池。
- **倒带完整**：`EdgeLayers` / `FaceLayers` 的集合带日志回调（`IdSet` / `IdMap`），`addEdges` 的 `harden`（`setEdgeLayer`）记进 `changes.e`，`restoreFromSource` 按 `ids.E` 恢复边层；`ChangeLog.since` 只在日志丢段时返回 null，空改动也走 `restoreFromSource` = 每帧新 rev，`worldView` 缓存键不会卡在旧帧。
- **C1**：提示只在 `commitIn` 写 `mirrorNote`；预演唯一会写的是「已锁定」`previewNote`，`computeLive` 拼进提示行。**C2**：七处 `commitFront` 都传 `L.front`（2887 / 2895 / 3002 / 3013 / 3026 / 3055 / 3068）；`this.last` 全是展开复制重建、朝向不丢；会带朝向的七把工具都调 `recordLast`。
- **一帧一次预演**：有两处 `preview(` 的三个工具（移动 = 复制 / 不复制、圆角矩形 = 两阶段、刀 = 环切 return 后才到切一刀）都是互斥分支。**`opFor` 同一份**：逐把看过，预演和提交调同一个造指令函数（推拉 / 挤出 / 线 / 矩形 / 圆 / 偏移 / 删 / 插入 / 圆角矩形）。
- `arcOp` 两条子指令都带 `at`；面表 `IdMap` 按 id 有序 + `resolveFace` 显式排序，「挑号最小 = 全表扫同一结果」成立；`meshSymmetrize` 原地改内核、`liveMesh` 不过期；`isFaceHidden`（`get("hidden") !== undefined`）与旧 `hidden[i] >= 0` 等价（hidden 只存 1）；`kinds.ts → resources.ts` 单向不成环。
- **`computeLive` 无条件调 `H.live`**（旧代码按身体种类分流、不匹配时是桩）：靠 I5 保证（根永远是 brep `Kernel`、`syncModeToKind` 住在写口、画前 `checkModeFits`）；自由建模的 `create` 预演 = `primitiveOp` → `meshAddPrimitive { def: activePool().def }`，在自由建模里活动池必是网格体。真漂移 = 每帧 `fail("preview")` 进黑匣子，是暴露不是回归。接受，不加第五层。
- 每帧骨架拷贝 O(定义 + 实例 + 组)：流程图追记第 3 条已写明随模型涨、和合成视图同量级；实测没退化（§13 表）。

**三处小修（Opus；同分支补一个提交 → v0.18.33 → 合 main，不推）**
1. **锁着时开镜像会话**（`editor.ts beginMirror`，`requireBrep` 之后）：以前预演照画、应用才拒；现在预演不画也没字——`previewNote` 只在 `computeLive` 的提示行里拼，`refreshCmdPreview` 不拼。改法：用提交同一把尺——造出这条 `mirror` op 后 `opTouchesLocked(this.scene, op, () => this.contextLocked())` 为真 → `host.hint("已锁定：解锁后再改（选中它 → 解锁）")`、return false、不开会话；`previewApply` 里那道锁检查保留（第二层）。守卫：`test/lock.test.ts` 加一条——锁着的上下文里 `beginMirror()` 返回 false、不开参数会话、提示含「已锁定」。
2. **`gestureFront` 的生命周期**：现在 `toolCommit` 在 `commitIn` 之前就写、只有 `recordLast` 清；提交抛错（`fail()` 不取消手势）/ 手势取消都不清。实际只会挂到不用朝向的记录上、`withFront` 对非 addEdges / pushpull 不理，无害但不干净。改法：`toolCommit` 改成提交成功之后再记（`const ev = this.commitIn(pass, op); this.gestureFront = frontOf(op) ?? this.gestureFront; return ev;`）；`cancelGesture()` 里加 `this.gestureFront = undefined`。不加测试（探针 ⑨ 盖住正路）。
3. **过时注释 / 死导入**：`tool-handler.ts:230`「Editor.previewOp」→「Editor.previewApply」；`editor.ts:2717` cmdPreview 注释「跑在活动内核的克隆上」→「同一条 mirror op 走 previewApply 在影子场景上跑」；`tools/mesh-create.ts:15` 去掉 `previewPrimitive`（现在叫 `primitiveOp`）；`tools/mesh-brush.ts:10` 去掉「（预演不画镜像那半）」（预演现在同样过 `mirrorRewrite`）；`tools/compass.ts:11` 的 `import type { Op }` 没用到——用它替换第 90 行的内联 `import("../ops.ts").Op`。

**验收与合并**：`npm run typecheck`；`npm test`（1564 + 新那条 + 红线守卫）；`node scripts/probe-boot.mjs`、`probe-mirror-xform`、`probe-mesh-mirror`、`probe-default-back`（⑦⑧⑨）、`probe-present-lock`；`src/version.ts` → `v0.18.33-2026-11-04`，dist 重建；CLAUDE.md 第 7 行状态改成「Fable 审过 = 计划书 §14，已合 main，没推」；合 main = `git checkout main && git merge --ff-only identity-id2c`，**不推**；丢 `stash@{0}`。流程图不用动（没改流程）。报告：改了哪几行、测试 / 探针各几绿、合到 main 的 commit 号。

**下一波 = ID-3（§3），Fable 先设计再派、不和这批混**（user 11-04「如果做下一波的话你要好好计划和观察设计一下」）。工单要覆盖：§3 ID-3 那段（`TransferPayload` v2、粘贴合并 §2.7、撤 `docEpoch` 拒贴、素材架 op + 资源页、素材导入别的 .catsup 的数据路、生死算上架子）+ §8「ID-3 注意」①②③ + §9 不挡合的三条里的 ②（上下文链里的实例被搬走 / 不在了 → 退到最近还在的那层）。写工单前先观察：现有 `transfer.ts` / `clipboard.ts` / `paste` op / `CATSUP_shelf` 读写 / `danglingShelfRefs` 各是什么形状。

**实施记录（v0.18.33，Claude Opus 5.5；user「开始做」「做好了合并main」）。三处都做了，和上面写的不一样的三点：**
- **测试没进 `test/lock.test.ts`，进了新探针 `test/probes/probe-mirror-locked.mjs`**：`Editor` 要真 canvas，node 单测造不出来（现有 import `editor.ts` 的测试都只读源码）。探针走真的 `beginMirror`：Ⓐ 站在组件里、这份被锁上 → 返回 false、不进会话、没面板、提示行说已锁定；Ⓑ 被拒不动东西；Ⓒ 解锁后同一个选区能开。**同一份探针跑 v0.18.32 的包是红的**（`ret: true, active: true`）。
- **`gestureFront` 按 `opCount` 判成功**：上面写的 `const ev = this.commitIn(...); this.gestureFront = ...` 起不到作用——`commitIn` 失败（锁 / 拒绝 / 回滚）不抛，只返回空数组，照那样写失败的方向还是会记下。改成 `n0 = this.opCount` 提交后比较。`cancelGesture` 清掉照做。
- **多收了一处**：「已锁定」这句已有三份（`editor.ts` 改实例 / 提交 / 预演），本来要加第四份 → `op-locks.ts LOCKED_HINT` 一份。`beginMirror` 里 `opOf` / `opts` / `vals` 提到 `cancelGesture` 之前，查锁用的就是真要提交的那条 op，被拒时手势和把手都没动。

**实际能碰到这条路的情形比 §14 写的窄**：`enterPool` 已经拒绝进锁着的实例，所以只有「人站在组件里、这份组件被别处锁上」才到得了（探针用 `commitOp setLocked` 造这个状态；界面上哪条路能做到这一步我没逐条核）。这条修是防线，不是常路。`editor.ts` 行数没长（4146，棘轮 4147）。

## 15. ID-3 设计 + 工单：跨文件粘贴 + 素材架数据层（2026-11-04 夜，Claude Fable 5.1；user「开始做设计吧」；Opus 施工，Fable 审）

> 观察过的形状（11-04，v0.18.33）：`editor/transfer.ts`（载荷 = 世界坐标值拷贝；`instances[].def` 仍是 `DefId`、`layer` 仍是层 id；面上编号 = 载荷 `materials` 对照表下标，ID-2 做的）· `editor/clipboard.ts`（内存一份 + `docEpoch`）· `ops.ts paste`（两种身体都接；`pastedMaterial` 按 GUID 对回、不在了带原 GUID 加回；`mintPasted` 直接用 `i.def` 句柄）· `editor.ts pasteClipboard / pasteNow`（`docEpoch` 不同 = 拒；`defs.has(i.def)` 两道检查）· `format/document.ts ShelfDoc`（`folders / items / extra`，kind 开放集）· `read.ts readShelf`（悬空丢格 → `notes.danglingShelfRefs`；太新 → 原字节带回、架子空 → `notes.shelfTooNew`）· `write.ts:192`（`doc.shelf` 非空就覆盖）· `scene.ts shelf`（`cloneSkeleton` / `clone` 都拷）· `scene/resources.ts`（`liveDefs` 只从根走；`materialUse.shelved` 已看架子）· `hierarchy-window.ts renderResources`（资源页：组件 / 材质两节 + 两个清理钮）· `history.ts SKELETON_OPS` · `editor.ts bump()` 已有 `validCtx`（换场景唯一入口里剪链）· `session.ts noteFormat`（只说 newerMinor / deskTooNew，**没说** shelf 的两条）· `scene-doc.ts:38` 根 guid 用 cast 盖。

### 15.1 设计决定〔Fable 定，user 可改〕

**A. 载荷 v2 = 摆放 + 闭包；闭包用文件形状。**
- `TransferPayload` 加 `closure: { definitions: DefinitionDoc[]; layers: LayerDoc[] }`，`materials: Material[]` 一张表兼两职（面上编号的对照表 ∪ 闭包定义槽表引用到的材质；整条含贴图字节）。闭包 = 被摆放的实例引用的定义，**递归**（它们的子实例 → 定义…），每条按 `documentFromScene` 的每定义写法出（`guid`、`materialSlots: (Guid|null)[]`、组 / 子实例带 GUID、mesh 走 `meshDocFromKernel`）。层 = 载荷里任何实例（含闭包内的）引用到的层，整条（guid / name / visible / color）。
- `TransferInstance.def: Guid`（原 `DefId`）、`layer?: Guid`（原 number）。散几何 / 组 / 面编号的形状不动。
- 为什么用文件形状：① 「素材导入别的 .catsup」拿到的就是 `readCatsup` 的 `DefinitionDoc[] / MaterialDoc[] / LayerDoc[]`，抠闭包 = 挑几条，不另造一套中间形；② 装进场景的代码和 `sceneFromDocument` **同一份**（抽成 `materializeDefinitions`，见 15.2）；③ 剪贴板「能序列化成 .catsup 片段」的留口自然成立。闭包里 mesh 的 typed array 和今天载荷里的 `BrepSnapshot` 一样进 op，撤销是快照不重跑，没有新问题。

**B. 粘贴 = 先合并三张对照表，再摆放**（§2.7 的规矩落成代码）。
- 顺序：材质 → 层 → 定义（槽表引用材质，实例引用层）。
- 材质：GUID 在 → 用它的下标；不在 → `addMaterial` 带原 GUID（`pastedMaterial` 已这么做）；内置背面 → −2，永不进表。
- 层：GUID 在 → 用它的 id；不在 → 加一层带原 GUID / 名 / visible / color（`nextLayer++`）。默认层是常量 GUID，自然合回。同名不同 GUID = 并排（§2.2）。
- 定义：GUID 在 → **用目标那条，不比内容**（user 11-04 拍「第一次新建，之后再贴只多摆一份」）；不在 → 按闭包建，**保留定义 / 它内部的组 / 它内部子实例的 GUID**（这是条目的内部结构，不是重复摆放）。后果写明：源文件改过而目标文件已有同 GUID 的 → 贴出来是目标那版；想要源文件那版 = 在源文件里「做成唯一」再拷。
- **摆放现铸 GUID**：贴到目标池里的顶层实例 / 组是新的摆放（拷一次贴两次不能同 GUID；剪切 + 粘贴 = 新身份，SketchUp 同款，ID-0 P3）。
- 环：`references(defOf(i.def), ref.def)` 照旧（闭包新建的定义来自别的文件，引用不到目标；同文件照旧查）。
- 同文件粘贴行为不变（探针 `probe-clipboard` ①–⑥ 必须原样绿）；多出来的只有「撤销过头后再贴」从静默串号变成按闭包重建（ID-0 §4 A / B 根治）。
- 提示行：「贴了 N…」+「用了本文件已有的组件「X」/ 材质「Y」」+「新建了组件「Z」」——编辑器在 `pasteNow` 前后比 `defs` / `materials` 的 GUID 集合算出来，op 不长通道。

**C. `docEpoch` 撤**：`canPaste = clipboard.has()`；`clipboard.doc` 和那句「跨模型拷贝还没做」删；`clipboard.set(p)`。剪贴板仍只在内存、不进系统剪贴板。

**D. 素材架动词**（全部 skeleton 级，进 `SKELETON_OPS`；`cloneSkeleton` 已拷 shelf）：
- `shelfPut { kind: "definition" | "material"; ref: Guid; folder: Guid | null; index?: number; guid?: Guid }`：ref 在场景里按 GUID 找得到才收（找不到 = `OpTargetError`）；同 kind + ref 已在架上 = 拒（提示「已经在素材架上」，不静默 no-op）；folder 不存在 = 拒；`guid` 缺 = 现铸（同 `addLayer`）；`index` 缺 = 追加。
- `shelfTake { item: Guid }`：只去引用，条目不删（§2.5）。
- `shelfMove { item: Guid; folder: Guid | null; index?: number }`：换文件夹 / 同夹排序（`items` 顺序有意义，§2.8）。
- `shelfFolderAdd { name: string; parent: Guid | null; guid?: Guid }` / `shelfFolderRename { folder: Guid; name: string }` / `shelfFolderRemove { folder: Guid }`：删非空文件夹 = 拒（「先搬空」）；parent 成环 = 拒。
- **太新的架子 = 本版只读**（§8 ①）：`Scene.shelfFrozen: Stamp | null`，`sceneFromDocument` 从 `doc.readNotes?.shelfTooNew` 设，`cloneSkeleton` / `clone` 拷；六条 shelf op 见它就拒；`write.ts` 照旧原字节带回（架子空、不覆盖）。资源页那节写一行说明。否决「合并」：两套写法谁对谁错没法机械判。〔Opus 11-04 施工更正：这里原写「本版只能看、不能改」——`read.ts` 里太新的架子是空的，本版**看不到内容**，所以文案改成「读不出、不能改、原样带回」；同样因为看不到，**清理没人用的组件 / 材质也拒**（不然会删到架上收着的东西），§15.3 第 7 条。〕
- **「进架必须命名」在动作层**（user 10-30）：物件动词「放上素材架」碰到 `isHex4(name)` → 先弹改名（复用 `main.ts renameSelected` 那套输入框），改完再 `shelfPut`；op 本身不管名字（机械）。材质没名字的同理（材质面板起的名本来就有）。
- **生死算上架子**：`liveDefs(s) = reachableDefs(s, [root, ...架上 definition 条目的 DefId])`；`census.live` 文案「孤儿」= 根和架子都够不着；`purgeDefs` 自然拒上架的。`materialUse.shelved` 已有。
- 架上条目的 ref 在会话里被清理掉 → 不可能（上架 = 活着 = 清理拒）；但「做成唯一」/「换种类」不改原条目 GUID，架子不受影响。

**E. 「素材导入别的 .catsup」= 同一条路**（§2.7 最后一条、§3 ID-3）：`payloadFromDocument(doc, pickedDefGuids): TransferPayload` = 没有摆放、只有闭包（递归定义 + 材质 + 层）→ `batch([ paste{at: 根, closure…}（纯合并、不摆）, shelfPut × N ])` 一步撤销。`paste` 允许「只有闭包、没有摆放」（`transferEmpty` 只管 `extract` 的空选区，和这里无关）。
- 入口第一版 = 资源页一个钮「从别的模型导入素材…」→ 系统文件选择器（`.catsup` / 老 `.glb` 工程；外来 glb 按 `isCatsupGltf` 拒、指去「导入 glb」；加密的复用 `session.ts:378` 那段解锁）→ 列定义（名字 · 身体种类 · 摆了几份，默认全勾）→ 合并 + 上架 → 通知「上架 N 个组件（新建 a 个、本文件已有 b 个）、带进 c 个材质 / d 个层」。
- 图库里直接挑文件不打开 = 图库今天没有这个界面；store 有 `docFile(path)` 能读字节，接在**素材抽屉那张单**里（记功能账）。

**F. 顺手三件**：§8 ② 披露——`session.noteFormat` 加两句：「素材架上有 N 格指向的东西已经不在文件里，这次打开丢掉了（保存后就没了）」/「这份文件的素材架是更新版写的（shelf x.y）：本版读不出架上有什么、也不能改，保存时原样带回；……这份文件里先不能清理」（Opus 施工更正）；§8 ③ `Scene` 构造器 `(rootKernel?, rootGuid?)`，`scene-doc.ts:38` 的 cast 删；§9.1 ② **不加代码**（`bump()` 的 `validCtx` 已是那道防线，`installScene → bump` 每次换场景都走），只补测试：站在实例 X 里 `commitOp moveInstance` 把 X 搬到别处 → 不抛、上下文退到父层、选区清、层级窗不炸；红了再修。

**G. 不在这张单**（记功能账 `20261103-forward-ledger.md`）：素材抽屉 UI / 拖出来 / 缩略图现场画；文件夹的界面（op 和测试这张做）；图库里挑文件；系统剪贴板；内容去重（已否决）；`materialIndexForPick` 同名并排命中第一条（ID-0 §6）= 施工时核一下写进报告，不改行为。

### 15.2 工单（Opus；分支 `identity-id3` 从 main v0.18.33 开；patch 版本；不推远端；headless）

1. **`scene-doc.ts`**：把 `sceneFromDocument` 的「按 GUID 建定义、装身体 / 组 / 子实例、槽表换算」抽成 `materializeDefinitions(scene, defs: DefinitionDoc[], matIndex: Map<Guid, number>): Map<Guid, DefId>`（已有同 GUID 的定义跳过、返回映射）；`sceneFromDocument` 调它；`Scene` 构造器收 `rootGuid`；`scene.shelfFrozen` 从 readNotes 设。读 → 写 → 再读逐字段一致的现有守卫必须绿。
2. **`scene.ts`**：`defByGuid(g)`、`materialByGuid(g)`（线性找，定义 / 材质都是几百量级）；`shelfFrozen`；`cloneSkeleton` / `clone` 拷它。
3. **`transfer.ts` v2**：`extract` 攒闭包（递归定义 → `DefinitionDoc`；材质整条；层整条）；`TransferInstance.def / layer` 改 GUID；`castPayload` / `localize` 原样带 closure；`transferSay` 不变。
4. **`ops.ts paste`**：加 `closure?`；`mergeClosure`（15.1-B 顺序）→ 三张映射；`mintPasted` 经映射；摆放现铸 GUID；只有闭包没摆放也合法。六条 shelf op + `SKELETON_OPS` 登记 + `describeOp`。`opTouchesLocked`：shelf op 不碰几何 → 和 `rename` 同列豁免（锁着的组件也能上架）。〔Opus 11-04 更正：这里原写「user 10-24 锁 = 不改几何」，这个出处写的时候没核过，撤掉；豁免的理由是推理：素材架只存引用、不碰几何，`rename` 已经是这样。〕`opTier` 对 `paste` 的分级设计时没核，施工核了 = `scene`（整份快照），闭包新建的条目一起撤。
5. **`clipboard.ts` / `editor.ts`**：撤 `docEpoch`；`pasteNow` 两道 `defs.has` 检查改按 GUID（闭包里有 = 不拒）；提示行算 reused / created。`editor.ts` 体重棘轮不许涨（提示行算法放 `transfer.ts` 纯函数 `pasteReport(before, after, closure)`）。
6. **`resources.ts`**：`liveDefs` 加架子根；`census` 加 `shelf: { items: …按 folder 树展开的顺序表 }` 给资源页用（纯函数）。
7. **物件动词**：`objects/verbs.ts` 加 `object.shelve`（「放上素材架」/ 已在架上时显示「从素材架取下」，`takesLocked: true`）；没名字先弹改名（动作层 `ask`）。
8. **资源页**（`hierarchy-window.ts renderResources`）：新节「素材架（N）」——按文件夹缩进列条目（组件 / 材质图标 + 名字 + 「取下」）；组件 / 材质行 meta 加「在素材架上」、行尾「上架」钮（材质上架的唯一入口）；底部钮「从别的模型导入素材…」（15.1-E）；`shelfFrozen` 时那节只读 + 一行说明。架子空时这节不出现。
9. **`session.ts noteFormat`** 两句（15.1-F）。
10. **测试**：
    - `test/identity-id3.test.ts`（node 直测，照 `identity-id2.test.ts` 的 `world()` / `guids()` 写法）：① 闭包完整（递归两层、材质含贴图字节、层）；② 跨场景粘贴：新建带原 GUID → 再贴复用、只多一份；③ 同 GUID 定义内容不同 → 用目标那份；④ 层：默认层合回、同名不同 GUID 并排、新层带原 GUID；⑤ ID-0 §4 A / B（撤销过头后粘贴：颜色是红不是蓝、组件是甲不是乙、GUID 同原来）；⑥ 摆放现铸 GUID（贴两次两份不同 GUID，定义同一个）；⑦ 六条 shelf op 正路 + 每条拒绝路 + 撤销 / 重做 GUID 不变 + 存 → 读架子顺序和文件夹保住；⑧ `liveDefs` 含架子、`purgeDefs` 拒上架的、取下后变孤儿；⑨ `shelfFrozen`：读 shelfTooNew 样本 → op 拒 → 写回 `CATSUP_shelf` 字节原样；⑩ `payloadFromDocument` + 纯合并 paste：上架 N 个、场景里没多摆东西；⑪ 构造器 `rootGuid` 读写不变。
    - `test/identity-guard.test.ts`：加「`transfer.ts` 的 `TransferInstance.def / layer` 类型是 Guid」（静态读源码，和现有守卫同法）。
    - 探针：`probe-clipboard` ⑦ 翻转（换模型再贴 = 贴上、组件带原 GUID 新建）+ ⑧ 再贴一次 = 复用只多一份 + ⑨ 站在实例里把它 `moveInstance` 搬走不炸（15.1-F）；新 `probe-shelf.mjs`：资源页上架 / 取下 / 没名字先弹改名 / 导入别的 .catsup（用 `test/fixtures/format/` 现有样本字节喂 `<input type=file>`）/ 太新架子拒放。`probe-undo-fuzz` 动作表加 `shelfPut` / `shelfTake`。
    - 全部现有测试 / 探针绿：`probe-boot` / `probe-hierarchy` / `probe-hierarchy-drag` / `probe-undo-fuzz 8 45` / `probe-present-lock`。
11. **文档**：流程图 `20261026-pipelines.md`「文件」/「粘贴」那两条追记（闭包合并一步、素材导入 = 读文件 → 抠闭包 → 纯合并 paste → shelfPut）；§5 提案 .h 的 transfer 块按 15.1-A 回写（下面已改）；CLAUDE.md 一行；`gen-api.sh` 重打；本节末尾加「实施记录 + 审查看什么」（和 §13 同形：改了什么、和工单不一样的、实测数字、没做的）。
12. **报告形状**：改了哪些文件、测试 / 探针各几绿几红、和工单不一样的地方逐条、Fable 审查重点（数据安全：合并顺序 / 摆放现铸 / shelfFrozen 不覆盖；撤销 GUID 不重铸）。

拍子：`CATSUP_shelf` 1.0 不动（没加键）；definitions 7.0 不动。**不冻新样本**。

### 15.3 实施记录 + 审查看什么（2026-11-04，Claude Opus 5.5；分支 `identity-id3`，从 main 04a0186 开，v0.18.34，未合、未推）

**做了什么**：`transfer.ts` 载荷 v2（实例按 GUID 引用、自带闭包）；`ops.ts paste` 先合并再摆放；六条素材架指令；`resources.ts` 活着算架子 + `shelfRows`；`objects/verbs.ts` 放上素材架 / 取下；`app/shelf-actions.ts`（起名、导入流程）；资源页素材架一节 + 上架钮 + 导入钮；`app/format-notes.ts`；`format/scene-doc.ts` 抽 `materializeDefinitions / definitionsToMake / definitionToDoc`；`format/guid.ts` 铸造录音带；`editor.ts` 撤拒贴（4146 → 4144 行）。

**和工单不一样的（逐条）**
1. **合并从根往下走，不是整包灌**（`closure.roots`、`definitionsToMake`）：工单写「不在就按闭包建」。目标已有旧版 A、源的 A 多摆了个 B：A 用目标那版、B 没人用，整包灌 B 就成了孤儿。现在走到已有的定义就停；素材导入没有摆放，`roots` = 挑中的。
2. **`materializeDefinitions` 吃 `materialOf` 函数 + `layerOf`，不是 `matIndex` 表**：材质 / 层只在真有新定义用到时才加进目标文件。工单的形状会把用不上的也带进来。
3. **`shelfPut / shelfFolderAdd` 的 `guid` 必填**（工单：可选、缺了落地时铸）：fuzz 抓到后面的 `shelfTake` 按它找这一格，落地时铸 = 重放对不上。
4. **铸造录音带（工单没有）**：`History` 提交时录下每条指令铸的 GUID，`stateAt` 重放放回（`format/guid.ts recordMints / replayMints`）。fuzz 加了拷贴之后抓到：`makeComponent` 等重放时铸出别的 GUID，后面按 GUID 认定义的 paste / shelfPut 找不到。这是新不变量「指令里能按 GUID 认条目」的代价。**ID-2 的 `pastedMaterial` 有同样的隐患**（当时 fuzz 没有粘贴，没暴露），一起管住了。局限：只有经 `History` 的重放有录音带；`test/history.test.ts` 那条序列化线协议的重放不带（今天没有带 GUID 引用的用例，联机那天要把录音带写进线协议）。
5. **`trimClosure`（工单没有）**：指令流永不驱逐，同一个文件贴一百次不能攒一百份闭包。进指令之前只留真要新建的定义；提示行用没剪的那份。
6. **`docEpoch` 没撤，只改用途**（工单 15.1-C 说撤）：同一个模型里贴，每次都说「用了本文件已有的」是噪音（同文件行为不变）；从别的模型拷来的必须说（不静默）。判别只能看「换过模型没有」：按根 GUID 判不行，「另存为」的两份根 GUID 相同、却可能已经改得不一样。拒贴和 `canPaste` 的判断已撤。
7. **太新的架子：文案改 + 清理也拒**（工单没写后半）。见 15.1-D 更正。这条是硬拦（`purgeDefs / purgeMaterials` 抛 `OpRejected`、按钮灰掉、说明为什么），数据安全理由；user 要改成警告可以改。
8. **导入列表不列没起名的组件**，数出来说一声（工单写「列定义，默认全勾」）：user 10-30「进架必须命名」；导入时逐个问名字也行，但第一版不做，理由是要改的是别人那份文件里的名字。它们作为挑中组件的子组件照样带进来。
9. **规矩拒绝新基类 `OpRejected`**（`ShearRejected` 改成它的子类）：commit 按基类进提示行、不弹错误胶囊。工单只说「明说拒绝」，`OpTargetError` 会走错误胶囊。
10. **起名不走 `Command.ask`**（工单写动作层 `ask`）：`ask` 只有确认框。`main.ts` 的 pick 拦 `action:shelve` → `shelf-actions.ts` 先问名字，再 `oneStep` 里 rename + `runAction("shelve")`。指令 `plan` 碰到没起名的只说「先改名」、不上架。「从素材架取下」是单独一条指令 + 动作（`object.unshelve`），不是同一个动词换字。
11. **两处老 bug（工单没有，fuzz 加了拷贴才抓到）**：把老组装进新组后子组编号比父组小。`paste` 一遍建完 = 报「group parent index out of order」（复制这样的组贴不了，10-28 起就有）；`makeUnique` 的 `cloneDefinition` 一遍建完 = 子组**静默丢掉父组**。两处都改成先建全部、再连父子（和 `makeComponent / explode / copyGroup` 同一个写法），各一条测试。
12. 工单没写、顺手定的：**模型根不能上架**；**纯合并的 paste 不看锁**（只加条目，不碰摆着的东西）；**文件夹「成环」只有重复身份一条路**（没有「搬文件夹」指令），拒掉重复身份即可；`shelfRows` 手改文件成环时没走到的排最后、不让东西看不见；`noteFormat` 搬进 `app/format-notes.ts` 好直测。

**实测**：单测 **1623 绿、0 红、4 todo**（`test/identity-id3.test.ts` 58 条，全是新的）；`redline-guard` 绿；`tsc` 干净；`editor.ts` 4146 → 4144 行。探针绿 11 个：`scripts/probe-boot`、`boot-smoke`、`probe-shelf`（新）、`probe-clipboard`（⑦ 翻转 + ⑧⑨）、`probe-hierarchy`、`probe-hierarchy-drag`、`probe-present-lock`、`probe-mirror-locked`、`probe-default-back`、`probe-mesh-workbench`、`probe-mesh-knife`。`probe-undo-fuzz` 8 × 45、16 × 45 绿（动作表加了 `copyPaste` / `pasteStale` / `shelfPut` / `shelfTake`，后一轮各真跑了 8 / 12 / 17 / 16 次；现在提交失败按指令统计、粘贴失败直接算红，唯一的提交失败是 fuzz 自己在网格体里 `addEdges`，老噪音）。24 × 60 那一轮撞了 500 秒上限（每步全量重放，越长越慢），不是失败。**红 4 个，不是这张单弄的**：`probe-cleanup` / `probe-fill-holes` / `probe-straighten` / `probe-resegment`，都断在 `menu: []`（查几何右键菜单有没有修复动作，修复动作早搬去修复窗了）；拿没改动的 main 04a0186 跑了同样 4 个，同样红、同样 `menu: []`。功能本身这 4 个探针的其余数据是对的。没重跑：`probe-touch-stick`（上一版就红、这批没碰）。性能（node，中位）：拷贝一份组件现在要序列化闭包：网格体 1 万面 8 ms、4 万面 31 ms；硬表面 2500 面 16 ms（以前 O(1)，随闭包涨，写进流程图）。同文件粘贴不多花（闭包全剪掉，0.1 ms 量级）。跨文件第一次贴：网格体 1 万面 27 ms、4 万面 76 ms；硬表面 2500 面 159 ms。

**核了、没改的**：`opTier(paste)` = scene，撤销不用动；`materialIndexForPick`（ID-0 §6）：涂材质按「名字 + 颜色 / 贴图字节」找第一条，跨文件带进来的同名同色材质（不同 GUID）并排时涂到第一条，行为没变，只是现在更容易碰到；`copy-payload.ts` 读了，是移动复制的几何载荷，和这张单无关。

**看见但没动**：`Scene.meshMirrors` 按句柄记、不进撤销：撤掉一个带对称设置的网格体组件后，下一个拿到同句柄的新网格体会继承那个设置（不是这张单引入的，粘贴让它多一条路）。打开时的披露走普通通知（3.5 秒消失），「素材架有 N 格丢了」只说一次，要不要常驻留给 Fable。

**没测到的**：真机；导入加密文件只跑到「解开、弹出挑选、取消」，确认之后走的是同一段；贴图很大时撤销栈和指令流占多少没量（材质表进指令是引用，不拷字节）。

**Fable 审查看什么**：① 合并顺序和「用目标那条」（`ops.ts mergeClosure`、`scene-doc.ts definitionsToMake`）② 摆放现铸、内部结构保 GUID（`mintPasted` vs `materializeDefinitions`）③ 太新的架子不覆盖 + 清理硬拦这个决定 ④ 录音带（`guid.ts`、`history.ts`）会不会漏进重放以外 ⑤ `trimClosure` 的重放等价性 ⑥ §15.3 第 6 条留 `docEpoch` 是否接受。
