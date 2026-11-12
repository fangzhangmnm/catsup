// scripts/extract-lab-model.mjs —— 从 Shader 实验室的模型文件（一段 JS 里包着 GLB 的 base64）拷出一份普通的浮点 GLB（贴图主线 1-4c 规模样本用）。created 2026-11-11 by Claude Opus 5.5
// 用法：node scripts/extract-lab-model.mjs <实验室 assets/models/xxx.js> <输出 .glb>；一个文件好几个条目的（assets/characters.js）加 --id=<条目名>
// 为什么要还原：实验室的这几个 GLB 是压过的（KHR_mesh_quantization：点的位置 16 位整数、法线 8 位、贴图坐标 16 位，都按「normalized」存，真正的大小靠节点的缩放 / 平移）。
//   CatsUp 的外来 glb 导入（src/format/gltf-import.ts）读整数分量时不看 normalized，位置会大三万多倍；统筹 11-11：不为这个改导入，拷出来的时候还原成普通的 32 位浮点。
// 做法：取文件里最长的那段 base64 解出 GLB → 网格图元里分量是整数的属性（POSITION / NORMAL / TANGENT / TEXCOORD_n / COLOR_n）按 glTF 的 normalized 规则换成浮点
//   （有符号：max(c / 最大值, −1)；无符号：c / 最大值；不是 normalized 的整数原样当浮点）→ 新的数据接在二进制块末尾（4 字节对齐）→ 那个 accessor 指过去、
//   去掉 normalized、POSITION 重算 min / max → 扩展列表里删 KHR_mesh_quantization。节点的缩放 / 平移不动（它本来就是还原的那一半）。索引、图片、材质原样。
// 输入、输出的路径都从命令行给，脚本里不写死。user 自己的模型不进三维仓（统筹 11-11：不让仓变胖、不放无关的东西）：输出放检疫桶，现在用的那份在哪、各是哪个作品，见那个文件夹的 README。
import { readFileSync, writeFileSync } from "node:fs";

// --id=<条目名>（2026-11-12 加，施工单二十二 F）：实验室 assets/characters.js 那种「一个文件好几个条目、每条 { id: "...", glb: '<base64>' }」的写法，按条目名取它那一段（不靠「最长的那段」）。
const args = process.argv.slice(2), idArg = args.find((a) => a.startsWith("--id="))?.slice(5), [src, out] = args.filter((a) => !a.startsWith("--"));
if (!src || !out) { console.error("usage: node scripts/extract-lab-model.mjs <lab model .js> <out .glb> [--id=<entry id>]"); process.exit(2); }
const text = readFileSync(src, "utf8");
let b64;
if (idArg) {
  const at = text.indexOf(`id: "${idArg}"`);
  if (at < 0) throw new Error(`${src}: no entry id "${idArg}"`);
  const m = /glb:\s*'([A-Za-z0-9+/=]+)'/.exec(text.slice(at));
  if (!m || text.slice(at, at + m.index).includes("\n  {")) throw new Error(`${src}: entry "${idArg}" has no inline glb`);
  b64 = m[1];
} else {
  const runs = text.match(/[A-Za-z0-9+/=]{1000,}/g) ?? [];
  if (!runs.length) throw new Error(`${src}: no base64 run found`);
  b64 = runs.sort((a, b) => b.length - a.length)[0];
}
const glb = Buffer.from(b64, "base64");
if (glb.toString("latin1", 0, 4) !== "glTF") throw new Error(`${src}: longest base64 run is not a GLB`);

// 拆块
let off = 12, json = null, bin = Buffer.alloc(0);
while (off < glb.length) {
  const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = glb.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(body.toString("utf8")); else if (type === 0x004e4942) bin = Buffer.from(body);
  off += 8 + len;
}
if (!json) throw new Error("no JSON chunk");

const SIZE = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }, N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const READ = { 5120: (b, o) => b.readInt8(o), 5121: (b, o) => b.readUInt8(o), 5122: (b, o) => b.readInt16LE(o), 5123: (b, o) => b.readUInt16LE(o), 5125: (b, o) => b.readUInt32LE(o) };
const NORM = { 5120: (c) => Math.max(c / 127, -1), 5121: (c) => c / 255, 5122: (c) => Math.max(c / 32767, -1), 5123: (c) => c / 65535, 5125: (c) => c };
const extra = [];
let tail = bin.length;
const converted = new Map(), counts = {};
for (const mesh of json.meshes ?? []) for (const prim of mesh.primitives ?? []) for (const [name, ai] of Object.entries(prim.attributes ?? {})) {
  if (!/^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+)$/.test(name) || converted.has(ai)) continue;
  const a = json.accessors[ai];
  if (a.componentType === 5126) continue;
  if (a.sparse) throw new Error(`accessor ${ai}: sparse quantized data not handled`);
  const v = json.bufferViews[a.bufferView], n = N[a.type], size = SIZE[a.componentType], stride = v.byteStride || n * size, base = (v.byteOffset || 0) + (a.byteOffset || 0);
  const f = new Float32Array(a.count * n), conv = a.normalized ? NORM[a.componentType] : (c) => c;
  for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) f[i * n + c] = conv(READ[a.componentType](bin, base + i * stride + c * size));
  const pad = (4 - (tail % 4)) % 4; if (pad) { extra.push(Buffer.alloc(pad)); tail += pad; }
  const bytes = Buffer.from(f.buffer);
  json.bufferViews.push({ buffer: 0, byteOffset: tail, byteLength: bytes.length });
  extra.push(bytes); tail += bytes.length;
  a.bufferView = json.bufferViews.length - 1; a.byteOffset = 0; a.componentType = 5126; delete a.normalized;
  if (name === "POSITION") { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < a.count; i++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], f[3 * i + c]); mx[c] = Math.max(mx[c], f[3 * i + c]); } a.min = mn; a.max = mx; }
  else { delete a.min; delete a.max; }
  converted.set(ai, name); counts[name.replace(/_\d+$/, "")] = (counts[name.replace(/_\d+$/, "")] ?? 0) + 1;
}
const strip = (l) => (l ?? []).filter((e) => e !== "KHR_mesh_quantization");
json.extensionsUsed = strip(json.extensionsUsed); if (!json.extensionsUsed.length) delete json.extensionsUsed;
json.extensionsRequired = strip(json.extensionsRequired); if (!json.extensionsRequired.length) delete json.extensionsRequired;
const newBin = Buffer.concat([bin, ...extra]), binPad = Buffer.alloc((4 - (newBin.length % 4)) % 4);
json.buffers[0].byteLength = newBin.length + binPad.length;
let js = Buffer.from(JSON.stringify(json), "utf8"); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const binChunk = Buffer.concat([newBin, binPad]), total = 12 + 8 + js.length + 8 + binChunk.length, head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
head.write("glTF", 0, "latin1"); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
jh.writeUInt32LE(js.length, 0); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
writeFileSync(out, Buffer.concat([head, jh, js, bh, binChunk]));
const tris = (json.meshes ?? []).flatMap((m) => m.primitives).reduce((s, p) => s + (p.indices !== undefined ? json.accessors[p.indices].count / 3 : 0), 0);
console.log(`${out}: ${total} bytes, ${tris} triangles, converted ${JSON.stringify(counts)}, images ${(json.images ?? []).length}`);
