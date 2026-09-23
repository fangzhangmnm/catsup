# CatsUp 文档生命周期 × WeebPaint 对齐审计 —— 「开 app 直接回到上次的模型」「有改动才入库」

> created 20260922 · as-of CatsUp v0.5.6 → v0.5.7 / WeebPaint v0.14.20 / @internal/store 0.15.0 / @internal/gallery 0.4.0 · by Claude Fable 5.1
> 起因：user 2026-09-22「现在行为还是没有和 weebpaint 对齐。weebpaint 应该是打开 app 后自动打开上一个编辑的文件，这里面如何减小网络延迟你也看一下 weebpaint 怎么实现的。然后这一块如何公有库化。以及有改动的时候自动新建入库的机制也必须学，没改动的时候不会产生废文件。然后开 app 会直接进上一个编辑文件。这个在让你开始真正做作品而不是总是 tmp.ora 上面非常非常重要」+「可以多看看还有哪些没对齐的，多和 weebpaint 学学」。
> 读者 = 下一个接手 CatsUp 文档生命周期的 agent。引用行号是本文写作时刻的快照，代码变了以代码为准。

## 0. 一句话

WeebPaint 的「开机回到上次那张画」**已经是一个共享器官**——`@internal/gallery` 的 `core/boot/resume-slate.ts`（回执条）+ `core/boot/boot-restore.ts`（三态启动编排 `restoreLastSession`）；CatsUp 装了 0.4.0 却零引用，自己用 `last-doc` / `last-scene` / `gallery-attached` 三个 device-kv 键手搓了一个两行 if/else。开机慢的真正原因是 **CatsUp 先 `await auth.initAuth()` 再开文档**（store 0.14 起「在线 = 有网 ∧ 已登录」，登录落地后的 `open()` 会先等一次云端 etag 往返），而 WeebPaint 是**先从本地开文档、MSAL 并行初始化、登录落地后再对打开的文档做后台快进**。「废文件」的根因是 CatsUp `newDoc()` 一按就 `save(createNew)` 建空文件，且开机在图库模式下落 transient（Ctrl+S = 另存到磁盘，永远进不了图库），WeebPaint 是 lazyblank（日期名只在内存、首笔有内容才安家）。

## 1. WeebPaint 是怎么做的（机制逐条）

### 1.1 回执条（resume slate）——「上次开着什么」是设备书签，不是设置

- 器官在包里：`@internal/gallery/src/core/boot/resume-slate.ts`。一库一张条，键 `resume:<galleryId>`（CatsUp 单库 = `resume:default`），住 device-kv（localStorage 同步单键写 = 天然原子），**永不同步**（v438 毒化案根治）。
- 形状 = typed union：`{kind:"doc",path}`（上次开着它 → 自动恢复）/ `{kind:"gallery"}`（上次有意停在图库 → 回图库）/ `null`（首次 → 新画布）。同记录带 `restoreAttempt`（崩溃环断路标记）。
- **唯一写点**：WeebPaint `src/session.ts:45-47 setCurrentSessionName` ← `session-state.ts:111-119 _setActive`（活动身份唯一写入口；同时持/放 Web Lock）。开画成功 → `{doc}`；退到图库 → `{gallery}`；开本地文件 → `_setActive(null)` = `{gallery}`（文件句柄跨刷新不可恢复，下次落图库合理）；lazyblank / 云关 transient → **不碰**。
- store 的 `activeFileName` 直接读回执条（`app-store.ts:84`）——cloud-gone 收敛不动正打开的那张。

### 1.2 三态启动编排 `restoreLastSession`（`boot-restore.ts`，纯端口注入，有单测）

顺序：`!hasGallery` → 云关空白画布 ｜ `resume==null` → 首次 lazyblank ｜ `{gallery}` → 图库（唯一落图库的路）｜ 双实例锁 → lazyblank ｜ 崩溃环断路 → lazyblank ｜ `setRestoreAttempt(wanted)` **同步落盘** → `restore(wanted)` → 成功清标记 ｜ 失败 → **内存名降 safe default、持久回执条一个指头不碰**（下次冷启动 retry）→ lazyblank。四条纪律：① 幽灵路径（失败后内存名必须降回，否则 save/rename 拿失败的 path 当 oldName——AtlasMaker 0.7.2 事故）② 失败不清持久指针 ③ 崩溃环断路（大文件 OOM 被杀 = 永远走不到优雅失败分支）④ canvas-first（verdicts §2.4「boot 永不 404 跳 gallery」——图库不是失败的垃圾桶）。WeebPaint 只在 `src/boot.ts:41-71` 接线端口。

