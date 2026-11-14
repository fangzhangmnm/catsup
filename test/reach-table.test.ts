// 「谁 × 哪一档 → 怎么办」（层级显示施工单二½，统筹 11-13；created 2026-11-13 by Claude Opus 5.5）。
// ① 档只在 world-view.ts relationOf 算：自己 / 子物体（连它里面的）/ 外面的 / 分身（连它里面的），远近 tier 同一处出。
// ② 守卫：表以外的地方不许自己判「怎么对待这个槽」——relationOf / tierOfSlot / insideContext 只在 world-view.ts 调；槽的 rel 只经 REACH.某行[槽.rel] 读；
//    拿槽的 active / tier 自己判的地方钉住现状（只许减不许增）。以后做层级怎么进出、怎么挪、新建子物体 = 往表加行或改格。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView, type SlotRel } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { REACH, SLOT_RELS } from "../src/editor/reach-table.ts";
import { sceneBox } from "./format-scenes.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const rect = (x0: number): [Pt3, Pt3][] => [[P(x0, 0), P(x0 + 1, 0)], [P(x0 + 1, 0), P(x0 + 1, 1)], [P(x0 + 1, 1), P(x0, 1)], [P(x0, 1), P(x0, 0)]];

/** 根：组件「盒」D 两份（I1 原处、I2 挪 5）+ 组 G（里面又一份 D = I3）+ 根上散几何；D 里面摆一份组件 E（D 的子物体）。 */
function setup() {
  let s = new Scene(sceneBox(1, 1));
  const R = { def: s.root, group: null };
  const k = s.kernelOf(R);
  s = applyOp(s, { op: "makeComponent", at: R, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "盒" }).scene;
  const D = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at: R, definition: D, xform: translation(P(5, 0, 0)) }).scene;
  s = applyOp(s, { op: "addEdges", at: R, segs: rect(10) }).scene;
  const k2 = s.kernelOf(R);
  s = applyOp(s, { op: "makeGroup", at: R, faces: k2.faces().map((f) => faceKey(k2, f.id)), edges: k2.edges().map((e) => edgeKey(k2, e.id)) }).scene;
  const G = [...s.brep(s.root).groups.keys()][0];
  s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: G }, definition: D, xform: translation(P(10, 0, 2)) }).scene;
  const [I1, I2, I3] = [...s.def(s.root).instances.values()].map((i) => i.id);
  s = applyOp(s, { op: "addEdges", at: R, segs: rect(20) }).scene;   // 根上的散几何（外面的）
  const k3 = s.kernelOf(R), lone = k3.faces().filter((f) => k3.faceRings3(f.id)?.outer.every((q) => q.x >= 20)).map((f) => f.id);
  s = applyOp(s, { op: "makeComponent", at: R, faces: lone.map((f) => faceKey(k3, f)), edges: [], name: "E" }).scene;
  const E = [...s.defs.keys()].find((id) => id !== s.root && id !== D)!;
  s = applyOp(s, { op: "placeInstance", at: { def: D, group: null }, definition: E, xform: translation(P(0, 0, 1)) }).scene;   // D 里面的子物体（每一份 D 都有它）
  return { s, D, E, G, I1, I2, I3 };
}
const relMap = (v: WorldView): Record<string, SlotRel> => Object.fromEntries(v.slots.map((sl) => [`${sl.chain.join("/") || "-"}:${sl.pool.group ?? "r"}`, sl.rel]));

