# CatsUp 持久化数据契约（远见版）—— 设计稿 rev4，第三轮已答

> as-of v0.4.6 / 2026-09-20 · created by Claude Fable 5.1 2026-09-19 · **rev2 2026-09-20（edited by Claude Fable 5.1）：按 user 第二轮回答 + glTF 2.1 草案 schema + GDTF 教训重写；rev1 的「ORA 式 zip 薄壳」判**作废**，改为一个 `.glb`。rev3 同日：user 纠偏「我们不是游戏引擎，我们是 sketchup 竞品，也许有做 data driven 场景编辑器的潜力，所以我觉得我们的 spec 不会像 gdtf 里面说的那么未定型，而是有一个比较明确的图像」「还记得我说的那一大堆 component, group，以及丢 gltf 模型之类的早期设想吗」→ SU 竞品 + 场景编辑器的核心本体**现在写定**（§5），GDTF 教训只管游戏层词汇。**rev4 2026-09-20**：user「核心还是 sketchup，好好想一下」→ §5 改成 **SketchUp .skp 本体逐项对照表**（Edge/Face/Curve/Group/Definition/Instance/Image/SectionPlane/Guide/Dimension/Text/Material/Tag/Scene/Style/Shadow/ModelInfo/Attributes），每项落哪、三方看到什么；第三轮 (a)(c) 同意、(b) 整数范围答在 §5.2、(d) 用人话解释在 §10；§3.1 答「和只支持 2.0 的工具兼容吗」。**
> **性质：提案，未拍板。** user 原话定的题（2026-09-19）：「现在就设计一个有远见的持久化数据契约…看全量 wishlist 包括 overambitious…多依托现有规范」「尽量是类似 ora 的依照已经是格式标准的框架」「考虑后面会有 GTA VCS 级别的场景，甚至 zbrush」；第二轮（2026-09-19/20）：「我不喜欢散一地，但是我们也有 zip 了。以及是否可以就一个 glb。新的 gltf 规则本来就支持 thumb!」「远景还有就是我会 embedding weebpaint」「我确实喜欢整数。但是这个是谁要求的？会不会和 gltf 大家」「gltf 的 new spec 你看一下，有很多我会内耗的」「你可以看一下我以前打回的那个 GDTF 的 proposal，以及后来的反思反省。gtdf is obsolete!」「.catsup 还是 .glb」「无地按照 weebpaint 标准做」「可以 bump minor」「它是被内容需求逼出的自适应格式 嗯应该就是那个教训」。
> 时机：推翻 2026-09-06「SU 1.0 之后再定」（总账 B5）；容器：09-06 的「zip」拍板被 user 本轮「是否可以就一个 glb」重开——本稿答：可以，理由 §2。
> 后门政策（无向后兼容，AI 脚本改 user 的 OneDrive appfolder，逐次许可）见 `CLAUDE.md`；§7 按它设计。

---

## 0. 一页结论

- **文件 = 一个 `.glb`**（glTF 2.0 二进制容器，mimetype `model/gltf-binary`），**目标语义 = glTF 2.1**（Khronos 2026-06-11 公布的「复杂场景」修订，向后兼容；草案 schema 在仓库 `draft-2.1` 分支，规范文本未定稿）。没有 zip、没有散文件、没有 `.catsup`。
- **为什么 rev1 的 zip 壳作废**：它存在的三个理由——缩略图、多文件打包、跨文件引用——**2.1 全部进 core**（`asset.thumbnail` / `files` + `externalAssets` / `node.externalAsset`），第四个理由「贴图松散给 WeebPaint 改」被 user「我会 embedding weebpaint」取消。剩下唯一代价 = store 的封面 peek 从「zip 尾片」改「GLB 头片」，是一个小的库端 escalate（§9）。
- **ORA 类比落到哪**：ORA = 别人定的壳 + 标准内容层 + 我们的 `.weebpaint` 槽；glTF = Khronos 定的壳 + 标准内容层（三角 / 材质 / 灯 / 相机 / 动画 / 缩略图 / 外部资产 / 包围体）+ `extensions.CATSUP_*` 槽（authoring）+ `extras`（ECS 元数据）。**三方读 core 就够；core 永远是 bake。**
- **两个层，两种纪律**（user 09-20 纠偏后的口径）：**① SU 竞品 + data-driven 场景编辑器的核心本体是定型的，现在写全**——肥皂膜 B-rep、group（sticky 边界 + 轴框，编辑时语义）、component（definition + instance = transform + reference + override）、**丢进来的 glTF 模型 = 原子**（不进 SU 数据结构，足迹 = transform + reference + 少量 variation 元数据 = ECS entity，proposal L21/L66）、材质（面前后）、tags / hide、scenes（相机）、单位；**② 游戏层词汇（extras 里的组件包）才适用 GDTF 教训**（user 2026-08-14：「genre 的原语归私设。我掉进的坑就是 universal-ness」「我不定规矩，规矩自己长出来。被内容逼出来」「关系型也是表。guid 阴魂不散」）→ 组件键开放集、不预定义 genre 原语、不铸 id 除非跨文件引用逼出来（那时用 2.1 UID）。
- **远见三件的落点**：GTA VCS 级 = 2.1 core（`externalAssets` + 包装成 bufferView 的 `files` + `boundingVolume` BVH + 64 位 GLB v3 + `EXT_mesh_gpu_instancing`），零自造；ZBrush 级 = 二进制 accessor + `_` 前缀自定义顶点属性（core 允许）+ 到时候一个雕刻扩展；**B-rep 顶点整数微米**（只在我们的扩展里，三方看不见，§5.2 答「谁要求的」）。
- **演化 = 无兼容 + 后门 + round-trip 保真**（§7）。**无地 = WeebPaint 标准**（§6）：transient / 文件家 / 图库家三态，IDB 永不当家，T-crash 盲快照。

