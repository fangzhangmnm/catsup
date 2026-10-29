# 窄接口设计稿：编辑器不认识 GL，小栗鼠不认识编辑器

> as-of v0.17.16 / 2026-10-29 · created 2026-10-29 by Claude Fable 5.1 · 清理刀的设计稿（user 10-29 深夜「清理做，设计稿做好」）。
> 前文 = `20261029-editor-semantics-inventory.md`（清单 + 分档；§3 v2 的结论本文接着往下写）；拍板原话在 Tron 账本 T62–T73。
> 落地日志照第一刀的规矩写进 `20261029-minccino-first-cut.md`（每刀：做了什么 / 怎么验 / 基线动没动、为什么）。

## 0. 一句话

引擎（小栗鼠）只认识**三批几何 + 两张风格给的表**；编辑器只认识引擎的契约类型，拿不到 three。两边的 import 守卫已经在了（守卫 ③ + build lint），这刀收的是**词汇**：引擎里不再有 lock / gizmo / protractor / 选中 / X 光 / 活动池 这些字。

user 原话（T68）：「我想的就是分两批提交，普通的面。高亮的面用不同的材质，然后线和gizmos，小仓鼠不应该认识编辑器。它只认识最少的东西，不应该有graphics.drawgizmosline这种东西，接口要窄！」

## 1. 引擎认识的东西（契约 v2）

| 批 | 契约里的形状 | 谁提交 |
|---|---|---|
| ① 普通的面 / 边 | 内容流 `Chunk`（面 / 线 / 点）+ `Placement`（变换 + 深度优先级档 `tier`） | 流提供者（编辑器 / 串流 / 游戏） |
| ② 改画的段（**mark**） | `FrameInput.marks[]` = 「某个槽的某个块的某一段，用另一个**材质槽**画」：`{ slot, chunk, start, count, material }` | 视图侧（编辑器的 highlight.ts；游戏的「被选中的建筑」同样） |
| ③ 辅助几何 | `FrameInput.overlay(ctx)` → 线 / 点 / 标记：几何 + **通用材质 id** + **调色板槽位**（整组一色或每顶点一个槽位号） | 视图侧（编辑器 / 玩家 / 游戏） |

| 表 | 内容 | 谁给 |
|---|---|---|
| **材质表** | 面槽：`face / faceSelected / faceHover / faceScrub / faceWarn / faceDim`；线槽：`edge / edgeSelected / edgeHidden / edgeWire / edgeDim`；每个槽 = 这个风格里的着色变体 + 深度模式 + `replaces`（画这段时把它从普通批里**踢掉**，还是**叠着**画） | 风格（预设数据 → 后端按风格实例化） |
| **调色板** | **按背景类三套**（T81：`paper` 白纸 = 今天的 PALETTE / `photo` 写实背景 / `screen` 黑屏）+ 蓝图单独一套；预设声明自己是哪一类（或按背景色亮度推）。槽位名 → 颜色（`axisX / axisY / axisZ / guide / guideSelected / lock / hint / hot / ok / bad / ink / mirror / charged / face / faceDim / edge / edgeSelected / …`）；风格可把几个槽位映成一色（牺牲 color coding），**必须在自己的背景上看得见** | 风格；没给 = 今天的 `PALETTE` |

**深度模式**（线材质的属性，GL 概念；T73）：`visible`（≤，只画没被挡的）/ `hidden`（**>**，只画被挡住的那段）/ `through`（不测）。隐线 = 一条 mark：`{ slot, chunk: 边块, 全段, material: "edgeHidden" }`，`edgeHidden` 的深度模式 = hidden、`replaces = false`（叠着画）。X 光开 = 编辑器提交这条 mark，关 = 不提交。引擎不认识「X 光」。

**踢掉再画**（T69 / T79）：面槽 `replaces = true` → 后端给那个槽节点一份**共享池顶点缓冲**的几何对象，带自己的画段表（three `geometry.groups`：普通段用槽的面材质、mark 段用 mark 的材质）；池网格里每张面本来就是一段连续区域（pool-mesh `RegionStore`），所以 mark 的 `start / count` 编辑器直接给，后端零上传。mark 的段数超过门槛（选区很碎）→ 改成这个槽自己的**索引缓冲**分两段（普通 / 标记）= 永远 2 个 draw call，变化那一帧重算 O(池的面数)。两种都不把状态写进着色器：着色器只懂自己的材质。顺序：先普通段后 mark 段（不重叠，写实的叠色〔半透明，T66〕要后画）。

