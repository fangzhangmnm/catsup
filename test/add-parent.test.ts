// 创建父物体（第 1 版第五节第 7 条；created 2026-11-13 by Claude Opus 5.5）：指令 addParent + 规划（editor/objects/add-parent.ts）。
// 规矩：新父亲 = 空物体，原物体整个放到它下面，世界位置不动；孩子的身份不变；新父亲 = 孩子的原点和轴（缩放留在孩子身上），顶替孩子在兄弟里那一格。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { applyOp, OpRejected, OpTargetError, unwrapRootWhy } from "../src/editor/ops.ts";
import { planAddParent } from "../src/editor/objects/add-parent.ts";
import { compose, rotationAbout, scalingAbout, translation, type Xform } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";

const pts = (s: Scene): string => s.pointsOfDef(s.root).map((p) => `${p.x.toFixed(9)},${p.y.toFixed(9)},${p.z.toFixed(9)}`).sort().join(";");
/** 根上摆三份：A（平移）/ B（转 + 缩 + 平移）/ C；B 是要包的那一个。 */
function three(): { s: Scene; b: number; order: string[] } {
  const s = new Scene(new Kernel()), box = s.mintDef("盒", sceneBox(1, 1));
  const xB: Xform = compose(translation({ x: 3, y: 1, z: 0 }), compose(rotationAbout({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0.7), scalingAbout({ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0.5 })));
  s.mintInstance(s.root, null, box.id, translation({ x: -2, y: 0, z: 0 }));
  const b = s.mintInstance(s.root, null, box.id, xB); b.name = "乙"; b.locked = false; b.hidden = true;
  s.mintInstance(s.root, null, box.id, translation({ x: 6, y: 0, z: 0 }));
  return { s, b: b.id, order: [...s.def(s.root).instances.values()].map((i) => i.guid) };
}

describe("创建父物体：指令 addParent", () => {
  it("世界里的点一个不动；孩子身份不变；新父亲是空物体、只装它；顶替它那一格；藏 / 名字跟着那一份", () => {
    const { s, b, order } = three(), before = pts(s), kidGuid = s.def(s.root).instances.get(b)!.guid;
    const p = planAddParent(s, { chain: [], group: null }, [b], "ab12");
    assert("op" in p, JSON.stringify(p));
    applyOp(s, (p as { op: Parameters<typeof applyOp>[1] }).op);
    eq(pts(s), before, "世界里的点一个不动");
    const top = [...s.def(s.root).instances.values()], par = top.find((i) => s.def(i.def).name === "ab12")!;
    eq(top.length, 3); eq(top[1], par, "顶替孩子那一格（同级顺序 = 存盘顺序）");
    eq(top.map((i) => i.guid).filter((g, i) => i !== 1).join(","), [order[0], order[2]].join(","), "别的兄弟不动");
    eq(s.kindOf(par.def), "empty");
    const kids = [...s.def(par.def).instances.values()];
    eq(kids.length, 1); eq(kids[0].guid, kidGuid, "孩子的身份不变"); eq(kids[0].name, "乙"); eq(kids[0].hidden, true);
    const m = par.xform, col = (j: number): number => Math.hypot(m[j], m[4 + j], m[8 + j]);
    assert([0, 1, 2].every((j) => Math.abs(col(j) - 1) < 1e-9), "新父亲不带缩放（缩放留在孩子身上）");
    assert(Math.abs(m[3] - 3) < 1e-9 && Math.abs(m[7] - 1) < 1e-9 && Math.abs(m[11]) < 1e-9, "新父亲在孩子的原点");
  });
  it("拒：那一份不在这一层 / 身份已被占", () => {
    const { s, b } = three(), p = planAddParent(s, { chain: [], group: null }, [b], "x") as { op: Parameters<typeof applyOp>[1] & { op: "addParent" } };
    let e: unknown = null; try { applyOp(s, { ...p.op, instance: 999 }); } catch (x) { e = x; }
    assert(e instanceof OpTargetError, "不在");
    applyOp(s, p.op);
    const kid2 = [...s.def(s.root).instances.values()][0].id;
    e = null; try { applyOp(s, { ...p.op, instance: kid2 }); } catch (x) { e = x; }
    assert(e instanceof OpTargetError, "身份已被占（同一条指令再跑一次）");
  });
});

describe("创建父物体：规划", () => {
  it("最外层自己 = 给根包一层；没选 / 选了两个 / 锁着：说原因，不出指令", () => {
    const { s, b } = three(), root = { chain: [], group: null }, all = [...s.def(s.root).instances.keys()];
    const w = planAddParent(s, root, null, "x");
    assert("op" in w && w.op.op === "wrapRoot", "最外层 = 包一层");
    assert("why" in planAddParent(s, root, [], "x"), "没选");
    assert("why" in planAddParent(s, root, all.slice(0, 2), "x"), "两个");
    s.def(s.root).instances.get(b)!.locked = true;
    assert("why" in planAddParent(s, root, [b], "x"), "锁着");
  });
  it("你所在的这一层（不是根）：包的是上一层里你进来的那一份", () => {
    const { s, b } = three(), p = planAddParent(s, { chain: [b], group: null }, null, "x");
    assert("op" in p, JSON.stringify(p));
    const op = (p as { op: { at: { def: number; group: number | null }; instance: number } }).op;
    eq(op.at.def, s.root); eq(op.at.group, null); eq(op.instance, b);
  });
});

describe("给根包一层 / 去掉这一层（第 1 版第七节；给根包一层定稿第 3、4 条）", () => {
  const wrapOf = (s: Scene): Parameters<typeof applyOp>[1] => { const p = planAddParent(s, { chain: [], group: null }, null, "ab12"); if (!("op" in p)) throw new Error(p.why); return p.op; };
  it("包一层：新根是空物体、身份新铸；旧根整个原位在它下面，GUID / 名字不变；世界里的点一个不动；新根的坐标架 = 旧根那一份、旧根照留", () => {
    const { s } = three(), oldRoot = s.root, oldGuid = s.def(oldRoot).guid, oldName = s.def(oldRoot).name, before = pts(s);
    const F = { origin: { x: 1, y: 2, z: 3 }, x: { x: 0, y: 1, z: 0 }, y: { x: -1, y: 0, z: 0 }, z: { x: 0, y: 0, z: 1 } };
    s.setFrame(oldRoot, F);
    applyOp(s, wrapOf(s));
    assert(s.root !== oldRoot && s.kindOf(s.root) === "empty" && s.def(s.root).name === "ab12", "新根");
    const kids = [...s.def(s.root).instances.values()];
    eq(kids.length, 1); eq(kids[0].def, oldRoot); eq(s.def(oldRoot).guid, oldGuid); eq(s.def(oldRoot).name, oldName);
    assert(kids[0].xform.every((v, i) => v === [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0][i]), "原位摆放");
    eq(pts(s), before, "世界里的点一个不动");
    eq(JSON.stringify(s.frameOf(s.root)), JSON.stringify(F), "新根的坐标架 = 旧根那一份"); eq(JSON.stringify(s.frameOf(oldRoot)), JSON.stringify(F), "旧根的照留");
  });
  it("包了存、读回来：根 = 新根，旧根身份照旧；document.axes = 那一份坐标架；再去掉这一层 = 回到原来的结构", async () => {
    const { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } = await import("../src/format/index.ts");
    const { s } = three(), oldGuid = s.def(s.root).guid, n = s.defs.size, before = pts(s);
    applyOp(s, wrapOf(s));
    const back = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    eq(back.def(back.root).guid, s.def(s.root).guid); eq(back.kindOf(back.root), "empty");
    eq(back.def([...back.def(back.root).instances.values()][0].def).guid, oldGuid, "旧根照旧是那个身份");
    applyOp(back, { op: "unwrapRoot" });
    eq(back.def(back.root).guid, oldGuid, "去掉这一层 = 旧根回到最外层"); eq(back.defs.size, n, "外面那一层拿掉了"); eq(pts(back), before, "点一个不动");
  });
  it("认不出的硬表面内容跟着旧根走（按 GUID 写回，不按「是不是根」）", async () => {
    const { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } = await import("../src/format/index.ts"), { decodeGlb, encodeGlb } = await import("../src/format/glb.ts");
    const s0 = new Scene(sceneBox(1, 1)), g = decodeGlb(writeCatsup(documentFromScene(s0, "t"))) as { json: any; bin: Uint8Array };
    const list = g.json.extensions.CATSUP_definitions.list, rootGuid = g.json.extensions.CATSUP_definitions.root, rootItem = list.find((d: any) => d.guid === rootGuid);
    rootItem.brep.attributes = { ...(rootItem.brep.attributes ?? {}), face: { ...(rootItem.brep.attributes?.face ?? {}), futureLayer: { componentType: "float64", note: "以后的版本写的" } } };
    const doc = readCatsup(encodeGlb(g.json, g.bin)), s = sceneFromDocument(doc);
    applyOp(s, wrapOf(s));
    const out = decodeGlb(writeCatsup(documentFromScene(s, "t", doc))) as { json: any };
    const L = out.json.extensions.CATSUP_definitions.list, oldItem = L.find((d: any) => d.guid === rootGuid), newItem = L.find((d: any) => d.guid === out.json.extensions.CATSUP_definitions.root);
    assert(oldItem?.brep?.attributes?.face?.futureLayer, "旧根带着那一层");
    assert(!newItem?.brep, "新根是空物体，没有几何载荷（不会挂错到它身上）");
  });
  it("去掉这一层做不了的：根自己有几何 / 摆着两个 / 里面那一份挪过 / 外面另摆了不一样的坐标架", () => {
    const { s } = three();
    assert(/有几何|子物体/.test(unwrapRootWhy(s) ?? ""), "原来的根有好几个子物体");
    applyOp(s, wrapOf(s));
    eq(unwrapRootWhy(s), null, "刚包完：做得了");
    const kid = [...s.def(s.root).instances.values()][0];
    const saved = kid.xform; kid.xform = translation({ x: 1, y: 0, z: 0 });
    assert(/换位置/.test(unwrapRootWhy(s) ?? ""), "挪过"); kid.xform = saved;
    s.setFrame(s.root, { origin: { x: 5, y: 0, z: 0 }, x: { x: 1, y: 0, z: 0 }, y: { x: 0, y: 1, z: 0 }, z: { x: 0, y: 0, z: 1 } });
    assert(/坐标架/.test(unwrapRootWhy(s) ?? ""), "外面另摆了坐标架");
    let e: unknown = null; try { applyOp(s, { op: "unwrapRoot" }); } catch (x) { e = x; }
    assert(e instanceof OpRejected, "指令照样拒（OpRejected）");
  });
});
