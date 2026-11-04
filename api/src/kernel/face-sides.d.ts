import type { FaceEvent } from "./face-lifecycle.ts";
import type { FaceId, Kernel, Pt3 } from "./kernel.ts";
type Side = 0 | 1;
/** 这张面哪一侧是默认背面（0 = +n、1 = −n）；两侧都不是或都是 = null（没有朝向信息）。 */
export declare function backSideOf(k: Pick<Kernel, "faceMaterialOf">, f: FaceId, back: number): Side | null;
/** 这一批事件之后还活着的新面（BIRTH，含同一批里被再切开的）。 */
export declare function bornFaces(events: readonly FaceEvent[]): FaceId[];
export interface NewFaceSides {
    /** 现在的默认背面槽号（这个定义还没开过 = −1）。 */
    readonly back: number;
    /** 要写时才开槽（槽表归调用方）。 */
    openBack(): number;
    /** 指令里带的方向（池本地坐标）。 */
    readonly front?: Pt3;
    /** 先按 front 定朝向的面（推拉的那张面）。 */
    readonly seed?: FaceId;
}
/** 给这批新面定两侧。只碰两侧都没写的新面（载荷自带的层不动），也只写默认背面、永不写默认正面（默认正面 = 槽缺）。 */
export declare function settleNewFaceSides(k: Kernel, born: readonly FaceId[], o: NewFaceSides): void;
export {};
