# CatsUp 持久化数据契约（远见版）—— 设计稿 rev3，等 grill 第三轮

> as-of v0.4.6 / 2026-09-20 · created by Claude Fable 5.1 2026-09-19 · **rev2 2026-09-20（edited by Claude Fable 5.1）：按 user 第二轮回答 + glTF 2.1 草案 schema + GDTF 教训重写；rev1 的「ORA 式 zip 薄壳」判**作废**，改为一个 `.glb`。rev3 同日：user 纠偏「我们不是游戏引擎，我们是 sketchup 竞品，也许有做 data driven 场景编辑器的潜力，所以我觉得我们的 spec 不会像 gdtf 里面说的那么未定型，而是有一个比较明确的图像」「还记得我说的那一大堆 component, group，以及丢 gltf 模型之类的早期设想吗」→ SU 竞品 + 场景编辑器的核心本体**现在写定**（§5），GDTF 教训只管游戏层词汇。**
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

## 5. `CATSUP_*` 扩展（核心本体：四个，现在写定）

命名照 glTF 规则（厂商前缀 + 下划线）；全部登记 `extensionsUsed`；每个带整数 `version`；总版本在 `CATSUP_document.formatVersion`。核心本体（B-rep / group / component / 丢模型 / 材质 / tags / views / 单位）的形状**在本节定死**；核心之外（游戏层词汇、地形、雕刻）不预留扩展名，立项条件 = 一个真实文件装不下。

### 5.1 `CATSUP_document`（文档级，挂顶层 `extensions`）

```jsonc
{ "formatVersion": 1,
  "settings": { "displayUnit": "m", "gridStep": 1, "snapIncrement": 0.1, "absoluteGrid": false },   // A10：内部永远米
  "tags":  [ { "name": "墙", "color": [r,g,b], "visible": true } ],                                    // SU Tags；元素按索引引用
  "views": [ { "name": "正面", "camera": <node idx>, "default": true, "spawn": true, "style": {} } ],  // SU Scenes；spawn = VR/步行出生点（A16 出生点 (0,−3) 朝北的文件版）
  "lastView": { … } }                                                                                  // 软字段，任何一端可覆盖
```
environment（天空 / 雾 / 风）等渲染纪元字段有内容时再加（同 formatVersion 内只加不改）。

### 5.2 `CATSUP_brep`（肥皂膜内核；挂在 definition 上）

```jsonc
{ "unit": 1e-6,                      // 顶点整数 → 米；= 内核 Q（立宪页 §0 格点身份）
  "groups": [                        // 每 group 一个池；0 号 = 未分组
    { "axes": { "origin":[0,0,0], "x":[1,0,0], "y":[0,1,0], "z":[0,0,1] }, "parent": null, "name": null, "locked": false, "hidden": false,
      "vertices": [x0,y0,z0, x1,y1,z1, …],       // 整数微米、Z-up、definition 局部系（JSON 内联）
      "edges":    [a,b, c,d, …],                  // 顶点索引对
      "edgeFlags":[0,0,2,…],                      // 位：1 soft 2 smooth 4 hidden
      "faces": [ { "outer":[…], "holes":[[…]], "m":[front,back], "uv":null, "hidden":false } ] } ] }
```

- **整数微米是谁要求的**（答 user）：不是外部要求，是**两条事实的交集**——内核的顶点身份就是 1 µm 整数格（`ptKey3` 取整，立宪 §0），而 float32 只有 24 位尾数，|x| > 8.4 m 就存不住 1 µm 格点（bake 用 float32 没关系，那是渲染）。**和 glTF 大家不冲突**：这些数只在我们的扩展里，三方不读；bake 的 `POSITION` 仍是标准 FLOAT。JSON 内联的 number 是 double，整数精确。**大模型时**（内容逼出来）换成 bufferView：2.1 公布稿说为扩展加了 `SIGNED_INT` / `DOUBLE` / `INT64` componentType（草案 schema 还没落），到时候用它；今天不依赖。替代方案「DOUBLE 存米」同样精确、体积翻倍、格点不显式——两者都行，整数更诚实。
- **每 group 一个池**：运行时「同池 + context 标签」vs「分池」未定（B1）；文件按 group 分池两边都能读（同池实现加载时按格点合并重合顶点 = 重合即同一）。这是本稿唯一为内核未定预留的形状。
- 平面注册表 / arrangement / faceLinks 不存（从 faces 确定性重建）；膜 = 文件内索引，不铸 id（涌现物，公理①）。材质索引指向 core `materials`（front/back 同 SU）；`uv` 缺省 = bake 时自动投影。

