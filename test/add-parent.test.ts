// 创建父物体（第 1 版第五节第 7 条；created 2026-11-13 by Claude Opus 5.5）：指令 addParent + 规划（editor/objects/add-parent.ts）。
// 规矩：新父亲 = 空物体，原物体整个放到它下面，世界位置不动；孩子的身份不变；新父亲 = 孩子的原点和轴（缩放留在孩子身上），顶替孩子在兄弟里那一格。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
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
  it("最外层自己 / 没选 / 选了两个 / 锁着：说原因，不出指令", () => {
    const { s, b } = three(), root = { chain: [], group: null }, all = [...s.def(s.root).instances.keys()];
    assert("why" in planAddParent(s, root, null, "x") && /最外层/.test((planAddParent(s, root, null, "x") as { why: string }).why), "最外层");
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
