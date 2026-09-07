# CatsUp 待办总账 —— 一条 = 一个新 agent 能独立吃下的活

> as-of v0.3.2 / 2026-09-07 凌晨（第三批：HUD 二稿 + 拍板落账）· created by Claude Fable 5.1
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

### A10 吸附：整数 incremental + 绝对网格 + 内部单位 SI — `待做`（user 2026-09-06「两种吸附都要同意」「内部单位永远是 SI，这个应该是我们的纪律吧」）
- **纪律：内部单位 = 米（SI），永不改**；顶点**身份**已在 Q=1e-6 格点（= 1 µm 格；`ptKey3` 取整），显示单位可切（mm / cm / m / ft-in）；英制只是显示与网格预设，不进内核（user 曾想强推英制，见对话 2026-09-06：结论=网格步长比单位制更决定手感；关卡编辑常用二进制网格，Source 引擎 16 hu = 1 ft 即此传统）。
- **incremental**（SU length snapping / Blender 默认）：沿手势方向对长度标量取整 L = n·g（n 整数），点 = 锚 + L·dir，**不累加**（每帧从锚点重算，不是上一帧 +g），结果再落格点 → 0.1×10 ≠ 1.0 那类累计误差结构性不存在（0.30000000000000004 与 0.3 同一格点=同一顶点）。永远让位于几何推断（有 0-D/1-D 目标命中就不取整）。
- **卫生项（落地时顺手，动内核一行须回写立宪页）**：现状 `addEdges` 入口不量化**存储**坐标（只 `moveVertices` 量化目标），格点身份对、存值可带 1e-17 级噪声（只影响 OBJ 导出/显示的尾数美观，不影响几何）。改法：入口 `quantize3`；且 `quantize` 改成 `Math.round(x*1e6)/1e6`（1e6 精确可表示，商正确舍入；现在的 `/Q·Q` 走 1e-6 这个不精确常数，理论上有极小概率差 1 ulp）。
- **absolute**（Blender Absolute Grid Snap）：把**画在地上的那张网格**当 0-D 目标池，rank 最低、只在无几何推断时兜底；WYSIWYG——吸画出来的格线，不吸看不见的自适应细分；格距 HUD 定（预设 1 m / 10 cm / 1 cm，另给二进制预设给关卡设计）。建筑党基本不用，关卡设计必用（user）。
- **显示（user 2026-09-07 拍板）**：默认单位 **米**；小数「优雅一点，多 truncate 几位，但是让用户知道不是 exactly」→ SU 同款 **`~` 前缀**：截到显示位数后若截掉部分 > 格点量子就前缀 ~（`editor.fmtLen` 已落，现用于推拉 h；单位化后全部数字显示走它）。
- **锚点链毒点（user 2026-09-07：「锚点1算锚点2锚点2算锚点3，或者一个看上去像整数的锚点，这个是最毒的」）**：对策两条——①每个锚点入库即量化成精确 6 位小数（上面卫生项），链上每一步都从干净小数重算，噪声每步归零、不传递；②「看上去像整数」= 真几何偏差（斜向长度重建/交点）而非算术噪声，显示层用 ~ 揭穿，吸附层靠「几何推断优先于网格」兜底（画到 1.0 附近时先吸到既有 0.999999 顶点，不会造出 1 µm 双胞胎）。
- **待拍板**：默认格距、默认视图尺度（内部=米后 camera 默认 halfH 要改成人体尺度）、两种吸附的开关放 HUD 哪里。

---

## B. 待拍板（要 user 一句话；不急，各自纪元前）

- **B1 group 的精确形状**（group 纪元前）：AI 读法 = 同一顶点池 + context 标签（立宪页 A3 context 槽），group 变换烘进顶点坐标，渲染看不见 group；user 已澄清 drill L83「一个池」指物化层 VBO。要确认的推论：group 内 move 时边界是 sticky 判定的墙，但平面注册/面识别仍在同一世界坐标里跑。SSoT：`ai-docs/20260906-far-horizon-golden-format-and-ontology.md` §3.2。
  **2026-09-07 user 追问**：「group 变换烘进顶点坐标：也许 group 就不带 axis 的语义，sketchup 是这样的吗？只有 component 才带？…redefine axis 是一个很重要的操作，group 应该需要，不应该为了 axis 用 component」。**AI 答（SU 事实）**：SU 的 group 也有自己的轴/变换（API 里 Group 有 `transformation`，进 group 编辑态可 Change Axes；SU 内部 group 就是「只有一个实例的 component」）。**与「烘进顶点」不矛盾**：顶点存世界坐标（渲染=三角汤、无 scenegraph），group 另存一个**轴框**（原点+正交基）当纯编辑语义——move/rotate/scale 的枢轴、进组编辑时推断轴跟着组轴转（SU 同款）、将来 component 定义空间的种子；旋转组=顶点转+轴框转，渲染层永远看不见它。Redefine axis = 只改轴框、顶点不动。**待 user 一句话认可即写进 far-horizon §3.2。**
