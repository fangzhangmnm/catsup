// 定稿（ai-docs/20261024-finalize.md）：内容指纹只看内容（brep / 组 / 实例 / 参考几何 / 材质 / 轴），不看视图 / 设置 / 缩略图；
// 写法无关（规范序）；几何 / 材质一动就变；记录 write → read 原样回来，坏记录当没有。created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { newDocument, writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { contentFingerprint, isFinalRecord } from "../src/format/final.ts";
import { sceneBox, SCENE_DOCS, TINY_PNG } from "./format-scenes.ts";

const S = 2, H = 1.5;
function boxReversed(): Kernel {   // 同一个盒子、反向乱序画法（抄 format.test 的规范序案：5 个环，顶面由墙顶边自动合）
  const k = new Kernel();
  const P = (x: number, y: number, z: number) => ({ x, y, z });
  const loops: [number, number, number][][] = [
    [[0, S, 0], [0, 0, 0], [0, 0, H], [0, S, H]],
    [[S, S, 0], [0, S, 0], [0, S, H], [S, S, H]],
    [[0, 0, 0], [0, S, 0], [S, S, 0], [S, 0, 0]],
    [[S, 0, 0], [S, S, 0], [S, S, H], [S, 0, H]],
    [[0, 0, 0], [S, 0, 0], [S, 0, H], [0, 0, H]],
  ];
  for (const l of loops) k.addEdges(l.map((p, i) => [P(...p), P(...l[(i + 1) % l.length])] as [ReturnType<typeof P>, ReturnType<typeof P>]));
  return k;
}

describe("final: 内容指纹", () => {
  it("同一场景算两次一样；write → read 回来一样；视图 / 设置 / 缩略图不进指纹", async () => {
    for (const [name, make] of Object.entries(SCENE_DOCS)) {
      const doc = documentFromScene(make(), name);
      const a = await contentFingerprint(doc);
      eq(a.length, 64, `${name} sha256 hex`);
      eq(await contentFingerprint(doc), a, `${name} 稳定`);
      doc.desk = { ...doc.desk, lastView: { eye: [1, 2, 3], target: [0, 0, 0] }, menuTabs: { main: "settings" } };   // 桌面态（CATSUP_desk）不进指纹
      doc.settings = { ...doc.settings, gridStep: 0.25, absoluteGrid: true };
      doc.thumbnail = { mimeType: "image/png", bytes: TINY_PNG };
      eq(await contentFingerprint(doc), a, `${name} 视图态无关`);
      const back = readCatsup(writeCatsup(doc));
      eq(await contentFingerprint(back), a, `${name} 往返`);
      eq(await contentFingerprint(documentFromScene(sceneFromDocument(back), name)), a, `${name} 重建场景再算`);
    }
  });
  it("写法无关：盒子正画 / 反向乱序画 → 同一指纹", async () => {
    const a = await contentFingerprint(newDocument(sceneBox(S, H).toBrep(), "t"));
    const b = await contentFingerprint(newDocument(boxReversed().toBrep(), "t"));
    eq(b, a);
  });
  it("几何 / 材质 / 轴一动就变", async () => {
    const base = documentFromScene(new Scene(sceneBox()), "t");
    const a = await contentFingerprint(base);
    const moved = documentFromScene(new Scene(sceneBox(2, 1.6)), "t");
    assert((await contentFingerprint(moved)) !== a, "高度变");
    const painted = documentFromScene(SCENE_DOCS.painted(), "t");
    const p1 = await contentFingerprint(painted);
    painted.materials[0].color = [0.1, 0.2, 0.3];
    assert((await contentFingerprint(painted)) !== p1, "材质颜色变");
    const axed = documentFromScene(new Scene(sceneBox()), "t");
    axed.axes = { ...axed.axes, origin: { x: 1, y: 0, z: 0 } };
    assert((await contentFingerprint(axed)) !== a, "绘图轴变");
  });
});

describe("final: 记录往返", () => {
  it("final / finalRev write → read 原样；没定稿的文档读回来没有这两个键", async () => {
    const doc = documentFromScene(SCENE_DOCS.grouped(), "g");
    const plain = readCatsup(writeCatsup(doc));
    assert(plain.final === undefined && plain.finalRev === undefined, "没定稿不该有键");
    const fp = await contentFingerprint(doc);
    doc.final = { at: "2026-10-24T18:00:00.000Z", rev: 3, app: "v0.12.8-test", fingerprint: fp };
    doc.finalRev = 3;
    const back = readCatsup(writeCatsup(doc));
    eq(JSON.stringify(back.final), JSON.stringify(doc.final), "记录");
    eq(back.finalRev, 3, "finalRev");
    eq(await contentFingerprint(back), fp, "读回来的内容指纹仍对得上记录");
    // 改稿后：final 删、finalRev 留
    delete back.final;
    const again = readCatsup(writeCatsup(back));
    assert(again.final === undefined, "改稿后无记录");
    eq(again.finalRev, 3, "改过几版留着");
  });
  it("坏记录当没有（isFinalRecord）", () => {
    assert(isFinalRecord({ at: "x", rev: 1, app: "", fingerprint: "a".repeat(64) }));
    assert(!isFinalRecord({ at: "x", rev: 1, fingerprint: "short" }));
    assert(!isFinalRecord({ at: "x", fingerprint: "a".repeat(64) }));
    assert(!isFinalRecord(null));
    assert(!isFinalRecord("final"));
  });
});
