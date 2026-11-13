// 一套排法上有好几个物件 / 好几张画（施工单十八第 2 刀 b：按排法看所有物件）。created 2026-11-13 by Claude Opus 5.5
// 现在还没有操作能把带着位置的面搬进别的物件（第 3 刀放开），这里手搭场景：一行排法 + 一张画 + 指着它的材质，两个网格体各有几张面摆在这套排法上。
// 钉：① 「按排法看所有物件」那张表（uvset-occupancy.ts）收两个物件、按修改号重算；② 补面当占着的 = freed + 别的物件的框，空地 = freed 减去所有物件占着的；
//    ③ 每格归谁：别的物件的面参加归属、归了它们的格这张表里没人要；没有别的物件 = 和以前逐格一样；贴图坐标一样的面 = 自己的块；
//    ④ 空间里的笔：两个物件各一项目标，各自带着另一个的面（键变了就重建）；⑤ 一张画画在哪几个物件上；⑥ 一套排法上两张画：画板跟着改大小对每一张都做。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { mintGuid, type Guid } from "../src/format/guid.ts";
import { COLOR_CHANNEL, COLOR_VALUE } from "../src/format/document.ts";
import { setFaceMaterial } from "../src/mesh/reserved-columns.ts";
import { placeFace, uvMesh } from "../src/scene/uv.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { occupancyKey, uvSetOccupancy } from "../src/paint/uvset-occupancy.ts";
import { freedOpenAreas, openPieces, placementBlocked } from "../src/paint/freed.ts";
import { buildTexelTable, paintFaces } from "../src/paint/texel-table.ts";
import { paintDefsOf, paintPlaceOf } from "../src/scene/paint.ts";
import { paintTargets } from "../src/paint/paint-targets.ts";
import { SoftGl2Port } from "../src/paint/kernel/src/backend/soft-gl2-port.ts";
import { PaintBoards } from "../src/paint/boards.ts";
import type { WorldView } from "../src/scene/world-view.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
/** 一行排法（128 × 64、按总大小开的）+ 一张画 + 指着它的材质。 */
function canvas(s: Scene, w = 128, h = 64): { g: Guid; tex: Guid; mi: number } {
  const g = mintGuid(), tex = mintGuid();
  s.uvSets.set(g, Object.freeze({ guid: g, name: "UV", width: w, height: h, pxPerM: 16, fit: "size" }));
  s.addTexture({ guid: tex, name: "画", value: COLOR_VALUE, content: { kind: "layered", ora: null }, layout: { uvSet: g } });
  const mi = s.addMaterial({ guid: mintGuid(), name: "画", color: [1, 1, 1], channels: { [COLOR_CHANNEL]: [tex] } });
  return { g, tex, mi };
}
/** 一个网格体（盒子），每张面摆在 at(i) 给的格子方块上（null = 不摆），材质 = mi。 */
function meshOn(s: Scene, name: string, g: Guid, mi: number, at: (i: number) => [number, number, number] | null): number {
  const d = s.mintDef(name, sceneBox(1, 1)), k = new MeshKernel();
  addBox(k, P(0, 0, 0), P(1, 1, 1));
  const slots: Guid[] = [];
  d.body = { kind: "mesh", kernel: k, materialSlots: [mi], uvSetSlots: slots };
  k.faces().forEach((f, i) => {
    setFaceMaterial(k, f, 0);
    const r = at(i); if (!r) return;
    const [x, y, n] = r, len = k.faceVerts(f).length;
    const quad = [x, y, x + n, y, x + n, y + n, x, y + n];
    placeFace(k, slots, f, g, quad.slice(0, 2 * len));
  });
  s.mintInstance(s.root, null, d.id, IDENTITY);
  return d.id;
}
const cellOf = (W: number, x: number, y: number): number => y * W + x;

