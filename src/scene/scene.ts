// scene.ts —— 场景模型：definition（component 定义 = 自己的几何池 + 嵌套 group + 实例）/ group（sticky 隔离域 + 轴框，顶点烘在所在
// definition 的坐标里）/ instance（definition + 变换 = ECS entity 形状）。
// 本体论（user 2026-09-06/07，far-horizon §1 / §3.2）：group 不是 object——「同一个 mesh 上的编辑时上下文」，只是把「谁和谁粘」的判定域
// 隔开（立宪 A3 的 context 槽 = 每个 group 自己一个 Kernel 池，重合即同一只在池内成立）+ 一个轴框；渲染时就是三角汤。
// component = object：定义 + 实例，实例只有变换 + 引用 + 覆盖，不能单独改形状（Make Unique 才能）。
// 运行时 id（DefId / GroupId / InstId）由本类顺序铸造：op 日志重放同序列 → 同 id（与顶点 µm 寻址同理，联机也成立）。
// 身份（2026-11-04 身份地基，Claude Opus 5.5）：运行时 id 只活这次会话、不落盘；每个条目另带一个 `guid`，文件里互相引用只用它（format/scene-doc.ts 换算）。材质同理：`materials` 的下标 = 运行时句柄。
// created 2026-10-21 by Claude Fable 5.1（group / component 纪元；user「supersprint where at least i have groups and components」）

import { add3, sub3, scale3, dist3, normalize3, cross3 } from "../kernel/geom.ts";
import { Kernel, type BrepSnapshot, type EdgeId, type FaceEvent, type FaceId, type Pt3, type Seg3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, IDENTITY, WORLD_FRAME, applyNormal, applyPlane, applyPt, compose, det3, frameAt, transformFrame } from "./xform.ts";
import { type Guides, cloneGuides, emptyGuides } from "./guides.ts";
/** 非 brep 身体的「参考几何」：永远空的那一份（别往里写）。 */
const NO_GUIDES: Guides = emptyGuides();
import type { BodyKind } from "./body-kind.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { MirrorSetting } from "../mesh/mirror.ts";
import type { KernelView } from "./kernel-view.ts";
import { meshViewOf } from "../mesh/mesh-view.ts";
import type { CurveParams } from "../kernel/curves.ts";
import { type CarriedJson, type Channels, type ColorMap, type LayerDoc, type ShelfDoc, type TextureDoc, colorMapIn, defaultLayers, emptyShelf } from "../format/document.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import type { Stamp } from "../format/migrate/index.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "./builtin-materials.ts";
export { type BodyKind, BODY_KINDS, isBodyKind } from "./body-kind.ts";

export type DefId = number;
export type GroupId = number;
export type InstId = number;

/** 材质（文档级，= glTF core material）：颜色（sRGB 0..1）+ channels（通道名 → 一摞贴图 GUID；图在贴图表里，2026-11-10 起材质不装图）。面 → 槽号 → 槽表 → 这张表；只有「清理没人用的材质」删（ops.ts purgeMaterials，同一步重排所有槽表）。 */
export interface Material {
  /** 身份（文件 / 跨文件都认它）。下标只是这次会话的句柄。 */
  readonly guid: Guid;
  readonly name: string;
  readonly color: readonly [number, number, number];
  /** 通道名 → 一摞贴图 GUID（这一版只用 color、一摞一张）。问「用哪张图」只经 Scene.colorMapOf。 */
  readonly channels?: Channels;
  /** 文件里材质扩展本版不认识的键（原样带回；format/document.ts MaterialDoc.extra）。 */
  readonly extra?: CarriedJson;
}
export interface Group { readonly id: GroupId; readonly guid: Guid; parent: GroupId | null; /** 进这个组画图用的坐标架（本 definition 坐标）；组没有原点（DT86）。 */ axes: Frame; kernel: Kernel; name?: string; /** 参考几何（0.11；本 definition 坐标）。 */ guides: Guides; }   // 组 = brep 汤里的分区，不是物体：无身份、无锁、无层（user 2026-10-24「su的group不算物体层级……地位类似选区」）
export interface Instance { readonly id: InstId; readonly guid: Guid; def: DefId; parent: GroupId | null; xform: Xform; name?: string; /** 锁定（A27）。 */ locked?: boolean; /** 层（契约 §4）：缺 = 继承父上下文的有效层。 */ layer?: number; /** 隐藏（DT49；glTF KHR_node_visibility）：藏这一份连同里面的一切；不画、不吸、点不中。 */ hidden?: boolean; }
/** brep 身体 = 肥皂膜内核：根上的散几何汤（kernel）+ group 分区（「组不是物体层级，只是 brep 模式下面方便编辑的分组拆组」，user）+ 参考几何 + 材质槽。 */
export interface BrepBody {
  readonly kind: "brep";
  kernel: Kernel;                       // 根池（不在任何 group 里的几何）
  groups: Map<GroupId, Group>;
  nextGroup: number;
  /** 材质槽：槽号 → 文档材质索引（契约 §5.3；面存槽号，实例可重映射——重映射未做）。 */
  materialSlots: number[];
  /** 根池的参考几何（0.11；definition 坐标）。group 的在 Group.guides。 */
  guides: Guides;
  /**
   * 进了这个组件画图用的坐标架（DT86，2026-10-26 Claude Opus 5.5；user「坐标架同意 组件原点同意」）：definition 坐标；缺 = 跟组件原点（= 定义自己的坐标系）。
   * 只管推断 / 网格 / 画的平面，不碰几何、不是组件原点（组件原点 = 定义坐标系，改它挪几何：user「原点挪几何，因为是低频commitment，改画画坐标架不挪」）。
   * 根定义不用它：根的坐标架 = Scene.axes。组的坐标架 = Group.axes（组不配有原点：user「组不是物体只是管理sticky geometry用的。所以有坐标架，但是不配有原点」）。
   */
  drawFrame?: Frame;
}
/** 网格身体（Blender 式三角网最小形，user 2026-10-24 命名 `mesh` / 「网格」；契约 §2）：定义坐标；默认剔背面；材质槽同 brep 语义。 */
/** 2026-10-27：身体 = 可编辑的 mesh 内核（src/mesh/；单池、单面、顶点 id 寻址）；文件里的载荷见 format/scene-doc.ts（M3 前仍是三角汤）。 */
export interface MeshBody { readonly kind: "mesh"; kernel: MeshKernel; materialSlots: number[]; }
export type Body = BrepBody | MeshBody;   // card 2026-10-24 sunset（body-kind.ts 头注释）
/** 定义 = 对象层的管理单位（CatsUp 的，不是 SU 内部结构）：名字 + 一个身体 + 子实例。复合（brep + 卡片同住）靠子实例，不靠多身体。 */
export interface Definition {
  readonly id: DefId;
  readonly guid: Guid;
  name: string;
  body: Body;
  instances: Map<InstId, Instance>;
  nextInst: number;
}

