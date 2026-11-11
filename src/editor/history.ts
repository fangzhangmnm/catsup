// history.ts —— 正规 undo：**指令流 + 差量栈**（A1 2026-09-20 立；A3 2026-10-27 换底子，设计稿 ai-docs/20261027-undo-delta-design.md）。
// created 2026-09-20 by Claude Fable 5.1 · 2026-10-27 重做底子 by Claude Fable 5.1（user：「我是更喜欢逆指令……会不会不好写的有另外一条兜底的路？」「CatsUp为什么不128」「画画……我建议不走[自己的栈]」「影子换真身好主意」）
//
// · 指令流 ops[]：可序列化、按坐标寻址——复现包 / 黑匣子 / 以后的联机 / 脚本都读它；永不驱逐（很小）。
//   指令的形状改了（例：v0.19.4 addMaterial 不再带 texture、图先 addTexture），旧复现包里对应的那几条重放不了——这是许可的（统筹 11-10：复现包是调试用的衍生物，不做向后兼容；重放脚本说清是哪一条、停下）。**不再是撤销的底子**（以前 = 每 8 条整场景快照 + 回到快照重放：八份整场景常驻、深撤销 O(全部指令)）。
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
// · 2026-11-11 整步事务（贴图主线 1-8a，Claude Opus 5.5；统筹 11-11 裁定，施工单 ai-docs/20261111-paint-workorders-12.md）：撤销 / 重做一步分两段——
//   ① 先问：这一步里每种成分把它的记录（按要翻的先后）问一遍「现在能不能翻」（check；画 = 内核认不认这个方向、有没有开着的一笔）；有一条说不能 → 什么都不碰、游标不动、抛 StepFlipError("refused")。
//   ② 再翻：按先后 swap；中间抛了 → 翻过的倒着再 swap 一遍（每种成分都是自反的）、游标不动、抛 StepFlipError("rolled-back")。翻回去又抛 = 那条记录背后的状态不可信：
//      翻回去那一圈走完之后，调那种成分的 untrusted（画 = 这张画的步全部作废、记录摘掉），把它说的话带在错里；别的成分照常翻回去。不许停在半路。
//   先后：撤销 = 这一步的指令倒着、每条指令的记录倒着；重做 = 正着。一条指令的记录里「模型的」在前、「画的」在后（画布跟着模型加高，是改完模型之后在收尾里记的），
//   所以撤销先翻画（画布缩回去）再翻模型，重做先翻模型再翻画。
// · commitRecords：一步只有成分记录（画一笔：内核的步交给三维的栈）= 一条空的 batch 记号指令 + 记录，不拷场景；这种步之后的指令不许 join 进来。
//   dropRecords：摘掉某种成分的一批记录（只给「这张画以前的步全作废」用），摘空了的「只有记录」的步整步删掉，游标和驱逐线跟着重算；被摘的记录调成分的 forget（不调 dispose：背后的东西已经自己作废了）。
import { Scene, type PoolRef, type DefId } from "../scene/scene.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { applyOp, type ApplyResult, type Op, poolOf } from "./ops.ts";
import type { Kernel } from "../kernel/kernel.ts";
import { type KernelDelta, deltaBytes } from "../kernel/delta.ts";
import { recordMints, replayMints, type Guid } from "../format/guid.ts";

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
  /**
   * 字节会变（画：内核的图块没压缩时记 0、归图块池自己的额度管，压缩之后记压缩后的大小、被几条记录共用时分摊——画画软件的栈每次重算，0-3a）：
   * 算额度之前现问一遍 bytes，不用挂上时存的那个数。不给 = 挂上时算一次（别的成分照旧）。
   */
  readonly volatileBytes?: boolean;
  dispose?(record: R): void;
  /** 翻之前先问（整步事务第一段）：这一步里这种成分的全部记录（按要翻的先后）现在能不能按 dir 翻；不能 = 原因，能 = null。不给 = 永远能。不许改任何状态。 */
  check?(records: readonly R[], dir: "undo" | "redo", host: UndoHost): string | null;
  /** 翻回去也抛了 = 这条记录背后的状态不可信：成分自己走「不可恢复」那条路（可以调 History.dropRecords），返回给用户的一句话。 */
  untrusted?(record: R, cause: unknown): string;
  /** 记录被 dropRecords 摘掉（背后的东西已经自己作废，不 dispose）。 */
  forget?(record: R): void;
}
/** 撤销 / 重做没做成，三维的状态和撤销栈的游标都没动（refused = 问的时候就说不能；rolled-back = 翻了一半抛了、已经翻回去）。untrusted = 翻回去也失败、已作废的那几样的说法。 */
export class StepFlipError extends Error {
  readonly reason: "refused" | "rolled-back";
  readonly label: StepLabel | undefined;
  readonly untrusted: readonly string[];
  constructor(reason: "refused" | "rolled-back", why: string, label: StepLabel | undefined, untrusted: readonly string[] = []) {
    super(why);
    this.name = "StepFlipError"; this.reason = reason; this.label = label; this.untrusted = untrusted;
  }
}
interface Entry { kind: string; data: unknown; bytes: number }

