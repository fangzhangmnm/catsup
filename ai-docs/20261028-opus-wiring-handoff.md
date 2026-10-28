# 0.16 纪元：给 Opus 的接线清单（Fable 做完镜像 / 撤销护栏之后切过去）

> created 20261028 by Claude Fable 5.1 · as-of v0.16.4 / 2026-10-28 晚 · user「opus的接线有文档对吧」→ 这一份。
> 先读：`20261028-ux-mental-model.md`（§2 五张图、§6 落地顺序、§8 补 1–3）、`20261028-mirror-ux-epoch-ledger.md`（UX1–UX37，每条 user 原话都在）、仓 `CLAUDE.md`「当前纪元 0.16」段。设计全拍过了，下面每条只是接线；**有疑问看账本那一行的原话，别再问 user 拍过的事。**

## Fable 做好了的（10-28 晚；动之前读它的稿，别重新发明）

- **镜像做好了**（v0.16.5 挪点纪律四条 + v0.16.6 对称属性进文件；设计稿 `20261028-mirror-redo-design.md`；user 10-28 晚「镜像不用我审了对吧，四条规则没问题」）：`src/mesh/mirror.ts`（`mirrorMoves(…, mode)` / `symmetrize` + `removeSeamWalls`）、`src/editor/editor.ts` 镜像那一段、`Scene.meshMirrors`。可以动，但**新加 mesh op / 网格体动作必须在 `src/mesh/mirror-ops.ts` 登记**（守卫 `test/mirror-ops.test.ts` 红了就是在提醒你）。已知边角（设计稿 §5.5）点拖到中缝一条边的中间 = **v0.16.19 修了**（劈边 + 剪刺）。
- **撤销 / 重做护栏审完了**（v0.16.7，家族周账 F-113 done；制度稿 `20261028-undo-step-regime.md` §8⅞）：`history.ts` / `step()` / `commitIn` 照制度用——提交一律 `commitIn(pass, …)`，守卫 `test/step-pass-guard.test.ts` 会拦；改了撤销 / 选区 / 步相关的代码必跑 `probe-undo-fuzz`。
- **网格体定点：user 拍了 A（维持 f64，不上格）**——`CATSUP_mesh` 的 positions 不动；大文件 / 雕刻的精度等那个纪元（取舍稿 `20261028-mesh-fixed-point-tradeoff.md` §6）。
- `src/kernel/`、`src/mesh/` 内核里碰到坑：记账给 Fable，别在接线里绕。

## 清单（按顺序；每条 = 做什么 / 改哪 / 怎么验 / 账本）

0. **数据安全先做：「导出」的后缀要说话，工程文件原样**——**设计稿 = `20261028-export-design.md`（按它做：☰ 两行「导出工程文件」「导出模型…」，后者 = **模态 sheet**，grill 10-28 深夜定）**（账本 UX39；user「现在的导出有数据安全问题…极端误导。工程文件要不要叫catsup. vroid也是glb换皮」「看一下weebpaint是怎么做的。其实是无地骑士的一大堆决策」「工程文件导出本来就是原样不要改任何东西」）
   - 现状：☰「导出 .glb（下载一份）」= `session.export()` = `encode()` = 整份工程（本来就带烤好的三角形给别的查看器）。字节没问题；问题是 `.glb` 这个后缀既可能是 CatsUp 工程、也可能是别的软件烤出来的坏模型（Blender 转一圈存回来硬表面 / 尺规全没了，后缀一样）——user 分不清手里哪份是备份。
   - 先读 WeebPaint：`src/export-import-menu.ts` 的「导出与另存」hub（choice sheet 三去向：导出图片 / 存为本地 .ora / 复制一份到图库）+ `ai-docs/20260825-localfile-knight-grill-verdicts.md`（保存 = 回家、导出永不清脏、下载开始 = 责任移交 + toast）。CatsUp 照抄形状。
   - **拍板（Claude Fable 5.1，10-28 晚，对齐 WeebPaint「导出与另存」hub；user 纠正「你弄反了，这个反而是expected behavior。我说的隐患是你以为是工程备份但只是baked的坏模型」「工程文件导出本来就是原样不要改任何东西」）**：① **工程文件 = `.catsup`**（内里仍是 glb 容器，VRoid 的 .vrm 同款）；认工程靠内容（有 `CATSUP_document` 扩展），不靠后缀；老的 .glb 工程永远照开、不改名（改叫法不迁移旧数据）；新建 / 另存写 .catsup；图库两种后缀都列。② ☰ 一个入口「**导出与另存…**」→ 三个去向（WeebPaint 同形）：**存为本地 .catsup**（工程**原样、一个字节不改**，参考图 / 尺规 / 硬表面数据全在——那是应该的）；**复制一份到图库**（另存为）；**导出给别的软件**（格式下拉 glb / obj）。③ 导出 glb = **同一份字节换后缀 .glb**（工程本来就带烤好的三角形给别的查看器；不剥任何东西），所以开回 CatsUp 仍是完整工程、给 Blender 看到的是三角形——没有「以为是备份其实是烤过的」这种坑；导出 OBJ 的标签明写「只有三角形，不是工程备份」。④ 隐患的真身 = 后缀不说话：`.glb` 既可能是 CatsUp 的工程也可能是别的软件烤出来的坏模型（Blender 转一圈再存回来的 glb 硬表面 / 尺规全没了，后缀一样）。.catsup 后缀 + 打开时按内容认（外来 glb 照旧拒开、走导入）= 两层。⑤ 后缀动到图库 / store 的筛选（`DOC_EXT`、库的 suffix 白名单）= 红线区边上：先读 MASTER.md，库要改就 escalate，不在 app 端绕；守卫测试：「存为本地 .catsup」的字节 == 当前工程 `encode()` 逐字；老 .glb 工程照开；外来 glb 拒开走导入。
   - 改哪：`src/app/session.ts`（`DOC_EXT` → `.catsup`；`export()` 拆成「存为本地 .catsup（原样）」「导出给别的软件（同字节换 .glb / OBJ）」；`open` 认工程靠内容，老 .glb 照开）、`src/app/main.ts` ☰ 一个入口「导出与另存…」+ 三去向 choice sheet + 导出前一句披露、图库 / store 的后缀筛选（红线区边上：先读 MASTER.md）、`manifest` 的 file_handlers 若有。
   - 验：单测「存为本地 .catsup 的字节 == encode() 逐字」「老 .glb 工程照开」「外来 glb 拒开走导入」；冒烟 + 图库探针。