/** 几何池地址 = (definition, group | null)。 */
export interface PoolRef { def: DefId; group: GroupId | null; }
export const poolKey = (p: PoolRef): string => `${p.def}/${p.group ?? "root"}`;
export const samePool = (a: PoolRef, b: PoolRef): boolean => a.def === b.def && a.group === b.group;

/** 编辑上下文：从根 definition 进了哪些实例（链）+ 当前在哪个 group 里。运行时态，不落盘、不进 op。 */
export interface EditContext { chain: readonly InstId[]; group: GroupId | null; }
export const ROOT_CONTEXT: EditContext = { chain: [], group: null };

export class Scene {
  /** 网格体的「对称」属性（镜像编辑 / 强行对称 + 镜像面；UX 心智模型 §2.1 物体窗口的字段；文件 CATSUP_mesh 1.2 `mirror`）：按定义 id 记。编辑方式那一层。
   *  **2026-11-09 起进撤销**（计划书 20261109-audit-fixes-plan §3 第 7 条，user 没回「要不要」、按默认做）：只经 op `setMeshMirror` 写（骨架级），clone / cloneSkeleton 各拷一份——
   *  以前共享（0.15 账本 FM134「不进撤销」），撤销后模型回来了、强行对称还开着，下一步又改。定义转成硬表面体 / 删掉后留下的旧条目无害（读的人按 kindOf 筛）。 */
  readonly meshMirrors: Map<DefId, MirrorSetting> = new Map();
  readonly defs = new Map<DefId, Definition>();
  readonly root: DefId;
  /** 文档材质表（下标 = 运行时句柄，别跨撤销 / 清理攥着；要记住一个材质就记 guid 或对象）。 */
  readonly materials: Material[] = [];
  /** 绘图轴（0.11 尺规纪元）：根上下文的轴，世界坐标；轴工具可搬 / 转，默认 = 世界帧。进 CATSUP_document.axes。 */
  axes: Frame = WORLD_FRAME;
  /** 层表（0.14 契约 §4）：id 0 永远是默认层；进 CATSUP_document.layers。 */
  layers: LayerDoc[] = defaultLayers();
  nextLayer = 1;
  /** 贴图表（CATSUP_textures；2026-11-10 贴图主线 1-0½）：GUID → 一行。条目不可变（改 = 换一个对象）；撤销的快照浅拷这张表。只经 addTexture 加、只经 op purgeTextures 删。 */
  readonly textures: Map<Guid, TextureDoc> = new Map();
  /** 文件里的贴图表是更新版写的（major 比本版新）：本版读不出里面有什么、原字节存盘带回。不是 null = 不许加贴图、不许清理（存盘时新加的会和带回的那张表打架）。 */
  texturesFrozen: Stamp | null = null;
  /** 素材架（CATSUP_shelf；计划书 §2.8 / §15）。条目只存引用（GUID）；架上的算活着（resources.ts liveDefs）。 */
  shelf: ShelfDoc = emptyShelf();
  /** 文件里的素材架是更新版写的（major 比本版新，计划书 §15.1-D）：本版读不出里面有什么（上面的 shelf 是空的）、原字节存盘带回。不是 null = 架子不能改、清理不做（看不见架上收着谁，清理会删到）。 */
  shelfFrozen: Stamp | null = null;
  private nextDef = 1;