describe("按排法看所有物件那张表 + 两种读法（施工单十八第 2 刀 b）", () => {
  it("两个物件的面都在表里；补面当占着的有别的物件的框、没有自己的；空地减去所有物件占着的；改了内核就重算", () => {
    const s = new Scene(sceneBox(2, 1.5)), { g, mi } = canvas(s);
    const a = meshOn(s, "甲", g, mi, (i) => (i < 2 ? [4 + 16 * i, 4, 12] : null)), b = meshOn(s, "乙", g, mi, (i) => (i < 2 ? [4 + 16 * i, 36, 12] : null));
    const occ = uvSetOccupancy(s, g);
    eq(occ.map((e) => `${e.def}:${e.faces.length}`).join(), `${a}:2,${b}:2`, "两个物件各两张面");
    const blk = placementBlocked(s, a, g), rs: number[][] = []; for (let i = 0; i < blk.length; i += 4) rs.push(blk.slice(i, i + 4));
    eq(rs.map((r) => r.join(",")).join("|"), "4,36,16,48|20,36,32,48", "给甲补面：乙的两个框当占着（甲自己的 layoutAppend 自己看）");
    s.uvSets.set(g, Object.freeze({ ...s.uvSets.get(g)!, freed: Object.freeze([0, 30, 40, 52]) }));
    const open = freedOpenAreas(s, g);
    eq(openPieces(open), 1, "空地 = freed 减去乙的两个框，剩一块（连着）");
    assert(!open.some((r) => r[0] < 16 && r[2] > 4 && r[1] < 48 && r[3] > 36), "乙占着的格不算空地");
    const key0 = occupancyKey(s, g, a);
    const kb = s.mesh(b).kernel, f0 = uvSetOccupancy(s, g).find((e) => e.def === b)!.faces[0];
    placeFace(kb, s.mesh(b).uvSetSlots, f0, g, [60, 36, 72, 36, 72, 48, 60, 48]);   // 乙挪一张面的位置（修改号变了）
    assert(occupancyKey(s, g, a) !== key0, "键跟着修改号变");
    assert(uvSetOccupancy(s, g).find((e) => e.def === b)!.boxes.some((r) => r[0] === 60), "表重算了");
  });
});

describe("每格归谁：别的物件的面参加归属（施工单十八第 2 刀 b）", () => {
  it("没有别的物件 = 和以前逐格一样；挨得近的格归了别的物件 = 这张表里没人要；只会变少不会变多", () => {
    const s = new Scene(sceneBox(2, 1.5)), { g, mi } = canvas(s, 64, 32);
    const a = meshOn(s, "甲", g, mi, (i) => (i === 0 ? [4, 4, 12] : null)), b = meshOn(s, "乙", g, mi, (i) => (i === 0 ? [18, 4, 12] : null));   // 只隔两格（比铺法留的 4 格窄）
    const fa = paintFaces(uvMesh(s.mesh(a).kernel, s.mesh(a).uvSetSlots), g), others = uvSetOccupancy(s, g).filter((e) => e.def !== a).flatMap((e) => e.rings);
    const t0 = buildTexelTable(64, 32, fa, 4), t1 = buildTexelTable(64, 32, fa, 4, []), t2 = buildTexelTable(64, 32, fa, 4, others);
    eq(Array.from(t1.owner).join(), Array.from(t0.owner).join(), "没有别的物件：逐格一样");
    eq(t2.polys.length, t0.polys.length, "表的形状不变（块数）"); eq(t2.polyFaces.map((x) => x.join()).join("|"), t0.polyFaces.map((x) => x.join()).join("|"));
    eq(t0.owner[cellOf(64, 17, 8)], 0, "只有甲：第 17 列归甲（往外延两格）");
    eq(t2.owner[cellOf(64, 17, 8)], -1, "乙也在：第 17 列离乙更近 = 这张表里没人要");
    eq(t2.owner[cellOf(64, 10, 8)], 0, "甲里面的格还是甲的");
    let more = 0; for (let c = 0; c < t2.owner.length; c++) if (t2.owner[c] >= 0 && t0.owner[c] < 0) more++;
    eq(more, 0, "只会变少");
  });
  it("别的物件有一张面的贴图坐标和自己的一模一样（共用一张画）= 那块还是自己的", () => {
    const s = new Scene(sceneBox(2, 1.5)), { g, mi } = canvas(s, 64, 32);
    const a = meshOn(s, "甲", g, mi, (i) => (i === 0 ? [4, 4, 12] : null)); meshOn(s, "乙", g, mi, (i) => (i === 0 ? [4, 4, 12] : null));
    const fa = paintFaces(uvMesh(s.mesh(a).kernel, s.mesh(a).uvSetSlots), g), others = uvSetOccupancy(s, g).filter((e) => e.def !== a).flatMap((e) => e.rings);
    eq(Array.from(buildTexelTable(64, 32, fa, 4, others).owner).join(), Array.from(buildTexelTable(64, 32, fa, 4).owner).join());
  });
});

