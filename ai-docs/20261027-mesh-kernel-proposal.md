# mesh 内核 + `Body` 接口 · 提案（.h，等 user 过目）

> created 20261027 by Claude Fable 5.1 · as-of v0.15.4 / 2026-10-27 · 路线 = `20261027-kernel-route-bmesh-recommendation.md`（user 当天拍：另做网格内核、名字 brep / mesh、折边退役、手动转换、转换不带隐藏元数据）· 注册表 = `20261027-command-registry-proposal-v2.md` · 优化取舍 O3-B（mesh 第一天就列式 + 纯函数）
> 现状（核过）：`scene/body-kind.ts` 已有 `BodyKind = "brep" | "mesh"`；`scene.ts MeshBody` = 三角汤最小形（positions / indices / triMaterial，**不能编辑**，`MESH_KIND.modes = []`）；`kinds.ts` 已有登记表 + `brepToMesh`（三角化）+ `canCast`；导入外来 glb 现在走 `from-triangles.ts` 直接成 brep。**本提案 = 把 mesh 从三角汤升级成可编辑的多边形网格内核，把登记表填实；没动代码。**

## 0. 一句话

mesh 身体 = 一个 **MeshKernel**：顶点坐标 + 多边形面（任意边数、允许不平）+ 边标记（软 / 平滑 / 缝）+ 每面材质，**列式类型数组存、纯函数改**（Euler 算子），没有几何公理，只有拓扑不变量；三角汤变成它的**派生物**（渲染 / 导出 / 碰撞用，约束 Delaunay 三角化，改过的面才重算）。brep 和 mesh 通过同一个 `KindDef` 登记表接进场景 / 渲染 / 拾取 / 格式 / 指令；两边的几何动词各写各的，场景级的东西（组件 / 实例 / 变换 / 镜像 / 选物体）一份。

## 1. 数据（`src/mesh/mesh-kernel.ts`，新）

```ts
// 列式（O3-B）：所有表都是定长类型数组 + 活跃位图 + 空闲表；id = 下标，删了不挪（空位复用由分配器按最小空位，确定性）。
export class MeshKernel {
  // 顶点
  pos: Float64Array;            // x y z × 顶点（编辑用双精度；导出转 float32）
  vAlive: Uint8Array;
  // 面 = 顶点环（loop）。loopVert 按面分段：面 f 的顶点 = loopVert[faceStart[f] .. faceStart[f] + faceLen[f])
  faceStart: Int32Array; faceLen: Int32Array; loopVert: Int32Array; fAlive: Uint8Array;
  faceMat: Int32Array;          // 材质槽（-1 = 默认）；mesh 面单面（默认剔背面，user 10-24），没有 brep 的两槽
  // 边 = 无序顶点对（显式表，只为标记和邻接）
  edgeA: Int32Array; edgeB: Int32Array; eAlive: Uint8Array;
  edgeFlags: Uint8Array;        // 位：SOFT=1 SMOOTH=2 SEAM=4 HIDDEN=8（和 brep 边层同名同义；缝给绘制纪元留）
  // 邻接（派生，CSR；拓扑算子后标脏、下次查询前重建 O(n)；只动坐标的算子不碰它）
  vEdges(v: number): Int32Array;   // 顶点 → 边
  eFaces(e: number): Int32Array;   // 边 → 面（0 = 裸线 / 边界 1 / 流形 2 / 非流形 ≥3）
  fEdges(f: number): Int32Array;   // 面 → 边（按环序）
  edgeOf(a: number, b: number): number | -1;
  // 派生缓存（随改动日志失效）
  triangles(): { tris: Int32Array; faceOfTri: Int32Array };   // 每面约束 Delaunay 三角化（不平的面投影到最佳拟合平面；kernel/cdt.ts）
  faceNormal(f: number): Pt3;                                   // Newell
  subdivided(level: number): { pos: Float32Array; tris: Int32Array; faceOfTri: Int32Array };   // FM76：Catmull-Clark，显示 / 导出参数，笼子是原子
  // 日志（渲染缓存 / 预演差量 / 撤销对拍用；形状照 kernel/change-log.ts）
  readonly log: ChangeLog;      // 改过的顶点 / 边 / 面 id + 族谱
  clone(): MeshKernel;          // 列式 = 几块 memcpy（O1 的 ❸ 在 mesh 上天然成立）
  toSnapshot(): MeshSnapshot; static fromSnapshot(s: MeshSnapshot): MeshKernel;   // 紧凑（去空位、id 重编）；格式 §5
}
```