**淡出**（上下文之外）= 一条整槽的 mark（`faceDim` + `edgeDim`，`replaces = true`）。`ChunkStyle`（引擎把颜色给提供者烤进顶点）退役，`aColorDim` 那一半属性不再烤。

**通用线材质**（③ 用；一只手数得过来）：`thin`（细，测深度 + 前拉）· `thinTop`（细压最上）· `thick`（粗）· `thickTop`（粗压最上）· `through`（透视：不测、淡）· `dashed`（虚线，压最上）· `edge`（后端边线自己那份，线宽跟线稿粗细走）。点：`dot / dotTop`；标记：`solid / solidTop / ring / ghost`。**编辑器侧**自己记「锁轴线 = thinTop + 调色板 lock」「变换 gizmo = thickTop + axisX…」——名字留在 `src/editor/overlay-lines.ts` 的一张表里。

**文字 = 几何**（T72）：描边字库（Hershey 式折线，数字 + 拉丁 + 单位符号，几 KB）在编辑器侧把「1 m」转成线段，走 `thinTop` + 调色板 `ink`。`OverlayLabel` 和后端 `label-raster.ts` 退出引擎；中文不进世界，靠 UI。

**叠加层开关**（user 10-29「虽然 ux 不确定，但是可以加一个 overlay 开关的功能」）：视图 ☰ 一行「叠加层」；关 = 编辑器不提交 ② 的高亮 mark 和 ③（淡出 / 隐线照提交 = 那是看模型的方式，不是编辑器的手）。UX 位置以后再定，先放视图菜单。

## 2. 风格分几种情况（user 10-29「对于非像素化的，你看一下我的全量风格。你觉得有几种情况？就是写实和像素？写实就用overlay好吗？」）

按实验室清单（`20261029-preset-inventory.md` §2 九种 pass 结构）过一遍，对「②③ 往哪画、什么时候画」只有**两种情况**（user T76「弯屏也会带像素」：弯屏是像素化的子旗，不是第三种），由预设里已有的屏幕字段决定，不加新词：

| 情况 | 判据（预设数据） | ② mark | ③ 线 / gizmo | 实验室里谁 |
|---|---|---|---|---|
| **直画** | 没有小图、屏幕外观 none | 在内容 pass 里（它就是内容，自然带风格：Tron 发光、写实叠色） | 原分辨率，**画在后处理之后**（辉光 / 色调映射不碰 gizmo），测深度 | 白模 / 写实 / 铸铜 + 整个表面系（补土 / 粘土 / 钢铁 / 车漆…）/ 剪纸 · 水彩 · 蜡光纸 / 纯色 · 风之杖 / 圆角卡通 / 玻璃珠宝系 / 青 Tron（无 CRT）/ SU 草图 / 蓝图 / 折纸 / 彩玻 / 2014 纪念系 / XR |
| **像素化** | `pixelate > 1` 或 `rows` | 同上（进小图一起像素化） | 原分辨率，放大写回深度之后画；颜色走风格的调色板「fake 地差不多」（T67） | 像素描边 / 纯色像素 / GB / 卡西欧 / 俄罗斯方块机 / 点阵线稿 / 1-bit / 老主机全系（GBA / NDS / N64 / PS1 / PSP…）/ CRT Tron 240 行 |
| （像素化的子旗）**弯屏** | 屏幕外观 `crt-tv`（以后鱼眼等），总是和像素化一起出现 | 同上 | ③ 画进放大之后、**弯之前**的那张原分辨率图，再和画面一起弯（多一遍全屏 = 弯那遍本来就有）；拾取走屏幕逆变换（T47） | CRT Tron / GB 真实屏幕那种带屏幕外观的 |

**可读性是关键**（T77）：风格的调色板过一道可读性守卫（单测：每个槽位对背景 / 面色的亮度对比 ≥ 门槛；像素化再加线宽下限）。**有些风格根本不该有 gizmo**（T78）：预设 `overlay: "full" | "none"`，none = 视图开关被压成关、提示一句；选中靠材质槽照样看得见，还能编辑。

