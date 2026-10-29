# 编辑器专用语义清单 —— 画面上哪些东西是「编辑器的」，游戏引擎要不要，风格怎么认领

> as-of v0.17.16 / 2026-10-29 · created 2026-10-29 by Claude Fable 5.1（user 同晚「你现在是fable了，帮一下opus，系统的理一下编辑器specific的东西都有哪些」）
> 起因：Tron 账本 T55–T63 / 周账 F-137 ⑥⑦——user「让fable想 编辑器 specific（就是游戏引擎可能不要（但是建造游戏要）的语义，比如选择，gizmos，轴，这个怎么数据驱动的接。opus是不是开始自己越狱写了一套仿造的渲染器overlay了」「记账让fable把这条规则变成架构级别的设计」「比如蓝图的透边也一样，都接上」。
> 本文 = **清单 + 分档 + 认领表的设计草稿**；讨论稿，没动码（讨论 ≠ 授权）。代码现状以 `src/editor/overlay*.ts` / `highlight.ts` / `view-state.ts` / `src/minccino/overlay/index.ts` / `backend/three/render3.ts` 为准。

## 0. 判据

「编辑器专用」= **纯看 / 纯玩的游戏引擎不需要、编辑器（和建造类游戏）才需要的画面语义**。分四档：

| 档 | 含义 | 游戏引擎（纯玩）| 建造类游戏 | CatsUp 编辑器 |
|---|---|---|---|---|
| **A** | 任何有玩家的世界都要（不是编辑器专用，只是现在恰好从编辑器那边喂进来） | 要 | 要 | 要 |
| **B** | 建造类游戏要 | 不要 | 要 | 要 |
| **C** | 只有编辑器（CAD / 建模）要 | 不要 | 不要 | 要 |
| **D** | **过渡期私货**：编辑器语义烤在内容流 / 后端里，不走叠加层契约——是要退役或改成显式字段的 | — | — | — |

风格能不能认领（T58「只有写实的才有叠加层；像素 / 风格化的大多得自己接」）另列一栏：**叠** = 按原分辨率叠在画面上（写实一路的默认）；**认** = 风格自己画（进小图 / 换颜色 / 进辉光 / 不画）。

## 1. 清单

### 1.1 叠加层（`FrameInput.overlay` 回调吐出来的 item；`src/editor/overlay-lines.ts` / `overlay.ts` / `highlight.ts`）

| # | 东西 | 现在的形状（kind / style id） | 档 | 像素 / Tron 里怎么画（Opus 已猜 T55，待 user 拍） |
|---|---|---|---|---|
| 1 | 选中 / 悬停的**面**（和面同一组三角、同槽同材质画在后面 = 换颜色） | faces `sel:<slot>` / `selWorld` / `selTex*` | B | 认：Tron = Clu 橙（T56）进辉光；像素 = 进小图一起像素化 |
| 2 | 选中 / 刮擦 / 悬停 / 检查的**边** | lines `edge`（shared = 后端边线材质） | B | 认：同上 |
| 3 | 选中的**点** | points `selVert` | C | 认：同上 |
| 4 | 全部顶点小点（自由建模） | points `vert` | C | 认：像素 = 进小图；Tron = 待猜 |
| 5 | X 光面点（画 + 点得到背后的面） | points `faceDot` | C | 跟 X 光开关走（§1.4 #31） |
| 6 | 镜像中缝上的点 | points `seam` | C | 认 |
| 7 | 平滑边（折 / 软边的显示标记） | lines `soft` | C | 认（像素里 = 「编辑中的东西显示网格」T60 的一部分） |
| 8 | 充能标记（点 = 小菱形、边 = 淡延长线） | lines `charged` | C | 叠 |
| 9 | 断口小垂线 + 轴刻度（「1 m」那格） | lines `tick` | C | 叠 |
| 10 | 量角器 | lines `protractor` | C | 叠（手里的工具要准） |
| 11 | 参考几何：线 / 点 / 圆 / 球 + 选中态 | lines `guide` | C | 叠 |
| 12 | 卷尺预演 | lines `tape` | C | 叠 |
| 13 | 刀线 | lines `knife` | C | 叠 |
| 14 | 吸附提示线 + 吸附小球 | lines `hint` + marker `snap` | B | 叠 |
| 15 | 平面 gizmo（镜像面：描边 / 法线箭头 / 把手 + 半透明方块） | lines `gizmo` + tris `gizmoQuad` | C | 叠 |
| 16 | 变换 gizmo（三箭杆 + 三环 + 锥 / 块 / 片） | lines `xg` + markers `xgCone` / `xgCube` / `xgCenter` / `xgPlane` | B | 叠 |
| 17 | 缩放柄（14 个小方块） | marker `handle` | C | 叠 |
| 18 | 三轴：选中组件原点 / 空组件常驻 / 组件原点（淡） | lines `poolAxes` / `emptyAxes` / `originAxes` | C | 认：像素 / Tron 进小图（T55「轴线应该渲染器接」） |
| 19 | 锁轴线（Blender 式无限长线） | lines `lock` | B | 认：同上 |
| 20 | 文字标签（挂在 3D 点、固定屏幕大小；以后猫娘举牌子） | label `scale` | **A** | 叠 |
| 21 | teleport 弧 + 落点环 | lines `arc` + marker `landing` | **A** | 叠 |
| 22 | 放置的胶囊虚影 | lines `capsule` | **A** | 叠 |

