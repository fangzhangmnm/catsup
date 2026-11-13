// 油漆桶认网格体的面（白模 W-12，2026-11-11 Claude Opus 5.5）：网格体的三档灌法（surface-assign.ts meshFacesForAssign）。界面那一半 = 探针 probe-mesh-bucket。
import { setFaceHidden } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPrimitive } from "../src/mesh/ops/index.ts";
import { meshFacesForAssign } from "../src/editor/surface-assign.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };

describe("油漆桶在网格体上的三档（W-12）", () => {
  it("圆柱（默认平滑按角度 30°）：平滑组 = 一圈侧面；到锐角为止 90° = 连着盖子；连通体 = 全部", () => {
    const m = new MeshKernel(); addPrimitive(m, "cylinder", F, [0.5, 0.5, 1], 16); m.setSmoothDefault({ mode: "angle", deg: 30 });
    const side = m.faces().find((f) => m.faceVerts(f).length === 4)!;
    eq(meshFacesForAssign(m, side, "smooth", 30).length, 16, "侧面一圈 16 张（中间的边按角度是平滑的；和盖子之间 90° 是棱）");
    eq(meshFacesForAssign(m, side, "sharp", 30).length, 16, "阈值 30°：过不去 90° 的边");
    eq(meshFacesForAssign(m, side, "sharp", 90).length, m.faceCount(), "阈值 90°：连着盖子");
    eq(meshFacesForAssign(m, side, "connected", 0).length, m.faceCount(), "连通体 = 全部");
  });
  it("盒子：平滑组 = 一张；藏起来的面不灌、也不从它过", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const fs = m.faces();
    eq(meshFacesForAssign(m, fs[0], "smooth", 30).join(), String(fs[0]), "盒子的棱都是 90°：一张");
    for (const f of fs.slice(1)) setFaceHidden(m, f, true);
    eq(meshFacesForAssign(m, fs[0], "connected", 0).join(), String(fs[0]), "别的面都藏了：只剩自己");
    eq(meshFacesForAssign(m, 9999, "connected", 0).length, 0, "不在的面 = 空");
  });
});
