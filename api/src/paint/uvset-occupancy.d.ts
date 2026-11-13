import type { Guid } from "../format/guid.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { DefId, Scene } from "../scene/scene.ts";
/** 一个定义在一套排法上的面：面的编号、每张面的多边形（贴图坐标，x, y…）、每张面占的格（cellRect，没有截到画布里）。 */
export interface DefOnUvSet {
    readonly def: DefId;
    readonly kernel: MeshKernel;
    readonly faces: readonly number[];
    readonly rings: readonly Float64Array[];
    readonly boxes: readonly (readonly [number, number, number, number])[];
}
/** 一个网格体在排法 g 上的面（缓存：内核对象 + 修改号 + 速查表没变就是上一次那份）。 */
export declare function meshOnUvSet(k: MeshKernel, slots: readonly Guid[], g: Guid): Omit<DefOnUvSet, "def">;
/** 排法 g 上所有定义的面（定义按编号；速查表里没有这一套的定义不看——没有一张面的代号能指着它）。 */
export declare function uvSetOccupancy(s: Scene, g: Guid): DefOnUvSet[];
export declare function occupancyKey(s: Scene, g: Guid, except: DefId | null): string;
