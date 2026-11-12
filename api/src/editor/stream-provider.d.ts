import type { LiveImage, StreamFrame, StreamProvider, StreamQuery, TextureRef, Vec3 } from "../minccino/index.ts";
import { type WorldView } from "../scene/world-view.ts";
import type { MarkLayout } from "./highlight.ts";
/**
 * 画板登记处在编辑器这边看到的样子（贴图主线 1-3c；实现 = src/paint/boards.ts，编辑器不认识画画内核）。只读：改大小、合成都在每帧开画之前的「准备」里（1-4b 统筹 B）。
 * board = 这张贴图的画板（实际宽高 + 活的图）；sig = 有哪些画板、多大（变了 = 用到画的池整份重建）。
 */
export interface PaintImages {
    board(texture: string): {
        readonly width: number;
        readonly height: number;
        readonly image: LiveImage | TextureRef;
    } | null;
    sig(): string;
}
export declare class EditorStreamProvider implements StreamProvider {
    private world;
    private revision;
    private bodies;
    private gen;
    private nextBody;
    /** 块版本：全局单调（一个块被删了又长出来也不会撞上后端留着的旧版本）。 */
    private seq;
    /** 材质对象 → 小整数（材质槽签名用：槽表只追加 = 池网格增量；别的变化 = 全量）。 */
    private matUids;
    private nextMatUid;
    /** 交给渲染器的材质引用（契约 MaterialRef）：同一个材质、同一张图 = 同一个对象（渲染器按对象缓存着色器）；图换了 = 新对象。 */
    private readonly refs;
    /** 一张图 = 一个 TextureRef（渲染器按它解码一次：两个材质用同一张图只解一次）。 */
    private readonly texRefs;
    private refOf;
    /** 平铺的画那几个材质交给渲染器的引用：同一个材质 + 同一张图 = 同一个对象。 */
    private readonly tiledRefs;
    /** 这个材质是平铺的画、而且画板现在有图（热的 / 冷的有合成图）→ 那张图；不是 / 没有图 = null（按底色画）。 */
    private tiledImage;
    /** 世界视图对象 → 小整数（内容键 / 包围球缓存：预演影子每帧是新对象 = 身份变 = 自然失效，和以前 render3 的 kernelId 同构）。 */
    private worldIds;
    private nextWorldId;
    /** 画板登记处（1-3c；没接 = 没有画显示）。 */
    private paint;
    setPaint(p: PaintImages | null): void;
    /** 画的那一组交给渲染器的材质引用：同一个材质 + 同一张活的图 = 同一个对象。 */
    private readonly paintRefs;
    private paintRef;
    /** 上一次 pull 每个槽画的是哪份身体（标记的布局按它找块 / 段）。 */
    private slotBody;
    private boundsCache;
    /** 粗线（LineSegments2 实例）还是像素线：引擎的视图设定（线稿粗细 > 1 也会切成粗线），每次 pull 问一下；换了 = 池网格全量重建（线的块形状不同）。 */
    /** styled = 正在看风格预览（线稿之外的画风）：默认背面按引擎所见不画（计划书 §9.2-E；编辑时画灰蓝 = 披露你在看背面）。 */
    private readonly thick;
    private readonly styled;
    /** 这个工作台画不画接缝（Mode.showsSeams）；演示锁里（没有正在编辑的那一层）一律不画。 */
    private readonly seamsWanted;
    constructor(thick: () => boolean, styled?: () => boolean, seams?: () => boolean);
    private seamsOn;
    /** 这一帧画哪个世界（活的那份，含预演影子）+ checkpoint 代数（内容键的一部分）。编辑器每次画之前调。淡出是标记（视图侧），不在这里。 */
    /** editing = 有「正在编辑的那一层」（演示锁里没有：活动槽也按普通槽放，结构线跟画风走；ai-docs/20261029-edge-display-scenarios.md 场景 6）。 */
    setWorld(world: WorldView, revision?: number, editing?: boolean): void;
    private editing;
    private worldId;
    /** 内容键（引擎契约）：世界身份 + 版本；没变 = 引擎不重新拉（= 以前 render3 的 poolKey 那半）。 */
    contentKey(): string;
    /**
     * 内容此刻还持有的图和材质引用（引擎契约 retained，施工单十九第 1 刀规矩 2）：文档材质表里每个材质 → 交给渲染器的那个材质引用和它的图；
     * 画（颜色那一槽是分层的贴图）→ 画板现在的图（热的 = 活的图、冷的 = 合成图）和那一组材质引用。可见不可见都算。
     * 不在这里的 = 文档里没有了（撤销掉的、换掉的文件、冷热换过的旧图），渲染器放掉。按需现算：材质表的长度量级，渲染器只在内容变了时问。
     */
    retained(): {
        readonly images: ReadonlySet<object>;
        readonly materials: ReadonlySet<object>;
    };
    /** 场景包围球（引擎契约）：远平面 / 正交深度窗口 / 无限长线按它定（user 10-26「不应该写死特征长度」）。按世界身份 + 版本缓存。 */
    bounds(): {
        c: Vec3;
        r: number;
    } | null;
    /** 标记的布局（editor/highlight.ts MarkLayout）：某个槽里一张面在哪些块的哪一段（块 id = 身体 id / 组键，和 pull 吐的一致）。 */
    layout(): MarkLayout;
    pull(_q: StreamQuery): StreamFrame;
    /** 槽 s 用哪份池网格（同步到 s 的内核）。同一帧同一个内核只同步一次。 */
    private bodyFor;
    private env;
    /**
     * 这张面显示画吗（1-3c，规矩在 PoolMeshEnv.paintOf）：走不走画只问 Scene.facePaint；角上的数从正在同步的那个内核拿（预演影子也对）；
     * 有一个角没有位置 = 这张面还没铺上 = 按底色画。
     */
    private paintOf;
    /** 池网格同步完 → 块：改过的段（takeDirty）/ 数组换过 / 组没了 = 新版本；没动 = 原块原版本。 */
    private refreshChunks;
}
