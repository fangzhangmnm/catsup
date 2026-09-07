# CatsUp 待办总账 —— 一条 = 一个新 agent 能独立吃下的活

> as-of v0.3.10 / 2026-09-07（第五批：平面黏性回归修 + 细面推拉修 + 视图名带方位 + A12 地面与方向传达立项）· created by Claude Fable 5.1
> user 原话（2026-09-06）：「你尽量保证那些我没看的没拍的和马上要做的都有记录，这样的话我也可以开新 agent，一个一个做，不用怕 fomo，而不是现在这样一次得处理一大堆很要紧的不处理会慢慢腐烂的东西」。
> **用法**：开新 agent 时把「本文件路径 + 条目编号」丢给它；它先读 `CLAUDE.md` 必读清单再读该条。做完把状态改成 `done <commit>` 并写一行结果；新冒出来的事**只加到这里**，不在聊天里散养。
> **状态词**：`待做`（已拍板可开工）/ `待拍板`（要 user 一句话）/ `待看`（要 user 过目）/ `等 user 数据`（要 user 复现/实验）/ `park`（明确不做或以后）/ `done`。

---

## A. 马上要做（user 已拍板）

### A1 正经 undo：kernel 原语变更日志统一「扰动相回滚」与「撤销/重做」 — `待做`（user：「很想马上要，先忍耐到下一个 session」）
- **现状**：`src/editor/journal.ts` = op 日志重放（每次 undo 从空内核重放全部 op）；拖拽预演 = `checkpoint.clone()` + apply（`Editor.computeLive`）。user 不喜欢副本语义：「你此时看到的就是 SSoT」「工具之前更像是 backup or reference checkpoint」「应该有正经的 undo，而不是之前那个 replay」。
- **提案**（本日对话，未 grill）：kernel 在十来个原语（`topology.ts` ensureVertex/addEdge/removeEdge/splitEdge/relocateVertex/replaceEdgeWithChain + `face-lifecycle.ts` 膜生死/改名 + `planes.ts` 注册）自动记 delta 与逆 delta；`kernel.begin() → tx`，`tx.rollback()` / `tx.commit() → HistoryEntry{undo,redo}`；扰动相 = 每帧 rollback + apply（不再 clone）；undo = 逆 delta。动词零手写逆元（与 WeebPaint ADR-0008「令牌 + collector、否掉手写 forward/backward」同精神）。
- **本体论翻转**同做：只有一个 `world`（可变，人人读它），`checkpoint = world.snapshot()` 只做回滚参考；`Editor.liveWorld()` 开关与 build.sh 的 ghost-world lint 随之退役。
- **红线**：动 `src/kernel/` = 改核心必回写立宪页 `ai-docs/20260902-kernel-constitution.md`「时间结构」节；开工前 grill 两点：①undo 时膜事件（BIRTH/BURST…）不重放（事件是叙事不是状态）②`planes.ts` τ 合并在回滚后是否精确可逆。
- **验收**：全部 golden 不变；`test/preview.test.ts`「预览事件=提交事件逐字」仍绿；新增 undo 往返 golden（每个动词 do→undo→redo 状态逐字一致）；`scripts/probe-boot.mjs` 撤销回 1 面。

### A2 分层重构① `ViewProjection` 接口 — `待做`（user：「开做」）
- **做什么**：把 solver/pick/editor 对 `OrbitCamera` 类的依赖改成接口 `ViewProjection { worldToScreen; screenRay; viewDirAt; forward }`（就这四个，见 `src/editor/solver.ts` / `pick.ts` 的用法）；`OrbitCamera implements ViewProjection`。VR 将来用「控制器射线 + 射线周围角度空间当 800px 高虚拟屏」实现同一接口。
- **不动**：ε 语义（已是视口高度分数 ≡ 角度分数，`solver.epsScale`）、求解器数学、任何测试数值。
- **验收**：`npm test` 数值零变化；`tsc` 绿；`ai-docs/20260901-snap-model.md` §7 加一句接口名。

### A3 分层重构② 动词注册表（含 `mode` 维度） — `待做`（user：「看起来不错」「开做」）
- **做什么**：`src/editor/editor.ts` 里按工具 switch 的 down/move/up 拆成 `src/editor/verbs/{select,line,rect,move,pushpull,erase,eraseFace}.ts`，每个动词 = `{ id, down, move, up, cancel }` 四函数 + 自己的瞬态；共享上下文 = world/checkpoint、`align(query)`、charged 源、磁滞、预演（computeLive）、`commit(op)`、hint/tip。注册表按 `mode` 分组（`draft` 制图 = 现有六件；`organic` 有机建模留空槽——user 预告「两种模式共存，像 Blender 按 Tab 进不同对象的编辑模式」）。
- **红线**：语义一字不动（点两下/充能制/磁滞/WYSIWYG 预演/pp 双通道/连画出膜停）；`Editor.lineSecondSnap`（含点膜）与 `rectPlaneSnap` 保持；**每个动词构造 AlignQuery 时必须表态 hand（类型已必填）**——注册表接口把 `hand()` 做成动词的必实现方法，别让它回到可选。
- **验收**：`scripts/probe-boot.mjs`、`$CLAUDE_JOB_DIR` 里那三个合成探针（hover / pen / touch，脚本在 `ai-docs/20260906-app-shell-epoch-landing.md` 提到的路径已丢，需重写进 `test/probes/`）全绿；体重：editor.ts 应缩到 ~300 行。

### A4 分层重构③ `RenderEngine` 切口（输入 = bake） — `待做`（user：「学 blender 做 workbench 之类的渲染引擎，切口在引擎这里」「不要抽象 three」）
- **做什么**：接口 `RenderEngine { resize(vp,dpr); render(scene: RenderScene) }`，`RenderScene` = bake 形状（面：世界坐标三角/环 + 平面 + 颜色；边：线段 + 颜色；标记球；提示线；相机参数），**不是 Kernel**。`Editor` 由构造注入引擎，不再 import `render3.ts`（three 随之不进 editor）；`WorkbenchEngine` = 现 `render3.ts` 改名，仍用 three。以后 PBR/GI 是第二台引擎。
- **顺带**：这份 bake 将来就是 zip 容器里那个 glb 的内容（E1），定义时别塞编辑态。
- **验收**：截图对比（`scripts/probe-boot.mjs` 出的 probe-2-box.png 与改前肉眼一致）；build.sh 的「three 只在 render3」lint 改成「three 只在 `src/editor/engines/`」。

### A5 抽包 `@internal/workbench-elements` — `待做`（user：「也是近期要做的」；「第二个用户第三个用户才长抽象，所以你来更适合」）
- **做什么**：新兄弟目录 `20260906 internal-workbench-elements`，按 `@internal/store` 先例（tgz 走 vendor-pkgs + pull-package.sh，测试期版本钉 0.0.0）。源 = WeebPaint `src/ui/{popup-menu,anchored-popup,notice,icon}.ts` **WET 拷、不改语义**，签名以 WeebPaint `api/src/ui/*.d.ts`（v0.13.15）为准；anchored-popup 的「顶栏下缘」改 mount 时注入的 getter；sprite 归宿主，包只拼 `<use>`；CSS 进包，`--z-*`/`--ink` 等 token 由宿主 `:root` 提供。
- **收货**：CatsUp 侧 `src/app/ui/` 三件替身删掉换 import；WeebPaint 侧由其 session 收货（它会跑 `tools/probes/{context-toolbar,verb-toolbar,pick-once}.mjs` 回归）。包仓测试要覆盖「anchored-popup 钳视口 + 顶栏下缘 getter」。
- **不许**：叫 `ui`（scope bleeding 教训）。

