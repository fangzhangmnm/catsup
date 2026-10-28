// touch-controls.ts —— 步行 FPS 的触屏操作层（吃鸡式；纪元账本 FM142）。created 2026-10-28 by Claude Opus 5.5
// 数学在 src/player/touch-stick.ts（死区 / 冲刺 / 浮动底座，node 测过）；这里只管 DOM 和指针：
//   左半屏 = 浮动摇杆（没按的时候左下角淡淡地画一个 = 告诉你往哪按；按在左半屏哪里底座就跳到哪里；推满 = 全速走、推出底座边缘 = 冲刺、
//     拖太远底座跟着走；松手回左下角。user 10-28 截图「摇杆位置不对」= v0.15.42 没按的时候底座和摇杆头停在覆盖层的 (0, 0)、罩在 ☰ 上）；
//   右半屏 = 拖动转头（不加速、不平滑）；右下 = 跳（按住）、蹲（点一下切换）；上方两颗低调的 =「原地编辑」「离开」（iPad 没有 Tab / Esc）。
// 竖屏为主（user「我很多时候ipad都是竖屏哦」）：分区按百分比，横屏一样能用。顶上 15% 留给 HUD。
// 只在有触屏的设备、FPS（走）阶段露；鼠标指针不进这里（键鼠照旧 WASD + 锁鼠标）。
import { STICK, TOUCH_LOOK_RAD_PER_PX, followBase, placeBase, stickOutput } from "../player/touch-stick.ts";

export interface TouchRead { walkX: number; walkY: number; dash: boolean; jump: boolean; crouch: boolean }
export interface TouchControlsOpts {
  /** 转头（弧度：水平 / 竖直；正 = 往右 / 往下看）。 */
  lookRad(dYaw: number, dPitch: number): void;
  editInPlace(): void;
  leave(): void;
}

/** 抓住这根手指（之后滑出区域也还归这里）；指针已经没了（按下就抬起 / 合成事件）= 不抓，照样能用。 */
const capture = (e: Element, id: number): void => { try { e.setPointerCapture(id); } catch { /* 指针已经不在了 */ } };
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); e.className = cls; if (text !== undefined) e.textContent = text; return e;
};

export class TouchControls {
  readonly root: HTMLDivElement;
  private left: HTMLDivElement; private right: HTMLDivElement;
  private base: HTMLDivElement; private knob: HTMLDivElement;
  private stick: { id: number; base: { x: number; y: number }; cur: { x: number; y: number } } | null = null;
  private look: { id: number; x: number; y: number } | null = null;
  private jumpHeld = false;
  private crouchOn = false;
  private crouchBtn: HTMLButtonElement;

