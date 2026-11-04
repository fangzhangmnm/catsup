/** 这个目标要不要浏览器自己的右键菜单：能打字的地方 + 标了 data-native-menu 的（含祖先）。 */
export declare function wantsNativeMenu(target: EventTarget | null): boolean;
/** 装上兜底；返回拆掉的函数（测试 / 热替换用）。重复装只生效一份。 */
export declare function installContextMenuGuard(target?: Window): () => void;