describe("层级显示二½：这一档只算一处（relationOf）", () => {
  it("进到 I1 里：自己 / 子物体 / 外面 / 分身（分身里面的也算分身）", () => {
    const { s, G, I1, I2, I3 } = setup();
    const v = new WorldView(s, { chain: [I1], group: null }), m = relMap(v);
    const childOf = (inst: number): string => { const sub = [...s.def(s.instance(s.root, inst).def).instances.values()][0].id; return `${inst}/${sub}:r`; };
    eq(m[`${I1}:r`], "self");
    eq(m[childOf(I1)], "child", "D 里面的 E");
    eq(m["-:r"], "outer", "根上的几何");
    eq(m[`-:${G}`], "outer", "根上的组");
    eq(m[`${I2}:r`], "twin", "另一份 D");
    eq(m[childOf(I2)], "twin", "另一份 D 里面的 E");
    eq(m[`${I3}:r`], "twin", "组里的那份 D");
    const eRoot = [...s.def(s.root).instances.values()].find((i) => ![I1, I2, I3].includes(i.id))!;
    eq(m[`${eRoot.id}:r`], "outer", "根上摆的那份 E 不是 D 的分身");
    eq(v.activeSlot().rel, "self", "活动池 = self");
    assert(v.slots.every((sl) => (sl.rel === "self") === sl.active), "self 和 active 是同一个判定");
  });
  it("根层：只有自己和子物体（没有外面、没有分身）", () => {
    const { s } = setup();
    const v = new WorldView(s, ROOT_CONTEXT);
    assert(v.slots.every((sl) => sl.rel === "self" || sl.rel === "child"), JSON.stringify(relMap(v)));
  });
  it("进到组 G 里：组自己 = self，组里那份 D = 子物体，根的几何 = 外面", () => {
    const { s, G, I3 } = setup();
    const m = relMap(new WorldView(s, { chain: [], group: G }));
    eq(m[`-:${G}`], "self"); eq(m[`${I3}:r`], "child"); eq(m["-:r"], "outer");
  });
  it("远近 tier 和以前一样（从 relationOf 一起出）：自己 0、子物体 / 兄弟 1", () => {
    const { s, I1, I2 } = setup();
    const v = new WorldView(s, { chain: [I1], group: null });
    const at = (key: string) => v.slots.find((sl) => `${sl.chain.join("/") || "-"}:${sl.pool.group ?? "r"}` === key)!;
    eq(at(`${I1}:r`).tier, 0); eq(at(`${I2}:r`).tier, 1, "兄弟实例");
  });
});

describe("层级显示二½：表本身", () => {
  it("每一行四档都有值", () => {
    for (const [id, row] of Object.entries(REACH)) for (const r of SLOT_RELS) assert((row as Record<string, unknown>)[r] !== undefined, `${id}.${r}`);
  });
  it("这一版改的三行：编辑用的线只有自己 always；点只有自己；子物体悬停整个亮", () => {
    eq(SLOT_RELS.filter((r) => REACH.editLines[r] === "always").join(","), "self");
    eq(SLOT_RELS.filter((r) => REACH.editDots[r] === "edit").join(","), "self");
    eq(REACH.hover.child, "wholeChild"); eq(REACH.hover.outer, "none"); eq(REACH.hover.twin, "none");
  });
});

describe("层级显示二½：守卫（表以外不许自己判怎么对待一个槽）", () => {
  const files: string[] = [];
  const walk = (d: string): void => { for (const f of fs.readdirSync(d)) { const p = `${d}/${f}`; if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith(".ts")) files.push(p); } };
  walk("src");
  const src = files.map((f) => ({ f, t: fs.readFileSync(f, "utf8") }));
  it("relationOf / tierOfSlot / insideContext 只在 world-view.ts 调", () => {
    const bad = src.filter(({ f, t }) => f !== "src/scene/world-view.ts" && /\b(relationOf|tierOfSlot|insideContext)\(/.test(t)).map(({ f }) => f);
    eq(bad.join(","), "");
  });
  it("槽的 rel 只经表读（REACH.某行[槽.rel]）", () => {
    const bad: string[] = [];
    for (const { f, t } of src) {
      if (f === "src/scene/world-view.ts") continue;
      t.split("\n").forEach((line: string, i: number) => { const code = line.replace(/\/\/.*$/, ""); for (const m of code.matchAll(/\b\w+\.rel\b/g)) if (!/REACH\.\w+\[\w+\.rel\]/.test(code.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 1))) bad.push(`${f}:${i + 1}`); });
    }
    eq(bad.join(","), "");
  });
  it("拿槽的 active / tier 自己判的地方：钉住现状（只许减；加新的 = 往表里加行）", () => {
    const PIN: Record<string, number> = { "src/editor/editor.ts": 1 };   // editor.ts classify 的 slot.active（点一下 / 框选 / 双击那三行的现状，进出那一件收进表）
    const got: Record<string, number> = {};
    for (const { f, t } of src) {
      if (f === "src/scene/world-view.ts" || f === "src/editor/reach-table.ts") continue;
      const n = t.split("\n").map((l: string) => l.replace(/\/\/.*$/, "")).join("\n").match(/\b(s|slot|sl|sm|x)\.(active|tier)\b/g)?.length ?? 0;
      if (n) got[f] = n;
    }
    for (const [f, n] of Object.entries(got)) assert(n <= (PIN[f] ?? 0), `${f} 读槽的 active / tier ${n} 处（钉的是 ${PIN[f] ?? 0}）：改成查表`);
  });
});
