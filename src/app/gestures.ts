// gestures.ts —— 指针路由：mouse / pen / touch 谁是「工具指针」、谁是「相机手势」。
// created 2026-09-06 by Claude Fable 5.1（user：「iPad as first class citizen」）；同日按 WeebPaint input.ts 的坑重写多指 tap（user：「undo redo 的手势，这个参考 weebpaint 的坑」）
//
// 口径（抄 WeebPaint pointer-route.ts 的教义，改成 3D 相机版）：
//   mouse：左键=工具；中/右键拖=环绕，Shift+中/右=平移；滚轮=朝光标缩放。
//   pen  ：永远=工具（Apple Pencil 悬停=吸附预告）。见过 pen 的设备，手指永久降级为相机（手掌≡单指 touch，物理不可分）。
//   touch：单指=环绕；双指=平移+捏合缩放；双指轻点=撤销、三指轻点=重做（Procreate 方言，WeebPaint 同款）。
//          「手指画」开关打开且没见过 pen → 单指=工具，第二指落下即取消工具手势转相机。
//
// 多指 tap 的四个坑（WeebPaint input.ts 血泪，逐条照抄）：
//   ① tap 时长从**最早**参与触点落下算（掌根久搁 = 慢 tap = 超限剔除；从第二指到来算会漏掉）。
//   ② 位移门按**每根手指**离各自起点算（16px），不是质心——捏一下再松开不是 tap。
//   ③ 掌触门：笔尖活动（落/移/抬）后 600ms 内的多指 tap 一律视作手掌闪灭，吞掉不撤销；只挡 tap，pinch/pan 不动。
//   ④ 幽灵指针：iOS 偶尔丢 pointerup → 卡在 map 里把单指误判成双指。pen 落下 = 权威信号，清空全部 touch；
//      任何 down 前清掉 8s 没动静的 touch。
// Editor 只吃工具指针（pointerDown/Move/Up/Leave）；相机改动直接打 editor.cam 再 draw。

import type { Editor, ToolPointer } from "../editor/editor.ts";

type Role = "tool" | "orbit" | "pan" | "hold" | "multi";
interface Tracked { type: string; role: Role; x: number; y: number; downX: number; downY: number; downAt: number; lastAt: number; }
interface GestureTap { firstDownTime: number; isTap: boolean; maxCount: number; start: Map<number, { x: number; y: number }>; }

export interface GestureOpts {
  fingerDraws(): boolean;
  onUndo(): void;
  onRedo(): void;
  /** 步行模式：环绕/平移手势改成视角（返回 true = 已消费）。2026-09-07 VR 纪元 */
  look?(dxPx: number, dyPx: number): boolean;
  /** 步行模式中滚轮无意义（相机每帧由 player 写）。 */
  walking?(): boolean;
  /** 工具停摆（teleport 充能中）：不喂工具指针事件、悬停预告清掉（VR 同款，vr.ts）。 */
  toolBlocked?(): boolean;
}

const GESTURE_TAP_MAX_MS = 250;
const GESTURE_TAP_MAX_MOVE = 16;
const PALM_PEN_GUARD_MS = 600;
const STALE_TOUCH_MS = 8000;
const SINGLE_TAP_MS = 250;

