// context-menu-guard.ts —— 浏览器右键菜单的统一兜底（user 10-30「然后没有右键的ui能不能统一拦截兜底一下右键，不要弹浏览器的右键，这个能深模块窄接口的统一拦截吗，而不是得一个一个写？」）。
// 一个口：installContextMenuGuard()，整个页面挂一个监听（window、冒泡阶段 = 排在所有元素自己的右键处理之后）。
// 规则：右键冒到最外层还没人处理（defaultPrevented = false）→ 拦掉浏览器那份；放行 = 能打字的地方（输入框 / 文本框 / 可编辑区：浏览器菜单里有粘贴、拼写）
// 和显式标了 data-native-menu 的元素（以后哪里要浏览器菜单就标它，不改这里）。各处自己的右键菜单（画布 / 层级行 / 吸附钮……）照旧在自己身上处理，这里不认识它们。
// created 2026-10-30 by Claude Opus 5.5

/** 这个目标要不要浏览器自己的右键菜单：能打字的地方 + 标了 data-native-menu 的（含祖先）。 */
export function wantsNativeMenu(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  if (el.closest("[data-native-menu]")) return true;
  const field = el.closest("input, textarea, [contenteditable]");
  if (!field) return false;
  if (field instanceof HTMLInputElement) return !["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image"].includes(field.type);
  if (field instanceof HTMLElement && field.hasAttribute("contenteditable")) return field.isContentEditable;
  return true;
}

/** 装上兜底；返回拆掉的函数（测试 / 热替换用）。重复装只生效一份。 */
export function installContextMenuGuard(target: Window = window): () => void {
  const w = target as Window & { __catsupContextGuard?: () => void };
  if (w.__catsupContextGuard) return w.__catsupContextGuard;
  const onMenu = (ev: MouseEvent): void => { if (!ev.defaultPrevented && !wantsNativeMenu(ev.target)) ev.preventDefault(); };
  target.addEventListener("contextmenu", onMenu);
  const off = (): void => { target.removeEventListener("contextmenu", onMenu); delete w.__catsupContextGuard; };
  w.__catsupContextGuard = off;
  return off;
}
