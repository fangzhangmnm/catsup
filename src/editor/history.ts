// history.ts —— 正规 undo：**指令流 + 差量栈**（A1 2026-09-20 立；A3 2026-10-27 换底子，设计稿 ai-docs/20261027-undo-delta-design.md）。
// created 2026-09-20 by Claude Fable 5.1 · 2026-10-27 重做底子 by Claude Fable 5.1（user：「我是更喜欢逆指令……会不会不好写的有另外一条兜底的路？」「CatsUp为什么不128」「画画……我建议不走[自己的栈]」「影子换真身好主意」）
//
// · 指令流 ops[]：可序列化、按坐标寻址——复现包 / 黑匣子 / 以后的联机 / 脚本都读它；永不驱逐（很小）。**不再是撤销的底子**（以前 = 每 8 条整场景快照 + 回到快照重放：八份整场景常驻、深撤销 O(全部指令)）。
// · 差量栈 entries[i]：ops[i] 的撤销记录，三种部件，WeebPaint undo-stack 同款自反交换（应用一次 = 撤，记录被换成反向包；再应用 = 重做）：
//     kernel —— 池内核差量（kernel/delta.ts）：**提交 = 影子换真身**：先从真身新拷一份当影子、在影子上跑这条 op、成功就把影子装进池（真身换对象），
//               旧真身里触碰集的记录就是「之前」（deltaAgainst，O(触碰)），旧真身随即丢掉。任何 op 自动有逆，不手写逆指令。失败 = 真身原封不动。
//               升真身的永远是提交时新拷、只跑过这一条 op 的副本；拖动用的预演影子（Editor.shadowKernel）永远可丢、不升（user：「影子坏了无所谓的 premise 会出问题，可能得小心点」）。
//     scene  —— 整份场景对象的交换：skeleton 型 op（挪实例 / 层 / 材质 / 轴 / 参考几何 / 换身体种类……）只拷骨架（内核共享，很小）；结构型 op（建组 / 建组件 / 炸开 / 导入……）整份拷（少见）。
//               kernel 型 op 也顺手带一份骨架（paintFaces 会改材质槽表之类的骨架副作用，差量管不到）。
//     pool   —— 兜底：差量抽不出（改动日志丢段）就留整个旧内核对象，撤 = 换对象。
// · 配额 128 MB（user「CatsUp 为什么不 128」；WeebPaint 同值）：从最老端整步驱逐，最新一步永不驱逐；驱逐只丢撤销记录，指令流留着；深过配额 = 不能再撤（灰掉），不重放。
// · 一步 = 用户的一个动作，可以是好几条 op（join）；undo / redo 按步走；undoOp 只退一条（马后炮 / 一步中途失败回滚用）。
// · 会话记录（10-26 重设计，保留）：每一步自带「之前 / 之后」的会话（在哪个组件里 + 选区）；撤销 = 场景和会话一起回去。只改选区的一步 = 0 条 op 的一步（编辑器 commitSession）。
// · 崩溃恢复不靠重放（app/crash-store.ts 盲快照）。replay() 仍能从装载态 + 指令流全量重建（测试 / 校验用，不在热路径）。
import { Scene, type PoolRef, type DefId } from "../scene/scene.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { applyOp, type ApplyResult, type Op, poolOf } from "./ops.ts";
import type { Kernel } from "../kernel/kernel.ts";
import { type KernelDelta, deltaBytes } from "../kernel/delta.ts";

/** 撤销栈配额（字节）。 */
export const UNDO_QUOTA_BYTES = 128 * 1024 * 1024;

/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态（调用方直接换用；kernel 型 = 同一个场景对象、内核已换回）。 */
export class OpApplyError extends Error {
  readonly cause: unknown;
  readonly restored: Scene;
  constructor(cause: unknown, restored: Scene) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "OpApplyError"; this.cause = cause; this.restored = restored;
  }
}

/** 一步的会话记录：before = 这一步第一条 op 提交之前；after = 撤销它的那一刻（重做时还原）。 */
export interface StepSession<M> { before: M; after?: M }

type Entry =
  | { kind: "kernel"; at: PoolRef; delta: KernelDelta; bytes: number }
  | { kind: "pool"; at: PoolRef; kernel: Kernel; bytes: number }
  | { kind: "scene"; snapshot: Scene; bytes: number; /** 骨架记录：内核共享——换进来时把现在的内核对象接回去（内核身份随提交换对象，记录只管骨架） */ skeleton: boolean }
  /** 网格体的记录（2026-10-27 接缝）：提交前的整份拷贝（类型数组，拷得快）；撤 / 重做 = 和真身整表互换（MeshKernel.swapWith，自反、对象身份不变）。差量版等网格大了再做（和 brep 的 KernelDelta 同形）。 */
  | { kind: "mesh"; def: DefId; kernel: MeshKernel; bytes: number };

