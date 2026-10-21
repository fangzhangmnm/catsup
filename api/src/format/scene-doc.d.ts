import { Scene } from "../scene/scene.ts";
import type { CatsupDocument } from "./document.ts";
/** 文档 → 场景。 */
export declare function sceneFromDocument(doc: CatsupDocument): Scene;
/** 场景 → 文档（base = 打开时的文档，保留未知携带内容 / 设置 / 视图）。 */
export declare function documentFromScene(scene: Scene, name: string, base?: CatsupDocument | null): CatsupDocument;