1. **【done v0.16.9】放置表吃左柱和 ☰**（`src/controller/placement.ts`：RAIL_FIRST / RAIL_GROUPS / RAIL_FIXED / RAIL_LABELS / MENU_TABS / MENU_ROWS + SURFACE_RENDERERS；main.ts 只按表画；守卫 `test/placement.test.ts`；探针 `probe-rail` 和搬家前逐字一样。视图 ☰ 还没吃，登记成 pending）（心智模型 §2.2 / §8 补 3；UX34「放置表管的事不同的面板里面放什么指令，不只是左栏和右键菜单」）
   - 做什么：左柱的工具格和 ☰ 的菜单项改成从放置表长出来（Surface `toolStrip` / `hamburger` 已登记在 `commands/action.ts`，还没有渲染器）。工具本身仍是立场表（`controller/stance.ts`）的事；左柱的常驻 / 预算 / 最近用过那张表（`main.ts RAIL_GROUPS`）留着当「手 + 工具袋」的布局规则，只是「哪把工具 / 哪条指令进哪一组」改成查放置表。
   - 验：现有探针全绿（`probe-rail*` / `probe-context` / `probe-submenu`）；`test/registry*` 守卫加一条「每个放置的面都有渲染器或登记为还没有」。
2. **【done v0.16.10】操作工具按下三分法**（UX30，user 拍了；立场表 press 列 + pressTarget + adoptPress，探针 probe-selecting ⑧）
   - 做什么：移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线有选区时，按下处先问「在选区里 / 空处 / 选区外的可选对象」：选区里 = 留着选区做；空处 = 对选区做（Blender）；选区外的可选对象 = **替换**选区成它再做（做完留着它）。没选区的那半不变（按在东西上 = 它、空处 = 拖框）。
   - 改哪：`src/editor/tools/selecting.ts pressTarget`（现在有选区 = 不管按在哪都对选区做）；立场表 `stance.ts` 加「按下」一列三格，`pressTarget` 读表；守卫 `test/stance.test.ts` 跟着加列。
   - 验：`probe-selecting` 加三段（按在选区外的点上拖 → 只动那个点、选区换成它）。
3. **【done v0.16.11】套索**（UX5，user「套索要进 0.16」；选项「空处拖：框 / 套索」、`marquee.ts ScreenArea / areaTest`、`BoxDrag` 记轨迹、SVG 虚线；探针 probe-lasso）
   - 做什么：选择工具 / 操作工具没选区时空处拖 = 框选，加「套索」档（右下角「选区」下拉：框 / 套索）；布尔默认照 `stance.ts BOOLEAN_DEFAULT`（鼠标 替换 / 替换 / 加，笔 切换 / 加 / 加）。
   - 改哪：`selecting.ts boxSelect` 旁边加 `lassoSelect`（屏幕多边形内判点 / 边 / 面，X 光关着只算看得见的，同框选 `pick.ts occlusionTest`）；`tool-config.ts`「选区」加一项；手势层 `gestures.ts` 把拖的轨迹交出来。
   - 验：探针一条（套索圈住方块正面三张面；X 光关着背面不进）。