describe("一张画画在哪几个物件上；空间里的笔每个物件一项、各自带着别的物件的面（施工单十八第 2 刀 b）", () => {
  it("paintDefsOf 两个；paintPlaceOf 只给排法和底色；目标两项、others 不含自己、键不同", () => {
    const s = new Scene(sceneBox(2, 1.5)), { g, tex, mi } = canvas(s);
    const a = meshOn(s, "甲", g, mi, (i) => (i < 2 ? [4 + 16 * i, 4, 12] : null)), b = meshOn(s, "乙", g, mi, (i) => (i < 2 ? [4 + 16 * i, 36, 12] : null));
    eq(paintDefsOf(s, tex).join(), `${a},${b}`);
    const p = paintPlaceOf(s, tex)!; eq(p.uvSet.guid, g); assert(!("def" in p), "不再给「那个定义」");
    const slot = (def: number) => ({ pool: { def, group: null }, chain: [def], kernel: { mesh: s.mesh(def).kernel }, xform: IDENTITY });
    const world = { slots: [slot(a), slot(b)] } as unknown as WorldView;
    const ts = paintTargets(world, s, tex, { width: 128, height: 64 });
    eq(ts.length, 2, "两项");
    const ra = ts[0].others!.rings(), rb = ts[1].others!.rings();
    eq(ra.length, 2, "甲那一项带着乙的两张面"); eq(rb.length, 2, "乙那一项带着甲的两张面");
    assert(ra.every((r) => r[1] === 36) && rb.every((r) => r[1] === 4), "各自带的是对方的");
    assert(ts[0].others!.key !== ts[1].others!.key);
    eq(paintTargets(world, s, tex, { width: 128, height: 64 }, [a]).length, 1, "只认正在编辑的那一份");
  });
});

describe("一套排法上挂两张图：画板跟着改大小对每一张都做（施工单十八第 2 刀 b 第 6 条）", () => {
  it("两张画同一套排法，排法变高 → 两块画板都跟着变高", () => {
    const s = new Scene(sceneBox(2, 1.5)), { g, tex, mi } = canvas(s, 64, 32);
    const tex2 = mintGuid();
    s.addTexture({ guid: tex2, name: "画二", value: COLOR_VALUE, content: { kind: "layered", ora: null }, layout: { uvSet: g } });
    s.addMaterial({ guid: mintGuid(), name: "画二", color: [0.5, 0.5, 0.5], channels: { [COLOR_CHANNEL]: [tex2] } });
    meshOn(s, "甲", g, mi, (i) => (i === 0 ? [4, 4, 12] : null));
    const port = new SoftGl2Port(), reg = new PaintBoards({ editLocked: () => null, port: () => port, epoch: () => 0 });
    const b1 = reg.ensure(s, tex), b2 = reg.ensure(s, tex2);
    eq(`${b1.width}x${b1.height} ${b2.width}x${b2.height}`, "64x32 64x32");
    s.uvSets.set(g, Object.freeze({ ...s.uvSets.get(g)!, height: 64 }));
    assert(reg.follow(s), "变了");
    eq(`${b1.width}x${b1.height} ${b2.width}x${b2.height}`, "64x64 64x64", "两块都跟着变高");
  });
});
