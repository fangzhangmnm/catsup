// obj-io.ts —— OBJ 逃生口（纯字符串，DOM-free，node 直测）。
// created 2026-09-06 by Claude Fable 5.1（user：「无 store 无导入导出（现在定文件格式还太早）…可以留一个 gltf 或者 obj 的 io 逃生口」）
//
// 2026-10-29 Opus 5.5：导入那一半（parseObjSegments：只读边、加进硬表面）退役——OBJ 导入改走 format/obj-import.ts（网格体，和外来 glb 同一条，账本 T121）；这里只剩导出。
// 定位：**不是文件格式**——CatsUp 自己的持久化格式还没立（膜血缘/贴图/group 都没定），OBJ 只是「把模型
// 搬去 Blender / 从 Blender 搬回来」的最低限度通道。导出丢的信息：膜 id、平面注册、事件史；导入进来的
// 只是一堆边（面靠内核 face-finding 自己长回来，与手画一个字节不差）。
//
// 坐标：世界 Z 上（SU 蓝轴）↔ OBJ 习惯 Y 上（Blender 导入器默认 -Z forward / Y up）：
//   export (x,y,z) → (x, z, -y)；import (X,Y,Z) → (X, -Z, Y)。往返恒等。
// 面：无洞 = n-gon（Blender 里保留为一个多边形，好编辑）；带洞 = 三角化（回调注入；OBJ 没有洞的概念）。
// 裸边（faceLinks==0）= `l` 线元素（Blender 导入为 loose edge）。

