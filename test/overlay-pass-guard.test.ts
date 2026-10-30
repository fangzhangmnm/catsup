// 瑞士奶酪：点线面的高亮不走叠加层（2026-10-29 Claude Opus 5.5；user「能不能做一个瑞士奶酪就是像素模式下点线面的叠加层就不应该开。只放行gizmos之类的」
// 「非像素模式的边也不应该用叠加啊，而是两套材质」「点也应该同样的标准」）。面 / 边 = 标记（highlight.ts → FrameInput.marks）；
// 编辑器自己吐的「模型的样子」的点线（顶点小点 / 选中点 / 面点 / 中缝点 / 软边淡线 / 线块里没有的高亮边）= pass: content。叠加层只放行 gizmo、吸附、尺规、文字这些手。
// 运行时那层在探针 test/probes/probe-pixel-no-overlay.mjs（像素风里选东西后 overlayPassIds 不许有这些 id）。
import { describe, it, assert } from "./runner.mjs";
import { overlayItems } from "../src/editor/overlay.ts";
import { translateAux } from "../src/look/aux.ts";
import type { ViewState } from "../src/editor/view-state.ts";
import type { OverlayCtx } from "../src/minccino/index.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const ctx: OverlayCtx = { worldPerPx: () => 0.01, infLine: (p) => [p, p], reachKey: () => "", target: P(0, 0, 0), forward: P(0, 1, 0), right: P(1, 0, 0), up: P(0, 0, 1), lineWeightPx: 1, dpr: 1, style: "white" };
/** 模型的样子的那几样：这些 id 必须跟内容画。 */
export const CONTENT_IDS = ["vertDots", "selVerts", "faceDots", "seam", "soft", "edgeSel"] as const;

describe("瑞士奶酪：点线面不走叠加层", () => {
  it("顶点小点 / 选中点 / 面点 / 中缝点 / 软边淡线 = pass content；吸附小球 / gizmo 留在叠加层", () => {
    const view = {
      selectionEdges: new Set(), selectionFaces: new Set(), scrubEdges: new Set(), hoverEdge: null, hoverFace: null, snapAnchor: null,
      snap: { kind: "endpoint", p: P(1, 1, 1) },
      vertDots: { key: "v", pts: [P(0, 0, 0), P(1, 0, 0)] }, selVerts: [P(0, 0, 0)],
      faceDots: { key: "f", pts: [P(0.5, 0.5, 0)], sel: [true] }, mirror: { key: "m", seam: [P(0, 0, 0)] },
      softEdges: { key: "s", segs: [{ a: P(0, 0, 0), b: P(1, 0, 0) }] },
    } as unknown as ViewState;
    const items = translateAux(overlayItems(view, ctx), ctx.style);
    for (const id of ["vertDots", "selVerts", "faceDots", "seam", "soft"]) {
      const it = items.find((x) => x.id === id) as { pass?: string } | undefined;
      assert(!!it, `${id} 没出来`);
      assert(it!.pass === "content", `${id} 走了叠加层（pass = ${it!.pass ?? "overlay"}）`);
    }
    const snap = items.find((x) => x.id === "snap") as { pass?: string } | undefined;
    assert(!!snap && snap.pass === undefined, "吸附小球该留在叠加层（手里的工具要准）");
  });
  it("线块里没有的高亮边（被刮擦 / 检查标的软边）也跟内容画", () => {
    const [e] = translateAux([{ kind: "lines", role: "markedEdge", id: "edgeSel", key: "k", positions: [0, 0, 0, 1, 0, 0], colors: ["scrub"] }], "white") as { pass?: string }[];
    assert(e.pass === "content", "markedEdge 不是 content");
  });
});
