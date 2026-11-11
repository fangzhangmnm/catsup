// paint/display-diag.ts —— 画的显示那条链在真机上自己查自己的两个开关（统筹 11-11，1-4d 第 6 条之后）。created 2026-11-11 by Claude Opus 5.5
// 都在读数角标那一组里（画画工作台工具条：读数开着才露），只在这一次打开里记，不进文件、不进设备。
// ① 走法 path：
//   auto    = 正式的路：薄层只报这一帧改到的格，内核只重合那些格，显示图只拷那些格、缩小图只重做那些格（自家的 2×2 平均）；
//   full    = 强制整张：同样的着色器，每帧整张合成、整张拷、整套缩小图——量「只做脏格」到底省了多少；
//   measure = 测量用：整张合成、整张拷、缩小图交给驱动（generateMipmap）= 改之前那条路——量「自家每级一趟」比驱动一次调用贵多少（user 问的会不会负优化）。
//             只为测量：远看的颜色可能和没画过的画（冷的合成图，缩小图是自家算法）差一点，角标上写明。正式的路永远不走它。
// ② 核对 check：开着的时候每隔 CHECK_EVERY 帧、以及每次抬笔之后，把正显示着的（内核那张合成图 + 显示图每一级）和「强制整张重合、整张重拷」逐字节比；
//   对不上 = 记进调试日志（哪张画、内核还是显示图、哪一级、哪一块、差了多少像素）+ 角标亮一下。核对的那一帧自己多花时间，角标上标出来、不算进读数。
//   给真机用：软件显卡上过了不等于 iPad 的显卡上过。
export type DisplayPath = "auto" | "full" | "measure";
export const DISPLAY_PATHS: readonly DisplayPath[] = ["auto", "full", "measure"];
export const DISPLAY_PATH_LABELS: Readonly<Record<DisplayPath, string>> = {
  auto: "自动（只做改到的格）",
  full: "强制整张",
  measure: "测量用（整张 + 驱动的缩小图）",
};
/** 显示图的缩小图怎么做（渲染器那边的名字）：每种走法对应一种。 */
export const MIPS_OF: Readonly<Record<DisplayPath, "region" | "full" | "driver">> = { auto: "region", full: "full", measure: "driver" };
/** 核对多少帧一次（另外每次抬笔之后一次）。 */
export const CHECK_EVERY = 30;

export const displayDiag = {
  path: "auto" as DisplayPath,
  check: false,
  /** 刚抬过笔（落层了）：下一次画完一帧核对一次。 */
  penUp: false,
};