  constructor(rootKernel?: Kernel, rootGuid?: Guid) {
    this.root = this.mintDef("model", rootKernel ?? new Kernel(), rootGuid).id;
  }

  // ---------- 铸造 ----------
  mintDef(name: string, kernel: Kernel, guid: Guid = mintGuid()): Definition {
    const d: Definition = { id: this.nextDef++, guid, name, body: { kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: [], guides: emptyGuides() }, instances: new Map(), nextInst: 1 };
    this.defs.set(d.id, d);
    return d;
  }
  mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame, guid: Guid = mintGuid()): Group {
    const d = this.brep(defId);
    const g: Group = { id: d.nextGroup++, guid, parent, axes, kernel, guides: emptyGuides() };
    d.groups.set(g.id, g);
    return g;
  }
  /** 定义里全部顶点（本定义坐标 → 再经 m）：根池 + 各组 + 各实例（递归、经实例变换）。建组件 / 建组时算包围盒和原点用（2026-10-26 嵌套）。 */
  pointsOfDef(defId: DefId, m: Xform = IDENTITY, depth = 0): Pt3[] {
    if (depth > 32) return [];
    const d = this.def(defId), out: Pt3[] = [];
    if (d.body.kind === "brep") { for (const k of [d.body.kernel, ...[...d.body.groups.values()].map((g) => g.kernel)]) for (const v of k.vertices()) out.push(applyPt(m, v)); }
    else { const mk = d.body.kernel; for (const v of mk.verts()) out.push(applyPt(m, mk.pt(v))); }
    for (const i of d.instances.values()) out.push(...this.pointsOfDef(i.def, compose(m, i.xform), depth + 1));
    return out;
  }
  /** 空定义（导入的空节点，T11）：brep、没顶点、没组、没实例——编辑器画小三轴代替几何（看得见、点得中）。 */
  isBare(defId: DefId): boolean {
    const d = this.defs.get(defId);
    if (!d || d.body.kind !== "brep") return false;
    return d.body.kernel.graph.vertexCount() === 0 && d.body.groups.size === 0 && d.instances.size === 0;
  }
  mintInstance(defId: DefId, parent: GroupId | null, target: DefId, xform: Xform, guid: Guid = mintGuid()): Instance {
    const d = this.def(defId);
    const inst: Instance = { id: d.nextInst++, guid, def: target, parent, xform };
    d.instances.set(inst.id, inst);
    return inst;
  }

  /** 材质在某 definition 里的槽号（没有就开一个）。 */
  slotFor(defId: DefId, material: number): number {
    const d = this.brep(defId);
    const i = d.materialSlots.indexOf(material);
    if (i >= 0) return i;
    d.materialSlots.push(material);
    return d.materialSlots.length - 1;
  }
  /** 槽号 → 材质（无 / 越界 = null）。 */
  materialOfSlot(defId: DefId, slot: number | undefined): Material | null {
    if (slot === undefined) return null;
    const idx = this.def(defId).body.materialSlots[slot];   // 两种身体都有槽表
    if (idx === BUILTIN_BACK_SLOT) return BUILTIN_BACK;
    return idx === undefined ? null : (this.materials[idx] ?? null);
  }
  addMaterial(m: Omit<Material, "guid"> & { readonly guid?: Guid }): number { this.materials.push({ ...m, guid: m.guid ?? mintGuid() }); return this.materials.length - 1; }
  /** 贴图表加一行（同一个 GUID = 换掉那一行：粘贴「更新」走这里）。 */
  addTexture(t: TextureDoc): void { this.textures.set(t.guid, t); }
  /** 「这个材质用哪张图」（那个口；全仓问这个，不读材质里的字段）：颜色那一槽的第一张、而且是带尺寸的原图；不是 = null（按底色画）。查表，每张面都会问。 */
  colorMapOf(m: Material): ColorMap | null { return colorMapIn(this.textures, m); }

  // ---------- 查 ----------
  def(id: DefId): Definition {
    const d = this.defs.get(id);
    if (!d) throw new Error(`definition ${id} does not exist`);
    return d;
  }
  group(ref: { def: DefId; group: GroupId }): Group {
    const g = this.brep(ref.def).groups.get(ref.group);
    if (!g) throw new Error(`group ${ref.group} does not exist in definition ${ref.def}`);
    return g;
  }
  instance(defId: DefId, id: InstId): Instance {
    const inst = this.def(defId).instances.get(id);
    if (!inst) throw new Error(`instance ${id} does not exist in definition ${defId}`);
    return inst;
  }
  /** 按身份找定义（线性：定义是几百量级；批量的在调用方建表）。 */
  defByGuid(g: Guid): Definition | undefined { for (const d of this.defs.values()) if (d.guid === g) return d; return undefined; }
  /** 按身份找材质的下标（−1 = 没有）。 */
  materialByGuid(g: Guid): number { return this.materials.findIndex((m) => m.guid === g); }
  /** definition 身体的种类（门 1：op / 渲染 / 格式按它派发）。 */
  kindOf(def: DefId): BodyKind { return this.def(def).body.kind; }
  /** definition 的 brep 身体（不是 brep → 抛：内核 op / 分组 / 参考几何只对 brep 成立）。 */
  brep(id: DefId): BrepBody {
    const d = this.def(id);
    if (d.body.kind !== "brep") throw new Error(`definition ${id} body is "${d.body.kind}", not brep`);
    return d.body;
  }
  kernelOf(p: PoolRef): Kernel { return p.group === null ? this.brep(p.def).kernel : this.group({ def: p.def, group: p.group }).kernel; }
  /** definition 的 mesh 身体（不是 mesh → 抛）。 */
  mesh(id: DefId): MeshBody {
    const d = this.def(id);
    if (d.body.kind !== "mesh") throw new Error(`definition ${id} body is "${d.body.kind}", not mesh`);
    return d.body;
  }
  /** 池的显示视图（渲染 / 拾取 / 吸附读的那份契约 kernel-view.ts）：brep 池 = 内核本身；mesh 池 = 它的派生视图。场景层只经这里认内核。 */
  viewOf(p: PoolRef): KernelView { return this.kindOf(p.def) === "mesh" ? meshViewOf(this.mesh(p.def).kernel) : this.kernelOf(p); }
  /** 池锁着吗（A27）：group 自己或任何祖先 group 锁着；根池永不锁（锁的是对象，不是定义）。 */
  poolLocked(p: PoolRef): boolean {
    if (p.group === null) return false;
    const b = this.brep(p.def);
    let g: GroupId | null = p.group, guard = 64;
    while (g !== null && guard-- > 0) { const G = b.groups.get(g); if (!G) return false; g = G.parent; }   // 组不是物体、没有锁（0.14）；池锁只来自实例
    return false;
  }
  /** 子项锁着吗（自己或祖先 group）。 */
  pickLocked(def: DefId, pick: { kind: "group"; group: GroupId } | { kind: "instance"; instance: InstId }): boolean {
    if (pick.kind === "group") return this.poolLocked({ def, group: pick.group });
    const inst = this.def(def).instances.get(pick.instance);
    return !!inst && (!!inst.locked || (inst.parent !== null && this.poolLocked({ def, group: inst.parent })));
  }
  hasPool(p: PoolRef): boolean { const d = this.defs.get(p.def); return !!d && (p.group === null || (d.body.kind === "brep" && d.body.groups.has(p.group))); }

  /** 上下文的 definition（链末实例的定义；空链 = 根）。 */
  defOfContext(ctx: EditContext): DefId {
    let def = this.root;
    for (const iid of ctx.chain) def = this.instance(def, iid).def;
    return def;
  }
  poolOfContext(ctx: EditContext): PoolRef { return { def: this.defOfContext(ctx), group: ctx.group }; }
  /** 池的参考几何（可变引用；池本地坐标）。 */
  /** 池的参考几何（只有 SU 体有；网格体 = 空——合成视图 / 编辑器对任何种类的活动池都能问）。 */
  guidesOf(ref: PoolRef): Guides { const b = this.def(ref.def).body; return b.kind !== "brep" ? NO_GUIDES : ref.group !== null ? this.group({ def: ref.def, group: ref.group }).guides : b.guides; }
  /**
   * 上下文的坐标架（世界坐标）= 推断引擎的「纸的边」（0.11 尺规纪元 ①；DT86 叫「坐标架」）：根 = 绘图轴；进了 group = 那个 group 的坐标架；
   * 进了组件实例 = 那个 definition 的坐标架（没摆过 = 组件原点）——都乘上链上的实例变换。
   */
  frameOfContext(ctx: EditContext): Frame {
    const m = this.xformOfContext(ctx);
    if (ctx.group !== null) return transformFrame(m, this.group({ def: this.defOfContext(ctx), group: ctx.group }).axes);
    if (!ctx.chain.length) return this.axes;
    const body = this.def(this.defOfContext(ctx)).body;
    return transformFrame(m, (body.kind === "brep" ? body.drawFrame : undefined) ?? WORLD_FRAME);
  }
  /** 一串实例链最里面那个组件的原点（世界坐标；= 它的定义坐标系经链上变换）。根 = 世界帧。 */
  originOfChain(chain: readonly InstId[]): Frame { return transformFrame(this.xformOfContext({ chain, group: null }), WORLD_FRAME); }
  /** 上下文的世界变换（链上实例变换的乘积；group 不带变换）。 */
  xformOfContext(ctx: EditContext): Xform {
    let def = this.root, m: Xform = IDENTITY;
    for (const iid of ctx.chain) { const inst = this.instance(def, iid); m = compose(m, inst.xform); def = inst.def; }
    return m;
  }
  /** group 的子 group / 子实例（同一 definition 内，按 parent 链）。 */
  childGroups(defId: DefId, parent: GroupId | null): Group[] { const b = this.def(defId).body; return b.kind === "brep" ? [...b.groups.values()].filter((g) => g.parent === parent) : []; }   // 网格体没有组
  childInstances(defId: DefId, parent: GroupId | null): Instance[] { return [...this.def(defId).instances.values()].filter((i) => i.parent === parent); }
  /** definition 是否（直接或间接）引用 target——防循环引用。 */
  references(defId: DefId, target: DefId, seen = new Set<DefId>()): boolean {
    if (defId === target) return true;
    if (seen.has(defId)) return false;
    seen.add(defId);
    for (const inst of this.def(defId).instances.values()) if (this.references(inst.def, target, seen)) return true;
    return false;
  }
  /** 某 definition 的实例总数（跨所有 definition）。 */
  instanceCount(target: DefId): number {
    let n = 0;
    for (const d of this.defs.values()) for (const inst of d.instances.values()) if (inst.def === target) n++;
    return n;
  }

  /** 全场景的「池 + 世界变换」展开（渲染 / 拾取 / 吸附的输入；嵌套实例递归；深度上限防循环）。 */
  *pools(ctx: EditContext = ROOT_CONTEXT, opts?: { into?: EditContext }): Generator<{ pool: PoolRef; xform: Xform; chain: readonly InstId[]; depth: number }> {
    const walk = function* (this: Scene, def: DefId, chain: readonly InstId[], xform: Xform, depth: number): Generator<{ pool: PoolRef; xform: Xform; chain: readonly InstId[]; depth: number }> {
      if (depth > 32) return;
      const d = this.def(def);
      yield { pool: { def, group: null }, xform, chain, depth };
      if (d.body.kind === "brep") for (const g of d.body.groups.values()) yield { pool: { def, group: g.id }, xform, chain, depth };
      for (const inst of d.instances.values()) yield* walk.call(this, inst.def, [...chain, inst.id], compose(xform, inst.xform), depth + 1);
    };
    void ctx; void opts;
    yield* walk.call(this, this.root, [], IDENTITY, 0);
  }

  /** 骨架拷贝（撤销的 skeleton 记录；history.ts）：定义 / 组的元数据 / 实例 / 材质 / 层 / 轴 / 参考几何都拷，**内核共享**（不拷几何）。O(定义 + 实例 + 组)。 */
  cloneSkeleton(): Scene {
    const s = Object.create(Scene.prototype) as Scene;
    (s as { defs: Map<DefId, Definition> }).defs = new Map();
    (s as { root: DefId }).root = this.root;
    (s as unknown as { nextDef: number }).nextDef = this.nextDef;
    (s as { meshMirrors: Map<DefId, MirrorSetting> }).meshMirrors = new Map(this.meshMirrors);   // 拷一份（2026-11-09 起进撤销：op setMeshMirror；设置对象本身不可变，浅拷就够）
    (s as { materials: Material[] }).materials = [...this.materials];
    (s as { textures: Map<Guid, TextureDoc> }).textures = new Map(this.textures); s.texturesFrozen = this.texturesFrozen;   // 贴图条目不可变，浅拷安全
    s.axes = { origin: { ...this.axes.origin }, x: { ...this.axes.x }, y: { ...this.axes.y }, z: { ...this.axes.z } };
    s.layers = this.layers.map((l) => ({ ...l })); s.nextLayer = this.nextLayer; s.shelf = { folders: this.shelf.folders.map((f) => ({ ...f })), items: this.shelf.items.map((it) => ({ ...it })), extra: this.shelf.extra }; s.shelfFrozen = this.shelfFrozen;
    for (const [id, d] of this.defs) {
      let body: Body;
      if (d.body.kind === "brep") {
        const groups = new Map<GroupId, Group>();
        for (const [gid, g] of d.body.groups) groups.set(gid, { id: g.id, guid: g.guid, parent: g.parent, axes: g.axes, kernel: g.kernel, guides: cloneGuides(g.guides), ...(g.name !== undefined ? { name: g.name } : {}) });
        body = { kind: "brep", kernel: d.body.kernel, groups, nextGroup: d.body.nextGroup, materialSlots: [...d.body.materialSlots], guides: cloneGuides(d.body.guides), ...(d.body.drawFrame ? { drawFrame: d.body.drawFrame } : {}) };
      } else body = { kind: "mesh", kernel: d.body.kernel, materialSlots: [...d.body.materialSlots] };
      const instances = new Map<InstId, Instance>();
      for (const [iid, i] of d.instances) instances.set(iid, { ...i });
      s.defs.set(id, { id: d.id, guid: d.guid, name: d.name, body, instances, nextInst: d.nextInst });
    }
    return s;
  }
  /** 预演的影子场景（计划书 §12 C1）：骨架拷贝 + 这个池的内核换成给的影子。槽表是拷的（预演开槽不碰真身），别的池和真身共享（op 改不到外面 = op-locks.ts previewableIn 守）。 */
  shadowOf(ref: PoolRef, shadow: Kernel | MeshKernel): Scene {
    const s = this.cloneSkeleton(), b = s.def(ref.def).body;
    if (b.kind === "mesh") b.kernel = shadow as MeshKernel;
    else if (ref.group === null) b.kernel = shadow as Kernel;
    else s.group({ def: ref.def, group: ref.group }).kernel = shadow as Kernel;
    return s;
  }
  // ---------- 深拷贝 ----------
  clone(): Scene {
    const s = Object.create(Scene.prototype) as Scene;
    (s as { defs: Map<DefId, Definition> }).defs = new Map();
    (s as { root: DefId }).root = this.root;
    (s as unknown as { nextDef: number }).nextDef = this.nextDef;
    (s as { meshMirrors: Map<DefId, MirrorSetting> }).meshMirrors = new Map(this.meshMirrors);   // 拷一份（2026-11-09 起进撤销：op setMeshMirror；设置对象本身不可变，浅拷就够）
    (s as { materials: Material[] }).materials = [...this.materials];   // 材质对象不可变，浅拷安全
    (s as { textures: Map<Guid, TextureDoc> }).textures = new Map(this.textures); s.texturesFrozen = this.texturesFrozen;
    s.axes = { origin: { ...this.axes.origin }, x: { ...this.axes.x }, y: { ...this.axes.y }, z: { ...this.axes.z } };
    s.layers = this.layers.map((l) => ({ ...l })); s.nextLayer = this.nextLayer; s.shelf = { folders: this.shelf.folders.map((f) => ({ ...f })), items: this.shelf.items.map((it) => ({ ...it })), extra: this.shelf.extra }; s.shelfFrozen = this.shelfFrozen;
    for (const [id, d] of this.defs) {
      let body: Body;
      if (d.body.kind === "brep") {
        const groups = new Map<GroupId, Group>();
        for (const [gid, g] of d.body.groups) groups.set(gid, { id: g.id, guid: g.guid, parent: g.parent, axes: g.axes, kernel: g.kernel.clone(), guides: cloneGuides(g.guides), ...(g.name !== undefined ? { name: g.name } : {}) });
        body = { kind: "brep", kernel: d.body.kernel.clone(), groups, nextGroup: d.body.nextGroup, materialSlots: [...d.body.materialSlots], guides: cloneGuides(d.body.guides), ...(d.body.drawFrame ? { drawFrame: d.body.drawFrame } : {}) };   // Frame 按不可变对待
      } else body = { kind: "mesh", kernel: d.body.kernel.clone(), materialSlots: [...d.body.materialSlots] };   // mesh 内核深拷（列式 = 几次 slice）
      const instances = new Map<InstId, Instance>();
      for (const [iid, i] of d.instances) instances.set(iid, { id: i.id, guid: i.guid, def: i.def, parent: i.parent, xform: i.xform, ...(i.name !== undefined ? { name: i.name } : {}), ...(i.locked ? { locked: true } : {}), ...(i.layer !== undefined ? { layer: i.layer } : {}), ...(i.hidden ? { hidden: true } : {}) });
      s.defs.set(id, { id: d.id, guid: d.guid, name: d.name, body, instances, nextInst: d.nextInst });
    }
    return s;
  }
}

