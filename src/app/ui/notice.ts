// notice.ts —— 通知面最小替身：toast/横幅只有一条栈（#noticeStack）、同 id 原地更新、可带动作按钮。
// 签名照抄 WeebPaint src/ui/notice.ts 的消费者面；实现是 CatsUp 自己的——等 @internal/ui 包立户后换 import。
// created 2026-09-06 by Claude Fable 5.1

export type NoticeLevel = "neutral" | "info" | "warning" | "error";
export interface NoticeAction { label: string; onClick: () => void; primary?: boolean }
export interface NoticeOpts {
  id?: string;
  text: string;
  level?: NoticeLevel;
  actions?: NoticeAction[];
  /** 自动消失毫秒；null = 常驻（默认：有 actions 或 error/warning 常驻，否则 3500）。 */
  timeoutMs?: number | null;
}
export interface NoticeHandle { readonly id: string; close(): void; isOpen(): boolean }

const _live = new Map<string, { el: HTMLElement; timer: number | null }>();
let _seq = 0;

function stack(): HTMLElement {
  let s = document.getElementById("noticeStack");
  if (!s) {
    s = document.createElement("div");
    s.id = "noticeStack";
    document.body.appendChild(s);
  }
  return s;
}

export function showNotice(opts: NoticeOpts): NoticeHandle {
  const id = opts.id ?? `n${++_seq}`;
  const level = opts.level ?? "neutral";
  const prev = _live.get(id);
  if (prev?.timer) clearTimeout(prev.timer);
  const el = prev?.el ?? document.createElement("div");
  el.className = `toast toast-${level}`;
  el.setAttribute("role", level === "error" ? "alert" : "status");
  el.textContent = "";
  const txt = document.createElement("span");
  txt.className = "toast-text";
  txt.textContent = opts.text;
  el.appendChild(txt);
  const close = (): void => {
    const cur = _live.get(id);
    if (!cur) return;
    if (cur.timer) clearTimeout(cur.timer);
    cur.el.remove();
    _live.delete(id);
  };
  if (opts.actions?.length) {
    const row = document.createElement("span");
    row.className = "toast-actions";
    for (const a of opts.actions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = a.primary ? "toast-btn primary" : "toast-btn";
      b.textContent = a.label;
      b.addEventListener("click", () => { a.onClick(); close(); });
      row.appendChild(b);
    }
    el.appendChild(row);
  }
  const x = document.createElement("button");
  x.type = "button";
  x.className = "toast-x";
  x.setAttribute("aria-label", "关闭");
  x.textContent = "×";
  x.addEventListener("click", close);
  el.appendChild(x);
  if (!prev) stack().appendChild(el);
  const sticky = opts.timeoutMs === null || (opts.timeoutMs === undefined && (!!opts.actions?.length || level === "error" || level === "warning"));
  const timer = sticky ? null : window.setTimeout(close, opts.timeoutMs ?? 3500);
  _live.set(id, { el, timer });
  return { id, close, isOpen: () => _live.has(id) };
}

export function closeNotice(id: string): void {
  const cur = _live.get(id);
  if (!cur) return;
  if (cur.timer) clearTimeout(cur.timer);
  cur.el.remove();
  _live.delete(id);
}
