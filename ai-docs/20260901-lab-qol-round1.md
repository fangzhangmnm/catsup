# lab QoL 第一波：轴对齐 snap 层 + undo（设计记录）

> as-of v0.0.7 / 2026-09-01（创建日）· created by Claude Fable 5
> user 同日拍板开工（原点/坐标轴 snap、铅笔画矩形的对齐、undo）。snap 体系本体仍 parked。

## 1. 轴对齐 1-DOF 约束层（pick.ts）

统一机制吃三件：**坐标轴 = 过原点的共轴线**——原点/坐标轴 snap 和 SU from-point（「和点共轴」，
user 2026-07-28 反馈）是同一机制的实例。

- 源点 = anchor（优先）+ **原点（永久源）** + 全部模型顶点；方向 = 画线平面基 u/v（+anchor 的世界 Z）。
- 每（源,向）= 一条 1-DOF 约束线（屏距 ≤ tol 才候选）；**正交双约束合成 = 交点 0 维落位**——
  铅笔手画矩形第三笔的闭合角点（`test/snap-align.test.ts` 钉 (0,6) 精确命中）。
- 优先级：点吸附赢者通吃（端点>中点>边上>原点）> 双约束合成 > 单约束（屏距最近，anchor 源并列优先）。
- 视觉：每条活跃约束一条提示线（SnapHint，按轴配色），tooltip「共轴/共轴角点」。
- **刻度声明**：只开轴对齐子集（两正交线求交=平凡）；垂线/平行/通用约束组合仍 parked，
  防滑进约束求解器产品（litreview §三的预言）。
- 简化 vs SU：SU 要 hover「充能」源点，我们全顶点常开（lab 规模小）——将来大模型再收紧。

## 2. undo = 日志重放（src/lab/journal.ts，零内核入侵）

- user 顾虑「会不会影响算法开发」→ 答案：**零约束新增**。内核急切+确定性（公理 5）→
  状态 = mutation 批序列的纯函数；重放确定性已被 preview 影子副本测试钉死（id 计数器逐字）→
  undo = 弹批 + 空内核重放，免费。不做逆操作、不做状态补丁、不加内核接口。
- 算法开发唯一被 pin 的：「同批序列→同结果」——本来就是 spec 级不变量。
- journal 住 lab 壳层（DOM-free，node 直测）；WeebPaint workpiece 模型 = app 纪元正主，
  本件是 lab 刻度最小版，重放慢了加快照环（clone 每 k 步）接缝不变。
- 一手势=一批=一次 undo（Delete 混删合成单 op）；redo 栈新提交即清（标准分支语义）。

## 3. 交付清单（v0.0.7，90 测试绿）

pick.ts 约束层重写（origin/align/align-combo + SnapHint）；render3 提示线；journal + lab 接线
（Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z + 撤销/重做钮）；测试 +7（snap-align ×4、lab-journal ×3）。
