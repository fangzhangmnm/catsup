import type { Command, MeshUnit } from "../commands/command.ts";
import type { Scene } from "../../scene/scene.ts";
/** 这个物体上走画的面（不看选区：物件级）。 */
export declare function paintedFaces(s: Scene, def: number): number[];
export declare const dropPaint: Command<MeshUnit>;