// ---------------- 几何搬家（建组 / 建组件 / 炸开的底层） ----------------

/** 从池里抠出一份子快照：选中的膜（含其环边）+ 选中的边（含端点）。索引 = 本地顺序。 */
export function extractSnapshot(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[]): BrepSnapshot {
  const vIdx = new Map<number, number>();
  const vertices: Pt3[] = [];
  const vid = (id: number): number => {
    let i = vIdx.get(id);
    if (i === undefined) { i = vertices.length; vIdx.set(id, i); vertices.push(k.graph.pt(id)); }
    return i;
  };
  const edgeSet = new Set<EdgeId>(edges);
  const planeIdx = new Map<number, number>();
  const planes: { n: Pt3; d: number }[] = [];
  const outFaces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  const faceIds: FaceId[] = [];
  for (const fid of faces) {
    const f = k.face(fid);
    const rec = k.planeOf(fid);
    if (!f || !rec) continue;
    let pi = planeIdx.get(f.planeId);
    if (pi === undefined) { pi = planes.length; planeIdx.set(f.planeId, pi); planes.push(rec.plane); }
    const ring = (r: { edges: { edge: EdgeId; forward: boolean }[] }): number[] => r.edges.map((d) => { edgeSet.add(d.edge); const e = k.graph.edge(d.edge); return vid(d.forward ? e.a : e.b); });
    outFaces.push({ plane: pi, outer: ring(f.outer), holes: f.holes.map(ring) });
    faceIds.push(fid);
  }
  const outEdges: [number, number][] = [];
  const edgeIds: EdgeId[] = [];
  for (const eid of edgeSet) {
    if (!k.graph.hasEdge(eid)) continue;
    const e = k.graph.edge(eid);
    edgeIds.push(eid);
    outEdges.push([vid(e.a), vid(e.b)]);
  }
  const edgeLayers = k.edgeLayers.toIndex(edgeIds), faceLayers = k.faceLayers.toIndex(faceIds);
  // 曲线随行（DT15，2026-10-25 Opus：此前漏了 → 圆柱做成组 / 组件后圆退化成一串普通边、圆心丢了，user「选不到轮子的圆心」）：
  // 只带**整条**都在快照里的曲线；只抽到一部分的照旧退成普通边（半条「闭合圆」读回会被 fromBrep 校验拒绝）。
  const eIdx = new Map<EdgeId, number>(edgeIds.map((e, i) => [e, i]));
  const curves = [...k.curves()].sort((a, b) => a.id - b.id).filter((c) => c.edges.length && c.edges.every((e) => eIdx.has(e)))
    .map((c) => ({ edges: c.edges.map((e) => eIdx.get(e)!), kind: c.kind, closed: c.closed, ...(c.params ? { params: { ...c.params } } : {}) }));
  return { coplanarTol: k.coplanarTol, vertices, edges: outEdges, planes, faces: outFaces, ...(edgeLayers ? { edgeLayers } : {}), ...(faceLayers ? { faceLayers } : {}), ...(curves.length ? { curves } : {}) };
}

