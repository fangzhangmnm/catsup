// editor/mirror-force.ts —— 强行对称的编排：管不管、提交前记什么、提交后怎么补、换原点前先试（计划书 `ai-docs/20261109-audit-fixes-plan.md` §3 第 0–2、5 层）。
// created 2026-11-09 by Claude Opus 5.5（从 editor.ts 搬出来：本体体重棘轮 + 「强行对称怎么判」只看这一个文件）。
// 几何本身（选边 / 对称化 / 对称判定 / 找对面）在 mesh/mirror.ts；op 分类在 mesh/mirror-ops.ts；这里只把它们接到「一条 op 提交前后」上。
// 编辑器给一个环境（场景、对称设置表、每个网格体上一次的边、是不是正在并点），提交 / 问人归编辑器（commitIn 带通行证、confirm 是异步的）。
import type { Scene } from "../scene/scene.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { type ForceSide, type MirrorAxis, type MirrorSetting, forceSide, isSymmetric, sideLabel, trySymmetrize } from "../mesh/mirror.ts";
import { namedElements, opsOfClass } from "../mesh/mirror-ops.ts";
import { applyOp, type Op } from "./ops.ts";

export interface ForceEnv {
  readonly scene: Scene;
  readonly mirrors: ReadonlyMap<number, MirrorSetting>;
  /** 每个网格体上一次以哪半为准（选边的第三顺位；补完对称化写回）。 */
  readonly lastSide: Map<number, -1 | 1>;
  /** 正在提交镜像并点（同一步里紧跟的 meshMerge）：这几条不各自触发对称化，等整步最后那一次。 */
  readonly merging: boolean;
}
/** 提交前记下的：开着强行对称的每个网格体的内核版本号；指令冲着的那个另拷一份（判「动了哪边」）。 */
export type ForceSnaps = Map<number, { rev: number; before: MeshKernel | null }>;

const META = new Set<string>(opsOfClass("meta"));

/** 强行对称管这个网格体吗（提交 / 预演共用）：开着强行对称、是网格体、这条 op 不是镜像自己的 / 只改看法的（分类表 meta）。 */
export function forcesOn(env: ForceEnv, def: number, op: Op): MirrorSetting | null {
  if (env.merging || META.has(op.op)) return null;
  const ms = env.mirrors.get(def);
  return ms && ms.mode === "force" && env.scene.defs.has(def) && env.scene.kindOf(def) === "mesh" ? ms : null;
}
/** 这一步以哪半为准（提交 / 预演同一个 = mirror.ts forceSide）。op = null：指令不是冲着它来的（点名的 id 不在它的空间里）。 */
export function forceSideFor(env: ForceEnv, def: number, before: MeshKernel, after: MeshKernel, ax: MirrorAxis, op: Op | null): ForceSide {
  return forceSide(before, after, ax, op ? namedElements(op) : { verts: [], edges: [], faces: [] }, env.lastSide.get(def));
}
/**
 * 提交前（第 2 层：看改没改到这个网格体，不看指令名——粘贴 / 合并 / 炸开 / 分离以前不对称化，之后在另一边做一步就被当成「另一半」删掉）：
 * 每个开着强行对称的网格体记下内核版本号；指令冲着的那个（op.def / 落点池 at 的定义 / 合并的目标）另拷一份。
 */
export function forceSnapshot(env: ForceEnv, op: Op): ForceSnaps | null {
  const o = op as { def?: unknown; at?: { def?: unknown } }, aim = new Set<unknown>([o.def, o.at?.def]), out: ForceSnaps = new Map();
  if (op.op === "mergeObject" && env.scene.defs.has(op.at.def)) aim.add(env.scene.def(op.at.def).instances.get(op.target)?.def);
  for (const def of env.mirrors.keys()) if (forcesOn(env, def, op)) { const k = env.scene.mesh(def).kernel; out.set(def, { rev: k.rev, before: aim.has(def) ? k.clone() : null }); }
  return out.size ? out : null;
}
/**
 * 提交后：版本号变了、又不对称了的网格体，选边（第 0 / 5 层）→ 先在拷贝上试对称化 → 成了就交 commit 一条 meshSymmetrize（同一步，撤销一起撤）。
 * 返回要接在提示行后面的话（看不出哪边 / 那半是空的 / 两半都没有 / 劈不开）；没有 = 空串。
 */
export function forceAfter(env: ForceEnv, op: Op, snaps: ForceSnaps, commit: (op: Op) => void): string {
  const notes: string[] = [];
  for (const [def, sn] of snaps) {
    if (!env.scene.defs.has(def) || env.scene.kindOf(def) !== "mesh") continue;
    const m = env.scene.mesh(def).kernel, ms = env.mirrors.get(def);
    if (!ms || m.rev === sn.rev || isSymmetric(m, ms.axis)) continue;
    const { want, side, guessed } = forceSideFor(env, def, sn.before ?? m, m, ms.axis, sn.before ? op : null);
    if (!side) { notes.push("强行对称：镜像面两边都还没有面，这一步没对称"); continue; }
    if (!trySymmetrize(m, ms.axis, side)) { notes.push("强行对称：有面跨过镜像面、而且一刀劈不开（凹的面），这一步没对称（先在中缝上手动切一刀）"); continue; }
    if (side !== want) notes.push(`强行对称：${sideLabel(want, ms.axis)} 那半是空的，按 ${sideLabel(side, ms.axis)} 那半为准`);
    else if (guessed) notes.push(`强行对称：这一步看不出动的是哪边，按 ${sideLabel(side, ms.axis)} 那半为准`);
    env.lastSide.set(def, side);
    commit({ op: "meshSymmetrize", def, axis: ms.axis, side });
  }
  return notes.join("；");
}
/**
 * 第 1 层：换原点（setAxes 落在定义根上）/ 应用缩放作用在开着强行对称的网格体上 = 模型可能整个对镜像面挪位。在整份拷贝上先做一遍（不用影子：换原点会连带改别处实例的变换）：
 * 仍对称 = null（照做）；不对称 = 要问的那个网格体（编辑器问「关掉镜像，照做 / 取消」，不硬拦）。镜像编辑不问（那个模式下挪原点正是推荐做法）。
 */
export function originNeedsAsk(env: ForceEnv, op: Op): number | null {
  const def = op.op === "setAxes" && op.at.group === null ? op.at.def : op.op === "applyScale" && env.scene.defs.has(op.def) ? env.scene.def(op.def).instances.get(op.instance)?.def : undefined;
  if (def === undefined || !forcesOn(env, def, op)) return null;
  const ax = env.mirrors.get(def)!.axis, trial = env.scene.clone();
  try { applyOp(trial, op); } catch { return null; }
  return isSymmetric(trial.mesh(def).kernel, ax) ? null : def;
}
