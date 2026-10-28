import type { EpsSet } from "../editor/pointer-frame.ts";
/** 桌面帧的度量单位 = fovY 的 1/800 ≡ 800 px 高视口里的 px；所有桌面 ε 按它标定，实际按 vp.h / 800 等比缩放；VR 帧的单位 = 度。 */
export declare const REF_VP_H = 800;
/** 求解器候选 ε：点 / 边 / 线（无限直线 & 轴线）/ 合成（角点）。line 5 → 3.5 =「点松线紧」试验（user 2026-09-07「可以试试」；B6）。 */
export declare const EPS: {
    readonly point: 10;
    readonly edge: 7;
    readonly line: 3.5;
    readonly combo: 12;
};
/** 取点基准容差 / 实体拾取容差。 */
export declare const SNAP_PX = 8, HIT_PX = 6;
/** 自由建模里点的拾取半径（同一套度量）：点比边好抓，常量不按大小比例（FM165 user「还是常量比较好」「大小成比例手感不好」）。 */
export declare const MESH_VERT_HIT_PX = 14;
/** 第二点平面「近擦」容差：光标离含锚点膜的剪影这么近 = 仍算在那张膜上（滑出底边不翻面）。 */
export declare const PLANE_NEAR_PX = 24;
/** 1-D 轨迹与指针射线夹角小于这么多度 = 公垂点病态，该轨迹不参赛（2026-09-08 user「小屋子的侧面上画线的时候 z 轴对齐不见了」）。单位：度。 */
export declare const RAY_PARALLEL_DEG = 10;
/** 桌面帧的点按 / 拖动门槛（frameEps 里的 tap / drag；drag 按 vp.h / 800 缩放，tap 不缩）。 */
export declare const FRAME_TAP = 4, FRAME_DRAG = 16;
export declare const EPS_VR_DEG: EpsSet;
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
export declare const TAP_RULES: Readonly<Record<string, TapRule>>;
/** 不认识的指针（VR 手柄等）：本帧自己的 tap 容差、不偏向；同一处 = 1.5 × tap。 */
export declare const FRAME_TAP_RULE: {
    readonly windowMs: 350;
    readonly quickMs: 250;
    readonly reachK: 1.5;
};
/** 笔 / 手指长按 = 右键菜单（ms）。 */
export declare const LONG_PRESS_MS = 500;
/** 多指轻点（撤销 / 重做）：从最早触点落下算，超过这么久不算轻点（ms）；每根手指离各自起点超过这么远不算（CSS px）。 */
export declare const GESTURE_TAP_MAX_MS = 250, GESTURE_TAP_MAX_MOVE = 16;
/** 掌触门：笔尖活动后这么久内的多指轻点当手掌闪灭吞掉（ms）。 */
export declare const PALM_PEN_GUARD_MS = 600;
/** 幽灵指针：这么久没动静的触点在下一次按下前清掉（ms；iOS 偶尔丢 pointerup）。 */
export declare const STALE_TOUCH_MS = 8000;
/** 单指轻点（ms）。 */
export declare const SINGLE_TAP_MS = 250;
/** 大动作解锁：笔按住拖的中途凑成的双指先当手掌，质心 / 指距累计动过这么多才解锁成相机（CSS px；user 2026-10-24「要不要大动作解锁」）。 */
export declare const UNLOCK_PX = 28;
/** 抬笔结算三个物理量，各自量纲独立：松手前这么久内的停留帧才算（ms）/ 最后一帧停够这么久就按最后一帧（ms）/ 停留至少这么久才算停留（ms）/ 停留的位移上限（CSS px @800 高）。 */
export declare const RELEASE_WINDOW_MS = 150, FINAL_HOLD_MS = 100, MIN_DWELL_MS = 40, HOLD_PX = 4;
/** 抬笔小滑上限（CSS px @800 高）：停留帧与最后一帧相距超过它 = 不是抖动是挪动，按最后一帧。 */
export declare const DWELL_SLIP_PX = 24;
export declare const CHARGE_DWELL_MS = 300;
/** 平面把手（镜像面）：方块半边长 / 把手捕获半径（CSS px）/ 转动一档（度）/ 法线离帧的某根轴这么近就吸正（度）。 */
export declare const GIZMO_PX = 64, HANDLE_PX = 16, ROT_STEP_DEG = 15, AXIS_SNAP_DEG = 4;
/**
 * 变换把手（CSS px；2026-10-26 user「然后比例也不对，看的好难受」+ 坦克截图：照 Blender 合在一起的样子——环小、箭头在环外、轴上缩放块在环里，环和箭头不相交）：
 * 等比缩放块离轴心右上各多少 / 箭头尖离原点 / 箭头从原点外多少开始 / 单轴缩放块离原点 / 缩放块半边长 / 旋转环半径 / 平面块中心离轴心（沿两根轴各）/ 平面块半边长。
 */
export declare const XG_UNIFORM_OFFSET_PX = 34, XG_ARROW_PX = 100, XG_ARROW_START_PX = 64, XG_SCALE_PX = 32, XG_CUBE_PX = 3.5, XG_RING_PX = 56, XG_PLANE_PX = 20, XG_PLANE_HALF_PX = 4.5;
/** 导航把手上的拖柄：按下后挪过这么多才算拖（CSS px；笔点下去手抖几 px 不误缩放）。 */
export declare const VIEW_GIZMO_DRAG_SLOP_PX = 6;
/** 按住修饰键多久不按别的键 = 状态行露出「这一层按住它是什么」（接线清单第 5 条；比长按短：是看一眼，不是动作）。毫秒。 */
export declare const MOD_PEEK_MS = 450;