const KERNEL_OPS = new Set<Op["op"]>(["addEdges", "eraseEdges", "eraseFaces", "eraseSelection", "move", "pushpull", "followme", "absorb", "weldEdges", "dissolveVertices", "explodeCurves", "setEdgeLayers", "paintFaces", "plugin", "mirror", "setHidden"]);
const SKELETON_OPS = new Set<Op["op"]>(["transformInstance", "placeInstance", "eraseInstance", "setLocked", "assignLayer", "addLayer", "renameLayer", "setLayerVisible", "removeLayer", "addMaterial", "setAxes", "setDrawFrame", "castDefinition", "addGuide", "eraseGuides", "clearGuides"]);
/** mesh 族的 op：改一个网格体的内核（寻址 = 定义）。加一种内核 = 加一个集合 + 一种记录；以后种类多了把「怎么记」挂到 KindDef 上。 */
const MESH_OPS = new Set<Op["op"]>(["meshMove", "meshExtrude", "meshKnife", "meshLoopCut", "meshDelete", "meshInset", "meshAddPrimitive"]);
export type OpTier = "kernel" | "mesh" | "skeleton" | "scene";
/** 这条 op 的撤销记录怎么记：kernel = 一个 brep 池的差量（+ 骨架）；skeleton = 只拷骨架；scene = 整份场景拷。 */
export function opTier(s: Scene, op: Op): { tier: OpTier; at?: PoolRef; def?: DefId } {
  const o = op as { op: string; at?: PoolRef; instances?: number[]; instance?: number; name?: string; def?: number };
  if (MESH_OPS.has(op.op)) {
    const def = o.def;
    if (def === undefined || !s.defs.has(def) || s.kindOf(def) !== "mesh") return { tier: "scene" };
    return { tier: "mesh", def };
  }
  if (KERNEL_OPS.has(op.op)) {
    if (op.op === "mirror" && o.instances?.length) return { tier: "scene" };
    if (op.op === "setHidden" && o.instance !== undefined) return { tier: "skeleton" };
    if (op.op === "plugin" && o.name === "hierarchy") return { tier: "scene" };
    const at = o.at ?? { def: s.root, group: null };
    if (!s.hasPool(at) || s.kindOf(at.def) !== "brep") return { tier: "scene" };
    return { tier: "kernel", at };
  }
  // 换组件 / 网格体的原点（setAxes 落在定义根上）= 定义里的几何整体挪（retransformDefinition），不只是骨架：骨架记录共享内核，撤销会把实例矩阵换回去、几何留在挪过的地方 → 世界里错位。整份拷（少见的操作）。
  if (op.op === "setAxes" && o.at && o.at.group === null && o.at.def !== s.root) return { tier: "scene" };
  if (SKELETON_OPS.has(op.op)) return { tier: "skeleton" };
  return { tier: "scene" };
}

const poolKernel = (s: Scene, at: PoolRef): Kernel => poolOf(s, at).kernel;
const setPoolKernel = (s: Scene, at: PoolRef, k: Kernel): void => { if (at.group === null) s.brep(at.def).kernel = k; else s.group({ def: at.def, group: at.group }).kernel = k; };
/** 字节估计（配额用；量纲：字节；对象图的量级，不求准）。 */
const meshBytes = (m: MeshKernel): number => m.pos.length * 8 + m.loopVert.length * 4 + (m.edgeA.length * 3 + m.faceStart.length * 4) * 4 + m.edgeCount() * 24 + 256;
const kernelBytes = (k: Kernel): number => k.vertices().length * 64 + k.edges().length * 48 + k.faces().length * 160 + 256;
const skeletonBytes = (s: Scene): number => { let n = s.defs.size; for (const d of s.defs.values()) { n += d.instances.size; if (d.body.kind === "brep") n += d.body.groups.size; } return n * 200 + 256; };
/** 骨架记录换进来：池的内核对象照现在的（同一定义同一种身体才接；换过身体种类的 = 记录里的旧身体才是真相）。 */
const relinkKernels = (into: Scene, from: Scene): void => {
  for (const [id, d] of into.defs) {
    const f = from.defs.get(id);
    if (!f || f.body.kind !== d.body.kind) continue;
    if (d.body.kind === "brep" && f.body.kind === "brep") { d.body.kernel = f.body.kernel; for (const [gid, g] of d.body.groups) { const fg = f.body.groups.get(gid); if (fg) g.kernel = fg.kernel; } }
    else if (d.body.kind === "mesh" && f.body.kind === "mesh") d.body.kernel = f.body.kernel;
  }
};
const sceneBytes = (s: Scene): number => { let n = skeletonBytes(s); for (const { pool } of s.pools()) { const v = s.viewOf(pool); n += v.vertices().length * 64 + v.edges().length * 48 + v.faces().length * 160; } return n; };

