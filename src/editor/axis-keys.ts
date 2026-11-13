// editor/axis-keys.ts —— 这一下动作里按的轴键（快捷键那份，只管这一下）：把编辑器的现状接到语法模块上（锁的一轮第二步）。created 2026-11-13 by Claude Opus 5.5
// 设计稿 = ai-docs/20261113-axis-constraint-module-design.md 第 2.2 节和第三节；规矩全在 controller/axis-constraint.ts，这里一条都不写。
// 这里只做三件事：
//   1. 解析「这个键此刻指哪个方向」：X / Y / Z = 上下文坐标架的轴（自由建模在组件里 = 物体自己的轴）；N = 按键那一刻光标下那张面的法线；
//      T = 按键那一刻光标下那条边（拾取半径照「选」的）。取不到 = 状态不变、说原因，不进语法模块。
//   2. 寿命 = 一个动作：动作不在了（落定 / 取消）就丢掉。编辑器在取消手势 / 一子步做完 / 键盘起手时明着丢；直接语法的工具落定不经过那几处，
//      所以 now() 每次先问「动作还在吗」，不在就当场丢（不会带到下一个动作里）。
//   3. 给人看的一句话 = axisDescribe（带坐标架，交线和某根轴平行时说「沿 Z」）；取不到方向 = 原因；全取消了 = 说取消了。
//      这句话一直挂在手势读数后面（editor computeLive 拼提示行时取 note()），不然预演读数一刷新就把它盖掉了。
import { axisBegin, axisConstraint, axisDescribe, axisPress, type AxisConstraint, type AxisKey, type AxisState, type Vec3 } from "../controller/axis-constraint.ts";

export interface AxisFrame { readonly x: Vec3; readonly y: Vec3; readonly z: Vec3 }
/** 编辑器给的口子（全是现问）。 */
export interface AxisKeysPorts {
  /** 动作在不在（手势进行中 / 键盘起手的模态中）。 */
  gestureActive(): boolean;
  /** 这把工具要几个方向（ToolHandler.axisWants，缺 = 1）。 */
  wants(): 1 | 2;
  /** 上下文坐标架的三根轴（世界）。 */
  axes(): AxisFrame;
  /** 按键这一刻光标下最近的那张面（法线 + 身份）/ 那条边（方向 + 身份）；没有 = null。 */
  faceUnder(): { readonly n: Vec3; readonly ref: string } | null;
  edgeUnder(): { readonly dir: Vec3; readonly ref: string } | null;
  /** 按钮锁着没有（全取消时说「回到按钮锁着的那个」还是「不限制」）。 */
  buttonLocked(): boolean;
}
export type AxisPressResult = { readonly ok: true; readonly say: string } | { readonly ok: false; readonly why: string };

export class AxisKeys {
  private s: AxisState | null = null;
  private said = "";
  constructor(private readonly p: AxisKeysPorts) {}
  /** 按了一下：记进语法模块，回一句给人看的话（say 空 = 全取消了）；取不到方向 = 不变、说为什么。 */
  press(key: AxisKey, shift: boolean): AxisPressResult {
    if (!this.p.gestureActive()) { this.drop(); return { ok: false, why: "轴键只在动作里管用（按住拖着、或者 G / R / S / E 起手之后）" }; }
    let dir: Vec3, ref: string;
    const fail = (why: string): AxisPressResult => { this.said = why; return { ok: false, why }; };
    if (key === "n") { const f = this.p.faceUnder(); if (!f) return fail("N：把光标放到一张面上再按"); dir = f.n; ref = f.ref; }
    else if (key === "t") { const e = this.p.edgeUnder(); if (!e) return fail("T：把光标放到一条边上再按"); dir = e.dir; ref = e.ref; }
    else { dir = this.p.axes()[key]; ref = `axis:${key}`; }
    this.s = axisPress(this.s ?? axisBegin(this.p.wants()), { key, shift, dir, ref });
    this.said = axisDescribe(this.s, this.p.axes()).say || `轴键都取消了：${this.p.buttonLocked() ? "回到按钮锁着的那个" : "不限制"}`;
    return { ok: true, say: this.said };
  }
  /** 挂在手势读数后面的那句（这一下按过轴键才有；动作不在 = 空，顺手丢掉）。 */
  note(): string { if (this.said && !this.p.gestureActive()) this.drop(); return this.said; }
  /** 快捷键那份现在把动作限制成什么；动作不在 = 丢掉；没按过 / 全取消了 = null（调用方退回按钮锁着的那份）。 */
  now(): AxisConstraint | null {
    if (!this.s) return null;
    if (!this.p.gestureActive()) { this.drop(); return null; }
    const c = axisConstraint(this.s);
    return c.kind === "free" ? null : c;
  }
  /** 动作做完 / 取消 / 新的动作开始：丢掉。 */
  drop(): void { this.s = null; this.said = ""; }
}
