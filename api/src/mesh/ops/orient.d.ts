import { MeshKernel } from "../mesh-kernel.ts";
/**
 * 每个连通块从一张种子面出发（种子的朝向不动），沿流形边（恰两张面）传播：邻面过共享边必须和自己反向，不反就记一笔翻；
 * 块封闭（每条边恰两张面）且 outside ≠ false → 有向体积 < 0 时整块翻。翻的决定先全算完、最后一次 flipFaces（邻接只重建一次）。
 */
export declare function recalcNormals(k: MeshKernel, opts?: {
    outside?: boolean;
}): {
    flipped: number;
    components: number;
};
