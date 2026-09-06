// OBJ 逃生口：Z-up↔Y-up 往返、n-gon/洞/裸边、导入=边→内核 face-finding 长回面。created 2026-09-06 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { FaceId, Pt3 } from "../src/kernel/kernel.ts";
import { exportObj, parseObjSegments } from "../src/editor/obj-io.ts";
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
      triangulateHoled: (kk: Kernel, id: FaceId) => {
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

  it("导入：Y-up → Z-up；多边形边去重；喂进内核长回同样的面", () => {
    const k = new Kernel();
    k.addEdges(rectSegments({ x: 0, y: 0 }, { x: 10, y: 5 }));
    k.pushPull(k.faces()[0].id, 7);
    eq(k.faces().length, 6);
    const txt = exportObj(k);
    const r = parseObjSegments(txt);
    eq(r.faces, 6);
    eq(r.segs.length, 12);   // 立方体 12 条边，相邻面共享边去重
    const k2 = new Kernel();
    k2.addEdges(r.segs);
    eq(k2.faces().length, 6);
    // 坐标往返恒等
    const zs = new Set(k2.vertices().map((v) => Math.round(v.z)));
    assert(zs.has(0) && zs.has(7), [...zs].join(","));
  });

  it("导入：支持 a/b/c 索引与负索引；超过上限拒收", () => {
    const r = parseObjSegments("v 0 0 0\nv 1 0 0\nv 1 0 -1\nf 1/1/1 2//2 -1\n");
    eq(r.segs.length, 3);
    eq(r.vertices, 3);
    let threw = false;
    try { parseObjSegments("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n", { maxSegments: 2 }); } catch { threw = true; }
    assert(threw, "应拒收");
  });
});
