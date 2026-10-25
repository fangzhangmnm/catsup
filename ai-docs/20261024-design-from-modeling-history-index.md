# 设计稿（建模历史）索引：Blender 模态、验证叠加层、实体分类与 OnValidate

> created 20261024 by Claude Opus 5.5（私仓「建模历史」会话的 handoff 原稿 `~/jupyter/20260520 私仓/20261023 建模历史/handoff/20261024-catsup-design-blender-mode-and-verification.md`）· 2026-10-24 由 Claude Fable 5.1 按主题拆成几份拷入 CatsUp（user「帮我把猫娘验证和blender的那堆研究和rant分开来放两个ai docs」「或者拆更多也行，按主题」），**正文逐字未动** · as-of 2026-10-24 · 状态：讨论定下的方向，未排期（排期归 user）
> 出处：user 2026-10-24 在「建模历史」会话里的讨论（私仓 `~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261024-discussions.md` D-1 … D-14；背景 = 同仓 `ai-docs/20261023-vr-scene-postmortem.md`，user 2024 年一个放弃的 VR 场景的 postmortem）。只收和 CatsUp 设计有关的结论与 user 原话；引用一律原样。
> 同批拆出的几份：见 `20261024-design-from-modeling-history-index.md`。

原稿一份 = 六节；按主题拆成五份（user 2026-10-24「帮我把猫娘验证和blender的那堆研究和rant分开来放两个ai docs」「或者拆更多也行，按主题」）：

| 文件 | 内容（原稿节） |
|---|---|
| `20261024-design-background-exams-and-tracks.md` | §0 背景一句话 · §1 期末考和高考 · §2 赛道 / core（不胖 = draw call 账；PBR 不进契约；贴图承重赛道不提几何草） |
| `20261024-design-blender-mode.md` | §3 Blender 模态（另一个内核；动词 = 拓扑操作 × 对齐方式；有机模式不吸附不推断；user 肌肉记忆与两条 wishlist） |
| `20261024-design-weebpaint-marriage-bodypaint.md` | §4 和 WeebPaint 结婚（画贴图不切 app；lasso / transform 刚需；每 layer 独立分辨率与 UV 的 bodypaint；场景地形 triplanar / splat；开放痛点） |
| `20261024-design-verification-overlay.md` | §5 验证 = 常开的叠加层（猫娘的本质 = 验证；注释 = 举牌子；断点 = 钉在位置上的谓词：射界 / 走得过去吗 / POI 几秒几拍；人的尺度；advisory 不计权） |
| `20261024-design-entity-classes-onvalidate.md` | §6 实体分类与 OnValidate（用户全局定义类型只有数据；注释可显式晋升成实体，引擎永不读牌子；OnValidate 只算面板不动字段；待定清单） |

前车之鉴（为什么要这些）：user 2024 年一个放弃的 VR 场景的 postmortem = 私仓 `~/jupyter/20260520 私仓/20261023 建模历史/ai-docs/20261023-vr-scene-postmortem.md`（斩杀线 = 「灰模 → 有画面」那一步）。
