# 远景纪元剧透 + 黄金格式（glTF？）+ group/component 本体论（2026-09-06）

> as-of v0.3.0 / 2026-09-06 · created by Claude Fable 5.1
> 性质：**user 剧透 = 定调，AI 判断 = 判断**，两者分节写清，不混。所有 user 原话标「user 2026-09-06」；早期野心来自 `journals/20260627 CatsUp proposal.md`（L13/L15/L18/L43-44/L66/L68）与 `journals/20260627 SketchUp drill.md`（L73-83）。
> 本页不是决策：持久化/文件格式/数据结构由 user 在「SketchUp 1.0 做完、component group 摸清楚之后」拍板（user 2026-09-06「这个我有想法，你不要擅自做决定」）。

## 1. user 2026-09-06 剧透（原话，按主题）

- **GitHub 仓名**：「github 应该叫 catsup，这个是我的决定。旧 site 仓我手动删。就是我网址输入都是这个。site 是错语义。weebpaint-site 可能是站点的营销推广网站，weebpaint 是 the app。」→ 已改：产物推 `fangzhangmnm/catsup`，dev = https://fangzhangmnm.github.io/catsup/dev/ 。
- **GitHub 上放什么**：「github 上什么按照 weebpaint 的标注，ai docs 按毕业 ritual 应该审核之后上？」→ 口径：今天 `catsup` 公仓 = 出货仓（只收 dist）；毕业（公开工坊道：隐私 grill + 分拣）之后，私有源仓（含审过的 ai-docs）替换同名公仓的历史，URL 不变。
- **分层反馈**：①②同意，「不依赖 css px 赞赞赞不过停，感觉吸附的语义还是屏幕大小，就和 weebpaint 的笔手感速度是用 css 像素而不是 doc 像素。high dpi resilient」；③「看起来不错」；④「不知道，weebpaint 我也没理清楚，先这样」；⑤「同意，你是想把 threejs 抽象？不建议，因为以后我们会做这种 pbr, global illumination 之类的。我的建议是学 blender 做 workbench 之类的渲染引擎，切口在引擎这里。」
- **两种编辑模式（预告）**：「以后会有两个不同的模式，一个是 sketchup 这种偏制图的，一种是 blender 这种 low poly modeling 比如捏角色，有机体。两个应该共存，有点像 blender 里面不同的对象按 tab 进不同的编辑模式」。
- **OBJ**：「obj 导出是 escape hatch，这个可以先特例，只要知道这个不是正式的 obj 导出就行。以及 gltf 导出也需要 vendor others 吧。」
- **完成版远景清单**：game scene editing、overambitious game-scene metadata editing、WeebPaint integration and embedding WeebPaint ora、Blender character modeling、overambitious character animating、SketchUp 老本行、component/group 结构。问题：「gltf 是否是像 ora 一样的我们的黄金格式契约，而且有很好的 backward compatibility，因为 ora 就是因为别人定了格式，所以我们抖动也就是 .weebpaint 这个 metadata。」
- **group/component 本体论**：「group 不是 object，是同一个 mesh，group 只是用来管理对齐，sticky geometry，变换的工具，component 是 object。顺便你知道我很讨厌 scenegraph 吧（考古，包括 gltf 的那些中二），不过 component 引用 component 我倒能接受。所以 group 其实是一个编辑时语义。渲染时就是三角汤。不知道你同意不同意」。

- **容器拍板（user 2026-09-06，看完 §3.1 审计后）**：「选 zip 吧，然后之前哲学讨论就是有 glb 的话丢 authoring 人类创意不丢。其实可以。」→ 方向 = `.catsup` = zip 容器（ORA 字面翻版）：自有 JSON 装 authoring SSoT + 一个**标准 .glb bake**（三方直接可读）+ 贴图等附件；哲学：authoring 层丢了或过时了，glb 里的人类创意不丢。数据结构本体仍等 SU 1.0 + component/group 后定。

## 2. 考古：最初的野心（proposal 2026-06-27 / drill）