export class History<M = unknown> {
  private readonly base: Scene;                  // 装载态（clone 持有；replay 用）
  private ops: Op[] = [];
  private joins: boolean[] = [];                 // joins[i] = ops[i] 和 ops[i−1] 是同一步（第 0 条永远 false）
  private sessions: (StepSession<M> | null)[] = [];
  private entries: Entry[][] = [];               // entries[i] = ops[i] 的撤销记录（自反：撤了就是重做记录）
  private cursor = 0;                            // 已应用 op 数：ops[0..cursor) 生效
  private evicted = 0;                           // ops[0..evicted) 的撤销记录已被配额驱逐（指令流留着）
  private current: Scene;                        // 现在的场景对象（撤销 / 重做原地改；scene 型记录 = 换对象）
  private readonly quota: number;

  constructor(base?: Scene, opts?: { quotaBytes?: number }) {
    this.base = base ? base.clone() : new Scene();
    this.current = base ?? new Scene();
    this.quota = opts?.quotaBytes ?? UNDO_QUOTA_BYTES;
  }

  canUndo(): boolean { return this.cursor > this.evicted; }
  canRedo(): boolean { return this.cursor < this.ops.length; }
  depth(): number { return this.ops.length; }
  position(): number { return this.cursor; }
  log(): readonly Op[] { return this.ops; }
  /** 撤销记录占的字节（估计）。 */
  usageBytes(): number { let n = 0; for (let i = this.evicted; i < this.entries.length; i++) for (const e of this.entries[i]) n += e.bytes; return n; }
  /** 被配额驱逐、不能再撤的 op 数（披露用）。 */
  evictedCount(): number { return this.evicted; }

  /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴）。join = 和上一条同一步；before = 新开一步时这一步之前的会话。失败抛 OpApplyError（不记账，带回提交前状态）。 */
  commit(s: Scene, op: Op, join = false, before?: M): ApplyResult {
    if (this.cursor < this.ops.length) this.dropRedo();
    const t = opTier(s, op);
    let r: ApplyResult;
    const entries: Entry[] = [];
    if (t.tier === "kernel") {
      const at = t.at!, truth = poolKernel(s, at), skel = s.cloneSkeleton(), shadow = truth.clone(), seq = shadow.changes.seq;
      setPoolKernel(s, at, shadow);   // 这条 op 在影子上跑
      try { r = applyOp(s, op); }
      catch (e) { setPoolKernel(s, at, truth); throw new OpApplyError(e, skel); }   // 真身原封不动
      truth.swapTablesWith(shadow); setPoolKernel(s, at, truth);   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      const delta = truth.deltaAgainst(shadow, seq);
      entries.push({ kind: "scene", snapshot: skel, bytes: skeletonBytes(skel), skeleton: true });
      entries.push(delta ? { kind: "kernel", at, delta, bytes: deltaBytes(delta) } : { kind: "pool", at, kernel: shadow, bytes: kernelBytes(shadow) });
    } else if (t.tier === "mesh") {
      const def = t.def!, body = s.mesh(def), truth = body.kernel, skel = s.cloneSkeleton(), shadow = truth.clone();
      body.kernel = shadow;   // 这条 op 在影子上跑
      try { r = applyOp(s, op); }
      catch (e) { body.kernel = truth; throw new OpApplyError(e, skel); }
      truth.swapWith(shadow); body.kernel = truth;   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      entries.push({ kind: "scene", snapshot: skel, bytes: skeletonBytes(skel), skeleton: true });
      entries.push({ kind: "mesh", def, kernel: shadow, bytes: meshBytes(shadow) });
    } else {
      const snap = t.tier === "skeleton" ? s.cloneSkeleton() : s.clone();
      try { r = applyOp(s, op); }
      catch (e) { throw new OpApplyError(e, snap); }
      entries.push({ kind: "scene", snapshot: snap, bytes: t.tier === "skeleton" ? skeletonBytes(snap) : sceneBytes(snap), skeleton: t.tier === "skeleton" });
    }
    this.current = r.scene;
    const joined = join && this.cursor > 0;
    this.ops.push(op); this.joins.push(joined);
    this.sessions.push(joined ? null : before !== undefined ? { before } : null);
    this.entries.push(entries);
    this.cursor++;
    this.evictToQuota();
    return r;
  }

