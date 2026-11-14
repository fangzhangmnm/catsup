// stream-provider.ts —— 编辑器 = 「恰好全在手」的流提供者（Minccino 契约 `StreamProvider`；骨架稿 v2 不变量 2：引擎拉、提供者吐）。
// Tron 第一刀步 3（v0.17.3，Claude Fable 5.1）：render3 原来「每池一份池网格 + 每槽一个矩阵 + 变了的池重提取 + 只传改过的段」那一段里
// **内容那半**（池网格本体 pool-mesh、同一帧同一内核只同步一次、两代没人用的释放、材质槽签名）搬到这里，render3 只剩「块 → 显卡 → 槽节点」。
// 画面一个像素不变：块直接包池网格的大数组（零拷贝）、属性名 / 颜色烤法原样；颜色按调色板在这里算（刀 c 起不再问后端 = 反向依赖退役），粗线 / 像素线由编辑器告知——
// 那是样式，过渡期还烤在顶点色里，材质模块 / 叠加层落地后从这里退役。
import { faceMaterial } from "../mesh/reserved-columns.ts";
import type { Chunk, ChunkAttr, LiveImage, MaterialRef, Placement, StreamFrame, StreamProvider, StreamQuery, TextureRef, Vec3 } from "../minccino/index.ts";
import { PALETTE, hexToLinear } from "../minccino/index.ts";
import { PoolMesh, type PoolMeshEnv } from "./pool-mesh.ts";
import { type WorldView, type PoolSlot, slotKey } from "../scene/world-view.ts";
import { poolKey, type Material, type Scene } from "../scene/scene.ts";
import { paintIn, type ColorMap } from "../format/document.ts";
import { BUILTIN_BACK, BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import type { KernelView } from "../scene/kernel-view.ts";
import { perf } from "./perf-stats.ts";
import type { MarkLayout } from "./highlight.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { uvAt } from "../scene/uv.ts";
import { REACH } from "./reach-table.ts";   // 这一层画不画编辑用的线 = 表的 editLines 行（层级显示施工单二½）

const srgb = (hex: number): readonly [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
/** 烤进顶点的颜色（= 以前后端 chunkStyle 给的同一套数：面 sRGB 浮点、线线性）。 */
const FACE_SRGB = srgb(PALETTE.face), BACK_SRGB = srgb(PALETTE.faceBack), NO_SIDE: readonly [number, number, number] = [-1, -1, -1], EDGE_FACE = hexToLinear(PALETTE.edge), EDGE_WIRE = hexToLinear(PALETTE.edgeWire), EDGE_SEAM = hexToLinear(PALETTE.edgeAccent);   // 接缝 = 标记线那个颜色

/**
 * 画板登记处在编辑器这边看到的样子（贴图主线 1-3c；实现 = src/paint/boards.ts，编辑器不认识画画内核）。只读：改大小、合成都在每帧开画之前的「准备」里（1-4b 统筹 B）。
 * board = 这张贴图的画板（实际宽高 + 活的图）；sig = 有哪些画板、多大（变了 = 用到画的池整份重建）。
 */
export interface PaintImages {
  board(texture: string): { readonly width: number; readonly height: number; readonly image: LiveImage | TextureRef } | null;
  sig(): string;
}

/** 一份池网格 = 一个「身体」：同一个池通常一份；同一帧要画两个不同内核（预演影子 + 原件）就多开一份。 */
interface Body { readonly id: string; readonly mesh: PoolMesh; gen: number; faces: Map<string, Chunk>; lines: Chunk | null; }

export class EditorStreamProvider implements StreamProvider {
  private world: WorldView | null = null;
  private revision = 0;
  private bodies = new Map<string, Body[]>();
  private gen = 0;
  private nextBody = 1;
  /** 块版本：全局单调（一个块被删了又长出来也不会撞上后端留着的旧版本）。 */
  private seq = 0;
  /** 材质对象 → 小整数（材质槽签名用：槽表只追加 = 池网格增量；别的变化 = 全量）。 */
  private matUids = new WeakMap<object, number>(); private nextMatUid = 1;
  /** 交给渲染器的材质引用（契约 MaterialRef）：同一个材质、同一张图 = 同一个对象（渲染器按对象缓存着色器）；图换了 = 新对象。 */
  private readonly refs = new WeakMap<Material, { readonly map: ColorMap | null; readonly ref: MaterialRef }>();
  /** 一张图 = 一个 TextureRef（渲染器按它解码一次：两个材质用同一张图只解一次）。 */
  private readonly texRefs = new WeakMap<ColorMap, TextureRef>();
  private refOf(m: Material, scene: Scene): MaterialRef {
    // 平铺的画（施工单二十一第 3 刀）：画板现在的图（热的 = 活的图、冷的 = 合成图；都带平铺标记）+ 白（底色已经合在画里）；画板没有图 = 下面按底色那条
    const ti = this.tiledImage(scene, m);
    if (ti) {
      const th = this.tiledRefs.get(m);
      if (th && th.image === ti) return th.ref;
      const ref: MaterialRef = { color: [1, 1, 1], map: ti };
      this.tiledRefs.set(m, { image: ti, ref });
      return ref;
    }
    const map = scene.colorMapOf(m), hit = this.refs.get(m);
    if (hit && hit.map === map) return hit.ref;
    let tr = map ? this.texRefs.get(map) : undefined;
    if (map && !tr) { tr = { mimeType: map.content.mimeType, bytes: map.content.bytes, sizeM: map.sizeM }; this.texRefs.set(map, tr); }
    const ref: MaterialRef = { color: m.color, ...(tr ? { map: tr } : {}) };
    this.refs.set(m, { map, ref });
    return ref;
  }
  /** 平铺的画那几个材质交给渲染器的引用：同一个材质 + 同一张图 = 同一个对象。 */
  private readonly tiledRefs = new WeakMap<Material, { readonly image: LiveImage | TextureRef; readonly ref: MaterialRef }>();
  /** 这个材质是平铺的画、而且画板现在有图（热的 / 冷的有合成图）→ 那张图；不是 / 没有图 = null（按底色画）。 */
  private tiledImage(scene: Scene, m: Material): LiveImage | TextureRef | null {
    const tp = m === BUILTIN_BACK ? null : scene.tiledPaintOf(m);
    return tp ? this.paint?.board(tp.textureDoc.guid)?.image ?? null : null;
  }
  /** 世界视图对象 → 小整数（内容键 / 包围球缓存：预演影子每帧是新对象 = 身份变 = 自然失效，和以前 render3 的 kernelId 同构）。 */
  private worldIds = new WeakMap<object, number>(); private nextWorldId = 1;
  /** 画板登记处（1-3c；没接 = 没有画显示）。 */
  private paint: PaintImages | null = null;
  setPaint(p: PaintImages | null): void { this.paint = p; }
  /** 画的那一组交给渲染器的材质引用：同一个材质 + 同一张活的图 = 同一个对象。 */
  private readonly paintRefs = new WeakMap<Material, { readonly image: LiveImage | TextureRef; readonly ref: MaterialRef }>();
  private paintRef(m: Material, texture: string): MaterialRef | undefined {
    const image = this.paint?.board(texture)?.image;
    if (!image) return undefined;
    const hit = this.paintRefs.get(m);
    if (hit && hit.image === image) return hit.ref;
    const ref: MaterialRef = { color: [1, 1, 1], map: image };
    this.paintRefs.set(m, { image, ref });
    return ref;
  }
  /** 上一次 pull 每个槽画的是哪份身体（标记的布局按它找块 / 段）。 */
  private slotBody = new Map<string, Body>();
  private boundsCache: { world: WorldView; rev: number; sphere: { c: Vec3; r: number } | null } | null = null;
  /** 粗线（LineSegments2 实例）还是像素线：引擎的视图设定（线稿粗细 > 1 也会切成粗线），每次 pull 问一下；换了 = 池网格全量重建（线的块形状不同）。 */
  /** styled = 正在看风格预览（线稿之外的画风）：默认背面按引擎所见不画（计划书 §9.2-E；编辑时画灰蓝 = 披露你在看背面）。 */
  private readonly thick: () => boolean;
  private readonly styled: () => boolean;
  /** 这个工作台画不画接缝（Mode.showsSeams）；演示锁里（没有正在编辑的那一层）一律不画。 */
  private readonly seamsWanted: () => boolean;
  constructor(thick: () => boolean, styled: () => boolean = () => false, seams: () => boolean = () => false) { this.thick = thick; this.styled = styled; this.seamsWanted = seams; }
  private seamsOn(): boolean { return this.editing && this.seamsWanted(); }

  /** 这一帧画哪个世界（活的那份，含预演影子）+ checkpoint 代数（内容键的一部分）。编辑器每次画之前调。淡出是标记（视图侧），不在这里。 */
  /** editing = 有「正在编辑的那一层」（演示锁里没有：活动槽也按普通槽放，结构线跟画风走；ai-docs/20261029-edge-display-scenarios.md 场景 6）。 */
  setWorld(world: WorldView, revision = 0, editing = true): void { this.world = world; this.revision = revision; this.editing = editing; }
  private editing = true;
  private worldId(w: WorldView): number { let id = this.worldIds.get(w); if (id === undefined) { id = this.nextWorldId++; this.worldIds.set(w, id); } return id; }
  /** 内容键（引擎契约）：世界身份 + 版本；没变 = 引擎不重新拉（= 以前 render3 的 poolKey 那半）。 */
  contentKey(): string { return this.world ? `${this.worldId(this.world)}:${this.revision}${this.editing ? "" : ":view"}${this.seamsOn() ? ":seam" : ""}${this.paint ? `|${this.paint.sig()}` : ""}` : "none"; }   // 换工作台（画 / 不画接缝）= 内容变了
  /**
   * 内容此刻还持有的图和材质引用（引擎契约 retained，施工单十九第 1 刀规矩 2）：文档材质表里每个材质 → 交给渲染器的那个材质引用和它的图；
   * 画（颜色那一槽是分层的贴图）→ 画板现在的图（热的 = 活的图、冷的 = 合成图）和那一组材质引用。可见不可见都算。
   * 不在这里的 = 文档里没有了（撤销掉的、换掉的文件、冷热换过的旧图），渲染器放掉。按需现算：材质表的长度量级，渲染器只在内容变了时问。
   */
  retained(): { readonly images: ReadonlySet<object>; readonly materials: ReadonlySet<object> } {
    const images = new Set<object>(), materials = new Set<object>(), scene = this.world?.scene;
    if (!scene) return { images, materials };
    for (const m of [...scene.materials, BUILTIN_BACK]) {
      const ref = this.refOf(m, scene); materials.add(ref); if (ref.map) images.add(ref.map);
      const p = m === BUILTIN_BACK ? null : paintIn(scene.textures, m), pr = p ? this.paintRef(m, p.textureDoc.guid) : undefined;
      if (pr) { materials.add(pr); if (pr.map) images.add(pr.map); }
    }
    return { images, materials };
  }
  /** 场景包围球（引擎契约）：远平面 / 正交深度窗口 / 无限长线按它定（user 10-26「不应该写死特征长度」）。按世界身份 + 版本缓存。 */
  bounds(): { c: Vec3; r: number } | null {
    const w = this.world;
    if (!w) return null;
    const c = this.boundsCache;
    if (c && c.world === w && c.rev === this.revision) return c.sphere;
    const min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const v of w.vertices()) { if (v.x < min.x) min.x = v.x; if (v.y < min.y) min.y = v.y; if (v.z < min.z) min.z = v.z; if (v.x > max.x) max.x = v.x; if (v.y > max.y) max.y = v.y; if (v.z > max.z) max.z = v.z; }
    const sphere = Number.isFinite(min.x) ? { c: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }, r: Math.hypot(max.x - min.x, max.y - min.y, max.z - min.z) / 2 } : null;
    this.boundsCache = { world: w, rev: this.revision, sphere };
    return sphere;
  }

  /** 标记的布局（editor/highlight.ts MarkLayout）：某个槽里一张面在哪些块的哪一段（块 id = 身体 id / 组键，和 pull 吐的一致）。 */
  layout(): MarkLayout {
    return {
      rangeOf: (slot, fid) => { const b = this.slotBody.get(slot); return b ? b.mesh.faceRanges(fid).map((r) => ({ chunk: `${b.id}/${r.key}`, start: r.off, count: r.len })) : []; },
      edgeRangeOf: (slot, eid) => { const b = this.slotBody.get(slot), r = b?.lines ? b.mesh.edgeRange(eid) : null; return b && b.lines && r ? { chunk: b.lines.id, start: r[0], count: r[1] } : null; },
      chunksOf: (slot) => { const b = this.slotBody.get(slot); if (!b) return []; const out: { chunk: string; count: number; kind: "tris" | "lines" }[] = [...b.faces.values()].map((c) => ({ chunk: c.id, count: c.count, kind: "tris" as const })); if (b.lines) out.push({ chunk: b.lines.id, count: b.lines.count, kind: "lines" as const }); return out; },
    };
  }
  pull(_q: StreamQuery): StreamFrame {
    const world = this.world;
    if (!world) return { chunks: [], placements: [], complete: true };
    this.gen++;
    const taken = new Map<Body, KernelView>();   // 这一帧哪份池网格画的是哪个内核
    const placements: Placement[] = [], chunks: Chunk[] = [];
    const thick = this.thick();
    this.slotBody.clear();
    for (const s of world.slots) {
      const b = this.bodyFor(s, world.scene, taken, thick);
      this.slotBody.set(slotKey(s), b);
      placements.push({ pool: b.id, xform: s.xform, slot: slotKey(s), index: s.index, tier: this.editing && REACH.editLines[s.rel] === "always" ? 1 : 0, singleSided: b.mesh.singleSided });
    }
    for (const list of this.bodies.values()) for (const b of list) if (b.gen === this.gen) { for (const c of b.faces.values()) chunks.push(c); if (b.lines) chunks.push(b.lines); }
    // 两代没人用的释放（隔离看一个组件再出来 = 别的池全量重建一次，和以前一样）
    for (const [key, list] of this.bodies) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].gen < this.gen - 1) list.splice(i, 1);
      if (!list.length) this.bodies.delete(key);
    }
    return { chunks, placements, complete: true };
  }

  /** 槽 s 用哪份池网格（同步到 s 的内核）。同一帧同一个内核只同步一次。 */
  private bodyFor(s: PoolSlot, scene: Scene, taken: Map<Body, KernelView>, thick: boolean): Body {
    const key = poolKey(s.pool), k = s.kernel;
    let list = this.bodies.get(key);
    if (!list) { list = []; this.bodies.set(key, list); }
    let b = list.find((p) => taken.get(p) === k);
    if (b) return b;
    b = list.find((p) => !taken.has(p) && p.mesh.source === k) ?? list.find((p) => !taken.has(p));
    if (!b) { b = { id: `${key}#${this.nextBody++}`, mesh: new PoolMesh(), gen: 0, faces: new Map(), lines: null }; list.push(b); }
    taken.set(b, k); b.gen = this.gen;
    const B = b, env = this.env(scene, s.pool.def, thick);
    const r = perf.time("poolMesh.sync", () => B.mesh.sync(k, env));
    if (r.full) perf.count["poolMesh.full"] = (perf.count["poolMesh.full"] ?? 0) + 1;   // 全量重建了几次（探针 / 黑匣子：拖动预演里不该涨）
    this.refreshChunks(b, scene);
    return b;
  }

  private env(scene: Scene, defId: number, thick: boolean): PoolMeshEnv {
    const cullBack = !this.editing || this.styled();   // 演示锁 = 没有正在编辑的那一层
    const body = scene.def(defId).body, paintOn = !!this.paint && body.kind === "mesh";   // 有画板登记处就问每张面走不走画（施工单十八第 2 刀：只看面，不看网格体的速查表；没有画的场景 facePaint 第一行就回）
    const num = (o: object): number => { let u = this.matUids.get(o); if (u === undefined) { u = this.nextMatUid++; this.matUids.set(o, u); } return u; };
    const uid = (m: Material | undefined): string => { if (!m) return "0"; const map: object | null = m === BUILTIN_BACK ? null : scene.colorMapOf(m) ?? this.tiledImage(scene, m); return map ? `${num(m)}t${num(map)}` : `${num(m)}`; };   // 平铺的画：画板的图出现 / 换了（冷 → 热）= 签名变 = 重建（顶点色白 / 底色跟着换）   // 材质指的图换了（粘贴「更新」那张贴图）= 签名变 = 重建，块交出新的材质引用
    return {
      matOf: (slot) => scene.materialOfSlot(defId, slot),
      mapOf: (m) => { const cm = scene.colorMapOf(m); if (cm) return cm; const tp = this.tiledImage(scene, m) ? scene.tiledPaintOf(m) : null; return tp ? { sizeM: tp.sizeM } : null; },   // 平铺的画：照自由的图投影坐标（sizeM），图归 refOf
      slotsSig: (paintOn ? `P[${this.paint!.sig()}]` : "") + scene.def(defId).body.materialSlots.map((i) => uid(i === BUILTIN_BACK_SLOT ? BUILTIN_BACK : scene.materials[i])).join(","),   // 画板的签名放最前面：变了不会是「前缀 = 增量」，整份重建   // 内置默认背面也有自己的号：把一侧从默认正面改成默认背面要重画
      singleSided: scene.kindOf(defId) === "mesh",
      backLook: cullBack ? "cull" : "show",
      faceColor: (mat) => (mat === BUILTIN_BACK ? (cullBack ? NO_SIDE : BACK_SRGB) : !mat ? FACE_SRGB : scene.colorMapOf(mat) || this.tiledImage(scene, mat) ? [1, 1, 1] : [mat.color[0], mat.color[1], mat.color[2]]),   // 贴图面 = 白（贴图 × 1）；没材质 = 白模灰
      edgeColor: (loose, seam) => (seam ? EDGE_SEAM : loose ? EDGE_WIRE : EDGE_FACE),
      seams: this.seamsOn() && scene.kindOf(defId) === "mesh",   // 硬表面体没有接缝：换工作台不让它整份重建
      thick,
      ...(paintOn ? { paintOf: (k: KernelView, fid: number, m: Material) => this.paintOf(scene, defId, k, fid, m) } : {}),
    };
  }

  /**
   * 这张面显示画吗（1-3c，规矩在 PoolMeshEnv.paintOf）：走不走画只问 Scene.facePaint；角上的数从正在同步的那个内核拿（预演影子也对）；
   * 有一个角没有位置 = 这张面还没铺上 = 按底色画。
   */
  private paintOf(scene: Scene, defId: number, k: KernelView, fid: number, m: Material): { values: ArrayLike<number>; w: number; h: number; key: string } | null {
    const mk = (k as { mesh?: MeshKernel }).mesh, body = scene.def(defId).body;
    if (!mk || body.kind !== "mesh") return null;
    const fp = scene.facePaint(defId, faceMaterial(mk, fid));
    if (!fp || scene.materialOfSlot(defId, faceMaterial(mk, fid)) !== m) return null;
    const bd = this.paint?.board(fp.textureDoc.guid);
    if (!bd) return null;
    const v = uvAt(mk, body.uvSetSlots, fid, fp.uvSet.guid);   // 施工单十八第 1½ 刀：贴图坐标只经 scene/uv.ts 问（预演的影子内核 + 场景里那张速查表）
    if (!v) return null;
    for (let i = 0; i < v.length; i++) if (!Number.isFinite(v[i])) return null;
    return { values: v, w: bd.width, h: bd.height, key: fp.textureDoc.guid };
  }

  /** 池网格同步完 → 块：改过的段（takeDirty）/ 数组换过 / 组没了 = 新版本；没动 = 原块原版本。 */
  private refreshChunks(b: Body, scene: Scene): void {
    for (const key of [...b.faces.keys()]) if (!b.mesh.groups.has(key)) b.faces.delete(key);   // 全量重建后不再有的组
    for (const g of b.mesh.groups.values()) {
      const d = g.store.takeDirty(), A = g.store.arrays, prev = b.faces.get(g.key), count = g.store.end;
      // 组里一张面都没有了（面挪去别的组，区段清成 0、范围不缩）：不交块。以前照交，空的贴图组带着旧材质的引用，渲染器为它留着贴图材质和解码的图，
      // 撤销掉的图放不掉（施工单十九第 1 刀查出来的；画面上是零面积的三角形，看不见）。以后这一组又有面了 = 当新块交，整块重传（下面 grown）。
      if (g.store.count === 0) { b.faces.delete(g.key); continue; }
      if (prev && !d.grown && d.ranges.length === 0 && prev.attributes.position.array === A.position && prev.count === count) continue;
      const attributes: Record<string, ChunkAttr> = {};
      for (const sp of g.store.specs) attributes[sp.name] = { array: A[sp.name], size: sp.size, normalized: sp.type !== undefined && sp.type !== "f32" };
      b.faces.set(g.key, { id: `${b.id}/${g.key}`, pool: b.id, version: ++this.seq, kind: "tris", attributes, count, dirty: prev ? d : { grown: true, ranges: [] }, material: g.mat ? (g.key.startsWith("paint:") ? this.paintRef(g.mat, g.key.slice(6)) : this.refOf(g.mat, scene)) : undefined, side: g.side ?? undefined });
    }
    const L = b.mesh.lines, d = L.takeDirty(), A = L.arrays, instanced = L.specs.some((sp) => sp.name === "seg");
    const first = instanced ? "seg" : "position", count = instanced ? L.count : L.end, prev = b.lines;
    if (prev && !d.grown && d.ranges.length === 0 && !!prev.instanced === instanced && prev.attributes[first]?.array === A[first] && prev.count === count) return;
    const attributes: Record<string, ChunkAttr> = {};
    for (const sp of L.specs) attributes[sp.name] = { array: A[sp.name], size: sp.size, normalized: sp.type !== undefined && sp.type !== "f32" };
    b.lines = { id: `${b.id}/lines`, pool: b.id, version: ++this.seq, kind: "lines", attributes, count, instanced, dirty: d };
  }
}