/** 曲线参数随变换（圆心 / 方向 / 半径）；非相似变换（两个方向缩放不同）→ undefined = 作废成 polyline。 */
function transformCurveParams(params: CurveParams, m: Xform): CurveParams | undefined {
  const c0 = applyPt(m, params.center);
  const dir = (d: Pt3): Pt3 => normalize3(sub3(applyPt(m, add3(params.center, d)), c0));
  const yax = normalize3(cross3(params.normal, params.xaxis));
  const rx = dist3(applyPt(m, add3(params.center, scale3(normalize3(params.xaxis), params.radius))), c0), ry = dist3(applyPt(m, add3(params.center, scale3(yax, params.radius))), c0);
  if (Math.abs(rx - ry) > 1e-6 * Math.max(rx, ry, 1e-9) || rx < 1e-9) return undefined;
  return { center: c0, radius: rx, normal: dir(params.normal), xaxis: dir(params.xaxis), segments: params.segments };
}

/**
 * 快照整体变换（坐标 + 平面），输出仍是合法快照（Kernel.fromBrep 能装）：平面重新规范化；规范法向和变换后的法向（逆转置）反了 → 这张平面上的面
 * 两个表面互换（面的「侧」跟着法向走：p 在 n 那侧 ⇔ M p 在 M⁻ᵀn 那侧）；外环按规范法向重新排成逆时针（镜像 / 规范法向翻了都会把绕向弄反）。
 * 2026-10-26 Claude Opus 5.5（DT8 两个表面）：以前只换坐标和平面、环不动——转过的组复制一份就「outer ring is not CCW」装不进去（旋转复制组、转着阵列组都会炸）。
 */
