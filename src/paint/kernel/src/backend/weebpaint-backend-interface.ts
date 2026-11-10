// weebpaint-backend-interface —— 纯接口文件（类 .h）：契约与实现分离（提案 §3，pin 住；
// 形状变了要回写 20260808-c-headless-proposal.md）。实现体 = ./weebpaint-backend.ts。
//
// 【硬纪律】本文件全部方法只收/吐 标量 | JSON-able 对象 | TypedArray/bytes——它同时是
// 进程内 api、postMessage 协议、MCP tool schema、multiplayer 序列化面（同一把刀）。
// ViewLeaf/LayerPixels 等引擎对象**不得**出现在签名里。
//
// 事务模型（提案 §6.1，C4 普查定形）：同时最多一个 open transaction（workpiece 单令牌墙的
// 接口化身）；第二个 begin、开着期间的 undo/redo、冲突 verb → 响亮拒绝（throw）。
// dispose 时开着 → cancel 后释放（interrupt=cancel 家规）。
//
// C7 第一棒收编范围：生命周期 + 字节面 + 读面 + 层结构 verbs（LayersFace 穿接口衣）+ undo。
// C8 档口接通：**stroke 档 + filter 档均已接真实现**——stroke = StrokeSession 进程内升格（栅格域
// = inject.gl 缺省 SoftGl2Port，headless/MCP 无参即画）；filter = adjust surrogate 的 headless
// 升格（kernel 清单 = backend/filters/index.ts，未注册 id 响亮 throw；begin 冻结源、setParams
// 从冻结源纯函数重算、commit 逐 tile diff 落层一步、cancel 无痕）。
// verbs 全清单（选区/浮层/fill/doc 几何）随后棒逐条过（§6.3 留白纪律：不提前固化）。

// ---- 读面投影（JSON-able；引擎树的标量镜像）----
export interface BackendLayerNode {
  id: number; name: string; visible: boolean; opacity: number; mode: string;
  clippingMask: boolean;
  lockAlpha?: boolean;                    // 叶才有
  children?: BackendLayerNode[];          // 组才有
}
export interface BackendDocInfo {
  // backgroundColor 已删（2026-08-10 user 拍板 ORA 对齐：doc 无纸色，透明即透明）
  width: number; height: number;
  activeId: number | null; referenceLayerId: number | null;
  layerCount: number;                     // 叶计数（maxLayers 预算对照）
}
export interface BackendChangeEvent {
  canUndo: boolean; canRedo: boolean; isDirty: boolean;
}

// ---- 指令面返回形（标量版 OpStatus/AddLayerResult）----
export type BackendOpResult = { ok: true } | { ok: false; msg?: string };
export type BackendAddResult = { ok: true; id: number } | { ok: false; msg?: string };

// ---- 多步事务句柄（≈ WriteToken 的远程化身）----
export type StrokeId = number;
export type FilterSessionId = number;

/** ResolvedBrush 快照（begin 冻结一笔；画一半动笔=下一笔生效）。C8 钉细：**扁平 ResolvedBrush
 *  字段**（common/resolved-brush.ts，全标量）+ 可选 `mode: "brush" | "erase"`（缺省 brush）；
 *  缺字段一律 DEFAULT_CONFIG 兜底（common/current-brush-config.ts——MCP 只传 {size,color} 也出
 *  完整可画的笔）。平滑推导在 backend 内（streamline/stabilization × SMOOTH_DEFAULTS 常数，
 *  deadzone 单位 doc px）——同一快照+同一 (x,y,p,t) 序列 → 同一输出（ADR-0009 决定论）。 */
export type ResolvedBrushSnapshot = Record<string, unknown>;

export interface WeebPaintBackendInterface {
  // ── 生命周期：born-loaded，无空态无 load 方法（liminal space 结构性不存在）——
  //    换画 = 弃旧建新；load/new 的舒服语义住壳层 tab 管理器。
  dispose(): void;                        // 显式释放（undo 栈/tileset/观察者退租；幂等）
  readonly disposed: boolean;