### 1.3 开机网络延迟——**关键不在 store，在启动顺序**

- store `RawFile.open()`（`create-store.ts:907-950` + `freshness.ts:72-120`）：有本地副本 ∧ `isOnline()` → **先 `fetchMeta` 一次云端 etag 往返**（in-sync 读本地 / 云端变了且本地干净 → 先 safePull / 脏 → 冲突面），离线或未登录 → 直接读本地零网络。0.14.0 起 `isOnline = navigator.onLine ∧ signedIn()`。
- WeebPaint `app.ts:497` `authBootP = initAuth()` **不被 restore 等待**；`app.ts:588` `prefsReady.then(bootRestoreSession)` 只等本地（registry IDB + collection hydrate）。restore 跑到 `open()` 时 MSAL 多半还没把账号从缓存醒过来 → store 视为未登录 → 本地读、零网络、画秒开。（WeebPaint 装的是 store 0.13：`isOnline` 只看 `navigator.onLine`，靠 `getToken` 抛 "Not signed in" → cloud-error → 读本地，效果相同。）
- 登录落地后（`wp:auth-changed` / `online` / 回前台 `onForeground`）→ `session.refreshOpenDoc()`（`session-state.ts:1147-1178`）= `pullIfClean` 干净快进：云端更新且本地干净 → 拉 → `es.open` 同名重开；期间 `lockSyncGate` 遮罩防止用户在快进中落笔（否则用户改动会基于旧版本盖掉云端新版）；`escaped` → 分叉另存。dirty / pushPending / lazyblank 一律不快进（分歧留给保存的 412 冲突面）。
- 「跳到离线」逃生口（`ui.offlineEscape`）：fetchMeta 挂死时用户即超时。CatsUp store-ui 已实现。

### 1.4 lazyblank：首笔有内容才安家，空白永不落盘（P1.5 2026-08-26 user 拍板「首次打开新画布」）

- `beginLazyBlank`（`session-state.ts:1103-1116`）：`setName(galleryDefaultName(), {persist:false})` 日期名 **memory-only**（回执条不写：空画布不算「上次开着的画」）；editor-session **不绑**（`es._name=null` → `persist()` 直接 return，空白永不产生图库垃圾）。
- 首笔（`session-state.ts:1324-1330`，挂 `wp:histchange`）：`_isLazyBlankSession && !_docIsBlankUnnamed()`（真出现像素 bbox>0）→ `es.adopted(name,{create:true})`（首存 `mode:"new"` 撞名不静默覆盖）+ `_setActive(name)`（回执条从此指它）。字节落盘在下一次 flush（30 s 空闲 autosave / hidden / pagehide / blur / Ctrl+S / 退图库）。
- 空白期 Ctrl+S → `ss.blankNothingToSave`「空白画布，还没有需要保存的内容」；挂新库时未动过的 lazyblank 不塞进库（user 0830「一开始打开的空画布没被动过的话，不在库里新建」）。
- **例外**：图库「新建」钮（`newDoc` :922-968）立刻 `saveNow`——因为带模板尺寸/纸色，那是内容。CatsUp 的空场景没有等价物 → 「新建」也应该 lazy。

### 1.5 崩溃安全 flush（`editor-session.ts:253-270 es.start()`）+ beforeunload

- `visibilitychange:hidden` → `persist(false)` 只本地不推；`pagehide` **仅 `!persisted`**（#60-C：要进 bfcache 的页里起 IDB 写在 WebKit 永远 commit 不了、只会持锁——案卷 `20260909-bfcache-idb-lock-daily-reauth-analysis.md`）；`blur` → `persist(pushOn.has("blur"))`（WeebPaint = 不推）。
- `beforeunload`（`topbar-menu.ts:173-183`）：`session.dirty`（任何家）→ 挽留框 + **偷偷起 `save({implicit:true})`**（dialog 弹着时后台 IDB 事务大概率跑完；user「可以弹挽留对话框，应该弹」「挽留的时候偷偷本地备份」）；登录 redirect 导航中不挡。
- autosave = bgJobs 30 s 空闲 + `isMidOperation` 让路；退图库 `flushAndPush` + 失败 retry sheet（`session-state.ts:896-908`）。

### 1.6 其他护栏

- 双实例互认 `src/instance-locks.ts`（Web Locks，`weebpaint-doc:<gallery-id>:<path>`；`ifAvailable` 不等待；tab 崩溃自动释放 = 「活实例 vs 真崩溃」判据）——restore 端口 `isDocLockedElsewhere`。
- save 七态 `save-status.ts:49-63`（saving → dirty → cloud-off → unpushed → synced/local-only）+ 标题栏 `● 名`；smart save `topbar-menu.ts:69-110`。CatsUp v0.5.4 已同形。

