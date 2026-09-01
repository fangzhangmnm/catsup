// journal.ts —— lab 的 undo/redo：命令日志 + 重放（DOM-free，node 直测）。
// created by Claude Fable 5, 2026-09-01
//
// 设计（user 2026-09-01 批准）：**日志重放，不做逆操作/状态补丁——零内核入侵**。
// 依据：内核急切+确定性（公理 5），session 状态 = mutation 批序列的纯函数；
// 重放确定性已被 preview 影子副本测试钉死（含 id 计数器逐字一致）→ undo 免费。
// 对算法开发的约束 = 零：不要求逆操作/脏位/内核新接口，只要求「同批序列→同结果」（spec 级不变量）。
// WeebPaint workpiece 模型是 app 纪元的正主；本模块是 lab 刻度的最小实现，
// 重放慢了再加快照环（clone 每 k 步），接缝不变。

import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, PtIn, VertexId } from "../kernel/kernel.ts";
import { PRESETS, applyPreset } from "./presets.ts";

export type LabOp =
  | { op: "clear" }
  | { op: "preset"; name: string }
  | { op: "addEdges"; segs: [PtIn, PtIn][] }
  | { op: "eraseEdges"; ids: EdgeId[] }
  | { op: "eraseFaces"; ids: FaceId[] }
  | { op: "eraseSelection"; faces: FaceId[]; edges: EdgeId[] }
  | { op: "move"; moves: { id: VertexId; to: { x: number; y: number; z: number } }[] };

export interface ApplyResult { kernel: Kernel; events: FaceEvent[]; }

/** 单 op 应用（clear/preset 换新内核，其余原地）。重放与实时走同一条路。 */
export function applyOp(k: Kernel, op: LabOp): ApplyResult {
  switch (op.op) {
    case "clear": return { kernel: new Kernel(), events: [] };
    case "preset": {
      const k2 = new Kernel();
      const preset = PRESETS.find((p) => p.name === op.name);
      return { kernel: k2, events: preset ? applyPreset(k2, preset).flat() : [] };
    }
    case "addEdges": return { kernel: k, events: k.addEdges(op.segs) };
    case "eraseEdges": return { kernel: k, events: k.eraseEdges(op.ids) };
    case "eraseFaces": return { kernel: k, events: k.eraseFaces(op.ids) };
    case "eraseSelection": return { kernel: k, events: [...k.eraseFaces(op.faces), ...k.eraseEdges(op.edges)] };
    case "move": return { kernel: k, events: k.moveVertices(op.moves) };
  }
}

export class Journal {
  private ops: LabOp[] = [];
  private undone: LabOp[] = [];

  canUndo(): boolean { return this.ops.length > 0; }
  canRedo(): boolean { return this.undone.length > 0; }
  size(): number { return this.ops.length; }

  /** 实时提交：记账 + 应用（新分支即清空 redo 栈）。 */
  commit(k: Kernel, op: LabOp): ApplyResult {
    this.ops.push(op);
    this.undone = [];
    return applyOp(k, op);
  }

  /** 撤销 = 弹掉最后一批、从空内核重放。 */
  undo(): Kernel | null {
    if (!this.ops.length) return null;
    this.undone.push(this.ops.pop()!);
    return this.replay();
  }

  /** 重做 = 把弹掉的批重新应用到当前内核。 */
  redo(k: Kernel): ApplyResult | null {
    const op = this.undone.pop();
    if (!op) return null;
    this.ops.push(op);
    return applyOp(k, op);
  }

  replay(): Kernel {
    let k = new Kernel();
    for (const op of this.ops) k = applyOp(k, op).kernel;
    return k;
  }
}
