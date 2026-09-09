# CatsUp 待办总账 —— 一条 = 一个新 agent 能独立吃下的活

> **下周 agent 起手（user 2026-09-08 结案：「激光笔 almost good enough…靠修 bug 和调手感能救。先不用考虑平移手和 grip 离合器。也许 grip 留给 ctrl mode」）：路线 = 纯激光笔修 bug/调手感。① 反省稿 §3.8 selection box 显式冻结平面 + VR 框选；② ε_VR 常量真机调参 + 等价套件；③ 正北 Y/Z 并列破平局；④ D-fuzz 重复面残余、D-autofold 山墙案（等 user 一句话）；⑤ Quest 退出横幅真机对照（C）；⑥ Z 轴刻度（A12 子项待拍板）。**已 park：平移手驱动（HOMER）、grip 离合器；grip → 「ctrl mode」待定义。全部原话在 A16 各轮。**
> as-of v0.4.6 / 2026-09-08（近平行轴线不参赛 + 清理；A17 虚拟屏 sunset 落地；第六批（含第二~七轮追加：内核 fuzz 面环自洽 / move 宽锥三轴 / 线黏地面：内核容差/错误边界/字幕 toast/1/z 止血）：VR 真机首轮反馈 A16 = 尺度/teleport 停摆/noclip/retained 渲染/点球/充能点，反省稿待拍板；此前第五批：平面黏性回归修 + 细面推拉修 + 视图名带方位 + A12 地面与方向传达立项）· created by Claude Fable 5.1
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

### A2 分层重构① `ViewProjection` 接口 — `done 02575f9（2026-09-07，接口名 PointerFrame）`（user：「开做」）
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

### A7 Select 工具：点击族 + Ctrl+A / Delete — `点击族 done v0.4.0（双击=膜+环边、三击=连通体，Editor.selectExpand，VR 长按同源）；Ctrl+A 待做`（user 2026-09-06「同意，然后手势可以看一下weebpaint的坑」）
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

### A13 VR 第一公民：加 VR support（0.4 纪元候选） — `done v0.4.0（2026-09-07 挂机轮，Claude Fable 5.1；headless/假会话全绿，Quest 真机未验）`（user 2026-09-07 day 1 尾巴原话，全文：「喊口号不如实际逼你一下。在今天 day 1 的尾巴，工具动词还少，ui 还少的，rotate, scale 没做，move 半残，component group 没做的时候开始干这个时期：vr 第一公民，加 VR support。以后想加什么，键鼠，触屏，vr 一起做」）
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
  - **射程措辞与数字撤回**（user 2026-09-07：「1m-12m 的射程你幻觉了吗，grounding 一下自己，首先一般的 vr 游戏的射程是我们的下限。然后上线就是 gm 超人能跳到另外一个楼或者浮空船上面，所以下限是舒适，上线是兜底。也许射程离散挡位会比较好，上限是直线=无穷大。以及对于缩小帽模式…射程都是根据玩家缩放的？」「抛物线就不应该用射程这个词，看一下一般 vr 游戏的 teleport 是怎么结算的」）→ **改口**：那两个数没有出处。一般 VR 游戏的结算 = **抛射体模拟**：沿手柄射线给一个**发射速度** v₀ + 重力 g，采样折线逐段射线求交，落在首个命中的**合法面**（法向 ≤ max slope + 头顶净空），否则弧线变红不落；玩家只用俯仰瞄准，「距离」是 v₀ 与俯仰的涌现量，不是旋钮（据记忆：Unity XRI 射线交互器默认 v=16 m/s、g=9.8 → 45° 约 26 m；Alyx/SteamVR 同模型，常把 >45° 的俯仰重映射成继续变远而不是回落）。**我们的档位 = 发射速度档**：下限档 = 一般 VR 游戏的舒适 v₀（playtest 定常数，不写死数字），往上几档，**顶档 = 直线（v₀→∞，落在射线命中处）= GM/超人跳楼跳浮空船的兜底**；v₀ 随玩家缩放（缩小帽/小孩/高达：rig 缩放 s → v₀·√s，弧形相对身体不变）。俯仰与力度天然是两个量，同意。
  - **后拉过零点**（user：「后拉摇杆会经过零点，你是说需要一个 debounce time？」）→ 是，两道：松手 teleport 触发后 **300 ms 冷却**忽略后拉（弹簧回中会过冲到 −0.2~−0.3）；「回上一点」要求后拉 ≥0.6 幅值并**保持 150 ms**。
  - **A2 接口改名为射线语义**（user：「不维护两套：为什么不是 2d mode 用射线的语义？我记得昨天我们就是这么设计的」→ 对）：求解器核心本来就是射线 + 角距（ε=角度分数）；桌面屏幕只是「射线发生器 + 角度尺」的一个实例。A2 落地时接口叫 `PointerFrame { ray(); angularPx(p); viewDir(p) }` 之类，不叫 ViewProjection/worldToScreen（那是桌面味的命名）。
  - **Quest 触觉有 bug**（user：「先不用做 monkey patch，就按照正确的写」）→ 按 WebXR 标准 `hapticActuators[0].pulse` 写，不打补丁。
  - **VR 的 place 持久化**（user：「vr 的 place 也是不是应该持久化，还是可以点一下编辑。但是平时编辑时还是应该隐藏，不打扰 zen」）→ 出生点/上次站位随草稿箱存为**视图态**（不是模型数据）；「出生点」标记默认隐藏，视图菜单可显、点一下重设；进 VR 落在上次站位。
  - **Quest 工作模式**（user：「在进网页 1 的 vr 的时候可以 system browser overlay 玩网页 2。所以很可能我网页 2 复制图像，然后不出 vr 复制进 catsup 成参考或者贴图」）→ E13。