import type { EdgeId, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import { DisjointSet } from "../kernel/dsu.ts";

/**
 * 折面（DT87，2026-10-26 Claude Opus 5.5）：被折线连着的几块平面片 = 一个多边形 → 写成一个 n-gon（Blender 读进来就是一个面，折痕是它的三角化）。
 * 条件：每块都没洞、外圈连成一个简单环（朝向按「共享边上走向相反 = 一致」统一）；不满足 = 照旧逐块写（不硬拼）。返回合并出的多边形（顶点链）+ 已写掉的面。
 */
function foldPolygons(k: GeomView): { polys: VertexId[][]; done: Set<FaceId> } {
  const out = { polys: [] as VertexId[][], done: new Set<FaceId>() };
  const folds = k.edges().filter((e) => k.isFold(e.id));
  if (!folds.length) return out;
  const dsu = new DisjointSet<FaceId>();
  for (const e of folds) { const fl = [...new Set(e.faceLinks)]; if (fl.length === 2) dsu.union(fl[0], fl[1]); }
  const groups = new Map<FaceId, FaceId[]>();
  for (const f of dsu.keys()) { const r = dsu.find(f); (groups.get(r) ?? groups.set(r, []).get(r)!).push(f); }
  type DE = { from: VertexId; to: VertexId; edge: EdgeId };
  const ring = (fid: FaceId): DE[] | null => { const f = k.face(fid); if (!f || f.holes.length) return null; return f.outer.edges.map((d) => { const e = k.graph.edge(d.edge); return d.forward ? { from: e.a, to: e.b, edge: d.edge } : { from: e.b, to: e.a, edge: d.edge }; }); };
  for (const members of groups.values()) {
    const rings = new Map<FaceId, DE[]>();
    if (members.some((f) => { const r = ring(f); if (r) rings.set(f, r); return !r; })) continue;
    const inGroup = new Set(members);
    const internal = (eid: EdgeId): boolean => k.isFold(eid) && k.graph.edge(eid).faceLinks.filter((f) => inGroup.has(f)).length === 2;
    // 朝向统一：从第一块出发，过内部折线 —— 两块在它上面走向相同 = 邻块要反过来
    const orient = new Map<FaceId, number>([[members[0], 1]]), queue = [members[0]];
    let ok = true;
    for (let qi = 0; qi < queue.length && ok; qi++) {
      const a = queue[qi];
      for (const d of rings.get(a)!) {
        if (!internal(d.edge)) continue;
        const b = k.graph.edge(d.edge).faceLinks.find((f) => f !== a && inGroup.has(f));
        if (b === undefined) continue;
        const db = rings.get(b)!.find((x) => x.edge === d.edge)!;
        const want = orient.get(a)! * (db.from === d.from ? -1 : 1);
        if (!orient.has(b)) { orient.set(b, want); queue.push(b); } else if (orient.get(b) !== want) ok = false;   // 不可定向（莫比乌斯式）→ 逐块写
      }
    }
    if (!ok || orient.size !== members.length) continue;
    // 外圈 = 各块（按朝向）的有向边去掉内部折线；连成一个简单环才算
    const next = new Map<VertexId, VertexId>();
    let n = 0;
    for (const f of members) for (const d of rings.get(f)!) {
      if (internal(d.edge)) continue;
      const [u, v] = orient.get(f)! > 0 ? [d.from, d.to] : [d.to, d.from];
      if (next.has(u)) { ok = false; break; }
      next.set(u, v); n++;
    }
    if (!ok || !n) continue;
    const start = next.keys().next().value as VertexId, loop: VertexId[] = [start];
    for (let v = next.get(start)!; v !== start; v = next.get(v)!) { if (v === undefined || loop.length > n) { ok = false; break; } loop.push(v); }
    if (!ok || loop.length !== n) continue;
    out.polys.push(loop);
    for (const f of members) out.done.add(f);
  }
  return out;
}

export interface ObjExportOpts {
  /** 带洞面的三角化（世界坐标）。缺省 → 带洞面只导出外环（洞丢失，导出文本里留注释）。 */
  triangulateHoled?: (k: GeomView, id: FaceId) => [Pt3, Pt3, Pt3][];
  /** 写进文件头的版本戳。 */
  version?: string;
}

const fmt = (n: number): string => {
  const s = (Math.round(n * 1e6) / 1e6).toString();
  return s === "-0" ? "0" : s;
};

export function exportObj(k: GeomView, opts: ObjExportOpts = {}): string {
  const lines: string[] = [];
  lines.push(`# CatsUp OBJ export${opts.version ? ` (${opts.version})` : ""} — Z-up world written as Y-up (x, z, -y)`);
  const index = new Map<string, number>();
  const vlines: string[] = [];
  const vid = (p: Pt3): number => {
    const key = `${fmt(p.x)},${fmt(p.y)},${fmt(p.z)}`;
    let i = index.get(key);
    if (i === undefined) {
      i = index.size + 1;
      index.set(key, i);
      vlines.push(`v ${fmt(p.x)} ${fmt(p.z)} ${fmt(-p.y)}`);
    }
    return i;
  };
  const body: string[] = [];
  let holedDropped = 0;
  const folded = foldPolygons(k);
  for (const loop of folded.polys) body.push(`f ${loop.map((v) => vid(k.graph.pt(v))).join(" ")}`);
  for (const f of k.faces()) {
    if (folded.done.has(f.id)) continue;
    const rings = k.faceRings3(f.id);
    if (!rings) continue;
    if (f.holes.length === 0) {
      body.push(`f ${rings.outer.map((p) => vid(p)).join(" ")}`);
    } else if (opts.triangulateHoled) {
      for (const [a, b, c] of opts.triangulateHoled(k, f.id)) body.push(`f ${vid(a)} ${vid(b)} ${vid(c)}`);
    } else {
      holedDropped++;
      body.push(`f ${rings.outer.map((p) => vid(p)).join(" ")}`);
    }
  }
  for (const e of k.edges()) {
    if (e.faceLinks.length !== 0) continue;
    body.push(`l ${vid(k.graph.pt(e.a))} ${vid(k.graph.pt(e.b))}`);
  }
  if (holedDropped) lines.push(`# warning: ${holedDropped} face(s) with holes exported as outer ring only (no triangulator supplied)`);
  lines.push(`o catsup`);
  lines.push(...vlines, ...body);
  return lines.join("\n") + "\n";
}