  /** 只改会话（选区 / 进出组件）的一步：0 条 op，只有会话记录——「撤销也撤选区」（user 10-27「这个我们要」）。 */
  commitSession(before: M): void {
    if (this.cursor < this.ops.length) this.dropRedo();
    this.ops.push({ op: "batch", label: "选区", ops: [] }); this.joins.push(false); this.sessions.push({ before }); this.entries.push([]);
    this.cursor++;
  }

  /** 撤销一步（这一步的全部 op）：自反交换倒着走。now = 撤销这一刻的会话（记成这一步的 after）。返回场景 + 这一步之前的会话；没得撤 → null。 */
  undo(now?: M): { scene: Scene; before: M | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    const end = this.cursor;
    let start = end;
    do start--; while (start > this.evicted && this.joins[start]);
    for (let i = end - 1; i >= start; i--) this.swap(i, true);
    this.cursor = start;
    const rec = this.sessions[start];
    if (rec && now !== undefined) rec.after = now;
    return { scene: this.current, before: rec?.before };
  }
  /** 只撤一条 op（编辑器内部按新值重做那一步 / 一步中途失败回滚用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
  undoOp(): { scene: Scene; before: M | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    this.cursor--;
    this.swap(this.cursor, true);
    return { scene: this.current, before: this.sessions[this.cursor]?.before };
  }
  /** 重做一步：自反交换正着走；带回这一步之后的会话。events 为空（重做不重跑动词）。 */
  redo(_s: Scene): (ApplyResult & { after: M | undefined }) | null {
    if (this.cursor >= this.ops.length) return null;
    const c0 = this.cursor;
    do { this.swap(this.cursor, false); this.cursor++; } while (this.cursor < this.ops.length && this.joins[this.cursor]);
    return { scene: this.current, events: [], after: this.sessions[c0]?.after };
  }
  /** 丢掉重做队列（游标之后的 op、会话记录、撤销记录）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
  dropRedo(): void {
    this.ops.length = this.cursor; this.joins.length = this.cursor; this.sessions.length = this.cursor; this.entries.length = this.cursor;
  }
  /** 当前状态的独立重建（装载态 + 指令流全量重放；测试 / 校验用，不在热路径）。 */
  replay(): Scene { return this.stateAt(this.cursor); }
  /** 应用 ops[0..i) 后的状态（新实例，全量重放）。 */
  stateAt(i: number): Scene {
    let sc = this.base.clone();
    for (let j = 0; j < i; j++) sc = applyOp(sc, this.ops[j]).scene;
    return sc;
  }

  /** 自反交换 ops[i] 的记录（撤 = 倒序、重做 = 正序）；记录被换成反向包。 */
  private swap(i: number, reverse: boolean): void {
    const list = this.entries[i];
    const order = reverse ? [...list].reverse() : list;
    for (const e of order) {
      if (e.kind === "kernel") { e.delta = poolKernel(this.current, e.at).applyDelta(e.delta); }
      else if (e.kind === "pool") poolKernel(this.current, e.at).swapTablesWith(e.kernel);   // 兜底：整份表互换（对象身份不变）
      else if (e.kind === "mesh") this.current.mesh(e.def).kernel.swapWith(e.kernel);   // 网格体：整表互换（自反）
      else { const cur = this.current; if (e.skeleton) relinkKernels(e.snapshot, cur); this.current = e.snapshot; e.snapshot = cur; }
    }
  }
  /** 从最老端整步驱逐到配额之内；最新一步永不驱逐。驱逐 = 丢撤销记录、游标之前不能再撤；指令流留着。 */
  private evictToQuota(): void {
    const lastStart = ((): number => { let s = this.cursor; do s--; while (s > 0 && this.joins[s]); return s; })();
    while (this.usageBytes() > this.quota && this.evicted < lastStart) {
      let j = this.evicted + 1;
      while (j < this.ops.length && this.joins[j]) j++;
      for (let i = this.evicted; i < j; i++) this.entries[i] = [];
      this.evicted = j;
    }
  }
}
