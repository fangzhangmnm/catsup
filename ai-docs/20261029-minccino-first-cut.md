# Minccino 第一刀日志：现状原样搬进 `src/minccino/` 笼子、画面一个像素不变

> created 20261029 · as-of v0.17.1 / 2026-10-29 · created by Claude Fable 5.1 · 长期文档 = `20261029-tron-renderer-skeleton.md` v2（§6 八小步 + 6½ 是这份日志的目录）；user 原话在 `20261029-tron-epoch-ledger.md`。这份只记**每一步做了什么、怎么验、碰到什么、重冻基线的理由**——新 agent 接着做先读这份再读骨架稿。

## 步 1 截图基线（v0.17.1）

**尺子** = `test/probes/probe-render-baseline.mjs`（无头 swiftshader；`python3 -m http.server 8765` 后 `node test/probes/probe-render-baseline.mjs [--update] [scene…]`）。读的是 **WebGL 画布像素**（`editor.draw()` 紧跟 `gl.readPixels`），不是页面截图：HUD / 芯片 / gizmo 是 DOM 不进基线；选中 / 悬停 / 锁轴线 / 面点 / 参考线 / 轴这些**画布画的叠加层进基线**（第 6 步搬叠加层契约时靠它盯「样子不变」）。基线图住 `test/fixtures/render-baseline/<scene>.png` + `manifest.json`（尺寸 / 冻结日期 / 版本）；PNG 编解码零依赖 `test/probes/lib/png.mjs`（node:zlib）。判据：单通道差 ≤ 8 不算不同；不同像素 > 0.5% = 红（差图 + 现图写到 `$PROBE_OUT`，默认 /tmp）。页面 `pageerror` 也算红（报错的页面比出来的像素不算数）。

**视口** 744×1133、DPR 1（iPad mini 竖屏的 CSS 尺寸；DPR 1 = 图小一半、像素线走 GL 线那条路，粗线另有场景）。同机同 build 重跑 = 0 个像素不同（确定性成立）。

| 场景 | 摆什么 | 盖哪条路 |
|---|---|---|
| box-iso | 硬表面 1 m 盒子，iso | 池网格 + GL 线 1 px + 地面网格 + 世界轴 |
| box-thick-sel-hover-lock | 线粗 2 + 选中顶面 + 移动工具悬停侧面 + 锁 X | LineSegments2 + `onBeforeCompile` 轮廓逻辑（第 5 步要拔的漏点）、选中覆盖层、悬停点、锁轴线（`lock-guide.ts`） |
| box-textured | 顶面 + 一张侧面刷上现造的 16×16 格子 PNG | 贴图材质（DataTexture 占位 → ImageBitmap）、UV |
| box-xray | 硬表面 X 光 | 边透过面（xray 线材质） |
| mesh-sel | 盒子转网格体、进自由建模、选中顶面 | 网格体池、顶点小点、选中点 / 面 |
| mesh-xray-dots | 网格体 + X 光 | 面点（每张面中心小方点） |
| fixture-house / guided / meshed / twoSided / painted | 冻结样本 | 组 / 组件层级与池轴、参考线 / 参考点 / 坐标架、网格体样本、双面材质、材质色 |

**顺手修的一个真 bug（基线抓到的）**：贴图面全黑 + WebGL 警告 `texSubImage2D: no pixels`。根：`render3.ts textureFor` 的占位是 `DataTexture`，解码完把 ImageBitmap 塞进它的 `image`，three 仍按 DataTexture 走 `image.data` 上传 → 没像素 → 黑；而且 `onTextureReady` 从来没人接（解好也不重画，要等下一次交互）。修：解好后换成一张普通 `Texture`，材质的 `uMap` 跟着换、占位 dispose；`main.ts` 接 `onTextureReady → editor.draw()`。**没在真机验**（无头 swiftshader 验的；根因是 three 的上传路径，和驱动无关）。周账 / 账本里「贴图进颜色通道」那条 Opus 的活不受影响（那是语义材质那一层）。

**冻结样本 painted.glb 的格子贴图永远是灰的**：它那张 82 字节 PNG 是测试里手搓的，Chromium 解不开（`createImageBitmap` → "could not be decoded"）——真机上也灰。基线那条场景标 `noTexWait`，贴图那条路由 box-textured 盖。

**VR 的逻辑基线**（6½ 步的「不许退」尺子）：`test/probes/.deprecated/probe-xr-fake.mjs`（10-25 退役，路径从 `.deprecated/` 起少一层、要改成绝对路径才跑得起来）今天 **13 ✓ / 5 ✗**；5 个 ✗ 全是探针自己过时（`commitOp({ op: "pushpull", face: <id> })` 该传面环多边形 → `n.map is not a function`），不是 app。6½ 步把它从 `.deprecated/` 复活、修那个 op 形状，之后 ≥ 13 ✓ 且后 5 条也要绿。

