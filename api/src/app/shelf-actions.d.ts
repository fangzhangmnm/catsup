import type { Editor } from "../editor/editor.ts";
import { type Guid } from "../format/guid.ts";
import type { DefId } from "../scene/scene.ts";
export interface ShelfActionsDeps {
    readonly editor: Editor;
    notify(o: {
        text: string;
        level?: "info" | "warning" | "error";
    }): void;
    isEncrypted(bytes: Uint8Array): Promise<boolean>;
    unlock(blob: Blob): Promise<{
        plain: Blob;
    } | null>;
    after(): void;
}
export interface ShelfActions {
    /** 物件菜单「放上素材架」：选中的物件的组件。 */
    putSelected(): Promise<void>;
    /** 资源页的「上架」：一个组件。 */
    putDef(def: DefId): Promise<void>;
    /** 资源页的「上架」：一个材质（材质面板起的名本来就有）。 */
    putMaterial(guid: Guid): void;
    /** 资源页的「从别的模型导入素材…」：弹文件选择器（要在用户点按的同一拍里调）。 */
    pickImport(): void;
    /** 选好文件之后（测试 / 拖放也走这里）。 */
    importFile(file: File): Promise<void>;
}
export declare function createShelfActions(d: ShelfActionsDeps): ShelfActions;
