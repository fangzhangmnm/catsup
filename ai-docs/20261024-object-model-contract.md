# 0.14 物体模型数据契约：物体 / kind / 层 / 图片资产 / cast（Fable 立契约，Opus 做 UI）

> created 20261024 · as-of v0.13.25 / 2026-10-24 · created by Claude Fable 5.1
> 分工（user 2026-10-24「反正fable做数据结构契约和难数学。然后其他的可以给opus」）：本稿 = 契约 + 不变量 + op 形状 + 格式拍子；导入对话框 / 透视修正 / 像素化 / 物体面板 / 层开关 UI / 卡片与网格的渲染接线 = Opus（§8 交接）。
> 取代 `ai-docs/20261024-object-mode-design.md` §1–§2（那稿的「容器 / 身体严格分层」被 user 否了，见 §1）。

## 0. 想法记录（user 原话，按拍没拍分栏；讨论 ≠ 授权，脑洞 ≠ 要求）

**拍了（2026-10-24）**
- 「su的group不算物体层级。没有身份，是同一碗汤里面的整理，地位类似选区，因为一直会变」
- 「组永远不进hierarchy，是brep的内部矛盾」
- 「一个component是一个物体，然后关于对齐其他的物品也可以暴露接口？」→ 我答「同意：每个 kind 实现 alignGeometry()」，user 未反对
- 「然后每个物体有一个kind，可以换，换了要explicit cast op用户点确认」
- 「我的想法很简单，画一个公园，边画边往里加东西。所以公园的汤是画的那些设计，甚至可以以后我们做一个城市规划，easyroad3d的插件kind类型。然后你一遍在几何模式调路一遍摆路灯，而不是像blender一样要切出来 是否合理」→ 我答合理 + 推翻自己「容器不能有裸几何」那稿（SU entities 模型：一个物体 = 一个身体 + 任意子实例）
- 「layer就是类似unity的render layer。用处是关闭天花板放东西，然后再打开，是纯管理用的。可以想一下父亲儿子怎么继承」
- 「每一个图片必须有一个长度尺度」「可以先naive导入」「透视修正和像素化ux我让opus做」
- 更早（同日）：「不同的物体也会有不同的可用编辑模式，然后有一个统一的物体管理模式，你自己排期」；「多表示并存不自动互转 这个建议现在就接好」；「blender和sketchup是不同的模型数据，可以互转，但是不建议blender直接动brep」；「第三种身体 = mesh / 网格」（命名拍板）；参考卡片导入规格：「不要直接复制，而是弹一个窗口，让你裁剪，调分辨率，png or jpg，以及设置参考高度。才能进，然后是bottom middle为origin」
- 图片导入深模块（同日，wishlist，「你只要负责数据结构就行」）：「参考卡片和贴图都走这个。要求有透视和crop调整，鼠标拖动时有像素放大镜预览。然后可以调整分辨率，aspect ratio和压缩格式质量。以及是否nearest采样。然后需要设置参考长度，要在上面拖gizmo量。比如一个一米二的猫娘，但是图片包括额外的呆毛，那么你输入一米二然后定义是从哪里到哪里。然后有裁剪和预览两个tab。然后wrap。以及其实非常有用的几种wrap模式比如flip h flip v都可以在高级里面设置，可以预览。未来还考虑atlasmaker多张图片拼，这样之后还可以修改加图，但是没必要保存原图片大图。然后也许支持像素和比例snap。然后虽然非常不建议被拉伸的贴图但是别的软件进来能接住……但是这样uv拉伸的问题要有系统的处理方法，不要屎山」「card以后可以支持动画和不同动画切换，但是现在先做普通的图片参考」「半透明，没有透明像素就默认不开。然后可能建议转jpeg。有的话你detect一下能开transparent cutout就开，只有少数情况才alpha」
- 层（同日）：「facelayer可能太复杂了，不好管理，容易出bug，不要？」「出bug的意思是用户容易搞混淆，比如给自己埋了个雷」→ 采纳：**面不打层**，层只在实例上（§4 已改）——藏掉的东西必须是一个能在物体面板里看见的物体，不能是汤里几张无名的面。
- 下一纪元（同日）：「我让opus把天空盒，pbr渲染，shadow，甚至是gi都做一下。解决一下看不到成品的问题。然后贴图只是其中一块」（家族周账 F-83）；「weebpaint发一个工单就是抠山抠树的功能」（F-82，便条已投）。
- 轴（同日）：「轴只管编辑层，不动表示」「origin和axis还是同一个语义吗。关键是axes是一直变的夹具」→ 我答：定义的原点 = 表示层（出生时定，改它是显式重写），绘图轴 = 夹具，不写进坐标（现状已如此）；user 未反对。

