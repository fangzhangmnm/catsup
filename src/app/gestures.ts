// gestures.ts —— 指针路由：mouse / pen / touch 谁是「工具指针」、谁是「相机手势」。
// created 2026-09-06 by Claude Fable 5.1（user：「iPad as first class citizen」）；同日按 WeebPaint input.ts 的坑重写多指 tap（user：「undo redo 的手势，这个参考 weebpaint 的坑」）
//
// 口径（抄 WeebPaint pointer-route.ts 的教义，改成 3D 相机版）：
//   mouse：左键=工具；中/右键拖=环绕，Shift+中/右=平移；滚轮=朝光标缩放。
//   pen  ：永远=工具（Apple Pencil 悬停=吸附预告）。见过 pen 的设备，手指永久降级为相机（手掌≡单指 touch，物理不可分）。
//   touch：单指=环绕；双指=平移+捏合缩放；双指轻点=撤销、三指轻点=重做（Procreate 方言，WeebPaint 同款）。
//          「手指画」开关打开且没见过 pen → 单指=工具，第二指落下即取消工具手势转相机。
//   画到一半转视角（B23，2026-10-24 user「能不能一根线或者别的操作画到一半的时候调整视角」）：
//     · 笔也能「点两下」（main armable）：点一下定首点、抬笔、手指转视角、再点落定（SU iPad 同款）；单指轻点 / Esc 取消
//     · 笔按住拖的中途：双指 = 环绕 + 捏合缩放（单指仍当手掌）；平时双指 = 平移 + 缩放不变
//     · 相机一动就按工具指针最后的屏幕位置重算预览（retrack），不用动笔
//
// 多指 tap 的四个坑（WeebPaint input.ts 血泪，逐条照抄）：
//   ① tap 时长从**最早**参与触点落下算（掌根久搁 = 慢 tap = 超限剔除；从第二指到来算会漏掉）。
//   ② 位移门按**每根手指**离各自起点算（16px），不是质心——捏一下再松开不是 tap。
//   ③ 掌触门：笔尖活动（落/移/抬）后 600ms 内的多指 tap 一律视作手掌闪灭，吞掉不撤销；只挡 tap，pinch/pan 不动。
//   ④ 幽灵指针：iOS 偶尔丢 pointerup → 卡在 map 里把单指误判成双指。pen 落下 = 权威信号，清空全部 touch；
//      任何 down 前清掉 8s 没动静的 touch。
// Editor 只吃工具指针（pointerDown/Move/Up/Leave）；相机改动直接打 editor.cam 再 draw。

import type { Editor, ToolPointer } from "../editor/editor.ts";
import { FINGER_DOUBLE_TAP_MS, FINGER_DOUBLE_TAP_PX, LONG_PRESS_MS, GESTURE_TAP_MAX_MS, GESTURE_TAP_MAX_MOVE, PALM_PEN_GUARD_MS, STALE_TOUCH_MS, SINGLE_TAP_MS, UNLOCK_PX } from "../controller/feel.ts";   // 时间 / 距离的数值住手感表（2026-10-28）

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
  /** 上下文菜单（#19，2026-10-21）：桌面右键（没拖成环绕）/ 触屏长按（没动）→ 在该点弹菜单。坐标 = 画布本地 + client。 */
  onContext?(x: number, y: number, clientX: number, clientY: number): void;
  /** 没键盘时点键名芯片锁住的修饰键（= 一直按着；app/mfd.ts）。 */
  latched?(): { shift: boolean; ctrl: boolean; alt: boolean };
  /** 长按是否可用（main：只在选择工具里）。 */
  longPressEnabled?(): boolean;
  /** 「点两下 / 点三下」是否可用（缺省 = 只有鼠标）：#23 移动 / 旋转对笔和手指也开。 */
  armable?(pointerType: string): boolean;
}


