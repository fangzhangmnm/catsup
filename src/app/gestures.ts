// gestures.ts —— 指针路由：mouse / pen / touch 谁是「工具指针」、谁是「相机手势」。
// created 2026-09-06 by Claude Fable 5.1（user：「iPad as first class citizen」）
//
// 口径（抄 WeebPaint pointer-route.ts 的教义，改成 3D 相机版）：
//   mouse：左键=工具；中/右键拖=环绕，Shift+中/右=平移；滚轮=朝光标缩放。
//   pen  ：永远=工具（Apple Pencil 悬停=吸附预告）。见过 pen 的设备，手指永久降级为相机（手掌≡单指 touch，物理不可分）。
//   touch：单指=环绕；双指=平移+捏合缩放；双指轻点=撤销、三指轻点=重做（WeebPaint 同款）。
//          「手指画」开关打开且没见过 pen → 单指=工具，第二指落下即取消工具手势转相机。
//   pen 活动后 500ms 内的 touch 一律忽略（手掌落笔前后的误触）。
// Editor 只吃工具指针（pointerDown/Move/Up/Leave）；相机改动直接打 editor.cam 再 draw。

import type { Editor, ToolPointer } from "../editor/editor.ts";

type Role = "tool" | "orbit" | "pan" | "hold" | "multi";
interface Tracked { type: string; role: Role; x: number; y: number; downX: number; downY: number; downAt: number; }

export interface GestureOpts {
  fingerDraws(): boolean;
  onUndo(): void;
  onRedo(): void;
}

const PALM_GUARD_MS = 500;
const TAP_MS = 300;
const TAP_PX = 12;

