# Minccino —— CatsUp 的渲染引擎（名字出包时再定；现在住仓里、按内部库的边界标准写）

> created 20261029 · as-of v0.17.9 · created by Claude Fable 5.1 · 长期文档 = `ai-docs/20261029-tron-renderer-skeleton.md` v2（十条不变量 = 笼子）；第一刀日志 = `ai-docs/20261029-minccino-first-cut.md`；守卫 = `test/minccino-guard.test.ts`。

## 这个文件夹是什么

一个**不出包的内部库**：CatsUp 的渲染器从 `src/editor/render3.ts` 一步步搬进来，搬完 render3 只剩接缝。以后 RealHome / 实验室 / 游戏也消费它（初中阶段再决定出不出包，T28 / T30）。因为迟早要搬出去，从第一天就按 `@internal/*` 的边界标准写：

- **只认自己的类型**：几何 = `contract/geometry.ts`（`Vec3` 和内核的 `Pt3` 同形、`Xform12` 和场景的 `Xform` 同形——结构相同就能直接传，不转换、不 import）。**不 import** `../editor` `../scene` `../kernel` `../mesh` `../app` `../format` `../player` `../controller`（守卫 ③）。内容怎么长出来是提供者（住编辑器那边）的事，引擎只拉流。
- **three 关在 `backend/three/`**（守卫 ①②）：引擎的其他部分零 three 类型、零 `THREE.`。初中换后端 = 换这一个文件夹。
- **pass 代码不许判设备**（守卫 ④）：`graph/` `overlay/` `material/` `backend/` 里不出现 userAgent / 平台名 / 机型名；设备只以「代价表 + 预算 + 能力位」的形式进来（`contract/cost.ts`），量设备的代码以后住 `device.ts` 一处。
- **零 DOM**（`backend/` 除外）：引擎能在 node 里无头跑（初中要彻底无头，T30）。

## 目录

| 目录 | 放什么 | 哪一步填 |
|---|---|---|
| `contract/` | 流（块 / 放置 / 视锥带 / 预算）、视图（相机 / 画到哪 / 预算 / 画质档）、代价表与血槽位的形状、几何同形类型 | 步 2 钉形状，步 3 / 7 用上 |
| `graph/` | frame graph：pass 声明 + 规划（拓扑排序、没人要的产物不产） | 步 2 规划器，步 4 声明现状的 pass |
| `backend/` | 后端接口（`Backend` + 一帧的输入 `FrameInput`：相机 / 视口 / 网格 / 叠加层回调）；`backend/three/` = three 实现（`render3.ts` 步 5 整个搬进来：几何上传、材质、线、渲染目标、XR 会话钩子；`profile-line-shader.ts` 轮廓线自己的 GLSL 源，守卫 ⑥ 逐字比对 vendored 源；`overlay-{lines,marks,faces}.ts` 叠加层的画法） | 步 5 done；**6c（v0.17.9）零内容层 import**（守卫 ③′ 清零，922 行） |
| `overlay/` | 叠加层契约：线段族 / 点 / 标记 / 三角 / 文字 / **面高亮**（`OverlayFaces`：挂槽 / 世界 / 贴图组）+ OverlayCtx 量尺 + 样式表（内容归编辑器 `editor/overlay.ts` + `editor/highlight.ts`，画归 `backend/three/overlay-*.ts`） | 6a / 6b / 6c done |
| `palette.ts` / `perf.ts` | 白模调色板一处放（预设认领选中色从这里长）；计时口 `PerfSink`（消费方递计数器进来，引擎不 import 谁的 perf） | 6c done |
| `preset/` | 预设 = 数据（四个挂点 + 屏幕一刀的旋钮；每个写明实验室出处）+ `presetPasses` 给 frame graph 的 pass 声明。画法在 `backend/three/screen-pixel.ts`（小图 → 后处理 → 整数倍放大） | Tron 第 1 步：白模 + 像素描边（v0.17.10，Opus）；剪纸 / Tron / 铸铜待 |
| `material/` | 语义通道注册表 / 工艺标签 / 翻译按工艺一份 / 开放槽表 `BASE_SLOTS` / 管线 `reads` 守卫 / 小学四风格 reads（T36） | 步 8 done（只钉接口，内容归 Opus） |
| `budget.ts` / `device.ts` | 预算核对 + 人话披露；量设备的唯一地方（电量感知默认开、跟设备、披露不静默） | 步 7 done |

守卫是棘轮：three 的旧漏点名单已清零（步 5）；③′「`backend/three/render3.ts` 还 import 内容层」19 → 18 → **0（6c，v0.17.9）**，名单空着留给下一次往笼子里搬东西用。引擎和编辑器之间现在只剩：流提供者（内容 + 内容键 + 包围球）、`FrameInput`（相机 / 视口 / 网格 / 叠加层回调）、叠加层契约（内容方算、引擎量尺、后端画）。
