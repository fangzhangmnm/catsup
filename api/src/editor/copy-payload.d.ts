import type { EdgeId, FaceId, Kernel } from "../kernel/kernel.ts";
import type { Xform } from "../scene/xform.ts";
import type { CopyPayload } from "./tool-handler.ts";
export declare function copyPayloadOf(k: Kernel, XL: Xform, entities: {
    faces: readonly FaceId[];
    edges: readonly EdgeId[];
}): CopyPayload | null;
