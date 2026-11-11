import type { PaintTarget } from "./space-target.ts";
import type { Scene } from "../scene/scene.ts";
import type { WorldView } from "../scene/world-view.ts";
import type { Guid } from "../format/guid.ts";
export declare function paintTargets(world: WorldView, scene: Scene, texture: Guid, canvas: {
    readonly width: number;
    readonly height: number;
}): PaintTarget[];
