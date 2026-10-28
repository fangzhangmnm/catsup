// player/body.ts —— 「这个人」：身体尺寸 + 走 / 跑 / 跳（深模块、窄接口）。created 2026-10-28 by Claude Opus 5.5
// user 10-28「碰撞不是很对，不知道是头高了还是碰撞体低了」「你想一下眼睛和头顶应该多高。建筑学标准」「或者看一下我在realhome里面怎么处理的」
// 「这里应该是一个深模块窄接口」「消费者不应该知道你有眼睛」「身高 宽度眼高，以及后来的射击 都可以调整，现在还没想好放在哪里，就先算马前炮」
// 「应该是有一个眼睛到头顶的高度，这样站蹲爬都能算对」「眼睛top，身高，宽度，蹲高，爬高。嗯可以做一个爬。」「然后移动速度，跑步倍速，跳高」「然后应该能估算跳远距离」。
//
// 吃一份参数（AvatarSpec，全是人话的量：身高 / 宽度 / 眼到头顶 / 蹲高 / 爬高 / 走速 / 跑步倍速 / 跳高；只有身高必填，别的不填 = 按身高 / 默认自动），
// 吐出模拟器要的那组字段（avatarFields → PlayerConfig 的子集）。消费者（放置、步行、碰撞、虚影）拿到的是一份配置，不各自写数字、不知道眼睛在哪：
// 要身高问 statureOf，要跳多远问 jumpReach，要胶囊问模拟器（player.ts capsuleSpheres）。
// 「眼到头顶」是一个不变的量：模拟器里头顶永远 = 眼 + 它，站 / 蹲 / 爬都一样（蹲 = 头顶降到蹲高，爬 = 降到爬高）。
//
// 数从哪来（按记忆的人体尺寸，没有当场核对文献）：成年人身高中位数约 1.68–1.75 m；站立眼高比身高低约 11 cm ≈ 身高的 6.5 %
// （GB/T 10000 成年男子 50 百分位：身高 1678 mm、眼高 1568 mm）；SketchUp 步行默认眼高 1.676 m（5′6″）。→ 默认身高 1.72 m，眼高 ≈ 1.61 m。
// 宽度（碰撞体直径）0.6 m（肩宽 ≈ 0.43 m 加摆臂）、能跨的台阶 0.3 m、贴地吸附 0.3 m、蹲高 0.86 m（钻得过 1 m 的洞，RealHome / CatsUp 一直的数）、
// 爬高 0.45 m（趴着匍匐）；走 3 m/s、跑 = 2 倍、跳高（按住跳到顶）1.0 m = 一直用的手感。尺寸按身高同比例缩放（小孩 / 猫娘 / 巨人同一套）。
// 以前的坑（RealHome 也有）：碰撞体的顶 = 眼睛 → 钻到天花板 / 门楣底下时眼睛贴着几何、镜头伸进去看穿。
import type { PlayerConfig } from "./player.ts";

/** 「这个人」的参数（米 / 米每秒 / 倍）：身高必填，别的不填 = 自动。 */
export interface AvatarSpec {
  readonly stature: number;
  /** 碰撞体直径（肩宽 + 摆臂）。 */
  readonly width?: number;
  /** 眼睛到头顶（站 / 蹲 / 爬都不变）。 */
  readonly eyeToTop?: number;
  /** 蹲下时头顶多高。 */
  readonly crouchHeight?: number;
  /** 趴下爬时头顶多高。 */
  readonly crawlHeight?: number;
  /** 走多快（米每秒）。 */
  readonly walkSpeed?: number;
  /** 跑 = 走的几倍。 */
  readonly runFactor?: number;
  /** 按住跳能跳多高（脚离地多高）。 */
  readonly jumpHeight?: number;
}
export const STATURE_DEFAULT = 1.72, STATURE_MIN = 0.3, STATURE_MAX = 5;
export const AVATAR_DEFAULT: AvatarSpec = { stature: STATURE_DEFAULT };

/** 下面这组尺寸是给这么高的人定的（米）；按身高同比例缩放。 */
const REF = 1.72;
const EYE_GAP = 0.065, WIDTH = 0.6, STEP = 0.3, STICK = 0.3, CROUCH = 0.86, CRAWL = 0.45;
/** 走速 / 跑步倍速 / 跳高 / 爬的速度占走速多少（不随身高缩放：手感的数）。 */
const WALK = 3, RUN = 2, JUMP = 1.0, CRAWL_SPEED = 0.25;
/** 跳的重力（米每秒²）：按住跳上升段 / 别的时候（一直用的手感；跳高换算起跳速度用的是按住那一段）。 */
export const GRAVITY = 25, GRAVITY_HELD = 15;

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const pick = (v: number | undefined, auto: number): number => (v !== undefined && Number.isFinite(v) ? v : auto);

