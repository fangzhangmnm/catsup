// 框选只框看得见的（X 光关着）+ 自由建模框点（2026-10-28 Claude Opus 5.5；纪元账本 FM44 / FM48 / FM139）。
// user 10-27「X 光关着时框选是不是只选看得见的当然啊，不然为什么要X ray」（拍过没落地）；10-28「不x光不会选背面吗？」；
// 自由建模：「框选和套索只收看得见的点……两端都框进来的边、角全框进来的面，跟着一起选上」——「同意」。
// 标准答案：斜上方看一个封闭的立方体 = 看得见 7 个角、9 条边、3 张面；X 光开着 = 8 / 12 / 6。
import { describe, it, eq } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { marqueeScreen } from "../src/editor/marquee.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";

const VP = { w: 900, h: 700 }, ALL = { minX: -1e6, minY: -1e6, maxX: 1e6, maxY: 1e6 };
function cubeView(body: "mesh" | "brep"): { view: WorldView; cam: OrbitCamera } {
  const s0 = new Scene(), d = s0.mintDef("块", sceneBox()), inst = s0.mintInstance(s0.root, null, d.id, IDENTITY);
  let s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel(); addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }); s.mesh(d.id).kernel = m;
  if (body === "brep") s = applyOp(s, { op: "castDefinition", def: d.id, to: "brep" }).scene;
  const cam = new OrbitCamera(); cam.projection = "persp"; cam.target = { x: 0.5, y: 0.5, z: 0.5 }; cam.yaw = 0.6; cam.pitch = 0.45; cam.halfH = 2;
  return { view: new WorldView(s, { chain: [inst.id], group: null }), cam };
}

describe("框选：X 光关着只框看得见的", () => {
  it("自由建模（框点）：7 个点、9 条边、3 张面；X 光开 = 8 / 12 / 6", () => {
    const { view, cam } = cubeView("mesh");
    const a = marqueeScreen(view, cam, VP, ALL, { verts: true });
    eq([a.verts.size, a.edges.size, a.faces.size].join(" / "), "7 / 9 / 3");
    const b = marqueeScreen(view, cam, VP, ALL, { verts: true, xray: true });
    eq([b.verts.size, b.edges.size, b.faces.size].join(" / "), "8 / 12 / 6");
  });
  it("硬表面（不框点）：9 条边、3 张面、0 个点；X 光开 = 12 / 6", () => {
    const { view, cam } = cubeView("brep");
    const a = marqueeScreen(view, cam, VP, ALL, {});
    eq([a.verts.size, a.edges.size, a.faces.size].join(" / "), "0 / 9 / 3");
    const b = marqueeScreen(view, cam, VP, ALL, { xray: true });
    eq([b.edges.size, b.faces.size].join(" / "), "12 / 6");
  });
  it("框只框住一部分：框里的点才算，边要两端都在、面要角全在", () => {
    const { view, cam } = cubeView("mesh");
    // 框住朝镜头那个顶角附近：只有离它近的点进来
    const top = view.vertices().reduce((best, v) => (v.z > 0.5 && cam.angularPx(v, VP).y < cam.angularPx(best, VP).y ? v : best));
    const s = cam.angularPx(top, VP), r = 5, box = { minX: s.x - r, maxX: s.x + r, minY: s.y - r, maxY: s.y + r };
    const a = marqueeScreen(view, cam, VP, box, { verts: true });
    eq([a.verts.size, a.edges.size, a.faces.size].join(" / "), "1 / 0 / 0");
  });
});