层次注：#20–22 是**玩家侧**的东西（`src/player/`），现在经 `editor.viewExtras` 混进 ViewState 再进叠加层——语义上它们不属于编辑器；游戏引擎单独用时，玩家侧自己当叠加层的提供者就行（契约不用变，只是谁来吐）。

### 1.2 一帧输入的其他字段（`FrameInput`）

| # | 东西 | 现在的形状 | 档 | 风格 |
|---|---|---|---|---|
| 23 | **地面网格 + 三色轴**（跟上下文的坐标架 + 格距；显示不细分） | `FrameInput.grid = { frame, step }` → 后端 `rebuildGrid`（shader 平面 + 轴线，住叠加层那一层） | B | 认：Tron 的地格接住它（T57）、编辑器那张正片叠底的在 Tron 里不画；像素 = 待猜 |
| 24 | XR 走路时的近平面 | `FrameInput.near` | A | — |

### 1.3 烤在内容流里的编辑器语义（**D 档私货**，`Placement` / `ChunkStyle`；T52 说的「苗头」就在这里）

| # | 东西 | 现在的形状 | 本质 | 该变成 |
|---|---|---|---|---|
| 25 | **活动池**（正在编辑的那一层赢共面：深度阶梯 面 6 vs 别的池 9） | `Placement.active` → render3 按它挑材质 | C | 帧级显式字段：`FrameInput.edit.activeSlots`；T60「像素里正在编辑的东西显示网格」就按它分 |
| 26 | **上下文之外淡出**（faceDim / edgeDim 烤进 `aColorDim`，提供者按 `dimSlots` 挑属性） | `Placement.dim` + `ChunkStyle.faceColor(mat, dim)` / `edgeColor(loose, dim)` | C | 帧级字段 `FrameInput.edit.dimSlots` + 风格说怎么淡（材质模块落地后由材质 / 调色板做，不烤顶点色） |
| 27 | 单面身体（两个表面 DT8，剔背面） | `Placement.singleSided` | **A（内容，不是编辑器）** | 留 |
| 28 | loose 边 / 面边的颜色 | `ChunkStyle.edgeColor(loose, …)` | A（SU 线稿语义 = 内容的画法，风格定） | 材质模块 / 调色板 |
| 29 | 粗线稿 / 像素线 | `ChunkStyle.thick()` ← 视图菜单 `setLineStyle` | 视图设定（不是编辑器专用） | 并进风格 / 视图偏好 |
| 30 | 线稿（边）本身 | `preset.material.edges` | 内容的画法（像素描边关掉它） | 已是风格字段 |

