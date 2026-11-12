// scripts/export-lab-shape.cjs —— 跑 Shader 实验室里程序生成的模型（lab/core.js 的 SHAPES：精细坦克、简陋坦克……），焊点后写成一个普通 GLB（开发时试接缝 / 展开用；施工单二十二 F）。
// created 2026-11-12 by Claude Opus 5.5。实验室那个仓只读：这里只 require 它的 core.js（和它自己的 tools/check_mesh.js 同一个装法：给个空 window），不往那边写任何东西。
// 用法：node scripts/export-lab-shape.cjs <Shader 实验室目录> <模型 id，比如 tankDetailed> <输出 .glb>。输出放检疫桶或临时目录，不进三维仓。
// 写出来的：一个网格、POSITION（32 位浮点）+ 索引（32 位）；点按坐标逐位相同焊在一起（生成代码同一个点算出来的坐标是同一个数）；没有法线、贴图坐标、材质（底色是涂装车间烘的，不在几何里）。
const path = require("node:path"), fs = require("node:fs");
const [labDir, id, out] = process.argv.slice(2);
if (!labDir || !id || !out) { console.error("usage: node scripts/export-lab-shape.cjs <lab dir> <shape id> <out.glb>"); process.exit(2); }
global.window = {};
require(path.resolve(labDir, "lab/core.js"));
const entry = window.ShaderLab.SHAPES.find(([sid]) => sid === id);
if (!entry) { console.error(`no shape "${id}"; have: ${window.ShaderLab.SHAPES.map(([s]) => s).join(", ")}`); process.exit(2); }
const p = entry[2]().p, T = p.length / 9, key = new Map(), pos = [], idx = [];
for (let i = 0; i < T * 3; i++) {
  const k = `${p[i * 3]},${p[i * 3 + 1]},${p[i * 3 + 2]}`;
  let v = key.get(k);
  if (v === undefined) { v = pos.length / 3; key.set(k, v); pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); }
  idx.push(v);
}
const P = Buffer.alloc(pos.length * 4), I = Buffer.alloc(idx.length * 4);
pos.forEach((x, i) => P.writeFloatLE(x, i * 4)); idx.forEach((x, i) => I.writeUInt32LE(x, i * 4));
const min = [0, 1, 2].map((k) => Math.min(...pos.filter((_, i) => i % 3 === k))), max = [0, 1, 2].map((k) => Math.max(...pos.filter((_, i) => i % 3 === k)));
const json = {
  asset: { version: "2.0", generator: `CatsUp scripts/export-lab-shape.cjs (Shader lab shape ${id})` },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: id }],
  meshes: [{ name: id, primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
  buffers: [{ byteLength: P.length + I.length }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: P.length, target: 34962 }, { buffer: 0, byteOffset: P.length, byteLength: I.length, target: 34963 }],
  accessors: [{ bufferView: 0, componentType: 5126, count: pos.length / 3, type: "VEC3", min, max }, { bufferView: 1, componentType: 5125, count: idx.length, type: "SCALAR" }],
};
let js = Buffer.from(JSON.stringify(json), "utf8"); if (js.length % 4) js = Buffer.concat([js, Buffer.alloc(4 - (js.length % 4), 0x20)]);
const bin = Buffer.concat([P, I]), head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
head.write("glTF", 0, "latin1"); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(out, Buffer.concat([head, jh, js, bh, bin]));
console.log(`${id}: ${T} triangles, ${pos.length / 3} welded points → ${out}`);