export function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): { dispose(): void; penEverSeen(): boolean } {
  const pointers = new Map<number, Tracked>();
  let penEverSeen = false;
  let lastPenActivity = -Infinity;
  let multi: { cx: number; cy: number; d: number } | null = null;
  let tap: GestureTap | null = null;

  const local = (ev: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const tp = (ev: PointerEvent): ToolPointer => {
    const s = local(ev);
    return { x: s.x, y: s.y, clientX: ev.clientX, clientY: ev.clientY, pointerType: ev.pointerType, armable: ev.pointerType === "mouse", shiftKey: ev.shiftKey };
  };
  const touches = (): [number, Tracked][] => [...pointers.entries()].filter(([, p]) => p.type === "touch");
  const toolPointerActive = (): boolean => [...pointers.values()].some((p) => p.role === "tool");

  function purgeTouches(all: boolean): void {
    const now = performance.now();
    for (const [id, p] of touches()) {
      if (all || now - p.lastAt > STALE_TOUCH_MS) pointers.delete(id);
    }
    if (touches().length < 2) multi = null;
    if (touches().length === 0) tap = null;
  }

  /** ≥2 指落定：重锚质心/指距；tap 记录只在首次建立（最早触点时刻、各指起点、峰值指数）。 */
  function beginMulti(): void {
    const ts = touches();
    if (ts.length < 2) return;
    const [[, a], [, b]] = ts;
    multi = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    if (!tap) tap = { firstDownTime: Math.min(...ts.map(([, t]) => t.downAt)), isTap: true, maxCount: 0, start: new Map() };
    tap.maxCount = Math.max(tap.maxCount, ts.length);
    for (const [id, t] of ts) { if (!tap.start.has(id)) tap.start.set(id, { x: t.downX, y: t.downY }); t.role = "multi"; }
  }

  function onDown(ev: PointerEvent): void {
    const s = local(ev);
    try { canvas.setPointerCapture(ev.pointerId); } catch { /* 合成事件/已释放的指针会抛 InvalidState，不许把 down 整个打断 */ }
    const now = performance.now();
    purgeTouches(ev.pointerType === "pen");   // ④ 幽灵清理：pen 落下清全部 touch；否则只清 stale
    const base: Tracked = { type: ev.pointerType, role: "hold", x: s.x, y: s.y, downX: s.x, downY: s.y, downAt: now, lastAt: now };
    if (ev.pointerType === "mouse") {
      if (ev.button === 0) base.role = toolPointerActive() ? "hold" : "tool";
      else base.role = ev.shiftKey ? "pan" : "orbit";
      ev.preventDefault();
    } else if (ev.pointerType === "pen") {
      penEverSeen = true;
      lastPenActivity = now;
      base.role = toolPointerActive() ? "hold" : "tool";
    } else {
      // touch：见过 pen 的设备手指永远=相机；笔尖刚活动过的触点先当手掌（hold，仍可凑多指手势）
      if (now - lastPenActivity < PALM_PEN_GUARD_MS) base.role = "hold";
      else if (!penEverSeen && opts.fingerDraws() && touches().length === 0 && !toolPointerActive()) base.role = "tool";
      else base.role = "orbit";
    }
    pointers.set(ev.pointerId, base);
    if (ev.pointerType === "touch") {
      const ts = touches();
      if (ts.length >= 2) {
        // 第二指落下：工具手势让位给相机（手指画模式下画到一半也取消——SU iPad 同款）
        for (const [, t] of ts) if (t.role === "tool") editor.cancel();
        beginMulti();
        return;
      }
    }
    if (base.role === "tool") {
      if (opts.toolBlocked?.()) { base.role = "hold"; return; }   // 充能中落笔 = 无事发生（既不画也不转相机）
      editor.pointerDown(tp(ev));
    }
  }

  function onMove(ev: PointerEvent): void {
    const t = pointers.get(ev.pointerId);
    const s = local(ev);
    if (!t) {
      // 悬停（mouse / Pencil hover）：吸附预告
      if (ev.pointerType !== "touch" && !toolPointerActive()) { if (opts.toolBlocked?.()) editor.pointerLeave(); else editor.pointerMove(tp(ev)); }
      return;
    }
    const dx = s.x - t.x, dy = s.y - t.y;
    t.x = s.x; t.y = s.y; t.lastAt = performance.now();
    if (ev.pointerType === "pen") lastPenActivity = t.lastAt;
    switch (t.role) {
      case "tool": editor.pointerMove(tp(ev)); return;
      case "orbit": if (opts.look?.(dx, dy)) { editor.draw(); return; } editor.cam.orbit(dx, dy); editor.draw(); return;
      case "pan": if (opts.look?.(dx, dy)) { editor.draw(); return; } editor.cam.pan(dx, dy, editor.vp()); editor.draw(); return;
      case "multi": {
        // ② 位移门：每根手指离自己的起点
        if (tap?.isTap) {
          for (const [id, p] of touches()) {
            const st = tap.start.get(id);
            if (st && Math.hypot(p.x - st.x, p.y - st.y) > GESTURE_TAP_MAX_MOVE) { tap.isTap = false; break; }
          }
        }
        const ts = touches().filter(([, p]) => p.role === "multi");
        if (ts.length < 2 || !multi) return;
        const [[, a], [, b]] = ts;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y);
        if (opts.walking?.()) { multi.cx = cx; multi.cy = cy; multi.d = d; return; }
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
    const now = performance.now();
    if (ev.pointerType === "pen") lastPenActivity = now;   // ③ 掌触门从抬笔起算
    if (t.role === "tool") {
      if (cancelled) editor.cancel(); else editor.pointerUp(tp(ev));
      return;
    }
    if (ev.pointerType !== "touch") return;
    const rest = touches();
    if (rest.length === 0) {
      if (tap) {
        // 所有触点都松手 → 判定双指/三指 tap：①从最早触点算时长 ③笔尖时近性门
        const elapsed = now - tap.firstDownTime;
        const palmGuard = now - lastPenActivity < PALM_PEN_GUARD_MS;
        if (!cancelled && tap.isTap && elapsed < GESTURE_TAP_MAX_MS && !palmGuard) {
          if (tap.maxCount === 2) opts.onUndo();
          else if (tap.maxCount >= 3) opts.onRedo();
        }
        tap = null;
        multi = null;
        return;
      }
      // 单指轻点（从未凑成多指、没动、不在掌触门内）：当作「取消/收笔」——iPad 上 Esc 的替身
      if (t.role === "orbit" && !cancelled && now - t.downAt < SINGLE_TAP_MS && Math.hypot(t.x - t.downX, t.y - t.downY) < GESTURE_TAP_MAX_MOVE && now - lastPenActivity >= PALM_PEN_GUARD_MS) editor.cancel();
      return;
    }
    if (t.role === "multi") {
      if (rest.length >= 2) beginMulti();          // 三指抬一指：重锚，tap 记录保留（峰值指数不变）
      else { rest[0][1].role = "hold"; multi = null; }   // 剩最后一指：不接管为环绕（防抬手瞬间视角跳）
    }
  }

  const onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    if (opts.walking?.()) return;
    const r = canvas.getBoundingClientRect();
    editor.cam.zoomAt(ev.deltaY > 0 ? 1.1 : 1 / 1.1, ev.clientX - r.left, ev.clientY - r.top, editor.vp());
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