## 2. CatsUp 现状 vs WeebPaint（差距表；「处置」= 本轮 v0.5.7）

| # | 项 | CatsUp v0.5.6 | WeebPaint | 差距 | 处置 |
|---|---|---|---|---|---|
| 1 | 上次文档指针 | `main.ts:396-398` 在 `updateSaveStatus` 里写 `last-doc` / `last-scene`（gallery-host）/ `gallery-attached` 三个键 | 回执条 typed union，`_setActive` 单写点 | 手搓、三键分散、写点在渲染函数里 | **改用包的 `readSlate/setOpened/setRestoreAttempt`**；`setHome` 成为唯一写点；`gallery-attached` 保留（= WeebPaint registry「曾挂库」的等价物） |
| 2 | 启动编排 | `main.ts:527-528` 两行：在图库 → 开图库；有 last-doc → 开，**失败 → 跳图库**；无 last-doc → transient | `restoreLastSession`：canvas-first、崩溃环断路、纪律①②、双实例 | 失败跳图库；无断路器；图库模式无 last-doc 时落 transient（Ctrl+S=另存磁盘，进不了图库） | **改用包的 `restoreLastSession`**，端口接 session |
| 3 | 开机延迟 | `main.ts:520` **先 `await auth.initAuth()`**（MSAL 脚本 + 静默续签 iframe）**再** `openFromGallery` → 已登录时 `open()` 又等一次 `fetchMeta` | restore 不等 auth；登录后后台快进 | 开机多等「MSAL 初始化 + 一次 Graph 往返」才见模型 | **先从本地恢复（此刻 store 视为未登录 → 零网络），恢复完再 `initAuth`**；登录落地 → `refreshOpenDoc` 后台快进；恢复因无本地副本失败（iOS 7 天驱逐 / 卸载过）且登录后 → 自动 retry 一次 |
| 4 | 新建 / 首笔安家 | `newDoc()` 立刻 `save(createNew)` → 空文件；开机 transient 不会进图库 | lazyblank：日期名内存态，首笔有内容才 `mode:"new"` 建文件 | **废文件** + 「总在 tmp 上画」 | **`beginLazyBlank` + `noteChange` 首笔安家**（`editor.host.changed` 同步钩子；内容判据 = 内核有边）；「新建」也 lazy；空白 Ctrl+S 诚实回话 |
| 5 | 登录/回线/回前台的文档快进 | 无（只刷图库列表） | `refreshOpenDoc` 干净快进 + 遮罩 | 另一台设备存的新版本，本机只有下次 `open()` 才看到；本机改了会静默盖回去（412 会拦但体验差） | **加 `Session.refreshOpenDoc()`**（`pullIfClean` + busy 遮罩 + 同名重开），接 auth-changed(signedIn) / online / visible |
| 6 | 崩溃安全 flush | 只 `pagehide`（**不看 persisted**，bfcache 案 #60-C 风险）；无 hidden / blur | hidden / pagehide(!persisted) / blur 三件，只本地 | iPad 切走 30 s 内被杀 = 丢改动（图库家没有 T-crash 影子） | **三件齐 + `localOnly`**（不推）；file/transient 家 hidden 时顺手盲快照 |
| 7 | beforeunload | 只 file/transient 脏才挡 | 任何家脏都挡 + 偷存 | 图库家脏关页只靠 pagehide 的 fire-and-forget 写 | **对齐：脏即挡 + 偷存本地** |
| 8 | 双实例互认 | 无 | Web Locks | 双 tab 同模型 = 本地字节互覆 | 端口先 `false`；**未做**，见 §5 |
| 9 | 退图库推云失败 retry sheet | `flushLocal` 失败只报状态 | retry / 丢弃循环 | 小 | 未做，见 §5 |
| 10 | store `activeFileName` | 内存变量 `_activeDoc`（`setHome` 同步） | 读回执条 | 等价 | 不动 |
| 11 | save 七态 / 标题栏 / smart save / 30 s autosave / T-crash / pending-adoption | 已同形（v0.5.2–0.5.4） | — | — | 不动 |
| 12 | `main.ts` 头注释 | 「无地骑士：零持久化——模型只活在内存里；OBJ 是唯一出入口」 | — | 陈旧 | 改 |

## 3. 公有库化：哪些已在库、哪些该进库、哪些不动

