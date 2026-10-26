// surface-assign.ts —— 表面指派工具的深模块（刀 ③，2026-10-24；提案 ai-docs/20261024-editor-state-and-modes.md §2）。
// user 定稿：「只有三档，一张面[→ 平滑组]，锐角边，联通体，对应单击双击三击。如果有选项就选maximum的。然后用这个配置用锐角阈值的配置。
// 然后eyedropper放这里，然后所有别的surface 工具也都一样。锐角阈值和模式的持久化不同工具共享」「永远只有平滑组。平滑组逻辑上就是一个面」
// 「油漆桶拖拽可以把路线上碰到的都填了」「有选区的情况直接apply to 选区」「油漆桶的时候alt可以吸色」。
// 宿主只给 apply(faces) 与 sample(face)（涂材质 / 设碰撞 / 指派贴图…）；模块管：三档 ↔ 单 / 双 / 三击、选项档 = 下限、按住拖 = 刮涂、
// 有面选区且点在选区里 = 直接 apply 到选区、吸色子模式（Ctrl / Alt 临时、条上钮锁定）。到锐角 floodfill 过边条件 = 软边 ∨ 二面角 ≤ 阈值。
// created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, FaceId } from "../kernel/kernel.ts";
import { type Side, floodFaces, floodSides, gates } from "../kernel/flood.ts";
import { applyNormal, applyPt } from "../scene/xform.ts";
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

/** 档 → 跨边判定（kernel/flood.ts，T5 收拢：以前这里自己抄了一份灌的循环）。 */
const gateOf = (k: Kernel, tier: SurfaceTier, sharpDeg: number) => (tier === "smooth" ? gates.soft(k) : tier === "connected" ? gates.any() : gates.softOrFlat(k, sharpDeg));
/** 从种子面出发按档泛洪（纯函数）。sharp：过一条边 = 软边 ∨ 二面角 ≤ sharpDeg（A–B 软边、A–C / B–D 共面 → ABCD 连坐）。 */
export function facesForAssign(k: Kernel, seed: FaceId, tier: SurfaceTier, sharpDeg: number): FaceId[] {
  return floodFaces(k, seed, gateOf(k, tier, sharpDeg));
}
/** 按侧泛洪（DT8 两个表面）：从种子面的某一侧出发、同档跨边走到邻面对应的那一侧（圆筒只灌一侧、莫比乌斯两侧都灌）。一张面两侧都灌到就出现两次。 */
export function sidesForAssign(k: Kernel, seed: FaceId, side: Side, tier: SurfaceTier, sharpDeg: number): { face: FaceId; side: Side }[] {
  return floodSides(k, seed, side, gateOf(k, tier, sharpDeg));
}
/** 屏上 (x, y) 看到的是面 f 的哪一侧：射线和面的法向（世界系，逆转置）反向 = 看到 +n 那侧（0）。 */
export function sideSeen(ctx: ToolCtx, f: FaceId, s: { x: number; y: number }): Side {
  const rec = ctx.kernel().planeOf(f);
  if (!rec) return 0;
  const n = applyNormal(ctx.ctxXform(), rec.plane.n), d = ctx.frame().ray(s.x, s.y, ctx.vp()).dir;
  return n.x * d.x + n.y * d.y + n.z * d.z < 0 ? 0 : 1;
}

export interface SurfaceAssignOpts {
  readonly tool: Tool;
  /** 这个工具的动词名（提示用：「涂了 N 张面」）。 */
  readonly verb: string;
  /** 把值指派给这些面（活动池本地 id）；sides 与 faces 对齐 = 各涂哪一侧（DT8：0 = +n、1 = −n；不给 = 两侧）。 */
  apply(ctx: ToolCtx, faces: readonly FaceId[], sides?: readonly Side[]): void;
  /** 吸：从这张面的这一侧读值回工具的「蘸的」。 */
  sample(ctx: ToolCtx, face: FaceId, side: Side): void;
  /** 这张面这一侧现在的值叫什么（吸色提示用）；不给就只说「这张面」。 */
  describe?(ctx: ToolCtx, face: FaceId, side: Side): string;
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
  private scrubSide = new Map<FaceId, Side>();
  private poolHit = false;

