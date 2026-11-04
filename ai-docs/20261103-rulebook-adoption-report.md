# 家族工单 C 报告：CatsUp 同步闸门 + 掉登录 / 没网闸门 + 加密副产品取证 + 命名空间 + 「库必须有家」六问

> created 20261103 by Claude Opus 5.5（claude-opus-5-5）· as-of v0.18.20（dev）/ 2026-11-03
> 工单 = 家族根 `ai-docs/20261103-work-orders.md`「工单 C」+ §0.3；设计稿 = 家族根 `ai-docs/20261103-cloud-gate-design.md`、`20261103-library-needs-a-home.md`；规则书 = `20261103-three-shapes-rulebook.md`。
> **prod 没推。** dev 发 v0.18.20。按 Fable 11-03 叮嘱：`src/format/`、`src/editor/`、冻结样本、迁移链一个字没碰。

## 1. 做了什么

| commit | 内容 |
|---|---|
| `4b66d6f` | 收 store 2.2.3；同步闸门；掉登录 / 没网闸门；修「从没调过 retrySilentSignIn」；守卫 + 探针；`CLAUDE.md` 一行、流程图追记 |
| （本报告的 commit） | 报告 |

新文件：`src/app/ui/gate-stack.ts`（闸门纯逻辑）· `src/app/cloud-gate.ts`（状态机 + 文案）· `src/app/user-offline.ts`（「离线继续」内存布尔）· `test/cloud-gate.test.ts`（30 条）· `test/probes/probe-cloud-gate.mjs`（假 MSAL + 假 Graph）。

测试：`npm test` 1338 绿（基线 1308）；`probe-cloud-gate` 48 ✓；`boot-smoke` 63 ✓；`probe-push-ask` / `probe-password` / `probe-factory-reset` 过。全部 headless。

## 2. 先查 bug：为什么「每次开都得手动解决登录」（设计稿 §1）

**结论：(a) 和 (b) 都有。**

- **(a) 真 bug，已修**：CatsUp 全仓零处调用 `auth.retrySilentSignIn()`（WeebPaint `app.ts:592`、WXHW、JRB、MoonSinger 都调）。库的静默探测失败时**不发任何事件**（`internal-store src/base/providers/auth.ts:337` 只记一行日志），之后 `isSignedIn()` 一直是 false。所以开机那一次探测只要没成（网还没醒、iframe 超时），或者中途 `expired`，这一页就再也不会自动补登，只能手动点。修法 = 回线 / 回前台静默补一次，最多一分钟一次（`src/app/main.ts` `retrySilentQuietly`），守卫 `test/cloud-gate.test.ts`「bug (a) 不许回来」。
- **(b) 微软的限制，修不掉**：SPA 的刷新令牌固定 24 小时、不滑动（WeebPaint `ai-docs/20260909-bfcache-idb-lock-daily-reauth-analysis.md` 有三次 `expiresOn` = 上次登录 +24 h 整的实证）。过期后退到隐藏 iframe，Safari / Edge 拿不到第三方 cookie，抛 `login_required`。**所以一天一次「重新登录」躲不掉，这才是闸门的正解**：不是不问，而是问得明白、有得逃。

配置核过：`cacheLocation` / `temporaryCacheLocation` = localStorage（`auth.ts:278,287`）✓；authority = `/consumers`（`src/config.ts`）✓；回跳地址 = `location.origin + location.pathname`（`auth.ts:274`）——Azure 里登记了哪些**代码里看不到**，迁子域名时要成对改（家规 #7）。

**没做到的**：设计稿说「连记三天 user 自己的设备」。原因码已经进黑匣子（`note("auth", "silent renewal failed where=… code=…")`，每次结果也记），三天数据要等 user 用起来才有。结论里 (b) 的证据来自 WeebPaint 案卷，不是 CatsUp 自己的三天日志。

## 3. 闸门验收（设计稿 §7，逐条）

| # | 项 | 结果 | 证据 |
|---|---|---|---|
| ① | 没挂库：开机 / 醒来零闸 | ✓ | `cloud-gate.test`「① 没挂库」；探针：`#syncGate` 从没显形、零 Graph 请求 |
| ② | 登录好 + 云端没动：罩 < 300 ms，没有面 | ✓ | 探针：醒来约 7 ms，开机约 85 ms（含本地恢复；**假 Graph 零延迟，真网要加一次往返**）；另核「云端没回答时罩子一直在」 |
| ③ | 续签失败：闸两钮；离线继续 → 能编辑、常驻条 N、零请求；回来 → 条消失、dirty 清零 | ✓ | 探针：`login_required` → 「登录过期了」两钮；闸门开着键盘 / 指针不进编辑器（`editor.revision` 不变）；「离线 · 还有 1 份没传上去」；离线期间 Graph 请求 0、`acquireTokenSilent` 次数不变；`online` + 续签成功 → 条收、dirty 0 |
| ④ | 没网：直接进闸不等超时 | ✓ | 探针：进闸约 40 ms，原因「现在没有网络」，Graph 0 |
| ⑤ | 云端慢：点「先离线用」立刻放行；不点 8 s 进闸 | ✓ | 探针：挂起 meta → 点钮约 43 ms 放行；不点 8080 ms 进闸，原因「网盘没有回应」 |
| ⑥ | 醒来同一套；已选离线且没网不再弹闸 | ✓ | 探针 + `cloud-gate.test`「⑥」「⑥′」（有网但续签不行也不弹，条留着） |
| ⑦ | 「离线继续」不进任何存储 | ✓ | `cloud-gate.test`「④ userOffline 不落盘」；只有 `user-offline.ts` 一个模块变量 |
| ⑧ | 黑匣子有每次续签的原因码 | ✓ | 探针读黑匣子含 `code=login_required`；解析对着库 dist 的日志格式核（库改格式这里红） |