---

## 1. 输入：全量 wishlist → 落在哪一层（不是预留槽）

来源：`journals/20260627 CatsUp proposal.md` L11–L80（含 user 自标 overambitious）、`journals/20260627 SketchUp drill.md` L73–83、far-horizon §1、总账 A/B/E、journal 09-07、user 09-19/20 各句。三层 = **core**（glTF 标准，三方可读）/ **extras**（节点自由 JSON，引擎导入自动收）/ **CATSUP_\***（我们的 authoring，三方忽略）。「何时立项」列：**定型** = 属于 SU 竞品 / 场景编辑器核心本体，§5 现在写定（实现可以晚，形状不等内容）；其余 = 游戏层 / 第二内核，只定落哪一层。

| wishlist（出处） | 层 | 依托的标准件 | 何时立项 |
|---|---|---|---|
| 肥皂膜 B-rep、group 轴框、component 定义与实例（proposal L11/L21、drill L73–83、B1「group 存轴，顶点存 component 坐标」） | CATSUP_brep / definitions / instance | node 共享 mesh = 实例 | **定型，现在** |
| 缩略图（图库封面） | core `asset.thumbnail` → `images[i]`（2.1） | glTF 2.1 | **定型，现在** |
| 材质 / 贴图 / 油漆桶=拉矩形设贴图+UV（E8、L72 auto UV） | core `materials` / `textures` / `images`；面前后材质 + UV 在 CATSUP_brep（§5.2 已定字段） | PBR、`KHR_texture_transform`、`KHR_materials_unlit`（复古）、sampler NEAREST | **定型**；实现在贴图纪元 |
| **embedding WeebPaint**（user 09-19）/ savefile embed ora（B14 案 1）/ bodypaint（案 2） | CATSUP：image 挂一个 ora 源 bufferView（同 `KHR_draco` 自管 bufferView 的先例）；png 是它的 bake | ORA | WeebPaint 嵌入时 |
| **丢进来的 glTF 模型 = 原子** / 家具 / 3D Warehouse（L21「prefab 是 ngon 的 glb atom，不进 SU 的数据结构」、L66「足迹就是一个 transform + 一个 reference 以及少量 variation 的 metadata 的 ECS」） | core `files` + `externalAssets` + `node.externalAsset`（2.1）+ 节点 extras 装 variation（§5.4） | glTF 2.1 | **定型，现在写定；实现在 prefab 纪元** |
| **GTA VCS 级**：流式开放世界、数万实例（user 09-19、L13/L37） | core：外部资产按 cell 分文件、`node.boundingVolume` 做 BVH/剔除、`EXT_mesh_gpu_instancing`、GLB v3 64 位 | glTF 2.1 + 已批准扩展 | 开放世界纪元 |
| collision 默认开 + override/proxy（L70、E12 原则）、VR 碰撞 | core `shapes`（box/sphere/capsule/cylinder/plane）+ `node.boundingVolume`；extras `collision:{mode}` | glTF 2.1 core；`KHR_collision_shapes`/`KHR_physics_rigid_bodies` 仍 review draft | VR 碰撞代理需要时 |
| 关卡 ECS 元数据：灯 / patrol / strategy point / navmesh / spawn / 对话 href（L13/L70） | extras 组件包（B2「type = 组件包」）；灯 = `KHR_lights_punctual`；navmesh = 打标 mesh | 引擎导入器把 extras 收进 metadata（Godot 4 / Blender custom properties） | 关卡纪元 |
| Wire / 实体引用 / Inspector（L54/L56） | 2.1 **UID**（文件内唯一、跨文件可引）+ extras 引用槽 | glTF 2.1 | 有第一根线时 |
| hide/show、Tags（SU Tags、L134） | hide = `KHR_node_visibility`（2.1 升 core）+ brep 元素 hidden 位；tags = CATSUP_document.tags + 元素 tags | glTF 2.1 | **定型**（§5.1） |
| Tomato & Sam、动作、第三人称代理（L60/L64） | 内建 prefab（externalAsset 指向 app 自带 glb）+ clip 名 extras | glTF skins / animations | 吉祥物纪元 |
| Scenes（相机 + 渲染设置）、出生点 / VR 站位（L124/L64） | core `cameras` + node；名字 / 样式 / 出生点在 CATSUP_document.views | glTF camera | **定型**（§5.1） |
| 单位 / 网格 / 吸附增量（A10） | CATSUP_document.settings | glTF 强制米 = 白送 | **定型，现在** |
| 地形：heightmap / tile / voxel / Cliff Maker（L78、E14、far-horizon §3.5「地形=独立 type」） | 到时候一个地形扩展 + 子数据（png16 / Tiled `.tmj` / `.vox`）装 bufferView；bake 出 mesh | 各子格式标准 | 地形纪元 |
| 有机建模、**ZBrush 级雕刻**（far-horizon §1、user 09-19） | core mesh（二进制 accessor）+ `_MASK`/`_GROUP` 自定义属性 + `COLOR_0` polypaint；细分层级到时候一个雕刻扩展 | `EXT_meshopt_compression` / `KHR_draco_mesh_compression` | 第二内核纪元 |
| 渲染：vertex GI / 天空 / 粒子 / 水 / 风（L68） | `COLOR_0`；其余 = 纯 JSON extras（「coding agent 能翻译到 unity/godot」） | glTF | 渲染纪元 |
| 参考图 / 纸片人 reference plane / 实景扫描（far-horizon §1、E13） | image + 四边形；扫描 = `KHR_gaussian_splatting`（2026-02 RC） | glTF | 参考纪元 |
| 3D 打印 / hard surface（L12/L19） | 导出：`EXT_mesh_manifold` 标流形 / 3MF / STL | 多厂商扩展 | 导出需要时 |
| 插件体系（L74/L78） | `extensions.<PLUGIN>`（glTF 命名规则）；未知扩展保存时原样带回 | `extensionsUsed` 纪律 | 插件纪元 |
| Bevel / spline / loft / 参数化（L159–168、journal 09-07 倒角 bug） | 先 eager 几何；参数化历史不进文件 | — | — |
| 无地草稿箱（A15） | **作废**，无地 = WeebPaint 标准（§6） | — | — |
| 角色动画 / cinemachine（L23，自标 procrastinate） | 只在 prefab glb 里 | glTF animations | — |

