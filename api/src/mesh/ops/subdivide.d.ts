import { MeshKernel } from "../mesh-kernel.ts";
/** 裸线和孤立的点有几个（> 0 = 细分不做）。 */
export declare function looseBits(m: MeshKernel): number;
/** 细分一次（原地；id 全部重编）。返回新的面数。有裸线 / 孤立的点 = 抛。 */
export declare function catmullClark(m: MeshKernel): number;
/** 细分 levels 次。 */
export declare function subdivide(m: MeshKernel, levels?: number): number;