/** 填满的参数（自动的算出来、夹在合理范围：眼到头顶 ≥ 4 cm（比镜头近平面远）；爬高 ≤ 蹲高 ≤ 身高；宽度 ≤ 身高的一半）。 */
export function resolveAvatar(spec: AvatarSpec): Required<AvatarSpec> {
  const s = clamp(pick(spec.stature, STATURE_DEFAULT), STATURE_MIN, STATURE_MAX), k = s / REF;
  const eyeToTop = clamp(pick(spec.eyeToTop, s * EYE_GAP), 0.04, s / 2);
  const crouchHeight = clamp(pick(spec.crouchHeight, CROUCH * k), eyeToTop + 0.02, s);
  const crawlHeight = clamp(pick(spec.crawlHeight, CRAWL * k), eyeToTop + 0.02, crouchHeight);
  return {
    stature: s, width: clamp(pick(spec.width, WIDTH * k), 0.05, s / 2), eyeToTop, crouchHeight, crawlHeight,
    walkSpeed: clamp(pick(spec.walkSpeed, WALK), 0.1, 50), runFactor: clamp(pick(spec.runFactor, RUN), 1, 10), jumpHeight: clamp(pick(spec.jumpHeight, JUMP), 0, 20),
  };
}

/** 身体 + 动作的字段（PlayerConfig 的子集）。 */
export type AvatarFields = Pick<PlayerConfig, "height" | "headroom" | "radius" | "stepHeight" | "stickDown" | "crouchMinHead" | "crouchDrop" | "crawlHead"
  | "walkSpeed" | "dashSpeed" | "crawlSpeed" | "jumpVel" | "gravity" | "gravityHeld">;
/** 这个人的字段。 */
export function avatarFields(spec: AvatarSpec | number): AvatarFields {
  const a = resolveAvatar(typeof spec === "number" ? { stature: spec } : spec), k = a.stature / REF, eye = a.stature - a.eyeToTop;
  const crouchEye = a.crouchHeight - a.eyeToTop, crawlEye = a.crawlHeight - a.eyeToTop;
  return {
    height: eye, headroom: a.eyeToTop, radius: a.width / 2, stepHeight: STEP * k, stickDown: STICK * k,
    crouchMinHead: crouchEye, crouchDrop: eye - crouchEye, crawlHead: crawlEye,
    walkSpeed: a.walkSpeed, dashSpeed: a.walkSpeed * a.runFactor, crawlSpeed: a.walkSpeed * CRAWL_SPEED,
    jumpVel: Math.sqrt(2 * GRAVITY_HELD * a.jumpHeight), gravity: GRAVITY, gravityHeld: GRAVITY_HELD,
  };
}
/** 换一个人：别的（手感、步进）照旧。 */
export function withAvatar<T extends AvatarFields>(cfg: T, spec: AvatarSpec | number): T { return { ...cfg, ...avatarFields(spec) }; }
/** 这份配置的人有多高（头顶离脚底）。 */
export function statureOf(cfg: Pick<PlayerConfig, "height" | "headroom">): number { return cfg.height + cfg.headroom; }

/**
 * 跳多高、在空中多久、平地上走着 / 跑着跳多远（按住跳到底那一种；和模拟器同一套物理：上升段 gravityHeld、到顶以后 gravity，不算空气阻力）。
 * 关卡用（user 10-24「关卡讨论用 A 到 B 几秒几拍」）：这道沟跑着跳得过去吗、这个台子跳得上去吗。
 */
export function jumpReach(cfg: Pick<PlayerConfig, "jumpVel" | "gravity" | "gravityHeld" | "walkSpeed" | "dashSpeed">): { height: number; airtime: number; walk: number; run: number } {
  const up = cfg.jumpVel / cfg.gravityHeld, height = (cfg.jumpVel * cfg.jumpVel) / (2 * cfg.gravityHeld), down = Math.sqrt((2 * height) / cfg.gravity), airtime = up + down;
  return { height, airtime, walk: cfg.walkSpeed * airtime, run: cfg.dashSpeed * airtime };
}
