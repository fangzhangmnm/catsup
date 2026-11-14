// 换种类带不过去什么：只算一处（第 1 版施工单第五节 4½；created 2026-11-13 by Claude Opus 5.5）。
// ① 每个种类的载荷清单（scene/kinds.ts KIND_PAYLOAD）× 每个登记过的转换方向（castsTo）= 一张去向表（CAST_FATES）：每一样写明带过去 / 换算 / 丢 / 转不了，少一样 = 红。
// ② 去向表里丢的那几样 = 这个方向声明的「可能丢」（castsTo.loses），一样不多一样不少（「可能丢」和「这一次丢」同一组名字，漂不开）。
// ③ 身体上的字段、网格体的保留列都落到载荷清单的某一样上：加字段 / 加保留列不登记 = 红。
// ④ 转之前算的（castLosses，询问用）和真转出来的（castBody 的 losses）是同一份。
import { describe, it, eq, assert } from "./runner.mjs";
import { BODY_KINDS, Scene, type Body } from "../src/scene/scene.ts";
import { KINDS, KIND_PAYLOAD, CAST_FATES, MESH_COLUMN_PAYLOAD, castBody, castLosses, lossesText, type CastFate, type CastLossId } from "../src/scene/kinds.ts";
import { RESERVED_EDGE, RESERVED_FACE, UV_SEAM, edgeMarkReader, faceHidden, setEdgeMark, setFaceHidden } from "../src/mesh/reserved-columns.ts";
import { UV_COLUMN_IDS } from "../src/scene/uv.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { sceneBox, sceneGrouped } from "./format-scenes.ts";
import type { BodyKind } from "../src/scene/body-kind.ts";

const NO = { mirrored: false } as const;
const lostOf = (f: CastFate): CastLossId | null => (typeof f === "object" && "lost" in f ? f.lost : null);
const sorted = (xs: Iterable<string>): string => [...new Set(xs)].sort().join(",");

describe("载荷 × 转换方向 = 去向表（第五节 4½ 第 5 条）", () => {
  for (const from of BODY_KINDS) for (const { to, loses } of KINDS[from].castsTo) {
    const fates = (CAST_FATES[from] as Partial<Record<BodyKind, Record<string, CastFate>>>)[to];
    it(`${from} → ${to}：每一样载荷都写了去向`, () => {
      assert(fates, `CAST_FATES.${from}.${to} 没写`);
      eq(sorted(Object.keys(fates!)), sorted(KIND_PAYLOAD[from]), "去向表的键 = 载荷清单");
    });
    it(`${from} → ${to}：丢的那几样 = 声明的「可能丢」`, () => {
      eq(sorted(Object.values(fates!).map(lostOf).filter((x): x is CastLossId => !!x)), sorted(loses));
    });
    it(`${from} → ${to}：「有就转不了」只在转成空物体时`, () => {
      for (const [p, f] of Object.entries(fates!)) if (typeof f === "object" && "blocks" in f) eq(to, "empty", `${p} 写了 blocks`);
    });
  }
  it("去向表里没有登记表之外的方向", () => {
    for (const from of BODY_KINDS) for (const to of Object.keys(CAST_FATES[from])) assert(KINDS[from].castsTo.some((c) => c.to === to), `${from} → ${to} 没登记却有去向表`);
  });
});

// 身体上的字段各归哪一样载荷（kernel = 好几样，见各自的去向；null = 不是载荷：kind 是头，空物体的槽表永远空）
const FIELD_PAYLOAD: { readonly [K in BodyKind]: Readonly<Record<string, string | null>> } = {
  brep: { kind: null, kernel: "faces", groups: "groups", nextGroup: "groups", materialSlots: "material-slots", guides: "guides" },
  mesh: { kind: null, kernel: "faces", materialSlots: "material-slots", uvSetSlots: "uv-sets" },
  empty: { kind: null, materialSlots: null },
};
describe("身体的字段 / 网格体的保留列都在载荷清单里", () => {
  const box = new Scene(sceneBox(1, 1)), brep = box.def(box.root).body as Extract<Body, { kind: "brep" }>;
  const samples: Body[] = [{ ...brep }, castBody(brep, "mesh", NO).body, { kind: "empty", materialSlots: [] }];
  for (const b of samples) it(`${b.kind} 的每个字段都登记了`, () => {
    for (const k of Object.keys(b)) {
      assert(k in FIELD_PAYLOAD[b.kind], `${b.kind} 身体上多了字段「${k}」：进 KIND_PAYLOAD 并给每个转换方向写去向（再登记到这张表）`);
      const p = FIELD_PAYLOAD[b.kind][k];
      if (p) assert((KIND_PAYLOAD[b.kind] as readonly string[]).includes(p), `${k} → ${p} 不在载荷清单里`);
    }
  });
  it("网格体的保留列一个不落（加保留列 = 登记它属于哪一样）", () => {
    eq(sorted(Object.keys(MESH_COLUMN_PAYLOAD)), sorted([...RESERVED_FACE, ...RESERVED_EDGE].map((d) => d.id).concat([...UV_COLUMN_IDS])));
    for (const p of Object.values(MESH_COLUMN_PAYLOAD)) assert((KIND_PAYLOAD.mesh as readonly string[]).includes(p), p);
  });
});