**不变量**（`test/mesh-invariants.test.ts` 每个算子前后都查；性质测试 + 对抗案例集）：(M1) 每张活面的环 ≥ 3 个**不同**的活顶点、环里没有重复顶点；(M2) 环上相邻顶点对都在边表里，边表里的边至少属于一张面或显式标为裸线；(M3) 标记只在活边上；(M4) 封闭流形连通块满足 V − E + F = 2 − 2g（只对流形块查）；(M5) 删了的 id 不被任何活元素引用；(M6) 同一算子在克隆上跑 = 同一结果（确定性）。**没有**：平面性、重合即同一、闭环长面——这三条是 brep 的公理，mesh 刻意没有。

## 2. 算子（`src/mesh/ops/*.ts`，每个一个文件，纯函数：`(k: MeshKernel, args) → MeshEvent[]`，原地改 k）

| 族 | 算子 | 对应的自由建模动词（设计稿 §1 最小集 + 加速器） |
|---|---|---|
| 几何 | `moveVerts(ids, to[])`、`transformVerts(ids, X)` | 挪 / 转 / 尺寸（含软变换：权重由工具算，算子只收最终坐标） |
| 劈 | `splitEdge(e, t)`、`splitFace(f, va, vb)`（两顶点之间加边）、`knife(f, path)`（面上一串点 → 劈边 + 劈面） | 刀（只切不长：永远不会多出一张面——劈面是把一张变两张） |
| 并 | `joinFaces(e)`（擦掉两面之间的边 → 一张 n 边形，不管平不平）、`dissolveVertex(v)`（二度点并边）、`limitedDissolve(angleDeg)`（Blender Limited Dissolve） | 去边 / 溶解 |
| 合 | `mergeVerts(ids, target: "center" \| "cursor" \| "first" \| Pt3)` | 合（到中心 / 到游标 / 塌缩）；合并后退化的面 / 边自动清 |
| 填 / 删 | `fillLoop(vertRing)`、`deleteFaces / deleteEdges / deleteVerts(ids, { onlyFaces?: boolean })` | 填、删（Blender 的删除 = 面 / 边 / 点三档） |
| 长 | `extrudeFaces(fs)`（不挪：只复制环、长侧面；挪归工具）、`extrudeEdges(es)`、`loopCut(e, n)`（沿四边形环切 n 刀）、`insetFaces(fs, t)`、`bevel(es, w, segs)`（后做） | 拉 / 插 / 环切 / 倒角 |
| 建 | `addFace(verts)`、`addPolygon(ring)`（空处建 n 边形）、`addPrimitive(kind, params)`（盒 / 球 / 柱…一次性） | 建 n 边形 |
| 标记 | `setEdgeFlags(es, mask, on)`、`setFaceMat(fs, slot)`、`flipFaces(fs)` | 软 / 硬 / 缝 / 涂 / 翻面 |
| 对称 | `mirrorWeld(axisPlane, side)`（把另一半换成这一半的镜像，中缝焊） | 自动镜像（FM23；设计稿 §7） |
| 整理 | `triangulateFaces(fs)`、`removeDoubles(dist)`、`recalcNormalsOutside()`、`separateLoose()` | 修复族的 mesh 版 |

每个算子一个文件 = 可扔；族清单 = `src/mesh/ops/index.ts`；指令注册表的 `mesh.*` 族直接包它们（§6）。

## 3. `Body` 接口：登记表填实（`scene/kinds.ts`，改）

```ts
export interface KindDef<B extends Body = Body> {
  readonly id: BodyKind; readonly label: string;
  readonly modes: readonly ModeId[];                        // brep: geometry / surface；mesh: freeform（以后 sculpt / bodypaint）
  readonly castsTo: readonly { to: BodyKind; loses: readonly string[] }[];
  alignGeometry(body: B): AlignGeometry;                    // 点 / 线 / 面：两种内核都往同一个屏幕索引喂（FM65：一个对齐引擎、两个喂料口）
  bounds(body: B): { min: Pt3; max: Pt3 } | null;
  // 新增（渲染 / 拾取 / 格式 / 预演都按它派发，不再 `if (body.kind === "brep")` 散落）
  render(body: B): FaceSource;                              // pool-mesh.ts 的输入：每面三角 + 法线扇 + 材质 + 每条可见边；改动日志驱动增量
  pick(body: B): GeomView;                                  // 顶点 / 边 / 面的世界几何（screen-index / pick / solver 用）
  clone(body: B): B;
  changes(body: B): ChangeLog;                              // 预演差量 / 渲染增量的钥匙
  snapshot(body: B): BodySnapshot; restore(s: BodySnapshot): B;   // 格式 §5
}
// FaceSource = pool-mesh.ts 现在直接读 Kernel 的那几个方法抽成接口（faces() / ringVerts / faceMaterial / edgesVisible / fanNeighbors）；brep 适配器 = 现有代码原样，mesh 适配器 = 读 MeshKernel.triangles()
```

