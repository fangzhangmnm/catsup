# CatsUp 核心几何引擎 · 立宪一页

> as-of v0.6.0 / 2026-10-21 · created by Claude Fable 5（rev5=v3.1 守卫+扰动相；rev6=洞环三律；**rev7 2026-10-21 = 像表结算机，edited by Claude Fable 5.1**）
> **铁律：任何核心改动必须及时回写本页。** 验收：代码库丢失时凭本页+golden 语料（test/）复原引擎。
> 附件：对齐引擎数学=`20260901-solver-math-onepager.md`；像表结算机详解（大白话 + 十一步 + 动词表）=`20261021-image-settlement-machine.md`；案卷=move-spec/pushpull-grill-sheet。

## 0. 本体

平面约束的非流形 radial-edge B-rep：顶点（量化格点身份，Q=1e-6）、边（radial `faceLinks` 变长）、
**膜=存储态一等公民**。每平面 = 增量 2D arrangement + 膜状态机；3D = PlaneRegistry（τ 容差 sticky
平面身份+确定性正交基→2D 管线投影复用）+ radial 装订。

## 1. 五公理

- **A1 平面性**：膜=平面多边形（曲线=多边形近似）。执行机构=autofold：非平面环→极大共面段
  贪心分解、结点连最少折缝弦、每段自成膜（失败→BURST 兜底）。
- **A2 非流形**：一边挂 N 膜。
- **A3 重合即同一**：同格点同顶点；两点间至多一边；重合共面膜 dedup。**context 槽已落（2026-10-21 group / component 纪元）：
  每个 group / definition 自己一个 Kernel 池，本条只在池内成立**——group = sticky 隔离域 + 轴框（顶点烘在所在 definition 的坐标里），
  component = definition（自己的池 + 嵌套 group + 实例）+ 实例（变换 + 引用）。场景层 `src/scene/`，内核零改动。
- **A4 膜涌现且被存储**：膜是事件累积的存储态，非边集纯函数。诞生只靠手势（无主胞腔**外环**
  含手势边才 BIRTH；手势边=created+retraced，切开子边经 onSplit 继承）或动词的像（新像独占胞腔 = BIRTH）。
- **A5 急切无历史**：每操作立即 resolve 成规范态。
- **不对称律**：合并/切割急切（有意图）；dissolve-collinear 永不自动（无意图）。

## 2. 动词 = 像表（一切改几何动词的骨架，2026-10-21 起）

**动词不碰图，只交一张像表；机器按坐标认领胞腔。** 像 = 多边形（世界坐标环，外环 + 洞）+ 代数（OR / XOR）+ 继承谁的身份（可无 = 新膜）。
像表 = { consumed（被替换的膜）, images, gesture?（手势线段）, wires?（裸线段）, buryOrphans?（随葬第二相开关）, softSegs?（软边段）}。

| 动词 | 消耗 | 像 |
|---|---|---|
| draw | 无 | 无（只有手势线段；BIRTH = 无主胞腔外环含手势边）|
| move / rotate / scale | 被牵连的膜 | 合并组预判 → 刚移 → 每张的环按新坐标读出（OR，继承自身）；不开随葬第二相（膜移扁留一条线）|
| **pp** | F + 褶边邻膜 | 帽 = F 平移 δ（**XOR**，继承 F）；褶边（全部邻膜 ∥ n̂，`CREASE_COS`）→ 改写邻膜的像（e 段换成 a→a+δ→b+δ→b：拉 = 伸、推 = 缩）；否则侧壁像 (a,b,b+δ,a+δ)（OR，新）；有裸边 → 源像 F₀；开随葬第二相；预演 OR |
| absorb（炸开 / 粘贴 / 复制）| 无 | 快照里每张膜（OR，新）+ 裸边当线段 |
| erase / eraseFaces | 不在本机：擦边 = loop 身份（外环对 void = BURST、洞 / 桥 = ABSORB、同平面共享 = MERGE）；删膜 = 纯出库 |

**时间结构**：拖拽 = 每帧在影子副本上跑同一张像表（pp 的帽用 OR 不湮灭）；commit 用精确参数全量结算一次（XOR 落地）。无开区间样本。

## 3. 统一像表结算机（设面的唯一机器，`src/kernel/settle.ts`）

① 身份像（未消耗的膜自动交：现状坐标，OR，继承自身）② 插边（手势 / 裸线 / 像的环段，sticky；切割血缘喂回手势集 / 随葬集 / 软边集）
③ planarize ④ 非平面像 autofold 成片（折缝也是线；折不动 = 丢弃 = BURST 曝光）⑤ 每平面切胞腔 ⑥ 每个像按绕数认领（像平面 ∥ 胞腔平面、
代表点在像平面 3τ 内）⑦ **填 / 不填：有 XOR 参与 = 认领数奇偶，否则 ≥ 1 即填** ⑧ **身份：一对一保 id（换平面亦跟随）、一对多 DIVIDE、
多对一 MERGE、零胞腔 BURST、新像独占 BIRTH、无主胞腔外环含手势边 BIRTH** ⑨ **随葬两相**：第一相（永远开）= 被消耗膜的旧环边若不在
任何像的环段上、也没有未动膜引用 → 结算前就摘；第二相（动词开关）= 结算后无膜的边只许是用户画的线（本次的、或操作前就是裸线的，
含切割后代），其余孤儿边删 ⑩ **溶解：因本次操作新成为二度共线的顶点（之前不是、也不是本次显式画的端点）→ 两边并一条**（不对称律：
用户自己的分割点永不动）⑪ 软边层维护。
事件 = 纯叙事带血缘（BIRTH/DIVIDE/MERGE/ABSORB/BURST/STRETCH/FACE_ERASED），贴图纪元消费。
退役特例清单见 `20261021-image-settlement-machine.md` §5。findRegions：trace 撞到别的环的半边 = 嵌入不一致（τ 带内投影相交），开环丢弃。

