# Cycletex 调研：照片 → 复古贴图（透视展平 / 无缝 / 背景抠图）+ 「他那些图哪来的」

> created 20260908 by Claude Fable 5.1 · as-of Cycletex v1.5.72（itch demo 2026-08-11 构建；Steam 2026-08-24 上架）/ CatsUp E14 愿望单 · 只读学习，**未反编译、未读逻辑**（证据等级见 §0）
> 出处：user 2026-09-08「还记得 catsup 里面昨天我们学习的那个 cliff maker 吗，这个才是 cliff maker 承重的东西 … 学习，retro filter 是另外一个单独的东西（也可以进 wishlist …）… 一个是透视抠图，然后 seamless support，但是最硬的那个背景抠图是怎么做的好好调研一下。顺便一个非技术的问题。他那些图都是怎么找的啊。别和我说 go touch grass」
> 参考截图（第三方字节不进 repo）：`~/jupyter/third-party/cycletex/`（SOURCE.md 有清单）。姊妹件：Cliff Maker = `~/jupyter/third-party/cliff-maker/`，总账 E14。

## 0. 证据等级（每条结论后面标字母）

- **A** 公开文案：itch 页 / Steam 页 / devlog 1.59、1.6 / 发布贴 / 截图。
- **B** 免费 demo 的包内清单：PyInstaller 归档目录（只有文件名 / 模块名）。
- **C** demo 主脚本的 `strings` 级扫描：UI tooltip 文案（运行 demo 就能看到的那些句子）+ 出现的 cv2 / PIL API 名。**没有反编译字节码、没有读任何逻辑**——所以「怎么串起来的」都是 D。
- **D** 我的推断。

## 1. 它是什么

- 一句话（A）：把照片变成 32/64 位世代（PSX/N64/DC）味道的无缝贴图；作者同一人做了 Cliff Maker（Blender 地形 addon），两件加起来 = 他的 PSX 地形完整管线（几何 + 贴图）。
- 技术栈（B）：**Python 3.14 + tkinter（+tkinterdnd2 拖放）+ opencv-python-headless 5 + numpy 2 + Pillow**，PyInstaller 单 exe 94 MB。**没有 onnx / torch / rembg / scipy / sklearn / skimage**——所有「智能」都是 OpenCV 自带函数 + numpy。itch 标签「No AI」（A）说的是不用生成式，实际连判别式模型也没有。
- 管线 = 9 个 tab 顺序流水（A，截图可见）：1 Flatten Perspective → 2 Crop（8/16 px 整倍）→ 3 Downscale（bilinear / nearest）→ 4 Flip & Rotate → 5 Remove Background → 6 Refine Foreground → 7 Color Adjustments → 8 Make Seamless → 9 Offset（devlog 1.59 加）；1.6 加 FX pass（outline）。
- 「Screenshots show textures created with it」（A）= 那张 106 张贴图库总览：bark / cave wall / cliff ×11 / mossy cliff ×12 / ice wall ×5 / lava ×2 / sky ×5 / **tree wall ×9、spruce、mountain ×3、grass overhang = 带 alpha 的剪影件**。

## 2. 背景抠图（user 点名「最硬的那个」）——其实是两级，都是经典 CV

### 2.1 色键级：tab 5 Remove Background（「2 selectable colors」）

tooltip 原句（C）按顺序拼出来的流程，每步我的读法标 D：

1. 「Create a softly feathered mask around a sampled color」→ 采样 1–2 个背景色（教程：Color Removal + 打开 Color 2 = 天空蓝 + 云白），每色一张**软羽化 mask**（D：色距→alpha 的软阈值，tolerance + 羽化宽度两个旋钮）。
2. 「**Keep only candidate pixels connected to the outside edge of the image**」→ 这是关键一招：候选像素里**只保留连通到画面外边框的那一片**。效果 = 树冠内部碰巧和天空同色的小碎片不会被抠穿，只有「真背景」（和边框连着的天空）走。（B/C：`connectedComponentsWithStats` 在包里；D：或 floodFill 从边框起。）
3. 形态学收拾（C）：`morphologyEx` + `MORPH_CLOSE` + `MORPH_ELLIPSE`、`erode`、`GaussianBlur` / `blur`、`threshold`（D：闭运算补小孔、腐蚀收边、模糊出软边、阈值回硬边）。
4. 边缘去污两件（C）：「Clean fully opaque, background-contaminated edge pixels」（D：alpha=1 但颜色明显偏向背景色的边缘像素，削 alpha 或去色）+「Copy neighboring foreground colors into fully transparent pixels」（= alpha bleed / defringe 外扩：把前景色写进全透明像素，防缩小 / 双线性时出黑边或天蓝边；WeebPaint `src/backend/algorithms/defringe.ts` 同族）。
5. 「Remove pixels near one or more background colors by **changing alpha only**」→ 只动 alpha 不动颜色。

教程原话（C）：「Remove Background is useful for skies and solid-colored backgrounds」。→ **他的树墙 / 山剪影全部靠这一级**：照片选对（树顶着天）→ 两个色键 + 边框连通过滤就够了。所谓「干净好抠」的秘密一半在算法，一半在 §6.2 第 7 条。