1. **已在库（本轮零库改动）**：回执条 + 三态启动编排 = `@internal/gallery` 0.1.0 起就有（`core/boot/`，从 WeebPaint v0.14.9 搬入）。CatsUp 直接消费，`configureDeviceKv` 已在 `src/app/debug-log.ts` 开机第一件事接好（黑匣子同 seam），所以 `readSlate` 在图库懒建之前就能读到真值。
2. **候选：`@internal/editor-session`（新内部库出生要 user 批，本轮只提案不做）**。WeebPaint `src/editor-session/`（README 自称「family shared module，各 app 之间拷」）= 内存脏 + 编辑代数 / `adopted({create})` 首存 new / 事务化 `openInto` / hidden·pagehide·blur flush / consent-gated push（`pushOn`）；CatsUp `Session` 手搓了其中六成（`savedRevision`、`createNew`、tick、pagehide）。再加三块 WeebPaint 也还是 app 层的：lazyblank 安家策略（`shouldAdopt(lazy, hasContent)`）、`refreshOpenDoc` 流程（pullIfClean → 遮罩 → 同名重开 / escaped 分叉）、`instance-locks`。抽出来的形状 = 领域无关的「文档生命周期引擎」，编辑器只给 `adopt/encode/hasContent/onChange` 四个端口。**第三个消费者出现前不抽**（user 09-06「第二个用户第三个用户才长抽象」）——JRB 是阅读器不是编辑器，CatsUp 是第二个；先在 CatsUp 把形状对齐到能机械合并，下一个编辑器 app（WebRings？）出生时再抽。
3. **store 层（可选，escalate 才做）**：「开机不阻塞」（store ADR-0004「launch must never be blocked」）今天是**启动顺序的涌现性质**，不是 `open()` 的契约——谁把 `initAuth` 排到 restore 前面，谁就重新引入一次 Graph 往返。若要写死，两条路：`open({freshness:"background"})`（先返本地、后台 fetchMeta、变了走 `onNewer`/adopt）或 README 明写「boot restore 必须在 signedIn 翻真之前发起」。本轮 CatsUp 走顺序保证（restore 先 await 完再 `initAuth`，确定性的），并在 `app-store.ts` 头注释钉下这条契约。
4. **不动**：回执条永不同步（v438）、body 三态 union、`gallery-attached` 单库标记（多库要等 registry，CatsUp 单库）。

## 4. 本轮修法（v0.5.7 设计要点）

- `session.ts`：`lazy` 旗（gallery 家 + 内存日期名）；`beginLazyBlank()`；`noteChange()`（由 `editor.host.changed` 同步调）→ `lazy ∧ 内核有边` → `adoptLazy()`（`nameOccupied` 消歧 → `save({implicit, createNew})` → `setHome` 写回执条）；`save/leaveGate/flushLocal/snapshot` 先 `await adopting`；`restore(path)`（boot 端口：无挽留门、无状态行）；`refreshOpenDoc()`；`flushForHide()`；`save({localOnly})`；`setHome` = 回执条唯一写点（gallery ∧ !lazy → doc；file → gallery（仅挂库时）；transient → 不碰）；`slateGalleryOpened/Closed()`。
- `main.ts`：boot = 接店（曾挂库 / OAuth 回程）→ `restoreLastSession`（本地）→ `initAuth` → 登录且未接店 → 接店 → `blank-failed` ∧ 已登录 ∧ lazyblank 未动 → retry → `initCrashRecovery`。事件：auth-changed(signedIn) / online / visible → `refreshOpenDoc`；hidden / blur / pagehide(!persisted) → `flushForHide`；beforeunload 脏即挡 + 偷存。
- `gallery-host.ts`：删 `last-scene`/`wasInGallery`；open/close 经 main 回调写回执条。
- 冒烟：新建不落盘（列表数不变）→ 画一笔 → 文件出现 → 刷新回到它；图库停留态刷新回图库；最后一次 boot 的顺序断言（黑匣子行：`[boot] restore … outcome=restored` 在 `[auth] init` 之前）。

## 5. 未做 / 风险 / 后续

- **instance-locks 未移植**（端口恒 `false`）：小模块（~60 行）+ 锁名 `catsup-doc:default:<path>`；下一轮做。
- **退图库推云失败 retry sheet** 未做。
- **iPad / Quest 真机零验证**（A23）；本轮全部 headless 验证。
- 首笔安家到首次落盘之间（毫秒级）无影子——WeebPaint 同形。
- 「新建」lazy 与 WeebPaint「新建」即建文件**有意不同**（CatsUp 空场景无模板内容），已在 §1.4 说明；若将来 CatsUp 有模板（预置房子），模板新建再走即建。
