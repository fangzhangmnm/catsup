# 输入闸：谁拥有输入、模型现在能不能改（设计稿，没施工）

> created 20261105 by Claude Fable 5.1 · as-of v0.18.37 / 2026-11-05 · 状态：**设计稿，等 user 拍 §7 两问，然后 Opus 施工（一张单，排 bump minor 之前）**
> 出处：user 2026-11-05「再系统的查一下设计，和定稿锁编辑一起设计，应该有一个全局的窄接口，架在输入之前，而且要多放几层瑞士奶酪，我们有中心化的输入深模块吗。以后给vr铺路」。起因 = v0.18.37 修的「普通弹窗开着 Ctrl+Z 能隔着弹窗撤销、工具键能换工具、Esc 把人踢出组件」（账本 §0 11-05）。
> 「定稿锁编辑」在本稿里 = **演示锁**：定稿 / 改稿的版本章 2026-10-29 已被演示锁吃掉（user 10-28「定稿的语义不对，这个是锁屏，不是 commit」，周账 F-124，`20261024-finalize.md` 顶注）。要是 user 想的是别的锁，§7 问。

## 0. 一句话

现在**没有**中心化的输入模块：「这一下该不该交给编辑器」的判断散在 7 处（见 §1），每处各记一半的面，所以漏。方案 = 一个 DOM 无关的小模块 **`controller/input-gate.ts`**，两条轴：**① 谁拥有输入**（面 / 菜单 / 文本框 / 参考窗 / 走路 / 编辑器，一个栈）**② 模型此刻能不能改**（演示锁 / 正在问话 / 会话停摆，一个集合）；所有输入源（键盘、指针、滚轮、触屏、XR、界面钮）进编辑器之前问它一句，所有面开关时向它登记一笔。再加五层各自承重的奶酪（§3）。编辑器本身不碰 DOM、只吃 `ToolPointer` / `KeyAction`（现状已如此），这就是给 VR 铺的路（§5）。

## 1. 现状（都核过代码；标「没实测」的只是读码）

### 1.1 输入从哪进编辑器

| 源 | 在哪 | 进编辑器之前查什么 |
|---|---|---|
| S1 键盘（编辑） | `app/main.ts` `window keydown`（1525 行附近） | 目标是 INPUT / TEXTAREA → 让路；`isAnyFaceUp()`（11-05 新加）；`refHost.hasFocus()`；键表 `controller/keymap.ts resolveKey(keyContext)`（走路层独占、打字层） |
| S2 键盘（走路） | `player/flat-input.ts` 自己挂的 `window keydown` | **只查 INPUT / TEXTAREA**，不知道面 |
| S3 键盘（修饰键显示） | `main.ts noteMods`（capture）、`keyup` Shift | 只显示，不改模型 |
| S4 指针（画布） | `app/gestures.ts attachGestures` → `editor.pointerDown / Move / Up / Leave`、相机、双指撤销 / 三指重做、右键菜单 | `opts.toolBlocked()`（= 演示锁 / 传送充能 / 放置中 / FPS） |
| S5 触屏走路 | `app/touch-controls.ts` | 只在 FPS 阶段露出，喂 locomotion |
| S6 XR | `app/vr.ts` → `XRPointerFrame` → `editor.pointer*`；手腕面板；player `InputFrame` | 自己一套（VR 暂 sunset） |
| S7 界面钮 | 左柱 / ☰ / 层级窗 / 物件窗 / 参数面板 / 数值小窗 / 选区条 / 视图 gizmo … | 各自直接调 `editor.*`；被面罩住靠 **CSS z 序**挡指针 |
| S8 文件 | 拖放 / `<input type=file>` | 无 |
| S9 程序 | 自动保存 tick、闸门、`__catsup` 测试钩子 | 无 |

### 1.2 面（可能拥有输入的东西）和它们今天挡不挡键盘

