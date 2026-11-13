import type { MeshKernel } from "../mesh-kernel.ts";
import { type MeshSel } from "./duplicate.ts";
import type { Pt3 } from "../../kernel/geom.ts";
export type FacePlan = {
    readonly kind: "fill";
} | {
    readonly kind: "ring";
    readonly ring: readonly number[];
    readonly how: "chain" | "quad" | "points" | "strip" | "corner";
    /** 填完选区落在哪（顺着填：四边形 = 新的对边、从边来的三角 = 对着原边的点、从点来的三角 = 对着那个点的边）；缺 = 选新面。按点说（新边的编号造了才有）。 */
    readonly after?: {
        readonly edge: readonly [number, number];
    } | {
        readonly vert: number;
    };
} | {
    readonly kind: "edge";
    readonly a: number;
    readonly b: number;
};
/**
 * 顺着填（统筹 11-13，user「选中一条边F可以顺着边流往下填」）= 照抄 Blender「Face from Single Vertex or Edge」：
 * 手册（New Edge/Face from Vertices 那一页，projects.blender.org/blender/blender-manual 的 manual/modeling/meshes/editing/vertex/make_face_edge.rst）原文：
 * 「If only a single vertex or edge is selected on the boundary of a hole, Blender creates a face using the neighboring edges.」
 * 「In addition, only the new edge is selected afterwards, making it possible to create another face right away.」
 * 细则对着 Blender 源码 source/blender/editors/mesh/editmesh_tools.cc 的 edbm_add_edge_face_exec__tricky_extend_sel / edbm_add_edge_face_exec__vert_edge_lookup /
 * edbm_add_edge_face_exec__tricky_finalize_sel 三个函数核的：
 *   · 只选着一条边：两头各「除了这条边，正好一条」开口边或裸线、不和这条边挨同一张面 → 远端不同 = 四边形、同一个点 = 三角；填完四边形只选新的对边、三角只选对着原边的点。
 *   · 只选着一个点：正好两条开口边或裸线（两条同是裸线或同是开口边）、不挨同一张面 → 拐角三角；填完只选对着这个点的边。
 * 一头零条 / 两条以上 = 不顺着填，说哪一头怎么了（不说「点不够」）。
 * 「一个点」那一半 user 没点名、统筹转告后说不用拿掉 → 单独一个开关（FILL_CORNER_FROM_VERTEX），要关只关它。
 */
export declare const FILL_CORNER_FROM_VERTEX = true;
/** 选区说的是哪一种面（只读）。eye = 本地坐标的眼睛位置（旁边没有面时朝它）；null = 不管。 */
export declare function planMakeFace(k: MeshKernel, sel: MeshSel, eye: Pt3 | null): FacePlan | string;