**结论**：没有一条需要第二种文件或第二个容器。定型部分 = 四个 `CATSUP_*` 扩展 + 2.1 的 `asset.thumbnail` / `externalAssets`；游戏层 / 地形 / 雕刻只定层。

---

## 2. 一个 glb 还是 zip（答「是否可以就一个 glb」「.catsup 还是 .glb」）

| | rev1：zip 薄壳 + gltf 目录 | **rev2：一个 `.glb`** |
|---|---|---|
| 缩略图 | zip 项 `Thumbnails/thumbnail.png`，store 现有 zip peek | `asset.thumbnail` → `images[i]`（2.1 草案 `asset.schema.json` 已有此字段）；GLB 内把它排在 BIN 首位 → 头片 peek（§9） |
| 多文件（ora 源 / 参考图 / 地形数据） | zip 子目录 | 2.1 `files[]` 可为 bufferView（「host 的 files 数组就是一个虚拟文件系统」）；非 glTF 类型走我们扩展自管的 bufferView |
| 跨文件引用（prefab / cell） | 自造 `CATSUP_ref` | 2.1 `externalAssets` + `node.externalAsset` |
| 三方直开 | 要解压 | Blender / three / Godot / Windows 与 OneDrive 自带 3D 预览**直接开**（user 画像「云文件管理器是最好的管理器」） |
| 「不散一地」 | 解压后散 | 永远一个文件 |
| WeebPaint 改贴图 | 松散 png | embedding WeebPaint（user 09-19）在内存改、CatsUp 重包 |
| mimetype / 扩展名 | 自造 `model/vnd.catsup+zip` / `.catsup` | 标准 `model/gltf-binary` / `.glb`；CatsUp 文档的判别 = `extensionsUsed ∋ "CATSUP_document"`；**没有该扩展的 .glb = 外来资产**（将来 prefab 库，不是错误） |
| 是不是「已是标准的框架」 | 壳是自己定的 | 壳、内容层、扩展机制全是 Khronos 的 |

USDZ / 3MF / OBJ 等的审计结论不变（rev1 §2）：USD 无可 vendor 的 web 读写器，留作导出目标；3MF 留 3D 打印导出；OBJ 逃生口。**2.1 明说「不试图替代 USD 的场景组合方式」**，但它加的 external assets + BVH 正好是我们要的那一半。

---

## 3. 文件布局（GLB）

```
GLB header (version 2；> 4 GiB 才写 version 3 = 64 位)
JSON chunk
  asset { version:"2.1", minVersion:"2.0", generator:"CatsUp vX.Y.Z", thumbnail:<image idx> }
  extensionsUsed [ "CATSUP_document", "CATSUP_brep", "CATSUP_definitions", "CATSUP_instance", (KHR_… 按需) ]
  extensionsRequired []                     # 永远空：三方永远能开 core
  images / textures / samplers / materials  # 标准
  meshes / nodes / scenes / cameras         # bake（§4）
  buffers / bufferViews / accessors
  extensions.CATSUP_document { … }          # §5.1
BIN chunk
  [0] 缩略图 png 字节（≤ 256 px；排第一，头片 peek 用）
  [1..] bake 的 accessor 数据、贴图字节、（将来）ora 源 / 地形数据 / 大 B-rep 的整数 bufferView
```

- `asset.version "2.1"` + `minVersion "2.0"`：我们用的 2.1 属性全部可被 2.0 加载器忽略（three GLTFLoader / Blender 只认 major），`minVersion` 就是规范给这种情况的字段。规范未定稿的属性名若变 → 后门脚本改名（§7）。
- 定型即用的 2.1 内容：`asset.thumbnail`（现在）、`files` + `externalAssets` + `node.externalAsset`（丢模型，形状现在定、prefab 纪元实现）；`shapes` / UID / 新 componentType 属于游戏层或大模型，等内容逼出来。

### 3.1 和只支持 glTF 2.0 的工具兼容吗（答 user）

**兼容，而且是规范保证的**：GLB 容器仍写 version 2（v3 只在 > 4 GiB 时）；2.0 规范要求加载器**忽略不认识的属性和未声明为 required 的扩展**，`extensionsRequired` 永远空；`asset.minVersion: "2.0"` 就是规范给「文件是 2.1 但 2.0 能开」这种情况的字段（three GLTFLoader 只拒 major < 2；Blender / Godot 只认 major）。2.0 工具看到的 = 全部 bake（三角 / 边线 / 材质 / 灯 / 相机）；看不到的 = 缩略图（`asset.thumbnail` 是 2.1）、外部资产节点（2.1；显示为空节点）、包围体、我们的 `CATSUP_*`。**为了不碰 2.0 校验器会报错的地方**：整数 B-rep 数据**不走 core `accessors[]`**（2.0 的 componentType 枚举没有 int32/int64），而是扩展直接引用 `bufferView` + 自己声明布局（`KHR_draco` / `EXT_meshopt` 就是这么做的）；严格校验器最多给「未使用的 image / bufferView」「未知属性」warning，不报 error。等 2.1 定稿、three/Blender 出 2.1 加载器，缩略图和外部资产自动亮起来，文件不用改。