### A6 ε 基准值真机调参 — `待看`（user 刷新后反馈；本日已改成视口高度分数）
- 常量在 `src/editor/solver.ts` `EPS`（点 10/边 7/线 5/合成 12 @ 800px 高）与 `editor.ts` `SNAP=8/HIT=6`。嫌小 → 整体乘一个系数；透视视场角 `OrbitCamera.fovY` 现 50°（SU 默认 35°），是否换 = B4。

### A7 Select 工具：点击族 + Ctrl+A / Delete — `待做`（user 2026-09-06「同意，然后手势可以看一下weebpaint的坑」）
- **口径（SU）**：单击=该实体；双击膜=膜+其环边、双击边=边+其邻膜；三击=整个连通体；Shift=切换加减、Ctrl=加、Shift+Ctrl=减；框选左→右=全含、右→左=相交；Ctrl+A 全选；Delete 删选中（走 erase 语义：边随葬律/删膜边留）。多击是**单击的超集** → 第一击立刻选、第二击升级、第三击再升级，不需要等超时（无延迟）。
- **触屏**：pen 双 tap / 三 tap 计时（手指 tap 已占相机/撤销）。**必读 WeebPaint 的坑**：`../20260524 WeebPaint/ai-docs/20260530-ipad-doubletap-architecture.md`（iPad 双击被系统手势劫持 → 四层防御：body 级 touch-action / pointercancel 全清 / 自定义 doubletap 事件）+ 本仓 `ai-docs/20260906-app-shell-epoch-landing.md` 多指 tap 四坑（tap 位移阈 / 时间阈 / 手掌门 / 见过 pen 后手指永久=相机）。
- **验收**：合成探针（pen 单/双/三 tap 的选中集）进 `test/probes/`；`npm test` 选中集 golden。

### A8 SU 轮廓线加粗（Profiles） — `待做`（user 2026-09-06「su里面有些边会加粗，有些边不会，这个也需要做一下」）
- **定义（SU Style › Edges › Profiles）**：一条边是轮廓线 ⟺ 它只挂 ≤1 张膜（裸边/散线），**或**两侧膜相对视线朝向相反（一正一背 = 剪影）。其余边细线。随相机每帧重算，O(E)。
- **实现形状**：`render3.ts`（将来 A4 的 WorkbenchEngine）把边分两组 `LineSegments2`（细 1px / 粗 ≈2–3 CSS px，DPR 无关），相机变才重建分组；polygonOffset 沿用。SU 默认 Profiles 宽 2、Edges 宽 1；Depth cue / Extension / Endpoints 不做。
- **验收**：`scripts/probe-boot.mjs` 截图肉眼：盒子外轮廓粗、内部棱细；透视旋转后剪影边随之换粗。

### A9 Move/Line/Rect 轴锁·面锁（键盘） — `待做`（user 2026-09-06「axis align 键盘两套都收。然后 shift arrow 能不能是 blender 的 shift x 语义？」→ 能）
- **键位**：SU 方向键 ←绿(Y) →红(X) ↑蓝(Z) ↓平行/垂直于推断边；Blender 字母 X/Y/Z 同义。**Shift+方向键 / Shift+字母 = Blender Shift+X 语义 = 锁到「排除该轴」的平面**（Shift+← = XZ 面、Shift+→ = YZ 面、Shift+↑ = XY 地面、Shift+↓ = 推断膜的面）。Shift 单独按住 = SU「锁住当前推断」（含悬在膜上=面锁），松开即放。方向键/字母锁是**切换**（再按同键或 Esc 或手势结束解锁）；SU 里 Shift+方向键无绑定，不冲突。
- **实现形状**：锁 = 求解器查询的附加约束（1-D 轴线 / 2-D 平面，rank 最高，其余目标只在锁的轨迹上参赛=SU 同款「锁后仍可吸到轨迹上的点」）；HUD 状态栏显示当前锁。触屏 HUD 锁片见 B9。

### A11 拖拽显示尺寸 — `done v0.3.3`（user 2026-09-07「推拉矩形的时候要显示长度」）：推拉已显示 h；矩形显示 `矩形 W × H`、画线显示 `长 L`，都走 `fmtLen`（~ 标记）。将来单位化后同一处换单位。

### A12 地面与方向传达：北字 + 前三角 + 1 m 尺度 + 自适应网格 — `待做`（user 2026-09-07 拍板；网格自适应细节待一句话）
- **北**：+Y 轴远端一个大而淡的「北」（随距离淡出；DOM 覆盖层按相机投影定位，不进 three、字体走 UI 系统字）；**−Y 远端一个淡的平放三角箭头指向 −Y**（地面上的三角 mesh，进 render3）= 物体的「前」朝这边。不写东西南（user 只点了北与前）。
- **1 m 尺度**（user：「还需要传达一下 1m 哦」「比例尺赞！！！但是对于非正交投影，比例尺有用？」）：**正交 = 真尺子**（`├── 1 m ──┤` 随 zoom 换档）；**透视 = 只在 target 深度成立**（相机模型本来就把 halfH 定义在 target 深度，pan/zoom 也在那里换算，所以「焦点处 1 m = 这么长」是自洽的），但离焦点远近就不准 → 透视下**改成网格图例**（文字「大格 1 m · 小格 10 cm」，不画尺长）或尺子标「@焦点」；user：「等能丢角色进去的时候这个问题会好很多」（人影 = 透视下的真尺度参照，component 纪元）。前提 = 内部单位米（A10）。
- **网格升级 = 无限 + 自适应 major/minor**（user：「以后可能画大的东西需要自适应，或者淘汰掉，或者先考虑自适应+major/minor?」→ 2026-09-07 澄清「不是淘汰是升级，主要就是变成无限网格，或者解决大场景的问题。现在的网格是写死的大小，我说淘汰的是这个」→ **要淘汰的是写死的网格尺寸**：网格随视野无限延伸/按 LOD 换档，大场景不掉队）：AI 建议 = 自适应 + 十进 major/minor（Blender 式：minor 10 cm / major 1 m，zoom 出去换 1 m / 10 m…）；**absolute grid 吸附步长 = 当前可见 minor 格（WYSIWYG，Blender 同款）**，比例尺就是在报这个步长——这条**修正**我此前「固定格距不随 LOD」的建议（有了比例尺就不怕「不知道在吸哪层」）。**user 2026-09-07 裁：网格留（「淘汰也是以后，现在很需要」）**，自适应 major/minor 照做。
- **视图菜单名字带方位**（user「同意。前视=向北看」）：前视（向北看）/ 后视（向南看）/ 左视（向东看）/ 右视（向西看）/ 顶视 / 等轴——`done v0.3.7`（camera.setView 已是 front=从南看向北）。

