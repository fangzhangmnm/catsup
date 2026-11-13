// editor/paint-upkeep.ts —— 每一步做完的收尾：走画的面要么有位置、要么明着报出来放不下（贴图主线 1-3b 第五节，施工单 ai-docs/20261110-paint-workorders-8.md）。
// created 2026-11-10 by Claude Opus 5.5
// 照强行对称的做法（mirror-force.ts）：提交前记每个网格体内核的版本号和改动日志的号，提交后看改没改、补一条 meshLayoutPaint 进同一步（撤销一起撤）。
// 找「还没有位置的面」只看改动日志给的这一步动过的面（日志记不得了才看全部）。和强行对称一起时（mirror-force.ts forceAfter 的 paint 钩子）：
//   选边 → 只给留着的那半补位置 → 丢掉的那半还有走画没位置的 = 即使形状已经对称也补一次对称化（镜过去的面照抄位置）→ 丢掉的那半从不占画布。
// 「开始画」在强行对称下先只留留着那半的面（upkeepRewrite）：铺之前就不给马上要被删的面占地方。
// 放不下的张数、并面丢了画的张数接到提示行上（和强行对称的那几句同一个出口）。预演（拖动中的影子）不走这里：新面松手前照底色显示。
// 施工单十八第 1½ 刀（属性规程第二½节：用到某个意思的那一层每步之后自己读报告、自己检查）：内核只报告哪几列在来源之间对不上，
//   「并出来贴图坐标接不上 = 没有位置」在这里判（scene/uv.ts uvLosses），拿掉位置走 meshLayoutPaint 的 drop，进同一步、撤销一起撤。
//   报告的寿命：每次提交前把上一步没人取的丢掉（upkeepSnapshot）；提交后一开始就拿（后面补进同一步的指令在影子内核上跑，换回来时报告也跟着换）。
// 属性地基轮第二步（规程第七¾节第 6 条 / 第 7½ 节）：报告里「没了的面」（合并点塌了 / 重叠、强行对称的夹层）在这里说一句人话，带「其中几张上有画」。
//   收尾自己补的指令（补位置 / 对称化）和人点的对称化也走一遍收尾，但只说没了的面（它们各自的提交各拿各的报告）。
import type { Op } from "./ops.ts";
import { type ForceEnv, type ForcePaintHook, type ForceSnaps, forceAfter, forceSideFor, forceSnapshot, forcesOn } from "./mirror-force.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { MIRROR_TOL, coordOf, type MirrorAxis } from "../mesh/mirror.ts";
import { unplacedPaintFaces } from "../scene/paint.ts";
import { freedOpenAreas, openPieces } from "../paint/freed.ts";
import { hadPaint, uvLosses } from "../scene/uv.ts";
import type { FaceReport, GoneFace, GoneWhy } from "../mesh/mesh-kernel.ts";

export { freedBaseline, freedOp, type FreedBase } from "./paint-freed.ts";   // 每一步最外层的收尾：记空出来的地方（施工单十八第 2 刀；编辑器从这里一起拿）
/** 收尾自己会提交的指令：它们之后不再补位置（免得套自己）；只说这一条里没了的面。 */
const UPKEEP_OPS: ReadonlySet<string> = new Set(["meshLayoutPaint", "meshSymmetrize", "setFreed"]);
/** 提交前记下的：强行对称那份 + 每个网格体内核的版本号和改动日志的号。 */
export interface UpkeepSnaps { readonly force: ForceSnaps | null; readonly paint: ReadonlyMap<number, { readonly rev: number; readonly seq: number }> }

/** 没了的面怎么说（原因 → 一句话，N = 几张）；后面接「（其中 M 张上有画）」，M = 0 不接。新加一种原因 = columns.ts GoneWhy 加一个值，这里不填编译不过。 */
const GONE_WORDS: Readonly<Record<GoneWhy, (n: number) => string>> = {
  collapsed: (n) => `合并之后有 ${n} 张面塌掉了、被去掉`,
  overlap: (n) => `有 ${n} 张面和别的面完全重叠、被去掉`,
  "seam-wall": (n) => `强行对称去掉了 ${n} 张躺在镜像面上的夹层面`,
};
/** 报告里没了的面 → 提示行的话（按原因第一次出现的先后；没有 = 空）。 */
export function goneNotes(gone: readonly GoneFace[]): string[] {
  const by = new Map<GoneWhy, { n: number; painted: number }>();
  for (const g of gone) { const c = by.get(g.why) ?? by.set(g.why, { n: 0, painted: 0 }).get(g.why)!; c.n++; if (hadPaint(g)) c.painted++; }
  return [...by].map(([why, c]) => GONE_WORDS[why](c.n) + (c.painted ? `（其中 ${c.painted} 张上有画）` : ""));
}

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
  for (const d of env.scene.defs.values()) if (d.body.kind === "mesh") d.body.kernel.takeReport();   // 上一步没人取的报告丢掉（规程第六节的寿命）
  const force = forceSnapshot(env, op);
  if (UPKEEP_OPS.has(op.op)) return { force, paint: new Map() };   // 不补位置，只说没了的面
  const paint = new Map<number, { rev: number; seq: number }>();
  for (const d of env.scene.defs.values()) if (d.body.kind === "mesh") paint.set(d.id, { rev: d.body.kernel.rev, seq: d.body.kernel.changes.seq });
  return force || paint.size ? { force, paint } : null;
}

