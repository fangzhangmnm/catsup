// app/primary-button.ts —— 上方正中那一颗主按钮（施工单十五第三节；版图文档 ai-docs/20261024-ui-layout.md 2026-11-11 追记）。created 2026-11-11 by Claude Opus 5.5
// user 11-11：「开始画这个按钮藏在马后炮了，马后炮是高级配置，而不是核心工作流步骤。还是按照我说的，需要有一个挂在上面居中按钮，点了弹窗。」
// 一张表按先后只露第一个条件成立的那一行（最多一颗）。加一种主按钮 = 表里加一行（什么时候露、字、做什么、醒目还是低调、改不改模型），不另找位置。
// 改模型的那几行按下去先问输入闸（held = inputGate.held()）：锁着 / 正在问 = 提示行说为什么，不做；按钮本身锁着时灰掉（styles.css body.doc-locked）。
// 这里不另写锁的判断。

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

export function mountPrimaryButton(bar: HTMLElement, btn: HTMLButtonElement, rows: readonly PrimaryRow[], held: () => { readonly why: string } | null, hint: (text: string) => void): PrimaryButton {
  let cur: PrimaryRow | null = null;
  const sync = (): void => {
    cur = rows.find((r) => r.when()) ?? null;
    bar.hidden = !cur;
    if (!cur) return;
    btn.textContent = cur.label();
    btn.toggleAttribute("data-loud", cur.loud);
    btn.toggleAttribute("data-edits", cur.edits);
  };
  btn.addEventListener("click", () => {
    const r = cur;
    if (!r) return;
    if (r.edits) { const h = held(); if (h) { hint(h.why); return; } }   // 和别的改动走同一道门
    r.press();
    sync();
  });
  return {
    sync,
    current: () => cur?.id ?? null,
    flash(id) {
      if (cur?.id !== id) return;
      btn.classList.remove("flash"); void btn.offsetWidth; btn.classList.add("flash");
      setTimeout(() => btn.classList.remove("flash"), 1300);
    },
  };
}
