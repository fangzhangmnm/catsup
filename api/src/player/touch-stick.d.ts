/** 摇杆的手感参数（CSS px = 物理尺寸：iPad mini 竖屏 1 CSS px ≈ 0.16 mm）。 */
export interface StickConfig {
    /** 推满（= 全速走）要离底座中心多远。56 px ≈ 9 mm：拇指不挪手腕够得着、又不至于抖一下就满速。 */
    readonly radius: number;
    /** 底座中心附近这么一圈（占 radius 的比例）不算推（拇指刚放下的抖动）。 */
    readonly deadzone: number;
    /** 推过底座边缘多少（占 radius 的比例，> 1）= 冲刺（吃鸡「推到底再往外 = 跑」的肌肉记忆）。 */
    readonly dashAt: number;
    /** 手指离底座中心超过这么远（占 radius 的比例）底座就跟过去（浮动摇杆不丢：拇指滑出去了，摇杆跟着拇指）。 */
    readonly followAt: number;
    /** 模拟器自己的死区（player.ts DEFAULT_CONFIG.stickDeadzone）：输出从它开始，过了摇杆死区就是最慢的那一档走，不出现「推了不动」的一段。 */
    readonly simDeadzone: number;
}
export declare const STICK: StickConfig;
/** 右半屏拖动看：弧度每 CSS px（0.0045 ≈ 0.26°/px：iPad mini 竖屏右半屏一整划 ≈ 370 px ≈ 95°）。不加速、不平滑：跟手第一。 */
export declare const TOUCH_LOOK_RAD_PER_PX = 0.0045;
export interface StickOut {
    walkX: number;
    walkY: number;
    dash: boolean;
}
/**
 * 手指相对底座中心的位移（屏幕 px，y 向下为正）→ 走的方向和快慢：x 右+、y 前+（屏幕往上推 = 往前走）。
 * 死区里 = 0；过了死区按距离线性给到 1（从模拟器死区起算）；超过 radius 封顶 1；超过 dashAt × radius = 冲刺。
 */
export declare function stickOutput(dx: number, dy: number, cfg?: StickConfig): StickOut;
/** 浮动底座跟手：手指离底座中心超过 followAt × radius → 底座沿那条线挪到正好 followAt × radius 远（方向不变）。返回新的底座中心。 */
export declare function followBase(base: {
    x: number;
    y: number;
}, finger: {
    x: number;
    y: number;
}, cfg?: StickConfig): {
    x: number;
    y: number;
};
/** 底座出现的位置：按下处，但整个底座（radius）留在区域里（贴边按下 = 底座往里挪，摇杆不被屏幕边切掉）。 */
export declare function placeBase(at: {
    x: number;
    y: number;
}, zone: {
    x: number;
    y: number;
    w: number;
    h: number;
}, cfg?: StickConfig): {
    x: number;
    y: number;
};
