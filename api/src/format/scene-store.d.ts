import { type Ref } from "../identity/kinds.ts";
import { type Bundle, type MergePlan } from "../identity/graph.ts";
import { type EntryStore } from "../identity/store.ts";
import { type Guid } from "../identity/guid.ts";
import type { DefId, Scene } from "../scene/scene.ts";
import type { CatsupDocument } from "./document.ts";
export interface SceneStore extends EntryStore {
    defIdOf(g: Guid): DefId | undefined;
}
export declare function sceneStore(s: Scene): SceneStore;
/** 纯文档的店（素材导入只读那份文件）。 */
export declare function docStore(doc: CatsupDocument): EntryStore;
/** 落地之后怎么认：GUID → 这个场景的句柄（定义 DefId、材质下标 / 内置背面句柄、层 id）；断开过的按新身份认。guidOf = 这条引用落地之后的 GUID。 */
export interface Landing {
    idOf(r: Ref): number | undefined;
    guidOf(r: Ref): Guid;
}
/**
 * 按计划把条目装进场景（设计书 §6）：材质 / 层先进表，定义走 materializeDefinitions（和打开文件同一份）。
 * 新建带原 GUID；断开的先铸新（自己 + 附属 + 引用）；更新原地换身体（句柄 / GUID 不变，摆着的每一份自然跟上）、材质原地换条；层永不更新（计划里不会有）。
 * 打开文件不走这里：那是整张表原样装（下标 / 层代号字节级不变），没有要决定的事，直接调 materializeDefinitions。
 */
export declare function applyPlan(s: Scene, bundle: Bundle, p: MergePlan): Landing;
/** 做成唯一（SketchUp Make Unique）：这一条铸新身份、内部的组 / 实例也铸新；摆着的子组件、材质、层不变（断开的同一份声明）。返回新句柄。 */
export declare function uniqueCopy(s: Scene, id: DefId): DefId;
