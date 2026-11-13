// app/ui/press-pulse.ts —— 判到重按时笔尖那里闪一圈（笔的设计稿第二节第 5 条；user 10-24「按下需要有笔尖的视觉反馈」）。created 2026-11-13 by Claude Opus 5.5
// 一个圈从点下的地方往外扩一下、淡掉（CSS .press-pulse，styles.css），完了自己拆掉；不挡输入（pointer-events: none）。谁该闪由 main.ts 按 stance.ts penPressOf 定。
/** 在屏幕上这一点（client 坐标）闪一圈。 */
export function pressPulse(clientX: number, clientY: number): void {
  const el = document.createElement("div");
  el.className = "press-pulse";
  el.style.left = `${clientX}px`; el.style.top = `${clientY}px`;
  const drop = (): void => el.remove();
  el.addEventListener("animationend", drop, { once: true });
  setTimeout(drop, 1000);   // 动画关着（少动画设置）或者 animationend 没来：照样拆
  document.body.appendChild(el);
}