**脑洞 / 远景（没拍，只记）**
- 「参考人卡片……pngtuber的猫娘，带自己的关键帧动画集合和状态机」（卡片 kind 的远期载荷）
- 「以后会有blender，weebpaint，还会有animation，level design。sculpting，terrain……把cad工程3d打印也接了」
- 「以后视图侧会有很多挂件。snap只是其中第一个」；「以后我blender要用」
- 「加blender模态。两种不同的编辑方法，不用出app」「和weebpaint结婚」「顶点色级别的baking / 实时gi」（postmortem 回答）
- 「甚至可以以后我们做一个城市规划，easyroad3d的插件kind类型」

**我的立场（辩论点，供 user 推翻）**
- 组不进层级 → A27 给组的「锁」应退场（锁只给实例）；「锁住立面图当参考」做成组件。
- cast 在定义级，N 个实例一起变；每种转换声明丢什么；不满足前提就拒，不做「尽量」。
- 公园 = 身体 + 子实例混住；几何动词与物体动词同时可用，调子物体自己的几何要进它（SU 的双击），不是 Blender 的全局切模式。

## 1. 层级（hierarchy）= 只有物体

- **物体 = Definition**：`{ id, name, body: Body, instances }`。**实例 = Instance**：`{ id, def, parent: GroupId | null, xform, name?, locked?, layer? }`。层级 = 实例树（根 definition → 子实例 → …）。
- **组 = brep 身体内部的分区**：`BrepBody.groups`——自己的内核池（不粘）、轴框（夹具）、参考几何；**无身份、不进层级、不可锁、不可换 kind、不进物体面板**。文件里仍存在 `definitions[i].groups`（格式不动）。`Group.locked` 读旧文件时**忽略并丢弃**（definitions v5，minor：老读者看到的只是少了一个可选键）。
- **一个物体可以同时有汤和孩子**（SU entities 模型；公园 = brep 汤 + 路灯实例）。进错层的护栏是面包屑 + 模式字 + 「站在哪一层」，不是禁止混住。
- **上下文 = 站在哪个实例链 + 哪个组**（现状 `EditContext`）。几何工具作用于上下文身体的汤；物体动词（摆 / 移 / 转 / 缩 / 复制 / 换定义 / 锁 / 层 / cast）作用于子实例；两者在同一模式里都可用。

## 2. kind 与身体

> **CardBody 已拆（v0.13.32，2026-10-24 深夜；user「cardbody需要sunset」→「你说一句「拆」我就拆 拆」）**：删 `CardBody` / `placeCard` / kind=card 登记；definitions 格式 v5 → v6（card 定义迁成空 brep 定义，dev 里从没有文件存过 card）。**方向（user 同夜原话）**：「猫娘的问题是她是entity的子类，所以需要实现的是entity，然后reference image是另外一个可以独立出来的ssot，毕竟refernce image不会face camera不会billboard。所以都是一张图，但是其实逻辑上是根本不一样的东西」；「entity今天不用急着做。现在我还没画出成品呢也不用急着做管卡编辑器」。→ 以后两份独立契约：**Entity**（验证实体的父类：人形验证器 / 注释牌 / 用户自定义类型，见 `20261024-design-entity-classes-onvalidate.md`；不排期）与 **ReferenceImage**（世界里一张带尺度的平贴参考图，不朝相机；不排期）。`ImageAsset`（§3）留着给贴图，两者以后都复用它装字节。