### A13 VR 第一公民：加 VR support（0.4 纪元候选） — `待做`（user 2026-09-07 day 1 尾巴原话，全文：「喊口号不如实际逼你一下。在今天 day 1 的尾巴，工具动词还少，ui 还少的，rotate, scale 没做，move 半残，component group 没做的时候开始干这个时期：vr 第一公民，加 VR support。以后想加什么，键鼠，触屏，vr 一起做」）
- **控制方案（user 原话）**：「vr controller scheme，请多参考 realhome，里面有我真实 gamedev 经验。不过今天不用做的太复杂。你自己判断要不要做 collision 以及 raycast」「左摇杆 wasd，按下冲刺，右摇杆变成 dpad，左右是 snap rotation，前推是 teleport，后推是 return to last teleport position」「有一个两难的问题：teleport 应该用抛物线，不然很多地面视线遮挡了描不动」「A 跳 B 蹲，noclip 时复制上下飞移动」「vr phase 2 考虑大人小孩高达视角。以及 grab based 自由缩放操纵模型模式。主要蛋疼的还是 UX 还没想清楚」「退 vr 的时候 app 应该继续用，可以随时进和退 vr」「然后 editor elements 的抽象化不是在进行中吗。看看这个怎么和 vr 适配」「sketchup 的 move 的 1001 种用法你应该比我更熟悉吧。rotate 和 scale 也是 sketchup 的 move 对齐」「以及因为是 pointer，所以很多对齐，snapping 语义都得重新想哈哈哈哈哈哈哈」「但是如果我嫌带上带下 vr 烦的话，vr 如何快速验证？」
- **参考**：RealHome `src/xrControls.js` / `docs/20260521-vr-locomotion.md` / `docs/20260629-character-controller.md`（user 真实 gamedev 经验）。
- **AI phase 1 计划（2026-09-07，待 user「没问题」；落地 = 0.4.0 VR 纪元，minor 需人类同意）**：
  1. **`src/editor/player.ts`（抄 RealHome 三层模型，flat/VR 同一路径）**：gameplay 层 `player_pos / player_rot / tracking_origin` 为 SSoT → `rig`（three Group，只在 render3/引擎内）→ camera（VR 由 XR 写、flat 我们写一次）。固定 60 Hz 步进、渲染帧插值 rig、HMD 姿态永不插值（RealHome 铁律：身体连续移动，只有 teleport/respawn 例外）。
  2. **输入帧 `InputFrame{walkX,walkZ,dash,snapStickX,teleportPush,teleportBack,jump,crouch}`** 两个来源同型：`xr-input.ts`（xr-standard gamepad：左摇杆走、按下冲刺；右摇杆 = dpad：左右 snap turn、前推 teleport、后推回上一 teleport 点；A 跳 B 蹲；noclip 时 A/B = 上下飞）+ **`flat-input.ts`（WASD/Shift 冲刺/Q E snap turn/Space 跳/Ctrl 蹲/鼠标视角）= 桌面步行/飞行相机**——同一 player 模块，**不戴头显就能验证全部移动逻辑**（user「vr 如何快速验证」答案①），顺手兑现「WASD 留给未来 fly cam」。
  3. **teleport = 抛物线**（user 两难已裁抛物线）：采样折线段逐段对内核膜做射线命中（已有 rayPlane+pointInRing），落点 = 首段命中且法向朝上的膜；`teleportBack` 回上一落点。**collision/raycast 裁决（user 授权 AI 判断）：phase 1 = noclip 默认、无墙体碰撞、只做「脚下地面感」（向下射线站在最高的朝上膜上）**——建模场景半成品居多，墙体碰撞挡的比帮的多；RealHome 的胶囊+悬挂 = phase 2 可移植（`collision.js` 235 行）。
  4. **XR 会话**：☰ 菜单「进入 VR」（`navigator.xr.isSessionSupported('immersive-vr')` 才显示），three 的 `renderer.xr`（vendored r155+ 自带，控制器模型不用 GLTF 工厂——画简单射线+光标球），`sessionend` 回 flat 且**模型/工具状态原样**（user：「退 vr 的时候 app 应该继续用，可以随时进和退 vr」）。
  5. **工具在 VR 里 = A2 `ViewProjection` 的第二个实现**：控制器射线 = `screenRay`，射线周围角度空间当 800px 高虚拟屏 = `worldToScreen`/ε，trigger = pointer down/up；对齐引擎数学零改动（snap-model §7 预留的就是这个）。phase 1 只接 线/矩形/推拉/橡皮，工具切换 = 控制器 X/Y 循环；状态行/菜单在 VR 里先不做（见 6）。
  6. **UI 元素与 VR 的适配（user 问）**：`popup-menu`/`notice` 的 API 已是数据驱动（`items()`/`onPick`、`{text,level,actions}`）——抽包 A5 时把「模型」与「DOM 渲染」分层即可，VR 端将来用 three 手腕面板消费同一份模型；**不做 DOM→纹理**。
  7. **验证三件**：① flat 步行模式（键盘）验移动/teleport/snap turn；② 桌面浏览器装 Meta「Immersive Web Emulator」扩展（dev 工具，不是运行时依赖）验 XR 会话进出与控制器映射；③ `test/`：player 模块纯函数 golden（snap turn 边沿、抛物线落点、回上一点、noclip 飞）。真机只需戴一次验会话。
  8. **phase 2（不在本轮）**：大人/小孩/高达视角（rig 缩放）、grab 缩放操纵模型、rotate/scale 动词与 SU move 对齐、VR 下吸附语义重想（pointer ≠ cursor）。
- **user 2026-09-07 第二轮裁决（改动上面计划）**：
  - 「player.ts 帮我好好模块化一个，尽量不要和别的代码混乱」→ **深模块**：`src/player/`（`player.ts` 纯状态机 `step(input, dt, world)`；`WorldQuery` 接口注入 = `groundBelow(p)` / `sweepCapsule(...)` / `arcHit(...)`，由 editor 侧用内核三角汤实现；不 import kernel/three；输入适配器 `xr-input.ts` / `flat-input.ts` 各自独立；rig 同步只在引擎内）。golden 纯函数可测。
  - **墙体碰撞进 phase 1**（user：「都有求交了，一口气把墙壁做了吧。没有墙壁反而会容易静默到奇怪的地方。wysiwyg = 反煤气灯」；原则见 E12 旁：**几何默认有碰撞，除非 override 或指定 proxy**——phase 1 全部膜参与碰撞，override/proxy 元数据留到 component 纪元）：移植 RealHome 胶囊三球 + 悬挂 + 台阶（`collision.js` 235 行）；三角汤 = 膜三角化（OBJ 导出已有 `faceTriangles`），模型小先暴力、大了再 BVH。**max slope 做**（user：「行」；RealHome 无显式 slope 限，见对话核实）。
  - **地板 = min(0, min(model z))**（user：「off map falling…地板用 min(0,min(model))」）：安全地板永远在模型最低点或 0 之下，不会掉到无限；RealHome 的 fall-too-far respawn 不需要。
  - **teleport 距离上限**：抛物线射程随手柄俯仰（45° 最远，封顶约 10 m），更远用摇杆平滑移动/noclip 飞；**反悔** = 指向天空/无落点时松手 = 取消（弧线变红），充能中后拉摇杆 = 取消，落地后后推 = 回上一点。「打自己脚底」不当取消（和小步 teleport 歧义）。
  - **相机 flat 模式**：WASD + **Q/E 上下**（user：「相机 wasd 不够，还需要 qe 上下」）+ Shift 冲刺 + Space 跳 + Ctrl 蹲 + 鼠标视角 + ←/→ snap turn。
  - **手腕面板进 phase 1**（user：「手腕菜单是 phase 1。缺了这个 vr 没法用。vr 第一公民的意思是不回 flatscreen 可以进去全 workflow（除非有些文件 io 被浏览器硬墙）」）：three 面板挂非惯用手腕，消费与桌面同一份数据驱动 UI 模型（工具 / 撤销重做 / 视图 / 退出 VR / 状态行 / 菜单项）；文字与图标经 canvas 2D 烤成纹理（UI 显示用途，非字节进出）。桌面 HUD 与手腕面板 = 同模型两渲染器（A5 抽包分层的直接受益者）。
  - **多击在 VR/触屏 = 阶段长按 + 震动**（user：「手柄的位置漂移会比放在桌面上的鼠标远…也许用阶段长按+haptics？」）：按住 0.3 s 一震=膜+环边，0.6 s 二震=连通体；桌面仍双击/三击；pen 同 VR。**不依赖右键**（user：「vr 和 stylus 都讨厌右键」）：现状右键只做环绕、零动词依赖，保持。
  - **不用物品栏模式**（user：「好不用物品栏模式」）→ A14 结案：常规建模软件组织。
