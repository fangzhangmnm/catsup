# SU 几何引擎内核是什么 —— 文献综述第一轮（稻草人版）

> as-of v0.0.5 / 2026-09-01（创建日）· created by Claude Fable 5
> 读者：user（drill 对手方）。定位 = **稻草人**：结论故意说满，等实机 pushback——上一轮
> 「面=派生量」被你实机证伪成「面=存储态」，就是这个流程的正常产出。
> 网上核过原文的引文在文末；个别标【训练记忆】的没核到原文，不许当出处转引。

## 一、Thesis（本轮主张，说满）

**SU 内核 = 每个平面一台「增量维护的 2D arrangement」＋ 一台「膜持久化状态机」＋ 一层「radial-edge 装订」。**

1. 学界对「一堆线段把平面切成点/边/域」这个东西有现成名字：**arrangement（平面剖分）**。
   我们的 facefind + subdivide 合起来就是一台 arrangement 的**增量插入机**：打交点切边（dividing）
   是插入的预处理，wedge/最紧转弯遍历是域提取。这层**不是 SU 独创**，有成熟文献和工业实现。
2. **膜状态机才是 SU 的私货**——arrangement 只回答「现在平面被切成哪些域」，不回答「哪些域上有膜」。
   膜的填/空是**事件累积的存储态**（你实机逼出来的修正案），任何纯几何推导都重建不出来。
3. 3D 层只是记账：PlaneRegistry（平面 sticky 身份）+ radial cycle 装订跨平面共享边。
   垂直方向没有新几何思想——所以你研究 SU 时**大部分心智模型可以在 2D 里形成**。

## 二、工业对照系 ①：CGAL Arrangement_2 —— 最像我们的开源镜子

CGAL（计算几何标准库）的 2D Arrangements 包维护「curve 集合诱导的平面剖分」，增量插入，
DCEL 存储，且带 **observer 通知机制**（`Aos_observer`）——事件词表和我们 FaceEvent 表的对照
惊人（函数名从官方 doc 逐字核过）：

| CGAL observer 事件 | 我们的 FaceEvent | 备注 |
|---|---|---|
| `before/after_split_face` | DIVIDE | 一刀切两域 |
| `before/after_merge_face` | MERGE | 删共享边并域 |
| `before/after_split_edge` | （subdivide 内部）| dividing 本体 |
| `before/after_add_inner_ccb` | 嵌套挂洞 | inner CCB = 洞的环 |
| `before/after_move_inner_ccb` | ABSORB 后的重嵌套 | 洞换宿主 |
| `before/after_create_vertex` | （拓扑层）| sticky 顶点出生 |

**关键差异 = SU 私货清单**（CGAL 里根本没有的概念）：

- **填/空状态**：CGAL 的 face 是剖分的全部单元（连无界面都算 face），没有「这个域上有没有膜」。
- **BIRTH 手势裁决**：闭环即域是 arrangement 的必然，但「闭环才生膜、且只认手势边」是 SU 的产品公理。
- **BURST**：域还在、膜死了——arrangement 词汇表里无此物。
- **膜的持久身份**（我们的 anchor reconcile + id 血缘）：CGAL face 身份是 DCEL 内部指针，无产品语义。

**本轮最重要的结论**：底盘（arrangement）有文献有现货有术语，可以放心抄口径；
**膜状态机没有任何现货**，唯一的 spec 来源就是你在真 SU 上做实验——这从文献侧证明了
「主要劳动 = 你研究 SU」这个分工是对的，不是分工偏好，是这块知识**只存在于 SU 的行为里**。

## 三、工业对照系 ②：参数化草图求解器 —— 反面镜子

OnShape / SolveSpace / FreeCAD sketcher 谱系：约束是**持久对象**——进文档、随时重求解、
永远活着【训练记忆，低风险】。SU 相反：inference 是**瞬时约束**——取点那一瞬求解完就扔，
落盘的只有几何，模型里不存在任何约束对象（drill 里那句「eager + destructive」的输入侧版本）。

对 parked 的 snap 议题有一个 spec 级预言，先钉住防将来跑偏：
**snap ≠ 约束系统，是「取点瞬间的轻量求解 + 优先级仲裁」**。将来 grill snap 时若发现自己
在设计「约束的存储/编辑/失效」，那就是掉进了求解器产品的坑——那是另一个软件。

（SU 官方 inference 词表，将来弹药，本轮不展开：point 类 = endpoint / midpoint / intersection /
on-edge / on-face；linear 类 = on-axis / **from-point（你要的“和点共轴”）** / parallel /
perpendicular / tangent-at-vertex。）

## 四、数值层：我们的量化 ≈ snap rounding 的糙近亲

把任意精度交点拍到定精度格点，学界叫 **snap rounding**（Guibas–Marimont 命名、Hobby 实用化，
后续有 iterated snap rounding 和 bounded-drift 变体）。已知病：顶点被挤到非邻接边极近、
逐次 rounding 累积漂移、漂移可改变拓扑。geom.ts 的全局量化是这家族里最糙的版本——lab 尺度
无感，将来大模型+反复 move 会累积。**不是现在的活**，钉个学名防止将来重新发明轮子。

## 五、可证伪清单（给你的实机靶子；打掉的升级成 golden）

- **C1** 每平面独立跑 face-finding，跨平面零干扰（两个非共面环共享一条边，各自闭合各自生膜，互不触发）。
- **C2** 膜状态不可从当前几何重建：同一终态几何、两条不同操作历史 → 膜分布不同（你已证一半：日字擦缝 vs 直接画）。
- **C3** move 事件集 = {dedup 撞合, edge-split 落边, autofold 折面}，**绝无膜的生与死**（你已实证；本轮收编为公理候选，等你口述细则）。
- **C4** erase 裁决只看 loop 身份、不做覆盖查找（回字内填外空、擦内边，外膜不长满）。
- **C5** 公理 5 的可测推论：任何工具中途 Esc，模型 = 开始前逐字节等价（无半应用状态）。

## 六、来源（核过原文）

- CGAL 2D Arrangements 观察者（事件函数名出处）：<https://doc.cgal.org/latest/Arrangement_on_surface_2/classCGAL_1_1Aos__observer.html>
- CGAL 2D Arrangements User Manual：<https://doc.cgal.org/latest/Arrangement_on_surface_2/index.html>
- Snap rounding 谱系（Guibas–Marimont / Hobby 归属；iterated SR）：<https://doc.cgal.org/latest/Snap_rounding_2/citelist.html>
- Iterated snap rounding with bounded drift（漂移病与修法）：<https://dl.acm.org/doi/10.1145/1137856.1137910>
- SU inference 词表（官方 help + 教程站交叉）：<https://help.sketchup.com/en/sketchup/introducing-drawing-basics-and-concepts>、<https://mastersketchup.com/sketchup-inference/>
- SU 专利 US 6,628,279（drill journal 已引，manifesto 级出处）：见 `journals/20260627 SketchUp drill.md`
