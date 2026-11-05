# 输入闸：谁拥有输入、模型现在能不能改

> created 20261105 by Claude Fable 5.1（设计稿）· edited 20261105 by Claude Opus 5.5（施工，形状改了的都回写在这里）· as-of v0.18.38 / 2026-11-05 · 状态：**落地 v0.18.38**
> 出处：user 2026-11-05「再系统的查一下设计，和定稿锁编辑一起设计，应该有一个全局的窄接口，架在输入之前，而且要多放几层瑞士奶酪，我们有中心化的输入深模块吗。以后给vr铺路」。起因 = v0.18.37 修的「普通弹窗开着 Ctrl+Z 能隔着弹窗撤销、工具键能换工具、Esc 把人踢出组件」（账本 §0 11-05）。
> 「定稿锁编辑」= **演示锁**：定稿 / 改稿的版本章 2026-10-29 已被演示锁吃掉（user 10-28「定稿的语义不对，这个是锁屏，不是 commit」，周账 F-124，`20261024-finalize.md` 顶注）；user 11-05「sunset定稿逻辑」。
> 别的 app 做同样的模块 + 演示锁 = 周账 F-194（user 11-05「记账 moonsinger wxhw和weebpaint做同样的深模块，以及加演示锁」）。

## 0. 一句话

修之前**没有**中心化的输入模块：「这一下该不该交给编辑器」的判断散在 7 处（§1），每处各记一半的面，所以漏。现在 = 一个不认识网页的小模块 **`src/controller/input-gate.ts`**，两条轴：**① 谁拥有输入**（一张面的名册）**② 模型此刻能不能改**（几条理由）。键盘、指针、滚轮、触屏、头显进场景之前问它一句；网页的接线和门口在 **`src/app/input-dom.ts`**。五层奶酪见 §3。

## 1. 修之前的样子（留档；读码 + 部分实测）

| 面 | 指针 | 键盘 |
|---|---|---|
| 面板 `#sheet` | 罩住 | 11-05 起主键盘入口让路；走路键盘不让 |
| 同步闸门 | 罩住 | 自己装了 capture 屏障（全吞） |
| 处理中遮罩 | 罩住 | **不挡**：「正在加密…」时 Ctrl+Z 照样撤销 |
| 弹出菜单 / 下拉层 / 右键菜单 | 外点关菜单 | 只接 Esc，**别的快捷键穿过去**（菜单开着按 L = 换工具、菜单还开着）；外点关菜单那一下还穿到画布（拿着画线工具 = 关菜单同时起一笔，v0.18.38 实测） |
| 材质面、帮助、调试日志、图库全屏 | 罩住 | **不挡** |
| 走路键盘 `flat-input` | — | **只查 INPUT / TEXTAREA**，不知道面 |

结论：不是漏了一个面，是没有一张面的名册；每加一种面都要记得去各入口补一句，必漏。

**设计稿当时写错的（Opus 施工时核出来）**：稿子说「锁着时左柱灰、点了还是换工具」。实际 `body.doc-locked .hud-rail-tools { pointer-events: none }`，左柱根本点不了，工具指针也整个被 `toolBlocked` 挡着——**锁着其实进不去走路**，「进去玩」是空话。这也是 user 11-05 拍「只读工具比如walk之类的应该全量可以的」要修的。

## 2. 实际接口（和提案的差别在下面写明）

```ts
// src/controller/input-gate.ts —— DOM 无关，node 可测（test/input-gate.test.ts）。VR / 桌面 / 测试同一份规则。
export type FaceKind = "face" | "menu" | "text" | "refwin";   // face = 模态；其余只拿走键盘
export type Owner = FaceKind | "scene";
export type Source = "key" | "pointer" | "wheel" | "touch" | "xr";
export type HoldKind = "lock" | "asking";
export interface EditHold { readonly kind: HoldKind; readonly why: string }
export interface FaceEntry { kind: FaceKind; label: string; rank: number; up(): boolean; root?: unknown; esc?(): boolean }
export interface HoldEntry { kind: HoldKind; why: string; on(): boolean }
export interface InputGate {
  face(f: FaceEntry): () => void;       // 进名册，返回退名册
  hold(h: HoldEntry): () => void;       // 加一条理由，返回撤掉
  owner(): Owner;                       // 开着的面里 rank 最高的；都关着 = scene
  admits(source: Source): boolean;      // 这一下能不能进场景（编辑器 + 走路）
  blocks(source: Source, inside: (root: unknown) => boolean): boolean;   // 要不要在门口吞
  escape(): "handled" | "blocked" | "none";   // 把 Esc 交给最上面肯接的那个
  held(): EditHold | null;              // 此刻不许改模型的第一条理由；演示锁排最前
}
```

