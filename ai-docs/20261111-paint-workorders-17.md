# 施工单（十七）：浮窗的壳抽进界面零件库

> created 2026-11-11 by Claude Fable 5.2 · as-of 三维 v0.19.28、`@internal/workbench-elements` 0.1.3
> 施工：Catsup小弟。**对外的接口合之前发统筹看**（共享库的接口是关）；别的自己定。取代画画手感账 P-10 里「在三维的浮窗模块里做成可选件」那个决定。

## 一、为什么

- 画布小窗要照参考窗的壳做（左上一颗圆钮点一下收成小图标、按住拖挪窗；右下斜纹的角；闲置淡出）。小弟查了：这套壳写在参考窗自己的 shadow DOM 里没有导出，界面零件库里没有，画画仓的在它自己的 styles.css 里。照原来的决定在三维里做一份，就是第三份。
- 三维现有的浮窗模块 `src/app/ui/floating-window.ts`（+ `panel-gizmo.ts`）本身就是 2026-10-30 从画画仓搬来的一份拷贝（文件头写着）。
- user 11-11 晚，听完「这套壳现在有三份，该有个共同的家；改库升版本要你批」之后：**「好，可以，我批准你升版本，然后把这个给抽象出来。」** 统筹的读法（报给 user 了）：抽进界面零件库 `@internal/workbench-elements`，这个库升中间那一位；参考窗的库这次不动。家族周账 F-253 里本来就有「界面零件库以后收浮窗的壳」，这是它的第一步。

## 二、做什么

1. **搬，不重写**：把三维的 `floating-window.ts` 和 `panel-gizmo.ts` 搬进 `@internal/workbench-elements`，成为一个新模块（名字你按库里的习惯起，比如 `float-window`）。它已经在两个 app 里用过，接口的名字和样子尽量原样留着。
2. **把两家的差别变成参数**（三维那份文件头列的三条）：顶边地板量的是谁（宿主给一个函数或者元素；库里已有 `host-floors`）；显隐用 `hidden` 属性还是 class；临时藏窗（画画仓有、三维没搬）做成可选。再加一个底边地板（不让底部抽屉和键盘盖住右下角）。
3. **加四样可选的壳零件**，全不开 = 和现在一模一样。数照参考窗 0.4.3 起的抄，注释写明出处：
   - 左上圆钮：28 px 的钮、可点区 36 px、触屏 44 px、一圈淡边；图标由宿主给；**点一下 = 收成小图标，按住拖 = 挪窗**（动过 4 px 才算拖）。
   - 收成小图标：44 px 的圆钮，同一个图标、同一个位置；拖 = 挪，点 = 恢复；原来的宽高留着。
   - 右下斜纹的角：19 px，触屏能拖。
   - 闲置淡出：2.5 秒淡到 0.35；能悬停的设备上指针离窗全隐、进窗即现；拖和改大小时不淡。
4. **库自己不存东西**：位置、大小、收没收起，都用回调交给宿主，宿主决定记在哪。库不认识任何 app。
5. 样式进库的 `workbench-elements.css`，颜色用变量（宿主的主题色）。
6. 库的版本 0.1.3 → **0.2.0**；库里的测试（钳制、地板、点和拖怎么分、收起和恢复的状态）、README、接口头文件照库的规矩；打包、三维用 `scripts/pull-package.sh` 收。
7. 三维这边：删掉自己那份 `floating-window.ts` / `panel-gizmo.ts`，改成从库里引；**现有的浮窗（参考窗以外的那些）样子和行为一个像素不变**（四样零件都不开；截图基线和相关探针照过）。然后画布小窗打开四样零件，照 P-10 定稿做完（没有标题栏、画布贴满、「…」菜单、状态叠在画布下沿）。
8. **这次不碰**：画画仓（它那份拷贝等它自己的周再换成库里的，行为一个像素不变是那时候的门）；参考窗的库（它的壳以后要换成库里的话，另外升它的版本，另外批）。

## 三、关

- 库对外的接口（新模块导出的类型和函数，`.d.ts` 那一段）合进库之前发统筹看。要点：窄；宿主给的都是函数和回调；四样零件是一个可选的小对象；没有「画布小窗」「三维」这类词。
- 库的仓和三维的仓各自提交；工作副本里不用 `git add -A`。库的远端照它平时的规矩推；被权限规则拦了就停下来报，不换路子。不推正式版。

## 施工记录

2026-11-11 晚，Catsup小弟（Claude Opus 5.5）。

- **库**：`@internal/workbench-elements` 0.2.0（库 main 8e95aaf，tag v0.2.0，已推 GitHub）。第五件 `float-window` = 三维的 `floating-window.ts` + `panel-gizmo.ts` 原样搬进来，两家的差别做成参数：
  - `configureFloatingWindows({ hudBottom, hiddenClass, zBase })`；
  - 临时藏窗（`spec.transient` + `suppressFloatingForTransient / restoreFloatingAfterTransient`）；
  - `resize.axis / getSize / apply`；
  - 新加 `bottomFloor` 和「太大先缩再挪」。

  四样壳零件 = 一个可选的 `shell`：
  - `knob {icon, label, hint?}`；
  - `collapsible {collapsed?, onCollapse?, restoreLabel?, restoreHint?}`；
  - `corner`；
  - `fade`。

  组合不对就抛：`corner` 没给 `resize`；`corner` 和 `resize.grip` 都给了；`collapsible` 没给 `knob`。样子在 CSS 的 `.wbe-float-*`；宿主自己的小钮加 `wbe-float-part` 就跟着淡。门牌上每个成员一句说明（统筹审了两轮：第一轮五处 = 名字统一、圆钮收图标名、两个把手分开、收起要有圆钮、补说明）。拖 / 改大小的指针细节（panel-gizmo）不出门牌。库测试 23 条。
- **没做成的**：GitHub 的发布页（`gh release create`）被这台机器的权限规则拦了，没换路子。三维收货走的是 `pull-package.sh` 的离线那条（库仓根的 tgz + tag 在）。要补发布页得 user 放行。
- **三维**：
  - 收 0.2.0；
  - 删 `ui/floating-window.ts`、`ui/panel-gizmo.ts`；
  - 新 `ui/float-host.ts`：三维唯一的布局知识（顶地板 = `.hud-topleft` 下缘）。要浮窗的模块都从它拿 `registerFloatingWindow`，拿到时配置已生效；
  - `ui/bare-float-win.ts` 只剩三维自己的：右上「…」×、底地板（抽屉 / 键盘）、第一次挨着钮摆；
  - `feel.ts` 的 `FLOAT_KNOB_DRAG_PX / FLOAT_IDLE_MS` 删了（数在库里）；
  - 圆钮底色 `--wbe-float-dot-bg` 设在 `.float-win` 上，在窗上算，夜间也对。
- **验证**：
  - 换库前后逐像素比（脚本在任务临时目录，没进仓）。桌面 1000×760 和 iPad 744×1133 两种视口：「渲染」窗、「层级」窗的位置、z 序、元素截图、拖到边上被钳的落点，12/12 一样。画布小窗开着和收起的截图、位置、圆钮大小 10/10 一样。
  - 探针 `probe-canvas-window` 29 ✓、`probe-hierarchy`、`probe-hide-windows`、`probe-menu-tabs` 过。全套 2202 过。
  - 新登记一条探针表：动这几个文件跑这四个探针。

