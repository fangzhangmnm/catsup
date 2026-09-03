# Snap 体系模型 SSoT（数学定义 + 现值 + 待裁台账）

> as-of v0.1.2 / 2026-09-01（创建日）· created by Claude Fable 5
> 定位：snap 从脚手架转正过程中的**现行模型唯一出处**。演化史散在
> `20260901-lab-qol-round1.md` §1/§4-§7 与当日对话；重构抢救以本文为准，改模型必须回写本文。
> **一页纸数学定义 = `20260901-solver-math-onepager.md`**（改实现必回写）。
实现 = **`src/playground/solver.ts`（阶段二手术后真身：solvePoint 纯函数 + buildConstraints 情境构建器）**；
`pick.ts::snapPoint` 已降级兼容壳（叙事映射，调用方迁完即删）。测试 = `test/solver.test.ts`
（property 不变量：解在 ε 邻域/确定性/解释完整/字典序/秩表哨兵）+ `test/snap-align.test.ts`（场景 golden）。

## 1. 元逻辑三律（2026-09-01 由 S1-S4 标本收敛，user 认可）

1. **维度优先律**：点击的解释按维度从低到高——0-D（顶点类）> 1-D（边/约束线）> 2-D（面/平面）。
   低维赢家出现时高维解读作废（点到顶点=要这个点，不是要它背后的面）。
2. **延迟承诺律**：未被本次点击真正决定的自由度，留给后续点击锁（矩形平面看第二点是特例化）。
3. **单一供餐律**：工具不许私自 raycast，全部消费同一条 inference 管线（SU 验收③；违律案=S3 墙角锁面）。

## 2. 词汇表 v1（已实现）

- **0-D 点目标**：endpoint、origin（原点=永久目标）、midpoint。
- **1-D 约束线**：on-edge（边段）；轴锁（过 anchor 的世界 XYZ）；from-point 共轴（充能源 × 世界三轴）。
- **合成（0-D 涌现）**：边×轴（On Edge from Point）；轴×轴（含空中角点）。
- **派生相交轨迹（2026-09-01 user 拍板：「snap 时生成线和点用户可以描」——虚拟目标，描到才成真几何）**：
  **交点**（线×线载线段外相交，rank 65）；**交线**（面×面，平面∩平面裁到两膜区域，rank 55，整段高亮可描）。
  几何自愈层对面穿插**刻意摆烂与 SU 对齐**（不留疤）；比 SU 强处=交线/交点常驻可吸附，
  描一笔=用户亲手的 Intersect Faces（经正常手势 dividing，疤痕全用户署名）。
- **2-D**：画线平面（面下锁面/地面）；矩形平面三规则（§6）。
- **parked**：平行、垂直、切线、延长线（edge extension）、交点吸附、on-face 作为显式 snap 类。

## 3. 来源制 = 充能（Q1 拍板 2026-09-01）

from-point 源点 = **anchor（手势起点，天然充能）+ 原点（永久）+ 充能点（LRU 3，紫点反馈）**。
充能途径：hover 端点/中点停留 ≥300ms；**拖动手势中 120ms**（无悬停设备兜底，user 拍板）；
**落笔端点自动充能**。设备事实：Safari 16.1 起 web 有 Apple Pencil hover（16.4 tilt/azimuth，
限 M2+/Pencil2+）；S Pen hover 走标准 pointer events。

**幽灵 align 定理**（来源制的存在理由，2026-09-01 标本）：正交投影下，任何不顺视线的 3D 直线，
其投影扫过光标时，线上必存在一点精确落在拾取射线上（某深度）——**屏距滤波原理上无法定向深度**，
ε 调参无解。唯一非调参解 = 把候选源缩到用户指过的点（意图定向深度）。全顶点常开被此定理处决。

## 4. 合成规则（真相交判定）

- 轴×轴：两线共享的固定坐标一致（|Δ|≤1e-4 世界）才相交；交点 = 互取固定坐标。2D 正交必交是特例。
- 边×轴：线线最近距 ≤1e-5 且交点参数在边段内；取**边上点**（保 sticky 落边→T 切割成立）。
- 合成确认半径 = 2.5×tol（屏幕）；假相交一律拒绝（测试钉）。

## 4.4 平面求解器（2026-09-02 收敛手术；点求解器的姊妹查询——阶段二尾巴完全清账）

