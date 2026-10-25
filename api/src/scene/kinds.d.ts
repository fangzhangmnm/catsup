import type { Pt3 } from "../kernel/geom.ts";
import type { PlaneParams } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, MeshBody } from "./scene.ts";
export type KindModeId = "geometry" | "surface";
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
/** brep → mesh：每张膜按 triangulateRings 三角化，材质槽照抄，每三角记面的材质槽。失败（某膜三角化不了）= 整个 cast 拒。 */
export declare function brepToMesh(b: BrepBody): MeshBody;
/** 显式 cast（op 层调用）：只认登记表里的方向。 */
export declare function castBody(body: Body, to: BodyKind): Body;