---

## 4. core = bake 的规则

- **坐标**：glTF +Y 上、米、右手。内核 +Z 上 → 只在 `src/format/` 边界换轴（(x,y,z)ᶜ → (x, z, −y)ᵍ），与 OBJ 逃生口同做法；`CATSUP_*` 内数据**保持 Z-up、米**（authoring 零换轴）。
- **网格**：每个 definition 一个 `mesh`；面按材质分 primitive（`TRIANGLES`；`POSITION`/`NORMAL`/可选 `TEXCOORD_0`/`COLOR_0`）；边一个 `LINES` primitive（轮廓粗细是渲染态）。float32 够渲染用。
- **实例**：definition 的每个 instance = `node{mesh, translation, rotation, scale, extras}`；嵌套 definition 在 bake 里逐实例展平成 node 子树（mesh 共享）——三方看到「实例有 transform、渲染是三角汤」，不引入空节点当容器（proposal L44「healthy boundary」）。
- **材质 / 灯 / 相机 / 可见性**：标准件（PBR、`KHR_lights_punctual`、`cameras`、`KHR_node_visibility`）；`extras.catsup.colorName` 挂家族色彩库色名。
- **ECS 元数据 = 节点 `extras`**：`{ tags, components:{ collision:{mode}, marker:{kind}, … } }`；component 键开放集（B2）；未知键保留。
- **provenance**：`asset.generator` / `asset.copyright`；第三方资产许可 = `KHR_xmp_json_ld`。
- **bake 是可再生派生物**：读文件时 app 只读扩展重建内核再自己 bake；core 只为三方与「authoring 坏了创意不丢」（E1 哲学）。
- **明确不用**：`KHR_interactivity`（已批准的行为图扩展）**不装游戏逻辑**——那是 Unity「UnityEvent 接 animator」的 glTF 版；GDTF 反省「业务逻辑描述和幻想世界描述 heaven vs earth」「for LLM the best data is code」；逻辑住代码 / 文本，文件只装世界。

---

## 5. 核心本体 = SketchUp（user「核心还是 sketchup，好好想一下」）

方法：拿 SketchUp 的 .skp 本体（Ruby API 的实体类 + Model Info + Scenes/Styles/Shadows）逐项过一遍——**每一项要么有落点，要么写明「不做」**；再叠 data-driven 场景编辑器的三件（丢 glTF 原子 / 灯 / extras）。形状在本节定死，实现分纪元。

### 5.1 SketchUp 本体 → 文件（对照表）

