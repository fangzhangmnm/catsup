// 画进三维的撤销栈：混着来回逐字节对（贴图主线 1-8a，施工单 ai-docs/20261111-paint-workorders-12.md「不能破的规矩」第一条）。created 2026-11-11 by Claude Opus 5.5
// 随机「画一笔 / 擦一笔 / 挪点 / 挤出 + 补位置（让画布加高）/ 换材质」，中间插「撤几步再做新的」（截断）；一路撤到头每退一步都和当时一样（模型含贴图坐标 + 每张画的像素），再一路重做回来。几个种子。
// 和 paint-undo.test.ts 拆开（并行全套里各占一条，免得一个文件拖住一条）；架子在 paint-undo-kit.ts。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Op } from "../src/editor/ops.ts";
import { rig, rng } from "./paint-undo-kit.ts";

describe("画进三维的撤销栈：混着来回逐字节对（1-8a）", () => {
  for (const seed of [1, 7, 42]) it(`种子 ${seed}：画 / 擦 / 挪点 / 挤出加高 / 换材质 + 截断，一路撤到头、再一路重做回来，每一步逐字节对`, () => {
    const r = rig(2), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 160, "density"));   // 密度大：画布满得快，挤出会让它加高（按一格多大开的才长大，施工单十六第四节）
    for (const t of texs) r.boards.ensure(r.cur(), t);
    r.plainMat();
    const base = r.h.steps(), states = [r.shot()];
    let grew = 0;
    for (let n = 0; n < 40; n++) {
      const pick = rnd();
      if (pick < 0.12 && r.h.steps() > base) { const k = 1 + Math.floor(rnd() * 3); for (let i = 0; i < k && r.h.steps() > base; i++) r.undo(); states.length = r.h.steps() - base + 1; continue; }   // 撤几步，下一个动作截断
      const def = r.defs[Math.floor(rnd() * r.defs.length)], k = r.cur().mesh(def).kernel;
      if (pick < 0.45) r.stroke([texs[r.defs.indexOf(def)]], rnd);
      else if (pick < 0.55) r.stroke([texs[r.defs.indexOf(def)]], rnd, true);
      else if (pick < 0.68) { const v = k.verts()[Math.floor(rnd() * k.verts().length)], p = k.pt(v); r.commit({ op: "meshMove", def, moves: [{ v, to: { x: p.x + (rnd() - 0.5) * 0.1, y: p.y, z: p.z + (rnd() - 0.5) * 0.1 } }] } as Op); }
      else if (pick < 0.85) {
        const h0 = r.boards.get(texs[r.defs.indexOf(def)])!.height, f = k.faces()[Math.floor(rnd() * k.faces().length)];
        r.commit({ op: "meshExtrude", def, faces: [f], offset: { x: 0, y: 0, z: 0.9 } } as Op);   // 挤得高：新长出来的侧面大，画布很快放不下
        r.commit({ op: "meshLayoutPaint", def } as Op, true);   // 收尾补位置（同一步）：放不下就加高
        if (r.boards.get(texs[r.defs.indexOf(def)])!.height > h0) grew++;
      } else { const f = k.faces()[Math.floor(rnd() * k.faces().length)]; r.commit({ op: "meshPaintFaces", def, faces: [f], material: rnd() < 0.5 ? r.plainMat() : r.paintMat(def) } as Op); }
      if (r.h.steps() - base + 1 === states.length) { eq(r.shot(), states[states.length - 1], "什么都没改的动作（在空白处擦）不长一步，也一个字节不变"); continue; }
      states.push(r.shot());
      eq(states.length, r.h.steps() - base + 1, "一个动作 = 一步");
    }
    for (let i = states.length - 1; i > 0; i--) { r.undo(); eq(r.shot(), states[i - 1], `撤到第 ${i - 1} 步`); }
    for (let i = 1; i < states.length; i++) { r.redo(); eq(r.shot(), states[i], `重做到第 ${i} 步`); }
    console.log(`    种子 ${seed}：${states.length - 1} 步，加高 ${grew} 次`);
    assert(grew > 0, `种子 ${seed}：混的动作里要有让画布加高的（这次 ${grew} 次）`);
  });
});

