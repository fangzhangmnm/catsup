// 画的合成图进文件（CATSUP_textures 1.1，贴图主线 1-8b，统筹 11-11）：贴图行上可选键 composite = { png, of: { bytes, sum }, base }。created 2026-11-11 by Claude Opus 5.5
// ① 来回：写了读回来一个字节不差（png、记号、底色）；没有合成图的行写出来没有这个键。② 形状不对：不认、当不认识的键原样带回（再写一遍逐字节相同），不拒开。
// ③ compositeFits：分层字节长度 / 校验和对不上、底色不一样、没有分层字节 = 当它没有。
import { describe, it, eq, assert } from "./runner.mjs";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, decodeGlb } from "../src/format/index.ts";
import { encodeGlb } from "../src/format/glb.ts";
import { compositeFits, paintBytesSum, type TextureDoc } from "../src/format/document.ts";
import { sceneUvPaintedComposite, sceneUvPainted, COMPOSITE_TWO_LAYERS_PNG, ORA_TWO_LAYERS_1024x256 } from "./format-scenes.ts";

type Rows = { extensions: Record<string, { list: Record<string, unknown>[] }> };
const paintRow = (doc: { textures: readonly TextureDoc[] }): TextureDoc => doc.textures.find((t) => t.content.kind === "layered")!;
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

describe("画的合成图进文件（textures 1.1，1-8b）", () => {
  it("来回：png、记号、底色一个字节不差；再写一遍文件逐字节相同；没有合成图的行不写这个键", () => {
    const bytes = writeCatsup(documentFromScene(sceneUvPaintedComposite(), "t"));
    const doc = readCatsup(bytes), t = paintRow(doc);
    assert(!!t.composite && same(t.composite.png, COMPOSITE_TWO_LAYERS_PNG), "png 一样");
    eq(JSON.stringify([t.composite!.of, t.composite!.base]), JSON.stringify([{ bytes: ORA_TWO_LAYERS_1024x256.length, sum: paintBytesSum(ORA_TWO_LAYERS_1024x256) }, [0.9, 0.85, 0.7]]), "记号和底色");
    assert(same(writeCatsup(documentFromScene(sceneFromDocument(doc), "t")), bytes), "读进场景再写：逐字节相同");
    const plain = decodeGlb(writeCatsup(documentFromScene(sceneUvPainted(), "t")));
    const rows = (plain.json as Rows).extensions.CATSUP_textures.list;
    assert(rows.every((r) => !("composite" in r)), "没有合成图的行不写 composite");
  });
  it("形状不对的 composite：不认、当不认识的键原样带回（不拒开），再写一遍逐字节相同", () => {
    const g = decodeGlb(writeCatsup(documentFromScene(sceneUvPainted(), "t")));
    const row = (g.json as Rows).extensions.CATSUP_textures.list.find((r) => (r.content as { kind: string }).kind === "layered")!;
    row.composite = { png: "以后的形状", of: 3 };
    const bytes = encodeGlb(g.json, g.bin);
    const doc = readCatsup(bytes), t = paintRow(doc);
    eq(t.composite, undefined, "不认");
    assert(!!t.extra && JSON.stringify(t.extra.json).includes("以后的形状"), "原样带着");
    const again = decodeGlb(writeCatsup(doc));
    const row2 = (again.json as Rows).extensions.CATSUP_textures.list.find((r) => (r.content as { kind: string }).kind === "layered")!;
    eq(JSON.stringify(row2.composite), JSON.stringify({ png: "以后的形状", of: 3 }), "写回去原样");
  });
  it("compositeFits：记号对得上 + 底色一样才算数", () => {
    const t = paintRow(readCatsup(writeCatsup(documentFromScene(sceneUvPaintedComposite(), "t"))));
    assert(compositeFits(t, [0.9, 0.85, 0.7]), "对得上");
    assert(!compositeFits(t, [0.9, 0.85, 0.71]), "底色变了");
    const ora = (t.content as { ora: Uint8Array }).ora, flipped = new Uint8Array(ora); flipped[40] ^= 1;
    assert(!compositeFits({ ...t, content: { kind: "layered", ora: flipped } }, [0.9, 0.85, 0.7]), "同长度、校验和不一样");
    assert(!compositeFits({ ...t, content: { kind: "layered", ora: ora.subarray(1) } }, [0.9, 0.85, 0.7]), "长度不一样");
    assert(!compositeFits({ ...t, content: { kind: "layered", ora: null } }, [0.9, 0.85, 0.7]), "没有分层字节");
    assert(!compositeFits({ ...t, composite: undefined }, [0.9, 0.85, 0.7]), "没有合成图");
  });
});
