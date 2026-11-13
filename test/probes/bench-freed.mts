// test/probes/bench-freed.mts —— 记空出来的地方花多久（施工单十八第 2 刀统筹预审第 2 条：一步删掉 4 万张画过的面，记空位这一段不许比删面本身慢）。created 2026-11-13 by Claude Opus 5.5
// 一个 200 × 200 的格子网（4 万张四边形），全部开始画（一张面一块），然后：① 一步删掉全部 4 万张；② 一步删掉一半（2 万张连成一片）。
// 每种量：删面那条指令提交（History.commit，含撤销记录）花多久 / 记空位（freedOp：比前后 + 筛盖住 + 并清单）花多久 / 再跑一次 freedOp（应该没有要改的）/ 清单几个框。
// 用法：node test/probes/bench-freed.mts（node 直跑，不开浏览器；只量、不判红绿以外的东西：记空位比删面慢 = 红）
import { Scene } from "../../src/scene/scene.ts";
import { History } from "../../src/editor/history.ts";
import { MeshKernel } from "../../src/mesh/mesh-kernel.ts";
import { mintGuid } from "../../src/format/guid.ts";
import { translation } from "../../src/scene/xform.ts";
import { freedBaseline, freedOp } from "../../src/editor/paint-freed.ts";
import { sceneBox } from "../format-scenes.ts";

const N = 200;
function build(): { h: History<string>; cur: () => Scene; def: number } {
  const s0 = new Scene(sceneBox(2, 1.5)), d = s0.mintDef("格子", sceneBox(1, 1)), k = new MeshKernel(), id: number[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) id.push(k.addVertex({ x: i * 0.01, y: j * 0.01, z: 0 }));
  const at = (i: number, j: number): number => id[j * (N + 1) + i];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) k.addFace([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], { kind: "fresh", corner: new Map(), face: new Map() });
  d.body = { kind: "mesh", kernel: k, materialSlots: [], uvSetSlots: [] };
  s0.mintInstance(s0.root, null, d.id, translation({ x: 0, y: 0, z: 0 }));
  const h = new History<string>(s0), cur = (): Scene => (h as unknown as { current: Scene }).current;
  h.commit(cur(), { op: "startPaint", def: d.id, faces: k.faces(), uvSet: mintGuid(), textureGuid: mintGuid(), materialGuid: mintGuid(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [1, 1, 1], density: 400 }, false, "b", { title: "start" });
  return { h, cur, def: d.id };
}
function run(label: string, pick: (faces: number[]) => number[]): { del: number; freed: number; again: number; boxes: number } {
  const { h, cur, def } = build(), faces = pick(cur().mesh(def).kernel.faces()), base = freedBaseline(cur(), h);
  let t = performance.now();
  h.commit(cur(), { op: "meshDelete", def, faces }, false, "b", { title: "del" });
  const del = performance.now() - t;
  t = performance.now();
  const fo = freedOp(cur(), h, base);
  const freed = performance.now() - t;
  if (fo) h.commit(cur(), fo, true, "b", { title: "freed" });
  t = performance.now();
  const again = freedOp(cur(), h, base);
  const againMs = performance.now() - t;
  const g = [...cur().uvSets.keys()][0], boxes = (cur().uvSets.get(g)?.freed?.length ?? 0) / 4;
  console.log(`${label}：删 ${faces.length} 张  删面提交 ${del.toFixed(0)} ms ｜ 记空位 ${freed.toFixed(0)} ms ｜ 再跑一次 ${againMs.toFixed(0)} ms（${again ? "还有要改的！" : "没有要改的"}）｜ 清单 ${boxes} 个框`);
  return { del, freed, again: againMs, boxes };
}

const all = run("全部", (fs) => fs);
const half = run("一半（连成一片）", (fs) => fs.slice(0, fs.length / 2));
const ok = all.freed <= all.del && half.freed <= half.del && all.boxes <= 256 && half.boxes <= 256;
console.log(ok ? "bench-freed OK" : "bench-freed FAIL（记空位比删面慢 / 清单超过 256）");
process.exit(ok ? 0 : 1);
