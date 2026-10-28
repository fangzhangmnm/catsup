// placement.ts —— 放置：在碰撞世界上拾一个放得下胶囊体的点（深模块、窄接口；纪元账本 FM145）。created 2026-10-28 by Claude Opus 5.5
// user 10-27「放置你先做一个深模块窄接口，可以先普通一点，以后丢猫娘也用这个。那时候好好想ux的花。注意这个是交互，就是collision上面pick一个能放capsule的点」
// 「放置的时候要能看到玩家的半径和高度」。步行的「点一下落在哪」是它第一个用户；以后丢猫娘 / 放道具同一个口。
// 只认 WorldQuery（player 深模块的世界原语），不认 kernel / three / DOM。
import type { Pt3 } from "../kernel/geom.ts";
import type { Ray, WorldQuery } from "./world-query.ts";
import { DEFAULT_CONFIG, type PlayerConfig, standingClear } from "./player.ts";

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
export function placeCapsule(world: WorldQuery, ray: Ray, cfg: PlayerConfig = DEFAULT_CONFIG, far = 500): Placement | null {   // 身体 = 这份配置（body.ts withAvatar 出来的）：不另传半径 / 高度
  const a = ray.origin, b = { x: a.x + ray.dir.x * far, y: a.y + ray.dir.y * far, z: a.z + ray.dir.z * far };
  const hit = world.segmentHit(a, b);
  if (!hit) return null;
  const minNz = Math.cos((cfg.maxSlopeDeg * Math.PI) / 180);
  let feet = hit.p, why: string | undefined;
  if (Math.abs(hit.n.z) < minNz) {
    const back = { x: hit.p.x - ray.dir.x * cfg.radius * 1.05, y: hit.p.y - ray.dir.y * cfg.radius * 1.05 };
    const z = world.floorBelow(back.x, back.y, hit.p.z, world.floorZ() - 1, minNz);
    if (z === null) return { feet, ok: false, why: "这里是墙 / 陡坡，下面也没有能站的地方" };
    feet = { x: back.x, y: back.y, z };
    why = "点在墙上：落到墙脚";
  }
  const ok = standingClear(feet, world, cfg);
  return ok ? { feet, ok, ...(why ? { why } : {}) } : { feet, ok, why: "这里站不下（身子或头会穿过几何）" };
}
