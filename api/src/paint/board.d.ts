import { PaintingWorkpiece, type PaintingData } from "./kernel/src/backend/workpiece/painting-workpiece.ts";
import type { Gl2Port, PooledFBO } from "./kernel/src/common/gl2-port.ts";
import type { StepSink } from "./kernel/src/backend/workpiece/undo-stack.ts";
export interface PaintBoardOpts {
    /** 内核的显卡接口（整个程序一个，建在渲染器的画面上）。 */
    readonly port: Gl2Port;
    readonly width: number;
    readonly height: number;
    /** 步的去处：不给 = 记录随手丢（1-3c）；1-8 给 HostedSteps。 */
    readonly undo?: StepSink;
    /** 有内容的行 / 列不砍时记一笔（调试日志）。 */
    readonly log?: (msg: string) => void;
}
export declare class PaintBoard {
    readonly wp: PaintingWorkpiece;
    private readonly gl;
    private readonly log;
    private bg;
    /** 合成出来的那张图（内核的，下一次合成之前有效）+ 合成它时的内容键。 */
    private last;
    /** 显示版本：每合成出一张新图加一（渲染器按它决定要不要重拷）。 */
    private shown;
    /** 显卡画面恢复了几次（进内容键：恢复后旧图作废、要重合成）。 */
    private restores;
    private disposed;
    constructor(o: PaintBoardOpts);
    get width(): number;
    get height(): number;
    /** 内容键：作品的提交版本（画、撤销、改大小都算）+ 大小 + 底色 + 恢复次数。变了 = 下一次合成出新图。 */
    private key;
    /** 合成时垫在最底下的不透明底色（材质自己的底色，sRGB 0..1）：交出来的图不透明。 */
    setBackground(rgb: readonly number[]): void;
    /** 灌一份内容（调试钩子用；以后读文件）。整份换：内核把栈清了（这一张本来没有栈）。 */
    load(data: PaintingData): void;
    /**
     * 跟着那一套贴图坐标的画布大小（裁定 ③）：要的比现在大 = 跟着长；要的比现在小 = 要砍的那几行 / 列全空白才砍，不然留着（记一笔）。
     * 返回改完的实际大小；kept = 有内容、没砍到要的大小。
     */
    follow(w: number, h: number): {
        width: number;
        height: number;
        kept: boolean;
    };
    /**
     * 合成（只合成、不上屏）：内容和底色没变 = 交上一次那张。返回的图归内核：下一次合成之前有效，不许归还、不许改采样设置。
     * 显卡画面丢了 = null。
     */
    compose(): {
        fbo: PooledFBO;
        version: number;
    } | null;
    dispose(): void;
    private tree;
    /** 所有图层内容的并（紧的）：null = 全空。 */
    private contentBounds;
    /** 改画布大小：和画画软件的裁剪同一批动词（每层换一份新尺寸的像素 + 树上的宽高），一个令牌。左上角不动，多出来的是空白。 */
    private resize;
    /** 作品的树 → 合成器吃的那棵（每叶带它现在的像素）。 */
    private docNodes;
}