- **user 2026-09-07 第四轮（挂机中追加，原话）**：「加一个coyoto机制，一个verb进行到一半的freeze物理。免得玩家踩自己脚或者被卡的时候导致鼠标鼠标乱飞。等commit之后才惩罚玩家」「所以conttoller需要加一个freeze的功能。不过因为平时都是头移动会导致身体跟着的。以及当时的放瞬移护栏。你想的严谨一点。不是简单的几个monkey patch。而是模块里做一个freeze机制」→ **已落 `src/player/player.ts` freeze/coyote**：`freeze(token)/thaw(token)` 多来源计数集；冻结期**被动物理停摆**（重力、悬挂贴地、静止去穿透、teleport 结算、跳；velZ/grounded 原样 = 真悬在半空），**主动动作照常**（摇杆步行带碰撞、roomscale 身体跟头、snap turn、蹲——所以解冻时没有「身体追头」大跳）；**防瞬移护栏做成结构性**：静止去穿透永远限速（三球共享预算 5 cm/步 ≈ 3 m/s）且身体被推着（嵌在几何里）那步不施重力、不往下贴地（实测过僵持→期满弹飞的反例，见 player.ts 头注释）。golden：`test/player.test.ts`「freeze / coyote」五案。app 侧冻结票 = `editor.isGestureActive()`（含线工具连画待命态）。
- **落地摘要（v0.4.0，全部 headless 自验，真机只请 user 戴一次）**：`src/player/{player,input,teleport,world-query,flat-input,xr-input}.ts` 深模块（零 kernel/three）+ `src/editor/collision-world.ts`（膜多边形汤 → WorldQuery）+ `src/editor/xr-pointer-frame.ts`（PointerFrame 第二实例）+ `src/app/{locomotion,vr}.ts` + `src/app/ui/{hud-model,wrist-panel}.ts`；桌面步行相机（视图菜单）= 不戴头显验证移动/碰撞/teleport 的通道；探针 `test/probes/probe-walk.mjs`（15 项）与 `probe-xr-fake.mjs`（假 XR 会话 18 项：出生 reset、rig 代数、摇杆走/转、扳机画线、面板点按换工具、阶段长按选择、摇杆瞬移、退出恢复）。
- **待 user 一句话 / 真机核实（挂机轮攒的问题，不阻塞）**：
  1. **发射速度档常数** `teleport.ts SPEED_TIERS = [5, 8, 12, ∞] m/s`（g=9.8）是占位，playtest 定；默认档 8。
  2. **手腕面板挂左手、右手持笔**为默认；☰「VR 左手持笔」可对调（localStorage 偏好）。面板元素顺序 = 状态行 / 工具 3×2 / 撤销·重做·删除 / 穿墙飞行·回出生点·退出 VR / 版本。
  3. **「回上一点」语义**做成「撤销这次跳」（后拉回到出发点；再拉一次又跳回去，来回可反复）——若 user 意指别的口径，改 `teleport.ts` 一处。
  4. **步行模式热键冲突**：空格=跳、E=上升 抢了 SU 的 选择/橡皮 → 加了双模式通用键 **Tab=选择、X=橡皮**；不满意再挪。
  5. **手势最小长度统一 1 cm**（`editor.ts MIN_GESTURE_LEN`；lab 时代 line≥1 / move·pp≥0.3 是厘米口径，米制下 VR 画 0.7 m 的线会被吃掉）——属 A10 单位化的一角，其余（网格 50 单位一格、fmtLen 无单位）仍待 A10。
  6. **有效台阶高 ≈ 0.6 m 而非 0.3**：腹球球心在 stepHeight+r=0.6，低于球心的沿会像轮子上路缘一样滚上去（RealHome 同款几何）；要严格 0.3 得改胶囊形状，先记账。
  7. **Quest 浏览器 CJK 字体**：面板文字走系统字体，缺字会成豆腐块——真机看一眼；缺了走「中文烤轮廓」老协议或 vendor 字体。
  8. **Immersive Web Emulator 未跑**（本机无桌面 Chrome 扩展环境）：会话进出/键位映射的最后一层由 user 用模拟器或 Quest 验。
  9. A3 动词注册表没做（不需要它也接上了第二种指针）；A7 点击族（双击=膜+环边、三击=连通体）作为副产品落地（`Editor.selectExpand`），Ctrl+A 未做。
  10. 线工具**连画待命态也算手势进行中**（冻结），Esc 收笔才解冻——与「verb 进行到一半」口径一致，但若觉得待命时该掉下来，改 `locomotion.tick` 的冻结票条件一处。
  11. VR 站位只在内存（进 VR 落上次站位；A15 草稿箱批了再持久化）；「回出生点」= 原点。
  12. 桌面步行相机 = 右键拖看、光标仍是工具指针（没做 pointer lock 十字准星）；T 按住瞄准瞬移用的是光标射线。