```ts
type BodyKind = "brep" | "card" | "mesh";            // 开放集，加 kind = 加一个实现（EasyRoads 式「road」以后在这里长）
interface BrepBody { kind: "brep"; kernel; groups; nextGroup; materialSlots; guides }          // 现状
interface CardBody { kind: "card"; image: ImageAsset; anchor: "bottom-center"; billboard: boolean; frames?: never /* 远景：帧集 + 状态机 */ }
interface MeshBody { kind: "mesh"; positions: Float32Array; indices: Uint32Array; normals?: Float32Array; uvs?: Float32Array; triMaterial?: Uint16Array; materialSlots: number[] }
```
- **card**：一张竖直的卡，定义坐标里**原点 = 底边中点**（user），卡面在定义的 XZ 面、朝 −Y（SU「face me」同向）；`billboard = true` 时渲染绕 Z 轴转向相机（对齐接口用的几何不转——吸附吸的是定义里的卡，不是屏幕上的卡）。尺寸来自 `image.sizeM`。
- **mesh**：三角网（Blender 侧的「网格」身体最小形）。**文件里 = 这个 definition 的 glTF node 的 mesh 本身**（现在 bake 已经写成 glTF mesh；mesh 身体就是「bake 即 source」，`definitions[i].kind = "mesh"` 时读取器从 glTF 读回，不另存一份）。默认剔背面；正反面材质 = 两个三角（以后）。
- **kind 登记表 `src/scene/kinds.ts`**：
```ts
interface KindDef<B extends Body> {
  id: BodyKind; label: string;
  modes: ModeId[];                                     // 这种身体可用的编辑模式（brep: geometry / surface；card: []（只在物体层摆）；mesh: []（Blender 模态以后））
  castsTo: { to: BodyKind; loses: string[] }[];        // 显式 cast 的去向 + 丢失清单（确认文案的来源）
  alignGeometry(body: B): { points: Pt3[]; segments: [Pt3, Pt3][]; planes: PlaneParams[] };   // 对齐接口（定义坐标；推断世界合成时经实例 xform）
  bounds(body: B): { min: Pt3; max: Pt3 };
}
```
- **cast**：`{ op: "castDefinition"; def: DefId; to: BodyKind }`，定义级、可撤销。本版通的只有 **brep → mesh**（`triangulateRings` 每面三角化、材质槽照抄、曲线 / 软边 / 组 / 参考几何丢弃——都在 `loses` 里写明）；mesh → brep、card ↔ 其它 = 拒（报「还没有这条路」），不做部分转换。UI 的确认面 = Opus（文案来自 `loses` + 实例数）。

## 3. 图片资产（贴图用；以后 ReferenceImage / Entity 的图也装在这）

```ts
interface ImageAsset { mimeType: "image/png" | "image/jpeg"; bytes: Uint8Array; sizeM: [number, number] /* 物理宽高，米，必填 > 0 */ }
```
- **不变量：每张图必须带长度尺度**（user）。`sizeM` 是真源；像素尺寸只是分辨率。贴图材质的 `texture` 和卡片的 `image` 是同一个类型（`MaterialDoc.texture` 现在就是这个形状，只是没起名）。
- **naive 导入**（本版，op 层）：`{ op: "placeCard"; at: PoolRef; image: ImageAsset; xform: Xform; name?: string }` → 新建一个 card 定义 + 一个实例；`sizeM` 由调用方给（UI：输入参考高度，宽按像素比例算；裁剪 / 调分辨率 / PNG 或 JPG / 透视修正 / 像素化全在 UI 侧把 `bytes` 与 `sizeM` 准备好再提交 op——op 不做图像处理）。
- 贴图导入沿用 `addMaterial`（已有 `sizeM`）。

