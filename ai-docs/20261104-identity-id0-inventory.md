# 身份地基 ID-0：清点（哪里还按「第几个」引用 + 物品栏纪元事后审材料）

> created 20261104 by Claude Opus 5.5 · as-of dev v0.18.28（main 本地）· 配套 = `20261104-identity-foundation-plan.md` §3 ID-0、§6
> 读者 = 实施 ID-1…3 的模型 + 审 diff 的 Fable。user 看的是会话里的人话摘要。
> 方法：读代码 + 一次性探针实测（Scene / History / ops / transfer / format 真代码，node 跑；没走浏览器 UI，`Editor.pasteNow` 的检查是读代码确认的）。探针没进仓，要回归的已转成测试（`test/group-ids.test.ts`）或列在 §5。

## 0. 结论

1. 计划书方向没问题；**有 9 处和代码事实对不上或漏了（§5），其中 P1、P2、P3、P4、P5 不改的话 ID-1 / ID-2 当场卡住或静默错**。
2. 实测出两个现版本读文件 bug，已修（v0.18.28，单独提交）；两个撤销 + 粘贴串号的老毛病，换 GUID 后才能根治（§4）。
3. 「删一个材质后面全挪号」**现在不会发生**：全库没有删材质的路，只有 `materials.push`。号会被**撤销**回收，这才是现在真能发生的那一种（§4 A / B）。

## 1. 持久化或跨容器搬运的序号（①）

### 落盘

| 东西 | 代码 | 现在的形状 | 换 GUID 时 |
|---|---|---|---|
| `root` | `read.ts:83-85`（校验）· `write.ts:138,170,220` · `scene-doc.ts:33,83,102-109` | `CATSUP_definitions.root` = 下标；内存另有 `doc.rootIndex` + `doc.root` | 按计划 |
| 实例 → 定义 | `read.ts:118-121`（校验，缺 = 整份拒开）· `write.ts:111` · `scene-doc.ts:42,62,87` | `instances[j].definition` = 下标 | 按计划；校验语义保留 |
| **glTF 节点扩展 → 定义** | `write.ts:122` `instExt(definition)` | `CATSUP_instance.definition` = 下标，**只写不读** | **计划书漏了（§5 P4）** |
| 导出烘焙按下标走 | `write.ts:131-138,219-220,224,244,250` · `session.ts:950`（`ids.indexOf` 换成下标喂 `opts.only`） | `doc.definitions[下标]` | 换成 guid → 定义的查表，约十处 |
| 槽表 → 材质 | `read.ts:123` · `write.ts:73-76,115,224-227` · `scene-doc.ts:42,44,88,96` | `materialSlots[slot]` = 材质下标；越界读成 `-1` 占位 | **有占位（§5 P6）** |
| 材质表 | `read.ts:140-158` · `write.ts:54-66,208` | glTF core `materials[]`；`CATSUP_material` 1.1 起每条都挂，更老的纯色材质没有；只有带贴图时才 `migrateExtension` | GUID 放进这个扩展；没扩展的老材质现铸 |
| 组 | `scene-doc.ts:47-56,94` | `groups[j].id` / `parent`，实例 `parent` | 按计划 §2.4 |
| 实例 id | `scene-doc.ts:60-73,87` | `instances[j].id` | **老文件可能有重复，见 §5 P5** |
| 层 | `scene-doc.ts:35-37,70,103` · `ops.ts:160-162` | `layers[].id`；`instances[j].layer` | 按计划（`removeLayer` 按 id，不挪号） |
| 参考几何 | `document.ts:44` · `ops.ts:165` | `lines[].id` 等，池内局部 | **不动**：只被同一池的 `eraseGuides` 用，文件里没有东西引用它，不在家规「互相引用」的范围。计划书没提，这里写明 |

没有序号的：`desk`（`DeskDoc` 逐字段核过）、`references`（按路径）、缩略图。`final` 是老记录，只读写不重算。

### 只在内存（不落盘，但跨了容器或活得比一次撤销长）

| 东西 | 代码 | 形状 | 风险 |
|---|---|---|---|
| 剪贴板载荷 | `transfer.ts:21-23` · `clipboard.ts` | `def: DefId`、`mat` / brep 面层 = 材质下标、`layer` = 层 id | **撤销后串号（§4 A / B）** |
| 撤销记录 | `history.ts`、`scene.ts:258,281` | 场景拷贝连 `nextDef` 一起恢复 | 号被回收的来源 |
| 复现包 | `app/repro-box.ts` | 导出 JSON 里 `op`、`pool: {def, group}`；`replay-repro.mjs` 只在内核上重跑 | 低；换 GUID 后老包里 `paintFaces.material` 是数字，只影响调试 |
| 崩溃恢复 | `app/crash-store.ts` | 盲快照 = `writeCatsup` 字节 | 无：走正常读文件 + 迁移 |
| 层级窗展开 / 选区 | `hierarchy-window.ts:52` · `editor.ts` `i${id}` / `g${id}` | 只活这次 | 无 |

