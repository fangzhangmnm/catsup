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
- **转换（硬表面 → 网格体）和导出走同一条「烤成网格体」的路**，每张膜的每一侧独立判，**没有「封闭壳 / 实体」的概念**（user「硬表面里面对象是片而不是体」——方块也只是六张片围起来，里面那一侧和外面一样真实）：
  ① 涂了 = 存在。
  ② 没涂的那一侧：按文件记一个开关「也导（默认色）/ 不导」，默认「也导」= 和编辑器一样什么都不消失；要单面墙 = 这份文件切「不导」，哪面涂了哪面在。两侧都没涂（白模）→ 一张面、材质标双面，里外都看得见。
  ③ 两面涂了不同材质 → 问一次「出双面（两张面背靠背，各自单面）/ 只留正面」；导出和转网格体同一个问法（user「转和导出对齐」）。
  导出时如实报数（N 张面只导了涂过的一侧 / 丢了背面）。
- 网格体 → 硬表面：那一侧 = 它的材质，另一侧默认（灰蓝背面色 = 「你在看背面」）；网格体 → 硬表面 → 网格体不丢。
- 法向一致化（`scene/kinds.ts` + `mesh/ops/orient.ts`）只负责两侧长得一样时给面挑个方向，不决定什么存在。
- 根子上的语义空洞 = 默认色分不清「没碰过」和「我就要默认色」，所以用按文件的开关，不是每张面的旗子。以后可加「引擎预览」视图开关（编辑器里直接看引擎看到的）= wishlist。
- 现状差距（ID-2 做）：`bake.ts` 只导正面层、从不导背面；`brepToMesh` 材质槽照抄正面槽、不问。

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

**ID-2 运行时换身份 + 有序表 + 导出背面**：槽表 / 油漆桶 / 材质面板 / 载荷 / `paste` op / 资源页按 GUID；「清理没人用的材质」动词（§8 定了删法）；`moveInstance` op（换父亲保身份 + 同级排序，§8）+ 层级窗拖一行到同级某位置；烤 / 导出 / 转网格体按 §2.9 新规矩（导背面、按文件开关「没涂的背面也导 / 不导」、「两面不同材质：双面 / 只留正面」一问、如实报数）；撤销 fuzz 加「GUID 不重铸」核对；更新 `20261026-pipelines.md` 的文件流程段。

**ID-3 跨文件粘贴 + 素材架数据**：`TransferPayload` v2（闭包、GUID）、粘贴合并（§2.7）、撤 `docEpoch` 拒贴；素材架：标为素材 / 取下 / 建文件夹 / 改名 / 排序的 op + 资源页里能看见架上有什么（抽屉 UI 不在这张）；「素材导入别的 .catsup」的数据路（读文件 → 闭包 → 合并 → 上架），入口先放资源页一个钮；生死算上架子。

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

// src/editor/transfer.ts（v2）
export interface TransferInstance { parent: number | null; def: Guid; xform: Xform; name?: string; locked?: boolean; layer?: Guid | null; hidden?: boolean }
export interface TransferPayload {
  from: BodyKind; brep?: BrepSnapshot /* 面材质 = Guid | null | "none" */; groups?: TransferGroup[]; mesh?: MeshFragment /* mat: Guid | null */; instances?: TransferInstance[];
  defs: TransferDefinition[];        // 闭包：{ guid, name, kind, body 快照, materialSlots: Guid[], guides, groups… }
  materials: Material[];             // 闭包，整条含贴图字节
  layers: LayerDoc[];                // 闭包
}
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
③ 导出 / 转网格体按 §2.9 新规矩（含导背面；`bake.ts` 现在只导正面）。

**ID-3 注意**：① 太新的架子（原字节带回）+ 本版又往架子放东西 → 谁赢要定（现在 `write.ts` 是本版的覆盖原字节）。② 读时丢掉的悬空格（`danglingShelfRefs`）要在界面披露一次，不许只记 notes。③ `sceneFromDocument` 用 cast 覆盖根的 guid，`Scene` 构造器收 `rootGuid` 更干净（顺手）。

