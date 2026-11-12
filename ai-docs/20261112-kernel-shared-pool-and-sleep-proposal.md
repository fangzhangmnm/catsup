# 提案：画画内核的两个口——几个房间合用一个图块池、房间的显卡那一半睡和醒（施工单十九第 2 刀）

> created 2026-11-12 by Claude Opus 5.5（Catsup小弟）· as-of 三维 v0.19.52、内核 = 画画仓 ccb919f 拷来的那份（`src/paint/kernel/`）
> 状态：**提案，等统筹批**。批了在画画仓改（正本只在那里改），三维重拉；画画软件一个像素不变是门。

## 一、为什么要这两个口（量到的）

施工单十九第 1 刀量的（`probe-ten-objects`）：一个文件里每多一个画过的物件，显卡上多约 18 MB 一直不放，其中 **16 MB 是内核的显卡图块池**——每块画板（= 一个房间）在构造时自己开一个（`gl-room.ts` 构造函数里 `glctx.createTileArena(TILE_SIZE, min(64, maxSlices))`，64 片 × 256² × 4 字节）。三维里一个文件可能有很多块画板，画画软件一次只开一张画，所以这个设计在画画软件里没问题、在三维里随物件数直线涨。

要的结果（施工单十九第一节）：显卡上占的只随「正在编辑的那个物件用到几张画」涨；别的物件的画只留渲染器那一张显示图。所以要两个口：① 几块画板合用一个图块池（池不再随画板数涨）；② 一块画板的显卡那一半能还回去、再要回来（不在编辑的物件睡着）。

## 二、内核现在是什么样（读码，画画仓 ccb919f）

- **图块池本来就只是缓存**（`gpu-tile-pool.ts` 头注释）：「gpu tile 只是 render-tree 的缓存，随时可 evict / invalid；CPU 恒为 SSoT，丢了自愈重建」。池是纯记账（`GpuTilePool`）+ 显卡上一张 2D 图组（`Gl2TileArena`，Port 造、Port 记账）。
- **池本来就认几个使用者**：钉住的集合由使用者登记（`registerPinProvider`），每帧 `frameMaintain` 只收**没有任何一个使用者钉住**的图块；池长大（`reserve` → `recreate`）= 全部图块作废、`generation` 加一，使用者手里记着代数、代数变了就重传（`raster-service.ts`、`frame-demand.ts admitWithRegrow`、`gl-room.ts` 都在查）。
- **「显卡画面丢了，从内存那份全部重建」这条路已经有了**：`GLBoard` 构造时挂 `glctx.onInvalidated(() => tree.handleContextRestored())`；`RenderTree.handleContextRestored` → `GlRoom.handleContextRestored`：池清空、桥清空、每层的索引小图 / 选区图 / 填色图 / 浮层图 / 一笔当中的帧缓冲全部弃引用、段缓存和显示图弃引用、标脏；下一帧照内存里的图块重建。
- **画画软件怎么建画板**（画画仓 `src/board.ts:256`）：`new GLBoard(new BrowserGl2Port(gl), poolCapacityForBudget(256 MB))`——两个参数。三维（`src/paint/board.ts:83`）一样，每块画板一个。

## 三、接口的样子（提案 .h）

```ts
// backend/gl/gpu-tile-pool.ts（加在现有的池旁边）
/** 一份可以给几个房间共用的图块池：显卡上一张 2D 图组 + 记账。房间之间：谁的图块没被任何房间钉住就可以被收；
 *  池长大（reserve）= 全部房间的图块作废、各自从内存那份重传（generation 变，房间本来就在查）。退租 = 合用它的房间都退了之后由建它的人 dispose。 */
export interface SharedTilePool { readonly pool: GpuTilePool; readonly arena: Gl2TileArena; dispose(): void }
export function createSharedTilePool(glctx: Gl2Port, maxSlices: number): SharedTilePool;

// backend/gl/gl-room.ts
class GlRoom {
  constructor(glctx: Gl2Port, maxSlices: number, accumPrec?: FBOPrec, shared?: SharedTilePool);   // 缺 = 照旧自己开一个（画画软件不变）
  /** 显卡那一半还回去：自己的图块不再钉住（合用的池里让给别人；自己开的池整个还给 Port）、每层的索引小图和选区 / 填色 / 浮层图删掉、借的帧缓冲还池。内存那一半全留着。 */
  sleep(): void;
  /** 要回来：自己开的池重开（起步那么大）；其余 = handleContextRestored 那条路（弃引用、标脏），下一帧从内存那份重建。 */
  wake(): void;
  readonly asleep: boolean;
}
// backend/gl/render-tree.ts：sleep() 把段缓存和显示图的帧缓冲还池、标脏；wake() = handleContextRestored。

// shell/gl-board.ts（三维用的就是这一层）
class GLBoard {
  constructor(glctx: Gl2Port, maxSlices: number, opts?: { readonly pool?: SharedTilePool });   // 缺 = 照旧
  sleep(): void; wake(): void; get asleep(): boolean;   // 睡着时调合成 / 落笔 = 抛（和 disposed 一样有墙），先 wake
}
```

