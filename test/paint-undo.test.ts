// 画的每一步进三维的撤销栈（贴图主线 1-8a，施工单 ai-docs/20261111-paint-workorders-12.md + 统筹 11-11 裁定）。created 2026-11-11 by Claude Opus 5.5
// node 里用真的 History、真的画板登记处、画画内核的软件显卡；编辑器做的那几件事照样串起来：每条指令提交之后 follow + 把内核封的步挂进这一步（afterCommit）、
// 一笔 = 落层之后 commitRecords 一步（commitStep）、每次之后 sync（每帧的「准备」）。一笔 = 交给档口一块矩形色块当薄层（像素进出照样走内核）。
// ① 混着来回逐字节对：在 paint-undo-random.test.ts（拆开跑）。架子在 paint-undo-kit.ts。
// ② 一笔画到两张贴图：一次撤销两张都退；第二张翻不成（问的时候说不能 / 翻的时候抛）= 什么都没动；翻回去也抛 = 那张画的步作废、记录摘掉、说出来。
// ③ 额度：最老的步被挤掉时内核那边活着的步数跟着减；画没了的画板歇着，一直留到关文件（0-3a 统筹改判：栈里没有它的记录了也不扔）。
// ④ 画布加高那一步：挤出让画布加高，撤销之后画板和贴图坐标都缩回去，再重做回来；加高之后在新的行上画过、又撤销到加高之前也缩得回去。
// ⑤ 统筹点的两个例子：开始画 → 画一笔 → 撤两下 → 重做两下；删掉画着的物件（清理掉定义）再撤销回来，画和它之前的每一步都还能撤。
import { describe, it, eq, assert } from "./runner.mjs";
import { PAINT_UNDO_KIND } from "../src/paint/boards.ts";
import { StepFlipError } from "../src/editor/history.ts";
import type { Op } from "../src/editor/ops.ts";
import { sceneFingerprint } from "./format-scenes.ts";
import { rig, rng } from "./paint-undo-kit.ts";

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
  it("画没了（清理掉定义）= 歇着；同一个身份号回来接着用", () => {
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
  it("歇着的画板：栈里的记录全被挤掉 = 不扔（0-3a 改判），内核的步一条不剩、画板的内容一个字节不动", () => {
    const r = rig(2), rnd = rng(11), texs = r.defs.map((d) => r.startPaint(d));
    r.stroke([texs[0]], rnd);
    const root = r.cur().root, inst = [...r.cur().def(root).instances.values()].find((i) => i.def === r.defs[0])!;
    r.commit({ op: "eraseInstance", def: root, instance: inst.id } as Op);
    r.commit({ op: "purgeDefs", defs: [r.defs[0]] } as Op);
    const steps = (r.boards as unknown as { entries: Map<string, { steps: { liveCount(): number } }> }).entries.get(texs[0])!.steps;
    assert(!!r.boards.get(texs[0]), "歇着");
    const px0 = r.shot();
    r.h.dropRedo();
    (r.h as unknown as { quota: number }).quota = 1;   // 额度调到最小：下一步把更早的全挤掉
    r.stroke([texs[1]], rnd);
    eq(r.paintRecords(texs[0]), 0, "它的记录全被挤掉");
    assert(!!r.boards.get(texs[0]), "画板还在（歇着，留到关文件）");
    eq(steps.liveCount(), 0, "内核的步一条不剩");
    eq(r.shot().split("\n").find((l) => l.startsWith(texs[0].slice(0, 4))), px0.split("\n").find((l) => l.startsWith(texs[0].slice(0, 4))), "A 的画一个字节不动");
  });
});

describe("画布加高那一步（1-8a）", () => {
  it("挤出让画布加高：撤销之后画板和贴图坐标都缩回去，再重做回来；加高之后在新的行上画过、撤到加高之前也缩得回去", () => {
    const r = rig(1), rnd = rng(2), [tex] = r.defs.map((d) => r.startPaint(d, 200, "density")), def = r.defs[0];   // 密度大：画布满得快，挤出几次就要加高（按一格多大开的才长大，施工单十六第四节）
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
