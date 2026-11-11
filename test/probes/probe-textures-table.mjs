// 贴图成为独立的条目（贴图主线 1-0½，施工单 ai-docs/20261110-paint-workorders-2.md 第五节）：真编辑器里——
// ① 第一次把一张图涂到面上（油漆桶蘸图 → 涂选区）= 一步：贴图表一行 + 一个材质指它；撤销一步 = 贴图和材质都没了；重做 = GUID 和撤销前一样
// ② 再蘸同一张图涂别处 = 不多一行贴图、不多一个材质（找同一份字节）
// ③ 两个材质共用一张图、都涂在面上：渲染器只解一次（解码缓存里一张图）、着色器两份；吸色吸到的是那张图
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-textures-table.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const S = () => e.sceneRef, out = {};
  // 2×2 PNG（红 / 绿 / 蓝 / 白）：真能解码的图
  const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAGUlEQVR4AQEOAPH/AP8AAAD/AAAAAP////+V2Qn8C7NZbAAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.cam.setView("iso"); e.zoomExtents(); e.draw();
  // ①
  const k = e.kernel, faces = k.faces().map((f) => f.id);
  e.setPaint({ kind: "texture", name: "格子", mimeType: "image/png", bytes: png, sizeM: [0.5, 0.5] });
  const pos0 = e.history.position();
  e.paintFaces([faces[0]]);
  const g1 = [...S().textures.keys()];
  out.first = { ops: e.history.position() - pos0,   // 指令条数（addTexture + addMaterial + paintFaces）；一步撤干净看下面的撤销
    textures: g1.length, materials: S().materials.length, mapped: !!S().colorMapOf(S().materials[0]) };
  e.undo(); out.undo = { textures: S().textures.size, materials: S().materials.length };
  e.redo(); out.redo = { sameGuid: [...S().textures.keys()].join() === g1.join(), materials: S().materials.length };
  // ②
  e.paintFaces([faces[1]]);
  out.again = { textures: S().textures.size, materials: S().materials.length };
  // ③ 第二个材质指同一张图，涂第三张面
  e.commitOp({ op: "addMaterial", name: "乙", color: [0.6, 0.6, 0.6], channels: { color: [g1[0]] } });
  e.commitOp({ op: "paintFaces", at: e.activePool(), faces: [k.faceRings3 ? k.faceRings3(faces[2]).outer : []], material: 1 });
  e.draw(); await sleep(600); e.draw(); await sleep(200);
  const r3 = e.r3 ?? e.renderer3;
  const decoded = [...r3.texCache.entries()].filter(([key]) => key && key.bytes !== undefined);   // 契约 TextureRef（灰占位的键没有 bytes）
  out.render = { decodedImages: decoded.length, sameBytes: decoded.every(([key]) => key.bytes === png), shaderMaterials: r3.texMats.size };
  e.pickMaterialOf(faces[2], 0);
  out.pick = { kind: e.paint?.kind, sameBytes: e.paint?.bytes === png };
  return out;
});
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.first.ops === 3 && r.first.textures === 1 && r.first.materials === 1 && r.first.mapped
  && r.undo.textures === 0 && r.undo.materials === 0 && r.redo.sameGuid && r.redo.materials === 1
  && r.again.textures === 1 && r.again.materials === 1
  && r.render.decodedImages === 1 && r.render.sameBytes && r.render.shaderMaterials === 2
  && r.pick.kind === "texture" && r.pick.sameBytes && errs.length === 0;
console.log(ok ? "probe-textures-table OK" : "probe-textures-table FAIL");
process.exit(ok ? 0 : 1);
