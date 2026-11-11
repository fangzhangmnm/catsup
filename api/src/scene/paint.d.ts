import type { DefId, Material, Scene } from "./scene.ts";
import { type TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
/** 第六节那几种动作碰到走画的面时的原因（拒绝之后场景一个字节不变）。 */
export declare const PAINT_CANT_MOVE = "\u5E26\u7740\u753B\u7684\u9762\u73B0\u5728\u8FD8\u642C\u4E0D\u4E86\uFF08\u753B\u8DDF\u7740\u9762\u642C\u5BB6\u662F\u540E\u9762\u7684\u4E00\u5F20\u5DE5\u5355\uFF09";
/** 这张面走哪一套贴图坐标（走画 = 那一套的 GUID；不走 = null）。 */
export declare function paintUvOf(s: Scene, def: DefId, f: number): Guid | null;
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
/** 搬的是什么：一个定义上的一摞面（不给 faces = 全部面）；或者一份粘贴的载荷（材质表 + 贴图 + 散面用到的材质编号）。 */
export type PaintMove = {
    readonly def: DefId;
    readonly faces?: Iterable<number>;
} | {
    readonly payload: {
        readonly materials?: readonly Material[];
        readonly textures?: readonly TextureDoc[];
        readonly faceMats?: Iterable<number>;
    };
};
/**
 * 「带着画的面现在还搬不了」唯一的判断（1-3b 第六节）：并物件、把面分成新物件、变成独立的、炸开网格体组件、网格体转硬表面、复制 / 粘贴（含跨文件）都调它。
 * 一个定义上的面：有一张走画 = 拒绝。粘贴的载荷：散面里有画的材质 = 拒绝；载荷带着一张画、它所属的定义在这份文件里没有（= 跨文件、要造一份新的）= 拒绝。
 * 同一份文件里复制整个物件的另一份摆放（实例）不受影响：它们本来就共用同一张画（载荷里那张画的定义在这份文件里就有）。
 * 返回原因 / null（放行）。
 */
export declare function paintMoveBlocked(s: Scene, what: PaintMove): string | null;
