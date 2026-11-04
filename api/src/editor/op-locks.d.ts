import type { Scene } from "../scene/scene.ts";
import type { Op } from "./ops.ts";
/** 目标池在锁住的 group 里 / 整体动・删・炸一个锁住的子项 / 当前上下文在锁住的实例里面。setLocked 本身豁免（解锁要能做）。 */
export declare function opTouchesLocked(s: Scene, op: Op, contextLocked: () => boolean): boolean;
/**
 * 造面的窄意图（计划书 §9.2½ ③）：画线 / 推拉的 op 带一个方向 front（池本地坐标），邻面给不出朝向时，这个方向那侧 = 正面。相机不进内核、不进 op：这里算成方向写进去，重放确定。
 * viewAt(p) = 从池本地的点 p 望向视线原点的方向（池本地；编辑器按 PointerFrame.viewDir 算，桌面 / VR 同一条）。批 = 里面每条都带。复现包 / 修复指令不走这里 = 不带。
 */
export declare function withFront(op: Op, viewAt: (p: {
    x: number;
    y: number;
    z: number;
}) => {
    x: number;
    y: number;
    z: number;
}): Op;
