// scene/layers.ts —— 层的语义（契约 ai-docs/20261024-object-model-contract.md §4；user 2026-10-24「layer就是类似unity的render layer……纯管理用的。可以想一下父亲儿子怎么继承」）。
// 有效层(实例) = 自己的 layer ?? 父实例的有效层 ?? 0；有效可见 = 自己有效层可见 且 祖先链上每个实例的有效层都可见（藏父连子一起藏）。
// 只藏不删：隐藏的东西不进推断世界、不进选区；组不带层（组不是物体）。纯函数，node 直测。created 2026-10-24 by Claude Fable 5.1
import type { LayerDoc } from "../format/document.ts";
import type { DefId, InstId, Scene } from "./scene.ts";

/** 一条实例链（根 definition 往下逐级进入的实例 id）各级的有效层。 */
export function effectiveLayersOfChain(scene: Scene, chain: readonly InstId[]): number[] {
  const out: number[] = [];
  let def: DefId = scene.root, inherited = 0;
  for (const iid of chain) {
    const inst = scene.def(def).instances.get(iid);
    if (!inst) break;
    inherited = inst.layer ?? inherited;
    out.push(inherited);
    def = inst.def;
  }
  return out;
}
export const layerVisible = (layers: readonly LayerDoc[], id: number): boolean => layers.find((l) => l.id === id)?.visible ?? true;
/** 这条链末端的东西可见吗（链上每一级的有效层都要可见、每一级实例都没被隐藏；空链 = 根 = 永远可见）。
 *  隐藏（DT49，user 2026-10-25「然后 hide unhide all也马上需要了」）和藏层同一条路：藏父连子、不进推断世界、不画。 */
export function chainVisible(scene: Scene, chain: readonly InstId[]): boolean {
  let def: DefId = scene.root;
  for (const iid of chain) { const inst = scene.def(def).instances.get(iid); if (!inst) break; if (inst.hidden) return false; def = inst.def; }
  return effectiveLayersOfChain(scene, chain).every((id) => layerVisible(scene.layers, id));
}
/** 链末端的有效层（给面的继承用：面没打层就归所在定义被实例化时的有效层）。 */
export const effectiveLayerOfChain = (scene: Scene, chain: readonly InstId[]): number => { const ls = effectiveLayersOfChain(scene, chain); return ls.length ? ls[ls.length - 1] : 0; };
