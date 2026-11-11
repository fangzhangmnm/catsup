// paint/space-target.ts —— 空间里的笔要画的「目标」：名单里每一项 = 一份摆放 + 它那个定义上的一张画（贴图主线 1-4a 第一节，施工单 ai-docs/20261110-paint-workorders-9.md）。
// created 2026-11-11 by Claude Opus 5.5。纯计算：不碰显卡、不碰页面。
// · 全部在世界坐标里算：三角形的角、位置公式都乘上这份摆放（可以带缩放）。别的摆放共用同一张画，自然跟着有。
// · 每一项建一次（网格体变了才重建）：1-3a 的格子（定义坐标，打射线用）、1-3a 的归属表、每个三角形的世界角 / 世界法向 / 格长、三角形之间怎么相邻。
// · 打射线求落点全仓只有 1-3a 那一处（surface-pick.ts castRay）：这里把世界里的射线换进定义坐标交给它（方向不归一化，t 在两边相同）。
// · 藏起来的面不在格子里：不挡、不吃、连通也不从它过。不走这张画的面在格子里：挡得住射线、连通可以从它过，但是不吃。
import type { Pt3 } from "../kernel/geom.ts";
import { type Xform, applyDir, applyPt, invert } from "../scene/xform.ts";
import { buildTriGrid, castRay, type PickMesh, type TriGrid } from "./surface-pick.ts";
import { buildTexelTable, paintFaces, type PaintMesh, type TexelTable } from "./texel-table.ts";

/** 目标的网格体（MeshKernel 满足）。 */
export interface TargetMesh extends PickMesh, PaintMesh {}
/** 名单里的一项。 */
export interface PaintTarget {
  /** 名单里的身份（摆放 + 画）。 */
  readonly id: string;
  readonly mesh: TargetMesh;
  /** 这份摆放：定义坐标 → 世界（3 × 4，可以带缩放）。 */
  readonly xform: Xform;
  /** 哪一套贴图坐标（内核里那一列的 GUID）。 */
  readonly uvSet: string;
  /** 那一套的密度：定义坐标里每米几格。 */
  readonly pxPerM: number;
  /** 画布的格数。 */
  readonly canvas: { readonly width: number; readonly height: number };
  /** 铺的时候块之间留的格数（1-3a 默认 4）：归属表往块外延 gap / 2 格。 */
  readonly gap?: number;
  /** 这张面走不走这张画（场景那一层的问法；这里不认识材质）。 */
  walks(face: number): boolean;
}
/** 一项目标算好的东西。三角形的编号 = 1-3a 格子里的编号（castRay 返回的那个）。 */
export interface TargetGeo {
  readonly target: PaintTarget;
  readonly grid: TriGrid;
  readonly table: TexelTable;
  readonly inv: Xform;
  /** 每个三角形三个角的世界位置（9 个数）。 */
  readonly wpos: Float64Array;
  /** 每个三角形的世界法向（单位长，3 个数；退化 = 0）。 */
  readonly wnorm: Float64Array;
  /** 格长：根号下（世界里的面积 ÷ 画布上的面积）；这张面在这一列上没有值 / 画布上退化 = 0。 */
  readonly texelLen: Float64Array;
  /** 每个三角形三个角的网格体点编号。 */
  readonly vids: Int32Array;
  /** 相邻（CSR）：第 t 个三角形的邻居 = adj[adjStart[t] .. adjStart[t + 1])。有一条公共的边（两个公共点，按点编号认）就算，同一张面切出来的也算。 */
  readonly adjStart: Int32Array;
  readonly adj: Int32Array;
}

/** 这份摆放的名义缩放（三个轴缩放的几何平均 = 线性部分行列式绝对值的立方根）。 */
export function xformScale(x: Xform): number {
  const det = x[0] * (x[5] * x[10] - x[6] * x[9]) - x[1] * (x[4] * x[10] - x[6] * x[8]) + x[2] * (x[4] * x[9] - x[5] * x[8]);
  return Math.cbrt(Math.abs(det));
}
/** 路的单位（1-4a 第一节第 7 条）：名单里最密的那一项的名义值 = 那份摆放的缩放 ÷ 那一套坐标的密度（世界里一格多大）。落笔时就知道。 */
export const pathUnit = (targets: readonly PaintTarget[]): number => Math.min(...targets.map((t) => xformScale(t.xform) / t.pxPerM));