**守卫（§8）**：① 开机路径 `initAuth` 只在闸门的 renew 和没挂库分支、问云端和逃生 / 超时赛跑、库的 `open` 走同一个逃生信号（`offlineEscape` 接缝）；② 罩子只在挂了库时（状态机 + 探针）；③ 文案原因三句分开、不含「失败 / 错误 / 请检查」；④ `userOffline` 不落盘。全在 `test/cloud-gate.test.ts`。

**同步闸门（工单第 1 步）**：✓ 入口 = `pullIfClean` 的 `onReplaceStart`（原来是 busy 遮罩，挡不住键盘、也没出口）+ 冲突面选「云端覆盖本地」。单测「闸门开着吞输入」「能叠」「外面收掉 ≠ 人点的」；探针：拉取时键盘 / 指针不进编辑器。**必有出口**：问云端阶段超时 / 逃生 → `localDirty` 说脏 → 库 `dirty-skip` → 本机字节和谱系都没动（`cloud-gate.test`「闸门 × 库」，真库 + 假云盘）。拉取已开始时逃生 → 库回 `escaped`，画布改挂分叉：没改不产生文件，第一笔存成「X（分叉 时间）」；探针核云端原来那份字节和版本号都没变。

## 4. 和设计稿的出入（都是我定的，要改就一句话）

1. **醒来 30 s 内刚核对过就不再罩**（`recheckMs`，`cloud-gate.ts`）。设计稿写「回前台同一套」。理由：PC 上 user 用浏览器标签（家族事实），切个标签回来的第一下点击会被吃掉，又看不到任何东西，这本身是误导。回前台的安静快进照跑，拉取时照罩。
2. **这台设备上没账号（退出登录过 / 从没登录）不弹闸**。设计稿 §2 没这一行，§9 说「不当登录墙」。退出登录是人自己选的，写「登录过期了」是假话。判据 = MSAL 缓存里有没有账号，不新增持久键。**有一个小缺口**：开机时没网就直接进闸（为了 §7 ④ 不等 MSAL 脚本），所以退出登录过的人断网开机会看到「现在没有网络」——话是真的，只是多一张面。
3. **VR 里不闸**：DOM 罩子在沉浸态看不见、点不到。摘头显回页面时走。
4. **文案只有中文**：CatsUp 孵化中不走 i18n（`store-ui.ts` 头注释），设计稿 §5 / §8 ③ 的「四语」没做；文案住 `GATE_COPY` 一处，毕业时一起搬。
5. **闸门外的「先离线用」**（回前台快进正在拉）也算离线继续，出常驻条。设计稿只写了闸门内。

## 5. 加密副产品取证表（工单第 2 步；只报不改）

| 副产品 | 在哪 | 密文？ | 依据 |
|---|---|---|---|
| 图库家的本机副本（`catsup.defaultStore`） | 库经 `src/app-store.ts` | ✓ | 库 `src/works/seal.ts sealForWrite`：按 at-rest 态包壳，加密态没口令就抛；`src/app/session.ts:696` 锁着如实拒存 |
| 备份箱 / 回收站 | 同上 | ✓ | 同一份 at-rest 字节（库搬，不解） |
| 崩溃影子，图库家 | 没有 | ✓ | `session.ts setHome`：图库家 `dropLuggage`，影子 = 库的本机副本 |
| **崩溃影子，解开的本地加密文件** | IDB `catsup-7c1f0d2e9a4b6c58.crash`，`session.ts:264-266` | **✗ 明文** | `openLocalBytes`（`session.ts:656-662`）解开后当 `transient` 开；`tick`（`:247`）30 s 盲快照写 `this.encode()` = 明文。redirect 前的 `pending-adoption`（`:273`）同路。WeebPaint 同一处是写容器、锁着跳拍（`session-state.ts:1421-1427`），CatsUp 没有 |
| 文件里的缩略图 | 文件内 | ✓ | 在容器内，随容器加密 |
| **缩略图派生缓存** | IDB `….thumbs`（gallery `idbThumbStore`） | **⚠ 有残留窗口** | 加密件本身 ✓：`gallery-host.ts:106` 取不到封面。但**加密之前已缓存的明文封面不会被清**：缓存按身份存、版本戳变了才覆盖（gallery `thumb-cache.ts:55-59`），`invalidateThumb`（`gallery-host.ts:163`）零调用方。到图库下一次画这张卡之前，旧封面还在库里 |
| **黑匣子** | localStorage `catsup-7c1f0d2e9a4b6c58:*`（500 条环） | **✗ 失败行带坐标** | 普通 op 行只有数量（`src/editor/ops.ts describeOp`）✓；但 `FAIL` 行附 op JSON 前 400 字符（`src/app/debug-lines.ts traceLine`，`main.ts:218` 落盘）= 这一步的坐标。文件名不算（规则书 §1 第 5 条） |
| 复现包 | 内存环，关窗即无（`src/app/repro-box.ts`） | ✓ 不落盘 | 用户点「复现包」导出才出 JSON，是人的显式动作 |
| 验证器 collection | `app-state.galleryPasswordVerifier` | ✓ | `src/password-verifier.ts`：`{salt, iv, ct}`，PBKDF2 + AES-GCM 加一个哨兵，不含内容 |
| 记住的口令 | IDB `….remember` | ✓ | `@internal/encryption createPasswordKeeper`：不可导出钥匙封着；勾了才有、≤ 30 天 |
| 上传会话记忆 | 库 kv `internal.upload-session:*` | ✓ | 只有 URL / 大小 / If-Match / at-rest 字节的 sha256（`app-store.ts` 注释），无内容 |

## 6. 命名空间表（工单第 3 步；前缀 `catsup-7c1f0d2e9a4b6c58`）

