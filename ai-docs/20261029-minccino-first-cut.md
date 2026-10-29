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
- 2026-10-29 · style-pixel-sel / style-pixel-house / style-pixel-textured · **只加新场景、没重冻旧的**：Tron 第 1 步像素描边落地（v0.17.10，Claude Opus 5.5；`ai-docs/20261029-preset-inventory.md` §5）。原 11 张照旧 0 像素差。
- 2026-10-29 · style-papercut-boxes / style-papercut-painted · **只加新场景**：剪纸 · 色纸落地（v0.17.11，Claude Opus 5.5；清单 §5）。前 14 张照旧 0 像素差。
- 2026-10-29 · style-tron-sel / style-tron-house-thick · **只加新场景**：CRT Tron 落地（v0.17.12，Claude Opus 5.5；清单 §5）。前 16 张照旧 0 像素差。style-tron-house-thick 当天重冻过一次：粗线在小图上断成点的 bug 修了（同一个版本内，没发出去过）。
- 2026-10-29 · style-bronze-boxes / style-bronze-house · **只加新场景**：铸铜落地（v0.17.13，Claude Opus 5.5；清单 §5）。前 18 张照旧 0 像素差（含遮蔽图集 5×4 → 5×5 之后的剪纸 2 张）。

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

## 步 6a 叠加层契约：线段族（v0.17.6）

**分工定了**（契约 `src/minccino/overlay/index.ts`）：**内容归编辑器**（哪几段线、什么颜色、什么键），**量尺归引擎**（`OverlayCtx`：`worldPerPx(p)` 一像素多长、`infLine` 无限长线画到多远、`reachKey`、相机的 target / forward / right / up、边线宽、dpr——XR 按角尺寸、桌面按深度，编辑器不知道是哪种），**画归后端**（`LINE_STYLES` 表 = 每种线的材质参数，**声明顺序 = 材质创建顺序**，three 画家排序平手按材质 id 所以别乱序）。
- 编辑器 `src/editor/overlay-lines.ts overlayLines(view, ctx)`：从 render3 原样搬出 13 组线——量角器 / 参考线（线 / 点 / 圆 / 球）/ 平滑边 / 充能（延长线 + 小菱形）/ 断口刻度 + 轴刻度 / 平面 gizmo 的线 / 变换 gizmo 的箭杆 + 环 / 三种三轴（选中组 / 空组件 / 组件原点）/ 锁轴线 / 卷尺 / 刀线 / 吸附提示线 / teleport 弧 / 胶囊——几何、颜色（`hexToLinear` = three `SRGBToLinear` 同一公式，位级相同）、缓存键**逐字一样**。ViewState 多一个字段 `overlay`（编辑器传函数引用，经转出口拿）。
- 后端 `backend/three/overlay-lines.ts OverlayLinesDrawer`：16 份 LineMaterial 一次建齐；每个 item id 一个 LineSegments2，key 没变不重建；没给的藏。`setLineGeometry` 搬到这里（render3 的选中边 / 地面轴还用）。
- render3 1783 → **1455 行**；三色轴（地面）、平面 gizmo 的半透明方块、变换 gizmo 的锥 / 块 / 片、吸附小球、落点环、点（顶点 / 面点 / 选中点 / 中缝点）、文字、选中高亮还在里面 = 6b / 6c。
- 探针纪律：**不摸 three 对象，问契约 id**——`r3.overlayVisible("lockLines" | "soft" | …)`；probe-lock-line / probe-mesh-marks 改过来了。
- 验：单测 1165 绿（③′ 棘轮 19 → 18）；基线 11 张 0 像素差；probe lock-line / tape-grid / compass / hover / axis-lock / capsule / mirror / transform / mesh-knife / mesh-marks / erase-red / walk 绿。

## 步 6b 叠加层：点 / 标记 / 三角 / 文字（v0.17.7）

