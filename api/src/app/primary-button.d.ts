export interface PrimaryRow {
    readonly id: string;
    /** 醒目（实底主色）还是低调（半灰字，「进入 VR」那种）。 */
    readonly loud: boolean;
    /** 会不会改模型（会 = 按下去先问输入闸）。 */
    readonly edits: boolean;
    when(): boolean;
    label(): string;
    press(): void;
}
export interface PrimaryButton {
    /** 按现在的情况重挑一行（工具 / 选区 / 场景 / 步行变了都调）。 */
    sync(): void;
    /** 现在露的是哪一行（没有 = null）。 */
    current(): string | null;
    /** 这一行正露着就闪一下（没画过的物件上落笔时：「按这里」）。 */
    flash(id: string): void;
}
export declare function mountPrimaryButton(bar: HTMLElement, btn: HTMLButtonElement, rows: readonly PrimaryRow[], held: () => {
    readonly why: string;
} | null, hint: (text: string) => void): PrimaryButton;
