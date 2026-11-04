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
