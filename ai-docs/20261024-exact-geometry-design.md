# 内核精确几何（EGC）路线：问题陈述 + 架构 + 分期（user「用学术上最专业的」「内核数学要完美。除非性能伤的太差」「3 > 2 > 1」）

> created 20261024 · as-of v0.13.24 / 2026-10-24 · created by Claude Fable 5.1
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

- **期 1（本稿落地）**：`exact/` 三件 + 测试 + 基准。不接内核。
- **期 2**：`planarize` / `insertSegment` 的判定换精确谓词（结构不变、ε 退场），fuzz 计数对照。
- **期 3**：结算机 ④ 的按平面排列：`regionsByPlane` 前先对每个被碰平面做「主轴投影 + snap rounding」（= 立 PSLG 不变量），`findRegions` 只吃整数 PSLG；`collinear2`、`representativePoint`、`pointInRing` 换精确版。守恒断言此后只能由**建模矛盾**触发。
- **期 4（原「1」）**：op 带引用 / 约束（推拉到某顶点所在平面、端点 = 顶点 id）——只在 2 / 3 之后还剩下的意图丢失上做。
- 性能门：每期用 `bench-pools.mjs` / 结算耗时对照，过滤器命中率 < 95% 或结算慢 2× 以上就停下来回报。

## 5. 不做的

- 不引入任意精度有理数坐标（CGAL Exact_predicates_exact_constructions_kernel 那种）：坐标永远是格点整数，构造一律 snap rounding 落格；这是 Hobby 路线，不是 Lazy exact 路线。
- 不改文件格式（坐标还是米的浮点；格点在内核内部）。