### A16 VR 真机首轮反馈（2026-09-07，Quest；user 九条 + 追加）— `部分 done v0.4.1（Claude Fable 5.1）；#3/#4/#5 = 反省稿待拍板；#6 wishlist`
- **user 原话（九条）**：① 「尺寸错了，进 vr 之后一格有可能 10 米甚至更大，里面画出来兜底东西退出来也很小」② 「qol: 1. teleport 的时候不应该显示画线，这时候工具也应该禁用？ 2. minecraft convention: 双击跳可以切换 noclip，然后 vr 里面飞的时候 wasd 是水平的，不应跟有高度变化」③ 「因为 vr 手抖，所以很难拾取。几乎无法 xyz 轴平移，也忘了 axis lock 的按钮。不过也许我们需要 move gizmos? 这个确实是不同的工具模式。gizmos 也许可以做 trs shear 一体的」④ 「拾取算法非常不对，有时候会画到别的地方，然后 push 的时候我太瘦也没法造非常高的柱子。会拾取到 1/z 的 z->-z 平面，然后拾取的时候按手还是眼镜当视口也不对。所以我一开始说了，不要用视口，用射线。手是会移动的，所以 ray.origin, direction 都会变！不要用视口，1/z，用射线做无奇点的几何」⑤ 「3 和 4 都不要急着做，停下来好好思考反省。vr 的手势是 6dof 输入不是 2dof，我们应该有更好的输入模式。但是也不应该拉一个 10 米的东西手也需要动 10m。以及 grip 可以用来做 lock 的语义」⑥ 「（不急）切换 tool 的快捷键。以及你把 undo 进快捷键很好。这个不急着设计。先保证画的好」⑦ 「vr 画面觉得很狗牙。realhome 就还好。但是 sketchfab 的 vr 浏览器也狗牙。是不是没有优化性能所以 quest 降分辨率了？还是这种白底+线的设计本来就容易狗牙，不很 HD 就会看着糙？但我确实觉得远没有 RH 流畅」⑧ 「vr 里面点球太大了。以及 workbench 的遮挡逻辑还是应该做好」⑨ 「我不爽已经有一段时间了：充能的点能不能不显示」。
- **追加（同日对话）**：「奇点的意思是跑到 1/z 的另外一个 branch 了。但反正我觉得 vr 里面假设一个视口平面而不是用 raycast 算就是不鲁棒」「网格不应该 step 是 1m 吗，我是说 vr 里面的网格错误的巨大。vr 和 pc 的网格都是 1m，不应跟 branch」「下限还可以更小，很多人用 sketchup 做 cad 的，设计一些小实体」「性能上我还是觉得，你优化过 drawcall 吗……别还是当 direct mode 画的……」「然后背景比如轴，地板网格也可以 batch」「看看还有啥可以优化的，反正就是尽量打包东西尽量少」。
- **落地 v0.4.1**：
  - ① 尺度：网格 1 m/格 ±50 m（PC/VR 同一份；此前 50 m 一格 + 桌面相机半高 220 m 是 lab 无单位遗产）、桌面默认半高 4 m（`camera.ts DEFAULT_HALF_H`）、zoom 下限 1 mm / zoomExtents 下限同（小零件 CAD）、透视 near 随眼距缩（`nearClamp`）、正交深度窗口围 target、实验台预置缩成 ±1 m、`fmtLen` 显示 m / cm。A12「自适应无限网格」仍待做。
  - ② teleport 充能中工具停摆（VR + 桌面 T：手势取消、预告清掉、指针射线隐藏）；双击跳/双击 A = noclip 开关（`input.ts DoubleTap`，golden）；noclip 下摇杆/WASD 水平飞（不跟头俯仰），Q/E·A/B 竖直。
  - ⑦ 渲染换 retained mode（`render3.ts` 头注释）：常态 3 个 draw call（网格+三轴一份粗线；全部膜一份几何 + shader 光照；全部边一份粗线），几何按 revision/预演身份/选区键缓存，零每帧分配；XR fixed foveation 默认 0（three 默认 1.0 = 周边降采样，白底细线最吃这个）、粗线 resolution/linewidth 每帧按每眼 viewport 换算（此前用桌面 canvas 尺寸）；`?xrfov=0..1&xrscale=0.5..2` 真机 A/B。**「远没有 RH 流畅」的根因判断 = CPU（每帧重建 + N 个 draw call + GC），不是 Quest 降分辨率**；真机验证归 user。下一刀（未做）：XR 每帧 hover 拾取 O(V·F) 遮挡判定，模型大了再说。
  - ⑧ 吸附小球 XR 角尺寸减半、走深度测试（墙后不再穿墙显示）；控制器光标球按距离定角尺寸。⑨ 充能源紫点不再显示（机制照旧）。
- **第二轮追加（同日晚，v0.4.2）**：user 原话「脚本错误 uncaught error 边 4-3 已经存在，重合即同一，调用方应该报 retrace，是在我画线的时候，以及错误的时候 vr 不应跟卡死」「以及 vr 里应该也能看到 toast 报错。可以考虑一下字幕位」「可见性必须是从拿枪的手而不是眼睛来判断啊！这不就是很多 fps 改成 vr 游戏之后子弹还是从眼睛 raycast 导致玩家根本没法瞄准的 bug 吗」「我觉得你的输入只有一个东西，就是手的 Vec3 和 Quaternion。不要看头。就是一个 ray 的 origin 和 dir，这是你有的唯一东西。不知道你能不能 cope 这个，还是数学引擎会崩」「考虑这么一个情况，你想做一个通天柱，先地板上画一个 quad，然后 pull up 手一挥。v0.4 的时候我手抬到 90 度柱子只到我腰间」。
  - **落地 v0.4.2**：内核容差对齐（`subdivide.ts INSERT_TOL = Q` ≥ 量化格半对角线；`splitEdge` 切点落进既有顶点且已相连 → 复用既有边；fuzz 20000 次零 throw，golden `test/subdivide-nearmiss.test.ts`；立宪页 §5 回写）；错误边界三层（`Editor.commitOp`/预演 run → host.error + 取消手势、`main.ts loopTick` try/catch 循环不死、window error/unhandledrejection 全局兜底；同文案 2 s 限流；不吞：console 必留）；VR 字幕位 toast（`ui/vr-toast.ts` 烤字 + `render3.attachSubtitle` 挂头显相机前 1.2 m 下 0.30 m，与桌面 notice 同一份文案，错误 6 s / 其余 4 s）；1/z 镜像 branch 掐掉（`xr-pointer-frame.ts` 手后半球 = 远点，golden `test/xr-pointer-frame.test.ts`）；推拉/线拖动/磁滞三处 `vp()`→`fvp()`（A2 漏网：VR 里射线斜掉）。
  - 反省稿按「只有手的射线、可见性从手」修订；通天柱几何 = h_hand + D·tan α，90° 平行无解 → 归 §3 手位移驱动。
