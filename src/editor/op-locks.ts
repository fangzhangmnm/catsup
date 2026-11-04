// op-locks.ts —— 这条 op 会不会改到锁住的东西（A27，SU Lock；user 2026-10-24 立面图思考题）。从 editor.ts 搬出来的纯函数（计划书 §9.1 ①：体重棘轮是让本体别长，不是让人把 if 并成一行）。
// created 2026-11-04 by Claude Opus 5.5
import { samePool, type PoolRef, type Scene } from "../scene/scene.ts";
import type { MirrorMovesResult } from "../mesh/mirror.ts";
import type { Op } from "./ops.ts";

/** 撞上锁时提示行说的那一句（提交 / 预演 / 开镜像会话 / 改实例同一句）。 */
export const LOCKED_HINT = "已锁定：解锁后再改（选中它 → 解锁）";
/** 目标池在锁住的 group 里 / 整体动・删・炸一个锁住的子项 / 当前上下文在锁住的实例里面。setLocked 本身豁免（解锁要能做）。 */
export function opTouchesLocked(s: Scene, op: Op, contextLocked: () => boolean): boolean {
  if (op.op === "setLocked" || op.op === "setHidden" || op.op === "unhideAll" || op.op === "rename") return false;   // 解锁要能做；藏 / 显示不改东西（锁着的也能藏）
  if (op.op === "batch") return op.ops.some((o) => opTouchesLocked(s, o, contextLocked));
  if ("at" in op && op.at && s.hasPool(op.at) && s.poolLocked(op.at)) return true;
  if (op.op === "transformPool") return s.poolLocked(op.at);
  if (op.op === "eraseGroup" || (op.op === "explode" && op.group !== undefined)) return s.poolLocked({ def: op.at.def, group: op.group! });
  if (op.op === "moveInstance") return s.pickLocked(op.from.def, { kind: "instance", instance: op.from.inst });
  if (op.op === "transformInstance" || op.op === "eraseInstance") return s.pickLocked(op.def, { kind: "instance", instance: op.instance });
  if (op.op === "explode" && op.instance !== undefined) return s.pickLocked(op.at.def, { kind: "instance", instance: op.instance });
  return contextLocked();
}

/**
 * 造面的窄意图（计划书 §9.2½ ③）：画线 / 推拉的 op 带一个方向 front（池本地坐标），邻面给不出朝向时，这个方向那侧 = 正面。相机不进内核、不进 op：这里算成方向写进去，重放确定。
 * viewAt(p) = 从池本地的点 p 望向视线原点的方向（池本地；编辑器按 PointerFrame.viewDir 算，桌面 / VR 同一条）。批 = 里面每条都带。复现包 / 修复指令不走这里 = 不带。
 */
export function withFront(op: Op, viewAt: (p: { x: number; y: number; z: number }) => { x: number; y: number; z: number }): Op {
  if (op.op === "batch") return { ...op, ops: op.ops.map((o) => withFront(o, viewAt)) };
  if (op.op === "addEdges" && !op.front && op.segs.length) { const a = op.segs[0][0]; return { ...op, front: viewAt({ x: a.x, y: a.y, z: a.z ?? 0 }) }; }
  if (op.op === "pushpull" && !op.front && op.face.length) return { ...op, front: viewAt(op.face[0]) };
  return op;
}

/** 落到中缝的点和孪生点并成一个的那条 op（镜像挪点；提交和预演同一条）。 */
export const mergeOp = (def: number, mg: MirrorMovesResult["merges"][number]): Op => ({ op: "meshMerge", def, verts: [mg.keep, ...mg.drop], to: mg.at, ...(mg.split ? { split: mg.split } : {}) });

/** 这条 op 带的方向（addEdges / pushpull；批 = 第一条带的）。数值小窗重画复用它，不按当下相机重算（计划书 §12 C2）。 */
export function frontOf(op: Op): { x: number; y: number; z: number } | undefined {
  if (op.op === "batch") { for (const o of op.ops) { const f = frontOf(o); if (f) return f; } return undefined; }
  return op.op === "addEdges" || op.op === "pushpull" ? op.front : undefined;
}

// ---------- 预演 = 同一条指令在影子场景上跑（计划书 §12 C1；user 11-04「预演要做干净」）----------
const POOL_OPS: ReadonlySet<Op["op"]> = new Set<Op["op"]>(["addEdges", "eraseEdges", "eraseFaces", "eraseSelection", "move", "pushpull", "followme", "absorb", "mirror"]);
/**
 * 这条 op 改得到的只有这个池吗。影子场景只把活动池的内核换成影子，别的池和真身共享：改到外面去 = 预演写了真身，所以这里是硬门（Editor.previewApply 不过就抛）。
 * 白名单：池级几何 op（at 必须写明、就是这个池；缺 at 的语义是根池）+ 网格体 op（def 就是这个池的定义）。别的 op 一律不许进预演（子池 / 实例的整体变换走叠加变换）。
 */
export function previewableIn(op: Op, pool: PoolRef): boolean {
  if (op.op === "batch") return op.ops.every((o) => previewableIn(o, pool));
  if (POOL_OPS.has(op.op)) { const at = (op as { at?: PoolRef }).at; return !!at && samePool(at, pool); }
  return op.op.startsWith("mesh") && (op as { def?: number }).def === pool.def;
}
/** 预演和提交唯一的差别：推拉落地不湮灭（kernel.pushPull settleLanding，推平到底时压扁态还看得见、还吸得到；提交才湮灭）。别的差别不许加在这里以外。 */
export function previewVariant(op: Op): Op {
  if (op.op === "batch") return { ...op, ops: op.ops.map(previewVariant) };
  return op.op === "pushpull" ? { ...op, settleLanding: false } : op;
}