`Scene.kernelOf(at)` 保留（brep 专用）；新加 `Scene.bodyOf(def)`；mesh 身体**只有一个池**（没有 brep 的 group 分区——分区是 brep 的粘连几何管理法；mesh 的「分家」= 另一个组件）。

## 4. 选区（`editor/tools.ts Selection`，改 = Fable 账单 A2）

```ts
export type Selection =
  | { kind: "brep"; verts: Set<VertexId>; edges: Set<EdgeId>; faces: Set<FaceId> }
  | { kind: "mesh"; verts: Set<number>; edges: Set<number>; faces: Set<number> };
// 参考几何单独一份（user 10-24 定的、Opus 没做到的那条）：
export interface EditorSelection { body: Selection | null; guides: Set<number>; instances: Set<InstId>; groups: Set<GroupId>; }
```

清选区的十几处改成一个 `clearSelection()`（Opus 当时把 guides 塞进 Selection 的理由）。选区进撤销（FM67）：撤销重设计里的会话状态 M 存的就是 `EditorSelection`，kind 跟着当前上下文的身体。

## 5. 格式（`CATSUP_mesh` 扩展，拍子 1.0.0，照家族格式纪律：自己的 major.minor.patch、升级代码一个文件夹、冻结样本、未知键直通）

- glTF 本体：一个 primitive，TRIANGLES = `triangles()` 的三角汤（引擎 / 别的软件看的；约束 Delaunay），POSITION = 紧凑顶点（float32），NORMAL = 按边标记算的平滑法线（和屏幕上一样），材质按面槽拆 primitive（同 brep 的 bake）。
- `CATSUP_mesh`：`{ version: 1, minor: 0, patch: 0, faceStart, faceLen, loopVert, faceMat, edgePairs, edgeFlags, subdivLevel? }`（各是 accessor；顶点下标空间 = POSITION）。**不存**：三角剖分（派生）、法线以外的任何派生、brep 的曲线 / 平面（FM75）。
- 读取侧：major 比自己新 → 拒开；minor 新 → 能开能存 + 未知键直通 + 提示一次；patch 静默。
- 载荷住在 `CATSUP_definitions` 的 mesh 项里（10-24 契约的位子），自己带 `version / minor / patch` 三键（子结构自己的拍子，家族格式纪律）。现有三角汤载荷（10-24 契约的最小形：positions / indices / triMaterial，没有拍子）：读进来 = 每三角一张面（迁移一步 → 1.0.0），老文件照开。
- **旧依赖核过（user 10-27 问）**：今天读三角汤的只有格式读写、`kinds.alignGeometry`、ops 的「mesh 池拒 brep 指令」、editor 的几处跳过，渲染 / 拾取都没接 mesh——三角汤改成派生物不坏任何现有行为。**导入外来 glb 改成直接成 mesh 身体（无损，熊不再痛苦）**；要 brep 用转换指令。

## 6. 转换（两条指令，走注册表 `body.*` 族；都一步撤销、作用在选中的物体上、转换后工作台跟着换）

- `body.toMesh`：一张 brep 面 = 一张多边形面（带洞的 brep 面 = 一张带洞的多边形？**mesh 的面不带洞**（Blender 同款）→ 带洞的面先桥接成一个环（K3 的桥洞）再成面，或三角化；报告写明）；边层 soft / smooth / seam → 标记；面材质（brep 正面槽）→ faceMat（**背面材质丢**，报告写明；mesh 单面）；组分区 → 并成一个池（报告）；曲线 / 平面记录 / 参考几何**不带**（FM75，报告写明条数）。
- `body.toBrep`：不平的面 → K3（投影 → 桥洞 → 耳切 → CDT → 合并）成平面块 → 走 `kernelFromTriangles` 同一条管线（量化合点 → 分平面 → `fromBrep` 整批装 → 谓词挑脏的交结算机 absorb；审计稿 K4 §2.3）→ 报告：三角化 N 张、合并 M 点、拒收 K 张（拒收的留成一个 mesh 子物体，不丢）；`estimate` 先问「要等一会儿」（三角数 × 修的比例推算，参考熊 127 ms / 坦克 28.6 s）。

## 7. 工作台与工具（接线归 Opus；这里只定边界）