z 序（`styles.css`）：busy 700 > 面板 `#sheet` 500 = 帮助 = `#matSheet` > 同步闸门 450 > 通知栈 400 > 菜单 300 > 图库全屏 250 > 指令板 240 > 浮窗 200 > 抽屉 150 > HUD 5。指针方向靠这个 z 序挡，是对的；**键盘方向只有两处真挡**：

| 面 | 指针 | 键盘 | 在 `isAnyFaceUp()` 里？ |
|---|---|---|---|
| F1 面板 `#sheet`（问 / 确认 / 输入 / 表单 / 口令） | 罩住 | 11-05 起 S1 让路；S2 不让 | ✔ |
| F2 同步闸门 `.sync-gate` | 罩住 | **自己装了 capture 屏障**（`sheets.ts GATE_SWALLOWED`：键 / 指针 / 滚轮 / 右键全吞，Esc 有值） | ✔ |
| F3 busy 遮罩 | 罩住 | **不挡**：「正在加密…」时 Ctrl+Z 照样撤销 | ✘ |
| F4 弹出菜单 / F5 下拉层 / F7 右键菜单 | 外点关菜单 | 自己只接 Esc；**别的快捷键穿过去**（菜单开着按 L = 换工具、菜单还开着） | ✘ |
| F6 指令板 `.board` | 非模态 | 不挡 | ✘ |
| F8 材质面 `#matSheet`（老的，材质纪元会换） | 罩住 | 不挡 | ✘ |
| F9 帮助 | 罩住 | 不挡 | ✘ |
| F10 图库全屏 | 罩住 | **不挡**（读码：keydown 里没有 `galleryHost.isOpen()`；没实测） | ✘ |
| F11 浮窗（层级 / 物件 / 机器） | 非模态 | 文本框靠 INPUT 检查 | — |
| F12 参考窗 | 非模态 | `refHost.hasFocus()` 单独一条 | ✘（另写） |
| F13 通知栈（带钮） | 非模态 | — | — |

结论：**不是「漏了一个面」，是没有一张面的名册**。每加一种面都要记得去 S1 / S2 / S4 各补一句，必漏。

### 1.3 「能不能改」今天怎么拦（演示锁）

- 真值 = `session.desk.locked`（跟文件走）→ `editor.setLocked()` → `Editor._locked`，**七个口各查一次**：提交 `commitIn`、撤销、重做、数值小窗 `applyVcb`、键盘起手 `startModal`、预演 `previewApply`、指针按下 `pointerDownStep`；外加 app 层 `toolBlocked` / `onContext` 再查一次、`body.doc-locked` 灰工具区、左上角锁牌。守卫 = `test/present-lock.test.ts`、探针 `probe-present-lock.mjs`。
- 这套是对的、够深（History / kernel 零政策，提交口是真漏斗）。缺的只是：**「正在问话」「会话停摆」这两种「此刻不许改」没有走同一条路**——11-05 修的弹窗 bug 本质是「问话期间场景不许变」，修在了键盘入口（S1），S2 / S9 没覆盖。
- 物件锁 `inst.locked` 是数据（哪几个物件），不进本稿。

## 2. 提案 .h（pin 住的接口；实现中形状变了回写这里）

```ts
// src/controller/input-gate.ts —— 输入闸。DOM 无关（node 可测；VR / 桌面 / 测试同一份）。
export type Owner = "editor" | "walk" | "face" | "menu" | "text" | "refwin";
export type Source = "key" | "pointer" | "wheel" | "touch" | "xr" | "ui";
export interface Ticket { release(): void }
export interface InputGate {
  /** 面 / 菜单 / 文本框 / 参考窗 / 走路 开始 = 认领输入，结束 = 释放；栈顶是主人；栈空 = editor。
   *  modal：外面的输入一律吞（面板 / 闸门 / busy / 图库 / 帮助）；非 modal：键盘归我、外面的指针先把我关掉（菜单 / 下拉层）。 */
  claim(owner: Exclude<Owner, "editor">, o: { label: string; modal: boolean; root?: unknown }): Ticket;
  owner(): Owner;
  /** 这一下该不该交给 to。表：主人 === to → 过；主人 modal → 全不过；主人 menu → key 不过、pointer 过（给外点关菜单）；主人 text → key 不过、pointer 过。 */
  admits(source: Source, to: Owner): boolean;
  /** 编辑许可。hold = 「此刻不许改模型」的一条理由（演示锁 / 正在问 / 停摆），可叠加；whyHeld = 给人看的第一条，空 = 能改。 */
  hold(why: string, kind: "lock" | "asking" | "halted"): Ticket;
  whyHeld(): string | null;
  /** 面开过几代（等面关的人用：中途开过又关了要重算）——接 sheets.ts faceGeneration。 */
  generation(): number;
  onChange(fn: () => void): () => void;
}
export function createInputGate(): InputGate;
```

