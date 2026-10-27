import type { Edge, EdgeId, FaceId } from "./topology.ts";
import type { FaceEvent } from "./face-lifecycle.ts";
import { type Pt3 } from "./geom.ts";
import type { ChangeLog } from "./change-log.ts";
export interface Seg3 {
    readonly a: Pt3;
    readonly b: Pt3;
}
/**
 * 知名边层（开放集：插件 / 用户前缀名也行，codec 原样编码）。
 * fold = 折线（纪元账本 DT87，2026-10-26 Claude Opus 5.5；user「折线现在铺好」）：**一张面内部的折痕，不是边**——两侧是同一个多边形被折开的两块平面片。
 *   不画、点不中、不当吸附的边；被它连着的几块 = 一个面（单击 / 油漆桶「一张面」整块）；明暗跨它连续；导出 OBJ 并回一个多边形。
 *   不变量（Kernel.emit 每步卫生）：恰好两张膜、两张不共面——不再满足 = 退回普通边。谁产生它：橡皮的 Blender 亚种（擦不共面的两膜之间的边 = 变折线）、
 *   自动折面的 Blender 亚种（折缝带 fold）；硬表面（SketchUp 亚种）从不产生。
 */
export declare const EDGE_LAYERS: readonly ["soft", "curve", "smooth", "hidden", "fold"];
/** 推拉 / 跟随的帽边不继承的层：折线只活在一个多边形内部，帽边已经是别的面之间的边了。 */
export declare const CAP_EXCLUDE: ReadonlySet<string>;
/** 知名面层。 */
export declare const FACE_LAYERS: readonly ["material", "materialBack", "hidden"];
/**
 * 面的两个表面（DT8，契约 §5.2「面无朝向：material = [+n 侧, −n 侧]」；2026-10-26 Claude Opus 5.5，周二 Fable 审）：
 * material = 平面法向 +n 那一侧的槽，materialBack = −n 那一侧。n = 面所在平面记录的规范法向（不是面自己的朝向——面没有朝向）。
 * 面换到法向相反的平面上、或被转 / 镜像到背面朝 +n（结算机看身份像的绕向判出来）→ 两槽互换（swapSides），颜色跟着实物走。
 */
export declare const MAT_FRONT = "material", MAT_BACK = "materialBack";
/** 一组面层值（像带的 / 快照里的）两侧互换。 */
export declare function swapSideVals(vals: Readonly<Record<string, number>>): Record<string, number>;
/** 推拉 / 跟随：原边带哪层 → 它扫出的侧棱带哪些层（帽边 = 原边的全部层）。 */
export declare const EDGE_LAYER_POLICY: Readonly<Record<string, readonly string[]>>;
/**
 * 环上一个顶点的侧棱（riser：顶点沿扫掠方向拉出的那条棱）该带的层：**两侧的环边都带策略层才软**
 * （圆弧内部顶点的侧棱软 + 平滑；圆弧端点 / 直边角点的侧棱硬）。推拉与跟随共用这一条（2026-10-21）。
 */
export declare function riserLayers(prev: readonly string[], next: readonly string[]): string[];
export declare class EdgeLayers {
    private sets;
    /** 改动日志（Kernel 接上；DT96）：层集合是带记账的 Set，谁从哪里增删都记一笔。 */
    log: ChangeLog | null;
    private newSet;
    names(): string[];
    /** 取（无则建）。 */
    layer(name: string): Set<EdgeId>;
    has(name: string, id: EdgeId): boolean;
    add(name: string, id: EdgeId): void;
    delete(name: string, id: EdgeId): void;
    /** 边 id 带的全部层名。 */
    of(id: EdgeId): string[];
    /** ① 切割按父传子。 */
    onSplit(parent: EdgeId, children: readonly EdgeId[]): void;
    /** ② 删边出集（也用于合并后清旧边）。 */
    onRemove(id: EdgeId): void;
    /** ④ 溶解：ea、eb 都有的层，并出的 ne 也有。 */
    onMerge(ne: EdgeId, ea: EdgeId, eb: EdgeId): void;
    /** 复制一条边的层到另一条（absorbVertex 搬边用）。 */
    copy(from: EdgeId, to: EdgeId): void;
    /** ③ 新段上落下的边入集。 */
    mark(name: string, edges: readonly Edge[], pt: (id: number) => Pt3, segs: readonly Seg3[]): void;
    /** 清掉不在图里的 id。 */
    prune(hasEdge: (id: EdgeId) => boolean): void;
    /** 增量版：只清这批删掉的 id（结果 = prune，因为 id 不复用）。 */
    pruneIds(ids: readonly EdgeId[]): void;
    clone(): EdgeLayers;
    /** 快照：名字 → 有标记的边下标（按给定边序）。 */
    toIndex(edgeIds: readonly EdgeId[]): Record<string, number[]> | undefined;
    /** 装载：下标表 → 集（下标越界 = 文件坏）。 */
    static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, edgeIds: readonly EdgeId[], fail: (msg: string) => never): EdgeLayers;
}
export declare class FaceLayers {
    private maps;
    /** 改动日志（同 EdgeLayers）。 */
    log: ChangeLog | null;
    private newMap;
    names(): string[];
    layer(name: string): Map<FaceId, number>;
    get(name: string, id: FaceId): number | undefined;
    set(name: string, id: FaceId, v: number): void;
    delete(name: string, id: FaceId): void;
    /** 一张面的全部层值。 */
    of(id: FaceId): Record<string, number>;
    setAll(id: FaceId, vals: Readonly<Record<string, number>> | undefined): void;
    /** 两个表面互换（DT8：面翻到另一面朝 +n 了）。 */
    swapSides(id: FaceId): void;
    /** 按事件血缘：DIVIDE 子膜继承、MERGE / ABSORB 取首个有值的、死膜清。 */
    applyEvents(events: readonly FaceEvent[]): void;
    prune(hasFace: (id: FaceId) => boolean): void;
    /** 增量版：只清这批删掉的 id；alive = 现在还在的（DIVIDE 之类保 id 的事件可能删了又铸回同一个 id）。 */
    pruneIds(ids: readonly FaceId[], alive: (id: FaceId) => boolean): void;
    clone(): FaceLayers;
    /** 快照：名字 → 每面一个值（−1 = 无），按给定面序。 */
    toIndex(faceIds: readonly FaceId[]): Record<string, number[]> | undefined;
    static fromIndex(rec: Readonly<Record<string, readonly number[]>> | undefined, faceIds: readonly FaceId[]): FaceLayers;
}
