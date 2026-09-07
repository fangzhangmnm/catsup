// vr.ts —— XR 会话接线：进出会话、每帧读手柄/头显、rig 同步、工具指针（XRPointerFrame）、手腕面板点按、震动、Reset View。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；user：「退 vr 的时候 app 应该继续用，可以随时进和退 vr」「vr 第一公民 = 不回 flatscreen 可以进去全 workflow」）
//
// 分工：player（移动/碰撞/teleport）在 src/player/，编辑语义在 Editor（吃 PointerFrame），three 在 render3；本文件只做「谁的手、按了什么、
// 喂给谁」。每 XR 帧一次 render（Editor.batchDraw 把指针事件引起的 draw 合并）。
// 手：默认右手 = 工具（trigger 画）、左手 = 手腕面板（另一只手的射线点它）；leftHanded 对调。
// 选择工具 = 阶段长按（A13：0.3 s 一震 = 膜 + 环边，0.6 s 二震 = 连通体；松手结算），其余工具 = trigger 按住拖、松开落。

import type { Editor } from "../editor/editor.ts";
import { XRPointerFrame, XR_VIRTUAL_VP } from "../editor/xr-pointer-frame.ts";
import type { Locomotion } from "./locomotion.ts";
import { XRInput, type XRHandState, pulse, forwardRig, rigDirToWorld } from "../player/xr-input.ts";
import type { InputFrame } from "../player/input.ts";
import { emptyInput } from "../player/input.ts";
import type { HudModel } from "./ui/hud-model.ts";
import { WristPanel, WRIST_M } from "./ui/wrist-panel.ts";
import { bakeToast, TOAST_M } from "./ui/vr-toast.ts";
import type { NoticeLevel } from "./ui/notice.ts";

export interface VROpts {
  editor: Editor;
  locomotion: Locomotion;
  hud: HudModel;
  leftHanded: () => boolean;
  /** 支持性/会话态变了（菜单刷新、循环起停）。 */
  onChange: () => void;
  /** dev 诊断（英文随意）。 */
  log?: (msg: string) => void;
}

const HOLD_STAGE1 = 0.3, HOLD_STAGE2 = 0.6;

export class VR {
  private supported = false;
  private presenting = false;
  private xrInput = new XRInput();
  private frameIn: InputFrame = emptyInput();
  private firstFrame = false;
  private spawn: { pos: { x: number; y: number; z: number }; heading: number } | null = null;
  private pendingResetYaw: number | null = null;
  private resetAttached = false;
  private pointer = new XRPointerFrame();
  private trigWas = false;
  private toolDown = false;
  private panelPressId: string | null = null;
  private holdT = 0;
  private holdStage = 0;
  private panel: WristPanel;
  private lastHint = "";
  private opts: VROpts;

  constructor(opts: VROpts) {
    this.opts = opts;
    this.panel = new WristPanel(opts.hud);
    const xr = opts.editor.renderer3.xr;
    xr.on("sessionstart", () => this.onStart());
    xr.on("sessionend", () => this.onEnd());
    navigator.xr?.isSessionSupported("immersive-vr").then((ok) => { this.supported = ok; opts.onChange(); }).catch(() => {});
  }

  isSupported(): boolean { return this.supported; }
  isPresenting(): boolean { return this.presenting; }