- **B2 `type` 当组件包而非封闭枚举**（数据结构纪元）：`far-horizon` §3.7。**user 2026-09-07「同意」→ 已裁**（数据结构纪元开工时照此）。
- **B3 透视视场角**：~~50° 还是 SU 的 35°~~ **user 2026-09-07 裁：50°**（「现在的蛮舒服…我们更游戏血统所以这个可以」）。
- **B4 UI 偏好走 localStorage 的两个开关**（「手指也能画」「实验台」）保留与否——不是模型数据，user 未反对。
- **B6 推断线 ε**：~~是否随视口放大~~ **user 2026-09-07：「这个不就是我当时让你变回角度 based 的原因吗？以及点松线紧可以试试」→ 角度制（按视口高等比）不动；「点松线紧」试验已落 v0.3.2：`EPS.line` 5→3.5（点 10 / 边 7 / 合成 12 不变）**。`待看`：手感嫌线太黏/太滑就再调这个数（哨兵测试随改）。
- **B7 Offset 工具**（user 2026-09-06：「然后我想要offset了。sketchup是只能针对一个面的吗？然后对于复杂的几何情况你怎么判断。然后offset多了退化了你能搞得定吗（比如一些边长变成0只会拓扑变还能继续offset）顺便offset还能offset到更大的外面，sketchup会长膜」）`待拍板`（讨论中，未 grill 完）。AI 提案摘要（对话里已答，供开工 agent 参考、非定案）：offset = **纯 2D 函数 + `addEdges`，零新内核原语**（与 pp v1 同精神）——在膜的 PlaneRegistry 基里对环做 miter 平行偏移 → 自交/退化用「按绕数保正区」剪枝（Clipper 式：塌成零长的边自然消失、翻转的负绕数瓣丢弃，任意 d 都良定义，边塌缩=拓扑变照常继续）→ 剪枝后的环当手势线画上去：向内 = 原膜被 DIVIDE 成内片+环带；向外 = 环带区外环含手势 → A4 直接 BIRTH（SU「长膜」零特例）。作用对象：单膜（全部环 or 只外环——SU 疑似只偏外环，待 web SU 核）或一串共面连通边（开链两端不封口）；不做多膜（SU 亦无）。d 通道 = pp 高度通道同构（标量对「偏到某点/某边」候选集咬合）+ VCB 以后。拐角=miter 尖角（SU 同款，凹角不倒圆）。**待 user 拍：①带洞膜偏不偏内环 ②d 超过全塌缩时=无操作还是钳到最后有效 d ③是否先只做膜不做边链**。
  **①续（user 2026-09-06 核实「su确实是只外环」并问带内环有何弱点）**：技术上无弱点——按「区域侵蚀」做（全部环一起 miter + 绕数保正区剪枝）比逐环更稳，洞环长大撞上外环/别的洞会自然合并；逐环 miter 才会撞出垃圾。弱点在 **UX 的意图歧义**：庭院平面要走廊（内外环都要偏）vs 窗洞外框（只偏外环、洞别动）两种需求都常见，任何单一默认都有一半人要多操作。AI 提案 = **默认偏「光标参考边所在的那一个环」**（悬停高亮哪个环一目了然，外环/洞环皆可；洞环向内偏 = 洞里长出环带膜，A4 免费）+ **修饰键/HUD 片切「整个区域」**（全部环）。SU 的「只外环 + 选洞边再偏一次」= 这个方案的子集。**user 2026-09-07 拍板「默认偏光标参考边所在的那一个环 同意」**（①已裁；②③仍待）。
- **B8** → 已转 A7（user 同意）。
- **B9 Move 轴锁 / 面锁 / 法向 / 关闭吸附**（user 2026-09-06：「move: 加上xyz轴吸附的快捷键和触屏方案」「能不能还有别的比如xy yz zx吸附，以及没有有法面吸附。和blender的视口吸附？这个是个UX问题」「以及如何关闭snap」）`待拍板`。参考口径：SU=方向键 ←绿 →红 ↑蓝 ↓平行/垂直于推断边、Shift=锁住当前推断（悬在膜上时=锁「面上」即面锁）；Blender=X/Y/Z 轴锁、Shift+X/Y/Z 面锁（排除该轴）、Ctrl 按住临时反转吸附开关。**键盘部分已拍板转 A9**（两套都收 + Shift+方向键=Blender 面锁语义）；本条剩 **触屏/VR = HUD 锁片行**（X·Y·Z·XY·YZ·ZX·N 法向·⊥∥，move/line/rect 手势中浮现，点亮=锁、再点=解锁），关闭吸附=按住 Alt（桌面）/HUD 磁铁片（触屏）= 求解器 `alignSources` 清空只留平面约束。「视口吸附」待 user 澄清是指 Blender 的视图平面（View 方向）还是屏幕网格。
- **B10** → 已转 A10（user「两种吸附都要同意」+ 内部单位 SI 纪律）；剩余细节（默认格距/视图尺度/开关位置/显示单位默认）在 A10 末尾待拍板。
- **B5 持久化/文件格式本体**：user 明示「SketchUp 1.0 做完、component group 摸清楚之后再定，你不要擅自做决定」；容器方向 = zip（自有 JSON authoring SSoT + 标准 glb bake）。**AI 不提案不预留。**

