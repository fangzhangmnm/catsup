# 内核精确几何（EGC）路线：问题陈述 + 架构 + 分期（user「用学术上最专业的」「内核数学要完美。除非性能伤的太差」「3 > 2 > 1」）

> created 20261024 · as-of v0.13.30 / 2026-10-24 · created by Claude Fable 5.1
> 性质：设计 + 第一期实现记录。user 已拍方向（精确谓词 + snap rounding 优先于「按平面立不变量」优先于「op 带引用」）；每期落地前后都用 fuzz / 差分 oracle / 全量 golden 当仪表。

## 0. 一句话

**所有几何判定（谓词）在格点整数坐标上精确计算；所有构造（交点）用 snap rounding 落回格点；平面排列在「主轴投影」的整数 2D 里算**——这样判定之间永远不会自相矛盾，守恒断言不可能因为数值而触发。容差只剩两种显式语义：身份分辨率 r（≤ r 的点是一个点 = snap rounding 的像素）和共面带 τ（哪些边进同一张平面 = 建模选择，用整数不等式判）。

## 1. 问题陈述（为什么现在会错）

- 坐标在 Q = 1 µm 的格上（整数），但谓词用浮点：`segIntersections3` / `pointOnSegment3` / `collinear2`（cos > 1−1e⁻⁹）/ `planeOfRing` / `pointInRing` / `findRegions` 的 atan2 角序 / `representativePoint` 的扫描线。每个谓词有自己的 ε，两个谓词对同一组点可以给出矛盾的答案（A 说相交、B 说不相交）。
- 平面排列在浮点正交基的投影里算（`projectToPlane(p, basis)`），投影本身就不精确；τ = 1 mm 的成员资格和 3 µm 的身份在两个空间判（总账 D11 回复的第三层）。
- 结论：现在的「正确」靠输入干净（吸附 / 格点 / 轴对齐）。nasty fuzz 的 µm 噪声、斜面的无理法向、计算交点，都能把它推进矛盾区；v0.13.21 的 r = 3 µm 只是把矛盾区的下沿抬高。

## 2. 学术上的标准做法（选型）

1. **精确谓词**（Shewchuk 1997《Adaptive Precision Floating-Point Arithmetic and Fast Robust Geometric Predicates》；CGAL 的 filtered predicates）：orient2d / orient3d / 线段相交 / 点在段上 / 共线 / 共面 = 整数行列式的**符号**。做法 = 浮点过滤器（先用 double 算，误差界内判不出符号才退到精确）+ 精确后备。JS 里精确后备用 **BigInt**（坐标 ≤ 2³⁰ 格 = ±1 km，2D 行列式 2⁶² 超 2⁵³ 所以必须 BigInt；3D 四点行列式 2⁹³）。
2. **Snap rounding**（Hobby 1999《Practical segment intersection with finite precision output》；Guibas & Marimont 1998《Rounding arrangements dynamically》；Goodrich, Guibas, Hershberger, Tamassia 1997《Snap rounding line segments efficiently in two and three dimensions》；Halperin & Packer 2002《Iterated snap rounding》；de Berg, Halperin, Overmars 2007 intersection-sensitive）：把精确排列的所有顶点（原顶点 + 交点）所在的像素标成 **hot pixel**，每条线段换成依次穿过它所经过的 hot pixel 中心的折线。保证：输出是 PSLG（边只在 hot pixel 中心相遇）、每条边离原线段 ≤ ½√2 像素、拓扑与精确排列一致。**迭代版**（Halperin–Packer）再保证任何顶点离非邻接边 ≥ ½ 像素——这正是 v0.13.21 想要却只能靠「先合并再切」逼近的分离性。像素 = 身份分辨率 r（3 µm = 3 格）。
3. **3D 的处理 = 按平面做 2D**：每个平面组选一个**主轴投影**（丢掉 |n| 最大的那个分量）——投影是整数到整数的双射（不是正交基的浮点投影），拓扑与原平面一致。在这个整数 2D 里做精确排列 + snap rounding；2D 顶点提回 3D：另一坐标按平面方程 ax+by+cz=d 算出有理数再落格（误差 ≤ ½ 格，在 τ 内）。两条在 3D 里斜交 < τ 的边在投影里相交 → 同一个 3D 格点顶点、两条边都穿过它（Goodrich et al. 的 3D hot pixel 思想）——这就是「2」的 PSLG 不变量，用「3」的工具立。
4. **共面带 τ 保留为建模选择**，但判定用整数：边属于平面记录 (a,b,c,d)（整数，取自三格点）当且仅当 |a·x+b·y+c·z−d| ≤ τ·|n|（两边都是整数乘法）。面的「精确平面度」在格点上本来不可得（无理法向的平面与格点交集稀疏），不追求；追求的是**判定一致**。

