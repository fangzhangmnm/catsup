import type { Material } from "./scene.ts";
/** 默认背面在槽表里的句柄（运行时；普通材质是 ≥ 0 的下标，−1 = 悬空）。 */
export declare const BUILTIN_BACK_SLOT = -2;
/** 默认背面（常量对象：渲染缓存按对象身份签名，预设只换颜色不换对象）。color 是兜底值；屏幕上的颜色归 stream-provider。 */
export declare const BUILTIN_BACK: Material;
export declare const isBuiltinHandle: (m: number) => boolean;
