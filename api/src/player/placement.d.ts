import type { Pt3 } from "../kernel/geom.ts";
import type { Ray, WorldQuery } from "./world-query.ts";
import { type PlayerConfig } from "./player.ts";
export interface Placement {
    /** 脚底（胶囊最低点）落在哪。 */
    readonly feet: Pt3;
    /** 站得下吗（胶囊不穿几何）。 */
    readonly ok: boolean;
    /** 站不下 / 换了落点的原因（人话；ok 且原样 = 无）。 */
    readonly why?: string;
}
/**
 * 射线 → 碰撞世界的首个命中（含安全地板）：
 *   · 地（|n.z| ≥ cos 最大坡度）= 脚落在命中点；
 *   · 墙 / 陡坡 = 从命中点往回退一个半径、再往下找能站的面（落在墙脚）；
 *   · 站得下 = 站立胶囊（这一组半径 / 高度）在那里不穿几何。
 * 射线什么都没打到（朝天看）= null。far = 射线最远多少米。
 */
export declare function placeCapsule(world: WorldQuery, ray: Ray, cfg?: PlayerConfig, far?: number): Placement | null;
