import type { Command, MeshUnit } from "../commands/command.ts";
import type { Scene } from "../../scene/scene.ts";
/** 开始画时能选的画布边长（2026-11-11 user「我会一直很抠用128 256，但是normie可能是1k起步，或者无脑2k」）。 */
export declare const CANVAS_SIZES: readonly [128, 256, 512, 1024, 2048];
/** 这一次要开始画的面：选中的面（没选 = 物件全部的面，但物件已经有画了就不算——那时候直接能画），已经走画的面跳过。 */
export declare function facesToStart(s: Scene, u: Pick<MeshUnit, "def" | "sel">): number[];
export declare const startPaint: Command<MeshUnit>;
/** 这个物件上的画（贴图表里的先后）：每张 = 贴图身份、名字、它的材质在文档材质表里的下标、它那一套坐标（宽高、密度、GUID）。 */
export declare function paintsOf(s: Scene, def: number): {
    tex: string;
    name: string;
    material: number;
    uvSet: {
        guid: string;
        width: number;
        height: number;
        pxPerM: number;
        fit?: "density";
    };
}[];
/** 这个物件上最近建的那张画（贴图表里最后一张走它的）；没有 = null。 */
export declare function latestPaintOf(s: Scene, def: number): {
    tex: string;
    material: number;
} | null;
/** 选中的面里还没进画的那几张（物件已经有画时「把这几张面加进来」用；没选 = 没有）。 */
export declare function unpaintedSelected(s: Scene, u: Pick<MeshUnit, "def" | "sel">): number[];
/**
 * 「加进已有的画」（施工单十五第三节）：物件已经有画、选中的面里有还没进画的 → 给它们换上那张画（参数 tex = 贴图身份；缺 = 最近那张）的材质（meshPaintFaces）；
 * 画的维护那一步（paint-upkeep）按那张画布的宽、用那张画自己的密度把它们补铺上（layoutAppend，留的格数跟着画布走）。不问大小。
 */
export declare const paintAddFaces: Command<MeshUnit>;
