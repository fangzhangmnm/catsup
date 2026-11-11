// 冷的画、变热（贴图主线 1-8b，统筹 11-11：冷的画不解开，显示存盘时存下的合成图）。created 2026-11-11 by Claude Opus 5.5
// ① 读回来的画是冷的：不建画板、图块池一块不占，显示的是存下的合成图（「画」的取样方式）；没有合成图 / 记号对不上 = 照底色（board() 是 null）。
// ② 冷的画绝不能被建成空白画板（ensure 抛 ColdPaintError）。③ 变热：解开分层字节建画板，每层逐字节 = 存之前（来回一格不差的最后一段）。
// ④ 尺寸不对 / 解不开 = 只能看不能画：说一句为什么、不建画板、照合成图继续显示。⑤ 冷的画底色变了 = 自己热一次。⑥ 解到一半换了文件 = 作废。
import { describe, it, eq, assert } from "./runner.mjs";
import "./paint-save-kit.ts";
import { dataPrint, layeredData } from "./paint-save-kit.ts";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { appTilePool } from "../src/paint/kernel/src/backend/tiles/app-tile-pool.ts";
import { PaintBoards, ColdPaintError, pngSize } from "../src/paint/boards.ts";
import { PaintSaver } from "../src/paint/save.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import type { Scene } from "../src/scene/scene.ts";
import type { TextureRef } from "../src/minccino/contract/stream.ts";
import { rig, rng } from "./paint-undo-kit.ts";

/** 画两张（多层、画一笔擦一笔），存盘、读回来：返回读回来的场景 + 存之前每张的指纹。 */
async function savedAndRead(seed = 21): Promise<{ s: Scene; texs: string[]; prints: string[] }> {
  const r = rig(2), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 60));
  texs.forEach((t, i) => { const b = r.boards.ensure(r.cur(), t); r.boards.load(t, layeredData(b.width, b.height, seed + i)); r.stroke([t], rnd); r.stroke([t], rnd, true); });
  const prints = texs.map((t) => dataPrint(r.boards.get(t)!.wp.exportData()));
  const bytes = writeCatsup(await new PaintSaver({ boards: r.boards, wroteWith: "catsup test" }).freeze(documentFromScene(r.cur(), "t"), r.cur(), "save").finish());
  r.boards.disposeAll();
  return { s: sceneFromDocument(readCatsup(bytes)), texs, prints };
}
function boardsFor(said: string[] = []) { let ep = 0; const reg = new PaintBoards({ port: () => new SoftGl2Port(), epoch: () => ep, say: (t) => said.push(t) }); return { reg, switchFile: () => { ep++; } }; }
const tiles = (): number => appTilePool().stats().count;