| SketchUp | 我们存哪 | glTF 2.0 三方看到 | 实现 |
|---|---|---|---|
| **Edge**（soft / smooth / hidden / 投影阴影） | `brep.edges` + `edgeFlags` 位 | `LINES`（hidden 不出） | 现在 |
| **Face**（loops 带洞、前/后材质、每顶点 UV 贴图定位、hidden、cast/receive shadows） | `brep.faces[{outer, holes, m:[front,back], uv, hidden, flags}]` | `TRIANGLES`（按材质分 primitive；前后材质 = 两组或 `doubleSided`） | 现在（uv / m 贴图纪元填） |
| **Curve / ArcCurve**（圆 / 弧 / 多边形 / 徒手 = 一串边当一个实体：选一段全选、可平滑、保留圆心半径参数） | `brep.curves[{edges:[…], kind:"arc"|"circle"|"polygon"|"freehand", params:{center, radius, normal, startAngle, endAngle, sides}}]` | 同上（只是段） | 圆/弧工具纪元 |
| **Group**（自己的轴/变换、名字、hidden、locked、可嵌套；SU 内部 = 单实例 component） | `brep.groups[{axes, parent, name, hidden, locked}]`，元素按 group 分池（§5.2；B1 拍板「group 存轴，顶点存 component 坐标」） | 不可见（顶点已在 definition 坐标） | 现在（axes 先恒等） |
| **ComponentDefinition**（名字、描述、轴/插入点、**行为**：glue-to 面 / cuts opening 挖洞 / always face camera 纸片人 / shadows face sun；内容 = 一整套 entities） | `definitions.list[{name, description, axes, behavior:{glueTo:"any"|"horizontal"|"vertical"|"sloped"|null, cutsOpening, faceCamera, shadowsFaceSun}, brep, nodes:[…], annotations:{…}}]` | 一个共享 `mesh` | 现在（behavior 先全 null/false） |
| **ComponentInstance**（变换、名字、hidden、locked、实例级材质覆盖、attributes） | 节点 + `CATSUP_instance{definition, overrides:{materials, hidden, locked}}` + `extras` | `node{mesh, TRS}`（`KHR_node_visibility`） | 现在 |
| **文件当组件**（导入一个 .skp = 一个 component；Reload 同步） | 2.1 `externalAssets` 指向另一个 **CatsUp `.glb`**（其 root definition 就是这个组件；可编辑、可 reload）——与「丢进来的外来 glb 原子」（不可编辑）用同一机制，靠对方有没有 `CATSUP_document` 区分 | 2.1 加载器实例化；2.0 空节点 | prefab 纪元 |
| **Image**（导入图片当参考 / 贴图面；有尺寸与变换） | `definitions.list[i].annotations.images[{image:<idx>, size:[w,h], transform}]`（= 纸片人 reference plane，far-horizon §1） | **可见**：bake 成带贴图的四边形 mesh | 参考图纪元 |
| **SectionPlane**（剖切面：位置 / 法向 / 名字 / 激活；建筑核心） | `annotations.sectionPlanes[{origin, normal, name, active, symbol}]`；scene 记哪张激活 | 不出（extras 备查） | 剖切纪元 |
| **ConstructionLine / ConstructionPoint**（卷尺 / 量角器留下的辅助线点，可擦） | `annotations.guides[{kind:"line"|"point"|"ray", origin, dir?, stipple}]` | 不出 | 卷尺纪元 |
| **Dimension**（线性 / 半径标注）、**Text**（屏幕 / 引线文字）、3D Text（= 面，已覆盖） | `annotations.dimensions[…]` / `annotations.texts[{anchor, text, leader, screen?}]` | 不出（extras 备查） | 标注纪元 |
| **Material**（名、颜色、贴图 + **贴图在模型里的实际尺寸**、透明度、colorize） | core `materials` + `extras.catsup{ textureSize:[w,h], colorName }` | `materials`（PBR；无光照风格 = `KHR_materials_unlit`） | 贴图纪元 |
| **Layer / Tag**（名、颜色、可见、tag 文件夹）+ 每实体一个 tag | `document.tags[{name, color, visible, folder}]`；brep 元素 / 节点 `tag:<idx>` | `extras.tags` | 现在（tags 表可空） |
| **Scene / Page**（相机 + 保存项：hidden 几何、可见 tags、激活剖面、style、阴影设置、轴位置；过渡时间） | `document.views[{name, camera:<node>, saved:{tags, sections, style, shadows, hidden}, spawn, transition}]` | `cameras` | 现在（只 camera + lastView） |
| **Style**（边：轮廓线 / 延伸 / 端点 / 深度提示；面：着色 / 贴图 / 单色 / X 光 / 线框 / 隐藏线；背景 / 天空 / 地面色；辅助线可见性） | `document.styles[{…}]` + `views.saved.style`（Workbench 的显示参数，A8 轮廓线在此） | `extras.catsup.background` 可选 | 样式纪元 |
| **Shadow Info**（地理位置 lat/long/北偏角、日期时间、明暗、落在面 / 地面） | `document.geo{lat, lon, northAngle}` + `document.shadows{time, date, on, light, dark}` | **烘一盏太阳**：`KHR_lights_punctual` directional（方向按地理+时间算）——三方直接有光 | 阴影纪元 |
| **Model Info**（单位 / 精度 / 长度吸附 + 增量 / 角度吸附；文件信息 作者 描述） | `document.settings` + `asset.copyright` / `extras.catsup.description` | `asset` | 现在 |
| **模型轴**（Axes 工具移过的原点/朝向） | `document.axes{origin, x, y, z}`（只影响推断与显示，顶点不动） | — | 轴工具纪元 |
| **AttributeDictionary**（每实体任意键值：动态组件、IFC 分类、插件数据） | 节点 / definition = glTF `extras`；brep 元素 = 元素上的 `extras` 键（同名，同规则：未知保留） | `extras` | 现在（空） |
| Hidden / Locked（每实体） | 各元素 `hidden` / `locked` 位 | `KHR_node_visibility` | 现在 |
| Camera（透视 / 平行、fov、eye/target/up） | core `cameras` + `document.lastView` | `cameras` | 现在 |
| Outliner / Entity Info / 统计 | 派生，不存 | — | — |
| Follow Me / Sandbox / Solid Tools / Intersect / Offset | 工具，产物是几何 | — | — |
| Match Photo | scene + image，等参考图纪元 | — | 后 |
| Dynamic / Live Components | attributes（extras），等 | — | 后 |
| 3D Warehouse / Extension Warehouse | externalAssets / 插件扩展 | — | 后 |
| **不做**：Classifier（IFC 树）、LayOut 联动、Trimble Connect | — | — | — |

**data-driven 场景编辑器叠加的三件**（SU 没有）：**丢进来的外来 glb 原子**（§5.5）、**灯**（节点 + `KHR_lights_punctual`，core）、**ECS 元数据**（节点 `extras` 组件包；游戏层词汇，GDTF 纪律）。

### 5.2 `CATSUP_brep`（肥皂膜内核；每个 definition 一份）

```jsonc
{ "unit": 1e-6,                       // 顶点整数 → 米；= 内核 Q（立宪 §0 格点身份）
  "groups": [                         // 每 group 一个池；0 号 = 未分组
    { "axes": { "origin":[0,0,0], "x":[1,0,0], "y":[0,1,0], "z":[0,0,1] }, "parent": null, "name": null, "hidden": false, "locked": false, "tag": null,
      "vertices": [x0,y0,z0, …],                       // 整数微米、Z-up、definition 局部系；JSON 内联（见下）或 { "bufferView": n, "count": k, "componentType": "int32"|"int64" }
      "edges":    [a,b, c,d, …], "edgeFlags": [0,0,2,…],   // 位：1 soft 2 smooth 4 hidden 8 noShadow
      "curves":   [ { "edges":[…], "kind":"arc", "params":{…} } ],
      "faces":    [ { "outer":[…], "holes":[[…]], "m":[front,back], "uv":null, "hidden":false, "tag":null, "extras":{} } ] } ] }
```

- **整数范围（答 user「能存多大、要不要 32/64 两个选项」）**：**JSON 内联时没有 32 位问题**——JSON 数字是 double，整数到 2⁵³ 精确 = ±9.0×10⁹ m（900 万公里）的 1 µm 格，和内核自己（JS double × 1e-6 量化）一模一样；**这是默认存法**。**二进制**（大模型才用）：不做用户选项，**写入器按该 definition 的包围盒自动选** `int32`（±2147 m，4 B/坐标）或 `int64`（8 B/坐标，JS 用 `BigInt64Array`），`componentType` 写在扩展里，读取器两种都认。为什么必须留 int64：SU 用户会把几公里的场地 / 道路当裸几何放在模型根（不是 component），根 definition 的 |x| 轻易过 2 km。数据放 `bufferView` 不进 core `accessors`（§3.1，避开 2.0 枚举）。
- **整数是谁要求的**（第二轮答，留档）：内核的顶点身份就是 1 µm 整数格，float32 24 位尾数在 |x| > 8.4 m 存不住格点；三方不读这些数（bake 的 `POSITION` 仍是 FLOAT），与 glTF 大家无冲突。
- **每 group 一个池**：运行时「同池 + context 标签」vs「分池」未定（B1）；文件按 group 分池两边都能读（同池实现加载时按格点合并重合顶点 = 重合即同一）。
- 平面注册表 / arrangement / faceLinks 不存（从 faces 确定性重建）；膜 = 文件内索引，不铸 id。