export function transformSnapshot(snap: BrepSnapshot, m: Xform): BrepSnapshot {
  const curves = snap.curves?.map((c) => { const p = c.params ? transformCurveParams(c.params, m) : undefined; return { edges: c.edges, kind: c.params && !p ? "polyline" as const : c.kind, closed: c.closed, ...(p ? { params: p } : {}) }; });
  const flipped: boolean[] = [];
  const planes = snap.planes.map((pl) => {
    const n = normalize3(applyNormal(m, pl.n)), c = applyPlane(m, pl);
    flipped.push(n.x * c.n.x + n.y * c.n.y + n.z * c.n.z < 0);
    return c;
  });
  const mirror = det3(m) < 0;
  const faces = snap.faces.map((f) => ((mirror !== flipped[f.plane]) ? { plane: f.plane, outer: [...f.outer].reverse(), holes: f.holes.map((h) => [...h].reverse()) } : f));
  let faceLayers = snap.faceLayers;
  if (faceLayers && (faceLayers.material || faceLayers.materialBack) && flipped.some(Boolean)) {
    const fr = faceLayers.material, bk = faceLayers.materialBack, F = snap.faces.length;
    const nf: number[] = [], nb: number[] = [];
    for (let i = 0; i < F; i++) { const sw = flipped[snap.faces[i].plane]; const a = fr?.[i] ?? -1, b = bk?.[i] ?? -1; nf.push(sw ? b : a); nb.push(sw ? a : b); }
    faceLayers = { ...faceLayers, material: nf, materialBack: nb };
  }
  return { coplanarTol: snap.coplanarTol, vertices: snap.vertices.map((p) => applyPt(m, p)), edges: snap.edges, planes, faces, ...(snap.edgeLayers ? { edgeLayers: snap.edgeLayers } : {}), ...(faceLayers ? { faceLayers } : {}), ...(curves ? { curves } : {}) };
}

