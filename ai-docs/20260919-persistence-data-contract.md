# CatsUp 持久化数据契约（远见版）—— 设计稿，等 grill

> as-of v0.4.6 / 2026-09-19 · created by Claude Fable 5.1 · **性质：提案，未拍板。** user 2026-09-19 原话定的题：
> 「现在就是持久化被完美主义拖着。不过我们也可以现在设计一个有远见的持久化数据契约。现在就设计，看一下全量的 wishlist，包括哪些 overambitious, scope creeping 的也看，先设计一个很远见的数据契约，然后最好多依托现有规范。比如 gltf 或者别的什么更好的」
> 「尽量是类似 ora 的依照已经是格式标准的框架」
> 「以及考虑后面会有 GTA VCS 级别的场景，甚至 zbrush，按照这个远见设计」
> 这三句**推翻**了 2026-09-06「SketchUp 1.0 做完、component group 摸清楚之后再定」的时机（总账 B5）；容器方向「zip」（far-horizon §1 末条）本稿沿用，不重开。
> 同日拍板的**后门政策**（无向后兼容，AI 脚本改 user 的 OneDrive appfolder，逐次许可）见 `CLAUDE.md`「后门」条；本契约的演化规则（§7）按它设计。

---

## 0. 一页结论

- **承重框架 = glTF 2.0**（Khronos 标准，web 原生，Blender / three / Godot / Unity 全认）。它对 CatsUp 的意义 = ORA 对 WeebPaint 的意义：**别人定的壳 + 标准的内容层（三角网格 / 材质 / 贴图 / 灯 / 相机 / 动画）+ 一个给我们抖动用的命名槽**（`extensions.CATSUP_*` + `extras`，都是标准自带的扩展机制；ORA 里对应 `.weebpaint` 元数据）。
- **容器 = 薄 zip 壳，照抄 ORA 的三条惯例**（`mimetype` 首项不压缩 / `Thumbnails/thumbnail.png` / 内容层是标准子格式），里面装一份**标准 glTF 资产目录**：`model.gltf` + `model.bin` + `textures/*.png`。解压即是 Blender 能直接打开的 glTF 文件夹；导出 `.glb` = 一键打包。
- **authoring SSoT = `CATSUP_*` 扩展**（肥皂膜 B-rep / definition 与 instance / group 轴框 / 外部引用 / 雕刻 / 地形…每个 wishlist 槽一个扩展）；**core 永远是 bake**（三角汤 + LINES 边 + 材质 + 灯 + 相机 + 扁平化实例），三方读 core 就够；**ECS 关卡元数据 = 节点 `extras`**（Godot / Blender 导入器原生收进 metadata / custom properties，比扩展更可互操作）。
- **远见三件**：① GTA VCS 级 = **一个文档长成一个文件夹**（cell / prefab / 贴图各自是 zip 或 glb，路径相对引用 = 家族「身份 = path/name」）+ 标准压缩扩展 + 惰性引用 = 流式；② ZBrush 级 = 二进制 accessor + `_`前缀自定义顶点属性（core 允许）+ `CATSUP_sculpt` 装细分层级；③ **B-rep 顶点用整数微米存**（内核身份本来就是 1 µm 整数格；float32 存不住 8 m 以外的格点）。
- **演化 = 无兼容 + 后门**：格式版本号只用来**拒开**（不静默迁移不猜）；旧文件由 AI 脚本转换（后门政策）；为了让脚本便宜，格式读写 = `src/format/` 纯模块（零 DOM / 零 three，node 直跑）、authoring 是 JSON 文本、bake 可再生。
- **不进文件**：undo / 指令流（user 2026-09-07：生命周期 = runtime）、选区、工具态、group 编辑上下文、PickUp 手中栈、生命之粉的临时物理、派生缓存（平面注册表 / arrangement / 碰撞世界）。

---

## 1. 输入：全量 wishlist（含 overambitious）→ 每条在契约里的槽