### 5.3 `CATSUP_definitions`（顶层）

```jsonc
{ "root": 0,
  "list": [ { "name": "model", "description": "", "axes": {…},
              "behavior": { "glueTo": null, "cutsOpening": false, "faceCamera": false, "shadowsFaceSun": false },
              "brep": <CATSUP_brep>,
              "nodes": [ <node idx>… ],                                   // 实例 / 原子 / 灯 / 相机
              "annotations": { "images": [], "sectionPlanes": [], "guides": [], "dimensions": [], "texts": [] },
              "extras": {} } ] }
```
模型空间 = `list[root]`（SU 的 model 也是一个 definition；文件当组件 = 别人的 root）。

### 5.4 `CATSUP_instance`（节点）

`{ "definition": i, "overrides": { "materials": { <face-material idx>: <material idx> }, "hidden": false, "locked": false } }` = drill ④「transform + reference + override」= ECS entity 形状。override 只允许**不改几何**的项，改几何 = Make Unique（新 definition，SU 同款）。嵌套 = definition 的 nodes 里再放 instance 节点（有限深 DAG）。core 里同一 definition 的实例共享一个 `mesh`；展平出的子树节点 `extras.catsup.flattened = true`。

### 5.5 丢进来的 glTF 模型（原子；用 2.1 core，不另起扩展）

- **本体（proposal L21/L66，定型）**：外来 glb 是**原子**——不转成 SU 几何、不可进入编辑；足迹 = 节点 `{ TRS, externalAsset: i, extras:{ …variation… } }`，`externalAssets[i].file → files[j]`。
- **两种存法都是标准的**：`files[j].uri = "props/bench.glb"`（旁侧库，相对 store 文件夹；改名裂引用 = 已知 wart）或 `files[j].bufferView`（内嵌自包含）。内建资产（Tomato & Sam、缩小帽 rig）= app 保留 uri 前缀。
- 与 SU「文件当组件」共用机制：对方带 `CATSUP_document` → 可编辑组件（reload 同步）；不带 → 原子。
- variation 元数据 = 节点 extras（游戏层词汇）；原子是叶子，不能含 SU 几何；CatsUp 动词（拉出猫娘 / PickUp 栈 / drop）都是运行时。

### 5.6 `CATSUP_document`（顶层）

```jsonc
{ "formatVersion": 1,
  "settings": { "displayUnit": "m", "lengthPrecision": 3, "snapIncrement": 0.1, "gridStep": 1, "absoluteGrid": false, "angleSnap": 15 },
  "axes":  { "origin":[0,0,0], "x":[1,0,0], "y":[0,1,0], "z":[0,0,1] },
  "tags":  [ { "name":"墙", "color":[…], "visible":true, "folder":null } ],
  "views": [ { "name":"正面", "camera":<node>, "saved":{ "tags":[…], "sections":[…], "style":0, "shadows":{…}, "hidden":[] }, "spawn":true, "transition":1.0 } ],
  "styles":[ { "name":"Workbench", "edges":{ "profiles":2, "width":1 }, "faces":"shaded", "background":[…], "guides":true } ],
  "geo":   { "lat":…, "lon":…, "northAngle":0 }, "shadows": { "on":false, "date":…, "time":…, "light":80, "dark":45 },
  "lastView": { … } }                                                                   // 软字段
```
现在只写 `formatVersion / settings / lastView`，其余字段空数组或缺省——形状定死，内容按纪元填。

## 6. 分级 + 无地 = WeebPaint 标准

| 数据 | 归宿 | 数据类（MASTER ADR-0001） |
|---|---|---|
| `.glb` 文档 | store 文件；身份 = 文件名（不铸文件内 id） | **Work** |
| 外部资产（prefab glb、cell 文档、共享贴图库） | 同文件夹相对 uri（2.1 `files.uri`）；改名裂引用 = 已知 wart（与图库改名裂卡同族） | Work / Collection |
| 图库封面缓存 | `@internal/gallery createThumbCache`（WeebPaint 先例）——开建前逐案 escalate | Cache |
| 文档设置（单位 / 网格 / lastView） | `CATSUP_document`（随文件同步） | Work 的一部分 |
| 设备偏好（`catsup.ui.*`）、当前文件指针、图库登记 | 接 store 后搬进库的设备本地类（家规「用了本库禁碰 localStorage」） | Attunement |
| undo / 指令流 / 选区 / 工具态 / group 编辑上下文 / PickUp 栈 / 生命之粉 / VR 会话 | 永不落盘（user 09-07「生命周期永远是 runtime」） | — |
| 平面注册表 / arrangement / 碰撞世界 / bake 三角 | 派生，重建 | — |