  // ── 字节面：吐包好的 binary（加密等外包装壳再开一次包）──
  encodeOra(opts?: {
    /** 壳 sidecar（不透明携带，backend 不解释）：desk struct → .weebpaint/editor-state.json；字节 = 原样写回。 */
    editorSidecar?: object | Uint8Array;
    /** 参考目录（format 3）：`.weebpaint/references/` 下的文件原样写入（manifest.json + 字节；契约归
     *  @internal/reference-window，backend 不解释）。 */
    referenceFiles?: { path: string; bytes: Uint8Array }[];
    /** 录像两件（.weebpaint/timelapse.json + .mp4）原样写入。 */
    timelapse?: { json: string; mp4: Uint8Array } | null;
    /** `.weebpaint/` 下本版不认识的 entry（open 的 sidecar.extraEntries），原样写回。 */
    extraEntries?: { path: string; bytes: Uint8Array }[];
  }): Promise<Uint8Array>;
  exportImage(fmt: "png" | "jpg"): Promise<Uint8Array>;   // 合成→字节；jpg 经注入编码器；GL 缺席响亮失败

  // ── 读面（JSON-able 投影）──
  docInfo(): BackendDocInfo;
  layerTree(): BackendLayerNode[];        // bottom-first（与 stack.xml/decode 同序）
  isDirty(): boolean;
  markSaved(): void;

  // ── 指令面：只收终值 verb；交互/手柄/多步输入 backend 绝不碰 ──
  // 层结构（LayersFace 现有面 api 化第一批；返回即入栈一步，no-op 不占步）
  layerAdd(name?: string): BackendAddResult;
  layerDuplicate(id: number): BackendAddResult;
  layerRemove(id: number): BackendOpResult;
  layerMove(id: number, delta: number): BackendOpResult;
  layerMergeDown(id: number): BackendOpResult;            // 需合成注入（GL/软合成）；缺席响亮失败
  layerSetProp(id: number, prop: "name" | "visible" | "opacity" | "mode" | "clippingMask" | "lockAlpha", value: string | number | boolean): BackendOpResult;
  layerSetActive(id: number): boolean;
  layerClear(id: number): BackendOpResult;
  setReferenceLayer(id: number | null): BackendOpResult;

  // ── doc 几何（C8 MCP 验收点名 crop；其余 doc 几何 verbs 随后棒逐条过——§6.3 留白纪律）──
  // 允许负向扩张（x/y<0、w/h>doc——doc-ops v127 语义）；尺寸 1..8192；选区随裁剪映射、persp VP 平移。
  crop(x: number, y: number, w: number, h: number): BackendOpResult;

  // ── undo（open transaction 期间 throw——令牌墙语义）──
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;

  // ── 多步事务档口（契约 pin；进程内实现 C8 接通栅格域后落地，现在响亮 throw）──
  // stroke 档（累积真改；全部笔类共用——差异在 ResolvedBrush 快照/engineKey 内部）
  strokeBegin(leafId: number, brush: ResolvedBrushSnapshot): StrokeId;
  strokeAppend(id: StrokeId, points: Float32Array): void;   // (x,y,p,t)×N，stride=4，版本化留扩展位
  strokeEnd(id: StrokeId): boolean;                         // 平滑+栅格+bake+记账全在 backend；false=no-op
  strokeCancel(id: StrokeId): void;
  // filter 档（参数重算；原型 = filters-adjust surrogate 逐字升格）
  // wire 裁定（C7，补 §6.3 留白的两条）：①互斥归属 = **per-backend**——每 backend 自持 workpiece
  //   单令牌墙，租户即独立 doc，跨租户互斥结构上不存在（多 tab 各锁各的）。②session 超时：进程内壳
  //   无超时（收口权在 UI，挂任意长人类时间 = adjust 现语义）；远程面（MCP/Worker）断联 = cancel
  //   （interrupt=cancel 家规）——具体心跳/超时值随 C8 transport 一起定，此处只 pin 语义不 pin 数值。
  filterBegin(leafId: number, filterId: string): FilterSessionId;
  filterSetParams(id: FilterSessionId, params: Record<string, unknown>): void;
  filterCommit(id: FilterSessionId): boolean;               // false = no-op
  filterCancel(id: FilterSessionId): void;

  // ── 事件（壳/embedding 消费；返回 disposer）──
  onChange(cb: (ev: BackendChangeEvent) => void): () => void;
}