- **user 2026-09-07 第三轮**（「0.4.0 优先做 vr，这不健康而且风险很大。但是这能逼出后面的每一个设计都 vr 第一公民，而且我预测我的大部分 doodle 时间都会在 vr 里面」= **0.4.0 开工许可**）：
  - **teleport 充能中的双摇杆**（user：「push right joystick 的时候可以用 left joystick 上下调整射程。left joystick 的左右比起做微调，不如调整跳过去之后面对的方向？注意这个时候 left joystick 必须是 dpad 模式，不能上下的时候误动左右。以及射程有下限。射程的调节你觉得用什么好。以及长射程还是用抛物线吗？」）→ AI 提案（待一句话）：右摇杆前推 = 充能；充能中左摇杆 **dpad 模式**（幅值 ≥0.6 + 60° 扇区判主轴，带磁滞，不串轴）：上下 = **射程档位**（离散步进 ×1.25，跨次 teleport 记忆，下限 1 m 上限约 12 m），左右 = **落地朝向**（Alyx/SteamVR 同款）；手柄俯仰只管瞄准方向不管射程（两个都控射程会打架）。**长射程仍是弧线，但弧顶封高**（非牛顿「lob」：射程只改落点，弧顶 ≤ 手上方 3 m）——弧线的唯一目的是越过遮挡看见落点，不必物理正确。
  - **后拉过零点**（user：「后拉摇杆会经过零点，你是说需要一个 debounce time？」）→ 是，两道：松手 teleport 触发后 **300 ms 冷却**忽略后拉（弹簧回中会过冲到 −0.2~−0.3）；「回上一点」要求后拉 ≥0.6 幅值并**保持 150 ms**。
  - **A2 接口改名为射线语义**（user：「不维护两套：为什么不是 2d mode 用射线的语义？我记得昨天我们就是这么设计的」→ 对）：求解器核心本来就是射线 + 角距（ε=角度分数）；桌面屏幕只是「射线发生器 + 角度尺」的一个实例。A2 落地时接口叫 `PointerFrame { ray(); angularPx(p); viewDir(p) }` 之类，不叫 ViewProjection/worldToScreen（那是桌面味的命名）。
  - **Quest 触觉有 bug**（user：「先不用做 monkey patch，就按照正确的写」）→ 按 WebXR 标准 `hapticActuators[0].pulse` 写，不打补丁。
  - **VR 的 place 持久化**（user：「vr 的 place 也是不是应该持久化，还是可以点一下编辑。但是平时编辑时还是应该隐藏，不打扰 zen」）→ 出生点/上次站位随草稿箱存为**视图态**（不是模型数据）；「出生点」标记默认隐藏，视图菜单可显、点一下重设；进 VR 落在上次站位。
  - **Quest 工作模式**（user：「在进网页 1 的 vr 的时候可以 system browser overlay 玩网页 2。所以很可能我网页 2 复制图像，然后不出 vr 复制进 catsup 成参考或者贴图」）→ E13。

### A14 UI 组织：Minecraft 物品栏 vs 常规建模软件 — `done（裁：不用物品栏）`（user 2026-09-07：「minecraft 的自定义 1234567890 物品栏放动词，从背包里面取，wasd 的操作方式是不是不太理智，还是按照正常的 3d modeling software 来？注意以后会有 component, hide show, not sure if i want layers, 不同的 type（sketchup 模型 vs blender 有机模型），weebpaint 整合，一大堆东西。还有就是高质量的渲染和伪 GI」）。AI 看法见对话。

### A15 无地期间的本地草稿持久化 — `待拍板`（硬规则 #1 storage 红线，需 user 明批；user 2026-09-07：「idb 保留还是蛮重要的，即使是无地期间也鼓励我认真画东西，如何在数据契约还在大幅变动的现在实现这个但不屎山，也不是更新版本必丢？」）
- **user 2026-09-07 否决指令流持久化**（「指令流其实反而问题非常大，因为我们修一个几何拓扑 bug，重放旧的指令流会 pointer overflow。我觉得指令流是最不安全的，指令流和 undo 的生命周期永远是 runtime，我记得 wp 也是这个结论」）→ **草稿箱只存快照，不存 op 日志**；指令流生命周期 = runtime（A1 的 undo 也在内存）。
- **AI 提案 v2**：快照 = 内核本体最小 dump `{ version, vertices[{x,y,z}], edges[[a,b]], faces[{outer:[vid], holes:[[vid]]}] }` + 视图态（相机 / VR 站位）+ **OBJ 文本 bake 当最后兜底**。读取：快照按 `version` 走小迁移梯（加字段不删字段；group/component 纪元只会加），迁不动就吞 OBJ。这份 dump 就是 B-rep 的本质，任何未来内核都必须能吃它，所以它是最不怕改版的东西；且它就是将来 zip 容器里 JSON authoring 的雏形，不是新格式承诺。盒子：独立 IDB「无地期草稿箱」（明确标注临时）、追加式草稿列表、首次保存请求 `persist()`；将来原样搬进 store collection。**待 user「批」。**

