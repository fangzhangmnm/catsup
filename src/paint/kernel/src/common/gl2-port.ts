// Gl2Port —— 「WebGL2 对我们的承诺集」手写最小 interface（ADR-0009 决定 1；C1 落地，C8 动词面收编）。
//
// 性质：**单后端语义契约**，不是通用 device abstraction——将来接其他 graphics API = 实现这份承诺，
//   实现不了再顺着接口伤筋动骨。命名诚实：叫 GL2 不叫 GPU（我们用的是受限 GL 子集）。
// 实现体：BrowserGl2Port（src/shell/browser-gl2-port.ts，真 WebGL2 + 全部 quirk，壳造好递入）；
//   SoftGl2Port（C8 后棒，迂腐语义软模拟，测试/MCP 域专用——用户 runtime 无 WebGL2 照旧响亮失败）。
//
// 自愈分工（ADR-0009 决定 2）：
//   - **结构自愈归 Port**：context-loss 检测、program/FBO/VAO 重建、generation++、onInvalidated 广播。
//   - **数据自愈归 backend**：内容重传（CPU tile 池恒 SSoT；bridge cpuId→gpuId 映射在 backend 侧）。
//
// C8 动词面（`gl` 裸口清零——终态契约无裸 WebGL2RenderingContext 出口）：
//   - 全部句柄（PooledFBO / Gl2Texture / Gl2TileArena）对 backend **不透明**——SoftGl2Port 自造同形对象。
//   - 绘制只有两个动词：draw（按名 shader 画单位 quad）/ drawInstanced（quad 实例批，loc1=vec4/实例）。
//     顶点域钉死单位 quad [0,1]²（loc0，位置即 uv）——本引擎全部 pass 都是全屏/子矩形 gather，
//     不开放任意几何（接口就这几个动词，别扩）。
//   - uniform 类型由实现体从 shader 反射（浏览器 getActiveUniform / 软实现按注册表约定）；
//     **mat3 一律 9 元素 row-major**（实现体自转置）；bool → int。未声明/被编译器裁掉的名字静默跳过
//     （与 WebGL null-location 语义一致——调用方可无条件传全量 uniform）。
//   - sampler 单元分配归实现体（按声明序）；**未提供的 sampler 绑实现体占位纹理**（浏览器 quirk：
//     未绑 sampler 落单元 0 与 sampler2DArray 类型冲突 = INVALID_OPERATION——这类脏活全在实现体内）。

// 渲染目标精度档：u8=RGBA8（present/屏显），f16=RGBA16F（合成累积，§7 banding bonus），
//   f32=RGBA32F（精度验证/陡 blend 模式；比 f16 多一倍 transient，仅累积器一张、不乘层数）。
export type FBOPrec = "u8" | "f16" | "f32";

// 壳填好的能力数据（Port 构造时探测一次；backend 只读）。
export interface Gl2Caps {
  maxTextureSize: number;        // MAX_TEXTURE_SIZE（iPad Apple GPU ≥ 16384）
  maxArrayLayers: number;        // MAX_ARRAY_TEXTURE_LAYERS（tile 池深度上界）
  maxTextureUnits: number;       // MAX_TEXTURE_IMAGE_UNITS（≥16；用不到那么多，ping-pong 逐层叠）
  floatColorBuffer: boolean;     // 能否渲到 RGBA16F/32F（EXT_color_buffer_float）
}

// 池化的离屏渲染目标：句柄不透明（实现体内部持真 framebuffer/texture）。
//   可作 draw 的 target，也可作 textures 里的采样源（采它的颜色附件）。
export interface PooledFBO {
  readonly w: number;
  readonly h: number;
  readonly prec: FBOPrec;
}

// 2D 纹理句柄（createTexture 造、uploadTexture 定义内容、deleteTexture 释放）。不透明。
export interface Gl2Texture { readonly kind: "tex2d"; }

