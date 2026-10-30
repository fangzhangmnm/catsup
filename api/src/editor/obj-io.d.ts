import type { FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
export interface ObjExportOpts {
    /** 带洞面的三角化（世界坐标）。缺省 → 带洞面只导出外环（洞丢失，导出文本里留注释）。 */
    triangulateHoled?: (k: GeomView, id: FaceId) => [Pt3, Pt3, Pt3][];
    /** 写进文件头的版本戳。 */
    version?: string;
}
export declare function exportObj(k: GeomView, opts?: ObjExportOpts): string;