来源：`journals/20260627 CatsUp proposal.md`（L11–L80 全部野心，含 user 自标 overambitious 的）、`journals/20260627 SketchUp drill.md` L73–83、far-horizon §1 剧透、总账 A/B/E、journal 09-07、user 2026-09-19 三句。

| wishlist 条目（出处） | 契约里的槽 | 依托的现成标准 |
|---|---|---|
| SU clone：肥皂膜 B-rep、group、component 实例（proposal L11/L21、drill L73–83、far-horizon §3.2、B1 拍板「group 存轴，顶点存 component 坐标」） | `CATSUP_brep`（含 group）+ `CATSUP_definitions` / `CATSUP_instance` | glTF node/mesh 共享 = 实例；扩展装 B-rep |
| 材质 / 贴图 / 油漆桶=拉矩形设贴图+UV（E8、proposal L72 auto UV） | core `materials` / `textures` / `images` / `samplers`；面上 UV 在 `CATSUP_brep.faces[].uv` | glTF PBR + `KHR_texture_transform` + `KHR_materials_unlit`（复古）+ sampler NEAREST（E14「crispy」） |
| WeebPaint 集成：savefile embed ora（B14 案 1）；bodypaint 谁 master（B14 案 2） | `sources/*.ora` + image 的 `CATSUP_source`；3D painting = 贴图层的 authoring 仍是 ora | ORA（同一哲学：ora=authoring、png=bake） |
| Prefab as GLB atom / 3D Warehouse / 家具（proposal L21/L66） | `CATSUP_ref`（节点 → 外部 glb + override）；三方看到空节点 + extras | glTF `uri` 相对路径语义；实例本身 = 标准 node |
| 关卡元数据：collision（默认开）/ 灯 / patrol path / strategy point / navmesh / spawn / 对话 href（proposal L13/L70、E12 原则） | 节点 `extras`（ECS 组件包，B2「type = 组件包」）；navmesh = 打标的 mesh；灯 = 标准 | `KHR_lights_punctual`（物理单位 lux/cd）；`extras` |
| Wire / 实体引用 / Inspector 鸭子类型 / 层（proposal L54/L56） | 节点 `id`（文件内唯一）+ `extras` 里的引用槽；层 = `tags` | — |
| Tomato & Sam 吉祥物、动作、第三人称代理（proposal L60/L64） | 内建 prefab（`builtin/*.glb`）+ 动画 clip 名在 extras | glTF skins / animations（免费） |
| Scenes（相机站位 + 渲染设置）、Walk-In 出生点、VR 站位（proposal L124/L64、A16） | core `cameras` + 节点；`CATSUP_document.views` 记名字/样式 | glTF camera |
| 单位 / 网格步长 / 吸附增量（A10：内部 SI、显示可切、`~` 前缀） | `CATSUP_document.settings` | glTF 强制米 = 白送 |
| Tags / hide / 显示样式（SU Tags、proposal L134） | `CATSUP_document.tags` + 元素 `tags` / `hidden` | — |
| 地形：heightmap+splat / tile / WFC / voxel / Cliff Maker lowpoly（proposal L78、E14、far-horizon §3.5「地形=独立 type」） | `CATSUP_terrain`（kind 开放集）+ `terrain/<id>/` 子目录；bake 出网格 | 16-bit PNG 高度图 / Tiled `.tmj` / MagicaVoxel `.vox` |
| 有机建模（Blender 式）、**ZBrush 级雕刻**（far-horizon §1、user 09-19） | core mesh（二进制 accessor）+ `_MASK` / `_GROUP` 自定义属性 + `CATSUP_sculpt`（细分层级 / 雕刻层） | glTF `_`前缀属性（core 允许）、`COLOR_0` = polypaint、`EXT_meshopt_compression` / `KHR_draco_mesh_compression` |
| **GTA VCS 级场景**：流式开放世界、数万实例、数千 prefab（user 09-19、proposal L13/L37「轻量小文件」） | 文档长成文件夹；`CATSUP_ref{lazy}` = cell payload；实例 = 标准节点或 GPU instancing | `EXT_mesh_gpu_instancing`、`KHR_texture_basisu`(KTX2)、外部 `uri` |
| 渲染：vertex GI 烘到顶点色 / 天空盒 / 粒子 / 水 / 风（proposal L68） | `COLOR_0`（顶点 GI）；`CATSUP_document.environment` 纯 JSON；粒子等 = 节点 extras | glTF `COLOR_0`；其余是 JSON 数据（「coding agent 能翻译到 unity/godot」） |
| 角色动画 / cinemachine / 对话（proposal L23，自标 procrastinate） | 动画只在 prefab glb 里；文档只记 clip 名与触发 extras | glTF animations |
| 3D 打印 / 机甲 hard surface（proposal L12/L19） | 导出路径，不进契约 | 3MF / STL 导出（将来） |
| 参考图 / 纸片人 reference plane（far-horizon §1、E13） | `refs/*.png` + 节点组件 `referencePlane` | glTF image + 四边形 |
| 插件体系（proposal L74/L78：generative、地形、门窗楼梯） | 插件数据 = 元素 `extensions.<PLUGIN_NAME>`（同 glTF 命名规则），未知扩展**原样保留** | glTF `extensionsUsed` 纪律 |
| Bevel / spline / loft / 参数化（proposal L159–168、journal 09-07 倒角 bug） | 参数化历史不进文件（先做 eager 几何）；将来 `CATSUP_parametric` 槽 | — |
| 无地期草稿箱（A15） | 被本契约取代：草稿 = 同一格式的文件（详 §9） | — |