```ts
// src/app/input-dom.ts —— 唯一挂 window / document 捕获阶段输入监听的地方（键 / 指针 / 滚轮 / 右键）。
export function installInputDom(gate: InputGate, g: { on(source: Source, to: Owner, h: (e: Event) => void): () => void }): void;
```

Editor 侧只改一处契约：`EditorHost` 加 `editHeld?(): string | null`；`Editor._locked` 删掉，七个口统一问 `this.refuse()`（= `host.editHeld?.() ?? null`，非空 → `host.hint(why)` + trace + 拒）。`setLocked` 保留为壳（session 在 gate 上 `hold`，编辑器重画 = `onChange`）。

## 3. 五层奶酪（每层各自承重，一层漏了下一层兜；不许「上面拦了所以下面不用查」）

| 层 | 在哪 | 拦什么 | 漏了谁兜 |
|---|---|---|---|
| ① DOM 一道门 | `app/input-dom.ts`：capture 阶段 `keydown / keyup / pointerdown / wheel / contextmenu` 各一个监听；问 `gate.owner()`，主人 modal 且事件目标不在它 `root` 里 → `stopImmediatePropagation + preventDefault`（= 把同步闸门的 `GATE_SWALLOWED` 推广到所有 modal 面；Esc 的特判原样搬）。S1 / S2 / S3 的编辑器方向监听改成 `g.on("key", "editor", …)` 注册：门不认编辑器是主人就不叫它们 | 弹窗 / busy / 图库 / 帮助 / 材质面开着的键盘和滚轮 | ② |
| ② 消费者自检 | `main.ts` 键盘入口的 4 个 if、`flat-input.ts`、`gestures.ts toolBlocked`、`vr.ts` 喂指针前：各留**一句** `if (!gate.admits(src, "editor")) return;` | ① 没装 / 事件没经 window（合成事件、测试钩子、以后 XR） | ③ |
| ③ 编辑器边界 | Editor 七个口 `refuse()`；hold 的三种来源：演示锁（session，跟 `desk.locked`）、**正在问**（`sheets.ts` 开面板时自动 `hold(…, "asking")`，关了释放——弹窗开着连程序路径也改不了场景，11-05 那个 bug 的根治）、停摆（session `halted`） | 界面钮 / 粘贴 / 导入 / 测试钩子绕开输入层直接调 editor | ④ 看得见、⑤ 测得出 |
| ④ 界面声明式 | 动词注册表 `controller/placement.ts`（`MenuRow`）/ `stance.ts` 行加 `edits?: true`；`whyHeld()` 非空 → 这些钮灰、title = 原因；`body.doc-locked` → `body[data-held]` | 手误；也是披露（默认 + 披露） | — |
| ⑤ 机械守卫 | `test/input-gate.test.ts`（node：栈、admits 表、hold 叠加、generation）；`present-lock.test.ts` 扩成**枚举 Editor 公开改模型的方法**（白名单在测试里，少一个就红）：held 时逐个调 → `revision` 不变、hint 带原因；探针 `probe-input-gate.mjs`：每种面开着按 Ctrl+Z / L / Esc、拖画布、点浮窗 → steps / tool / depth 不变、Esc 只关面 | 以后的人改坏任何一层 | — |

