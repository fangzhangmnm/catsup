export interface HudItem {
    id: string;
    label: string;
    icon?: string;
    key?: string;
    active?: boolean;
    disabled?: boolean;
    danger?: boolean;
    hidden?: boolean;
}
export interface HudModel {
    /** 工具（id = Tool）。 */
    tools(): HudItem[];
    /** 编辑动作：撤销 / 重做 / 删除。 */
    edits(): HudItem[];
    /** VR 专属动作：穿墙飞行 / 回出生点 / 退出 VR。 */
    vr(): HudItem[];
    /** 状态行（RPG 对话框）。 */
    status(): string;
    version: string;
    /** 点了某项（任何渲染器）。 */
    pick(id: string): void;
}
