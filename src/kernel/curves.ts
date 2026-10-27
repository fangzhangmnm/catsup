// curves.ts —— 曲线实体（0.10 曲线与曲面纪元，2026-10-24，Claude Fable 5.1；设计稿 ai-docs/20261023-curves-and-surfaces-design.md §4.1）。
// user：「圆弧应该也能记住自己是一个整体…什么样的一chain线段和一组面算一个流形」。
//
// 曲线 = 一串**有序**边当一个实体（SU 的 Curve / ArcCurve）：选一段全选、擦一段整条没、可带圆 / 弧参数。
//   · 存储态（契约 §5 `brep.curves`）：参数不可从线段精确反推，身份要跨会话。
//   · 每条边至多属于一条曲线；链上相邻两边共一个顶点；closed = 首尾相接。
//   · kind：circle（闭合整圆）/ arc（同一圆的一段）/ polyline（参数作废或本来就没有：挪过顶点、跟随站圈、徒手）。
//   · 维护 = 边层的四条规则 + 顺序：① 切割 → 子边按父边方向**按序**顶替 ② 删边 → 出链，链断成两截 → 两条曲线（设计稿 §6-④）
//     ③ 溶解 → 并出的边顶替两条 ④ 新建只经 create（登记时就给有序链）。absorbVertex 搬边 → copy。
//   · 结算后 prune：死边出链、断链拆开、空曲线删。
//   · 曲面不在这里：曲面 = 沿软边泛洪的面集，派生态（kernel/flood.ts surfaceFaces）。
import type { EdgeId, VertexId, PlanarGraph } from "./topology.ts";
import { IdMap } from "./id-table.ts";
import { type PlaneParams, type Pt3, distToPlane, planeOfRing } from "./geom.ts";

export type CurveId = number;
export type CurveKind = "circle" | "arc" | "polyline";
/** 圆 / 弧参数（世界 = 本池本地坐标）：segments = 整圆的段数（弧按它的比例取段）。 */
export interface CurveParams { center: Pt3; radius: number; normal: Pt3; xaxis: Pt3; segments: number }
export interface Curve { readonly id: CurveId; kind: CurveKind; closed: boolean; edges: EdgeId[]; params?: CurveParams }
/** 登记一条曲线要说的话（Op 可序列化：纯数字）。 */
export interface CurveSpec { kind: CurveKind; closed: boolean; params?: CurveParams }

type G = Pick<PlanarGraph, "hasEdge" | "edge" | "hasVertex" | "vertex" | "pt">;

const ends = (g: G, e: EdgeId): [VertexId, VertexId] => { const x = g.edge(e); return [x.a, x.b]; };
const shares = (g: G, e1: EdgeId, e2: EdgeId): boolean => { const [a, b] = ends(g, e1), [c, d] = ends(g, e2); return a === c || a === d || b === c || b === d; };
const hasVertex = (g: G, e: EdgeId, v: VertexId): boolean => { const [a, b] = ends(g, e); return a === v || b === v; };

export class CurveRegistry {
  private byId = new IdMap<Curve>();   // 按 id 下标（O3）
  private ofEdge = new IdMap<CurveId>();
  private nextId = 1;

  curves(): Curve[] { return [...this.byId.values()]; }
  curve(id: CurveId): Curve | undefined { return this.byId.get(id); }
  curveOf(e: EdgeId): CurveId | undefined { return this.ofEdge.get(e); }
  count(): number { return this.byId.size; }

