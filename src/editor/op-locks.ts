// op-locks.ts —— 这条 op 会不会改到锁住的东西（A27，SU Lock；user 2026-10-24 立面图思考题）。从 editor.ts 搬出来的纯函数（计划书 §9.1 ①：体重棘轮是让本体别长，不是让人把 if 并成一行）。
// created 2026-11-04 by Claude Opus 5.5
import type { Scene } from "../scene/scene.ts";
import type { Op } from "./ops.ts";

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