### 3.1 图片资产的完整形状（导入深模块的产物；wishlist 的数据结构答案）

```ts
interface ImageAsset {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Uint8Array;                       // 存**成品**（裁剪 / 透视修正 / 重采样之后），不存原图大图
  sizeM: [number, number];                 // 物理宽高（米）= 真源；由参考长度推出：sizeM = 像素尺寸 × (lengthM / 像素距离)
  pixels?: [number, number];               // 像素宽高（冗余，读图前就能排版；读时校验）
  sampling?: "nearest" | "linear";         // 像素化画风；缺 = linear
  alpha?: "opaque" | "cutout" | "blend";   // 导入 detect：没有透明像素 → opaque（并建议转 JPEG）；有 → cutout（alpha test 0.5）；只有真半透明才 blend
  scaleRef?: { a: [number, number]; b: [number, number]; lengthM: number };   // 参考长度 gizmo：图上两点（成品像素坐标）+ 实长；「一米二的猫娘不含呆毛」就是 a / b 不在图的顶底
  provenance?: { sourceHash?: string; crop?: [number, number, number, number]; quad?: [[number, number], [number, number], [number, number], [number, number]]; resampledFrom?: [number, number]; quality?: number };   // 可审计、可重调；不含原图字节
}
```
- **贴图的 UV 系统性规则（不要屎山）**：两种映射模型，按 kind 分，不按面特判——
  - **brep 面 = 物理尺寸平面投影**（现状）：UV = 面内坐标 / `sizeM`，长宽不等的图天然不拉伸；每张面可带一个 `uvFrame?: { offsetM: [u, v]; rotateDeg: 0 | 90 | 180 | 270; flip: [boolean, boolean] }`（契约位，渲染 / 导出用 glTF `KHR_texture_transform` 表达，不发明新东西）。
  - **mesh = 显式 UV**（`MeshBody.uvs`）：别的软件进来的「被拉伸的贴图」只能住这里；cast brep → mesh 时按投影规则生成 uvs 一次。
  - 同一张 `ImageAsset` 被材质与卡片共用时各自带自己的映射；图不知道自己被谁用。
- **wrap / flip** 住材质的映射，不住图：`MaterialDoc.mapping?: { wrap: ["repeat" | "clamp" | "mirror", 同]; flip: [boolean, boolean] }`（flip = 对应 glTF texture transform 的负 scale）。
- **atlas（未来）**：`ImageAsset.atlas?: { sheet: 资产 id; rect: [x, y, w, h] 像素 }`——逻辑图仍有自己的 `sizeM`；加图 = 重排 sheet 改 rect，不需要原图大图。放这里只占位，本版不实现。
- **card 动画（未来）**：`CardBody.frames?: { sheet: ImageAsset; cells: [cols, rows]; clips: { name: string; frames: number[]; fps: number; loop: boolean }[]; state?: string }`；本版只有单图。
- 导入 UI（Opus）：裁剪 / 预览两个 tab、像素放大镜、分辨率 / 比例 / 格式质量、nearest 开关、参考长度 gizmo、wrap 与 flip 预览、像素 / 比例 snap、alpha detect 与 JPEG 建议——全在对话框里把 `bytes + sizeM + 其余字段` 准备好再提交 op；op 层不做图像处理。

## 4. 层（layer = Unity render layer 的管理用法）

