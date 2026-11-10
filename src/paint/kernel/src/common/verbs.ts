// verbs —— 顶栏动词表（ADR-0012「动词原则」）：动词 × 子工具 × 路由到现有 EditMode / 滤镜笔 payload 的纯数据（零 DOM，node 直测）。
// created 2026-09-06 by Claude Fable 5.1。策划 = ai-docs/20260906-ui-abstraction-round-proposal.md §2.3。
//
// 动词 = 你的手在做什么（笔 / 橡皮 / 手指 / 套索 / 形状）；子工具 = 同一动词下的另一种走法，长按顶栏钮切（钮面图标随之换，角上小三角）。
// 行为语义零变更：子工具只是**入口**，落地仍是老 EditMode（brush / shapeBrush / lasso / fill）或滤镜笔 payload（smudge / sharpenBlur / liquify）。
// 2026-09-18 user：「形状笔：单独一个顶栏按钮，总之就是行为回滚到那时候。不当笔刷模式了」→ 形状 = 第五个动词位（独立顶栏钮，单子工具，
//   落地 = ADR-0005 的 shapeBrush EditMode；直线 / 矩形 / 圆 / 格线是引擎子工具，住形状条，不是动词子工具）。ADR-0013 几何修饰模式已回滚。
// user 2026-09-06 工作流观察（进 ADR 理由栏）：「你要么是形状笔和橡皮，要么是画笔和橡皮。反而不太会在形状笔和画笔之间切」。
// 记忆：desk.subTool[verb]（per-doc，user 2026-09-06 批准）。

export type Verb = "brush" | "eraser" | "smudge" | "lasso" | "shape";
export const VERBS: readonly Verb[] = ["brush", "eraser", "smudge", "lasso", "shape"];

export interface SubToolDef {
  id: string;
  icon: string;          // sprite symbol id（缺图标的走 stopgap 字形，登记见 20260708 SVG Icons/TODO.md）
  titleKey: string;      // i18n key
  /** 落地路由：老 EditMode 名，或滤镜笔 payload。 */
  route: { mode: string } | { filter: string; variant?: string };
}

export const VERB_SUBTOOLS: Record<Verb, readonly SubToolDef[]> = {
  // 笔位只有自由手（形状笔 2026-09-18 起是自己的动词位，见 shape）
  brush: [
    { id: "freehand", icon: "pencil", titleKey: "tool.brush", route: { mode: "brush" } },
  ],
  // 形状位（2026-09-18 回滚：独立顶栏钮）：单子工具 → shapeBrush EditMode；线/矩/圆/格 在形状条上切（desk.shapeBrush.sub）
  shape: [
    { id: "shape", icon: "shapes", titleKey: "tool.shapeBrush", route: { mode: "shapeBrush" } },
  ],
  eraser: [
    { id: "pixel", icon: "eraser", titleKey: "tool.eraser", route: { mode: "eraser" } },
    // 「整笔」智能擦：另案（需每笔归属图）；落地时在此追加一条即可
  ],
  // 2026-09-09 user：「手指笔的图标应该都是手指」「为什么要角标，你看 adjust filter 都是一样的图标多整洁……就是手指就行啦」
  //   → 六项同一个 finger（顶栏钮面 / 下拉钮面 / 下拉各项全是手指，名字在下拉里说话；blend/blur/sharpen/finger-paint 图标退出 app 侧引用）。
  smudge: [
    { id: "smear", icon: "finger", titleKey: "flt.smudge.smear", route: { filter: "smudge", variant: "smear" } },
    { id: "dull", icon: "finger", titleKey: "flt.smudge.dull", route: { filter: "smudge", variant: "dull" } },
    { id: "paint", icon: "finger", titleKey: "flt.smudge.paint", route: { filter: "smudge", variant: "paint" } },   // 2026-09-06 晚：湿画笔进手指位
    { id: "blur", icon: "finger", titleKey: "flt.sb.blurBrush", route: { filter: "sharpenBlur", variant: "blur" } },
    { id: "sharpen", icon: "finger", titleKey: "flt.sb.sharpBrush", route: { filter: "sharpenBlur", variant: "sharp" } },
    { id: "liquify", icon: "finger", titleKey: "flt.liq.title", route: { filter: "liquify" } },
    // 克隆（stamp）：引擎另案；落地时追加
  ],
  lasso: [
    { id: "select", icon: "lasso", titleKey: "tool.lasso", route: { mode: "lasso" } },
    { id: "fill", icon: "paint-bucket", titleKey: "tool.fill", route: { mode: "fill" } },
  ],
};

export const DEFAULT_SUBTOOL: Record<Verb, string> = { brush: "freehand", eraser: "pixel", smudge: "smear", lasso: "select", shape: "shape" };

export function isVerb(v: unknown): v is Verb { return typeof v === "string" && (VERBS as readonly string[]).includes(v); }

export function subToolDef(verb: Verb, id: string): SubToolDef {
  const list = VERB_SUBTOOLS[verb];
  return list.find((s) => s.id === id) ?? list[0];
}

/** 当前 EditMode（+ 滤镜笔 payload）→ 动词；transient / hand / picker 等非动词模式 → null。 */
export function verbOfMode(mode: string, filterId?: string | null): Verb | null {
  switch (mode) {
    case "brush": return "brush";
    case "shapeBrush": return "shape";
    case "eraser": return "eraser";
    case "lasso": case "fill": return "lasso";
    case "filterBrush": return filterId ? "smudge" : null;   // 任何滤镜笔 payload 都归手指位（模糊/锐化/液化已搬家）
  }
  return null;
}

/** 当前 EditMode（+ payload）→ 子工具 id（用于同步 desk.subTool 记忆与钮面图标）；对不上 → null。 */
export function subToolOfMode(mode: string, filterId?: string | null, variantId?: string | null): { verb: Verb; sub: string } | null {
  const verb = verbOfMode(mode, filterId);
  if (!verb) return null;
  for (const s of VERB_SUBTOOLS[verb]) {
    const r = s.route;
    if ("mode" in r) { if (r.mode === mode) return { verb, sub: s.id }; }
    else if (mode === "filterBrush" && r.filter === filterId && (r.variant == null || r.variant === variantId)) return { verb, sub: s.id };
  }
  // filterBrush 的 variant 不在表里（如液化 pinch/bloat）→ 归该 filter 的第一条
  if (mode === "filterBrush" && filterId) {
    const s = VERB_SUBTOOLS[verb].find((x) => "filter" in x.route && x.route.filter === filterId);
    if (s) return { verb, sub: s.id };
  }
  return null;
}
