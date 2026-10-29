# 口令（加密）接进 CatsUp：接法、碰了什么、没做什么

> created 20261029 · as-of v0.16.55 / 2026-10-29 · created by Claude Fable 5.1 · 周账 F-123（user 10-28 晚「一个是密码没有接……这两个记账，也许需要fable接一下」；10-29「你现在是fable了，开始做」）
> 形状 = WeebPaint 的那套原样搬（ADR-0012 统一图库口令 + ADR-0015 设备记住 + CSP），零新发明；库 = `@internal/encryption` 0.2.2 + `@internal/store` 2.2.2（没动库）。

## 1. 一句话

图库里的模型可以「加密保护」：整个图库共用**一个口令**，文件在本机和云端都是加密容器（明文 zip 外壳 + 7z AES-256 payload + 尾部加密 peek；**7-Zip 输口令就能开**，anti-abandonware）。口令只活内存，关页 / 锁定就忘；可以**勾「在这台设备上记住 30 天」**（opt-in、库钉的上限、过期自忘）。

## 2. 入口（给 user 看的）

| 在哪 | 行 | 什么时候出 |
|---|---|---|
| ☰ 文件页 | 加密保护… / 解除加密… | 图库家才出（本地文件 / 空白 = 先存进图库） |
| ☰ 设置页「口令」节 | 锁定（忘掉口令） | 内存里有口令时 |
| ☰ 设置页「口令」节 | 忘记这台设备记着的口令（记到 X 月 X 日） | 这台设备记着时 |
| 图库卡片 | 小锁 + 卡片菜单「加密 / 解除」 | 图库包自带（gallery 0.8.10 `GalleryEncryption`） |
| 打开加密的模型 | 口令面板（错了重问、取消 = 不开） | 内存里没口令 / 口令不对时 |
| 打开本地加密文件（.catsup.zip） | 口令面板 → 当**临时模型**打开（保存 = 另存） | 永不把明文写回那个加密文件 |
| 退出 OneDrive 登录 | = 锁定 + 忘记 | — |
| 还原出厂 | 删掉记住的口令库 | — |

口令面板是**真表单**（type=password + autocomplete + 隐藏的账号字段 + 确定 = 提交）：Edge / Safari 的密码管理器会问「保存？」（user 10-21「口令面板改成真表单让 Edge 密码管理器记住，全家做」）。

## 3. 代码在哪（一个接缝一个用途）

- `src/encryption.ts` —— `@internal/encryption` 的唯一值级 import：真 codec（`src/crypto/zip.ts` + `src/crypto/sevenzip.ts`，自 WeebPaint 搬；`vendor/zip-js`、`vendor/7z-wasm` 原样拷）+ `passwordKeeper()`（设备记住，库 `catsup-7c1f0d2e9a4b6c58.remember`）。
- `src/crypto-state.ts` —— 内存口令政策（统一口令 + 别的口令的文件的 per-name 覆盖；锁定清一切；面板注入；订阅）。零 DOM、零持久化。
- `src/password-verifier.ts` —— 「图库设过口令没有」的验证器 { v, salt, iv, ct }（PBKDF2×250k + AES-GCM，GCM tag 即验证；不存可逆物），住 store collection `app-state` 的 `galleryPasswordVerifier`（跟账号走）。病根 = 没它的话重装 / 换设备必走「创建新口令」且不校验 → 两套口令并存 = softlock（WeebPaint v0.4.11 真机 2.3 的坑）。
- `src/remember-password.ts` —— 设备记住政策（开页先比验证器、对不上 / 没验证器就忘；锁定即忘；勾只用一次；只跟过得了验证器的口令）。
- `src/app/unlock.ts` —— 交互循环：`ensureUnlocked`（验 peek，便宜）/ `ensureNewPassword`（验证器在 = 输入并校验，绝不进创建；都没有 = 设新口令两遍、创建即落验证器）/ `unlockImportedContainer`（本地文件全量解）。**都在 busy 外调**。
- `src/app-store.ts` —— `crypt: { getPassword }`（库非交互取；没有 = status locked，绝不弹窗）+ 验证器接到 collection + `verifierReady()`（init 完才算接上；解锁 / 首次加密前先等它，免得把真验证器当「没设过」覆盖）。
- `src/app/session.ts` —— `openFromGallery` 先问口令；`save` 锁着如实拒（改动留内存）；`encryptCurrent / decryptCurrent`（库 `file.encrypt / decrypt`，先本地后云 If-Match；**没登录只在本机的文件也能加密**，有云端那份的要在线）；`openLocalBytes` 的加密容器分支；`encrypted` 旗（☰ 换字）。
- `src/app/gallery-host.ts` —— 给图库包 `GalleryEncryption`（小锁 / 卡片菜单 / 开件先问）；加密件没有封面（库对加密件 `getHead` = null，卡片只画锁）。
- `src/app/main.ts` —— 面板注入（`openPasswordSheet`）、记住接线、开机 `verifierReady → restoreRemembered` 在开上次模型**之前**、☰ 行、退出登录 = 锁 + 忘、CSP 拦截进黑匣子、`__catsup.crypto` 给探针答题。
- `src/app/ui/sheets.ts` —— `openPasswordSheet`（真表单；`index.html` 的 `#sheetForm / #sheetUser / #sheetCheck`）。
- `src/app/factory-reset.ts` —— `OWN_DBS` 多一个 `REMEMBER_DB`。
- `index.html` —— CSP meta（WeebPaint ADR-0015 同款，没有 `'unsafe-eval'`：CatsUp 的 Vue 模板是预编译的）；开机兜底内联脚本搬成 `boot-guard.js`；`vendor/zip-js` classic script。

