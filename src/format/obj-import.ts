// obj-import.ts —— 外来 OBJ → 导入中间数据（和外来 glb 同一种：gltf-import.ts ImportScene；纯函数、零 DOM）。created 2026-10-29 by Claude Opus 5.5
// user 10-29「导入的glb obj当然应该是mesh，以后想导入skp的才是brep」（账本 T121）：以前 OBJ 只读边、加进当前的硬表面里让内核自己长面
// （editor/obj-io.ts parseObjSegments，退役）；现在和 glb 走同一条导入——层级 → 组件、每个网格 → 网格体、导入参数小窗（上方向 / 单位）照用。
// OBJ 本来就存多边形：四边形 / n 边形原样保留（不用像 glb 那样把三角拼回去）。软硬边：每个角的法线（vn）一侧一样 = 平滑；没 vn 看平滑组（s）；都没有按角度。
// 坐标：OBJ 习惯 Y 朝上 → (X, −Z, Y)（同 glb、同老 OBJ 读法）。o / g 换名字 = 新的一个网格节点；文件只有一个 = 它自己就是放进来的那一份。
import type { Pt3 } from "../kernel/kernel.ts";
import { IDENTITY } from "../scene/xform.ts";
import type { ImportMesh, ImportNode, ImportScene } from "./gltf-import.ts";

/** 读 OBJ 文本。name = 文件名（多个对象时外面包一层的名字）。没有任何面 → 抛（人话）。 */
export function readForeignObj(text: string, name: string): ImportScene {
  const V: Pt3[] = [], VN: Pt3[] = [];
  const losses = new Set<string>();
  type Part = { name: string; positions: Pt3[]; normals: (Pt3 | null)[]; key: Map<string, number>; polys: number[][]; groups: number[]; anyNormal: boolean };
  const parts: Part[] = [];
  let cur = null as Part | null, group = 0, pending = name;   // 闭包里改它：别让 TS 把它收窄成 null
  const part = (): Part => { if (!cur) { cur = { name: pending, positions: [], normals: [], key: new Map(), polys: [], groups: [], anyNormal: false }; parts.push(cur); } return cur; };
  const idx = (tok: string, len: number): number => { const i = parseInt(tok, 10); return !Number.isFinite(i) || i === 0 ? -1 : i > 0 ? i - 1 : len + i; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const t = line.split(/\s+/), tag = t[0];
    if (tag === "v") { const X = parseFloat(t[1]), Y = parseFloat(t[2]), Z = parseFloat(t[3]); V.push([X, Y, Z].every(Number.isFinite) ? { x: X, y: -Z, z: Y } : { x: NaN, y: NaN, z: NaN }); }
    else if (tag === "vn") { const X = parseFloat(t[1]), Y = parseFloat(t[2]), Z = parseFloat(t[3]); VN.push({ x: X, y: -Z, z: Y }); }
    else if (tag === "vt") losses.add("贴图坐标（UV）");
    else if (tag === "o" || tag === "g") { pending = t.slice(1).join(" ") || name; if (cur && cur.polys.length) cur = null; else if (cur) cur.name = pending; }
    else if (tag === "s") group = t[1] === "off" || t[1] === "0" ? 0 : parseInt(t[1], 10) || 1;
    else if (tag === "usemtl" || tag === "mtllib") losses.add("材质 / 贴图");
    else if (tag === "l") losses.add("线元素（l，只收面）");
    else if (tag === "f") {
      const P = part(), ring: number[] = [];
      for (const tok of t.slice(1)) {
        const [vs, , ns] = tok.split("/"), vi = idx(vs, V.length), ni = ns ? idx(ns, VN.length) : -1;
        if (vi < 0 || !V[vi] || !Number.isFinite(V[vi].x)) continue;
        const k = `${vi}/${ni}`;
        let j = P.key.get(k);
        if (j === undefined) { j = P.positions.length; P.positions.push(V[vi]); P.normals.push(ni >= 0 && VN[ni] ? VN[ni] : null); if (ni >= 0) P.anyNormal = true; P.key.set(k, j); }
        ring.push(j);
      }
      if (ring.length >= 3) { P.polys.push(ring); P.groups.push(group); }
    }
  }
  const real = parts.filter((p) => p.polys.length);
  if (!real.length) throw new Error("OBJ 里没有面");
  const meshes: ImportMesh[] = real.map((p) => ({ name: p.name, positions: p.positions, tris: [], polys: p.polys, smoothGroups: p.groups, ...(p.anyNormal ? { normals: p.normals } : {}) }));
  const nodes: ImportNode[] = real.map((p, i) => ({ name: p.name, xform: IDENTITY, mesh: i, children: [] }));
  if (nodes.length === 1) return { name, nodes, meshes, roots: [0], losses: [...losses] };
  nodes.push({ name, xform: IDENTITY, mesh: null, children: nodes.map((_, i) => i) });   // 好几个对象：外面包一层，名字 = 文件名（导进来是一个能整体选中的东西）
  return { name, nodes, meshes, roots: [nodes.length - 1], losses: [...losses] };
}
