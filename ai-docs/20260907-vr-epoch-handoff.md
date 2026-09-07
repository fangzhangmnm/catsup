# CatsUp 0.4 VR 纪元 handoff —— 给一口气做完的那个 agent

> as-of v0.3.10 (00345c6) / 2026-09-07 · created by Claude Fable 5.1（本文件 = 交接指路牌；决策原话与细则全在总账 A13，本文不复制，只指路）
> user 授权：「0.4.0 优先做 vr，这不健康而且风险很大。但是这能逼出后面的每一个设计都 vr 第一公民，而且我预测我的大部分 doodle 时间都会在 vr 里面」「vr 第一公民的意思是不回 flatscreen 可以进去全 workflow」。

## 0. 先读什么（顺序）

1. `CLAUDE.md`（本仓）+ 上级家族 `../CLAUDE.md`（硬规则：vendor 一切无 CDN、无系统 alert、署名制、push prod 必问——本仓 prod 不做）。
2. **`ai-docs/20260906-ledger-next-agents.md` § A13**（VR 第一公民：user 三轮原话 + AI 计划 + 全部裁决；本 handoff 的 SSoT）。顺带看 A2（接口改射线命名）、A5（UI 模型/渲染分层）、E12/E13（不做，但影响形状）。
3. `ai-docs/20260902-kernel-constitution.md`（内核不动；动了必回写）+ `ai-docs/20260901-snap-model.md`（求解器 = 射线 + 角距，VR 靠它零改数学）。
4. **RealHome（user 真实 gamedev 经验，抄它）**：`../20260520 RealHome/docs/20260521-vr-locomotion.md`（三层 rig 模型）、`docs/20260629-character-controller.md`（胶囊+悬挂+台阶，固定 60 Hz，HMD 姿态永不插值）、`src/player.js` `src/collision.js` `src/xrControls.js`（键位、haptics）。
5. 代码入口：`src/editor/editor.ts`（工具手势状态机）、`src/editor/solver.ts`（对齐引擎；`OrbitCamera` 依赖就是 A2 要切的缝）、`src/editor/render3.ts`（唯一 three 出口）、`src/app/main.ts`（HUD 接线，视图菜单/☰ 菜单都是数据驱动 items）、`src/app/gestures.ts`。

## 1. 胜利条件（全部满足才算 0.4.0）

- **桌面飞行/步行相机**：WASD + Q/E 上下 + Shift 冲刺 + Space 跳 + Ctrl 蹲 + 鼠标视角 + ←/→ snap turn；与 VR 共用同一 player 模块（不戴头显验证移动/teleport/碰撞的唯一途径）。
- **随时进出 VR**（Quest 浏览器）：☰「进入 VR」只在 `navigator.xr` 支持 immersive-vr 时出现；`sessionend` 回 flat，模型与工具状态原样。
- **VR 内全 workflow 不回 flat**：线 / 矩形 / 推拉 / 橡皮 / 选择（阶段长按 + 震动代替双击三击）+ 撤销重做 + 视图 + 退出 VR + 状态行，全部在**手腕面板**上。
- **移动**：左摇杆走（按下冲刺）；右摇杆 dpad：左右 snap turn、前推=抛射体 teleport 充能、后推=回上一落点；充能中左摇杆 dpad：上下=发射速度档、左右=落地朝向；A 跳 B 蹲；noclip 时 A/B=上下飞。
- **碰撞**：三球胶囊 + 悬挂 + 台阶（RealHome 移植）、max slope、安全地板 = min(0, 模型最低 z)、teleport 落点合法性（法向 + 头顶净空）。几何默认全参与碰撞。
- **测试**：现 179 绿不退；player/teleport/输入 dpad 纯函数 golden；`scripts/probe-boot.mjs` 与 `test/probes/*` 全绿；新增 `test/probes/probe-walk.mjs`（合成键盘驱动飞行相机穿过盒子被挡/跳上去）。

## 2. 切口与模块（要求：player 深模块，不和别的代码混）