- 契约加四种 item：`OverlayPoints`（样式表 `POINT_STYLES`：selVert / vert / faceDot / seam = 现状四种 Points 的 shader 参数——CSS px 大小、圆 / 方、往相机拉的系数 0.994 / 0.996 / 0.995、颜色 null = 每点一色〔faceDot 的 sRGB 浮点〕、画序 4 / 3 / 5 / 3.5）、`OverlayMarker`（`MARKER_STYLES`：snap 球 / landing 环 / handle 方块 / xgCube / xgCenter / xgCone / xgPlane；**朝向的矩阵数学归后端**——编辑器只说「让 +Y 指向 d」或「按这三根轴摆」，后端用 three 的 setFromUnitVectors / makeBasis 算，和以前逐位一样）、`OverlayTris`（gizmoQuad 半透明方块）、`OverlayLabel`（= WorldLabel）。
- 编辑器 `src/editor/overlay.ts overlayItems(view, ctx)` = 线段族 + 缩放柄 / 顶点小点 / X 光面点 / 中缝点 / 选中点 / 平面 gizmo 方块 / 变换 gizmo 的锥 块 片 / 文字 / 吸附小球 / 落点环。后端 `backend/three/overlay-marks.ts`：点 = 每种样式一份 Points（shader 字符串逐字同以前）；标记 / 三角 = 每个 id 一个 Mesh（首次出现才建）；文字 = Sprite。
- **文字排版 + 光栅化搬进引擎**：`src/minccino/backend/label-raster.ts`（LABEL_STYLES / rasterizeLabel / anchorCenter；住 backend/ 因为碰 canvas），`editor/world-labels.ts` 只剩 WorldLabel + 单位换算（再导出光栅那几个名字）。
- render3 1455 → **1183 行**；还在里面的 = 地面网格 + 三色轴（引擎自己的 pass，吃帧 + 格距）、选中高亮（6c）、池 / 边 / X 光（本体）、XR 钩子 / 手腕面板 / 字幕（6½ 收）。
- 探针：probe-mesh-mirror 改问 `overlayVisible("seam")`；`labelKeys()` 保留（转给后端）。
- 验：单测 1165；基线 11 张 0 像素差；probe hover / transform / mirror / select-points / xray-facedots / mesh-mirror / units / gridplane / walk / soft-select / scale-ref / capsule / axis-marks 绿。
## 步 6½ VR 照跑（v0.17.8）

- 旧假 XR 探针从 `.deprecated/` 复活成 `test/probes/probe-xr-fake.mjs`：路径少一层改回来；那 5 条红全是探针自己过时的 op 形状（`pushpull` 早改成「池地址 + 面环多边形」）——改完 **18 / 18 ✓**（会话开始 / rig 代数 / 摇杆 / snap turn / 扳机画线 / 手腕面板 / 长按选膜 + 环边 / 长按连通体 / 充能弧 / 瞬移 / 退出恢复）。VR 接线没退过。
- 现状如实说：XR 经 three 的 WebXRManager / ArrayCamera 画两只眼，**一次提取**（提供者 `pull` 每帧一次，和桌面一样）；`View` 对象只有一个（`target.kind = "xr-eye"`），「两只眼 = 两个 View」的形状等后端换掉（初中）再真分开。XR 会话钩子 / rig / 控制器 / 手腕面板 / 字幕都在后端 render3 里，接口 = `Backend.xr` + `setLoop / setRig / setPointerVisual / attachWristPanel / attachSubtitle`。

## 步 7 代价表骨架 + 血槽位（v0.17.8）

- `contract/cost.ts`（步 2 的形状）+ **`src/minccino/budget.ts checkBudget(m, budget)`**：超了哪几项 + 一句人话披露（「超预算：每帧毫秒 21.9 ms / 16.7 ms」）+ 各项占比。
- render3 每帧实测：`frameMs`（`renderer.render` 前后 `performance.now`）、`drawCalls` / `triangles`（three `renderer.info.render`）、`vramMb`（**估算**：块的显卡副本字节 + 贴图 w×h×4；three 不报字节）、`passes`（规划里跑了几条）→ `r3.lastMeasurement / lastBudget`，也写进 `perf.last["render.ms" | "render.drawCalls" | "render.triangles" | "render.vramMb"]`、超了 `perf.count["budget.over"]++`。**披露的 UI（血槽位的样子）归 Opus / 上线后**（T13：这是 UX，不是引擎）。
- **电量感知**：`src/minccino/device.ts` = 量设备的唯一地方（守卫 ③ 对它放行 navigator、④ 盯别处不许判设备）：`initPowerSensing / powerState()`（电量 / 充电 / `saver` = 感知开 ∧ 没充电 ∧ ≤ 20%；拿不到电量 = false 不猜）、`setBatteryAware`（默认开，设置里关 = 以后接）、`onPowerChange`。谁消费（后台预算 / 降档梯子）= Opus 第 9 步；小学只读状态。
- 预算数字 `DEFAULT_VIEW_BUDGET = 16.7 ms / 256 MB / 200 draw call` 是**先写的**，校准 = 初中。

