#!/usr/bin/env node
// old-reader-check.mjs —— 拿旧版本的真代码当读者，读这一版写的文件（格式改动的门；贴图主线 1-2½ 起进仓，1-0½ 时这一步的脚本在临时目录、没留下）。created 2026-11-11 by Claude Opus 5.5
// 用法：node scripts/old-reader-check.mjs [--n 200] [--seed 1] <提交>...（默认 53878ec = v0.18.50、609bff1 = v0.19.18、2d62e36a = v0.19.79 = 施工单十八第 1 刀之前的最后一个开发版）
// 每个提交：git archive 它的 src/ 到系统临时目录，import 它的 src/format/index.ts 当读者。文件 = 这一版写的：全部 golden 场景 + n 份随机场景（一半带贴图坐标、一半不带）。
// 判据（统筹 11-11，1-2½）：
//   · 带贴图坐标的文件：旧读者抛「格式太新」（它自己的 FormatTooNewError，报 CATSUP_mesh），不许悄悄打开。
//   · 不带贴图坐标的文件：旧读者照常打开；它再存一遍 = 和原文件逐字节一样（只抹掉 asset.generator 和 CATSUP_document.bake.generator：每个版本存盘都写自己的版本号）。例外（已知代价，1-0½ 门 6 记过）：比贴图表还老的读者（没有 CATSUP_textures 的版本）
//     读带贴图表的文件会重写材质扩展，不逐字节；这种单独数出来，并检查这一版再读它存的那份能开、几何一样。
//     另一类单独数：只差拍子（二进制一字不差，JSON 里只有某个扩展的 version / minor / patch 不同 = 旧读者按它自己的拍子写回；比如 v0.18.50 比材质扩展 1.3 老）。
//   · 认识这一版贴图坐标存法的读者（它的 CATSUP_mesh 大版本 ≥ 这一版的；1-8b 加，施工单十八第 1 刀改成和这一版比）：带贴图坐标的文件也照常打开、再存按上面那条判（逐字节 / 只差拍子）。
//     施工单十八第 1 刀起「带贴图坐标」= 文件里有排法表（CATSUP_uvsets）或网格体上有 uv 列（CATSUP_mesh 3.0）；v0.19.20–v0.19.79 的读者认的是网格体上的 uvSets（2.x），不认识这一版的，该拒开。
//   · 平铺的画（CATSUP_textures 1.2，施工单二十一第 3 刀加）：不认识它的读者（没有 tiledPaintIn）用它自己的 colorMapIn / paintIn 问那个材质，两个都答不是 = 按底色显示；
//     它存回去的那份，这一版再读那一行还是平铺的画、分层字节一样。
// 不进测试套（要动 git、要旧代码）；结果写进施工记录。
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const N = opt("--n", 200), SEED = opt("--seed", 1);
const commits = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
if (!commits.length) commits.push("53878ec", "609bff1", "2d62e36a");
const repo = resolve(fileURLToPath(new URL("..", import.meta.url)));

const S = await import(pathToFileURL(join(repo, "test/format-scenes.ts")).href);
const F = await import(pathToFileURL(join(repo, "src/format/index.ts")).href);
const { Scene } = await import(pathToFileURL(join(repo, "src/scene/scene.ts")).href);
const { applyOp, faceKey } = await import(pathToFileURL(join(repo, "src/editor/ops.ts")).href);
const { brepToMesh } = await import(pathToFileURL(join(repo, "src/scene/kinds.ts")).href);
const { translation } = await import(pathToFileURL(join(repo, "src/scene/xform.ts")).href);
const { mintGuid } = await import(pathToFileURL(join(repo, "src/format/guid.ts")).href);
const D = await import(pathToFileURL(join(repo, "src/format/document.ts")).href);