```
src/player/
  player.ts        纯状态机 step(input, dt, world) → 新状态；SSoT = pos / heading / trackingOrigin / headY / noclip / lastTeleport
  world-query.ts   interface WorldQuery { groundBelow(p, maxDrop) ; sweepCapsule(spheres, delta) ; arcHit(origin, v0, g) ; floorZ() }
  input.ts         InputFrame 类型 + dpad 判定（幅值≥0.6 + 60° 扇区 + 磁滞）+ 边沿检测 + teleport 冷却（松手后 300 ms 忽略后拉；回上一点需≥0.6 保持 150 ms）
  flat-input.ts    键鼠 → InputFrame
  xr-input.ts      xr-standard gamepad → InputFrame（trigger[0] grip[1] 摇杆按下[3] A/X[4] B/Y[5]）；haptics 按标准 pulse 写，不打补丁
  teleport.ts      抛射体：v0 沿手柄射线 + g，采样折线逐段 arcHit；顶档=直线；v0 随 rig 缩放 √s
src/editor/
  pointer-frame.ts A2：interface PointerFrame { ray(); angularPx(p); viewDir(p) }——OrbitCamera 与 XR 控制器各一实现；solver/pick 改吃它（数值零变化，A2 验收）
  collision-world.ts  WorldQuery 的内核实现：膜三角化（`faceTriangles` 已有）→ 三角汤；小模型暴力，>N 三角再 BVH
  render3.ts       + rig Group（player→rig 每帧同步，渲染帧插值 rig、HMD 不插值）+ renderer.xr + 控制器射线/光标球（不用 GLTF 工厂）+ 手腕面板渲染器
src/app/
  vr.ts            会话进出、菜单项、sessionend 复位
  ui/wrist-panel.ts  消费与桌面 HUD 同一份数据驱动模型（items()/onPick、notice、状态行）；文字/图标 canvas 2D 烤纹理（UI 显示用途）
```

A3（动词注册表）不是本轮必做；若 editor.ts 的 switch 妨碍接第二种指针，做 A3 也可以，但先问 user 一句。A4（RenderEngine 切口）不做，XR 相关全部留在 render3.ts。

## 3. 不许

- 不动 `src/kernel/`（动了必回写立宪页并说明）。
- 不做 A15 草稿箱（storage 红线待 user「批」）、不做 A12 网格/北字、不做 offset、不做 rotate/scale。
- 不引新依赖（three 已 vendored；控制器模型、SDF 字体库一律不要）。
- 不依赖右键；不用系统 alert/prompt/confirm；用户可见文案中文；dev 诊断随意。
- 不在 doc/memory 里写未经 user 说过的规则；引用原话去总账 A13 抄。
- 不要 nudge user 全量真机：headless + Immersive Web Emulator 自己先验，Quest 真机只请 user 戴一次验会话。

## 4. 验证配方

1. `npm test`（golden 优先：player 步进、dpad 判定与冷却、抛射体落点/直线档/合法性、snap turn 边沿、安全地板、胶囊挡墙与台阶）。
2. `python3 -m http.server 8765` → `node scripts/probe-boot.mjs` + `test/probes/probe-{hover,pen,touch}.mjs` + 新 `probe-walk.mjs`。
3. 桌面 Chrome 装 Meta「Immersive Web Emulator」扩展（dev 工具，不进仓）验：进出会话、两手柄键位映射、手腕面板可见可点、trigger 画线。
4. 发版：`./bump.sh v0.4.0-YYYY-MM-DD` → `bash scripts/build.sh` → commit（署名）→ `git push github main && git push origin main` → dev 约 1 分钟后 https://fangzhangmnm.github.io/catsup/dev/ ；然后请 user 戴 Quest 验一次。
5. 落地后回填：总账 A13 状态改 `done <commit>`，新冒出来的事只进总账；`ai-docs/20260901-snap-model.md` §7 记 PointerFrame 接口名；立宪页只在内核动了才改。

## 5. 仍待 user 一句话（开工前问，不阻塞 player 模块）

- 发射速度档的常数与档数（下限档 = 一般 VR 游戏舒适值，playtest 定；顶档直线）。
- 手腕面板挂哪只手、面板上元素顺序（工具 / 撤销重做 / 视图 / 退出 / 状态行）。
- A3 动词注册表是否顺手做。

## 6. 汇报风格（user 偏好，见 memory：终止 nudge、报告短）