**无地按 WeebPaint 标准**（user 09-19；SSoT = `../20260524 WeebPaint/ai-docs/20260825-localfile-knight-grill-verdicts.md` §1，逐条映射）：
- 「每幅画任一时刻恰好有一个家：图库、或磁盘上的一个文件、或还没有家（transient）。保存 = 送回家，只有回了家才清 dirty；导出永不清 dirty」→ CatsUp 同句，「画」换「模型」。
- 两个模式：**Gallery + Editor**（挂了 store：新模型自动安家进图库、默认名 `yyyymmdd-hex4`、退出自动保存）/ **Editor Only**（无 store 实例：transient，第一次 Ctrl+S = 安家 = FSA 另存 / 下载 `.glb`；dirty 退出三键挽留）。环境轴 地/无地 = 部署现实，用户不用懂。
- **IDB 永不当家**：只做图库缓存 / crash-shadow / 设备登记。**T-crash**：30 s 空闲盲快照（与保存同一 GLB 字节）、正常关闭即删、boot 非模态横幅恢复。
- 双击 appfolder 里的 `.glb` = 本地文件家；拷贝即分叉。
- → **A15「无地草稿箱」作废**（它是 IDB 当家的变体，正是 WeebPaint 证伪的那条）。

---

## 7. 演化规则（远见 = 扩展点 + 后门，不是迁移梯）

1. **round-trip 保真**：reader 保留一切不认识的（未知扩展、未知 extras 键、未知顶层属性、未引用的 bufferView），writer 原样写回。插件与未来版本互不销毁；这是 glTF `extras`/`extensionsUsed` 的规则。
2. **同 formatVersion 内只加不改**；删字段 = 保留读、停止写。
3. **破坏性改动 = formatVersion +1，app 内不迁移**：不等于自己的版本 → 拒开并原文报版本（不静默升级、不猜）；转换 = AI 脚本在 user 的 CatsUp appfolder 上做（后门政策：仅 CatsUp、每次写逐次显式许可、只动 appfolder），`tools/convert-v<from>-v<to>.mjs` 读旧写新、旧件移 `.trash`。2.1 属性名若在定稿前变动，同一条路。
4. **让脚本便宜**：`src/format/` 纯模块（零 DOM / 零 three / node 可 import；GLB 读写自写，几百行）；authoring 是 JSON；bake 可再生（脚本可整个丢掉重烘）。
5. **GDTF 教训的执法范围 = 核心本体之外**（游戏层词汇 / 地形 / 雕刻）：新扩展 / 新字段必须指着一个装不下的真实文件立项；不预定义 genre 原语；不为 universal 加层。核心本体（§5）不适用——它是 SU 竞品的定型图像，允许形状先于内容。
6. 宣发（1.x）后改口「只加不改 + deprecate 表」（far-horizon §3.7），后门退场。现在不生效。

---

## 8. glTF 2.1 与扩展注册表对照 —— 你会内耗的清单（答「gltf 的 new spec 你看一下」）

来源：Khronos 博客「Introducing glTF 2.1 with Complex Scenes」（2026-06-11）、`draft-2.1` 分支 `specification/2.1/schema/*`、扩展注册表 README（2026-09 现状）。

| 你本来会自己造的 | 标准里已经有 | 状态 |
|---|---|---|
| 缩略图 / 图库封面 | `asset.thumbnail` → `images[i]` | 2.1 草案 schema 已落 |
| 多文件文档 / prefab 引用 / cell 流式（rev1 `CATSUP_ref`） | `files[{uri|bufferView, mimeType, aliases}]` + `externalAssets[{file}]` + `node.externalAsset`（与 `mesh` 互斥）；`aliases` = 覆盖内层文件 uri | 2.1 草案 schema 已落；`files.mimeType` 草案暂只收 glTF 类型 |
| 把散文件打进一个包 / zip | 「`files` 以 bufferView 内嵌时，host 的 files 数组就是虚拟文件系统」——**2.1 明说不引入 zip/容器** | 2.1 |
| 碰撞代理、剔除包围盒、BVH | `shapes[{type: box|sphere|capsule|cylinder|plane}]` + `node.boundingVolume{shape, translation, rotation, scale}` | 2.1 草案 schema 已落 |
| 实体 id / 跨文件引用键 | UID（受限字符集、文件内唯一） | 2.1 公布稿；草案 schema 未落 |
| 整数 / 双精度顶点 | accessor `SIGNED_INT` / `DOUBLE` / `HALF_FLOAT` / `INT64` / `UINT64`「for extensions」；另有 `KHR_accessor_float64` | 2.1 公布稿（草案 schema 仍是 2.0 六种）；KHR 为 review draft |
| > 4 GiB 场景 | GLB version 3（64 位长度） | 2.1 |
| hide / show | `KHR_node_visibility` | 2.1 升 core |
| 大量同款实例（草木） | `EXT_mesh_gpu_instancing` | 已批准 |
| 贴图压缩 / 网格压缩 | `KHR_texture_basisu`、`EXT_meshopt_compression`、`KHR_draco_mesh_compression`、`EXT_texture_webp`（2.1 升 core） | 已批准 |
| 每实例换材质（override） | `KHR_materials_variants` | 已批准 |
| 灯（物理单位） | `KHR_lights_punctual` | 已批准 |
| 复古无光照 / 贴图定位 | `KHR_materials_unlit` / `KHR_texture_transform` | 已批准 |
| 出处 / 许可证 | `KHR_xmp_json_ld` | 已批准 |
| 任意属性动画 | `KHR_animation_pointer` | 已批准 |
| 实景扫描当参考 | `KHR_gaussian_splatting` | 2026-02 RC |
| 刚体物理（生命之粉的持久化版） | `KHR_physics_rigid_bodies` + `KHR_collision_shapes` | review draft——**不用**，运行时物理不落盘 |
| 行为 / 交互脚本 | `KHR_interactivity` + selectability / hoverability | 已批准——**不用于逻辑**（§4） |
| 音频 | `KHR_audio_graph` | proposal |
| LOD | `MSFT_lod`（厂商）；2.1 公布稿列了 LOD 探讨但草案未落 | 到时候看 |
| 3D 打印流形 | `EXT_mesh_manifold` | 多厂商 |
| 地理级流式 | Cesium `EXT_structural_metadata` / `EXT_mesh_features` / 3D Tiles 1.1 | 备选；2.1 external assets + BVH 是 Khronos 自己的答案，优先 |

