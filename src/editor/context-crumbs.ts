// editor/context-crumbs.ts —— 上下文人话 / 面包屑：纯场景查询（从 editor.ts 切出来，施工单十六 2026-11-11 by Claude Opus 5.5；原样搬，算法没改）。
import type { EditContext, Scene } from "../scene/scene.ts";

/** 上下文人话：「根」/「组件 名 › 组」。 */
export function contextLabelOf(scene: Scene, ctx: EditContext): string {
  const parts: string[] = [];
  let def = scene.root;
  for (const iid of ctx.chain) { const inst = scene.instance(def, iid); def = inst.def; parts.push(`组件「${scene.def(def).name}」`); }
  if (ctx.group !== null) parts.push("组");
  return parts.length ? parts.join(" › ") : "根";
}
/** 面包屑（#25）：根 › 组件「名」› 组 › …；depth = 点它要退到的层数。 */
export function contextCrumbsOf(scene: Scene, ctx: EditContext): { label: string; depth: number }[] {
  const out: { label: string; depth: number }[] = [{ label: "根", depth: 0 }];
  let def = scene.root, depth = 0;
  for (const iid of ctx.chain) { const inst = scene.instance(def, iid); def = inst.def; depth++; out.push({ label: `组件「${scene.def(def).name}」`, depth }); }
  if (ctx.group !== null) {
    const chain: number[] = []; let g: number | null = ctx.group; const d = scene.defOfContext(ctx);
    while (g !== null) { chain.unshift(g); g = scene.group({ def: d, group: g }).parent; }
    for (const gid of chain) { depth++; out.push({ label: scene.group({ def: d, group: gid }).name ?? "组", depth }); }
  }
  return out;
}
