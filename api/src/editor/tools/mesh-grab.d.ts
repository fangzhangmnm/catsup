import type { Pt3 } from "../../kernel/geom.ts";
import type { ToolCtx } from "../tool-handler.ts";
export declare function grabPointOn(ctx: ToolCtx, sx: number, sy: number, moving: ReadonlySet<number>): Pt3 | null;