### 5.3 `CATSUP_definitions`（顶层）+ `CATSUP_instance`（节点）

- 顶层 `{ "root": 0, "list": [ { "name", "axes", "brep": <CATSUP_brep>, "children": [node idx…] } ] }`；模型空间 = `list[root]`（SU 的 model 也是一个 definition）。
- 节点 `CATSUP_instance: { "definition": i, "overrides": { "materials": { <face-material idx>: <material idx> }, "hidden": false } }` = drill ④「transform + reference + override」= ECS entity 形状；override 只允许**不改几何**的项（材质替换 / 显隐 / extras），改几何 = Make Unique（新 definition，SU 同款）。嵌套 = children 里再放 instance 节点（有限深 DAG，「component 引用 component 我倒能接受」）。
- core 里同一 definition 的实例共享一个 `mesh`；展平出的子树节点 `extras.catsup.flattened = true`，reader 不看。
- 跨文件的 definition（prefab 库）= 2.1 `externalAssets`（§5.4），不在本扩展里。

### 5.4 丢进来的 glTF 模型（原子；用 2.1 core，不另起扩展）

- **本体（proposal L21/L66，定型）**：一个 glb 模型是**原子**——不转成 SU 几何、不可进入编辑、game-ready 高模也安心放；文档里的足迹 = 一个节点 `{ translation, rotation, scale, externalAsset: i, extras: { …variation… } }`，`externalAssets[i].file → files[j]`。
- **两种存法都是标准的**（L66「not sure to ship it with level file or leave them as sidecar」→ 两个都给，按资产选）：`files[j].uri = "props/bench.glb"`（旁侧库，相对本文件所在 store 文件夹；Collection，改名裂引用是已知 wart）或 `files[j].bufferView`（内嵌，自包含）。内建资产（Tomato & Sam、缩小帽 rig）= app 保留 uri 前缀（三方见空节点，无所谓）。
- **variation 元数据**（L66「少量 variation 的 metadata」）= 该节点 extras：`{ tint, seed, clip:"scared", tags:[…] }`——键开放，属游戏层词汇（GDTF 纪律）。
- **组件与原子的关系**：definition 的 `children` 里可以放原子节点（家具进房子组件）；原子不能包含 SU 几何（它是叶子）。CatsUp 动词（拉出一只猫娘 / PickUp 栈 / drop）都是运行时，只落这一个节点。
- 三方读到：Blender / three 会按 2.1 把外部资产实例化进场景（2.0 加载器忽略 → 空节点）；「烘进来」的扁平导出（把原子 mesh 拷进本文件）另做。

---

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

**第三轮**：
- (a) §2「一个 glb」+ `.glb` 扩展名 —— 点头 / 打回？
- (b) §5.2 整数微米（JSON 内联；大模型时换 2.1 SIGNED_INT）—— 点头 / 改 DOUBLE 存米？
- (c) store 加「头片 peek」（§9）—— 准 escalate 到 store？
- (d) 4/5 两条沿用提案 —— 默认沿用，不点头也开工。
- (e) §5.3 override 只许不改几何项（材质 / 显隐 / extras），改几何 = Make Unique —— SU 同款，默认沿用。

---

## 11. 落地顺序（0.5.0 转正纪元；等「开做」）

1. `src/format/`：GLB 读写（自写，零 three）+ `bakeGltf` + 缩略图渲染（walkable：headless three 渲一张 256 px）；golden：每个 golden 场景 write→read→write 逐字节一致；bake 用 three `GLTFLoader` 当三方验收；Blender 手验一次归 user 批。
2. 接 store（`pwa-cloud-store` skill；单一接缝 + 守卫 + 偏好搬库 + Azure personal-only 成对）；接 gallery（0.4.0；ADR-0013 互斥挂载；`#docTitle` 胶囊 = 文件名）；无地 = WeebPaint 标准三态 + T-crash。
3. store escalate：头片 peek（§9）。
4. A1 正经 undo 叠在 workpiece 写令牌协议上（先找 WeebPaint session 商量抽 `@internal/workpiece`；抽不成本地同名协议）。
5. QoL：A20 配色样张、A21 松笔 unsnap grill。

体重估算：format ~600 行 + 测试；store/gallery 接线 ~400 行；A1 归自己的条目。