History / kernel **不加**任何检查（深模块零政策，照旧）。

## 4. 瘦身 / 体重

删：`sheets.ts` 的 `isAnyFaceUp / whenFacesClosed / faceGeneration / GATE_SWALLOWED` 四样（搬进 gate + input-dom，名字可保留为别名一个版本）、`main.ts` 键盘入口的 isAnyFaceUp / refHost / INPUT 三句、`flat-input.ts` 的 INPUT 句、`toolBlocked` 里的 locked 分支、`Editor._locked / setLocked 真值 / lockedSay` 七处改成 `refuse()` 一处。
增：`input-gate.ts` ≈ 120 行、`input-dom.ts` ≈ 80 行、注册表 `edits` 标记 ≈ 20 行、测试。净 ≈ +150；**`editor.ts` 只减不增**（棘轮 4147 不动）。

## 5. 给 VR 铺的路

- Editor 今天就只吃 `ToolPointer`（gestures 造）/ `XRPointerFrame`（vr.ts 造）/ `KeyAction`（键表造），不碰 DOM——换头显不改编辑器，这条已经对。
- 缺的是**同一个主人概念**：VR 里的手腕面板、以后 VR 里的弹窗 = `claim("face")`；手柄 trigger 喂指针前 `admits("xr", "editor")`；VR 走路 = `claim("walk")`。gate 不认识 DOM、不认识头显，所以桌面和 VR 共一份规则、一份测试。
- 以后要做「VR 里问话」时，面是世界里的一块板，`root` 不是 DOM 节点而是那块板的 id——`claim` 的 `root` 类型留 `unknown` 就是为这个。

## 6. 核了什么、没核什么

- 核了：§1 的每一行都在源码里看过（文件 / 函数名写在表里）；z 序读 `styles.css`；演示锁七个口 grep `_locked` 逐个看过；11-05 的键盘 bug 无头实测过（账本）。
- 没核：F10 图库开着快捷键穿过去是读码，没实测；F4 菜单开着按工具键的实际表现没实测；VR 那条线整段读码（VR 暂 sunset，没设备）。
- 没做：本稿零代码。

## 7. 要 user 拍的（两问，选了会怎样）

1. **菜单（弹出菜单 / 右键菜单 / 下拉层）开着时按快捷键**：**吞掉**（菜单是主人，Esc 关，Blender 也这样；推荐）——还是**先关菜单再执行**（少按一次 Esc，但菜单里有文本框 / 搜索时会误触）。不拍按推荐。
2. **演示锁锁着时「切工具」要不要也拒**：今天键盘起手（G / R / S / E / I）拒、左柱灰但点了还是换（只是换不出效果）。**统一拒 + 说原因**（推荐，和 ④ 一致）——还是**允许换工具只拒改**（锁着能看哪把工具的提示）。不拍按推荐。

## 8. 施工单（给 Opus；一张）

1. `controller/input-gate.ts` + `test/input-gate.test.ts`（先红再绿）。
2. `app/input-dom.ts`：搬 `GATE_SWALLOWED`；`sheets.ts` 四样改成从 gate 读（别名保留）；面板 / 闸门 / busy / 口令面 / `#matSheet` / 帮助 / 图库全屏 / 弹出菜单 / 下拉层 / 右键菜单 / 参考窗 / 文本框（focusin / focusout 一对监听）各 `claim`。
3. S1 / S2 / S3 改成经 `g.on(…)` 注册；S4 `toolBlocked`、vr.ts 加 `admits`。
4. Editor：`EditorHost.editHeld`，七口 `refuse()`，删 `_locked` 真值；session 用 `hold`；`sheets.ts` 开面自动 `hold("asking")`。
5. 注册表 `edits` + 灰化；`present-lock.test.ts` 扩枚举；`probe-input-gate.mjs`。
6. 流程图 `20261026-pipelines.md` 加一条「输入 → 闸 → 编辑器」；`api/` 重打；本稿 §2 回写实际形状。