### 1.4 视图开关（后端 setter）

| # | 东西 | 现在的形状 | 档 | 风格 |
|---|---|---|---|---|
| 31 | **X 光**（被挡住的边透出来 + 面点可点） | `setXray` → frame graph `xray` pass；render3 里 Tron 借 X 光那两个节点画它自己的淡青隐线（`xr = (xrayPass || !!tron)`） | B | **一律跟 X 光开关走**（T60 / T63）：写实一路 = 现在的 X 光线；Tron = 淡青实线；蓝图 = 实验室 0.38 虚线；X 光关 = 都不画。= 风格对「X 光」这个语义的画法，不是风格自带的常开效果 |
| 32 | 缩略图截图 | `capturing` → 现在强制白模 | C（图库） | T59：用当前风格（XR 照旧白模） |

### 1.5 交互侧（不画，但依赖画面几何；风格弯了屏幕它们要跟着弯）

| # | 东西 | 现在的形状 | 档 | 注 |
|---|---|---|---|---|
| 33 | 拾取（屏幕空间、围着相机转、不用 three） | `src/editor/pick.ts` / `solver.ts` | B | CRT 曲面 / 像素化之后：屏幕点 → 世界射线要先过风格的正变换（viewport 笔记 §2.6 + 鼠标逆变换，T47）；建造类游戏一样要 |
| 34 | 手势坐标 `local(ev)` | `src/app/gestures.ts` | A | 同上，一处过逆变换 |
| 35 | **XR 控制器射线 + 光标球** | render3 **私自**画（three Line + 球，硬编码蓝 0x2b6cb0，不走契约） | A（玩家侧） | 另一个「后端私下画编辑器 / 玩家的东西」的苗头：该变成玩家吐的叠加层 item（role = pointer） |
| 36 | rig / grip（XR 三层模型的中间层） | render3 `rig` | A | 引擎内部，留 |

## 2. 分档小结（= 「可拔」的边界）

- **纯玩的游戏引擎**只要 A：文字标签、teleport 弧 / 落点环、胶囊虚影、近平面、控制器指针、单面身体。叠加层回调不给 = 没有（契约已如此），**引擎里零编辑器 import**（守卫 ③′ 已清零）。
- **建造类游戏**加 B：选中的面 / 边、吸附提示 + 小球、变换 gizmo、锁轴线、地面网格、X 光。
- **编辑器**再加 C：其余全部（点、尺规、量角器、参考几何、刀线、柄、三轴、镜像中缝、软边、充能、断口刻度、缩略图）。
- **D 档**（活动池 / 淡出烤在流里）是真正的越狱残留：编辑器语义藏在内容流的旗子里，后端按它挑材质——风格要认领「正在编辑的东西」（T60）时没有干净的钩子，只能在 render3 里 if。

## 3. 认领表怎么数据驱动（设计草稿，给 user grill）

目标（user）：「只有写实的才有叠加层；像素 / 风格化的大多得自己接；避免每个风格自己造轮子；体重随风格数的增长要平」。

1. **item 带语义，不只带画法。** 现在 `style: "lock" | "xg" | "edge" …` 其实已经是语义词（它说的是「这是什么」），只是和画法参数表 `LINE_STYLES` 绑死。改法：把这个字段读作 **role**（开放集：`selection.face / selection.edge / selection.vert / hover / snap / gizmo / handle / axes / lock / grid / guide / measure / knife / vert / xray.dot / seam / soft / charged / tick / label / locomotion / ghost / pointer`），`LINE_STYLES` 等表变成 **写实一路的默认画法（role → 参数）**。编辑器 / 玩家只说 role；没有风格认领时就按默认画法叠在上面——现状一个像素不变。
2. **风格的认领 = 预设里一张表**，不是代码：
   ```
   preset.overlay = {
     default: "standard",                       // 没点名的 role 都按默认画法叠在上面（写实一路）
     claims: {
       "selection.*": { pass: "styled", color: "clu" },   // Tron：选中进小图 + 辉光、用另一派的颜色
       "axes": { pass: "styled" }, "lock": { pass: "styled" },
       "grid": { pass: "own" },                 // Tron：地格由风格自己的地面 shader 画（读同一份 frame + step）
       "vert": { pass: "styled" },              // 像素：顶点点进小图
     },
   }
   ```
   `pass` 三个值：`standard`（原分辨率叠上面）/ `styled`（同一批 item、同一套画具，画进风格的小图，和画面一起像素化 / 辉光）/ `own`（风格自己的 pass 读同一份数据来画，标准的那份不画）/ `skip`（不画）。颜色只能换**调色板槽位**（`color: "clu"` = 风格调色板里的一个名字），不能塞十六进制——不变量 7「风格可认领选中色」的落地。