结论：**没有一条 wishlist 需要新容器或第二种文件**；全部落在「glTF core + 命名扩展 + 相对路径引用」三个机制里。

---

## 2. 框架候选审计（答「gltf 或者别的什么更好的」）

| 候选 | 「已经是标准」？ | 装得下 B-rep？ | 装得下 GTA 级 / ZBrush 级？ | web / vendor 故事 | 判 |
|---|---|---|---|---|---|
| **自定 zip 布局**（09-06 原案：自有 JSON + glb） | 壳是自己定的，只有 glb 那半是标准 | 是（自有 JSON） | JSON 数组装不下百万顶点；跨文件引用自造 | 好 | **否**：不满足「依照已是标准的框架」；churn 无命名纪律 |
| **glTF 2.0（.gltf+.bin 或 .glb）+ `CATSUP_*` 扩展** | 是（Khronos；扩展机制是标准自带） | 扩展装（同 `KHR_draco` 把私有编码放 bufferView 的先例） | 是：二进制 accessor、压缩扩展、GPU instancing、外部 uri；跨文件**节点级**引用无标准 → 一个小扩展 | 最好：three 原生、自写 reader/writer 几百行、Blender/Godot/Unity 全吃 | **选它当承重框架** |
| **USDZ / OpenUSD**（AOUSD：Pixar/Apple/Adobe/Autodesk/NVIDIA） | 是；且 composition（reference / payload / variant / instancing / API schema）就是 GTA 级场景的工业答案 | 是（自定 schema + customData） | 最强 | 最差：无可 vendor 的 JS 读写器（tinyusdz 是 C++→wasm，写支持不全；three 只有文本 USDZExporter），规范体量巨大，AI 维护成本高 | **否作框架；留作导出目标**（visionOS / AR Quick Look / 影视管线） |
| **3MF**（zip + XML，3MF 联盟） | 是 | 否（只三角网格） | 否 | 中 | 3D 打印**导出目标** |
| **OBJ / STL / Collada / FBX / Alembic** | 是/是/死/私有/VFX | 否 | 否 | — | OBJ 保留逃生口；其余不用 |
| **SQLite / 自定二进制** | 否 | — | — | — | 否（零三方杠杆） |

