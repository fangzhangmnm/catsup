import type { Pt3 } from "../kernel/geom.ts";
import type { PlaneParams } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, MeshBody } from "./scene.ts";
export type KindModeId = "geometry" | "surface" | "freeform";
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
/**
 * brep → mesh：一张膜 = 一张多边形面（环绕膜的法向 +n 逆时针 = 正面朝 +n，和 brep 渲染的正面一致）；带洞的膜三角化（mesh 的面不带洞），三角形之间的内部边软 + 平滑（看起来还是一张面）；
 * 边标记照搬（软 / 平滑 / 隐藏；折线 = 软 + 平滑）；悬空的边 = 裸线；隐藏的面照旧隐藏；材质槽照抄（正面那槽）；组里的几何一起并进来（组分区丢掉）。失败（某膜三角化不了）= 整个 cast 拒。
 */
export declare function brepToMesh(b: BrepBody): MeshBody;
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张）；不平的 n 边形折成平面块、块之间按 softDeg 变软；隐藏的面不带；材质不带（披露在 castsTo.loses）。
 */
export declare function meshToBrep(b: MeshBody, softDeg: number): BrepBody;
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）。 */
export declare function castBody(body: Body, to: BodyKind, opts?: {
    softDeg?: number;
}): Body;
