# 编辑器本体怎么切 + 两种身体的路由怎么做成结构性的

> created 20261029 · as-of v0.16.57 / 2026-10-29 · created by Claude Fable 5.1 · 周账 F-126（user 10-28 夜「编辑器可以让fable周账理」「炸开mesh会出bug。看来我们的路由还是有硬伤」；Opus 量的：editor.ts ≈ 4000 行、直读硬表面内核 28 处、`selectionWorldPoints` 在网格体里一调就抛那类雷）

## 0. 一句话

**路由**：不靠每个函数自己记得查身体种类——读几何一律经显示契约 `KernelView`（任何种类都有）；要真硬表面内核的只准在**登记过**的方法里（守卫逼登记，每条写清它为什么只在硬表面池里跑）。**切分**：不按「功能名」切，按「它读什么、改什么」切成纯函数模块 + 编辑器里一句薄包装；体重只准降（棘轮守卫）。第一刀今天落：登记制 + 棘轮 + 两个真洞。

## 1. 现状（v0.16.56，量的）

editor.ts 4182 行、250 个方法。按文件里的段落（段名有些已经过时——「血槽位读数」那一段 350 行里只有 25 行是读数，其余是指针 / 手势 / 落定的管道）：

| 行 | 段 | 公开方法（几个） | 读什么 |
|---|---|---|---|
| 440 | 镜像（编辑方式那层：挪点的纪律 / 对称化 / 预演补对面）+ 撤销 / 重做 / 装载 | 13 | mesh 内核（经 `mesh/mirror.ts`）、History、Scene |
| 350 | 指针 / 手势 / 落定管道（标着「血槽位读数」） | 2 | 点按族、充能、意图门、工具 handler、brep 内核（硬表面落定） |
| 241 | X 光 + 选区扩张（环 / 洞 / 连通）+ 焊接 / 炸曲线 / 删除 | 7 | brep 内核（曲线）、显示契约（网格体那半） |
| 236 | 菜单 / 物件窗口的目标（`withMenuTarget` / `runAction` / `commandMenu`） | 4 | 注册表、Scene |
| 235 | 修复面板（九条修复 + 检查 + 藏 / 全部显示 + 进出层级） | 7 | brep 内核（修复模块）、Scene |
| 213 | 数值小窗 apply（撤销那一步按精确值重做） | 1 | History、Scene、各工具的 op 形状 |
| 178 | 参考几何 / 轴（尺规纪元） | 9 | 池本地坐标、Scene.axes |
| 171 | 上下文 / 世界（在哪一层、合成视图、变换） | 0 | Scene、WorldView |
| 165 | 右键新建（基本体落点 / 预演 / 马后炮） | 4 | mesh/ops/primitives |
| 126 | live（影子副本预演：拷一次 + 每帧倒回） | 0 | brep 内核（影子）、mesh（liveMesh） |
| 125 | 修复指令作用范围（传播到子物体） | 1 | Scene 实例树 |
| 117 | 镜像会话（硬表面马前炮） | 2 | brep 内核 |
| 116 | 物件层动词（合并目标 / 炸开 / 锁） | 4 | 注册表 object 族 |
| 108 | 渲染（batchDraw / draw） | 3 | render3 |
| 100 | 参数小窗（马前炮 / 马后炮会话） | 1 | param-panel |
| 99 | 只读（面包屑 / 导出用的 picks） | 3 | Scene |
| 其余 | 工具 / 记账 / 锁定 / 隐藏 / 材质 / 平滑组 / 相机 / 轴移中心 / 上下文菜单小口 / 充能 / 世界源 / 打数 / 扩缩选区 / 剪贴板 / 缩放柄 | | |

直读 `this.kernel` 的地方 27 处，分布在 24 个方法里；**每一处都在「活动池是硬表面」的分支里**（`requireBrep` / `activeKind() === "brep"` / 只有硬表面工具会叫它）——除了两处**真洞**：`previewDescriptor` 白读一次内核（没用它），`computeLive` 的 catch 里 `this.kernel.toBrep()`——网格体池里预演一失败，catch 自己先抛「body is mesh, not brep」，真错误进不了黑匣子、`fail()` 不跑。两处今天修了。