export function attachGestures(canvas: HTMLCanvasElement, editor: Editor, opts: GestureOpts): { dispose(): void; penEverSeen(): boolean } {
  const pointers = new Map<number, Tracked>();
  let penEverSeen = false;
  let lastPenActivity = -Infinity;
  /** locked = 笔按住拖的中途凑成的双指：先当手掌，质心 / 指距累计动过 UNLOCK_PX 才解锁成相机（user 2026-10-24「要不要大动作解锁」）。 */
  let multi: { cx: number; cy: number; d: number; locked: boolean; travel: number } | null = null;
  let tap: GestureTap | null = null;
  /** 上一次单指轻点（双击进出组件层级用）。 */
  let lastFingerTap: { at: number; x: number; y: number } | null = null;

  const local = (ev: PointerEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const tp = (ev: PointerEvent): ToolPointer => {
    const s = local(ev), L = opts.latched?.() ?? { shift: false, ctrl: false, alt: false };   // 锁住的修饰键 = 一直按着（iPad 没键盘）
    return { x: s.x, y: s.y, clientX: ev.clientX, clientY: ev.clientY, pointerType: ev.pointerType, armable: opts.armable ? opts.armable(ev.pointerType) : ev.pointerType === "mouse", shiftKey: ev.shiftKey || L.shift, copy: ev.ctrlKey || ev.altKey || ev.metaKey || L.ctrl || L.alt, altKey: ev.altKey || L.alt };
  };
  const touches = (): [number, Tracked][] => [...pointers.entries()].filter(([, p]) => p.type === "touch");
  const toolPointerActive = (): boolean => [...pointers.values()].some((p) => p.role === "tool");
  /** 工具指针（或悬停）最后一次的屏幕位置：相机动了之后拿它重算预览（B23）。 */
  let lastTool: ToolPointer | null = null;
  const retrack = (): void => { if (lastTool && (toolPointerActive() || editor.gestureInProgress())) editor.pointerMove(lastTool); };

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
    multi = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y), locked: toolPointerActive(), travel: 0 };
    if (!tap) tap = { firstDownTime: Math.min(...ts.map(([, t]) => t.downAt)), isTap: true, maxCount: 0, start: new Map() };
    tap.maxCount = Math.max(tap.maxCount, ts.length);
    for (const [id, t] of ts) { if (!tap.start.has(id)) tap.start.set(id, { x: t.downX, y: t.downY }); t.role = "multi"; }
  }

  // 右键 / 长按 → 上下文菜单
  let rightDown: { x: number; y: number; moved: boolean } | null = null;
  let longPress: { id: number; timer: number; x: number; y: number; cx: number; cy: number } | null = null;
  const clearLongPress = (): void => { if (longPress) { clearTimeout(longPress.timer); longPress = null; } };
  const armLongPress = (ev: PointerEvent, t: Tracked): void => {
    clearLongPress();
    if (!opts.onContext || !(opts.longPressEnabled?.() ?? false)) return;
    if (ev.pointerType === "mouse") return;
    if (!(t.role === "tool" || (ev.pointerType === "touch" && t.role === "orbit" && touches().length === 1))) return;
    const id = ev.pointerId, x = t.x, y = t.y, cx = ev.clientX, cy = ev.clientY;
    const timer = window.setTimeout(() => {
      longPress = null;
      const cur = pointers.get(id);
      if (!cur || Math.hypot(cur.x - x, cur.y - y) > GESTURE_TAP_MAX_MOVE) return;
      if (cur.role === "tool") editor.abortGesture();   // 选择工具的框选起手作废，选区保留
      cur.role = "hold";
      opts.onContext!(x, y, cx, cy);
    }, LONG_PRESS_MS);
    longPress = { id, timer, x, y, cx, cy };
  };

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
    if (ev.pointerType === "mouse" && ev.button === 2) rightDown = { x: s.x, y: s.y, moved: false };
    armLongPress(ev, base);
    if (ev.pointerType === "touch") {
      const ts = touches();
      if (ts.length >= 2) {
        clearLongPress();
        // 第二指落下：工具手势让位给相机（手指画模式下画到一半也取消——SU iPad 同款）
        for (const [, t] of ts) if (t.role === "tool") editor.cancel();
        beginMulti();
        return;
      }
    }
    if (base.role === "tool") {
      if (opts.toolBlocked?.()) { base.role = "hold"; return; }   // 充能中落笔 = 无事发生（既不画也不转相机）
      lastTool = tp(ev);
      editor.pointerDown(lastTool);
    }
  }

  function onMove(ev: PointerEvent): void {
    if (longPress && longPress.id === ev.pointerId) { const q = local(ev); if (Math.hypot(q.x - longPress.x, q.y - longPress.y) > GESTURE_TAP_MAX_MOVE) clearLongPress(); }
    const t = pointers.get(ev.pointerId);
    const s = local(ev);
    if (!t) {
      // 悬停（mouse / Pencil hover）：吸附预告
      if (ev.pointerType !== "touch" && !toolPointerActive()) { if (opts.toolBlocked?.()) editor.pointerLeave(); else { lastTool = tp(ev); editor.pointerMove(lastTool); } }
      return;
    }
    const dx = s.x - t.x, dy = s.y - t.y;
    t.x = s.x; t.y = s.y; t.lastAt = performance.now();
    if (ev.pointerType === "pen") lastPenActivity = t.lastAt;
    switch (t.role) {
      case "tool": lastTool = tp(ev); editor.pointerMove(lastTool); return;
      case "orbit": if (opts.look?.(dx, dy)) { editor.draw(); return; } editor.cam.orbit(dx, dy); retrack(); editor.draw(); return;
      case "pan": if (opts.look?.(dx, dy)) { editor.draw(); return; } editor.cam.pan(dx, dy, editor.vp()); retrack(); editor.draw(); return;
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
        if (multi.locked) {   // 大动作解锁：没动够 UNLOCK_PX 之前当手掌，不碰相机；解锁时从当前位置起算，不把积累的位移一下子甩出去
          multi.travel += Math.hypot(cx - multi.cx, cy - multi.cy) + Math.abs(d - multi.d);
          multi.cx = cx; multi.cy = cy; multi.d = d;
          if (multi.travel < UNLOCK_PX) return;
          multi.locked = false;
          return;
        }
        // 笔按住拖的中途（工具指针活着）：双指质心 = 环绕（单指被当手掌，转不了）；平时 = 平移
        if (toolPointerActive()) editor.cam.orbit(cx - multi.cx, cy - multi.cy); else editor.cam.pan(cx - multi.cx, cy - multi.cy, editor.vp());
        if (d > 1 && multi.d > 1) editor.cam.zoomAt(multi.d / d, cx, cy, editor.vp());
        multi.cx = cx; multi.cy = cy; multi.d = d;
        retrack();
        editor.draw();
        return;
      }
      case "hold": return;
    }
  }

  function onUp(ev: PointerEvent, cancelled: boolean): void {
    const t = pointers.get(ev.pointerId);
    if (longPress && longPress.id === ev.pointerId) clearLongPress();
    if (!t) return;
    pointers.delete(ev.pointerId);
    if (ev.pointerType === "mouse" && ev.button === 2 && rightDown) rightDown.moved = Math.hypot(t.x - rightDown.x, t.y - rightDown.y) > GESTURE_TAP_MAX_MOVE;
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
      // 单指轻点（从未凑成多指、没动、不在掌触门内）：当作「取消/收笔」——iPad 上 Esc 的替身；
      // 同一处很快点第二下 = 双击：点在子组件 / 组上进去、点在空处退一层（user 10-28 夜「手指双击能不能也能进出hierarchy」；鼠标双击同语义）
      if (t.role === "orbit" && !cancelled && now - t.downAt < SINGLE_TAP_MS && Math.hypot(t.x - t.downX, t.y - t.downY) < GESTURE_TAP_MAX_MOVE && now - lastPenActivity >= PALM_PEN_GUARD_MS) {
        const prev = lastFingerTap;
        if (prev && now - prev.at < FINGER_DOUBLE_TAP_MS && Math.hypot(t.x - prev.x, t.y - prev.y) < FINGER_DOUBLE_TAP_PX) { lastFingerTap = null; editor.hierarchyTapAt(t.x, t.y); }
        else { lastFingerTap = { at: now, x: t.x, y: t.y }; editor.cancel(); }
      }
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
    retrack();
    editor.draw();
  };
  const onLeave = (): void => { if (!toolPointerActive()) editor.pointerLeave(); };
  const onCtx = (e: Event): void => {
    e.preventDefault();
    const me = e as MouseEvent;
    if (!opts.onContext) return;
    // 右键拖成了环绕就不弹；触屏长按走自家计时器（系统 contextmenu 事件在 iOS 上不来）
    if (rightDown?.moved) { rightDown = null; return; }
    rightDown = null;
    if (editor.rightClickInGesture()) return;   // 手势中右键的含义归编辑器（T102：以前 app 层按工作台 if、只认自由建模，硬表面推拉时右键弹出了菜单）；不在手势里才是菜单区留着（Blender G / R / S / E 同款），不弹菜单
    if ((me as PointerEvent).pointerType === "touch") return;
    const r = canvas.getBoundingClientRect();
    opts.onContext(me.clientX - r.left, me.clientY - r.top, me.clientX, me.clientY);
  };
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
