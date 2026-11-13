import { type PlaneParams, type Pt3 } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, DefId, MeshBody, Scene } from "./scene.ts";
export type KindModeId = "geometry" | "surface" | "freeform" | "paint";
export interface AlignGeometry {
    points: Pt3[];
    segments: [Pt3, Pt3][];
    planes: PlaneParams[];
}
export interface KindDef<B extends Body = Body> {
    readonly id: BodyKind;
    readonly label: string;
    /** 这种身体可用的编辑模式（空 = 只在物体层摆）。 */
    readonly modes: readonly KindModeId[];
    /** 显式 cast 的去向 + 丢失清单（确认面文案的来源）。 */
    readonly castsTo: readonly {
        to: BodyKind;
        loses: readonly string[];
    }[];
    alignGeometry(body: B): AlignGeometry;
    bounds(body: B): {
        min: Pt3;
        max: Pt3;
    } | null;
}
export declare const BREP_KIND: KindDef<BrepBody>;
export declare const MESH_KIND: KindDef<MeshBody>;
export declare const KINDS: Readonly<Record<BodyKind, KindDef>>;
export declare const kindOfBody: (b: Body) => KindDef;
export declare function canCast(from: BodyKind, to: BodyKind): {
    ok: true;
    loses: readonly string[];
} | {
    ok: false;
    why: string;
};
/** 转网格体要披露的数（计划书 §9.2½ ②：转换不问，只报）：N 张面两侧都出（= 两张叠着的面）、其中 M 张材质不同、K 张两侧都是默认背面（转过去就没了）。隐藏的面照算（隐藏照样转）。 */
export interface BrepSideCounts {
    both: number;
    differ: number;
    neither: number;
}
/**
 * 一份算法两处用（计划书 §12 C3）：N 张面两侧都出、其中 M 张两侧材质不同、K 张两侧都是默认背面（整张不出）。按材质比，不按槽号比（和 bake 看到的一样）。
 * skipHidden = 隐藏的面不算（导出：bake 不出隐藏面）；转网格体隐藏的照转，所以照算。
 */
export declare function brepSideCounts(b: BrepBody, opts?: {
    skipHidden?: boolean;
}, into?: BrepSideCounts): BrepSideCounts;
/** 导出表单的说明行：从根（或选中物件的定义）沿实例引用走一遍，一份定义只算一次；网格体的面 = 文件里的面，一张面一个朝向，不算。O(这些定义的面数)，不序列化模型。 */
export declare function exportSideCounts(s: Scene, only?: readonly DefId[]): BrepSideCounts;
/**
 * brep → mesh（单面 / 双面第四版，计划书 §2.9 / §9.2-F；user 11-04「要出几侧就几张面」）：每张膜按侧出面，绕向 = 那一侧朝外（网格体一张面一个朝向）；两侧都出 = 两张重合反向的面（共用点）；默认背面不出。
 * 带洞的膜三角化（mesh 的面不带洞），三角形之间的内部边软 + 平滑（看起来还是一张面）；边标记照搬（软 / 平滑 / 隐藏；折线 = 软 + 平滑）；悬空的边 = 裸线；隐藏的面照旧隐藏；组里的几何一起并进来（组分区丢掉）。失败（某膜三角化不了）= 整个 cast 拒。
 * 不再做法向一致化（recalcNormals）：哪侧朝外是用户看得见、自己定的（默认背面 / 修复「自动朝外」），不猜。
 */
export declare function brepToMesh(b: BrepBody): MeshBody;
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张；两侧不一样的不并）；不平的 n 边形折成平面块、块之间按 softDeg 变软。
 * 两侧（计划书 §2.9「这是这种身体的表示法」）：环朝的那侧 = 它的材质 / 默认正面，另一侧 = 默认背面；重合反向的两张面并成一张膜、材质各落各侧。brep → mesh → brep 两侧都保住。
 * 藏（统筹 11-13 b；以前藏着的面不带 = 悄悄少了）：藏着的面照转、膜照藏，藏着的边照藏（carryMeshSides / carryHiddenEdges）；藏没藏不一样的不并、藏着的边不并掉。
 * 带不过去的两种数在返回值里（mixedHidden = 和露着的面合成一张膜、只好露出来的藏面张数；lostHiddenEdges = 对不上的藏边条数）：「转回硬表面体」转之前问（meshToBrepCheck）。
 */
export declare function meshToBrepWith(b: MeshBody, softDeg: number): {
    body: BrepBody;
    mixedHidden: number;
    lostHiddenEdges: number;
};
export declare function meshToBrep(b: MeshBody, softDeg: number): BrepBody;
/**
 * 「转回硬表面体」转之前要问的数（统筹 11-13 b：带不过去的转之前明着说、让人选）：和真转是同一份算法（照转一遍、只要数）。
 * 网格体上一张藏面、一条挨面的藏边都没有 = 不用转就知道是 0（不藏东西的网格体不多花时间）。
 */
export declare function meshToBrepCheck(b: MeshBody, softDeg: number): {
    mixedHidden: number;
    lostHiddenEdges: number;
};
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）。 */
export declare function castBody(body: Body, to: BodyKind, opts?: {
    softDeg?: number;
}): Body;
