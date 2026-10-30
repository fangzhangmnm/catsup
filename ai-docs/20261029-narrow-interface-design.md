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
| f | 编辑器不再拿 three 那层的类：`editor/render3.ts` 转出口删、`Editor` 只持契约、app 层 new three 那份；`world-labels.ts` 不再 import 那层。**改词（T109）**：three 那层 = 供货商 `providers/three/`、接口 `RenderProvider`（和内容的 `StreamProvider` 对称）；「后端」留给无头的小栗鼠本体 / 几何引擎——**v0.17.23 落了** | 0 差 |
| g | `Placement.active → tier`、pass id `xray` 退役（刀 d 做了）；守卫：引擎目录禁词表——**v0.17.24 落了**（`test/minccino-vocabulary.test.ts`） | 0 差 |
| 屏 | 画风预设 / 屏幕预设拆两张表（T106）——**v0.17.25 落了**：`SCREENS` + `setScreen` + 视图 ☰「屏幕」；下拉档位 / 写实配屏的细调归 Opus | 0 差 |
| h | 视图 ☰「叠加层」开关 + 探针（归 Opus，刀 h） | 新场景 |

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

## 7. 叠加层取消 + 画风表定辅助几何 + 五条元规则（2026-10-29 深夜，Claude Fable 5.1；账本 T124 / T125 / T126；给 Opus 接手实现）

> 起因：user 连续三天按「不要 overlay」按不干净（「被选中的点和线还在走overlay……是不是什么深的系统性问题」）。Fable 量过（无头、按 ×3 整格数）：v0.17.30 起点 / 线 / 面 / 软边 / 顶点点已全在小图；仍原分辨率的只剩 gizmo 类。根因不在漏修，在形状：叠加层项的 `pass` 是可选字段、缺省 = 逃逸；实心件 / 三角 / 文字没有这个字段；屏幕只管第 0 层，同一帧第 5 层直接画真画布。刀 a「项自带 GL 参数」是 Fable 的设计错——引擎不认识编辑器的名字是对的，但代价是引擎也不认识它们是什么，于是既套不了画风也套不了屏幕。

### 7.1 切完之后的形状（user 拍：「原则上一切都得按照渲染分辨率画」「画风翻译器也需要定义辅助几何」「小栗鼠不应该认识gizmos」「小栗鼠功能上允许不同分辨率混合画，但是原则上默认用主分辨率」「体重优化同意」）

```
编辑器 ──语义项──▶ 画风表（翻译器，一个深模块、一张表）──批 + 材质槽 + stage + resolution──▶ 小栗鼠
```

- **编辑器只说「这是什么」**：语义种类是闭集枚举（顶点 / 选中顶点 / 软边 / 选中边 / 热边 / 警告边 / 面点 / 中缝点 / 网格 / 三色轴 / 单位标 / 参考线 / 锁轴线 / 卷尺 / 刀线 / 量角器 / 充能线 / 断口刻度 / 吸附球 / 缩放柄 / 变换 gizmo 件 / 平面 gizmo / 落点环……）+ 几何。**没有线宽、颜色、层、pass、分辨率字段**。
- **画风表每种一行**：材质槽（或「不画」）+ `stage`（排在哪道后处理之后画，缺省 0 = 和内容一起）+ `resolution`（`main` | `native`，缺省 main）。写实 = 恒等表（现在的样子）；像素 / 1bit / GBA = 另一张表 + 色板。现有三张表合并进来删掉：`src/editor/overlay-lines.ts LOOK`、`src/editor/overlay.ts DOT`、`src/minccino/palette.ts` 全局 PALETTE（色板变成画风的一部分）。
- **小栗鼠契约里没有 gizmo 这个词**：每批几何只带材质槽 + stage + resolution 三个 GL 层面的量。屏幕（小图 / 放大 / CRT）对 main 分辨率的全部几何生效；`native` = 混合分辨率是一项功能、缺省关、只有画风表能开。`FrameInput.overlay` 回调和 `OverlayItem.pass` 删除。
- **「跳过某道后处理」= 同一张小图里排在那道之后画**（内容 → 描边 → stage 1 → 放大），不是跳出小图；仍用同一块深度。
- **Blender 意义的 overlay**（笼子画在细分面上 / 雕刻）= 材质的深度规则（测 + 前拉），同分辨率，保留。
- **必须原分辨率的东西不在 GL 里**：必须看清的字是 UI、走 DOM（键名芯片 / 状态行已是）；吸附准不准是数学；零延迟指针是系统光标。现在世界里只有「1 m」一个字，它是折线，跟格子走。
- **一遍**：一条线 / 一个面一帧只画一次。现查到两处无理由的画两遍——粗线模式选中边（底下黑的照画 + 拷一份蓝的靠画序盖）、热软边（软边淡线一遍灰 + 退路线一遍红）——正解都是分段标记。有理由的进例外表并标「可并」：X 光隐线段（像素路径有深度纹理，可一遍）、Tron 辉光（WebGL2 多目标输出，可一遍）。
- **守卫**：编译期——编辑器删 overlay 回调 / pass 字段后，一条线想逃 = 改画风表一行；运行时——守卫测试逐行打印画风表里 stage ≠ 0 / resolution ≠ main 的行（=「还有谁在」），探针量像素风里「不整格的像素只能来自那几行」（Fable 的尺子：`$CLAUDE_JOB_DIR/tmp/probe-pixel-blocks.mjs` 的整格统计法，进仓时改成不引用仓外文件）。
- 颜色（像素风顶点 / 选中、蓝从一开始就不喜欢、picoCAD 当参考但别那么夸张）归 user + Opus（T125）；1bit 压测归 Opus。

### 7.2 五条元规则（Fable 管的是这个，不是每个字段；user 10-29「你管得是数据契约，但是也许是元规则层面的，而不是opus连数据结构都不能改」——Fable 同意，并把判据改成「这个字段让谁决定」）

1. **逃逸口**：项 / 批契约上的可选字段，缺省不许是「绕过不变量」那一边；种类一律闭集枚举，不许开放字符串。看着像材质参数、其实让**提交方**决定引擎该决定的事（`pass` / `shared` / `depthWrite` 这类）= 方向盘递出去了，Opus 可以加，但记账、Fable 事后审。画风表里的值 / 预设字段 / 新材质槽名 = 数据，Opus 随便改。
2. **派生数据**（倒角、细分、烘焙的遮蔽 / 环境图、缩略图）：带源的版本键，按键整个重算、永不打补丁；守卫 = 改源后键必须变。写明这条，倒角归 Opus。
3. **屏幕可逆**：凡是挪像素的屏幕（弯屏、抖动位移）必须交出逆映射给输入（CSS 点 → 渲染点）+ 往返测试；交不出就不许挪。写明这条，弯屏归 Opus。
4. **一遍**：见 7.1；例外表是契约的一部分、每条标「可并 / 不可并 + 理由」。
5. **守卫只能加不能减**：削弱 / 删守卫、给契约加新的自由度（新回调、新可选逃逸）才是「事前」要过 Fable 或 user 的；持久化格式照家规先问。其余一律事后审（账本一行）。

分工表（T84）按此修订：Fable = 元规则 + 守卫 + 事后审；Opus = 切刀（7.1）、倒角、弯屏、颜色、1bit、两处画两遍、各风格的表。
