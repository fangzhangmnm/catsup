// app/paint-brushes.ts —— 画画工作台：每支笔的旋钮（大小 / 浓度 / 硬度）+ 每把工具现在拿的是哪支。created 2026-11-12 by Claude Opus 5.5（施工单二十 1b；笔的模型第五节）
// 活的旋钮住工具配置（paintPen / paintEraser 的 size / opacity / hardness：左栏两根竖滑条、工具条的硬度直接读写它们）；笔住 paintPen 的 brush 选项（工具条的下拉）。
// 这里管两件事：
//   ① 换笔：工具条上挑了另一支 → 手上这组旋钮存回上一支、套上新的那支（记过的用记的，没记过的用它记录里的初值），大小夹到新那支的上限（size.max）。
//   ② 跟文件走（桌面态 1.6 paint.brushes / active，main.ts 套上 / 写回）：apply = 载入 / 新建时套上；toDesk = 写回去的那两个键。
//      本版没有的笔、active 里本版没有的 tool 原样带回（写回时从上一份桌面态起步）；没碰过的笔不写（以后改了初值照新的走）。
// 不碰模型、不进撤销、不标脏（和以前一样）。画画软件的 dial 也是每支笔记自己的大小 / 浓度。
import type { CatsUpToolConfig } from "../editor/tool-config.ts";
import type { PaintDeskDoc, PaintKnobsDesk } from "../format/document.ts";
import { BRUSHES, DEFAULT_BRUSH, type BrushId } from "../paint/brush-records.ts";
import { brushKindOfTool, recordToolOf } from "../paint/brush-kinds.ts";

type PenTool = "paintPen" | "paintEraser";
const PEN_TOOLS: readonly PenTool[] = ["paintPen", "paintEraser"];
interface Knobs { size: number; opacity: number; hardness: number }

export interface PaintBrushes {
  /** 这把工具现在拿的是哪支（不是画的工具 = null）。 */
  current(tool: string): BrushId | null;
  /** 大小滑条的上限 = 手上这支笔的 size.max。 */
  sizeMax(tool: string): number;
  /** 工具配置变了（main.ts 的订阅转进来）：笔换了 = 存回 / 套上；旋钮变了 = 报一声。 */
  onConfig(tool: string): void;
  /** 载入 / 新建：套上文件里记的（null = 都回出厂）。套的过程中不报。 */
  apply(p: PaintDeskDoc | null): void;
  /** 写回桌面态的 brushes / active：从上一份起步（本版没有的原样留着），盖上碰过的笔和每把工具现在拿的那支。 */
  toDesk(prev: PaintDeskDoc | null | undefined): { brushes: Record<string, PaintKnobsDesk>; active: Record<string, string> };
}

export function createPaintBrushes(cfg: CatsUpToolConfig, changed: () => void): PaintBrushes {
  /** 碰过的、不在手上的笔的旋钮（手上那支的活值在工具配置里）。 */
  const stored = new Map<BrushId, Knobs>();
  /** 碰过的笔（载入时文件里有的 + 拿起过的）：只写这些。 */
  const touched = new Set<BrushId>();
  const cur: Record<PenTool, BrushId> = { paintPen: DEFAULT_BRUSH.brush, paintEraser: DEFAULT_BRUSH.eraser };   // 新文件默认 = 草稿笔（DEFAULT_BRUSH 一处说）
  let applying = false;

  const isPen = (t: string): t is PenTool => (PEN_TOOLS as readonly string[]).includes(t);
  const live = (t: PenTool): Knobs => ({ size: cfg.get(t, "size"), opacity: cfg.get(t, "opacity"), hardness: cfg.get(t, "hardness") });
  const initial = (id: BrushId): Knobs => ({ size: BRUSHES[id].size.base, opacity: 1, hardness: BRUSHES[id].shape.hardness });
  /** 把这支笔的旋钮套到这把工具上（工具配置的 set 自己夹到滑条的范围；大小再夹到这支笔的上限）。 */
  const load = (t: PenTool, id: BrushId): void => {
    const k = stored.get(id) ?? initial(id);
    cfg.set(t, "size", Math.min(k.size, BRUSHES[id].size.max));
    cfg.set(t, "opacity", k.opacity);
    cfg.set(t, "hardness", k.hardness);
  };
  const chosenOn = (t: PenTool): BrushId => brushKindOfTool(t, t === "paintPen" ? cfg.get("paintPen", "brush") : undefined)!;

  return {
    current: (tool) => (isPen(tool) ? cur[tool] : null),
    sizeMax: (tool) => (isPen(tool) ? BRUSHES[cur[tool]].size.max : 400),
    onConfig(tool) {
      if (applying || !isPen(tool)) return;
      const next = chosenOn(tool);
      if (next !== cur[tool]) {
        applying = true;
        try {
          stored.set(cur[tool], live(tool));
          cur[tool] = next; touched.add(next);
          load(tool, next);
          stored.delete(next);
        } finally { applying = false; }
      } else {
        touched.add(cur[tool]);
        const max = BRUSHES[cur[tool]].size.max;   // 大小不超过这支笔的上限（滑条到不了，别处直接 set 的也夹回来）
        if (cfg.get(tool, "size") > max) { applying = true; try { cfg.set(tool, "size", max); } finally { applying = false; } }
      }
      changed();
    },
    apply(p) {
      applying = true;
      try {
        stored.clear(); touched.clear();
        for (const [id, k] of Object.entries(p?.brushes ?? {})) {
          if (!(id in BRUSHES)) continue;   // 本版没有的笔：不套，写回时从上一份桌面态原样带回
          const b = id as BrushId, d = initial(b);
          stored.set(b, { size: k.size ?? d.size, opacity: k.opacity ?? d.opacity, hardness: k.hardness ?? d.hardness });
          touched.add(b);
        }
        for (const t of PEN_TOOLS) {
          cfg.reset(t);
          const rt = recordToolOf(t)!, id = brushKindOfTool(t, p?.active[rt])!;   // active 指着本版没有的笔 / 别的工具上的笔 = 这把工具默认的那支
          if (t === "paintPen") cfg.set("paintPen", "brush", id);
          cur[t] = id;
          load(t, id);
          stored.delete(id);
        }
      } finally { applying = false; }
    },
    toDesk(prev) {
      const brushes: Record<string, PaintKnobsDesk> = { ...(prev?.brushes ?? {}) }, active: Record<string, string> = { ...(prev?.active ?? {}) };
      const put = (id: BrushId, k: Knobs): void => { brushes[id] = { extra: prev?.brushes[id]?.extra ?? {}, size: k.size, opacity: k.opacity, hardness: k.hardness }; };   // 每支笔里不认识的键原样留着
      for (const id of touched) { const k = stored.get(id); if (k) put(id, k); }
      for (const t of PEN_TOOLS) { put(cur[t], live(t)); active[recordToolOf(t)!] = cur[t]; }
      return { brushes, active };
    },
  };
}