所以**写实 = 直画 + overlay**，对；它和白模 / 铸铜 / 剪纸是同一种情况。「写实反而需要叠加层」（T66）说的是 ② 的材质槽选叠色而不是替换——那是材质表里一行，不是另一种情况。

## 3. 提案 .h（pin 住；实现中形状变了回写这里）

```ts
// contract/style.ts（新）—— 风格给引擎的两张表
export type DepthMode = "visible" | "hidden" | "through";
export type FaceSlot = "face" | "faceSelected" | "faceHover" | "faceScrub" | "faceWarn" | "faceDim";
export type LineSlot = "edge" | "edgeSelected" | "edgeHidden" | "edgeWire" | "edgeDim";
export type PaletteSlot = "face" | "faceDim" | "edge" | "edgeSelected" | "edgeHidden" | "edgeWire" | "edgeDim"
  | "axisX" | "axisY" | "axisZ" | "guide" | "guideSelected" | "lock" | "hint" | "hot" | "ok" | "bad" | "ink" | "mirror" | "charged" | "gizmo";
export type Palette = Readonly<Record<PaletteSlot, number>>;              // 0xRRGGBB
export interface SlotRule { readonly depth: DepthMode; readonly replaces: boolean }   // 材质表里每个槽的通用部分；着色变体归后端按风格
export type MaterialTable = Readonly<Record<FaceSlot | LineSlot, SlotRule>>;

// overlay/index.ts —— ③ 的材质 id 收成通用的
export type LineMaterialId = "thin" | "thinTop" | "thick" | "thickTop" | "through" | "dashed" | "edge";
export type PointMaterialId = "dot" | "dotTop";
export type MarkerMaterialId = "solid" | "solidTop" | "ring" | "ghost";
export interface OverlayLines { kind: "lines"; id; material: LineMaterialId; key; positions; /** 每顶点一个调色板槽位号（palette 的键序），或整组一个 */ palette: readonly number[] | PaletteSlot }
// OverlayFaces / OverlayLabel 删除

// backend/backend.ts —— 一帧输入
export interface Mark { readonly slot: string; readonly chunk: string; readonly start: number; readonly count: number; readonly material: FaceSlot | LineSlot }
export interface FrameInput { camera; viewport; near?; grid?; marks?: readonly Mark[]; overlay?: (ctx) => readonly OverlayItem[] }

// contract/stream.ts
export interface Placement { pool; xform; slot; index; /** 深度优先级档：0 = 普通，1 = 共面时赢（原 active） */ tier: 0 | 1; singleSided }
// ChunkStyle 删除；提供者不再烤 aColorDim / _aColorOther

// preset/index.ts
export interface Preset { …; palette?: Partial<Palette>; materials?: Partial<MaterialTable> }   // 没给 = 默认表

// 编辑器侧（不进引擎）：src/editor/overlay-lines.ts
const LOOK = { lock: ["thinTop", "lock"], xg: ["thickTop", /*按轴*/], poolAxes: ["thinTop", /*按轴*/], guide: ["thin", "guide"], … } as const;
// src/editor/stroke-font.ts：text → 折线（数字 / 拉丁 / m ° ' " × / . -）
// src/app/main.ts 视图 ☰：「叠加层」开关 → editor.setOverlayVisible(on)
```

## 4. 刀序（每刀 `npm test` + 截图基线。**基线规矩按 T82**：像素一致只对纯搬家的刀要求；行为刀开工前声明哪些场景会变、为什么，探针按阈值过、差图看一眼，预期的直接重冻，±1 噪声不追；每刀加 1–2 张针对这刀的场景。探针跑的是 dist——**先打包再量**）

