// 孤儿森林（账本 UX26，user 10-28「所以gltf的好处是texture, material, mesh都不会随着scenegraph一起沉 这么说的话catsup的glb里面，组件应该是孤儿森林，
// 而不是有一个正主其他的是引用 不知道这个我们现在的数据契约能做到吗」）：现状已是——CATSUP_definitions 顶层平表、实例只引用定义 id、零实例的定义照留。
// 这条钉死：一个硬表面体孤儿 + 一个网格体孤儿（场景里一份实例都没有）存了再读回来还在、几何一样；「导出模型」（交付物）不带它们（够不着）。
// created 2026-10-28 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, writeGltfModel } from "../src/format/index.ts";
import { decodeGlb } from "../src/format/glb.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { sceneBox, sceneGrouped, sceneFingerprint } from "./format-scenes.ts";

describe("孤儿森林：零实例的定义存读往返不丢（UX26）", () => {
  it("硬表面体孤儿 + 网格体孤儿：写 → 读 → 场景里都在、几何一样、场景指纹相等；交付物不带它们", () => {
    const s = sceneGrouped();
    const hard = s.mintDef("孤儿·硬", sceneBox(1, 1));
    const soft = s.mintDef("孤儿·软", sceneBox(1, 2)); soft.body = brepToMesh(s.brep(soft.id));
    const users = (id: number): number => [...s.defs.values()].reduce((n, d) => n + [...d.instances.values()].filter((i) => i.def === id).length, 0);
    eq(users(hard.id), 0); eq(users(soft.id), 0);
    const doc = documentFromScene(s, "t"), back = sceneFromDocument(readCatsup(writeCatsup(doc)));
    const find = (name: string) => [...back.defs.values()].find((d) => d.name === name);
    const h2 = find("孤儿·硬"), s2 = find("孤儿·软");
    assert(!!h2 && !!s2, "两个孤儿都读回来了");
    eq(h2!.body.kind, "brep"); eq(s2!.body.kind, "mesh");
    eq(back.brep(h2!.id).kernel.faces().length, s.brep(hard.id).kernel.faces().length);
    eq(back.mesh(s2!.id).kernel.faceCount(), s.mesh(soft.id).kernel.faceCount());
    eq(sceneFingerprint(back), sceneFingerprint(s));
    const model = (decodeGlb(writeGltfModel(doc, { textures: true, lines: true })) as unknown as { json: { meshes: { name: string }[] } }).json;
    assert(!model.meshes.some((m) => m.name.startsWith("孤儿")), "交付物只烤够得着的定义");
  });
});