describe("转之前算的 = 真转出来的（同一份）", () => {
  it("硬表面（带组）→ 网格体", () => {
    const s = sceneGrouped(), b = s.def(s.root).body;
    const pre = castLosses(b, "mesh", NO), got = castBody(b, "mesh", NO).losses;
    eq(JSON.stringify(got), JSON.stringify(pre));
    assert(pre.some((l) => l.what === "groups"), "带组");
  });
  it("一个方块（没洞、没曲线、没组）转网格体：什么都不丢、不问（来回切是核心做法；硬表面的规矩转回来照回来，不算丢）", () => {
    const s = new Scene(sceneBox(1, 1));
    eq(lossesText(castLosses(s.def(s.root).body, "mesh", NO)), "不丢东西");
  });
  it("网格体 → 硬表面（开着对称）：对称数成 1，别的照算", () => {
    const s = new Scene(sceneBox(1, 1)), m = castBody(s.def(s.root).body, "mesh", NO).body;
    const pre = castLosses(m, "brep", { mirrored: true }), got = castBody(m, "brep", { mirrored: true }).losses;
    eq(JSON.stringify(got), JSON.stringify(pre));
    eq(pre.find((l) => l.what === "mirror")?.count, 1);
  });
  it("没有几何的硬表面 → 网格体：什么都不丢（没有面就没有规矩可丢）；句子 = 「不丢东西」", () => {
    const b: Body = { kind: "brep", kernel: new Kernel(), groups: new Map(), nextGroup: 1, materialSlots: [], guides: { lines: [], points: [], circles: [], spheres: [], next: 1 } as never };
    eq(castLosses(b, "mesh", NO).length, 0); eq(lossesText(castLosses(b, "mesh", NO)), "不丢东西");
  });
  it("有几何的转空物体：转之前不报数（转不了），真转明说拒绝", () => {
    const s = new Scene(sceneBox(1, 1)), b = s.def(s.root).body;
    eq(castLosses(b, "empty", NO).length, 0);
    let msg = ""; try { castBody(b, "empty", NO); } catch (e) { msg = String(e); }
    assert(msg.includes("还有几何"), msg);
  });
});

// 统筹 11-13 夜要核的：网格体转硬表面那一行以前没写对称、默认平滑、贴图坐标的表——转过去是不是真没了、来回一趟回不回得来（user 的核心做法是两个种类来回切）。
describe("来回一趟：声明丢的真丢了（且报了数），写着带过去的真回来了", () => {
  it("网格体（藏背靠背一对面、标一条接缝、挂一套贴图坐标、默认平滑 = 全平滑）→ 硬表面 → 网格体", () => {
    const s = new Scene(sceneBox(1, 1)), m = castBody(s.def(s.root).body, "mesh", NO).body as Extract<Body, { kind: "mesh" }>, k = m.kernel;
    const key = (f: number): string => [...k.faceVerts(f)].sort((x, y) => x - y).join(","), k0 = key(k.faces()[0]);
    for (const f of k.faces()) if (key(f) === k0) setFaceHidden(k, f, true);   // 方块两侧都出 = 背靠背一对：一起藏（只藏一张 = 一藏一露，那是另一种，hide.test 管）
    setEdgeMark(k, k.edges()[0], UV_SEAM, true);
    m.uvSetSlots.push("0123456789abcdef0123456789abcdef" as never);
    k.setSmoothDefault({ mode: "smooth", deg: 30 });
    const there = castBody(m, "brep", NO), lost = new Map(there.losses.map((l) => [l.what, l.count]));
    eq(lost.get("seams"), 1, "接缝报了 1 条"); eq(lost.get("uv-sets"), 1, "贴图坐标的表报了 1 套"); eq(lost.get("smooth-default"), 1, "全平滑回不来 = 报了");
    assert(!lost.has("mixed-hidden"), "单独藏着的面照带，不报");
    const back = castBody(there.body, "mesh", NO).body as Extract<Body, { kind: "mesh" }>, b = back.kernel;
    eq(b.faces().filter((f) => faceHidden(b, f)).length, 2, "藏着的那一对回来了（写着带过去）");
    eq(b.edges().filter(edgeMarkReader(b, UV_SEAM)).length, 0, "接缝真没了（写着丢）");
    eq(back.uvSetSlots.length, 0, "贴图坐标的表真没了");
    eq(b.smoothDefault.mode, "angle", "默认平滑回来的是转换给的按角度，不是原来的全平滑");
  });
  it("默认平滑本来就是按角度 30°：转回硬表面不报它（回来还是它）", () => {
    const s = new Scene(sceneBox(1, 1)), m = castBody(s.def(s.root).body, "mesh", NO).body;
    eq(JSON.stringify((m as Extract<Body, { kind: "mesh" }>).kernel.smoothDefault), JSON.stringify({ mode: "angle", deg: 30 }), "硬表面转来的就是按角度 30°");
    assert(!castLosses(m, "brep", NO).some((l) => l.what === "smooth-default"), "不报");
  });
});
