// format/entry-canon.ts —— 组件定义的规范形：「同一个条目两边分叉了没有」靠它比（设计书 ai-docs/20261104-identity-layer-design.md §7）。身份还是 GUID，这里不当身份、不去重（10-30 否决的是内容哈希当身份）。created 2026-11-04 by Claude Opus 5.5（ID-4b）
// 构造：从整份文件形状出发，**只**规范化已知「存盘重开会乱序」或「只是代号」的部分，其余字段原样：
//   硬表面快照走写盘那一份规范序（brep-codec canonicalize：点 / 边 / 环 / 洞）+ 写盘的量化（坐标按 µm）；
//   槽号换成材质 GUID（槽表只是代号对照表，不单独比）；层代号换成层 GUID（各文件的层表各编各的）；组按 GUID 排（列表顺序没有语义）。
// 不比的只有两种派生量，都由点决定，且写盘后读回会被归一化挪一点（挪 2^-30 量级，比了就是假的「不一样」）：面的平面（点在面上、环的方向是数据）；圆弧的法向 / x 轴。
// 不加坐标公差：写盘怎么量化就怎么比。实例顺序是数据（同级先后），不排。extras 运行时不持有，比不了，不进比较。
// 没见过的字段走 ...rest 进比较：漏了 = 判不一样 = 多问一次（user 拍「弹窗」的那条线），不会静默吞改动。
import { canonicalize, toUm } from "./brep-codec.ts";
import { linearToSrgb, srgbToLinear } from "./color-space.ts";
import type { BrepSnapshot, Pt3 } from "../kernel/kernel.ts";
import type { Guid } from "../identity/guid.ts";
import type { DefinitionDoc, MaterialDoc, MeshDoc } from "./document.ts";

const byKey = <T>(xs: readonly T[], key: (x: T) => string): T[] => { const keyed = xs.map((x) => [key(x), x] as const); keyed.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)); return keyed.map((k) => k[1]); };
const MATERIAL_LAYERS = new Set(["material", "materialBack"]);
const um = (p: Pt3): readonly [number, number, number] => [toUm(p.x), toUm(p.y), toUm(p.z)];

function canonBrep(snap: BrepSnapshot, slotGuid: (slot: number) => Guid | null): unknown {
  const { vertices: _v, edges: _e, planes: _p, faces: _f, edgeLayers: _el, faceLayers: _fl, curves: _c, ...rest } = snap;   // rest = 将来加的字段
  const c = canonicalize(snap), layers = Object.entries(c.faceLayers ?? {});
  const faces = c.faces.map((f, i) => {
    const on: Record<string, unknown> = {};
    for (const [name, values] of layers) { const v = values[i]; if (v >= 0) on[name] = MATERIAL_LAYERS.has(name) ? slotGuid(v) : v; }
    return { outer: f.outer, holes: f.holes, layers: on };
  });
  const curves = (c.curves ?? []).map((cv) => { if (!cv.params) return cv; const { center, radius, normal: _n, xaxis: _x, ...more } = cv.params; return { ...cv, params: { ...more, center: um(center), radius: toUm(radius) } }; });
  return { ...rest, vertices: c.vertices.map(um), edges: c.edges, faces: byKey(faces, (f) => f.outer.join()), edgeLayers: c.edgeLayers ?? {}, curves };
}

/** 网格体：点的下标原样（可能有重合的点，按坐标认会把「焊了」和「没焊」判成一样）；面从最小下标起转、面和边标记排序（存盘重开只会换这两样的序）。 */
function canonMesh(m: MeshDoc, slotGuid: (slot: number) => Guid | null): unknown {
  const { faceStart, faceLen, loopVert, faceMat, faceFlags, edgePairs, edgeFlags, ...rest } = m;
  const rotated = (ring: number[]): number[] => { let at = 0; for (let i = 1; i < ring.length; i++) if (ring[i] < ring[at]) at = i; return [...ring.slice(at), ...ring.slice(0, at)]; };
  const faces = Array.from(faceStart, (start, i) => ({ ring: rotated(Array.from(loopVert.subarray(start, start + faceLen[i]))), mat: faceMat[i] >= 0 ? slotGuid(faceMat[i]) : null, flags: faceFlags[i] }));
  const edges = Array.from(edgeFlags, (flags, i) => { const a = edgePairs[2 * i], b = edgePairs[2 * i + 1]; return { a: Math.min(a, b), b: Math.max(a, b), flags }; });
  return { ...rest, faces: byKey(faces, (f) => f.ring.join(",")), edges: byKey(edges, (e) => `${e.a},${e.b}`) };
}

export function canonDefinition(d: DefinitionDoc, layerGuid: (code: number) => Guid | undefined): unknown {
  const { materialSlots, extras: _extras, kind, mesh, brep, groups, guides, instances, ...rest } = d;
  void _extras;
  const slotGuid = (slot: number): Guid | null => materialSlots[slot] ?? null;
  const placed = instances.map((i) => { const { layer, ...r } = i; return layer === undefined ? r : { ...r, layer: layerGuid(layer) ?? null }; });
  if (kind === "mesh" && mesh) return { ...rest, kind, mesh: canonMesh(mesh, slotGuid), instances: placed };   // 网格体的 brep / groups / guides 是空占位
  return { ...rest, kind: kind ?? "brep", brep: canonBrep(brep, slotGuid), guides, instances: placed, groups: byKey(groups.map((g) => { const { brep: b, ...gr } = g; return { ...gr, brep: canonBrep(b, slotGuid) }; }), (g) => g.guid) };
}

/** 材质：整条逐字比（名字 / 贴图字节 ……），颜色先走一遍写盘那道色彩空间换算（来回有 1e-16 的浮点噪声，存过一次之后不再变；不走 = 一边存过一边没存就判不一样）。 */
export const canonMaterial = (m: MaterialDoc): unknown => ({ ...m, color: m.color.map((c) => linearToSrgb(srgbToLinear(c))) });
