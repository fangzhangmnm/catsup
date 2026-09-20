# B-rep 文件表示：侦察 + 想象（讨论稿，等 grill）

> created 2026-09-20 by Claude Fable 5.1 · as-of v0.4.6 · **性质：讨论稿，不是决定。** user 原话：「B rep 我们确实没有讨论过，先讨论一下，不要急着写」「你可以先 scout，然后结合完成品 sketchup 加上我要的几个 gi 和关卡的需求想象会是什么样的」。
> 范围：**一个 definition 里的肥皂膜 B-rep 及挂在它上面的东西**（顶点 / 边 / 面 / 面角 / 面组）。不谈 bake（归导出器 spec）、不谈文档级（契约 §5.6）。拍板后回写契约 `20260919-persistence-data-contract.md` §5.2。
> 侦察来源：本仓 `src/kernel/`（topology / face-lifecycle / planes / facefind / geom）；SketchUp Ruby API 文档（ruby.sketchup.com：Face / Edge / Behavior / Page / UVHelper / ArcCurve / ShadowInfo / Environment，2026-09-20 核过）；user 需求出处 = `journals/20260627 CatsUp proposal.md` L13/L66/L68/L70/L72、总账 E11/E12、user 09-20 各句。

---

## 1. 侦察 A：我们内核现在的数据面（状态 vs 派生）

| 东西 | 在哪 | 状态还是派生 | 备注 |
|---|---|---|---|
| 顶点 `{id, x,y,z, edges}` | `topology.ts` | **状态**（身份 = 1 µm 格点 `ptKey3`） | 无属性；无边的顶点不存在 |
| 边 `{id, a, b, faceLinks}` | `topology.ts` | a,b **状态**；`faceLinks` **派生**（`rebuildFaceLinks` 权威重建） | 两点至多一边（A3） |
| 膜 `{id, planeId, outer: Ring, holes: Ring[]}` | `face-lifecycle.ts` | **状态**（A4：涌现但被存储；闭环可以无面） | `Ring.edges` = 有向边序列（状态）；`Ring.pts` = 平面基下 2D（**派生**） |
| 平面注册表 `{id, plane{n,d}, basis}` | `planes.ts` | `{n,d}` **状态**（τ 容差 sticky 身份，立宪 §0 列入本体）；`basis` **派生**（平面的纯函数） | 注册顺序决定合并后取谁的参数 → 重建不等价，**要存** |
| `coplanarTol` τ | `Kernel` 构造参数 | **状态**（文档级） | 默认 1e-3 |
| 所有 id 计数器 | 各处 | 派生（会话内铸造） | 文件用索引 |
| 事件日志 | `Kernel.eventLog` | 叙事，不存 | |
| 逐边 flags / 材质 / 面前后 / group / curve | — | **还没有** | 文件先留位 |

内核头注释：「没有任何让调用方构造/注入 Face 的入口」——装载文件要一个**复原存储态**的入口（§5 决定点 5）。

## 2. 侦察 B：完成品 SketchUp 的实体模型（按粒度）

SU 的口径：「All Curves in SketchUp are really edges with some extra data attached」——它的 B-rep 也是「边 + 面 + 挂件」，和我们同族。