## 步 8 材质模块接口（v0.17.8）

`src/minccino/material/index.ts`——只钉接口，内容归 Opus（task #91 第 4 步）/ 绘制纪元：
- ① 语义通道注册表（开放集，`ChannelDef { id, form: scalar | map | both }`；小学只登记 `color`——「颜色 + 哪两个做旧」T8 还开着）② 工艺标签 `CraftTag`（shadeless / specular / bronze / papercut / plastic / 开放）③ **翻译按工艺登记、一个工艺一份**（`registerTranslation(craft, fn)`；`translate(m)` 按标签顺序套、没写的槽用默认、**不认识的工艺报在 `unknown` 里不静默**、翻译写了没登记的槽 = 抛）④ **开放槽表** `BASE_SLOTS`：PBR 组（baseColor / roughness / metallic / emissive / height / mask / unlit）+ **不是 PBR 子集的那几组**（T36）：toneBand（GB 四色）/ inkColor inkWidth innerInk（Casio 线稿）/ paperColor paperLayer paperThickness（剪纸色纸）/ patinaColor cavity（铸铜）/ outlineColor toneSteps（像素描边）/ edgeGlowColor edgeGlowStrength（CRT Tron）；每槽带默认。
- 管线 `declareReads({ pipeline, reads })`：读了没登记的槽 = 抛。小学四个点名风格 + 白模的 reads 写成数据 `GRADE_SCHOOL_READS`（Opus 填预设时照它要东西）。`createMaterialRegistry()` = 基础槽 + 四管线 reads + 两个最薄的翻译（base：颜色 → baseColor；shadeless → unlit）。
- 单测 `test/minccino-material.test.ts`：四管线 reads 全登记过且槽组齐；重复 / 未登记 = 抛；翻译顺序 / 默认 / unknown。

## 第一刀的验收（v0.17.8）

| 验收条 | 状态 |
|---|---|
| 既有探针全绿 | 跑过的全绿（pool-mesh / twin / nested / preview-refresh / hide / isolate / xray ×3 / erase-red / lift / lock-line / walk / tape-grid / compass / hover / axis-lock / capsule / mirror / transform / mesh-knife / mesh-marks / select-points / xray-facedots / mesh-mirror / units / gridplane / soft-select / scale-ref / axis-marks / **xr-fake 18/18**）；`probe-context` 当时红是 v0.16.38 的旧账（和渲染无关）——**10-29 晚 Opus 修了**：探针过时在两处（笔的选区默认「切换」，刚建完的组还选着、笔一点就点掉；笔 / 手指右下只剩「删除」「更多…」），应用没改 |
| 截图基线逐张过 | 11 张，每一步 **0 像素差** |
| 三条新守卫绿 | 守卫 ①②③④⑤⑥ + ③′ 棘轮 + 材质 / 预算单测，`npm test` 1169 绿 |
| render3.ts 被 `src/minccino/` 吃掉、editor.ts 只剩接缝 | render3 **本体住 `src/minccino/backend/three/render3.ts`**（1930 → 1183 行），`src/editor/render3.ts` 只是转出口；editor.ts 的渲染调用 = `provider.setWorld` + `r3.render` + 叠加层函数引用。**6c（v0.17.9）吃干净了**：选中高亮经叠加层契约、`ViewState` 住编辑器 `view-state.ts`、`faceTriangles` 住编辑器且不借 three——render3 922 行、**零内容层 import**，守卫 ③′ 清零（名单空） |