规则表：

| 名册里开着的 | 进场景（admits） | 门口吞（blocks） | Esc |
|---|---|---|---|
| 什么都没有 | 全放 | 不吞 | 走编辑器 |
| `face` 写了 root（面板 / 闸门 / 处理中 / 帮助 / 材质 / 调试日志） | 全不放 | 地盘外面的都吞 | 它自己接；不接（处理中、没声明值的闸门）= 吞掉，不穿到下面 |
| `face` 没写 root（图库） | 全不放 | 不吞（卡片菜单带、通知在它自己的 DOM 外面） | 不拦，交给它的控件 |
| `menu`（弹出菜单 / 下拉层 / 子菜单） | 键盘不放，指针放（外点关菜单） | 地盘外面的**键盘**吞（user 11-05「吞掉」） | 收最上面一层 |
| `text` / `refwin` | 键盘不放，指针放 | 不吞（键要到它们手里） | 不拦，控件自己处理 |

和提案（Fable 稿 §2）的差别，都是施工时定的：

1. **`claim / Ticket` → 声明式 `up()`**：提案是开面时领票、关面时释放。面的关法太多（直接 `hidden = true`、一路 `finally`、库的面），漏一次释放 = 键盘永远死掉。声明式没有这种失败，名册就是一张「谁、怎么知道自己开着」的表，加一种面 = 一行。
2. **`admits(source, to)` → `admits(source)`**：没有任何调用方问过别的 `to`；消费者只有「场景」一种（键表和走路键盘同级，键表自己有走路层）。`walk` 不进名册。
3. **`generation()` 没搬**：等面关的逻辑（`isAnyFaceUp / whenFacesClosed / faceGeneration`，只有更新重载用）问的是「人正在被问」，比「有模态面」窄（图库开着不该挡更新），留在 `sheets.ts`。
4. **`halted` 去掉**：`session.halted` 只在还原出厂 wipe 前那一瞬，之后马上 reload，不值得一条理由。
5. **`asking` 只拦人的入口，不拦程序漏斗**：提案说「弹窗开着连程序路径也改不了场景」。不对：导入、粘贴都是「问完 / 等完才落定」，异步路上撞上一张别的面（醒来核对的闸门）时拒掉 = 静默丢活。所以 `commitIn` 只看演示锁；撤销 / 重做 / 数值小窗 / 键盘起手 / 预演 / 改模型工具的指针按下，三层都看。`asking` 只算面板和同步闸门（= `isAnyFaceUp`），处理中遮罩不算（导入就在遮罩底下提交）。

Editor 侧：`EditorHost.editHold?()`；`get locked()` 现问；`holdChanged()` 只做翻转时的事（手势作废、放下改模型的工具、重画）。真值只有 `session.desk.locked` 一处，`_locked` 删了。

只读工具 = `src/editor/tool-ids.ts READ_ONLY_TOOLS`：**选择、走路、卷尺、量角器**。卷尺 / 量角器照量、读数看得到，落定时的参考线被提交口拒（量得到，不留线）。名单是 Opus 按 user「只读工具比如walk之类的」定的，圆规、轴没进（它们的产物就是改文件）。

## 3. 五层奶酪（每层各自承重；守卫 = `test/probes/probe-input-gate.mjs`）