## 2. 冻结样本与守卫（②）

- 语料 `test/fixtures/format/`：22 个目录、1.9 MB；目录名 = 全部拍子的签名（`formatTag()`）。冻结 = `node scripts/freeze-format-fixtures.mjs`，只补不覆盖。
- 守卫 `test/format.test.ts:185-208`：当前签名目录必须有每个场景（没冻 = 红）；**每个目录的每个样本**：读 → 复原 → 指纹 = 当前同名场景 → 重写后语义一致。跟着跑 `npm test`，不需要起服务。还用语料的：`test/object-model.test.ts`、`probe-update-conflict.mjs`、`probe-render-baseline.mjs`。
- `sceneFingerprint`（`test/format-scenes.ts:197`）：含 `mat <下标>`、`slots=<槽表>`、面上的槽号；**不含**组 / 实例的 id。所以运行时材质留数字句柄的话老语料守卫一个字不用改（§5 P1 的论据之一）。
- 逐字节幂等（`format.test.ts:31,176`「再 write 逐字节一致」）：GUID 读写稳定就过。**老文件每读一次现铸**，所以别的测试不能拿两次读同一老文件比字节。
- 体积预算（`format.test.ts:13`）只管单池场景（`box` 等），每条定义多 36+ 字符、多一层键，**可能撞预算**；撞了照例抬并写理由。

## 3. 物品栏纪元 v0.18.0–19 身份路径（③ = 事后审材料）

| 路径 | 代码 | 测试 | 审计 |
|---|---|---|---|
| 炸开 / 合并不删定义 | `ops.ts:610` 全家唯一 `defs.delete` | `test/orphan-defs.test.ts`（4 条，含结构守卫） | ✓ |
| 资源页清点 | `scene/resources.ts` · `hierarchy-window.ts:205-216` | `test/resources.test.ts`（3） | ✓ 组件；**材质只数活着的组件，被孤儿用着的算「没人用」→ §5 P8** |
| 活不活 | `resources.ts:33` `liveDefs` 只从根走 | 同上 | ✓ 现状；素材架来了要加根（计划书已写） |
| 清理孤儿组件 | `ops.ts:607-610` `purgeDefs`，单子里有活的整条拒 | `orphan-defs` | ✓ |
| 拖拽换父亲 | `object-tree.ts:131` `reparentOp` = `batch(eraseInstance + paste)`；`tree-drag.ts` 判落点 | `test/object-tree.test.ts`（8）· `probe-hierarchy-drag.mjs` | **实例换了新 InstId，身份没保住 → §5 P3**（回答计划书 §6 第 1 问） |
| 四位短码 | `config.ts:32` `hex4()` 随机；**就是 `name` 的值，存进文件**；`object-tree.ts:39` `isHex4` 判「没起名」；调用 `main.ts:354,473,480,1488`、`session.ts:118` | `object-tree` | **没有独立字段 → §5 P7**（回答 §6 第 2 问） |
| 标为素材 / 素材架 | **一行代码都没有**（只有 `resources.ts:5` 的注释） | — | 符合计划（ID-3 做） |
| 撤销 fuzz | `probe-undo-fuzz.mjs:17` 指纹 | — | **不核材质表**（回答 §6 第 3 问）；ID-2 加 |

## 4. 实测（④）

| # | 动作 | 应该 | 实际 | 处理 |
|---|---|---|---|---|
| A | 新建红、涂面、拷贝 → 撤销到红没了 → 新建蓝 → 粘贴 | 红，或拒绝 | **静默变蓝**（蓝拿到了同一个号） | 留给 ID-3；载荷按 GUID 后根治 |
| B | 建组件甲、拷贝实例 → 撤销到甲没了 → 建组件乙 → 粘贴 | 甲，或拒绝 | **静默摆成乙**（`pasteNow` 只查「号还在不在」） | 同上 |
| H | 两个组删第一个 → 存 → 读 | 一个组 | 同一个组两份；文件 3520 → 4428 B；再删只掉一份，第二份删不掉且再点报错 | **v0.18.28 已修** + 自愈老文件 |
| G | 网格体组件里藏着的实例 → 存 → 读 | 还藏着 | 露出来（硬表面正常） | **v0.18.28 已修** |
| I | 0.18.x 读到面层 `0xFFFE` | 不炸 | 不炸；显示默认材质；**写回还是 `0xFFFE`** | 比计划书 §2.9 写的好（它说「映成 −1」，实际只是解析时查不到；走拷贝路径才会压成 −1） |

A、B 的前提是「拷贝后撤销到创建之前、再新建同类、再粘贴」，不常见，但属于家规「不许静默贴错」。没做临时补丁：不用 GUID 的话没有干净的判据。

## 5. 计划书要改的地方（提案，待 Fable 门审；user 可推翻）

