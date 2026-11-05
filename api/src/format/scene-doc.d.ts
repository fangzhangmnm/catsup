import { Scene, type DefId } from "../scene/scene.ts";
import type { CatsupDocument, DefinitionDoc } from "./document.ts";
import { type Guid } from "./guid.ts";
/**
 * 这些文件形状的定义里，从 roots 往下走真要新建的（场景里有同 GUID 的 = 用场景那条，**它下面的不再看**：不比内容；不然目标的旧版用不上的子组件会被建出来当孤儿）。计划书 §15.1-B。
 */
export declare function definitionsToMake(scene: Scene, defs: readonly DefinitionDoc[], roots: Iterable<Guid>): DefinitionDoc[];
/** materializeDefinitions 的两处差别：整份文件 vs 从别的文件搬几条。 */
export interface MaterializeOpts {
    /** 这一条已经在场景里、但身体要装（sceneFromDocument 的根：构造器先造了空的）。 */
    readonly fillExisting?: Guid;
    /** 文件里实例上的层代号 → 这个场景的层 id（缺 = 原样：装整份文件时层表就是这张）；undefined = 这一份不归层。 */
    readonly layerOf?: (code: number) => number | undefined;
}
/**
 * 把文件形状的定义装进场景（打开文件和跨文件粘贴同一份代码，计划书 §15.1-A）：已经有同 GUID 的跳过（用场景那条，不比内容，§15.1-B）；其余带原 GUID 新建，它内部的组 / 子实例也保留 GUID（是这一条的内部结构）。
 * materialOf = 材质 GUID → 下标（槽表换算；内置背面由调用方的函数负责时返回 −2，这里先认常量）。返回：这张场景里全部定义的 GUID → 句柄。
 */
export declare function materializeDefinitions(scene: Scene, defs: readonly DefinitionDoc[], materialOf: (g: Guid) => number, opts?: MaterializeOpts): Map<Guid, DefId>;
/** 文档 → 场景。 */
export declare function sceneFromDocument(doc: CatsupDocument): Scene;
/** 一个定义 → 文件形状（documentFromScene 和跨文件载荷的闭包同一份；name = 根用文件名）。 */
export declare function definitionToDoc(scene: Scene, id: DefId, name?: string): DefinitionDoc;
/** 场景 → 文档（base = 打开时的文档，保留未知携带内容 / 设置 / 视图）。 */
export declare function documentFromScene(scene: Scene, name: string, base?: CatsupDocument | null): CatsupDocument;
