#!/usr/bin/env node
// scripts/replay-repro.mjs —— 回放复现包（src/app/repro-box.ts 导出的 JSON）：每条 = 那一步之前的活动池 B-rep + op / 预演描述。
// 用法：node scripts/replay-repro.mjs <pack.json> [index]   → 逐条 Kernel.fromBrep → 重跑，打印成功 / 内核拒绝的理由（与真机一致 = 复现成功）。
// created 2026-10-24 by Claude Fable 5.1
import { readFileSync } from "node:fs";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, describeOp, resolveFace } from "../src/editor/ops.ts";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/replay-repro.mjs <pack.json> [index]"); process.exit(2); }
const pack = JSON.parse(readFileSync(file, "utf8"));
const only = process.argv[3] !== undefined ? Number(process.argv[3]) : null;
const list = pack.entries ?? [];
console.log(`复现包：${pack.app} ${pack.version} · ${list.length} 条 · 导出于 ${pack.exported}`);
list.forEach((e, i) => {
  if (only !== null && i !== only) return;
  const k = Kernel.fromBrep(e.brep);
  console.log(`\n#${i} ${e.t} ${e.version} [${e.where}] 原始拒绝：${e.message}`);
  console.log(`  活动池：${k.vertices().length} 顶点 / ${k.edges().length} 边 / ${k.faces().length} 面`);
  try {
    if (e.op) {
      const s = new Scene(k);
      const op = { ...e.op, at: { def: s.root, group: null } };
      console.log(`  重跑 op：${describeOp(op)}`);
      const r = applyOp(s, op);
      console.log(`  → 成功 ${r.events.length} 个事件（真机拒绝、本机通过 = 环境差异 / 已修）`);
    } else if (e.preview) {
      const p = e.preview;
      console.log(`  重跑预演：${JSON.stringify(p).slice(0, 200)}`);
      if (p.tool === "pp" && p.face && typeof p.h === "number") {
        const fid = resolveFace(k, p.face);
        const ev = k.pushPull(fid, p.h, { settleLanding: false });
        console.log(`  → 推拉成功 ${ev.length} 个事件`);
      } else if ((p.tool === "line" || p.tool === "rect" || p.tool === "circle") && Array.isArray(p.segs)) {
        const ev = k.addEdges(p.segs.map(([a, b]) => [a, b]), p.tool === "circle" ? { curve: true } : undefined);
        console.log(`  → 加边成功 ${ev.length} 个事件`);
      } else {
        console.log("  （这种预演还没有回放器：看描述手搓）");
      }
    }
  } catch (err) {
    console.log(`  → 本机同样拒绝：${err instanceof Error ? err.message : String(err)}   ✓ 复现`);
  }
});