const KERNEL_OPS = new Set<Op["op"]>(["addEdges", "eraseEdges", "eraseFaces", "eraseSelection", "move", "pushpull", "followme", "absorb", "weldEdges", "dissolveVertices", "explodeCurves", "setEdgeLayers", "paintFaces", "flipFaceSides", "plugin", "mirror", "setHidden"]);
const SKELETON_OPS = new Set<Op["op"]>(["setMeshMirror", "transformInstance", "placeInstance", "eraseInstance", "purgeDefs", "purgeMaterials", "moveInstance", "setLocked", "rename", "assignLayer", "addLayer", "renameLayer", "setLayerVisible", "removeLayer", "addMaterial", "addTexture", "purgeTextures", "setAxes", "setDrawFrame", "castDefinition", "addGuide", "eraseGuides", "clearGuides", "shelfPut", "shelfTake", "shelfMove", "shelfFolderAdd", "shelfFolderRename", "shelfFolderRemove"]);
/** mesh 族的 op：改一个网格体的内核（寻址 = 定义）。加一种内核 = 加一个集合 + 一种记录；以后种类多了把「怎么记」挂到 KindDef 上。 */
const MESH_OPS = new Set<Op["op"]>(["meshMove", "meshExtrude", "meshKnife", "meshLoopCut", "meshDelete", "meshInset", "meshAddPrimitive", "meshEdgeMarks", "meshSmoothDefault", "meshBevel", "meshBevelVerts", "meshSymmetrize", "meshSymmetrySnap", "meshSubdivide", "meshMerge", "meshDuplicate", "meshFill", "meshFlip", "startPaint", "meshPaintFaces", "meshLayoutPaint"]);   // 画的三条（1-3b）：内核整表 + 骨架（uvSets / 贴图 / 材质 / 槽表）一起记
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
  if (op.op === "setAxes" && o.at && o.at.group === null) return { tier: "scene" };   // 根也一样（2026-10-30：根换原点 = 内容整个挪，user「我说了root和其他的尽量一视同仁」）
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
  private mints: Guid[][] = [];                  // mints[i] = ops[i] 铸的 GUID（重放按原样放回：指令流里有按 GUID 认条目的指令；很小，和指令流同寿）
  private joins: boolean[] = [];                 // joins[i] = ops[i] 和 ops[i−1] 是同一步（第 0 条永远 false）
  private sessions: (StepSession<M> | null)[] = [];
  private entries: Entry[][] = [];               // entries[i] = ops[i] 的撤销记录（自反：撤了就是重做记录）
  private cursor = 0;                            // 已应用 op 数：ops[0..cursor) 生效
  private evicted = 0;                           // ops[0..evicted) 的撤销记录已被配额驱逐（指令流留着）
  private current: Scene;                        // 现在的场景对象（撤销 / 重做原地改；scene 型记录 = 换对象）
  private labels: (StepLabel | undefined)[] = [];   // labels[i] = 以 ops[i] 开头的那一步的标签（join 进来的条目不看）
  private recordOnly: boolean[] = [];            // recordOnly[i] = ops[i] 是 commitRecords 的记号（一步只有成分记录；摘空了整步删）
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
  /** 现在占多少字节（还能撤的那一段）。字节会变的成分现问一遍、顺手记下（volatileBytes）。 */
  usageBytes(): number {
    const live = this.volatileKinds();
    let n = 0;
    for (let i = this.evicted; i < this.entries.length; i++) for (const e of this.entries[i]) { if (live && live.has(e.kind)) e.bytes = this.components.get(e.kind)!.bytes(e.data); n += e.bytes; }
    return n;
  }
  /** 登记过的「字节会变」的成分；一个都没有 = null（不画画的栈不多做一点事）。 */
  private volatileKinds(): ReadonlySet<string> | null {
    let out: Set<string> | null = null;
    for (const [k, c] of this.components) if (c.volatileBytes) (out ??= new Set()).add(k);
    return out;
  }
  /** 被配额驱逐、不能再撤的 op 数（披露用）。 */
  evictedCount(): number { return this.evicted; }

  /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴）。join = 和上一条同一步；before = 新开一步时这一步之前的会话。失败抛 OpApplyError（不记账，带回提交前状态）。 */
  commit(s: Scene, op: Op, join = false, before?: M, label?: StepLabel): ApplyResult {
    if (this.cursor < this.ops.length) this.dropRedo();
    const t = opTier(s, op);
    let r: ApplyResult;
    const entries: Entry[] = [];
    const rec = (kind: string, data: unknown): void => { entries.push({ kind, data, bytes: this.components.get(kind)!.bytes(data) }); };
    let minted: Guid[] = [];
    const apply = (): ApplyResult => recordMints(() => applyOp(s, op), (m) => { minted = m; });
    if (t.tier === "kernel") {
      const at = t.at!, truth = poolKernel(s, at), skel = s.cloneSkeleton(), shadow = truth.clone(), seq = shadow.changes.seq;
      setPoolKernel(s, at, shadow);   // 这条 op 在影子上跑
      try { r = apply(); }
      catch (e) { setPoolKernel(s, at, truth); throw new OpApplyError(e, skel); }   // 真身原封不动
      truth.swapTablesWith(shadow); setPoolKernel(s, at, truth);   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      const delta = truth.deltaAgainst(shadow, seq);
      rec("scene", { snapshot: skel, skeleton: true } satisfies SceneRec);
      if (delta) rec("kernel", { at, delta } satisfies KernelRec); else rec("pool", { at, kernel: shadow } satisfies PoolRec);
    } else if (t.tier === "mesh") {
      const def = t.def!, body = s.mesh(def), truth = body.kernel, skel = s.cloneSkeleton(), shadow = truth.clone();
      body.kernel = shadow;   // 这条 op 在影子上跑
      try { r = apply(); }
      catch (e) { body.kernel = truth; throw new OpApplyError(e, skel); }
      truth.swapWith(shadow); body.kernel = truth;   // 影子换真身：真身对象不变、表换成影子的；影子此刻持有「之前」的表
      rec("scene", { snapshot: skel, skeleton: true } satisfies SceneRec);
      rec("mesh", { def, kernel: shadow } satisfies MeshRec);
    } else {
      const snap = t.tier === "skeleton" ? s.cloneSkeleton() : s.clone();
      try { r = apply(); }
      catch (e) { throw new OpApplyError(e, snap); }
      rec("scene", { snapshot: snap, skeleton: t.tier === "skeleton" } satisfies SceneRec);
    }
    this.current = r.scene;
    const joined = join && this.cursor > 0 && !this.recordOnly[this.cursor - 1];   // 「只有记录」的步不许被 join 进来（摘记录时要能整步删）
    this.ops.push(op); this.mints.push(minted); this.joins.push(joined); this.recordOnly.push(false);
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
    this.ops.push({ op: "batch", label: "选区", ops: [] }); this.mints.push([]); this.joins.push(false); this.sessions.push(after === undefined ? { before } : { before, after }); this.labels.push(label ?? { title: "选择" }); this.entries.push([]); this.recordOnly.push(false);
    this.cursor++;
  }
  /** 一步只有成分记录（画一笔，1-8a）：一条空的 batch 记号指令（进指令流、重放是空操作，不拷场景）+ 这些记录。没有记录 = 不做。 */
  commitRecords(before: M, label: StepLabel, records: readonly { readonly kind: string; readonly data: unknown }[]): void {
    if (!records.length) return;
    const entries = records.map((r) => { const c = this.components.get(r.kind); if (!c) throw new Error(`undo component "${r.kind}" not registered`); return { kind: r.kind, data: r.data, bytes: c.bytes(r.data) }; });
    if (this.cursor < this.ops.length) this.dropRedo();
    this.ops.push({ op: "batch", label: label.title, ops: [] }); this.mints.push([]); this.joins.push(false); this.sessions.push({ before, after: before }); this.labels.push(label); this.entries.push(entries); this.recordOnly.push(true);
    this.cursor++;
    this.evictToQuota();
  }
  /**
   * 摘记录（只给「这张画以前的步全作废」用）：所有步里这种成分、pred 为真的记录摘掉（调 forget，不调 dispose）；摘空了的「只有记录」的步整步删掉，游标和驱逐线跟着重算。返回摘了几条。
   */
  dropRecords(kind: string, pred: (data: unknown) => boolean): number {
    const c = this.components.get(kind);
    if (!c) throw new Error(`undo component "${kind}" not registered`);
    let n = 0;
    for (const list of this.entries) for (let j = list.length - 1; j >= 0; j--) if (list[j].kind === kind && pred(list[j].data)) { c.forget?.(list[j].data); list.splice(j, 1); n++; }
    const keep = this.ops.map((_, i) => !(this.recordOnly[i] && this.entries[i].length === 0));
    if (keep.every(Boolean)) return n;
    // 删掉的是一步的开头、下一条 join 在它后面：下一条接班当开头（join 位 / 这一步的会话 / 标签交给它），不然它会粘到前一步上去（统筹 11-11 审查）。
    // 正着走：连着删几条也一路交下去。commitRecords 本身不许 join 进来，这里是给规矩以外的形状兜底。
    for (let i = 0; i + 1 < this.ops.length; i++) {
      if (keep[i] || !this.joins[i + 1]) continue;
      this.joins[i + 1] = this.joins[i];
      if (!this.joins[i]) { this.sessions[i + 1] ??= this.sessions[i]; this.labels[i + 1] ??= this.labels[i]; }
    }
    const kept = (upTo: number): number => { let k = 0; for (let i = 0; i < upTo; i++) if (keep[i]) k++; return k; };
    this.cursor = kept(this.cursor); this.evicted = kept(this.evicted);
    const f = <T>(a: T[]): T[] => a.filter((_, i) => keep[i]);
    this.ops = f(this.ops); this.mints = f(this.mints); this.joins = f(this.joins); this.sessions = f(this.sessions); this.entries = f(this.entries); this.labels = f(this.labels); this.recordOnly = f(this.recordOnly);
    return n;
  }

  /** 撤销一步（这一步的全部 op）：自反交换倒着走。返回场景 + 这一步之前的会话 + 标签；没得撤 → null。「之后」的会话由 sealStep 在步结束时封，这里不再补记。 */
  undo(): { scene: Scene; before: M | undefined; label: StepLabel | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    const end = this.cursor;
    let start = end;
    do start--; while (start > this.evicted && this.joins[start]);
    this.flipStep(start, end, "undo", this.labels[start]);   // 整步事务：没做成 = 抛 StepFlipError，什么都没动
    this.cursor = start;
    return { scene: this.current, before: this.sessions[start]?.before, label: this.labels[start] };
  }
  /** 只撤一条 op（编辑器内部按新值重做那一步 / 一步中途失败回滚用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
  undoOp(): { scene: Scene; before: M | undefined } | null {
    if (this.cursor <= this.evicted) return null;
    this.flipStep(this.cursor - 1, this.cursor, "undo", undefined);
    this.cursor--;
    return { scene: this.current, before: this.sessions[this.cursor]?.before };
  }
  /** 重做一步：自反交换正着走；带回这一步之后的会话。events 为空（重做不重跑动词）。 */
  redo(_s: Scene): (ApplyResult & { after: M | undefined; label: StepLabel | undefined }) | null {
    if (this.cursor >= this.ops.length) return null;
    const c0 = this.cursor;
    let end = c0;
    do end++; while (end < this.ops.length && this.joins[end]);
    this.flipStep(c0, end, "redo", this.labels[c0]);   // 整步事务：没做成 = 抛 StepFlipError，什么都没动
    this.cursor = end;
    return { scene: this.current, events: [], after: this.sessions[c0]?.after, label: this.labels[c0] };
  }
  /** 已做的步数（游标之前；不是 op 数；重做尾巴不算）。fuzz 的「一个动作最多长一步」用。 */
  steps(): number { let n = 0; for (let i = 0; i < this.cursor; i++) if (!this.joins[i]) n++; return n; }
  /** 被配额驱逐、撤不回去的**步**数（提示行「撤到头了（更早的 N 步超过配额）」）。 */
  evictedSteps(): number { let n = 0; for (let i = 0; i < this.evicted; i++) if (!this.joins[i]) n++; return n; }
  /** 丢掉重做队列（游标之后的 op、会话记录、撤销记录）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
  dropRedo(): void {
    for (let i = this.cursor; i < this.entries.length; i++) for (const e of this.entries[i]) this.components.get(e.kind)?.dispose?.(e.data);
    this.ops.length = this.cursor; this.mints.length = this.cursor; this.joins.length = this.cursor; this.sessions.length = this.cursor; this.entries.length = this.cursor; this.labels.length = this.cursor; this.recordOnly.length = this.cursor;
  }
  /** 当前状态的独立重建（装载态 + 指令流全量重放，GUID 和当初一样；测试 / 校验用，不在热路径）。 */
  replay(): Scene { return this.stateAt(this.cursor); }
  /** 应用 ops[0..i) 后的状态（新实例，全量重放）。 */
  stateAt(i: number): Scene {
    let sc = this.base.clone();
    for (let j = 0; j < i; j++) { const from = sc, op = this.ops[j]; sc = replayMints(this.mints[j], () => applyOp(from, op)).scene; }
    return sc;
  }

  /**
   * 整步事务（头注释那一节）：ops[start..end) 的记录按方向排好先后（撤 = 指令倒着、每条指令的记录倒着；重做 = 正着）→ ① 每种成分问一遍 → ② 翻；
   * 中间抛了 = 翻过的倒着再翻一遍、抛 StepFlipError；翻回去又抛的那几条，走完之后调成分的 untrusted。游标归调用的人改（只在这里没抛时）。
   */
  private flipStep(start: number, end: number, dir: "undo" | "redo", label: StepLabel | undefined): void {
    const seq: Entry[] = [];
    if (dir === "undo") for (let i = end - 1; i >= start; i--) seq.push(...[...this.entries[i]].reverse());
    else for (let i = start; i < end; i++) seq.push(...this.entries[i]);
    const comp = (kind: string): UndoComponent => { const c = this.components.get(kind); if (!c) throw new Error(`undo component "${kind}" not registered`); return c; };   // 内部不变量（登记过的才记得进来）
    const byKind = new Map<string, unknown[]>();
    for (const e of seq) { const l = byKind.get(e.kind); if (l) l.push(e.data); else byKind.set(e.kind, [e.data]); }
    for (const [kind, recs] of byKind) { const why = comp(kind).check?.(recs, dir, this.host) ?? null; if (why) throw new StepFlipError("refused", why, label); }
    const done: Entry[] = [];
    try { for (const e of seq) { e.data = comp(e.kind).swap(e.data, this.host); done.push(e); } }
    catch (cause) {
      const bad: { e: Entry; again: unknown }[] = [];
      for (const e of done.reverse()) { try { e.data = comp(e.kind).swap(e.data, this.host); } catch (again) { bad.push({ e, again }); } }
      const said = bad.map(({ e, again }) => comp(e.kind).untrusted?.(e.data, again) ?? `${e.kind}：${again instanceof Error ? again.message : String(again)}`);
      throw new StepFlipError("rolled-back", cause instanceof Error ? cause.message : String(cause), label, said);
    }
  }
  /** 从最老端整步驱逐到配额之内；最新一步永不驱逐。驱逐 = 丢撤销记录、游标之前不能再撤；指令流留着。 */
  private evictToQuota(): void {
    const lastStart = ((): number => { let s = this.cursor; do s--; while (s > 0 && this.joins[s]); return s; })();
    let usage = this.usageBytes();   // 一次算清（字节会变的现问），之后每驱逐一步减掉它的（以前每一圈都全扫一遍）。
    // 这个数在这一圈之内是近似的：被挤掉的步和别的步共用图块时，剩下那些步分摊到的字节会变大（画），这里不重问；下一次提交全算一遍就对了（统筹 0-3a 审查）。
    while (usage > this.quota && this.evicted < lastStart) {
      let j = this.evicted + 1;
      while (j < this.ops.length && this.joins[j]) j++;
      for (let i = this.evicted; i < j; i++) { for (const e of this.entries[i]) { usage -= e.bytes; this.components.get(e.kind)?.dispose?.(e.data); } this.entries[i] = []; }
      this.evicted = j;
    }
  }
}