| 名字 | 在哪 | 前缀 |
|---|---|---|
| IDB `.thumbs` / `.crash` / `.gallery-registry` / `.remember` | `src/config.ts:47,48,51,53` | ✓ |
| localStorage `catsup-7c1f0d2e9a4b6c58:*` | `src/app/device-kv.ts:7` | ✓ |
| IDB + localStorage `catsup.defaultStore*` | 库（`appId`） | ✓（家族口径：store 的 `${appId}.…` 算） |
| Cache Storage `catsup-<hash>` / `catsup-boot` | `service-worker.js:22`；清缓存只动 `catsup-`（`pwa-shell.ts:14,57`） | ✓（家族壳缓存命名） |
| Web Locks | 没有（本仓 + `@internal` 库 grep 零命中） | — |
| BroadcastChannel | 没有（同上） | — |
| SW scope | `./service-worker.js`，不给 scope（`pwa-shell.ts:79`） | ✓ 自己那层目录 |
| MSAL 的键（`msal.*` 等） | 库配 `cacheLocation: localStorage` | 不是我们命名；键里带 client id |
| **注意** | token 字面量在 `config.ts`（四处）和 `device-kv.ts` 各写一遍，不是「一处常量」（WeebPaint 收成了 `APP_NS`）。本单没动 | 欠账 |

没有不带前缀的自家名字，没有要改的。

## 7. 「库必须有家」六问（§0.3 第 2 件；只报不改）

| # | 问题 | 答 | 证据 |
|---|---|---|---|
| Q1 | 库能在没有家时建出来并存进作品吗？ | **能 ✗** | 图库按钮直接开（`main.ts:584`），`onOpened: wireStore`；`ensureStore` 不看登录（`app-store.ts`）；`probe-push-ask` 就是没登录新建并存进库、`dirty = 1` |
| Q2 | 有本地文件夹这个家吗？ | **没有（欠账）** | `app-store.ts:50` 只有 `createOneDriveProvider`，全仓没有 `createFolderProvider` / `showDirectoryPicker` |
| Q3 | 没家时能做什么？ | ✓ 文件模式全功能 | `session.ts`：transient / file 家、`settleToFile`（FSA 或下载）、`openLocalBytes`、导入导出；不挂库时 `createStore` 不被调 |
| Q4 | 入口在没家时长什么样？ | **✗ 不灰** | 同 Q1：入口照常开；没有「连接网盘 / 选文件夹」两个去处 |
| Q5 | 设备上有只在浏览器里的作品吗？ | **可能有** | 没登录存的模型住 `catsup.defaultStore`、云端没有；`main.ts:1736` 的通知文案自己就写着「只在这台设备上」。user 的设备上具体有几份代码看不到。按核对单 §4：先保住再改入口，**没动** |
| Q6 | 文件模式的崩溃影子？ | 前缀 ✓，字节 = 保存字节 ✓；**加密 ✗** | `….crash`；`session.ts:264` 写 `encode()`。不承重 ✓（beforeunload + dirty 是承重层）。加密那条见第 5 节 |

## 8. 规则书 §4 检查表

| # | 项 | 结果 | 证据 |
|---|---|---|---|
| 1 | 自家前缀 token | ✓（但不是一处，见第 6 节） | `config.ts`、`device-kv.ts` |
| 2 | 所有存储名带前缀 | ✓ | 第 6 节 |
| 3 / 4 / 5 / 6 / 8–12 | deployment.ts、policy、灰入口、itch / 备用版相关 | 不适用 | 工单写明 CatsUp 上 itch / 备用版不在这轮 |
| 7 ★ | 崩溃影子 at-rest = 保存字节（加密 → 密文） | **✗** | 第 5 节，卡门 1 |
| 13 ★ | 一次做全：没有 dummy | ✓ | 闸门每个端口都接真东西（`main.ts:1800` 起）；探针走真 bundle + 真库 |

## 9. 卡门（等 Fable / user，人话，一次列齐）

1. **（Fable，数据安全）解开的本地加密文件，崩溃影子是明文**。这是什么：拖进来一个加密的工程文件、输口令解开，它当临时模型开；之后每 30 秒的崩溃快照把明文写进这台设备的 IndexedDB，登录跳转前那一帧也是。改了会怎样：照 WeebPaint，快照存加密容器，锁着就跳过（要编码器能写容器，CatsUp 目前只有库里的 seal）；或者解开的文件干脆不做快照（崩溃就丢这段改动，但承重层还在）。不改会怎样：违反规则书 §1 第 5 条。
2. **（Fable，数据安全）黑匣子的失败行带坐标**。这是什么：一步操作失败时，黑匣子记下这步的 op JSON（最多 400 字符），加密模型的坐标因此以明文留在 localStorage。改了会怎样：加密件打开时失败行只记摘要，复现靠「复现包」（只在内存）；调试加密模型时线索少一点。不改会怎样：只漏失败那一步的片段，但确实是内容。
3. **（Fable，数据安全）模型加密之后，旧的明文封面还在缩略图库里**，直到图库下次画这张卡。改了会怎样：加密时 / 列表发现变加密时调一下 `invalidateThumb`（已有接口，零调用方），一两行。不改会怎样：不开图库就一直留着。
4. **（Fable / user）「库必须有家」CatsUp 不合格**：Q1、Q2、Q4 都是 ✗，Q5 可能有本机库。这和 MoonSinger 同形，要走核对单 §4 的过渡路径（披露 + 全部导出 → 文件夹图库 → 收入口）。**没动。** 不走的话：没登录存的模型一直只在浏览器里。
5. **（user）推正式版**：dev v0.18.20 已推；功能账说 user 的顺序是身份地基之后问。这版的变化：挂了库的人开机 / 回前台有个很短的核对；登录过期会看到「网盘没连上」两个钮，而不是悄悄掉线。