/** 把一份快照（经变换）并进池：膜当像（OR、新 id）、裸边当线段，走结算机（sticky）。炸开 / 粘贴用。
 *  materialMap：快照的槽号 → 目标池 definition 的槽号（跨 definition 搬家时重映射；缺省恒等）。
 *  有变换时先过 transformSnapshot（环的绕向、两个表面跟着法向走，DT8）——镜像炸开 / 镜像指令的那一份颜色在对的一侧。 */
export function absorbSnapshot(k: Kernel, snap0: BrepSnapshot, m: Xform = IDENTITY, materialMap?: (slot: number) => number): FaceEvent[] {
  const snap = m === IDENTITY ? snap0 : transformSnapshot(snap0, m);
  const P = snap.vertices;
  const faces = snap.faces.map((f) => [f.outer.map((i) => P[i]), ...f.holes.map((h) => h.map((i) => P[i]))]);
  const inFace = new Set<string>();
  for (const f of snap.faces) for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; inFace.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
  const wires = snap.edges.filter(([a, b]) => !inFace.has(a < b ? `${a}-${b}` : `${b}-${a}`)).map(([a, b]) => ({ a: P[a], b: P[b] }));
  // 曲线随行（0.10）：边链按变换后的点给线段；参数在 transformSnapshot 里已换（非相似 → 作废成 polyline）
  const curves = (snap.curves ?? []).map((c) => {
    const segs = c.edges.map((i) => ({ a: P[snap.edges[i][0]], b: P[snap.edges[i][1]] }));
    return { segs, spec: { kind: c.kind, closed: c.closed, ...(c.params ? { params: c.params } : {}) } };
  });
  return k.absorb(faces, wires, { ...snapshotLayerPayload(snap, P, materialMap), curves });
}

