// 孤儿森林（账本 UX26，user 10-28「所以gltf的好处是texture, material, mesh都不会随着scenegraph一起沉 这么说的话catsup的glb里面，组件应该是孤儿森林，
// 而不是有一个正主其他的是引用 不知道这个我们现在的数据契约能做到吗」）：现状已是——CATSUP_definitions 顶层平表、实例只引用定义 id、零实例的定义照留。
// 这条钉死：一个硬表面体孤儿 + 一个网格体孤儿（场景里一份实例都没有）存了再读回来还在、几何一样；「导出模型」（交付物）不带它们（够不着）。
// created 2026-10-28 by Claude Opus 5.5
// 2026-10-30 Opus 5.5 加两层（user「为什么删实例会有删组件定义的风险？这个风险就不应该有……一共有几层瑞士奶酪？」）：以前只钉了存读这一层，
// 指令层的炸开（同种 / 跨种类两处）却在「最后一份炸掉」时顺手删定义、测试还把它当对的钉着。现在：③ 碰实例的指令跑完定义一个不少；④ 源码里不许有删定义的写法
// （定义只会因为撤销回到它出生之前而不在；以后真要「清理没用的组件」= 一条用户点了才跑、带名单披露的指令，要在这里登记）。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean } };
const join = (...p: string[]): string => p.join("/");
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
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

describe("孤儿森林：指令层不删定义（2026-10-30）", () => {
  /** 最外层一个盒子组件（摆两份）；compKind = 组件的身体。 */
  function two(compKind: "brep" | "mesh"): { s: Scene; a: number; b: number; def: number } {
    const s = new Scene(sceneBox(1, 1)), k = s.brep(s.root).kernel, root = { def: s.root, group: null };
    applyOp(s, { op: "makeComponent", at: root, faces: k.faces().map((f) => k.faceRings3(f.id)!.outer), edges: [], name: "盒" });
    const a = [...s.def(s.root).instances.values()][0];
    applyOp(s, { op: "placeInstance", at: root, definition: a.def, xform: [1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0] });
    if (compKind === "mesh") applyOp(s, { op: "castDefinition", def: a.def, to: "mesh" });
    const b = [...s.def(s.root).instances.values()].find((i) => i.id !== a.id)!;
    return { s, a: a.id, b: b.id, def: a.def };
  }
  const root = (s: Scene) => ({ def: s.root, group: null });
  for (const kind of ["brep", "mesh"] as const) {
    it(`炸开两份（组件 = ${kind}）：一份都不摆了，定义还在`, () => {
      const { s, a, b, def } = two(kind), n0 = s.defs.size;
      applyOp(s, { op: "explode", at: root(s), instance: a, ...(kind === "mesh" ? { cast: true } : {}) });
      applyOp(s, { op: "explode", at: root(s), instance: b, ...(kind === "mesh" ? { cast: true } : {}) });
      eq(s.instanceCount(def), 0); assert(s.defs.has(def), "定义照留"); eq(s.defs.size, n0);
    });
  }
  it("删实例 / 合并：定义还在", () => {
    const { s, a, b, def } = two("brep"), n0 = s.defs.size;
    applyOp(s, { op: "eraseInstance", def: s.root, instance: a });
    assert(s.defs.has(def), "删实例后定义照留");
    const t = two("brep");
    applyOp(t.s, { op: "makeUnique", def: t.s.root, instance: t.b });   // b 换成自己的定义 = 两个不同的组件
    const src = t.s.def(t.s.root).instances.get(t.b)!.def, n1 = t.s.defs.size;
    applyOp(t.s, { op: "mergeObject", at: root(t.s), target: t.a, source: t.b });
    eq(t.s.instanceCount(src), 0); assert(t.s.defs.has(src), "并进去的那个组件一份都不摆了，定义照留"); eq(t.s.defs.size, n1, "合并后定义一个不少"); eq(s.defs.size, n0); void b;
  });
  it("结构守卫：src 里删定义的写法只有清理指令 purgeDefs 一处（defs.delete / defs.clear）", () => {
    const hits: string[] = [];
    const walk = (d: string): void => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.ts$/.test(f)) readFileSync(p, "utf8").split("\n").forEach((l: string, i: number) => { if (/\bdefs\.(delete|clear)\(/.test(l)) hits.push(`${p}:${i + 1}`); }); } };
    walk("src");
    const allowed = hits.filter((h) => h.startsWith(join("src", "editor", "ops.ts")) && readFileSync(join("src", "editor", "ops.ts"), "utf8").split("\n")[Number(h.split(":").pop()) - 1].includes("purgeDefs"));
    eq(hits.length, 1, `只许一处（purgeDefs）：${hits.join(" ")}`); eq(allowed.length, 1, "那一处得是 purgeDefs（用户点了「清理」才跑、带名单）；要加先在这条守卫里登记");
  });
});
