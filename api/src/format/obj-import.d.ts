import type { ImportScene } from "./gltf-import.ts";
/** 读 OBJ 文本。name = 文件名（多个对象时外面包一层的名字）。没有任何面 → 抛（人话）。 */
export declare function readForeignObj(text: string, name: string): ImportScene;