  /**
   * 登记：edges 须是有序链（调用方按线段顺序给；结算机可能把一段切成几条，调用方用 edgesAlongSegs 排好）。
   * 已属别的曲线的边不收；收下来的链不连通 → 不登记（返回 undefined）；少于 1 条也不登记。
   */
  create(g: G, edgesIn: readonly EdgeId[], spec: CurveSpec): Curve | undefined {
    const edges = edgesIn.filter((e) => g.hasEdge(e) && !this.ofEdge.has(e));
    if (!edges.length) return undefined;
    for (let i = 0; i + 1 < edges.length; i++) if (!shares(g, edges[i], edges[i + 1])) return undefined;
    const closed = spec.closed && edges.length >= 3 && shares(g, edges[edges.length - 1], edges[0]);
    const c: Curve = { id: this.nextId++, kind: closed ? spec.kind : spec.kind === "circle" ? "arc" : spec.kind, closed, edges: [...edges], ...(spec.params ? { params: { ...spec.params, center: { ...spec.params.center }, normal: { ...spec.params.normal }, xaxis: { ...spec.params.xaxis } } } : {}) };
    this.byId.set(c.id, c);
    for (const e of edges) this.ofEdge.set(e, c.id);
    return c;
  }
  /** 炸开：实体没了，边留着（SU Explode Curve）。 */
  explode(id: CurveId): boolean {
    const c = this.byId.get(id);
    if (!c) return false;
    for (const e of c.edges) if (this.ofEdge.get(e) === id) this.ofEdge.delete(e);
    this.byId.delete(id);
    return true;
  }
  /** 参数作废（顶点被挪 / 非相似变换）：身份留着，kind → polyline。 */
  invalidate(id: CurveId): void { const c = this.byId.get(id); if (!c) return; c.kind = "polyline"; delete c.params; }
  /** 刚体 / 相似变换后的参数重算（transformAll 用）。 */
  setParams(id: CurveId, kind: CurveKind, params: CurveParams | undefined): void { const c = this.byId.get(id); if (!c) return; c.kind = kind; if (params) c.params = params; else delete c.params; }

  // ---------------- 结算机钩子（四规则 + 顺序） ----------------

