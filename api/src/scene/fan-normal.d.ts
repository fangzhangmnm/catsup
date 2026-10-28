import type { FaceId, Pt3 } from "../kernel/kernel.ts";
import type { GeomView } from "./world-view.ts";
/** 扇内法线要看的（内核和场景视图都满足：渲染的池网格用内核、平铺路径用场景视图、网格体导出用网格视图）。 */
export type FanView = Pick<GeomView, "face" | "planeOf" | "isSmooth" | "isFold"> & {
    readonly graph: Pick<GeomView["graph"], "pt" | "edge">;
};
/**
 * 面 fid 外环第 j 个角的平滑法线：从这张面出发，在这个顶点处向两边跨平滑边 / 折线（硬边、边界、非流形就停），把扇里每张面的法向按内角加权；
 * 跨边时按「两张面在共享边上面在左的符号相反 = 朝向一致」统一朝向（kernel/flood.ts faceLeftSign）。结果翻到本面法向那一侧。扇里只有自己 = 平面法向。
 */
export declare function fanNormal(k: FanView, fid: FaceId, j: number): Pt3;
