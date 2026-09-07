// flat-input.ts —— 键盘 → InputFrame（桌面步行/飞行相机；VR 移动逻辑不戴头显的验证通道）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）
//
// 键位（user：「相机 wasd 不够，还需要 qe 上下」+ handoff）：WASD 走 · Q/E 下/上（noclip 飞） · Shift 冲刺 · 空格 跳（双击=飞行开关，Minecraft）· Ctrl 蹲 ·
// ←/→ snap turn（边沿） · T 按住 = teleport 充能（松开落）· 充能中 ↑/↓ = 发射速度档、←/→ = 落地朝向 · G 按住 = 回上一点。
// 鼠标视角不在这里：右键拖由 app 层手势路由喂 Locomotion.look()。
// 只记键态，不碰 player；每帧 read() 产一个 InputFrame（边沿在这里做，PlayerSim 一帧多步只吃第一步）。

import { type HeadFrame, type InputFrame, DoubleTap, emptyInput } from "./input.ts";
import type { Ray } from "./world-query.ts";

const KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "Space", "ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyT", "KeyG"]);

export class FlatInput {
  private down = new Set<string>();
  private edges: string[] = [];        // 本帧按下的键（边沿）
  private _enabled = false;
  private dblJump = new DoubleTap();
  private onKeyDown = (ev: KeyboardEvent): void => {
    if (!this._enabled) return;
    const t = ev.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (!KEYS.has(ev.code) || ev.metaKey || ev.altKey) return;
    if (!ev.repeat && !this.down.has(ev.code)) this.edges.push(ev.code);
    this.down.add(ev.code);
    ev.preventDefault();
  };
  private onKeyUp = (ev: KeyboardEvent): void => { this.down.delete(ev.code); };
  private onBlur = (): void => { this.down.clear(); this.edges = []; };

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }
  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.onBlur();
  }
  /** 关闭时不吞任何键（轨道模式下 WASD 等照旧不被截）。 */
  setEnabled(on: boolean): void { this._enabled = on; if (!on) this.onBlur(); }
  isDown(code: string): boolean { return this.down.has(code); }

  /** 产本帧输入；head/aim 由调用方给（flat：头 = (0,0,眼高)+俯仰前向；aim = 相机过光标射线）。 */
  read(head: HeadFrame, aim: Ray | null, now = performance.now() / 1000): InputFrame {
    const d = this.down;
    const f = emptyInput();
    f.head = head; f.aim = aim;
    f.walkX = (d.has("KeyD") ? 1 : 0) - (d.has("KeyA") ? 1 : 0);
    f.walkY = (d.has("KeyW") ? 1 : 0) - (d.has("KeyS") ? 1 : 0);
    f.dash = d.has("ShiftLeft") || d.has("ShiftRight");
    f.jump = d.has("Space");
    f.noclipToggle = this.dblJump.update(f.jump, now);
    f.crouch = d.has("ControlLeft") || d.has("ControlRight");
    f.up = d.has("KeyE"); f.down = d.has("KeyQ");
    f.tpCharge = d.has("KeyT");
    f.tpBack = d.has("KeyG");
    const charging = f.tpCharge;
    for (const code of this.edges) {
      if (code === "ArrowLeft") { if (charging) f.yawStep = 1; else f.turn = 1; }
      else if (code === "ArrowRight") { if (charging) f.yawStep = -1; else f.turn = -1; }
      else if (code === "ArrowUp" && charging) f.tierStep = 1;
      else if (code === "ArrowDown" && charging) f.tierStep = -1;
    }
    this.edges = [];
    return f;
  }
}
