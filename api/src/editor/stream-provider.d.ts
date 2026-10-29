import type { ChunkStyle, StreamFrame, StreamProvider, StreamQuery, Vec3 } from "../minccino/index.ts";
import { type WorldView } from "../scene/world-view.ts";
export declare class EditorStreamProvider implements StreamProvider {
    private readonly style;
    private world;
    private dimSlots;
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
    private boundsCache;
    /** 样式那半由后端给（`ChunkStyle`，引擎契约里的过渡期接口）。 */
    constructor(style: ChunkStyle);
    /** 这一帧画哪个世界（活的那份，含预演影子）+ 上下文之外的槽（淡出）+ checkpoint 代数（内容键的一部分）。编辑器每次画之前调。 */
    setWorld(world: WorldView, dimSlots: ReadonlySet<number> | null | undefined, revision?: number): void;
    private worldId;
    /** 内容键（引擎契约）：世界身份 + 版本 + 淡出集；没变 = 引擎不重新拉（= 以前 render3 的 poolKey 那半）。 */
    contentKey(): string;
    /** 场景包围球（引擎契约）：远平面 / 正交深度窗口 / 无限长线按它定（user 10-26「不应该写死特征长度」）。按世界身份 + 版本缓存。 */
    bounds(): {
        c: Vec3;
        r: number;
    } | null;
    pull(_q: StreamQuery): StreamFrame;
    /** 槽 s 用哪份池网格（同步到 s 的内核）。同一帧同一个内核只同步一次。 */
    private bodyFor;
    private env;
    /** 池网格同步完 → 块：改过的段（takeDirty）/ 数组换过 / 组没了 = 新版本；没动 = 原块原版本。 */
    private refreshChunks;
}
