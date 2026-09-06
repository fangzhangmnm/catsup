// obj-io.ts —— OBJ 逃生口（纯字符串，DOM-free，node 直测）。
// created 2026-09-06 by Claude Fable 5.1（user：「无 store 无导入导出（现在定文件格式还太早）…可以留一个 gltf 或者 obj 的 io 逃生口」）
//
// 定位：**不是文件格式**——CatsUp 自己的持久化格式还没立（膜血缘/贴图/group 都没定），OBJ 只是「把模型
// 搬去 Blender / 从 Blender 搬回来」的最低限度通道。导出丢的信息：膜 id、平面注册、事件史；导入进来的
// 只是一堆边（面靠内核 face-finding 自己长回来，与手画一个字节不差）。
//
// 坐标：世界 Z 上（SU 蓝轴）↔ OBJ 习惯 Y 上（Blender 导入器默认 -Z forward / Y up）：
//   export (x,y,z) → (x, z, -y)；import (X,Y,Z) → (X, -Z, Y)。往返恒等。
// 面：无洞 = n-gon（Blender 里保留为一个多边形，好编辑）；带洞 = 三角化（回调注入；OBJ 没有洞的概念）。
// 裸边（faceLinks==0）= `l` 线元素（Blender 导入为 loose edge）。

import type { FaceId, Kernel, Pt3 } from "../kernel/kernel.ts";

export interface ObjExportOpts {
  /** 带洞面的三角化（世界坐标）。缺省 → 带洞面只导出外环（洞丢失，导出文本里留注释）。 */
  triangulateHoled?: (k: Kernel, id: FaceId) => [Pt3, Pt3, Pt3][];
  /** 写进文件头的版本戳。 */
  version?: string;
}

const fmt = (n: number): string => {
  const s = (Math.round(n * 1e6) / 1e6).toString();
  return s === "-0" ? "0" : s;
};

export function exportObj(k: Kernel, opts: ObjExportOpts = {}): string {
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
  for (const f of k.faces()) {
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

export interface ObjParseResult {
  segs: [Pt3, Pt3][];
  vertices: number;
  faces: number;
  looseLines: number;
}

/**
 * 解析 OBJ 成线段集（每个多边形的边 + `l` 线；去重）。maxSegments 之上直接拒收——
 * 三角汤网格进肥皂膜内核 = 每个三角一张膜，慢且无意义；逃生口只接「多边形建模」量级。
 */
export function parseObjSegments(text: string, opts: { maxSegments?: number } = {}): ObjParseResult {
  const maxSegments = opts.maxSegments ?? 3000;
  const verts: Pt3[] = [];
  const segKeys = new Set<string>();
  const segs: [Pt3, Pt3][] = [];
  let faces = 0, looseLines = 0;
  const key = (p: Pt3): string => `${fmt(p.x)},${fmt(p.y)},${fmt(p.z)}`;
  const push = (a: Pt3, b: Pt3): void => {
    const ka = key(a), kb = key(b);
    if (ka === kb) return;
    const kk = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    if (segKeys.has(kk)) return;
    segKeys.add(kk);
    segs.push([a, b]);
    if (segs.length > maxSegments) throw new Error(`OBJ 太大：超过 ${maxSegments} 条边（逃生口只接多边形建模量级，不接三角汤）`);
  };
  const resolve = (tok: string): Pt3 | null => {
    const i = parseInt(tok.split("/")[0], 10);
    if (!Number.isFinite(i) || i === 0) return null;
    const idx = i > 0 ? i - 1 : verts.length + i;
    return verts[idx] ?? null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const tag = parts[0];
    if (tag === "v") {
      const X = parseFloat(parts[1]), Y = parseFloat(parts[2]), Z = parseFloat(parts[3]);
      if (![X, Y, Z].every(Number.isFinite)) continue;
      verts.push({ x: X, y: -Z, z: Y });   // Y-up → Z-up
    } else if (tag === "f" || tag === "l") {
      const pts = parts.slice(1).map(resolve).filter((p): p is Pt3 => p !== null);
      if (pts.length < 2) continue;
      if (tag === "f") {
        faces++;
        for (let i = 0; i < pts.length; i++) push(pts[i], pts[(i + 1) % pts.length]);
      } else {
        looseLines++;
        for (let i = 0; i + 1 < pts.length; i++) push(pts[i], pts[i + 1]);
      }
    }
  }
  return { segs, vertices: verts.length, faces, looseLines };
}