- **第三轮追加（同日晚）**：user「能不能从 lint 的层面把所有 flatscreen 的东西都护栏一下，然后 lint 之外也系统的排查一下」「哈哈哈还好我开 vr 纪元开的早。如果做完 rotate scale offset follow me 再做的话就是屎山预告哈哈哈」「度量接口也许桌面和 vr 走不同路径？」「然后你说的 6dof 输入模式，平移手确实好用，不会有 2 投 3 的歧义。不过转动手腕的激光笔更爽。如何权衡。以及要现在看来输入的话确实会有两套 code path」「现在的主要决策就是 vr 和桌面是用同一路径还是不同路径，如何尽量的保证 ssot 和不出错，需要好好设计一下架构」→ **lint 已落**（`scripts/build.sh` 0.65 flatscreen 护栏四条，剥注释查；负例验证过会红）；**排查结论**：solver/pick 零相机零 DOM，editor 残留 = 点两下的 `pointerType==="mouse"` 与桌面框选（应归适配器，见反省稿 §3.6 第 5 条）；**架构提案 = 反省稿 §3.5（激光取点、平移拖量）+ §3.6（语义一条路径、适配器 N 个、等价套件为机械保证）**，待拍板。
- **第四轮追加（同日深夜，v0.4.3）**：user「0.4.2 通天柱很舒服。但是：出错 vr 帧，edge19 不存在」「抱歉吃书：判断对齐哪个面的时候(xy yz zx)用头的方向」「画面的时候还是容易想画水平的会画成竖直的，然后在有几何的时候有时候一个水平面莫名其妙画到 z<0」「move 还是很难 snap to axis 的根因：…你会不由自主地对准正北正南。这样的话 z 和 y 重合，所以总会 snap to y…激光笔用来 raycast，手势来 cue…推理引擎就是有好几层 cue」「vr 里出生点是面对正北 +y 的吧，保证一下，以及不要在原点出生，而是能看到原点的地方」。
  - **落地**：`test/kernel-fuzz.test.ts` 随机操作 fuzz + 拓扑不变量（80 种子 × 12 步）——抓到「edge N 不存在」整类根因 = 面环里留死边，五处内核修法见立宪页 §5「面环自洽」（repairRings / 擦边全并 / BIRTH 防重 / 区域跨平面去重 / 认领纯几何）；老内核（v0.4.1）同 fuzz 也炸，是老病。selectExpand 命中边 hasEdge 守卫；错误 toast 附栈顶函数名（esbuild --keep-names）；XRPointerFrame.forward() = 头向（只喂平面挑选）；默认出生点 (0, −3) 面朝北、「回出生点」同。
  - **反省稿 §3.7 分层 cue**（相机 / 手势位移 / 射线）待拍板。
- **第五轮追加（同日深夜）**：user「吃书：vr 的地板永远都是 z=0。不用 min(0,min(model))。想进地下室以后可以用别的办法。或者用往下投影是否有东西（贵不贵？）如果有很大的屎山风险的话（比如需要在 realhome paradigm 里面加很多 hook 可能不急着做)」→ **已落 v0.4.3**：`collision-world.floorZ()` 恒 0（往下探针本来就有 = 站在几何上；地板只是无几何时的兜底），A13 第二轮「地板 = min(0,min(model))」作废；地下室另案。
- **第六轮追加（同日深夜）**：user「然后我的一个想法是 grip 按住的时候可以切换成增量平移？但是松 grip 的时候增量是否保留？顺便一提无 grip 的时候你的 ray origin delta 也是无增量的平移，之前的手感不行就是 viewport 模式 disrespect 了 ray origin change」→ 反省稿 §3.5 末段（AI 建议：增量保留到扳机松开；grip 三个候选语义待三选一）。
- **第七轮追加（2026-09-08 凌晨，v0.4.4）**：user 原话：「有一个应该是 quest 的问题：我按 hand panel 的退出 vr 的时候，浏览器上面会一直有一个 immerised xr is still running in the background 的 panel 不去掉。但是刷新和换 tab 还会这样。只有关浏览器重开才会好，但是之前有几次不会出这个问题（也可能我弄错了）。也许我是用不同方式退的，或者系统提供的退的方法？」「一个 cube，顶面分一刀，抬起来想当屋子的脊。这个时候会有三个问题 1. 会错误的吸附到 xy 平面上…所以移动的时候，被影响的面不应该吸附。对于 pull, move 都成立 2. 就算吸附到旧的顶面了，吸附点移动到顶面外的时候还在吸附，最后会甩到顶面平面无限远的地方。这个是 bug…啊，我桌面测试了一下，发现可能错怪了，不是顶面吸附，而是 z 轴的容差比较小，vr 不一定抓得到，没有吸附 z 轴的话，确实兜底就是平面，这个你觉得怎么办？我去测一下 su 里面的 move…答：不是，但是 range 特别宽。我觉得 effectively 就是三个轴三选一，因为 360 度去掉六个 60 度的吸附 cone 也没剩下太多东西了。也许这样的话我们能做的纯激光笔，不需要手势，那就超级舒服了」「画线的时候有时候在 xy 平面好好的，也会突然跳到空中。这个能不能不要，为什么会发生这个。也没有奇怪的吸附的东西啊」「连续画线…就用 su 的连续画线模式，拖动和多点一样。然后能不能第一下 ctrl z 是退出连续画线而不是取消上一个线，对 push pull 以及未来的东西同理。第一个 ctrl z 是 cancel ongoing operation 逃生」「确实很需要轴来设定画线平面哈哈哈…或者以后可以加一个吸附平面的工具，这样才有 cad 味，和参考线一起进 wishlist」「顺便昨晚讨论生命之粉的时候说了 drop，vr 里面 drop 的手势就是投掷了哈哈哈…flatscreen 里面也可以做一下鼠标速度的物理…先进 wishlist…到时候需要看一下我的 find birdo 的 repo，里面我调过投掷的手感」。
  - **落地 v0.4.4**：**move 自由拖 = 宽锥三轴三选一**（`solver.inferAxisByDirection`，六个 60° 锥；锥外 = 过锚点最面向指针的屏幕平面；擦射线 `grazing` < 6° 保持上一帧不甩）；move 拖动期兜底平面不再是落笔那张膜（受影响面）；**线/矩形第二点：首点在地面就黏地面**（`resolvePlane.basePlane`；「跳到空中」根因 = `pickByFacing` 在俯仰 < 20° 时把兜底翻成竖直面，射线∩竖直面在空中）+ 擦射线护栏；**手势进行中第一下撤销 = 取消当前操作**（连画/推拉/移动；X 键同）；连画：拖动落笔后同样接着连（`commitLineTo` 本来就链式）；VR 激光长度与拾取同源（实时世界首膜；此前碰撞世界 30 m）；退出 VR 两条路径各打日志（app end() vs 系统 sessionend）供真机对照 Quest 横幅。golden `test/move-inference.test.ts`。
  - **B14 wishlist**：吸附平面工具 + 参考线（CAD 味；「轴来设定画线平面」）。**B15 wishlist**：drop = VR 投掷（物理手感参考 user 的 find birdo repo，需要时 user 找）；flatscreen 鼠标速度物理（对齐平面是坑）。
  - **C 待真机核实**：Quest「Immersive XR is still running in the background」横幅——app 路径 `session.end()` 与系统路径都会打 `VR sessionend (...)` 日志（`?` 打开 dev console 或看 toast 无）；两条路径对照一次；若只有 app 路径出，下一步试 end() 后 `xr.setSession(null)` / 停 animation loop 再 end。