三维这边（第 3 刀，diff 发统筹）：画板登记处（`src/paint/boards.ts`）每份文件建一个 `SharedTilePool`，每块画板都用它；进一个物件的编辑 = 它用到的画板 `wake()`，离开 = `sleep()`；换文件 = 画板全退了再 `dispose()` 池。

**三维多用内核的口**（白名单 `test/paint-kernel-surface.test.ts` 要加的行，统筹 11-12：加之前先报）：`src/backend/gl/gpu-tile-pool.ts → createSharedTilePool, SharedTilePool`（新）；`GLBoard` 已在表里，`sleep / wake / asleep` 是它的方法、不另加行。第 1 刀已经加过的 `src/common/tile-geometry.ts → TILE_SIZE`（显卡内存清单算图块池多大）一起摆在这里：第 2 刀之后清单改问池自己（`SharedTilePool.pool.committedBytes`）能不能代替它，代替得了就撤掉这一行。

## 四、三样写清楚的

### 1. 睡着时内存里留着什么
- 留着（全是内存那一半，睡和醒都不碰）：每层的图块（内核的 CPU 图块池，空闲时压缩着）、图层树和每层的属性、撤销的记录（步）、房间对象本身、合成用的着色器程序（按 Port 共用）。
- 三维那边另外留着：渲染器里那张**显示图**（`live-image.ts` 拷出来的，带缩小图）——睡着的物件照样显示最后那一版，不灰、不闪。存盘（编分层字节）、崩溃快照、撤销撤到这块画板的那一步，读的都是内存那一半，睡着照样做（第 3 刀的四条不丢东西检查就是查这个）。
- 不留（显卡那一半）：图块池里它的那几片（合用池 = 让出来；自己的池 = 还给 Port）、每层的索引小图、选区 / 填色 / 浮层图、合成目标和段缓存的帧缓冲（还 Port 的池，不删——池归 Port、几个房间共用）。

### 2. 醒来之后合成图和睡之前逐位相同，靠什么保证
- **靠「显卡那一半只是缓存」这条已有的不变量**：合成图 = 内存里的图块 + 图层树 + 底色 + 着色器的确定函数；显卡上的图块池、索引小图、段缓存都是从内存那份传上去的。醒 = 走显卡画面丢了之后恢复的同一条路（`handleContextRestored`），从同一份内存重建同一份缓存。
- **这条路本来就得对**：真机上显卡画面丢了（iPad 切后台久了、驱动重置）走的就是它；睡和醒借它 = 平时就在练丢画面的恢复，它要是坏了，睡醒先红出来。
- **怎么查**（画画仓的内核测试，node 里用 `SoftGl2Port` 跑，和 `incremental-composite.test.mjs` 同一套）：
  ① 一块画板：画几笔 → 合成、读回整张 A → `sleep()` → `wake()` → 合成、读回 B → A 和 B 逐字节相同；睡醒之后再画一笔、和不睡的那块画同一笔的结果逐字节相同。
  ② 两块画板合用一个池：交替合成、交替画，每块的合成图 = 它单独一个池时的合成图，逐字节；一块长大池子（reserve）之后另一块照样对。
  ③ 睡着时显卡账（Port 的租户记账 `arenaStats { count, bytes }`：活着的图组数、承诺的字节）掉下来：自己开池的 = 少一整个图组，合用池的 = 它那几片下一帧被收走；醒来又回来。
  ④ 睡着时调合成 / 落笔 = 抛（墙），不是悄悄画到一块没有显卡那一半的画板上。
- 三维这边（第 3 刀）：`probe-ten-objects` 十个物件各画一张，回到第一个物件、它醒来之后每个图层的像素（`exportData`）和显示图都和睡之前逐位相同。

### 3. 画画软件那边一个像素不变，怎么验
- **代码路径上不变**：画画软件建画板只给两个参数、从不调 `sleep / wake`——走的是「缺省 = 自己开一个池」那一支，和现在一行不差（这一支的代码不动，只是多了一个分叉）。提交里给统筹看的 diff 要能一眼看出这一点。
- **跑的**：画画仓全套（现在 1772 过）+ 内核那一套 + 显卡冒烟，全绿；画画仓的像素级对比（画同样几笔、导出 PNG 逐字节和改之前的构建比；改之前的构建 = 画画仓发版提交干净构建，照三维这边 `--compare` 的规矩）一个像素不差。
- 三维这边重拉内核后：红线组 + 碰到画画那条路的探针 + 性能档（`--tier=perf`，第 1 刀之后补的「这一档碰画画那条路就要跑」）。

## 五、量（合用之后报数，先不为它加东西）

两块醒着的画板轮流合成会不会互相挤池子：合用之后在 `probe-ten-objects` 里加一段——两个物件来回切着画，记池的收走次数（`stats.evictions`）、重建次数（`recreations`）、每帧重传了多少片（`uploads`）。挤得厉害（来回切每次都整张重传）再说要不要按房间分额度；现在不加。

## 六、不做的

- 多个物件一起编辑时醒哪几块：以后做多物件编辑时再定（统筹施工单第五节）。
- 合成用的帧缓冲池（Port 的那个）：本来就是几个房间共用的，不动。
- 画画软件里开多张画：不在这一张。
