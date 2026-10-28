// 「导出模型」= 给别的软件看的烤好的模型（导出设计稿 ai-docs/20261028-export-design.md §5 / §7；账本 UX39）。created 2026-10-28 by Claude Opus 5.5
// 守住：只有 glTF 2.0 core——没有任何 CATSUP_* 键、没有缩略图 / 参考图、每个 image 都被某个 texture 引用；关线 = 没有 LINES；关贴图 = 没有 image / UV；
// 只导选中的 = 根下只挂那几份；开回 CatsUp 被认成「别的软件的 glb」（只能导入，不会被当成工程备份打开）。工程文件那条（writeCatsup）一个字节不动。
import { describe, it, eq, assert } from "./runner.mjs";
import { documentFromScene, writeCatsup, writeGltfModel } from "../src/format/index.ts";
import { decodeGlb } from "../src/format/glb.ts";
import { isForeignGlb } from "../src/format/gltf-import.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { scenePainted, sceneGrouped, sceneMeshed, docReferenced, TINY_PNG } from "./format-scenes.ts";

type AnyJson = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
const jsonOf = (bytes: Uint8Array): AnyJson => (decodeGlb(bytes) as unknown as { json: AnyJson }).json;
const catsupKeys = (j: unknown, path = ""): string[] => {
  if (!j || typeof j !== "object") return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(j as AnyJson)) { if (k.startsWith("CATSUP_")) out.push(`${path}${k}`); out.push(...catsupKeys(v, `${path}${k}.`)); }
  return out;
};
const ALL = { textures: true, lines: true } as const;

describe("导出模型（write.ts writeGltfModel）", () => {
  it("只有 glTF 2.0 core：没有任何 CATSUP_* 键、asset.version 2.0、没有缩略图；开回 CatsUp = 别的软件的 glb", () => {
    const doc = documentFromScene(scenePainted(), "t");
    doc.thumbnail = { mimeType: "image/png", bytes: TINY_PNG };
    const bytes = writeGltfModel(doc, ALL), j = jsonOf(bytes);
    eq(catsupKeys(j).join(","), "", "CATSUP_* 键");
    eq(j.asset.version, "2.0"); assert(!("thumbnail" in j.asset));
    assert(!(j.images ?? []).some((im: AnyJson) => im.name === "thumbnail"), "缩略图不进交付物");
    assert(isForeignGlb(bytes), "开回 CatsUp 只能导入");
    assert(!isForeignGlb(writeCatsup(doc)), "工程文件仍是工程");
  });
  it("参考图不进交付物；每个 image 都被某个 texture 引用（贴图材质的那张在）", () => {
    const doc = docReferenced();
    const j = jsonOf(writeGltfModel(doc, ALL));
    assert(!JSON.stringify(j).includes(".catsup/references"), "参考牌组不在");
    const used = new Set((j.textures ?? []).map((t: AnyJson) => t.source));
    (j.images ?? []).forEach((_: unknown, i: number) => assert(used.has(i), `image ${i} 没被引用`));
    const painted = jsonOf(writeGltfModel(documentFromScene(scenePainted(), "t"), ALL));
    assert((painted.images ?? []).length >= 1 && (painted.textures ?? []).length >= 1, "贴图材质的贴图在");
  });
  it("关贴图 = 没有 images / textures / TEXCOORD_0，材质只留底色；关线 = 没有 LINES primitive（硬表面 + 网格体都管）", () => {
    const noTex = jsonOf(writeGltfModel(documentFromScene(scenePainted(), "t"), { textures: false, lines: true }));
    assert(!noTex.images && !noTex.textures, "没有贴图");
    assert(!JSON.stringify(noTex.meshes).includes("TEXCOORD_0"), "没有 UV");
    assert(noTex.materials.every((m: AnyJson) => !m.pbrMetallicRoughness.baseColorTexture));
    const modes = (j: AnyJson): number[] => j.meshes.flatMap((m: AnyJson) => m.primitives.map((p: AnyJson) => p.mode));
    for (const sc of [scenePainted, sceneMeshed]) {
      const doc = documentFromScene(sc(), "t");
      assert(modes(jsonOf(writeGltfModel(doc, ALL))).includes(1), `${sc.name}：带线有 LINES`);
      assert(!modes(jsonOf(writeGltfModel(doc, { textures: true, lines: false }))).includes(1), `${sc.name}：关线没有 LINES`);
    }
  });
  it("只导选中的：根节点下只挂给的那几份（带变换），够不着的定义不烤", () => {
    const s = sceneGrouped(), doc = documentFromScene(s, "t");
    const comp = doc.definitions.findIndex((d, i) => i !== doc.rootIndex && d.instances.length === 0 && (d.brep.faces.length > 0 || !!d.mesh));
    assert(comp >= 0, "样本里得有一个组件定义");
    const xf = [...IDENTITY] as unknown as typeof IDENTITY; (xf as unknown as number[])[3] = 5;
    const j = jsonOf(writeGltfModel(doc, { ...ALL, only: [{ definition: comp, xform: xf, name: "那一份" }] }));
    eq(j.nodes[0].children.length, 1); eq(j.nodes[j.nodes[0].children[0]].name, "那一份");
    assert(!("mesh" in j.nodes[0]), "根自己的几何不导");
    eq(j.meshes.length, 1, "只烤够得着的那一个定义");
    eq(catsupKeys(j).join(","), "");
  });
});