工业 B-rep（Parasolid / ACIS）走的是 tolerant modeling（每个实体带容差，全浮点），学术标准是 EGC（CGAL）。user 拍 EGC。

## 3. 架构：新模块 `src/kernel/exact/`

- `lattice.ts`：格点整数坐标（`number`，|v| < 2³¹；换算 `toLattice(Pt3) / fromLattice`），所有精确模块只收整数。
- `predicates.ts`：`orient2d(a,b,c)`、`orient3d(a,b,c,d)`、`collinear2d`、`onSegment2d`、`segSeg2d`（不交 / 内部交 / 端点触 / 共线重叠四分类）、有理参数比较 `cmpParam`——全部「double 过滤 + BigInt 后备」，有 `stats`（过滤命中率）。
- `snap-round.ts`：整数 2D 线段集 + 像素尺寸 → 迭代 snap rounding：① 精确求全部交点（有理），② hot pixel 集，③ 每段按穿过的 hot pixel 排序出折线，④ 迭代到不再出现新 hot pixel。输出：顶点（像素中心的整数）+ 边（顶点对）+ 每条输入段 → 折线的映射（血缘：手势边 / 随葬 / 曲线登记都靠它）。复杂度先 all-pairs + 空间网格（现有规模够），Bentley–Ottmann 的换入点留在同一文件。
- `plane-int.ts`：整数平面记录 (a,b,c,d)、主轴投影 / 提回、整数共面判定。
- 测试：`test/exact-predicates.test.ts`（过滤器 vs BigInt 一致性 fuzz、退化样例：共线 / 重合 / 端点触）、`test/snap-round.test.ts`（PSLG 不变量、Hausdorff ≤ ½√2 px、分离性、随机段集 vs 暴力）、基准（1k / 10k 段）。

## 4. 分期（每期可独立交付、可回退）