- **第八轮追加（2026-09-08）**：user「虚拟屏幕有一个场景必须要…selection box…按下去的一瞬间以用户头为参考做一个显式的、大概手臂距离的投影平面…锁死的平面做 frustum box。需要 grill 的是这个平面是否应该 z up aligned…需要投影平面的时候 explicit，no 静默」「vr 虚拟屏角度放宽是啥意思？除了 selection box 之外不应该有虚拟屏的地方」「有时候能拾取到远处的面，但是 pointer 的激光反而在中途就停了」→ 放宽撤回（80° 不动）；激光同源修；selection box 方案 = 反省稿 §3.8（AI 推荐混合 ±45°）**待 grill**；VR 框选实现 = 该节落地时补（`待做`）。
- **第九轮追加（2026-09-08）**：user「顺便我还是 prefer 连续点击画线，而不是拖动画线」→ 线工具两种都在（点击=连画待命链式、拖动=落笔后也接着连）；**默认引导与提示文案偏向点击**待改（hint 现写「连画中：点下一点」已是点击口径；VR 扳机按住拖 vs 点两下的默认待拍板）。user「小房子的还有一个 bug：拖动屋顶（五边形顶点）的时候，侧面会有概率突然三角化，但是橡皮擦边自愈。应该就是你的一些 autofold 算法不对。先记录进 todo 再修」→ **D-autofold**（下）。
- **第十轮追加（2026-09-08，v0.4.6）**：user「v0.4.4 在小屋子的侧面上画线的时候 z 轴对齐不见了」「继续做，还有啥没清理的」→ 根因 = 朝北看时 Y 轴线与 Z 轴线在视线里重合、并列取 Y、射线与 Y 近平行公垂点飞 18 m（出生点改朝北后成默认场景）；修 = 求解器 1-D 轨迹与射线夹角 < `RAY_PARALLEL_DEG`=10° 不参赛（解病态；golden `test/move-inference.test.ts`）。清理：SNAP/HIT 单一出处 `solver.SNAP_PX/HIT_PX`；编辑器最后的 pointerType 桌面残留（点两下门）改由适配器给 `ToolPointer.armable`。
- **第十一轮追加（2026-09-08）**：user「v0.4.5 好像没 z 轴 missing 的这个问题，然后小屋子脊基本很舒服，虽然还是会 snap 一下但是可能是语义正确的。然后 z 轴我也想要一个刻度，不知道怎么体现不会觉得杂」→ Z 轴对齐案在 0.4.5（球面度量）已不复现；v0.4.6 的近平行不参赛仍成立（桌面 golden 证明该失效模式真实存在）。**Z 轴刻度 → A12 子项**（下）。
- **A12 子项：Z 轴刻度（user 2026-09-08）** `待拍板`：AI 建议两层——① 常驻只画原点附近少量大刻度（1 m 一格、±5 m 内、短横线、网格同色，与网格+三轴同一份粗线 batch，零额外 draw call）；② **上下文刻度**：只在吸附/锁到 axis-z 或推拉沿 Z 时，沿那条竖线临时显示 10 cm/1 m 刻度与读数（像 SU 的推断提示，松手即灭）——静态时零杂物。VR 里同款（刻度按角尺寸定长）。
- **结案（2026-09-08，user 原话）**：「现在感觉激光笔已经 almost good enough 了，也许靠修 bug 和调手感能救。先不用考虑平移手和 grip 离合器。也许 grip 留给 ctrl mode 用。所以现在是 good enough with occational glitchy，有很多可以改进的地方，但是可以先结案了，等 token 到了之后再好好弄」→ **VR 输入路线拍板：纯激光笔（射线 + 球面度量 + 宽锥三轴）继续修 bug / 调手感；反省稿 §3 的平移手驱动（HOMER）与 grip 离合器 park；grip 候选语义收敛为「ctrl mode」（待定义）**。本轮到此结案；续做从本页顶部起手清单取。
- **D 新增**：**D-autofold 五边形顶点拖动侧面突然三角化**（user 2026-09-08；橡皮擦边自愈 = 折缝是多余的 autofold 折片，非拓扑损坏）`待修`：复现路径 = 立方体顶面分一刀抬脊成五边形山墙，move 山墙顶点；怀疑 `src/kernel/autofold.ts` 的「最少折缝」判据在五边形（非四边形）侧面上误判非平面 → 折成三角；先写 golden（五边形侧面平移顶点保持共面时不许出折缝）再修。**2026-09-08 数值复现（Claude Fable 5.1）**：小屋子 → 顶面分脊 → 抬脊 → 山墙顶点在山墙平面内 48 种 (dx,dz) 拖法 **零多余折缝**，出平面（dy）正确 DIVIDE 折缝——桌面内核复现不出「有概率」。假说：VR 里那次拖动的 delta 带了 Y 分量（自由兜底平面或 Y 锥），折缝几何上成立但很小；「擦缝自愈」意味着两片近共面（同平面记录才会 MERGE）——与 1 mm 折缝门矛盾，还有没看清的东西。**待 user 一句话**：当时状态行显示吸的是哪个轴 / 有没有吸附提示；下次真机复现时截一下。
- **D 新增**：**D-fuzz 重复面残余**——种子 30/31/39/59/62（×104729）仍铸出同环第二张面（不崩、不丢边；`test/kernel-fuzz.test.ts` todo）；工具 = `node <tmp>/fuzzcount.ts`（见测试文件同款逻辑）+ 回放脚本思路（打印事件与面环）；下一刀从 face-lifecycle 认领/DIVIDE 铸造对「已有同环面」的处理入手。`待做`
- **待拍板**：③④⑤ → `ai-docs/20260907-vr-input-reflection.md`（视口模型退役 → 球面度量接口；射线拾取 + 手位移拖动（HOMER 增益）+ grip=锁；肩锚射线/1€ 滤波；gizmo 留到 rotate/scale 立项）——§4 五问等一句话。⑥ 工具热键 → wishlist（user「先保证画的好」）。真机未验（v0.4.1 全 headless 自验）。

