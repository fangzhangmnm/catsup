// current-brush-config.ts —— 当前笔的**纯数据契约**。
//   ① 兜底 DEFAULT_CONFIG（无 preset / 无笔架时也能画的引擎默认全集）
//   ② 编辑器 draft 模型（BrushDraft + ensureBrushConfigDefaults 幂等补缺）
// 纯模块：无 DOM / 无 IDB / 无 cloud。view = ui/brush-config-view.ts，派生 = resolved-brush.ts。

import type { AnimCurve } from "./anim-curve.ts";

// 引擎默认参数袋 = ResolvedBrush 的 base（resolved-brush.ts import 之）。
// 当前笔（state.brush 旧单例）已收敛成不可变 ResolvedBrush（见 ai-docs/CONTEXT [[当前笔]]）；
// 这张表是「无 preset / 无笔架」时也能画的兜底默认（user mental model：console 设工具即可绘画）。
export const DEFAULT_CONFIG = {
  size: 12,
  color: "#1b1b1b",
  // 用户当场调（per-tool 持久）：
  opacity: 1.0,           // user.opacity —— 应用在 endStroke composite (Π 外)
  flow: 1.0,              // user.flow —— 进 α_dab (Π 内)
  // 压感 dynamics（preset 冻结，−1..1 signed）：
  sizeCoeff: 0.6,
  opaCoeff: 0.6,
  flowCoeff: 0,
  pressureGamma: 1.0,
  pressureCurve: null as AnimCurve | null,   // 2026-09-05 压感曲线：有则替代 gamma（common/pressure-curve.ts）
  // v102: 压感时间域 LPF (ms，一阶 IIR)
  // 0 = raw，正值 = 平滑（解 "转角顿一下 out-leg 突然细" 的问题）
  pressureLPF: 50,
  // shape：
  hardness: 0.75,
  shapeKind: "round",
  shapeAspect: 1.0,
  shapeRotation: 0,
  // spacing：
  spacing: 0.06,
  // buffer 合成模式：
  compositeMode: "wash",  // "wash" = Alpha Darken (JS max), "buildup" = source-over (Canvas2D native)
  // 笔刷混合模式：整条 stroke 落到 layer 时的 globalCompositeOperation（multiply/screen/...）。
  //   compositeMode 管 stroke 自身内部重叠；blendMode 管整条 stroke vs 下方 layer 像素。
  blendMode: "source-over",
  // pixel mode：
  pixelMode: false,
  // 位置平滑（时间常数指数追踪，详 ai-docs/20260613-brush-procreate-smoothing.md）：
  streamline: 0.15,         // → 时间常数 tau：滞后恒 tau 时长（跟笔/可控/顿涌现）。0.5=满劲 → 默认 0.15=轻
  stabilization: 0,         // 死区拉绳：硬空间阈值去抖（与 tau 频域去抖正交）
  // taper：笔触两端渐细，**纯 stylistic·per-preset**（brushes.js makeBrush 的 taperIn/out → preset.taper）。默认 0=无。
  //   曾有「系统级 anti-spike 硬件 taper 1.5」的设定，但预设永远覆盖它 → 形同虚设且误导，已删（user 2026-06-08）。
  taperIn: 0,
  taperOut: 0,        // 末端渐细长度（× 笔径）。0=无。endStroke 时按到末端距离施加（需总笔长）
  taperFloor: 0.4,    // taper 包络最小压感系数（in/out 两端共用）
};

// —— 编辑器 draft 模型（UI 深化 candidate 1）——
// 把旧 _renderBrushSettings 里散落的「schema 补缺」（`if (b.x == null) b.x = default`）收成一个
// 幂等纯函数：编辑器打开前补齐所有字段，模板就能无脑 v-model（不必到处判 undefined）。
// 也把 spacing 归一成 number（旧代码 spacing 可能是 number 或 {value}），模板只面对 number。
// node 可测（test/brush-settings-model.test.mjs）。
export interface BrushDraft {
  name?: string; tool?: string; folder?: string; blendMode?: string;
  shape?: { kind?: string; aspect?: number; rotation?: number; hardness?: number };
  size?: { base?: number; max?: number };
  sizeCoeff?: number; opaCoeff?: number; flowCoeff?: number;
  pressureGamma?: number; pressureLPF?: number; compositeMode?: string;
  pressureCurve?: AnimCurve | null;   // 可选：编辑器「改用曲线」才写入；「改回 gamma」删键
  defaultOpa?: number; pixelMode?: boolean;
  spacing?: number | { value?: number };
  taper?: { in?: number; out?: number };
  taperFloor?: number;
  smooth?: { streamline?: number; stabilization?: number };
  [k: string]: unknown;
}

// 可编辑的 per-brush config 契约（编辑器 draft 即当前笔配置）。
export type CurrentBrushConfig = BrushDraft;

// 原地补齐编辑器需要的全部字段（幂等）。返回同一对象（方便链式）。
// 默认值与旧 _renderBrushSettings 逐字对齐。
export function ensureBrushConfigDefaults(b: BrushDraft): BrushDraft {
  if (!b.shape) b.shape = {};
  if (b.shape.kind == null) b.shape.kind = "round";
  if (b.shape.aspect == null) b.shape.aspect = 1.0;
  if (b.shape.rotation == null) b.shape.rotation = 0;
  if (b.shape.hardness == null) b.shape.hardness = 0.75;

  if (!b.size) b.size = {};
  if (b.size.base == null) b.size.base = 12;
  if (b.size.max == null) b.size.max = 200;

  if (b.sizeCoeff == null) b.sizeCoeff = 0.6;
  if (b.opaCoeff == null) b.opaCoeff = 0.6;
  if (b.flowCoeff == null) b.flowCoeff = 0;
  if (b.pressureGamma == null) b.pressureGamma = 1.0;
  if (b.pressureLPF == null) b.pressureLPF = 50;
  if (b.compositeMode == null) b.compositeMode = "wash";
  if (b.defaultOpa == null) b.defaultOpa = 1.0;
  if (b.blendMode == null) b.blendMode = "source-over";
  b.pixelMode = !!b.pixelMode;

  if (!b.smooth) b.smooth = {};
  if (b.smooth.streamline == null) b.smooth.streamline = 0.15;
  if (b.smooth.stabilization == null) b.smooth.stabilization = 0;

  if (!b.taper) b.taper = {};
  if (b.taper.in == null) b.taper.in = 0;
  if (b.taper.out == null) b.taper.out = 0;
  if (b.taperFloor == null) b.taperFloor = 0.4;

  // spacing 归一成 number（fraction）：旧值可能是 number 或 {value}
  b.spacing = (typeof b.spacing === "number") ? b.spacing : (b.spacing?.value ?? 0.06);

  return b;
}
