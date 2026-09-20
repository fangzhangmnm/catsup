# CatsUp 持久化数据契约（远见版）—— 设计稿 rev7，第六轮已答

> as-of v0.4.6 / 2026-09-20 · created by Claude Fable 5.1 2026-09-19 · **rev2 2026-09-20（edited by Claude Fable 5.1）：按 user 第二轮回答 + glTF 2.1 草案 schema + GDTF 教训重写；rev1 的「ORA 式 zip 薄壳」判**作废**，改为一个 `.glb`。rev3 同日：user 纠偏「我们不是游戏引擎，我们是 sketchup 竞品，也许有做 data driven 场景编辑器的潜力，所以我觉得我们的 spec 不会像 gdtf 里面说的那么未定型，而是有一个比较明确的图像」「还记得我说的那一大堆 component, group，以及丢 gltf 模型之类的早期设想吗」→ SU 竞品 + 场景编辑器的核心本体**现在写定**（§5），GDTF 教训只管游戏层词汇。**rev4 2026-09-20**：user「核心还是 sketchup，好好想一下」→ §5 改成 **SketchUp .skp 本体逐项对照表**（Edge/Face/Curve/Group/Definition/Instance/Image/SectionPlane/Guide/Dimension/Text/Material/Tag/Scene/Style/Shadow/ModelInfo/Attributes），每项落哪、三方看到什么；第三轮 (a)(c) 同意、(b) 整数范围答在 §5.2、(d) 用人话解释在 §10；§3.1 答「和只支持 2.0 的工具兼容吗」。**rev5 2026-09-20**：user 第四轮「为什么用 json 而不是二进制。大文件啊。以及我还是希望 glb 节省流量的！你看我 catsup 也做的很抠。如果一个 n64 的小模型希望包大小也相应的很小」→ B-rep **全二进制**、bake 瘦身、§3.2 体积预算；「我记得我拍过，group 是纯编辑逻辑。是一个数组。component 才是 object 层…命名=commitment and frozen。我怕命名。group 是哑变量。就像用 tensor network 去逃 einsum 的上下表追踪」→ group 去掉 name/hidden/locked/tag，只剩成员 + 轴（考古：与 09-06「编辑时语义」、09-07 B13「transient、不命名、无 hierarchy tree」一致）；「我会支持 blender 式的有机体角色建模，骨骼，以及 minecraft 式的高度图和体素地形。所以自定义格式蛮多的。也许 backward compatibility 逃不了，而是应该第一天设计。每个子数据结构都有自己的版本拍，然后专门一个文件夹放迁移代码」→ §7 改：每个子结构 = 独立扩展 + 独立版本 + `src/format/migrate/`，后门退为兜底。**rev6 2026-09-20**：user 第五轮「关于面属性，可以想象超级马里奥 64 的关卡。确实会给面打 tag。tag 需要有很强的自定义性。所以也许 id+字符串名称表？然后保存的时候尽量用最低的位精度。能小就小。对于非 gltf 规范的可以用很小的位精度。这也是整数无损的好处之一。取决于 bbox 大小。那么 uv 的精度你怎么看，uv 很多场景会跑到 1 外面。以及 autouv 的时候也许不保存 uv。然后顶点色和顶点光照也是我未来一定会做的」→ §5.1 tag 表、§5.2 位宽 / 单位选择、面贴图定位（不存逐顶点 UV）、颜色层；§4 bake 的 tag 分 primitive 与 COLOR_n。**rev7 2026-09-20**：user 第六轮「90 亿米…这个心智模型舒服吗。这种核心用户契约还是要说清楚滴。然后约束好。no farland…这个比 int64 的更大的范围精度好，因为给 float64 面子了」「每个 blob 按需用最抠精度。比 int32 还抠的也有」「normal 没有的话有平滑组或者 auto angle 吗」「几何不管自定义游戏规则。只做 tag」「有特定 uv 也支持…不同的 uv data 也许需要和 geom 分拍版本？会不会太复杂了」「一组面用一个投影也是一种…gltf 这种交付物的格式比 blend 这种 content creation program 的格式要 wise？再学习一下 blend 和 skp」→ §3.3 世界尺度契约、§5.2 位宽阶梯 / 平滑 / 四档贴图定位 + 共享投影 / 流自描述、§12 .blend / .skp / glTF 策略对照。同轮追加「bake 应该不在数据契约里面而在导出器渲染器 spec 里面吧，到时候就事论事的干。就两个原则。1 省流。2 第三方查看器尽量 wysiwyg（which means gi baking, sometimes. lots of time i even use unlit and vertex color baked lighting. for game engine export there is another escape hatch. or when saving we can choose wysiwyg or game engine friendly）」→ §4 只剩两原则 + 保存模式字段，细则移出契约。**
> **性质：提案，未拍板。** user 原话定的题（2026-09-19）：「现在就设计一个有远见的持久化数据契约…看全量 wishlist 包括 overambitious…多依托现有规范」「尽量是类似 ora 的依照已经是格式标准的框架」「考虑后面会有 GTA VCS 级别的场景，甚至 zbrush」；第二轮（2026-09-19/20）：「我不喜欢散一地，但是我们也有 zip 了。以及是否可以就一个 glb。新的 gltf 规则本来就支持 thumb!」「远景还有就是我会 embedding weebpaint」「我确实喜欢整数。但是这个是谁要求的？会不会和 gltf 大家」「gltf 的 new spec 你看一下，有很多我会内耗的」「你可以看一下我以前打回的那个 GDTF 的 proposal，以及后来的反思反省。gtdf is obsolete!」「.catsup 还是 .glb」「无地按照 weebpaint 标准做」「可以 bump minor」「它是被内容需求逼出的自适应格式 嗯应该就是那个教训」。
> 时机：推翻 2026-09-06「SU 1.0 之后再定」（总账 B5）；容器：09-06 的「zip」拍板被 user 本轮「是否可以就一个 glb」重开——本稿答：可以，理由 §2。
> **持久化立宪（user 2026-09-20）：「我接受了 backward compatibility 之后就不需要后面啦。而且现在我们 backward compatibility 反而是第一天的设计立宪之一」→ 09-19 的后门政策（无向后兼容 + AI 脚本改 OneDrive）作废；向后兼容 = 第一天立宪，§7 是它的条文。追加：「第一天就做好完美 backward compatibility」「以后随着 gltf 格式进化，我们也会跟着变。比如如果 gltf 支持体素了，我们数据会和他对齐」「跨 gltf 版本的 compatibility 也要做」→ §7 第 9/10 款。**