| 粒度 | SU 存了什么 | 对我们的含义 |
|---|---|---|
| **Vertex** | 只有位置；共享；**无属性** | 顶点无属性——和我们一致；属性都在边 / 面 / 面角 |
| **Edge** | start/end；**soft**（当作曲面的一部分、不画线）/ **smooth**（跨边平滑着色）/ hidden；casts_shadows；layer(tag)；所属 **Curve**；attribute_dictionaries；persistent_id | 逐边 flags 四位：soft / smooth / hidden / noShadow；curve 归属 |
| **Curve / ArcCurve** | 一串边当一个实体（选一段全选、平滑）；ArcCurve 存 **center / radius / normal / xaxis / yaxis**，start/end angle 派生；`is_polygon?` | 曲线 = 边索引列表 + 参数；参数是状态（重建圆弧要它） |
| **Face** | loops（外环 + 内环；每环 = EdgeUse 序列带 reversed 位）；**normal = 正面**；plane；**material / back_material**（前后各一）；贴图定位 per side：`texture_positioned?`（四图钉固定 = 仿射）/ `texture_projected?`（投影向量，可多面共用）/ UVQ（**齐次 u,v,q，透视正确 = 四图钉自由 = 射影**）/ 默认（无定位 = 材质缺省投影）；hidden；casts / receives shadows；layer；attributes；`reverse!` | 面 = 顶点环 + 洞环、planeId、**flip 位**（正面 = ±n）、前后材质、贴图定位四档（默认 / 投影共享 / 仿射 / 射影）、四个 flags 位、tag |
| **Loop / EdgeUse** | 边在环里的方向 | 我们用顶点环隐含（A3） |
| **Group** | 自己的 `transformation`、**自己的 entities（独立顶点池）**、name、locked、hidden、layer、**material（容器材质：内部默认材质的面继承它）**、attributes | SU 是**分池**；我们文件按 user「group 是一个数组」= 同池 + 组索引，两种运行时都能读（§5 决定点 13） |
| **ComponentDefinition** | name、description、**behavior**（is2d / snapto ∈ {Arbitrary, Horizontal, Vertical, Sloped} / cuts_opening / always_face_camera / shadows_face_sun / no_scale_mask 位图）、insertion_point、entities、guid、thumbnail、path（文件当组件） | 定义级字段（契约 §5.3 已有；no_scale_mask 加上） |
| **ComponentInstance** | transformation、definition、name、locked、hidden、layer、**material（继承给内部默认材质面）**、glued_to、attributes、persistent_id | 实例 override = 材质 / 显隐 / 锁 = 契约 §5.4 ✔；**材质继承链**要进契约（决定点 8） |
| **Image** | transformation、width / height、图片 | 纸片人 / 参考图（annotations） |
| **Text / Dimension / SectionPlane / ConstructionLine·Point** | 标注与辅助实体 | annotations（契约 §5.1 已列） |
| **Material / Texture** | name、color、alpha、colorize、texture（图 + **在模型里的实际尺寸**） | core materials + `textureSize`（契约 §5.1 已列） |
| **Layer / Tag** | name、visible、color、folder、line_style、page_behavior | tags 表（契约 ✔） |
| **Page（Scene）** | camera、hidden entities / objects、layers 可见性、rendering_options、shadow_info、style、axes、section planes、**environment（2025）**、transition / delay | views 保存项（契约 ✔）+ environment |
| **ShadowInfo** | Lat / Long / TZ / NorthAngle / 日期时间 / Light / Dark / DisplayOnAllFaces / OnGroundPlane / EdgesCastShadows / UseSunForAllShading / SunDirection | geo + shadows（契约 ✔）；**SU 自己也把太阳当唯一光源** |
| **Environment（SU 2025）** | HDR/EXR 天空球：rotation、skydome_exposure、reflection_exposure、use_as_skydome、use_for_reflections、linked_sun | SU 已经有 IBL——我们的「天空 / 环境光」槽有现成参照（glTF 侧 `EXT_lights_image_based`） |
| **Entity** | `persistent_id`（2017 起，跨会话稳定，给 LayOut 引用用）、entityID（会话）、attribute_dictionaries | SU 也走到了「要跨文件引用就得铸 id」——我们暂不铸，需要时 2.1 UID（决定点 14） |
| **Model options** | 单位 / 精度 / 长度吸附 + 增量 / 角度吸附 | settings（契约 ✔） |

## 3. 叠上你要的 GI / 关卡需求（原话出处）

| 需求（出处） | 落到 B-rep 的哪个粒度 |
|---|---|
| vertex GI 烘进顶点色（L68）；unlit + 顶点色烘光（09-20） | **面角**颜色层 `bakedLight`（derived） |
| 顶点色手绘（09-20「顶点色」） | 面角颜色层 `paint`（状态） |
| lightmap / 像素 GI（L72「open to pixel based GI」） | 面角 **UV2**（自动展 UV，derived）+ 每 definition 一张 lightmap 图集（derived image，带烘焙设置哈希） |
| 平滑着色（09-20「smooth 用边更主流」） | 边 smooth 位 → 法线在 bake 时算，不存 |
| 灯（L70 物理单位）、光照默认先验（E11）、太阳 / 地理（SU ShadowInfo） | 不在 B-rep：节点灯 / 文档 geo+shadows |
| 天空 / 雾 / 风 / 粒子（L68）、SU Environment | 不在 B-rep：文档 environment |
| 阴影参与（SU casts / receives） | 边 noShadow 位；面 noCast / noReceive 位（GI 烘焙输入） |
| 面 tag（SM64 地面类型，09-20） | 面 tag u16 → tags 表 |
| collision 默认开 + override / proxy（E12） | 不在 B-rep：实例 / 定义级 collision，代理 = 2.1 shapes |
| navmesh / patrol / spawn / marker（L70） | 不在 B-rep：节点 extras；navmesh 可由 tag=walkable 的面烘出 |
| 静态 / 动态（GI 参与、lightmap 分辨率） | 定义 / 实例级 `static`、`lightmapScale`（不在 B-rep） |
| 第三方 WYSIWYG（09-20） | bake 事（导出器 spec） |

结论：GI / 关卡把 B-rep 多要的只有三样——**面角层**（颜色 / UV2）、**阴影 flags**、**面 tag**。其余都在 B-rep 之外（节点 / 定义 / 文档）。

## 4. 想象：完整版 `CATSUP_brep` 全貌（按粒度）

