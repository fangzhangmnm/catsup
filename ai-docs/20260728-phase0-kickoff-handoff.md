# CatsUp Phase 0 启动 handoff — 无壳内核库

> as-of 2026-07-28（创建日）· 由 WebPaint v0.7 方向讨论 session 产出
> 读者：在 CatsUp 开工的下一个 session（假设你没读过任何前情）。
> 出处纪律：本文引用的用户原话全部标了来源文件+行号；标「AI 建议」的段落是 2026-07-28 会话里 AI 的回应，用户认可与否以他后续的 journal/聊天为准，不许当既定规则引用。

## 0. 一句话

CatsUp = SketchUp 的开源 PWA 平替（「SketchUp - $ + 🙀」）。**MVP = SketchUp clone，proposal「我会加的东西」整节（CatsUp 同名操作/PickUp/Wire/关卡编辑/地形/Tomato…）全是花**——用户原话：「这些添头都是 free QoL ergonomics……不可本末倒置……Skechup Clone 才是 serious load bearing」（`journals/20260627 CatsUp proposal.md` L80）。

**Phase 0 = 纯 TS 几何内核库 + golden 测试 + canvas playground。没有 PWA shell、没有 store、没有 SW、没有 save/load、没有 group/component 层级、UI 铅笔橡皮级别就够**（用户 2026-07-28 拍板，见 WebPaint `journal/20260728 v0.7 vs CatsUp.md` L19）。

## 1. 必读源（按序）

1. `journals/20260627 SketchUp drill.md`（52KB）——几何内核 spec 本体。重点：五公理（L147-181）、face-finding 管线（L225 起）、膜生命周期事件表（L405-421）、四条 MVP 验收（L79-82）、术语排雷（L269）。
2. `journals/20260627 CatsUp proposal.md`——图景/动机/SU 工具测绘。「我会加的东西」节 = 花，Phase 0 禁碰。
3. 本文件。

⚠ `journals/` 是纯人类区（家族硬规则 #2）：AI 永不写、不删、不整理。spec 住在人类区是特例事实，读它、引它，别动它。

## 2. 已想透的（不要重新发明）

- **几何核定义**（drill L181 原话）：「planar-restricted 的非流形 radial-edge B-rep（Weiler 1986/1988 谱系），保留 radial cycle 与 wire-edge 的全部连接性一般性，砍掉曲面几何与可选的 region/shell 重层；在其上施加五条公理——平面性、非流形连接、重合即同一、面涌现自维护、急切无历史——其中第 3、4 条的触发遵循『合并/切割急切、反向溶解保守』的不对称律。」
- **face-finding 确定性管线**：coplanarity 分组 → 交点切边（Bentley–Ottmann）→ 顶点处 wedge 角排序 → 最紧转弯 trace（CCW=内部面，CW=外壳弃）→ 嵌套判断挂洞。dividing 和 healing 是同一引擎在加边/删边两种触发下的局部重跑，不是两套代码。
- **膜生命周期状态机**（drill L405-421）——**人类在真 SketchUp 上实机做实验、证伪了 AI 两版假说之后逼出来的，不可再生输入，当公理用**：face 是存储态不是派生量；7 事件 BIRTH / MERGE / ABSORB / BURST / AUTOFOLD-SPLIT / STRETCH / DEDUP-MERGE；erase 按被擦边的 loop 身份裁决（两面共享→MERGE、内环→ABSORB、外环对 void→BURST、无面→只删边）。统一律四句（L421）：**「诞生靠手势、move 守恒、erase 看 loop 身份、sticky 兜底」**。
- **术语排雷**（drill L269）：要的是「提取平面细分的所有有界面」，**不是** minimum-weight cycle basis——「别去追……会把你带沟里」。参考口径：Eberly《Constructing a Cycle Basis for a Planar Graph》（操作上抽的就是有界面）、npm `min-cycles`、wedge/next-edge 半边遍历。
- SU 的 eager 是**局部的**（2D 曲面层）；内部面湮灭/布尔/水密是 lazy 的（归 Solid Tools）。别把 eager 公理扩大化。
- orientation 传播是 SU 自己没解干净的脏地带（用户注明可以主动做得更好，不是忠实复刻对象）。

## 3. 已知未解（Phase 0 的真未知）

- **增量局部 face-finding**——drill 点名「工程上最难、也最值得投入」「SU 流畅手感的真正来源」。只有方向，无方案。
- **coplanarity 容差**——「头号 UX 旋钮」，触控场景。M3 才碰。
- **两个暗礁**（drill 末尾待实机验）：① 嵌套洞（回字三层填-空-填）ABSORB 与 BURST 会不会打架；② push/pull 非流形撞合时膜归属是 BURST+BIRTH 还是 DEDUP-MERGE。→ 都要变成 golden test 场景。
- polygon generation（导出三角化、锐角长 fan 问题）——Phase 0 不碰，挂账。
- **inference engine**：用户称之为「真正的称重」「35% 的护城河」（drill L191/L450）。当前停在收集阶段（L454：「先收集键鼠和 ipad 版的 su 的 inference 操作。以及手势操作」）。**用户 2026-07-28 明确：这个勘探必须在 vibe coding 状态里边做边收集，不是独立的案头作业**——所以 playground 从第一天就要存在（见 §6）。