### A17 虚拟屏 sunset：VR 指针帧改球面度量，selection box 之前不许有虚拟屏 — `done v0.4.5（2026-09-08，Claude Fable 5.1；user「sunset 吧，做不完也得做。虚拟屏就是严重卫生错误」）`
- **落地**：`PointerFrame` 从「坐标图」改成「度量」契约（`ray / distTo / distToSeg / distBetween / distToRing / dirCos / viewDir / forward / eps?`，`pointer-frame.ts`）；**两个帧是同一基契约的两个实现，不是 VR 继承桌面**（user：「不应该是 vr solver inherits flatscreen solver，而是两个 inherit a base class，这样 vr 就不会被 pc 里面手感参数给 hijack」）。桌面 `OrbitCamera` 的度量单位 = **fovY 的 1/800**（视口高度分数 ≡ 视场角分数；user 拍板 fov 度而非 css px），算术逐字复刻旧 solver/pick 内联版 → 233 golden 零变化；`angularPx` 只剩桌面框选专用。VR `XRPointerFrame` = 手柄 (origin, dir) + 球面角距（度）：点 = atan2 夹角、线段 = 到大圆弧、无限直线 = 到大圆、环 = 射线∩面内→0 否则最近边、方向比较在锚点切平面（「拖动角度」在 origin+dir 下的良定义）；**没有虚拟屏、没有 fov**；容差集 `EPS_VR_DEG` 独立角度常量（点 1.0 / 边 0.7 / 轴线 0.5 / 合成 1.2 / 拾取 1.0 / 近擦膜 2.0 / tap 0.4 / drag 1.2，playtest 各自调）。solver `frameEps` 按帧取容差；editor 的 tap/drag/磁滞/pp 换算全走度量。`XR_VIRTUAL_VP` → `XR_NOMINAL_VP`（光标坐标名义载体）。
- **单位纪律（user 2026-09-08）**：「per frame, per pixel 其实没问题，可怕的是 implicit unit…关键是你不能 implicit 依赖，而不是 explicit defined」→ 契约头注释显式声明两套单位。
- **未做**：VR 框选（§3.8 冻结投影平面 = 唯一合法的屏）；等价套件（§3.6 第 2 条）；ε_VR 常量真机 playtest。
- **user 原话（2026-09-08 凌晨）**：「虚拟屏不是应该 sunset 了吗？为什么一直还在。在 selection box 之前不应该有虚拟屏。。然后 z 轴线的容差。我的理解是度鼠标拖动的角度。不过确实在 origin + dir 里面这个概念是 ill define 的」「虽然现在除了 move 手感特别好，但是还是不应跟有虚拟屏」「虚拟屏 sunset 的代价有多大」「flatscreen 的 move 也 xyz align 吧试试？我发现 su 里面非 align 的情况我只会不爽。以及如果两个 30 halfangle cone 重叠的时候是 nearest win 这种道理你知道的对吧」
- **虚拟屏是什么**：`src/editor/xr-pointer-frame.ts`——v0.4.0 为了让桌面求解器零改动跑在 VR 里造的假屏：以手柄为眼、沿射线看、竖直视场 80°、800×800 假像素、光标恒在正中，用桌面同款 1/z 透视把世界点投上去量像素距离。ε（点 10 / 边 7 / 轴线 3.5 px @800）在它上面 = 角度（10 px = 1°）。反省稿 §1 判它不鲁棒、§2 给了替代（球面度量）。**事实记录**：2026-09-08 凌晨 AI 曾自作主张把视场 80°→110°（想让 Z 轴线容差从 0.35° 变 0.48°）又自作主张改回 80°，两次都不是 user 指令；现值 80°，ε 的角度值归本项一起定。
- **sunset 代价（AI 估，2026-09-08）**：**中等，一个 agent 一天的活，桌面 golden 可以零变化。**
  - 依赖面：`angularPx` 调用点 solver.ts 4 / pick.ts 4 / editor.ts 4（+ camera.ts 4 = 桌面实现本体）；测试里 53 处但都是桌面帧（OrbitCamera）。
  - 切法：`PointerFrame` 从「坐标图」改「度量」——去掉 `angularPx`，加 `angTo(p)`（点角距）与 `angToSeg(a, b)`（线段角距 + 最近参数），**度量单位定义为「角像素 @800/50°」**：桌面实现 = 现在的 px 距离原样（数值一字不变 → 全部 golden 与 ε 常量不动），VR 实现 = 球面角距 × (800/50°)。这样只有 VR 换数学，桌面零风险。
  - 逐点：solver `sd`/`lineScreenDist`（→ angTo/angToSeg；无限直线 = 大圆距离）、pick `sdist`/`sdistToSeg`（同上）、`nearFaceContaining`（剪影距 → 环边 angToSeg 最小值 + 射线∩面内判）、editor `applyHysteresis`（sd）、`inferAxisByDirection`（方向比较改在锚点的切平面上做：光标方向与轴方向都取 ⟂ 锚点方向的分量——origin+dir 下良定义，正好回答「z 轴线容差 = 拖动角度」在 VR 里怎么定义）、pp 的 `sc0/sc1` px/单位换算（→ angTo 差）。`marqueeScreen` 保留为**桌面专用**（VR 框选 = §3.8 冻结帧，那是唯一合法的显式投影平面，按下建、松手灭）。
  - 不动：`ray()`、`viewDir()`（已从手）、`forward()`（头向选平面）、遮挡（射线）、渲染。
  - 验收：现 golden 全绿 + 等价套件（反省稿 §3.6 第 2 条：同射线的桌面帧与 VR 帧吸附结果一致）+ 假会话探针。