## 10. Fable 要看的 diff

- **闸门**：`src/app/ui/gate-stack.ts` 全文；`src/app/ui/sheets.ts` 新段（`openSyncGate`、`installGateInputLock`，吞的事件清单和不吞 `pointerup` 的理由在注释）。
- **状态机**：`src/app/cloud-gate.ts` 全文（`attempt` 的赛跑、`reconnect`、`abandoned`）。
- **session**：`refreshOpenDoc` / `refreshInner`（`refreshGuard`：闸门加入在途那一趟；`localDirty` 问 abandoned）、`forkCanvas`（分叉 + 加密放下）、`checkCloudOnce`（`dirty` 走 `open()` 那条路）、`armReplaceCover`。
- **接线**：`src/app/main.ts` 「掉登录 / 没网闸门」段（约 1755–1855 行）+ 开机 `localBoot`（约 1910–1945 行）；`src/store-ui.ts` 的 `conflictGate` 新字段和 `offlineEscape`。
- **想请你多看一眼**：`forkCanvas` 里 takeCloud 路径半路逃走的情况——库已经把这台的版本留进备份箱，画布上还是它，我让它变成分叉；一个字节不丢，但第一笔改动会多出一个文件。

## 11. 真机项（攒批，不催）

- 真 MSAL：一天后开机是不是「登录过期了」两个钮、「重新登录」跳转回来能不能接上（探针用的是桩）。
- 真网延迟下核对罩子看不看得出来（探针里 Graph 零延迟）。
- iPad：闸门的毛玻璃（`backdrop-filter`）性能；键盘焦点。
- 隐藏 iframe：刷新令牌过期后 MSAL 用 app 自己的网址开隐藏 iframe，**整个 app 可能在里面再启动一份**（WeebPaint 09-09 案卷 §E 记过，CatsUp 同形，没验证过，也没加守卫）。

## 12. 新图标需求

无（闸门只有文字钮）。

## C2（Fable 审过之后的第二轮，v0.18.21）

> edited by Claude Opus 5.5 2026-11-03。收 store 2.2.4（本地 tag，GitHub release 等 user 推）。`createStore({ isOnline: cloudOnline })` 工单 C 就接了；探针核过：选了离线，collection 同步回 `offline`、零请求。

### ① 解开的加密件：崩溃影子只存容器

`session.snapshot` 里唯一的 `crashStore.put` 吃 `shadow-seal.ts shadowFrame` 的结果：普通模型 = 原字节；解开的加密件 = 用解开它的那个口令封成容器，再核一眼确实是容器；口令没了 = 这一拍不写。解开时的口令留在 `session.seal`（只在内存），锁定 / 登出时一起忘（`crypto-state.onLocked`）。

- **恢复也改了**（工单没写，不改的话封口帧读不回来）：`adoptRecovered` 认出容器 → 问口令（取消 = 记录放回）→ 解开后**只当临时模型，不走 `<名>-恢复` 进图库**（进去就是明文）。
- **口令忘掉后点登录**：留不了影子、又不许明文 → 走「这个模型还没有家」三键挽留，取消就不跳。不做的话这次跳转静默丢改动。
- **跳拍说一次**：「口令已经忘掉：崩溃后救不回最新的改动」（不说的话用户以为有崩溃保护）；同一版不重试，黑匣子不刷屏。
- **验证**：`test/encrypted-byproducts.test.ts`；`probe-c2` 走真 7z：影子是容器（`isEncryptedBlob` 真、开头不是 glTF）、口令面板取消记录放回、错一次再对、恢复没进图库、恢复后继续封口、pending-adoption 帧也是容器、口令忘掉库里零变化。封口一帧 419 ms（小模型，主线程，空闲时才做）。

**transient 家其余副产品核了一遍**：

| 副产品 | 结论 |
|---|---|
| 缩略图 / 图库 facts | 不进：图库只列库里的文件，临时模型不在库里 |
| 回执条（上次开着什么） | `setHome` 对 transient 不写 |
| 崩溃帧里的文件名 | 明文，规则书说文件名不在加密管的范围 |
| 黑匣子 | ② 修了 |
| 参考卡 | 在文档字节里，跟着容器走；`reference-window` 没有自己的持久层（grep 过） |
| repro 盒 / 撤销栈 | 只在内存 |
| 其他持久层 | `src/` 里直接开 IDB / localStorage 的只有 crash-store 和 factory-reset（grep 过） |

**顺手改的一句假话**：解开时的提示说「要留就存为…或复制到图库」，但 app 里没有「复制到图库」这个动作（真有的话也是把明文放进图库）。改成「另存到磁盘是不加密的，原来的加密文件不会动」。

### ② 黑匣子不记坐标

失败行 = 动词 + 条数 + 大致字节数（`FAIL commit: … op=pushpull ring=3 dist=1 ~88B`），不序列化 op。

**比工单多做一层**：探针抓到错误走的是另一条路——内核的错误文案自己带坐标（`face [(x,y,z) …]`），经 `reportError → record` 进黑匣子。所以总闸放在 `debug-log.ts`：`record` / `note` 全过 `noCoords`（三元组 + JSON 的 x/y/z），守卫核谁也不许绕开直接写 `diagLog`。`describeOp` 个别动词带一个样本坐标（move 的 Δ、meshMove 的目标点），`src/editor/` 我不碰，在这条闸上抹掉。

- **留着没抹**：单个长度（`dist=1`、`w=0.05`）。它们不是位置，判断是不算坐标；要抹一句话。
- **验证**：`probe-c2` 真提交一笔失败的 op，黑匣子文本和 localStorage 全量扫，都没有模型坐标。

