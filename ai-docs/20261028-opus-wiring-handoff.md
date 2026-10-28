# 0.16 纪元：给 Opus 的接线清单（Fable 做完镜像 / 撤销护栏之后切过去）

> created 20261028 by Claude Fable 5.1 · as-of v0.16.4 / 2026-10-28 晚 · user「opus的接线有文档对吧」→ 这一份。
> 先读：`20261028-ux-mental-model.md`（§2 五张图、§6 落地顺序、§8 补 1–3）、`20261028-mirror-ux-epoch-ledger.md`（UX1–UX37，每条 user 原话都在）、仓 `CLAUDE.md`「当前纪元 0.16」段。设计全拍过了，下面每条只是接线；**有疑问看账本那一行的原话，别再问 user 拍过的事。**

## Fable 做好了的（10-28 晚；动之前读它的稿，别重新发明）

- **镜像做好了**（v0.16.5 挪点纪律四条 + v0.16.6 对称属性进文件；设计稿 `20261028-mirror-redo-design.md`；user 10-28 晚「镜像不用我审了对吧，四条规则没问题」）：`src/mesh/mirror.ts`（`mirrorMoves(…, mode)` / `symmetrize` + `removeSeamWalls`）、`src/editor/editor.ts` 镜像那一段、`Scene.meshMirrors`。可以动，但**新加 mesh op / 网格体动作必须在 `src/mesh/mirror-ops.ts` 登记**（守卫 `test/mirror-ops.test.ts` 红了就是在提醒你）。已知边角（设计稿 §5.5）：点拖到中缝一条边的中间不劈边、面会捏一下——要做的话是一条小活，先读 R2。
- **撤销 / 重做护栏审完了**（v0.16.7，家族周账 F-113 done；制度稿 `20261028-undo-step-regime.md` §8⅞）：`history.ts` / `step()` / `commitIn` 照制度用——提交一律 `commitIn(pass, …)`，守卫 `test/step-pass-guard.test.ts` 会拦；改了撤销 / 选区 / 步相关的代码必跑 `probe-undo-fuzz`。
- **网格体定点：user 拍了 A（维持 f64，不上格）**——`CATSUP_mesh` 的 positions 不动；大文件 / 雕刻的精度等那个纪元（取舍稿 `20261028-mesh-fixed-point-tradeoff.md` §6）。
- `src/kernel/`、`src/mesh/` 内核里碰到坑：记账给 Fable，别在接线里绕。

## 清单（按顺序；每条 = 做什么 / 改哪 / 怎么验 / 账本）

0. **数据安全先做：「导出」不许再把工程文件当 glb 发出去**（账本 UX39；user「现在的导出有数据安全问题…极端误导。工程文件要不要叫catsup. vroid也是glb换皮」）
   - 现状：☰「导出 .glb（下载一份）」= `session.export()` = `encode()` = 整份工程（`CATSUP_*` 全在：硬表面数据、尺规、**参考图连图片字节**、桌面态、缩略图），只是后缀叫 .glb。
   - **拍板（Claude Fable 5.1，10-28 晚；user「你只用拍板，到时候opus一起实现」）**：① 工程文件后缀改叫 **`.catsup`**（内里仍是 glb 容器，VRoid 的 .vrm 同款）；认工程靠内容（有 `CATSUP_document` 扩展 = 工程），不靠后缀；老的 .glb 工程永远照开、不改名（改叫法不迁移旧数据）；新建 / 另存写 .catsup；图库两种后缀都列。② ☰ 里不再有裸的「导出 .glb（下载一份）」。换成两项：**「导出给别的软件（.glb）…」= 交付物**——节点层级 + 三角形 + 线 + 材质 + 贴图，**剥掉全部 `CATSUP_*` 扩展**（硬表面 / 网格体的作者数据、尺规、参考图连图片字节、桌面态、设置、缩略图），导出前一行披露「不含硬表面数据 / 尺规 / 参考图；要备份工程用另存工程文件」；**「另存工程文件（.catsup）…」= 完整副本**（含一切，给备份 / 别的 CatsUp 用户）。OBJ 逃生口照旧（它本来就是交付物形状）。③ 导入：.catsup / .glb 都收；外来 glb 照旧成网格体；CatsUp 工程按工程开。④ 后缀动到图库 / store 的筛选（`DOC_EXT`、库的 suffix 白名单）= 红线区边上：先读 MASTER.md，库要改就 escalate，不在 app 端绕；两条守卫测试：导出的 glb 里没有任何 `CATSUP_*` 键、没有参考图的 image；老 .glb 工程照开。
   - 改哪：`src/app/session.ts`（`DOC_EXT` / `export()` 拆成「导出交付物」「另存工程」两条）、`src/format/write.ts`（加一个「剥干净」的写法：只留 glTF core + 烤好的 TRIANGLES / LINES + materials / textures / images 里真被材质引用的）、`src/app/main.ts` ☰ 两项 + 导出前的披露句、`session.ts open` 认工程靠内容、图库 / store 的后缀筛选（红线区边上：先读 MASTER.md）。
   - 验：单测「导出的 glb 里没有任何 CATSUP_* 键、images 里没有参考图、能被别的查看器开」「老 .glb 工程照开」「.catsup 往返逐字」；冒烟 + 图库探针。
