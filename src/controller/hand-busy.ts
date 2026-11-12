// controller/hand-busy.ts —— 「手上还有没有一下没收」：一张名册，每个来源声明自己现在有没有一下没收（按着的笔、拖到一半的工具……）。created 2026-11-11 by Claude Opus 5.5
// 统筹 11-11：会话判断「空闲、可以自动保存 / 崩溃快照」以前只问编辑器的手势（editor.isGestureActive()），没有一处把「手上还有一下没收」的来源点名。
//   更正（同日，真的笔事件量过）：真的笔 / 鼠标画一笔时，画画工作台的工具手柄（editor/modes/paint.ts）算编辑器的手势，旧的问法在真路径上本来就挡得住；
//   挡不住的只是绕开编辑器、直接调画画控制器的那条路（调试钩子 __catsup.paint.workbench.pointer）。名册把来源点了名，两条路都挡住，以后加来源只加一行。
// 照输入闸（input-gate.ts）的做法：声明式，每次现问，手里没有「开了 / 关了」的账——漏一次释放不会让存盘永远停下。
// 加一种来源（草稿笔、雕刻笔刷……）= HAND_SOURCES 加一个名字 + 宿主登记一行（test/hand-busy.test.ts 点名，少一行 = 红），不去问的人那里补 if。
// 无头（src/controller/ 的规矩）：不认识编辑器、画画、DOM。

/** 名册上该有的来源。宿主（app/main.ts）每个都要登记一行。 */
export const HAND_SOURCES = ["editor.gesture", "paint.stroke"] as const;
export type HandSource = (typeof HAND_SOURCES)[number];

export interface HandEntry {
  readonly source: HandSource;
  /** 现在有没有一下没收。每次都现问，所以不会过期。 */
  busy(): boolean;
}

export interface HandRoster {
  /** 进名册，返回退名册。同一个来源登记两次 = 抛（宿主接线写重了）。 */
  add(e: HandEntry): () => void;
  /** 手上还有没有一下没收：任何一个来源说有 = 有。 */
  busy(): boolean;
  /** 现在是哪个来源没收（排在前面的那个；给黑匣子 / 探针）；都收了 = null。 */
  which(): HandSource | null;
  /** 登记了的来源（守卫 / 探针用）。 */
  sources(): readonly HandSource[];
}

export function createHandRoster(): HandRoster {
  const entries: HandEntry[] = [];
  return {
    add(e) {
      if (entries.some((x) => x.source === e.source)) throw new Error(`hand roster: source "${e.source}" registered twice`);
      entries.push(e);
      return () => { const i = entries.indexOf(e); if (i >= 0) entries.splice(i, 1); };
    },
    busy: () => entries.some((e) => e.busy()),
    which: () => entries.find((e) => e.busy())?.source ?? null,
    sources: () => entries.map((e) => e.source),
  };
}
