// paint/paint-limit.ts —— 画画路径上撞到容量上限时抛的那种错（贴图主线 1-4c，统筹 11-11：每个上限「抛并给人话」）。created 2026-11-11 by Claude Opus 5.5
// message = 给开发看的（英文，带数字）；say = 提示行上给人看的那一句（中文，说清画不了什么、怎么办）。界面只显示 say，不显示 message。
// 各个上限是多少、到了会怎样：ai-docs/20261111-paint-workorders-14.md 1-4c 施工记录的「容量清单」。

export class PaintLimitError extends Error {
  readonly say: string;
  constructor(message: string, say: string) { super(message); this.name = "PaintLimitError"; this.say = say; }
}
/** 文件锁着（演示锁），画画这一层自己拦下来（统筹 11-11，v0.19.48：开一笔、落层、整份换内容都问一次）。say = 输入闸上那条锁的理由（和编辑器说同一句）。 */
export class PaintLockedError extends PaintLimitError {
  constructor(message: string, say: string) { super(message, say); this.name = "PaintLockedError"; }
}