- L11 主要核心目标 = 完美复刻开源 SketchUp PWA（WhiteBoxing/GreyBoxing/Architecture/Level Editor/3D Printing/机甲 HardSurface；「关掉理工科脑，还原在纸上画画设计的体验」，iPad friendly）。
- L13 次要核心目标 = **Game Engine Agnostic, Data-Driven 关卡编辑器**：「一个关卡文件里只有 Geometry 和 ECS 式的元数据，没有 game mechanism baked in gameobject/prefab tree/reference」「渲染用 glb 标准，或者自定义 RTX On 插件」。
- L15 当时的非目标：ZBrush/MMD/Character-Organic Modeling/Asset Making/Animating/Level Scripting。**今天的远景把 character modeling / animating 拉回来了，user 自己标「overambitious」**。
- L18「我们首先是一个 SU clone：level design 只是搭在 SU 上面的一层薄薄的 Entity Metadata Editor + Prefab spawner（prefab 是 ngon 的 glb atom，不进 SU 的数据结构）+ GI renderer + fps camera + collision/navmesh/strategy point/path editor」。
- L43-44 **CONTENT should outlive a specific engine**；「healthy boundary」：「people use gameobjects as abstract nodes as in visual scripting instead of an entity in the world…业务逻辑描述 and 幻想世界描述 should be separated like heaven vs earth」——这就是 scenegraph 厌恶的出处：厌的是「节点当抽象容器、逻辑渗进层级」，不是「实例有 transform」。
- L66 **Prefab as GLB atom**：「一个 prefab 就是一个 ngon/glb 数据结构的 atomic 的东西…baked, mesh instanced…在文档里的足迹就是一个 transform + 一个 reference 以及少量 variation 的 metadata 的 ECS。GLB file as sidecar asset library」。
- L68 light game engine render ready：vertex GI baked to vertex color、indie/retro PSX 风、不和 UE5 比。
- drill L73-75：「group: boundary of sticky domain」「component: instanced group…it might challenge my earlier proposal that assets are atoms and dont have SU geometry data」；L82 ④「component 必须是 instancing…实例在文档里 = transform + reference + override…这个数据形状直接 = ECS entity 的形状」；L83「每个 sticky-domain(group/component definition) 一个独立的共享 vertex/edge 池」。
- 家族 CLAUDE.md 早已把 glb 列进 store 的不透明 blob 清单（「ora/glb/pdf/txt 一律不透明 binary blob」）。

## 3. AI 判断（Claude Fable 5.1，2026-09-06）

### 3.1 glTF 当黄金格式契约：同意，但要说清它和 ORA 的一处不同

> **结果**：user 看完本节审计后拍板 **zip 容器**（见 §1 末条）：自有 JSON 是 authoring SSoT，glb 是随附的三方可读 bake，不再把 authoring 塞进 glTF 扩展（Y-up 换轴税与「扩展被 Blender 丢弃」两条因此不再是文件内部问题，只是 bake 的导出问题）。下文保留为审计记录。

- 相同处：开放标准、别人维护、三方全认（Blender 官方 importer/exporter、three、Godot/Unity）、扩展机制就是为「抖动」设计的（`extras` 自由 JSON + `CATSUP_*` vendor extension）。**ECS 元数据落 node `extras` 正是 glTF 的本意**，天然只装数据不装逻辑，和 proposal 的「healthy boundary」同构。skins/animations/cameras 原生，character 那条线不用另起格式。
- 不同处：**ORA 的 PNG 图层本身就是 WeebPaint 的 SSoT；glTF 的三角网格对肥皂膜内核只是烘焙**。肥皂膜的真身（n-gon 带洞的膜、边-膜链接、平面注册表、膜身份、group 上下文）glTF core 装不下，要进 `CATSUP_softfilm` 扩展。所以 glTF 模式 = **core 永远写一份三方可读的 bake（三角汤 + `LINES` 裸边）+ 扩展装 authoring SSoT**。保存必重烘（同 ORA 规范强制 mergedimage.png）。这条契约本身就是「渲染时就是三角汤」的文件版：**渲染引擎的输入 = 黄金格式的 core**，编辑器只在扩展层活。
- backward compat：core 免费（2.0 自 2017 冻结）；churn 全在 `CATSUP_softfilm` 这一份，它在 SU 1.0 + component/group 定型之前本来就该 churn，等 user 拍板的时机是对的。扩展带 version 字段，迁移只在扩展层。
- 落地成本：核心层**不能**靠 three 的 GLTFExporter/Loader（three 不得进核心）。自己的 writer/reader 对我们的扁平结构约几百行（JSON + 一个 binary buffer + accessors）。three 的 loader 只用于显示外部 prefab GLB。
- 边角：跨文件引用 prefab 在 glTF 里没有标准（instancing 只有 `EXT_mesh_gpu_instancing` 同文件内）→ `CATSUP_prefab_ref` 扩展（transform + uri + override），三方读不到，需要时另出「prefab 烘进来」的扁平导出。ORA 嵌入 = `CATSUP_ora_source` 扩展挂在 texture 上，PNG bake 必须同在。quad/n-gon 有机网格 glTF 也只存三角，要保留四边面得自己扩展（Blender 导出也是三角化）。
- 否掉的备选：USD（太重、无 web 故事）、FBX（私有）、自造 JSON（零三方杠杆）、OBJ（无元数据，只配当逃生口）。

