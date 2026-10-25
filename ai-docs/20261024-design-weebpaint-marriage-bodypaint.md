# 设计稿（建模历史）：和 WeebPaint 结婚、bodypaint、场景地形

> created 20261024 by Claude Opus 5.5（私仓「建模历史」会话的 handoff 原稿 `~/jupyter/20260520 私仓/20261023 建模历史/handoff/20261024-catsup-design-blender-mode-and-verification.md`）· 2026-10-24 由 Claude Fable 5.1 按主题拆成几份拷入 CatsUp（user「帮我把猫娘验证和blender的那堆研究和rant分开来放两个ai docs」「或者拆更多也行，按主题」），**正文逐字未动** · as-of 2026-10-24 · 状态：讨论定下的方向，未排期（排期归 user）
> 出处：user 2026-10-24 在「建模历史」会话里的讨论（私仓 `~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261024-discussions.md` D-1 … D-14；背景 = 同仓 `ai-docs/20261023-vr-scene-postmortem.md`，user 2024 年一个放弃的 VR 场景的 postmortem）。只收和 CatsUp 设计有关的结论与 user 原话；引用一律原样。
> 同批拆出的几份：见 `20261024-design-from-modeling-history-index.md`。

## 4. 和 WeebPaint 结婚（定方向）

- 「我渴望的就是画贴图不切app。仅此而已」「就是如果结婚的话整个贴图画的时间就几笔。可以抵十个小时的几何」「结婚主要是为了画怪物和人」「场景里面weebpaint的真正大杀器是：matte painting」。
- 要带过来的：「我需要weebpaint的精度和草稿图层」「lasso和transform是刚需，因为你画好了必须要调整位置。没这个我无法bodypaint」（WeebPaint 已有 `src/sel-pen.ts`、`src/floating-transform.ts`、`src/blender-sync.ts`）。
- 单体 bodypaint（user 的方案）：「每个layer有独立的分辨率和uv。可以当下自动展。所以你加了手臂，在新layer上面画。然后最后layer太多了再collapse。所以每次topology change只是以前的layer部分坏了……然后这样的话复用砖墙。墙角画instance geometry sensitive的低分辨率苔藓……然后这样固定管线和drawcall肯定不接，所以就是你说的工作和导出。以及渲染的时候也可以近似优化存cache，就像weebpaint的rendertree一样。这个主要是做单体bodypaint。场景是另外一回事」。要啃的：每层 UV 绑面身份并随血缘传递；只挪顶点时画会拉伸；工作时多层显示靠局部缓存。
- 场景地形：「所以cliff 风之帐的岛，triplanar加可编程procedural加splat。非常可编程管线。但是到时候可以烘」。
- 开放的痛点（未解）：实例化 vs 独一份的画（「三次元是每个原子一个顶点色。这个问题现在全人类没有比较好的答案」）；重采样会糊、统一像素密度会死（「远山vs手里的精致小刀」）。
