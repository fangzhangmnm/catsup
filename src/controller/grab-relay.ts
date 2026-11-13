// controller/grab-relay.ts —— 笔在「抓住东西做事」的工具里：轻的那一下 = 选（点选、点空白取消、空处拖框选 / 套索）和拖把手；重的那一下 = 抓住东西做这把工具的事。
// （笔的设计稿第三节、第七节第 6 步；统筹 11-13 定的五条。）created 2026-11-13 by Claude Opus 5.5
//
// 只管报压感的笔、只管 stance.ts PEN_PRESS 里是 grab 的工具（移动 / 旋转 / 缩放 / 沿法线 / 挤出 / 变换 / 插入·倒角）。鼠标、不报压感的笔照旧。
// 编辑器那一套「按下 → 拖 → 松手」（steps 语法）一行不改：这里把笔的「轻 / 重」翻成它：
//   · 落笔：这一点下面是把手 = 照旧按住拖（handle）；是空处 = 框选（box，按下时告诉编辑器 intent = select：有选区也框）；是东西 = 只找位置（seek，什么都不动）。
//     落笔那一下就很重（判到重按）= 当成一下重按处理；编辑器正在一下手势里（键盘起手跟着走）= 只找位置，重按 / 轻点 = 落定。
//   · 重按（判到一次，点 = 压力猛升之前那一刻）：
//       把手 = 不管（按住把手拖着呢）；正在抓 = 在这一点松手（落定），回到找位置；正在框 = 框作废（选区不变）、再按下面这条起抓；
//       找位置 = 这一点下面是空处又没选区 = 什么都不做；不然在这一点「按下」（intent = grab：三分法照旧定对谁做）→ 抓。编辑器在手势里 = 在这一点点一下（落定）。
//   · 抬笔（宽限已经过了，app/gestures.ts）：把手 / 框 / 抓 = 在这里松手（落定 / 框选生效）；找位置 = 这一下没重按过、也没走出点按容差 = 轻点（在落笔处点一下：选东西 /
//     点空白取消 / 跟着走时落定），不然什么都不做。
// 同一下重按只算一次：重按的判法本身就是一次重按出一个点，压力不回落不认下一次（controller/hard-press.ts）。
// 纯状态机：不认识 DOM、编辑器；要问的三件事（这一点下面是什么、编辑器在不在手势里、有没有选区）由调用方递进来。输出一串动作，调用方照着递给编辑器。
// 过渡的做法（统筹 11-13，写进了设计稿施工记录）：每多一把工具，PEN_PRESS 多一行；到「命令和工具分家」那一轮手势这层重做时并进每把工具自己的手势定义。
import type { PressHit } from "./hard-press.ts";

/** 这一点下面是什么（编辑器的只读查询 Editor.pressKindAt；null = 这把工具不说）。 */
export type PressKind = "handle" | "thing" | "empty";
/** 递给编辑器的动作：按下（带意思）/ 移动（悬停或拖，编辑器自己看手势在不在）/ 松手 / 作废这一下手势（框到一半来了重按）。 */
export type RelayAction =
  | { readonly a: "down"; readonly x: number; readonly y: number; readonly intent: "select" | "grab" | null }
  | { readonly a: "move"; readonly x: number; readonly y: number }
  | { readonly a: "up"; readonly x: number; readonly y: number }
  | { readonly a: "abort" };
export interface RelayEnv {
  kindAt(x: number, y: number): PressKind | null;
  /** 编辑器正在一下手势里（键盘起手跟着走、上一下没收）。 */
  busy(): boolean;
  hasActableSelection(): boolean;
  /** 点按容差（画布像素）：轻点走出这么远就不算点。 */
  readonly slop: number;
}
type Mode = "seek" | "handle" | "box" | "grab";

export class GrabRelay {
  private mode: Mode = "seek";
  private land = { x: 0, y: 0 };
  private travel = 0;
  private pressed = false;
  /** 现在在做什么（探针 / 调试看）。 */
  get state(): Mode { return this.mode; }
  down(at: { x: number; y: number }, hit: PressHit | null, env: RelayEnv): RelayAction[] {
    this.land = { x: at.x, y: at.y }; this.travel = 0; this.pressed = false; this.mode = "seek";
    if (env.busy()) return hit ? this.hard(hit, env) : [{ a: "move", x: at.x, y: at.y }];
    const kind = env.kindAt(at.x, at.y);
    if (kind === "handle") { this.mode = "handle"; return [{ a: "down", x: at.x, y: at.y, intent: null }]; }   // 重按落在把手上也算按住把手
    if (hit) return this.hard(hit, env);
    if (kind === "empty") { this.mode = "box"; return [{ a: "down", x: at.x, y: at.y, intent: "select" }]; }
    return [{ a: "move", x: at.x, y: at.y }];   // 落在东西上：只找位置
  }
  move(at: { x: number; y: number }): RelayAction[] {
    this.travel = Math.max(this.travel, Math.hypot(at.x - this.land.x, at.y - this.land.y));
    return [{ a: "move", x: at.x, y: at.y }];
  }
  hard(hit: PressHit, env: RelayEnv): RelayAction[] {
    this.pressed = true;
    if (this.mode === "handle") return [];
    if (env.busy() && this.mode === "seek") return [{ a: "down", x: hit.x, y: hit.y, intent: null }, { a: "up", x: hit.x, y: hit.y }];   // 键盘起手跟着走：重按 = 落定
    if (this.mode === "grab") { this.mode = "seek"; return [{ a: "up", x: hit.x, y: hit.y }]; }
    const out: RelayAction[] = [];
    if (this.mode === "box") { out.push({ a: "abort" }); this.mode = "seek"; }   // 框到一半来了重按：框作废、选区不变，然后起抓
    if (env.kindAt(hit.x, hit.y) === "empty" && !env.hasActableSelection()) return out;   // 空处、没选区 = 没东西可抓
    this.mode = "grab";
    out.push({ a: "down", x: hit.x, y: hit.y, intent: "grab" });
    return out;
  }
  up(at: { x: number; y: number }, env: RelayEnv): RelayAction[] {
    const mode = this.mode;
    this.mode = "seek";
    if (mode !== "seek") return [{ a: "up", x: at.x, y: at.y }];
    if (this.pressed || this.travel > env.slop) return [];
    return [{ a: "down", x: this.land.x, y: this.land.y, intent: "select" }, { a: "up", x: this.land.x, y: this.land.y }];   // 轻点：选东西 / 点空白取消 / 跟着走时落定
  }
}
