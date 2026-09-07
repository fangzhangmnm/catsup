// wrist-panel.ts —— VR 手腕面板：把 HudModel 烤成一张 canvas 纹理（UI 显示用途的 canvas 2D，不是字节进出）+ 格子命中。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；user：「手腕菜单是 phase 1。缺了这个 vr 没法用」）
//
// 布局（512×520 px → 0.16×0.1625 m，挂非惯用手手背）：状态行两行 → 工具 3×2 → 撤销/重做/删除 → VR 动作一行 → 版本角标。
// 图标 = 从页面内联 sprite 的 <symbol> 序列化成独立 svg 再 Image 化（同一份共享图标库，零第二套图）。字体 = 系统 CJK（Quest 浏览器
// 有没有中文字体待真机核实——缺了会画成豆腐块，这是 user 待验项）。

import type { HudItem, HudModel } from "./hud-model.ts";

export const WRIST_PX = { w: 512, h: 520 } as const;
export const WRIST_M = { w: 0.16, h: 0.1625 } as const;

interface Cell { id: string; x: number; y: number; w: number; h: number; item: HudItem; }

const iconCache = new Map<string, HTMLImageElement | null>();
/** <symbol id> → 独立 svg Image（currentColor → 具体色）。加载完成回调 onReady。 */
function iconImage(name: string, color: string, onReady: () => void): HTMLImageElement | null {
  const key = `${name}|${color}`;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const sym = document.getElementById(name);
  if (!sym || sym.tagName.toLowerCase() !== "symbol") { iconCache.set(key, null); return null; }
  const attrs = ["viewBox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"]
    .map((a) => { const v = sym.getAttribute(a); return v ? `${a}="${v.replace(/currentColor/g, color)}"` : ""; }).join(" ");
  const inner = sym.innerHTML.replace(/currentColor/g, color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs} width="64" height="64">${inner}</svg>`;
  const img = new Image();
  img.onload = onReady;
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  iconCache.set(key, img);
  return img;
}

export class WristPanel {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: Cell[] = [];
  private hover: string | null = null;
  private pressed: string | null = null;
  dirty = true;
  private model: HudModel;

  constructor(model: HudModel) {
    this.model = model;
    this.canvas = document.createElement("canvas");
    this.canvas.width = WRIST_PX.w; this.canvas.height = WRIST_PX.h;
    this.ctx = this.canvas.getContext("2d")!;
  }

  setHover(id: string | null): void { if (id !== this.hover) { this.hover = id; this.dirty = true; } }
  setPressed(id: string | null): void { if (id !== this.pressed) { this.pressed = id; this.dirty = true; } }
  hovered(): string | null { return this.hover; }

  /** 面板 uv（0..1，v 从上往下）→ 格子 id。 */
  hit(u: number, v: number): string | null {
    const x = u * WRIST_PX.w, y = v * WRIST_PX.h;
    for (const c of this.cells) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h && !c.item.disabled) return c.id;
    return null;
  }

  /** 重画（dirty 时）；返回是否画了。 */
  redraw(force = false): boolean {
    if (!this.dirty && !force) return false;
    this.dirty = false;
    const g = this.ctx, W = WRIST_PX.w, H = WRIST_PX.h;
    const onIcon = (): void => { this.dirty = true; };
    g.clearRect(0, 0, W, H);
    // 底板
    g.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(g, 0, 0, W, H, 28); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 3; roundRect(g, 1.5, 1.5, W - 3, H - 3, 27); g.stroke();
    this.cells = [];
    let y = 18;
    // 状态行（两行截断）
    g.fillStyle = "#4a4a4a"; g.font = "22px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif"; g.textBaseline = "top";
    const lines = wrap(g, this.model.status(), W - 40, 2);
    for (const ln of lines) { g.fillText(ln, 20, y); y += 28; }
    y = Math.max(y, 18 + 2 * 28) + 10;
    // 工具 3×2
    const tools = this.model.tools().filter((t) => !t.hidden);
    const cw = (W - 40 - 2 * 10) / 3, ch = 96;
    tools.forEach((t, i) => {
      const cx = 20 + (i % 3) * (cw + 10), cy = y + Math.floor(i / 3) * (ch + 10);
      this.cell(t, cx, cy, cw, ch, onIcon, true);
    });
    y += Math.ceil(tools.length / 3) * (ch + 10) + 8;
    // 编辑动作一行
    const edits = this.model.edits().filter((t) => !t.hidden);
    const ew = (W - 40 - (edits.length - 1) * 10) / Math.max(1, edits.length), eh = 72;
    edits.forEach((t, i) => this.cell(t, 20 + i * (ew + 10), y, ew, eh, onIcon, false));
    y += eh + 18;
    // VR 动作一行
    const vr = this.model.vr().filter((t) => !t.hidden);
    const vw = (W - 40 - (vr.length - 1) * 10) / Math.max(1, vr.length), vh = 72;
    vr.forEach((t, i) => this.cell(t, 20 + i * (vw + 10), y, vw, vh, onIcon, false));
    y += vh + 12;
    // 版本角标
    g.fillStyle = "#8a8780"; g.font = "18px system-ui, sans-serif"; g.textAlign = "right";
    g.fillText(this.model.version, W - 20, H - 30);
    g.textAlign = "left";
    return true;
  }

  private cell(item: HudItem, x: number, y: number, w: number, h: number, onIcon: () => void, big: boolean): void {
    const g = this.ctx;
    this.cells.push({ id: item.id, x, y, w, h, item });
    const isHover = this.hover === item.id, isPressed = this.pressed === item.id;
    g.fillStyle = item.disabled ? "rgba(0,0,0,0.03)" : item.active ? "#2b6cb0" : isPressed ? "#cfe0f5" : isHover ? "rgba(43,108,176,0.16)" : "rgba(0,0,0,0.05)";
    roundRect(g, x, y, w, h, 14); g.fill();
    if (isHover && !item.disabled) { g.strokeStyle = "#2b6cb0"; g.lineWidth = 3; roundRect(g, x + 1.5, y + 1.5, w - 3, h - 3, 13); g.stroke(); }
    const ink = item.disabled ? "#b0aca4" : item.active ? "#ffffff" : item.danger ? "#c0392b" : "#2a2a2a";
    const iconSize = big ? 40 : 30;
    let labelY = y + h / 2;
    if (item.icon) {
      const img = iconImage(item.icon, ink, onIcon);
      const ix = x + w / 2 - iconSize / 2, iy = big ? y + 12 : y + h / 2 - iconSize / 2 - (big ? 0 : 12);
      if (img && img.complete && img.naturalWidth > 0) g.drawImage(img, ix, iy, iconSize, iconSize);
      labelY = big ? y + 12 + iconSize + 20 : y + h / 2 + 22;
    }
    g.fillStyle = ink;
    g.font = `${big ? 22 : 20}px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(item.label, x + w / 2, labelY);
    g.textAlign = "left"; g.textBaseline = "top";
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (g.measureText(cur + ch).width > maxW) {
      out.push(cur); cur = ch;
      if (out.length === maxLines) { out[maxLines - 1] = out[maxLines - 1].slice(0, -1) + "…"; return out; }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