### A10 吸附：整数 incremental + 绝对网格 + 内部单位 SI — `待做`（user 2026-09-06「两种吸附都要同意」「内部单位永远是 SI，这个应该是我们的纪律吧」）
- **纪律：内部单位 = 米（SI），永不改**；顶点**身份**已在 Q=1e-6 格点（= 1 µm 格；`ptKey3` 取整），显示单位可切（mm / cm / m / ft-in）；英制只是显示与网格预设，不进内核（user 曾想强推英制，见对话 2026-09-06：结论=网格步长比单位制更决定手感；关卡编辑常用二进制网格，Source 引擎 16 hu = 1 ft 即此传统）。
- **incremental**（SU length snapping / Blender 默认）：沿手势方向对长度标量取整 L = n·g（n 整数），点 = 锚 + L·dir，**不累加**（每帧从锚点重算，不是上一帧 +g），结果再落格点 → 0.1×10 ≠ 1.0 那类累计误差结构性不存在（0.30000000000000004 与 0.3 同一格点=同一顶点）。永远让位于几何推断（有 0-D/1-D 目标命中就不取整）。
- **卫生项（落地时顺手，动内核一行须回写立宪页）**：现状 `addEdges` 入口不量化**存储**坐标（只 `moveVertices` 量化目标），格点身份对、存值可带 1e-17 级噪声（只影响 OBJ 导出/显示的尾数美观，不影响几何）。改法：入口 `quantize3`；且 `quantize` 改成 `Math.round(x*1e6)/1e6`（1e6 精确可表示，商正确舍入；现在的 `/Q·Q` 走 1e-6 这个不精确常数，理论上有极小概率差 1 ulp）。
- **absolute**（Blender Absolute Grid Snap）：把**画在地上的那张网格**当 0-D 目标池，rank 最低、只在无几何推断时兜底；WYSIWYG——吸画出来的格线，不吸看不见的自适应细分；格距 HUD 定（预设 1 m / 10 cm / 1 cm，另给二进制预设给关卡设计）。建筑党基本不用，关卡设计必用（user）。
- **显示（user 2026-09-07 拍板）**：默认单位 **米**；小数「优雅一点，多 truncate 几位，但是让用户知道不是 exactly」→ SU 同款 **`~` 前缀**：截到显示位数后若截掉部分 > 格点量子就前缀 ~（`editor.fmtLen` 已落，现用于推拉 h；单位化后全部数字显示走它）。
- **锚点链毒点（user 2026-09-07：「锚点1算锚点2锚点2算锚点3，或者一个看上去像整数的锚点，这个是最毒的」）**：对策两条——①每个锚点入库即量化成精确 6 位小数（上面卫生项），链上每一步都从干净小数重算，噪声每步归零、不传递；②「看上去像整数」= 真几何偏差（斜向长度重建/交点）而非算术噪声，显示层用 ~ 揭穿，吸附层靠「几何推断优先于网格」兜底（画到 1.0 附近时先吸到既有 0.999999 顶点，不会造出 1 µm 双胞胎）。
- **「自愈」= absolute grid 只作用于新笔画（user 2026-09-07 拍板：「对我说的就是 absolute grid, acts to new strokes. 不要静默改用户画的几何」）→ 已裁：新点吸绝对网格即自愈，旧几何永不静默改；选区「吸到网格」动词仍是 wishlist。**
  - 原讨论（user 2026-09-07 澄清：「我说的是如果用户因为自己导致不是整数点，接下来可以自愈。这个是否有价值做」）——AI 答（对话里）：隐式自愈不做（等于偷偷改用户画的几何；且脏锚点在 incremental 下只是常量平移，不会越滚越大：1.03 起画 2.000 到 3.03，误差不增长）；显式自愈做、便宜：① absolute grid 模式本身就是自愈（新点吸绝对网格，不看锚点脏不脏）；② 选区动词「吸到网格」（Blender Shift+S 那类，wishlist）；③ `~` 让脏点可见。`待拍板`。
- **待拍板**：默认格距、默认视图尺度（内部=米后 camera 默认 halfH 要改成人体尺度）、两种吸附的开关放 HUD 哪里。

---

## B. 待拍板（要 user 一句话；不急，各自纪元前）

- **B1 group 的精确形状**（group 纪元前）：AI 读法 = 同一顶点池 + context 标签（立宪页 A3 context 槽），group 变换烘进顶点坐标，渲染看不见 group；user 已澄清 drill L83「一个池」指物化层 VBO。要确认的推论：group 内 move 时边界是 sticky 判定的墙，但平面注册/面识别仍在同一世界坐标里跑。SSoT：`ai-docs/20260906-far-horizon-golden-format-and-ontology.md` §3.2。
  **2026-09-07 user 追问**：「group 变换烘进顶点坐标：也许 group 就不带 axis 的语义，sketchup 是这样的吗？只有 component 才带？…redefine axis 是一个很重要的操作，group 应该需要，不应该为了 axis 用 component」。**AI 答（SU 事实）**：SU 的 group 也有自己的轴/变换（API 里 Group 有 `transformation`，进 group 编辑态可 Change Axes；SU 内部 group 就是「只有一个实例的 component」）。**与「烘进顶点」不矛盾**：顶点存世界坐标（渲染=三角汤、无 scenegraph），group 另存一个**轴框**（原点+正交基）当纯编辑语义——move/rotate/scale 的枢轴、进组编辑时推断轴跟着组轴转（SU 同款）、将来 component 定义空间的种子；旋转组=顶点转+轴框转，渲染层永远看不见它。Redefine axis = 只改轴框、顶点不动。**user 2026-09-07「group 存轴，顶点存 component 坐标：同意」→ 已写进 far-horizon §3.2（group=轴框+世界坐标顶点；component=定义空间坐标+实例变换）。B1 结案。**
- **B2 `type` 当组件包而非封闭枚举**（数据结构纪元）：`far-horizon` §3.7。**user 2026-09-07「同意」→ 已裁**（数据结构纪元开工时照此）。
- **B3 透视视场角**：~~50° 还是 SU 的 35°~~ **user 2026-09-07 裁：50°**（「现在的蛮舒服…我们更游戏血统所以这个可以」）。
- **B4 UI 偏好走 localStorage 的两个开关**（「手指也能画」「实验台」）保留与否——不是模型数据，user 未反对。
- **B6 推断线 ε**：~~是否随视口放大~~ **user 2026-09-07：「这个不就是我当时让你变回角度 based 的原因吗？以及点松线紧可以试试」→ 角度制（按视口高等比）不动；「点松线紧」试验已落 v0.3.2：`EPS.line` 5→3.5（点 10 / 边 7 / 合成 12 不变）**。`待看`：手感嫌线太黏/太滑就再调这个数（哨兵测试随改）。
- **B7 Offset 工具**（user 2026-09-06：「然后我想要offset了。sketchup是只能针对一个面的吗？然后对于复杂的几何情况你怎么判断。然后offset多了退化了你能搞得定吗（比如一些边长变成0只会拓扑变还能继续offset）顺便offset还能offset到更大的外面，sketchup会长膜」）`待拍板`（讨论中，未 grill 完）。AI 提案摘要（对话里已答，供开工 agent 参考、非定案）：offset = **纯 2D 函数 + `addEdges`，零新内核原语**（与 pp v1 同精神）——在膜的 PlaneRegistry 基里对环做 miter 平行偏移 → 自交/退化用「按绕数保正区」剪枝（Clipper 式：塌成零长的边自然消失、翻转的负绕数瓣丢弃，任意 d 都良定义，边塌缩=拓扑变照常继续）→ 剪枝后的环当手势线画上去：向内 = 原膜被 DIVIDE 成内片+环带；向外 = 环带区外环含手势 → A4 直接 BIRTH（SU「长膜」零特例）。作用对象：单膜（全部环 or 只外环——SU 疑似只偏外环，待 web SU 核）或一串共面连通边（开链两端不封口）；不做多膜（SU 亦无）。d 通道 = pp 高度通道同构（标量对「偏到某点/某边」候选集咬合）+ VCB 以后。拐角=miter 尖角（SU 同款，凹角不倒圆）。**待 user 拍：①带洞膜偏不偏内环 ②d 超过全塌缩时=无操作还是钳到最后有效 d ③是否先只做膜不做边链**。
  **①续（user 2026-09-06 核实「su确实是只外环」并问带内环有何弱点）**：技术上无弱点——按「区域侵蚀」做（全部环一起 miter + 绕数保正区剪枝）比逐环更稳，洞环长大撞上外环/别的洞会自然合并；逐环 miter 才会撞出垃圾。弱点在 **UX 的意图歧义**：庭院平面要走廊（内外环都要偏）vs 窗洞外框（只偏外环、洞别动）两种需求都常见，任何单一默认都有一半人要多操作。AI 提案 = **默认偏「光标参考边所在的那一个环」**（悬停高亮哪个环一目了然，外环/洞环皆可；洞环向内偏 = 洞里长出环带膜，A4 免费）+ **修饰键/HUD 片切「整个区域」**（全部环）。SU 的「只外环 + 选洞边再偏一次」= 这个方案的子集。**user 2026-09-07 拍板「默认偏光标参考边所在的那一个环 同意」**（①已裁；②③仍待）。
