// tools/erase-face.ts —— 擦面（direct：点一下擦一张面，悬停就预演擦掉的样子）。几何模式的工具。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, FaceId } from "../../kernel/kernel.ts";
import { faceKey } from "../ops.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

function hoverFace(ctx: ToolCtx, s: { x: number; y: number }): FaceId | null {
  const view = ctx.live();
  const gf = ctx.pickFace(s.x, s.y);
  const c = gf !== undefined ? ctx.classify(view, { face: gf }) : { kind: "none" as const };
  const f = c.kind === "entity" ? (c.local.face ?? null) : null;
  ctx.setHoverFace(f);
  return f;
}

export class EraseFaceTool implements ToolHandler {
  readonly tool = "eraseFace" as const;
  readonly grammar = "direct" as const;
  readonly previewOnHover = true;   // 悬停就预演「擦掉这张面」
  private pressed = false;
  private hover_: FaceId | null = null;
  active(): boolean { return this.pressed; }
  cancel(): void { this.pressed = false; this.hover_ = null; }
  sample(): Record<string, number> { return {}; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { this.hover_ = hoverFace(ctx, s); }
  down(): void { this.pressed = true; }
  track(): void {}
  live(_ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.hover_ === null) return "";
    const id = this.hover_;
    run((c) => c.eraseFaces([id]));
    return "";
  }
  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    this.pressed = false;
    const view = ctx.live();
    const gf = ctx.pickFace(ev.x, ev.y);
    const c = gf !== undefined ? ctx.classify(view, { face: gf }) : { kind: "none" as const };
    this.hover_ = null; ctx.setHoverFace(null);
    const k = ctx.kernel();
    if (c.kind === "entity" && c.local.face !== undefined && k.face(c.local.face)) ctx.commitOp({ op: "eraseFaces", at: ctx.activePool(), faces: [faceKey(k, c.local.face)] });
  }
}