- **调参纪律（user 2026-09-08 定性「严重纪律错误」，A17 必守）**：「每一个有物理意义的参数应该都是从物理意义定义的，而不是用几个会影响一大堆别的东西的参数里面网络出来的…我一开始说 flatscreen 用角度还是 css pixel，就是为了让参数尽可能地独立」→ 球面度量落地时 **ε_VR 是独立的角度常量集**（点/边/轴线各一个，量纲 = 度），不从视场或任何共享旋钮推导；桌面 ε 仍是 css px 常量集；两套各自可调、互不牵动。视场 80→110 那种「改 b 去动 a」的做法禁止。
- **已落到位的相关件（v0.4.4，本条不重做）**：move 自由拖 = 宽锥三轴三选一（桌面 VR 同一份代码，桌面也对齐了——user「flatscreen 的 move 也 xyz align 吧」= 已是）；两锥重叠取夹角最小 = nearest win；真并列（朝北时 Y/Z 投影同向）现取 x,y,z 顺序第一个 = Y，**待 user 裁**破平局规则（候选：手势位移 cue / 头俯仰 / 上次选择记忆）。

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
- **命名 neta 游戏**（user 2026-09-07：「因为我们现在有大量的创新，所以很多新原子，动词都可以 neta 游戏，比如缩小帽，生命之粉」）：新原子/动词的**内部代号**可以 neta 游戏（缩小帽=rig 缩放模式、生命之粉=编辑器内临时物理、超级手…）；用户可见文案仍归 user 定（家族命名美学=低调 normie，是否让 neta 露出到 UI 由 user 逐个裁）。
- **B14 与 WeebPaint 的交流方式**（user 2026-09-07 原话：「两个情况。1 是我希望我们的 savefile 可以 embed ora。2 是到时候有 bodypaint 了谁 master。一个方案是用某种跨 tab 交流方式，这样的好处是简单，还有别的可能的方案，甚至保持 weebpaint 彻底肢解后变成我们的一个 library。但反正场景就是。1. 不导入导出弄一大堆散文件的 2d 模式编辑贴图，图片，调色。2. weebpaint 级别笔触，multi layer, pixel accurate 的 3d painting。而不是我们重复造轮子。不过 weebpaint 的 bodypaint 纪元还八字没一撇呢！这里主要是想如何交流的问题」）`待拍板`。AI 看法（对话里）：场景 1 = **跨 tab / iframe + ora 交接协议**（BroadcastChannel/postMessage，同源同浏览器；CatsUp 是 3D 主，ora 被 WeebPaint「借出」期间 WeebPaint 是 2D 主，归还即锁回——git checkout 语义；iPad 后台标签会被杀，所以交接必须是显式事务不是常连）；场景 2 = **必须进程内**：笔触要在 3D 里投影到 UV，跨 tab 做不到像素级——把 WeebPaint 的笔刷引擎/图层/ora I-O 抽成 `@internal/paint-engine` 库，WeebPaint 自己成为它的第一个消费者（不是肢解 WeebPaint，是让它也用同一颗心脏）。savefile embed ora = zip 容器天然支持（附件）。两条不互斥：先 1 后 2。**user 2026-09-07 裁：场景 1 = iframe + ora 交接协议（「同意。这个比跨 tab 好」「我不喜欢跨 tab」）；跨 tab 各机制科普见对话（BroadcastChannel / postMessage / SharedWorker / storage 事件 / SW 信箱 / Web Locks / IDB 信箱）。** WeebPaint 侧已留便条 + 钩子：`../20260524 WeebPaint/ai-docs/inbox/20260907-from-catsup-paint-engine-and-ora-handoff.md` + 其 CLAUDE.md「开工先看便条箱」（user：「现在只有你活着。你 weebpaint 那里留个便条和看便条的钩子呗」；user 补：「weebpaint 无头骑士失败了很多次，可能只是因为缺第二个消费者逼出形状」→ 抽库时机 = CatsUp bodypaint 真要用时，不提前）。
- **B5 持久化/文件格式本体**：user 明示「SketchUp 1.0 做完、component group 摸清楚之后再定，你不要擅自做决定」；容器方向 = zip（自有 JSON authoring SSoT + 标准 glb bake）。**AI 不提案不预留。**

---

- **B13 group 纪元想法**（user 2026-09-07 原话，「帮我顺便记录几个 group 纪元的想法」；与远景剧透 `ai-docs/20260906-far-horizon-golden-format-and-ontology.md` 的 group/component 语义并读）`远景`：
  1. 「group 的核心是轴工具。但是不要和 vr 的地板搞混。也许可以用 grip 做 shorthand，这样的话用 grip 设置作画平面然后画，就很舒服？」
  2. 「group 应该是 transient 的，会 frequently group and ungroup. so it is a burden to name the group. or navigate the hierarchy. so just like sketchup. we do not display group name unless in internal inspection, and we do not need a hierarchy tree for groups. instead we just have enter and exit group with some grey out effects, just like sketchup」
  - 与 VR 输入稿的交叉：grip 已有两个候选语义（锁推断 / 设作画平面-轴工具 shorthand）——同一个键三个愿望，纪元开工前要拍板一个（反省稿 §4 第 2 问扩为三选）。

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
  **续（user 2026-09-07）**：「drop 也是一个动词，虽然就相当于从库内拖出+生命之粉。或者这是一种 asset placement 的模式。还记得我们最初讨论的那个提起一只 mascot 丢到场景里吗（虽然那个时候是用 pull up 来画不同高度和 orientation 的树。这么说的话对于 scale variant 的树，石头，用 pull up，对于 scale 固定的 props 用 drop down」→ **asset placement 两种模式**：**pull up**（scale 可变的东西：树、石头——从地面拉起决定高度与朝向，proposal 早期的 mascot/树讨论）vs **drop down**（scale 固定的 props：从库里拎出来丢下去，落地=一次「生命之粉」结算）。
