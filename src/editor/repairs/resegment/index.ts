// repairs/resegment —— 修复「改段数」（回转体重新细分，DT94）：规划在 plan.ts；插件指令 "resegment" 执行时再认一遍，按新段数造快照，删旧的、粘新的。
// created 2026-10-26 by Claude Opus 5.5（user「多段圆柱 可以……反正先做试一下，大不了以后改」「记住可以，没必要提示」）
import type { FaceEvent, FaceId } from "../../../kernel/kernel.ts";
import { absorbSnapshot } from "../../../scene/scene.ts";
import { ptKey3, quantize3 } from "../../../kernel/geom.ts";
import { SEGMENT_TIERS, SEG_MAX, chordHeight, clampSegments, fmtTolerance, tierSegments } from "../../segment-ref.ts";
import { faceKey, poolOf, registerOpPlugin, resolveFace, type FaceKey } from "../../ops.ts";
import { fmtLen } from "../../units.ts";
import type { Command, Params } from "../../commands/command.ts";
import { type RevolvedBody, findRevolved, revolvedSnapshot } from "./plan.ts";

/** 段数怎么定：固定段数，或者按 3D 打印档（弦高公差，按每个回转体的最大半径各自算）。 */
interface ResegmentArgs { faces: FaceKey[]; segments: number; tier?: string }
const PRINT = SEGMENT_TIERS.find((t) => t.chordMm !== undefined);
const targetFor = (b: RevolvedBody, a: { segments: number; tier?: string }): number => {
  const t = a.tier ? SEGMENT_TIERS.find((x) => x.id === a.tier) : undefined;
  return clampSegments(t ? tierSegments(t, Math.max(...b.rings.map((r) => r.r))) : a.segments, false);
};

registerOpPlugin("resegment", {
  apply(s, at, a0) {
    const a = a0 as unknown as ResegmentArgs, { kernel } = poolOf(s, at);
    const scope = a.faces.length ? new Set<FaceId>(a.faces.map((f) => resolveFace(kernel, f))) : null;
    const events: FaceEvent[] = [];
    for (const b of findRevolved(kernel, scope).bodies) {
      const N = targetFor(b, a);
      if (N === b.segments) continue;
      const snap = revolvedSnapshot(b, N, kernel.coplanarTol);
      events.push(...kernel.eraseFaces(b.faces));
      const left = b.edges.filter((e) => kernel.graph.hasEdge(e));
      if (left.length) events.push(...kernel.eraseEdges(left));
      events.push(...absorbSnapshot(kernel, snap));
      // 粘的时候结算机会给没主的圈内区域长面（台阶那一圈里面原来是被推上去的、没有面）：点全是新几何的点、却不在新快照里的面 = 多长的，删掉
      const pk = (p: { x: number; y: number; z: number }): string => ptKey3(quantize3(p));
      const mine = new Set(snap.vertices.map(pk)), fkey = (pts: readonly { x: number; y: number; z: number }[]): string => pts.map(pk).sort().join(";");
      const expected = new Set(snap.faces.map((f) => fkey(f.outer.map((i) => snap.vertices[i]))));
      const extra = kernel.faces().filter((f) => { const o = kernel.faceRings3(f.id)!.outer; return o.every((p) => mine.has(pk(p))) && !expected.has(fkey(o)); }).map((f) => f.id);
      if (extra.length) events.push(...kernel.eraseFaces(extra));
    }
    return { scene: s, events };
  },
  describe: (a0) => { const a = a0 as unknown as ResegmentArgs; return `${a.faces.length ? `sel=${a.faces.length}` : "all"} → ${a.tier ?? a.segments}`; },
});

/** 下拉：常用段数（带上参考档的名字）+ 3D 打印档（按弦高、各自的半径算）。 */
const COMMON = [8, 12, 16, 24, 32, 48, 64, 96].filter((n) => n <= SEG_MAX);
const choiceOf = (v: Params): { segments: number; tier?: string } => {
  const id = String(v.segments ?? "24");
  return PRINT && id === PRINT.id ? { segments: 24, tier: PRINT.id } : { segments: Number(id) || 24 };
};

export const resegment: Command = {
  id: "brep.resegment",
  title: "改段数",
  defaults: (ctx) => ({ segments: String(ctx.circleSegments()) }),
  params: (ctx) => {
    const cur = ctx.circleSegments(), nums = [...new Set([...COMMON, cur])].sort((a, b) => a - b);
    const name = (n: number): string => { const t = SEGMENT_TIERS.find((x) => x.segments === n); return t ? ` · ${t.name}` : ""; };
    return [{ key: "segments", def: { kind: "enum", label: "段数", values: [...nums.map((n) => ({ id: String(n), label: `${n} 段${name(n)}` })), ...(PRINT ? [{ id: PRINT.id, label: `${PRINT.name} · ${PRINT.typical}（按各自的半径算）` }] : [])] } }];
  },
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at);
    let scope: Set<FaceId> | null = null;
    if (sel) { scope = new Set([...sel.faces].filter((f) => k.face(f))); for (const e of sel.edges) if (k.graph.hasEdge(e)) for (const f of k.graph.edge(e).faceLinks) scope.add(f); if (!scope.size) return { ops: [], count: 0 }; }
    const { bodies, notClean } = findRevolved(k, scope), choice = choiceOf(v);
    const todo = bodies.filter((b) => targetFor(b, choice) !== b.segments);
    const notes: string[] = [];
    if (notClean) notes.push(`${notClean} 个看着像回转体、但和别的几何粘着（或侧面涂了不同颜色），没改`);
    if (bodies.length) {
      const big = bodies.reduce((x, y) => (Math.max(...y.rings.map((r) => r.r)) > Math.max(...x.rings.map((r) => r.r)) ? y : x)), R = Math.max(...big.rings.map((r) => r.r)), N = targetFor(big, choice);
      notes.push(`最大的半径 ${fmtLen(R)}：${N} 段 → 弦高 ${fmtTolerance(chordHeight(R, (2 * Math.PI) / N))}`);
    }
    if (!todo.length) return { ops: [], count: 0, notes };
    const args: ResegmentArgs = { faces: scope ? [...scope].map((f) => faceKey(k, f)) : [], ...choice };
    return { ops: [{ op: "plugin", name: "resegment", at, args: args as unknown as Record<string, unknown> }], count: todo.length, notes };
  },
  done: (n, _e, v) => { const c = choiceOf(v); return `${n} 个回转体改成了${c.tier ? ` ${PRINT?.name ?? c.tier} 档` : ` ${c.segments} 段`}`; },
  none: "回转体都已经是这个段数（右下角挑别的段数）",
  // 菜单：范围里有几个干净的回转体（不管段数）
  quickCount(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at);
    const scope = sel ? new Set([...sel.faces].filter((f) => k.face(f))) : null;
    if (scope && !scope.size) return 0;
    return findRevolved(k, scope).bodies.length;
  },
  offerAlways: true,
};
