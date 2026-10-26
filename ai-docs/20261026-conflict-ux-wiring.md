# 云冲突 UX 接线（2026-10-26）：收 store 2.2.1 / gallery 0.8.8；登录后的提示改成「去处理」；编辑器横幅；自动保存不弹模态

> created 20261026 by Claude Fable 5.1 · as-of 收包后的 main（版本号 / dist 由 CatsUp 会话的 Opus 下一次构建带上，本次不碰 `version.ts` / `index.html` / `dist/`）。
> 起因与根因：家族根 `ai-docs/20261026-cloud-conflict-ux-postmortem.md`（周账 F-98）。user 2026-10-26 四问全按推荐定：库洞修且默认开 / 图库可见钮 + 顶部列表 / 编辑器不弹模态改横幅 + 钮 / 登录后改列表。
> 读者 = 下一个接手的人 + Opus（CatsUp 会话）：§4 是你合并后要做的两件。

## 1. 收了什么

| 包 | 从 → 到 | 对 CatsUp 的意思 |
|---|---|---|
| `@internal/store` | 2.2.0 → **2.2.1** | **天天弹的假「云端有新版本」没了**：刷新前 30 s 内改过的模型，刷新后登录前被恢复，谱系丢了 → 以前每次推都是盲推、409 被当撞名；现在推之前先问云端，没人动就直接推成（零面）。面上的云端状态按真相填。`dirty.pushAll()` 多返 `failures:[{name,reason}]`（本 app 现在不用它了，见 §2）。默认开，为什么见库发版说明 §3 |
| `@internal/gallery` | 0.8.7 → **0.8.8** | 要处理的卡片右下角一粒琥珀「处理…」钮（库自己画；本 app 没给 `tileAction`）；当前夹有要处理的 → 顶部横幅「有 N 份没同步好，要你处理 → 看列表」筛选；`handle.setAttentionOnly / getAttentionCount`；「处理…」不再包在宿主 busy 里（10-25 那个 would-deadlock 的根；v0.14.8 的闸门面板留着不碍事）。`vendor/internal-css/gallery.css` 换 0.8.8 的 |

## 2. app 层改了什么（三件，都是 user 当天拍的）

1. **登录后 / 回线后的提示**（`main.ts offerPushLocalOnly`）：10-21 的「有 N 个模型只在这台设备上，现在传吗？」是 / 否框 + `pushAll` **撤了**——「只在这台设备上」对「传过、后来改了没传」是假话；批量传完失败只剩一条没有按钮的 toast。现在：有没同步好的 → 一条常驻通知「有 N 个模型没同步好……到图库里逐个「处理…」」+ **「去处理」钮** → `galleryHost.openAttention()` = 开图库、直接进「要处理的」视图（每张卡一粒「处理…」，点了当场弹库的三选一面）。图库已经开着就直接切过去。**不自动把图库盖在正在画的东西上**（家族 zen：别把人踢出去）——user 选的是「列表面」，列表住在图库里，这条通知只是把人带过去；想改成登录后直接开图库 = 一行（`openAttention()` 代替 `notify`）。不再自己批量推：每一份都由人在面里选。`drainOfflineQueue`（ADR-0018 的「离线新建回线问一次」）照旧。
2. **编辑器横幅**（`main.ts syncAttentionBanner` + `session.attention / markAttention / resolveActive`）：正在编辑的这份和云端没对上 → 常驻通知「「X」在云端有另一版新改动，这台的改动也没传上去——要你选用哪边」+ **「处理…」钮** → `session.resolveActive()` = 对这份叫库的 `file.resolve()`；选了云端 → 整份重载画布；选了本地 → 推上去、横幅走；取消 → 横幅留着。保存钮 tooltip 跟着说「点横幅上的「处理…」」。
3. **自动保存不弹模态**（`store-ui.ts conflictGate` + `session.save` 的 implicit 闸）：30 s 空闲自动保存 / 离开时的 flush 撞上云端 → 库想弹面 → `resolveConflict` 看到 `conflictGate.implicit` → 返回库自己的默认值 `cancel`（留脏、一个字节不动）并点亮横幅。显式保存 / 图库「处理…」/ 打开时照旧弹面。这不是替人回答方向（10-16「禁止越狱」）：cancel 不换字节。

## 3. 验证

- `tsc` 0；`npm test` 全绿（含红线守卫）。
- 无头探针 `test/probes/probe-push-ask.mjs` 重写（14 ✓）：没登录存一个模型 → dev 钩子触发提示 → 不弹 sheet、通知带「去处理」钮、不批量推 → 点它 → 图库打开、通知自己收起、字节没动、无 busy 死锁。**图库里的横幅 / 卡片「处理…」钮在没登录时看不到**（gallery 0.8.8：attention = 登录态才算），那半由图库库单测钉（`tileFor.attention`），端到端归真机。
- 冒烟 `test/boot-smoke.mjs` 照跑（smoke ok，无页面错误）；构建在 job 临时区的隔离副本里做（主目录 Opus 在改渲染，dist / index.html 不碰）。
- **没验**（和迁库那天同样的缺口）：OneDrive 真登录态的三选一面、横幅在真冲突下的样子、2.2.1 在真机上「刷新前改一笔 → 刷新 → 不再弹面」——归 iPad Edge 真机，user 自己决定什么时候跑。

## 4. 给 Opus（CatsUp 会话）合并后的两件

1. 本次**没碰** `src/version.ts` / `index.html` / `dist/`——你下一次 bump + build 把这些一起带上 dev（commit message 提一句「含同步 UX 接线」）。
2. `test/boot-smoke.mjs` 若有断言依赖旧的「问一次」sheet 文案，按 §2-1 改（我跑的时候没有）。