// 上传格式（= 全仓实际用到的四种；数据一律 typed array verbatim 上卡——canvas 源上传在 Safari
//   的 premult 转换不可靠，v0.6.38 起结构性禁入）：
//   rgba8   = straight RGBA 字节（Uint8Array/Uint8ClampedArray）
//   rgba16f = float 数据渲 16F（Float32Array；B 样条系数平面）
//   r8      = 单通道字节（选区 mask；实现体自管 UNPACK_ALIGNMENT）
//   r32f    = 单通道 float（tile index：doc tile 坐标 → arena slice，-1=空）
export type TexUploadFormat = "rgba8" | "rgba16f" | "r8" | "r32f";

// blend 状态（= 全仓用到的三种，枚举封闭；新模式先过 user/ADR 再进契约）：
//   none         = 关 blend（合成数学在 fragment 手算，直值累积器约定）
//   premult-over = FUNC_ADD + (ONE, ONE_MINUS_SRC_ALPHA)（build-up dab 累积，预乘域）
//   max-alpha    = MAX 方程（wash dab 累积：accum.a = max(accum.a, dabA)）
export type Gl2Blend = "none" | "premult-over" | "max-alpha";

// 纹理采样源：2D 纹理 / 池化 FBO 的颜色附件 / tile arena（sampler2DArray）。
export type Gl2TexSource = Gl2Texture | PooledFBO | Gl2TileArena;

// 一次 draw 的完整状态描述（无 ambient 状态——每个 draw 自带全部状态，实现体负责设置与还原）。
export interface Gl2DrawSpec {
  program: string;                                    // 已注册的 program 名（未注册 = throw）
  target: PooledFBO | "screen";                       // "screen" = 默认 framebuffer（屏显 present）
  viewport?: [number, number, number, number];        // 缺省 = 目标全幅；target="screen" 必给（canvas device px）
  clear?: [number, number, number, number];           // draw 前先全幅清此色（scissor 之外也清）
  scissor?: { x: number; y: number; w: number; h: number };   // 只着色该子矩形
  blend?: Gl2Blend;                                   // 缺省 "none"
  uniforms?: Record<string, number | boolean | number[] | Float32Array>;
  // sampler 名 → 源；带 filter 的写法给屏显 present 切 LINEAR/NEAREST（缺省不动纹理参数）。
  textures?: Record<string, Gl2TexSource | { src: Gl2TexSource; filter: "nearest" | "linear" }>;
}

// GPU tile arena（纹理仓，TEXTURE_2D_ARRAY 等价物）——**归 Port 所有**（多 tab/多 backend 公共
//   资源；每租户（GlRoom）持一个 arena）。记账层 GpuTilePool（backend 侧纯 JS）持本句柄当
//   backend；合成 pass 把它当 sampler2DArray 采样源。
export interface Gl2TileArena {
  readonly kind: "arena";
  readonly tileSize: number;                          // 方 tile 边长（= TILE_SIZE）
  readonly capacity: number;                          // slices
  // 重建为 newCapacity 的全新空存储（实现体先删旧 + flush 再建，防显存双峰）。旧内容全丢。
  recreate(newCapacity: number): void;
  uploadSlice(slice: number, pixels: Uint8Array): void;
  // 从 from 的颜色附件拷 (srcX,srcY) 起 w×h（≤tileSize²）进 slice 左上（segment 缓存零 readback
  //   入池；doc 边缘 tile 不足额 → 部分拷贝，slice 余下 texel 是旧值但永不被采样——
  //   sampleTiled 的 docPos < docSize 保证 local uv 不越进 padding）。
  copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void;
  // 退租（C8 ⑥）：owner（GlRoom/backend dispose）显式释放——真 GPU 立即 free 显存、SoftGl2 弃
  //   引用交 GC；Port 记账同步减（arenaStats）。**退租后任何动词 = 响亮 throw（ARENA_DISPOSED）**
  //   ——用死租约是结构 bug，不静默吞。幂等（二次 dispose 无害）。
  dispose(): void;
}

