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

## 步 3 流提供者（待）
