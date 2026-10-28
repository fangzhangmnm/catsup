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
// · 2026-10-28 部件制（Claude Fable 5.1；设计稿 ai-docs/20261028-undo-step-regime.md，user「现在不是已经有好几个部件了？」）：记录不再是写死的四种 union，
//   而是**注册进来的部件**（UndoComponent：kind + 自反 swap + bytes）——四种内置（kernel 差量 / pool 整表 / mesh 整表 / scene 对象交换）在构造时注册，
//   以后的节点图 / 图片层 / 元数据各自注册一种，History 一行不改。部件的 swap 不许读别的部件此刻的状态（两两可交换；WeebPaint ADR-0008 修订 10-13 的契约）。
// · 步的「之后」会话改在步结束时封（sealStep），不再在撤销那一刻补记：记录是提交时就定的纯数据；步带标签（提示行「撤销：建组」）。
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


/** 一步的会话记录：before = 这一步开始之前；after = 这一步结束时（sealStep 封；重做时还原）。 */
export interface StepSession<M> { before: M; after?: M }
/** 步的标签（提示行「撤销：建组」「重做：移动 8 个点」）。 */
export interface StepLabel { readonly title: string; readonly count?: number }

/** 部件的宿主：场景族的部件要换场景对象。 */
export interface UndoHost { readonly scene: Scene; setScene(s: Scene): void }
/**
 * 撤销记录的部件：一步 = 若干条 {kind, data}，撤 = 倒序 swap、重做 = 正序再 swap（自反 / 对合，不存在「undo 生成 redo」）。
 * 契约（设计稿 §2 I3）：swap 不许读别的部件此刻的状态（两两可交换）；调用者乱用时给规章定义的结果、不炸。记录是纯数据（不存函数）。
 */
export interface UndoComponent<R = unknown> {
  readonly kind: string;
  /** 把记录放回去，返回放回之前的样子（= 反向记录）。 */
  swap(record: R, host: UndoHost): R;
  /** 字节估计（配额用；量纲：字节；量级即可）。 */
  bytes(record: R): number;
  dispose?(record: R): void;
}
interface Entry { kind: string; data: unknown; bytes: number }

const KERNEL_OPS = new Set<Op["op"]>(["addEdges", "eraseEdges", "eraseFaces", "eraseSelection", "move", "pushpull", "followme", "absorb", "weldEdges", "dissolveVertices", "explodeCurves", "setEdgeLayers", "paintFaces", "plugin", "mirror", "setHidden"]);
const SKELETON_OPS = new Set<Op["op"]>(["transformInstance", "placeInstance", "eraseInstance", "setLocked", "assignLayer", "addLayer", "renameLayer", "setLayerVisible", "removeLayer", "addMaterial", "setAxes", "setDrawFrame", "castDefinition", "addGuide", "eraseGuides", "clearGuides"]);
/** mesh 族的 op：改一个网格体的内核（寻址 = 定义）。加一种内核 = 加一个集合 + 一种记录；以后种类多了把「怎么记」挂到 KindDef 上。 */
const MESH_OPS = new Set<Op["op"]>(["meshMove", "meshExtrude", "meshKnife", "meshLoopCut", "meshDelete", "meshInset", "meshAddPrimitive", "meshEdgeMarks", "meshSmoothDefault", "meshBevel", "meshBevelVerts", "meshSymmetrize", "meshSymmetrySnap", "meshSubdivide", "meshMerge"]);
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

