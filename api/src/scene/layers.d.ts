import type { LayerDoc } from "../format/document.ts";
import type { InstId, Scene } from "./scene.ts";
/** 一条实例链（根 definition 往下逐级进入的实例 id）各级的有效层。 */
export declare function effectiveLayersOfChain(scene: Scene, chain: readonly InstId[]): number[];
export declare const layerVisible: (layers: readonly LayerDoc[], id: number) => boolean;
/** 这条链末端的东西可见吗（链上每一级的有效层都要可见；空链 = 根 = 永远可见）。 */
export declare function chainVisible(scene: Scene, chain: readonly InstId[]): boolean;
/** 链末端的有效层（给面的继承用：面没打层就归所在定义被实例化时的有效层）。 */
export declare const effectiveLayerOfChain: (scene: Scene, chain: readonly InstId[]) => number;