### 2.2 分割级：tab 6 Refine Foreground（「automatic foreground selection based on a central object」）

- 「Quickly isolate the subject nearest the center of the image」/「Find Foreground quickly keeps the main subject nearest the center」（C）。
- API 名（C）：**`grabCut` + `GC_INIT_WITH_MASK` + `GC_BGD` / `GC_FGD` / `GC_PR_BGD` / `GC_PR_FGD`**。→ 就是 OpenCV 的 GrabCut（Rother 2004：GMM 颜色模型 + graph cut）。D：初始 mask = 边框带 sure-BG、中央 probable-FG（或用套索：内 PR_FGD / 外 BGD），迭代几轮，输出硬 mask，再走 §2.1 的形态学 + 羽化。
- 手工件（C）：**Smooth Lasso**（「drag around the foreground and release」，「The left panel defines the foreground boundary」，「Everything outside that lasso or polygon becomes transparent only from this tab onward」）+ 擦除 / 复原笔（「Smoothing 0 is a fully hard brush; higher values create a softer edge」）；「This can run together with Find Foreground」= 套索圈一圈再自动。
- 花絮（C）：正式版把 OpenCV 当**可选依赖运行时安装**（「Automatic foreground tool installed successfully」/「needs OpenCV」/「This Cycletex EXE was built without the OpenCV foreground dependency」）——demo 是含 cv2 的构建。
- 能力边界（D，GrabCut 通性）：中央一块石头 / 一棵树 vs 杂背景够用；毛边、半透明、细枝不行（硬 mask）；秒级 CPU。它的库里 ~90% 是平铺件不需要抠，需要抠的树墙走 §2.1，GrabCut 大概只服务「孤石 / 单株」那几张。

### 2.3 如果我们要做（盘现货，不是决定）

- **色键级零新依赖**：WeebPaint 已有 `magic-wand.ts`（`floodRegionFrom` / `similarRegionFrom`：tolerance + 形态学容隙）+ `defringe.ts` + 选区→alpha。缺的只是两个小函数：按色距出软 alpha、「只留连到边框的分量」过滤。
- **分割级 A（无模型）**：GrabCut 自写 TS（GMM k=5 + Boykov-Kolmogorov 最大流，估 600–800 行，纯 CPU）。现成参考 `github.com/EatMyGoose/Typescript-GrabCut`（GMM + Dinic / BK 两个求解器；**仓库无许可证、2021 停更**——只能当算法参考不能 vendor）。OpenCV.js 也有 grabCut 但 ~8 MB wasm，为一个函数不值。
- **分割级 B（模型）**：ISNet（Apache-2.0）/ BiRefNet（MIT）/ U²-Net（Apache-2.0）；**RMBG-1.4 / 2.0 非商用禁**。走 PWA Models 仓 + onnxruntime-web，= 家族第一个视觉模型，黄线区白名单流程 + 许可证核。品牌线「用算法干别人用 genai 干的活」（WeebPaint 总账 #23）→ 先 A。
- **归属未拍板**：照片→贴图工具链是 CatsUp 地形 type（E14）的附件，还是 WeebPaint 修图族（#23 已含无缝平铺 / PatchMatch）——两处都能放，等 user。

## 3. 透视展平（tab 1 Flatten Perspective）

- 4 点多边形任意顺序点 → 第四点落下即自动展平，拖点实时更新，Make square 可选（A，截图）。
- 实现（C）：「Solve Pillow's output-to-input perspective coefficients safely」= Pillow `Image.transform(PERSPECTIVE)` 的 8 参数单应性，numpy 解方程；一串护栏文案（点太近 / 边太短 / 折叠 / 「Drag the plane away from the edge-on angle」）。
- WeebPaint 现货：`floating-transform.ts` distort 模式已是 GPU 逐像素逆单应性（半 texel 保锐那套）；`perspective-frame.ts` 是形状笔的消失点模型。「点 4 角 → 正矩形」= 同一数学反着用，缺的只是一个动词 + 输出尺寸规则（D：矩形边长取四边平均，或 Make square）。

## 4. 无缝（tab 8 Make Seamless + tab 9 Offset）

- 三模式（A devlog 1.59 + C）：**Cycle Seamless**（「Mirror and Cycle Seamless make the image larger」「The joins between individual cycle squares are smart-stitched first」「Build texture-matching features that respect transparency」「Make left and right tile seamlessly **without crossfading**」）/ **Mirror**（「Mirror the image and double its size in each selected direction」= 镜像翻倍，天然无缝但对称）/ **No Stitching**（非有机贴图用，纯偏移）。Offset = 最后一道 wrap 平移（「wraps around the texture edges」）。
- D：Cycle = 把图切成方格环排，接缝用「逐像素特征（颜色 + 邻域）匹配 → 最小误差边界」缝合——Efros-Freeman image quilting 的 min-error-boundary-cut 那一路，明确**不是** GIMP「Tile Seamless」式交叉淡入。「favor an area with similar hue, value, & saturation」（C）说明它**不做光照均衡**（无 high-pass / 频率分离），全靠选图。
- WeebPaint #23 已含无缝平铺 + PatchMatch；两者同一条。

