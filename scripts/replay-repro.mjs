#!/usr/bin/env node
// scripts/replay-repro.mjs —— 回放复现包（src/app/repro-box.ts 导出的 JSON）：每条 = 那一步之前的活动池 B-rep + op / 预演描述。
// 用法：node scripts/replay-repro.mjs <pack.json> [index]   → 逐条 Kernel.fromBrep → 重跑，打印成功 / 内核拒绝的理由（与真机一致 = 复现成功）。
// created 2026-10-24 by Claude Fable 5.1
// 2026-11-10（Claude Opus 5.5，贴图主线 1-0½；统筹定）：复现包是调试用的衍生物，不做向后兼容——
//   · 包的版本和本机不一样：先说一句；
//   · 旧形状的「加材质」（带 texture，v0.19.3 及以前）：拒绝那一条、说清是哪一条为什么，整个重放停下（不跳过接着放：后面的都建在它上面）；
//   · 「加贴图」的图字节进包时被 JSON 变成了 {"0":…,"1":…} 的对象（和以前「加材质」的图一样，没转 base64）：这里转回字节再放。
import { readFileSync } from "node:fs";
import { APP_VERSION } from "../src/version.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, describeOp, resolveFace } from "../src/editor/ops.ts";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/replay-repro.mjs <pack.json> [index]"); process.exit(2); }
const pack = JSON.parse(readFileSync(file, "utf8"));
const only = process.argv[3] !== undefined ? Number(process.argv[3]) : null;
const list = pack.entries ?? [];
console.log(`复现包：${pack.app} ${pack.version} · ${list.length} 条 · 导出于 ${pack.exported}`);
if (pack.version !== APP_VERSION) console.log(`注意：包是 ${pack.version} 导出的，本机是 ${APP_VERSION}。中间指令的形状改过的话，那几条重放不了（复现包不做向后兼容），会说是哪一条。`);
/** 指令和它里面的子指令（batch.ops）都走一遍。 */
const walk = (op, f) => { f(op); for (const sub of Array.isArray(op.ops) ? op.ops : []) walk(sub, f); };
const legacyMaterial = (op) => { let hit = null; walk(op, (o) => { if (!hit && o.op === "addMaterial" && o.texture !== undefined) hit = o; }); return hit; };
const reviveBytes = (op) => walk(op, (o) => { if (o.op === "addTexture" && o.bytes && !(o.bytes instanceof Uint8Array)) o.bytes = Uint8Array.from(Object.values(o.bytes)); });
for (let i = 0; i < list.length; i++) {
  const e = list[i];
  if (only !== null && i !== only) continue;
  const old = e.op ? legacyMaterial(e.op) : null;
  if (old) {
    console.log(`\n#${i} 停：这一条里有旧形状的「加材质」（「${old.name}」把图直接装在材质里；v0.19.4 起图先 addTexture、材质用 channels 指它）。这一条重放不了，后面的都建在它上面，整个重放到此为止。`);
    process.exitCode = 1;
    break;
  }
  if (e.op) reviveBytes(e.op);
  const k = Kernel.fromBrep(e.brep);
  console.log(`\n#${i} ${e.t} ${e.version} [${e.where}] 原始理由：${e.message}`);
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
}
