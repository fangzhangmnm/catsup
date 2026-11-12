#!/usr/bin/env node
// probe-doc-revision.mjs —— 文档改动号变 ⟺ 写出去的文件会变（不算桌面态、缩略图、版本串）。两个方向都钉。created 2026-11-12 by Claude Opus 5.5
// 统筹 11-12 裁定（做人物那一趟的清点：进出组件、撤销 / 重做纯选区以前也算「改过」）：rev() 拆成 docChanged / viewChanged 两个明着的入口。
// 做法：做一个白模（盒子 → 组件 → 网格体 → 进去 → 正中环切 → 开镜像 → 自动标接缝 → 开始画 → 画一笔），之后每样动作做完比两样——
//   ① 文档改动号变没变；② 存盘编码写出来的字节（拆开 glb：JSON 删版本串 / 缩略图 / 桌面态，二进制按内容比、去掉缩略图那一段）变没变。两样必须一致。
//   做成了就撤回到之前，撤回那一下也照样比。问话面一律点「不做 / 取消」。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-doc-revision.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);

await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const H = (globalThis.__H = {});
  // 问话面：点「不做 / 取消」
  setInterval(() => { const sh = document.getElementById("sheet"); if (!sh || sh.hidden || sh.closest("[hidden]")) return; const bs = [...sh.querySelectorAll("button")].filter((b) => b.offsetParent); const c = bs.find((b) => ["不做", "取消", "算了"].includes(b.textContent.trim())) ?? bs[bs.length - 1]; c?.click(); }, 40);
  // 写出去的文件的指纹（不算桌面态、缩略图、版本串）
  const hash = (u8) => { let h = 2166136261; for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16) + ":" + u8.length; };
  H.fp = async () => {
    const b = await C.session.freeze("save").finish(), dv = new DataView(b.buffer, b.byteOffset), n = dv.getUint32(12, true);
    const j = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + n))), bin = b.subarray(28 + n);
    const thumb = j.asset?.thumbnail !== undefined ? j.images?.[j.asset.thumbnail]?.bufferView : undefined;
    const views = (j.bufferViews ?? []).map((v, i) => (i === thumb ? null : hash(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)))).filter((x) => x !== null).sort();
    delete j.asset.generator; delete j.asset.thumbnail; if (j.extensions) delete j.extensions.CATSUP_desk; if (j.extensions?.CATSUP_document?.bake) delete j.extensions.CATSUP_document.bake.generator;
    delete j.bufferViews; delete j.buffers; if (j.images) j.images = j.images.filter((im) => im.name !== "thumbnail"); if (j.images && !j.images.length) delete j.images;
    return JSON.stringify(j) + "|" + views.join(",");
  };
  H.box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  H.m = () => e.sceneRef.mesh(H.def).kernel;
  H.faceAt = (fx) => { const k = H.m(); return k.faces().find((f) => { const vs = k.faceVerts(f), c = { x: 0, y: 0, z: 0 }; for (const v of vs) { const p = k.pt(v); c.x += p.x / vs.length; c.y += p.y / vs.length; c.z += p.z / vs.length; } return fx(c); }); };
  H.edgeWhere = (fx) => { const k = H.m(); return k.edges().find((x) => fx(k.pt(k.edgeA[x]), k.pt(k.edgeB[x]))); };
  H.pe = (type, w) => { const p = e.cam.project(w, e.vp()), c = document.getElementById("board"), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: "pen", clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true, cancelable: true, isPrimary: true, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.6 })); };
  H.stroke = async (a, b) => { C.pickWorkbench("paint"); e.setTool("paintPen"); e.draw(); await sleep(40); H.pe("pointermove", a); H.pe("pointerdown", a); for (let i = 1; i <= 10; i++) { H.pe("pointermove", { x: a.x + (b.x - a.x) * i / 10, y: a.y + (b.y - a.y) * i / 10, z: a.z }); await sleep(8); } H.pe("pointerup", b); await sleep(80); };
  H.enter = () => { e.selectedPools.clear(); e.selectedPools.set("i" + H.inst, { kind: "instance", instance: H.inst }); e.enterSelected(); };
  H.reenter = () => { if (e.activeKind() === "mesh") return; let g = 0; while (e.exitContext() && g++ < 5) {} H.enter(); };
  // 白模
  e.setGrid({ ...e.grid, on: false }); H.box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("人"); e.runAction("object.toMesh"); await sleep(30);
  const inst = [...e.sceneRef.def(e.sceneRef.root).instances.values()][0]; H.def = inst.def; H.inst = inst.id; H.enter(); await sleep(30);
  const cut = H.m().edges().find((x) => Math.abs(H.m().pt(H.m().edgeA[x]).x - H.m().pt(H.m().edgeB[x]).x) > 1); e.commitOp({ op: "meshLoopCut", def: H.def, edge: cut, t: 0.5 });
  e.cam.setView("top"); e.zoomExtents(); e.draw();
  e.setMirror("edit", 0); C.pickWorkbench("freeform"); e.deselectAll(); e.runAction("mesh.autoSeams"); C.pickWorkbench("paint"); e.deselectAll(); e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" });
  await H.stroke({ x: -0.8, y: 0.5, z: 1 }, { x: 0.8, y: 0.5, z: 1 });
  C.pickWorkbench("freeform"); e.deselectAll();
});

