import type { FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
export interface ObjExportOpts {
    /** 带洞面的三角化（世界坐标）。缺省 → 带洞面只导出外环（洞丢失，导出文本里留注释）。 */
    triangulateHoled?: (k: GeomView, id: FaceId) => [Pt3, Pt3, Pt3][];
    /** 写进文件头的版本戳。 */
    version?: string;
}
export declare function exportObj(k: GeomView, opts?: ObjExportOpts): string;
export interface ObjParseResult {
    segs: [Pt3, Pt3][];
    vertices: number;
    faces: number;
    looseLines: number;
}
/**
 * 解析 OBJ 成线段集（每个多边形的边 + `l` 线；去重）。maxSegments 之上直接拒收——
 * 三角汤网格进肥皂膜内核 = 每个三角一张膜，慢且无意义；逃生口只接「多边形建模」量级。
 */
export declare function parseObjSegments(text: string, opts?: {
    maxSegments?: number;
}): ObjParseResult;