1. **放置表吃左柱和 ☰**（心智模型 §2.2 / §8 补 3；UX34「放置表管的事不同的面板里面放什么指令，不只是左栏和右键菜单」）
   - 做什么：左柱的工具格和 ☰ 的菜单项改成从放置表长出来（Surface `toolStrip` / `hamburger` 已登记在 `commands/action.ts`，还没有渲染器）。工具本身仍是立场表（`controller/stance.ts`）的事；左柱的常驻 / 预算 / 最近用过那张表（`main.ts RAIL_GROUPS`）留着当「手 + 工具袋」的布局规则，只是「哪把工具 / 哪条指令进哪一组」改成查放置表。
   - 验：现有探针全绿（`probe-rail*` / `probe-context` / `probe-submenu`）；`test/registry*` 守卫加一条「每个放置的面都有渲染器或登记为还没有」。
2. **操作工具按下三分法**（UX30，user 拍了）
   - 做什么：移动 / 旋转 / 缩放 / 挤出 / 插入 / 沿法线有选区时，按下处先问「在选区里 / 空处 / 选区外的可选对象」：选区里 = 留着选区做；空处 = 对选区做（Blender）；选区外的可选对象 = **替换**选区成它再做（做完留着它）。没选区的那半不变（按在东西上 = 它、空处 = 拖框）。
   - 改哪：`src/editor/tools/selecting.ts pressTarget`（现在有选区 = 不管按在哪都对选区做）；立场表 `stance.ts` 加「按下」一列三格，`pressTarget` 读表；守卫 `test/stance.test.ts` 跟着加列。
   - 验：`probe-selecting` 加三段（按在选区外的点上拖 → 只动那个点、选区换成它）。
3. **套索**（UX5，user「套索要进 0.16」）
   - 做什么：选择工具 / 操作工具没选区时空处拖 = 框选，加「套索」档（右下角「选区」下拉：框 / 套索）；布尔默认照 `stance.ts BOOLEAN_DEFAULT`（鼠标 替换 / 替换 / 加，笔 切换 / 加 / 加）。
   - 改哪：`selecting.ts boxSelect` 旁边加 `lassoSelect`（屏幕多边形内判点 / 边 / 面，X 光关着只算看得见的，同框选 `pick.ts occlusionTest`）；`tool-config.ts`「选区」加一项；手势层 `gestures.ts` 把拖的轨迹交出来。
   - 验：探针一条（套索圈住方块正面三张面；X 光关着背面不进）。
4. **肌肉记忆冲突守卫 + 芯片渲染（MFD）**（UX14 / UX20）
   - 守卫：`test/keymap.test.ts` 加一条——同一个键在不同工作台 / 层里意思不同的，列成表；不在白名单里的 = 红。白名单一开始 = 现状，新冲突逐条拍。
   - 芯片：状态行（右下）按当前键层渲染「键名 + 意思」的芯片，槽位固定（`keymap.ts explainKey` 已有）；触屏设备芯片可点 = 按了那个键。
5. **状态行披露**：`explainKey` 接到提示行（按下一个修饰键时露这一层有什么）。
6. **自由建模细线太淡**（UX29，user「记账到时候opus修」）：`render3.ts` 平滑边淡线 / 顶点小点的颜色 / 透明度加深；给个样张 user 过目。
7. **键鼠时手柄自动藏、触摸出现**（UX37）：按 `lastPointerType`（`main.ts` 已有）切右上角把手那组的显隐；鼠标 / 笔藏、手指露。
8. **硬表面缩放 Shift = 等比但锚点仍是对面那个点**（UX35）：`src/editor/tools/scale.ts` 查现在 Shift 的锚点；等比只改比例不改锚。
9. **零实例的定义存读往返不丢**（UX26 的 TODO）：`test/format*.test.ts` 加一条（造一个没有实例的定义 → 写 glb → 读回来还在）。
10. **新建工具**（FM182 / 任务 #25）：拖出来新建、点一下用马前炮尺寸、马后炮可改；入口两处先同一条指令（UX 账本「新建两入口先同一指令」）。

## 纪律提醒

- 每条 = 一个 patch 版本（`./bump.sh vX.Y.Z-日期`），`bash scripts/build.sh` → 单测 → 相关探针 → commit → `git push -q github main && git push -q origin main`。**不推 prod**（user「先不推正式」）。
- 改流程更新 `20261026-pipelines.md`；改工具更新 `20261027-freeform-tools.md`；改键位只改 `keymap.ts`。
- user 在 iPad 上看不了 ai-docs：要他拍的事一个回合列齐、用人话、不许代号。
