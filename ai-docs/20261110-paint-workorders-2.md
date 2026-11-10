# 贴图主线施工单（二）：贴图成为独立的条目

> created 20261110 by Claude Fable 5.2 · as-of 三维 v0.18.50 · 2026-11-10 深夜
> 给谁：Catsup小弟。**先别动**：等 Fable 发消息放行。排在 0-1 审过、合进 main 之后（这一张从带着 0.19 的 main 开分支）。
> 这是施工方案第三节的 1-0½。依据是 `20261110-painting-data-contract.md` 第 4 版（user 逐条点过头）；这一页和那一份不一样的地方，以这一页为准，Fable 会把那一份改齐。
> 这一张改存盘格式。照规矩在分支上做（分支名 `textures-table`，开在副本文件夹 `.claude/worktrees/textures-table`，做法见施工单（一）最前面那一节），停在分支等 Fable 审过再合。

## 要达到什么

现在一张图是嵌在材质里的（`Material.texture`）。做完之后：

- 文件里和内存里都有一张**贴图表**，一行一张图，有自己的 GUID。
- 材质不再装图，改成一张小表 `channels`：通道的名字 → 贴图的 GUID（一摞，这一版只放一张，只用 `color` 这一个名字）。
- 老文件打开时，嵌着的图自动搬进贴图表。
- **用起来和现在一模一样**：导入一张图、涂到面上、吸色、撤销、存盘重开、跨文件粘贴、导出模型，样子和手感都不变。这一张不加任何画画的功能，不碰贴图坐标，不碰网格体的格式。

为什么先做它：后面「画」就是贴图表里的一行，材质用同一张小表指向它。只留一种「一张图」的写法，不留两套。

## 一、文件里的形状（Fable 定的，照做；觉得不对停下来说）

新的顶层扩展 `CATSUP_textures`，拍子 1.0。表是空的就不写这个扩展。

```jsonc
"CATSUP_textures": { "version": 1, "list": [
  { "guid": "…", "name": "格子",
    "value":   { "kind": "color" },
    "content": { "kind": "image", "mimeType": "image/png", "bytes": { "bufferView": 7 } },
    "sizeM": [0.5, 0.5] }
] }
```

材质（`CATSUP_material` 1.2 → 1.3，minor）：

```jsonc
{ "name": "格子",
  "pbrMetallicRoughness": { "baseColorFactor": […], "baseColorTexture": { "index": 0 } },   // 标准那一半，照现在的写法
  "extensions": { "CATSUP_material": { "version": 1, "minor": 3, "guid": "…",
    "channels": { "color": ["<贴图的 guid>"] },
    "sizeM": [0.5, 0.5] } } }                                                               // 只是给老版本看的回声，见下
```

逐条：

1. **图的字节只存一份。** 贴图表那一行用 `{ "bufferView": N }` 指着它；标准那一半的 `images[]` 那一条指同一个 `bufferView`。必须是 `{ "bufferView": N }` 这个形状、不许写成图片的下标：老版本不认识这个扩展，会把它原样带回，带回的时候只会改 `bufferView` 的号（`carry.ts`），图片下标它不会改，存回去就指错图了。
2. **`content` 有三种**：
   - `image`：原图。上面那样。
   - `layered`：分层的画，`{ "kind": "layered", "ora": { "bufferView": N } }`。这一层不解释里面的字节。这一版没有任何入口会造出它；读得进、写得回、显示成灰色占位就行。
   - 不认识的 `kind`（更新的版本写的）：这一行的 JSON 和它指着的字节原样带回，显示成灰色占位，`readNotes` 记一笔。
3. **`value`** 是普通 JSON，原样带。这一版只会写 `{ "kind": "color" }`。
4. **`sizeM` 和 `layout` 正好有一个**：自由的图带 `sizeM`（两个数都大于零）；单品的画带 `layout { definition, uvSet }`（这一版没有入口会造出它，原样带）。两个都有或都没有 → 读取失败，报清楚是哪一行。
5. **材质扩展里的 `sizeM` 只是回声**：老版本（1.2）从这里读尺寸，读不到会当成一米。所以照写，值等于颜色那一槽最上面那张自由的图的 `sizeM`。新版本读的时候，有 `channels` 就不看它。在 `migrate/index.ts` 的头注释里写明这一条。
6. **`channels` 的名字是开放的**：不认识的名字原样带回。一摞是空的就不写那个名字；一个名字都没有就不写 `channels`。
7. **表里的先后没有意思。** 行里不认识的键原样带回。
8. **整个扩展的大版本比本版新**：不拒绝打开（和桌面态、参考窗、素材架一样）。扩展原样带回；材质的 `channels` 原样带回；那些材质先按底色显示；`readNotes` 记一笔。标准那一半这次不写这些材质的图（真相在带回的扩展里）。