/** 四种内置部件（场景族）。记录的形状 = 以前的 Entry union，只是换成按 kind 派发。 */
interface KernelRec { at: PoolRef; delta: KernelDelta }
interface PoolRec { at: PoolRef; kernel: Kernel }
interface MeshRec { def: DefId; kernel: MeshKernel }
interface SceneRec { snapshot: Scene; skeleton: boolean }
const kernelComponent: UndoComponent<KernelRec> = { kind: "kernel", swap: (r, h) => ({ at: r.at, delta: poolKernel(h.scene, r.at).applyDelta(r.delta) }), bytes: (r) => deltaBytes(r.delta) };
const poolComponent: UndoComponent<PoolRec> = { kind: "pool", swap: (r, h) => { poolKernel(h.scene, r.at).swapTablesWith(r.kernel); return r; }, bytes: (r) => kernelBytes(r.kernel) };   // 兜底：整份表互换（对象身份不变）
const meshComponent: UndoComponent<MeshRec> = { kind: "mesh", swap: (r, h) => { h.scene.mesh(r.def).kernel.swapWith(r.kernel); return r; }, bytes: (r) => meshBytes(r.kernel) };   // 网格体：整表互换（自反）
const sceneComponent: UndoComponent<SceneRec> = { kind: "scene", swap: (r, h) => { const cur = h.scene; if (r.skeleton) relinkKernels(r.snapshot, cur); h.setScene(r.snapshot); return { snapshot: cur, skeleton: r.skeleton }; }, bytes: (r) => (r.skeleton ? skeletonBytes(r.snapshot) : sceneBytes(r.snapshot)) };

export class History<M = unknown> {
  private readonly base: Scene;                  // 装载态（clone 持有；replay 用）
  private ops: Op[] = [];
  private joins: boolean[] = [];                 // joins[i] = ops[i] 和 ops[i−1] 是同一步（第 0 条永远 false）
  private sessions: (StepSession<M> | null)[] = [];
  private entries: Entry[][] = [];               // entries[i] = ops[i] 的撤销记录（自反：撤了就是重做记录）
  private cursor = 0;                            // 已应用 op 数：ops[0..cursor) 生效
  private evicted = 0;                           // ops[0..evicted) 的撤销记录已被配额驱逐（指令流留着）
  private current: Scene;                        // 现在的场景对象（撤销 / 重做原地改；scene 型记录 = 换对象）
  private labels: (StepLabel | undefined)[] = [];   // labels[i] = 以 ops[i] 开头的那一步的标签（join 进来的条目不看）
  private readonly quota: number;
  private readonly components = new Map<string, UndoComponent>();
  private readonly host: UndoHost;

