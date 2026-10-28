import type { Command, MeshUnit } from "../commands/command.ts";
import type { Family } from "../commands/action.ts";
/** 连线（Blender J = Connect Vertex Path 的两点版；user 10-27「blender里面选择两个点之后ctrl j 是连线对吧」——是 J，Ctrl+J 是合并物体）：同一张面上的两个点之间切一刀。 */
export declare const connect: Command<MeshUnit>;
export declare const loopCut: Command<MeshUnit>;
export declare const meshEdits: Family;
