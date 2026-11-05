# 两件小修的设计：按存撞上自动存 · 释放了的 store 还被图库调

> created 20261105 by Claude Fable 5.1 · as-of v0.18.37 / 2026-11-05 · 状态：**设计稿，Opus 施工**（都是 patch；§1 user 11-05 拍「修，先修我们，另外两家好好记账」；§2 user 11-05「23也需要做，你来查和出设计稿」）
> 每节：不变量 → 现在怎么破的 → 修法 → 守卫。

## 1. 按下「保存」永不被静默丢掉

**不变量**：人按的保存（Ctrl+S / 存盘钮 / ☰ 保存）要么存了并说「已保存…」，要么说清为什么没存。静默什么都不发生 = UX 误导 = 数据安全缺陷（user 10-26）。

**现在怎么破的**（`src/app/session.ts save()` 开头）：
```ts
if (this.saving) return false;
```
自动保存（30 s 空闲）正在路上时按存 → 直接 `false`，`smartSave()` 不看返回值 → 没状态行、没通知；按存时想的「推云」也丢了（自动保存可能是 `held`（从没传过、人没答应）不推的那种）。后面的自动保存会把剩下的脏存掉，所以**不丢数据，只丢那一下的意图和回执**。
WeebPaint / MoonSinger 同一句（`src/editor-session/editor-session.ts persist()`：`if (!_name || !need || _saving) return;`，`force=true` 的显式保存同样早退）→ 记周账 F-187，等它们的周。

**修法（CatsUp）**：
1. `Session` 加 `private inflight: Promise<boolean> | null`；`save()` 里把整段 try / finally 包成一个 promise 存进去，结束清空。
2. `save()` 开头改成：
   ```ts
   if (this.saving) {
     if (opts.implicit) return false;                 // 自动保存撞自动保存：下一拍再来，照旧
     await this.inflight;                             // 人按的：等前面那次落地
     // 接着往下走一遍完整的显式保存（不看脏不脏：和 WeebPaint force 一样，按了就要走字）
   }
   ```
   再有第三下显式按存撞上第二次 → 等第二次，有限链，不会堆。
3. 等的那几百毫秒里状态行 = 现有的「正在保存…」（`saveState()` 已经返回 `saving`）；完了照旧「已保存并同步 X」/「已保存到本机 X」。
4. 顺手：`flushBeforeReload`（359 行附近）和 `containerNow`（925 行附近）里两处 `while (this.saving) await 50ms` 轮询改成 `await this.inflight`，少两段轮询。

**守卫**：`test/probes/probe-save-collision.mjs`（无头）：图库家、改一笔 → 用 `__catsup` 钩子把 store 的 `file().save` 拖慢 1.5 s → 等自动保存起跑（`session.saveState() === "saving"`）→ 再改一笔 → 按 Ctrl+S → 断言：状态行最后一句含「已保存」、`session.dirty() === false`、`savedRevision === editor.revision`；对照：自动保存撞自动保存仍是跳过（黑匣子没有第二条 save 行）。Session 构造要 DOM 依赖，node 单测不划算，探针够。

## 2. 释放了的 store 不许再有人持有它

**现象**（`probe-c2` 第 115 行；v0.18.36 / 37 都红；2026-11-05 Fable 复现 3 次中 2 次）：开机后几百毫秒，通知栈出现琥珀色英文警告 `idb cache closed (disposed): catsup.defaultStore`，正好压在崩溃恢复那条通知的「恢复」钮上。

**不变量**：app 释放一个 store 实例之前，所有持有它的人（图库组件、订阅、计时器）先放手；释放后没有任何路径再碰它。库报的 `[idb] disposed` 对用户来说永远不该出现。

**现在怎么破的**（黑匣子顺序，复现脚本见下）：
1. 这台浏览器以前开过一次图库 → 默认库 `catsup.defaultStore` 已经建出来了（里面 0 份模型），没登录。
2. 开机 `bootRestore` 看见库存在 → 挂上 store、懒建空白图库文档（`restore store=true outcome=gallery-deliberate … (lazy)`）。
3. 用户（或探针）这时开图库：`gallery-host.ts storeFace()` → `ensureStore()` 把这个实例交给图库组件，组件订阅目录（`[gallery] subscribe`），关图库只是隐藏，组件和订阅留着。
4. `afterBootHome → legacyScan → settleNoHome(total = 0)`：「没账号、没模型 → 不留空库」→ `disposeStore()`（`_store = null`、库 `dispose()` 把 IDB 缓存标 closed）→ `session.newDoc()`。
5. 约 350 ms 后图库组件刷新一次（`subscribe loading=false` 又来了一帧）→ 走的还是手里那个**旧实例** → `openDb()` 看见 closed → 库 `reportStoreError(…, "warning")` → `store-ui` → 琥珀通知。
真用户条件：开过一次空图库 + 没登录 + 刷新页面 + 在开机那半秒里开图库，或任何别的长期持有者（图库组件挂过就算）。「时有时无」= 图库刷新计时和 dispose 的先后。

**修法**：
1. `app-store.ts disposeStore()` 之前先通知持有者：加 `onStoreDisposing(fn)`（一个小订阅表），`disposeStore()` 先逐个调再 `dispose()`。
2. `gallery-host.ts` 订阅它：收到就把图库组件**卸掉**（`ensureMounted()` 的反面：卸 Vue 实例、退订目录；现在没有这个反面，要加 `unmount()`），下次 `open()` 再按新 store 挂。`storeFace()` 照旧每次重新 `ensureStore()`。
3. `settleNoHome` 里 `galleryHost.isOpen()` 的判断保留，但不再是「关着就没人持有」的依据——依据是第 1 条。
4. **不改库**：库报 disposed 是对的（谁持有谁错）；也不把这条降成 log 藏起来（藏 = 下次换个持有者又静默）。
5. 顺手：`probe-c2` 第 59 行那处（「这个浏览器里有 1 份模型」搬家面板挡住新建）= 探针没跟上「图库必须有家」那批，探针里先答掉搬家面板再往下走；两处修完 `probe-c2` 应绿，绿不了再查。

**守卫**：`test/gallery-home.test.ts` 加一条：挂 store → 模拟图库挂上 → `disposeStore()` → 断言图库收到卸载、之后对旧实例零调用（给图库一个假 store 记调用次数）；探针 = `probe-c2` 本身绿。

**复现脚本**（临时，不进仓）：同一浏览器上下文开两页，第一页开图库再关、关页；第二页开机立刻开图库再关，等 3.5 s 读黑匣子。关键三行：`restore store=true … (lazy)` → `[home] no account, no models → no library (file mode)` → `W idb cache closed (disposed): catsup.defaultStore ‹at openDb›`。

## 3. 核了什么、没核什么

- 核了：§1 读了 CatsUp `save()` 全文和两个兄弟的 `persist()` 开头；§2 无头复现 3 次中 2 次，黑匣子顺序和栈帧（`openDb`）一致。
- 没核：§1 没实测按存被吞（读码判定；三处早退逻辑一字不差）；§2 的修法没写代码，图库组件能不能干净卸载（Vue 实例 + 库订阅）要 Opus 看 `@internal/gallery` 0.8.10 的 `mount` 返回什么。
