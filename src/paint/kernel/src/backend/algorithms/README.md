# backend/algorithms —— 窄 I/O「小论文」注册清单

> as-of v0.8.27 / 2026-08-10（C3 立户）。规矩（提案 §1 + ADR-0009）：
> 每个文件 = 一个自洽算法，字节/typed-array 进出，零 DOM/零 Selection/零 UI 知识；
> import 只准 common/（+ 目录内部）。**新独立 CPU 像素算法入册需 user consent**（热路径栅格只准走
> Gl2Port）。新算法落地必须在本表加一行。

| 文件 | 算法 | 出处/性质 | 主要消费者 |
|---|---|---|---|
| `flat-coloring/`（edt/border/closing/partition） | 线稿分区 flat coloring 管线（EDT=Meijster；端点检测；样条断口闭合；分区总管线） | Fourey–Tschumperlé–Revoy 2018 | flat-coloring-oracle（魔棒 lineart 算法） |
| `magic-wand.ts` | 魔棒三内核：四连通泛洪（v242 语义）/ 容隙=EDT 受限 flood+回贴膨胀（v0.7.24）/ 同色全图（v0.7.21） | 自研；容隙教训见 ai-docs/20260528-lessons-magic-wand-gap-closing.md | lasso.ts 出口包装（floodSelectFrom/similarSelectFrom → Selection） |
| `bspline.ts` | 预滤波三次 B 样条系数+采样（与 GPU shader 逐位同步） | Thévenaz/Unser | floating-transform、liquify-engine、gl-smoke 对拍 |
| `rotsprite.ts` | EPX/Scale2x 2^n 放大（RotSprite 管线的放大半边；旋转在 GPU nearest 采样侧） | RotSprite（经典像素画管线） | floating-transform（像素完美变换） |
| `resample-bytes.ts` | 轴对齐重采样核（area/nearest/bilinear/bicubic，全 typed-array） | 标准核 | doc-ops 重采样、import-image、liquify-engine |
| `color-cluster.ts` | 确定性 k-means + 最近邻硬分配拆分 | 标准 k-means（确定性种子） | explode-layers（按颜色拆分图层） |

## 待迁入（挂账，不在本目录）

- `pixel-conic.ts`（Zingl 有理二次 Bézier 像素透视圆）——被 perspective-frame（homography）/
  shape-geometry（bresenham）拖住：那两个文件的拆分（拟合→frontend/toolkit、光栅原语→本目录）
  排 C4/C5 之后；拆完 pixel-conic 随迁。
- `selection.ts` 搭车的 `rasterizePolygonGray8`（多边形 gray8 光栅器）——随 Selection 值对象
  落 common 时析出（提案 §1；被 appTilePool 依赖拖住，排 C7 装配片）。
- GPU/CPU 对表注册表（shader 名 → GLSL + CPU 等价函数）= C8 SoftGl2Port 片，届时与本表互链。
