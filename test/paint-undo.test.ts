// 画的每一步进三维的撤销栈（贴图主线 1-8a，施工单 ai-docs/20261111-paint-workorders-12.md + 统筹 11-11 裁定）。created 2026-11-11 by Claude Opus 5.5
// node 里用真的 History、真的画板登记处、画画内核的软件显卡；编辑器做的那几件事照样串起来：每条指令提交之后 follow + 把内核封的步挂进这一步（afterCommit）、
// 一笔 = 落层之后 commitRecords 一步（commitStep）、每次之后 sync（每帧的「准备」）。一笔 = 交给档口一块矩形色块当薄层（像素进出照样走内核）。
// ① 混着来回逐字节对：随机「画一笔 / 擦一笔 / 挪点 / 挤出 + 补位置（让画布加高）/ 换材质」，中间插「撤几步再做新的」（截断）；一路撤到头每退一步都和当时一样，再一路重做回来。几个种子。
// ② 一笔画到两张贴图：一次撤销两张都退；第二张翻不成（问的时候说不能 / 翻的时候抛）= 什么都没动；翻回去也抛 = 那张画的步作废、记录摘掉、说出来。
// ③ 额度：最老的步被挤掉时内核那边活着的步数跟着减；画没了的画板歇着，栈里没有它的记录了才扔。
// ④ 画布加高那一步：挤出让画布加高，撤销之后画板和贴图坐标都缩回去，再重做回来；加高之后在新的行上画过、又撤销到加高之前也缩得回去。
// ⑤ 统筹点的两个例子：开始画 → 画一笔 → 撤两下 → 重做两下；删掉画着的物件（清理掉定义）再撤销回来，画和它之前的每一步都还能撤。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoards, PAINT_UNDO_KIND, type PaintRec } from "../src/paint/boards.ts";
import { History, StepFlipError, type UndoComponent } from "../src/editor/history.ts";
import { Scene } from "../src/scene/scene.ts";
import type { Op } from "../src/editor/ops.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { translation } from "../src/scene/xform.ts";
import { mintGuid } from "../src/format/guid.ts";
import { sceneBox, sceneFingerprint } from "./format-scenes.ts";