### 3.2 group / component：同意，并给出我理解的精确形状（请证实）

- **component = object = definition + instances**；instance = transform + reference + override，= ECS entity 形状（drill ④）。component 引用 component = definition 的 DAG，深度有限。这是文档里唯一的「图」，glTF node 树能扁平地装（scene = instance 列表，嵌套 component = 子 node）；不需要引入「空节点当容器、逻辑挂节点」那套 scenegraph 用法。
- **group = 同一 mesh 上的编辑时上下文**：立宪页 A3「重合即同一」的 context 槽——同一顶点/边池，group 只改变「谁和谁粘」的判定域，外加一个对齐用的局部轴系。**group 的变换烘进顶点坐标**，不是 node transform（否则就成了 object）；渲染看不见 group。这与 drill L83「每个 sticky-domain 一个独立的共享 vertex/edge 池」有张力：一个是「分池」，一个是「同池 + context 标签」。**同池 + context 标签**更接近今天的原话，也和 A3 context 槽一致；分池是它的一种实现，不必在本体论层面承诺。
- 一个推论要 user 确认：group 内几何被 move 时，group 边界是 sticky 判定的墙（外面的顶点不跟），但**平面注册表/面识别仍在同一世界坐标里跑**——这正是「group 不是 object」的可测含义。

### 3.3 渲染切口 = 引擎，不抽象 three

同意。层 5 改口：`RenderEngine` 接口（输入 = bake：三角汤 + 线 + 实例 transform + ViewState；输出 = 画到 canvas/XR），Workbench 是第一台，PBR/GI/RTX 插件是后面的台，全部可以用 three 当底座。C++ 转生只针对层 1–4；渲染引擎本来就按平台重写（Blender 的 Workbench/EEVEE/Cycles 也是）。不做 three 抽象层。

### 3.4 ε 语义

保持 CSS px 屏幕语义，high-DPI resilient（现状即此：solver 的 ε 全在 CSS px）。`ViewProjection` 接口只是把「世界 → 屏幕度量空间」的实现换掉：桌面/iPad = 真屏幕；VR = 控制器射线周围的角度空间按参考距离折算成等价 px。求解器不改。

### 3.5 两种编辑模式（AI 推论，非 user 决定）

制图模式跑肥皂膜内核（平面 arrangement）；有机模式是任意非平面多边形网格，**不是同一个内核**（半边网格 vs 平面图）。合理的落点：component 有 kind（softfilm | mesh），Tab 进的编辑模式 = 该 kind 的动词集 + 内核。动词注册表按模式分组即可，现在做动词插件化时留一个 mode 维度就够，不用现在实现第二个内核。

### 3.6 OBJ / glTF 逃生口

OBJ 现状 = 特例逃生口，不是正式导出，`obj-io.ts` 头注释已如此写。glTF 导出若要「现在就有」，可 vendor three 的 GLTFExporter 走 render3 侧（三角汤够用）；正式的 glTF 读写等黄金格式拍板后自写，不走 three。

## 4. 对近期工作的实际约束（可执行）

1. 动词插件化时带 `mode` 维度（制图 / 有机），默认只有制图。
2. `RenderEngine` 接口的输入定义成「bake」形状，别把 kernel 直接喂给引擎——同一份 bake 将来就是 glTF core。
3. 核心层继续零 three、零 DOM；glTF 读写将来自写。
4. group 纪元开工前，先把 A3 context 槽在立宪页写实（同池 + context 标签 vs 分池，user 拍板）。
