import type { DefId, Material, MeshBody, Scene, UvSetRow } from "./scene.ts";
import { type TextureDoc } from "../format/document.ts";
import type { Guid } from "../format/guid.ts";
/** 这个网格体在哪几套排法上（网格体上的速查表；施工单十八第 1½ 刀起 = MeshBody.uvSetSlots，scene/uv.ts）。 */
export declare const uvSetsOf: (b: MeshBody) => readonly Guid[];
/** 第六节那几种动作碰到走画的面时的原因（拒绝之后场景一个字节不变）。 */
export declare const PAINT_CANT_MOVE = "\u8FD9\u4E9B\u9762\u4E0A\u6709\u753B\uFF1A\u5E26\u7740\u753B\u7684\u9762\u73B0\u5728\u8FD8\u4E0D\u80FD\u5E76\u8FDB\u522B\u7684\u7269\u4EF6\u3001\u5206\u51FA\u53BB\u3001\u505A\u6210\u552F\u4E00\u3001\u590D\u5236\u7C98\u8D34\u3001\u70B8\u5F00\u6216\u8005\u8F6C\u6210\u786C\u8868\u9762\uFF08\u8FD9\u4E2A\u529F\u80FD\u8FD8\u6CA1\u505A\uFF09";
/** 粘贴带着贴图坐标（或挂在排法上的画），而那几套排法在这份文件里没有：粘贴的载荷还不带排法那一行（第 1 版第五节 2½ 第三稿第 3 条：带不过去在那一步明说，不悄悄丢）。 */
export declare const PASTE_UV_ROWS_MISSING = "\u8FD9\u4E00\u8D34\u5E26\u7740\u8D34\u56FE\u5750\u6807\uFF0C\u5B83\u4EEC\u7684\u6392\u6CD5\u8FD9\u4EFD\u6587\u4EF6\u91CC\u6CA1\u6709\uFF1A\u7C98\u8D34\u73B0\u5728\u8FD8\u5E26\u4E0D\u8FC7\u53BB\u6392\u6CD5\uFF0C\u6CA1\u8D34\uFF08\u540C\u4E00\u4EFD\u6587\u4EF6\u91CC\u8D34\u7167\u5E38\uFF1B\u8981\u642C\u5230\u522B\u7684\u6587\u4EF6\uFF0C\u5148\u8F6C\u6210\u786C\u8868\u9762\u3014\u8D34\u56FE\u5750\u6807\u4F1A\u4E22\uFF0C\u8F6C\u4E4B\u524D\u4F1A\u5217\u51FA\u6765\u3015\u518D\u62F7\uFF09";
/** 这张面走哪一套贴图坐标（走画 = 那一套的 GUID；不走 = null）。 */
export declare function paintUvOf(s: Scene, def: DefId, f: number): Guid | null;
/**
 * 这个物件有没有一张面走画（施工单十八第 2 刀：「开始画过没有」只看面，不看网格体的速查表——画过的面全换成普通材质之后，速查表还留着那一套）。
 * texture = 只算走这张画的（2b：一张画在哪几个物件上）；不给 = 走哪张画都算。先按材质槽筛（没有一个槽是那样的画 = 没有，不走面）；有才走面，碰到第一张就停。
 */
export declare function anyFaceWalksPaint(s: Scene, def: DefId, texture?: Guid): boolean;
/**
 * 这张画铺在哪套排法上（画板登记处跟着坐标改大小、垫底色用；存盘裁高；贴图主线 1-3c）：贴图表里这一行是画、有材质的颜色那一槽指着它、它挂的排法在场景的排法表里
 * → 那一套、指着它的第一个材质（底色）；差一样 = null。layout 照旧只经 paintIn 读。
 * 施工单十八第 2 刀 b：不再给「那个定义」——一套排法上可以有好几个物件的面（哪几个 = paintDefsOf）；也不再要求有网格体带着那一列（排法在表里就算铺着）。
 */