const hash = (u: Uint8Array): string => { let h = 2166136261; for (let i = 0; i < u.length; i++) { h ^= u[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const rng = (seed: number) => { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };

function rig(nMesh = 1, opts: { quota?: number } = {}) {
  const s0 = new Scene(sceneBox(2, 1.5)), defs: number[] = [];
  for (let i = 0; i < nMesh; i++) { const d = s0.mintDef(`画盒${i}`, sceneBox(1, 1)); d.body = brepToMesh(s0.brep(d.id)); s0.mintInstance(s0.root, null, d.id, translation({ x: 3 + 2 * i, y: 0, z: 0 })); defs.push(d.id); }
  const port = new SoftGl2Port(), resets: string[] = [];
  let h!: History<string>;
  const boards = new PaintBoards({ port: () => port, epoch: () => 0, undoReset: (tex, why, tell) => { resets.push(`${tex.slice(0, 4)} ${tell ? "说了" : "没说"} ${why}`); h.dropRecords(PAINT_UNDO_KIND, (d) => (d as PaintRec).texture === tex); } });
  h = new History<string>(s0, opts.quota ? { quotaBytes: opts.quota } : undefined);
  h.registerComponent(boards.undoComponent() as unknown as UndoComponent);
  const cur = (): Scene => (h as unknown as { current: Scene }).current;
  const afterCommit = (): void => { boards.follow(cur()); for (const r of boards.takePending()) h.record(PAINT_UNDO_KIND, r); };   // 编辑器 commitIn 的收尾（main.ts paintAfterCommit）
  const commit = (op: Op, join = false): void => { h.commit(cur(), op, join, "b", { title: op.op }); afterCommit(); boards.sync(cur()); };
  const textures: string[] = [], paintMatGuid = new Map<number, string>();
  let plain = -1;
  const startPaint = (def: number, density = 8): string => {
    const tex = mintGuid(), mat = mintGuid();
    commit({ op: "startPaint", def, faces: cur().mesh(def).kernel.faces(), uvSet: mintGuid(), textureGuid: tex, materialGuid: mat, names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.9, 0.85, 0.7], density } as Op);
    textures.push(tex); paintMatGuid.set(def, mat);
    return tex;
  };
  /** 这个物件自己那张画的材质（按身份号找：几个物件的画材质都叫「画」）。 */
  const paintMat = (def: number): number => cur().materials.findIndex((m) => m.guid === paintMatGuid.get(def));
  /** 一笔（可以同时画到几张贴图）：每张一个档口、交一块矩形色块当薄层、落层；攒着的步交给三维的栈当一步（编辑器 commitRecordsStep）。 */
  const stroke = (texs: string[], rnd: () => number, erase = false): void => {
    const ss = texs.map((tex) => {
      const b = boards.ensure(cur(), tex), W = b.width, H = b.height, s = b.openStroke(), layerId = b.wp.layerTree!.view().activeId!;
      const bw = 1 + Math.floor(rnd() * Math.min(24, W - 1)), bh = 1 + Math.floor(rnd() * Math.min(12, H - 1)), bx = Math.floor(rnd() * (W - bw)), by = Math.floor(rnd() * (H - bh));
      const px = new Uint8Array(W * H * 4), c = [Math.floor(rnd() * 255), Math.floor(rnd() * 255), Math.floor(rnd() * 255)], a = 120 + Math.floor(rnd() * 135);
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) { const o = (y * W + x) * 4; px[o] = (c[0] * a) / 255; px[o + 1] = (c[1] * a) / 255; px[o + 2] = (c[2] * a) / 255; px[o + 3] = a; }
      s.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: H, prec: "u8" }), bx, by, bw, bh, layerId, opacity: 1, erase, blendMode: "source-over" }]);
      return s;
    });
    for (const s of ss) s.end();
    h.commitRecords("b", { title: erase ? "擦一笔" : "画一笔" }, boards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data })));
    boards.sync(cur());
  };
  const undo = (): void => { boards.cancelOpen(); h.undo(); boards.sync(cur()); };
  const redo = (): void => { boards.cancelOpen(); h.redo(cur()); boards.sync(cur()); };
  /** 模型（含贴图坐标）+ 每张画的大小和像素。 */
  const shot = (): string => {
    const parts = [sceneFingerprint(cur())];
    for (const g of textures) {   // 每张画：大小 + 每层的像素（内核 exportData = 编码器的读口，CPU 那份；不合成，快）
      const b = boards.get(g); if (!b) { parts.push(`${g.slice(0, 4)} 没有画板`); continue; }
      const d = b.wp.exportData(), layers = (d.nodes as { pixels?: { rect: { x: number; y: number; w: number; h: number }; bytes: Uint8ClampedArray } | null }[]).map((n) => (n.pixels ? `${n.pixels.rect.x},${n.pixels.rect.y},${n.pixels.rect.w},${n.pixels.rect.h}:${hash(new Uint8Array(n.pixels.bytes.buffer, n.pixels.bytes.byteOffset, n.pixels.bytes.byteLength))}` : "空"));
      parts.push(`${g.slice(0, 4)} ${b.width}x${b.height} ${layers.join(" | ")}`);
    }
    return parts.join("\n");
  };
  const plainMat = (): number => { if (plain < 0) { commit({ op: "addMaterial", name: "灰", color: [0.5, 0.5, 0.5] } as Op); plain = cur().materials.length - 1; } return plain; };
  const paintRecords = (tex: string): number => { let n = 0; for (const list of (h as unknown as { entries: { kind: string; data: unknown }[][] }).entries) for (const e of list) if (e.kind === PAINT_UNDO_KIND && (e.data as PaintRec).texture === tex) n++; return n; };
  const live = (tex: string): number => (boards as unknown as { entries: Map<string, { steps: { liveCount(): number } }> }).entries.get(tex)?.steps.liveCount() ?? -1;
  return { h, boards, port, defs, cur, commit, startPaint, stroke, undo, redo, shot, plainMat, paintMat, textures, resets, paintRecords, live };
}

