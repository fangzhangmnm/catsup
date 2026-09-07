// vr-toast.ts —— VR 字幕位 toast：把 notice 的 {text, level} 烤成一张 canvas（UI 显示用途的 canvas 2D），render3 挂在头显相机下方。
// created 2026-09-07 by Claude Fable 5.1（user：「vr 里应该也能看到 toast 报错。可以考虑一下字幕位」「错误的时候 vr 不应跟卡死」）
// 与桌面 notice.ts 消费同一份 {text, level}（A5 抽包时模型/渲染分层的又一受益者）；零 three。

import type { NoticeLevel } from "./notice.ts";

export const TOAST_PX = { w: 1024, h: 176 } as const;
/** 面板世界尺寸（米）：挂在相机前 1.2 m、下 0.30 m 处约占视野下沿一条字幕 */
export const TOAST_M = { w: 0.9, h: 0.9 * (TOAST_PX.h / TOAST_PX.w) } as const;

const LEVEL_BG: Record<NoticeLevel, string> = { neutral: "rgba(40,40,40,0.82)", info: "rgba(30,60,100,0.85)", warning: "rgba(120,80,10,0.88)", error: "rgba(140,30,30,0.9)" };
const FONT = "40px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif";

/** 烤一张字幕（最多两行，超出截断加 …）。 */
export function bakeToast(text: string, level: NoticeLevel = "neutral"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TOAST_PX.w; c.height = TOAST_PX.h;
  const g = c.getContext("2d")!;
  const { w: W, h: H } = TOAST_PX;
  g.clearRect(0, 0, W, H);
  g.fillStyle = LEVEL_BG[level];
  const r = 28;
  g.beginPath(); g.moveTo(r, 0); g.lineTo(W - r, 0); g.quadraticCurveTo(W, 0, W, r); g.lineTo(W, H - r); g.quadraticCurveTo(W, H, W - r, H); g.lineTo(r, H); g.quadraticCurveTo(0, H, 0, H - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.font = FONT; g.textBaseline = "middle"; g.textAlign = "center";
  const lines = wrap(g, text, W - 80, 2);
  const lh = 52, y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((ln, i) => g.fillText(ln, W / 2, y0 + i * lh));
  return c;
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (g.measureText(cur + ch).width > maxW) {
      out.push(cur); cur = ch;
      if (out.length === maxLines) break;
    } else cur += ch;
  }
  if (out.length < maxLines && cur) out.push(cur);
  if (out.length === maxLines && (cur.length > 0 && !out.includes(cur) || g.measureText(text).width > maxW * maxLines)) {
    const last = out[maxLines - 1];
    out[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + "…";
  }
  return out;
}
