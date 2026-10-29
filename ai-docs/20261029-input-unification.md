# 输入的统一接口：起手方式、正在打的字、小键盘

> created 20261029 · as-of v0.16.56 / 2026-10-29 · created by Claude Fable 5.1 · 周账 F-125（user 10-28 夜「找到真正的 bug 了：键盘触发的 G/R/S/E/I 把那次按键当成指针按下处理，误走了『选区外点击=操作该点』的逻辑」「记周账，现在因为加了各种数字输入。让fable再整理一下输入的统一接口」；同晚「屏幕空间太小得不弹，按一下弹有一个按钮」）

## 0. 一句话

输入有三件事要有主：**一次手势怎么起的**、**正在打的字归谁**、**触屏的小键盘从哪弹**。以前三件各自靠约定（一个字符串标记、两份缓冲、一处键盘只给一半），现在各一个结构：`ToolPointer.start`（带类型的枚举）、`Editor.typing`（`controller/typed-input.ts` 的一个实例）、右下角那颗胶囊（手势中也亮）。

## 1. 起手方式 = 一等字段（那个 bug 的根）

| 以前 | 现在 |
|---|---|
| 工具自己造一个假的指针按下，`pointerType: "keyboard"`；`selecting.ts pressTarget` 认这个字符串才不走三分法；别处（吸附底按设备、点按族）又得各自把它当例外 | `ToolPointer.start: "pointer" \| "keyboard"`（`src/editor/editor.ts GestureStart`）。**只有 `ToolCtx.keyboardStart(at)` 造 `"keyboard"`**（编辑器填：位置 = 最近一次真指针、`pointerType` = 最近一次真指针的设备）。`pointerType` 从此永远是真设备。 |
| 谁关心 | `pressTarget`：`start === "keyboard"` = 永远对选区做（Blender）；别的消费者（吸附底 `SNAP_BASE`、点按族 `TAP_RULES`）看 `pointerType`，自然对。 |

规律：**设备（pointerType）和起手方式（start）是两个正交的轴**，不互相冒充。以后「点一下等下一点」（硬表面的 steps 语法）要是也需要区分，就是 `start` 多一个值，不是再加一个字符串约定。

## 2. 正在打的字 = 一个主人（`controller/typed-input.ts`）

| 以前 | 现在 |
|---|---|
| 两份缓冲：编辑器 `typedBuf`（手势中打数，S Z 0）+ `app/vcb.ts buf`（刚做完一步按精确值重做）；键表两层（`gesture:typing` / `vcb`）；两套「哪个键能进」；两个回车 | 一份字、一个去向、一层键表（`typing`，动作 `typing.key`）、一个入口 `editor.typing.feed(key)`。去向由现状定：手势进行中且这把工具收数 = `gesture`；否则刚做完一步能改 = `vcb`；都不是 = null（没人收字）。**去向一变字就清**（`sync()`，步结束 / 手势开始结束时编辑器调）。 |
| 语法 | 各归各：gesture = `units.ts quantityKey`（这个量写得出来的字）；vcb = 老语法（数字开头；单位 / 段数 s / 阵列 x 只能跟在后面）。读法照旧各自：gesture = `parseQuantity`，vcb = `editor/vcb.ts parseVcb`。 |
| 回车 / 退格 / Esc | 主人发事件：`confirm`（gesture → 编辑器 `confirmGesture`；vcb → `app/vcb.ts apply`）；退格删一个（手势里空着也吞掉，别漏成「删除选区」）；Esc 只管 vcb 清空，手势里的 Esc 归手势层（只取消这次操作、选区留着）。 |
| 键表位置 | 手势中：打字层压在手势层上面（数字 / 单位先给它，X Y Z 不是量的字、照旧锁轴）；不在手势里：打字层在镜像会话 / 步行层下面（同一层对象两个位置，`layersOf`）。 |

没并进来的：**单位文本框**（`ui/field-control.ts` 点数值就地打字）和**滑条**（`ui/vslider.ts`）——它们是 DOM 自己的焦点输入，读法本来就是同一个 `parseQuantity`，没有「谁收键」的问题；硬并进来只会多一层转发。

## 3. 触屏小键盘一处弹

右下角那颗胶囊（`app/vcb.ts`）= **打数的唯一回显 + 唯一键盘入口**：手势进行中也亮（写「打数」），点开同一块键盘，键进同一个主人；单位键那几行跟着去向换（手势 = 这把工具收的量：长度 m cm mm ft in / 角度 ° / 倍数 %；刚做完一步 = `padUnitKeys`）。user「屏幕空间太小得不弹，按一下弹有一个按钮」= 这颗胶囊。

## 4. 碰了什么（v0.16.56）

`editor.ts`（`GestureStart` / `ToolPointer.start` / `ToolCtx.keyboardStart` / `typing` 实例取代 `typedBuf`；两处「pointerType !== keyboard」的例外删了）· `tools/mesh-transform.ts` / `mesh-pull.ts`（`ctx.keyboardStart(s)`）· `tools/selecting.ts`（看 `start`）· `controller/typed-input.ts`（新）· `controller/keymap.ts`（`TYPING` 一层取代 `gesture:typing` + `vcb`；`KeyContext.typingWants` 取代 `vcbWants`）· `app/vcb.ts`（只画、只订阅；`feedKey / wants` 没了）· `app/main.ts`（`typing.key` 一条）。守卫 `test/typed-input.test.ts` + `test/keymap.test.ts`；探针 typed-amount / vcb / drawer / mesh-transform / mesh-pull / soft-select / snap-base / ipad-pen / extrude-feel 全过。