describe("冷的画（1-8b）", () => {
  it("读回来的画是冷的：没有画板、图块池一块不占；显示存下的合成图（画的取样方式、大小 = 合成图的）", async () => {
    const { s, texs } = await savedAndRead();
    const t0 = tiles(), { reg } = boardsFor();
    reg.prepare(s);
    eq(reg.count, 0, "没有画板"); eq(tiles(), t0, "图块池没动");
    for (const t of texs) {
      const shown = reg.board(t)!, img = shown.image as TextureRef;
      assert(!!img.paint && img.paint.base.length === 3, "画的取样方式（带着底色当占位）");
      eq(JSON.stringify(pngSize(img.bytes)), JSON.stringify({ width: shown.width, height: shown.height }), "大小 = 合成图的");
      eq(reg.stateOf(s, t), "cold");
    }
    assert(reg.sig().includes(":cold:"), "进了签名（材质会按它建）");
  });
  it("冷的画绝不能被建成空白画板：ensure 抛 ColdPaintError，什么都没建", async () => {
    const { s, texs } = await savedAndRead(23), { reg } = boardsFor();
    let threw: unknown = null; try { reg.ensure(s, texs[0]); } catch (e) { threw = e; }
    assert(threw instanceof ColdPaintError, String(threw));
    eq(reg.count, 0, "没建画板");
  });
  it("变热：每层逐字节 = 存之前（来回一格不差）；热了之后显示的是活的图", async () => {
    const { s, texs, prints } = await savedAndRead(25), { reg } = boardsFor();
    for (const [i, t] of texs.entries()) {
      eq(await reg.warm(s, t), "hot");
      eq(dataPrint(reg.get(t)!.wp.exportData()), prints[i], `第 ${i + 1} 张逐层逐字节`);
      eq((reg.board(t)!.image as { kind?: string }).kind, "live", "热了 = 活的图");
    }
    reg.disposeAll();
  });
  it("尺寸不对 / 解不开 = 只能看不能画：说一句为什么、不建画板、照合成图继续显示、落笔前问得到原因", async () => {
    const narrow = await new PaintSaver({ boards: { get: () => undefined }, wroteWith: "catsup test" }).encodeOra(layeredData(512, 256, 5), "catsup test");   // 宽 512（坐标宽 1024）
    for (const [what, ora] of [["尺寸不对", narrow], ["解不开", new Uint8Array([1, 2, 3, 4])]] as const) {
      const { s, texs } = await savedAndRead(27), t = texs[0], row = s.textures.get(t)!;
      s.addTexture({ ...row, content: { kind: "layered", ora } });
      const said: string[] = [], { reg } = boardsFor(said);
      reg.prepare(s);
      eq(await reg.warm(s, t), "view-only", what);
      eq(reg.count, 0, `${what}：没建画板`);
      eq(reg.stateOf(s, t), "view-only");
      assert(said.length === 1 && said[0].includes("只能看不能画"), `${what}：说了一句（${said.join("｜")}）`);
      assert(reg.viewOnlyWhy(t) === said[0], "落笔前问得到原因");
      eq(await reg.warm(s, t), "view-only", "再问不再说");
      eq(said.length, 1);
    }
  });
  it("没有合成图（老文件）/ 记号对不上 = 照底色（board() 是 null），还是冷的", async () => {
    const { s, texs } = await savedAndRead(29), t = texs[0], row = s.textures.get(t)!;
    s.addTexture({ ...row, composite: undefined });
    const { reg } = boardsFor(); reg.prepare(s);
    eq(reg.board(t), null, "没有合成图"); eq(reg.stateOf(s, t), "cold");
    s.addTexture({ ...row, composite: { ...row.composite!, of: { ...row.composite!.of, sum: "00000000" } } });
    reg.prepare(s);
    eq(reg.board(t), null, "记号对不上");
  });
  it("冷的画底色变了：自己热一次（之后存盘的合成图垫的是新底色）", async () => {
    const { s, texs } = await savedAndRead(31);
    const mi = s.materials.findIndex((m) => m.channels && Object.values(m.channels).some((g) => g.includes(texs[0])));
    s.materials[mi] = { ...s.materials[mi], color: [0.2, 0.4, 0.6] };   // 现在没有改材质颜色的指令；底色会变的路 = 粘贴「更新」/ 别的版本写的文件，这里直接换
    const { reg } = boardsFor(); reg.prepare(s);
    for (let i = 0; i < 50 && reg.stateOf(s, texs[0]) !== "hot"; i++) await new Promise((r) => setTimeout(r, 10));
    eq(reg.stateOf(s, texs[0]), "hot", "底色变了的那张热了");
    eq(reg.stateOf(s, texs[1]), "cold", "别的那张还是冷的");
    const row = (await new PaintSaver({ boards: reg, wroteWith: "catsup test" }).freeze(documentFromScene(s, "t"), s, "save").finish()).textures.find((x) => x.guid === texs[0])!;
    eq(JSON.stringify(row.composite!.base), JSON.stringify([0.2, 0.4, 0.6]), "合成图垫的是新底色");
    reg.disposeAll();
  });
  it("解到一半换了文件：作废，不建画板", async () => {
    const { s, texs } = await savedAndRead(33), { reg, switchFile } = boardsFor();
    const p = reg.warm(s, texs[0]);
    switchFile(); reg.sync(s);
    await p;
    eq(reg.count, 0, "没建画板");
  });
});

