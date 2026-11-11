// 画板和画板登记处（贴图主线 1-3c，施工单 ai-docs/20261111-paint-workorders-10.md）：内核的软件显卡上跑。created 2026-11-11 by Claude Opus 5.5
// 画板：灌进去的字节合成出来一字不差（不透明的底色垫在透明处）、内容 / 底色没变 = 同一张图同一个版本；跟着坐标加高 / 缩回空白 / 有内容不缩（统筹 11-11 裁定）。
// 登记处：换文件全部销毁、画没了那块歇着（留到关文件；0-3a 统筹改判）、跟着场景里那一套坐标改大小（follow，1-8a 起在提交的收尾里）、签名跟着变。
import { describe, it, eq, assert } from "./runner.mjs";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoard } from "../src/paint/board.ts";
import { PaintBoards } from "../src/paint/boards.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, type Op } from "../src/editor/ops.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { mintGuid } from "../src/format/guid.ts";
import { sceneBox } from "./format-scenes.ts";

const pattern = (w: number, h: number, hole = false): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; px[o] = (x * 7) & 255; px[o + 1] = (y * 11) & 255; px[o + 2] = (x + 3 * y) & 255; px[o + 3] = hole && x < 3 && y < 2 ? 0 : 255; }
  return px;
};
const layer = (w: number, h: number, px: Uint8ClampedArray, rect = { x: 0, y: 0, w, h }) =>
  ({ width: w, height: h, nodes: [{ name: "L", visible: true, opacity: 1, mode: "source-over", clippingMask: false, lockAlpha: false, pixels: { rect, bytes: px } }] });
const readAll = (port: SoftGl2Port, b: PaintBoard): Uint8Array => { const r = b.compose()!; return port.readPixels(r.fbo, 0, 0, b.width, b.height); };

describe("画板（1-3c）", () => {
  it("灌进去的字节合成出来一字不差；透明的地方垫的是不透明的底色", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 40, height: 30 });
    b.setBackground([0.2, 0.4, 0.6]);
    const px = pattern(40, 30, true);
    b.load(layer(40, 30, px));
    const got = readAll(port, b);
    let bad = 0;
    for (let i = 0; i < px.length; i += 4) {
      const hole = px[i + 3] === 0, want = hole ? [51, 102, 153, 255] : [px[i], px[i + 1], px[i + 2], 255];
      for (let k = 0; k < 4; k++) if (Math.abs(got[i + k] - want[k]) > (hole ? 1 : 0)) bad++;
    }
    eq(bad, 0, "每个字节");
  });
  it("内容 / 底色没变 = 同一张图、同一个版本；灌了新内容 / 换了底色 = 新版本", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 16, height: 8 });
    const a = b.compose()!, a2 = b.compose()!;
    eq(a2.version, a.version, "没变"); assert(a2.fbo === a.fbo, "同一张图");
    b.load(layer(16, 8, pattern(16, 8)));
    const c = b.compose()!; assert(c.version > a.version, "灌了新内容");
    b.setBackground([1, 0, 0]); const d = b.compose()!; assert(d.version > c.version, "换了底色");
    b.setBackground([1, 0, 0]); eq(b.compose()!.version, d.version, "同一个底色再设一次不算变");
  });
  it("跟着坐标：加高 = 跟着长、原来的不动、新的是空白；缩回去要砍的全空白 = 缩", () => {
    const port = new SoftGl2Port(), b = new PaintBoard({ port, width: 20, height: 10 }), px = pattern(20, 10);
    b.setBackground([0, 0, 0]);
    b.load(layer(20, 10, px));
    const r = b.follow(20, 25);
    eq([r.width, r.height, r.kept].join(), "20,25,false", "加高");
    const got = readAll(port, b);
    let bad = 0;
    for (let y = 0; y < 25; y++) for (let x = 0; x < 20; x++) { const o = (y * 20 + x) * 4, want = y < 10 ? [px[o], px[o + 1], px[o + 2]] : [0, 0, 0]; for (let k = 0; k < 3; k++) if (got[o + k] !== want[k]) bad++; }
    eq(bad, 0, "原来那 10 行不动，下面 15 行是底色");
    eq(b.follow(20, 10).height, 10, "缩回去（下面全空白）");
    eq(b.follow(12, 10).width, 20, "砍列：右边有内容 = 不砍");
  });
  it("缩回去要砍的行里有内容：不缩、留着比坐标高、记一笔，不抛", () => {
    const port = new SoftGl2Port(), logs: string[] = [], b = new PaintBoard({ port, width: 8, height: 20, log: (m) => logs.push(m) });
    b.load(layer(8, 20, pattern(8, 2), { x: 0, y: 17, w: 8, h: 2 }));   // 第 17、18 行有内容
    const r = b.follow(8, 12);
    eq([r.width, r.height, r.kept].join(), "8,20,true", "留着");
    eq(logs.length, 1, "记了一笔"); assert(/kept 8x20/.test(logs[0]), logs[0]);
    eq(b.follow(8, 19).height, 19, "要砍的那一行（第 19 行）空白：缩到 19");
  });
});