**为什么 zip 壳还要留**（不是矛盾）：① `mimetype` 嗅探 + `Thumbnails/thumbnail.png` = `@internal/store` 已有的 zip peek 机制直接可用（README §预览：`ZipFile.getPeek({zipEntry})` 取尾片解析该 entry，不全量下载）；② 贴图 / ora 源 / 参考图 / 地形子目录是**多文件**，glb 单体装不下「可被 WeebPaint 原地编辑的松散 png」；③ 你 09-06 已拍板 zip。壳只做这三件事，**结构全在 glTF 层**——所以壳不算「自定框架」，它是 ORA 惯例的搬运。

---

## 3. 容器布局（`.catsup` = zip）

```
mimetype                       # 首项、STORED 不压缩、内容 "model/vnd.catsup+zip"（IANA model/ 顶级类型，同 model/vnd.usdz+zip 的命名法）
Thumbnails/thumbnail.png       # ≤256 px，第二项、STORED（ORA 路径原样；store getPeek 取它当图库封面）
model.gltf                     # glTF 2.0 JSON：core = bake；extensions.CATSUP_* = authoring SSoT
model.bin                      # 二进制 buffer：bake 的 accessor + 大 B-rep / 雕刻的 bufferView
textures/*.png|*.ktx2          # 贴图（bake 与 authoring 共用同一份，零重复）
sources/*.ora                  # WeebPaint 源（可选；textures/ 里对应的 png 是它的 bake）
refs/*.png                     # 参考图（可选）
terrain/<id>/*                 # 地形数据（可选；高度图 png16 / .tmj / .vox）
assets/*.glb                   # 内嵌的 prefab 原子（可选；也可放在文件夹外相对引用）
```

- 解压后 `model.gltf` 是**合法独立 glTF 资产**（相对 uri 指向 `model.bin` / `textures/`），Blender「导入 glTF」直接开；三方看不见 `CATSUP_*`（按规范忽略未知扩展），但 bake 全在。
- `.glb` 导出 = 把 `model.gltf` + `bin` + 贴图打包成单体（三方分享用）；`.catsup` 才是 Work。
- 压缩：除 `mimetype` / 缩略图 STORED 外其余 DEFLATE；zip 库复用 WeebPaint 的 ORA 编解码所用（收货时对账，不新引）。
- 加密：走 `@internal/encryption`（文件级不透明），peek 走库的密文 peek；契约不感知。

---

## 4. glTF 层规则（core = bake）

- **坐标**：文件内 glTF 规范 +Y 上、米、右手。CatsUp 内核 +Z 上（`CLAUDE.md` 坐标约定）→ **只在 `src/format/` 边界换轴**（(x,y,z)ᶜ → (x, z, −y)ᵍ），与 OBJ 逃生口同做法；`CATSUP_*` 扩展内的数据**保持 Z-up**（authoring 层零换轴，只有 bake 换）。
- **网格**：每个 definition 一个 `mesh`；面按材质分 primitive（`TRIANGLES`，带 `POSITION`/`NORMAL`/`TEXCOORD_0`/可选 `COLOR_0`）；**边一个 `LINES` primitive**（轮廓线粗细是渲染态，不进文件）；float32 精度对渲染够用（B-rep 精度在扩展里另存，§5.1）。
- **实例**：definition 的每个 instance = 一个 `node{mesh, translation, rotation, scale, extras}`；嵌套 definition 在 bake 里**逐实例展平成 node 子树**（mesh 共享），三方看到的就是「实例有 transform、渲染是三角汤」——不引入空节点当容器（proposal L44「healthy boundary」）。海量同 prefab（草木）可选 `EXT_mesh_gpu_instancing`。
- **材质 / 贴图**：glTF PBR metallic-roughness 原样；复古/无光照 = `KHR_materials_unlit`；SU 式贴图定位 = `KHR_texture_transform`；采样 `NEAREST`（E14 口味）或线性由材质定；GPU 压缩贴图 = `KHR_texture_basisu`（大场景再开）。材质 `extras.catsup = { colorName }` 挂家族色彩库色名。
- **灯**：`KHR_lights_punctual`（方向光 lux / 点光 cd、线性 RGB）；色温是 UI 侧换算（色彩库 cct），存 `extras.catsup.cct` 备查。
- **相机 / Scenes**：`cameras[]` + 挂相机的 node；名字、样式、是否默认在 `CATSUP_document.views`。
- **ECS 元数据 = 节点 `extras`**（自由 JSON，glTF 本意）：`{ id, tags, components: { collision: {mode:"default"|"off"|"proxy"}, marker:{kind}, path:{points|refs}, spawn:{…}, referencePlane:{image}, … } }`。component 键**开放集**（B2 拍板「type = 组件包不是枚举」）；模式由「有哪些组件」推导；未知组件保留。三方引擎导入时 `extras` 自动进 metadata（Godot 4 / Blender custom properties）。
- **provenance**：`asset.generator = "CatsUp vX.Y.Z"`；`KHR_xmp_json_ld` 装作者 / 许可（第三方 prefab、贴图的许可证义务落这里，家规「权重进公仓前必须核许可证」同精神）。
- **bake 是可再生派生物**：读文件时 app **不读 core**，只读扩展重建内核再自己 bake；core 只为三方与「authoring 层坏了/过时了创意不丢」（E1 哲学）。

