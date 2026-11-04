// 预演 = 同一条指令在影子场景上跑（计划书 §12 C1；user 11-04「预演要做干净」）。created 2026-11-04 by Claude Opus 5.5
// ① 静态：工具不碰内核动词，预演入口只有 Editor.previewApply；② 硬门：op 改不到活动池外面（别的池和真身共享）；③ 行为：影子上跑完，真身一个字节没动，结果和真提交一样。
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { Scene, type PoolRef } from "../src/scene/scene.ts";
import { BUILTIN_BACK_SLOT } from "../src/scene/builtin-materials.ts";
import { applyOp, faceKey, resolveFace, type Op } from "../src/editor/ops.ts";
import { frontOf, previewableIn, previewVariant, withFront } from "../src/editor/op-locks.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL): string[] };
const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const UP = P(0, 0, 1);
const rect = (x = 0, w = 1): [Pt3, Pt3][] => [[P(x, 0), P(x + w, 0)], [P(x + w, 0), P(x + w, w)], [P(x + w, w), P(x, w)], [P(x, w), P(x, 0)]];
const root = (s: Scene): PoolRef => ({ def: s.root, group: null });
const K = (s: Scene): Kernel => s.brep(s.root).kernel;
const stateOf = (s: Scene): string => { const k = K(s); return JSON.stringify({ slots: s.brep(s.root).materialSlots, brep: k.toBrep() }); };
const facesOf = (s: Scene): string => { const k = K(s); return JSON.stringify(k.faces().map((f) => ({ ring: k.faceRings3(f.id)!.outer, a: k.faceMaterialOf(f.id, 0) ?? null, b: k.faceMaterialOf(f.id, 1) ?? null }))); };