export declare function paintPlaceOf(s: Scene, texture: Guid): {
    uvSet: UvSetRow;
    material: Material;
} | null;
/** 这张画画在哪几个物件上（有一张面走这张画的定义，按编号；没有摆放的定义也算）。空间里的笔、画画工作台列画、画布小窗都问这个（施工单十八第 2 刀 b）。 */
export declare function paintDefsOf(s: Scene, texture: Guid): DefId[];
/**
 * 一张画在哪（画板登记处：画板在不在、底色、能不能变热、给渲染器什么图；存盘：底色。施工单二十一第 3 刀）：两种——
 * uv = 铺在一套贴图坐标上的（就是 paintPlaceOf）；tiled = 平铺的画（CATSUP_textures 1.2：有材质的颜色那一槽指着它、分层 + sizeM、没有 layout）→ sizeM 和指着它的第一个材质。
 * 平铺的画没有坐标：画布大小写在它自己的分层字节里（新建时就编好空白的，editor/paint-ops.ts addTiledPaint），不跟谁改大小。
 */
export type BoardPlace = ({
    readonly kind: "uv";
} & NonNullable<ReturnType<typeof paintPlaceOf>>) | {
    readonly kind: "tiled";
    readonly sizeM: readonly [number, number];
    readonly material: Material;
};
export declare function boardPlaceOf(s: Scene, texture: Guid): BoardPlace | null;
/**
 * 规矩（进场景的自检，和 MeshKernel.check() 一起跑；施工单十八第 1½ 刀改成看速查表和代号）：速查表里每个号在场景的排法表里有那一行、画布宽高是正整数；
 * 每张面的代号在 −1…速查表长度之间；有位置的面角都落在那张画布里（横 0 到宽、纵 0 到高）。返回毛病（空 = 好）。
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
        readonly faceMats?: Iterable<number>; /** 这一贴要新建 / 更新的定义：各自的槽表 + 面上用到的槽号（只看面用着的那几槽）。 */
        readonly defFaces?: Iterable<PayloadDefFaces>;
        readonly replaces?: Iterable<DefId>; /** 这一贴要新建 / 更新的定义的贴图坐标 + 要新建的画挂的排法里，这份文件的排法表里没有的几套（载荷不带排法那一行）。 */
        readonly uvRowsMissing?: number;
    };
};
/** 载荷里一个定义的槽表 + 它的面用到的槽号（网格体 = MeshDoc.faceMat，硬表面 = 面层 material，组里的也算）。 */
export interface PayloadDefFaces {
    readonly slots: readonly (Guid | null)[];
    readonly used: Iterable<number>;
}
/**
 * 「带着画的面现在还搬不了」唯一的判断（1-3b 第六节 + 审后补；第 1 版施工单第五节 2½ 第三稿改成只问「有没有面在显示画」）：
 * 并物件、把面分成新物件、变成独立的、炸开网格体组件、网格体转硬表面、复制 / 粘贴（含跨文件）都调它。
 * · 一摞面：有一张走画 = 拒。
 * · 整个定义：有一张面走画（anyFaceWalksPaint）= 拒。只带着贴图坐标（速查表、角上的数还在）、没有面显示画 = 普通网格体，放行：贴图坐标在网格体之间跟着面走，
 *   带不过去的路（转硬表面；剪贴板拷散面）在那一步自己的询问 / 提示里明说（统筹 11-13 夜，user「原则上现在不用丢 UV」）。
 * · 粘贴的载荷：散面里有画的材质 = 拒；这一贴要新建（跨文件 / 「断开」铸新身份）或更新的定义，面用着的槽里有画的材质 = 拒（画会落到别的定义里、或者跟着换掉的身体丢了）；
 *   要被「更新」换掉身体的现有定义有面走画 = 拒。同一份文件里贴整个物件的另一份摆放（留这里的那条）不受影响：它们本来就共用同一张画。
 *   另一条不是画的原因（PASTE_UV_ROWS_MISSING）：载荷还不带排法那一行，带着的贴图坐标 / 画指着这份文件里没有的排法 = 拒（贴进来存盘会抛：scene-doc 写的时候核速查表）。
 * 返回原因 / null（放行）。
 */
export declare function paintMoveBlocked(s: Scene, what: PaintMove): string | null;