  constructor(base?: Scene, opts?: { quotaBytes?: number }) {
    this.base = base ? base.clone() : new Scene();
    this.current = base ?? new Scene();
    this.quota = opts?.quotaBytes ?? UNDO_QUOTA_BYTES;
    const self = this;   // eslint-disable-line @typescript-eslint/no-this-alias
    this.host = { get scene(): Scene { return self.current; }, setScene: (sc: Scene) => { self.current = sc; } };
    for (const c of [kernelComponent, poolComponent, meshComponent, sceneComponent] as UndoComponent[]) this.registerComponent(c);
  }
  /** 登记一种部件（以后的节点图 / 图片层 / 元数据）。重名 = 在登记处响亮失败（调用点的误用，不留到撤销时炸）。 */
  registerComponent(c: UndoComponent): void {
    if (this.components.has(c.kind)) throw new Error(`undo component "${c.kind}" already registered`);
    this.components.set(c.kind, c);
  }
  /** 外部部件在当前步里记一条记录（会话 / 节点图 / 图片层……）：挂在这一步最后一条 op 上；没有步（游标 0 或刚驱逐）= 响亮失败。 */
  record(kind: string, data: unknown): void {
    const c = this.components.get(kind);
    if (!c) throw new Error(`undo component "${kind}" not registered`);
    if (this.cursor === 0 || this.cursor < this.ops.length) throw new Error(`record("${kind}"): no open step at the top of the stack`);
    this.entries[this.cursor - 1].push({ kind, data, bytes: c.bytes(data) });
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
  commit(s: Scene, op: Op, join = false, before?: M, label?: StepLabel): ApplyResult {
    if (this.cursor < this.ops.length) this.dropRedo();
    const t = opTier(s, op);
    let r: ApplyResult;
    const entries: Entry[] = [];
    const rec = (kind: string, data: unknown): void => { entries.push({ kind, data, bytes: this.components.get(kind)!.bytes(data) }); };
    if (t.tier === "kernel") {
      const at = t.at!, truth = poolKernel(s, at), skel = s.cloneSkeleton(), shadow = truth.clone(), seq = shadow.changes.seq;
      setPoolKernel(s, at, shadow);   // 这条 op 在影子上跑
      try { r = applyOp(s, op); }
      catch (e) { setPoolKernel(s, at, truth); throw new OpApplyError(e, skel); }   // 真身原封不动
      truth.swapTablesWith(shadow); setPoolKernel(s, at, truth);   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      const delta = truth.deltaAgainst(shadow, seq);
      rec("scene", { snapshot: skel, skeleton: true } satisfies SceneRec);
      if (delta) rec("kernel", { at, delta } satisfies KernelRec); else rec("pool", { at, kernel: shadow } satisfies PoolRec);
    } else if (t.tier === "mesh") {
      const def = t.def!, body = s.mesh(def), truth = body.kernel, skel = s.cloneSkeleton(), shadow = truth.clone();
      body.kernel = shadow;   // 这条 op 在影子上跑
      try { r = applyOp(s, op); }
      catch (e) { body.kernel = truth; throw new OpApplyError(e, skel); }
      truth.swapWith(shadow); body.kernel = truth;   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      rec("scene", { snapshot: skel, skeleton: true } satisfies SceneRec);
      rec("mesh", { def, kernel: shadow } satisfies MeshRec);
    } else {
      const snap = t.tier === "skeleton" ? s.cloneSkeleton() : s.clone();
      try { r = applyOp(s, op); }
      catch (e) { throw new OpApplyError(e, snap); }
      rec("scene", { snapshot: snap, skeleton: t.tier === "skeleton" } satisfies SceneRec);
    }
    this.current = r.scene;
    const joined = join && this.cursor > 0;
    this.ops.push(op); this.joins.push(joined);
    this.sessions.push(joined ? null : before !== undefined ? { before } : null);
    this.labels.push(joined ? undefined : label);
    this.entries.push(entries);
    this.cursor++;
    this.evictToQuota();
    return r;
  }
  /** 当前这一步（栈顶）的开头下标；没有步 = -1。 */
  private topStart(): number {
    if (this.cursor === 0) return -1;
    let i = this.cursor - 1;
    while (i > 0 && this.joins[i]) i--;
    return i;
  }
  /** 封步：这一步结束时的会话（重做回到它）+ 可补标签。没有步 = 不做（规章定义的结果，不炸）。 */
  sealStep(after: M, label?: StepLabel): void {
    const i = this.topStart();
    if (i < 0 || this.cursor < this.ops.length) return;
    const rec = this.sessions[i];
    if (rec) rec.after = after; else this.sessions[i] = { before: after, after };   // 没记「之前」的步（直接调 History 的调用方）：之前 = 之后，撤销不动会话
    if (label) this.labels[i] = label;
  }
  /**
   * 上一条 op 提交之前、池 at 的内核（复现包「上一步」钮）：按这条 op 的记录倒推一次——kernel 差量 = 在真身的拷贝上应用一次（记录存的是撤销方向）；
   * pool 整表 = 那份旧表的拷贝；整份场景记录 = 快照里的那个池。不重放指令流（以前 stateAt(pos − 1) = O(指令数)，大文件上会卡）。
   * 没有上一条 / 记录被驱逐 / 这条 op 没碰 at / at 在那之前还不存在 → null（规章定义的结果，不猜）。
   */
  beforeLastOp(at: PoolRef): Kernel | null {
    if (this.cursor === 0 || this.cursor <= this.evicted) return null;
    const list = this.entries[this.cursor - 1];
    if (!list.length) return null;
    const same = (b: PoolRef): boolean => b.def === at.def && b.group === at.group;
    for (const e of [...list].reverse()) {
      if (e.kind === "kernel" && same((e.data as KernelRec).at)) { const k = poolKernel(this.current, at).clone(); k.applyDelta((e.data as KernelRec).delta); return k; }
      if (e.kind === "pool" && same((e.data as PoolRec).at)) return (e.data as PoolRec).kernel.clone();
      if (e.kind === "scene" && !(e.data as SceneRec).skeleton) { const sc = (e.data as SceneRec).snapshot; return sc.hasPool(at) && sc.kindOf(at.def) === "brep" ? sc.kernelOf(at).clone() : null; }
    }
    return null;   // 只有骨架记录（挪实例 / 层 / 材质……）：内核没动，这一步的「之前」对这个池 = 现在
  }
  /** 栈顶那一步的标签（提示行 / 马后炮标题）。 */
  topLabel(): StepLabel | undefined { const i = this.topStart(); return i < 0 ? undefined : this.labels[i]; }