## 二、读老文件

- 材质扩展里有 `channels`：照它来，不看标准那一半的 `baseColorTexture`（那是给别的软件看的派生物）。指着的 GUID 不在表里 → 这一槽当空的，`readNotes` 记一笔，不猜、不造。
- 材质扩展里没有 `channels`、但标准那一半有图（1.2 和更老的文件；或者被老版本存过一遍的新文件）：现铸一个 GUID，在贴图表里加一行（名字用材质的名字，`value` 是颜色，尺寸用材质扩展里的 `sizeM`，没有就是一米），材质的 `channels.color` 指向它。两个材质各有各的图，就是两行，不按内容合并。
- 写进 `migrate/material.ts`，和别的迁移住一个文件夹。

**已知的代价，照实写进头注释**：新文件被老版本打开再存一遍，老版本会重写材质扩展、丢掉 `channels`，贴图表它原样带着。再用新版本打开，材质会得到一张新身份的贴图，表里原来那一行变成没人用的孤儿。图不丢，身份号换了，多一行孤儿。这是那份数据格式里说过的「它存回去贴图的身份号会换一个，内容不丢」。不要为了避免它去按内容认图（按内容哈希当身份，全家族否决过）。

## 三、内存里

- `Scene` 多一张贴图表，和材质表同样的规矩：条目不可变，改 = 换一个对象；撤销的快照浅拷这张表。
- `Material.texture` 删掉，换成 `channels`。
- **问「这个材质用哪张图」只有一个口**（比如 `scene.colorMapOf(material)`，名字你定）：这一版 = 颜色那一槽的第一张，而且它是原图；不是就返回空，按底色画。全仓现在读 `.texture` 的地方（下面那张表）都改成问这个口。
- 这个口在每张面上都会被问（`pool-mesh.ts`、`stream-provider.ts`），所以必须是查表，不许每次扫一遍贴图表。
- `ImageAsset` 这个类型退役；`PaintPick` 的形状不动（它是「手上蘸着的」，还没进文件）。

## 四、要改的地方（Fable 读代码数出来的，你动手前再搜一遍）

| 在哪 | 现在 | 改成 |
|---|---|---|
| `format/document.ts` | `MaterialDoc.texture`、`ImageAsset` | `TextureDoc`、`MaterialDoc.channels`、`CatsupDocument.textures` |
| `format/migrate/index.ts` | 拍子表、顺序表、头注释 | 加 `CATSUP_textures` 1.0；`CATSUP_material` 1.3；头注释各记一笔 |
| `format/read.ts`、`write.ts`、`scene-doc.ts` | 材质里读写图 | 贴图表读写；材质读写 `channels`；标准那一半照写 |
| `format/write.ts` 的 `writeGltfModel`、`bake.ts` 的 `sizeOfCore` | 从材质拿图和尺寸 | 从那个口拿 |
| `format/entry-kinds.ts`、`entry-canon.ts` | 定义、材质、层三种条目 | 加第四种「贴图」（那个文件头上早就写着「加一份声明，不加算法」）；材质的 `refs` 和 `rewrite` 带上它指着的贴图 |
| `format/scene-store.ts` | `sceneStore`、`docStore`、`applyPlan` 只认三种 | 认第四种；落地时贴图排在材质前面；材质的用量照旧，贴图的用量 = 几个材质指着它 + 素材架收没收 |
| `scene/scene.ts` | `Material.texture` | 贴图表 + `channels` + 那个口 |
| `scene/resources.ts` | 只清点定义和材质 | 也清点贴图（谁用着、是不是孤儿） |
| `editor/ops.ts` | `addMaterial` 带着图 | 新指令 `addTexture`；`addMaterial` 带 `channels`；新指令 `purgeTextures`（全仓唯一删贴图的地方，被指着的不许删） |
| `editor/editor.ts`（三处） | 蘸的材质找同名同图的 | 先找同一份字节、同尺寸的贴图（没有就 `addTexture`），再找同名、指着它的材质（没有就 `addMaterial`）。两条指令在同一步里。**行数棘轮只许降** |
| `editor/pool-mesh.ts`、`stream-provider.ts` | 读 `m.texture` | 问那个口 |
| `minccino/contract/stream.ts` | `MaterialRef.texture` | `MaterialRef.map?: TextureRef`（`mimeType`、`bytes`、`sizeM`）。渲染器不认识场景，由 `stream-provider` 把图给它 |
| `minccino/providers/three/render3.ts` | 解好的图按材质对象缓存 | 按贴图对象缓存（两个材质用同一张图，只解一次）；材质的着色器对象照旧按材质缓存 |
| `app/main.ts`（材质色板）、`app/paste-actions.ts`（粘贴撞车那一行） | 读 `m.texture` | 问那个口；粘贴撞车时贴图自己也会成一行，显示名字和尺寸 |
| 资源页 | 列定义和材质 | 多一节「贴图」：名字、尺寸、几个材质在用；没人用的可以清理。第一版，摆法以后磨 |
| `test/format-scenes.ts` 等用到 `addMaterial … texture` 的测试 | | 跟着改 |

