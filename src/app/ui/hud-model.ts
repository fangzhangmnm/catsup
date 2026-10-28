// hud-model.ts —— HUD 的数据驱动模型：桌面 DOM 工具栏 与 VR 手腕面板 消费**同一份**（A13 第 6 条：同模型两渲染器）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
// 只描述「有哪些项、当前态、点了怎么办」，零 DOM、零 three；渲染器各自画。

export interface HudItem {
  id: string;
  label: string;
  icon?: string;          // 共享图标库 symbol id
  key?: string;           // 桌面快捷键提示
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
  /** 右键菜单里收进哪个子菜单（label = 子菜单那一行的字；item = 这一项在子菜单里的字）。同名的几项并成一行，摆在第一项的位置；浮条 / VR 手腕面板照旧平铺、用 label。2026-10-27 Opus（user「新建能不能收到一个子菜单里面」）。 */
  submenu?: { label: string; item: string };
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