  /** ① 切割：父边被切成有序子边（沿父边 a→b）→ 按链的行进方向顶替。 */
  onSplit(g: G, parent: EdgeId, children: readonly EdgeId[]): void {
    const cid = this.ofEdge.get(parent);
    if (cid === undefined) return;
    const c = this.byId.get(cid)!;
    const i = c.edges.indexOf(parent);
    this.ofEdge.delete(parent);
    if (i < 0) return;
    // 只收还没归属的子边：splitEdge 的 half() 会复用既有边（µm 近重边 retrace），那条边可能已经在这条链上——再插一次就是同一条边两个位置
    const kids = children.filter((k) => g.hasEdge(k) && !this.ofEdge.has(k));
    if (!kids.length) { c.edges.splice(i, 1); this.afterRemoval(g, c, i); return; }
    // 父边的两端：首子边上不与第二条子边共享的那个顶点 = a；末子边同理 = b
    const a = kids.length > 1 ? ends(g, kids[0]).find((v) => !hasVertex(g, kids[1], v))! : ends(g, kids[0])[0];
    const b = kids.length > 1 ? ends(g, kids[kids.length - 1]).find((v) => !hasVertex(g, kids[kids.length - 2], v))! : ends(g, kids[0])[1];
    const n = c.edges.length;
    const prev = n > 1 && (c.closed || i > 0) ? c.edges[(i - 1 + n) % n] : undefined;
    const next = n > 1 && (c.closed || i < n - 1) ? c.edges[(i + 1) % n] : undefined;
    let forward = true;
    if (prev !== undefined && g.hasEdge(prev) && prev !== parent) forward = hasVertex(g, prev, a) ? true : hasVertex(g, prev, b) ? false : true;
    else if (next !== undefined && g.hasEdge(next) && next !== parent) forward = hasVertex(g, next, b) ? true : hasVertex(g, next, a) ? false : true;
    const ordered = forward ? kids : [...kids].reverse();
    c.edges.splice(i, 1, ...ordered);
    for (const k of ordered) this.ofEdge.set(k, cid);
  }
  /** ② 删边：出链；链断成两截 → 拆成两条曲线；闭环少一段 → 开弧。 */
  onRemove(e: EdgeId): void {
    const cid = this.ofEdge.get(e);
    if (cid === undefined) return;
    this.ofEdge.delete(e);
    const c = this.byId.get(cid)!;
    const i = c.edges.indexOf(e);
    if (i < 0) return;
    c.edges.splice(i, 1);
    this.afterRemoval(undefined, c, i);
  }
  private afterRemoval(_g: G | undefined, c: Curve, i: number): void {
    if (!c.edges.length) { this.byId.delete(c.id); return; }
    if (c.closed) {
      // 闭环去掉一段 = 从缺口后面开始的开链（旋转），不拆
      c.edges = [...c.edges.slice(i), ...c.edges.slice(0, i)];
      c.closed = false;
      if (c.kind === "circle") c.kind = "arc";
      return;
    }
    if (i > 0 && i < c.edges.length) {
      // 开链中间断开 → 后半截另立一条（同参数）
      const tail = c.edges.splice(i);
      const nc: Curve = { id: this.nextId++, kind: c.kind, closed: false, edges: tail, ...(c.params ? { params: { ...c.params } } : {}) };
      this.byId.set(nc.id, nc);
      for (const t of tail) this.ofEdge.set(t, nc.id);
    }
  }
  /** ③ 溶解：ea、eb 并成 ne。同链相邻 → 一条顶两条；只有一条在链上 → 顶替它；两条在不同链 → 归 ea 的链，eb 出链。 */
  onMerge(ne: EdgeId, ea: EdgeId, eb: EdgeId): void {
    const ca = this.ofEdge.get(ea), cb = this.ofEdge.get(eb);
    if (ca === undefined && cb === undefined) return;
    if (ca !== undefined && ca === cb) {
      const c = this.byId.get(ca)!;
      const i = c.edges.indexOf(ea), j = c.edges.indexOf(eb);
      const n = c.edges.length;
      if (i >= 0 && j >= 0 && ((i + 1) % n === j || (j + 1) % n === i)) {
        const first = (i + 1) % n === j ? i : j;
        if (first === n - 1) { c.edges.splice(n - 1, 1); c.edges.splice(0, 1, ne); }   // 跨首尾
        else c.edges.splice(first, 2, ne);
        this.ofEdge.delete(ea); this.ofEdge.delete(eb); this.ofEdge.set(ne, ca);
        return;
      }
    }
    const keep = ca !== undefined ? ea : eb, drop = ca !== undefined ? eb : ea, cid = (ca ?? cb)!;
    if (drop !== undefined && this.ofEdge.has(drop)) this.onRemove(drop);
    const c = this.byId.get(cid);
    if (!c) return;
    const i = c.edges.indexOf(keep);
    this.ofEdge.delete(keep);
    if (i >= 0) { c.edges[i] = ne; this.ofEdge.set(ne, cid); }
  }
  /**
   * 断点规则（0.10.2，**只在这里判**，结算机尾声对本次星形变过的顶点调一次；user 2026-10-24「这种时候我希望留下 1/4，我 su 里面都是这么画圆弧的」）：
   * 顶点上有「不属于本曲线、且另一端在本曲线平面 τ 内」的边 → 曲线在此断开（线穿圆 = 两弧；盒底边穿过地上的圆 = 1/4 + 3/4；弧碰到圆周 = 圆变 360° 弧）。
   * 出平面的边（推拉 / 跟随的侧棱、手画的竖线）= 挂上去，不断（圆柱 / 锥顶圈整）——这是与 SU 的有意分歧：SU 任何线碰顶点都断，但侧棱与手画竖线拓扑上无法区分。
   * 断是永久的（SU 要 Weld 才合）：擦掉弦，两弧不自愈——身份是历史，不是几何的派生量（否则推拉过的弧会被重新粘回圈里、下次擦一段连柱体底圈一起没）。
   * 0.10.1 之前这条规则散在动词里（addEdges 先切再登记 → 新圆切不到自己；pushPull / followMe / absorb 根本不切），截图里擦地上一段连推拉体底圈一起没 = 那个病。
   */
  rechain(g: G, verts: Iterable<VertexId>, tol: number): void {
    for (const v of verts) {
      if (!g.hasVertex(v)) continue;
      const star = [...g.vertex(v).edges];
      const here = new Set<CurveId>();
      for (const e of star) { const c = this.ofEdge.get(e); if (c !== undefined) here.add(c); }
      for (const cid of here) {
        const c = this.byId.get(cid);
        if (!c) continue;
        const pl = this.planeOf(g, c);
        let junction = false;
        for (const e of star) {
          if (this.ofEdge.get(e) === cid) continue;
          if (!pl) { junction = true; break; }                       // 退化链（共线）：任何外来边都算
          const x = g.edge(e);
          if (distToPlane(g.pt(x.a === v ? x.b : x.a), pl) <= tol) { junction = true; break; }
        }
        if (junction) this.cutAt(g, c, v);
      }
    }
  }
  /** 曲线所在平面：有参数用圆心 + 法向；折线用链上顶点的 Newell 平面；退化 → null。 */
  private planeOf(g: G, c: Curve): PlaneParams | null {
    if (c.params) { const n = c.params.normal; return { n, d: n.x * c.params.center.x + n.y * c.params.center.y + n.z * c.params.center.z }; }
    const pts: Pt3[] = [];
    for (const e of c.edges) { if (!g.hasEdge(e)) continue; const x = g.edge(e); pts.push(g.pt(x.a), g.pt(x.b)); }
    return pts.length >= 3 ? planeOfRing(pts) : null;
  }
  /** 把曲线 c 在顶点 v 处断开：闭环 → 从 v 起的一条开链；开链 → v 之后的尾巴成新曲线。v 不在链内部（端点 / 不在链上）= 不动。 */
  private cutAt(g: G, c: Curve, v: VertexId): void {
    const n = c.edges.length;
    if (n < 2) return;
    const at = (i: number): boolean => { const e = c.edges[i]; return g.hasEdge(e) && hasVertex(g, e, v); };
    let cut = -1;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (!c.closed && j === 0) break; if (at(i) && at(j)) { cut = j; break; } }
    if (cut < 0) return;
    if (c.closed) { c.edges = [...c.edges.slice(cut), ...c.edges.slice(0, cut)]; c.closed = false; if (c.kind === "circle") c.kind = "arc"; return; }
    const tail = c.edges.splice(cut);
    const nc: Curve = { id: this.nextId++, kind: c.kind, closed: false, edges: tail, ...(c.params ? { params: { ...c.params } } : {}) };
    this.byId.set(nc.id, nc);
    for (const t of tail) this.ofEdge.set(t, nc.id);
  }
  /** absorbVertex 搬边：from → to。 */
  copy(from: EdgeId, to: EdgeId): void {
    const cid = this.ofEdge.get(from);
    if (cid === undefined || this.ofEdge.has(to)) return;
    const c = this.byId.get(cid)!;
    const i = c.edges.indexOf(from);
    if (i >= 0) { c.edges[i] = to; this.ofEdge.delete(from); this.ofEdge.set(to, cid); }
  }
  /** 结算后清理：死边出链；链不连通 → 拆成连通段；空的删。 */
  prune(g: G): void { for (const c of [...this.byId.values()]) this.pruneCurve(g, c); }
  /**
   * 增量版（2026-10-26 Claude Opus 5.5，纪元账本 DT93）：只看含被删边的曲线（清理前 ofEdge 还指着它们），按 id 序 = 全量版的访问序，
   * 拆出来的新曲线编号与全量版相同。没被删边的曲线全量版也不会改它（全边活、相邻共顶点）。
   */
  pruneEdges(g: G, removed: readonly EdgeId[]): void {
    if (!removed.length) return;
    const ids = new Set<CurveId>();
    for (const e of removed) { const c = this.ofEdge.get(e); if (c !== undefined) ids.add(c); }
    for (const id of [...ids].sort((a, b) => a - b)) { const c = this.byId.get(id); if (c) this.pruneCurve(g, c); }
  }
  private pruneCurve(g: G, c: Curve): void {
    {
      const alive = c.edges.filter((e) => g.hasEdge(e));
      for (const e of c.edges) if (!g.hasEdge(e) && this.ofEdge.get(e) === c.id) this.ofEdge.delete(e);
      if (!alive.length) { this.byId.delete(c.id); return; }
      // 切成连通段
      const runs: EdgeId[][] = [[alive[0]]];
      for (let i = 1; i < alive.length; i++) { if (shares(g, alive[i - 1], alive[i])) runs[runs.length - 1].push(alive[i]); else runs.push([alive[i]]); }
      if (runs.length > 1 && c.closed && shares(g, alive[alive.length - 1], alive[0])) { const last = runs.pop()!; runs[0] = [...last, ...runs[0]]; }   // 闭环的首尾段其实相连
      const closed = c.closed && runs.length === 1 && alive.length >= 3 && shares(g, alive[alive.length - 1], alive[0]);
      c.edges = runs[0]; c.closed = closed; if (!closed && c.kind === "circle") c.kind = "arc";
      for (let r = 1; r < runs.length; r++) {
        const nc: Curve = { id: this.nextId++, kind: c.kind === "circle" ? "arc" : c.kind, closed: false, edges: runs[r], ...(c.params ? { params: { ...c.params } } : {}) };
        this.byId.set(nc.id, nc);
        for (const e of runs[r]) this.ofEdge.set(e, nc.id);
      }
    }
  }
  /** 校验（fuzz / 装载）：边存在、相邻共顶点、每边至多一条曲线、闭合首尾相接。返回问题列表（空 = 好）。 */
  validate(g: G): string[] {
    const out: string[] = [];
    const seen = new Map<EdgeId, CurveId>();
    for (const c of this.byId.values()) {
      if (!c.edges.length) { out.push(`curve ${c.id} is empty`); continue; }
      if (new Set(c.edges).size !== c.edges.length) out.push(`curve ${c.id} lists an edge twice`);
      for (const e of c.edges) {
        if (!g.hasEdge(e)) out.push(`curve ${c.id}: edge ${e} does not exist`);
        if (this.ofEdge.get(e) !== c.id) out.push(`curve ${c.id}: edge ${e} not indexed back to it`);
        const prev = seen.get(e); if (prev !== undefined) out.push(`edge ${e} in curves ${prev} and ${c.id}`); seen.set(e, c.id);
      }
      for (let i = 0; i + 1 < c.edges.length; i++) if (g.hasEdge(c.edges[i]) && g.hasEdge(c.edges[i + 1]) && !shares(g, c.edges[i], c.edges[i + 1])) out.push(`curve ${c.id}: edges ${c.edges[i]} and ${c.edges[i + 1]} do not share a vertex`);
      if (c.closed && c.edges.length >= 2 && g.hasEdge(c.edges[0]) && g.hasEdge(c.edges[c.edges.length - 1]) && !shares(g, c.edges[c.edges.length - 1], c.edges[0])) out.push(`curve ${c.id}: closed but ends do not meet`);
    }
    for (const [e, cid] of this.ofEdge) if (!this.byId.get(cid)?.edges.includes(e)) out.push(`edge ${e} indexed to curve ${cid} which does not list it`);
    return out;
  }

  /** 倒带（O1）：这几条边牵到的曲线（影子里的 / base 里的）+ 影子里新铸的曲线，恢复成 base 的样子；边 → 曲线表对这几条边照 base。 */
  restoreFrom(base: CurveRegistry, eids: ReadonlySet<EdgeId>): void {
    const cids = new Set<CurveId>();
    for (const e of eids) { const a = this.ofEdge.get(e); if (a !== undefined) cids.add(a); const b = base.ofEdge.get(e); if (b !== undefined) cids.add(b); }
    for (const id of this.byId.keys()) if (id >= base.nextId) cids.add(id);
    for (const id of cids) {
      const mine = this.byId.get(id);
      if (mine) { for (const e of mine.edges) if (this.ofEdge.get(e) === id) this.ofEdge.delete(e); this.byId.delete(id); }
      const b = base.byId.get(id);
      if (b) { this.byId.set(id, { ...b, edges: [...b.edges], ...(b.params ? { params: { ...b.params } } : {}) }); for (const e of b.edges) this.ofEdge.set(e, id); }
    }
    for (const e of eids) { const b = base.ofEdge.get(e); if (b === undefined) this.ofEdge.delete(e); else this.ofEdge.set(e, b); }
    this.nextId = base.nextId;
  }
  clone(): CurveRegistry {
    const r = new CurveRegistry();
    r.nextId = this.nextId;
    for (const [id, c] of this.byId) r.byId.set(id, { ...c, edges: [...c.edges], ...(c.params ? { params: { ...c.params } } : {}) });
    for (const [e, cid] of this.ofEdge) r.ofEdge.set(e, cid);
    return r;
  }
  /** 快照（契约 §5 brep.curves 的内存形）：边按给定边序取下标；按曲线 id 升序。 */
  toIndex(edgeIds: readonly EdgeId[]): { edges: number[]; kind: CurveKind; closed: boolean; params?: CurveParams }[] | undefined {
    const idx = new Map<EdgeId, number>(edgeIds.map((e, i) => [e, i]));
    const out: { edges: number[]; kind: CurveKind; closed: boolean; params?: CurveParams }[] = [];
    for (const c of [...this.byId.values()].sort((p, q) => p.id - q.id)) {
      const es = c.edges.map((e) => idx.get(e)).filter((i): i is number => i !== undefined);
      if (!es.length) continue;
      out.push({ edges: es, kind: c.kind, closed: c.closed, ...(c.params ? { params: { ...c.params } } : {}) });
    }
    return out.length ? out : undefined;
  }
  /** 装载：校验失败 fail（整份拒开，与膜同款）。 */
  static fromIndex(g: G, list: readonly { edges: readonly number[]; kind: CurveKind; closed: boolean; params?: CurveParams }[] | undefined, edgeIds: readonly EdgeId[], fail: (msg: string) => never): CurveRegistry {
    const r = new CurveRegistry();
    if (!list) return r;
    list.forEach((c, i) => {
      if (!["circle", "arc", "polyline"].includes(c.kind)) fail(`curve ${i} has unknown kind ${String(c.kind)}`);
      const es: EdgeId[] = [];
      for (const j of c.edges) { if (!(j in edgeIds)) fail(`curve ${i} edge index ${j} out of range`); es.push(edgeIds[j]); }
      if (!es.length) fail(`curve ${i} has no edges`);
      const made = r.create(g, es, { kind: c.kind, closed: c.closed, params: c.params });
      if (!made || made.edges.length !== es.length) fail(`curve ${i} is not a connected chain of free edges`);
    });
    return r;
  }
}

