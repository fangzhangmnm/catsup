// paint/uvset-occupancy.ts —— 一套排法上「所有物件」的面占着哪里（施工单十八第 2 刀 b：按排法看所有物件那张表）。created 2026-11-13 by Claude Opus 5.5
// 一套排法（画布）上可以有好几个定义的面（第 3 刀放开搬家之后；没有摆放的定义也算）。全仓问「这套排法上谁占着哪里」只经这一张表：
//   · 补面当占着的（paint/freed.ts placementBlocked）、空地 = freed 减去占着的（freedOpenAreas）—— 用框（layout.ts cellRect，全仓「占着」只有这一个算法）；
//   · 空间里的笔每格归谁（paint-targets.ts：别的物件的面也进归属，这一笔碰不到它们的格）、画布小窗里别的物件的面画淡 —— 用多边形（角上的贴图坐标）。
// 只读场景：每个定义按「内核对象 + 修改号 + 速查表」记一次，没变就不重算（拖动预演的影子内核是别的对象，各记各的）。
import type { Guid } from "../format/guid.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { DefId, Scene } from "../scene/scene.ts";
import { uvAt, uvSetOfFace } from "../scene/uv.ts";
import { cellRect } from "./layout.ts";

/** 一个定义在一套排法上的面：面的编号、每张面的多边形（贴图坐标，x, y…）、每张面占的格（cellRect，没有截到画布里）。 */
export interface DefOnUvSet {
  readonly def: DefId;
  readonly kernel: MeshKernel;
  readonly faces: readonly number[];
  readonly rings: readonly Float64Array[];
  readonly boxes: readonly (readonly [number, number, number, number])[];
}
interface Cached { readonly rev: number; readonly slots: string; readonly entry: Omit<DefOnUvSet, "def"> }
const cache = new WeakMap<MeshKernel, Map<Guid, Cached>>();

/** 一个网格体在排法 g 上的面（缓存：内核对象 + 修改号 + 速查表没变就是上一次那份）。 */
export function meshOnUvSet(k: MeshKernel, slots: readonly Guid[], g: Guid): Omit<DefOnUvSet, "def"> {
  let byG = cache.get(k);
  if (!byG) { byG = new Map(); cache.set(k, byG); }
  const sk = slots.join(","), hit = byG.get(g);
  if (hit && hit.rev === k.rev && hit.slots === sk) return hit.entry;
  const faces: number[] = [], rings: Float64Array[] = [], boxes: [number, number, number, number][] = [];
  if (slots.includes(g)) for (const f of k.faces()) {
    if (uvSetOfFace(k, slots, f) !== g) continue;
    const v = uvAt(k, slots, f, g);
    if (!v) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i + 1 < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); }
    faces.push(f); rings.push(Float64Array.from(v)); boxes.push(cellRect(x0, y0, x1, y1));
  }
  const entry = { kernel: k, faces, rings, boxes };
  byG.set(g, { rev: k.rev, slots: sk, entry });
  return entry;
}

/** 排法 g 上所有定义的面（定义按编号；速查表里没有这一套的定义不看——没有一张面的代号能指着它）。 */
export function uvSetOccupancy(s: Scene, g: Guid): DefOnUvSet[] {
  const out: DefOnUvSet[] = [];
  for (const d of [...s.defs.values()].sort((a, b) => a.id - b.id)) {
    if (d.body.kind !== "mesh" || !d.body.uvSetSlots.includes(g)) continue;
    const e = meshOnUvSet(d.body.kernel, d.body.uvSetSlots, g);
    if (e.faces.length) out.push({ def: d.id, ...e });
  }
  return out;
}

/** 这张表这一刻的身份（缓存键用：每个定义的内核对象编号 + 修改号）；except = 不算这个定义。 */
const ids = new WeakMap<object, number>(); let nextId = 1;
const idOf = (o: object): number => { let n = ids.get(o); if (n === undefined) { n = nextId++; ids.set(o, n); } return n; };
export function occupancyKey(s: Scene, g: Guid, except: DefId | null): string {
  const parts: string[] = [];
  for (const d of [...s.defs.values()].sort((a, b) => a.id - b.id)) if (d.id !== except && d.body.kind === "mesh" && d.body.uvSetSlots.includes(g)) parts.push(`${d.id}:${idOf(d.body.kernel)}@${d.body.kernel.rev}`);
  return parts.join(",");
}
