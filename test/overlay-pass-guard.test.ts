// 辅助几何全按主分辨率画、跟内容一起（窄接口设计稿 §7.1；切刀第 2 步 2026-10-29 Claude Opus 5.5）。
// user 10-29「原则上一切都得按照渲染分辨率画，然后跳过某一层后处理……都得白名单」「小栗鼠功能上允许不同分辨率混合画。但是原则上默认用主分辨率」。
// 偏离缺省（stage 1 = 排在后处理之后 / resolution native = 原分辨率）只由画风表决定；这里把每个画风翻出来的偏离行逐行列出来（=「还有谁在」），
// 和白名单对账——白名单现在是空的，user 一个一个开。运行时那层在探针 test/probes/probe-pixel-no-overlay.mjs（像素风里 nativeIds / lateIds 都空）。
import { describe, it, eq } from "./runner.mjs";
import { overlayItems } from "../src/editor/overlay.ts";
import type { ViewState } from "../src/editor/view-state.ts";
import { translateAux } from "../src/look/aux.ts";
import { PRESET_IDS, type OverlayCtx, type OverlayItem } from "../src/minccino/index.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const ctx = (style: string): OverlayCtx => ({ worldPerPx: () => 0.01, infLine: (p) => [p, p], reachKey: () => "", target: P(0, 0, 0), forward: P(0, 1, 0), right: P(1, 0, 0), up: P(0, 0, 1), lineWeightPx: 1, dpr: 1, style, pixelCss: 1, blinkOn: true });
/** 白名单：允许偏离缺省的 item id（user 一个一个开）。所有画风都适用的 = ALL；某个画风才有的 = 按画风 id。 */
const ALL: readonly string[] = ["vertDots", "selVerts", "faceDots", "seam"];   // 2026-10-29 user「像素里面点应该遮住线，而不是被线遮住」：顶点类的点排在后处理之后（stage 1）
const WHITELIST: Readonly<Record<string, readonly string[]>> = {};

/** 一帧尽量多的辅助几何（每种至少一样）。 */
function everything(): ViewState {
  const F = { origin: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };
  return {
    selectionEdges: new Set(), selectionFaces: new Set(), scrubEdges: new Set(), hoverEdge: null, hoverFace: null, snapAnchor: P(0, 0, 0),
    snap: { kind: "axis-x", p: P(1, 1, 1), hints: [{ a: P(0, 0, 0), b: P(1, 0, 0), axis: "x" }] },
    vertDots: { key: "v", pts: [P(0, 0, 0), P(1, 0, 0)] }, selVerts: [P(0, 0, 0)],
    faceDots: { key: "f", pts: [P(0.5, 0.5, 0)], sel: [true] }, mirror: { key: "m", seam: [P(0, 0, 0)] },
    softEdges: { key: "s", segs: [{ a: P(0, 0, 0), b: P(1, 0, 0) }] },
    protractor: { center: P(0, 0, 0), axis: P(0, 0, 1), ref: P(1, 0, 0), angle: 0.5 },
    guides: { lines: [{ id: 1, p: P(0, 0, 0), dir: P(1, 0, 0) }], points: [{ id: 2, p: P(1, 1, 0) }], circles: [], spheres: [] },
    charged: { points: [P(0, 0, 0)], edges: [{ a: P(0, 0, 0), b: P(1, 0, 0) }] },
    ticks: [{ p: P(0.5, 0, 0), dir: P(1, 0, 0) }], axisTickM: 1, frame: F, axisUnitX: 1,
    planeGizmo: { origin: P(0, 0, 0), normal: P(0, 0, 1), u: P(1, 0, 0), v: P(0, 1, 0), size: 1, hot: null },
    xformGizmo: { origin: P(0, 0, 0), axes: { x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, arrow: 1, ring: 0.8, start: 0.2, cube: 0.6, cubeHalf: 0.05, plane: 0.3, planeHalf: 0.1, uniform: P(0.5, 0.5, 0.5), hot: null },
    poolAxes: [F], emptyAxes: [F], originAxes: [F],
    lockLines: [{ through: P(0, 0, 0), dir: P(1, 0, 0), color: "x" }],
    tape: { a: P(0, 0, 0), b: P(1, 0, 0), guide: { p: P(0, 0, 0), dir: P(1, 0, 0) }, point: P(1, 0, 0) },
    knifeLine: { a: P(0, 0, 0), b: P(1, 0, 0), valid: true },
    handles: [{ p: P(1, 1, 1), active: false }],
    teleport: { points: [P(0, 0, 0), P(1, 0, 0)], landing: P(1, 0, 0), valid: true },
    capsule: { feet: P(0, 0, 0), radius: 0.3, stature: 1.7, ok: true },
    labels: [{ id: "unit-x", text: "1 m", at: P(1, 0, 0), role: "unitLabel", anchor: "below" }],
  } as unknown as ViewState;
}
const off = (it: OverlayItem): string | null => {
  const x = it as { id: string; stage?: number; resolution?: string };
  return (x.stage ?? 0) !== 0 || (x.resolution ?? "main") !== "main" ? `${x.id}（stage ${x.stage ?? 0} · ${x.resolution ?? "main"}）` : null;
};

describe("辅助几何全按主分辨率画、跟内容一起（白名单制）", () => {
  it("每个画风翻出来的辅助几何：偏离缺省的行 = 白名单（顶点类的点排在后处理之后）", () => {
    const report: string[] = [];
    for (const style of PRESET_IDS) {
      const items = translateAux(overlayItems(everything(), ctx(style)), ctx(style));
      const bad = items.map(off).filter((x): x is string => !!x);
      const allowed = new Set([...ALL, ...(WHITELIST[style] ?? [])]);
      for (const b of bad) report.push(`${style}: ${b}${allowed.has(b.split("（")[0]) ? "（白名单）" : ""}`);
      eq(bad.filter((b) => !allowed.has(b.split("（")[0])).join(", "), "", `${style} 有不在白名单上的偏离`);
    }
    console.log(`    [还有谁在] 偏离缺省的辅助几何：${report.length ? report.join("；") : "没有"}`);
  });
  it("每样都翻得出来（编辑器交的语义项都有表里的一行）；字 = 折线 + 底板，不是文字类型", () => {
    const items = translateAux(overlayItems(everything(), ctx("white")), ctx("white"));
    const ids = new Set(items.map((x) => x.id));
    for (const id of ["vertDots", "selVerts", "faceDots", "seam", "soft", "snap", "hint", "protractor", "guides", "charged", "ticks", "planeGizmo", "gizmoQuad", "xformGizmo", "xgConex", "xgCubex", "xgCenter", "xgPlanepxy", "poolAxes", "emptyAxes", "originAxes", "lockLines", "tape", "knife", "handle0", "arc", "landing", "capsule", "unit-x", "unit-x/plate"]) eq(ids.has(id), true, `${id} 没翻出来`);
    eq(items.some((x) => (x as { kind: string }).kind === "label"), false);
  });
});