---

## 0. 一页结论

- **文件 = 一个 `.glb`**（glTF 2.0 二进制容器，mimetype `model/gltf-binary`），**目标语义 = glTF 2.1**（Khronos 2026-06-11 公布的「复杂场景」修订，向后兼容；草案 schema 在仓库 `draft-2.1` 分支，规范文本未定稿）。没有 zip、没有散文件、没有 `.catsup`。
- **为什么 rev1 的 zip 壳作废**：它存在的三个理由——缩略图、多文件打包、跨文件引用——**2.1 全部进 core**（`asset.thumbnail` / `files` + `externalAssets` / `node.externalAsset`），第四个理由「贴图松散给 WeebPaint 改」被 user「我会 embedding weebpaint」取消。剩下唯一代价 = store 的封面 peek 从「zip 尾片」改「GLB 头片」，是一个小的库端 escalate（§9）。
- **ORA 类比落到哪**：ORA = 别人定的壳 + 标准内容层 + 我们的 `.weebpaint` 槽；glTF = Khronos 定的壳 + 标准内容层（三角 / 材质 / 灯 / 相机 / 动画 / 缩略图 / 外部资产 / 包围体）+ `extensions.CATSUP_*` 槽（authoring）+ `extras`（ECS 元数据）。**三方读 core 就够；core 永远是 bake。**
- **group = 哑变量**（user 09-20）：只是「成员的数组 + 一个轴框」，**没有名字、没有显隐 / 锁 / tag / attributes**——那些都在成员（边 / 面）和 object 层（component 实例）上；不显示、不进 hierarchy 树（B13）。
- **两个层，两种纪律**（user 09-20 纠偏后的口径）：**① SU 竞品 + data-driven 场景编辑器的核心本体是定型的，现在写全**——肥皂膜 B-rep、group（sticky 边界 + 轴框，编辑时语义）、component（definition + instance = transform + reference + override）、**丢进来的 glTF 模型 = 原子**（不进 SU 数据结构，足迹 = transform + reference + 少量 variation 元数据 = ECS entity，proposal L21/L66）、材质（面前后）、tags / hide、scenes（相机）、单位；**② 游戏层词汇（extras 里的组件包）才适用 GDTF 教训**（user 2026-08-14：「genre 的原语归私设。我掉进的坑就是 universal-ness」「我不定规矩，规矩自己长出来。被内容逼出来」「关系型也是表。guid 阴魂不散」）→ 组件键开放集、不预定义 genre 原语、不铸 id 除非跨文件引用逼出来（那时用 2.1 UID）。
- **远见三件的落点**：GTA VCS 级 = 2.1 core（`externalAssets` + 包装成 bufferView 的 `files` + `boundingVolume` BVH + 64 位 GLB v3 + `EXT_mesh_gpu_instancing`），零自造；ZBrush / Blender 有机体 / 骨骼 / 高度图 / 体素（user 09-20）= **各自一个 `CATSUP_*` 子结构扩展，各自独立版本戳**（§5.7、§7）；bake 全走 core（三角 / skins / mesh），三方都看得见。**B-rep 全二进制**：顶点整数微米 int32（按包围盒自动升 int64）、边/面/组是索引流，只有结构与小元数据是 JSON（§5.2）。
- **世界尺度契约 = no farland**（user 09-20；§3.3）：**单个 definition 内 ≤ 4 000 km 半径（2²² m）**，内核算术 ulp < 1 nm，每次推断都精确落回 1 µm 格；**世界（实例摆放 / 外部 cell）≤ 9.0×10⁹ m 半径（2⁵³ µm，给 float64 面子）**，实例平移在我们的扩展里存精确整数微米；越界 = 拒绝操作并报出，**永不降精度**。Outer Wilds 整个星系塞在一个 definition 里都绰绰有余。
- **抠**（user「我还是希望 glb 节省流量的」）：bake 去 NORMAL（规范要求加载器自算平面法线）、位置 int16 量化（`KHR_mesh_quantization`，2.1 升 core）、无贴图时顶点共享、uint16 索引、缩略图 192 px JPEG；N64 小模型目标 **≤ 60 KB 裸 / ≤ 35 KB meshopt**（§3.2 预算表）。
- **演化 = 立宪：向后兼容第一天设计**（§7；user 09-20「backward compatibility 反而是第一天的设计立宪之一」）：每个子结构独立版本戳 + `src/format/migrate/` + 冻结旧样本语料 + round-trip 保真；老文件永远能开；**后门作废**。**无地 = WeebPaint 标准**（§6）：transient / 文件家 / 图库家三态，IDB 永不当家，T-crash 盲快照。

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
  [0] 缩略图 JPEG 字节（192 px 长边，≈ 8–12 KB；排第一，头片 peek 用）
  [1..] bake 的 accessor 数据、贴图字节、（将来）ora 源 / 地形数据 / 大 B-rep 的整数 bufferView
