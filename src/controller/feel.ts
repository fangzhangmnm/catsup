// controller/feel.ts —— 手感表：控制器里所有**连续量**（多少像素、多少毫秒、多少度）集中在这一张表，按设备分列；路由（什么手势 / 什么键 = 什么意思）是另一张表（stance.ts / 以后的键表）。
// created 2026-10-28 by Claude Fable 5.1（0.16 镜像 + UX 整理纪元；UX 心智模型 §2.5 / §2.7；账本 UX16）。
// user 10-28「进（设备 → 控制器） 关键是单双三击以及一些更复杂的逻辑需要一个集中整理的地方，然后鼠标和笔需要分开来调」「对，手感的连续量和路由的连续量分开来」。
// 纪律：每个量按自己的量纲独立定义（调参纪律，user 2026-09-08）；量纲写在名字或注释里；**值一个不改**（这一版 = 从各模块搬进来，零行为变更，出处见各段注释）。
// 这个文件零 import（除 type）——无头骑士守卫（test/stance.test.ts）管着。
import type { EpsSet } from "../editor/pointer-frame.ts";

// ---------- 度量基准（solver.ts，2026-09-06 user「吸附的语义还是屏幕大小…height+aspect 这个老 gl convention」）----------
/** 桌面帧的度量单位 = fovY 的 1/800 ≡ 800 px 高视口里的 px；所有桌面 ε 按它标定，实际按 vp.h / 800 等比缩放；VR 帧的单位 = 度。 */
export const REF_VP_H = 800;

// ---------- 吸附 / 拾取容差（桌面，单位 = fovY 的 1/800；原 solver.ts）----------
/** 求解器候选 ε：点 / 边 / 线（无限直线 & 轴线）/ 合成（角点）。line 5 → 3.5 =「点松线紧」试验（user 2026-09-07「可以试试」；B6）。 */
export const EPS = { point: 10, edge: 7, line: 3.5, combo: 12 } as const;
/** 取点基准容差 / 实体拾取容差。 */
export const SNAP_PX = 8, HIT_PX = 6;
/** 自由建模里点的拾取半径（同一套度量）：点比边好抓，常量不按大小比例（FM165 user「还是常量比较好」「大小成比例手感不好」）。 */
export const MESH_VERT_HIT_PX = 14;
/** 第二点平面「近擦」容差：光标离含锚点膜的剪影这么近 = 仍算在那张膜上（滑出底边不翻面）。 */
export const PLANE_NEAR_PX = 24;
/** 1-D 轨迹与指针射线夹角小于这么多度 = 公垂点病态，该轨迹不参赛（2026-09-08 user「小屋子的侧面上画线的时候 z 轴对齐不见了」）。单位：度。 */
export const RAY_PARALLEL_DEG = 10;
/** 桌面帧的点按 / 拖动门槛（frameEps 里的 tap / drag；drag 按 vp.h / 800 缩放，tap 不缩）。 */
export const FRAME_TAP = 4, FRAME_DRAG = 16;

// ---------- VR 帧容差（度；原 xr-pointer-frame.ts，独立的角度常量，不从视场推——user 2026-09-08 调参纪律）----------
export const EPS_VR_DEG: EpsSet = { point: 1.0, edge: 0.7, line: 0.5, combo: 1.2, hit: 1.0, snap: 0.8, planeNear: 2.0, tap: 0.4, drag: 1.2 };

// ---------- 点按族：一次按下是点还是拖、连着点了几下（原 tap-train.ts TAP_RULES）----------
/** 一种指针的点按规矩。距离一律本帧度量（桌面 fovY 的 1/800 ≈ 800 px 高视口里的 px）。 */
export interface TapRule {
  /** 连击窗口：上一下抬起 → 这一下按下 ≤ 这么久 (ms)。 */
  windowMs: number;
  /** 「快速的一点」：按下到抬起 ≤ 这么久 (ms)；只有快速的一点才让下一下偏向点。 */
  quickMs: number;
  /** 单独一下的点按容差：按下到抬起走了这么远以内 = 点。 */
  slop: number;
  /** 偏向点的那一下的容差（快速点之后、窗口里、落在上一下附近）。 */
  followSlop: number;
  /** 连击「同一处」：这一下按下的地方离上一下按下的地方这么近以内。 */
  reach: number;
}
/**
 * 按指针种类（鼠标 / 笔 / 手指——设备三个词，心智模型 §2.5）。鼠标 = 原样（4 / 6）。
 * 笔（2026-10-28 放宽；user「平板笔的双击三击太严了。判定改松一点。鼠标手感没问题」）：笔要抬起再落下，比鼠标慢、落点也散——窗口 350 → 500 ms、快速一点 250 → 350 ms、
 * 单独一下 4 → 6、跟进那一下 12 → 20（iPad mini 竖屏 ≈ 28 css px ≈ 4.7 mm）、同一处 12 → 24。手指版还没调（先是「手指画」开关下的现状）。
 */