| 层 | 在哪 | 拦什么 | 怎么证明它自己承重 |
|---|---|---|---|
| ① 门口 | `app/input-dom.ts`：window 捕获阶段 `keydown keypress pointerdown mousedown touchstart wheel contextmenu dblclick click`。开机第一个装（捕获监听按注册先后跑）。不吞 `pointerup / pointermove / keyup`（手势正按着时别卡死）；不吞程序发的事件（下载的 `a.click()`、文件框的 `input.click()` 在遮罩底下也得走通）；不吞 Tab、F5、F12、Ctrl+R（面卡死时人还得能刷新） | 面开着的键盘、滚轮、点到面外的一切，含 Ctrl+S 变成浏览器「另存网页」 | 探针 A 组：每种面开着真按键真拖 |
| ② 消费者自检 | 键盘入口 `main.ts`、走路键盘 `flat-input.ts`、手势 `gestures.ts`、头显扳机 `vr.ts`，各一句 `admits` | ① 没吞到的：程序发的事件、以后别的输入适配器 | 探针 C 组：`isTrusted = false` 的合成事件；E 组：走路键盘 |
| ③ 编辑器的口 | `commitIn`（只看锁）、`undo` `redo` `applyVcb` `startModal` `previewApply` `pointerDownStep`、`setTool`（只看锁，只读工具放行） | 界面钮、右键、测试钩子绕开输入层直接调编辑器 | 探针 D 组：弹窗开着代码调撤销被拒、程序提交照走；F 组：**现读 `editor.ts` 的公开方法枚举调一遍（182 个），模型一步不许动**——新加的方法自动进来，不靠名单 |
| ④ 界面 | 改模型的工具：灰、title 写原因、点了说为什么（`.tool.held`；不是 `pointer-events: none` 的死钮）；锁着工具动作 / 选区动作不露；☰「导入…」灰 | 手误；也是披露（默认 + 披露） | 探针 F 组 |
| ⑤ 规则测试 | `test/input-gate.test.ts`（规则表）、`test/present-lock.test.ts`（每个口都问闸、名单对） | 以后的人改坏规则 | node，每次跑 |

History / kernel **不加**任何检查（深模块零政策，照旧）。

## 4. 体重

`input-gate.ts` 100 行、`input-dom.ts` 50 行。删：`sheets.ts` 的 `GATE_SWALLOWED` + 输入锁 + Esc 监听、`gate-stack.ts gateSwallowsEvent`、`popup-menu.ts` / `choice-layer.ts` 各自的 Esc 监听、`main.ts` 键盘入口三句和 Esc 里那串 close、`flat-input.ts` 的 INPUT 判断、`Editor._locked / lockedSay`、session 五处 `setLocked` 推送。`editor.ts` 4146 行，棘轮 4147 没动。

## 5. 给 VR 铺的路

编辑器本来就不碰 DOM、只吃 `ToolPointer` / `XRPointerFrame` / `KeyAction`。缺的是同一个主人概念，现在有了：手腕面板、以后 VR 里的弹窗 = 名册一行（`root` 是不透明的：那块板的 id；`inside` 由宿主判断）；手柄扳机已经问 `admits("xr")`。桌面和 VR 共一份规则、一份测试。

## 6. 核了什么、没核什么

- 实测（无头）：`probe-input-gate.mjs` A–F 组全绿：面板 / 输入框 / 帮助 / 材质 / 调试日志 / 同步闸门 / 处理中 / 图库 / 菜单开着按 Ctrl+Z、L、Delete、滚轮、中键拖，模型工具相机都不动；Esc 只关最上面的面、人还在组件里；锁着走路真能进（验证工作台 → 步行 → 点地 → FPS → W 键进走路）、选择真能选、卷尺有手势不留线；改模型的工具拿不起来且说明原因。
- 回归：43 个用键盘的探针新旧包对比，见账本 §0。查出的真回归：走路时右键弹菜单（以前菜单开着键盘照走，现在菜单吞键盘 = 走不动）→ 走路时不出右键菜单。
- 没核：VR 那条线整段读码（VR 暂 sunset，没设备）；触屏摇杆 `touch-controls.ts` 没加第二层（只在 FPS 露、被面盖住；读码判定不值得）；真机没跑。

## 7. user 拍的

1. 菜单开着按快捷键：**吞掉**（user 11-05「1 吞掉」）。外点关菜单那一下点在画布上也不穿到工具（同一类穿透，Opus 顺手修，v0.18.38）；点在别的钮上照常一下到位。
2. 演示锁锁着：**只读工具全部能用**（user 11-05「2 只读工具比如walk之类的应该全量可以的」），改模型的工具拿不起来。