- `mode.ts` 新模式 `freeform`（自由建模）：`kinds: ["mesh"]`；工具 = 选择（共用 SelectTool，按 kind 派发拾取）、移动 / 旋转 / 缩放（共用整体变换；顶点那半按 `Body` 派发：brep → moveVertices、mesh → moveVerts）、刀（新：`direct` 语法，落点 → `knife`）、拉（新：`steps` 语法，`extrudeFaces` + 挪）、环切（新：`direct`，`loopCut` 预演）、笔刷（注册表 §2.4 的通用笔刷工具：软挪 / 雕 / 生命之粉以后只是加行）；轴锁、吸附（只点 / 边 / 面，不推断，按住 Shift 才吸 = 工作台开关 FM24）照旧走对齐引擎。
- 指令族 `mesh.*`（注册表 §3 第 8 步）：合 / 填 / 溶解 / 删 / 扩缩选区 / 环选 / 翻面 / 镜像开关 / 有限溶解 / 三角化 / 去重点。
- brep 工作台的工具在 mesh 物体上不存在（`mode.tools` 按 kind）；进出子物体照旧，工作台跟着物体类型换（路线稿 §6）。

## 8. 渲染 / 拾取 / 对齐（一份代码、两个适配器）

- `pool-mesh.ts` 的 `buildFaceRec(k: Kernel, …)` / `buildEdgeRec` 改读 `FaceSource`（§3）；平滑法线扇的算法不变（边标记代替边层）；改动日志驱动增量（mesh 的 `log` 同形）。
- `screen-index` / `pick` / `solver` 读 `GeomView`：mesh 适配器给顶点 / 边 / 三角面（面命中用 `triangles()` 的三角 + `faceOfTri` 映回面）。对齐引擎不改（FM65）；自由建模工作台关掉推断候选（工作台开关）。
- X 光 / 面点（Opus 的选择那一块）对两种身体一样：面的中心点 = 面环的质心。

## 9. 分期（Fable M1–M3，Opus M4 起）

| 期 | 做什么 | 验收 |
|---|---|---|
| M0 | 本 .h 过目 | user「可以」 |
| M1 | `MeshKernel` + §2 的「几何 / 劈 / 并 / 合 / 填删 / 标记 / 建」算子 + 不变量性质测试 + 对抗案例集（node 直测，零 DOM） | **核心 done 10-27 夜（Claude Fable 5.1）**：`src/mesh/mesh-kernel.ts`（列式表 / 空闲表最小空位 / 邻接 CSR 按需重建 / CDT 三角化缓存 / 紧凑快照往返 / `check()` 不变量 / 封闭流形欧拉数）+ `src/mesh/ops/`（split: 劈边 / 劈面 / 刀；join: 并面 / 溶解二度点；merge: 合；delete: 面 / 边 / 点三档；extrude: 挤出；build: 多边形 / 填 / 盒子；geometry: 挪 / 变换 / 标记 / 材质 / 翻面）；`test/mesh-kernel.test.ts` 10 组（含 8 种子 × 40 步随机串：每步自检 + 克隆对拍）。v0.15.8 再加 loopcut（环切：闭环 / 开口带）+ cleanup（有限溶解 / 去重点），14 组测试。**还没做**：inset / bevel / mirrorWeld / addPrimitive 球柱、`subdivided()`、改动日志（现在只有 rev 计数） |
| M2 | ~~`FaceSource` / `GeomView` 两个适配器~~ → **一份契约 `scene/kernel-view.ts`**（渲染 / 合成视图 / 拾取 / 吸附读内核的那份；brep 结构上满足、mesh 经 `mesh/mesh-view.ts` 真做）+ `Scene.viewOf` + `MeshBody.kernel` + brep → mesh 多边形转换 + 法向一致化 + 单面剔背面 + 进网格体守门 | **done v0.15.10（10-27 夜，Fable）**：852 绿；修复 / 开机三探针 OK；临时探针：盒子 → 组件 → cast 成 mesh 真画出来（剔背面）、进去被拦住给人话。`KindDef.modes` 仍空（M4 接工作台时填）。 |
| M3（done v0.15.11，10-27 夜，Fable；见 §12） | `CATSUP_mesh` 格式 + 迁移 + 冻结样本 + 两条转换指令（含报告 / estimate）；导入外来 glb 改成 mesh | 往返测试；熊 / 小红帽导入 → 转 brep → 报告数字和 10-27 的一致 |
| M4（Opus） | ~~`freeform` 模式~~（壳 v0.15.16 Fable 做了，§14）+ 刀 / 拉 / 环切三个工具 + `mesh.*` 指令按注册表写（照 `meshMove`）+ 选择那一块（点击族 / 全选 v0.15.16 已通，套索 / 环选 / 扩缩待做） | 小红帽白模能从盒子做出来（FM61） |
| M5（Opus） | 通用笔刷工具（软挪）+ 自动镜像（`mirrorWeld` 每步） | 手稿里的「软 TRS」「自动对称」 |
| M6 | 长 / 倒角 / 细分显示参数（FM76）/ 雕刻的加速结构（以后） | — |

