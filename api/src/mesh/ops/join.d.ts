import { MeshKernel } from "../mesh-kernel.ts";
/**
 * 并面（溶解边 e）：e 恰两张不同的面 → 合成一张（fa 保 id、fb 删、e 删）。
 * 合环：把两个环都旋到「以共享边结尾」[…, x, y]；两面绕向一致时 fb 走的是 y→x，fb 的中段 b0…bm 接在 x 后面、y 前面；绕向不一致（fb 也走 x→y）则中段倒着接。
 * 两面共享不止一条边（合出来的环有重复点）→ 抛，不悄悄做。
 */
export declare function joinFaces(k: MeshKernel, e: number): number;
/** 溶解二度点 v（只连两条边）：从它所有的面的环里去掉、两邻居连一条边；某张面会少于 3 点 → 抛。返回新边。 */
export declare function dissolveVertex(k: MeshKernel, v: number): number;