4. **【done v0.16.18】肌肉记忆冲突守卫 + 芯片渲染（MFD）**（UX15 / UX19；守卫 = `keymap.ts muscleConflicts / KNOWN_CONFLICTS`，6 个已知冲突待 user 拍）
   - 守卫：`test/keymap.test.ts` 加一条——同一个键在不同工作台 / 层里意思不同的，列成表；不在白名单里的 = 红。白名单一开始 = 现状，新冲突逐条拍。
   - 芯片：状态行（右下）按当前键层渲染「键名 + 意思」的芯片，槽位固定（`keymap.ts explainKey` 已有）；触屏设备芯片可点 = 按了那个键。
5. **【done v0.16.16】状态行披露**（按住 Shift / Ctrl / Alt 0.45 s：立场表那一格 + 带它的和弦；`keymap.ts modifierChords / chordLabel`，探针 probe-mod-peek）：`explainKey` 接到提示行（按下一个修饰键时露这一层有什么）。
6. **【done v0.16.14，样张已发 user】自由建模细线太淡**（UX29，user「记账到时候opus修」）：`render3.ts` 平滑边淡线 / 顶点小点的颜色 / 透明度加深；给个样张 user 过目。
7. **【done v0.16.13】键鼠时手柄自动藏、触摸出现**（UX37；读成右上角的手 + 放大镜拖柄；开机按设备猜）：按 `lastPointerType`（`main.ts` 已有）切右上角把手那组的显隐；鼠标 / 笔藏、手指露。
8. **【done v0.16.12】硬表面缩放 Shift = 等比但锚点仍是对面那个点**（UX35；面心柄按住 Shift，探针 probe-transform ③½）：`src/editor/tools/scale.ts` 查现在 Shift 的锚点；等比只改比例不改锚。
9. **【done】零实例的定义存读往返不丢**（`test/orphan-defs.test.ts`）（UX26 的 TODO）：`test/format*.test.ts` 加一条（造一个没有实例的定义 → 写 glb → 读回来还在）。
10. **新建工具**（FM182 / 任务 #25）：拖出来新建、点一下用马前炮尺寸、马后炮可改；入口两处先同一条指令（UX 账本「新建两入口先同一指令」）。

## 纪律提醒

- 每条 = 一个 patch 版本（`./bump.sh vX.Y.Z-日期`），`bash scripts/build.sh` → 单测 → 相关探针 → commit → `git push -q github main && git push -q origin main`。**不推 prod**（user「先不推正式」）。
- 改流程更新 `20261026-pipelines.md`；改工具更新 `20261027-freeform-tools.md`；改键位只改 `keymap.ts`。
- user 在 iPad 上看不了 ai-docs：要他拍的事一个回合列齐、用人话、不许代号。

11. **【done v0.16.17】快捷键表从数据生成；使用手册另写（宣发纪元）**（`keymap.ts keyDocs / LAYER_DOCS / ALL_LAYERS`；帮助页「快捷键」= 生成的表，原来手抄的规矩说明挪成「几个键的规矩」一节）（user 10-28 晚「opus记账，快捷键用数据生成，然后使用手册到时候得好好写归，和快捷键分开来是两个东西宣发纪元」）：帮助页 / README 的快捷键表从 `src/controller/keymap.ts` 的层表生成（脚本或运行时渲染，不手抄；守卫：表和 keymap 不一致 = 红）。使用手册 = 另一样东西，等宣发纪元好好写，不和快捷键表混。

12. **【done v0.16.20 第一版】指令板（浮板）+ 修复面板搬家**（账本 UX41；心智模型 §8 补 4）：做一个通用的「指令板」浮板组件——一次只开一块、能拖、夹在屏幕里、位置按机器记进桌面态、长按标题归位；板上的钮 = 放置表这个面上的指令（按下即跑 / 拿在手上由指令声明），当前拿着那条指令的参数控件 + 预演复用马前炮那套；和左栏共存（拿着时左栏无高亮，点左栏工具 = 放下、板不关）。第一块板 = 修复：把今天右下角的修复面板（勾九步 + 检查 + 应用）搬上板，应用完的马后炮仍回指令窗口。手机竖屏（user 定了）：板降成底部不锁屏抽屉（半高、可上下滑、不拖），**和物品栏共用同一个底部抽屉位**——开板物品栏收起、开物品栏板收起；判据按屏幕短边（和左栏「屏幕矮」同一把尺）。子工作流状态表落 `src/controller/`（和立场表 / 键表同一个文件夹）。
