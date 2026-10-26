// surface-assign.ts —— 表面指派工具的深模块（刀 ③，2026-10-24；提案 ai-docs/20261024-editor-state-and-modes.md §2）。
// user 定稿：「只有三档，一张面[→ 平滑组]，锐角边，联通体，对应单击双击三击。如果有选项就选maximum的。然后用这个配置用锐角阈值的配置。
// 然后eyedropper放这里，然后所有别的surface 工具也都一样。锐角阈值和模式的持久化不同工具共享」「永远只有平滑组。平滑组逻辑上就是一个面」
// 「油漆桶拖拽可以把路线上碰到的都填了」「有选区的情况直接apply to 选区」「油漆桶的时候alt可以吸色」。
// 宿主只给 apply(faces) 与 sample(face)（涂材质 / 设碰撞 / 指派贴图…）；模块管：三档 ↔ 单 / 双 / 三击、选项档 = 下限、按住拖 = 刮涂、
// 有面选区且点在选区里 = 直接 apply 到选区、吸色子模式（Ctrl / Alt 临时、条上钮锁定）。到锐角 floodfill 过边条件 = 软边 ∨ 二面角 ≤ 阈值。
// created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, FaceId } from "../kernel/kernel.ts";
import { floodFaces, gates } from "../kernel/flood.ts";
import type { Tool } from "./tool-ids.ts";
import type { ToolPointer } from "./editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "./tool-handler.ts";

export const SURFACE_TIERS = [
  { id: "smooth", label: "平滑组", hint: "沿软边连通的面 = 一张逻辑面（单击）" },
  { id: "sharp", label: "到锐角为止", hint: "沿软边或夹角 ≤ 阈值的边连通的面（双击）" },
  { id: "connected", label: "连通体", hint: "沿任何边连通的面（三击）" },
] as const;
export type SurfaceTier = (typeof SURFACE_TIERS)[number]["id"];
const ORDER: readonly SurfaceTier[] = ["smooth", "sharp", "connected"];
/** 两档取大（选项档 = 下限，点击档往上抬）。 */
export function tierMax(a: SurfaceTier, b: SurfaceTier): SurfaceTier { return ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b; }
/** 点击次数 → 档：1 = 平滑组、2 = 到锐角、≥ 3 = 连通体。 */
export function tierOfClicks(n: number): SurfaceTier { return n >= 3 ? "connected" : n === 2 ? "sharp" : "smooth"; }

/** 从种子面出发按档泛洪（纯函数）。sharp：过一条边 = 软边 ∨ 二面角 ≤ sharpDeg（A–B 软边、A–C / B–D 共面 → ABCD 连坐）。 */
export function facesForAssign(k: Kernel, seed: FaceId, tier: SurfaceTier, sharpDeg: number): FaceId[] {
  // 三档 = 三种跨边判定（kernel/flood.ts，T5 收拢：以前这里自己抄了一份灌的循环）
  return floodFaces(k, seed, tier === "smooth" ? gates.soft(k) : tier === "connected" ? gates.any() : gates.softOrFlat(k, sharpDeg));
}

export interface SurfaceAssignOpts {
  readonly tool: Tool;
  /** 这个工具的动词名（提示用：「涂了 N 张面」）。 */
  readonly verb: string;
  /** 把值指派给这些面（活动池本地 id）。 */
  apply(ctx: ToolCtx, faces: readonly FaceId[]): void;
  /** 吸：从这张面读值回工具的「蘸的」。 */
  sample(ctx: ToolCtx, face: FaceId): void;
  /** 这张面现在的值叫什么（吸色提示用）；不给就只说「这张面」。 */
  describe?(ctx: ToolCtx, face: FaceId): string;
}

export class SurfaceAssignTool implements ToolHandler {
  readonly tool: Tool;
  readonly grammar = "direct" as const;
  /** 吸色子模式锁定（上下文条上的钮）；Ctrl / Alt 按着 = 临时。 */
  eyedropper = false;
  private readonly opts: SurfaceAssignOpts;
  private pressed = false;
  private tempEye = false;
  private scrub = new Set<FaceId>();
  private poolHit = false;

  constructor(opts: SurfaceAssignOpts) { this.opts = opts; this.tool = opts.tool; }
  active(): boolean { return this.pressed; }
  cancel(): void { this.pressed = false; this.tempEye = false; this.scrub = new Set(); this.poolHit = false; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  private faceAt(ctx: ToolCtx, s: { x: number; y: number }): FaceId | null {
    const view = ctx.live();
    const gf = ctx.pickFace(s.x, s.y);
    const c = gf !== undefined ? ctx.classify(view, { face: gf }) : { kind: "none" as const };
    if (c.kind === "pool") this.poolHit = true;
    return c.kind === "entity" ? (c.local.face ?? null) : null;
  }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    const f = this.faceAt(ctx, s);
    ctx.setHoverFace(f);
    const eye = this.eyedropper || ctx.mods().copy;   // 吸色时提示能吸到什么（user 2026-10-24「alt eyedropper的时候tooltip也显示你可以吸什么」）
    ctx.tip(eye ? (f !== null ? `吸：${this.opts.describe?.(ctx, f) ?? "这张面"}` : "吸色：点一张面") : null);
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.pressed = true; this.scrub = new Set(); this.poolHit = false;
    this.tempEye = !!ev.copy;
    const f = this.faceAt(ctx, ev);
    if (f !== null) this.scrub.add(f);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    const f = this.faceAt(ctx, s);
    if (f !== null) this.scrub.add(f);   // 按住拖 = 刮涂：路线上碰到的都进
    ctx.setHoverFace(f);
  }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    const scrub = [...this.scrub], eye = this.eyedropper || this.tempEye;
    const n = ctx.clicks(), dragged = n === 0;   // 点按族（tap-train.ts）：0 = 拖（刮涂）；n = 第 n 下点击
    this.cancel();
    ctx.setHoverFace(null);
    const f = this.faceAt(ctx, ev);
    if (eye) {
      if (f !== null) { this.opts.sample(ctx, f); ctx.hint(this.eyedropper ? "吸到了（吸色仍开着：再点一下条上的「吸色」关）" : "吸到了"); }
      else ctx.hint("吸色：点一张面");
      return;
    }
    if (dragged && scrub.length) { this.opts.apply(ctx, scrub); ctx.hint(`${this.opts.verb}了 ${scrub.length} 张面（刮过的）`); return; }
    if (f === null) { if (this.poolHit) ctx.hint("这张面在子 group / 组件里：双击进入后再" + this.opts.verb); return; }
    const sel = ctx.selection();
    if (n === 1 && sel.faces.size && sel.faces.has(f)) { const faces = [...sel.faces]; this.opts.apply(ctx, faces); ctx.hint(`${this.opts.verb}了选区 ${faces.length} 张面`); return; }
    const tier = tierMax(ctx.config.get("surface", "tier") as SurfaceTier, tierOfClicks(n));
    const faces = facesForAssign(ctx.kernel(), f, tier, ctx.config.get("surface", "sharpDeg"));
    this.opts.apply(ctx, faces);
    ctx.hint(`${this.opts.verb}了 ${faces.length} 张面（${SURFACE_TIERS.find((t) => t.id === tier)!.label}）`);
  }
}