describe("画进三维的撤销栈：混着来回逐字节对（1-8a）", () => {
  for (const seed of [1, 7, 42]) it(`种子 ${seed}：画 / 擦 / 挪点 / 挤出加高 / 换材质 + 截断，一路撤到头、再一路重做回来，每一步逐字节对`, () => {
    const r = rig(2), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 160));   // 密度大：画布满得快，挤出会让它加高
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

describe("一笔画到两张贴图（1-8a）", () => {
  const two = () => { const r = rig(2), rnd = rng(3), texs = r.defs.map((d) => r.startPaint(d)); r.stroke(texs, rnd); r.stroke(texs, rnd); return { r, texs }; };
  it("一次撤销两张都退、一次重做两张都回来", () => {
    const { r } = two(), after = r.shot(); r.undo(); const mid = r.shot(); r.undo(); r.redo(); eq(r.shot(), mid); r.redo(); eq(r.shot(), after);
    assert(mid !== after, "撤了是真的变了");
  });
  it("第二张问的时候说不能（还有一笔开着）：什么都没动、游标没动、说原因", () => {
    const { r, texs } = two(), s0 = r.shot(), pos = r.h.position(), off = r.boards.trackOpen(texs[1], () => {});
    let e: unknown = null; try { r.h.undo(); } catch (x) { e = x; }
    assert(e instanceof StepFlipError && e.reason === "refused" && /没画完/.test(e.message), String(e));
    eq(r.shot(), s0); eq(r.h.position(), pos);
    off();
  });
  it("第二张翻的时候抛：第一张翻回去、三维的状态和撤销之前逐字节相同", () => {
    for (const dir of ["undo", "redo"] as const) {
      const { r, texs } = two();
      if (dir === "redo") r.undo();
      const s0 = r.shot(), pos = r.h.position(), e1 = (r.boards as unknown as { entries: Map<string, { steps: { flip(s: unknown): unknown } }> }).entries.get(texs[0])!;
      const orig = e1.steps.flip.bind(e1.steps); let once = true;
      e1.steps.flip = (st: unknown) => { if (once) { once = false; throw new Error("注入：翻不成"); } return orig(st); };   // 撤销时第二个翻（倒着：先第二张再第一张）、重做时第一个翻
      let e: unknown = null; try { if (dir === "undo") r.h.undo(); else r.h.redo(r.cur()); } catch (x) { e = x; }
      assert(e instanceof StepFlipError && e.reason === "rolled-back", `${dir}：${String(e)}`);
      eq(r.shot(), s0, `${dir}：逐字节相同`); eq(r.h.position(), pos, `${dir}：游标没动`);
      e1.steps.flip = orig;
      if (dir === "undo") r.undo(); else r.redo();   // 毛病没了照常
    }
  });
  it("翻回去也抛：那张画的步全部作废、记录从三维的栈里摘掉、说出来；另一张照常翻回去", () => {
    const { r, texs } = two(), pos = r.h.position();
    const ents = (r.boards as unknown as { entries: Map<string, { steps: { flip(s: unknown): unknown } }> }).entries, e0 = ents.get(texs[0])!, e1 = ents.get(texs[1])!;
    const o0 = e0.steps.flip.bind(e0.steps), o1 = e1.steps.flip.bind(e1.steps); let n1 = 0;
    e0.steps.flip = () => { throw new Error("注入：第一张翻不成"); };   // 撤销倒着走：先翻第二张（成功），再翻第一张（抛）
    e1.steps.flip = (st: unknown) => { if (++n1 === 2) throw new Error("注入：第二张翻回去也不成"); return o1(st); };
    let e: unknown = null; try { r.h.undo(); } catch (x) { e = x; }
    assert(e instanceof StepFlipError && e.untrusted.some((t) => /撤销记录清掉了/.test(t)), String(e));
    eq(r.resets.length, 1, "那张画的步作废了一次"); assert(/说了/.test(r.resets[0]), r.resets[0]);
    eq(r.paintRecords(texs[1]), 0, "第二张的记录摘掉了"); assert(r.paintRecords(texs[0]) > 0, "第一张的记录还在");
    eq(r.h.position(), pos, "两步里都还有第一张的记录：步都还在，游标没动");
    e0.steps.flip = o0; e1.steps.flip = o1;
  });
});

describe("额度和画板活多久（1-8a）", () => {
  it("最老的步被挤掉：内核那边活着的步数 = 三维的栈里那张画的记录数", () => {
    const r = rig(1, { quota: 2 }), rnd = rng(5), [tex] = r.defs.map((d) => r.startPaint(d));
    for (let i = 0; i < 12; i++) r.stroke([tex], rnd);
    assert(r.h.evictedCount() > 0, "挤掉过");
    eq(r.live(tex), r.paintRecords(tex), "内核活着的步数 = 栈里的记录数");
  });
  it("画没了（清理掉定义）= 歇着；栈里它的记录被挤掉之后才扔；同一个身份号回来接着用", () => {
    const r = rig(2, { quota: 1 << 20 }), rnd = rng(9), texs = r.defs.map((d) => r.startPaint(d));
    r.stroke([texs[0]], rnd); r.stroke([texs[0]], rnd);
    const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((i) => i.def === r.defs[0])!;
    r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op);
    r.commit({ op: "purgeDefs", defs: [r.defs[0]] } as Op);
    assert(!!r.boards.get(texs[0]), "画没了：画板歇着、还在");
    r.undo(); r.undo();
    eq(r.boards.get(texs[0]) !== undefined, true, "撤回来：同一块");
    r.undo(); r.undo();   // 两笔也能撤
    eq(r.paintRecords(texs[0]), 2, "两笔的记录都在");
  });
  it("歇着的画板：栈里的记录全被挤掉 = 扔（内核的步一条不剩）", () => {
    const r = rig(2), rnd = rng(11), texs = r.defs.map((d) => r.startPaint(d));
    r.stroke([texs[0]], rnd);
    const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((i) => i.def === r.defs[0])!;
    r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op);
    r.commit({ op: "purgeDefs", defs: [r.defs[0]] } as Op);
    const steps = (r.boards as unknown as { entries: Map<string, { steps: { liveCount(): number } }> }).entries.get(texs[0])!.steps;
    assert(!!r.boards.get(texs[0]), "歇着");
    r.h.dropRedo();
    (r.h as unknown as { quota: number }).quota = 1;   // 额度调到最小：下一步把更早的全挤掉
    r.stroke([texs[1]], rnd);
    eq(r.paintRecords(texs[0]), 0, "它的记录全被挤掉");
    eq(r.boards.get(texs[0]), undefined, "画板扔了");
    eq(steps.liveCount(), 0, "内核的步一条不剩");
  });
});