- **B8** → 已转 A7（user 同意）。
- **B9 Move 轴锁 / 面锁 / 法向 / 关闭吸附**（user 2026-09-06：「move: 加上xyz轴吸附的快捷键和触屏方案」「能不能还有别的比如xy yz zx吸附，以及没有有法面吸附。和blender的视口吸附？这个是个UX问题」「以及如何关闭snap」）`待拍板`。参考口径：SU=方向键 ←绿 →红 ↑蓝 ↓平行/垂直于推断边、Shift=锁住当前推断（悬在膜上时=锁「面上」即面锁）；Blender=X/Y/Z 轴锁、Shift+X/Y/Z 面锁（排除该轴）、Ctrl 按住临时反转吸附开关。**键盘部分已拍板转 A9**（两套都收 + Shift+方向键=Blender 面锁语义）；本条剩 **触屏/VR = HUD 锁片行**（X·Y·Z·XY·YZ·ZX·N 法向·⊥∥，move/line/rect 手势中浮现，点亮=锁、再点=解锁），关闭吸附=按住 Alt（桌面）/HUD 磁铁片（触屏）= 求解器 `alignSources` 清空只留平面约束。「视口吸附」待 user 澄清是指 Blender 的视图平面（View 方向）还是屏幕网格。
- **B10** → 已转 A10（user「两种吸附都要同意」+ 内部单位 SI 纪律）；剩余细节（默认格距/视图尺度/开关位置/显示单位默认）在 A10 末尾待拍板。
- **B12 VCB 数字输入 + ×9 / ÷8 阵列**（user 2026-09-07「那些数字输入，x9 /8 进 wishlist，不急着做。剧透：触屏场景出一个方便的小键盘，不要弹系统键盘打断 flow」）`wishlist`：SU 的 VCB（拖拽中直接敲数字回车=精确长度/高度；move 后敲 x9 = 阵列 9 份、/8 = 等分 8 份）。触屏 = **app 内小键盘**（数字/单位/×÷/回车，HUD 里浮出，不弹系统键盘）。等单位化（A10）之后做。
- **B11 方向感标识**（user 2026-09-07：「轴和网格的边缘加前后左右东南西北标识？淡的大箭头？或者天空盒无限远？」）`待拍板`。AI 看法（对话里已答）：三件按性价比排——① **SU 同款轴线正负半轴实虚线**（正=实、负=虚），零 UI、立刻有方向；② **角落三轴小罗盘 gizmo**（Blender 式：随相机转的 X/Y/Z 小三叉 + N 标记，点轴=切视图，HTML/SVG 覆盖层用相机基算、不进 three），比网格边缘大箭头/字母干净，字母会随网格淡出边界漂；③ **天空/地平线**当 Workbench 风格选项（SU 默认风格就有天/地色）：解决「网格有尽头」的观感、给上下与远近感，但它不给东南西北，与 ①② 互补不替代。网格边缘大箭头/东南西北字 = 不推荐（噪、且 +Y=北 只对建筑党有意义，游戏血统更认 gizmo）。
  **2026-09-07 user 续**：「东南西北和 rigging 的前后左右到底是正负 xy 的哪一个一直没有一个 convention…淡化正负 x，强化语义。我想要的就是那种很大的字…虚线感觉不好看，反而 clutter…问题不是判断谁是 +x，而是 +x 是左还是右。这个我希望写死。不过其实还是没有解决角色是面南还是面北的问题…车也是，主要还是面向还是背向是 forward」。**AI 提案（待拍板，全文见对话）**：世界 = SU 契约（+X 东红 / +Y 北绿 / +Z 上）；**前视图 = 相机在南向北看，屏幕右 = +X 东**；**物体（角色/车/房）的「前」= −Y 面南，在前视图里正对相机；物体自己的左手 = +X 东、右手 = −X 西；车头 forward = −Y**——这正是 Blender 的 −Y forward / Z up，Blender→glTF 换轴后 = glTF 的 +Z forward，OBJ/glTF 逃生口零歧义；Unity(+Z fwd, Y up)/Unreal(+X fwd, Z up) 在导出时换轴。网格边缘的大字用**世界语义（北/东/南/西）**、不用前后左右（那是物体语义，会和屏幕左右打架）；虚线撤。
  **user 2026-09-07 拍板：「同意 Y 北 −Y 前。不过这样又和 unity 的 forward 打架，这个本质就是 d3d vs opengl。先不头疼，主要是如何向用户传达这一切？尤其是物体的前」**→ convention 已裁（+Y 北 / −Y 前 / 前视图从南看、屏幕右=+X 东 / 物体左手 +X）；「传达」user 2026-09-07 拍板：「+Y 北，−Y 一个三角前箭头。以及还需要传达一下 1m 哦」「视图菜单同意。前视=向北看」「角落 gizmos 我觉得 zen 模式不用」「lighting default prior 是另外一个 cue，以后也会做」→ **待做 A12**（见 A 节）；gizmo 不做（zen；IFR 场景讨论见对话：贴脸/室内/顶视时的仪表 = 轴线本身 + 状态栏视图名，够用）；光照先验 = 将来 Workbench 的默认光向当方向 cue（E11）。
