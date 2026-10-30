export interface PopupMenuItem<Id extends string = string> {
    id: Id;
    label: string;
    icon?: string;
    hint?: string;
    checked?: boolean;
    disabled?: boolean;
    separatorBefore?: boolean;
    /** 分区小标题（票 2，WeebPaint 范式「人话小标题分区」，不是子菜单）：渲染在本项之前。 */
    sectionBefore?: string;
    /** 属于哪个 tab（opts.tabs 给了才看；A30）。 */
    tab?: string;
    /** 下拉行（user 2026-10-25「线稿粗细，单位都做成下拉框，整个汉堡目录排查一下，能下拉框的就做，以及也许可以做成那种可以滚动可以点开的下拉框」）：
     *  一行 = label + 当前值 ▾；点开 = 旁边一层可滚动的单选（choice-layer.ts），选了 = onPick(那一项的 id)，层关、本菜单留着并刷新。 */
    choices?: {
        id: Id;
        label: string;
        hint?: string;
        checked?: boolean;
    }[];
    /** 行尾的当前值 ▾（下拉行）：给了 choices 时缺省 = 勾着那项的 label；只给 value 不给 choices = 点了照常 onPick(id)，层由消费者自己开（下拉多选）。 */
    value?: string;
    /** 纯文字说明（不可点；label = 正文；B43「新手提醒」）。 */
    note?: boolean;
    /** 子菜单（2026-10-27 Opus；user「新建能不能收到一个子菜单里面…需要把菜单的深模块做成支持子菜单的，还要防止跑到屏幕外面」）：
     *  这一行 = label + ›；点 / 鼠标悬停 = 旁边开一层（choice-layer.ts openSubmenu：先往右、放不下往左、太高自己滚）；点里面一项 = onPick(那一项的 id)，
     *  整个菜单关（返回 "keep" = 留着并刷新）。只一层：子项的 children 不看。 */
    children?: PopupMenuItem<Id>[];
}
/** 弹层顶部的 tab（A30，user 2026-10-24「汉堡菜单应该tab制度，和weebpaint一样」）：图标 + 字一排；只显示当前 tab 的项。 */
export interface PopupMenuTab {
    id: string;
    label: string;
    icon?: string;
}
export interface PopupMenuOpts<Id extends string = string> {
    anchor: HTMLElement;
    items: () => PopupMenuItem<Id>[];
    onPick: (id: Id) => void | "keep";
    align?: "start" | "end";
    tabs?: readonly PopupMenuTab[];
    /** 记住上次停在哪个 tab（同一个 key 共用；宿主接了 configureTabMemory 就由宿主记，CatsUp = 跟文件）。 */
    tabKey?: string;
    /** 这次打开直接停在这个 tab（别处的「XX 设置…」跳进来用；也记进 tabKey）。 */
    tab?: string;
    /** 这个菜单关掉了（任何原因：选了 / 外点 / Esc / 被别的菜单顶掉 / toggle）——调一次。参考窗库靠它清自己的菜单句柄和「再点一次删掉」（2026-10-25）。 */
    onClose?: () => void;
}
/** tab 记忆交给宿主（user 2026-10-25「两个汉堡能记住选的是哪个tab吗」「不是应该跟文件吗」）：CatsUp 接 Session = 跟着文件走（WeebPaint desk.menuTab 同款）；
 *  接了就只问宿主（换文件 = 换一套记忆，本模块不另留缓存）；没接 = 只记本次会话。 */
export interface TabMemory {
    get(key: string): string | null;
    set(key: string, tab: string): void;
}
export declare function configureTabMemory(s: TabMemory | null): void;
export interface PopupMenuHandle {
    readonly el: HTMLElement;
    close(): void;
    refresh(): void;
    isOpen(): boolean;
}
export declare function closePopupMenu(): void;
export declare function isPopupOpen(): boolean;
export declare function togglePopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle | null;
export declare function openPopupMenu<Id extends string>(opts: PopupMenuOpts<Id>): PopupMenuHandle;
/** 常驻面板（浮窗里用，ui/menu-window.ts）：和弹出菜单同一份身体，点了永远原地重画；不定位、不外点关、Esc 不关。 */
export interface MenuPanelHandle {
    refresh(): void;
    setTab(tab: string): void;
    dispose(): void;
}
export declare function mountMenuPanel<Id extends string>(host: HTMLElement, opts: Pick<PopupMenuOpts<Id>, "items" | "onPick" | "tabs" | "tabKey" | "tab">): MenuPanelHandle;
