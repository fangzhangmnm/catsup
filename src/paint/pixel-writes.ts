// paint/pixel-writes.ts —— 画画这一层（画板、画板登记处、一笔、画画控制器）每个公开的口对「改不改图层像素」的表态。created 2026-11-11 by Claude Opus 5.5（统筹 11-11，v0.19.48）
// 起因：锁着时直接调画画控制器（绕开编辑器）能画上、撤销栈多一步——画画这一层的开一笔、落层都不看锁，锁只靠编辑器的「指针按下」一层。
// 规矩：会改像素的口，要么自己问锁（问传进来的函数，画板不认识编辑器；锁的真值只在输入闸），要么写明「只从哪条已经问过锁的路进来」。
// 守卫 test/paint-pixel-writes.test.ts：从源码扫出这几个类的每个公开方法，表里没有的 = 红（加一个口必须表态）；表里有、源码里没了的也红；标「问锁」的方法体里必须真的问锁。
// 睡着时怎么办（施工单十九第 3 刀，2026-11-12）：每个改像素 / 改大小的口另写一栏 asleep——
//   gpu = 要用显卡，经 PaintBoard.gpu() 叫醒（守卫查方法体里真有 gpu() / borrowGpu，且 board.ts 里别处不直接碰内核的画板）；
//   memory = 只动内存（图块、图层树、步），不用醒：提交版本变了 → 显示的那一版过期（displayStale）→ 下一次准备合成一次（合成经 gpu() 叫醒）、渲染器拷走后睡回去；
//   via = 经过别的口（写明经哪个，那个口自己表了态）。
// 画画这条路现在的四层：① 编辑器的指针按下（锁着不收改模型的工具）② 落笔的门 main.ts paintStrokeGate ③ 画板开一笔 PaintBoard.openStroke ④ 画板落层（openStroke 交出去的那一笔的 commitHost）。

/** 画板睡着时这个口怎么办（见头注释）。 */
export interface AsleepRule { readonly asleep: "gpu" | "memory" | "via"; readonly how: string }
export type PixelRule =
  | ({ readonly kind: "asks-lock"; readonly how: string } & { readonly sleep: AsleepRule })
  | ({ readonly kind: "via"; readonly from: string } & { readonly sleep: AsleepRule })
  | ({ readonly kind: "load"; readonly why: string } & { readonly sleep: AsleepRule })
  | { readonly kind: "no-pixels"; readonly why: string };
const GPU = (how: string): AsleepRule => ({ asleep: "gpu", how });
const MEM = (how: string): AsleepRule => ({ asleep: "memory", how });
const VIA = (how: string): AsleepRule => ({ asleep: "via", how });