- **B14 与 WeebPaint 的交流方式**（user 2026-09-07 原话：「两个情况。1 是我希望我们的 savefile 可以 embed ora。2 是到时候有 bodypaint 了谁 master。一个方案是用某种跨 tab 交流方式，这样的好处是简单，还有别的可能的方案，甚至保持 weebpaint 彻底肢解后变成我们的一个 library。但反正场景就是。1. 不导入导出弄一大堆散文件的 2d 模式编辑贴图，图片，调色。2. weebpaint 级别笔触，multi layer, pixel accurate 的 3d painting。而不是我们重复造轮子。不过 weebpaint 的 bodypaint 纪元还八字没一撇呢！这里主要是想如何交流的问题」）`待拍板`。AI 看法（对话里）：场景 1 = **跨 tab / iframe + ora 交接协议**（BroadcastChannel/postMessage，同源同浏览器；CatsUp 是 3D 主，ora 被 WeebPaint「借出」期间 WeebPaint 是 2D 主，归还即锁回——git checkout 语义；iPad 后台标签会被杀，所以交接必须是显式事务不是常连）；场景 2 = **必须进程内**：笔触要在 3D 里投影到 UV，跨 tab 做不到像素级——把 WeebPaint 的笔刷引擎/图层/ora I-O 抽成 `@internal/paint-engine` 库，WeebPaint 自己成为它的第一个消费者（不是肢解 WeebPaint，是让它也用同一颗心脏）。savefile embed ora = zip 容器天然支持（附件）。两条不互斥：先 1 后 2。WeebPaint 侧 agent 需知会（bodypaint 纪元开工前）。
- **B5 持久化/文件格式本体**：user 明示「SketchUp 1.0 做完、component group 摸清楚之后再定，你不要擅自做决定」；容器方向 = zip（自有 JSON authoring SSoT + 标准 glb bake）。**AI 不提案不预留。**

---

## C. 待看（user 过目即可，不阻塞）

- **C1 `push-pull` 图标**：fable 自画，图标库 `PENDING` 层，user「先用你的」；过目后进库/打回/删归 user（`20260708 SVG Icons/TODO.md` 待过目表）。
- **C2 README 与公开的 ai-docs**（含大量 user 原话）——公开工坊道本意，抽空扫一眼。
- **C4 HUD 二稿过目**（user 2026-09-07 口径：「HUD 你先看着办，以后要好好收，先放视图里面。undo redo 不要放顶上…hud 应该更参考游戏一点。CatsUp 这个字不用占地方不够 zen，三条杠和 undo redo 要不要放在左栏，把顶上空了，然后视图放右栏的点开菜单？…无 background 的字…background 弱一点的…version 标识确实需要，左下角的状态显示我也觉得很重要，相当于 rpg 游戏的对话」）：v0.3.2 落地 = 顶上清空、左栏 ☰/撤销/重做/删除+分隔+工具、右栏 视图弹出+全览、标题字撤、栏=弱玻璃无边框、状态/版本=无背景白描边字、状态行最多两行超出省略。**三稿终形 v0.3.5**（user 2026-09-07 收口：「工具居中，三条杠 stack 在工具上面不分离，undo redo stack 在工具下面」→ 一根左柱整体居中 = ☰ / 工具 / 撤销 / 重做 / 删除(有选区时)；此前一版 user 口径：「工具栏左居中更舒服？…用 tools 的居中，而不是带上其他东西的居中。以及 undo redo 能不能放下面，以及能不能两个按钮收到一个槽里面（也许不好）」）：工具栏只含工具、左居中；☰ 独占左上小药丸；撤销/重做做成**一槽两半**横向小药丸（36px 格）收左下状态行上方——不做单键长按藏 redo（不可发现）。**「以后要好好收」= 以后再整轮**（HUD 锁片/吸附开关/单位显示进来时一起）。
- **C3 iPad 真机**：Pencil 悬停吸附、手指=相机、双指平移捏合、双指 tap 撤销/三指重做、手掌拒绝（pen 后 600ms 掌触门）。桌面 user 已看（2026-09-06）。

---

## D. 老 bug 尾巴（0.2 推拉纪元遗留，需 user 参与）

- **D1 湮灭疑案六变体** `等 user 数据`：user 09-03 报「推平到底面还有膜」类现象；六种变体在 commit 层全对，等 user 精确复现步骤。案卷：`ai-docs/20260901-pushpull-grill-sheet.md` §v3.1 附近 + 立宪页「扰动相」。
- **D2 悬置判据** `等 user 数据`：推拉时 ⊥ 邻面「随行伸缩」还是「留守」（盒墙 vs 铰链地板悖论），判据不在局部方向代数，要 user 去 SU 做实验。案卷：grill 单 §v3.1「悬置判据」。
- **D3 pp「挡」（Offset-limited）** `待做但不急`：滑行边撞到别的顶点即卡住（E7 判据）；实现形状 = pp 约束集加 h 上限，零拓扑。grill 单 §2.9。
- **D4 F4 / 多选 pull / VCB 数值输入** `park`（user 已 park）。
- **D10 橡皮擦到 innocent 的背面边**（user 2026-09-07「v0.3.2 橡皮也会碰到 innocent 的背面边。这个新版本修了吗」→「橡皮不应该是预演，而是一个静态上面选择，松的时候才删。我去 check 一下 su 是不是这样的」）`done v0.3.10`：静态层 v0.3.5 拾取遮挡已修；拖擦层根治 = **橡皮不预演**：拖擦只在现实世界上高亮擦到的边（`scrubEdges`→edgeHot），松手一次结算（**user 2026-09-07 SU 核实：「su 里面橡皮就是选择边变蓝，松手删。也许可以 esc/ctrlz 逃生」**——逃生已有：拖擦中 Esc = `cancelGesture` 清空擦选集、松手不删；松手后 Ctrl+Z / 双指轻点撤销）。v0.3.9 那个 `pickEntity` occluder 参数随之撤掉（接口纪律：无人需要不留）。
- **D9 推拉卡住要提示**（user 2026-09-07「推拉如果卡住了推拉不动的话应该有提示」）`done v0.3.8`：卡住 = 正对着面看（法向∥视线 >0.9 或公垂无解）时光标动了 h 出不来；状态行改报「推拉没动：正对着这张面看…环绕换个角度再拉」。将来 D3「挡」落地时同一处报「被 X 挡住」。
- **D8 推拉拾不到细面**（user 2026-09-07「推拉的时候拾取不到细的面，是不是选取的时候不应该用和 snap 一样的捕捉逻辑？还是线确实应该 snap 区窄一点？」）`done v0.3.7`：不是 ε 窄不窄——拾取沿用「顶点>边>面」优先级，细面上任何位置都在边的 HIT=6px 圈内，边永远赢。修 = **面动词只认面**：`pick.pickFace`（射线最近膜），推拉/删面走它；选择/移动/橡皮仍走 `pickEntity`（SU 同款：推拉只认面）。golden 细墙顶案。
- **D7 角点起手拖矩形变竖板 / 拖到一半水平突然变竖直**（user 2026-09-07 截图：「这个时候我想画 xy 面为什么反而画成竖直面了…从这个仓库的角点开始拖的」「有时候拖动到一半一开始是水平的突然变成竖直的了」）`done v0.3.6`：根因 = 我 v0.3.1 加的「第二点平面黏住上一帧」——锚点是角点（同属水平面与竖墙），光标离开角点时擦过含锚点的竖墙 → 平面定竖直 → 黏到空地。撤黏性，改**近擦**（`solver.nearFaceContaining`，纯几何无历史）：光标离含锚点膜的剪影 ≤ `PLANE_NEAR_PX`=24px@800 才算在那张膜上（滑出底边不翻面照旧成立），否则回老规则（面向度+落底偏置）。翻面只在墙边发生（SU 同款：第二点悬在共面膜上就躺那张膜）。golden 两案 + 旧六案改名。真机未验。
- **D6 选择会选到面后面的东西**（user 2026-09-07「high」）`done v0.3.5`：`pickEntity` 此前顶点/边纯屏幕距离拾取、无遮挡；修=顶点过 `occludedBy`、边取屏幕最近点回投 3D 过遮挡（与对齐引擎同一台遮挡，贴面不算挡所以棱/角不被自己的邻膜挡）；膜本来就按最近 t。golden `test/pick.test.ts` 六案（背底边/背底角不可选、前底边/前上角照常）。真机未验。
- **D5 侧面往下拖矩形吸不到底边 / 吸到背后的底边**（user 2026-09-06：「矩形侧面上往下拖一个矩形，很难吸附底边，或者干脆不吸附，有时候会吸附到这个面后面的某个底边」）`done v0.3.1`：求解器夹具复现三根因（上一帧吸到底边后底边被手中切点切段整条退赛 → 横跳；触手膜全豁免遮挡 → 背后底边露出；光标滑出底边后平面按落底偏置翻到水平面）；修=链式溶解 / `AlignHand.faces` 工具表态 / 第二点平面黏性，六案 golden，详 `ai-docs/20260901-snap-model.md` 2026-09-06 深夜节。真机未验。

