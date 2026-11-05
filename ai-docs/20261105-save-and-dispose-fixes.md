# 两件小修：按存撞上在飞的保存 · 开机拆空库冒英文警告

> created 20261105 by Claude Fable 5.1（设计稿）· edited 20261105 by Claude Opus 5.5（施工 + 更正，见 §3）· as-of v0.18.38 / 2026-11-05 · 状态：**都落地 v0.18.38**
> 出处：§1 user 11-05「修，先修我们，另外用户好好记账」（读法：先修 CatsUp，WeebPaint / MoonSinger 记周账 F-187）；§2 user 11-05「23也需要做，你来查和出设计稿」。

## 1. 按下「保存」永不被静默丢掉

**不变量**：人按的保存（Ctrl+S / 存盘钮 / ☰ 保存）要么存了并说「已保存…」，要么说清为什么没存。静默什么都不发生 = UX 误导 = 数据安全缺陷（user 10-26）。

**修之前**（`src/app/session.ts save()` 开头 `if (this.saving) return false;`）：自动保存（30 s 空闲）在路上时按存 → 直接 `false`，`smartSave()` 不看返回值 → 没状态行、没通知；按存时想的「推云」也丢了。后面的自动保存会把剩下的脏存掉，所以**不丢数据，只丢那一下的意图和回执**。

**无头实测（修前的包）**：`probe-save-collision.mjs` 真按 Ctrl+S 撞上在飞的存，只写一次、存完还是脏的、没有任何提示。第一次实测确认（设计稿当时只是读码判定）。

**修法**：
```ts
let slowSay;   // 平常几百毫秒就落地，不多说一句；等过 1 s（网慢）才说明在等什么
for (;;) {
  if (this.halted) { clearTimeout(slowSay); return false; }
  if (this.adopting) { await this.adopting; continue; }
  if (!this.saving) break;
  if (opts.implicit) return false;                  // 自动撞自动：下一拍再来，照旧
  slowSay ??= setTimeout(() => setStatus("上一次保存还在路上，等它落地就存…"), 1000);
  await this.inflight;                              // 人按的：等它落地，再完整存一遍（推云的意图和回执都在这一遍）
}
clearTimeout(slowSay);
```
`while` 不是 `if`：连按两下时两个等待者不会并发（第一个醒来同步竖起 `saving`，第二个接着等）。`save` 切成前半段（闸）+ `writeHome`（落家），`inflight` 是后者的 promise。推云不会永远挂着：Graph 请求都带超时（`app-store.ts GRAPH_TRANSPORT`：meta 30 s / 一块 120 s / 整文件 15 min）。`containerNow` 的 50 ms 轮询顺手换成等 `inflight`；`flushBeforeReload` 带时限，没动。

**守卫**：`test/probes/probe-save-collision.mjs`（假的文件句柄拖慢写盘）：自动撞自动只写一次；人按的两次写、不脏、第二笔进了字节、状态行「已保存」；等得久才说「还在路上」，等得短不多话；连按三下依次走完。

WeebPaint / MoonSinger 是**同一段**代码（`src/editor-session/editor-session.ts persist()`：`if (!_name || !need || _saving) return;`，`force=true` 也被早退），CatsUp 是自己的一段、毛病相同。记周账 F-187，等它们的周。

## 2. 开机拆空库不许冒英文警告

**现象**（`probe-c2` 第 115 行；v0.18.36 / 37 都红）：开机后几百毫秒，通知栈出现琥珀色英文 `idb cache closed (disposed): catsup.defaultStore`，正好压在崩溃恢复那条通知的「恢复」钮上。

**真因（Opus 实测核实，**更正**了设计稿，见 §3）**：
1. 这台浏览器以前建过默认库、里面 0 份模型、没登录。开机挂上库，`wireVerifierOf` → `store.collection("app-state").init()`。
2. 库的 collection 在 `init` 里排了一个 **400 ms 的本地写定时器**（`works/collection.js scheduleLocalWrite`）。
3. 十几毫秒后 `settleNoHome`（「没账号、没模型 → 不留空库」）→ `disposeStore()` → 库 `dispose()`：等了串行链、断了 IDB，**没清这个定时器**。
4. 约 340 ms 后定时器到点 → `writeLocalNow` → `openDb` 看见 closed → 库 `reportStoreError(…, "warning")` → 琥珀通知。

**证据**：同一上下文两页复现，**6 轮 6 中**；第二页**开图库 / 什么都不做两组都中**（设计稿说的「图库还订着」不成立）；栈 = `openDb ← txOnce ← tx ← put ← save ← 定时器回调`，时间永远晚 `[home] no library` 约 340 ms。真用户条件 = 开过一次空图库 + 没登录 + 刷新，**每次都中**，不是「时有时无」。

**不变量**：释放库之前，它手上排着的写要么落完、要么作废；库报的 `disposed` 对用户永远不该出现。

**修法（不改库）**：`app-store.ts disposeStore()` 释放前先 `await appState.then(flushCollection)`。`flushLocal` 是库给的公开「卸载兜底面」，写完并清掉定时器；`init` 还没完也等它完。把这条警告藏成 log 是错的（藏 = 下次换个路径又静默）。

**还有一条更窄的路（没修，等库的决定）**：开机那半秒里正开着图库时，库的目录帧 `pushRemoteFrame` 读到一半撞上释放（栈 = `openDb ← keys ← appKeys ← listFolder ← pushRemoteFrame`），报一条红色同样的英文。只读、不碰数据、能关掉，压力下（6 个页面并行）18 次 2 次，单跑没见过。设计稿说的「图库还订着」只在这条路上算对一半；但 `@internal/gallery` 0.8.10 没有卸载的口，app 修不了，而且卸载也挡不住已经在飞的那一帧。不把它藏成 log：藏掉会连真的写失败一起藏。

**库该不该自己做** = 周账 F-199：`dispose()` 不清 collection 的定时器、在飞的目录帧不看 dispose，都是库的缺口，别的 app 也会中，库里修都只要几行。改库要 user 批，这次没动。

**守卫**：`test/probes/probe-no-home-dispose.mjs`（修前的包红）：两组对照都没有定时器那条警告（开着图库那组另一条路不判，见上）、落到文件模式、下次开机确实没有库。`probe-c2` 全绿（80 项）：顺手把它两处过时的地方跟上（搬家面板挡住新建、文件模式没有库可列）。

## 3. 设计稿写错、这里更正的

Fable 设计稿（commit 6d48d0c）的这几句不对，那份已经发出去过：
- 「真因 = 图库组件还订着释放的 store」：**错**。当时栈帧只看到 `openDb`，没看调用者，也没做不开图库的对照。修法（通知图库卸载）修不了这个问题。
- 「复现 3 次中 2 次，时有时无」：**错**。第 3 轮是输出被 `head -120` 截断、没看到；实际每次都中。
- 引文写成「另外两家好好记账」：原话是「修，先修我们，另外用户好好记账」。「两家」是读法。
- 「三家同一段」：WeebPaint / MoonSinger 同一段，CatsUp 自己一段。
- 按存片段用 `if … await`：两个等待者会并发，施工时改 `for` 循环。