// [名字, 动作, 撤回方式："undo" = 撤到动作之前；"none" = 不撤（看法类）]
const ACTIONS = [
  ["进入 → 退出组件（只换看法）", `e.exitContext();`, "reenter"],
  ["全选", `e.selectAll();`, "none"],
  ["取消选择", `e.deselectAll();`, "none"],
  ["换工作台", `C.pickWorkbench("verify"); C.pickWorkbench("freeform");`, "none"],
  ["转视角", `e.cam.setView("front"); e.draw(); e.cam.setView("top"); e.draw();`, "none"],
  ["全选再撤销（撤的是纯选区）", `e.selectAll(); e.undo();`, "none"],
  ["撤销后重做纯选区", `e.selectAll(); e.undo(); e.redo();`, "none"],
  ["改吸附长度（设置，v0.19.68 起算改过）", `e.setGrid({ snap: 0.05 });`, "setGrid"],
  ["环切", `C.pickWorkbench("freeform"); const ed = H.edgeWhere((a, b) => Math.abs(a.x - b.x) > 0.5 && Math.abs(a.z - b.z) < 1e-9 && a.z > 0.5); e.commitOp({ op: "meshLoopCut", def: H.def, edge: ed, t: 0.5 });`, "undo"],
  ["挤出一张面", `const f = H.faceAt((p) => p.z > 0.999 && p.x > 0.01); e.commitOp({ op: "meshExtrude", def: H.def, faces: [f], offset: { x: 0, y: 0, z: 0.3 } });`, "undo"],
  ["删一张面", `const f = H.faceAt((p) => p.y < -0.49 && p.x > 0.01); e.commitOp({ op: "meshDelete", def: H.def, faces: [f] });`, "undo"],
  ["并两个点", `const k = H.m(); const vs = k.verts().filter((v) => k.pt(v).x > 0.5 && k.pt(v).z > 0.999).slice(0, 2); e.commitOp({ op: "meshMerge", def: H.def, verts: vs });`, "undo"],
  ["插入", `const f = H.faceAt((p) => p.z > 0.999 && p.x > 0.01); e.commitOp({ op: "meshInset", def: H.def, faces: [f], dist: 0.05 });`, "undo"],
  ["细分一次", `e.commitOp({ op: "meshSubdivide", def: H.def, levels: 1 });`, "undo"],
  ["挪一个点", `const k = H.m(); const v = k.verts().find((v) => k.pt(v).x > 0.9 && k.pt(v).z > 0.9); const p = k.pt(v); e.commitOp({ op: "meshMove", def: H.def, moves: [{ v, to: { x: p.x + 0.1, y: p.y, z: p.z + 0.1 } }] });`, "undo"],
  ["标一条接缝（正中环切出来的那条，原来不是接缝）", `const ed = H.edgeWhere((a, b) => Math.abs(a.x) < 1e-9 && Math.abs(b.x) < 1e-9 && a.z > 0.999 && b.z > 0.999); e.commitOp({ op: "meshEdgeMarks", def: H.def, edges: [ed], mark: "seam" });`, "undo"],
  ["再点自动标接缝（不用补）", `e.deselectAll(); e.runAction("mesh.autoSeams");`, "undo"],
  ["画一笔（新的一条线）", `await H.stroke({ x: -0.6, y: 0.25, z: 1 }, { x: 0.6, y: 0.25, z: 1 });`, "undo"],
  ["同一条线同色再画一遍（像素不变）", `await H.stroke({ x: -0.8, y: 0.5, z: 1 }, { x: 0.8, y: 0.5, z: 1 });`, "undo"],
  ["镜像：关", `e.setMirror(null);`, "undo"],
  ["镜像：强行对称", `e.setMirror("force", 0);`, "undo"],
  ["选面复制粘贴（镜像开着：问，点不做）", `C.pickWorkbench("freeform"); const f = H.faceAt((p) => p.z > 0.999 && p.x > 0.01); e.deselectAll(); e.selection.faces.add(f); if (e.copySelection()) e.pasteClipboard();`, "undo"],
  ["回最外层复制粘贴物件", `e.exitContext(); e.selectAll(); if (e.copySelection()) e.pasteClipboard();`, "undo"],
  ["回最外层炸开（问，点不做）", `e.exitContext(); e.selectAll(); e.explodeSelection();`, "undo"],
  ["回最外层转回硬表面（有画：拒）", `e.exitContext(); e.selectAll(); e.runAction("object.toBrep");`, "undo"],
];

