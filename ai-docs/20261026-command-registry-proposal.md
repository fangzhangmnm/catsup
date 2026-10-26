# 指令注册表 · 提案（纪元排期 T4 / 账本 DT1）

> created 20261026 by Claude Opus 5.5 · as-of v0.14.35 / 2026-10-26
> 状态：**提案，等 user 过目；周二（10-27）Fable 审**。没动代码。现状头文件 = `api/src/`（v0.14.35 刷新，`scripts/gen-api.sh`）。
> user 拍过的形状要求（10-25）：「面板里也可以配置，所以能不能做成blender一样一个命令是一个类似函数的东西，你面板喂，而不是查面板。以及注意性能」；DT5：「他们语义上就是一个东西，只是作用域……不同」。

## 1. 为什么要它（一句话）

同一件事现在散在五处各写一遍：快捷键（`main.ts` keydown 一串 if）、选区动作表（`HudModel.edits()` → 右键菜单 / 浮条 / VR 面板）、☰ 和视图菜单、工具条动作（`tool-config.ts`）、Editor 上的方法。修复面板、以后的搜索、数 op（GTA 毕业考）都要「一张表」，不然每加一条指令就要改五处。

## 2. 形状（提案 .h）

```ts
// src/editor/commands.ts（新）—— 指令 = 一个纯函数：(环境, 作用域, 参数) → 一步的 op。指令永远不读 UI / 面板。

/** 作用域（DT5：同一个动词，量词不同）：选区 / 当前在编辑的物体里全部 / 指定的（橡皮刮到的那几处）。 */
export type Scope =
  | { kind: "selection" }
  | { kind: "context" }
  | { kind: "picked"; faces?: FaceKey[]; edges?: EdgeKey[]; verts?: Pt3[]; instances?: InstId[]; groups?: GroupId[] };

/** 指令能看到的东西（只读快照）：场景、在哪个组件里、选区、文档设置（格距、单位）、工具记住的选项（锐角阈值等）。 */
export interface CommandEnv {
  readonly scene: Scene;
  readonly ctx: EditContext;
  readonly selection: SelectionSnapshot;   // = 现在撤销里存的那份（面 / 边 / 点 / 参考几何 / 组 / 组件）
  readonly settings: DocSettings;
  readonly options: ToolConfigView;        // 只读；指令需要的默认值从这里取，但真正用的值一律走 params
}

/** 参数表 = 参数小窗现成的字段定义（param-panel.ts ParamFieldDef：枚举 / 数值 / 开关）——对话框、修复面板、右键菜单都按它长出来。 */
export interface CommandParam<K extends string = string> { key: K; def: ParamFieldDef }

export interface Command<P extends Record<string, ParamValue> = Record<string, ParamValue>> {
  readonly id: string;                      // 稳定 id：复现包 / 数 op / 快捷键表 / 修复面板配方都按它记
  readonly label: string;                   // 界面上的名字（「焊接全部断口」）
  readonly icon?: string;                   // 图标库 id
  readonly hint?: string;                   // 一句人话说明
  readonly params: readonly CommandParam<keyof P & string>[];
  defaults(env: CommandEnv): P;             // 默认参数（可以读文档设置，例如格距）
  readonly scopes: readonly Scope["kind"][];// 支持哪些作用域
  /** 能不能做：true = 能；字符串 = 不能的人话原因（菜单里灰掉、提示行说）。要便宜：每次重画菜单都调。 */
  available(env: CommandEnv, scope: Scope): true | string;
  /** 纯函数：产出这一步的 op（不改任何东西）。报告（「焊了 12 处」）随结果一起回。做不了 = 人话原因。 */
  run(env: CommandEnv, scope: Scope, params: P): { ops: Op[]; report?: string } | { error: string };
}

export interface CommandRegistry {
  register(cmd: Command): void;
  get(id: string): Command | undefined;
  list(filter?: { scope?: Scope["kind"]; tag?: string }): readonly Command[];
}

// 调用（Editor 上唯一的入口）：
//   runCommand(id, scope, params)          = 一步提交（原子：任何一条失败整步回滚，已有）
//   previewCommand(id, scope, params)      = 同一组参数在克隆上跑一遍画出来（马前炮 / 对话框 / 修复面板用）
// 快捷键表 = { 按键 → { id, scope, params } }；右键菜单 / 浮条 / ☰ / 搜索 / 修复面板 = 只读注册表凑参数、调 runCommand。
```

工具（推拉 / 移动…）仍是 `ToolHandler`（≈ Blender 的 modal operator，手势状态机）；表里只登记「切到这个工具」一种条目，手势不进表。

## 3. 白得的东西

- **预演**：同一个函数、同一组参数，在克隆上跑一次就是预演；应用 = 再跑一次真的。
- **修复面板**：一串（指令 id, 作用域, 参数）按顺序跑，整串 = 一步、一次撤销（原子已有）。
- **复现包 / 数 op**：记（id, 作用域, 参数）就能重放。
- **作用域只是参数**：「焊接」（橡皮刮到的）和「焊接全部断口」（物体里全部）是同一条指令（user DT5）。

## 4. 性能（user「以及注意性能」；AI 列的，周二请 Fable 一起看）

- `available` 每次重画菜单都调，必须 O(选区) 或更便宜，不许扫整个场景。
- `run` 只碰作用域里的池（结算机已经是 O(影响域)）；一个池里所有顶点一次 `moveVertices` 批量挪，不逐点提交。
- 组件按定义去重：一个定义只处理一次，不按实例数重复。
- 预演在参数变的时候重跑要防抖；**只克隆被碰到的那几个内核**，不克隆整个场景。这一条要改现在的预演通路：现在只克隆活动池那一个内核，跨物体的指令（吸到格点、作用在好几个选中组件上）预演不了。这就是周二要请 Fable 看的「任何 op 都能预演」。

## 5. 搬迁（行为零变化；每步一版、各自推开发版）

1. 建表 + `runCommand` / `previewCommand`；先登记已有的选区动作：删除、建组、建组件、炸开、镜像…、焊接、炸开曲线、进入编辑、锁定 / 解锁、隐藏、应用缩放、退出一层、软化 / 硬化、选择连通体、反选、取消选择。右键菜单 / 浮条 / VR 面板改读表（`HudModel.edits()` 变成表的一个视图）。
2. 快捷键：`main.ts` keydown 里的 G / Ctrl+G / Ctrl+Shift+G / H / Alt+H / Ctrl+A / Ctrl+I / Alt+A / Delete / Shift+Z 改成「按键 → 表」。
3. ☰ 和视图菜单里的场景动作（全部显示、缩放到全部、重置轴、删除所有参考线）。
4. 工具条动作（`tool-config.ts` 里的「选轴心」「轴移到选择中心」这类）。
5. 修复指令直接按表写（DT5 焊接全部断口 → DT4 吸到格点 → DT7 拍平），修复面板读表。

验收：右键 / ☰ / 快捷键 / 浮条在搬迁前后行为逐项一致（现有探针 + 每步加一条「表里每一项都能在菜单里找到」的守卫）。

## 6. 要 user 拍的

1. **作用域怎么选**：修复面板顶上一个「作用于：选中的 / 整个物体」下拉，还是每条指令自己带默认（焊接默认整个物体、拍平默认选中的）？
2. **表要不要以后给用户改快捷键**：现在只是内部一张表；开放改键 = 要存到设置里，另算。
