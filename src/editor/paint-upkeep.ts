// editor/paint-upkeep.ts —— 每一步做完的收尾：走画的面要么有位置、要么明着报出来放不下（贴图主线 1-3b 第五节，施工单 ai-docs/20261110-paint-workorders-8.md）。
// created 2026-11-10 by Claude Opus 5.5
// 照强行对称的做法（mirror-force.ts）：提交前记每个网格体内核的版本号和改动日志的号，提交后看改没改、补一条 meshLayoutPaint 进同一步（撤销一起撤）。
// 找「还没有位置的面」只看改动日志给的这一步动过的面（日志记不得了才看全部）。和强行对称一起时（mirror-force.ts forceAfter 的 paint 钩子）：
//   选边 → 只给留着的那半补位置 → 丢掉的那半还有走画没位置的 = 即使形状已经对称也补一次对称化（镜过去的面照抄位置）→ 丢掉的那半从不占画布。
// 「开始画」在强行对称下先只留留着那半的面（upkeepRewrite）：铺之前就不给马上要被删的面占地方。
// 放不下的张数、并面丢了画的张数接到提示行上（和强行对称的那几句同一个出口）。预演（拖动中的影子）不走这里：新面松手前照底色显示。
import type { Op } from "./ops.ts";
import { type ForceEnv, type ForcePaintHook, type ForceSnaps, forceAfter, forceSideFor, forceSnapshot, forcesOn } from "./mirror-force.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { MIRROR_TOL, coordOf, type MirrorAxis } from "../mesh/mirror.ts";
import { unplacedPaintFaces } from "../scene/paint.ts";

/** 收尾自己会提交的指令：它们之后不再收尾（免得套自己）。 */
const UPKEEP_OPS: ReadonlySet<string> = new Set(["meshLayoutPaint", "meshSymmetrize"]);
/** 提交前记下的：强行对称那份 + 每个网格体内核的版本号和改动日志的号。 */
export interface UpkeepSnaps { readonly force: ForceSnaps | null; readonly paint: ReadonlyMap<number, { readonly rev: number; readonly seq: number }> }

/** 强行对称对称化之后这张面还在不在（有一个点在留着的那半 = 在〔跨过中缝的先被切开〕；整张躺在镜像面上 = 在；别的 = 被删）。 */
function kept(k: MeshKernel, f: number, axis: MirrorAxis, side: -1 | 1): boolean {
  let onPlane = true;
  for (const v of k.faceVerts(f)) { const c = coordOf(k.pt(v), axis) * side; if (c > MIRROR_TOL) return true; if (c < -MIRROR_TOL) onPlane = false; }
  return onPlane;
}

/** 提交前改写指令（和 prepareOp 同一处）：强行对称开着时「开始画」只铺留着的那半（边按点名的面选，同 forceAfter）。别的指令原样。 */
export function upkeepRewrite(env: ForceEnv, op: Op): Op {
  if (op.op !== "startPaint" || !env.scene.defs.has(op.def) || env.scene.kindOf(op.def) !== "mesh") return op;
  const ms = forcesOn(env, op.def, op);
  if (!ms) return op;
  const k = env.scene.mesh(op.def).kernel, { side } = forceSideFor(env, op.def, k, k, ms.axis, op);
  if (!side) return op;
  const faces = op.faces.filter((f) => k.hasF(f) && kept(k, f, ms.axis, side));
  return faces.length && faces.length !== op.faces.length ? { ...op, faces } : op;
}

/** 提交前记（取代原来只记强行对称的那一份）。 */
export function upkeepSnapshot(env: ForceEnv, op: Op): UpkeepSnaps | null {
  const force = forceSnapshot(env, op);
  if (UPKEEP_OPS.has(op.op)) return force ? { force, paint: new Map() } : null;
  const paint = new Map<number, { rev: number; seq: number }>();
  for (const d of env.scene.defs.values()) if (d.body.kind === "mesh") paint.set(d.id, { rev: d.body.kernel.rev, seq: d.body.kernel.changes.seq });
  return force || paint.size ? { force, paint } : null;
}

/**
 * 提交后：强行对称（带画的钩子）→ 别的改过的网格体补位置 → 数放不下的、并面丢了画的。commit = 进同一步。返回要接在提示行后面的话（没有 = 空串）。
 */
export function upkeepAfter(env: ForceEnv, op: Op, snaps: UpkeepSnaps, commit: (op: Op) => void): string {
  const notes: string[] = [];
  /** 这个网格体这一步动过的面（日志记不得了 = null = 看全部）。 */
  const touched = (def: number): Iterable<number> | null => { const sn = snaps.paint.get(def); return sn ? (env.scene.mesh(def).kernel.changes.since(sn.seq)?.faces ?? null) : null; };
  const live = (def: number): boolean => env.scene.defs.has(def) && env.scene.kindOf(def) === "mesh";
  const pendingOf = (def: number): number[] => (live(def) ? [...unplacedPaintFaces(env.scene, def, touched(def)).values()].flat() : []);
  const layoutIn = (def: number, faces: readonly number[]): void => { if (faces.length) commit({ op: "meshLayoutPaint", def, faces: [...faces].sort((a, b) => a - b) }); };
  const handled = new Set<number>();
  // 并面丢了画的张数先拿走：后面补进同一步的指令（补位置 / 对称化）各自在内核的影子上跑、换回来的时候这个数会被换掉
  let dropped = 0;
  for (const [def, sn] of snaps.paint) if (live(def) && env.scene.mesh(def).kernel.rev !== sn.rev) dropped += env.scene.mesh(def).kernel.takeDroppedFaces();
  if (snaps.force) {
    const hook: ForcePaintHook = {
      pending: (def) => pendingOf(def).length > 0,
      layout: (def, side) => {
        handled.add(def);
        const p = pendingOf(def), ax = env.mirrors.get(def)?.axis;
        if (side === null || ax === undefined) { layoutIn(def, p); return false; }
        const k = env.scene.mesh(def).kernel, mine = p.filter((f) => kept(k, f, ax, side));
        layoutIn(def, mine);
        return mine.length < p.length;   // 丢掉的那半还有走画没位置的：对称化，让它们照抄过来
      },
    };
    const n = forceAfter(env, op, snaps.force, commit, hook);
    if (n) notes.push(n);
  }
  let unplaced = 0;
  const fixed = new Set<string>();   // 放不下、而且画布定了大小（按总大小开的，不自己变大）的那几张画：提示行说是哪张、多大（施工单十六第四节）
  for (const [def, sn] of snaps.paint) {
    if (!live(def)) continue;
    const k = env.scene.mesh(def).kernel;
    if (k.rev === sn.rev) continue;
    if (!handled.has(def)) layoutIn(def, pendingOf(def));
    for (const [g, fs] of unplacedPaintFaces(env.scene, def, touched(def))) {   // 补完还没有位置的 = 画布上放不下的
      unplaced += fs.length;
      const row = env.scene.uvSets.get(g);
      if (fs.length && row && row.fit !== "density") fixed.add(`${row.width} × ${row.height}`);
    }
    k.takeDroppedFaces();   // 收尾自己的指令（补位置 / 对称化）不会丢画；有也已经数过了，清零免得留到下一步
  }
  if (unplaced) notes.push(`有 ${unplaced} 张面在画布上放不下，先照底色显示${fixed.size ? `（这张画定的是 ${[...fixed].join("、")}，不自己变大）` : ""}`);
  if (dropped) notes.push(`有 ${dropped} 张面的画没带过来（并面时两边的位置对不上）`);
  return notes.join("；");
}
