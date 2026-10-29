// share-or-download.ts —— 把一个文件交给用户：触屏设备走系统分享，电脑一律直接下载。created 2026-10-29 by Claude Opus 5.5
// user 10-27「黑匣子的分享windows下面应该是下载，windows的分享就是个流氓软件」（家族周账 F-111）→ 10-29「Windows 上调试日志的「分享」改成「下载」。 做做做」。
// 为什么不是「有 navigator.share 就分享」：Windows 上的 Edge / Chrome 也有 Web Share，会弹 Windows 的分享面板，user 不要。
// 判法：iPhone / iPad（含伪装成 Mac 的 iPadOS）/ 安卓 = 分享；别的（Windows、Mac、Linux 桌面）= 下载。分享被系统拒 = 退回下载（日志 / 复现包不丢）。
export function preferShare(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  const ua = navigator.userAgent ?? "";
  if (/Windows/i.test(ua)) return false;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;   // iPadOS 桌面模式自称 Mac
}
export function downloadFile(f: File): void {
  const url = URL.createObjectURL(f), a = document.createElement("a");
  a.href = url; a.download = f.name; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
/** 交文件：触屏 = 分享（取消 = 什么都不做；被拒 = 改下载），电脑 = 下载。say = 状态行回执。 */
export async function deliverFile(f: File, title: string, say: (text: string) => void): Promise<void> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (preferShare() && nav.canShare?.({ files: [f] })) {
    try { await navigator.share({ title, files: [f] }); say(`已分享 ${f.name}`); return; }
    catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      downloadFile(f);
      say(`分享不行（系统说：${e instanceof Error ? e.message : String(e)}），改成下载了：${f.name}`);
      return;
    }
  }
  downloadFile(f);
  say(`已下载 ${f.name}`);
}