**重冻记录**（每次 `--update` 一行：日期 · 场景 · 为什么画面该变）
- 2026-10-29 · 全部 · 首次冻结（v0.17.0 的画面）。
- 2026-10-29 · box-textured · 贴图黑面 bug 修了（上面那条），画面从黑变格子。

## 步 2 目录 + 守卫（v0.17.2）

`src/minccino/`（README.md 是边界标准）：`contract/`（`geometry.ts` 同形类型 Vec3 / Xform12 / Mat4；`stream.ts` 块 / 放置 / 视锥带 / 预算 / 提供者；`view.ts` 视图 = 相机 + 画到哪 + 预算 + 画质档 + 后台预算；`cost.ts` 血槽位读数 / 代价表 / 降档一级 / 能力位）、`graph/frame-graph.ts`（规划器 `planFrame(passes, wanted)`：拓扑排序 + 没人要的剪掉 + 环 / 双写者抛——步 4 才把现状的 draw call 声明成 pass）、`backend/backend.ts`（接口只有名字 + 能力位 + dispose）、`backend/three/`、`overlay/`、`material/`（三个占位，步 5 / 6 / 8 填）、`index.ts` 门牌。

守卫 `test/minccino-guard.test.ts`（进 `npm test`）：① three 围栏棘轮（import three 的文件 ⊆ `backend/three/` ∪ 名单 `THREE_LEAKS = ["editor/render3.ts"]`，名单只准变短、登记了却不再漏 = 红）② 引擎零 three ③ 引擎不 import editor / scene / kernel / mesh / app / format / player / controller，backend 外零 DOM ④ graph / overlay / material / backend 里没有 userAgent / 平台名 / 机型名 ⑤ 规划器单测四条。`scripts/build.sh` 0.7「three 只在 render3」那条 lint 步 5 改成「只在 backend/three」。

契约的取舍：块 = 池本地坐标 + 版本号（= Kernel.rev），放置 = 池键 + 3×4 变换 + 槽键——这正是现状 render3「每池一份几何 + 每槽一个矩阵」的形状，步 3 只是把它写成接口。`colors` 先留着（现状把材质色 / 选中 / 悬停烤进顶点色），步 6 叠加层搬走后只剩材质色。留口全部只留形状：多带、裁块、半成品池、笔画、惰性池、画质档、后台预算、降档梯子。

## 步 3 流提供者 = 编辑器（v0.17.3）

**切在哪**：render3 原来的池路径 = 「每池一份池网格（pool-mesh）+ 每槽一个矩阵 + 同一帧同一内核只同步一次 + 两代没人用的释放 + 只传改过的段」。按**内容 / 显卡**切成两半：
- 内容那半 → `src/editor/stream-provider.ts EditorStreamProvider implements StreamProvider`：拥有池网格（`Body` = 一份 PoolMesh；同一个池要画两个内核就两份）、材质槽签名、两代释放；`pull()` 吐 `StreamFrame { chunks, placements }`——块 = 池网格的大数组**直接包进去**（零拷贝）+ `dirty`（takeDirty 的段）+ 全局单调的 `version`；放置 = 槽键 + 3×4 矩阵 + 过渡期三面旗（active / dim / singleSided）。编辑器 `draw()` / `captureRgba()` 画之前 `provider.setWorld(view, dimSlots)`。
- 显卡那半留在 render3：`setProvider()`、`syncPools()` = 拉一帧 → `uploadFaces / uploadLines`（版本没变不碰；数组换过 / 长大了重建几何；否则 `addUpdateRange` 只传改过的段）→ 槽节点挑材质 / 几何（和以前逐字一样）。`chunkGpus` 两代释放。
- 样式那半（面 / 边颜色、粗线还是像素线）还烤在顶点色里 → `ChunkStyle` 接口（render3 `chunkStyle()` 给，提供者只转交给 pool-mesh）。这是**过渡期的债**：叠加层（步 6）和材质模块（步 8 / Opus）落地后，块只带材质引用、颜色归翻译层。
- 契约改动：`Chunk` 从「positions / normals / colors」改成属性表 `attributes: Record<name, { array, size, normalized }>` + `count` + `instanced` + `dirty`（粗线 = LineSegments2 的实例布局 seg / col / colDim / w1 / w2 / flag，也是过渡期：步 5 后端应该自己从线段造它）。

**验**：单测 1162 绿（含 minccino 守卫、编辑器棘轮 4183 → 4170：断口刻度切去 `editor/break-ticks.ts` 纯函数）；截图基线 11 张 **0 像素差**；探针 pool-mesh（增量 / 全量计数 `poolMesh.full` 照旧）/ twin-preview / nested-preview / preview-refresh / hide / isolate / xray 绿。**旧账**：`probe-context` 红与本刀无关（v0.16.38 笔 / 手指的选区浮条只留「删除 / 更多…」后探针仍期望 `selBarLabels` 含「炸开」、`crumbsShown`）——给 Opus 的探针维护清单。

