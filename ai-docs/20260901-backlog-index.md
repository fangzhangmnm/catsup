# Backlog 总索引（2026-09-01 盘点）

> as-of v0.1.5 / 2026-09-01（创建日）· created by Claude Fable 5
> 各议题的 SSoT 在各自 doc；本页只做一眼可扫的指针（user review 用）。

- **挖洞/暗礁②**：等 user 实机 E1-E6 → `20260901-pushpull-grill-sheet.md` §2；XOR 动词代数提案 §2.5。
- **透视投影**（相机类/前视锥裁剪）→ `20260901-snap-model.md` §7；~~snap 遮挡~~ **v1 已提前落地 v0.2.13**（2026-09-03 user「乱闪不是 SU 手感」——膜遮挡过滤进
  情境构建器：隐藏点/两端全挡的边不参赛；部分可见边/线候选细化仍归 0.3）。
- **pp 的「挡」（Offset-limited）**：判据=滑行边撞面上顶点（E7）；实现形状已定=pp 约束集加
  h 上限（零拓扑，grill 单 §2.9）——排 0.3 或之后。
- **可移动轴系统**（SU 手动改 axes；兜底平面/轴锁/共轴方向全随轴系）——2026-09-01 Q1 修案伏笔，未立项。
- **连画 auto-lift 之外的逃生变体**（Shift 连画/双击收笔）→ `20260901-lab-qol-round1.md` §5（现行=出膜停+Esc，user 已裁，此条仅备变体）。
- **空处线第二点的 SU 实机核**（摄像机朝向兜底细则）→ qol §5。
- **hover 充能收窄之外的来源策略**（边充能/延长线源）→ snap-model §3。
- **resolvePlane 并入求解器 + snapPoint 壳删除**（阶段二尾巴）→ snap-model §7。
- **面内共轴的洞环/带洞面 pp 单测补**（generic 路径未单测）→ pushpull-grill-sheet §3。
- **数值输入 VCB**；**group/sticky 隔离域**；**贴图纪元**（膜血缘消费者）；**B–O**；**增量局部 face-finding**；
  **undo 快照环**；**局部性接缝**（findRegions.bounds）——远期，各自 doc 有钉。
- **improve-codebase-architecture 轮**：排 0.3 壳纪元开工时（user 2026-09-02 提议；证据=偏置三抄两翻车、
  lab main 体积；kernel/solver=保的深模块，壳层随 0.3 重建一并理顺）。
