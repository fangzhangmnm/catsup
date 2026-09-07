# CatsUp 待办总账 —— 一条 = 一个新 agent 能独立吃下的活

> as-of v0.3.0 (b4adf6a) / 2026-09-06 晚 · created by Claude Fable 5.1
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

---

## B. 待拍板（要 user 一句话；不急，各自纪元前）

- **B1 group 的精确形状**（group 纪元前）：AI 读法 = 同一顶点池 + context 标签（立宪页 A3 context 槽），group 变换烘进顶点坐标，渲染看不见 group；user 已澄清 drill L83「一个池」指物化层 VBO。要确认的推论：group 内 move 时边界是 sticky 判定的墙，但平面注册/面识别仍在同一世界坐标里跑。SSoT：`ai-docs/20260906-far-horizon-golden-format-and-ontology.md` §3.2。
- **B2 `type` 当组件包而非封闭枚举**（数据结构纪元）：`far-horizon` §3.7。
- **B3 透视视场角**：50° 还是 SU 的 35°。
- **B4 UI 偏好走 localStorage 的两个开关**（「手指也能画」「实验台」）保留与否——不是模型数据，user 未反对。
- **B5 持久化/文件格式本体**：user 明示「SketchUp 1.0 做完、component group 摸清楚之后再定，你不要擅自做决定」；容器方向 = zip（自有 JSON authoring SSoT + 标准 glb bake）。**AI 不提案不预留。**

---

## C. 待看（user 过目即可，不阻塞）

- **C1 `push-pull` 图标**：fable 自画，图标库 `PENDING` 层，user「先用你的」；过目后进库/打回/删归 user（`20260708 SVG Icons/TODO.md` 待过目表）。
- **C2 README 与公开的 ai-docs**（含大量 user 原话）——公开工坊道本意，抽空扫一眼。
- **C3 iPad 真机**：Pencil 悬停吸附、手指=相机、双指平移捏合、双指 tap 撤销/三指重做、手掌拒绝（pen 后 600ms 掌触门）。桌面 user 已看（2026-09-06）。

---

## D. 老 bug 尾巴（0.2 推拉纪元遗留，需 user 参与）

- **D1 湮灭疑案六变体** `等 user 数据`：user 09-03 报「推平到底面还有膜」类现象；六种变体在 commit 层全对，等 user 精确复现步骤。案卷：`ai-docs/20260901-pushpull-grill-sheet.md` §v3.1 附近 + 立宪页「扰动相」。
- **D2 悬置判据** `等 user 数据`：推拉时 ⊥ 邻面「随行伸缩」还是「留守」（盒墙 vs 铰链地板悖论），判据不在局部方向代数，要 user 去 SU 做实验。案卷：grill 单 §v3.1「悬置判据」。
- **D3 pp「挡」（Offset-limited）** `待做但不急`：滑行边撞到别的顶点即卡住（E7 判据）；实现形状 = pp 约束集加 h 上限，零拓扑。grill 单 §2.9。
- **D4 F4 / 多选 pull / VCB 数值输入** `park`（user 已 park）。

---

## E. park / 不做（免得再问）

- **E1 zip 容器本体**：方向定了（user「选 zip 吧…有 glb 的话丢 authoring 人类创意不丢」），本体等 SU 1.0。
- **E2 glTF 导出逃生口**：user「不用了」。OBJ 逃生口保留（`src/editor/obj-io.ts`，特例非正式导出）。
- **E3 prod 首推**：user「不做」。有需要时 `git push github main:prod` + 硬规则 #5 必问。
- **E4 Session 无头化**（editor 去 three/DOM/performance.now）：user「不知道，先这样」。A4 落地后 three 自然不进 editor，剩 canvas 尺寸与 clock 两处。
- **E5 Ketchup 改名**：关闭。user「就是 catsup 吧。weebpaint 已经把二次元属性定死了」。
- **E6 透视下 `occludedSpansOnLine` 取线段中点视向作常向量**（近似）：除非抖动复发，不动。
- **E7 `experiments/sketchpad.html`**：可丢区，不管。

---

## F. 本日已 done（2026-09-06，供对账）

- 深夜批：**自吸事故修**（矩形/线第二点吸到预演里自己上一帧的角点 = user「一 snap 一 snap」；`AlignQuery.hand` 改必填表态制 + `NO_HAND`，golden 钉死）。
- 晚批：**`on-face`「面上」吸附**（悬停未落笔也显示；`DrawPlane.face` 记平面出身）、**HUD 化**（user：「顶栏透明…类似游戏的那种 immersive hud…以后转 VR 会无疼。就 hud 化吧」→ 顶栏/状态栏全部变成视口内浮动胶囊，画布满屏；`#docTitle` 胶囊 = 将来的文件名位）。
0.3 app 壳纪元开工（lab 退役 → 正式 app）、透视相机、Workbench 渲染雏形、iPad 手势路由、OBJ 逃生口、PWA 壳、公开工坊道上线（`github.com/fangzhangmnm/catsup`，deploy.yml，dev = https://fangzhangmnm.github.io/catsup/dev/ ）、ε 角度语义、第二点「含点膜」修 + 线同修、多指 tap 撤销四坑、LICENSE MIT、旧探针进仓、远景剧透与黄金格式判断落档。详 `ai-docs/20260906-app-shell-epoch-landing.md`、`ai-docs/20260906-far-horizon-golden-format-and-ontology.md`。