## 步 6c 叠加层：选中高亮 + ViewState 搬家 + 守卫 ③′ 清零（v0.17.9，task #92；edited by Claude Fable 5.1 2026-10-29）
- **选中高亮进契约**：叠加层多一种 item `OverlayFaces`（三角 + 法线 + 每顶点 sRGB 色；`slot` 给了 = 挂在那个放置槽的节点下、池本地坐标、和槽的面同材质同深度偏移、画在面之后 = 换颜色；`slot = null` = 世界坐标覆盖层；`material` 给了 = 贴图组 + uv）+ 线段族多一个 `"edge"` 样式（`shared: "edge"` = 不建材质、用后端边线自己的那份，X 光下换不做深度测试那份；放在样式表末尾 + 跳过建材质 → 上面各样式的材质创建顺序一个不动）。内容 = 编辑器 `src/editor/highlight.ts`（`highlightItems(world, state)`：原 `rebuildOverlay` 逐字搬——同槽同三角用 `buildFaceRec`、颜色 = 状态色 ⊕ 材质色、贴图面走 `faceTriangles`、选中软边不画粗线；键 = 世界身份 + 版本 + 选区 / 悬停 / 刮擦 / 检查集，和以前的 `overlayKey` 同构，键没变复用上一帧的 items），画 = 后端 `backend/three/overlay-faces.ts`（挂槽的写 `SlotNodes.sel` + `selKey`；世界一份用原 `faceMatTop`；贴图组懒建材质 = 和以前同一时机）+ `overlay-lines.ts` 的 shared 材质口。
- **ViewState 搬编辑器侧**：`src/editor/view-state.ts`（原样）+ `frameInput(world, cam, vp, state)` → 引擎契约 `FrameInput`（`backend/backend.ts`：相机 / 视口 / XR 近平面 / 地面网格 / 叠加层回调）。`Renderer3.render(input)` / `captureRgba(input)`。相机 = `contract/view.ts CameraSource`（轨道相机**结构上**满足；初中收成两个矩阵）；坐标架 = `Frame3`；材质 = `MaterialRef`（和场景 Material 同形）；XR 姿态 / 射线 = 后端自己的同形类型。
- **流提供者多两样可选**：`contentKey()`（世界身份 + 版本 + 淡出集 = 以前 render3 的 kid:rev:dimK；没给 = 每帧都拉）和 `bounds()`（场景包围球：远平面 / 正交深度窗口 / 无限长线按它定——内容多大只有提供者知道）。`setWorld` 多带 revision。
- **计时口** `minccino/perf.ts PerfSink`：引擎不 import 编辑器的 perf-stats，编辑器把自己的计数器递进构造器（`new Renderer3(canvas, perf)`），读数名不变（`render.*` / `syncPools` / `poolMesh.upload`；`rebuildOverlay` 现在由编辑器的 highlight 计）。
- **调色板** `minccino/palette.ts`（PALETTE 原样搬出，编辑器从门牌拿）；`POOL_AXES_PX / LOCK_LINE_SPAN_PX` 住编辑器 `overlay-lines.ts`。
- **faceTriangles 不借 three**：`src/editor/face-triangles.ts`——平的面也走 `format/triangulate.ts triangulateRings`（vendored earcut + 约束 Delaunay 翻边 = 显卡 / glb 同一份剖分）；角照旧抬回平面（字节出口不变），绕向照旧绕 +n 逆时针。画面上 0 差（平面上的平涂三角怎么切对角线都一块颜色）；OBJ 导出里带洞的面对角线可能和以前不同（earcut → Delaunay），拓扑等价、顶点不变——`test/obj-io.test.ts` 用的是假三角器只验接线，不受影响。
- **守卫 ③′ 清零**：`render3.ts` 零内容层 import（1196 → 922 行；import 只剩 three / vendor / 引擎门牌）；`TRANSITIONAL = {}`，再 import 内容层 = 守卫 ③ 直接红。`editor/render3.ts` 转出口 = 后端类 + 调色板 + 编辑器侧三样（ViewState / frameInput / overlayItems / faceTriangles / 两个像素常量）。编辑器体重棘轮 4170 → 4169。
- 验：`npm test` 1169 绿；截图基线 11 张 **0 像素差**（选中 / 悬停 / 锁轴线 / 网格体选中面 / X 光 / 贴图 / 五个冻结样本）；探针 lock-line / mesh-marks / mesh-mirror / erase-red / xr-fake 18 / hover / select-points / xray-facedots / thumb-square（缩略图走 captureRgba 新签名）/ xray / mesh-knife / soft-select / isolate / hide 全绿。
- 没做 / 如实说：相机还是「轨道量」不是两个矩阵（near / far 要后端按包围球算，初中收）；叠加层回调每帧一个闭包（可忽略）；`FrameInput` 没有 `dimSlots`（淡出进了提供者的内容键）。