---

## 5. `CATSUP_*` 扩展（authoring SSoT；每个 = 一个 wishlist 槽）

命名照 glTF 规则：厂商前缀大写 + 下划线；全部登记在 `extensionsUsed`；**没有一个进 `extensionsRequired`**（三方永远能开 core）。所有扩展带自己的 `version`（整数），文档级总版本在 `CATSUP_document.formatVersion`。

### 5.1 `CATSUP_brep`（肥皂膜内核；挂在 definition 上）

```jsonc
{
  "unit": 1e-6,                      // 顶点整数 → 米；= 内核 Q，格点身份（立宪页 §0）
  "groups": [                        // 每个 group 一个池（含 0 号 = 未分组）；B1「group 存轴，顶点存 component 坐标」
    { "id": "g0", "parent": null, "axes": { "origin": [0,0,0], "x": [1,0,0], "y": [0,1,0], "z": [0,0,1] },
      "name": null, "locked": false, "hidden": false,
      "vertices": [x0,y0,z0, x1,y1,z1, ...],   // 整数微米（Z-up，definition 局部系）；或 { "bufferView": n, "count": k }（int32 LE，大模型）
      "edges":    [a,b, c,d, ...],              // 顶点索引对；属性见 edgeFlags
      "edgeFlags":[0,0,2,...],                  // 位：1 soft(SU Soften) 2 smooth 4 hidden
      "faces": [ { "outer": [v...], "holes": [[v...]], "m": [front, back], "uv": { "front": [u,v,...], "back": null }, "hidden": false, "tags": ["t1"] } ]
    }
  ]
}
```

- **顶点整数微米**：内核身份 = 1 µm 格；float32 在 |x| > 8 m 就丢格点（2²³ µm），float64 JSON 数字与 int32 bufferView 都精确。int32 量程 ±2147 m 对单个 definition 足够；城市尺度靠多 definition / 多文件（§8）。
- **每 group 一个池**：drill L83 说的是物化层，运行时「同池 + context 标签」与「分池」两种实现都还没定（B1）；**文件按 group 分池两边都能读**（同池实现加载时按格点合并重合顶点=重合即同一；分池实现直接用）——这是本契约里唯一为「内核还会变」预留的形状。**待 grill。**
- 平面注册表 / arrangement / faceLinks 不存（从 faces 重建，确定性）；膜身份 = 文件内索引，不铸 id（faces 是涌现物，公理①）。
- 材质索引指向 core `materials`（front/back 同 SU）；`uv` 缺省 = bake 时自动投影（proposal L72）。