## 4. MVP 验收标准（drill L79-82 原文，Phase 0 承接①②）

1. 数据结构必须承载「Line/Rect/Circle 落下的是 edge，face 是闭环涌现物」。**验收：Rectangle 工具实现里不出现 `new Face()`，只有 `new Edge()`×4 + 触发 face-finding。**
2. autoheal 必须 eager：dividing、push/pull 的 split/merge、autofold。**验收：三者都无「确认/应用」步骤，落手即生效；dissolve-collinear 默认不触发**（不对称律）。
3. inference 是所有 B/C 类动词的**输入前置层**，不是某工具内部特性。（后续 phase，但内核 API 设计时给它留门。）
4. component = instancing 非 copy，数据形状直接 = ECS entity。（后续 phase；Phase 0 无 hierarchy。）

## 5. 仓库纪律【AI 建议节，2026-07-28】

> 用户已拍板的只有：Phase 0 无壳、验证期无 save/load/hierarchy、UX 勘探走 vibe coding。以下结构与 purge 政策是 AI 对用户「可丢试错子树 vs 打回即 purge」之问的回应，待他用行动确认或推翻。

```
20260627 CatsUp/
  journals/        # 人类区（已存在，勿动）
  docs/            # AI notebook：本 handoff、findings、以后 ADR
  src/kernel/      # 平面图 + face-finding + 膜事件。纯数据结构，零 DOM 零 IO——可 embed 是品类契约
  src/playground/  # 薄 canvas 壳，day-1 就有（vibe 载体 + 调试可视化）
  test/            # golden corpus：膜事件表逐行场景化 + 两暗礁。这是不动产
  experiments/     # 可丢区（见下）
```

- **不动产 = spec + golden tests；耗材 = kernel src。** 设计被打回 = src 整体 purge、greenfield 重写，行为由 golden tests 钉住。这是家族「严禁念旧」原则的执行机制：敢整删的前提是行为被测试钉死，不是靠留旧代码。
- **`experiments/` 规则**：日期前缀子目录（`20260728-xxx/`）；write-only——`src/`、`test/` 永不 import 它；每个实验死前必须把结论沉淀成 `docs/` 一篇带日期戳的 findings，然后整目录可删。用途 = 装不进断言的问题（渲染选型、perf 探针、手感对比），**不是主线的家**——drill 已把设计风险卸掉大半，day 1 直接在 `src/kernel` 动工。
- 家族约定即使无壳也适用：全 TS、vendor 一切无 CDN、node test runner、版本从 0.0.x 起、图标走共享库（`20260708 SVG Icons` 已备好 push-pull/follow-me/offset/scale/walking/move）、无系统 alert/prompt/confirm。
- **渲染选型（three.js 与否）推迟到 M3 入口再拍**。M1-M2 单平面正交视图，2D canvas 足够。材料里从未拍板过 three.js；RealHome 有 vendored three.js 可作家族先例，届时再议。

## 6. 里程碑

- **M0 bootstrap**：`git init`（目录现在连 .git 都没有）+ 上述目录骨架 + node test runner 跑通一个空测试 + playground 空页面能开。半天内完。
- **M1 单平面内核 + playground 同步长**：vertex/edge 平面图 → 交点切边 → face-finding（wedge trace + 嵌套挂洞）→ 膜 7 事件。golden tests 逐行覆盖事件表「你的实验来源」列（日字两填、annulus 擦洞边、回字内填外空、stuck cube…）+ 暗礁①。playground 实时画出图/膜/事件日志——**vibe 与严谨同源：测试钉行为，画布给手感**。
- **M2 工具动词**：Line / Rect / Erase / Select / Move（含 STRETCH 与 autofold 的平面内退化版）。验收标准 ①② 在此闭环。**人类 inference 勘探从这里进入 vibe 态**：snap endpoint/midpoint/on-edge/axis 的平面版就是第一批标本，做着做着记到 journals（人类自己记）。
- **M3 升维**：多平面 + coplanarity 分组 + 容差旋钮 + 相机。渲染选型在此拍板。
- **M4 push/pull + autofold 3D 版 + 暗礁②**。
- inference engine 系统化 = 下一个纪元，不在 Phase 0。

## 7. 与 WebPaint 0.7 的关系

- kernel 零依赖、可 embed 是早已写下的品类契约（WebPaint `journal/ARCHIVE/20260604 WP feedback arch.md` L1415-1420：embeddable WebPaint、「我非常希望我的 catsup 3d建模软件，里面能支持2d贴图绘制和3d贴图绘制」；L1707：workpiece/undo 框架「以后我做catsup 3d建模软件时，可以直接用这个框架，只是加了一个数据类型罢了」）。
- 但 **Phase 0 不共享任何 WebPaint 代码**——不要为了「复用 workpiece 框架」提前引入依赖；那是长成 app 那天的事，届时走 `create-pwa-project` 出生，而 WebPaint 0.7（settings 脱 store / gallery 共享化 / sheet 系统）应已把产房打扫干净。
- 防 divergence 的机制就是无壳：没有 shell 就没有可分叉的 shell。