字典序：**面锁（裸落膜内）> 含点平面（第二点拉动）> 过锚点轴向平面 > 轴系平面（d=0 兜底）**；
同秩多候选 = **唯一挑选器 pickByFacing：底面偏置（|fwd.z|≥0.34≈非贴地 20° 底面优先）> 面向度**。
实现=solver.resolvePlane（rectFirstPlane/resolveRectPlane 降薄壳）。
事故记录：偏置曾抄三份，两次翻车（0.5 门槛头发丝、每帧重挑漏偏置）皆同源漂移——单一出处即药。

## 4.5 坐标约定

**右手系，+Z 上（SU 蓝轴），+X 红，+Y 绿=北**；X×Y=+Z；RGB=XYZ 配色为家族契约；
渲染层不得引入 Y-up（three 只在 render3，相机由 camera.ts 纯数学喂）。已入 repo CLAUDE.md。

## 5. ε 空间与现值

- **单位 = CSS px（逻辑像素）**，与 WeebPaint 家族惯例一致：指针逻辑全 CSS px，
  devicePixelRatio 只进渲染 backing store。高分屏行为不变（2026-09-01 对照核查）。
- **分层已裁落地（Q2，2026-09-01）**：点 10 / 边 7 / 对齐线 5 / 合成 12（snapPoint 内按基准 8 分层）；
  磁滞 ×1.5（外层 UI 态，只防脱出不裁竞争切换，求解器保持纯函数）。
- 世界空间容差只用于真相交验证（§4）。

## 6. 工具消费面

- **优先级=字典序（维度升，rank 降，屏距升）**；秩表：端点90>原点80>中点70>边60>轴线45>平面10；
  合成秩=max(参与者)。与旧 if 链的两处模型化偏差（有意）：①轴×轴合成（0-D）压过单边上（1-D）——
  维度优先律的正统结论；②anchor 轴与充能共轴同秩、距离裁决（旧的 anchor 偏好只剩稳定排序 tie-break）。
- **铅笔**：连画+**出膜事件即抬笔**（含 DIVIDE 等；user 终裁回 SU）；逃生=Esc/原地点击；
  点两下=鼠标专属（笔误触防护），拖拽全输入通用。
- **矩形平面三规则**：首点裸落面内=面平行锁死；首点被低维吸附赢走=延迟；空处=摄像机托底 +
  **看第二点**（解析点落进过首点的轴平面即胜出）。
- **move**：有选区=选区整体动、拾取点任意（参考点语义）；拖拽纯 ghost，松手走 sticky geometry 协议。

## 7. 待裁 / 待落台账（2026-09-01 盘点）

- 【backlog·透视】solver 模型投影无关；透视化=三件局部活：透视相机类（per-pixel 射线）、
  1-D 轨迹投影的前视锥裁剪（无限线→灭点半线/背后翻转）、遮挡过滤（现状隔墙可吸，正交顶视无感）。
  I4 幽灵定理措辞随之推广（屏距不载深度语义，两投影通用，正交为极端情形）。

- ~~Q2 ε 分层+磁滞~~ 已裁落地（§5）。
- ~~暗礁①~~ 已结案（user 2026-09-01 确认；膜事件=属性跟随生死簿，贴图纪元消费血缘）。
- ~~空处自由落点~~ 已裁落地：学矩形（面上锁面/空处摄像机挑最面向轴平面），线工具同规则。
- ~~autofold~~ 已落地 v0.1.1（最少折缝规则，详 move-spec §6）。
- ~~倾斜平面面内共轴~~ 已落（方向集注册 basis u/v，非轴对齐平面自动补）。
- ~~单一求解器重构~~ **核心已落 v0.1.2**（solvePoint/buildConstraints + property 测试）；
  尾巴：resolvePlane 并入同机（rect 三规则仍在 pick 层）、调用方直迁 solver 后删 snapPoint 壳。
- 【远】M4 push/pull + 挖洞特例 + 暗礁②；B–O 换入；增量局部 face-finding；undo 快照环。

## pp 双通道吸附（2026-09-03 终形，user 拍板「争取中间态」成立）

**不动点定理（收窄版）**：吸附世界可以依赖手势参数 h，当且仅当**没有目标在自己的吸附高度上恰好不存在/被排除**。
反例=底角（吸到 h=-30 时恰好湮灭）、帽平面排除静态点（吸到即被排，探针 P5）；正例=切环（存在阈值=自身高度→边界即不动点，稳定）。

