// 复现包黑匣子（2026-10-24 Claude Fable 5.1；user「关窗就没的快照黑匣子选项，就包括涉及到的数据和操作，你就能复现了」）：内存环、导出 JSON 能被 Kernel.fromBrep 吃回。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { capture, clear, count, entries, toJson } from "../src/app/repro-box.ts";

describe("repro-box: 内存环 + 导出", () => {
  it("收 9 条只留 8 条（新顶旧）；JSON 里的 brep 能原样建回内核；clear 清空", () => {
    clear();
    const k = new Kernel(); k.addEdges([[{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 1, y: 0 }, { x: 1, y: 1 }], [{ x: 1, y: 1 }, { x: 0, y: 1 }], [{ x: 0, y: 1 }, { x: 0, y: 0 }]]);
    for (let i = 0; i < 9; i++) capture({ where: i === 0 ? "first" : "commit", message: `m${i}`, brep: k.toBrep(), op: { op: "pushpull", dist: i } });
    eq(count(), 8); eq(entries()[0].message, "m1", "最旧的一条被顶掉");
    const pack = JSON.parse(toJson());
    eq(pack.entries.length, 8); assert(typeof pack.version === "string" && pack.app === "CatsUp");
    const back = Kernel.fromBrep(pack.entries[7].brep);
    eq(back.faces().length, 1); eq(back.edges().length, 4);
    eq(pack.entries[7].op.dist, 8);
    clear(); eq(count(), 0);
  });
});
