# 设计稿（建模历史）：Blender 模态

> created 20261024 by Claude Opus 5.5（私仓「建模历史」会话的 handoff 原稿 `~/jupyter/20260520 私仓/20261023 建模历史/handoff/20261024-catsup-design-blender-mode-and-verification.md`）· 2026-10-24 由 Claude Fable 5.1 按主题拆成几份拷入 CatsUp（user「帮我把猫娘验证和blender的那堆研究和rant分开来放两个ai docs」「或者拆更多也行，按主题」），**正文逐字未动** · as-of 2026-10-24 · 状态：讨论定下的方向，未排期（排期归 user）
> 出处：user 2026-10-24 在「建模历史」会话里的讨论（私仓 `~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261024-discussions.md` D-1 … D-14；背景 = 同仓 `ai-docs/20261023-vr-scene-postmortem.md`，user 2024 年一个放弃的 VR 场景的 postmortem）。只收和 CatsUp 设计有关的结论与 user 原话；引用一律原样。
> 同批拆出的几份：见 `20261024-design-from-modeling-history-index.md`。

> **⚠ 方向变了（user 2026-10-25，CatsUp 会话；Claude Opus 5.5 标）**：「好，那么拍板，以后争取不要blender mesh。就用brep。除非性能brep很劣于bmesh」「关键不是不要bmesh，而是只有一种模态哈哈哈。不用切换网格的数据类型」「blender很简单，一个hard surface modeling的workflow，一个organic modeling的workflow就可以了，同一个几何，不同的编辑工具，不同的快捷键手势」——下面「blender是另外一个内核」那条作废：同一份 brep 几何、两个工作流（不同工具 / 快捷键 / 手势）。见纪元账本 `20261025-dog-tank-epoch-ledger.md` DT19 / DT22。

## 3. Blender 模态（定方向）

- 「1.加blender模态。两种不同的编辑方法，不用出app. 2. 和weebpaint结婚」「对，blender是另外一个内核」。手绘要作者摆的 UV，平面内核不存 UV；SU 式共面合并会和有机编辑打架。
- **动词 = 拓扑操作 × 对齐方式**：「很多时候我用不同的gre vocab动词去实现本来简单的东西……省op数的动机比较少，反而是为了不同的对齐模式。比如e和i完全是等价的，就是对齐模式不同，然后我那么多的shift right click，s x g y 这种，都是为了设定方向」。E ≈ 推拉、I ≈ 偏移、K / J ≈ 在面上画线、溶解边 ≈ 橡皮——动词层可以和 SU 模式共用。
- **有机模式不吸附、不推断**：「有机体建模是不能有snap的，必须是鼠标移动多少就是多少的微调。而且很多时候naive g就是screen space。所以自动推断会导致跃变，以及某些值被遮住」「机床里的游标卡尺有刻度。但是艺术室里的石膏必须是没有刻度的，和手的输入是smooth map」。SU 模式推断，有机模式由人明确声明对齐（键盘：X / Y / Z、Shift + 轴、游标轴心）。
- 触屏对齐：可连续拖的把手——「不一定靠谱，算是也许可以，不太有信心的一类」（待试、低信心；把手也不能带增量吸附）。
- 长尾：「低频操作可以放到context menu里面，然后wishlist search. blender我非常常用search的」。
- user 的 Blender 两条 wishlist：① `Ctrl+R` 被选区截断、不往外传播；② 选一条边环，沿它切成两块几何（PS1 拆段）。
- user 键鼠肌肉记忆（摘要；全文见私仓 D-9）：起手 E G S；Ctrl+R；Ctrl 选路径 + G + Shift+Z；溶解边修拓扑；无限的点 G 微调；顶点倒角 `Ctrl+Shift+B` 成眼眶环 → 刀 K / 连线 J → GG 滑边 → 小键盘 . 聚焦 → 压平面 → I 内插 → E S G → 中心合并；手臂 = 侧面 I → G Y S Y → E；Shift+右键设游标当旋转轴心；三种模式下分别 G。逆向自 .blend 的画像：必用 = 镜像修改器、平滑 + 硬边、参考图、比例小人、三角统计；几乎不用 = 吸附、自动合并、工具栏工具；低频必卡 = 应用缩放（为它出生了两个脚本）、应用镜像、合并重复点。
- 常驻位：触屏和键鼠分开想（「因为触屏和键盘鼠标很不一样」），先定主场；还没定。