- **光标通道**：世界=**中间态（preview ?? 旧核）**——WYSIWYG 无鬼：湮灭的吸不到、切出来的吸得到。
  排除=落笔壳集（**帽环本身**——底环不动就不是手，底四边可吸 On Edge=SU 同款〔2026-09-03 user 截图拍板〕；穿体吸远角由 opaque 手中膜遮挡接管，旧「+一步邻域」为遮挡机制诞生前的过度排除已撤）
  ∪（**新生 vid** ∧ 贴移动帽平面）——COPY 帽环通吃；静态老 vid **永不按 h 排除**（定理反例）。
  **不吸轴/共轴**（axes:false）；**遮挡世界=中间态本身**（occluder=wk：新长的墙挡底面远边、
  光标在帽上=背后无目标=SU「不出面就连续」；不动点靠「贴面不算挡⇒自身高度处边界可见」+滞回兜掠射）。
  **手中几何不产派生目标**（载线交点/面交线源过 exclude——帽边交点会追 h/离体十万八千里，2026-09-03 bug2）。
- **高度通道**：h 标量对静态高度集咬合（落笔取全场景顶点沿 n 投影+0；ε=7px 折算）。标量杀不死→无回路；
  这是 SU「光标不动也咬底面」的机制（h 吸到 -30，不是光标吸到底边）。推穿不硬钳（比 SU 强，E5 一族保留）。
- 中间态照管渲染（含湮灭预览）；move 暂留旧核−手中集（同定理适用，backlog）。
- 验收门=反馈回路探针 tools/probe-pp-feedback.mts（P1-P6：下推/棱抓/贴底悬停/上拉/邻高咬合/推穿）。

edited by Claude Fable 5 2026-09-03（v2 铁律「世界必须 h 无关」被本节收窄取代）

## 立法：旧 snapshot 禁入对齐引擎（2026-09-03 user 拍板，结构性）

**「不要把旧 snapshot 叫做真。push 到一半的才是真相！WYSIWYG。」**（user 原话）

- 本体论：手势中间态=真相（lab 变量 `live`）；旧 state 降格为 **`checkpoint`**（commit 基底/cancel 归宿/
  journal 重放落点），变量已改名。落笔冻结集（壳集/known/高度停靠）取自 checkpoint=手势开始时的现实快照，合法。
- 结构：**世界只准经 `liveWorld()`**（手势中=live，平时=checkpoint；悬停预告如 eraseFace hover 不算手势现实——
  预告吃掉自己=拾取振荡，以 gestureActive 为界）。参数屎山（exclude/skipFace/hiddenOverride/occluder/axes）
  收敛为 `AlignQuery{plane,anchor,alignSources,lines,hand:{has,opaque}}`，遮挡/目标/派生同源一个 hand。
- 把门：`scripts/build.sh` ghost-world lint 禁 `snapPoint(checkpoint` 等模式进 src/lab。
- 普查结果（2026-09-03）：lab 全部世界消费点（snapPoint/pickEntity/drawPlaneAt/rectFirstPlane/resolveRectPlane）
  已一律经 liveWorld()；draw 工具顺手治了橡皮筋端点自吸（基线手=checkpoint 外新生 vid）；
  博物馆 playground/main.ts 机械迁移签名不迁移语义（CLAUDE.md：别在上面继续长）。
- 回归门：tools/probe-pp-feedback.mts P1-P6 换挡序列重构前后逐一一致。

edited by Claude Fable 5 2026-09-03

## 拖拽=扰动相，XOR 落地=commit 事件（2026-09-03 user proposal）

SU 拖拽中 XOR 边不湮灭所以不闪。CatsUp 同款：pp 拖拽预演 `settleLanding:false`——搬运照做
（MOVE/frontier/riser/伸缩），**parity 翻灭推迟到 commit**（moveVertices 用 OR、无 toggleWith）。
收益：①不闪 ②中间态里目标「在自身高度上恰好湮灭」的存在性不连续从源头消灭（不动点条款的
最后一类反例清零）。sticky 协议本形=快照→扰动→结算——之前每帧全结算是把结算塞进了扰动相。

edited by Claude Fable 5 2026-09-03
