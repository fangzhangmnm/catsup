import { Scene, type DefId, type Material } from "../scene/scene.ts";
import type { CatsupDocument, DefinitionDoc, MaterialDoc } from "./document.ts";
import { type Guid } from "./guid.ts";
import type { DefinitionEntry } from "./entry-kinds.ts";
/** materializeDefinitions 的两处差别：整份文件 vs 从别的文件搬几条。 */
export interface MaterializeOpts {
    /** 这一条已经在场景里、但身体要装（sceneFromDocument 的根：构造器先造了空的）。 */
    readonly fillExisting?: Guid;
    /** 实例上的层代号就是这个场景的层 id（打开文件 / 做成唯一：同一张层表）。缺 = 经条目自己的对照表按 GUID 认（层已经先进表了，format/scene-store.ts applyPlan）；认不出 = 这一份不归层。 */
    readonly sameLayerTable?: boolean;
    /** 这几条已经在场景里、要原地换身体（粘贴选了「用拷来的更新」，设计书 §6）：句柄 / GUID 不变，摆着的每一份自然跟上。 */
    readonly update?: ReadonlySet<Guid>;
}
/**
 * 把文件形状的定义装进场景（打开文件、跨文件粘贴、做成唯一同一份代码，计划书 §15.1-A）：已经有同 GUID 的跳过；其余带原 GUID 新建，它内部的组 / 子实例也保留 GUID（是这一条的内部结构）。
 * 要装谁由身份层决定（identity/graph.ts plan）。materialOf = 材质 GUID → 下标（槽表换算；内置背面这里先认常量）。返回：这张场景里全部定义的 GUID → 句柄。
 */
export declare function materializeDefinitions(scene: Scene, entries: readonly DefinitionEntry[], materialOf: (g: Guid) => number, opts?: MaterializeOpts): Map<Guid, DefId>;
/** 文档 → 场景（打开 = 往空店里落地；整张表原样装，没有要决定的事，不走 plan）。 */
export declare function sceneFromDocument(doc: CatsupDocument): Scene;
/** 写的时候指着的东西不在、只好不写（实例的定义没了 / 槽号指不到材质）：已知的路走不到；真走到了 = 软件的毛病，调用方记账、说出来（统筹 11-12，存盘忠实度清点 W2、W3）。 */
export type WriteDrop = (what: "instance" | "materialSlot", detail: string) => void;
/** 一个定义 → 文件形状（documentFromScene 和跨文件载荷的闭包同一份）。onDrop = 上面那两种兜底真走到时告诉调用方（整份存盘传，别的读面不传）。 */
export declare function definitionToDoc(scene: Scene, id: DefId, name?: string, onDrop?: WriteDrop): DefinitionDoc;
/** 场景 → 文档（base = 打开时的文档，保留未知携带内容 / 设置 / 视图）。 */
/** name：以前用来把根改成文件名，2026-11-13 起不再用（根和别的物体一样叫自己的名字）；调用的地方多（测试 / 冻样本脚本），签名先留着。 */
export declare function documentFromScene(scene: Scene, _name: string, base?: CatsupDocument | null, onDrop?: WriteDrop): CatsupDocument;
export declare const materialFromDoc: (m: MaterialDoc) => Omit<Material, "guid"> & {
    guid: Guid;
};
export declare const materialToDoc: (m: Material) => MaterialDoc;