  constructor(host: HTMLElement, private opts: TouchControlsOpts) {
    this.root = el("div", "touch-ctl"); this.root.hidden = true;
    this.left = el("div", "tc-zone tc-left"); this.right = el("div", "tc-zone tc-right");
    this.base = el("div", "tc-base"); this.knob = el("div", "tc-knob");
    this.base.style.width = this.base.style.height = `${STICK.radius * 2}px`;
    const jump = el("button", "tc-btn tc-jump", "跳"); jump.type = "button";
    this.crouchBtn = el("button", "tc-btn tc-crouch", "蹲"); this.crouchBtn.type = "button";
    const edit = el("button", "tc-top tc-edit", "原地编辑"); edit.type = "button";
    const leave = el("button", "tc-top tc-leave", "离开"); leave.type = "button";
    this.root.append(this.left, this.right, this.base, this.knob, jump, this.crouchBtn, edit, leave);
    host.appendChild(this.root);
    this.drawStick();   // 一开始就按「没在推」画（以前忘了 = 停在 (0, 0)）
    new ResizeObserver(() => { if (!this.stick) this.drawStick(); }).observe(this.root);
    const local = (ev: PointerEvent): { x: number; y: number } => { const r = this.root.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
    const notMouse = (ev: PointerEvent): boolean => ev.pointerType !== "mouse";
    // 左：摇杆
    this.left.addEventListener("pointerdown", (ev) => {
      if (!notMouse(ev) || this.stick) return;
      ev.preventDefault(); capture(this.left, ev.pointerId);
      const p = local(ev), z = this.left.getBoundingClientRect(), rr = this.root.getBoundingClientRect();
      this.stick = { id: ev.pointerId, base: placeBase(p, { x: z.left - rr.left, y: z.top - rr.top, w: z.width, h: z.height }), cur: p };
      this.drawStick();
    });
    this.left.addEventListener("pointermove", (ev) => {
      const s = this.stick; if (!s || s.id !== ev.pointerId) return;
      s.cur = local(ev); s.base = followBase(s.base, s.cur); this.drawStick();
    });
    const endStick = (ev: PointerEvent): void => { if (this.stick?.id === ev.pointerId) { this.stick = null; this.drawStick(); } };
    this.left.addEventListener("pointerup", endStick); this.left.addEventListener("pointercancel", endStick);
    // 右：转头
    this.right.addEventListener("pointerdown", (ev) => {
      if (!notMouse(ev) || this.look) return;
      ev.preventDefault(); capture(this.right, ev.pointerId);
      const p = local(ev); this.look = { id: ev.pointerId, x: p.x, y: p.y };
    });
    this.right.addEventListener("pointermove", (ev) => {
      const l = this.look; if (!l || l.id !== ev.pointerId) return;
      const p = local(ev);
      this.opts.lookRad((p.x - l.x) * TOUCH_LOOK_RAD_PER_PX, (p.y - l.y) * TOUCH_LOOK_RAD_PER_PX);
      l.x = p.x; l.y = p.y;
    });
    const endLook = (ev: PointerEvent): void => { if (this.look?.id === ev.pointerId) this.look = null; };
    this.right.addEventListener("pointerup", endLook); this.right.addEventListener("pointercancel", endLook);
    // 按钮
    jump.addEventListener("pointerdown", (ev) => { ev.preventDefault(); this.jumpHeld = true; jump.classList.add("is-on"); });
    const upJump = (): void => { this.jumpHeld = false; jump.classList.remove("is-on"); };
    jump.addEventListener("pointerup", upJump); jump.addEventListener("pointercancel", upJump); jump.addEventListener("pointerleave", upJump);
    this.crouchBtn.addEventListener("click", () => { this.crouchOn = !this.crouchOn; this.crouchBtn.classList.toggle("is-on", this.crouchOn); });
    edit.addEventListener("click", () => this.opts.editInPlace());
    leave.addEventListener("click", () => this.opts.leave());
  }

  /** 这台设备有触屏吗（只在有的时候露）。 */
  static available(): boolean { return (navigator.maxTouchPoints ?? 0) > 0 && (typeof matchMedia !== "function" || matchMedia("(any-pointer: coarse)").matches); }

  setVisible(on: boolean): void {
    if (this.root.hidden === !on) return;
    this.root.hidden = !on;
    if (!on) { this.stick = null; this.look = null; this.jumpHeld = false; }
    this.drawStick();
  }
  /** 没按的时候摇杆待在哪（左半屏的左下，拇指自然落下的地方）。 */
  private home(): { x: number; y: number } {
    const z = this.left.getBoundingClientRect(), r = this.root.getBoundingClientRect();
    return { x: z.left - r.left + Math.max(STICK.radius + 28, z.width * 0.4), y: z.bottom - r.top - (STICK.radius + 96) };   // 底下留出状态行（提示字）
  }

  /** 这一帧的输入（没在推 = 0；蹲是切换态）。 */
  read(): TouchRead {
    const s = this.stick, o = s ? stickOutput(s.cur.x - s.base.x, s.cur.y - s.base.y) : { walkX: 0, walkY: 0, dash: false };
    return { ...o, jump: this.jumpHeld, crouch: this.crouchOn };
  }

  private drawStick(): void {
    const s = this.stick;
    this.base.classList.toggle("is-idle", !s); this.knob.classList.toggle("is-idle", !s);
    if (!s) {
      const h = this.home();
      this.base.style.transform = `translate(${h.x - STICK.radius}px, ${h.y - STICK.radius}px)`;
      this.knob.style.transform = `translate(${h.x - 24}px, ${h.y - 24}px)`;
      this.knob.classList.remove("is-dash");
      return;
    }
    this.base.style.transform = `translate(${s.base.x - STICK.radius}px, ${s.base.y - STICK.radius}px)`;
    const dx = s.cur.x - s.base.x, dy = s.cur.y - s.base.y, d = Math.hypot(dx, dy), k = d > STICK.radius * STICK.dashAt ? STICK.radius * STICK.dashAt / d : 1;
    this.knob.style.transform = `translate(${s.base.x + dx * k - 24}px, ${s.base.y + dy * k - 24}px)`;
    this.knob.classList.toggle("is-dash", d >= STICK.radius * STICK.dashAt);
  }
}