## 2. 路由：登记制（第一刀，v0.16.57）

规则一句话：**读几何经显示契约，要真内核先登记。**

- 显示契约 = `scene/kernel-view.ts KernelView`（点 / 边 / 面环 / 朝向平面 / 改动日志），brep 的 `Kernel` 结构上满足、mesh 经 `mesh-view.ts`；编辑器 `activeView` 一处派发。选区的通用路径（点选 / 框选 / 变换中心 / 读数 / X 光面点）只认它。
- 要真内核（曲线、平滑组、修复、硬表面推断之手、影子预演、硬表面落定）= 硬表面专属：方法名登记进 `test/editor-brep-gate.test.ts BREP_ONLY`，一行写清「它为什么只会在硬表面池里跑、守门在哪」。守卫：`this.kernel` 出现在没登记的方法里 = 红；登记了却不再读的 = 红（表不许发霉）。
- 工具那层本来就分好了：硬表面工具 `ctx.kernel()`、自由建模工具 `ctx.mesh()`，工作台表（`modes/geometry.ts` / `freeform.ts`）保证不混；注册表指令按单位种类（brep / mesh / object）派发；`requireBrep(verb)` 是老动词的守门（不静默，提示一句）。
- 为什么不做「一个 kernel getter 对两种身体都返东西」：网格体没有「硬表面内核」这回事，返一个空壳 = 静默假成功（10-26「不许静默」）；抛 = 现在的行为，问题只在「谁在没守门的地方读」——登记制正好盯这个。

## 3. 切法（之后的刀，按独立性排）

原则：每一刀 = 一个**纯函数模块**（吃 Scene / 选区 / 设置，吐 op 计划或派生数据）+ 编辑器里 ≤ 10 行包装；不改行为、探针逐字一样；切完把棘轮 `LINE_PIN` 往下调。

| 刀 | 切出去 | 新模块 | 接口（提案） | 省行数（估） |
|---|---|---|---|---|
| 2 | 修复指令作用范围 + 修复面板的「数」 | `editor/repair-scope.ts` | `repairScope(scene, ctx, selection, mode) → RepairScope`、`repairCounts(scene, scope) → Record<id, n>` | ~250 |
| 3 | X 光 + 选区扩张 | `editor/select-expand.ts` | `expandSelection(view, hit, stage) → Selection`、`faceDotsView(view, sel, xray)` 已是纯函数，搬过去 | ~200 |
| 4 | 数值小窗 apply | `editor/vcb-apply.ts` | `vcbReplan(lastStep, value, unit) → Op[] \| error`（撤销 / 重做仍在编辑器） | ~180 |
| 5 | 右键新建 | `editor/primitive-plan.ts` | `primitivePlan(scene, at, hit, opts) → { op, frame }`（预演和提交共用的那份已经在，搬） | ~140 |
| 6 | 镜像（编辑方式那层） | `editor/mirror-mode.ts` | `mirrorRewrite(mesh, settings, op) → { op, notes }`、`mirrorPreview(...)`（纯几何已在 mesh/mirror.ts，这里是粘合） | ~300 |
| 7 | 菜单 / 物件窗口的目标 | `editor/menu-target.ts` | `withMenuTarget(scene, target, fn)`、`describeTarget` | ~200 |
| 8 | 指针 / 手势管道 | `editor/gesture-pipeline.ts` | 点按族 + 充能 + 意图门 + handler 派发，编辑器只剩状态 | ~300 |

切到刀 5 时编辑器约 3400 行；刀 8 之后约 2700。**不切**的：撤销 / 装载 / 在哪一层（它们就是「编辑器会话」本身）。

## 4. 守卫

`test/editor-brep-gate.test.ts`：① `this.kernel` 登记制 ② 没有 `pointerType === "keyboard"` 残留（F-125）③ 体重棘轮 `LINE_PIN`（只准降）。改编辑器想加大东西先问：该不该住别处。
