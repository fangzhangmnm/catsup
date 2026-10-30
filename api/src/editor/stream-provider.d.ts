import type { StreamFrame, StreamProvider, StreamQuery, Vec3 } from "../minccino/index.ts";
import { type WorldView } from "../scene/world-view.ts";
import type { MarkLayout } from "./highlight.ts";
export declare class EditorStreamProvider implements StreamProvider {
    private readonly thick;
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
    /** 世界视图对象 → 小整数（内容键 / 包围球缓存：预演影子每帧是新对象 = 身份变 = 自然失效，和以前 render3 的 kernelId 同构）。 */
    private worldIds;
    private nextWorldId;
    /** 上一次 pull 每个槽画的是哪份身体（标记的布局按它找块 / 段）。 */
    private slotBody;
    private boundsCache;
    /** 粗线（LineSegments2 实例）还是像素线：引擎的视图设定（线稿粗细 > 1 也会切成粗线），每次 pull 问一下；换了 = 池网格全量重建（线的块形状不同）。 */
    constructor(thick: () => boolean);
    /** 这一帧画哪个世界（活的那份，含预演影子）+ checkpoint 代数（内容键的一部分）。编辑器每次画之前调。淡出是标记（视图侧），不在这里。 */
    /** editing = 有「正在编辑的那一层」（演示锁里没有：活动槽也按普通槽放，结构线跟画风走；ai-docs/20261029-edge-display-scenarios.md 场景 6）。 */
    setWorld(world: WorldView, revision?: number, editing?: boolean): void;
    private editing;
    private worldId;
    /** 内容键（引擎契约）：世界身份 + 版本；没变 = 引擎不重新拉（= 以前 render3 的 poolKey 那半）。 */
    contentKey(): string;
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
    /** 池网格同步完 → 块：改过的段（takeDirty）/ 数组换过 / 组没了 = 新版本；没动 = 原块原版本。 */
    private refreshChunks;
}