### ③ 加密后明文封面作废

`encryptCurrent` / `decryptCurrent` 成功后 → `galleryHost.invalidateThumb`。原来这个函数零调用，而且图库没挂时是空操作，现在先挂上再清（开机直接回到模型、图库一次没开过，也清得掉）。图库卡片菜单的加密走库自己的动词，库本来就清。

- **验证**：`probe-c2` 真流程：卡片画出封面 → 加密 → 该键为空（挂着 / 没挂两种）→ 解除 → 重画。
- **还留一个缝（不是这轮的，要你定）**：别的设备加密的，这台的旧封面要等图库列到那张卡才被覆盖；云端不可达时库还会退回显示旧图。修要动库。

### ④ 没登录时图库的披露条 + 全部导出

图库顶上常驻「这些模型只在这台设备的浏览器里，没有备份」+「全部导出」+「连接网盘」，登录了就不显示。入口和功能都没动。

- **和工单的出入**：「全部导出」打成**一个 zip**，不是一个模型一个文件：一次下几十个会被浏览器拦，iPad 上会弹几十次分享。文件夹结构跟图库走。
- **加密件搬容器原样**（`getEncryptedBlob`，名字 `<名>.catsup.zip`，开回 CatsUp 要原口令），绝不解开；回执说清几份、几份是加密的。拿不到的进名单，不谎报全部成功。
- 不含回收站和纯云端的（后者这台没字节，也不是「只在浏览器里」的）。没配置登录时不显示「连接网盘」。
- **验证**：`probe-c2` 真下载 zip 用 python 拆开：明文件开头 glTF，加密件是容器。

### VR

**能，挂上了**：手腕面板状态行（`hud.status`，只有 VR 读）在不在线且登录过时带「离线 · 还有 N 份没传上去｜提示」。状态一变面板自己重画（`vr.ts` 现成逻辑）。无头测了状态行文本，**头显里的样子没看过**，进真机项。

### 顺手修的（我工单 C 的毛病）

闸门的输入锁把 Esc 也吞了：开机撞上三选一面板时（面板叠在闸门上）按 Esc 关不掉，只能点「取消」。现在 Esc 放给面板。

### 给 Fable 定的：加密件的「明文出口」

没改行为，只加了一句披露。要不要改归你 / user：

1. 解开的加密件「另存到磁盘」、图库加密件「导出工程文件」「导出 glb」，下载的都是明文（F-123 当时的设计）。现在回执说一句「这份没有加密」。
2. 另存之后这个模型的崩溃影子继续封口（多保险一点，写盘失败时也不漏）。

### ⑤「一更新版本几乎总会出现云冲突」：复现了，不是嫌疑 1

**方法**：真的旧 bundle（`git archive` 解出）和新 bundle 用同一个源、同一份浏览器存储；假的只有 MSAL 和 Graph（内存小网盘，记每次写和结果码）。两台设备两个浏览器上下文。`test/probes/probe-update-conflict.mjs`，headless。两组：用户抱怨那天的 v0.17.4 → v0.17.28（store 2.2.2）；v0.18.19 → 当前（store 2.2.4 + 闸门）。

| 场景 | v0.17.4 → v0.17.28 | v0.18.19 → 当前 |
|---|---|---|
| 1 两台都干净，更新后都不碰（等过自动保存） | 零写入，eTag 不变（只跑了这组） | 没跑（嫌疑 1 已由下一行直接核当前版） |
| 冻结样本 43 份（5 个年代），当前 bundle 打开不碰 | — | 没有一份变脏，停 33 s + 切后台零写入 |
| 2 一笔推在路上时更新（字节到了，回执丢了） | **假冲突面**：云端没人动，却说「在云端和本机各有一版新改动」 | 已修：没有面，下一笔正常推 |
| 3 别的设备刚推了，这台更新后马上落笔 | **真分叉**：从本机旧副本开、可以画 → 412 → 面 | 已修：闸门罩着，先快进，落笔被挡 |
| 4 改完切走窗口（只落本地），云端没人动，点更新 | **一直没推**（33 s 零写入）→ 更新后「有 1 个模型没同步好……每一个都会问你用云端的还是这台的」 | **还在，一模一样** |
| 5 A 改完切走（没推）→ B 改了推了 → A 点更新 | 真分叉，保存时弹面 | 真分叉，开机就弹三选一（正确，但根在 4） |

**嫌疑结论**：

- **嫌疑 1（打开旧文档就脏）不成立。** 打开不碰零写入；样本跑里唯一一次写是 `.catsup/app-state.json`（设置集合初次同步），不是模型。
- **嫌疑 2（推到一半重载）成立过，2.2.3 已盖住**（场景 2）。
- **嫌疑 3（格式拍子影响指纹）不成立。** 跨版本 eTag 不变、零写入；库对字节不透明，身份 = 路径 + eTag，本来就看不见格式拍子。
- **主因是嫌疑表外的第 4 条，而且现在还在。** 机械链：
  1. `flushForHide`（`session.ts`）在切走窗口时只落本地不推，`tick` 只看 `dirty()`，落完本地就不脏了，**这笔再也不推**，除非再改一笔。
  2. 点「有新版本」的 `onBeforeReload` 也是 `localOnly`。
  3. 刷新后 `pushPending` 这个内存标记没了，store 还记着脏 → `offerPushLocalOnly` 弹「没同步好，逐个处理」。
  4. 电脑上的 tab 活得久，刷新几乎只在更新时发生，所以用户看到的是「一更新就有」。这期间在 iPad 上改过（用户的日常），就成了场景 5 的真分叉。

  10-26 那轮修的是这条链上的**假面**（409 盲推），没动「不推」这一环；复盘里当时还写着「只落本机不推（这是对的，页面要走了）」。这对 `pagehide` 对，对 `blur` / 切后台不对：页面没走。