**P1 材质运行时也留数字句柄，不改 `Map<Guid>`。** 计划书 ID-1 同时写「`materials` 改 Map」和「不动编辑器行为、全部测试绿」，做不到：`.materials` / `materialSlots` 全库 85 处，`ops.ts` 12、`scene.ts` 15、`transfer` / `resources` / `editor` / `stream-provider` 都吃数字；`faceMat` 是 i32，`slotFor(material: number)`。提案：和 §2.1 对 DefId 同一个办法——运行时材质 = 稳定数字句柄 + `guid` 字段，文件边界换算；为了将来能删，存成 `Map<number, Material>` 或数组留洞都行（ID-2 决定）。好处：ID-1 真能零行为变化、老语料守卫不用改、`-1` / `-2` 语义不用碰字符串。家规管的是文件，不管运行时。

**P2 载荷里面上的材质不能写 GUID 字符串。** §5 写 `面材质 = Guid | null | "none"`、`mat: Guid | null`，但 `BrepSnapshot.faceLayers` 和 mesh `faceMat` 都是数字，`castPayload` 还靠「槽表给空、faceMat 里就是材质 id」（`transfer.ts:106`）。提案：载荷带一张 `slots: (Guid | null)[]` 对照表，面上留代号，贴的时候 `代号 → guid → 目标槽号`。这正好就是家规「编号只能是对照表的代号，拷贝时合并再对上」。

**P3 换父亲不能走粘贴。** 现在 = 删 + 贴，实例换新号；铸 GUID 后等于换身份，直接违反 §4 守卫 2。提案：新 op `moveInstance(fromDef, inst, intoDef, xform, index?)`，同级排序（§2.3 `reorderInstance`）是它的特例，合成一条；走骨架级撤销，比现在 `batch` 的整份快照还省。剪切 + 粘贴照旧 = 新身份（SketchUp 同款）。

**P4 `CATSUP_instance.definition` 也是下标，§2.10「其余不动」漏了。** 只写不读（`read.ts` 不碰节点扩展），但身份守卫 §4.1 的「写入器不再按下标引用」过不了。提案：改写 GUID，拍子按规矩算 major 2.0；旧版不读这个键，不影响打开。

**P5 迁移链现在做不了这一步，要改两处。**
- `migrateExtension` 的 step 只收自己那段 JSON（`migrate/index.ts` `step(cur)`），而 definitions 6→7 要材质和层的 GUID；`read.ts` 还是先读定义（:83-134）后读材质（:140）。提案：先铸材质 / 层 GUID，step 多传一个上下文。
- **老文件去重必须在铸 GUID 之前做。** 6.x 文件可能有同 id 重复的实例（10-25 前的旧 bug）和重复的组（到 v0.18.27 为止的 bug），现在靠「同 id 后写覆盖先写」自愈；铸完 GUID 它们就成了两条不同的东西，永远合不回去。`v6-to-v7` 第一步按旧 id 去重（留后写的），加样本 + 测试。

**P6 `materialSlots` 类型要 `(Guid | null)[]`。** 现在越界读成 `-1` 占位，占位不能压缩掉（面上的代号指着位置）。§5 的 `MaterialId[]` 放不下。

**P7 删掉 §2.1「显示码 = GUID 前四位」那句。** 短码没有独立字段，就是 `name` 的值；老文件的名字本来就和 GUID 对不上，新建时 `hex4()` 又先于 GUID。两套来源没好处；`hex4()` 照旧，它本来就只是名字。

**P8 材质清理要算上孤儿组件。** `census` 只数活着的；清掉只被孤儿用的材质，孤儿的槽表就悬空，以后捡回来颜色没了。提案：清理材质时一并数孤儿（说「用在 N 个没人用的组件里」），或要求先清孤儿。ID-2。

**P9 「这一侧没有表面」现有代码的坑（ID-2，都会把 −2 静默变成默认材质）。**
- `brep-codec.ts:267,272` `some(v >= 0)` 才保留层 → 全是 −2 的层整个丢。
- `scene.ts:413` `remapSnapshotMaterial` 所有负数压成 −1；`transfer.ts:62,71`、`ops.ts:471,878,936` 同理（拷贝、炸开、合并都走它）。
- `bake.ts:164,262` 按 `slot >= 0` 判，−2 会当默认导出。
- **`bake.ts` 只看正面层，根本不导背面**。§2.9「两侧各自朝外导出」是新功能，不是加个过滤。
- `kinds.ts` `brepToMesh`「材质槽照抄正面那槽」：正面没有表面时转网格体要定规矩。

## 6. 还要回归的

ID-3 把 §4 A、B 写成测试（撤销过头后粘贴：按闭包重建或如实拒绝，绝不串）。`materialIndexForPick`（`editor.ts:2611`）按名字 + 颜色 / 字节复用材质 = 颜料 → 文档材质，不是跨文件合并，不违反 §2.2，保留；ID-3 时核一下「同名并排的两条，颜料命中第一条」符不符合预期。