## 窄接口清理刀（设计稿 `20261029-narrow-interface-design.md`；Claude Fable 5.1，2026-10-29 深夜起）

### 刀 a（v0.17.17）：叠加层去样式表，item 自带 GL 画法参数
- 做了什么：`src/minccino/overlay/index.ts` 删掉 `LINE_STYLES / POINT_STYLES / MARKER_STYLES / TRIS_STYLES`（17 + 4 + 7 + 1 个**编辑器名字**：lock / gizmo / protractor / poolAxes…）；每个 item 自带线宽（CSS px 或 `"edge"` = 跟线稿粗细走）/ 深度模式（`visible` 测深度并前拉 · `through` 压最上 · `hidden` 只画被挡住的那段，T73）/ 透明度 / 叠放次序 `layer` / `depthWrite`；点带大小 · 圆方 · 往相机拉 · 颜色；标记带几何形状。后端 `overlay-lines.ts` / `overlay-marks.ts` 按参数**按需建材质、按参数复用**（键 = 参数拼起来）。名字搬到编辑器侧：`src/editor/overlay-lines.ts LOOK`、`overlay.ts DOT / MARK / TRI`（值逐字 = 旧表）。断口小垂线的「跟边线宽走」从 render3 点名 `material("tick")` 改成 item 说 `widthPx: "edge"`、后端 `edgeWidth()` 统一刷。
- 怎么验：`npm test` 1175 绿；截图基线 22 张（**更正**：第一次量的是旧包——探针跑的是 dist，当时没重打包；重打包后重测 = 21 张 0 差 + `style-papercut-boxes` 28 像素 ±1 噪声，而这 28 像素在 v0.17.16 的包上也在 = 冻结样本的漂移，不是这刀的）。
- 基线：没动。

### 刀 b（v0.17.18）：高亮 = 标记 + 索引分段（踢掉再画）
- 做了什么：`OverlayFaces`（三角 + 法线 + 顶点色的那份高亮几何）和后端 `overlay-faces.ts` 删掉。编辑器 `highlight.ts` 改吐 **标记** `Mark { slot, chunk, start, count, material }`（契约 v2 第 ② 批；`FrameInput.marks()`，拉完流才调）——池网格里一张面本来就是一段连续顶点（`PoolMesh.faceRanges` / `RegionStore.range`），流提供者 `layout()` 把槽 + 面 id 翻成块 id + 段。后端 `render3 syncMarks`：有标记的网格换成「共享源几何的属性 + 自己的索引」，索引把顶点分成普通段 / 每个材质槽一段（永远几个 draw call、不重叠、不画两遍；标记变了只重写索引 O(池顶点数)，属性零上传；user「index赞！」）。标记的材质 = 这个槽的面材质 + `SEL` 变体（`markMaterial`：同 shader / uniforms / 深度偏移 + `uMark` = 状态色）；**SEL 长什么样归各风格的 shader**：白模 / 剪纸 = 换成状态色（替换）、写实 / 铸铜 = `mix(o, uMark, 0.45)`（叠色，T66）、Tron = 自己的 Clu 橙 + 辉光（不看 uMark）、贴图 = 贴图 × 状态色。render3 里 `selMat` 三元分派、`faceMatTop`、槽节点的 `sel` 网格都没了。
- 看得见的变化：白模里**上色的面**选中 = 纯状态色（以前 = 状态色和材质色对半；T69 替换语义）；没上色的面、Tron、写实不变。
- 怎么验：`npm test` 1175 绿；探针 selecting / style / xr-fake / erase-red / mesh-workbench / soft-select / context 绿（在新包上跑的）；截图基线 22 张 0 新增差。**按 T82 改的规矩**补一张针对这刀的场景 `marks-painted-selall`（上色样本全选：上色面换成选中色）。
- 基线：加 1 张（新场景）。