## 10. user 10-27 夜答复（Claude Fable 5.1 记；原话逐条）

1. 单面：「单面我还得权衡一下，这个涉及到和brep的互导，但是人类的全量计算机图形学，除了thor，都是单面」「blender have no backface culling so most time it is misleading. so we want to enforce backface culling. wysiwyg. but we might shade backface in a way or just leave wireframe if wireframe is rendered?」「brep 转过去时背面材质丢、带洞的面要先桥成一个环 agree. and loop is better than just 1 line cut」「yes lets do single sided」→ **单面、强制剔背面（WYSIWYG）**；背面怎么画 = 渲染纪元的问题（候选：特殊着色、或线框模式下只剩线）；桥洞时**优先用一圈环切**（loop）而不是一条桥线（一条桥线 = 两条重合的边，丑；环切 = 洞和外环之间切出一圈面，干净）。
2. 单池：「yes there is no need for grouping. if we really want it, show and hide faces. if we already have face level layering in brep, we can also have it. how to do with line and vert in layering? i guess dangling vertices are ugly. but shared vertices should not be hidden. is that wise? think critically」→ **单池；要分组就用面的显隐 / 面级层**。线和点的显隐规则（AI 想过的）：**从面推导**——一条边 / 一个点藏起来 ⇔ 它所有的面都藏了（和看得见的面共享的点 / 边照样显示）；裸线 / 悬空点没有面可推 → 自己带显隐标记。这和 Blender 一致，也是「披露」的：看得见的面的轮廓永远完整，不会出现面在、边缺的怪相。
3. 寻址：「if we go to float then that is the only choice」→ 顶点 id。
4. 「撤销靠重放 what do you mean? what are alternatives?」→ 见回复：重放 = op 日志 + 检查点（现有），备选 = 备忘录快照 / 逆指令 / 可持久化结构；列式下检查点 = memcpy，所以重放 + 检查点就够。
5. 重编：「yes. catsup rule: organize in export/save. perhaps we can also do organizing in highschool era where the unedited things are being optimized as video game asset in background, like lod generation, mesh optimization and culling, for gta level scene editing」→ 存 / 导出时整理；**远期（高中）**：没在编辑的物体在后台优化成游戏资产（LOD、网格优化、剔除）——记总账 B51。
6. 导入直接成 mesh：「agree. that is what supposed to do. earlier is just an ad hoc dirty jumpwire」。
7. 列式：「do it」。
8. 分期：「没太懂，你自己决定」→ 按 §9。
9. 注册表：「推我」→ 再发一次 v2.1。
10. 球规：「球轨和圆规只有到验证纪元才会发光，以后还会有更多的辅助工具。要不要先拖延球规，不过圆规上线了是可以顺便做一下」→ 已上线的留着，不再投入；验证纪元再发光。
11. 「圆不和轴线合成交点 为什么不」→ AI 改口：应该合成（尺规作图要圆 × 轴 / 圆 × 边的交点）；圆 × 直线是闭式解，便宜——记成 Opus 的小活（随圆规顺手）。
12. 「圆的吸附秩低于实边 justify it」→ 秩只在候选同时落进容差时裁决；原则 = 模型本体 > 作图辅助 > 栅格（和 F-85「边 > 轴 > 栅格」同一精神）：真边是作品，圆是脚手架，撞上时作品赢。
13. 非等比缩放：「椭圆轨应该特别难而且没有意义对吧。同意」。
14. 转换先问：「同意，然后看一下moonsinger的进度条怎么做的（让opus做这种ux活，但是让它收深模块）」→ 进度条深模块从 MoonSinger 收（Opus）。

**第二轮（10-27 更晚）：**