**修法建议（都没动，等你定；这是同步行为，属于先报再动）**：

| | 改什么 | 治什么 | 风险 |
|---|---|---|---|
| **A（最对症）** | `blur` / 切后台时也推一次（`tryPush`）；`pagehide` 仍只落本地 | 电脑改完切到 iPad，云端已是最新，iPad 开的就是最新。场景 5 的主要来路断掉 | iOS 切后台可能把请求冻在半路 = 回执丢，2.2.2 / 2.2.3 比字节已自愈（场景 2 验过）。走 `If-Match` 没有新的覆盖路径 |
| **B** | 「有新版本」按钮的 `onBeforeReload` 也推，等几秒就走 | 点更新前的最后一笔 | 同上；要定等多久 |
| **C** | 开机过闸门后先补传一次（和「离线回来」同一条 `dirty.pushAll`），补不上的才进「要处理」 | 场景 4 那条假警报消失；真分叉照样问人 | 10-26 user 选了「列表面」、不自己批量推，但那次针对的是「问一次 → 批量传 → 失败只剩 toast」。11-03 闸门设计稿的离线回来已经是 `pushAll`。**我觉得这条要问 user** |
| **D** | `tick` 里 `pushPending` 也重试（页面可见 ∧ 空闲 ∧ 在线） | 切走回来不再改、或上次推失败 | 小；有 A 之后只剩网络失败那部分 |

**推荐 A + C**，D 顺手；B 有了 C 可以不做。这是家族同形的洞：WeebPaint `es.start` 也是 blur / hidden / pagehide 都 `persist(false)`，别家我没逐个核，要不要全家一起改归你。

## C3（Fable 裁定 ⑤ 的修法，v0.18.22）

> edited by Claude Opus 5.5 2026-11-03。Fable 裁定：A、B、D 做；C（开机补传一次）不做，等 user（10-26 他定过「列表面、不自己批量推」）。

### 定因补充：比 C2 节写的更直接的触发点

写 B 的时候读到 `onBeforeReload` 调的 `save` 没有「脏了才存」这个判断（手动保存有「不脏也推」的语义，它共用了这条路）。所以**一笔没改的干净模型，点「刷新」也会重新编码、写本地、标脏**，刷新后弹「有 1 个模型没同步好」。在用户抱怨那天的真实版本（v0.17.4 → v0.17.28）上每次都复现（`pair … 4c`）：点之前 `storeDirty=0`，`onBeforeReload` 之后 `storeDirty=1`，更新后弹通知。

**这才是「一更新几乎总有」的「几乎总」**。C2 节的场景 1 没测到，因为它只刷新页面、没走按钮的 `onBeforeReload`，那一节「更新后零写入」的结论只对「不走按钮的刷新」成立。切走窗口那条（场景 4）是第二条来路，要求改完 30 秒内切走。

### 改了什么

- **A**：`flushForHide`（blur / 切后台）= 落本地，在线且登录就推，脏或待推才做。新增 `flushForPageHide`（pagehide）= 只落本地。
- **B**：`session.flushBeforeReload`：干净的什么都不做；脏的先落本地（不设时限，这步丢了就是丢改动）；待推的推一次，最多等 `RELOAD_PUSH_WAIT_MS` = 5 s，推不完就走、脏留给库。强制更新走同一条，但 pwa-shell 在那条路上自带 4 s 上限，实际 4 s。
- **D**：`tick` 里 `shouldRetryPush`（`push-retry.ts`，纯函数）：有待推的、页面可见、在线、登录、没有真分叉、没按着手势 → 再推。节奏 30 s；只有试了没成才进节奏，推成或刚回线清零。

### 验收（`probe-update-conflict.mjs c3`，真 bundle，headless）

| Fable 要的 | 结果 |
|---|---|
| 改一笔 → 切后台 ≥ 5 s → 回来 → store 不脏、云端有 | 过；blur + hidden 只推一次，回来不多推 |
| 改一笔 → 点「有新版本」→ 重载 → 不弹「没同步好」 | 过；推上去了，点到重载 517 ms |
| 断网 → 切后台 → 回线 → tick 补上 | 过；回线后一两秒补上，没有罩子留着 |
| 单测 pushPending 重试 | `test/push-on-leave.test.ts` 条件表 + 节奏 + 接线 |
| 守卫：pagehide 路径不许推 | 同文件：pagehide 监听只走 `flushForPageHide`，它的 save 全带 `localOnly`，beforeunload 同样 |

**多测的**：

- 干净的模型点刷新：零写入、eTag 不变、不弹通知。
- 推卡住：不超过 5 s 就走（卸载在 5011–5019 ms），这一笔留在本机（本机 6472 字节、云端还是 6160），脏留给库。**偶发提前**：把写请求人为卡住时，大约七次有一次在 3.4 s 就走（14 次里 2 次），黑匣子里没有错误。库里有个 3 s 的 IndexedDB 操作看门狗（`idb-store.js`），时间对得上，**是嫌疑，没坐实**。都在上限内；提前走的那轮探针核过字节留在本机。没继续追。
- 有网但写不上：记着待推，15 s 里没有狂推，网好了 tick 补上。
- 真分叉：切后台撞上别的设备的新版本 → 不弹模态面、横幅接手、不重试、云端没被盖。
- **用户的日常**：电脑改完切到 iPad → iPad 醒来快进到最新，接着改 → 回电脑也快进到最新；全程 412 = 0，没有面。

**没测到的**：真 iOS 上切后台时请求被冻住。无头只能模拟「回执丢」（场景 2 过了）。进真机项。

### 修完之后的表