### 刀 c（v0.17.19）：淡出 = 整槽标记；引擎不再把颜色塞给提供者；线稿三档
- 做了什么：**`ChunkStyle` 退役**（引擎把面 / 边颜色和「粗线还是像素线」给提供者那条反向依赖）——提供者自己按调色板算烤进顶点的颜色（面 sRGB 浮点、线线性，和以前 chunkStyle 给的数逐字一样），粗线 / 像素线每次 pull 问引擎一下（`() => getLineStyle() === "thick"`；第一版做成 setThick 由 editor.setLineStyle 推，漏了「线稿粗细 > 1 自动切粗线」那条路 → 粗线全没了，基线抓到、改成问引擎）。**淡出不再烤顶点色**：`aColorDim / aColorBDim / colDim / colorDim` 四个属性删了（纯色顶点 30 → 24 字节），`Placement.dim` 删了，内容键不再含淡出集；淡出 = 编辑器 `highlight.ts` 给的整槽标记（面 `faceDim` / 线 `edgeDim`，`MarkLayout.chunksOf`），后端整块换材质（面 = `DIM` 变体：白模 / 剪纸 `mix(c, uMark, 0.5)`、写实 `mix(o, uMark, 0.5)`、Tron `mix(base, uMark, 0.5)` + 轮廓光减半、贴图 = 贴图 × 淡出色；线 = `edgeDimMat / pixelDimMat` 整组一色，Tron 的线不认淡出照旧）。render3 每块只剩一份几何（`geoDim` 和 `_aColorOther` 那套删了）。**线稿三档**（T89）：预设 `material.edges: "none" | "all" | "active"`，像素描边 = `active`（只画正在编辑那一层的线稿），render3 按 `Placement.active` 开关。
- 看得见的变化（开工前声明）：① 淡出：没上色的面以前是纯淡出色（0xe9e9e9），现在往淡出色拉一半（0xdfdfdf）——基线里没有淡出场景，补了 `dim-context-sel`（进组件、外面的盒子淡出 + 里面选一张面）；② 像素描边里正在编辑那一层的边画出来了（`style-pixel-sel / house / textured` 三张重冻，理由 = T89：在面上画的边描边描不出来、user 以为吸附坏了）；③ Tron / 写实里淡出以前没效果（不借顶点色），现在有。
- 怎么验：`npm test` 1175 绿；探针 selecting / style / xr-fake / mesh-workbench / context / erase-red 绿（新包）；基线 24 张：粗线两张（`box-thick-sel-hover-lock` / `style-tron-house-thick`）第一版红 → 修后 0 差；像素三张按声明重冻；剪纸两张 ±1 噪声（28 / 10 像素，阈值内，不追）；其余 0 差。
- 基线：+1 张（`dim-context-sel`）、重冻 3 张（像素）。

### 刀 d（v0.17.22）：隐线 = edgeHidden 标记 + 线材质深度模式；X 光 pass 退役
- 做了什么：被挡住的边不再是「X 光 pass + 每槽两个不测深度的半透明节点、Tron 借来常开」——编辑器 X 光开着时给每个槽的边块提交一条 `edgeHidden` 标记（`highlight.ts buildMarks`，整块、叠着画），后端用「深度大于才画」的材质（`hiddenPixelMat / hiddenThickMat`：`depthFunc GreaterDepth` + 35% 半透明；Tron = 它自己的 `hiddenThick / hiddenPixel`，Opus 本来就是深度反测）在模型那一层把同一份线几何再画一遍，只有被挡住的那段出来。`presetPasses(p)` 不再有 `xray` 那条 pass，render3 的 `setXray / xrayPass / xrayOverlayMat` 删了（引擎不认识 X 光；T73 / T60 / T63）。X 光下的选中边透过面画 = 编辑器自己说（`LOOK.edgeXray`：边线宽 + 1、不测深度），不再由后端按 X 光换共享材质。顺手：手势中右键的含义收进编辑器 `rightClickInGesture()`（T102 系统性修法），app 层按工作台分叉加棘轮守卫 `test/app-mode-branch-ratchet.test.ts`（PIN 8，只准降）。
- 看得见的变化（开工前声明）：Tron 的隐线跟 X 光开关走（以前常开 0.12 淡线）→ `style-tron-sel / style-tron-house-thick` 重冻；白模 X 光场景（`box-xray / mesh-xray-dots`）0 差（看得见的边以前被半透明再描一遍，黑上黑看不出；被挡的段同一个 35%）。
- 怎么验：`npm test`（1175 + 新守卫）；探针 xray / xray-facedots / lasso / present-lock / style / selecting 绿；基线 24 张：Tron 两张按声明重冻，其余 0 差（剪纸 ±1 噪声照旧）。
- 基线：重冻 2 张（Tron）。