describe("画布加高那一步（1-8a）", () => {
  it("挤出让画布加高：撤销之后画板和贴图坐标都缩回去，再重做回来；加高之后在新的行上画过、撤到加高之前也缩得回去", () => {
    const r = rig(1), rnd = rng(2), [tex] = r.defs.map((d) => r.startPaint(d, 200)), def = r.defs[0];   // 密度大：画布满得快，挤出几次就要加高
    r.boards.ensure(r.cur(), tex);
    let tries = 0, before = "";
    const uvH = (): number => [...r.cur().mesh(def).uvSets.values()][0].height;
    for (; tries < 20; tries++) {
      before = r.shot(); const h0 = r.boards.get(tex)!.height, k = r.cur().mesh(def).kernel;
      r.commit({ op: "meshExtrude", def, faces: [k.faces()[tries % k.faces().length]], offset: { x: 0, y: 0, z: 0.5 } } as Op);
      r.commit({ op: "meshLayoutPaint", def } as Op, true);
      if (r.boards.get(tex)!.height > h0) break;
    }
    assert(tries < 20, "挤出到画布加高了");
    const grownH = r.boards.get(tex)!.height, grown = r.shot();
    eq(uvH(), grownH, "画板跟着贴图坐标");
    r.undo(); eq(r.shot(), before, "撤销：画板和贴图坐标都缩回去"); eq(r.boards.get(tex)!.height, uvH());
    r.redo(); eq(r.shot(), grown, "重做回来");
    // 在新的行上画一笔（只画加高出来的那几行）
    const b = r.boards.get(tex)!, W = b.width, s = b.openStroke(), lid = b.wp.layerTree!.view().activeId!, px = new Uint8Array(W * b.height * 4), y0 = b.height - 4;
    for (let y = y0; y < b.height; y++) for (let x = 0; x < 8; x++) { const o = (y * W + x) * 4; px[o] = 200; px[o + 3] = 255; }
    s.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: b.height, prec: "u8" }), bx: 0, by: y0, bw: 8, bh: 4, layerId: lid, opacity: 1, erase: false, blendMode: "source-over" }]);
    s.end(); r.h.commitRecords("b", { title: "画一笔" }, r.boards.takePending().map((data) => ({ kind: PAINT_UNDO_KIND, data })));
    r.undo(); r.undo(); eq(r.shot(), before, "撤到加高之前：缩回去");
    r.redo(); r.redo();
    void rnd;
  });
});

describe("统筹点的两个例子（1-8a）", () => {
  it("开始画 → 画一笔 → 撤两下 → 重做两下：逐字节对", () => {
    const r = rig(1), rnd = rng(4), def = r.defs[0], fp0 = sceneFingerprint(r.cur());
    const tex = r.startPaint(def), fp1 = sceneFingerprint(r.cur());
    r.stroke([tex], rnd); const s2 = r.shot();
    r.undo(); r.undo();
    eq(sceneFingerprint(r.cur()), fp0, "回到开始画之前");
    assert(!!r.boards.get(tex), "画板歇着、没扔（栈里还有它的记录）");
    r.redo(); eq(sceneFingerprint(r.cur()), fp1, "重做开始画");
    r.redo(); eq(r.shot(), s2, "重做那一笔：逐字节对");
  });
  it("删掉画着的物件（清理掉定义）再撤销回来：画和它之前的每一步都还能撤、能重做", () => {
    const r = rig(1), rnd = rng(6), def = r.defs[0], tex = r.startPaint(def);
    r.stroke([tex], rnd); const a = r.shot(); r.stroke([tex], rnd); const b = r.shot();
    const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((i) => i.def === def)!;
    r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op); r.commit({ op: "purgeDefs", defs: [def] } as Op);
    r.undo(); r.undo(); eq(r.shot(), b, "物件回来了，画也在");
    r.undo(); eq(r.shot(), a, "再撤一笔");
    r.redo(); eq(r.shot(), b, "重做");
  });
});
