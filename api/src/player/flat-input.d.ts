import { type HeadFrame, type InputFrame } from "./input.ts";
import type { Ray } from "./world-query.ts";
export declare class FlatInput {
    private down;
    private edges;
    private _enabled;
    private dblJump;
    private crawlOn;
    private crouchOn;
    private onKeyDown;
    private onKeyUp;
    private onBlur;
    /** 关掉 = 也起来（下次进来站着）。 */
    private reset;
    attach(): void;
    detach(): void;
    /** 关闭时不吞任何键（轨道模式下 WASD 等照旧不被截）。pause = 原地编辑（时间暂停）：按着的键清掉，蹲 / 趴两个开关留着（接着走时还是那个姿势）。 */
    setEnabled(on: boolean, pause?: boolean): void;
    isDown(code: string): boolean;
    /** 产本帧输入；head/aim 由调用方给（flat：头 = (0,0,眼高)+俯仰前向；aim = 相机过光标射线）。 */
    read(head: HeadFrame, aim: Ray | null, now?: number): InputFrame;
}