### 刀 f（v0.17.23）：three 那层改叫供货商；编辑器只持契约
- 做了什么（T109 改词 + 设计稿 §4 f）：`src/minccino/backend/` → `src/minccino/providers/`（three = 画的供货商，不是后端；「后端」留给无头的小栗鼠本体）；契约从那层搬到 `contract/render-provider.ts`：`RenderProvider`（= 编辑器 / app 用到的全部公开面：画一帧 / 内容流 / 视图设定 / XR / 回执，和内容的 `StreamProvider` 对称）、`FrameInput / Mark / 槽位`、`LineStyle / XRFacade / XRHand / XRRigPose / XRRay`（原来定义在 render3.ts 里）；`BackendCaps → ProviderCaps`。**编辑器不再 import three 那层**：`Editor` 构造时由 app 层把 `new Renderer3(canvas, perf)` 递进来、字段只持 `RenderProvider`；`editor/render3.ts` 转出口删（工具文件的 `ViewState` 从 `view-state.ts` 拿，`faceTriangles` 从它自己的文件拿，`LINE_WEIGHTS` 住 app）；`world-labels.ts` 不再 import 那层（类型从契约的 `OverlayLabel` 推）。build lint / 守卫 ①②③④ / README 路径跟着改。
- 看得见的变化：没有。
- 怎么验：`npm test`；探针 style / xr-fake / selecting / walk / context 绿；基线 24 张 0 差。
- 基线：没动。

### 刀 g（v0.17.24）：引擎词汇清零 + 守卫
- 做了什么：`Placement.active` → `tier: 0 | 1`（深度优先级档：1 = 共面时赢；引擎只认识「谁赢」这个数，不认识「活动池」）；render3 里 `XRAY_OPACITY → HIDDEN_OPACITY`、`DEPTH.guide → DEPTH.grid`（删没人用的 `faceOverlay`）。**守卫 `test/minccino-vocabulary.test.ts`**：`src/minccino/` 的代码（注释 / 字符串剥掉后）里不出现 gizmo / protractor / tape / knife / lock / xray / charged / seam / handle / activePool / editor / workbench / tool / selection / hover / guide 这些词当标识符（材质槽名 faceSelected / faceHover / edgeHidden 是风格材质表的槽位，不在此列）。到此引擎目录的代码里一个编辑器的词都没有；pass id `xray` 刀 d 已退役。
- 看得见的变化：没有。
- 怎么验：`npm test` 1177 绿（新守卫当场 0 命中）；基线 24 张 0 差；探针 style / selecting / mesh-workbench / xray 绿。
- 基线：没动。

### 屏（v0.17.25）：画风预设 / 屏幕预设拆两张表（屏幕一刀的用户面，T106）
- 做了什么：`preset/index.ts` 多一张 `SCREENS` 表（原生 / 像素 ×2 ×3 ×4 / CRT 240 行：下采样倍数、行数上限、外观），画风预设的 `screen` 字段改成「默认套哪块屏」的 id；`isStyled(p, screen)` / `presetPasses(p, screen)` 按实际套的屏算（不给 = 画风默认，老调用不变）。render3：`setScreen(id | null)`（null = 跟画风），帧里用 `frameScreen`（XR / 缩略图 = 原生），池键带屏 id（像素化锁 1 px 线跟着屏走）。契约 `RenderProvider` 加 `setScreen / getScreen`。视图 ☰「风格」下面多一行「屏幕」：跟画风 / 原生 / 像素 ×2 ×3 ×4 / CRT 240 行，按设备记（PREF `screen`）。**写实也能套屏**（白模 + 像素 ×3 = scene 进小图 → 放大 → 网格 / 叠加层）。
- 看得见的变化：默认没有（每个画风的默认屏 = 以前捆在它里面的那块）；用户另选了屏才变。
- 怎么验：`npm test`（预设测试加「画风的默认屏存在」「白模 + 像素屏的 pass 表」）；基线 24 张 0 差；probe-style 绿。
- 基线：没动。