| 刀 | 做什么 | 基线 |
|---|---|---|
| a | ③ 的材质 id 收成通用的 + 调色板槽位（编辑器侧 LOOK 表；后端按当前调色板算 rgb，调色板换了重算颜色属性） | 0 差 |
| b | 高亮改 mark + 画段表（`OverlayFaces` 删；贴图面 / 找不到槽一并走 mark；`selMat` 三元分派 → 材质表） | 0 差（颜色算法不变） |
| c | 淡出改 mark（`ChunkStyle` / `aColorDim` 退役；dim 在着色器里混）——**v0.17.19 落了**；顺手：线稿三档 `edges: none / all / active`（像素 = active，T89） | 没上色的面淡出色变了（纯淡出色 → 拉一半）；补了淡出场景；像素三张重冻 |
| d | 隐线 = `edgeHidden` 深度 hidden（深度 > ）；Tron 不再借 X 光节点、跟 X 光走（T60 / T63）——**v0.17.22 落了**；X 光 pass 退役（原 g 的一半） | Tron 两张重冻（隐线不再常开）；白模 X 光 0 差 |
| e | 文字 → 描边字库折线；`label-raster.ts` 出引擎——**只写方案（§6），给 Opus**（user 10-29：不急、不该 Fable 写码） | — |
| f | 编辑器不再拿 three 那层的类：`editor/render3.ts` 转出口删、`Editor` 只持契约、app 层 new three 那份；`world-labels.ts` 不再 import 那层。**改词（T109）**：three 那层 = 供货商 `providers/three/`、接口 `RenderProvider`（和内容的 `StreamProvider` 对称）；「后端」留给无头的小栗鼠本体 / 几何引擎 | 0 差 |
| g | `Placement.active → tier`、pass id `xray` 退役（隐线是 mark，不是 pass）；守卫：引擎目录禁词表（lock / gizmo / protractor / xray / active / 选中 …） | 0 差 |
| h | 视图 ☰「叠加层」开关 + 探针 | 新场景 |

## 5. 体重预期

删：`overlay-faces.ts`（面高亮画法）、`label-raster.ts`（出引擎，一半删一半变折线字库）、`ChunkStyle` 和顶点色烤淡出那一半、render3 里按风格挑 `selMat` / 借 X 光节点的分支、`xray` pass。加：材质表 / 调色板两张小表、mark 画段表（~80 行）、描边字库数据（~4 KB）。净值预计引擎 −200 行左右；之后每加一个风格 = 预设里两张表各几行，不碰引擎。

## 6. 文字 = 几何：方案（刀 e 只写方案不写码；user 10-29「现在没有做文字的紧迫性，而且为什么文字需要你做。你写设计方案就行了」「文字折线方案写好了给opus」）

**现状**：世界里的字只有「1 m」那块（X 轴 +1 个单位处）：编辑器 `world-labels.ts` 说「哪段字挂哪」，引擎后端 `label-raster.ts` 用 canvas 2D 烤成位图、贴成固定屏幕大小的面片。引擎里因此有一个认识「文字」的模块（`OverlayLabel`）。

**目标**（T72 / T105）：引擎不认识文字；字是**几何**——① 辅助几何里的字（刻度、量尺读数）= 折线，走第三批的通用线材质 + 调色板；② 世界里的字（billboard / 牌子：「到此一游」「古罗马豪华浴室」）= **实体**（建模历史 D-14 的 billboard · note 类），存进文件、随风格走、能选能挪。

**做法（给 Opus）**：
1. 描边字库：`src/editor/stroke-font.ts`（编辑器侧，不进引擎）——Hershey simplex 那种折线字，先只要数字 + 拉丁 + 单位符号（`m ° ' " × / . - :`），每个字形 = 一串折线（单位 em 坐标）；`strokeText(text, at, basis, heightM, align) → { positions, key }`；在 `overlay.ts` 里把 `WorldLabel` 换成这个 → 一条 `OverlayLines`（`widthPx` 细、`depth: "through"`、调色板 `ink`）。`OverlayLabel` 类型和 `backend/label-raster.ts` 删掉。中文不进世界（靠 UI）。
2. billboard 实体（哲学轮之后排期）：`Definition` 多一种身体 `{ kind: "billboard", text, heightM, face: "camera" | "fixed" }`（和 CardBody 同类）；渲染 = 流提供者吐一个线块（折线字）+ 可选一张底板面；拾取 = 按包围框；文件 = `CATSUP_definitions` 的一种 kind（按格式纪律加 minor + 冻样本）；风格化的字 = 各风格调色板的 `ink` 槽位（Tron 发光、像素 1 px），要更花的（手写体、位图字）= 风格自己的文字转图元方案，不进引擎。
3. 不做的：引擎里任何「文字」类型；系统字体 / 位图字贴片在世界里（VR 豆腐块问题）；UI 面板的字照旧走 DOM / canvas（那是 UI，不是世界）。

**体重**：字库数据 ≈ 3–4 KB（几十个字形）；删 `label-raster.ts` ≈ −120 行引擎。