export function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): { dispose(): void; penEverSeen(): boolean } {
  const pointers = new Map<number, Tracked>();
  let penEverSeen = false;
  let lastPenActivity = -Infinity;
  let multi: { cx: number; cy: number; d: number; maxCount: number; startAt: number; moved: number } | null = null;

  const local = (ev: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const tp = (ev: PointerEvent): ToolPointer => {
    const s = local(ev);
    return { x: s.x, y: s.y, clientX: ev.clientX, clientY: ev.clientY, pointerType: ev.pointerType, shiftKey: ev.shiftKey };
  };
  const touches = (): Tracked[] => [...pointers.values()].filter((p) => p.type === "touch");
  const toolPointerActive = (): boolean => [...pointers.values()].some((p) => p.role === "tool");

  function beginMulti(): void {
    const ts = touches();
    if (ts.length < 2) return;
    const [a, b] = ts;
    multi = {
      cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y),
      maxCount: Math.max(multi?.maxCount ?? 0, ts.length), startAt: multi?.startAt ?? performance.now(), moved: multi?.moved ?? 0,
    };
    for (const t of ts) t.role = "multi";
  }

  function onDown(ev: PointerEvent): void {
    const s = local(ev);
    canvas.setPointerCapture(ev.pointerId);
    const base: Tracked = { type: ev.pointerType, role: "hold", x: s.x, y: s.y, downX: s.x, downY: s.y, downAt: performance.now() };
    if (ev.pointerType === "mouse") {
      if (ev.button === 0) base.role = toolPointerActive() ? "hold" : "tool";
      else base.role = ev.shiftKey ? "pan" : "orbit";
      ev.preventDefault();
    } else if (ev.pointerType === "pen") {
      penEverSeen = true;
      lastPenActivity = performance.now();
      base.role = toolPointerActive() ? "hold" : "tool";
    } else {
      // touch
      if (performance.now() - lastPenActivity < PALM_GUARD_MS) base.role = "hold";
      else if (!penEverSeen && opts.fingerDraws() && touches().length === 0 && !toolPointerActive()) base.role = "tool";
      else base.role = "orbit";
    }
    pointers.set(ev.pointerId, base);
    if (ev.pointerType === "touch") {
      const ts = touches();
      if (ts.length >= 2) {
        // 第二指落下：工具手势让位给相机（手指画模式下画到一半也取消——SU iPad 同款）
        for (const t of ts) if (t.role === "tool") editor.cancel();
        beginMulti();
        return;
      }
    }
    if (base.role === "tool") editor.pointerDown(tp(ev));
  }

  function onMove(ev: PointerEvent): void {
    const t = pointers.get(ev.pointerId);
    const s = local(ev);
    if (!t) {
      // 悬停（mouse / Pencil hover）：吸附预告
      if (ev.pointerType !== "touch" && !toolPointerActive()) editor.pointerMove(tp(ev));
      return;
    }
    const dx = s.x - t.x, dy = s.y - t.y;
    t.x = s.x; t.y = s.y;
    if (ev.pointerType === "pen") lastPenActivity = performance.now();
    switch (t.role) {
      case "tool": editor.pointerMove(tp(ev)); return;
      case "orbit": editor.cam.orbit(dx, dy); editor.draw(); return;
      case "pan": editor.cam.pan(dx, dy, editor.vp()); editor.draw(); return;
      case "multi": {
        const ts = touches().filter((p) => p.role === "multi");
        if (ts.length < 2 || !multi) return;
        const [a, b] = ts;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y);
        multi.moved += Math.hypot(cx - multi.cx, cy - multi.cy) + Math.abs(d - multi.d);
        editor.cam.pan(cx - multi.cx, cy - multi.cy, editor.vp());
        if (d > 1 && multi.d > 1) editor.cam.zoomAt(multi.d / d, cx, cy, editor.vp());
        multi.cx = cx; multi.cy = cy; multi.d = d;
        editor.draw();
        return;
      }
      case "hold": return;
    }
  }

  function onUp(ev: PointerEvent, cancelled: boolean): void {
    const t = pointers.get(ev.pointerId);
    if (!t) return;
    pointers.delete(ev.pointerId);
    if (ev.pointerType === "pen") lastPenActivity = performance.now();
    if (t.role === "tool") {
      if (cancelled) editor.cancel(); else editor.pointerUp(tp(ev));
      return;
    }
    if (t.role === "multi") {
      const rest = touches();
      if (rest.length === 0 && multi) {
        // 多指轻点：两指=撤销、三指=重做（短、几乎没动）
        const dur = performance.now() - multi.startAt;
        if (dur < TAP_MS && multi.moved < TAP_PX) {
          if (multi.maxCount === 2) opts.onUndo();
          else if (multi.maxCount >= 3) opts.onRedo();
        }
        multi = null;
      } else if (rest.length === 1) {
        rest[0].role = "hold";   // 剩下的那根手指不接管为环绕（防抬手瞬间视角跳）
        multi = null;
      } else {
        beginMulti();
      }
      return;
    }
    if (t.role === "orbit" && ev.pointerType === "touch" && !cancelled) {
      // 单指轻点（没动）：当作「取消/收笔」——iPad 上 Esc 的替身
      if (performance.now() - t.downAt < TAP_MS && Math.hypot(t.x - t.downX, t.y - t.downY) < TAP_PX) editor.cancel();
    }
  }

  const onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    const s = { x: ev.clientX - canvas.getBoundingClientRect().left, y: ev.clientY - canvas.getBoundingClientRect().top };
    editor.cam.zoomAt(ev.deltaY > 0 ? 1.1 : 1 / 1.1, s.x, s.y, editor.vp());
    editor.draw();
  };
  const onLeave = (): void => { if (!toolPointerActive()) editor.pointerLeave(); };
  const onCtx = (e: Event): void => e.preventDefault();
  const up = (ev: PointerEvent): void => onUp(ev, false);
  const cancel = (ev: PointerEvent): void => onUp(ev, true);

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onCtx);
  return {
    penEverSeen: () => penEverSeen,
    dispose() {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onCtx);
    },
  };
}
