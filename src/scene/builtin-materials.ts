// builtin-materials.ts —— 内置材质（单面 / 双面第四版，计划书 ai-docs/20261104-identity-foundation-plan.md §2.9 / §9.2-A；user 11-04「默认正反应该是builtin材质」）。
// 面的每一侧存一个值 = 材质 / 默认正面 / 默认背面：
//   · 默认正面 = 槽缺（面层没值）。**只有这一种表示**：写入器永不写内置正面 GUID，读入器读到当没有（§9.2-A a）。
//   · 默认背面 = 面层普通槽号 → 槽表值 BUILTIN_BACK_SLOT（文件里 = BUILTIN_BACK_GUID）。导出 / 转网格体不出这一侧；语义就是「丢」（user「默认背面就是丢的语义啊，没有内部符号」）。
// 内置材质不进 `Scene.materials`、不写进文件的材质表，文件里只有引用（守卫 test/identity-guard.test.ts）。样子归 app，颜色在 PALETTE.faceBack。
// created 2026-11-04 by Claude Opus 5.5
import { BUILTIN_BACK_GUID } from "../format/guid.ts";
import type { Material } from "./scene.ts";

/** 默认背面在槽表里的句柄（运行时；普通材质是 ≥ 0 的下标，−1 = 悬空）。 */
export const BUILTIN_BACK_SLOT = -2;
/** 默认背面（常量对象：渲染缓存按对象身份签名，预设只换颜色不换对象）。color 是兜底值；屏幕上的颜色归 stream-provider。 */
export const BUILTIN_BACK: Material = Object.freeze({ guid: BUILTIN_BACK_GUID, name: "默认背面", color: Object.freeze([0.604, 0.663, 0.741]) as unknown as [number, number, number] });
export const isBuiltinHandle = (m: number): boolean => m === BUILTIN_BACK_SLOT;