## 4. 对齐引擎（壳层，非内核；数学详一页纸）

`align(W, view, s, Q)`：W=唯一现实世界（手势中=live，平时=checkpoint，**旧 snapshot 结构性禁入**——**例外：推拉的推断世界 = 按下时的模型 +
源面原位不透明，预演永不回流进推断**，2026-10-21，理由见 `20261021-image-settlement-machine.md` §8）；W 自 2026-10-21 起是 WorldView
（全场景各池变换到世界坐标的只读合成视图，id 全局化）——吸附看得见所有 group / 组件，只能编辑活动池；
Q={plane, anchor?, alignSources?, lines?, hand:{has,opaque}}——hand 同源管参赛/派生/遮挡，opaque=
动词参数（pp 帽不透明=SU 连续，move/draw 透明）。0-D 二值可见；1-D 可见区间钳制（禁逐点否决）；
选优=(dim↑,rank↓,⌈d/0.5px⌉↑,tag 序)。**不动点条款**：每个目标在自己吸附值处存在且可见。
pp 双通道：光标通道（不吸轴）+高度通道（h 标量对静态高度集咬合）。

## 5. 其余不变量

undo=指令日志重放 + 检查点环（`src/editor/{ops,history}.ts`，A1 2026-09-20，edited by Claude Fable 5.1）：op 可序列化、按 µm 格点坐标寻址（不含运行时 id——公理 3「重合即同一」= 身份；联机各 peer 重放同序列收敛），状态 = base + 批序列纯函数；提交失败整批不记账、内核回到提交前。坐标=右手系、+Z 上、RGB=XYZ、渲染层禁 Y-up。
golden 语料=共同 spec（膜事件表/暗礁①/灵魂手势≡手绘/E·F 系实证/fuzz/求解器 property）。
**面环自洽**（2026-09-07 VR 真机「edge N 不存在」案，fuzz `test/kernel-fuzz.test.ts` 随机操作 + 不变量）：任何操作之后，面环的边必须存在、faceLinks 的面必须存在、无重复边、无孤立顶点、同环只准一条面记录。落地：① 零认领防御保留前先修环（死边 → 沿原线段的共线子边链 `repairRings`；修不了 → BURST 曝光）；② 擦边裁决同平面 ≥2 面全部 MERGE（此前只配前两张）；③ BIRTH 不铸与既有面同环的面；④ `regionsByPlane` 同一边环只属一张平面（拟合最好者）；⑤ 认领改纯几何（区域代表点抬回 3D、≤3τ 共面门、投到像平面 winding）——不再按平面记录 (n,d) 匹配（候选平面 cover 归属会让小面落在斜了 0.6° 的「错」记录上）。残余：5/80 种子仍出重复面（不崩），总账 D 节。
**容差对齐**（2026-09-07 VR 真机「边 4-3 已存在」案）：身份 = 逐轴 Q/2 的量化格；sticky 插入的「碰到」容差 `INSERT_TOL = Q` ≥ 格半对角线——凡可能量化成同一顶点的点都当碰到（切进来）；`splitEdge` 切点落进既有顶点且已相连 → 复用既有边（重合即同一），`addEdge` 的重复边 throw 保留为最后一层断言。fuzz：`test/subdivide-nearmiss.test.ts`。

**软边属性层**（2026-10-21）：`Kernel.soft`（EdgeId 集）= 圆 / 弧的多边形近似边与它们推拉出的侧棱 / 帽边；结算机维护切割继承 / 删边清理 /
新软段登记；渲染不画线、推断照常吸；文件 = `CATSUP_brep` v2 `attributes.edge.soft`（每边 1 字节）。
**抬笔结算**（壳层，A21，2026-10-21）：抬笔前停留 ≥ 40 ms 的地方才是意图，末尾 < 100 ms 的抖动不算（`editor.ts settledSample()`）。
**持久化装载**（2026-09-20，转正纪元；契约 = ai-docs/20260919-persistence-data-contract.md §5.2）：`Kernel.fromBrep(BrepSnapshot)`
= **复原存储态**，不是构造——「没有让调用方构造/注入 Face 的入口」仍成立：唯一入口只吃快照形状（顶点 / 边 / 平面注册参数 /
顶点环膜），不跑 face-finding（A4：闭环可以无面，文件说几张膜就几张），装载后全量校验面环自洽（A3 格点唯一、无重边、
无孤点、环边存在、共面 τ 内、外环 CCW 洞 CW、同环唯一膜）——**失败整份拒开报出，不修不猜**。平面注册参数是状态（τ 合并
顺序相关，重建不等价，必须存）；faceLinks / 环 pts / 基 / id / 事件是派生，不存。`toBrep()` 为其逆。edited by Claude Fable 5.1 2026-09-20

edited by Claude Fable 5 2026-09-03 · edited by Claude Fable 5.1 2026-09-06 · edited by Claude Fable 5.1 2026-09-07
edited by Claude Fable 5.1 2026-10-21（rev7：像表结算机、A3 context 槽落地、软边层、推拉推断世界例外）
