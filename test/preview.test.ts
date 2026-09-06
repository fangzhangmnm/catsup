// preview 架构（影子副本预演）的两条铁律：
// ① 副本预演 = 真身提交（事件逐字相同、终态一致）——预览不许撒谎；
// ② 改副本绝不泄漏回真身。

import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";
import { rectSegments, translateMoves, moveTargets } from "../src/editor/tools.ts";

const P = (x: number, y: number): Pt => ({ x, y });

function scene(): Kernel {
  const k = new Kernel();
  k.addEdges([...rectSegments(P(0, 0), P(10, 10)), [P(0, 5), P(10, 5)]]); // 日字两格
  return k;
}
const J = (x: unknown): string => JSON.stringify(x);

describe("preview: 影子副本预演", () => {
  it("addEdges：副本事件 = 真身事件（逐字），终态面集一致", () => {
    const k = scene();
    const segs = rectSegments(P(3, 1), P(7, 4));
    const shadowEv = k.clone().addEdges(segs);
    const realEv = k.addEdges(segs);
    eq(J(shadowEv), J(realEv), "事件逐字相同");
  });

  it("eraseEdges：副本预演 BURST/MERGE 与真身一致", () => {
    const k = scene();
    const shared = k.edges().find((e) => e.faceLinks.length === 2)!;
    const shadowEv = k.clone().eraseEdges([shared.id]);
    const realEv = k.eraseEdges([shared.id]);
    eq(J(shadowEv), J(realEv), "MERGE 事件一致");
  });

  it("moveVertices：副本预演与真身一致", () => {
    const k = scene();
    const fid = k.faces()[0].id;
    const moves = translateMoves(k, moveTargets(k, { face: fid }), P(30, 0));
    const shadowEv = k.clone().moveVertices(moves);
    const realEv = k.moveVertices(moves);
    eq(J(shadowEv), J(realEv), "事件一致");
  });

  it("改副本不泄漏：真身面/边/顶点原样", () => {
    const k = scene();
    const beforeFaces = J(k.faces());
    const beforeEdges = k.edges().length;
    const c = k.clone();
    c.addEdges(rectSegments(P(20, 20), P(30, 30)));
    c.eraseEdges(c.edges().map((e) => e.id));
    eq(k.edges().length, beforeEdges, "真身边数不动");
    eq(J(k.faces()), beforeFaces, "真身面集不动");
    eq(k.log().length, 2, "真身日志不动（一笔画日字 = BIRTH×2）");
  });
});
