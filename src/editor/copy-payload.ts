// copy-payload.ts —— 复制模式的几何载荷：被移实体（选区的膜 / 边）抠成快照 → 经本地变换 → absorb 的坐标载荷（提交和预演同一份）。从 editor.ts 搬出来的纯函数。
// created 2026-11-04 by Claude Opus 5.5
import type { EdgeId, FaceId, Kernel, Pt3 } from "../kernel/kernel.ts";
import { extractSnapshot, snapshotLayerPayload, transformSnapshot } from "../scene/scene.ts";
import type { Xform } from "../scene/xform.ts";
import type { CopyPayload } from "./tool-handler.ts";

export function copyPayloadOf(k: Kernel, XL: Xform, entities: { faces: readonly FaceId[]; edges: readonly EdgeId[] }): CopyPayload | null {
  const faces = entities.faces.filter((f) => k.face(f)), edges = entities.edges.filter((e) => k.graph.hasEdge(e));
  if (!faces.length && !edges.length) return null;
  const snap = transformSnapshot(extractSnapshot(k, faces, edges), XL);
  const P = snap.vertices;
  const inFace = new Set<string>();
  for (const f of snap.faces) for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; inFace.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
  const lp = snapshotLayerPayload(snap, P);
  const edgeSegs: Record<string, [Pt3, Pt3][]> = {};
  for (const [n, segs] of Object.entries(lp.edgeSegs)) edgeSegs[n] = segs.map((sg) => [sg.a, sg.b] as [Pt3, Pt3]);
  return {
    faces: snap.faces.map((f) => [f.outer.map((i) => P[i]), ...f.holes.map((h) => h.map((i) => P[i]))]),
    wires: snap.edges.filter(([a, b]) => !inFace.has(a < b ? `${a}-${b}` : `${b}-${a}`)).map(([a, b]) => [P[a], P[b]] as [Pt3, Pt3]),
    edgeSegs,
    faceLayers: lp.faceLayers,
  };
}