---

## E. park / 不做（免得再问）

- **E1 zip 容器本体**：方向定了（user「选 zip 吧…有 glb 的话丢 authoring 人类创意不丢」），本体等 SU 1.0。
- **E2 glTF 导出逃生口**：user「不用了」。OBJ 逃生口保留（`src/editor/obj-io.ts`，特例非正式导出）。
- **E3 prod 首推**：user「不做」。有需要时 `git push github main:prod` + 硬规则 #5 必问。
- **E4 Session 无头化**（editor 去 three/DOM/performance.now）：user「不知道，先这样」。A4 落地后 three 自然不进 editor，剩 canvas 尺寸与 clock 两处。
- **E5 Ketchup 改名**：关闭。user「就是 catsup 吧。weebpaint 已经把二次元属性定死了」。
- **E6 透视下 `occludedSpansOnLine` 取线段中点视向作常向量**（近似）：除非抖动复发，不动。
- **E7 `experiments/sketchpad.html`**：可丢区，不管。
- **E9 OBJ 导出：带洞/凹面的法向坑**（user 2026-09-07「导出 obj 有法向凹面洞面的坑，我还没找你算账。先 parked，这个只是个逃生口」）：`park`。案发形状待 user 给（怀疑 earcut 注入的带洞面三角朝向 / 凹多边形 n-gon 在 Blender 里法向翻），逃生口不阻塞。
- **E10 触屏小键盘**（user 剧透，见 B12）：数字输入不弹系统键盘，app 内 HUD 小键盘。
- **E11 光照默认先验当方向 cue**（user 2026-09-07「lighting default prior 是另外一个 cue，以后也会做」）：Workbench 默认光向固定于世界（如西南上方）而非相机系，转视角时明暗随之变 → 方向感；等渲染引擎切口（A4）后做。
- **E13 VR 内粘贴参考/贴图**（user 2026-09-07 Quest 工作模式：进网页 1 的 VR 时可开 system browser overlay 玩网页 2 → 「网页 2 复制图像，然后不出 vr 复制进 catsup 成参考或者贴图」）：沉浸会话里读剪贴板（`navigator.clipboard.read()` 需用户激活，XR `select` 事件算不算激活待验）→ 参考图 / 贴图纪元的入口之一；先存档。
- **E12 灵感：「生命之粉」= 编辑器内临时物理**（user 2026-09-07 原话存档：「塞尔达里面的超级手可以把 rigidbody **临时**变成 kinematic。我们做一个相反的东西：绿野仙踪里面的生命之粉（时间之粉？newtonian 这种只会往下掉的 non self propotion particle 不符合中世纪生命的语义），效果是临时 in editor, without hit play button 把一个东西变成 falling rock/ water/ cloth，临时，用户可以喊停。用处是你想做沙发布料瓦砾书堆的时候不想折腾时间轴和烘培但需要物理模拟的时候可以用。unity asset store 上面也有一个类似的素材摆放插件。甚至我们以后 asset placement 的时候可以做一个 drop」）：动词形状 = 选中几何 → 撒粉 → 它在编辑器里活起来（落石/水/布）→ 喊停即冻结成普通几何（一次结算 = 一个 op，指令式不破）；asset placement 的「drop」是它的最小子集。未来纪元，先存档。
- **原则（同一段 user 原话，与 A13 碰撞项挂钩）**：「这个和 vr/fps 的导航需求都逼出来：**我们的 geometry 是默认有碰撞的，除非用户 override or assign proxy**」→ 碰撞不是 VR 专属附件而是几何的默认属性；override（关碰撞）与 proxy（简化碰撞体）是将来的 per-几何/per-component 元数据（ECS 元数据落 `extras` 那一层）。
- **E8 油漆桶=拉矩形**（user 2026-09-06 原话「park进未来设计思路：油漆桶刷贴图采用拉矩形的方式，所以拉矩形可以同时设置贴图和UV」）：贴图纪元的思路存档，现在不做。

---

## F. 本日已 done（2026-09-06，供对账）

- 第三批（2026-09-07 凌晨）：**HUD 二稿**（C4）+ `fmtLen` ~ 标记 + 总账拍板落账（B7①/A7-A10），v0.3.2。
- 第二批：**侧面拖矩形吸底边案（D5）**：求解器手中集三律（链式溶解 / 膜由工具表态 / 平面黏性），v0.3.1。
- 第二批：**回字含岛 pp 三律修**（user 截图「回字 pull up 没有拉出墙，而是拉出了错误的东西」→ 井口封帽/内岛翻灭/顶环带出不生三错；立宪页 rev6「洞环三律」+ grill 单 §2.14 + 两案 golden，v0.3.1）。
- 深夜批：**自吸事故修**（矩形/线第二点吸到预演里自己上一帧的角点 = user「一 snap 一 snap」；`AlignQuery.hand` 改必填表态制 + `NO_HAND`，golden 钉死）。
- 晚批：**`on-face`「面上」吸附**（悬停未落笔也显示；`DrawPlane.face` 记平面出身）、**HUD 化**（user：「顶栏透明…类似游戏的那种 immersive hud…以后转 VR 会无疼。就 hud 化吧」→ 顶栏/状态栏全部变成视口内浮动胶囊，画布满屏；`#docTitle` 胶囊 = 将来的文件名位）。
0.3 app 壳纪元开工（lab 退役 → 正式 app）、透视相机、Workbench 渲染雏形、iPad 手势路由、OBJ 逃生口、PWA 壳、公开工坊道上线（`github.com/fangzhangmnm/catsup`，deploy.yml，dev = https://fangzhangmnm.github.io/catsup/dev/ ）、ε 角度语义、第二点「含点膜」修 + 线同修、多指 tap 撤销四坑、LICENSE MIT、旧探针进仓、远景剧透与黄金格式判断落档。详 `ai-docs/20260906-app-shell-epoch-landing.md`、`ai-docs/20260906-far-horizon-golden-format-and-ontology.md`。
