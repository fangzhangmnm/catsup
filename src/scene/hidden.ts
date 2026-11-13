// scene/hidden.ts —— 整个场景里藏着什么、全部放回来（DT49 的「全部显示」）：每种身体怎么藏只在这里认一次。created 2026-11-13 by Claude Opus 5.5
// 起因（统筹 11-13 清点 a）：数藏了几样（视图菜单「全部显示（N）」）和全部放回来（op unhideAll）两处各自写了一遍「只看硬表面」，网格体藏着的面数不到、放不回来。
// 现在两处都走这一个文件：加一种身体 = 这里各加一个分支（守卫 test/hide.test.ts「每种身体都认」）。
// 组件份数（实例 hidden）跟身体种类无关；面 / 边：硬表面 = 面层 / 边层 hidden（根池 + 每个组的池），网格体 = 保留列 hide_poly / hide_edge。
import type { Scene } from "./scene.ts";
import type { BodyKind } from "./body-kind.ts";
import { HIDE_EDGE, edgeColumn, hiddenColumn, setEdgeMark, setFaceHidden } from "../mesh/reserved-columns.ts";

export interface HiddenCount { instances: number; faces: number; edges: number }
/** 每种身体：数藏着的面 / 边、全部放回来。 */
const BY_KIND: Readonly<Record<BodyKind, { count(s: Scene, def: number, c: HiddenCount): void; show(s: Scene, def: number): void }>> = {
  brep: {
    count(s, def, c) { const b = s.brep(def); for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) { for (const f of k.faces()) if (k.isFaceHidden(f.id)) c.faces++; for (const e of k.edges()) if (k.isEdgeHidden(e.id)) c.edges++; } },
    show(s, def) {
      const b = s.brep(def);
      for (const k of [b.kernel, ...[...b.groups.values()].map((g) => g.kernel)]) {
        const fs = k.faces().filter((f) => k.isFaceHidden(f.id)).map((f) => f.id), es = k.edges().filter((e) => k.isEdgeHidden(e.id)).map((e) => e.id);
        if (fs.length) k.setFaceHidden(fs, false);
        if (es.length) k.setEdgeLayer("hidden", es, false);
      }
    },
  },
  mesh: {
    count(s, def, c) { const m = s.mesh(def).kernel, fc = hiddenColumn(m), ec = edgeColumn(m, HIDE_EDGE); if (fc) for (const f of m.faces()) if (fc.data[f] === 1) c.faces++; if (ec) for (const e of m.edges()) if (ec.data[e] === 1) c.edges++; },
    show(s, def) {
      const m = s.mesh(def).kernel, fc = hiddenColumn(m), ec = edgeColumn(m, HIDE_EDGE);
      if (fc) for (const f of m.faces()) if (fc.data[f] === 1) setFaceHidden(m, f, false);
      if (ec) for (const e of m.edges()) if (ec.data[e] === 1) setEdgeMark(m, e, HIDE_EDGE, false);
    },
  },
};
/** 整个场景里藏着的：组件份数 + 面 + 边（视图菜单「全部显示（N）」）。 */
export function hiddenCount(s: Scene): HiddenCount {
  const c: HiddenCount = { instances: 0, faces: 0, edges: 0 };
  for (const d of s.defs.values()) { for (const i of d.instances.values()) if (i.hidden) c.instances++; BY_KIND[d.body.kind].count(s, d.id, c); }
  return c;
}
/** 全部放回来（op unhideAll 的身子；改的是传进来的场景）。 */
export function showEverything(s: Scene): void {
  for (const d of s.defs.values()) { for (const i of d.instances.values()) delete i.hidden; BY_KIND[d.body.kind].show(s, d.id); }
}