/** 建一项（O(三角形数)）。 */
export function buildTargetGeo(target: PaintTarget): TargetGeo {
  const m = target.mesh, grid = buildTriGrid(m), n = grid.face.length, X = target.xform;
  const table = buildTexelTable(target.canvas.width, target.canvas.height, paintFaces(m, target.uvSet), target.gap ?? 4);
  const wpos = new Float64Array(9 * n), wnorm = new Float64Array(3 * n), texelLen = new Float64Array(n), vids = new Int32Array(3 * n);
  for (let t = 0; t < n; t++) {
    const f = grid.face[t], ring = m.faceVerts(f), uv = m.cornerValues(f, target.uvSet);
    for (let k = 0; k < 3; k++) {
      const p = applyPt(X, { x: grid.pos[9 * t + 3 * k], y: grid.pos[9 * t + 3 * k + 1], z: grid.pos[9 * t + 3 * k + 2] });
      wpos[9 * t + 3 * k] = p.x; wpos[9 * t + 3 * k + 1] = p.y; wpos[9 * t + 3 * k + 2] = p.z;
      vids[3 * t + k] = ring[grid.corner[3 * t + k]];
    }
    const o = 9 * t, ax = wpos[o + 3] - wpos[o], ay = wpos[o + 4] - wpos[o + 1], az = wpos[o + 5] - wpos[o + 2], bx = wpos[o + 6] - wpos[o], by = wpos[o + 7] - wpos[o + 1], bz = wpos[o + 8] - wpos[o + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx, nl = Math.hypot(nx, ny, nz);
    if (nl > 0) { wnorm[3 * t] = nx / nl; wnorm[3 * t + 1] = ny / nl; wnorm[3 * t + 2] = nz / nl; }
    if (uv) {
      const c = [grid.corner[3 * t], grid.corner[3 * t + 1], grid.corner[3 * t + 2]];
      const u0 = uv[2 * c[0]], v0 = uv[2 * c[0] + 1], u1 = uv[2 * c[1]], v1 = uv[2 * c[1] + 1], u2 = uv[2 * c[2]], v2 = uv[2 * c[2] + 1];
      const uvArea = Math.abs((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)) / 2;
      texelLen[t] = uvArea > 0 ? Math.sqrt(nl / 2 / uvArea) : 0;
    }
  }
  // 相邻：每个三角形的三条边按（小点号, 大点号）登记，同一条边上的三角形互为邻居
  const byEdge = new Map<number, number[]>(), maxV = vids.reduce((a, b) => Math.max(a, b), 0) + 1;
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const a = vids[3 * t + k], b = vids[3 * t + ((k + 1) % 3)], key = Math.min(a, b) * maxV + Math.max(a, b);
    const l = byEdge.get(key); if (l) l.push(t); else byEdge.set(key, [t]);
  }
  const nb: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (const l of byEdge.values()) for (const a of l) for (const b of l) if (a !== b) nb[a].add(b);
  const adjStart = new Int32Array(n + 1);
  for (let t = 0; t < n; t++) adjStart[t + 1] = adjStart[t] + nb[t].size;
  const adj = new Int32Array(adjStart[n]);
  for (let t = 0; t < n; t++) adj.set([...nb[t]].sort((a, b) => a - b), adjStart[t]);
  return { target, grid, table, inv: invert(X), wpos, wnorm, texelLen, vids, adjStart, adj };
}

/** 一条射线打中了什么：目标（哪一项、哪个三角形、世界里的位置）/ 打中了但不是目标（挡住了，或者那张面不走画）/ 什么都没打中。 */
export type Hit =
  | { readonly kind: "target"; readonly ti: number; readonly tri: number; readonly pos: Pt3; readonly t: number }
  | { readonly kind: "other"; readonly t: number }
  | null;
/**
 * 世界里的射线 o + t·d（d 不必是单位长）打中名单里哪一项的哪个三角形。眼睛看到的第一张面才算：名单里各项取最近的；
 * 那张面不走这张画 = 「打中了但不是目标」；名单之外的东西挡在前面（occluded(t) = 真）= 「打中了但不是目标」。
 */
export function rayHit(geos: readonly TargetGeo[], o: Pt3, d: Pt3, occluded?: (t: number) => boolean): Hit {
  let best: { ti: number; tri: number; t: number } | null = null;
  geos.forEach((g, ti) => {
    const h = castRay(g.grid, applyPt(g.inv, o), applyDir(g.inv, d));
    if (h && (!best || h.t < best.t)) best = { ti, tri: h.tri, t: h.t };
  });
  if (!best) return occluded?.(Infinity) ? { kind: "other", t: Infinity } : null;
  const b = best as { ti: number; tri: number; t: number };
  if (occluded?.(b.t)) return { kind: "other", t: b.t };
  const g = geos[b.ti];
  if (!g.target.walks(g.grid.face[b.tri])) return { kind: "other", t: b.t };
  return { kind: "target", ti: b.ti, tri: b.tri, pos: { x: o.x + d.x * b.t, y: o.y + d.y * b.t, z: o.z + d.z * b.t }, t: b.t };
}
