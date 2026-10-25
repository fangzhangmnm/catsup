export interface ChoiceOption {
    id: string;
    label: string;
    group?: string;
    hint?: string;
}
export interface ChoiceLayerHandle {
    readonly el: HTMLElement;
    readonly anchor: HTMLElement;
    close(): void;
    isOpen(): boolean;
}
export declare function closeChoiceLayer(): void;
/** 有层开着（上层菜单的 Esc 先收这一层）。 */
export declare function choiceLayerOpen(): boolean;
/** 这一行开着的层（再点同一行 = 收起用）。 */
export declare function choiceLayerOn(anchor: HTMLElement): boolean;
/** 钮面摘要：前 max 个名字用「、」连，多了写「等 N 项」；一个没勾 = empty。 */
export declare function multiSummary(labels: readonly string[], empty?: string, max?: number): string;
export interface MultiSelectOpts {
    anchor: HTMLElement;
    options: () => ChoiceOption[];
    /** 受控：勾了哪些由消费者持有。 */
    values: () => readonly string[];
    onToggle: (id: string) => void;
    onClear?: () => void;
    clearLabel?: string;
    ariaLabel?: string;
}
export declare function openMultiSelect(o: MultiSelectOpts): ChoiceLayerHandle;
export interface SingleSelectOpts {
    anchor: HTMLElement;
    options: () => ChoiceOption[];
    /** 受控：当前值由消费者持有。 */
    value: () => string | undefined;
    onPick: (id: string) => void;
    ariaLabel?: string;
}
export declare function openSingleSelect(o: SingleSelectOpts): ChoiceLayerHandle;