console.log("文档改动号变 ⟺ 写出去的文件会变（每样动作做完比两样；撤回那一下也比）");
// 已知的多算（偏安全的一侧，统筹 11-12 报过）：真提交了一条什么都没改的指令（比如把已经是接缝的边再标一次）改动号照样走——只打出来，不当检查
const known = await page.evaluate(async () => { const e = globalThis.__catsup.editor, H = globalThis.__H; const f0 = await H.fp(), d0 = e.docRevision; const ed = H.edgeWhere((a, b) => Math.abs(a.z - b.z) > 0.5 && a.x > 0.5); e.commitOp({ op: "meshEdgeMarks", def: H.def, edges: [ed], mark: "seam" }); await new Promise((r) => setTimeout(r, 100)); const out = { rev: e.docRevision !== d0, bytes: (await H.fp()) !== f0 }; e.undo(); return out; });
console.log(`  · 已知多算：把已经是接缝的边再标一次——改动号${known.rev ? "变了" : "没变"}，文件${known.bytes ? "变了" : "没变"}（不当检查）`);
for (const [name, src, back] of ACTIONS) {
  const r = await page.evaluate(async ([src, back]) => {
    const C = globalThis.__catsup, e = C.editor, H = globalThis.__H, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const f0 = await H.fp(), d0 = e.docRevision, p0 = e.history.position();
    let threw = null; try { await (new Function("C", "e", "H", "sleep", `return (async () => { ${src} })()`))(C, e, H, sleep); } catch (x) { threw = String(x.message).slice(0, 120); }
    await sleep(150);
    const f1 = await H.fp(), d1 = e.docRevision, out = { act: { rev: d1 !== d0, bytes: f1 !== f0 }, threw };
    if (back === "undo") { let g = 0; while (e.history.position() > p0 && g++ < 10) { e.undo(); await sleep(20); } H.reenter(); await sleep(60); const f2 = await H.fp(), d2 = e.docRevision; out.back = { rev: d2 !== d1, bytes: f2 !== f1, sameAsBefore: f2 === f0 }; }
    else if (back === "setGrid") { e.setGrid({ snap: 0.2 }); await sleep(60); const f2 = await H.fp(), d2 = e.docRevision; out.back = { rev: d2 !== d1, bytes: f2 !== f1, sameAsBefore: f2 === f0 }; }
    else if (back === "reenter") { const d1b = e.docRevision, f1b = f1; H.enter(); await sleep(60); const f2 = await H.fp(), d2 = e.docRevision; out.back = { rev: d2 !== d1b, bytes: f2 !== f1b, sameAsBefore: f2 === f0 }; }
    C.pickWorkbench("freeform"); e.deselectAll(); await sleep(20);
    return out;
  }, [src, back]);
  check(r.act.rev === r.act.bytes, `${name}：改动号${r.act.rev ? "变了" : "没变"}，文件${r.act.bytes ? "变了" : "没变"}`, r.threw ?? "");
  if (r.back) check(r.back.rev === r.back.bytes && (r.back.sameAsBefore || !r.act.bytes), `${name} · 撤回：改动号${r.back.rev ? "变了" : "没变"}，文件${r.back.bytes ? "变了" : "没变"}${r.back.sameAsBefore ? "、回到了做之前" : ""}`);
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-doc-revision ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