```
definition
├─ brep
│  ├─ unit / origin                      单位 = 最粗整除档；origin = 包围盒角          （JSON）
│  ├─ vertices     ×N  pos u8|u16|u32|u64 ×3                                            状态
│  ├─ edges        ×E  (a,b) idx；flags u8 [soft|smooth|hidden|noShadow]；group u16；tag u16   状态（flags/group/tag 全零可缺省）
│  ├─ curves       ×C  { edges:[idx…], kind, params{center,radius,normal,xaxis} }         状态（JSON，少量）
│  ├─ planes       ×P  { n:[f64×3], d:f64 }                                              状态（τ 合并后的参数，重建不等价）
│  ├─ faces        ×F  环流 [nRings, len, v…]；planeId u16；flags u8 [hidden|flip|noCast|noReceive]；
│  │                   material (front,back) u16（0xFFFF = 继承）；tag u16；group u16；mappingKind u8   状态
│  ├─ faceMapping  稀疏  投影 id | 仿射 6 | 射影 8（定点 2^-16）                            状态
│  ├─ projections  ×Pj  { kind, frame, scale }（多面共用，SU projected texture）           状态
│  └─ corners（按面环顺序，每面角一条）
│     ├─ uv        稀疏  显式逐角 UV（定点，四档之④）                                      状态
│     ├─ color.paint      rgb8|rgba8                                                       状态
│     ├─ color.bakedLight rgb8|rgb16      derived                                          派生（可丢）
│     └─ uv2 (lightmap)   u16 归一化      derived                                          派生（可丢）
├─ groups      ×G  { axes, parent }（哑变量：无名无态）                                    状态（JSON）
├─ images.lightmap  每 definition 一张图集 + bakeHash                                     派生（可丢）
└─ （定义级，不在 brep）behavior / static / lightmapScale / collision / extras
```

不存：`faceLinks`、`Ring.pts`、平面基、任何 id、事件日志、法线（由 smooth 位在 bake 时算）。

**尺寸感**（500 面 / 1000 顶点 / 800 边，mm 格 ≤ 65 m）：顶点 6 KB、边 3.2 KB + flags/组/tag 缺省 0、面环 ~5 KB + planeId 1 KB + 材质 2 KB + flags 0.5 KB、平面 ~40 B × ≤500、curves 少量 → **B-rep ≈ 20 KB**；加两层面角颜色（~2500 面角 × 3 B）≈ +15 KB；lightmap UV2 +10 KB + 图集另计。

## 5. 决定点（前 7 条重审 + 新增）

前 7 条（chat 里已列）在完整图景下**全部成立**，只有第 2 条从「不存平面」改成「存平面」（SU 也存 plane）。新增：

8. **材质继承链**（SU：面默认材质 → 容器 / 实例材质）：面 `material = 0xFFFF` = 继承；实例 `overrides.material` 只对继承面生效——这让「一个组件换色」不用碰几何。建议采纳。
9. **贴图定位四档 ↔ SU 一一对应**：默认 = 材质缺省投影（不存）；projected = 投影向量多面共用；positioned = 仿射四图钉；UVQ 透视 = 射影四图钉。显式逐角 UV 是我们多给的第四档（导入网格用）。建议采纳。
10. **面角层**：`paint`（状态）/ `bakedLight`（派生）/ `uv2`（派生）/ 显式 `uv`（状态）；派生层带 `derived: true` + 烘焙设置哈希，可丢可重算；lightmap 图集同理。建议采纳。
11. **阴影 flags**：边 noShadow、面 noCast / noReceive（SU 三件；GI 烘焙输入）。建议采纳。
12. **curves 表示**：`curves[{edges, kind, params}]`（曲线列边，稀疏）而非每边一个 curve 索引。建议采纳。
13. **SU 分池 vs 我们同池**：SU 的 group 有独立顶点池；我们按 user「数组」= 同池 + 每元素组索引；分池运行时读时按组切、同池运行时直接用。保持。
14. **persistent_id**：SU 2017 为 LayOut 引用给每实体铸了跨会话 id；我们**暂不铸**，跨文件引用时用 2.1 UID。保持「不铸 id」。
15. **平面参数精度**：`{n,d}` 用 float64（JSON 数字）——τ = 1e-3 而 f32 的 d 在 4 000 km 处 ulp 0.25 m，f32 不够；每平面 ~40 B，可接受。
16. **装载校验**：`Kernel.fromBrep` 跑面环自洽不变量（环边存在 / 无重边 / 无孤点 / 同环唯一膜 / 环绕向与平面法向一致），失败**整文件拒开报出**，不静默修（数据安全词典序）。

## 6. 之后

拍板 → 改契约 §5.2 → 写 `brep-codec.ts` + `Kernel.fromBrep`（回写立宪页「持久化装载」条）→ 其余按 A18 ①。