15. 「圆的秩同意，不过秩是这里的合适中文术语吗？是order的意思吗？」「吸附优先级 同意」→ 「秩」用错了（矩阵的秩；order = 阶），改叫**吸附优先级**（撞上时谁赢）。第 12 条的记录照旧。
16. 「点和线的显隐 同意。然后你说的loose geometry的边界情况赞。所以是变得不loose的时候自己清掉标记变default吗？」「一旦它长出第一张面 也可能是别人碰到他」→ 游离点 / 边自己带一个显隐标记，长出第一张面时当场清回默认；**清在内核唯一的建面入口里**，不在某个动词里——谁碰到它（填面、挤出、合并）都走那一个口。不留看不见的潜伏状态（披露原则）。
17. 「圆哈哈哈让它做」→ 圆 × 直线合成交点 = Opus 小活。
18. 「撤销靠重放 what do you mean」的续：「我是更喜欢逆指令……会不会不好写的有另外一条兜底的路？」「我们的undo quota有多大」「每八步存一份整个场景……会不会浪费内存quota」「关键是这个兜底的是高频还是小频率？」「CatsUp为什么不128……画画要不要走自己的undo stack我不知道，我建议不走。免得blender那样confusion」→ 撤销 = 逆记录（有语义的逆：挪 / 转 / 缩 / 边层 / 选区）+ 内核倒带日志兜底（拓扑动词自动记旧值，= WeebPaint「只存被影响的瓦片」的推广，不手写逆；和拖动预演共用一本）；配额 **128 MB** 字节制、最老端整步驱逐、最新一步不驱逐（WeebPaint 同款，核过 `undo-stack.ts`）；画画 / 选区 / 几何**一条栈**；每八步整场景快照**撤**（坦克一份几十 MB，八份是 iPad 会被杀的量级）；重放只给复现包与联机 = 低频；崩溃恢复学 WeebPaint 盲快照（30 s 空闲存整文件）不学 Procreate 重放。现状：没有步数上限、快照每 8 步 × 最多 8 份、更深 = 从打开时重放（对但慢）。归 Fable 账单 A3。
19. 「如果map难的话，要不要直接一口气做成数组制度的？」「行，等待网格时代！！！」「嗯预演不会undo就重新拷合理，是我傻了」→ brep 三张表一口气换槽位数组 + 空闲链（访问接口不变、结算机不动），不做「槽位 + 墓碑」的 Map 包装；倒不回去 = 扔影子从真内核再拷一份（真内核预演期间一个字节不动）。Fable 账单 O3 提前到注册表底座之后、O1 之前。
20. 注册表（「注册表我好像看过，先做吧」+ 两层 / 族名 / 送命题 / 几十个挪动指令）→ 全在注册表提案 §7；底座 v0.15.9。mesh 族的单位类型（`MeshUnit`）M2 时加进 `commands/command.ts`。

## 10（原）. 要 user 拍的

1. **mesh 的面不带洞、单面、默认剔背面**（Blender 同款；brep 的两槽材质转过去丢背面）——推荐是。另一条路 = mesh 也做两槽：渲染 / 格式都要多一份，和 Blender 的习惯不一样。
2. **mesh 身体只有一个池**（没有 brep 的组分区；分家 = 另一个组件）——推荐是。
3. **mesh 算子按顶点 id 寻址**（不是 brep 的坐标寻址：mesh 允许两个顶点同坐标）；撤销 / 重放照 op 日志（确定性）；文件里 id 重编——推荐是。
4. **导入外来 glb 直接成 mesh**（要 brep 再转）——推荐是；不选 = 照旧导成 brep。
5. **列式 + 纯函数从第一天**（O3-B）——推荐是。
6. 分期 §9：M1–M3 Fable、M4 起 Opus——同意 / 改。

拍了我开 M1（内核 + 算子 + 性质测试），不碰现有 brep 一行。

## 11. M2 落地记录（v0.15.10，2026-10-27 夜，Claude Fable 5.1）

user：「不要monkey patch。基础打扎实」「不是冲刺，而是先专心做这个」→ 没走「网格假装成 brep 内核骗过渲染器」那条路，而是：

