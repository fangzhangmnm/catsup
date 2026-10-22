# 工具 = 一个模块：底座 / 工具模块的接缝（提案 .h）

> created 20261021 · as-of v0.9.12 / 2026-10-21 夜 · created by Claude Fable 5.1
> user 2026-10-21：「架构重构同意，帮我科普一下」「优先做架构重构」；起因 = 架构自审 0.8 首选（`ai-docs/reports/20261021-architecture-review-0.8.html`）：加一个工具要碰 9 处。
> 代码：`src/editor/tool-handler.ts`（接口 = 这里的 .h）、`src/editor/tools/offset.ts`（样板）、editor.ts 的委托点（down / track / up / live / cancel / active / 样本 extra）。

## 1. 为什么

今晚一晚加了 5 个工具，每个都要在 editor.ts 的 5 处 + main.ts 3 处 + index.html 1 处动手；editor.ts 1800 行、42 个按工具名分支的 case。
目标：**加一个工具 = 加一个文件**。行为零变更——搬的是代码位置不是语义。

## 2. 分工（谁拥有什么）

| 底座 editor.ts 拥有 | 工具模块拥有 |
|---|---|
| 指针帧 / 视口 / ε、吸附求解入口、选区、上下文（池地址）、撤销 / 提交（commitOp）、抬笔结算（样本环）、两击 / 三击 arm、意图门开关、HUD 刷新、数值小窗的 `last` | 自己的手势状态（按下点、面、距离…）、按下 / 跟随 / 松手 / 预演 / 取消 / 自己要进样本环的数 |
| 手势公共三件：anchor3 / cursor3 / snapInfo（工具只经 ctx 的 set 口写） | — |

工具文件**不 import 别的工具、不碰 editor.ts 私有字段**，只认 `ToolCtx`。这是以后 VR 换一套手势实现的接缝（同一个工具模块，不同的底座喂它）。

## 3. 接口（= `src/editor/tool-handler.ts`，实现中形状变了要回写这里）

```ts
export interface ToolCtx {
  readonly config: CatsUpToolConfig;
  kernel(): Kernel;  selection(): Readonly<Selection>;  world(): WorldView;  live(): WorldView;
  frame(): PointerFrame;  vp(): Viewport;  eps(): EpsSet;  snapPx(): number;
  pickFace(sx, sy): FaceId | undefined;
  classify(view, hit): Classified;                 // entity / pool / none
  snap(view, sx, sy, q: AlignQuery): Snap3;
  alignSources(): Pt3[];  hand(view): AlignHand;
  toLocal(p): Pt3;  ctxXform(): Xform;  activePool(): PoolRef;
  intentOn(s, travel?): boolean;
  commitOp(op): FaceEvent[];  opCount(): number;  hint(text | null): void;
  anchor(): Pt3 | null;  setAnchor(p): void;  setCursor(p): void;  setSnap(sn): void;
  recordLast(L: LastGesture): void;                // 数值小窗
}
export interface ToolHandler {
  readonly tool: Tool;
  active(): boolean;  cancel(): void;
  down(ctx, ev: ToolPointer): void;
  track(ctx, s, travel?): void;
  up(ctx, ev, settle: () => ToolSample | null): void;   // settle = 抬笔结算后的那一帧
  live(ctx, run): string;                                // 预演 → 尺寸文案
  sample(): Record<string, number>;                      // 进样本环的数
}
```

底座的委托点（editor.ts）：`handlers: Partial<Record<Tool, ToolHandler>>`；pointerDown / trackGesture / pointerUp 的 `default:` 分支、computeLive 的第一分支、cancelGesture 对所有模块调 cancel、gestureActive 加一票、样本环带 `extra = handler.sample()`。

## 4. 搬迁顺序（Opus 票 3）

1. 已搬：偏移（样板，有拖拽态）、跟随（第二个适配器：无拖拽态，纯函数 `pathFromSelection` 可 node 直测；为它给 ctx 加了 `selection()`）。
2. 状态少的先：油漆桶、橡皮（含软化 / 硬化修饰）。
3. 画线 / 矩形 / 圆（共用「锚点 + 画线平面」底座态；连画态留底座）。
4. 推拉（ppStops / ppInferenceWorld / 高度通道）、移动（复制 / 池 / 阵列载荷）、旋转（三击）、缩放（柄）——和抬笔结算、两击 arm 耦合最深，每个单独一轮。
5. 选择最后（框选 + 点击族）。
6. 全搬完：`spec`（图标 / 中文名 / 键位 / 帮助一行）与 `options`（tool-config 表那一片）挂到模块上，main.ts 的 TOOL_SPEC / 键位表 / index.html 帮助 / 选项条从模块长出来。

每搬一个：`npx tsc` + `node test/run.mjs` + 探针（boot / scene / lift / vcb / context / taps / followme）全绿才提交。

## 5. 没进接缝的（刻意）

- 抬笔结算、意图门的数学：底座的事，工具只拿结果（settle 帧、intentOn）。
- 数值小窗的重做（applyVcb）：仍在底座按 `LastGesture.kind` 分支；等工具都搬完再考虑把 redo 也挂到模块上。
- VR 的 PointerFrame：契约照旧，模块不感知。