- **原则（同一段 user 原话，与 A13 碰撞项挂钩）**：「这个和 vr/fps 的导航需求都逼出来：**我们的 geometry 是默认有碰撞的，除非用户 override or assign proxy**」→ 碰撞不是 VR 专属附件而是几何的默认属性；override（关碰撞）与 proxy（简化碰撞体）是将来的 per-几何/per-component 元数据（ECS 元数据落 `extras` 那一层）。
- **E14 愿望单：低多边形贴图地形（Cliff Maker 风格）**（user 2026-09-07 原话：「https://dreammixgames.itch.io/cliff-maker 这个进愿望单。不用他的代码（我觉得他不够自动化），但是我们要做的就是他要做的这个lowpoly texture based landscape，这个是我非常想要的美术风格。进愿望单到等我们开始做地形地编的时候再唤起。很久之后，可能是插件纪元吧。然后顺便先拍个板，这个是一个单独的type，而不是blender式的一个编辑动词」）：`park`，**唤起点 = 地形地编开工（预计插件纪元）**。参考物事实（Claude Fable 5.1 2026-09-07 抓页）：Blender 4.0+ 付费 addon（$8.99），流程 = 视口画地面轮廓 → 选边生成悬崖 → 调崖高/崖距 → 地面/崖壁/天花板分别贴图 + 自动 UV + 混合，作者路线含自动路径生成。**已拍板：地形 = 独立 type（组件包意义，见 far-horizon §3.5/§3.7），不是 Blender 式作用于任意网格的编辑动词**——它有自己的内核（轮廓/高度驱动生成）与动词集，不塞进制图模式的动词表；动词注册表的 `mode` 维度（A3）到时多一个值即可。取的是美术风格 + 「画轮廓→自动出崖+贴图」的自动化方向（要比它更自动），不取实现。
  **美术风格 golden**（user 2026-09-07 贴图「这个是golden」= itch 页第 3 张截图，本地存档 `~/jupyter/third-party/cliff-maker/golden-n64-style-render.png`，同目录 SOURCE.md；第三方字节不进 repo）。Claude Fable 5.1 看图记要点，供将来地形纪元对靶：① N64/PS1 世代（OoT 味）——低分辨率贴图放大；golden 图本身是双线性柔糊，但**采样滤波不是靶子的一部分**：user 2026-09-07「双线性 vs nearest 反而不同的艺术家都有，我是喜欢 nearest 的在现代大屏和 vr 上面比较 crispy。但是如果真做 psp 实机开发我可能会认真比一下 nearest vs bilinear」→ 默认 nearest（大屏/VR crispy），滤波做成可选；PSP 实机另议；② 天空 = 低清云贴图天空盒；远山 = 低多边形剪影 + 统一靛紫平涂（大气透视吃进贴图色）；③ 针叶林 = 低面数/面片贴图树成排；④ 地形本体 = 「草地地面 + 崖壁带」两材质：崖壁分层阶梯（strata 横纹）+ 苔藓草顶盖边，草地 tiling——正是 Cliff Maker 的 floor/cliff 双贴图 + 自动 UV 模型；⑤ 近景孤石 = 同一崖壁贴图套在小块体上。addon 编辑侧参考（截图 addon-*.png）：画闭合 loop 成地面 → 面内画 cut 分区 → 选边 Make Cliff 出崖带（cliff distance / height / noise / segments / 剖面 Cliff Curve）→ Auto UV 按面角度分地面/崖壁/天花板 → 树沿崖顶散布。**主要应用场景（user 2026-09-07 backnote：「quest 的 custom home 其实也是靠 matte painting 的哈哈」）**：Quest custom home 一类的 VR 环境——远景 = matte painting 天空盒（golden 图的靛紫远山 + 低清云即此），只有近景崖带/孤石/地面是真几何吃视差；地形 type 的第一落点按这个场景想。AI 注（非决定）：地面 loop + cut 的 2D arrangement 与制图内核同族，崖带 = loop 偏移 + 抬升；内核可共享不等于动词共享，type 独立是 user 拍板。
  **贴图那一半（Cycletex，user 2026-09-08「这个才是 cliff maker 承重的东西」）**：同作者的照片→复古贴图工具，调研 = `../20260524 WeebPaint/ai-docs/20260908-cycletex-photo-to-texture-study.md`（Claude Fable 5.1；**归属 WeebPaint**，user 2026-09-09「这个是weebpaint管的吧」，WeebPaint 总账 #59，E14 只是消费者）：透视展平 = 4 点单应性；无缝 = cycle 方格 + 最小误差拼缝不 crossfade；**背景抠图 = 两色键 → 只留连到画面外边的分量 → 形态学 → 边缘去污/外扩，「自动前景」= OpenCV GrabCut**（无模型，纯 Python+cv2+PIL，demo 依赖清单实证）；素材来源 = 自拍 + 图库（§6 列了公有领域/CC0/剪影库/「树顶着天」拍法）。retro filter 单独登记 WeebPaint 总账 #58。A/B 路线（GrabCut vs matting NN）未拍板。截图存 `~/jupyter/third-party/cycletex/`。
- **E8 油漆桶=拉矩形**（user 2026-09-06 原话「park进未来设计思路：油漆桶刷贴图采用拉矩形的方式，所以拉矩形可以同时设置贴图和UV」）：贴图纪元的思路存档，现在不做。

---

## F. 本日已 done（2026-09-06，供对账）

- 第三批（2026-09-07 凌晨）：**HUD 二稿**（C4）+ `fmtLen` ~ 标记 + 总账拍板落账（B7①/A7-A10），v0.3.2。
- 第二批：**侧面拖矩形吸底边案（D5）**：求解器手中集三律（链式溶解 / 膜由工具表态 / 平面黏性），v0.3.1。
- 第二批：**回字含岛 pp 三律修**（user 截图「回字 pull up 没有拉出墙，而是拉出了错误的东西」→ 井口封帽/内岛翻灭/顶环带出不生三错；立宪页 rev6「洞环三律」+ grill 单 §2.14 + 两案 golden，v0.3.1）。
- 深夜批：**自吸事故修**（矩形/线第二点吸到预演里自己上一帧的角点 = user「一 snap 一 snap」；`AlignQuery.hand` 改必填表态制 + `NO_HAND`，golden 钉死）。
- 晚批：**`on-face`「面上」吸附**（悬停未落笔也显示；`DrawPlane.face` 记平面出身）、**HUD 化**（user：「顶栏透明…类似游戏的那种 immersive hud…以后转 VR 会无疼。就 hud 化吧」→ 顶栏/状态栏全部变成视口内浮动胶囊，画布满屏；`#docTitle` 胶囊 = 将来的文件名位）。
0.3 app 壳纪元开工（lab 退役 → 正式 app）、透视相机、Workbench 渲染雏形、iPad 手势路由、OBJ 逃生口、PWA 壳、公开工坊道上线（`github.com/fangzhangmnm/catsup`，deploy.yml，dev = https://fangzhangmnm.github.io/catsup/dev/ ）、ε 角度语义、第二点「含点膜」修 + 线同修、多指 tap 撤销四坑、LICENSE MIT、旧探针进仓、远景剧透与黄金格式判断落档。详 `ai-docs/20260906-app-shell-epoch-landing.md`、`ai-docs/20260906-far-horizon-golden-format-and-ontology.md`。
