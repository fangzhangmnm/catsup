import type { OverlayFaces } from "../../overlay/index.ts";
import type { MaterialRef } from "../../contract/stream.ts";
/** 槽节点里和高亮有关的三样（render3 的 SlotNodes 结构上满足）：sel 网格、面网格（借它的材质）、上次的键。 */
export interface SelHost {
    sel: any;
    plain: any;
    selKey: string; /** 风格认领选中时给的材质（Tron = Clu 橙）；null = 跟面同一个。 */
    selMat?: any;
}
export declare class OverlayFacesDrawer {
    private readonly scene;
    private readonly emptyGeo;
    private readonly texMat;
    private readonly textureFor;
    private readonly world;
    private worldKey;
    private tex;
    private visibleIds;
    /**
     * @param emptyGeo 后端共享的空几何（藏起来时挂它，不释放）
     * @param faceMatTop 覆盖层材质（世界坐标那份；在 render3 构造器里建，材质创建顺序不动）
     * @param texMat 建一份贴图覆盖层材质（懒建，第一次画带贴图的高亮时）
     * @param textureFor 材质 → three 贴图（render3 的贴图缓存）
     */
    constructor(scene: any, emptyGeo: any, faceMatTop: any, texMat: () => any, textureFor: (m: MaterialRef) => any);
    /** 探针：这个 id 的高亮这一帧画着没有。 */
    isVisible(id: string): boolean;
    sync(items: readonly OverlayFaces[], slots: ReadonlyMap<string, SelHost>): void;
}