资源页那一节不能省：以前清掉一个材质，它的图跟着没了；现在图是独立的条目，清掉材质之后图会留在文件里。家规是「没人引用的进孤儿面板，不许哪个动词顺手删掉别的条目」，所以清材质不许顺手清图，要给用户一个看得见的地方自己清。

## 五、门

1. `npm test` 全过；`tsc` 干净；截图基线照过（尤其 `box-textured`）；`editor.ts` 行数没涨。
2. **老文件**：现有冻样本里带贴图的那些（比如 `painted.glb`），读进来贴图表里有对应的行、材质的 `channels.color` 指着它、面上的样子不变。
3. **写两遍一样**：带贴图的场景，写出来、读回去、再写，两次的字节相等。
4. **不带贴图的文件**：写出来没有 `CATSUP_textures`；和改之前比，只有材质扩展的拍子从 1.2 变成 1.3。
5. **导出模型的字节不变**：动手之前，先用现在的代码把一个带贴图的场景导出一份、冻成样本；改完之后同一个场景导出来，逐字节相等。
6. **拿老版本的真代码当读者，做一次，把结果写进记录**（不用进测试套）：用 v0.18.50 的格式层打开一份新版本写的带贴图的文件，确认它能开、图和尺寸对；让它存回去，再用新版本打开，确认图不丢，并且正好是第二节说的那个代价（新身份 + 一行孤儿），没有别的东西坏。
7. **新测试**：
   - 两个材质指同一张贴图：存盘重开还是同一张；渲染器只解一次。
   - 不认识的 `content.kind`：整行和字节原样带回。
   - `sizeM`、`layout` 都有或都没有：读取失败。
   - `channels` 指着不存在的 GUID：这一槽空着，`readNotes` 有记录。
   - 清掉材质之后贴图还在，资源清点里它是孤儿；`purgeTextures` 能清它，不能清被指着的。
   - 跨文件粘贴带贴图的组件：贴图跟着过去，GUID 不变；目标文件里已经有同一个 GUID 而内容不同，走现有的撞车询问。
   - 撤销、重做「第一次把一张图涂到面上」：一步撤干净（贴图和材质都没了），重做回来 GUID 和撤销前一样。
8. **守卫**：`src` 里除了格式层、场景那张表和那个口，不许再有「材质里直接装着图」的写法；删贴图只许 `purgeTextures` 那一行（照 `purgeMaterials` 的守卫写）；身份层的守卫照过。
9. 冻样本（`node scripts/freeze-format-fixtures.mjs`）；`api/` 重新生成；`ai-docs/20261026-pipelines.md` 里「涂材质」那条流程更新；`CLAUDE.md` 的现状行。
10. 升一个末位版本。

## 六、碰到这些就停下来报

- 指令（op）有没有被存到什么地方（崩溃快照、日志）：有的话，改 `addMaterial` 的形状就是改一种存盘格式，先说。
- 第 6 条里老版本读新文件出了第二节没说到的事。
- 粘贴的合并计划那一段，加第四种条目需要改 `src/identity/` 里的算法（按设计它不该需要）。
- 截图基线变了。
- 任何一处你觉得要给贴图加「内容一样就当同一张」的逻辑。

## 这一张不做的（留给后面的工单）

贴图坐标和网格体 2.0（1-2、1-3）；分层的画怎么显示、怎么存（1-8）；「开始画」那个动作（1-3 之后）；把贴图收上素材架的入口；一摞里放第二张；同一套贴图坐标上画布大小的校验。

## 施工记录

（小弟写）