export const TAP_RULES: Readonly<Record<string, TapRule>> = {   // 键 = 指针种类 mouse / pen / touch（string：调用方拿 pointerType 直接查）
  mouse: { windowMs: 350, quickMs: 250, slop: 4, followSlop: 4, reach: 6 },
  pen: { windowMs: 500, quickMs: 350, slop: 6, followSlop: 20, reach: 24 },
  touch: { windowMs: 350, quickMs: 250, slop: 4, followSlop: 16, reach: 16 },
};
/** 不认识的指针（VR 手柄等）：本帧自己的 tap 容差、不偏向；同一处 = 1.5 × tap。 */
export const FRAME_TAP_RULE = { windowMs: 350, quickMs: 250, reachK: 1.5 } as const;

// ---------- 指针路由里的时间 / 距离（原 app/gestures.ts）----------
/** 笔 / 手指长按 = 右键菜单（ms）。 */
export const LONG_PRESS_MS = 500;
/** 左柱小三角格的长按（弹出整组）：比通用长按短（user 10-28 夜「小三角需要长按的时间有点长」；以前 main.ts 里写死 450）。 */
export const RAIL_FLYOUT_PRESS_MS = 260;
/** 多指轻点（撤销 / 重做）：从最早触点落下算，超过这么久不算轻点（ms）；每根手指离各自起点超过这么远不算（CSS px）。 */
export const GESTURE_TAP_MAX_MS = 250, GESTURE_TAP_MAX_MOVE = 16;
/** 掌触门：笔尖活动后这么久内的多指轻点当手掌闪灭吞掉（ms）。 */
export const PALM_PEN_GUARD_MS = 600;
/** 幽灵指针：这么久没动静的触点在下一次按下前清掉（ms；iOS 偶尔丢 pointerup）。 */
export const STALE_TOUCH_MS = 8000;
/** 单指轻点（ms）。 */
export const SINGLE_TAP_MS = 250;
/** 手指双击（进出组件层级；user 10-28 夜「手指双击能不能也能进出hierarchy」）：两下之间最长多久、离得最远多远（CSS px）。 */
export const FINGER_DOUBLE_TAP_MS = 380, FINGER_DOUBLE_TAP_PX = 32;
/** 大动作解锁：笔按住拖的中途凑成的双指先当手掌，质心 / 指距累计动过这么多才解锁成相机（CSS px；user 2026-10-24「要不要大动作解锁」）。 */
export const UNLOCK_PX = 28;

// ---------- 抬笔结算（A21；原 editor.ts）：抬笔前那一下抖动不算数 ----------
/** 抬笔结算三个物理量，各自量纲独立：松手前这么久内的停留帧才算（ms）/ 最后一帧停够这么久就按最后一帧（ms）/ 停留至少这么久才算停留（ms）/ 停留的位移上限（CSS px @800 高）。 */
export const RELEASE_WINDOW_MS = 150, FINAL_HOLD_MS = 100, MIN_DWELL_MS = 40, HOLD_PX = 4;
/** 抬笔小滑上限（CSS px @800 高）：停留帧与最后一帧相距超过它 = 不是抖动是挪动，按最后一帧。 */
export const DWELL_SLIP_PX = 24;

// ---------- 充能（硬表面：悬停停留的点 / 边进充能集；原 editor.ts trackCharge 默认）----------
export const CHARGE_DWELL_MS = 300;

// ---------- 把手（CSS px / 度；原 plane-gizmo.ts / transform-gizmo.ts / view-gizmo.ts）----------
/** 平面把手（镜像面）：方块半边长 / 把手捕获半径（CSS px）/ 转动一档（度）/ 法线离帧的某根轴这么近就吸正（度）。 */
export const GIZMO_PX = 64, HANDLE_PX = 16, ROT_STEP_DEG = 15, AXIS_SNAP_DEG = 4;
/**
 * 变换把手（CSS px；2026-10-26 user「然后比例也不对，看的好难受」+ 坦克截图：照 Blender 合在一起的样子——环小、箭头在环外、轴上缩放块在环里，环和箭头不相交）：
 * 等比缩放块离轴心右上各多少 / 箭头尖离原点 / 箭头从原点外多少开始 / 单轴缩放块离原点 / 缩放块半边长 / 旋转环半径 / 平面块中心离轴心（沿两根轴各）/ 平面块半边长。
 */
export const XG_UNIFORM_OFFSET_PX = 34, XG_ARROW_PX = 100, XG_ARROW_START_PX = 64, XG_SCALE_PX = 32, XG_CUBE_PX = 3.5, XG_RING_PX = 56, XG_PLANE_PX = 20, XG_PLANE_HALF_PX = 4.5;
/** 导航把手上的拖柄：按下后挪过这么多才算拖（CSS px；笔点下去手抖几 px 不误缩放）。 */
export const VIEW_GIZMO_DRAG_SLOP_PX = 6;
/** 按住修饰键多久不按别的键 = 状态行露出「这一层按住它是什么」（接线清单第 5 条；比长按短：是看一眼，不是动作）。毫秒。 */
export const MOD_PEEK_MS = 450;

// 没搬进来、留在各自模块里的连续量（它们是别的深模块自己的表，这里只是索引）：
//   触屏摇杆 player/touch-stick.ts STICK（CSS px / 比例）+ TOUCH_LOOK_RAD_PER_PX；步行转头 app/locomotion.ts LOOK_SENS（rad / px）；
//   顶点小点 / 线宽 render3.ts（设备像素）；吸附候选的层级权重 solver.ts TIER_EPS / TIER_DIST（无量纲，偏路由）。