交互讨论、拍板后才动码；每个可交付切片（player 模块 + 桌面相机 → 碰撞 → XR 会话 → 手腕面板 → 工具接入）落一次 commit 并在对话里一句话报；不要每步问；不确定就说不确定，没跑的别说跑了。

## 7. 建议的 skills

- `tdd`：player / teleport / dpad 先写 golden 再实现（纯函数，正合适）。
- `run`：起本地服务跑探针、截图。
- `diagnose`：真机/模拟器上出怪现象时走复现→最小化→假设→仪表。
- 不用 plan mode（user 用不惯，要对话）。

---

## 8. 落地回填（2026-09-07 挂机轮，Claude Fable 5.1；as-of v0.4.0）

- 胜利条件 §1 逐条：桌面步行/飞行相机 ✓（视图菜单「步行相机/穿墙飞行」，probe-walk 15 项）· 随时进出 VR ✓（☰「进入 VR」仅 isSessionSupported 露出；sessionend 模型/工具原样，假会话探针验）· VR 内全 workflow ✓（线/矩形/推拉/橡皮/移动 = 扳机；选择 = 阶段长按+震动；撤销重做/删除/穿墙/回出生点/退出 VR/状态行 = 手腕面板；X/Y 也撤销重做）· 移动 ✓（左摇杆走+按下冲刺；右摇杆 dpad 左右 snap/前推充能/后拉回上一点；充能中左摇杆 dpad 档位/朝向；A 跳 B 蹲；noclip A/B 上下）· 碰撞 ✓（三球胶囊+悬挂+台阶+max slope+安全地板+落点合法性）· 测试 ✓（219 绿；probe-boot/hover/pen/touch/walk/xr-fake 绿）。
- §2 切口按图落地；差异：`collision-world.ts` 是**多边形汤**不是三角汤（膜本来就是平面多边形含洞，球/线段直接对它求最近点/求交，不用 earcut）；A3 没做；`xr-input.ts` 读原生 WebXR（不经 three 控制器对象），three 只在 render3 画射线/光标球/面板。
- 追加机制：**freeze / coyote**（user 挂机中追加，原话见总账 A13 第四轮）。
- §5 待 user 的三问 + 挂机攒的问题 → 总账 A13「待 user 一句话」12 条。
- 真机：只请 user 戴 Quest 进一次会话（或桌面 Chrome 装 Immersive Web Emulator）验会话进出与键位；逻辑层已被假会话探针钉死。

edited by Claude Fable 5.1 2026-09-07

## 9. 真机首轮反馈回填（2026-09-07 晚，Claude Fable 5.1；as-of v0.4.1）

user 戴 Quest 一轮，九条 + 追加原话全在总账 **A16**。已落 v0.4.1：尺度（1 m 网格 / 人体尺度默认相机 / 毫米级 zoom 下限）、teleport 充能中工具停摆、双击跳切 noclip + 水平飞、`render3.ts` retained mode（3 draw call、键缓存、XR foveation 0、粗线 XR 分辨率）、吸附小球缩小 + 深度测试、充能紫点不显示。**#3/#4/#5（拾取奇点 / 6-DOF 输入 / grip 锁）= `ai-docs/20260907-vr-input-reflection.md` 反省稿，不动码，等 user 拍板** §4 五问。
- **v0.4.2 追加**：内核「边 4-3 已存在」案（容差对齐 + splitEdge 复用，fuzz/golden）、错误边界三层 + VR 字幕位 toast、1/z 镜像止血、推拉路径 vp/fvp 错配修；反省稿修订为「只有手的射线」。细节总账 A16 第二轮。
- **v0.4.3 追加**：kernel fuzz（随机操作 + 拓扑不变量）抓「edge N 不存在」整类 = 面环留死边，五处 face-lifecycle 修法（立宪 §5「面环自洽」）；flatscreen 护栏 lint（build.sh 0.65）；头向选平面；出生点 (0,−3) 朝北；错误 toast 带栈帧。残余重复面 5/80 种子 = 总账 D-fuzz。
- **v0.4.5 追加**：A17 虚拟屏 sunset 落地——PointerFrame 度量契约、XRPointerFrame 球面角距 + 独立 EPS_VR_DEG、桌面 golden 零变化。剩 VR 框选（§3.8 冻结平面）/ 等价套件 / ε_VR playtest。
