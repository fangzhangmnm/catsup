// stream-provider.ts —— 编辑器 = 「恰好全在手」的流提供者（Minccino 契约 `StreamProvider`；骨架稿 v2 不变量 2：引擎拉、提供者吐）。
// Tron 第一刀步 3（v0.17.3，Claude Fable 5.1）：render3 原来「每池一份池网格 + 每槽一个矩阵 + 变了的池重提取 + 只传改过的段」那一段里
// **内容那半**（池网格本体 pool-mesh、同一帧同一内核只同步一次、两代没人用的释放、材质槽签名）搬到这里，render3 只剩「块 → 显卡 → 槽节点」。
// 画面一个像素不变：块直接包池网格的大数组（零拷贝）、属性名 / 颜色烤法原样；颜色按调色板在这里算（刀 c 起不再问后端 = 反向依赖退役），粗线 / 像素线由编辑器告知——
// 那是样式，过渡期还烤在顶点色里，材质模块 / 叠加层落地后从这里退役。
import type { Chunk, ChunkAttr, Placement, StreamFrame, StreamProvider, StreamQuery, Vec3 } from "../minccino/index.ts";
import { PALETTE, hexToLinear } from "../minccino/index.ts";
import { PoolMesh, type PoolMeshEnv } from "./pool-mesh.ts";
import { type WorldView, type PoolSlot, slotKey } from "../scene/world-view.ts";
import { poolKey, type Material, type Scene } from "../scene/scene.ts";
import type { KernelView } from "../scene/kernel-view.ts";
import { perf } from "./perf-stats.ts";
import type { MarkLayout } from "./highlight.ts";

const srgb = (hex: number): readonly [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
/** 烤进顶点的颜色（= 以前后端 chunkStyle 给的同一套数：面 sRGB 浮点、线线性）。 */
const FACE_SRGB = srgb(PALETTE.face), EDGE_FACE = hexToLinear(PALETTE.edge), EDGE_WIRE = hexToLinear(PALETTE.edgeWire);

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
  private matUids = new WeakMap<Material, number>(); private nextMatUid = 1;
  /** 世界视图对象 → 小整数（内容键 / 包围球缓存：预演影子每帧是新对象 = 身份变 = 自然失效，和以前 render3 的 kernelId 同构）。 */
  private worldIds = new WeakMap<object, number>(); private nextWorldId = 1;
  /** 上一次 pull 每个槽画的是哪份身体（标记的布局按它找块 / 段）。 */
  private slotBody = new Map<string, Body>();
  private boundsCache: { world: WorldView; rev: number; sphere: { c: Vec3; r: number } | null } | null = null;
  /** 粗线（LineSegments2 实例）还是像素线：引擎的视图设定（线稿粗细 > 1 也会切成粗线），每次 pull 问一下；换了 = 池网格全量重建（线的块形状不同）。 */
  constructor(private readonly thick: () => boolean) {}

  /** 这一帧画哪个世界（活的那份，含预演影子）+ checkpoint 代数（内容键的一部分）。编辑器每次画之前调。淡出是标记（视图侧），不在这里。 */
  setWorld(world: WorldView, revision = 0): void { this.world = world; this.revision = revision; }
  private worldId(w: WorldView): number { let id = this.worldIds.get(w); if (id === undefined) { id = this.nextWorldId++; this.worldIds.set(w, id); } return id; }
  /** 内容键（引擎契约）：世界身份 + 版本；没变 = 引擎不重新拉（= 以前 render3 的 poolKey 那半）。 */
  contentKey(): string { return this.world ? `${this.worldId(this.world)}:${this.revision}` : "none"; }
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
      placements.push({ pool: b.id, xform: s.xform, slot: slotKey(s), index: s.index, active: s.active, singleSided: b.mesh.singleSided });
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
    this.refreshChunks(b);
    return b;
  }

  private env(scene: Scene, defId: number, thick: boolean): PoolMeshEnv {
    const uid = (m: Material | undefined): number => { if (!m) return 0; let u = this.matUids.get(m); if (u === undefined) { u = this.nextMatUid++; this.matUids.set(m, u); } return u; };
    return {
      matOf: (slot) => scene.materialOfSlot(defId, slot),
      slotsSig: scene.def(defId).body.materialSlots.map((i) => uid(scene.materials[i])).join(","),
      singleSided: scene.kindOf(defId) === "mesh",
      faceColor: (mat) => (mat && !mat.texture ? [mat.color[0], mat.color[1], mat.color[2]] : mat?.texture ? [1, 1, 1] : FACE_SRGB),   // 贴图面 = 白（贴图 × 1）；没材质 = 白模灰
      edgeColor: (loose) => (loose ? EDGE_WIRE : EDGE_FACE),
      thick,
    };
  }

  /** 池网格同步完 → 块：改过的段（takeDirty）/ 数组换过 / 组没了 = 新版本；没动 = 原块原版本。 */
  private refreshChunks(b: Body): void {
    for (const key of [...b.faces.keys()]) if (!b.mesh.groups.has(key)) b.faces.delete(key);   // 全量重建后不再有的组
    for (const g of b.mesh.groups.values()) {
      const d = g.store.takeDirty(), A = g.store.arrays, prev = b.faces.get(g.key), count = g.store.end;
      if (prev && !d.grown && d.ranges.length === 0 && prev.attributes.position.array === A.position && prev.count === count) continue;
      const attributes: Record<string, ChunkAttr> = {};
      for (const sp of g.store.specs) attributes[sp.name] = { array: A[sp.name], size: sp.size, normalized: sp.type !== undefined && sp.type !== "f32" };
      b.faces.set(g.key, { id: `${b.id}/${g.key}`, pool: b.id, version: ++this.seq, kind: "tris", attributes, count, dirty: d, material: g.mat ?? undefined, side: g.side ?? undefined });
    }
    const L = b.mesh.lines, d = L.takeDirty(), A = L.arrays, instanced = L.specs.some((sp) => sp.name === "seg");
    const first = instanced ? "seg" : "position", count = instanced ? L.count : L.end, prev = b.lines;
    if (prev && !d.grown && d.ranges.length === 0 && !!prev.instanced === instanced && prev.attributes[first]?.array === A[first] && prev.count === count) return;
    const attributes: Record<string, ChunkAttr> = {};
    for (const sp of L.specs) attributes[sp.name] = { array: A[sp.name], size: sp.size, normalized: sp.type !== undefined && sp.type !== "f32" };
    b.lines = { id: `${b.id}/lines`, pool: b.id, version: ++this.seq, kind: "lines", attributes, count, instanced, dirty: d };
  }
}
