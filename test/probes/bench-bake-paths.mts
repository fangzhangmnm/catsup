// test/probes/bench-bake-paths.mts —— 两条烤路先量再做（计划书 §9.2-G「两条烤路合一，先量再做」）。created 2026-11-06 by Claude Opus 5.5
// A = 现在的 bakeDefinition（快照直接烤）；B = 合一的候选：快照 → Kernel → brepToMesh → meshDocFromKernel → bakeMesh。只读、不改任何东西。
// 用法：node test/probes/bench-bake-paths.mts
import { Kernel } from "../../src/kernel/kernel.ts";
import type { BrepSnapshot } from "../../src/kernel/kernel.ts";
import { bakeDefinition, bakeMesh, mergeBrep, type BakeMaterials } from "../../src/format/bake.ts";
import { canonicalize } from "../../src/format/brep-codec.ts";
import { writeCatsup, newDocument } from "../../src/format/index.ts";
import { brepToMesh } from "../../src/scene/kinds.ts";
import { meshDocFromKernel } from "../../src/mesh/mesh-doc.ts";
import { emptyGuides } from "../../src/scene/guides.ts";
import { BUILTIN_BACK_SLOT } from "../../src/scene/builtin-materials.ts";
import { SCENES } from "../format-scenes.ts";

const copies = (s: BrepSnapshot, n: number): BrepSnapshot => {
  const side = Math.ceil(Math.sqrt(n)), pad = 20, parts: BrepSnapshot[] = [];
  for (let i = 0; i < n; i++) {
    const dx = (i % side) * pad, dy = Math.floor(i / side) * pad;
    parts.push({ ...s, vertices: s.vertices.map((v) => ({ x: v.x + dx, y: v.y + dy, z: v.z })), planes: s.planes.map((p) => ({ n: p.n, d: p.d + dx * p.n.x + dy * p.n.y })) } as BrepSnapshot);
  }
  return mergeBrep(parts);
};
/** 点过「自动朝外」之后的样子：背面那一侧 = 内置默认背面（槽 0），一张面只出一侧。 */
const oneSided = (s: BrepSnapshot): BrepSnapshot => ({ ...s, faceLayers: { ...(s.faceLayers ?? {}), materialBack: s.faces.map(() => 0) } } as BrepSnapshot);

interface Sink { add(b: Uint8Array): number; total: number; n: number }
const newSink = (): Sink => ({ total: 0, n: 0, add(b) { this.total += b.byteLength; return this.n++; } });
const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const timed = (f: () => void, runs: number): number => { const t: number[] = []; for (let i = 0; i < runs; i++) { const a = performance.now(); f(); t.push(performance.now() - a); } return median(t); };
const triCount = (r: { accessors: Record<string, unknown>[]; mesh: Record<string, unknown> }): number => {
  let n = 0;
  for (const p of r.mesh.primitives as Record<string, unknown>[]) {
    if (p.mode !== 4) continue;
    if (typeof p.indices === "number") n += (r.accessors[p.indices].count as number) / 3;
    else n += (r.accessors[(p.attributes as Record<string, number>).POSITION].count as number) / 3;
  }
  return n;
};

const scenes: [string, BrepSnapshot, boolean][] = [];
const box = canonicalize(SCENES.box().toBrep()), cyl = canonicalize(SCENES.cylinder().toBrep()), holed = canonicalize(SCENES.holed().toBrep());
for (const n of [100, 1000]) scenes.push([`盒子 × ${n}（两侧默认）`, copies(box, n), false]);
for (const n of [100, 1000]) scenes.push([`盒子 × ${n}（单面）`, oneSided(copies(box, n)), true]);
for (const n of [50, 300]) scenes.push([`圆柱 × ${n}（平滑，两侧默认）`, copies(cyl, n), false]);
for (const n of [50, 300]) scenes.push([`圆柱 × ${n}（平滑，单面）`, oneSided(copies(cyl, n)), true]);
scenes.push([`带洞的面 × 300（两侧默认）`, copies(holed, 300), false]);

const rows: string[] = [];
for (const [name, snap, single] of scenes) {
  const slots = single ? [BUILTIN_BACK_SLOT] : [];
  const mats: BakeMaterials = { slotToCore: () => undefined, sizeOfCore: () => null, isBack: (s) => single && s === 0 };
  const runs = snap.faces.length > 5000 ? 3 : 7;
  let aBytes = 0, aTris = 0;
  const aMs = timed(() => { const sink = newSink(), r = bakeDefinition(snap, sink, 0, mats); aBytes = sink.total; aTris = triCount(r); }, runs);
  let kernel!: Kernel, body!: ReturnType<typeof brepToMesh>, doc!: ReturnType<typeof meshDocFromKernel>;
  const fromMs = timed(() => { kernel = Kernel.fromBrep(snap); }, runs);
  if (single) kernel.faceLayers.backSlot = 0;
  const castMs = timed(() => { body = brepToMesh({ kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: slots, guides: emptyGuides() }); }, runs);
  const docMs = timed(() => { doc = meshDocFromKernel(body.kernel); }, runs);
  let bBytes = 0, bTris = 0;
  const bakeMs = timed(() => { const sink = newSink(), r = bakeMesh(doc, sink, 0, mats); bBytes = sink.total; bTris = triCount(r); }, runs);
  const wholeMs = timed(() => { writeCatsup(newDocument(snap, "t")); }, Math.min(runs, 3));
  const bMs = fromMs + castMs + docMs + bakeMs;
  rows.push(`| ${name} | ${snap.faces.length} | ${aTris}/${bTris} | ${aMs.toFixed(1)} | ${bMs.toFixed(1)} (${fromMs.toFixed(1)}+${castMs.toFixed(1)}+${docMs.toFixed(1)}+${bakeMs.toFixed(1)}) | ${(bMs / Math.max(aMs, 0.01)).toFixed(1)}× | ${(aBytes / 1024).toFixed(0)} | ${(bBytes / 1024).toFixed(0)} | ${(bBytes / Math.max(aBytes, 1)).toFixed(2)}× | ${wholeMs.toFixed(0)} |`);
  console.log(rows[rows.length - 1]);
}
console.log("\n场景 | 面数 | 三角 A/B | A ms | B ms（fromBrep+cast+doc+bake）| B/A | A KB | B KB | B/A | 现在整份 write ms");