// —— 这一版写的文件
let st = SEED >>> 0;
const rnd = () => (st = (Math.imul(st, 1664525) + 1013904223) >>> 0) / 4294967296;
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
function randomScene(withUv) {
  let s = new Scene(S.sceneBox(1 + rnd(), 1 + rnd()));
  if (rnd() < 0.5) s = applyOp(s, { op: "addMaterial", name: "杂", color: [rnd(), rnd(), rnd()] }).scene;
  const nMesh = 1 + Math.floor(rnd() * 3), uvDefs = [];
  for (let i = 0; i < nMesh; i++) {
    const d = s.mintDef(`网格 ${i}`, S.sceneBox(0.5 + rnd(), 0.5 + rnd())); d.body = brepToMesh(s.brep(d.id));
    s.mintInstance(s.root, null, d.id, translation({ x: 3 + 2 * i, y: rnd(), z: 0 }));
    if (rnd() < 0.3) s.meshMirrors.set(d.id, { mode: pick(["edit", "force"]), axis: pick([0, 1, 2]) });
    if (withUv && (i === 0 || rnd() < 0.5)) uvDefs.push(d.id);
  }
  for (const def of uvDefs) {
    const all = s.mesh(def).kernel.faces(), cut = 1 + Math.floor(rnd() * (all.length - 1)), sets = rnd() < 0.4 ? 2 : 1;
    const groups = sets === 2 ? [all.slice(0, cut), all.slice(cut)] : [rnd() < 0.5 ? all : all.slice(0, cut)];
    const made = [];
    for (const [j, faces] of groups.entries()) {
      const tex = mintGuid(), mat = mintGuid();
      s = applyOp(s, { op: "startPaint", def, faces, uvSet: mintGuid(), textureGuid: tex, materialGuid: mat, names: { uvSet: `UV ${j}`, paint: `画 ${j}`, material: `画 ${j}` }, color: [rnd(), rnd(), rnd()], density: pick([8, 16, 32, 64]) }).scene;
      s.addTexture({ ...s.textures.get(tex), content: { kind: "layered", ora: S.ORA_TWO_LAYERS_1024x256 } });
      made.push({ faces, mat, tex });
    }
    if (made.length === 2 && rnd() < 0.5) {   // 第二套变孤儿：面换成普通材质，画的材质和贴图清掉
      s = applyOp(s, { op: "addMaterial", name: "灰", color: [0.5, 0.5, 0.5] }).scene;
      s = applyOp(s, { op: "meshPaintFaces", def, faces: made[1].faces, material: s.materials.length - 1 }).scene;
      s = applyOp(s, { op: "purgeMaterials", materials: [s.materials.findIndex((m) => m.guid === made[1].mat)] }).scene;
      s = applyOp(s, { op: "purgeTextures", textures: [made[1].tex] }).scene;
    }
  }
  if (rnd() < 0.3) {   // 导入的原图（1.0 起）：硬表面根上一张面涂它（贴图表三种合法的行都在随机场景里：原图 / 铺在坐标上的画 / 平铺的画）
    const tex = mintGuid();
    s = applyOp(s, { op: "addTexture", guid: tex, name: "图", mimeType: "image/png", bytes: S.TINY_PNG, sizeM: [0.2 + rnd(), 0.2 + rnd()] }).scene;
    s = applyOp(s, { op: "addMaterial", name: "图", color: [1, 1, 1], channels: { color: [tex] } }).scene;
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: [faceKey(k, k.faces()[k.faces().length - 1].id)], material: s.materials.length - 1 }).scene;
  }
  if (rnd() < 0.3) {   // 平铺的画（1.2）：硬表面根上一两张面涂它
    const tex = mintGuid(), faces = s.kernelOf({ def: s.root, group: null }).faces().slice(0, 1 + Math.floor(rnd() * 2)), base = [rnd(), rnd(), rnd()].map((v) => Math.round(v * 100) / 100);
    s.addTexture({ guid: tex, name: "瓦", value: { kind: "color" }, content: { kind: "layered", ora: S.ORA_TWO_LAYERS_1024x256 }, sizeM: [0.25 + rnd(), 0.25 + rnd()] });
    s = applyOp(s, { op: "addMaterial", name: "瓦", color: base, channels: { color: [tex] } }).scene;
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "paintFaces", at: { def: s.root, group: null }, faces: faces.map((f) => faceKey(k, f.id)), material: s.materials.length - 1 }).scene;
  }
  return s;
}
const files = [];
for (const [name, mk] of Object.entries(S.SCENE_DOCS)) files.push({ name: `golden:${name}`, bytes: F.writeCatsup(F.documentFromScene(mk(), name)) });
for (const [name, mk] of Object.entries(S.SCENES)) files.push({ name: `golden:${name}`, bytes: F.writeCatsup(F.newDocument(mk().toBrep(), name)) });
// 每三份随机文件里一份带 desk 的笔（1.5 起跟文件走；1.6 起按笔记，2026-11-12）：旧读者 desk 是 1.4，该能开、把 paint 当不认识的键原样带回
const withPaint = (doc, i) => { doc.desk.paint = { color: "#3366cc", brushes: { pen: { size: 10 + (i % 7), opacity: 0.8, hardness: 0.5, extra: {} }, eraser: { size: 40, opacity: 1, hardness: 0.8, extra: {} }, wash: { size: 3, extra: { flow: 0.2 } } }, active: { brush: "pen" }, extra: {} }; return doc; };
for (let i = 0; i < N; i++) { const withUv = i % 2 === 0, pen = i % 3 === 0, d = F.documentFromScene(randomScene(withUv), `r${i}`); files.push({ name: `random:${i}${withUv ? "+uv" : ""}${pen ? "+pen" : ""}`, bytes: F.writeCatsup(pen ? withPaint(d, i) : d) }); }
const hasUv = (bytes) => { const doc = F.readCatsup(bytes); return doc.uvSets.length > 0 || doc.definitions.some((d) => (d.mesh?.uv?.sets.length ?? 0) > 0); };
const hasTextures = (bytes) => F.readCatsup(bytes).textures.length > 0;
/** 这一版读出来是平铺的画的材质（GUID）和那一行的分层字节。 */
const tiledOf = (bytes) => { const doc = F.readCatsup(bytes), t = new Map(doc.textures.map((x) => [x.guid, x])); return doc.materials.flatMap((m) => { const r = D.tiledPaintIn(t, m); return r ? [{ mat: m.guid, tex: r.textureDoc.guid, ora: r.textureDoc.content.ora }] : []; }); };
const geom = (doc) => JSON.stringify(doc.definitions.map((d) => ({ kind: d.kind ?? "brep", mesh: d.mesh ? { p: Array.from(d.mesh.positions), l: Array.from(d.mesh.loopVert), s: Array.from(d.mesh.faceStart) } : null, brep: d.kind === "mesh" ? null : d.brep })));
const { decodeGlb, encodeGlb } = await import(pathToFileURL(join(repo, "src/format/glb.ts")).href);
/** 逐字节比，只抹掉「哪个版本写的」两处（asset.generator、CATSUP_document.bake.generator：每个版本存盘都写自己的版本号，那一串本来就该变）。 */
const normed = (x) => { const g = decodeGlb(x); g.json.asset.generator = ""; const bake = g.json.extensions?.CATSUP_document?.bake; if (bake && "generator" in bake) bake.generator = ""; return g; };
const same = (a, b) => { const p = (() => { const g = normed(a); return encodeGlb(g.json, g.bin); })(), q = (() => { const g = normed(b); return encodeGlb(g.json, g.bin); })(); return p.length === q.length && p.every((v, i) => v === q[i]); };
/** 只差拍子：二进制一字不差，JSON 里不一样的地方全是某个扩展的 version / minor / patch（旧读者按它自己的拍子写回）。返回那几处（去掉下标），不是 = null。 */
const stampOnly = (a, b) => {
  const p = normed(a), q = normed(b);
  if (!(p.bin.length === q.bin.length && p.bin.every((v, i) => v === q.bin[i]))) return null;
  const diff = (x, y, at) => { if (JSON.stringify(x) === JSON.stringify(y)) return []; if (typeof x !== "object" || typeof y !== "object" || !x || !y) return [at]; return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) => diff(x[k], y[k], `${at}.${k}`)); };
  const paths = diff(p.json, q.json, "");
  return paths.length && paths.every((x) => /\.(version|minor|patch)$/.test(x)) ? [...new Set(paths.map((x) => x.replace(/\.\d+(?=\.|$)/g, "[]")))] : null;
};

