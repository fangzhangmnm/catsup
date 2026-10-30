// OBJ 逃生口：Z-up↔Y-up 往返、n-gon/洞/裸边；导入 2026-10-29 起 = 网格体（format/obj-import.ts，和外来 glb 同一条）。created 2026-09-06 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { FaceId, Pt3 } from "../src/kernel/kernel.ts";
import { exportObj } from "../src/editor/obj-io.ts";
import { readForeignObj } from "../src/format/obj-import.ts";
import { castImport } from "../src/scene/import-build.ts";
import { kernelFromMeshDoc } from "../src/mesh/mesh-doc.ts";
import { edgeSmooth } from "../src/mesh/edge-smooth.ts";
import { rectSegments } from "../src/editor/tools.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

describe("obj-io", () => {
  it("导出：矩形面 = 一个 4 顶点 n-gon，坐标 Z-up 写成 Y-up (x, z, -y)", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 5 }));
    const txt = exportObj(k);
    const v = txt.split("\n").filter((l) => l.startsWith("v "));
    const f = txt.split("\n").filter((l) => l.startsWith("f "));
    eq(v.length, 4);
    eq(f.length, 1);
    eq(f[0].split(" ").length - 1, 4);
    assert(v.includes("v 10 0 -5"), `期望 (10,5,0)→ 'v 10 0 -5'，实际：${v.join(" | ")}`);
    assert(!txt.includes("l "), "无裸边不应有 l 元素");
  });

  it("导出：裸边写成 l 元素", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(10, 0)]]);
    const txt = exportObj(k);
    assert(txt.includes("l 1 2"), txt);
  });

  it("导出：带洞面走注入的三角化；不注入则只导出外环并留警告", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 100, y: 100 }));
    k.addEdges(rectSegments({ x: 40, y: 40 }, { x: 60, y: 60 }));
    k.eraseFaces(k.faces().filter((f) => f.holes.length === 0).map((f) => f.id));   // 删内岛 → 外环变带洞面
    const holed = k.faces().find((f) => f.holes.length > 0);
    assert(holed, "应有带洞面");
    const plain = exportObj(k);
    assert(plain.includes("# warning"), plain);
    const tri = exportObj(k, {
      triangulateHoled: (kk, id: FaceId) => {
        const r = kk.faceRings3(id)!;
        // 假三角器：外环扇形（只验管线接线，不验几何）
        const out: [Pt3, Pt3, Pt3][] = [];
        for (let i = 1; i + 1 < r.outer.length; i++) out.push([r.outer[0], r.outer[i], r.outer[i + 1]]);
        return out;
      },
    });
    assert(!tri.includes("# warning"));
    eq(tri.split("\n").filter((l) => l.startsWith("f ")).length, 2);
  });

  // 2026-10-29 Opus：OBJ 导入改成网格体（和外来 glb 同一条；user 10-29「导入的glb obj当然应该是mesh」，账本 T121）
  const meshOf = (txt: string, name = "t") => { const data = readForeignObj(txt, name); const { scene, report } = castImport(data, 20); return { data, report, meshes: scene.meshes.map((m) => kernelFromMeshDoc(m.mesh!, name)) }; };
  it("导入：Y-up → Z-up；多边形原样（导出的立方体再导入 = 6 个四边形、8 个点）", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 5 }));
    k.pushPull(k.faces()[0].id, 7);
    const { meshes } = meshOf(exportObj(k));
    eq(meshes.length, 1);
    const m = meshes[0];
    eq(m.faceCount(), 6); eq(m.vertexCount(), 8); eq(m.edgeCount(), 12);
    assert(m.faces().every((f) => m.faceLen[f] === 4), "四边形原样");
    const zs = new Set(m.verts().map((v) => Math.round(m.pos[3 * v + 2])));
    assert(zs.has(0) && zs.has(7), [...zs].join(","));
  });
  it("导入：a/b/c 索引与负索引；平滑组判软硬（同一个非零组 = 平滑、s off = 棱）；多个对象外面包一层", () => {
    eq(meshOf("v 0 0 0\nv 1 0 0\nv 1 0 -1\nf 1/1/1 2//2 -1\n").meshes[0].faceCount(), 1);
    const fold = (s1: string, s2: string): string => `v 0 0 0\nv 1 0 0\nv 1 0 -1\nv 0 0 -1\nv 1 1 0\nv 0 1 0\ns ${s1}\nf 1 2 3 4\ns ${s2}\nf 2 1 6 5\n`;   // 两张四边形折成 90°
    const soft = meshOf(fold("1", "1")).meshes[0], hard = meshOf(fold("off", "off")).meshes[0];
    const shared = (m: ReturnType<typeof meshOf>["meshes"][0]): number => m.edges().find((e) => m.eFaces(e).length === 2)!;
    eq(edgeSmooth(soft, shared(soft)), true, "同组 = 平滑（90° 也平滑）");
    eq(edgeSmooth(hard, shared(hard)), false, "s off = 棱");
    const two = readForeignObj("o A\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\no B\nv 0 0 1\nv 1 0 1\nv 0 1 1\nf 4 5 6\n", "two");
    eq(two.meshes.map((m) => m.name).join(), "A,B"); eq(two.nodes[two.roots[0]].name, "two"); eq(two.nodes[two.roots[0]].children.length, 2);
    let threw = false; try { readForeignObj("v 0 0 0\n", "x"); } catch { threw = true; }
    assert(threw, "没有面 = 拒");
  });
});
