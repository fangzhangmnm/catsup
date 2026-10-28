export interface TouchRead {
    walkX: number;
    walkY: number;
    dash: boolean;
    jump: boolean;
    crouch: boolean;
    crawl: boolean;
}
export interface TouchControlsOpts {
    /** 转头（弧度：水平 / 竖直；正 = 往右 / 往下看）。 */
    lookRad(dYaw: number, dPitch: number): void;
    editInPlace(): void;
    leave(): void;
}
export declare class TouchControls {
    private opts;
    readonly root: HTMLDivElement;
    private left;
    private right;
    private base;
    private knob;
    private stick;
    private look;
    private jumpHeld;
    private crouchOn;
    private crawlOn;
    private crouchBtn;
    private crawlBtn;
    constructor(host: HTMLElement, opts: TouchControlsOpts);
    /** 这台设备有触屏吗（只在有的时候露）。 */
    static available(): boolean;
    setVisible(on: boolean): void;
    /** 没按的时候摇杆待在哪（左半屏的左下，拇指自然落下的地方）。 */
    private home;
    /** 这一帧的输入（没在推 = 0；蹲是切换态）。 */
    read(): TouchRead;
    private drawStick;
}
