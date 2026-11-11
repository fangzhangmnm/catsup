import type { DefId, Material, Scene, UvSetRow } from "./scene.ts";
import { type TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
/** 第六节那几种动作碰到走画的面时的原因（拒绝之后场景一个字节不变）。 */
export declare const PAINT_CANT_MOVE = "\u5E26\u7740\u753B\u7684\u9762\u73B0\u5728\u8FD8\u642C\u4E0D\u4E86\uFF08\u753B\u8DDF\u7740\u9762\u642C\u5BB6\u662F\u540E\u9762\u7684\u4E00\u5F20\u5DE5\u5355\uFF09";
/** 这张面走哪一套贴图坐标（走画 = 那一套的 GUID；不走 = null）。 */
export declare function paintUvOf(s: Scene, def: DefId, f: number): Guid | null;
/**
 * 这张画铺在哪（画板登记处跟着坐标改大小、垫底色用；贴图主线 1-3c）：贴图表里这一行是画、有材质的颜色那一槽指着它、它铺的那个定义的 uvSets 里有那一套
 * → 定义、那一套、指着它的第一个材质（底色）；差一样 = null。layout 照旧只经 paintIn 读。
 */
export declare function paintPlaceOf(s: Scene, texture: Guid): {
    def: DefId;
    uvSet: UvSetRow;
    material: Material;
} | null;
/**
 * 规矩（进场景的自检，和 MeshKernel.check() 一起跑；1-3b 第一节）：uvSets 表里每一行，内核里有同 GUID、每角两个数的列；这一列上有值的角都落在画布里
 * （横 0 到宽、纵 0 到高）。返回毛病（空 = 好）。
 */
export declare function paintIssues(s: Scene, def: DefId): string[];
/** 网格体的全部自检：内核的不变量 + 画的规矩。 */
export declare function meshBodyIssues(s: Scene, def: DefId): string[];
/**
 * 走画、但在那一套贴图坐标上还没有值的面（按那一套分；面按编号升序）。candidates = 只看这些面（改动日志给的这一步动过的面）；null = 看全部（日志记不得了）。
 * 「要么有位置，要么明着报出来放不下」：收尾补完之后还剩在这里的，就是放不下的。
 */
export declare function unplacedPaintFaces(s: Scene, def: DefId, candidates: Iterable<number> | null): Map<Guid, number[]>;
/**
 * 搬的是什么：一个定义上的一摞面（给 faces）；整个定义（不给 faces：并物件 / 炸开 / 转硬表面 / 变成独立的 / 粘贴「更新」换掉它的身体）；
 * 或者一份粘贴的载荷（材质表 + 贴图 + 散面用到的材质编号 + 这一贴要新建 / 更新的定义各自的槽表 + 要被换掉身体的现有定义）。
 */
export type PaintMove = {
    readonly def: DefId;
    readonly faces?: Iterable<number>;
} | {
    readonly payload: {
        readonly materials?: readonly Material[];
        readonly textures?: readonly TextureDoc[];
        readonly faceMats?: Iterable<number>;
        readonly defSlots?: Iterable<readonly (Guid | null)[]>;
        readonly replaces?: Iterable<DefId>;
    };
};
/**
 * 「带着画的面现在还搬不了」唯一的判断（1-3b 第六节 + 审后补）：并物件、把面分成新物件、变成独立的、炸开网格体组件、网格体转硬表面、复制 / 粘贴（含跨文件）都调它。
 * · 一摞面：有一张走画 = 拒。
 * · 整个定义：带着贴图坐标（uvSets 不空，不管现在有没有面走画——从画换走的面角上的数还留着）= 拒：文件形状（definitionToDoc）还不带贴图坐标，搬过去就悄悄丢了。
 * · 粘贴的载荷：散面里有画的材质 = 拒；这一贴要新建（跨文件 / 「断开」铸新身份）或更新的定义，槽表里有画的材质 = 拒（画会落到别的定义里、或者跟着换掉的身体丢了）；
 *   要被「更新」换掉身体的现有定义带着贴图坐标 = 拒。同一份文件里贴整个物件的另一份摆放（留这里的那条）不受影响：它们本来就共用同一张画。
 * 返回原因 / null（放行）。
 */
export declare function paintMoveBlocked(s: Scene, what: PaintMove): string | null;