  constructor(opts: SurfaceAssignOpts) { this.opts = opts; this.tool = opts.tool; }
  active(): boolean { return this.pressed; }
  cancel(): void { this.pressed = false; this.tempEye = false; this.scrub = new Set(); this.scrubSide = new Map(); this.poolHit = false; }
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
    ctx.tip(eye ? (f !== null ? `吸：${this.opts.describe?.(ctx, f, sideSeen(ctx, f, s)) ?? "这张面"}` : "吸色：点一张面") : null);
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.pressed = true; this.scrub = new Set(); this.poolHit = false;
    this.tempEye = !!ev.copy;
    const f = this.faceAt(ctx, ev);
    if (f !== null) { this.scrub.add(f); this.scrubSide.set(f, sideSeen(ctx, f, ev)); }
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    const f = this.faceAt(ctx, s);
    if (f !== null && !this.scrub.has(f)) { this.scrub.add(f); this.scrubSide.set(f, sideSeen(ctx, f, s)); }   // 按住拖 = 刮涂：路线上碰到的都进，涂看到的那一侧
    ctx.setHoverFace(f);
  }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    const scrub = [...this.scrub], scrubSide = this.scrubSide, eye = this.eyedropper || this.tempEye;
    const n = ctx.clicks(), dragged = n === 0;   // 点按族（tap-train.ts）：0 = 拖（刮涂）；n = 第 n 下点击
    this.cancel();
    ctx.setHoverFace(null);
    const f = this.faceAt(ctx, ev);
    if (eye) {
      if (f !== null) { this.opts.sample(ctx, f, sideSeen(ctx, f, ev)); ctx.hint(this.eyedropper ? "吸到了（吸色仍开着：再点一下条上的「吸色」关）" : "吸到了"); }
      else ctx.hint("吸色：点一张面");
      return;
    }
    if (dragged && scrub.length) { this.opts.apply(ctx, scrub, scrub.map((x) => scrubSide.get(x) ?? 0)); ctx.hint(`${this.opts.verb}了 ${scrub.length} 张面（刮过的，看到的那一侧）`); return; }
    if (f === null) { if (this.poolHit) ctx.hint("这张面在子 group / 组件里：双击进入后再" + this.opts.verb); return; }
    // DT8 两个表面：涂点到的那一侧（射线打到的那面），灌的时候按侧走（B17 / DT10）
    const seedSide = sideSeen(ctx, f, ev);
    const sel = ctx.selection();
    if (n === 1 && sel.faces.size && sel.faces.has(f)) {
      // 选区：从点到的那张面的那一侧按侧走到选区里连着的面；连不到的面涂朝着镜头的那一侧
      const inSel = sel.faces;
      const reached = floodSides(ctx.kernel(), f, seedSide, (e) => ctx.kernel().graph.edge(e).faceLinks.every((x) => inSel.has(x))).filter((x) => inSel.has(x.face));
      const got = new Set(reached.map((x) => x.face));
      const rest = [...inSel].filter((x) => !got.has(x));
      const all = [...reached, ...rest.map((x) => ({ face: x, side: this.facingSide(ctx, x) }))];
      this.opts.apply(ctx, all.map((x) => x.face), all.map((x) => x.side));
      ctx.hint(`${this.opts.verb}了选区 ${inSel.size} 张面（看到的那一侧）`);
      return;
    }
    const tier = tierMax(ctx.config.get("surface", "tier") as SurfaceTier, tierOfClicks(n));
    const hits = sidesForAssign(ctx.kernel(), f, seedSide, tier, ctx.config.get("surface", "sharpDeg"));
    this.opts.apply(ctx, hits.map((x) => x.face), hits.map((x) => x.side));
    const nFaces = new Set(hits.map((x) => x.face)).size, both = hits.length - nFaces;
    ctx.hint(`${this.opts.verb}了 ${nFaces} 张面（${SURFACE_TIERS.find((t) => t.id === tier)!.label}${both ? `；其中 ${both} 张两侧都灌到了` : ""}）`);
  }
  /** 一张面朝着镜头的那一侧（选区里按侧走不到的面用；看面的中心）。 */
  private facingSide(ctx: ToolCtx, f: FaceId): Side {
    const r = ctx.kernel().faceRings3(f), rec = ctx.kernel().planeOf(f);
    if (!r || !rec) return 0;
    let c = { x: 0, y: 0, z: 0 };
    for (const p of r.outer) c = { x: c.x + p.x / r.outer.length, y: c.y + p.y / r.outer.length, z: c.z + p.z / r.outer.length };
    const sp = ctx.frame().project?.(applyPt(ctx.ctxXform(), c), ctx.vp());
    return sp ? sideSeen(ctx, f, sp) : 0;
  }
}
