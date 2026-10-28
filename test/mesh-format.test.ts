// CATSUP_mesh 1.0.0 多边形载荷（M3，2026-10-27 Claude Fable 5.1）：往返逐字；文件里的形状（拍子 / 键 / 定义表 6.4 / 本体 TRIANGLES 给别的查看器）；
// 0.14 三角汤最小形照开（每三角一面）；拍子纪律（major 新拒开、minor 新提示一次）；坏环拒开说清。
import { describe, it, eq, assert } from "./runner.mjs";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument, formatTag } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { FormatTooNewError } from "../src/format/migrate/index.ts";
import { kernelFromMeshDoc, meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { F_SHARP, F_SOFT, F_SMOOTH, FF_HIDDEN, MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { sceneMeshed, sceneFingerprint } from "./format-scenes.ts";

type AnyJson = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
const glbOf = (): { json: AnyJson; bin: Uint8Array } => decodeGlb(writeCatsup(documentFromScene(sceneMeshed(), "t"))) as unknown as { json: AnyJson; bin: Uint8Array };
const meshItem = (g: { json: AnyJson }): AnyJson => g.json.extensions.CATSUP_definitions.list.find((d: AnyJson) => d.kind === "mesh");

describe("CATSUP_mesh 1.0.0：多边形载荷", () => {
  it("往返：四边形仍是四边形；软 + 平滑边、隐藏面、材质槽、f64 坐标逐字保留；场景指纹相等", () => {
    const s = sceneMeshed();
    const back = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    eq(sceneFingerprint(back), sceneFingerprint(s));
    const d = [...back.defs.values()].find((x) => x.body.kind === "mesh")!;
    const m = back.mesh(d.id).kernel;
    eq(m.faceCount(), 6); eq(m.edgeCount(), 12); eq(m.vertexCount(), 8);
    assert(m.faces().every((f) => m.faceVerts(f).length === 4), "四边形没变三角形");
    assert(m.edges().some((e) => (m.edgeFlags[e] & (F_SOFT | F_SMOOTH)) === (F_SOFT | F_SMOOTH)), "软 + 平滑边在");
    eq(m.faces().filter((f) => m.faceFlags[f] & FF_HIDDEN).length, 1, "隐藏面在");
    eq(m.faces().filter((f) => m.faceMat[f] === 0).length, 1, "材质槽在");
    eq(back.mesh(d.id).materialSlots.join(","), "0");
    eq(m.check().length, 0);
  });
  it("文件里：mesh 项带拍子 1.1.0 + 多边形键（不存三角形）；定义表 6.4；本体给别的查看器 TRIANGLES + LINES primitive；签名含 CATSUP_mesh", () => {
    const g = glbOf(), defs = g.json.extensions.CATSUP_definitions, md = meshItem(g);
    eq(defs.version, 6); eq(defs.minor, 4);
    eq(md.mesh.version, 1); eq(md.mesh.minor, 1, "1.1：默认平滑（2026-10-28）"); assert(!("patch" in md.mesh), "0 不写");
    eq(md.mesh.smoothDefault?.mode, "angle", "转换来的网格体 = 按角度（scene/kinds.ts keepLookUnderAngle）");
    for (const k of ["positions", "faceStart", "faceLen", "loopVert", "faceMat", "faceFlags", "edgePairs", "edgeFlags"]) assert(typeof md.mesh[k]?.bufferView === "number", `缺 ${k}`);
    assert(!("indices" in md.mesh) && !("triMaterial" in md.mesh), "三角形是派生物，不存");
    eq(md.mesh.faceStart.count, 6); eq(md.mesh.positions.count, 8); eq(md.mesh.edgePairs.count, 1);
    const node = g.json.nodes.find((n: AnyJson) => n.name === "网格盒");
    assert(node && typeof node.mesh === "number", "网格体有 glTF 节点 + mesh");
    const prims = g.json.meshes[node.mesh].primitives as AnyJson[];
    assert(prims.some((p) => (p.mode ?? 4) === 4) && prims.some((p) => p.mode === 1), "TRIANGLES + LINES");
    assert(prims.some((p) => p.material === 0), "涂了材质的面单独一个 primitive");
    eq(formatTag(), "3.1.0-4.2.0-6.4.0-1.0.0-1.0.0-1.1.0-1.0.0-1.1.0");   // CATSUP_mesh 1.1（2026-10-28 默认平滑）
    assert(!g.json.extensionsUsed.includes("CATSUP_mesh"), "不是顶层扩展（住在定义里）");
  });
  it("0.14 的三角汤最小形（没拍子、只有 positions / indices）照开：每三角一面；重存变成多边形载荷", () => {
    const g = glbOf(), md = meshItem(g);
    let bin = g.bin;
    const addView = (bytes: Uint8Array): number => { const off = (bin.length + 3) & ~3; const nb = new Uint8Array(off + bytes.length); nb.set(bin); nb.set(bytes, off); bin = nb; g.json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length }); return g.json.bufferViews.length - 1; };
    const f32 = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), u32 = new Uint32Array([0, 1, 2, 0, 2, 3, 1, 1, 2]);   // 两张三角 + 一张退化的
    md.mesh = { positions: { bufferView: addView(new Uint8Array(f32.buffer)), count: 4 }, indices: { bufferView: addView(new Uint8Array(u32.buffer)), count: 9 } };
    g.json.buffers[0].byteLength = bin.length;
    const doc = readCatsup(encodeGlb(g.json, bin));
    const dm = doc.definitions.find((d) => d.kind === "mesh")!;
    eq(dm.mesh!.faceStart.length, 2); assert(dm.mesh!.faceLen.every((n) => n === 3));
    const m = kernelFromMeshDoc(dm.mesh!); eq(m.faceCount(), 2); eq(m.vertexCount(), 4);
    const g2 = decodeGlb(writeCatsup(doc)) as unknown as { json: AnyJson };
    assert(typeof meshItem(g2).mesh.faceStart?.bufferView === "number" && meshItem(g2).mesh.version === 1, "重存 = 多边形载荷");
  });
  it("拍子纪律：mesh 项 major 2 → 拒开（FormatTooNewError）；minor 比本版新 → 能开 + readNotes.newerMinor 记 CATSUP_mesh", () => {
    const g = glbOf(); meshItem(g).mesh.version = 2;
    let threw: unknown = null; try { readCatsup(encodeGlb(g.json, g.bin)); } catch (e) { threw = e; }
    assert(threw instanceof FormatTooNewError, `该拒开：${String(threw)}`);
    const g2 = glbOf(); meshItem(g2).mesh.minor = 9;
    const doc = readCatsup(encodeGlb(g2.json, g2.bin));
    assert(doc.readNotes?.newerMinor.some((n) => n.ext === "CATSUP_mesh"), "minor 新 → 提示一次");
  });
  it("坏环拒开说清（不静默丢）", () => {
    const g = glbOf(), md = meshItem(g);
    md.mesh.faceLen = { ...md.mesh.faceLen, bufferView: md.mesh.positions.bufferView };   // 面表指到坐标表：长度对不上
    let msg = ""; try { readCatsup(encodeGlb(g.json, g.bin)); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    assert(msg.length > 0, "该报错");
    let m2 = ""; try { kernelFromMeshDoc({ positions: new Float64Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), faceStart: Int32Array.from([0]), faceLen: Int32Array.from([3]), loopVert: Int32Array.from([0, 1, 7]), faceMat: Int32Array.from([-1]), faceFlags: new Uint8Array(1), edgePairs: new Int32Array(0), edgeFlags: new Uint8Array(0) }, "t"); } catch (e) { m2 = e instanceof Error ? e.message : String(e); }
    assert(/vertex 7/.test(m2), `越界顶点要点名：${m2}`);
  });
  it("默认平滑（1.1，2026-10-28）：往返保住 mode / deg；没这个键的老载荷 = 全硬（只看手标，和以前逐字一样）；手标硬的位 32 往返", () => {
    const m = new MeshKernel(); addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    m.setSmoothDefault({ mode: "angle", deg: 25 });
    const e0 = m.edges()[0]; m.setEdgeFlags(e0, F_SHARP);
    const doc = meshDocFromKernel(m);
    eq(JSON.stringify(doc.smoothDefault), JSON.stringify({ mode: "angle", deg: 25 }));
    const back = kernelFromMeshDoc(doc);
    eq(back.smoothDefault.mode, "angle"); eq(back.smoothDefault.deg, 25);
    eq(back.edges().filter((e) => back.edgeFlags[e] & F_SHARP).length, 1, "手标硬的位往返");
    const legacy = kernelFromMeshDoc({ ...doc, smoothDefault: undefined });
    eq(legacy.smoothDefault.mode, "hard", "缺键 = 老文件 = 全硬");
  });
});