| 场景 | 修之前（v0.18.21） | 修之后（v0.18.22） |
|---|---|---|
| 干净的模型点刷新 | 标脏，弹「没同步好」 | 什么都不做 |
| 改完切走、云端没人动、点更新 | 一直没推，弹「没同步好」 | 切走时就推了 |
| 改完切走，别的设备接着改 | 真分叉，弹三选一 | 别的设备醒来先快进，没有分叉 |
| 别的设备拿旧副本硬存（没醒来核对） | — | 那台弹面问人，云端没被盖（正确：真分叉） |
| 页面走的时候没推完（pagehide） | 下次开机「没同步好」 | **还是**，等 user 定开机补传 |

### 要知道的

- **更新到 v0.18.22 的那一次可能还会见到一次「没同步好」**：点「刷新」时跑的是旧版代码，它照旧把干净的模型标脏。之后的更新不会了。这一次选「处理…」就好（云端没变的话面上说的是真话）。
- **改了 `onBeforeReload`，强制更新（☰ → 更新）也跟着变**：以前干净的模型也写一遍，现在不写。
- 切走窗口现在会发网络请求（脏才发）。自动保存本来就推，只是时机提前。

### 没动的

C（开机补传）、导出给明文还是容器：都在等 user，Fable 去问。别的设备加密后的旧封面：图库库的活（Fable 记 F-146）。WeebPaint / MoonSinger 同形的洞：Fable 进工单 G / H，按各 app 分别裁。

## C3 追加：纯云端加密件在第二台设备第一次打开（家族 F-148，v0.18.23）

> edited by Claude Opus 5.5 2026-11-03。小黑屋挖出的老坑，Fable 让 CatsUp / KudsRocket 都查。

**CatsUp 有，而且比小黑屋多两处。** 库的 `isEncrypted()` 定义是「本地字节是不是容器」，纯云端的还没有本地字节，所以是假。`session.encrypted` 错了之后的后果：

- **分叉写出明文**（`forkCanvas` 看这个标记决定放下画布还是分叉）。这是实打实的漏。
- 菜单显示「加密保护…」而不是「解除加密…」；锁着也往下存（库会拒，但不说人话）；导出少那句「这份没有加密」。

CatsUp 的图库家没有崩溃影子，冲突留底由库按字节封，所以这两样本来就不受影响（工单说的断言改成断言分叉）。

| 地方 | 现象 | 修法 |
|---|---|---|
| `openFromGallery` | 第二台第一次开，当明文稿 | open 之后再看一次（`noteEncryption`） |
| `openFromGallery`（**这台锁着**） | 不问口令，只报「打不开」，**永远开不了** | open 返回空又认出是容器 → 问口令再开 |
| `restore`（开机恢复） | **任何加密模型刷新一下就当明文稿**：`setHome` 清了标记，再没设回去。不限第二台 | 同上。守卫查出来的，比工单严重 |
| 快进 / 冲突选云端 / 闸门那条（3 处） | 别的设备加密或解除后，这台标记过期 | 同上 |
| 全部导出的过滤 | `syncState !== "cloud-only"` 漏过别的没字节状态，加密件会走 `open` 成明文 | 改用库的 `isCached` |

**验证**：`probe-c2`「F-148」段，两台设备、真 7z、假网盘（补了改名和删除接口）。第二台解锁着 / 锁着第一次开、分叉不写明文（库和网盘都核）、`session.restore`、快进之后。守卫 `test/encrypted-byproducts.test.ts`：`session.ts` 里每个从库拿字节的 `adopt` 后面都要再看一次，漏了红。

**没测到**：真实开机（记住口令 → 刷新）走到 `restore` 的整条路：探针里记住口令没生效（开机日志 `remembered password: none`），原因没查，改成直接调 `session.restore`。`probe-password` 另外覆盖了记住口令后打开。

**图库卡片（库的活，没动）**：卡片上的锁图标和菜单也靠 `isEncrypted`，纯云端的加密件第一次开之前显示成不加密。云端名其实带 `.zip`，库能认。报给 Fable。

**KudsRocket：没有这个形状**，查了这几处：

- `discs.ts:74 isEncrypted(src)`：`peekDisc` 读传入的字节源本身（云端的就读云端），不是库的「本地字节」。
- `discs.ts:151` 按云端名后缀 `.wafter` 判；存档 / 快照 `saves.ts:104,123,171,312` 都是 `open()` 拿字节，存的时候 app 自己封。
- 全仓没有调库的 `isEncrypted()`。

## C4（v0.18.24）

> edited by Claude Opus 5.5 2026-11-03。Fable 派的四件，后两条是 user 11-03 拍的规则（规则书 §1 第 5、15 条）。

### 「重新登录」走点击的同步栈

闸门按钮加 `onPick`，`loginRedirect` 在 click 的同步栈里起跳（WeebPaint 的 iOS 红线注释）。守卫：`cloudSignIn` 里不许有 `await`；`pick` 先 `onPick` 后 resolve。

**还留一条异步路**：改过没存的文件 / 临时模型，跳转前要先把影子落进 IDB（`prepareForRedirect`），这段只能异步，落完才跳。图库家的模型走同步那条。这条路在真机上有没有被拦，没测过，进真机项。

### 披露条口径

只在这台没账号时说「没有备份」；有账号但过期 = 东西在网盘上，归闸门和离线条。探针核过。

### 更新重载不打断开着的面

照 MoonSinger H2：面开着不计时、不刷；关了再给 ≤ 5 s；这段里开过又关了同样重新算。闸门自己的罩也算。探针：面开着 6.5 s 没刷，关了才刷。

### 加密作品出门（规则书 §1 第 5 条）