/** 沿一串线段（按顺序）找落在上面的边，按各段的参数序排好 —— 画圆 / 弧 / 推拉帽登记曲线用。 */
export function edgesAlongSegs(g: PlanarGraph, segs: readonly { a: Pt3; b: Pt3 }[], onSeg: (pa: Pt3, pb: Pt3, a: Pt3, b: Pt3) => boolean): EdgeId[] {
  const out: EdgeId[] = [];
  const used = new Set<EdgeId>();
  for (const s of segs) {
    const found: { e: EdgeId; t: number }[] = [];
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, dz = s.b.z - s.a.z, l2 = dx * dx + dy * dy + dz * dz || 1;
    for (const e of g.edgesNear(s.a, s.b)) {
      if (used.has(e.id)) continue;
      const pa = g.pt(e.a), pb = g.pt(e.b);
      if (!onSeg(pa, pb, s.a, s.b)) continue;
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, z: (pa.z + pb.z) / 2 };
      found.push({ e: e.id, t: ((mid.x - s.a.x) * dx + (mid.y - s.a.y) * dy + (mid.z - s.a.z) * dz) / l2 });
    }
    found.sort((p, q) => p.t - q.t);
    for (const f of found) { used.add(f.e); out.push(f.e); }
  }
  return out;
}
