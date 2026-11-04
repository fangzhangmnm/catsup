import { type PoolRef, type Scene } from "../scene/scene.ts";
import type { MirrorMovesResult } from "../mesh/mirror.ts";
import type { Op } from "./ops.ts";
/** 撞上锁时提示行说的那一句（提交 / 预演 / 开镜像会话 / 改实例同一句）。 */
export declare const LOCKED_HINT = "\u5DF2\u9501\u5B9A\uFF1A\u89E3\u9501\u540E\u518D\u6539\uFF08\u9009\u4E2D\u5B83 \u2192 \u89E3\u9501\uFF09";
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
/** 落到中缝的点和孪生点并成一个的那条 op（镜像挪点；提交和预演同一条）。 */
export declare const mergeOp: (def: number, mg: MirrorMovesResult["merges"][number]) => Op;
/** 这条 op 带的方向（addEdges / pushpull；批 = 第一条带的）。数值小窗重画复用它，不按当下相机重算（计划书 §12 C2）。 */
export declare function frontOf(op: Op): {
    x: number;
    y: number;
    z: number;
} | undefined;
/**
 * 这条 op 改得到的只有这个池吗。影子场景只把活动池的内核换成影子，别的池和真身共享：改到外面去 = 预演写了真身，所以这里是硬门（Editor.previewApply 不过就抛）。
 * 白名单：池级几何 op（at 必须写明、就是这个池；缺 at 的语义是根池）+ 网格体 op（def 就是这个池的定义）。别的 op 一律不许进预演（子池 / 实例的整体变换走叠加变换）。
 */
export declare function previewableIn(op: Op, pool: PoolRef): boolean;
/** 预演和提交唯一的差别：推拉落地不湮灭（kernel.pushPull settleLanding，推平到底时压扁态还看得见、还吸得到；提交才湮灭）。别的差别不许加在这里以外。 */
export declare function previewVariant(op: Op): Op;