### 5.2 `CATSUP_definitions`（component 定义）+ `CATSUP_instance`（节点上）

- 文档级：`definitions: { "<id>": { "name", "axes", "brep"?: CATSUP_brep, "children": [node ids], "extras" } }`，`root: "<id>"`（模型空间也是一个 definition = SU 的 model）。
- 节点级 `CATSUP_instance: { "definition": "<id>", "overrides": { "materials"?: {...}, "extras"?: {...} } }` = drill ④「transform + reference + override」= ECS entity 形状。嵌套 = definition 的 children 里再放 instance 节点（有限深度 DAG，「component 引用 component 我倒能接受」）。
- glTF core 里同一 definition 的所有实例共享同一个 `mesh`（标准实例化）；展平的子树节点在 extras 标 `catsup.flattenedFrom`，reader 不看它们。

### 5.3 `CATSUP_ref`（外部引用；GTA 级的门）

- 节点级：`{ "uri": "assets/tree.glb" | "../library/props/bench.glb" | "cells/c12.catsup" | "builtin/tomato.glb", "lazy": false, "overrides": {…} }`。
- uri 语义 = glTF 相对 uri（相对本 zip 根；`../` 出到 store 同文件夹 = 家族「身份 = path/name」，改名裂引用是已知 wart，与图库改名裂卡同族）。`builtin/` 是 app 自带资产的保留前缀（无自定 scheme）。
- `lazy: true` = 进视距才加载（USD payload 的等价物，流式 cell 的机制）。三方看到：空节点 + `extras.catsup.ref`；「烘进来」的扁平导出另做（far-horizon §3.1 边角）。

### 5.4 `CATSUP_document`（文档级）

`{ "formatVersion": 1, "settings": { "displayUnit": "m", "gridStep": 1, "snapIncrement": 0.1, "absoluteGrid": false }, "tags": [ { "id", "name", "color", "visible" } ], "views": [ { "id", "name", "camera": nodeId, "style": {…}, "default": false } ], "environment": { "sky", "ambient", "fog", "wind" }, "lastView": {…} }`。`lastView` 是软字段（可被任何一端覆盖、丢了无损）。

### 5.5 远景槽（现在只定名字与归属，不定内容）

- `CATSUP_sculpt`（ZBrush 级）：细分层级（基笼 + 每级位移 bufferView）、雕刻层、对称设置；掩码 / polygroup 用 core 的 `_MASK` / `_GROUP` 顶点属性（规范允许 `_` 前缀应用属性）；polypaint = `COLOR_0`；百万面走 `EXT_meshopt_compression`。
- `CATSUP_terrain`：`{ kind: "heightmap"|"tiles"|"voxel"|"cliff", uri: "terrain/<id>/", params }`；子格式各依标准（png16 / `.tmj` / `.vox`）；bake 出 mesh。
- `CATSUP_source`（image 上）：`{ "uri": "sources/x.ora", "layer"?: … }`。
- `CATSUP_parametric`：bevel / spline / loft 的参数（先不做，eager 几何优先）。
- 插件：`extensions.<PLUGIN>`，与上面同规则；**未知扩展、未知 extras 键、未知 zip 项在保存时原样带回**（§7 第 1 条）。

---

## 6. 分级：什么进文件、什么是旁侧、什么永不落盘