- **契约** `src/scene/kernel-view.ts`（`KernelView`）：渲染缓存 `editor/pool-mesh.ts`、合成视图 `scene/world-view.ts`（→ 拾取 / 吸附 / 屏幕索引）、渲染器 `editor/render3.ts`、`scene.ts poolBounds` 全部改成只认它。brep 的 `Kernel` 结构上就满足（记录类型就是它的，零改动）。
- **mesh 真做** `src/mesh/mesh-view.ts`：派生表按 rev 缓存（点 / 边 / 面记录、每面的朝向平面 = 环的 Newell 法向、2D 环 = 投影到自己的最佳拟合平面）；改动日志 = 内核自己的（`MeshKernel.changes`，每个原语记点 / 边 / 面，`clone` 分叉族谱 → 渲染缓存对预演副本仍是增量）；面显隐 `faceFlags`（`FF_HIDDEN`）；背面材质永远 undefined。算子写标记 / 材质改走内核方法（`setEdgeFlags` / `setFaceMat` / `setFaceFlags`，记日志）。
- **场景** `Scene.viewOf(pool)` 唯一派发；`MeshBody = { kernel, materialSlots }`（三角汤形退场）；`Scene.mesh(def)`；`pointsOfDef` / `clone` 认 mesh。
- **转换** `scene/kinds.ts brepToMesh`：一张膜 = 一张多边形面（环绕 +n 逆时针）；带洞的膜三角化、内部边软 + 平滑；边标记照搬（折线 = 软 + 平滑）；悬空边 = 裸线；隐藏面照旧；最后 `mesh/ops/orient.ts recalcNormals`（流形边传播一致、封闭壳朝外——brep 的平面法向是规范化符号的，不是朝外）。`castsTo.loses` 文案补全。mesh → brep 仍是 M3。
- **渲染** 单面身体：`PoolMeshEnv.singleSided` → render3 两份 FrontSide 材质（活动池 / 别的池）。
- **守门** `Editor.enterPool`：进网格体的实例 → 提示「网格体：自由建模工作台还没接上，现在只能整体挪 / 转 / 缩」。
- **文件**：`kind:"mesh"` 载荷仍是三角汤（`mesh/tri-soup.ts` 往返；n 边形读回来是三角形 = 有损）。现在没有任何 UI 能造出 mesh 身体，所以没有用户数据经过这条路；**M3（`CATSUP_mesh` 1.0.0 多边形载荷 + 冻结样本 + 转换指令）落地前不接任何造 mesh 身体的 UI**。
- 测试 `test/mesh-view.test.ts`（8 组：记录 = 内核事实 / 缓存跟 rev / WorldView 开槽经变换 / cast op + clone / brep → mesh 盒子朝外 + 带洞三角化 / recalcNormals / 三角汤往返 / pool-mesh 全量 + 增量 + 族谱）；`body-kind` / `object-model` / `pool-mesh` 旧测试改到新形状。852 绿。
- 剩给 M3：格式；给 M4（Opus）：`mode.ts freeform` + `KindDef.modes`、选择 / 挪点按 kind 派发（`MeshUnit` 进注册表、路由型动作）、拾取用三角形命中不平的 n 边形（现在用最佳拟合平面的 2D 环，近平面的面没问题）。

## 12. M3 落地记录（v0.15.11，2026-10-27 夜，Claude Fable 5.1）：文件格式

user：「gltf不是支持ngon的吗，为什么输出要三角化」→ glTF 2.0 本体没有多边形模式（只有点 / 线 / 三角形那七种 mode；Blender 导出也全三角化）。做法和 brep 一样：**本体里的三角形是 bake、给别的查看器看的派生物；真相住 `CATSUP_mesh`。**

- **`CATSUP_mesh` 1.0.0**（`src/format/mesh-payload.ts`；住在 `CATSUP_definitions` 的 mesh 项里，不是顶层扩展）：positions f64 xyz / faceStart / faceLen / loopVert（i32）/ faceMat（i32，−1 默认）/ faceFlags（u8，bit0 隐藏）/ edgePairs + edgeFlags（只列带标记的边）。**不存三角形**。拍子进 `FORMAT` 表（签名多一段）；major 新拒开、minor 新提示一次。
- **`CATSUP_definitions` 6.3 → 6.4**：mesh 项换形。老读者看不见多边形键 = 读不到网格体几何（它们本来也不画 mesh），提示一次；没有任何老版本能造出 mesh 身体，实际不存在这种文件。
- **老形**（0.14 三角汤最小形 positions / indices / triMaterial，没拍子）：`migrate/mesh.ts polygonsFromTriangles` 读成每三角一面（需要二进制，所以不走 STEPS 表；读到没 faceStart 的 mesh 项就走它）。重存 = 多边形载荷。测过。
- **bake**（`format/bake.ts bakeMesh`）：顶点一份（Y-up，无 NORMAL 省流档）、三角形按材质 core 分 primitive（约束 Delaunay 同屏幕）、LINES = 看得见的边（多边形环边 + 裸线；软 / 隐藏不出；三角化出来的内部边不出）、隐藏的面不出。网格体从此在别的 glTF 查看器里看得见（以前 mesh 定义没有 glTF 几何）。
- **内核 ↔ 载荷** `src/mesh/mesh-doc.ts`：存时去空位重编；读时坏环 / 越界点名拒开（不静默丢）。
- 冻结样本：新目录 `v3.1.0-4.2.0-6.4.0-1.0.0-1.0.0-1.1.0-1.0.0-1.0.0`，新增 `meshed.glb`（根 brep 盒 + 转成 mesh 的盒：软 + 平滑边、隐藏面、涂了材质的面）；场景指纹认 mesh 身体。
- 测试 `test/mesh-format.test.ts`（往返逐字 / 文件形状 / 老形照开 / 拍子纪律 / 坏环拒开）；872 绿；三探针 + 临时 mesh 渲染探针 OK。
- **现在可以接造 mesh 身体的 UI 了**（M2 的禁令解除）：下一步 = 转换指令进注册表的物体族（`object.toMesh` / `object.toBrep`；toBrep = 三角化 → `kernelFromTriangles` 那条导入管线）+ 外来 glb 导入直接成 mesh（user「导入直接成 mesh」）。