**没动的**：render3 的「平铺路径」（`rebuildFaces / rebuildEdges`，裸 GeomView 没有槽时走）——两个调用方（draw / captureRgba）都传 WorldView，它是死代码，步 5 删。

## 步 4 frame graph 骨架（v0.17.4）

- 规划器加**追加画**（`PassDecl.appends`）：几组东西往同一个目标上接着画，排在写者和声明顺序在前的追加者之后；要那个资源 = 写者 + 全部追加者；往外部目标（画布）上追加也行。单测四条（含「X 光关着 = 那条 pass 不在表里」、「读 frame 的缩略图 pass 排在追加者之后」）。
- render3 每帧：造 **View**（`id / camera{view, projection, eye, kind} / target{canvas | xr-eye, 设备像素} / budget = DEFAULT_VIEW_BUDGET / quality`）→ `planFrame(passes(), ["frame"])`。现状的 pass 表 = `scene`（膜 + 边，读流写 frame）、`grid`、`overlay`、`xray`（开着才在表里）三个追加。**X 光的节点可见性只看规划里有没有 `xray`**（`setXray` 只改开关，重建在下一帧规划变了才做）。eye 进提供者的 query。`renderer3.lastView / lastPlan` 给探针 / 血槽位读。
- **如实说**：四条 pass 仍是 three 的**一个**渲染调用里的四组节点，规划器只决定哪几组存在、顺序是声明顺序；分目标的 pass（泛光 / 描边 / 整数倍放大 / 缩略图）等后处理落地时才真分开——那时 `appends` 的语义正是「叠加层追加到合成结果上」。目标有效期（`View.validUntil`）钉了形状没用上，按需渲染照旧走编辑器的 batchDraw。
- 验：单测 1163 绿；截图基线 11 张 0 像素差；probe-xray / xray-btn / xray-facedots / pool-mesh / preview-refresh 绿；活页面 dump：`plan = scene>grid>overlay`，开 X 光后 `…>xray`。

## 步 5 three 全收进 backend/three/（v0.17.5）

- **搬家**：`src/editor/render3.ts` 整个 `git mv` 到 `src/minccino/backend/three/render3.ts`（1930 → 1783 行），旧位置只剩转出口（`Renderer3 / PALETTE / LINE_WEIGHTS / POOL_AXES_PX / faceTriangles / ViewState / LineStyle / XRFacade / XRHand` re-export），编辑器 / app 的 import 路径不变。`scripts/build.sh` 0.7 改成「three 只准在 `src/minccino/backend/three/`」；守卫 ① `THREE_LEAKS` 清零。
- **漏点 ① 轮廓线 shader**：`onBeforeCompile` 在 three 编译时改源 → `backend/three/profile-line-shader.ts` 自己的 GLSL 源（= vendored `LineMaterial.js` 的顶点着色器 + `PROFILE_PATCHES` 四处替换，`scripts/gen-profile-line-shader.mjs` 生成字面量）；`edgeMat.vertexShader = PROFILE_LINE_VERTEX`、`uniforms.profileAdd` 直接挂。守卫 ⑥ 逐字比对「vendored 源 + 替换 = 字面量」——升级 three 漂了立刻红；像素一模一样（基线 + probe-erase-red 的粗线轮廓）。
- **漏点 ③ XR 会话钩子**：`Renderer3 implements Backend`（`name / caps() / dispose()`），既有的 `xr` 门面（isPresenting / setSession / session / frame / refSpace / on）+ `setLoop` 就是后端接口上的会话钩子；vr.ts / locomotion.ts 照旧经 `editor.renderer3.xr`。
- **漏点 ② three 的向量 / 矩阵 / 颜色**：搬家后全在围栏里；引擎其他部分零 three（守卫 ②）。编辑器侧经 render3 API 拿到的 three 对象只剩 `rig`（旧假 XR 探针读它）——6½ 收。
- **删死代码**：平铺路径（`rebuildFaces / rebuildEdges / flatSmoothNormals / vkey / OTHER_KEY / hidePools` + `faceMeshOther` / `edgePixel` 两个节点）——两个调用方都传 WorldView，裸 GeomView 现在直接抛。
- **过渡期的债，守卫 ③′ 棘轮盯着**：搬进来的 render3 还 import 内容层 **19 条**（编辑器 / 场景 / 内核类型 + 叠加层几何：选中高亮读 WorldView、尺规 / gizmo 读 Frame、`faceTriangles` 用 three 的 earcut 给 OBJ 导出）。条数只准降，步 6 叠加层契约落地后清零；清零后 `src/editor/render3.ts` 这个转出口也收窄成「视图 + 叠加层 + 流」。
- 验：单测 1165 绿；截图基线 11 张 0 像素差；probe-erase-red / xray / pool-mesh / lift / lock-line / walk 绿；旧假 XR 探针仍 13 ✓。

## 步 6 叠加层契约（待）