/** 快照的属性层 → absorb 载荷（边层按线段、面层按每面值；material 可重映射）。 */
export function snapshotLayerPayload(snap: BrepSnapshot, P: readonly Pt3[], materialMap?: (slot: number) => number): { edgeSegs: Record<string, Seg3[]>; faceLayers: (Record<string, number> | undefined)[] } {
  const edgeSegs: Record<string, Seg3[]> = {};
  for (const [n, idx] of Object.entries(snap.edgeLayers ?? {})) edgeSegs[n] = idx.map((i) => ({ a: P[snap.edges[i][0]], b: P[snap.edges[i][1]] }));
  const faceLayers = snap.faces.map((_, i) => {
    const vals: Record<string, number> = {};
    for (const [n, arr] of Object.entries(snap.faceLayers ?? {})) { let v = arr[i] ?? -1; if (v >= 0 && (n === "material" || n === "materialBack") && materialMap) v = materialMap(v); if (v >= 0) vals[n] = v; }
    return Object.keys(vals).length ? vals : undefined;
  });
  return { edgeSegs, faceLayers };
}
/** 快照里 material 面层按映射改写（跨 definition 搬家）。 */
export function remapSnapshotMaterial(snap: BrepSnapshot, remap: (slot: number) => number): BrepSnapshot {
  const fl = snap.faceLayers;
  if (!fl?.material && !fl?.materialBack) return snap;
  const out: Record<string, readonly number[]> = { ...fl };
  for (const n of ["material", "materialBack"] as const) { const arr = fl[n]; if (arr) out[n] = arr.map((v) => (v >= 0 ? remap(v) : -1)); }   // 两个表面都搬（DT8）
  return { ...snap, faceLayers: out };
}

/** 轴框默认：选区包围盒的最小角（SU 把组件轴放在包围盒角）。 */
export function bboxMin(pts: readonly Pt3[]): Pt3 {
  let x = Infinity, y = Infinity, z = Infinity;
  for (const p of pts) { x = Math.min(x, p.x); y = Math.min(y, p.y); z = Math.min(z, p.z); }
  return pts.length ? { x, y, z } : { x: 0, y: 0, z: 0 };
}
export function poolBounds(k: KernelView, m: Xform = IDENTITY): { min: Pt3; max: Pt3 } | null {
  let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const v of k.vertices()) {
    const p = applyPt(m, v);
    min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y), z: Math.min(min.z, p.z) };
    max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y), z: Math.max(max.z, p.z) };
  }
  return Number.isFinite(min.x) ? { min, max } : null;
}
export { WORLD_FRAME, frameAt, transformFrame };
