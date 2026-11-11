import type { Keypoint } from "./border.ts";
import type { BridgeDebug } from "./closing.ts";
export interface FlatColoringParams {
    /** 白底合成亮度 ≤ 此值（0..255）判为笔画 */
    binarizeThreshold: number;
    /** 法线平滑核半径 L */
    kernelL: number;
    /** 端点曲率阈值 θκ */
    thetaKappa: number;
    /** 样条配对最大距离 px（≤0 关闭） */
    dmax: number;
    /** 法线对置容差角（度） */
    alphaDeg: number;
    /** 样条切线系数 ρ */
    rho: number;
    /** 最小允许背景区面积 */
    amin: number;
    /** 补段最大长度 px（≤0 关闭） */
    smax: number;
    /** 每端点最多闭合笔画数 */
    cmax: number;
    /** 粗笔自动细化（腐蚀到几 px 再分析；论文 §3） */
    erode: boolean;
}
export declare const DEFAULT_FLAT_COLORING_PARAMS: FlatColoringParams;
export interface FlatColoringPartition {
    w: number;
    h: number;
    /** 每像素区域号 1..regionCount；0 = 无区域（仅整图全笔画的病态情形） */
    labels: Int32Array;
    regionCount: number;
    /** 每区 tight bbox，[label-1] 起 4 元 (x0,y0,x1,y1) 闭区间 */
    bboxes: Int32Array;
    /** 估出的笔画半宽（px），调参/诊断用 */
    strokeHalfWidth: number;
    /** 调试视图（v0.7.4）：检出的端点（腐蚀后坐标）+ 候选桥（含被守卫毙的） */
    keypoints: Keypoint[];
    bridges: BridgeDebug[];
    /** 每像素「陷进真墨水多深」：0=非墨水（背景或虚拟闭合桥）；≥1=原始二值墨水像素到最近
     *  背景的欧氏距离（ceil，封顶 255）。蔓延过滤基底（v0.7.17 像素画模式）：按**原始**墨水算
     *  （非腐蚀后）——粗线腐蚀掉的表皮仍是可见墨水，蔓延小时不该被填。
     *  v0.7.19 懒构建（user：自动档吃灰内存省下来）：build 不算（null），第一次 bleed≥0 查询时
     *  由 oracle 用 attachInkDepth 补算挂上（2K 图省 4MB 常驻）。 */
    inkDepth: Uint8Array | null;
}
/** 懒补 inkDepth（v0.7.19）：Ib0 = 原始二值墨水（oracle 按同一墨线判定重新 binarize）。 */
export declare function attachInkDepth(part: FlatColoringPartition, Ib0: Uint8Array): void;
/** RGBA（straight alpha）→ 二值笔画图：合成到白底的亮度 ≤ θ 判为笔画。透明 = 白 = 背景。 */
export declare function binarizeLuma(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, threshold: number): Uint8Array;
/** alpha 二值化：落了笔（alpha ≥ minAlpha）即墨线，亮度无关——透明底线稿层的正解
 *  （淡色线稿在亮度判定下只剩最深的芯，整张成虚线；见 resolveInkBinarization）。 */
export declare function binarizeAlpha(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, minAlpha?: number): Uint8Array;
/** 动态墨线判定的分派结果：mode 供 UI 提示/诊断；thresholdLuma 仅 luma 系模式有值。 */
export interface InkResolution {
    /** alpha=透明底线稿层；otsu=稠密图（扫描/带填色）自动定阈；manual=手动百分比 */
    mode: "alpha" | "otsu" | "manual";
    /** 白底合成亮度阈值（0..255）；alpha 模式 = null */
    thresholdLuma: number | null;
    /** 落笔（alpha≥10%）覆盖率 0..1，稀疏/稠密分派依据 */
    coverage: number;
    Ib: Uint8Array;
}
/** 墨线判定分派（v0.10.11 动态档，user 2026-08-20 拍板动态为默认）：
 *  inkPct ≥ 0 → 手动档，白底亮度 ≤ pct·2.55（原有行为）。
 *  inkPct < 0 → 动态档：落笔覆盖率 ≤25% 判为透明底线稿层 → alpha 档（落笔即墨线，
 *    淡线稿救星——实案：亮度中位数 190 的线稿在默认 50% 手动档下只剩 13% 笔迹，全图漏成一区）；
 *  覆盖率 >25%（白底扫描/带填色）→ 白底亮度 Otsu 自动定阈，夹在 [30%,90%]·2.55。
 *  注意带填色图的固有语义：浅色填充=可穿背景、深色填充=墙——lineart 算法契约是线稿参考层，
 *  稠密源由 oracle 出 UI 提示引导换 classic 魔棒。 */
export declare function resolveInkBinarization(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, inkPct: number): InkResolution;
/** 笔画半宽估计：EDT 脊线（距离场 8-邻域局部极大）像素取「到背景距离」的中位数。
 *
 *  论文 §3 原式是「每个 8-连通组件取最大距离，跨组件取中位数」——它假设笔画散成许多独立
 *  组件。全连通线稿（粗线互相勾连成 1 个组件）会把中位数退化成全局最大值：组件里只要有
 *  一坨实心填充（如铅笔笔尖），估出的"半宽"= 那坨的内切半径，腐蚀随即把真实 2-3px 的线条
 *  整张蒸发（2026-08-20 铅笔图标实案：估 10、实 2，6747px 腐蚀余 266px → 全图一区）。
 *  脊线中位数按「骨架长度」加权采样：长线条贡献海量脊点、实心坨只贡献中心几点，对两种
 *  病态（全连通、实心块）都稳健；纯粗笔图（如厚 8 圆环）脊线距离 ≈ 真半宽，行为不变。 */
export declare function strokeHalfWidthMedian(Ib: Uint8Array, w: number, h: number, distSq: Int32Array): number;
/** 二值笔画图 → 分区（测试与调参入口；buildFlatColoringPartition 的后半段）。 */
export declare function buildPartitionFromBinary(Ib0: Uint8Array, w: number, h: number, params?: FlatColoringParams): FlatColoringPartition;
/** 总入口：RGBA → 分区。 */
export declare function buildFlatColoringPartition(rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, params?: FlatColoringParams): FlatColoringPartition;
/** tap 查表：(x,y) 所在区域的 tight-bbox gray8 mask（255/0）。无区域 → null。
 *  bleedPx（v0.7.17 蔓延距离，query-time 参数不碰缓存）：-1=自动（填到中线，现行为）；
 *  ≥0 = 最多陷进真墨水 bleedPx（0=像素画模式，真墨水一个不碰；虚拟闭合桥不是墨水，恒可跨）。 */
export declare function regionMaskAt(part: FlatColoringPartition, x: number, y: number, bleedPx?: number): {
    x: number;
    y: number;
    w: number;
    h: number;
    mask: Uint8Array;
} | null;