  /** 只改会话（选区 / 进出组件）的一步：0 条 op，只有会话记录——「撤销也撤选区」（user 10-27「这个我们要」）。 */
  commitSession(before: M, after?: M, label?: StepLabel): void {
    if (this.cursor < this.ops.length) this.dropRedo();
    this.ops.push({ op: "batch", label: "选区", ops: [] }); this.joins.push(false); this.sessions.push(after === undefined ? { before } : { before, after }); this.labels.push(label ?? { title: "选择" }); this.entries.push([]);
    this.cursor++;
  }

  /** 撤销一步（这一步的全部 op）：自反交换倒着走。返回场景 + 这一步之前的会话 + 标签；没得撤 → null。「之后」的会话由 sealStep 在步结束时封，这里不再补记。 */
  undo(): { scene: Scene; before: M | undefined; label: StepLabel | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    const end = this.cursor;
    let start = end;
    do start--; while (start > this.evicted && this.joins[start]);
    for (let i = end - 1; i >= start; i--) this.swap(i, true);
    this.cursor = start;
    return { scene: this.current, before: this.sessions[start]?.before, label: this.labels[start] };
  }
  /** 只撤一条 op（编辑器内部按新值重做那一步 / 一步中途失败回滚用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
  undoOp(): { scene: Scene; before: M | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    this.cursor--;
    this.swap(this.cursor, true);
    return { scene: this.current, before: this.sessions[this.cursor]?.before };
  }
  /** 重做一步：自反交换正着走；带回这一步之后的会话。events 为空（重做不重跑动词）。 */
  redo(_s: Scene): (ApplyResult & { after: M | undefined; label: StepLabel | undefined }) | null {
    if (this.cursor >= this.ops.length) return null;
    const c0 = this.cursor;
    do { this.swap(this.cursor, false); this.cursor++; } while (this.cursor < this.ops.length && this.joins[this.cursor]);
    return { scene: this.current, events: [], after: this.sessions[c0]?.after, label: this.labels[c0] };
  }
  /** 已做的步数（游标之前；不是 op 数；重做尾巴不算）。fuzz 的「一个动作最多长一步」用。 */
  steps(): number { let n = 0; for (let i = 0; i < this.cursor; i++) if (!this.joins[i]) n++; return n; }
  /** 被配额驱逐、撤不回去的**步**数（提示行「撤到头了（更早的 N 步超过配额）」）。 */
  evictedSteps(): number { let n = 0; for (let i = 0; i < this.evicted; i++) if (!this.joins[i]) n++; return n; }
  /** 丢掉重做队列（游标之后的 op、会话记录、撤销记录）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
  dropRedo(): void {
    for (let i = this.cursor; i < this.entries.length; i++) for (const e of this.entries[i]) this.components.get(e.kind)?.dispose?.(e.data);
    this.ops.length = this.cursor; this.joins.length = this.cursor; this.sessions.length = this.cursor; this.entries.length = this.cursor; this.labels.length = this.cursor;
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
      const c = this.components.get(e.kind);
      if (!c) throw new Error(`undo component "${e.kind}" not registered`);   // 内部不变量（登记过的才记得进来）
      e.data = c.swap(e.data, this.host);
    }
  }
  /** 从最老端整步驱逐到配额之内；最新一步永不驱逐。驱逐 = 丢撤销记录、游标之前不能再撤；指令流留着。 */
  private evictToQuota(): void {
    const lastStart = ((): number => { let s = this.cursor; do s--; while (s > 0 && this.joins[s]); return s; })();
    while (this.usageBytes() > this.quota && this.evicted < lastStart) {
      let j = this.evicted + 1;
      while (j < this.ops.length && this.joins[j]) j++;
      for (let i = this.evicted; i < j; i++) { for (const e of this.entries[i]) this.components.get(e.kind)?.dispose?.(e.data); this.entries[i] = []; }
      this.evicted = j;
    }
  }
}