```ts
interface LayerDoc { id: number; name: string; visible: boolean; color?: [number, number, number] }   // 文档级表，id 0 = 「默认」永远存在
Instance.layer?: number          // 缺省 = 继承父上下文的有效层
```
- **面不打层**（user 2026-10-24「facelayer可能太复杂了，不好管理，容易出bug，不要」「出bug的意思是用户容易搞混淆，比如给自己埋了个雷」）：层只是实例的属性；藏掉的东西必须是物体面板里看得见的一个物体，不能是汤里几张无名的面——要藏天花板 = 先做成组件再归层。
- **继承**：有效层(实例) = 自己的 `layer` ?? 父实例的有效层 ?? 0。
- **有效可见** = 自己有效层可见 **且** 祖先链上每个实例的有效层都可见（藏父连子一起藏：SU tag 与 Unity SetActive 的方向）。只藏不删：隐藏的东西不进推断世界（不吸附、不遮挡）、不进选区、导出时按开关（默认导出全部）。
- 组不带层（组不是物体）；要藏一个组里的东西 = 给那些面打层或做成组件。
- ops：`addLayer { name }` / `renameLayer { id, name }` / `setLayerVisible { id, visible }` / `assignLayer { at: PoolRef; instances: InstId[]; layer: number | null }`（null = 回到继承）/ `removeLayer { id }`（成员回继承；id 0 不可删）。
- 格式：`CATSUP_document` v3 加 `layers`（缺 = 只有默认层）；`CATSUP_definitions` v5 加 `instances[j].layer`（缺 = 继承）+ card / mesh 载荷 + 去掉 `groups[j].locked`。brep 不动（v4）。都是 minor（加可选字段）。

## 5. 对齐接口（跨物体吸附）

- 推断世界（`WorldView`）合成**所有可见物体**的 `alignGeometry()`（经实例 xform），不管 kind；brep 的 = 内核的点 / 边 / 面（现状），card 的 = 四角 + 底中 + 顶中 + 四边 + 卡面，mesh 的 = 顶点 + 硬边 + 三角面（面多时按包围盒粗筛）。
- 「手里」谓词照旧：正在拖的实例不参与。

## 6. 不变量（守卫测试）

1. 层级里只有实例；`Group` 没有 `locked`、不出现在任何物体列表 / 面板数据里。
2. 每个 `ImageAsset.sizeM` 两个分量 > 0；写入器拒绝写没有尺度的图。
3. `castDefinition` 只在登记表 `castsTo` 里有的方向上成功；失败不改文档。
4. 有效可见性函数 `effectiveVisible(ctx chain, layers)` 单调：祖先藏 ⇒ 子藏。
5. 格式往返：card / mesh / layers / instance.layer 写了再读逐字相等；v4 老文件读进来 = 默认层 + 全继承。

## 7. 本版落地（Fable，2026-10-24 夜）
见 §9 进度表。

## 8. Opus 交接（UI / 渲染接线）
- ~~导入卡片对话框~~（CardBody v0.13.32 已拆；图片导入深模块 = 总账 B42，产物是 `ImageAsset`，消费方是贴图，以后是 ReferenceImage / Entity。edited by Claude Opus 5.5）
- 物体面板（「商城 / inventory」位置）：按 kind 分组的定义列表、实例数、重命名、cast（确认面文案 = `loses` + 「N 个实例一起变」）、替换定义、锁、层。
- 层面板：层表 + 可见开关 + 「选区归到层」；隐藏态在面包屑 / 面板有标记。
- 渲染：mesh = 三角网 + 默认剔背面，走现有 FACE / TEX shader 一族，不另开材质系统。（card 那半随 CardBody 退场，edited by Claude Opus 5.5）
- 视图挂件条 / 吸附挂件 / 轴锁（见总账「→ Opus 交接」条）。

## 9. 进度（v0.13.26 全部落地，2026-10-24 夜；勾选补记 by Claude Fable 5.1 同日深夜——落地时漏勾）
- [x] 类型：`CardBody` / `MeshBody` 载荷、`ImageAsset`、`LayerDoc`、`Instance.layer`
- [x] 格式：document v3 / definitions v5 / brep v5 + 迁移 + 冻结样本
- [x] ops：`castDefinition`（brep → mesh）/ 层四件 / `placeCard`
- [x] kind 登记表 + `alignGeometry`（brep / card / mesh）
- [x] 可见性函数 + 守卫测试
- **数据结构这半没有再等 user 的问题**；§0「脑洞」栏不排期。UI / 渲染接线全在 §8 给 Opus。
