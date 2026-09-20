// src/format golden：往返 / 幂等 / 未知保留 / 拒开更新版 / 体积预算 / 冻结样本语料（立宪 §7）。created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup } from "../src/format/index.ts";
import { decodeGlb, encodeGlb, isGlb } from "../src/format/glb.ts";
import { isCatsupGltf } from "../src/format/read.ts";
import { FormatTooNewError, EXTENSION_VERSIONS } from "../src/format/migrate/index.ts";
import { canonicalize } from "../src/format/brep-codec.ts";
import { SCENES, fingerprint } from "./format-scenes.ts";
import { listFixtures, readFixture } from "./fixtures/format/fixtures.mjs";

const BUDGET_BYTES: Record<string, number> = { box: 2600, holed: 2800, house: 2800 };   // §3.2「抠」：golden 体积预算（实测 2.4–2.6 KB，JSON 结构占 2 KB；超了先问为什么）

function roundTrip(k: Kernel): { bytes: Uint8Array; k2: Kernel } {
  const bytes = writeCatsup(newDocument(k.toBrep(), "t"));
  const doc = readCatsup(bytes);
  return { bytes, k2: Kernel.fromBrep(doc.root.brep) };
}

describe("format: golden 往返", () => {
  for (const [name, make] of Object.entries(SCENES)) {
    it(`${name}：write → read → fromBrep 指纹一致；再 write 逐字节一致（规范序 + 幂等）；体积 ≤ ${BUDGET_BYTES[name]} B`, () => {
      const k = make();
      const { bytes, k2 } = roundTrip(k);
      assert(isGlb(bytes));
      eq(fingerprint(k2), fingerprint(k), "指纹");
      eq(k2.faces().length, k.faces().length, "面数");
      const again = writeCatsup(newDocument(k2.toBrep(), "t"));
      eq(again.byteLength, bytes.byteLength, "长度");
      assert(again.every((b, i) => b === bytes[i]), "逐字节");
      assert(bytes.byteLength <= BUDGET_BYTES[name], `${name} ${bytes.byteLength} B 超预算 ${BUDGET_BYTES[name]}`);
    });
  }

  it("规范序：同一几何不同画法（顺序打乱）→ 同一字节", () => {
    const a = SCENES.box();
    const b = new Kernel();
    // 反向、乱序画同一个盒子
    const S = 2, H = 1.5;
    const P = (x: number, y: number, z = 0) => ({ x, y, z });
    const loops: [number, number, number][][] = [
      [[0, S, 0], [0, 0, 0], [0, 0, H], [0, S, H]],
      [[S, S, 0], [0, S, 0], [0, S, H], [S, S, H]],
      [[0, 0, 0], [0, S, 0], [S, S, 0], [S, 0, 0]],
      [[S, 0, 0], [S, S, 0], [S, S, H], [S, 0, H]],
      [[0, 0, 0], [S, 0, 0], [S, 0, H], [0, 0, H]],
    ];
    for (const l of loops) b.addEdges(l.map((p, i) => [P(...p), P(...l[(i + 1) % l.length])] as [ReturnType<typeof P>, ReturnType<typeof P>]));
    eq(fingerprint(b), fingerprint(a));
    const ba = writeCatsup(newDocument(a.toBrep(), "t")), bb = writeCatsup(newDocument(b.toBrep(), "t"));
    assert(ba.byteLength === bb.byteLength && ba.every((x, i) => x === bb[i]), "同几何同字节");
  });

  it("bake 结构：一个 mesh，TRIANGLES + LINES，POSITION float32 Y-up，无 NORMAL；asset 2.1/minVersion 2.0；extensionsRequired 空", () => {
    const bytes = writeCatsup(newDocument(SCENES.box().toBrep(), "t"));
    const { json } = decodeGlb(bytes) as { json: any };
    eq(json.asset.version, "2.1"); eq(json.asset.minVersion, "2.0");
    eq(json.extensionsRequired.length, 0);
    eq(json.meshes.length, 1);
    const modes = json.meshes[0].primitives.map((p: any) => p.mode).sort();
    eq(JSON.stringify(modes), "[1,4]");
    assert(json.meshes[0].primitives.every((p: any) => p.attributes.NORMAL === undefined), "无 NORMAL");
    const pos = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
    eq(pos.componentType, 5126); eq(pos.count, 8);
    eq(pos.min[1], 0, "Y-up：z→y 最小 0"); eq(pos.max[1], 1.5, "最大 1.5");
    eq(json.accessors[json.meshes[0].primitives[0].indices].count, 36, "6 面 × 2 三角 × 3");
    assert(isCatsupGltf(json));
    assert(!isCatsupGltf({ asset: { version: "2.0" } }), "外来 glb 不算文档");
  });

  it("round-trip 保真：未知顶层键 / 未知扩展 / 文档扩展未知字段 / extras 原样带回", () => {
    const k = SCENES.box();
    const bytes = writeCatsup(newDocument(k.toBrep(), "t"));
    const { json, bin } = decodeGlb(bytes) as { json: any; bin: Uint8Array };
    json.myTopLevel = { keep: 1 };
    json.extensions.FOO_plugin = { hello: "world" };
    json.extensions.CATSUP_document.futureField = [1, 2, 3];
    json.extensions.CATSUP_definitions.list[0].extras = { note: "手记" };
    json.extensions.CATSUP_definitions.list[0].brep.attributes.face = { "plugin:heat": { type: "u8", note: "opaque" } };
    const doc = readCatsup(encodeGlb(json, bin));
    const out = decodeGlb(writeCatsup(doc)).json as any;
    eq(out.myTopLevel.keep, 1);
    eq(out.extensions.FOO_plugin.hello, "world");
    eq(JSON.stringify(out.extensions.CATSUP_document.futureField), "[1,2,3]");
    eq(out.extensions.CATSUP_definitions.list[0].extras.note, "手记");
    eq(out.extensions.CATSUP_definitions.list[0].brep.attributes.face["plugin:heat"].type, "u8");
    eq(out.extensions.CATSUP_document.settings.gridStep, 1);
  });

  it("round-trip 保真（二进制）：未知扩展引用的 bufferView 随行、重写后字节一致且索引重映射", () => {
    const bytes = writeCatsup(newDocument(SCENES.box().toBrep(), "t"));
    const { json, bin } = decodeGlb(bytes) as { json: any; bin: Uint8Array };
    const payload = new Uint8Array([7, 7, 7, 7, 8, 8, 8, 8]);
    const grown = new Uint8Array(bin.byteLength + 8); grown.set(bin); grown.set(payload, bin.byteLength);
    json.bufferViews.push({ buffer: 0, byteOffset: bin.byteLength, byteLength: 8 });
    json.buffers[0].byteLength = grown.byteLength;
    const idx = json.bufferViews.length - 1;
    json.extensions.FOO_bin = { blob: { bufferView: idx, note: "opaque" } };
    json.extensions.CATSUP_definitions.list[0].brep.attributes.face = { "plugin:heat": { type: "u8", bufferView: idx } };
    const doc = readCatsup(encodeGlb(json, grown));
    eq(doc.carry.views.size, 1);
    const out = decodeGlb(writeCatsup(doc)) as { json: any; bin: Uint8Array };
    const newIdx = out.json.extensions.FOO_bin.blob.bufferView;
    assert(typeof newIdx === "number" && newIdx !== idx, "索引重映射");
    eq(out.json.extensions.CATSUP_definitions.list[0].brep.attributes.face["plugin:heat"].bufferView, newIdx, "同一视图同一新索引");
    const bv = out.json.bufferViews[newIdx];
    const got = out.bin.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength);
    eq(Array.from(got).join(","), Array.from(payload).join(","), "字节一致");
  });

  it("拒开比 app 新的子结构版本（FormatTooNewError），老版本缺迁移步骤报错，缺 version 视为 1", () => {
    const bytes = writeCatsup(newDocument(SCENES.box().toBrep(), "t"));
    const { json, bin } = decodeGlb(bytes) as { json: any; bin: Uint8Array };
    json.extensions.CATSUP_definitions.list[0].brep.version = EXTENSION_VERSIONS.CATSUP_brep + 1;
    let err: unknown;
    try { readCatsup(encodeGlb(json, bin)); } catch (e) { err = e; }
    assert(err instanceof FormatTooNewError, `应为 FormatTooNewError：${String(err)}`);
    delete json.extensions.CATSUP_document.version;
    json.extensions.CATSUP_definitions.list[0].brep.version = EXTENSION_VERSIONS.CATSUP_brep;
    const doc = readCatsup(encodeGlb(json, bin));
    eq(Kernel.fromBrep(doc.root.brep).faces().length, 6);
  });

  it("缩略图：BIN 首段 + asset.thumbnail → images[0]；往返带回", () => {
    const doc = newDocument(SCENES.box().toBrep(), "t");
    doc.thumbnail = { mimeType: "image/jpeg", bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) };
    const bytes = writeCatsup(doc);
    const { json } = decodeGlb(bytes) as { json: any };
    eq(json.asset.thumbnail, 0);
    eq(json.bufferViews[json.images[0].bufferView].byteOffset, 0, "缩略图在 BIN 首段（头片 peek）");
    const back = readCatsup(bytes);
    eq(back.thumbnail!.bytes.byteLength, 4);
    eq(back.thumbnail!.bytes[1], 0xd8);
  });

  it("canonicalize 幂等且不改拓扑", () => {
    const s = SCENES.house().toBrep();
    const c1 = canonicalize(s), c2 = canonicalize(c1);
    eq(JSON.stringify(c2), JSON.stringify(c1));
    eq(Kernel.fromBrep(c1).faces().length, Kernel.fromBrep(s).faces().length);
  });
});

describe("format: 冻结样本语料（立宪 §7；老样本永远能开）", () => {
  const v = EXTENSION_VERSIONS.CATSUP_brep;
  const files: string[] = listFixtures(v);
  it(`v${v} 目录里每个 golden 场景都有样本`, () => {
    for (const name of Object.keys(SCENES)) assert(files.includes(`${name}.glb`), `缺样本 v${v}/${name}.glb（node scripts/freeze-format-fixtures.mjs）`);
  });
  for (const f of files) {
    it(`v${v}/${f}：读 → fromBrep → 指纹 = 当前场景；重写后语义一致`, () => {
      const name = f.replace(/\.glb$/, "");
      const doc = readCatsup(readFixture(v, f));
      const k = Kernel.fromBrep(doc.root.brep);
      if (SCENES[name]) eq(fingerprint(k), fingerprint(SCENES[name]()), "样本 vs 当前场景");
      const doc2 = readCatsup(writeCatsup(doc));
      eq(JSON.stringify(canonicalize(doc2.root.brep)), JSON.stringify(canonicalize(doc.root.brep)), "重写语义一致");
    });
  }
});
