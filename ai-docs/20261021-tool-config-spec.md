# 工具配置（tool config）规范 —— 第一天立的那几条

> created 20261021 · as-of v0.9.0 / 2026-10-21 · created by Claude Fable 5.1
> user 2026-10-21 晚原话：「油漆桶应该有不同的模式，对应平滑组啊，整个connected啊，整个component啊，以及锐角之类的。然后系统的想一下tool config的深模块，第一天就建立好规范，要不要学习weebpaint，但是写的比他更漂亮规整？」
> 代码：`src/editor/tool-config.ts`（模块 + CatsUp 的表）、`src/app/tool-strip.ts`（表 → 底部选项条）、`src/editor/paint-flood.ts`（油漆桶各模式的面集）；测试 `test/tool-config.test.ts`、`test/paint-modes.test.ts`。

## 1. 一句话

**每个工具一张声明式选项表；其余一切从表长出来。** 工具代码只会 `config.get(tool, key)`；UI 只会 `config.entries(tool)`；持久化按每行的 `scope` 路由。加一个选项 = 表里加一行，不碰 UI、不碰持久化、不在工具里私藏变量。

## 2. 从 WeebPaint 学什么、不学什么

| 学 | 不学 |
|---|---|
| `PREF_REGISTRY` 的「**key 自带 scope 与默认值**」——每行必答「换台机器该跟吗？换个文档该跟吗？」（WeebPaint 的 device / gallery / session / ora 四问） | dial-controls / brush-rack / desk 三处 SSoT 分裂（WeebPaint 是演化出来的：先有 dial 再有 rack 再有 desk，每层各存一份「当前值」再 binding 同步） |
| 「不持久化档不设」——没经 user 同意的持久化不开 | thunk 注入顺序的坑（`editMode` 用 thunk 因为声明晚于消费者）——CatsUp 的表是纯数据，构造顺序无关 |
| 修饰键临时覆盖（WeebPaint 笔刷的 Shift 直线等）= SU 的 Ctrl / Shift 语义 | 把 UI 控件手写在组合根里（WeebPaint `shape-toolbar.ts` 一个工具一段 DOM） |

「比他更漂亮规整」的落点只有一个：**表是唯一事实，UI 是生成物**。WeebPaint 的表（PREF_REGISTRY）只管 preferences，工具选项另有一套；CatsUp 一开始就合成一张。

## 3. 表的形状

```ts
TOOL_OPTIONS = {
  circle: { segments: { kind: "number", label: "段数", def: 24, min: 3, max: 96, step: 1, scope: "session" } },
  paint:  { mode:     { kind: "enum", label: "涂哪些", values: PAINT_MODES, def: "single", scope: "session",
                        modifiers: { ctrl: "smooth", shift: "connected", ctrlShift: "sharp" } },
            sharpDeg: { kind: "number", label: "锐角阈值", def: 20, min: 1, max: 90, step: 1, unit: "°", scope: "session" } },
}
```

- `kind`：`enum`（带文字的下拉，≥ 4 项也不打哑谜）/ `number`（− 值 +，触屏不弹软键盘；精确输入归 VCB #11）/ `bool`（开关钮）。
- `scope`：`session`（只活这一次）/ `device`（跟机器：经 `OptionKv` 接缝落 app 的 device-kv，key = `catsup.tool.<tool>.<key>`）/ `doc`（跟文档：归数据契约，未接）。**本版全部 session**——没经 user 同意不开新持久化（测试机械执法）。要开：改那一个词 + main 里构造时递 kv。
- `modifiers`：按住修饰键时的**临时覆盖**，不改存的值（SU：Ctrl 按着 = 另一种模式，松开回来）。要锁定走选项条。
- `unit` 只是标注；值的量纲由选项自己定义（调参纪律 2026-09-08）。
- 类型：`config.get("circle", "segments")` 是 `number`，`config.get("paint", "mode")` 是 `"single" | "smooth" | …`——从表推出来，写错 key 编译期红。

## 4. 模块的接口（全部）

`get / set / reset / effective(mods) / entries(tool) / labelOf / subscribe`。`set` 保证值永远合法（enum 不在表里 → 拒；number 夹范围 + 按 step 量化；bool 强转），同值不通知。零 DOM、零 editor import。

## 5. 油漆桶的五个模式

| 模式 | 跨哪些边 | SU / 修饰键 |
|---|---|---|
| 一张面 `single` | 不跨；有面选区且点在选区里 = 整个选区 | SU 默认 |
| 平滑组 `smooth` | 只跨 `smooth` 边 | Ctrl（SU 的 Ctrl = 相邻同材质，我们按平滑组，更符合「圆柱一下全涂」） |
| 到锐角为止 `sharp` | 只跨两膜夹角 ≤ 阈值的边（默认 20° = 软化对话框默认角） | Ctrl+Shift |
| 连通体 `connected` | 跨任何边 | Shift |
| 整个组 / 组件 `pool` | 本池全部面；点到子 group / 组件时从外面也能涂（组件 = 全部实例一起变，因为材质槽在 definition 上） | — |

## 6. 以后挂上来的

- VCB（#11）：数值小窗 = 另一个渲染器读同一张表的 `number` 行 + 手势里的临时数值；不另造状态。
- offset 距离 / 推拉高度的「上次值」、圆段数的 `24s` 后缀 → 表里加行即可。
- A3 动词注册表落地时（架构自审 0.8 首选），`options` 挂到每个工具模块上，表变成按文件拼装——形状不变。