  /** 必须在用户手势里同步调用（requestSession 需要 transient activation）。 */
  enter(): void {
    if (!navigator.xr || this.presenting) return;
    navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] })
      .then((session) => this.opts.editor.renderer3.xr.setSession(session))
      .catch((err) => this.opts.log?.(`VR session failed: ${(err as Error).message}`));
  }
  /** 退出（面板/菜单）：end() 走标准路径；Quest 残留「Immersive XR is still running in the background」横幅案（2026-09-07）→ 两条路径各记日志，真机对照。 */
  exit(): void {
    const s = this.opts.editor.renderer3.xr.session();
    if (!s) { this.opts.log?.("VR exit: no session"); return; }
    this.exitRequested = true;
    s.end().then(() => this.opts.log?.("VR exit: session.end() resolved (app path)")).catch((err) => this.opts.log?.(`VR exit: session.end() rejected: ${(err as Error).message}`));
  }
  private exitRequested = false;

  private onStart(): void {
    const { editor, locomotion } = this.opts;
    this.presenting = true;
    this.firstFrame = true;
    this.resetAttached = false;
    this.pendingResetYaw = null;
    this.trigWas = false; this.toolDown = false; this.panelPressId = null; this.holdStage = 0; this.holdT = 0;
    this.spawn = locomotion.enterXR(() => this.frameIn);
    editor.setPointerFrame(this.pointer, XR_VIRTUAL_VP);
    editor.renderer3.attachWristPanel(this.panel.canvas, WRIST_M.w, WRIST_M.h, this.opts.leftHanded() ? "right" : "left");
    this.panel.dirty = true;
    this.opts.onChange();
  }
  private onEnd(): void {
    const { editor, locomotion } = this.opts;
    this.opts.log?.(`VR sessionend (${this.exitRequested ? "app path" : "system/other path"})`);
    this.exitRequested = false;
    this.presenting = false;
    if (this.toolDown) { editor.cancel(); this.toolDown = false; }
    editor.setPointerFrame(null);
    editor.renderer3.detachWristPanel();
    editor.renderer3.detachSubtitle();
    if (this.toastTimer) { clearTimeout(this.toastTimer); this.toastTimer = null; }
    editor.renderer3.setPointerVisual("left", null); editor.renderer3.setPointerVisual("right", null);
    locomotion.exitXR();
    this.opts.onChange();
  }

  /** 模型变了（工具/选区/撤销栈/状态行）→ 面板重画。 */
  invalidatePanel(): void { this.panel.dirty = true; }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  /** 字幕位 toast（与桌面 notice 同一份文案；不在会话中 = 无事，DOM toast 已经在）。 */
  toast(text: string, level: NoticeLevel = "neutral"): void {
    if (!this.presenting) return;
    this.opts.editor.renderer3.attachSubtitle(bakeToast(text, level), TOAST_M.w, TOAST_M.h);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastTimer = null; this.opts.editor.renderer3.detachSubtitle(); }, level === "error" ? 6000 : 4000);
  }

  /** 每 XR 帧（渲染循环里、editor.draw 之前）。 */
  tick(dt: number): void {
    if (!this.presenting) return;
    const { editor, locomotion } = this.opts;
    const r3 = editor.renderer3;
    const session = r3.xr.session(), frame = r3.xr.frame(), ref = r3.xr.refSpace();
    if (!session || !frame || !ref) return;
    this.attachReset(ref);

    // 1. 读输入（用上一帧的 rig 姿态把参考系姿态换到世界；首帧先 reset 再读一次）
    let xi = this.xrInput.read(session, frame, ref, locomotion.pose(), locomotion.noclip);
    if (this.firstFrame && xi.head && this.spawn) {
      locomotion.sim.reset(this.spawn.pos, this.spawn.heading, xi.input.head.local);
      this.firstFrame = false;
      xi = this.xrInput.read(session, frame, ref, locomotion.pose(), locomotion.noclip);
    }
    if (this.pendingResetYaw !== null && xi.head) {
      locomotion.sim.handleTrackingReset(this.pendingResetYaw, xi.input.head.local);
      this.pendingResetYaw = null;
    }
    const left = this.opts.leftHanded();
    const toolHand: XRHandState = left ? xi.left : xi.right;
    const panelHand: XRHandState = left ? xi.right : xi.left;
    const toolName: "left" | "right" = left ? "left" : "right";

    // 2. 步进 player（冻结票在 locomotion.tick 里按手势态设）
    this.frameIn = xi.input;
    locomotion.tick(dt);
    r3.setRig(locomotion.pose());

    // 3. 撤销/重做（左 X/Y）
    if (xi.undoEdge) { editor.undo(); pulse(session, panelHand === xi.left ? "left" : "right", 0.4, 40); }
    if (xi.redoEdge) { editor.redo(); pulse(session, panelHand === xi.left ? "left" : "right", 0.4, 40); }

    // 4. 工具指针 / 面板点按
    const trig = toolHand.trigger;
    const trigDown = trig && !this.trigWas, trigUp = !trig && this.trigWas;
    this.trigWas = trig;
    // teleport 充能中 = 工具停摆（user 2026-09-07：「teleport 的时候不应该显示画线，这时候工具也应该禁用」）：
    // 进行中的手势取消、不再喂指针事件、预告/悬停清掉、工具射线隐藏（弧线就是这时候的指针）
    const charging = locomotion.sim.state.teleport.charging;
    editor.batchDraw(() => {
      if (charging) {
        if (this.toolDown) { editor.cancel(); this.toolDown = false; this.holdStage = 0; }
        if (this.panelPressId) { this.panelPressId = null; this.panel.setPressed(null); }
        if (this.panel.hovered()) this.panel.setHover(null);
        editor.pointerLeave();
        r3.setPointerVisual(toolName, null);
        return;
      }
      if (!toolHand.ray) { r3.setPointerVisual(toolName, null); return; }
      // 面板命中优先（射线穿过面板就不当工具指针）
      const wh = r3.wristHit(toolHand.ray);
      const cellId = wh ? this.panel.hit(wh.u, wh.v) : null;
      if (wh && !this.toolDown) {
        if (cellId !== this.panel.hovered()) { this.panel.setHover(cellId); if (cellId) pulse(session, toolName, 0.25, 20); }
        if (trigDown && cellId) { this.panelPressId = cellId; this.panel.setPressed(cellId); pulse(session, toolName, 0.6, 40); }
        if (trigUp && this.panelPressId) {
          if (cellId === this.panelPressId) this.opts.hud.pick(cellId);
          this.panelPressId = null; this.panel.setPressed(null);
        }
        r3.setPointerVisual(toolName, { length: wh.dist, color: 0x8b5cf6 });
        if (!this.toolDown) editor.pointerLeave();
      } else {
        if (this.panel.hovered()) this.panel.setHover(null);
        if (this.panelPressId && trigUp) { this.panelPressId = null; this.panel.setPressed(null); }
        // 指针帧：控制器射线（虚拟屏模型本身待反省——ai-docs/20260907-vr-input-reflection.md）；头向只喂平面挑选
        const headDir = xi.head ? rigDirToWorld(locomotion.pose(), forwardRig(xi.head.orientation)) : undefined;
        this.pointer.set(toolHand.ray, undefined, headDir);
        const c = this.pointer.cursor();
        const tp = () => ({ x: c.x, y: c.y, clientX: 0, clientY: 0, pointerType: "xr", shiftKey: false, travelPx: this.pointer.travelPx() });
        if (editor.tool === "select") {
          this.selectTick(trigDown, trig, trigUp, dt, session, toolName);
        } else if (!this.panelPressId) {
          if (trigDown) { this.pointer.markDown(); this.toolDown = true; editor.pointerDown(tp()); pulse(session, toolName, 0.5, 30); }
          else if (trigUp && this.toolDown) { this.toolDown = false; editor.pointerUp(tp()); pulse(session, toolName, 0.35, 25); }
          else editor.pointerMove(tp());
        }
        // 光标球：落在射线首个命中的膜（与拾取同源：实时世界含预演）；没命中 → 碰撞世界（地板等）→ 3 m
        let len = editor.pointerHitDistance(c.x, c.y);
        if (len === null) {
          const R = 300;
          const hit = locomotion.world.segmentHit(toolHand.ray.origin, { x: toolHand.ray.origin.x + toolHand.ray.dir.x * R, y: toolHand.ray.origin.y + toolHand.ray.dir.y * R, z: toolHand.ray.origin.z + toolHand.ray.dir.z * R });
          len = hit ? hit.t * R : 3;
        }
        r3.setPointerVisual(toolName, { length: len, color: this.toolDown ? 0xcc3333 : 0x2b6cb0 });
      }
    });

    // 5. 面板重画（状态行变了也重画）
    const hint = this.opts.hud.status();
    if (hint !== this.lastHint) { this.lastHint = hint; this.panel.dirty = true; }
    if (this.panel.redraw()) r3.updateWristTexture();
  }

  /** 选择工具：阶段长按（0.3 s 一震 = 膜 + 环边；0.6 s 二震 = 连通体；松手结算）；轻点 = 单选。 */
  private selectTick(trigDown: boolean, trig: boolean, trigUp: boolean, dt: number, session: XRSession, hand: "left" | "right"): void {
    const editor = this.opts.editor;
    const c = this.pointer.cursor();
    if (trigDown) { this.holdT = 0; this.holdStage = 0; this.pointer.markDown(); this.toolDown = true; }
    if (trig && this.toolDown) {
      this.holdT += dt;
      const hit = editor.pickAt(c.x, c.y);
      if (this.holdStage === 0 && this.holdT >= HOLD_STAGE1) { this.holdStage = 1; editor.selectExpand(hit, 1); pulse(session, hand, 0.7, 50); }
      else if (this.holdStage === 1 && this.holdT >= HOLD_STAGE2) { this.holdStage = 2; editor.selectExpand(hit, 2); pulse(session, hand, 0.9, 50); setTimeout(() => pulse(session, hand, 0.9, 50), 90); }
      return;
    }
    if (trigUp && this.toolDown) {
      this.toolDown = false;
      if (this.holdStage === 0) { editor.selectExpand(editor.pickAt(c.x, c.y), 0); pulse(session, hand, 0.35, 25); }
      this.holdStage = 0;
      return;
    }
    editor.pointerMove({ x: c.x, y: c.y, clientX: 0, clientY: 0, pointerType: "xr", shiftKey: false });
  }

  private attachReset(ref: XRReferenceSpace): void {
    if (this.resetAttached) return;
    this.resetAttached = true;
    ref.addEventListener("reset", (ev) => {
      const q = ev.transform?.orientation;
      if (!q) { this.pendingResetYaw = 0; return; }
      // 绕 Y（参考系竖轴）的 yaw：由四元数取 atan2
      const siny = 2 * (q.w * q.y + q.z * q.x), cosy = 1 - 2 * (q.y * q.y + q.x * q.x);
      this.pendingResetYaw = Math.atan2(siny, cosy);
    });
  }
}