const NO = (why: string): PixelRule => ({ kind: "no-pixels", why });   // constructor 这个键在对象字面量里会被当成 Object.prototype.constructor 推类型：用函数给出 PixelRule
/** 类 → 公开方法（含 constructor 和 getter）→ 表态。键 = 守卫扫源码时用的名字。 */
export const PIXEL_WRITES: Readonly<Record<"PaintBoard" | "PaintBoards" | "SpacePaintStroke" | "PaintWorkbench", Readonly<Record<string, PixelRule>>>> = {
  PaintBoard: {
    openStroke: { kind: "asks-lock", how: "开一笔之前问 this.locked()；交出去的那一笔在落层（commitHost）时再问一次，锁着就抛 = 档口取消令牌、整笔回滚",
      sleep: GPU("开一笔本身只动内存（令牌）；落层（commitHost）经 gpu() 叫醒；一笔开着时登记处不让它睡（strokeOpen / 开着的计数）") },
    load: { kind: "via", from: "PaintBoards.load（问锁）/ PaintBoards.warm（读文件变热 = 装载，不是改）", sleep: MEM("wp.load 只动内存；提交版本变了 → displayStale → 下一次准备合成时醒") },
    follow: { kind: "via", from: "PaintBoards.follow ← 编辑器每条指令提交的收尾（提交口锁着就拒，指令根本不会落地）；只砍全空白的行列、跟着长", sleep: MEM("改大小 = 裁剪动词 + 树上的宽高，只动内存；同上") },
    constructor: NO("建一块空画板（由 PaintBoards.ensure 建）"),
    width: { kind: "no-pixels", why: "读" }, height: { kind: "no-pixels", why: "读" },
    committedKey: { kind: "no-pixels", why: "读" }, layerCount: { kind: "no-pixels", why: "读" },
    wrapLayer: { kind: "no-pixels", why: "包宿主的薄层：抬笔落层才进图层，落层问锁" },
    overlayChanged: { kind: "no-pixels", why: "显示版本往前走" },
    changedSince: { kind: "no-pixels", why: "读变化史" },
    setBackground: { kind: "no-pixels", why: "只换垫在最底下的颜色，图层不动" },
    compose: { kind: "no-pixels", why: "合成到显示用的那张，不碰图层" },
    composeBytes: { kind: "no-pixels", why: "存盘用的整张合成读回，不碰图层" },
    verifyFull: { kind: "no-pixels", why: "核对显示，不碰图层" },
    pixelAt: { kind: "no-pixels", why: "读" },
    lastBake: { kind: "no-pixels", why: "读" }, background: { kind: "no-pixels", why: "读" },
    dispose: { kind: "no-pixels", why: "扔显卡资源" },
    contentBounds: { kind: "no-pixels", why: "读" },
    asleep: { kind: "no-pixels", why: "读" }, strokeOpen: { kind: "no-pixels", why: "读" }, displayStale: { kind: "no-pixels", why: "读" },
    sleep: { kind: "no-pixels", why: "显卡那一半还回去（内核），内存那一半不动；一笔开着 = 抛" },
  },
  PaintBoards: {
    load: { kind: "asks-lock", how: "整份换内容之前问 this.o.editLocked()（调试钩子 fill 走这里）", sleep: VIA("PaintBoard.load（只动内存）") },
    undoComponent: { kind: "via", from: "编辑器的撤销 / 重做（锁着时编辑器的撤销 / 重做口就拒）", sleep: MEM("翻一步 = 内核 HostedSteps.flip 改内存里的图块；下一次准备看 displayStale 合成一次（叫醒），渲染器拷走后睡回去") },
    follow: { kind: "via", from: "编辑器每条指令提交的收尾（提交口锁着就拒）", sleep: VIA("PaintBoard.follow（只动内存）") },
    warm: { kind: "load", why: "冷的画读文件里的分层字节变热（是读进来，不是改）", sleep: MEM("建一块新画板（醒着）+ 装载；第一次准备合成交出去，不在编辑就在渲染器拷走后睡下") },
    ensure: { kind: "load", why: "建画板：空白的，或者照文件里的分层装进来；开始画本身是一条指令，提交口问锁", sleep: MEM("建一块空白画板（醒着）；同上") },
    constructor: NO("建登记处"),
    count: { kind: "no-pixels", why: "读" }, get: { kind: "no-pixels", why: "读" }, guids: { kind: "no-pixels", why: "读" },
    onPrepare: { kind: "no-pixels", why: "登记准备时的回调" },
    prepare: { kind: "no-pixels", why: "每帧合成显示用的那张（一笔开着时薄层垫在上面，不进图层）" },
    verifyFull: { kind: "no-pixels", why: "核对显示" },
    sync: { kind: "no-pixels", why: "跟场景：换文件扔、画没了歇着、垫底色" },
    takePending: { kind: "no-pixels", why: "交出内核封好的步" },
    trackOpen: { kind: "no-pixels", why: "登记开着的一笔" },
    cancelOpen: { kind: "no-pixels", why: "取消开着的一笔 = 零痕迹" },
    distrust: { kind: "no-pixels", why: "作废以前的步（像素不动）" },
    board: { kind: "no-pixels", why: "读" }, stateOf: { kind: "no-pixels", why: "读" }, viewOnlyWhy: { kind: "no-pixels", why: "读" }, sig: { kind: "no-pixels", why: "读" },
    disposeAll: { kind: "no-pixels", why: "换文件全扔" },
    setEditing: { kind: "no-pixels", why: "说正在编辑哪几张（醒睡的依据）" },
    gpuStats: { kind: "no-pixels", why: "读" },
  },
  SpacePaintStroke: {
    constructor: NO("建这一笔的对象，还没开"),
    down: { kind: "via", from: "PaintWorkbench.pointer（落笔的门问锁）/ 调试钩子 paint.stroke（同一道门）；真开一笔在每帧准备里 = PaintBoard.openStroke（问锁）", sleep: VIA("PaintBoard.openStroke；开着的这一笔登记在 PaintBoards.trackOpen，登记着就不睡") },
    move: { kind: "via", from: "已经开了的这一笔（开的时候问过锁）", sleep: VIA("开着的这一笔（不睡）") },
    up: { kind: "via", from: "落层 = PaintBoard.openStroke 交出的那一笔的 commitHost（落层时再问一次锁）", sleep: VIA("commitHost 经 gpu() 叫醒") },
    cancel: { kind: "no-pixels", why: "取消 = 零痕迹" },
    range: { kind: "no-pixels", why: "读" }, tipCount: { kind: "no-pixels", why: "读" },
  },
  PaintWorkbench: {
    pointer: { kind: "asks-lock", how: "落笔之前过门 this.d.gate（= main.ts paintStrokeGate，锁着回 \"locked\"、提示行说锁的那句）", sleep: VIA("SpacePaintStroke.down（落笔的这张画正在编辑：tick 里 setEditing 了，本来就醒着）") },
    constructor: NO("建控制器"),
    stroking: { kind: "no-pixels", why: "读" },
    tick: { kind: "no-pixels", why: "每帧：叫醒冷的画（读文件）" },
  },
};

/** 每个类住在哪个文件（守卫用）。 */
export const PIXEL_WRITE_FILES: Readonly<Record<keyof typeof PIXEL_WRITES, string>> = {
  PaintBoard: "src/paint/board.ts", PaintBoards: "src/paint/boards.ts", SpacePaintStroke: "src/paint/space-paint.ts", PaintWorkbench: "src/app/paint-workbench.ts",
};