export interface Gl2Port {
  readonly caps: Gl2Caps;

  // ---- 结构自愈契约 ----
  // context 丢失中（真机后台切走等）。丢失期渲染调用方自行早退（板级契约：isLost → 本帧放弃）。
  readonly isLost: boolean;
  // 结构自愈纪元：每次 loss→重建 +1。持久句柄 holder 缓存创建时的 generation，与此不等即重建。
  readonly generation: number;
  // 失效广播（多播）：重建完成（generation 已 ++、program 已重编、FBO 池已清）后通知——
  //   全部驻留/映射作废，backend 惰性从 CPU SSoT 重传。
  onInvalidated(cb: () => void): void;

  // ---- shader program（按名注册缓存；restore 后自动重编） ----
  // 确保 name 已注册；首次需给源。（C8 后棒起注册表扩成 { GLSL 源, CPU 等价函数 } 的 GPU/CPU
  //   对表——新 shader 不配 CPU 版必须显式 GPU-only 登记，ADR-0009 决定 5。）
  program(name: string, vert?: string, frag?: string): void;
  // 非阻塞预编译（2026-09-19，手指首笔卡顿案）：起编译+链接但**不查状态**，实现体在空闲时轮询 KHR_parallel_shader_compile 的
  //   COMPLETION_STATUS 收尾（无扩展则下一 tick 同步收尾）。之后 program(name) 若还没收尾就当场收尾（比从零编译快）。
  //   可选动词：SoftGl2Port = program 同义；调用方用 `port.warmProgram ?? port.program`。
  warmProgram?(name: string, vert: string, frag: string): void;

  // ---- FBO 借还（有界池：MRU 复用、LRU 驱逐真删） ----
  borrowFBO(w: number, h: number, prec?: FBOPrec): PooledFBO;
  returnFBO(f: PooledFBO): void;
  // 清空 FBO 池并真删资源（doc 尺寸变——池里全是旧尺寸永不再命中，主动清）。
  clearPool(): void;
  // dev HUD：池占用（确认有界）。
  readonly fboPoolStats: { count: number; bytes: number };
  // 暖场预借守卫（2026-09-19，user「预借再还 不会在小内存机器上惹麻烦可以试」）：池里已有同尺寸空闲件 → 预借是空操作，别做；
  //   预算不够 → 跳过。可选口，实现体缺席 = 调用方跳过预借。
  fboPoolHas?(w: number, h: number, prec: FBOPrec): boolean;
  readonly fboPoolBudgetBytes?: number;
  // FBO 清成纯色（累积器铺底等「只清不画」场景；draw 顺带清用 spec.clear）。
  clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void;

  // ---- 绘制动词 ----
  draw(spec: Gl2DrawSpec): void;                      // 单位 quad 一发（TRIANGLES×6）
  // quad 实例批：loc0 = 单位 quad，loc1 = vec4/实例（divisor 1），instances = 紧密打包 4·count。
  //   实例序 = 数组序（gl_InstanceID 单调）→ premult-over 累积次序与逐 draw 逐位等价。
  drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void;

  // ---- 读回（RGBA8）----
  readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array;

  // ---- 2D 纹理 ----
  createTexture(): Gl2Texture;                        // NEAREST + CLAMP_TO_EDGE（本引擎唯一参数组合）
  uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void;
  deleteTexture(tex: Gl2Texture): void;

  // ---- tile arena ----
  createTileArena(tileSize: number, initialSlices: number): Gl2TileArena;
  // 租户记账（C8 ⑥）：本 Port 名下**活着的** arena 数 + 承诺显存字节（Σ capacity·tileSize²·4，
  //   recreate 后按新容量现算）。多 backend 共享一个 Port 时的公共资源观测口（HUD/tab 管理器）。
  //   配额**裁决**不在 Port——各租户 GpuTilePool 已按自家预算自限（reserve quota 顶）；这里只记账。
  readonly arenaStats: { count: number; bytes: number };
}