/** 一个网格体定义（方盒子）+ 开始画（走 1-3b 的指令）：返回场景、定义、那张画的 GUID。 */
function painted(): { s: Scene; def: number; tex: string } {
  const s0 = new Scene(), d = s0.mintDef("网格", sceneBox());
  s0.mintInstance(s0.root, null, d.id, IDENTITY);
  let s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  const m = new MeshKernel(); addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }); s.mesh(d.id).kernel = m;
  const tex = mintGuid(), op: Op = { op: "startPaint", def: d.id, faces: m.faces(), uvSet: mintGuid(), textureGuid: tex, materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画的材质" }, color: [0.8, 0.7, 0.6], density: 16 };
  s = applyOp(s, op).scene;
  return { s, def: d.id, tex };
}

describe("画板登记处（1-3c）", () => {
  it("建：大小 = 那一套坐标的画布、底色 = 材质的底色；不是画 = 抛", () => {
    const { s, def, tex } = painted(), port = new SoftGl2Port(), reg = new PaintBoards({ port: () => port, epoch: () => 0 });
    const body = s.def(def).body, row = body.kind === "mesh" ? [...body.uvSets.values()][0] : null;
    const b = reg.ensure(s, tex);
    eq([b.width, b.height].join(), [row!.width, row!.height].join(), "大小");
    eq(reg.board(tex)!.image.kind, "live", "活的图");
    assert(reg.sig().includes(`${tex}:${row!.width}x${row!.height}`), reg.sig());
    let threw = false; try { reg.ensure(s, mintGuid()); } catch { threw = true; }
    assert(threw, "不是画的 GUID 抛");
    eq(reg.board(tex)!.image.current(), null, "没准备之前活的图是空的（current() 只读准备好的结果）");
    reg.prepare(s);
    const cur = reg.board(tex)!.image.current();
    assert(cur && cur.version > 0, "准备之后能读到合成好的");
  });
  it("换文件（epoch 变了）= 全部销毁；画没了（材质不指它了）= 那块歇着（不合成、留到关文件）", () => {
    const { s, tex } = painted(), port = new SoftGl2Port();
    let ep = 0;
    const reg = new PaintBoards({ port: () => port, epoch: () => ep });
    reg.ensure(s, tex); eq(reg.count, 1, "建了");
    ep = 1; reg.sync(s); eq(reg.count, 0, "换文件");
    reg.ensure(s, tex); eq(reg.count, 1, "新文件里再建");
    s.textures.delete(tex);   // 贴图表里那一行没了（清理贴图）：材质不再指着画
    reg.prepare(s); eq(reg.count, 1, "画没了：还在（歇着）"); eq(reg.board(tex)!.image.current(), null, "歇着 = 不合成");
  });
  it("跟着场景里那一套坐标改大小（加高；1-8a 起在提交的收尾里 follow，「准备」里的 sync 不改大小）；签名跟着变", () => {
    const { s, def, tex } = painted(), port = new SoftGl2Port(), reg = new PaintBoards({ port: () => port, epoch: () => 0 });
    const b = reg.ensure(s, tex), sig0 = reg.sig(), body = s.def(def).body;
    if (body.kind !== "mesh") throw new Error("not mesh");
    const [g, row] = [...body.uvSets][0];
    body.uvSets.set(g, { ...row, height: row.height + 64 });
    reg.sync(s);
    eq(b.height, row.height, "「准备」里不改大小");
    reg.follow(s);
    eq(b.height, row.height + 64, "跟着加高"); assert(reg.sig() !== sig0, "签名变了");
    eq(reg.takePending().length, 1, "加高封了一步，等着挂进三维的栈");
  });
});