| 出口 | 加密作品 |
|---|---|
| 导出工程文件 | 先问形式。默认「加密文件（原口令才能打开）」，`.catsup.zip`；「明文文件（这份是明文、没有加密）」是显式选项 |
| 另存到磁盘（解开的本地件） | 同上。选加密 = 文件家，之后写回也只写容器；口令忘掉就不写，改动留内存 |
| 导出 glb / OBJ | 下载前弹一句「这份是明文、没有加密」，取消不导 |
| 复现包（两个按钮） | 同上。里面有几何，工单没写，我按同一条规则加的 |
| 全部导出 | C2 就是容器 |

**验证**：`probe-c2` 真 7z、真下载：字节 `isEncryptedBlob` 为真，原口令解得开、错口令解不开；显式选明文才给明文；取消没有下载；FSA 桩上写回两次都是容器；口令忘掉零写入。没落本机的改动先落下，容器里是最新的。

**开回来**：`.catsup.zip` 现在能选（文件框和 FSA 都加了 `.zip`），要原口令，开成临时模型。

**没做，要你定**：规则书说「带口令可导回」。开回 CatsUp 能做到，但**导回图库**没有这个动作（C2 我删掉的那句假话说的就是它）：解开的是临时模型，只能再存到磁盘。要不要加「放回图库（还是加密的）」？不加的话，加密件导出后想回图库只能靠别的设备同步。加的话是个新动词，字节搬容器不解开，改动不大。

### 回来问一次（规则书 §1 第 15 条）

- 开机登录好 / 网回来 / 从离线回来：有没传的 → 「有 N 份没传上去，现在传？」两键，Esc = 稍后，一页一次。
- 现在传 = `dirty.pushAll`（全仓唯一调用点，守卫核）。**C 工单里从离线回来直接 `pushAll` 那条撤了。**
- 稍后 = 留在「要处理」，一条「N 份没传的在列表里」带钮，不再问。
- 没传成的带名单、带「去处理」（10-26 user「弹了一个需要处理然后就什么交互都没了」）。话也改了：说「没传上去」，不说「只在这台设备上」（那句对「传过、后来改了没传」是假话）。
- 常驻条回线时写「已连上网盘」。

**「一页只问一次」的边角**：点过「现在传」之后再断一次网回来，这一页不再问；开着的这份心跳照推，别的进列表。

### 测试

见下面「C4 更正（v0.18.25）」：v0.18.24 的提交信息和这节原来都写着 `probe-update-conflict c3` 过，**那是错的**。

### C4 更正（v0.18.25）

v0.18.24 推的时候 `probe-update-conflict c3` 有 1 条红（我把跑测试和提交串在一条命令里，先推了才看到）。提交信息写着「c3 过」，是错的；已推的提交不改写，在这里更正。

红的是真问题：回线时开着的这份正要被心跳推上去，面已经弹了「有 1 份没传上去」，推完这张面就是假的。修法：问之前先让心跳推开着的这份，再数还剩多少；撞上真分叉的归横幅，不算进来。守卫核「先推、再数、再问」。

**测试（v0.18.25）**：`npm test` 全绿，`probe-update-conflict c3`、`probe-c2`、`probe-cloud-gate`、`probe-push-ask`、`probe-password`、`probe-factory-reset`、`probe-boot` 都在这一版上重跑过，全部 headless。计数见提交信息。

## 搬到 catsup.weebpaint.com：验收（家族根 `ai-docs/20261103-catsup-domain-move.md` §3）

> as-of v0.18.26（正式版 / 开发版同一个 bundle `catsup-175b2aa1b7e8`）/ 2026-11-04，Claude Opus 5.5。Pages 域名和强制 HTTPS 是 user 那边填的，我这边没跑写操作。

| 项 | 结果 | 怎么验的 |
|---|---|---|
| 新址 `/`、`/dev/` 200，证书对 | ✓ | curl；证书 CN = catsup.weebpaint.com，Let's Encrypt，到 2027-02-02；Pages：cname 已设、证书 approved、强制 HTTPS 开 |
| `http://` → `https://` | ✓ | `/`、`/dev/` 都 301 到对应 https |
| 旧 `github.io/catsup/`、`/dev/` 301 到新址 | ✓ | curl 看 301 + location；无头 Chromium 跟跳，落到新址 200 |
| 离线壳在新址注册 | ✓ | 线上无头：scope 分别是 `/` 和 `/dev/`，脚本在新址，重载后受 SW 控制；缓存 `catsup-175b2aa1b7e8` |
| 断网能开 | 正式版 ✓；开发版**这次不算数** | 线上无头断网重载都开了。但 `probe-sw-301` 那次已查明：无头的断网模拟管不到 SW 发的请求，开发版是网络优先，这个结果说明不了它的回退 |
| 强制更新能走 | ✓ | 线上开发版真跑 `pwa.forceReset()`：重载、SW 重新注册并接管、页面错误 0；我放的共享缓存 `pwa-models` 没被删 |
| 旧地址搬家一行 + 口令要重输的提示 | ✓ | `probe-moved-notice` 全过（真 bundle、无头）；文案带「加密模型的口令要重输一次」；新址没有这一行 |
| 页面错误 | 0 | 新址 `/`、`/dev/` |

**没验，等 user 真机**：
- 新址登 OneDrive（微软那边的回跳地址 user 说「应该加了」，登一次才算数）；登录后云端模型拉回、「要处理」为空。
- 重输一次口令后记住口令生效。
- iPad Edge（WebKit，本机没装）：旧地址开一次；开发版断网回退也靠这次。
- 冻住的旧正式版图标能不能登录、没缓存过的加密组件拿不拿得到（清单 §0 的疑点，提示把人引到新址，不另做）。

**旧址 IDB 没删没碰。** `README.md` 地址已改；`CLAUDE.md` 地址节没改：项目说明不凭别的会话一句话改，等 user 说。