## 4. 新增的持久化（披露；user 可否决）

| 东西 | 在哪 | 什么时候才有 | 怎么没 |
|---|---|---|---|
| 图库口令验证器 | store collection `app-state` 的一项（跟账号同步） | 第一次加密成功时（创建即落；一件都没加密成 → 撤销） | 解除所有加密后仍留着（WeebPaint 同：「重置验证器」= 以后单独做） |
| 记住的口令 | 本机 IDB `catsup-7c1f0d2e9a4b6c58.remember`（库封装：不可导出 AES-GCM 钥匙 + 过期时间进 AAD） | 勾了「在这台设备上记住」那一刻（没勾过 = 库不存在） | 过期自删 / 锁定 / 退出登录 / 忘记 / 还原出厂 |
| 加密容器本身 | 替换原文件字节（本机 + 云端，云端名 = 身份 + `.zip`，库管） | 「加密保护…」 | 「解除加密…」（OneDrive 版本历史里仍有明文旧版，解除时提示过） |

## 5. 没做 / 边界（如实）

- **换口令**没做（WeebPaint 的 `runChangePassword` 宏：先给每个本机加密件登记旧钥、写新验证器、逐件 `rekey`）。CatsUp 现在要换 = 逐件解除再加密。排在下一批。
- **重置验证器**（忘了口令、放弃旧加密件、从头设）没做入口。
- 真机零：iPad Edge 上的密码管理器、7z-wasm 在 iOS 的内存、CSP 在真机的拦截都没验。CSP 被拦的东西会进调试日志（`[csp]`），真机某功能突然不灵先看它。
- 加密件没有封面（库对加密件不给头片，也不该为了封面去解密）。
- 口令面板的账号字段写死 `catsup`（单库；多库再按库 id）。

## 6. 验证

`npm test` 1144（新：crypto-state 4 / password-verifier 3 / remember-password 10）；探针 `test/probes/probe-password.mjs` 16 项（真 codec 加密 → 验证器落库 → 锁着打开要口令、错一次再对 → 锁着保存被拒 / 解锁能存 → 解除 → 再加密走「输入原口令」→ 记住 → 新页面开机静默解锁、开加密模型不问 → 忘记 → 开机锁着 → 本地加密文件当临时模型 → ☰ 设置页有「锁定」→ CSP 零拦截）；相邻探针 export / factory-reset / push-ask / menu-tabs / refwin / present-lock / boot。
