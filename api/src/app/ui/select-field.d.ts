export interface SelectItem {
    value: string;
    label: string;
    icon?: string;
    hint?: string;
    group?: string;
    disabled?: boolean;
}
export interface SelectFieldOpts {
    items: () => SelectItem[];
    /** 受控：当前值由消费者持有，钮面永远从它派生。 */
    value: () => string;
    onChange: (v: string) => void;
    align?: "start" | "end";
    ariaLabel?: string;
}
export interface SelectField {
    readonly el: HTMLElement;
    readonly value: string;
    /** 值在外面改了 → 重画钮面。 */
    refresh(): void;
    dispose(): void;
}
/** 把一个现成的按钮节点变成下拉（静态节点：index.html 里的 <button>）。 */
export declare function mountSelectField(el: HTMLElement, opts: SelectFieldOpts): SelectField;
/** 现建一个下拉按钮（工具选项条这种动态生成的场合）。 */
export declare function createSelectField(opts: SelectFieldOpts & {
    className?: string;
}): SelectField;