---

## C. 待看（user 过目即可，不阻塞）

- **C1 `push-pull` 图标**：fable 自画，图标库 `PENDING` 层，user「先用你的」；过目后进库/打回/删归 user（`20260708 SVG Icons/TODO.md` 待过目表）。
- **C2 README 与公开的 ai-docs**（含大量 user 原话）——公开工坊道本意，抽空扫一眼。
- **C4 HUD 二稿过目**（user 2026-09-07 口径：「HUD 你先看着办，以后要好好收，先放视图里面。undo redo 不要放顶上…hud 应该更参考游戏一点。CatsUp 这个字不用占地方不够 zen，三条杠和 undo redo 要不要放在左栏，把顶上空了，然后视图放右栏的点开菜单？…无 background 的字…background 弱一点的…version 标识确实需要，左下角的状态显示我也觉得很重要，相当于 rpg 游戏的对话」）：v0.3.2 落地 = 顶上清空、左栏 ☰/撤销/重做/删除+分隔+工具、右栏 视图弹出+全览、标题字撤、栏=弱玻璃无边框、状态/版本=无背景白描边字、状态行最多两行超出省略。**「以后要好好收」= 以后再整轮**（HUD 锁片/吸附开关/单位显示进来时一起）。
- **C3 iPad 真机**：Pencil 悬停吸附、手指=相机、双指平移捏合、双指 tap 撤销/三指重做、手掌拒绝（pen 后 600ms 掌触门）。桌面 user 已看（2026-09-06）。

---

## D. 老 bug 尾巴（0.2 推拉纪元遗留，需 user 参与）

- **D1 湮灭疑案六变体** `等 user 数据`：user 09-03 报「推平到底面还有膜」类现象；六种变体在 commit 层全对，等 user 精确复现步骤。案卷：`ai-docs/20260901-pushpull-grill-sheet.md` §v3.1 附近 + 立宪页「扰动相」。
- **D2 悬置判据** `等 user 数据`：推拉时 ⊥ 邻面「随行伸缩」还是「留守」（盒墙 vs 铰链地板悖论），判据不在局部方向代数，要 user 去 SU 做实验。案卷：grill 单 §v3.1「悬置判据」。
- **D3 pp「挡」（Offset-limited）** `待做但不急`：滑行边撞到别的顶点即卡住（E7 判据）；实现形状 = pp 约束集加 h 上限，零拓扑。grill 单 §2.9。
- **D4 F4 / 多选 pull / VCB 数值输入** `park`（user 已 park）。
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
- **E8 油漆桶=拉矩形**（user 2026-09-06 原话「park进未来设计思路：油漆桶刷贴图采用拉矩形的方式，所以拉矩形可以同时设置贴图和UV」）：贴图纪元的思路存档，现在不做。

---

## F. 本日已 done（2026-09-06，供对账）

- 第三批（2026-09-07 凌晨）：**HUD 二稿**（C4）+ `fmtLen` ~ 标记 + 总账拍板落账（B7①/A7-A10），v0.3.2。
- 第二批：**侧面拖矩形吸底边案（D5）**：求解器手中集三律（链式溶解 / 膜由工具表态 / 平面黏性），v0.3.1。
- 第二批：**回字含岛 pp 三律修**（user 截图「回字 pull up 没有拉出墙，而是拉出了错误的东西」→ 井口封帽/内岛翻灭/顶环带出不生三错；立宪页 rev6「洞环三律」+ grill 单 §2.14 + 两案 golden，v0.3.1）。
- 深夜批：**自吸事故修**（矩形/线第二点吸到预演里自己上一帧的角点 = user「一 snap 一 snap」；`AlignQuery.hand` 改必填表态制 + `NO_HAND`，golden 钉死）。
- 晚批：**`on-face`「面上」吸附**（悬停未落笔也显示；`DrawPlane.face` 记平面出身）、**HUD 化**（user：「顶栏透明…类似游戏的那种 immersive hud…以后转 VR 会无疼。就 hud 化吧」→ 顶栏/状态栏全部变成视口内浮动胶囊，画布满屏；`#docTitle` 胶囊 = 将来的文件名位）。
0.3 app 壳纪元开工（lab 退役 → 正式 app）、透视相机、Workbench 渲染雏形、iPad 手势路由、OBJ 逃生口、PWA 壳、公开工坊道上线（`github.com/fangzhangmnm/catsup`，deploy.yml，dev = https://fangzhangmnm.github.io/catsup/dev/ ）、ε 角度语义、第二点「含点膜」修 + 线同修、多指 tap 撤销四坑、LICENSE MIT、旧探针进仓、远景剧透与黄金格式判断落档。详 `ai-docs/20260906-app-shell-epoch-landing.md`、`ai-docs/20260906-far-horizon-golden-format-and-ontology.md`。