```

- `asset.version "2.1"` + `minVersion "2.0"`：我们用的 2.1 属性全部可被 2.0 加载器忽略（three GLTFLoader / Blender 只认 major），`minVersion` 就是规范给这种情况的字段。规范未定稿的属性名若变 → 后门脚本改名（§7）。
- **全部大数据走 BIN chunk**：bake accessor、贴图、B-rep 索引流、将来的 mesh / 骨骼权重 / 高度图 / 体素块。JSON chunk 只有结构与小元数据（目标 < 20 KB）。
- 定型即用的 2.1 内容：`asset.thumbnail`（现在）、`files` + `externalAssets` + `node.externalAsset`（丢模型，形状现在定、prefab 纪元实现）；`shapes` / UID / 新 componentType 属于游戏层或大模型，等内容逼出来。

### 3.2 体积预算（答「抠」；估算，写入器落地后用 golden 体积测试钉死）

样本 = 「N64 小模型」：500 面 / ~1000 顶点 / ~800 边 / 2 张 64×64 贴图。

| 部件 | 存法 | 估算 |
|---|---|---|
| JSON 结构（asset / materials / nodes / definitions / document） | 文本 | ~3 KB |
| B-rep 顶点 | 最粗整除单位（多为 mm）+ 包围盒相对、uint16 ×3 | 6 KB（µm/int32 兜底 12 KB） |
| B-rep 边 + 标志 + 组索引 | uint16 对 + uint8 + uint16 | ~5 KB |
| B-rep 面（环流 + 材质对 + 标志 + 组索引 + tag） | uint16 流 | ~9 KB |
| 贴图定位 | 只有显式定位的面，每面 24–32 B 定点 | ~1 KB |
| 颜色层（若有） | 每面角 rgb8 | ~7 KB / 层 |
| bake 位置 | int16 量化（`KHR_mesh_quantization`），无 NORMAL，顶点共享 | 6 KB |
| bake 三角 + 边线索引 | uint16 | ~12 KB |
| 贴图 | png 原样 | ~4 KB |
| 缩略图 | JPEG 192 px | ~10 KB |
| **合计** | | **≈ 55 KB**（无颜色层）；`EXT_meshopt_compression`（bake 与 B-rep 的 bufferView 都能压）后 **≈ 30 KB** |

对照：rev3/4 的 JSON 内联 B-rep ≈ 150–200 KB；带 float32 法线不共享顶点的朴素 bake ≈ 400 KB。规则：**裸二进制先落地，meshopt 是同一纪元内的开关**——golden 体积测试给每个 golden 场景一个预算，超了就开压缩。bake 各行的数字只是导出器的目标（§4 原则一），怎么达到归导出器 spec。

### 3.3 世界尺度契约（no farland；答「这个心智模型舒服吗…说清楚、约束好」）

两个半径，两种保证，都是**硬边界**（越界拒绝，不是渐变劣化——Minecraft Far Lands 是 float 精度渐变出来的，我们没有渐变）：

| 层 | 半径 | 为什么是这个数 | 保证 |
|---|---|---|---|
| **单个 definition 的几何**（一个组件 / 模型空间里的裸几何） | **4 000 km**（2²² m，地球半径量级） | 内核用双精度米做算术（平面拟合、交点、公垂点），double 在 2²² m 处 ulp = 2⁻³⁰ m ≈ 1 nm ≪ 1 µm 格，所以每次推断的结果量化回格点时**无歧义**；再远 ulp 会逼近 µm，重合即同一开始误判 | 推断精确、sticky 不误判、无抖动 |
| **世界**（实例平移、外部 cell、相机） | **9.0×10⁹ m**（2⁵³ µm；user「给 float64 面子」） | 文件里实例平移存精确整数微米（`CATSUP_instance.translationUm`，int64 但值 < 2⁵³），app 内用 double 读回仍是精确整数；bake 的 `node.translation` 是 float32（三方渲染用，9×10⁹ m 处分辨率 512 m，只影响三方看到的摆放，不影响我们） | 摆放精确到 1 µm；跨实例推断（吸到 9×10⁹ m 外另一实例的顶点）允许 ±2 µm 误差但仍落格点、不漂 |

- 心智模型：**一个 Outer Wilds 星系 ≪ 一个 definition**；晶壁系半径 = 9×10⁹ m（≈ 0.06 AU，比真的托勒密 / Spelljammer 晶壁小，比任何关卡大 10⁶ 倍）。
- 要比 4 000 km 大的东西 = 拆成多个 definition / cell 用实例摆（floating-origin 的标准做法，也是 SU 的做法）。
- 文件层允许 uint64 编码但值永不超 2⁵³；int64 「更大的范围」没有意义，因为内核是 double——user 判断正确。

### 3.1 和只支持 glTF 2.0 的工具兼容吗（答 user）

**兼容，而且是规范保证的**：GLB 容器仍写 version 2（v3 只在 > 4 GiB 时）；2.0 规范要求加载器**忽略不认识的属性和未声明为 required 的扩展**，`extensionsRequired` 永远空；`asset.minVersion: "2.0"` 就是规范给「文件是 2.1 但 2.0 能开」这种情况的字段（three GLTFLoader 只拒 major < 2；Blender / Godot 只认 major）。2.0 工具看到的 = 全部 bake（三角 / 边线 / 材质 / 灯 / 相机）；看不到的 = 缩略图（`asset.thumbnail` 是 2.1）、外部资产节点（2.1；显示为空节点）、包围体、我们的 `CATSUP_*`。**为了不碰 2.0 校验器会报错的地方**：整数 B-rep 数据**不走 core `accessors[]`**（2.0 的 componentType 枚举没有 int32/int64），而是扩展直接引用 `bufferView` + 自己声明布局（`KHR_draco` / `EXT_meshopt` 就是这么做的）；严格校验器最多给「未使用的 image / bufferView」「未知属性」warning，不报 error。等 2.1 定稿、three/Blender 出 2.1 加载器，缩略图和外部资产自动亮起来，文件不用改。

---

## 4. core = bake：契约只定两条原则，细则归导出器 spec

user 09-20：「bake 应该不在数据契约里面而在导出器渲染器 spec 里面吧，到时候就事论事的干。就两个原则。1 省流。2 第三方查看器尽量 wysiwyg」。所以本节只写**契约层**的四句话，其余全部归将来的 `ai-docs/<date>-bake-exporter-spec.md`（与渲染引擎 A4 同一个 spec，因为 bake 就是 RenderScene 的文件版）：

1. **core 是 bake、只写不读**：app 读文件只读 `CATSUP_*` 重建内核，再自己 bake；core 只为三方与「authoring 坏了创意不丢」（E1）。bake 可再生 → 迁移只搬 authoring。
2. **原则一：省流**——体积预算（§3.2）是导出器的验收指标，手段（量化、去法线、顶点共享、按需 NORMAL、meshopt…）由导出器 spec 就事论事。
3. **原则二：第三方查看器尽量 WYSIWYG**——CatsUp 里看到什么，Blender / 网页 viewer / OneDrive 预览就看到什么：常用形态 = `KHR_materials_unlit` + 顶点色 × 烘焙光照预乘进 `COLOR_0`；需要时烘 GI。
4. **保存模式（user「when saving we can choose wysiwyg or game engine friendly」）**：保存时二选一，文件记录 `CATSUP_document.bake = { "mode": "wysiwyg" | "engine", "generator": "…" }`——`wysiwyg` = 上面那种（三方看到的就是画面）；`engine` = 引擎友好（PBR 材质、颜色层分开不预乘、tag/extras 齐全、不烘 GI）；游戏引擎导出另有逃生口（专门的导出动词，产物不是本文件）。两种模式 authoring 层完全相同，只是 core 不同。

坐标约定仍是契约（导出器不能改）：core 按 glTF +Y 上、米，换轴只在 `src/format/` 边界；`CATSUP_*` 内 Z-up、米。`KHR_interactivity` 不装逻辑（§5.2「几何零语义」同理）。

## 5. 核心本体 = SketchUp（user「核心还是 sketchup，好好想一下」）

方法：拿 SketchUp 的 .skp 本体（Ruby API 的实体类 + Model Info + Scenes/Styles/Shadows）逐项过一遍——**每一项要么有落点，要么写明「不做」**；再叠 data-driven 场景编辑器的三件（丢 glTF 原子 / 灯 / extras）。形状在本节定死，实现分纪元。

### 5.1 SketchUp 本体 → 文件（对照表）

| SketchUp | 我们存哪 | 三方看到（**示意**，细则归导出器 spec） | 实现 |
|---|---|---|---|
| **Edge**（soft / smooth / hidden / 投影阴影） | `brep.edges` + `edgeFlags` 位 | `LINES`（hidden 不出） | 现在 |
| **Face**（loops 带洞、前/后材质、每顶点 UV 贴图定位、hidden、cast/receive shadows） | `brep.faces[{outer, holes, m:[front,back], uv, hidden, flags}]` | `TRIANGLES`（按材质分 primitive；前后材质 = 两组或 `doubleSided`） | 现在（uv / m 贴图纪元填） |
| **Curve / ArcCurve**（圆 / 弧 / 多边形 / 徒手 = 一串边当一个实体：选一段全选、可平滑、保留圆心半径参数） | `brep.curves[{edges:[…], kind:"arc"|"circle"|"polygon"|"freehand", params:{center, radius, normal, startAngle, endAngle, sides}}]` | 同上（只是段） | 圆/弧工具纪元 |
| **Group**（SU：自己的轴、可选名字、hidden、locked、tag、attributes、可嵌套） | **user 模型胜过 SU**：group = 哑变量 = 成员数组 + 轴框，**无名字 / 无 hidden / 无 locked / 无 tag / 无 attributes**（这些在成员与 component 实例上；「隐藏这个组」= 成员全标 hidden）；可嵌套（parent）；存法 = 每边 / 每面一个 `group` 索引 + `groups[{axes, parent}]`（§5.2） | 不可见（顶点已在 definition 坐标） | 现在（axes 先恒等） |
| **ComponentDefinition**（名字、描述、轴/插入点、**行为**：glue-to 面 / cuts opening 挖洞 / always face camera 纸片人 / shadows face sun；内容 = 一整套 entities） | `definitions.list[{name, description, axes, behavior:{glueTo:"any"|"horizontal"|"vertical"|"sloped"|null, cutsOpening, faceCamera, shadowsFaceSun}, brep, nodes:[…], annotations:{…}}]` | 一个共享 `mesh` | 现在（behavior 先全 null/false） |
| **ComponentInstance**（变换、名字、hidden、locked、实例级材质覆盖、attributes） | 节点 + `CATSUP_instance{definition, overrides:{materials, hidden, locked}}` + `extras` | `node{mesh, TRS}`（`KHR_node_visibility`） | 现在 |
| **文件当组件**（导入一个 .skp = 一个 component；Reload 同步） | 2.1 `externalAssets` 指向另一个 **CatsUp `.glb`**（其 root definition 就是这个组件；可编辑、可 reload）——与「丢进来的外来 glb 原子」（不可编辑）用同一机制，靠对方有没有 `CATSUP_document` 区分 | 2.1 加载器实例化；2.0 空节点 | prefab 纪元 |
| **Image**（导入图片当参考 / 贴图面；有尺寸与变换） | `definitions.list[i].annotations.images[{image:<idx>, size:[w,h], transform}]`（= 纸片人 reference plane，far-horizon §1） | **可见**：bake 成带贴图的四边形 mesh | 参考图纪元 |
| **SectionPlane**（剖切面：位置 / 法向 / 名字 / 激活；建筑核心） | `annotations.sectionPlanes[{origin, normal, name, active, symbol}]`；scene 记哪张激活 | 不出（extras 备查） | 剖切纪元 |
| **ConstructionLine / ConstructionPoint**（卷尺 / 量角器留下的辅助线点，可擦） | `annotations.guides[{kind:"line"|"point"|"ray", origin, dir?, stipple}]` | 不出 | 卷尺纪元 |
| **Dimension**（线性 / 半径标注）、**Text**（屏幕 / 引线文字）、3D Text（= 面，已覆盖） | `annotations.dimensions[…]` / `annotations.texts[{anchor, text, leader, screen?}]` | 不出（extras 备查） | 标注纪元 |
| **Material**（名、颜色、贴图 + **贴图在模型里的实际尺寸**、透明度、colorize） | core `materials` + `extras.catsup{ textureSize:[w,h], colorName }` | `materials`（PBR；无光照风格 = `KHR_materials_unlit`） | 贴图纪元 |
| **Layer / Tag**（SU：名、颜色、可见、文件夹）+ **马里奥 64 式面属性**（user：地面类型 / 岩浆 / 冰面 / 音效面…「tag 需要有很强的自定义性，id + 字符串名称表」） | `document.tags[{ id, name, color, visible, folder, extras }]`（**id 是身份、name 只是显示**：改名不动几何；`extras` 装自定义数据，如 `{surface:"lava", damage:1}`）；边 / 面 / 实例节点各**一个** `tag` id（uint16，0 = 无；组合语义 = 建一个组合 tag，SM64 同款「死表」）；**group 不带 tag**（「给组打 tag」= 成员全打） | bake 按 (材质, tag) 拆 primitive，primitive `extras.tag = name`（Blender / Godot 都能读到）；标准追随候选 = `EXT_mesh_features` + `EXT_structural_metadata`（Cesium 的「feature id + 属性表」，就是 id + 名称表的 glTF 标准版；等有消费者再切） | 现在（tags 表可空） |
| **Scene / Page**（相机 + 保存项：hidden 几何、可见 tags、激活剖面、style、阴影设置、轴位置；过渡时间） | `document.views[{name, camera:<node>, saved:{tags, sections, style, shadows, hidden}, spawn, transition}]` | `cameras` | 现在（只 camera + lastView） |
| **Style**（边：轮廓线 / 延伸 / 端点 / 深度提示；面：着色 / 贴图 / 单色 / X 光 / 线框 / 隐藏线；背景 / 天空 / 地面色；辅助线可见性） | `document.styles[{…}]` + `views.saved.style`（Workbench 的显示参数，A8 轮廓线在此） | `extras.catsup.background` 可选 | 样式纪元 |
| **Shadow Info**（地理位置 lat/long/北偏角、日期时间、明暗、落在面 / 地面） | `document.geo{lat, lon, northAngle}` + `document.shadows{time, date, on, light, dark}` | **烘一盏太阳**：`KHR_lights_punctual` directional（方向按地理+时间算）——三方直接有光 | 阴影纪元 |
| **Model Info**（单位 / 精度 / 长度吸附 + 增量 / 角度吸附；文件信息 作者 描述） | `document.settings` + `asset.copyright` / `extras.catsup.description` | `asset` | 现在 |
| **模型轴**（Axes 工具移过的原点/朝向） | `document.axes{origin, x, y, z}`（只影响推断与显示，顶点不动） | — | 轴工具纪元 |
| **AttributeDictionary**（每实体任意键值：动态组件、IFC 分类、插件数据） | 节点 / definition = glTF `extras`；brep 元素 = 元素上的 `extras` 键（同名，同规则：未知保留） | `extras` | 现在（空） |
| Hidden / Locked（每实体） | 边 / 面 `hidden` 位；实例节点 `hidden` / `locked`（group 不带） | `KHR_node_visibility` | 现在 |
| Camera（透视 / 平行、fov、eye/target/up） | core `cameras` + `document.lastView` | `cameras` | 现在 |
| Outliner / Entity Info / 统计 | 派生，不存 | — | — |
| Follow Me / Sandbox / Solid Tools / Intersect / Offset | 工具，产物是几何 | — | — |
| Match Photo | scene + image，等参考图纪元 | — | 后 |
| Dynamic / Live Components | attributes（extras），等 | — | 后 |
| 3D Warehouse / Extension Warehouse | externalAssets / 插件扩展 | — | 后 |
| **不做**：Classifier（IFC 树）、LayOut 联动、Trimble Connect | — | — | — |

**data-driven 场景编辑器叠加的三件**（SU 没有）：**丢进来的外来 glb 原子**（§5.5）、**灯**（节点 + `KHR_lights_punctual`，core）、**ECS 元数据**（节点 `extras` 组件包；游戏层词汇，GDTF 纪律）。

**第二内核 / 地形子结构**（user 2026-09-20「我会支持 blender 式的有机体角色建模，骨骼，以及 minecraft 式的高度图和体素地形」；far-horizon §3.5「地形 = 独立 type」）：各自一个扩展、各自版本戳，挂在 definition 上（B2「type = 组件包」：一个 definition 可同时带 brep / mesh / armature…）：

| 子结构 | authoring 扩展（形状等各自纪元） | 三方看到（示意，归导出器 spec） |
|---|---|---|
| Blender 式有机网格（四边 / n-gon、非平面、无 sticky） | `CATSUP_mesh`（顶点 int32 µm、多边形流、UV/法线选项、polygroup、掩码 `_MASK`） | `TRIANGLES`（三角化）+ `COLOR_0` polypaint |
| 骨骼 / 权重 / 姿态 | `CATSUP_armature`（编辑态：骨长、roll、IK 目标、对称）；权重与静止姿态本身就是 core | `skins` + `joints` + `animations` |
| Minecraft / WoW 式高度图（网格 + 高度 + splat + 块类型） | `CATSUP_heightmap`（grid、png16 高度 bufferView、splat、cell 参数） | 烘成 mesh |
| Minecraft 式体素 | `CATSUP_voxel`（调色板 + chunk 化 run-length 块流） | 烘成 mesh（贪心合并面） |
| ZBrush 式雕刻层级 | `CATSUP_sculpt`（基笼 + 每级位移） | 顶级 mesh |

### 5.2 `CATSUP_brep`（肥皂膜内核；每个 definition 一份；**全二进制、最低位宽**）

> rev9 2026-09-20：user 拍板——面环 = 顶点索引环 / 存平面（定点）/ 顶点规范序 / **面无朝向、材质按平面侧挂**（「正反只是闭流形的渲染优化」；bool 需要的朝向运算时从闭壳传播推导，脏几何失败是拓扑原因，SU Solid Tools 同样拒绝）/ **材质槽 + 实例重映射**（「更类似游戏引擎」）/ **flags 是引擎的、tag 是 user 的，按域命名属性层 + 同规则共享（ECS/palette）**（「不需要劳烦 user 管理有几个 flag…每个几何记自己的，就像 blender 的 property…同 flag set 的引用同一个规则」）。

```jsonc
{ "version": 1,
  "unit": 1e-3, "origin": [x,y,z],                                     // 单位 = 能整除全部坐标的最粗档；origin = 包围盒角（整数微米）；坐标 = 无符号整数
  "vertexCount": 1000, "vertices": { "bufferView": 3, "componentType": "uint16" },   // ×3；规范序：整数 (z,y,x) 排序 → 同几何同字节
  "edgeCount":   800,  "edges":    { "bufferView": 4, "indexType": "uint16" },       // 顶点索引对 (min,max) 排序；两点至多一边（A3）
  "planeCount":  40,   "planes":   { "bufferView": 5 },                              // 每平面 [nx,ny,nz: int32 定点 2^-30, d: int64 µm]；τ 合并后的注册参数（重建不等价，必须存）
  "faceCount":   500,  "faces":    { "bufferView": 6, "indexType": "uint16" },       // 环流：每面 [nRings, len0, v…, len1, v…]；外环在该平面基下 CCW、洞 CW
                       "facePlane": { "bufferView": 7 },                             // uint16 平面索引（面唯一的结构字段）
  "attributes": {                                                                    // 按域的命名属性层（Blender property / glTF 命名顶点属性套路）
    "edge":   { "soft": {…}, "smooth": {…}, "hidden": {…}, "noShadow": {…}, "group": {…}, "tag": {…} },
    "face":   { "material": { "type": "u16x2", … },   // [+n 侧槽, −n 侧槽]，0xFFFF = 无
                "hidden": {…}, "noCast": {…}, "noReceive": {…}, "group": {…}, "tag": {…}, "mapping": {…} },
    "corner": { "uv": {…}, "paint": { "type": "rgb8", … }, "bakedLight": { "type": "rgb8", "derived": true, "bakeHash": "…" }, "uv2": { "type": "unorm16", "derived": true, … } },
    "vertex": {} },
  "curves":  [ { "edges": [12,13,14], "kind": "arc", "params": { "center": [µm×3], "radius": µm, "normal": [2^-30 ×3], "xaxis": [2^-30 ×3] } } ],
  "groups":  [ { "axes": {…}, "parent": null } ],                                    // group = 哑变量：只有轴框与嵌套
  "extras":  {} }