/**
 * 提交后：强行对称（带画的钩子）→ 别的改过的网格体补位置 → 数放不下的、并面丢了画的。commit = 进同一步。返回要接在提示行后面的话（没有 = 空串）。
 */
export function upkeepAfter(env: ForceEnv, op: Op, snaps: UpkeepSnaps, commit0: (op: Op) => void): string {
  const notes: string[] = [];
  // 报告：这一条指令的，每个网格体拿一次（提交前 upkeepSnapshot 已经把上一步没人取的丢了）；收尾自己补进同一步的每一条提交完也拿一次（每次提交在影子内核上跑、换回来时报告跟着换，
  //   不拿就被下一条换掉）。编辑器里那几条自己的收尾先拿到（commitIn 套一层），这里就是空的：谁先拿算谁的，不会数两遍。
  const reports = new Map<number, FaceReport>(), gone: GoneFace[] = [];
  const takeAll = (into: Map<number, FaceReport> | null): void => { for (const d of env.scene.defs.values()) if (d.body.kind === "mesh") { const r = d.body.kernel.takeReport(); into?.set(d.id, r); gone.push(...r.gone); } };
  takeAll(reports);
  const commit = (o: Op): void => { commit0(o); takeAll(null); };   // 收尾自己的指令（补位置 / 对称化）：不会丢画（不看 odd），没了的面（夹层）照样数
  /** 这个网格体这一步动过的面（日志记不得了 = null = 看全部）。 */
  const touched = (def: number): Iterable<number> | null => { const sn = snaps.paint.get(def); return sn ? (env.scene.mesh(def).kernel.changes.since(sn.seq)?.faces ?? null) : null; };
  const live = (def: number): boolean => env.scene.defs.has(def) && env.scene.kindOf(def) === "mesh";
  const pendingOf = (def: number): number[] => (live(def) ? [...unplacedPaintFaces(env.scene, def, touched(def)).values()].flat() : []);
  const layoutIn = (def: number, faces: readonly number[]): void => {
    if (!faces.length) return;
    const fo = env.freedNow?.();   // 先记这一步到这一刻空出来的地方：新面不落到刚空出来的旧画上（施工单十八第 2 刀统筹预审第 1 条）
    if (fo) commit(fo);
    commit({ op: "meshLayoutPaint", def, faces: [...faces].sort((a, b) => a - b) });
  };
  const handled = new Set<number>();
  // 并出来贴图坐标接不上的面：先拿掉位置（一条只拿掉、不铺的 meshLayoutPaint），后面的补位置 / 对称化照常把它们当「还没有位置」
  let dropped = 0;
  for (const [def, sn] of snaps.paint) {
    if (!live(def) || env.scene.mesh(def).kernel.rev === sn.rev) continue;
    const k = env.scene.mesh(def).kernel, { drop, lost } = uvLosses(k, reports.get(def) ?? k.takeReport());
    dropped += lost;
    if (drop.length) commit({ op: "meshLayoutPaint", def, faces: [], drop });
  }
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
  const crowded = new Set<string>();   // 放不下的面在哪几套排法上（施工单十八第 2 刀：那几张画布上有没有空出来的地方留着旧画）
  for (const [def, sn] of snaps.paint) {
    if (!live(def)) continue;
    const k = env.scene.mesh(def).kernel;
    if (k.rev === sn.rev) continue;
    if (!handled.has(def)) layoutIn(def, pendingOf(def));
    for (const [g, fs] of unplacedPaintFaces(env.scene, def, touched(def))) {   // 补完还没有位置的 = 画布上放不下的
      unplaced += fs.length;
      if (fs.length) crowded.add(g);
      const row = env.scene.uvSets.get(g);
      if (fs.length && row && row.fit !== "density") fixed.add(`${row.width} × ${row.height}`);
    }
  }
  if (unplaced) notes.push(`有 ${unplaced} 张面在画布上放不下，先照底色显示${fixed.size ? `（这张画定的是 ${[...fixed].join("、")}，不自己变大）` : ""}`);
  if (unplaced) {   // 说事实（施工单十八第 2 刀）：数的是空出来的地方减去现在有面占着的格之后还剩几块（freed.ts 读法二），不是清单的长度；不提还没有的按钮
    const pieces = [...crowded].sort().reduce((n, g) => n + (env.scene.uvSets.get(g)?.freed?.length ? openPieces(freedOpenAreas(env.scene, g)) : 0), 0);
    if (pieces) notes.push(`${crowded.size > 1 ? "这几张画布上一共" : "这张画布上"}有 ${pieces} 块空出来的地方留着旧画，新面不往上放`);
  }
  if (dropped) notes.push(`有 ${dropped} 张面的画没带过来（并面时两边的位置对不上）`);
  notes.push(...goneNotes(gone));
  return notes.join("；");
}