## 5. 复古滤镜 = 单独一件（user 拍板「另外一个单独的东西」）

- 它的组成（B/C）：Downscale（bilinear / nearest，裁切按 8/16 px 整倍）+ Pillow `quantize` **MEDIANCUT** + `Dither`（D：Floyd-Steinberg 可开关）+ HSB / 对比 + **Perlin 色相噪声**（C：「Perlin hue noise always covers the whole visible texture: low noise is transparent, while the other two noise ranges shift hue toward Color 2 and Color 3」= 整图三段噪声把色相往两个选定色偏，草地 / 岩壁出斑驳）+ FX outline。
- 真复古还差的参数面（D，做 WeebPaint retro filter 时的清单）：PS1 15-bit（RGB555）量化 + 4×4 有序抖动、N64 CI4 / CI8 调色板（16 / 256 色）、贴图尺寸 32² / 64² 硬上限、nearest vs bilinear 预览（E14 已定：默认 nearest）。
- 登记：WeebPaint 总账 **#58**（wishlist，指回本文 §5）。

## 6. 非技术问题：他那些图怎么来的

### 6.1 证据

- 教程木板 = 手机随手拍（地上落叶入镜）；Mountain 任务照 = 一张崖顶远眺（cliff ×11 / mossy cliff ×12 编号连续，像同一片地方多次出门）。→ 有相当一部分是**自己拍的**。（A 截图）
- ice cave / ice wall ×5 / lava ×2 / snow ×2 / 五种 sky：不可能一个 biome，**必然是图库**；哪个站**没有证据**——itch / Steam / devlog / 发布贴 / 讨论区都无出处或许可声明。（A）
- 结论：一半自拍一半图库，这是 itch 上 PSX 贴图包作者的常态（同类发布贴里别人明说「sourced from Polyhaven」）。

### 6.2 不用 touch grass 的路（按许可从松到紧；许可页以当日为准）

1. **公有领域（美国联邦机构作品）**：USGS（HVO 火山观测站的熔岩照 = 熔岩贴图正源）、NPS、NOAA（云 / 冰）、USFWS——**他们替你跑遍了所有 biome**。注意页面标第三方署名的除外。
2. **CC0 贴图库**（平铺那一半直接拿 albedo 缩小，最省）：Poly Haven、ambientCG（有 Lava / Ice / Snow / Rock / Moss / Bark 系列）、cgbookcase、ShareTextures（各看许可页）。
3. **Wikimedia Commons**（2026-09-08 查到的真实分类）：`Category:Tree lines`（112 张）、`Category:Bark textures`（355）、`Category:Ice caves in Iceland`（33）、`Category:Snow textures`；逐张看许可（CC0 / CC-BY 为主，CC-BY 要在游戏 credits 署名）。
4. **免费图库**：Pexels / Unsplash / Pixabay——各自许可允许商用改作、禁止原样转售或做竞品图库，做成贴图没问题。搜词：cliff face、mossy rock wall、ice wall、lava flow、conifer treeline overcast、spruce tree isolated sky。
5. **已抠好的剪影库**（alpha 那一半让别人干）：archviz 圈的 MrCutout（免费每日限额，含商用）、Tony Textures（免费含商用）、cutout-trees.com、Immediate Entourage、Gobotree（逐个看许可）；textures.com 有 Cutouts 类但**禁止二次分发**、据报免费额度已取消——慎用。
6. **扫描件当照片**：Sketchfab CC0 / CC-BY 的崖壁 / 岩石 photogrammetry → 正交渲染 = 自带干净 alpha 的「照片」；Megascans 2024 年底前免费领的那批永久可用，2025 起大多收费。
7. **自己 biome 也能拍、而且抠得干净的**：**任何树顶着天**——阴天 = 一个色键（白），晴天 = 两个色键（蓝 + 云白，正是它「2 colors」的来历）；山脊线；坡顶单株。**PSX 分辨率下树种无所谓**：64² 里阔叶和阔叶没区别，只剩针叶 / 阔叶两类能分辨。石头 / 树皮 / 地面不用抠，只要平铺，那要的是平光（阴天）不是好看的光。

### 6.3 家规对接

- 第三方字节进 `~/jupyter/third-party/<来源>/` + SOURCE.md 记来源与许可（cliff-maker / cycletex 现例）。
- 进公开仓或发行的贴图包只收 CC0 / PD / 许可明确可再分发的；CC-BY 要把署名烤进产品 credits（同 PWA Models 仓「署名义务落到产品 UI」）。

## 7. 对 E14 的意义（一句话）

Cliff Maker（几何：画轮廓 → 崖带 → 自动 UV）+ Cycletex（贴图：照片 → 平铺 / 剪影）= 作者的完整 PSX 地形管线。E14 想「比它更自动」，贴图这一半的自动化上限就是 §2–§4 三个算法——全是 2004 年前后的经典 CV，无模型、CPU 秒级、可 vendor。