```

**属性层的三条规则**：
1. **名字归属**：app 定义知名名字（上面那些；语义写在本稿 + 代码常量表，user 不管理）；插件 / 用户属性用前缀命名（`plugin:x` / `user:x`），读取器**未知名字原样保留**。tag 仍是 user 的标签机制（§5.6 tags 表，id + 名字 + extras）；属性层里的 `tag` 只是那个 id。
2. **编码由写入器按层选**（自描述，读取器全认）：`dense`（typed 流：u8/u16/u32/rgb8/unorm16/定点 i32…）/ `bits`（bool 位打包）/ `palette`（**同规则共享**：去重后的值表 + 每元素一个 u8/u16 索引——(flags, material, tag) 元组只有十来种组合时 1 B/面）/ `sparse`（面索引表 + 值，显式贴图定位 / 显式 UV 这种少数面才有的）。缺省值（全 0 / 全 false）整层省略。
3. **状态 vs 派生**：`derived: true` 的层（bakedLight / uv2 / lightmap 图集）带 `bakeHash`，可丢可重算，数据类 = 随文件运输的缓存。

其余要点：
- **面无朝向**：面只有 `material = [+n 侧, −n 侧]`（平面注册后 n 不变、跨会话稳定），「翻转」= 交换两槽；「正面」在导出派生（仅一侧有材质 → 绕向朝它剔背面；两侧 → 双面；都没 → 闭合外向 / 开放双面）。内核「换平面重拟合跟随保 id」处新旧 n 反号时交换两槽。bool / 实体编辑：闭壳上传播绕向 + 有向体积定外向（运算时派生）；脏几何走 Intersect Faces 式纯膜切割。
- **材质槽**：`material` 的值是 definition `materialSlots` 的槽号（§5.3），实例 `overrides.slots` 重映射（§5.4）。
- **存平面**：`n` int32 定点 2⁻³⁰（角误差 ~1e-9 rad，4 000 km 处 4 µm ≪ τ）+ `d` int64 µm；写→读→写幂等；只存有面引用的平面。
- **最低位宽**：单位最粗整除档 + 包围盒相对 + uint8/16/32/64 阶梯；索引按 count；不 bit 打包（bool 层例外），压缩交 `EXT_meshopt_compression`。
- **贴图定位四档**（`face.mapping`，sparse）：默认不存 / projected 投影共用 / 仿射 6 / 射影 8；定点 2⁻¹⁶；显式逐角 `corner.uv` 是第四档。
- **不存**：`faceLinks`、环 2D `pts`、平面基、法线（smooth 在 bake 时算）、任何 id（跨文件引用用 2.1 UID）、事件日志。
- **装载 = `Kernel.fromBrep`**：建图 → 精确注册平面 → 按顶点环铸膜 → 重算 pts → `rebuildFaceLinks` → 面环自洽不变量（环边存在 / 无重边 / 无孤点 / 同环唯一膜 / 绕向与平面一致）；失败整文件拒开报出，不静默修；落地回写立宪页。

### 5.3 `CATSUP_definitions`（顶层）

```jsonc
{ "root": 0,
  "list": [ { "name": "model", "description": "", "axes": {…},
              "behavior": { "glueTo": null, "cutsOpening": false, "faceCamera": false, "shadowsFaceSun": false },
              "materialSlots": [ <core material idx>… ],                // user 09-20 拍板：definition 声明材质槽，面引用槽号；实例可重映射任意槽（§5.4）——不抄 SU 的「默认材质向上继承」（引擎 / KHR_materials_variants 套路）
              "brep": <CATSUP_brep>,                                      // 组件包：也可带 mesh / armature / heightmap / voxel（§5.1 末表；各自独立版本）
              "nodes": [ <node idx>… ],                                   // 实例 / 原子 / 灯 / 相机
              "annotations": { "images": [], "sectionPlanes": [], "guides": [], "dimensions": [], "texts": [] },
              "extras": {} } ] }