| 数据 | 归宿 | 数据类（MASTER ADR-0001） |
|---|---|---|
| `.catsup` 文档（含内嵌贴图 / ora 源 / 缩略图） | store 里的文件；身份 = path/name | **Work** |
| 共享资产库（prefab glb、贴图库、其它 cell 文档） | 同文件夹或子文件夹的独立文件，相对 uri 引用 | Work（自己画的）/ Collection（第三方可再取） |
| 图库封面缓存 | app 侧派生 IDB（`@internal/gallery createThumbCache`，WeebPaint 先例）——**开建前逐案 escalate**（家规） | Cache |
| 显示单位 / 网格 / 视图偏好中「属于文档的」 | `CATSUP_document.settings`（随文件同步） | Work 的一部分 |
| 设备偏好（手指也能画 / 实验台 / 主题）现走 `localStorage catsup.ui.*` | 接 store 后**必须搬进库**（家规「用了本库就禁止直接碰 localStorage」）；设备本地类 | Attunement |
| 当前打开的文件指针、图库链接 | store 自己管 | Attunement |
| undo / 指令流 / 选区 / 工具态 / group 编辑上下文 / PickUp 栈 / 生命之粉 / VR 会话 | **永不落盘**（user 2026-09-07「指令流和 undo 的生命周期永远是 runtime」） | — |
| 平面注册表 / arrangement / faceLinks / 碰撞世界 / bake 三角 | 派生，重建；bake 写进文件只为三方 | — |

---

## 7. 演化规则（「有远见」的真正含义 = 扩展点，不是迁移梯）

1. **round-trip 保真**：reader 保留一切不认识的东西（未知 `CATSUP_*` 版本字段、未知扩展、未知 extras 键、未知 zip 项），writer 原样写回。插件与未来版本互不销毁——这是 glTF `extras` 规则，也是插件体系的地基。
2. **同 formatVersion 内只加不改**：新字段必须有缺省语义；删字段 = 保留读、停止写。
3. **破坏性改动 = formatVersion +1，且不做 app 内迁移**：app 遇到不等于自己的 formatVersion → **拒开并原文报版本**（不静默升级、不猜、不「修」；家族数据安全词典序）；转换由 AI 脚本在 user 的 appfolder 上做（后门政策：仅 CatsUp、逐次显式许可、只动 CatsUp appfolder），脚本 = `tools/convert-v<from>-v<to>.mjs`，读旧写新、旧文件移 `.trash`（MASTER §A「删除 = 移动」）。
4. **让脚本便宜的三条结构约束**：格式读写是纯模块 `src/format/`（零 DOM / 零 three / node 可 import，与 kernel 同级）；authoring 是 JSON 文本（脚本能 `JSON.parse` 直接改）；bake 可再生（脚本可以整个丢掉重烘）。
5. **宣发（1.x）之后**改口为「只加不改 + deprecate 表」（far-horizon §3.7）；那时后门退场。这条现在不生效。

---

## 8. 远景压力测试

- **GTA VCS 级开放世界**（PSP 世代：流式分区、数万实例、数千 prefab、数百贴图，量级估计）：根文档 `city.catsup` 只装 cell 引用（`CATSUP_ref lazy`）与全局设置；每个 cell 一个 `.catsup`（自己的 B-rep + 实例）；prefab 原子在 `library/*.glb`（Collection，可共享）；贴图 KTX2 走 `KHR_texture_basisu`；同 prefab 海量摆放走 `EXT_mesh_gpu_instancing`；LOD = prefab glb 自带多 mesh + extras 标距离（glTF 无 LOD 标准，`MSFT_lod` 是厂商扩展可参考）。加载 = 按视距拉 cell，卸载 = 丢 cell 内核。**契约零改动**：全靠 §5.3 + 文件夹。
- **ZBrush 级雕刻**（百万面、细分层级、polypaint、掩码、层）：一个 definition 的 core mesh 用 meshopt 压缩 accessor；细分层级 / 雕刻层进 `CATSUP_sculpt`；掩码与 polygroup 是 `_` 属性；导入 / 导出 ZBrush 走 OBJ/glTF（GoZ 不做）。**是第二个内核（半边网格）**，不是肥皂膜——契约只要求它也是「core bake + 扩展 authoring」。
- **WeebPaint 3D painting**（B14 案 2）：贴图的 authoring = ora（`sources/`），bake = png（`textures/`）；谁 master 是运行时协作问题（跨 tab / 库化），文件契约两边都已留位。
- **角色 / 动画**：只在 prefab glb（glTF skins/animations 免费）；文档记 clip 名。
- **地形**：独立 type（far-horizon §3.5 拍板），子目录 + 标准子格式；bake 出 mesh 后三方照样能看。
- **参数化 / bevel / geometry nodes**：先 eager 几何；`CATSUP_parametric` 是名字占位，内容等那个纪元。