describe("预演 = 同一条指令（静态守卫）", () => {
  const dir = new URL("../src/editor/tools/", import.meta.url);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("工具不碰内核动词、没有旧的 run / liveMesh 口", () => {
    const verbs = /\.(pushPull|addEdges|moveVertices|followMe|absorb|eraseEdges|eraseFaces|eraseSelection|setPos)\(|\brun\(\(|\bliveMesh\b/;
    const bad: string[] = [];
    for (const f of files) fs.readFileSync(new URL(f, dir), "utf8").split("\n").forEach((l, i) => { const code = l.replace(/\/\/.*$/, ""); if (verbs.test(code)) bad.push(`${f}:${i + 1}: ${code.trim().slice(0, 90)}`); });
    eq(bad.join("\n"), "", "工具的预演只许把 op 交给 preview；要新口子先想想提交走不走它");
  });
  it("editor.ts 里 applyOp 只在 previewApply（提交走 history.commit）", () => {
    const src = fs.readFileSync(new URL("../src/editor/editor.ts", import.meta.url), "utf8"), lines = src.split("\n");
    const start = lines.findIndex((l) => l.startsWith("  private previewApply(")), end = lines.findIndex((l, i) => i > start && l === "  }");
    assert(start >= 0 && end > start, "previewApply 还在");
    const out = lines.flatMap((l, i) => (/\bapplyOp\(/.test(l.replace(/\/\/.*$/, "")) && (i < start || i > end) ? [`${i + 1}: ${l.trim().slice(0, 80)}`] : []));
    eq(out.join("\n"), "");
  });
});

describe("预演的硬门：op 改不到活动池外面", () => {
  const here: PoolRef = { def: 1, group: null };
  const edge: Op = { op: "addEdges", at: here, segs: rect() };
  it("池级几何 op：at 必须写明且就是这个池（缺 at 的语义是根池，不放）", () => {
    assert(previewableIn(edge, here));
    assert(!previewableIn({ op: "addEdges", segs: rect() }, here), "缺 at");
    assert(!previewableIn({ ...edge, at: { def: 1, group: 2 } } as Op, here), "同定义别的组");
    assert(!previewableIn({ ...edge, at: { def: 2, group: null } } as Op, here), "别的定义");
  });
  it("网格体 op：def 就是这个池的定义；批 = 每条都过", () => {
    assert(previewableIn({ op: "meshMove", def: 1, moves: [] }, here));
    assert(!previewableIn({ op: "meshMove", def: 2, moves: [] }, here));
    assert(previewableIn({ op: "batch", label: "x", ops: [edge, edge] }, here));
    assert(!previewableIn({ op: "batch", label: "x", ops: [edge, { op: "addEdges", segs: rect() }] }, here));
  });
  it("别的 op 一律不进预演（子池 / 实例的整体变换走叠加变换）", () => {
    assert(!previewableIn({ op: "transformInstance", def: 1, instance: 1, xform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] }, here));
    assert(!previewableIn({ op: "addMaterial", name: "x", color: [1, 1, 1] }, here));
    assert(!previewableIn({ op: "clear" }, here));
  });
  it("和提交唯一的差别 = 推拉落地不湮灭；别的 op 原样", () => {
    eq((previewVariant({ op: "pushpull", at: here, face: [P(0, 0)], dist: 1 }) as { settleLanding?: boolean }).settleLanding, false);
    assert(previewVariant(edge) === edge, "别的 op 同一个对象");
    const b = previewVariant({ op: "batch", label: "x", ops: [{ op: "pushpull", at: here, face: [P(0, 0)], dist: 1 }] }) as { ops: { settleLanding?: boolean }[] };
    eq(b.ops[0].settleLanding, false, "批里的也算");
  });
});

describe("预演的行为：影子上跑完，真身没动，结果和提交一样", () => {
  it("画一张面：影子开了默认背面的槽、面朝上；真身的面和槽表都没动；和真提交的结果逐字一样", () => {
    const s = new Scene(new Kernel()), before = stateOf(s);
    const op: Op = { op: "addEdges", at: root(s), segs: rect(), front: UP };
    const sh = s.shadowOf(root(s), K(s).clone());
    applyOp(sh, previewVariant(op));
    eq(stateOf(s), before, "真身没动");
    eq(K(sh).faces().length, 1);
    assert(sh.brep(s.root).materialSlots.includes(BUILTIN_BACK_SLOT), "槽表是拷的，开在影子上");
    assert(!s.brep(s.root).materialSlots.includes(BUILTIN_BACK_SLOT));
    applyOp(s, op);
    eq(facesOf(s), facesOf(sh), "提交 = 预演");
  });
  it("推拉一张没朝向的面：预演就定朝向（seed），真身不动；拖一帧倒回再拖一帧不累积", () => {
    const s = new Scene(new Kernel()), at = root(s);
    applyOp(s, { op: "addEdges", at, segs: rect() });
    const k = K(s), face = faceKey(k, k.faces()[0].id), before = stateOf(s);
    const shadow = k.clone(), mark = shadow.rewindMark();
    const frame = (h: number): string => {
      assert(shadow.rewindTo(k, mark), "倒得回去");
      const sh = s.shadowOf(at, shadow);
      applyOp(sh, previewVariant({ op: "pushpull", at, face, dist: h, front: UP }));
      eq(stateOf(s), before, "真身没动");
      return facesOf(sh);
    };
    frame(1); frame(0.5);
    const third = frame(1);
    applyOp(s, { op: "pushpull", at, face, dist: 1, front: UP });
    eq(facesOf(s), third, "倒回去再跑 = 第一次那样 = 提交那样（面层也倒回去了）");
  });
  it("镜像挪点翻了朝向也进影子、也倒得回去（以前预演不跑 mirror 标记）", () => {
    const s = new Scene(new Kernel()), at = root(s);
    const top: [Pt3, Pt3][] = rect().map(([a, b]) => [{ ...a, z: 1 }, { ...b, z: 1 }]);
    applyOp(s, { op: "addEdges", at, segs: top, front: UP });
    /** 哪一侧朝世界 +z：这一侧的值（null = 默认正面）。 */
    const upSide = (k: Kernel): number | null => { const f = k.faces()[0].id; return k.faceMaterialOf(f, k.planeOf(f)!.plane.n.z > 0 ? 0 : 1) ?? null; };
    const k = K(s), ring = k.faceRings3(k.faces()[0].id)!.outer, before = stateOf(s);
    eq(upSide(k), null, "画的时候正面朝上");
    const shadow = k.clone(), mark = shadow.rewindMark(), op: Op = { op: "move", at, moves: ring.map((p) => ({ from: p, to: P(p.x, p.y, -1) })), mirror: true };
    const sh = s.shadowOf(at, shadow);
    applyOp(sh, op);
    assert(upSide(K(sh)) !== null, "镜过去：朝上的那侧换成背面了（侧跟着实物走）");
    eq(stateOf(s), before, "真身没动");
    const previewed = facesOf(sh);
    assert(shadow.rewindTo(k, mark));
    eq(upSide(shadow), null, "倒回来");
    applyOp(s, op);
    eq(facesOf(s), previewed, "提交 = 预演");
  });
  it("数值小窗的方向：withFront 给了就用给的（§12 C2），frontOf 读得回来", () => {
    const at: PoolRef = { def: 1, group: null }, wrong = P(0, 0, -1);
    const camera = (): Pt3 => wrong;
    eq(frontOf(withFront({ op: "addEdges", at, segs: rect() }, camera)), wrong, "没有记录 = 按当下相机");
    eq(frontOf(withFront({ op: "addEdges", at, segs: rect(), front: UP }, camera)), UP, "带着的不改");
    eq(frontOf(withFront({ op: "batch", label: "x", ops: [{ op: "addEdges", at, segs: rect() }] }, camera)), wrong, "批");
    eq(frontOf({ op: "clear" }), undefined);
  });
});

describe("resolveFace 只看第一个角上的面（预演每帧走，不随模型涨）", () => {
  it("每张面都认得回自己；和全表扫同一个结果；环顺序无关；不存在的抛", () => {
    const k = new Kernel();
    for (let i = 0; i < 12; i++) k.addEdges(rect(i * 2));
    for (const f of k.faces()) {
      const key = faceKey(k, f.id);
      eq(resolveFace(k, key), f.id);
      eq(resolveFace(k, [...key].reverse()), f.id, "顺序无关");
    }
    let threw = false;
    try { resolveFace(k, [P(100, 100), P(101, 100), P(101, 101)]); } catch { threw = true; }
    assert(threw, "不存在 = 目标缺席");
  });
  it("带洞的面按外环认；两张面共边时只认外环一样的那张", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 4));
    k.addEdges([[P(1, 1), P(2, 1)], [P(2, 1), P(2, 2)], [P(2, 2), P(1, 2)], [P(1, 2), P(1, 1)]]);
    eq(k.faces().length, 2);
    for (const f of k.faces()) eq(resolveFace(k, faceKey(k, f.id)), f.id);
  });
});