```
模型空间 = `list[root]`（SU 的 model 也是一个 definition；文件当组件 = 别人的 root）。

### 5.4 `CATSUP_instance`（节点）

`{ "definition": i, "translationUm": [x,y,z], "overrides": { "slots": { <slot idx>: <core material idx> }, "hidden": false, "locked": false } }` = drill ④「transform + reference + override」= ECS entity 形状。**材质槽重映射（user 09-20「材质同意。这样更类似游戏引擎」）**：同一组件的不同实例换色 = 重映射槽，不用 Make Unique，且能覆盖任意槽（比 SU 只继承「默认材质」强、无魔法态）；油漆桶：对象模式点实例 = 重映射光标下那个槽，编辑模式点面 = 改 definition（全体实例变）。`translationUm` = 精确整数微米（§3.3 世界半径 2⁵³ µm 的承重字段）；core `node.translation` 是它的 float 影子，旋转 / 缩放只在 core。override 只允许**不改几何**的项，改几何 = Make Unique（新 definition，SU 同款）。嵌套 = definition 的 nodes 里再放 instance 节点（有限深 DAG）。core 里同一 definition 的实例共享一个 `mesh`；展平出的子树节点 `extras.catsup.flattened = true`。

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
3. **每个子结构独立版本戳 + app 内迁移文件夹**（user 2026-09-20「也许 backward compatibility 逃不了，而是应该第一天设计。每个子数据结构都有自己的版本拍，然后专门一个文件夹放迁移代码」）：`CATSUP_document / brep / definitions / instance / mesh / armature / heightmap / voxel / sculpt` **各自** `version` 整数，互不牵连（改 brep 布局不动 armature）；迁移代码全部住 `src/format/migrate/<extension>/v<N>-to-v<N+1>.ts`，每个 = 纯函数（JSON + bufferView 进 → 出），读取器逐级链式升到当前版，写入器只写当前版；**语料 = `test/fixtures/format/<extension>/v<N>/*.glb`**（每发过一版就冻结一份样本，迁移测试 = 旧样本 → 当前 → 与 golden 逐字节一致）。**算法也是格式的一部分**：autoUV 投影算法、位宽 / 单位选择规则都由 brep `version` 覆盖——算法改了 = 版本 +1 + 一条迁移（如把旧算法下的受影响面冻结成显式映射），不许静默改变老文件的外观。
4. **拒开只剩一种情况**：子结构版本比 app 自己**新**（不能降级、不猜）→ 原文报版本。旧的一律能开。
5. **后门作废**（user 09-20「我接受了 backward compatibility 之后就不需要后面啦」）：不再有「AI 脚本进 OneDrive 改文件」这条路；任何格式改动都必须附带迁移函数 + 冻结样本，否则不许合并（这是立宪条款，与立宪页「改核心必回写」同级）。
6. **让迁移便宜**：`src/format/` 纯模块（零 DOM / 零 three / node 可 import；GLB 读写自写）；bake 可再生（迁移只搬 authoring，bake 整个重烘）；2.1 属性名定稿前变动 = 一条 document 迁移。**迁移写入的时机**：读到旧版 → 内存升级 → 只有用户真的保存时才写新版（不静默改云端字节；读不等于写）。
7. **GDTF 教训的执法范围 = 游戏层词汇**（extras 组件包）：不预定义 genre 原语；不为 universal 加层。核心本体与已点名的子结构（§5）不适用——形状允许先于内容，靠各自版本戳吸收改动。
8. 宣发前后同一规则：迁移链只增不删，老文件永远能开。
9. **「完美」的定义**（user 09-20「第一天就做好完美 backward compatibility」）：**CatsUp 任何发布版写出的任何文件，当前版都能开且语义无损**——验收 = 冻结样本 → 读 → 写 → 再读，与「直接读样本」语义逐字段一致，且样本自身在语料库里永不删；三方改过的文件（Blender 往返）按 round-trip 保真规则尽量保留。第一天 = 0.5.0 的第一个 golden 文件就进语料库；没有「太早不用兼容」的豁免期。
10. **标准追随迁移 + 跨 glTF 版本**（user 09-20「随着 gltf 格式进化，我们也会跟着变。比如如果 gltf 支持体素了，我们数据会和他对齐」「跨 gltf 版本的 compatibility 也要做」）：
   - 每个 `CATSUP_*` 扩展在本稿登记它的**标准替代物**（已有或预期）；一旦 glTF core / 已批准的 KHR·EXT 覆盖同一数据，**写入器改写标准形、读取器保留旧扩展的读法**（一条 `CATSUP_x@vN → <标准>` 迁移），不写双份。已知对照：`CATSUP_ref`→2.1 `externalAssets`（已改）；缩略图→2.1 `asset.thumbnail`（已用）；整数顶点→2.1 `SIGNED_INT`/`INT64` accessor（等定稿）；`CATSUP_voxel`→将来的体素扩展；`CATSUP_mesh` 的 polygroup / 掩码→`_GROUP` / `_MASK` 顶点属性（core 已允许）；碰撞代理→2.1 `shapes`；LOD→到时候的 KHR。
   - **跨 glTF 版本**：读取器接受任何 `asset.version` 2.x 与 GLB 容器 v2/v3；迁移键 = (glTF 版本, 扩展, 扩展版本)；2.x 之间的改名 / 废弃（如 2.1 废弃多 scene）由 `src/format/migrate/gltf/` 承接；语料库按 glTF 版本分目录（`test/fixtures/format/gltf-2.0/`、`gltf-2.1/`…），每次我们改写的目标版本变了就冻结一份。
   - 写入目标 = 「当时 three / Blender 已支持的最高版本」（不为了 spec 定稿抢跑：定稿而加载器没跟上时仍写旧形 + `minVersion`）。

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
三条都按默认沿用。

**第四轮已答（user 2026-09-20）**：「90 亿米多大」→ 9×10⁹ m ≈ 0.06 AU ≈ 23 个地月距离 ≈ 6.5 个太阳直径，连水星轨道（5.8×10¹⁰ m）的六分之一都不到——**已无关**：JSON 内联作废，二进制 int32 = 每 definition ±2147 m、自动升 int64。「为什么 json 不用二进制、要抠」→ §5.2 全二进制 + §4 bake 瘦身 + §3.2 预算表。「group 是纯编辑逻辑、一个数组、哑变量、怕命名」→ §5.1/§5.2 group 只剩轴框 + 成员索引。「有机体 / 骨骼 / 高度图 / 体素…backward compatibility 第一天设计，每个子结构版本戳 + 迁移文件夹」→ §5.1 末表 + §7；「接受了 backward compatibility 之后就不需要后门啦…是第一天的设计立宪之一」→ 后门作废，§7 = 立宪条文；「第一天就做好完美 backward compatibility」「跟着 gltf 进化对齐（体素等）」「跨 gltf 版本兼容也要做」→ §7 第 9/10 款。

**第五轮已答（user 2026-09-20）**：马里奥 64 式面 tag → `document.tags` = id + 名称表（id 身份、name 显示、extras 自定义数据），每元素一个 tag id，bake 按 (材质, tag) 拆 primitive + `extras.tag`，标准追随候选 `EXT_mesh_features`/`EXT_structural_metadata`；最低位宽 → 写入器两步选（最粗整除单位 + 包围盒相对无符号位宽）叠 meshopt，不做 bit 打包；UV → 不存逐顶点 UV，面贴图定位 = 仿射 6 / 射影 8 定点整数（2⁻¹⁶，范围不受 [0,1] 限制）；autoUV 不存、算法版本化；顶点色 / 顶点光照 → 命名逐面角颜色层，rgb8 默认，烘焙层标 derived，bake 出 `COLOR_0/1`。**第六轮已答（user 2026-09-20）**：世界尺度契约 → §3.3（definition 4 000 km / 世界 9×10⁹ m，越界拒绝不降级，int64 无意义）；比 int32 更抠 → 位宽阶梯含 uint8；平滑 → 逐边 smooth 位，bake 只在有 smooth 边处写 NORMAL，角度阈值是工具不存；几何零语义只认 tag → §5.2；显式 UV 支持 + 一组面共用投影 → 四档贴图定位；UV 与几何不分拍版本、流自描述布局；.blend/.skp/glTF 对照 → §12；「bake 不在数据契约里…两个原则：省流、第三方查看器尽量 wysiwyg…保存时选 wysiwyg 或 game engine friendly」→ §4 缩成两原则 + `bake.mode` 字段。**A18 可开工，等 user「开做」。**

---

## 11. 落地顺序（0.5.0 转正纪元；等「开做」）

1. `src/format/`：GLB 读写（自写，零 three）+ `bakeGltf` + 缩略图渲染（walkable：headless three 渲一张 256 px）；golden：每个 golden 场景 write→read→write 逐字节一致；bake 用 three `GLTFLoader` 当三方验收；Blender 手验一次归 user 批。
2. 接 store（`pwa-cloud-store` skill；单一接缝 + 守卫 + 偏好搬库 + Azure personal-only 成对）；接 gallery（0.4.0；ADR-0013 互斥挂载；`#docTitle` 胶囊 = 文件名）；无地 = WeebPaint 标准三态 + T-crash。
3. store escalate：头片 peek（§9）。
4. A1 正经 undo 叠在 workpiece 写令牌协议上（先找 WeebPaint session 商量抽 `@internal/workpiece`；抽不成本地同名协议）。
5. QoL：A20 配色样张、A21 松笔 unsnap grill。

体重估算：format ~600 行 + 测试；store/gallery 接线 ~400 行；A1 归自己的条目。

---

## 12. .blend / .skp / glTF 三家策略对照（答「交付格式比创作格式 wise 吗」）

| | **.blend**（Blender） | **.skp**（SketchUp） | **glTF**（交付） | 我们取哪一半 |
|---|---|---|---|---|
| 本质 | 运行时 C 结构体的内存镜像；文件**内嵌自己的 schema（DNA/SDNA：每个 struct 的字段名 / 类型 / 大小）** | 私有二进制容器，内容是一组「类记录」，**每个类各自带版本号**（CModel / CLayer / CDib …）；随年份出大版本 | 冻结的 JSON schema + 二进制 buffer；扩展用命名空间登记，未知忽略 | 壳 = glTF（冻结、生态）；内容层 = blend/skp 式版本化 |
| 向后兼容 | **完美**：任何版本的 .blend 都能开——读取器按文件内 DNA 解释旧 struct，再跑 `do_versions`（逐版本补丁代码，二十多年只增不删） | 新 SU 开旧文件没问题；**旧 SU 开不了新文件**，要「另存为旧版本」显式降级 | core 2.0 自 2017 冻结，2.1 只加不改；扩展各自版本 | user 的「每子结构版本 + 迁移文件夹」= skp 的每类版本 + blend 的 do_versions，两家都验证过 |
| 向前兼容 | 部分：旧 Blender 靠 DNA 能读新文件里认识的字段，不认识的字段丢（再保存就没了） | 无 | 好：未知属性 / 扩展按规范忽略 | 我们：未知**保留**（round-trip），比 blend 强；比 app 新的子结构版本拒开（不猜） |
| 三方可读 | 几乎只有 Blender 自己 | 只有 SU + 官方 SDK | 所有引擎 / DCC | glTF core = bake 永远可读 |
| 内容与程序的耦合 | 极紧（文件 = 内存布局） | 紧 | 零（文件 = 交付契约） | authoring 在扩展里紧耦合我们的内核（无法避免，B-rep 就是我们的），bake 零耦合 |
| 缩略图 | 有（文件头 PNG） | 有（PNG，资源管理器预览） | 2.1 `asset.thumbnail` | 同 |
| 教训 | ① 文件自带 schema 让「旧文件永远能开」变成机械活；② versioning 代码只增不删是可持续的（Blender 证明了 25 年） | ① 每类独立版本号是对的；② 「只能往上不能往下」用户能接受 | ① 冻结 + 命名空间扩展 = 别人不会弄坏你；② 交付格式不适合装 authoring | — |

**结论**：不是「glTF 比 blend wise」，是**分工**——交付层要冻结（glTF 做对了），创作层必然随程序演化（blend / skp 都靠版本化代码活下来）。我们的 `.glb` = 两层叠在一个文件里：core 按 glTF 的纪律冻结，`CATSUP_*` 按 blend/skp 的纪律版本化。**从 .blend 多学一招（可选，DNA-lite）**：每条流自描述布局（§5.2）已经是轻量 DNA；若将来想让「没有迁移代码的读者」也能解释旧文件，可在 `CATSUP_document` 里放一个几 KB 的布局说明（各流的字段表），按需再加。

来源：Blender 开发者文档「Blender File Format / DNA structs & do_versions」；SketchUp C SDK 文档（`SUModelSaveToFileWithVersion` 另存旧版）与 .skp 逆向记录里的 per-class version map；glTF 2.0/2.1 规范。