3. **分派在 frame graph 里做，不在后端。** `presetPasses(preset, …)` 按认领表把 item 按 role 分进两桶（原分辨率 overlay pass / 风格小图里的 styled-overlay pass），后端的三个画具（lines / marks / faces drawer）**不改**，只是多一个「画到哪个目标、用哪个调色板」的参数。像素风里「选中的边进小图」= 换目标，不是新画具。
4. **D 档私货改成帧级显式字段：** `FrameInput.edit = { activeSlots, dimSlots, xray }`。风格声明三件事：`activeEdges: "mesh" | "lineart" | "none"`（T60 像素 = 正在编辑的东西显示网格）、`hiddenEdges: "follow-xray" | "never"`（T60 / T63：Tron、蓝图的透边跟 X 光；写实一路 = 现在的 X 光 pass）、`dim: "fade" | "none"`。活动池深度阶梯留在后端（那是正确性，不是风格）。
5. **体重：** 一个新风格 = 预设里几行表 + 自己的着色器；认领表的分派代码写一次（估 30–50 行 frame graph + 后端画具加一个目标参数），**不随风格数增长**。Opus 量的「每种新画法 +300 行」是画法本身（着色器）的重量，认领表不加这一项。
6. **苗头清掉：** 账本 T62 列的四处——Tron 借 X 光节点画隐线 → 变成 `hiddenEdges: "follow-xray"`；`SlotNodes.selMat` 按风格分支 → 变成 `selection.face` 的认领；syncPools 里按风格 if → 材质模块的槽；叠加层固定层 5 两遍画 → 变成按桶画。控制器指针（#35）也从 render3 搬成玩家吐的 item。

## 4. 待 user 拍（一次列齐；下面是 Fable 的猜）

| 问 | 猜 | 选了会怎样 / 不选会错过 |
|---|---|---|
| ① 像素 / Tron 里**哪些东西必须保持原分辨率**（「手里的工具要准」） | 吸附小球 / 提示线、参考几何、尺规、量角器、刀线、gizmo、柄、文字 = 原分辨率；选中、三轴、锁轴线、顶点点、网格 = 进风格 | 全进风格 = 风格统一但 1 像素的吸附球在 4 倍像素里糊成一坨；全不进 = 和 T55 相反 |
| ② **建造类游戏**那档的名单对不对：选中 + 吸附 + 变换 gizmo + 锁轴线 + 地面网格 + X 光 | 对 | 名单定了 = 认领表的 role 词表就定了（游戏那边只认这些词） |
| ③ 「跟 X 光走」= **X 光关的时候 Tron / 蓝图完全不画隐线**（现在 Tron 常开 0.12 淡线） | 是（T63 原话「都接上」） | 是 = Tron 平时干净、按 X 开关看透；否 = 隐线是 Tron 自带效果，X 光只管加亮 |
| ④ 玩家侧的东西（teleport 弧 / 胶囊 / 控制器指针）**从 ViewState 里搬出去**、玩家自己当叠加层提供者 | 做（小改，顺手） | 做 = 游戏引擎的边界干净；不做 = 继续混在编辑器状态里，拔的时候要拆 |