---

## 9. 与 store / gallery 的接口（转正纪元要接的面）

- 一个 `.catsup` = 图库里一张卡；identity = 文件名（store 规则；不铸文件内 id）。
- 封面 = `Thumbnails/thumbnail.png` peek（store `getPeek` 已有）；缓存开建走逐案 escalate。
- `validateAdopt`（createStore 必填声明）= 「是 zip、首项 mimetype = `model/vnd.catsup+zip`、含 `model.gltf`」，不解析更多。
- **A15 无地草稿箱作废**（AI 判断，待 user 一句话）：接了 store 之后草稿就是文件，无地期靠 store 的本地缓存与崩溃备份（MASTER §A 修订 1）。
- 设备偏好 `catsup.ui.*` 搬进库的设备本地类。
- 单一接缝 `src/app-store.ts`（JRB 样板：`provider / ui / appId / persistence / encryption / reconcilePolicy / validateAdopt / autoCacheOpenedFile / offlineUploadReplay / readOnlyFiles / signedIn / activeFileName / hiddenName` 全部显式）+ `test/redline-guard.test.mjs` 同款守卫。

---

## 10. 要 user 一句话的点（grill 清单）

1. **承重框架换成 glTF 2.0（zip 只当 ORA 式薄壳）**——与 09-06「自有 JSON authoring」的差别是 authoring 进 `CATSUP_*` 扩展而非独立 json；理由 §2。同意 / 打回？
2. zip 内是 **`model.gltf` + `model.bin` + 松散贴图**（解压即标准资产目录、零重复、JSON 可脚本）而非单体 `.glb`（你 09-06 说的「glb」我读作「标准 bake」）。同意？
3. **B-rep 顶点整数微米**（float32 存不住格点）。同意？
4. **文件按 group 分池**（两种内核实现都能读）。同意 / 还是等 B1 定了再说？
5. **ECS 元数据放节点 `extras`**（三方引擎自动收）而非扩展。同意？
6. 扩展名 `.catsup`、mimetype `model/vnd.catsup+zip`。
7. A15 草稿箱是否作废（§9）。
8. 转正纪元 = **0.5.0**？bump 前按家规问：要不要先把 v0.4.6 推 prod（E3 记录你说过「不做」）。

---

## 11. 落地顺序建议（不是授权；等「开做」）

1. `src/format/`：`readCatsup / writeCatsup / bakeGltf / thumbnail`，zip 复用 WeebPaint 同款库；golden：每个 golden 场景 write→read→write 逐字节一致、bake 在 Blender 可开（headless 用 three 的 GLTFLoader 当三方验收）。
2. 接 store（`pwa-cloud-store` skill，单一接缝 + 守卫测试 + 偏好搬库）；接 gallery（`@internal/gallery` 0.4.0，编辑器 / 图库互斥挂载 ADR-0013，`#docTitle` 胶囊 = 文件名）；封面 peek。
3. 正经 undo（A1）叠在 workpiece 写令牌协议上：先和 WeebPaint session 商量抽 `@internal/workpiece`（`src/backend/workpiece/{workpiece,undo-stack,history}.ts` 是领域无关的，258+ 行）；抽不成就本地照同名协议搓，将来合并是机械活。
4. 之后才是 QoL：场景配色（user「一进去就有负面精神感受」）、松笔瞬间 unsnap（鼠标/笔/Quest 都有，Quest 最重；需要 grill）。

体重估算：format ~600 行 + 测试；store/gallery 接线 ~400 行（JRB 量级）；A1 归自己的条目。