// —— 每个旧版本
let bad = 0;
for (const c of commits) {
  const dir = join(tmpdir(), "catsup-old-reader", c);
  if (!existsSync(join(dir, "src/format/index.ts"))) { mkdirSync(dir, { recursive: true }); execFileSync("bash", ["-c", `git -C "${repo}" archive ${c} src | tar -x -C "${dir}"`]); }
  const O = await import(pathToFileURL(join(dir, "src/format/index.ts")).href);
  const OD = await import(pathToFileURL(join(dir, "src/format/document.ts")).href), oldKnowsTiled = typeof OD.tiledPaintIn === "function", canAskColor = typeof OD.colorMapIn === "function" && typeof OD.paintIn === "function";
  const t = { files: 0, mats: 0, baseColor: 0, kept: 0, keptScene: 0, bad: [] };
  const knowsUv = (O.FORMAT.CATSUP_mesh?.major ?? 0) >= F.FORMAT.CATSUP_mesh.major;   // 认识这一版贴图坐标存法的读者：带贴图坐标的文件也要能开、再存和别的一样判（1-8b 起加；施工单十八第 1 刀起和这一版的大版本比）
  const r = { uvFiles: 0, uvRefused: 0, uvOpened: [], plain: 0, plainIdentical: 0, plainStampOnly: 0, stampPaths: new Set(), plainKnownCost: 0, plainBad: [] };
  for (const f of files) {
    if (hasUv(f.bytes) && !knowsUv) {
      r.uvFiles++;
      try { O.readCatsup(f.bytes); r.uvOpened.push(f.name); }
      catch (e) { if (e instanceof O.FormatTooNewError && e.extension === "CATSUP_mesh") r.uvRefused++; else r.uvOpened.push(`${f.name}（抛的不是格式太新：${String(e).slice(0, 80)}）`); }
      continue;
    }
    r.plain++;
    let again;
    try { again = O.writeCatsup(O.readCatsup(f.bytes)); } catch (e) { r.plainBad.push(`${f.name}：打不开 ${String(e).slice(0, 80)}`); continue; }
    const tiled = oldKnowsTiled || !canAskColor ? [] : tiledOf(f.bytes);
    if (tiled.length) {   // 平铺的画：旧读者按底色显示；它存回去的，这一版再读那一行还在
      t.files++; t.mats += tiled.length;
      const od = O.readCatsup(f.bytes), ot = new Map(od.textures.map((x) => [x.guid, x]));
      for (const x of tiled) { const om = od.materials.find((m) => m.guid === x.mat); if (om && !OD.colorMapIn(ot, om) && !OD.paintIn(ot, om)) t.baseColor++; else t.bad.push(`${f.name}：旧读者没按底色（材质 ${x.mat}）`); }
      let viaScene = null;   // 再经旧版的场景走一遍（app 真存盘的路：读成场景 → 从场景写回）
      try { viaScene = O.writeCatsup(O.documentFromScene(O.sceneFromDocument(O.readCatsup(f.bytes)), "old-scene")); } catch (e) { t.bad.push(`${f.name}：旧版的场景来回抛了 ${String(e).slice(0, 80)}`); }
      if (viaScene) { const vs = tiledOf(viaScene); for (const x of tiled) { const y = vs.find((b) => b.mat === x.mat && b.tex === x.tex); if (y && y.ora && x.ora && y.ora.length === x.ora.length && y.ora.every((v, i) => v === x.ora[i])) t.keptScene++; else t.bad.push(`${f.name}：经旧版的场景存回去后平铺的画那一行不在了 / 字节变了`); } }
      const back = tiledOf(again);
      for (const x of tiled) { const y = back.find((b) => b.mat === x.mat && b.tex === x.tex); if (y && y.ora && x.ora && y.ora.length === x.ora.length && y.ora.every((v, i) => v === x.ora[i])) t.kept++; else t.bad.push(`${f.name}：旧读者存回去后平铺的画那一行不在了 / 字节变了`); }
    }
    if (same(again, f.bytes)) { r.plainIdentical++; continue; }
    const sp = stampOnly(f.bytes, again);
    // 贴图表的拍子按内容盖（1.2，统筹审格式定 A）：没有平铺的画的文件盖的是旧读者也认识的拍子，存回去必须逐字节一样；只差 CATSUP_textures 的拍子只许出现在表里有平铺的画那种行的文件里（按行判，和写盘一样；孤儿行也算）
    // 比贴图表 1.1 还老的读者（v0.19.18 = 1.0）读任何 1.1 的文件都按自己的拍子写回：内容一字不差，不归这条管（2026-11-13 施工单十八第 1 刀查出：这条从 v0.19.61 起对 v0.19.18 就是红的，判据没想到更老的读者）
    if (sp && sp.some((x) => x.startsWith(".extensions.CATSUP_textures.")) && !F.readCatsup(f.bytes).textures.some(D.isTiledRow) && (O.FORMAT.CATSUP_textures?.minor ?? -1) >= 1) { r.plainBad.push(`${f.name}：表里没有平铺的画那种行，却只差 CATSUP_textures 的拍子（拍子没按内容盖）`); continue; }
    if (sp) { r.plainStampOnly++; for (const x of sp) r.stampPaths.add(x); continue; }   // 旧读者按自己的拍子写回某个扩展（比如它比材质 1.3 老）：内容一字不差
    const tooOldForTextures = !("CATSUP_textures" in O.FORMAT);
    if (tooOldForTextures && hasTextures(f.bytes)) {   // 已知代价：它重写材质扩展；这一版再读它存的那份要能开、几何一样
      try { if (geom(F.readCatsup(again)) === geom(F.readCatsup(f.bytes))) { r.plainKnownCost++; continue; } } catch { /* 落到下面 */ }
    }
    r.plainBad.push(`${f.name}：再存不逐字节一样`);
  }
  const ok = r.uvRefused === r.uvFiles && !r.plainBad.length && !t.bad.length;
  if (!ok) bad++;
  console.log(`${c}：${knowsUv ? "（认识贴图坐标的读者：带贴图坐标的也按下面「打开再存」判）" : ""}带贴图坐标 ${r.uvFiles} 份，拒开（格式太新，报 CATSUP_mesh）${r.uvRefused} 份${r.uvOpened.length ? `，没拒开 ${r.uvOpened.length} 份：${r.uvOpened.slice(0, 5).join("；")}` : ""}；`
    + `不带的 ${r.plain} 份，打开再存逐字节一样 ${r.plainIdentical} 份${r.plainStampOnly ? `、只差拍子（旧读者按自己的拍子写回 ${[...r.stampPaths].join("、")}，内容一字不差）${r.plainStampOnly} 份` : ""}${r.plainKnownCost ? `、已知代价（比贴图表老的读者重写材质扩展，几何一样）${r.plainKnownCost} 份` : ""}${r.plainBad.length ? `，不对 ${r.plainBad.length} 份：${r.plainBad.slice(0, 5).join("；")}` : ""} → ${ok ? "过" : "不过"}`);
  console.log(`  平铺的画：${oldKnowsTiled ? "这个读者认识平铺的画，不按这条判" : !canAskColor ? "这个读者还没有颜色那一槽的问法（比贴图表老），不按这条判" : `${t.files} 份文件 ${t.mats} 个材质，旧读者按底色显示 ${t.baseColor} 个、存回去那一行还在且分层字节一样 ${t.kept} 个（经旧版的场景再存：${t.keptScene} 个）${t.bad.length ? `；不对的：${t.bad.slice(0, 5).join("；")}` : ""}`}`);
}
console.log(`文件：golden ${files.filter((f) => f.name.startsWith("golden")).length} 份 + 随机 ${N} 份（种子 ${SEED}）`);
process.exit(bad ? 1 : 0);