内耗判据：上表左列任何一项，**先用右列**；右列状态是草案时，用它的属性名、写 `minVersion 2.0`、定稿改名走后门。

---

## 9. 与 store / gallery 的接口

- 一个 `.glb` = 图库一张卡；identity = 文件名。`validateAdopt` = GLB magic + JSON chunk 可解析 + `extensionsUsed ∋ CATSUP_document`；不含该扩展的 glb 不 adopt 为文档（将来当资产）。
- **封面 peek（唯一的库端 escalate）**：现有 `ZipFile.getPeek({bytesLength, zipEntry})` 是「取尾片 + 库内 zip 解析」；GLB 需要「**取头片 N 字节**」（12 B 头 + JSON chunk + BIN 首个 bufferView = 缩略图；JSON 通常几十 KB）。提案给 store：通用的 `getPeek({ head: bytesLength })` **不含任何格式知识**（比 zip 解析更符合库的「零内容格式知识」），app 侧解析 GLB 头；头片不够时 app 再按 JSON 里的 offset 取第二片。走 `pwa-cloud-store` skill，改库前 escalate。落地前图库无封面只显示名字，可接受。
- 缩略图缓存 = `@internal/gallery createThumbCache`（WeebPaint 先例）；IDB 开建逐案 escalate。
- 单一接缝 `src/app-store.ts`（JRB 0.1.5 样板：`provider / ui / appId / persistence / encryption / reconcilePolicy / validateAdopt / autoCacheOpenedFile / offlineUploadReplay / readOnlyFiles / signedIn / activeFileName / hiddenName` 全显式）+ `test/redline-guard.test.mjs` 同款守卫；`catsup.ui.*` 搬库。
- 加密：`@internal/encryption` 文件级不透明；peek 走库的密文 peek。

---

## 10. 拍板台账（第二轮已答）+ 第三轮要 user 一句话

**已答（user 2026-09-19/20）**：
1. 框架 = glTF 本身 ✔（「依照已经是格式标准的框架」）。
2. 容器 → **一个 glb**（user「是否可以就一个 glb」；本稿 §2 论证可以）→ **待 user 看完 §2 点头**。
3. 整数微米：user「我确实喜欢整数」+ 追问出处 → §5.2 答；**待点头**。
4. 按 group 分池：未答，保持提案。
5. ECS 元数据放 extras：未答，保持提案。
6. 扩展名 → `.glb`、mimetype `model/gltf-binary`（跟 2 一起）。
7. A15 → **作废**（「无地按照 weebpaint 标准做」）。
8. bump minor → **可以**（0.5.0 = 转正纪元）；prod 未推、未指示（E3「不做」照旧）。

**已答（user 09-20 纠偏）**：核心本体定型、现在写全（§5，含 §5.4 丢模型）；GDTF 教训只管游戏层——已按此改 rev3。

**第三轮已答（user 2026-09-20）**：(a) 一个 glb + `.glb` **同意**；(b)「整数的话能存多大的范围。要不要做 32 64 两个选项」→ §5.2：JSON 内联到 2⁵³ 精确（±9×10⁹ m），二进制写入器按包围盒自动选 int32/int64，不做用户选项；(c) store 头片 peek **同意**（escalate 走 `pwa-cloud-store` skill）；(d)「不懂」→ 人话：
- **分池**：文件里每个 group 自带自己的顶点/边/面表（没分组的几何在 0 号表），而不是整个组件一张大表再给每个元素标「属于哪个 group」。为什么：内核到底要不要让 group 内外的几何共用顶点还没定（B1），按 group 分表两种内核都能读。对用户无感。
- **extras 放 ECS**：glTF 每个节点都有一个自由 JSON 口袋叫 `extras`；关卡元数据（碰撞开关 / 出生点 / 巡逻路径这类游戏层信息）放这个口袋而不是我们的扩展，因为 Godot / Blender 导入 glb 时会自动把 extras 读进节点的 metadata / custom properties，三方引擎零代码就拿到。
- **override 只许不改几何**：同一个 component 的多个实例，每个实例可以单独换材质 / 隐藏，但不能单独改形状；要改形状 = SU 的 Make Unique（复制成新 definition）。就是 SU 的规则。
三条都按默认沿用。**(a)(c) 过 → A18 可开工，等 user「开做」。**

---

## 11. 落地顺序（0.5.0 转正纪元；等「开做」）

1. `src/format/`：GLB 读写（自写，零 three）+ `bakeGltf` + 缩略图渲染（walkable：headless three 渲一张 256 px）；golden：每个 golden 场景 write→read→write 逐字节一致；bake 用 three `GLTFLoader` 当三方验收；Blender 手验一次归 user 批。
2. 接 store（`pwa-cloud-store` skill；单一接缝 + 守卫 + 偏好搬库 + Azure personal-only 成对）；接 gallery（0.4.0；ADR-0013 互斥挂载；`#docTitle` 胶囊 = 文件名）；无地 = WeebPaint 标准三态 + T-crash。
3. store escalate：头片 peek（§9）。
4. A1 正经 undo 叠在 workpiece 写令牌协议上（先找 WeebPaint session 商量抽 `@internal/workpiece`；抽不成本地同名协议）。
5. QoL：A20 配色样张、A21 松笔 unsnap grill。

体重估算：format ~600 行 + 测试；store/gallery 接线 ~400 行；A1 归自己的条目。