- **期 1（done v0.13.25，2026-10-24）**：`exact/lattice.ts` / `predicates.ts`（orient2d / orient3d 过滤 + BigInt、segSeg2d 四分类、有理交点 / 像素、像素穿过判定）/ `snap-round.ts`（迭代 snap rounding + PSLG 校验）+ `test/exact-geometry.test.ts`（谓词 26k 例与纯 BigInt 逐一一致；随机 150 段 × 12 种子 PSLG 零问题、Hausdorff ≤ P√2、端点落像素、确定性；级联分离性）。基准（随机段、像素 P = 4 格、密度恒定）：200 段 9 ms / 1000 段 21 ms / 5000 段 157 ms，2–3 轮收敛；过滤器后备率 ≈ 1/50000 以下。不接内核。
- **期 2（done v0.13.27，2026-10-24）**：`exact/predicates3d.ts`——点到闭段距离² ≤ r²、骑边严格内部、两段关系（精确共面相交 / 斜交公垂线 ≤ r → A 上垂足 / 共线重叠），全部格点整数 + BigInt，构造点精确舍入到格点；`insertSegment` 与 `planarize` 的 `segIntersections3` / `pointOnSegment3` / `samePt3` 全部退场，r 是唯一容差。结果：**nasty fuzz 守恒拒绝 29 → 1（期 1 前的 3 µm）→ 0**，clean 全绿，449 条全量快测全绿；fuzz 门槛改成 `rejected === 0`。性能见 §4½。
- **§4½ 性能（期 2 落地时量的，node 纯内核基准 = 随机矩形 + 推拉 + 过头线，150 件）**：浮点旧版 363 ms；精确版第一刀 463 ms（+28%：BigInt 分配 + GC，CPU profile 里 `B()` 6.8% / `segSeg3Exact` 5.8% / GC 7.8%）；加了整数包围盒预筛（只有包围盒相距 ≤ r 的对才进 BigInt）→ **365 ms = 与浮点版持平**。性能门没碰到。
- **期 3b 追记（v0.13.30，同夜）性能场景拉到 800 / 1600 件撞出两件事**：① **findRegions 挂洞探针 bug（浮点 / 精确内核同样，与 EGC 无关，创世就在）**：壳环（组件 CW 外壳）挂洞时拿 `pts[0]` 当探针，而那个顶点恰是被两张面围着的小面的角——点在候选面环的边界上，pointInRing 无定义（那一例判成「在里面」）→ 整张外壳挂成小面的洞 → 代表点落到洞那边 → 小面身份像零认领 → 守恒断言。修 = 探针取壳环第一条边的中点（PSLG 里边不重叠、顶点不骑边，中点严格在任何别的环内或外；同组件守卫照旧）；测试 `test/facefind-hole-probe.test.ts`（手搓边序让外壳从共享顶点起手 + insertSegment 16 种边序 + 真洞对照）。② **τ = 1 mm 的语义后果**：mm 格点随机场景里会出 1 mm 宽的细条面；邻居一推拉就造出两张 1 mm 之隔的平行墙 → 同一平面组 → τ-flatten 把细条的两条长边并成一条、环剩 2 点 → 以前报「结算机自相矛盾」，现在单独一条理由「膜 N 在共面容差 τ 下被压扁」（宁拒不删）。**同一场景 τ = 100 µm / 25 µm 跑到 1600 件（6900 膜）零拒绝**——这是 τ 该多大的实证：1 mm 下 1 mm 厚的东西就是退化的，SketchUp 的 25 µm 不会。等 user 拍。调试钩子 `SETTLE_DEBUG`（影响域 / 胞腔 / 认领逐条）/ `FF_DEBUG` 挂洞行 / `FLATTEN_DEBUG`，守恒断言响了先开钩子看，别猜。
- **§4¾ 性能总账（期 3b 落地后，user 2026-10-24「EGC好了可以看一下有没有性能伤，不过gta vcs不是强制」；Claude Fable 5.1）**：同一随机场景（mm 格点矩形 + 推拉 + 过头线，密度不随规模变），v0.13.25 浮点内核 vs v0.13.29 精确内核，各跑两遍：150 件（608 膜 / 1731 边）整段 404–407 → 421–427 ms（+4%）；400 件（1698 膜 / 4816 边）1204–1205 → 1122–1127 ms（−7%，整数包围盒预筛赢回来的）。大场景单步延迟（用户感知的那个）：1698 膜上一次推拉 5.6–11.5 → 3.0–10.5 ms、一次画矩形 0.6–3.6 → 0.7–2.8 ms，噪声范围内同一个数。BigInt 慢路径命中 0（Shewchuk 过滤器全接住）。**结论：没有性能伤**；城市尺度（GTA VCS 那种）不是指标，user 同日说「不是强制」。脚本 = job tmp `bench2.mjs`（取 repo 根 + 规模列表）。
- **期 3a（done v0.13.28，2026-10-24）判定精确化（不动 `pts` 的坐标空间——编辑器十几处在用平面基投影的 2D 点）**：`orient2dD` = 任意 double 的精确 2D 定向（Shewchuk Stage A 过滤 + 把 double 按同一个 2 的幂精确放大成 BigInt；两个乘积都为 0 时不信过滤器——任意 double 有下溢）；`pointInRing`（奇偶）、`windingOf`（像的认领）、`findRegions` 的角序（S¹ 全序比较器 = 半平面等级 + orient2dD，替掉 atan2；零长投影沿用 atan2(0,0)=0 的等级，否则 clean fuzz 种子 10 的遍历顺序变）、`collinear2`（溶解 / 断口 = 中间点离两端连线 ≤ r 的格点精确判 + 反向）全部走精确谓词。结果：全量 450 条绿、nasty / clean fuzz 零拒绝、基准 329 ms（比浮点版 363 ms 还快一点）。
- **期 3b（done v0.13.29，2026-10-24）τ 带里的投影一致性 = `src/kernel/tau-flatten.ts`**：问题 = 内核两把尺子（身份 r = 3 µm 在 3D 判，共面 τ = 1 mm 定平面组成员）之间的带 (r, 2τ]——同组两条边 3D 相距在这个带里时 planarize 看不见，投到平面上却相交 / 骑边 / 顶点重合 → 不是 PSLG。做法 = 容差建模的合并公理（非邻接特征的容差区相交就并成一个）：结算机算完影响域（④）后，对每张被碰平面把顶点投到平面基底再落格（整数），拿 3D 精确谓词取 z = 0 当 2D 用：① 两顶点投影 ≤ r → 合并（新并进旧，同龄高 id 并进低 id；被并掉的旧顶点所在活膜环按 id 改写 vids）；② 顶点骑在边内部 ≤ r → 边穿过该顶点（边弯 ≤ 2τ，顶点不动）；③ 两边真交 → 在参照边（旧 > 新）自己的 3D 点切开、另一条边穿过它。只配脏边 × 组内（局部性）；改了就再跑一轮 3D planarize + 重算影响域，直到不动点（> 16 轮 throw）。样本：nasty fuzz 生成器加「推拉帽落到离平行膜 0.1–0.9 mm」（默认开，`FUZZ_OPTS.parallelMembranes`；sweep `--no-parallel` 关）——落地前 80 种子 4 个拒绝（1675664 / 1989851 / 4084431 / 8064133），落地后 **0 拒绝、0 别的 throw**，标准档也 0，450 条全绿；基准 150 件 381–408 ms vs 基线 390–396（整数包围盒预筛后持平）。**顺手量的、要 user 拍的**：τ 本身是建模语义旋钮（「两张面相距多近算同一张」），1 mm 是浮点时代留下的；SketchUp 的内部容差 0.001″ ≈ 25 µm；把 τ 拨到 100 µm / 25 µm / 10 µm / 6 µm / 3 µm 跑 fuzz（`--tau=`）全绿。本期**没动** τ 默认（coplanarTol 还是 1e-3，且按文档存）。守恒断言现在只能由建模矛盾触发（膜丢边 / 平面成员资格在合并后出带：合并点离某张斜交平面可到 3τ，那种情形仍拒绝这一步，是 τ 语义自身的极限，不是 bug）。
- **期 4（原「1」）**：op 带引用 / 约束（推拉到某顶点所在平面、端点 = 顶点 id）——只在 2 / 3 之后还剩下的意图丢失上做。
- 性能门：每期用 `bench-pools.mjs` / 结算耗时对照，过滤器命中率 < 95% 或结算慢 2× 以上就停下来回报。

## 5. 不做的

- 不引入任意精度有理数坐标（CGAL Exact_predicates_exact_constructions_kernel 那种）：坐标永远是格点整数，构造一律 snap rounding 落格；这是 Hobby 路线，不是 Lazy exact 路线。
- 不改文件格式（坐标还是米的浮点；格点在内核内部）。
