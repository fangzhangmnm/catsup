// 黑匣子的纯文本行：开机 URL 行的脱敏规则（error 原文、code 只记长度）+ 编辑器记账行。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { bootUrlLine, traceLine } from "../src/app/debug-lines.ts";
import { describeOp } from "../src/editor/ops.ts";

describe("debug-lines", () => {
  it("bootUrlLine：OAuth 回程 error/error_description 原文照抄，code/state 只记长度", () => {
    const line = bootUrlLine({ pathname: "/catsup/dev/", search: "", hash: "#code=ABCDEFGHIJ&state=xyz&client_info=q" });
    eq(line, "url path=/catsup/dev/ query=[-] hash=[code(10) state(3) client_info(1)]");
    assert(!line.includes("ABCDEFGHIJ"), "授权码不得落黑匣子");
    const err = bootUrlLine({ pathname: "/catsup/dev/", search: "?reset=1", hash: "#error=invalid_request&error_description=AADSTS50011%3A+redirect+uri+mismatch&state=s" });
    assert(err.includes("error=invalid_request"), err);
    assert(err.includes("error_description=AADSTS50011: redirect uri mismatch"), err);
    assert(err.includes("query=[reset(1)]"), err);
    eq(bootUrlLine({ pathname: "/", search: "", hash: "" }), "url path=/ query=[-] hash=[-]");
  });
  it("describeOp / traceLine：一 op 一行，不含坐标；失败行带 op JSON", () => {
    eq(describeOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] }), "addEdges segs=1");
    eq(describeOp({ op: "pushpull", face: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }], dist: 0.123456 }), "pushpull ring=3 dist=0.1235");
    eq(describeOp({ op: "move", moves: [{ from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 0, z: 0 } }] }), "move verts=1");
    eq(describeOp({ op: "eraseSelection", faces: [], edges: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] }), "eraseSelection faces=0 edges=1");
    eq(describeOp({ op: "clear" }), "clear"); eq(describeOp({ op: "preset", name: "日字" }), "preset 日字");
    const opLine = traceLine({ kind: "op", op: { op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] }, events: 2, ms: 1.26, position: 7 });
    eq(opLine, "addEdges segs=1 → 2ev 1.3ms #7");
    assert(!opLine.includes("{"), "op 行不含坐标 JSON");
    eq(traceLine({ kind: "undo", position: 6, depth: 7 }), "undo → #6/7");
    eq(traceLine({ kind: "load", label: "打开 a.glb" }), "load 打开 a.glb");
    const fail = traceLine({ kind: "fail", where: "commit", op: { op: "clear" }, message: "boom" });
    eq(fail, 'FAIL commit: boom op={"op":"clear"}');
  });
});
