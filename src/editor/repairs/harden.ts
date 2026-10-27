// repairs/harden.ts —— 修复「折得很厉害的软边变硬」（纪元排期 T9）：弯折 > deg 却还标着软 / 平滑的边 → 变硬
// （user 10-26 旧文件案：折 90° 的软边 = 墙上渐变 + 画线描不上）。2026-10-26 Claude Opus 5.5 从 editor.ts 搬成模块；执行走核心指令 setEdgeLayers。
import type { EdgeId } from "../../kernel/kernel.ts";
import { edgeKey } from "../ops.ts";
import type { RepairModule } from "./repair.ts";

export const harden: RepairModule = {
  id: "harden",
  title: "折得很厉害的软边变硬",
  panel: { on: true, label: () => "折得很厉害的软边变硬" },
  defaults: () => ({ deg: 60 }),
  fields: () => [{ key: "deg", def: { kind: "number", label: "弯折大于", min: 20, max: 179, step: 1, unit: "°" } }],
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at), deg = Number(v.deg) || 60;
    const pool = new Set<EdgeId>();
    if (sel) { for (const e of sel.edges) pool.add(e); for (const f of sel.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const d of r.edges) pool.add(d.edge); } }
    else for (const e of k.edges()) pool.add(e.id);
    const hit = [...pool].filter((e) => { if (!k.graph.hasEdge(e) || !(k.isSoft(e) || k.isSmooth(e))) return false; const b = k.bendDeg(e); return b !== null && b > deg; });
    return hit.length ? { ops: [{ op: "setEdgeLayers", at, edges: hit.map((e) => edgeKey(k, e)), layers: ["soft", "smooth"], on: false }], count: hit.length } : { ops: [], count: 0 };
  },
  done: (n) => `把 ${n} 条折得很厉害的软边变硬了`,
  none: "没有折得很厉害的软边",
  menu: { icon: "sharpen", label: (n) => `折得很厉害的软边变硬（${n}）` },
};