## 13. 转换指令 + 导入直接成网格体（v0.15.12，2026-10-27 夜，Claude Fable 5.1）

- **物体族** `src/editor/objects/index.ts`（注册表第二族，单位 = 一个定义 `ObjectUnit { def, name, body, copies }`）：`object.toMesh` / `object.toBrep`，规划出 `castDefinition` op（toBrep 带 `softDeg`，马后炮可改）；提示里**披露丢什么**（`KindDef.castsTo.loses` 文案）+「N 份实例一起变」；已是那种 → 跳过说清。toBrep 有 `estimate`（三角数 ÷ 9000 / 秒，node 实测量级；≥ 5 s 先问「做 / 不做」）。
- **注册表**：`Command<U>` 按单位种类泛型化（`unit` 字段 = 族名，守卫钉死 `familyOf(id) === unit`）；`PoolUnit.kind = "brep"`；`estimate` 进接口。修复九条改成 `Command<PoolUnit>`。
- **编辑器**：`commandMenu()`（浮条入口 = contextBar 放置表；brep 族按池数、object 族按选中组件数）、`runCommand(id)` 按单位种类派发、`objectUnits()`（选中的实例 → 定义去重、锁着的跳过）、`runObjectCommand`（估时先问 → 一步提交 → 披露 → 有参数给马后炮 → 清选区）。main.ts 的浮条照 `commandMenu()` 画、点了走 `runCommand`。
- **mesh → brep** `scene/kinds.ts meshToBrep`：三角化（隐藏面不带）→ 导入那条 `kernelFromTriangles` 管线 → **共面的软边并回一张膜**（同 FM80 的判据：软边、恰两张不同的膜、同一平面 → `eraseEdges` 走擦边机 MERGE；盒子回来还是 6 张、0 条软边）。不平的 n 边形折成平面块、块之间按 softDeg 变软。丢：隐藏面、裸线、材质、原来的软 / 平滑标记（按角度重判）——都在 `castsTo.loses` 里。
- **导入直接成网格体** `scene/import-build.ts`：`castImport` 每个三角一张面 + `smoothByAngle`（`mesh/ops/shade.ts`：恰两张面的边、|cos| ≥ cos(softDeg) → 软 + 平滑；|cos| 是为了外来文件绕向不一致）；op 载荷 = `MeshDoc`（老复现包里带膜的照装成 brep）。要在 SU 工作台里修 = 导入后「转回 SU 体」= 原来那条管线。
- 临时探针（job tmp）：盒子 → 组件 → 浮条「转成网格体（1）」→ 画得出 → 浮条「转回 SU 体（1）」→ 6 张膜 0 软边 → 撤销两步 / 重做一步都对。877 绿。
- 图标：两条动作暂用 `collection` / `wrench`，已在图标库 TODO 登记 `to-mesh` / `to-brep`。
- **wishlist**（user）：自动三角 → 四边形（FM97）。

## 14. 接缝落地（v0.15.16，2026-10-27 夜，Claude Fable 5.1）：M4 的底子

- `MeshUnit` 进注册表（§10 第 20 条兑现）；`Selection` 带种类（A2）；`ModeId freeform` + `MESH_KIND.modes = ["freeform"]` + `modes/freeform.ts`（壳 + 选择）；`enterPool` 按 KindDef.modes 放行；`meshMove` op + 撤销 mesh 记录（整表互换）；第一个路由型动作「挪」。全文 = 注册表提案 §7.8（含给 Opus 的 M4 清单）。
- 网格体池里今天能做的：进 / 出、点 / 边 / 面点击族（一下 / 两下 / 三下连通）、框选、全选 / 反选 / 取消、数值挪（api 面）、撤销 / 重做；画得出、吸得到。不能做的（M4）：所有改拓扑的动词、删除几何、隐藏、建组件。
- 场景层三个只认 brep 的取数改成按身体种类分（`Scene.guidesOf / materialOfSlot / childGroups`）：合成视图在网格体上下文里不再抛。
