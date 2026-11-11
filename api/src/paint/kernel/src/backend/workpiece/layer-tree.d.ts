import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
import type { LayerTiles, Rect } from "./layer-tiles.ts";
export interface TreeLeaf {
    id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    lockAlpha: boolean;
    pixelsRef: number;
}
export interface TreeGroup {
    id: number;
    name: string;
    visible: boolean;
    opacity: number;
    mode: string;
    clippingMask: boolean;
    children: TreeNode[];
}
export type TreeNode = TreeLeaf | TreeGroup;
export interface TreeJson {
    nodes: TreeNode[];
    activeId: number | null;
    referenceLayerId: number | null;
    width: number;
    height: number;
}
export declare const isGroupNode: (n: TreeNode) => n is TreeGroup;
export type LayerPropKey = "name" | "visible" | "opacity" | "mode" | "clippingMask" | "lockAlpha";
export declare class LayerTree implements CollectorComponent {
    readonly kind = "layerTree";
    private _wp;
    private _tiles;
    private _json;
    private _collectedRoot;
    private _nextId;
    private _maxLeaves;
    constructor(deps: {
        wp: Workpiece;
        tiles: LayerTiles;
        initial: TreeJson;
        maxLeaves?: () => number;
    });
    /** 不可变值约定：发出去的引用永不被改（每次写换新根）。 */
    view(): Readonly<TreeJson>;
    nodeById(id: number | null): TreeNode | null;
    leafById(id: number | null): TreeLeaf | null;
    countLeaves(): number;
    eachLeaf(cb: (leaf: TreeLeaf) => void): void;
    /** 插到 active 同级上方（无 active → 顶层最上）；active = 新层。null = 已到 maxLeaves。 */
    addLayer(name?: string): TreeLeaf | null;
    /** 新建**空**组：插到 active **同级**上方（无 active → 顶层最上），与 addLayer 同规则。active = 新组。
     *  组不计 maxLeaves（只数叶）。
     *  2026-08-28 修（user 0825「一层只有图层组的时候没法创建兄弟图层组」）：旧规则「active 是组 →
     *  嵌进去」让**只含组的层级**永远建不出兄弟组（那一层选不到叶，active 必然是那个组 → 只会往里钻）。
     *  改成恒同级后任何层级都能建兄弟组；嵌套仍可达——选组内的某个节点新建（新组落该组内），
     *  或建完走 moveIntoGroup 移进去（PS 的 New Group 也是同级，不塞进选中的组）。 */
    addGroup(name?: string): TreeGroup | null;
    /** 新建空叶**强制置顶**（根级末尾 = 最顶；盖印 stampAll 用）。active = 新层。null = maxLeaves。 */
    addLayerTop(name?: string): TreeLeaf | null;
    /** 把组烤成单叶**同位替换**（#25 collapse）：新叶继承组的 visible/opacity/mode/clippingMask
     *  （合成字节已把子树烤平 → 视觉不变）；merged=null = 空组 → 空叶。active = 新叶。
     *  组 children 的 tileset 随旧根进 record，驱逐才释放。 */
    collapseGroupToLeaf(id: number, merged: {
        bytes: Uint8ClampedArray;
        rect: Rect;
    } | null): TreeLeaf | null;
    /** 按颜色拆分（v0.7.9 explode）：叶同位替换成 n 张新叶（parts[0] 最底），props 全继承
     *  （分片互斥 → 逐像素等价，视觉不变）。active = 最上分片。null = 非叶/超 maxLeaves。 */
    explodeLeaf(id: number, parts: {
        data: Uint8ClampedArray;
        name: string;
    }[], rect: Rect): TreeLeaf[] | null;
    /** 换整根（load 的令牌写；ADR-0008：解码器产 plain data 灌入）。
     *  调用方负责新根 tileset 的净移交（createTileset 后 release）；旧根照常进 collector/record，
     *  load 收尾清栈时旧 doc 资源随 record 驱逐释放。nextId 重播种。 */
    loadRoot(json: TreeJson): void;
    /** 复制节点（叶或组，props 原样）：叶像素 = duplicateTileset 句柄共享零拷贝；组 = 递归深拷
     *  （每个后代叶各拿新 ref、所有节点发新 id）。插到源上方，active = 副本根。
     *  null = 叶数预算超 maxLeaves（现叶数+待复制子树叶数）/源不在/像素缺失。
     *  referenceLayerId 是 doc 级字段不在节点上——复制含参考层的组不改它（副本不会成为参考层）。 */
    duplicateNode(id: number): TreeNode | null;
    /** 删叶（keep-one 守卫：最后一叶不删）。active 被删 → 就近换（下方优先）。 */
    removeLayer(id: number): boolean;
    /** 删组连带 children；删空补一叶。 */
    removeGroupAndFillEmpty(id: number): boolean;
    /** 解组：children 提到原位（顺序保持）。 */
    explodeGroupInPlace(id: number): boolean;
    /** 同级移动 delta（越界 → false 不动）。 */
    moveLayer(id: number, delta: number): boolean;
    /** 移入组，保持相对上下关系（user 2026-08-20「移进移出图层组的时候，能不能尽量保持图层之间
     *  原来的相对上下关系？」）：被移节点原来在组**下方** → 插组内**底**；在组**上方** → 组内**顶**。
     *  上下判据 = 树**路径的字典序**（各级 index，index 0 = 最底），跨级也算得对。
     *  2026-08-28 修（user 0825「移动图层组尽量保证顺序的时候如果是 nested 图层组计算错误」）：
     *  旧判据是「同一 parentArr 且 index 更低」，只认同级——nested 场景（被移节点与目标组不同父）
     *  一律当"无可比序"塞组内顶，明明在组下方的层也被抬到顶上。
     *  组不存在/自嵌套 → false。 */
    moveIntoGroup(id: number, gid: number): boolean;
    /** 移出组：提到组的同级，保持相对上下关系——原在组内**底**（index 0）→ 插组**下方**；
     *  其余 → 组上方（底出底、顶出顶，与 moveIntoGroup 对偶成往返）。不在组内 → false。 */
    moveOutOfGroup(id: number): boolean;
    /** 向下合并：合成字节外部烤好递入（零 GL）。under 归一化（opacity=1/source-over/resultClipping）、
     *  top 移除、active=under。守卫：同级正下方必须是叶、under 剪裁而 top 不剪 → false（语义不清）。 */
    mergeDown(id: number, merged: {
        bytes: Uint8ClampedArray;
        rect: Rect;
        resultClipping: boolean;
    }): boolean;
    setLayerProp(id: number, prop: LayerPropKey, value: unknown): boolean;
    /** 元规则相同才合并动词（提案 .h）：doc 级 unique 值。
     *  width/height（T3b-2 补）：整 doc 几何变换（crop/resample/rot90）的尺寸位——像素实例交换
     *  由 DocResizeOp/computed 记账，json 尺寸走本 verb 进树 record，同一 step 内两账同向翻。 */
    setTreeProp(key: "referenceLayerId" | "width" | "height", value: number | null | string): void;
    /** 唯一不记账 verb（焦点=导航）：无需令牌、不收集；换根共享 nodes（records 不受扰）。 */
    setActive(id: number): boolean;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(data: RecordData): number;
    disposeRecord(data: RecordData): void;
    private _swapRoot;
    private _acquireRoot;
    private _releaseRoot;
    private _eachNode;
    private _contains;
    private _clone;
    /** 定位 id 所在的 children 数组（parentGroup=null 表示顶层）。
     *  path = 从根到该节点的各级 index（末位 == index），给 comparePath 判上下用。 */
    private _locate;
    /** 删除位置的就近叶（同级下方优先，其次上方，再全树第一叶）。 */
    private _nearestLeafId;
}
