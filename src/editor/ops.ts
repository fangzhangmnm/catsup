// ops.ts —— 编辑动词的**指令**（op）：可序列化、按几何寻址（µm 格点坐标 = 顶点身份，公理 3「重合即同一」），不含顶点 / 边 / 面的运行时 id。
// created 2026-09-20 by Claude Fable 5.1（A1 正规 undo；user 09-20「一开始就按照 multiplayer friendly 做这种 replay 指令式」）
// 2026-10-21（group / component 纪元，Claude Fable 5.1）：op 作用在 **Scene** 上；几何 op 带池地址 `at`（definition + group，缺省 = 根池）；
//   新动词 makeGroup / makeComponent / explode / transformPool / transformInstance / placeInstance / eraseInstance / eraseGroup。
//   池 / 实例的 id 由 Scene 顺序铸造，重放同序列 → 同 id，所以 op 里可以带它们（与顶点 µm 寻址同一精神：共识只在确定性上）。
//
// 为什么按坐标寻址：单机重放靠 id 计数器逐字一致也成立，但联机各 peer 的 id 历史不同——线协议上只有几何本身是共识。
// 解析失败（目标已不在）→ 抛 OpTargetError：单机 = 这批不落地（History 回滚）；联机 = 上层政策，这里不裁。
// 指令流生命周期 = runtime（user 2026-09-07：文件只存快照，不存 op 日志）。
import { declareRingEdges } from "../mesh/ops/ring-edges.ts";
import { MATERIAL_INDEX, faceHidden, faceMaterial, givenFaceValues, unpackEdgeByte } from "../mesh/reserved-columns.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import { uniqueCopy } from "../format/scene-store.ts";
import { COLOR_CHANNEL, COLOR_VALUE, assertSizedImage, paintIn, type ShelfItem, type TextureDoc } from "../format/document.ts";
import { type PaintOutcome, applyMeshLayoutPaint, applyMeshPaintFaces, applySetFreed, applyStartPaint } from "./paint-ops.ts";
import { type PaintMove, paintMoveBlocked } from "../scene/paint.ts";
import { DEFINITION, TEXTURE, type DefinitionEntry } from "../format/entry-kinds.ts";
import type { CurveSpec } from "../kernel/kernel.ts";
import { markEdges } from "../mesh/edge-smooth.ts";
import { bevelEdges, bevelVerts } from "../mesh/ops/bevel.ts";
import { snapToSymmetry, symmetrize } from "../mesh/mirror.ts";
import { looseBits, subdivide } from "../mesh/ops/subdivide.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { castBody } from "../scene/kinds.ts";
import { moveVerts, extrudeAndOffset, extrudeAlongNormals, knife, loopCut, loopCuts, deleteSelection, insetFaces, addPrimitive, mergeVerts, type PrimitiveKind, type PrimitiveFrame, splitEdge, duplicateGeometry, fillOrBridge, flipFaces } from "../mesh/ops/index.ts";
import { Kernel } from "../kernel/kernel.ts";
import { bornFaces, settleNewFaceSides } from "../kernel/face-sides.ts";
import { MeshKernel, type EdgeOrigin } from "../mesh/mesh-kernel.ts";
import { mergeUvSlots, remapUvCode } from "../scene/uv.ts";
import { FRESH } from "../mesh/columns.ts";
import type { BrepSnapshot, EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { dot3, normalize3, pointOnSegment3, ptKey3, quantize3, scale3, sub3 } from "../kernel/geom.ts";
import { edgesAlongSegs } from "../kernel/curves.ts";
import { INSERT_TOL } from "../kernel/subdivide.ts";
import { MirrorRejected, mirrorGeometry, reflectionXform } from "./mirror.ts";
import { PRESETS, applyPreset } from "./presets.ts";
import { liveDefs, materialUse } from "../scene/resources.ts";
import { BUILTIN_BACK_SLOT } from "../scene/builtin-materials.ts";
import { type PoolRef, type MeshBody, type BrepBody, type Body as SceneBody, type Definition, type Instance, type Material, Scene, absorbSnapshot, bboxMin, extractSnapshot, remapSnapshotMaterial, transformSnapshot } from "../scene/scene.ts";
import type { MeshFragment, TransferClosure, TransferGroup, TransferInstance } from "./transfer.ts";
import { KEEP, landPayload, pasteBlocked, planPaste, type Decision, type LandedPayload, type PastePlan } from "./paste-plan.ts";
import { type Frame, type Xform, IDENTITY, WORLD_FRAME, applyPt, compose, det3, frameAt, frameToXform, hasShear, invert, isRigid, scalingAbout, transformFrame, translation } from "../scene/xform.ts";
import { addGuideCircle, addGuideLine, addGuidePoint, addGuideSphere, cloneGuides, eraseGuides, transformGuides } from "../scene/guides.ts";
import { type ImportedScene, buildImport } from "../scene/import-build.ts";

export type Seg = [PtIn, PtIn];
/** 边的寻址 = 两端点坐标。 */
export type EdgeKey = [Pt3, Pt3];
/** 面的寻址 = 外环顶点坐标（顺序无关；集合相等即同一张膜）。 */
export type FaceKey = Pt3[];

export type Op =
  /** 插件指令（可整个扔的模块：修复指令等；user 10-26「做成可以扔的模块化的，最好是各种命令都这样」）：按 name 找 registerOpPlugin 登记的执行器；args 由插件自己定、可序列化。 */
  | { op: "plugin"; name: string; at: PoolRef; args: Record<string, unknown> }
  | { op: "clear" }
  | { op: "preset"; name: string }
  /** harden（2026-10-26，user「画线描过一条软边，就把它变硬……这个确实是应该有的行为」）：落在这些线段上的边去掉软 + 平滑（画线 / 矩形描过看不见的软边 = 想要一条看得见的边）。 */
  /** front = 造面的窄意图（§9.2½ ③）：邻面给不出朝向时，这个方向那侧 = 正面（编辑器从相机算出来写进 op，内核只见方向）；缺 = 不写（老复现包）。 */
  | { op: "addEdges"; at?: PoolRef; segs: Seg[]; curve?: boolean | CurveSpec; harden?: boolean; front?: Pt3 }
  /** 炸开曲线（SU Explode Curve）：edges 里每条边所在的曲线散成普通边。 */
  | { op: "explodeCurves"; at: PoolRef; edges: EdgeKey[] }
  /** 焊接（B19）：edges = 有序链的各边（坐标寻址）→ 一条曲线。 */
  | { op: "weldEdges"; at: PoolRef; edges: EdgeKey[] }
  /** 溶解（焊边橡皮「共轴 → 真合并」；user 2026-10-24）：这些顶点（坐标寻址）各并成一条边——须二度共线、两边面链接相同、两端之间没边，不满足的跳过。 */
  | { op: "dissolveVertices"; at: PoolRef; points: Pt3[] }
  /** 批：几个 op 当一步（一次撤销；焊边橡皮一刮 = 溶解 + 焊接、软边橡皮一刮 = 删边 + 软化）。顺序执行；中途抛 = 整批回滚（history 装回快照）。 */
  | { op: "batch"; label: string; ops: Op[] }
  | { op: "eraseEdges"; at?: PoolRef; edges: EdgeKey[] }
  | { op: "eraseFaces"; at?: PoolRef; faces: FaceKey[] }
  | { op: "eraseSelection"; at?: PoolRef; faces: FaceKey[]; edges: EdgeKey[] }
  /** mirror（DT8，2026-10-26）：这次挪点是镜像（变换的行列式 < 0）——整张面都在挪的点里的面先两侧互换（结算机按绕向再判一次 = 侧跟着法向走）。 */
  | { op: "move"; at?: PoolRef; moves: { from: Pt3; to: Pt3 }[]; mirror?: boolean; /** 自动折面的折缝带哪些边层（DT87 工作流亚种；缺 = 硬线）。 */ creaseLayers?: string[] }
  | { op: "pushpull"; at?: PoolRef; face: FaceKey; dist: number; /** 加边（不自愈：原帽环留着、侧面新起一段；SketchUp 按 Ctrl）。缺 = 接着长。 */ keepRing?: boolean; /** 同 addEdges.front：底面没朝向时先按它定底面，再灌到新面。 */ front?: Pt3; /** 只有预演带（op-locks.ts previewVariant）：落地不湮灭，推平到底时压扁态还看得见、还吸得到；提交永远湮灭。预演和提交的唯一差别。 */ settleLanding?: false }
  | { op: "followme"; at?: PoolRef; face: FaceKey; path: Pt3[]; closed: boolean; smoothJoints: boolean[] }
  | { op: "absorb"; at?: PoolRef; faces: Pt3[][][]; wires: [Pt3, Pt3][]; edgeSegs?: Record<string, [Pt3, Pt3][]>; faceLayers?: (Record<string, number> | undefined)[] }
  /** 选区 → 新 group（父 = at.group）；几何从池里搬出去，与别的面共享的边留下。 */
  /** groups / instances = 一起装进去的、这一层的子组 / 组件（2026-10-26，SketchUp 同款嵌套；user「当然要」）。 */
  | { op: "makeGroup"; at: PoolRef; faces: FaceKey[]; edges: EdgeKey[]; groups?: number[]; instances?: number[] }
  /** 选区 → 新 definition + 一个实例（轴 = 包围盒最小角）。 */
  | { op: "makeComponent"; at: PoolRef; faces: FaceKey[]; edges: EdgeKey[]; name: string; groups?: number[]; instances?: number[] }
  /** 拍平（纪元排期 T9 / DT7）：faces = 作用域（空 = 池里全部）；规划在 planar.ts（纯函数，预演同一份）；执行时结算出 BURST = 整步拒绝（零破面不变量）。 */
  /**
   * 吸到格点（纪元排期 T8 / DT4）：verts = 作用域（坐标；空 = 池里全部）；lattice = 池本地坐标 → 格子坐标（12 个数的仿射变换），格点 = 分量是 step 的整数倍；
   * 规划在 snap-grid.ts（纯函数）。不破面：先在拷贝上试，会破的面先在原平面里三角化（对角线带折缝的层），再真吸；还破 = 整步拒绝。
   */
  /** 应用缩放（2026-10-26，user「这样的话我们需要一个apply scale」）：def 里的实例 instance 的缩放烘进它的定义；这一份只剩旋转 + 平移，同一定义的别的份乘反比补偿（外观不变）。 */
  | { op: "applyScale"; def: number; instance: number }
  /** 炸开：group 的几何并回父池；实例的定义几何（经变换）并回父池（group 与实例都递归成子项）。 */
  /** cast：组件的散几何和外面一层不是一种身体时，要用户点过「转成 X 再炸」才带 true（设计稿 20261028-object-layer-and-clipboard §2：不许静默转种类）；组件没自己的几何（只摆着子物件）不用。 */
  | { op: "explode"; at: PoolRef; group?: number; instance?: number; cast?: boolean }
  /** 做成唯一（SketchUp Make Unique）：这一份实例换成一份新定义（深拷），别的份不受影响。 */
  | { op: "makeUnique"; def: number; instance: number }
  /** 合并：at 里的 source 并进同一层的 target（= 贴进 target 的定义〔原位〕→ 在里面炸开 → 删外面这一份；设计稿 20261028-object-layer-and-clipboard §4）。cast 同 explode。 */
  | { op: "mergeObject"; at: PoolRef; target: number; source: number; cast?: boolean }
  | { op: "transformPool"; at: PoolRef; xform: Xform }
  | { op: "transformInstance"; def: number; instance: number; xform: Xform }
  | { op: "placeInstance"; at: PoolRef; definition: number; xform: Xform }
  /** 导入外来 glb（T11 / DT2，2026-10-26）：节点树原样变成组件挂在 at 下面；scene 里的网格是提交前装好的膜（scene/import-build.ts castImport）。place = 文件坐标 → at 的定义坐标。 */
  | { op: "importScene"; at: PoolRef; scene: ImportedScene; place: Xform }
  | { op: "eraseInstance"; def: number; instance: number }
  /** 清理没人用的组件定义（0.18 I10；user 点了「清理」才跑）：全家唯一删定义的地方（守卫 test/orphan-defs.test.ts）；单子里有一个还够得着 = 整条拒绝、一个不删。 */
  | { op: "purgeDefs"; defs: number[] }
  /** 清理没人用的材质（身份地基 ID-2；user 点了「清理」才跑）：全家唯一删材质的地方（守卫 test/identity-id2.test.ts）；单子里有一个还有人用（活着的组件 / 孤儿组件 / 素材架）= 整条拒绝。materials = 这一刻的运行时下标；同一条指令把所有定义的槽表重排，面上的槽号不动（计划书 §8 ①）。 */
  | { op: "purgeMaterials"; materials: number[] }
  /**
   * 换父亲 / 同级排序（身份地基 ID-2，计划书 §8 ②）：实例对象搬家，**GUID 不变**（以前「换父亲」= 删 + 贴 = 新身份）。跨定义 = 在目标定义里拿新句柄；同一定义 = 句柄不变、只改顺序（和 parent）。
   * index = 搬完之后它在目标定义的实例顺序里排第几（缺 = 跨定义排最后、同定义不动）；xform = 目标定义里的新变换（缺 = 不变）。先查成环。
   */
  | { op: "moveInstance"; from: { def: number; inst: number }; into: { def: number; parent: number | null }; xform?: Xform; index?: number }
  /** 复制一个 group（含子 group / 子实例）到同父池，整体经 xform（父空间）。 */
  | { op: "copyGroup"; at: PoolRef; group: number; xform: Xform }
  /** 新材质（文档级）：颜色 sRGB 0..1；channels = 通道名 → 一摞贴图 GUID（这一版只用 color、一摞一张；图在贴图表里，先 addTexture）。返回索引 = 当时的 materials.length。
   *  （v0.19.4 起不再带 texture：旧复现包里带 texture 的这一条重放不了，scripts/replay-repro.mjs 拒绝并停下——统筹 11-10 定：调试用的衍生物不做向后兼容。） */
  | { op: "addMaterial"; name: string; color: [number, number, number]; channels?: Record<string, Guid[]> }
  /** 贴图表加一行原图（2026-11-10 贴图主线 1-0½）：guid 在指令里（同一步后面的 addMaterial 要指它；重放同一个身份）；value = 颜色。
   *  字节 = 运行时 Uint8Array（进复现包 = JSON 里一个键是 0、1、2… 的对象，和以前 addMaterial 的图一样；replay-repro.mjs 转回字节）。 */
  | { op: "addTexture"; guid: Guid; name: string; mimeType: string; bytes: Uint8Array; sizeM: [number, number] }
  /** 新建一张平铺的画（施工单二十一第 3 刀，CATSUP_textures 1.2）：贴图表一行（分层 = ora：新建时就编好的空白分层字节，画布大小只写在它里面；sizeM = 在模型上一张多大）
   *  + 一个颜色那一槽指着它的材质（底色 color）。一步撤销。不铺到任何面上（涂到面上是油漆桶的事）。 */
  | { op: "addTiledPaint"; textureGuid: Guid; materialGuid: Guid; name: string; ora: Uint8Array; sizeM: [number, number]; color: [number, number, number] }
  /** 清理没人用的贴图（用户在资源页点了「清理」才跑）：全家唯一删贴图的地方（守卫 test/textures-table.test.ts）；还有材质指着 / 素材架收着 = 整条拒绝。 */
  | { op: "purgeTextures"; textures: Guid[] }
  /** 排法表几行的空出来的地方换成新的清单（施工单十八第 2 刀：只由每一步的收尾补进同一步，editor/paint-freed.ts；四个一组、单位格；空 = 去掉这个键）。 */
  | { op: "setFreed"; rows: { uvSet: Guid; freed: number[] }[] }
  /** 边层开关（软化 / 硬化 / 隐藏…）：这些边打上 / 去掉若干层。 */
  | { op: "setEdgeLayers"; at: PoolRef; edges: EdgeKey[]; layers: string[]; on: boolean }
  /** 油漆桶：这些面涂文档材质 material（null = 回默认）；槽号在该 definition 里解析 / 新开。 */
  /** sides（DT8，2026-10-26）：每张面涂哪一侧，与 faces 对齐（0 = 平面法向 +n 那侧、1 = −n 那侧）；缺 = 两侧都涂（老复现包 / 老行为）。 */
  | { op: "paintFaces"; at: PoolRef; faces: FaceKey[]; material: number | null; sides?: (0 | 1)[] }
  /** 翻面：选中的面两侧的值互换（几何不动）。 */
  | { op: "flipFaceSides"; at: PoolRef; faces: FaceKey[] }
  | { op: "eraseGroup"; at: PoolRef; group: number }
  /** 锁定 / 解锁一个子实例（A27；at = 它所在的池）。解锁永远允许（Editor 的锁护栏对本 op 豁免）。0.14 起组不是物体、不能锁：带 group 的 setLocked 被拒。 */
  | { op: "setLocked"; at: PoolRef; group?: number; instance?: number; on: boolean }
  /** 改名（0.18 物品栏纪元 I4）：instance 给了 = 这一份自己的名字（空 / null = 去掉，回到显示组件名）；def 给了 = 组件定义的名字（摆了几份都跟着变；不许空）。 */
  | { op: "rename"; at: PoolRef; instance?: number; def?: number; name: string | null }
  /** 隐藏 / 显示（DT49；at = 所在的池）：一个子实例（藏父连子）和 / 或这个池里的一批面 / 边（面层 / 边层 hidden；「挖洞看里面」）。只藏不删：不画、不吸、点不中。 */
  | { op: "setHidden"; at: PoolRef; instance?: number; faces?: FaceKey[]; edges?: EdgeKey[]; on: boolean }
  /** 全部显示：整个场景里所有被隐藏的实例、面、边都放回来（DT49）。 */
  | { op: "unhideAll" }
  // ---------- 0.14 物体模型（契约 ai-docs/20261024-object-model-contract.md）----------
  /** 显式换身体种类（定义级：共享定义的全部实例一起变）；只认 kinds.ts 登记表里的方向，失败不改文档。 */
  | { op: "castDefinition"; def: number; to: BodyKind; /** mesh → brep：弯折不到这个角度的边算软边（度；缺 = 20）。 */ softDeg?: number }
  // ---------- mesh 族（0.15 网格体；2026-10-27 接缝）：网格体没有组，寻址 = 定义 + 内核 id（数组制度：id 稳定、克隆保号，不用按坐标寻址）----------
  /** 挪网格点：往位置数组里写（mesh/ops/geometry.ts moveVerts）。不过结算机、不合并、不折面——mesh 刻意没有 brep 的公理。 */
  | { op: "meshMove"; def: number; moves: { v: number; to: Pt3 }[] }
  /**
   * 挤出（自由建模；2026-10-27 Opus 5.5）：有面挤面（区域）、否则挤边、否则挤点。offset = 新点整体平移（本地坐标；面、或锁了轴）；
   * along = 边 / 点的新点各自沿源点的「垂直」方向走这么长（本地长度；user「默认垂直」，mesh/ops/extrude.ts extrudeNormalDirs）。两个给一个。
   */
  | { op: "meshExtrude"; def: number; faces?: number[]; edges?: number[]; verts?: number[]; offset?: Pt3; along?: number }
  /** 刀（自由建模；2026-10-27 Opus 5.5）：face 上按顺序的落点（已有的点 { v } / 边上的点 { e, t }），相邻两点之间劈面。mesh/ops/split.ts knife。 */
  | { op: "meshKnife"; def: number; face: number; path: ({ v: number } | { e: number; t: number })[] }
  /** 环切：从 edge 出发沿四边形带切一圈，每条边在 t 处劈开（缺 = 0.5；从 edge 的 edgeA 那头量，整圈同一侧）。cuts = 圈数（缺 = 1；> 1 = 均分、t 不起作用；W-8）。mesh/ops/loopcut.ts。 */
  | { op: "meshLoopCut"; def: number; edge: number; t?: number; cuts?: number }
  /** 删（自由建模的 X / Delete / 删除工具）：面 → 边 → 点三档一次；dissolve = 溶解（边 → 两侧面并一张、二度点去掉；溶解不了的跳过）。mesh/ops/delete.ts deleteSelection。 */
  /** 右键新建（网格体里）：在这个网格体里长一个基本体（坐标架 = 本地；mesh/ops/primitives.ts）。 */
  | { op: "meshAddPrimitive"; def: number; kind: PrimitiveKind; frame: PrimitiveFrame; size: [number, number, number]; segments?: number }
  /** 右键新建（SU 体里 / 根上）：新的网格体组件（定义 + 一份实例，摆在 at 池里 xform 处）。 */
  /** 插入（自由建模；面各自往里插一圈，dist 本地长度、超过上限按上限）。mesh/ops/inset.ts insetFaces。 */
  | { op: "meshInset"; def: number; faces: number[]; dist: number }
  /** 手标边（2026-10-28 FM129）：sharp = 棱 / smooth = 平滑且不画线 / none = 清掉交给默认平滑（mesh/edge-smooth.ts markEdges）。 */
  | { op: "meshEdgeMarks"; def: number; edges: number[]; /** 手标三档 + 接缝的标 / 清（施工单二十二第 1 刀；mesh/edge-smooth.ts EdgeMark）。 */ mark: "sharp" | "smooth" | "none" | "seam" | "unseam" }
  /** 倒边（2026-10-28 FM152；mesh/ops/bevel.ts bevelEdges）：width = 本地长度、segments ≥ 1（≥ 2 = 圆角）；一条都没倒 = 拒（不提交空步）。 */
  | { op: "meshBevel"; def: number; edges: number[]; width: number; segments: number }
  /** 细分（Catmull-Clark，破坏性；2026-10-28 FM133；mesh/ops/subdivide.ts）：levels 次；有裸线 / 孤立的点 = 拒。 */
  | { op: "meshSubdivide"; def: number; levels: number }
  /** 强行对称（2026-10-28 FM134；mesh/mirror.ts symmetrize）：side 那半为准，另一半删掉照它镜回来；跨过镜像面的面 = 拒。 */
  | { op: "meshSymmetrize"; def: number; axis: 0 | 1 | 2; side: -1 | 1 }
  /** 网格体的「对称」属性开 / 关 / 换轴（mirror = null 关）：骨架级、进撤销（2026-11-09 计划书 20261109-audit-fixes-plan §3 第 7 条；以前直接改 Scene.meshMirrors、不进撤销 = 撤销后模型回来了、强行对称还开着）。 */
  | { op: "setMeshMirror"; def: number; mirror: { mode: "edit" | "force"; axis: 0 | 1 | 2 } | null }
  /** 对称对齐（FM136；只动选中的点）：mode auto = 选区重心那边为准 / flip = 另一边 / average = 取平均。 */
  | { op: "meshSymmetrySnap"; def: number; verts: number[]; axis: 0 | 1 | 2; tol: number; mode: "auto" | "flip" | "average" }
  /** 合并到中心（Blender M → 到中心；2026-10-28 user「选择多个点的时候右键可以merge to center」）：这几个点并成一个、放在它们的平均位置；退化的面自动清掉（mesh/ops/merge.ts）。 */
  | { op: "meshMerge"; def: number; verts: number[]; to?: Pt3; split?: { edge: number; t: number } }   // to 缺 = 并到中心；镜像并点（落到中缝的点和孪生点）给定落点；split = 先在 t 处劈这条边、劈出来的点一起并（落点在中缝一条边的中间，2026-10-28 Opus）
  /** 倒点（Blender Ctrl+Shift+B）。 */
  | { op: "meshBevelVerts"; def: number; verts: number[]; width: number }
  /** 网格体的默认平滑（2026-10-28 FM129；几何属性：没手标的边算棱还是光滑过渡）。 */
  | { op: "meshSmoothDefault"; def: number; mode: "angle" | "smooth" | "hard"; deg: number }
  | { op: "meshDelete"; def: number; verts?: number[]; edges?: number[]; faces?: number[]; dissolve?: boolean }
  /** 复制选中的几何叠在原处（Blender Shift+D；之后接着 G 挪开）。 */
  | { op: "meshDuplicate"; def: number; verts?: number[]; edges?: number[]; faces?: number[] }
  /** 补洞（一圈开口边 → 一张面）/ 桥接（两圈点数一样 → 一圈四边形）。 */
  | { op: "meshFill"; def: number; verts?: number[]; edges?: number[] }
  /** 翻转这些面的朝向（单面网格的正面 = 环的绕向）。 */
  | { op: "meshFlip"; def: number; faces: number[] }
  /** 开始画（贴图主线 1-3b；editor/paint-ops.ts）：给这些面铺一套贴图坐标、建一张没有字节的分层贴图和一个接着它的材质、把面换成它。三个 GUID 写在指令里（重放得到同一个身份）。 */
  | { op: "startPaint"; def: number; faces: number[]; uvSet: Guid; textureGuid: Guid; materialGuid: Guid; names: { uvSet: string; paint: string; material: string }; color: [number, number, number]; density?: number; /** 没给密度时画布边长（2026-11-11 开始画时选；缺 = 1024，老指令流重放不变）。 */ canvas?: number; /** 铺法（施工单十五）：faces = 一张面一块（缺 = 这个）、patches = 按朝向连成片。名字避开贴图行的 layout（那是「画铺在哪一套排法上」，施工单十八第 1 刀起只剩 { uvSet }）。 */ arrange?: "faces" | "patches"; /** 施工单十六第四节：density = 按一格多大开（要和 density 一起给；画布取接近正方形、够用的最小宽高，那一套坐标记 fit = density、以后加面画布能长大）；缺 / size = 按总大小（画布不自己变大）。 */ fit?: "size" | "density" }
  /** 给网格体的面换材质（1-3b）：material = 文档材质的下标、null = 默认；可以换成这个定义自己的画，别的定义的画拒绝；从画换走角上的数留着。 */
  | { op: "meshPaintFaces"; def: number; faces: number[]; material: number | null }
  /** 给走画但还没有位置的面补一块（1-3b；每一步做完的收尾补进同一步）：faces = 只看这些（不给 = 全部）。放不下的不拒绝，留着没有值。 */
  | { op: "meshLayoutPaint"; def: number; faces?: number[]; /** 先拿掉这些面的位置（每一步的收尾读内核报告：并面时贴图坐标对不上的；施工单十八第 1½ 刀）。 */ drop?: number[] }
  /** 分开（Blender P → 选中）：网格体 def 里这些面搬进一个新的网格体组件，摆在 at 池里、和正在编辑的那一份（instance）同一个变换（世界里不动）。 */
  | { op: "separateObject"; at: PoolRef; instance?: number; def: number; faces: number[]; name: string }   // instance 缺 = 在最外层分（新组件摆在最外层、不变换）
  /** 合并物体（Blender Ctrl+J）：at 池里 sources 这几份网格体的几何换到 target 那一份的坐标里并进它的定义，sources 删掉。 */
  /**
   * 粘贴（剪贴板 / 以后的移动复制；transfer.ts 载荷，**目标本地坐标**）。散几何的种类必须和目标一样（要转的在提交前由用户点「转」，castPayload）；实例什么容器都接，不许造环。
   * 面上的材质编号 = materials 这张对照表的下标（家规「编号只当对照表的代号」）：按 GUID 对回文档材质，没有就带着原 GUID 加回来，再换成目标定义的槽号。缺 materials = 老复现包：编号就是文档材质下标。
   * closure = 载荷自带的定义 / 层（计划书 §15.1-B）：先合并再摆放，同 GUID 用目标那条、不比内容；不在的带原 GUID 新建；摆放现铸 GUID。只有闭包没有摆放（素材导入）= 纯合并。
   */
  | { op: "paste"; at: PoolRef; brep?: BrepSnapshot; groups?: TransferGroup[]; mesh?: MeshFragment; instances?: TransferInstance[]; materials?: readonly Material[]; /** 材质指着的贴图（文件形状；2026-11-10）。 */ textures?: readonly TextureDoc[]; closure?: TransferClosure; /** 内容不一样的条目怎么办（设计书 §7–§8；缺 = 留这里的）。 */ merge?: Decision; /** 素材导入：落地之后这几条上架（断开过的按新身份，所以不能另起一条 shelfPut）。 */ shelve?: { ref: Guid; guid: Guid }[] }
  /** 素材架（计划书 §15.1-D）：架上只存引用，取下不删条目（生死按引用）。条目顺序有意义（user 摆的）；index = 同一个文件夹里的第几个，缺 = 排最后。文件比本版新（shelfFrozen）= 六条全拒。
   *  新条目的 guid 写在指令里（调用方铸）：后面的指令按它找这一格 / 这个文件夹，落地时才铸 = 重放对不上（撤销一致性 fuzz 抓到的）。 */
  | { op: "shelfPut"; kind: "definition" | "material"; ref: Guid; folder: Guid | null; index?: number; guid: Guid }
  | { op: "shelfTake"; item: Guid }
  | { op: "shelfMove"; item: Guid; folder: Guid | null; index?: number }
  | { op: "shelfFolderAdd"; name: string; parent: Guid | null; guid: Guid }
  | { op: "shelfFolderRename"; folder: Guid; name: string }
  | { op: "shelfFolderRemove"; folder: Guid }
  /** 层表（文档级）：加 / 改名 / 可见 / 删（成员回继承；id 0 不可删）。 */
  | { op: "addLayer"; name: string; color?: [number, number, number] }
  | { op: "renameLayer"; layer: number; name: string }
  | { op: "setLayerVisible"; layer: number; visible: boolean }
  | { op: "removeLayer"; layer: number }
  /** 归层：at 定义的子实例归到某层；null = 回到继承。（面不打层——user 2026-10-24「facelayer可能太复杂了……不要」：要藏汤里的一部分 = 做成组件再归层。） */
  | { op: "assignLayer"; at: PoolRef; instances: number[]; layer: number | null }
  // ---- 参考几何 / 轴（0.11 尺规纪元；池本地坐标）----
  | { op: "addGuide"; at: PoolRef; line?: { p: Pt3; dir: Pt3 }; point?: Pt3; /** 参考圆（圆规，DT50）：池本地坐标。 */ circle?: { c: Pt3; n: Pt3; r: number }; /** 参考球（球规，DT50）。 */ sphere?: { c: Pt3; r: number } }
  | { op: "eraseGuides"; at: PoolRef; ids: number[] }
  | { op: "clearGuides"; at: PoolRef }
  /** 改轴：group = 换 group 的帧（definition 坐标，几何不动）；根 = 绘图轴（世界坐标）；组件定义暂不支持。 */
  | { op: "setAxes"; at: PoolRef; frame: Frame }
  /** 画图用的坐标架（DT86）：根 = 绘图轴；组 = 组的坐标架；组件 = definition 的 drawFrame。frame = null = 重置（根 → 世界；组 → 它所在那层的坐标架；组件 → 跟组件原点）。不碰几何。 */
  | { op: "setDrawFrame"; at: PoolRef; frame: Frame | null }
  /** 镜像（DT23）：选中的面 / 线 + 组件实例（池本地坐标的镜像面）；默认删对面、消中缝、融合阈值 0。几何在 mirror.ts。 */
  | { op: "mirror"; at: PoolRef; faces: FaceKey[]; edges: EdgeKey[]; instances?: number[]; plane: { origin: Pt3; normal: Pt3 }; deleteOpposite: boolean; mergeSeam: boolean; weld: number; /** 防碎距离（米）；缺 = 默认 0.1 mm（老复现包照旧）。 */ guard?: number };

export interface ApplyResult { scene: Scene; events: FaceEvent[]; }
/** 插件指令的执行器。插件模块 import 本文件、在自己的文件顶层登记；本文件不认识任何具体插件（删掉插件模块 = 它的指令变成「没装」）。 */
export interface OpPlugin { apply(s: Scene, at: PoolRef, args: Record<string, unknown>): ApplyResult; describe?(args: Record<string, unknown>): string; }
const OP_PLUGINS = new Map<string, OpPlugin>();
export function registerOpPlugin(name: string, plugin: OpPlugin): void { OP_PLUGINS.set(name, plugin); }

export class OpTargetError extends Error {
  readonly what: string;
  constructor(what: string) { super(`op target vanished: ${what}`); this.name = "OpTargetError"; this.what = what; }
}

// ---------- 寻址 → 运行时 id（在应用那一刻的内核上解析）----------
const key = (p: Pt3): string => ptKey3(quantize3(p));
const fmt = (p: Pt3): string => `(${p.x},${p.y},${p.z})`;
export function resolveVertex(k: Kernel, p: Pt3): VertexId {
  const id = k.graph.vertexAt(quantize3(p));
  if (id === undefined) throw new OpTargetError(`vertex ${fmt(p)}`);
  return id;
}
export function resolveEdge(k: Kernel, [a, b]: EdgeKey): EdgeId {
  const id = k.graph.edgeBetween(resolveVertex(k, a), resolveVertex(k, b));
  if (id === undefined) throw new OpTargetError(`edge ${fmt(a)}-${fmt(b)}`);
  return id;
}
const ringSig = (ring: readonly Pt3[]): string => [...new Set(ring.map(key))].sort().join(";");
export function resolveFace(k: Kernel, fk: FaceKey): FaceId {
  const want = ringSig(fk);
  // 先只看第一个角上的面（预演每帧走这里，全表扫 = 随模型涨；2026-11-04 ID-2c）：外环过这个点的面一定挂在它的某条边上。挑号最小的 = 和全表扫同一个结果；没找到再全表扫一遍才报错（防 faceLinks 漏，不是常路）。
  const v0 = fk.length ? k.graph.vertexAt(quantize3(fk[0])) : undefined;
  if (v0 !== undefined) {
    const near = new Set<FaceId>();
    for (const e of k.graph.vertex(v0).edges) for (const f of k.graph.edge(e).faceLinks) near.add(f);
    for (const f of [...near].sort((a, b) => a - b)) { const r = k.faceRings3(f); if (r && ringSig(r.outer) === want) return f; }
  }
  for (const f of k.faces()) if (ringSig(k.faceRings3(f.id)!.outer) === want) return f.id;
  throw new OpTargetError(`face [${fk.map(fmt).join(" ")}]`);
}

// ---------- 运行时 id → 寻址（造 op 时，在当前 checkpoint 上）----------
export const edgeKey = (k: Kernel, id: EdgeId): EdgeKey => { const e = k.graph.edge(id); return [k.graph.pt(e.a), k.graph.pt(e.b)]; };
export function faceKey(k: Kernel, id: FaceId): FaceKey {
  const r = k.faceRings3(id);
  if (!r) throw new OpTargetError(`face #${id}`);
  return r.outer;
}
/** 工具算出的 {id, to} 移动集 → 按坐标寻址的 move op。 */
export function moveOp(k: Kernel, moves: readonly { id: VertexId; to: PtIn }[], at?: PoolRef): Op {
  return { op: "move", ...(at ? { at } : {}), moves: moves.map((m) => ({ from: k.graph.pt(m.id), to: { x: m.to.x, y: m.to.y, z: m.to.z ?? 0 } })) };
}

// ---------- 应用（重放与实时同一条路；clear / preset 换新场景，其余原地）----------
// 门 1（0.13 刀 ①）：内核 op 只对 brep 池成立；别的 kind（mesh…）各有自己的 op 集，到时按 s.kindOf(ref.def) 在这里分叉，不改既有分支。
/** 门 1 的 mesh 那半：mesh op 只对网格体定义成立（定义不在 / 不是网格体 = 目标缺席，不是崩溃）。 */
export const meshOf = (s: Scene, def: number): MeshBody => {
  if (!s.defs.has(def)) throw new OpTargetError(`definition ${def}`);
  const kind = s.kindOf(def);
  if (kind !== "mesh") throw new OpTargetError(`definition ${def} is a ${kind} body: no mesh op applies`);
  return s.mesh(def);
};
/** 两种身体都认的池地址（导入这种只碰定义层、不碰内核的 op）：定义得在；组只有硬表面体有（有组 = 走原来的校验）。T90：以前导入走 poolOf，站在网格体里再导入 = 「no brep op applies」。 */
export const anyPoolOf = (s: Scene, at?: PoolRef): { ref: PoolRef } => {
  const ref: PoolRef = at ?? { def: s.root, group: null };
  if (!s.defs.has(ref.def)) throw new OpTargetError(`definition ${ref.def}`);
  return ref.group !== null ? { ref: poolOf(s, ref).ref } : { ref };
};
export const poolOf = (s: Scene, at?: PoolRef): { kernel: Kernel; ref: PoolRef } => {
  const ref = at ?? { def: s.root, group: null };
  if (!s.hasPool(ref)) throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"}`);
  const kind = s.kindOf(ref.def);
  if (kind !== "brep") throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"} is a ${kind} pool: no brep op applies`);
  const kernel = s.kernelOf(ref);
  kernel.faceLayers.backSlot = s.brep(ref.def).materialSlots.indexOf(BUILTIN_BACK_SLOT);   // 并面时两侧要认得默认背面（kernel/layers.ts mergeSides）
  return { kernel, ref };
};
/** 造面的路收尾：这批新面定两侧（kernel/face-sides.ts）。只有画线 / 推拉 / 跟随 / 挪点走这里；粘贴 / 导入 / 镜像带载荷自己的层（有意的两面都出不许被邻面改掉）。 */
function sideNewFaces(s: Scene, ref: PoolRef, kernel: Kernel, events: readonly FaceEvent[], o: { front?: Pt3; seed?: FaceId } = {}): void {
  const born = bornFaces(events);
  if (born.length) settleNewFaceSides(kernel, born, { back: s.brep(ref.def).materialSlots.indexOf(BUILTIN_BACK_SLOT), openBack: () => s.slotFor(ref.def, BUILTIN_BACK_SLOT), ...o });
}

/**
 * 组件换轴（user 2026-10-25「刚才失败的那个是有instanced的object我动轴，可能这里逻辑有点复杂，需要每个instance都移动」；Claude Opus 5.5）：
 * 新轴 f 用旧定义坐标给出；定义坐标改成「新轴下的坐标」= 定义里的几何 / 组的轴 / 参考几何 / 子实例全乘 M⁻¹（M = 帧 f 的矩阵：新坐标 → 旧坐标），
 * 每一份实例（场景里任何定义里放的）乘 M——世界里一点不动，只是组件的原点和朝向换了（SU Change Axes 同款）。只换原点时 M 是平移，几何只是平移。
 */
function changeDefinitionAxes(s: Scene, def: number, f: Frame): FaceEvent[] { return retransformDefinition(s, def, frameToXform(f)); }
/**
 * 定义换坐标（M：新坐标 → 旧坐标）：定义里的几何 / 组的轴 / 参考几何 / 子实例全乘 M⁻¹，每一份实例乘 M——世界里一点不动。
 * 换轴（M = 帧）和应用缩放（M = 缩放的逆，2026-10-26）共用。M 不是刚体时组的轴重新正交归一（轴只是朝向）。
 */
function retransformDefinition(s: Scene, def: number, M: Xform): FaceEvent[] {
  const Mi = invert(M), events: FaceEvent[] = [], rigid = isRigid(M), b = s.def(def).body;
  if (def === s.root) s.axes = rigid ? transformFrame(Mi, s.axes) : orthonormalFrame(transformFrame(Mi, s.axes));   // 根的坐标架住场景上：跟着内容一起换（世界里原地不动 = 对到它时正好回到原点）
  if (b.kind === "mesh") {   // 网格体（2026-10-27 Opus：自由建模右键「设置原点到选择中心」）：点的位置整体乘 M⁻¹；网格体没有组 / 参考几何 / 另摆的坐标架
    const k = b.kernel;
    for (const v of k.verts()) k.setPos(v, applyPt(Mi, k.pt(v)));
    for (const d of s.defs.values()) for (const inst of d.instances.values()) if (inst.def === def) inst.xform = compose(inst.xform, M);
    return events;
  }
  const body = s.brep(def);
  events.push(...body.kernel.transformAll((p) => applyPt(Mi, p)));
  transformGuides(body.guides, Mi);
  if (body.drawFrame) body.drawFrame = rigid ? transformFrame(Mi, body.drawFrame) : orthonormalFrame(transformFrame(Mi, body.drawFrame));   // 组件里另摆的坐标架在世界里原地不动（DT86）
  for (const g of body.groups.values()) { events.push(...g.kernel.transformAll((p) => applyPt(Mi, p))); g.axes = rigid ? transformFrame(Mi, g.axes) : orthonormalFrame(transformFrame(Mi, g.axes)); transformGuides(g.guides, Mi); }
  for (const inst of s.def(def).instances.values()) inst.xform = compose(Mi, inst.xform);
  for (const d of s.defs.values()) for (const inst of d.instances.values()) if (inst.def === def) inst.xform = compose(inst.xform, M);
  return events;
}
/** 帧的三轴重新正交归一（x 定向，y 去掉 x 分量，z = x × y）。 */
function orthonormalFrame(f: Frame): Frame {
  const x = normalize3(f.x), y = normalize3(sub3(f.y, scale3(x, dot3(f.y, x)))), z = { x: x.y * y.z - x.z * y.y, y: x.z * y.x - x.x * y.z, z: x.x * y.y - x.y * y.x };
  return { origin: f.origin, x, y, z };
}

/** 先解析全部目标再动内核：目标缺席在改动之前就抛，不留半改动（History 仍兜底回滚）。 */
/** 护栏拒绝（不是崩溃）：这一步会让组件斜切 → 整步撤回，提示行说原因（不弹错误胶囊、不要复现包）。 */
/** 规矩拒绝（不是崩溃）：commit 把 message 放进提示行，不弹错误胶囊。 */
export class OpRejected extends Error {}
export class ShearRejected extends OpRejected {}
/** 拍平结算出破面：算法没想到的情况（user「如果有，说明我们算法可能想错了」）→ 整步撤回、弹错误（要复现包）。 */
export class PlanarBurst extends Error {}
/** 会改组件实例矩阵、可能乘出斜切的指令（移动 / 旋转 / 等比缩放 / 镜像永远不会；非等比缩放转过的组件、炸开被非等比缩放过的组件会）。 */
const SHEAR_OPS: ReadonlySet<Op["op"]> = new Set(["transformInstance", "placeInstance", "explode", "copyGroup", "setAxes", "transformPool", "makeComponent", "applyScale", "importScene", "paste", "moveInstance"] as Op["op"][]);   // batch 里的每条各自过 applyOp，不用再查一遍
const shearedInstances = (s: Scene): Map<string, string> => {
  const out = new Map<string, string>();
  for (const d of s.defs.values()) for (const i of d.instances.values()) if (hasShear(i.xform)) out.set(`${d.id}/${i.id}`, s.def(i.def).name);
  return out;
};
/**
 * 执行一条指令。斜切护栏（2026-10-26，user「斜切：和gltf对齐……在发生的时候护栏住，然后提示报错」）：执行后出现了**新的**斜切实例 → 抛 ShearRejected
 * （History 回滚整步）。老文件里本来就斜切的不算（不然那份文件之后什么都改不了）。
 */
/** 网格体那一层的「建组件」只装组件（user 10-30「选择多个组件（没有几何）的时候应该也可以打包成一个新组件」）：选中的几份（这一层的直接孩子）搬进一个新组件，
 *  新组件的身体 = 空网格体（进去还是自由建模），原点 = 包围盒最小角（和硬表面那条同一个规矩，编辑器之后照样按马后炮换原点）。面做成组件走 separateObject。 */
function wrapInMesh(s: Scene, op: Extract<Op, { op: "makeComponent" }>): ApplyResult {
  if (op.faces.length || op.edges.length || op.groups?.length) throw new OpTargetError("mesh pool: makeComponent only wraps components (faces go through separateObject)");
  const d0 = s.def(op.at.def), slots = meshOf(s, op.at.def).materialSlots;
  const isel = (op.instances ?? []).map((id) => { const i = d0.instances.get(id); if (!i || i.parent !== op.at.group) throw new OpTargetError(`instance ${id}`); return i; });
  if (!isel.length) throw new OpTargetError("empty selection");
  const pts = isel.flatMap((i) => s.pointsOfDef(i.def, i.xform)), origin = pts.length ? bboxMin(pts) : { x: 0, y: 0, z: 0 };
  const T = translation({ x: -origin.x, y: -origin.y, z: -origin.z });
  const def = s.mintDef(op.name, new Kernel());
  def.body = { kind: "mesh", kernel: new MeshKernel(), materialSlots: [...slots], uvSetSlots: [] };
  for (const i of isel) {
    const ni = s.mintInstance(def.id, null, i.def, compose(T, i.xform), i.guid);   // 搬家保身份（ID-2）
    if (i.name !== undefined) ni.name = i.name;
    if (i.locked) ni.locked = true;
    if (i.layer !== undefined) ni.layer = i.layer;
    if (i.hidden) ni.hidden = true;
    d0.instances.delete(i.id);
  }
  s.mintInstance(op.at.def, op.at.group, def.id, translation(origin));
  return { scene: s, events: [] };
}

export function applyOp(s: Scene, op: Op): ApplyResult {
  if (!SHEAR_OPS.has(op.op)) return applyOpInner(s, op);
  const before = shearedInstances(s);
  const r = applyOpInner(s, op);
  for (const [key, name] of shearedInstances(r.scene)) if (!before.has(key)) throw new ShearRejected(`这一步会把组件「${name}」斜切（glTF 不允许组件斜切），已撤回。转过的组件请沿它自己的轴缩放（只选它一个时，变换手柄就是它自己的轴），或者进组件里改几何`);
  return r;
}
function applyOpInner(s: Scene, op: Op): ApplyResult {
  switch (op.op) {
    case "plugin": {
      const p = OP_PLUGINS.get(op.name);
      if (!p) throw new OpTargetError(`plugin op "${op.name}" is not loaded`);
      return p.apply(s, op.at, op.args);
    }
    case "clear": return { scene: new Scene(), events: [] };
    case "preset": {
      const k2 = new Kernel();
      const preset = PRESETS.find((p) => p.name === op.name);
      return { scene: new Scene(k2), events: preset ? applyPreset(k2, preset).flat() : [] };
    }
    case "addEdges": {
      const { kernel, ref } = poolOf(s, op.at);
      const events = kernel.addEdges(op.segs, op.curve ? { curve: op.curve } : undefined);
      sideNewFaces(s, ref, kernel, events, op.front ? { front: op.front } : {});
      if (op.harden) {
        const segs = op.segs.map(([a, b]) => ({ a: { x: a.x, y: a.y, z: a.z ?? 0 }, b: { x: b.x, y: b.y, z: b.z ?? 0 } }));
        const ids = edgesAlongSegs(kernel.graph, segs, (pa, pb, a, b) => pointOnSegment3(pa, a, b, INSERT_TOL) && pointOnSegment3(pb, a, b, INSERT_TOL)).filter((e) => kernel.isSoft(e) || kernel.isSmooth(e));
        if (ids.length) { kernel.setEdgeLayer("soft", ids, false); kernel.setEdgeLayer("smooth", ids, false); }
      }
      return { scene: s, events };
    }
    case "weldEdges": { const { kernel } = poolOf(s, op.at); return { scene: s, events: kernel.weldEdges(op.edges.map((e) => resolveEdge(kernel, e))) }; }
    case "dissolveVertices": { const { kernel } = poolOf(s, op.at); kernel.dissolveVertices(op.points.map((q) => resolveVertex(kernel, q))); return { scene: s, events: [] }; }
    case "batch": { let sc = s; const events: FaceEvent[] = []; for (const o of op.ops) { const r = applyOp(sc, o); sc = r.scene; events.push(...r.events); } return { scene: sc, events }; }
    case "explodeCurves": { const { kernel } = poolOf(s, op.at); const ids = new Set<number>(); for (const e of op.edges) { const cid = kernel.curveOf(resolveEdge(kernel, e)); if (cid !== undefined) ids.add(cid); } return { scene: s, events: kernel.explodeCurves([...ids]) }; }
    case "eraseEdges": { const { kernel } = poolOf(s, op.at); const ids = op.edges.map((e) => resolveEdge(kernel, e)); return { scene: s, events: kernel.eraseEdges(ids) }; }
    case "eraseFaces": { const { kernel } = poolOf(s, op.at); const ids = op.faces.map((f) => resolveFace(kernel, f)); return { scene: s, events: kernel.eraseFaces(ids) }; }
    case "eraseSelection": {
      const { kernel } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      const eids = op.edges.map((e) => resolveEdge(kernel, e));
      return { scene: s, events: [...kernel.eraseFaces(fids), ...kernel.eraseEdges(eids)] };
    }
    case "move": {
      const { kernel, ref } = poolOf(s, op.at);
      const moves = op.moves.map((m) => ({ id: resolveVertex(kernel, m.from), to: m.to }));
      if (op.mirror) {
        const moved = new Set(moves.map((m) => m.id));
        for (const f of kernel.faces()) if ([f.outer, ...f.holes].every((r) => r.vids.every((v) => moved.has(v)))) kernel.faceLayers.swapSides(f.id);
      }
      const events = kernel.moveVertices(moves, op.creaseLayers ? { creaseLayers: op.creaseLayers } : undefined);
      sideNewFaces(s, ref, kernel, events);
      return { scene: s, events };
    }
    case "pushpull": { const { kernel, ref } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face), events = kernel.pushPull(fid, op.dist, op.keepRing || op.settleLanding === false ? { ...(op.keepRing ? { keepRing: true } : {}), ...(op.settleLanding === false ? { settleLanding: false } : {}) } : undefined); sideNewFaces(s, ref, kernel, events, op.front ? { front: op.front, seed: fid } : {}); return { scene: s, events }; }
    case "followme": { const { kernel, ref } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face), events = kernel.followMe(fid, op.path, { closed: op.closed, smoothJoints: op.smoothJoints }); sideNewFaces(s, ref, kernel, events); return { scene: s, events }; }
    case "absorb": {
      const { kernel } = poolOf(s, op.at);
      const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {};
      for (const [n, segs] of Object.entries(op.edgeSegs ?? {})) edgeSegs[n] = segs.map(([a, b]) => ({ a, b }));
      return { scene: s, events: kernel.absorb(op.faces, op.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: op.faceLayers }) };
    }
    case "makeGroup":
    case "makeComponent": {
      if (op.op === "makeComponent" && s.kindOf(op.at.def) === "mesh") return wrapInMesh(s, op);   // 网格体那一层：只装组件（组只住硬表面体里）
      const { kernel, ref } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      const eids = op.edges.map((e) => resolveEdge(kernel, e));
      const snap = extractSnapshot(kernel, fids, eids);
      // 一起装进去的子组（连同它下面的子组 / 子实例）和组件实例：必须是这一层（父 = 活动池）的直接孩子（2026-10-26 嵌套）
      const d0 = s.def(ref.def), b0 = s.brep(ref.def);
      const gsel = (op.groups ?? []).map((id) => { const g = b0.groups.get(id); if (!g || g.parent !== ref.group) throw new OpTargetError(`group ${id}`); return g; });
      const isel = (op.instances ?? []).map((id) => { const i = d0.instances.get(id); if (!i || i.parent !== ref.group) throw new OpTargetError(`instance ${id}`); return i; });
      if (!snap.vertices.length && !gsel.length && !isel.length) throw new OpTargetError("empty selection");
      const sub = new Set<number>(gsel.map((g) => g.id));
      for (let grew = true; grew;) { grew = false; for (const g of b0.groups.values()) if (g.parent !== null && sub.has(g.parent) && !sub.has(g.id)) { sub.add(g.id); grew = true; } }
      const subInst = [...d0.instances.values()].filter((i) => i.parent !== null && sub.has(i.parent));
      // 新容器的原点 = 全部内容（散几何 + 组 + 实例里的一切）的包围盒最小角
      const pts: Pt3[] = [...snap.vertices];
      for (const gid of sub) for (const v of b0.groups.get(gid)!.kernel.vertices()) pts.push(v);
      for (const i of [...isel, ...subInst]) pts.push(...s.pointsOfDef(i.def, i.xform));
      const origin = bboxMin(pts);
      // 源池：删膜；搬走的边（选中的 + 搬走膜的环边）若已无膜引用才删——与别的膜共享的边留下（SU 同款：边在两边各有一份）
      const events = kernel.eraseFaces(fids);
      const has = snapEdgeSet(snap);
      const orphans = kernel.edges().filter((e) => e.faceLinks.length === 0 && has(kernel.graph.pt(e.a), kernel.graph.pt(e.b))).map((e) => e.id);
      if (orphans.length) events.push(...kernel.eraseEdges(orphans));
      if (op.op === "makeGroup") {   // 同一个定义里：子组 / 实例只改挂到新组下面（坐标本来就是定义坐标）
        const ng = s.mintGroup(ref.def, ref.group, snap.vertices.length ? Kernel.fromBrep(snap) : new Kernel(), frameAt(origin));
        for (const g of gsel) g.parent = ng.id;
        for (const i of isel) i.parent = ng.id;
        return { scene: s, events };
      }
      const T = translation({ x: -origin.x, y: -origin.y, z: -origin.z });
      const def = s.mintDef(op.name, snap.vertices.length ? Kernel.fromBrep(transformSnapshot(snap, T)) : new Kernel());
      s.brep(def.id).materialSlots = [...b0.materialSlots];   // 槽号沿用（同一张槽表拷一份；面上的槽号不用改）
      // 搬子组（子树、父子关系照旧，选中的那几个挂到新定义的根）+ 搬实例；坐标平移到新定义（原点 = 0）
      const gmap = new Map<number, number>();
      for (const gid of [...sub].sort((a, b) => a - b)) {
        const g = b0.groups.get(gid)!, guides = cloneGuides(g.guides);
        transformGuides(guides, T);
        const ng = s.mintGroup(def.id, null, Kernel.fromBrep(transformSnapshot(g.kernel.toBrep(), T)), transformFrame(T, g.axes), g.guid);   // 搬家保身份（ID-2）
        ng.guides = guides; if (g.name !== undefined) ng.name = g.name;
        gmap.set(gid, ng.id);
      }
      for (const gid of sub) { const g = b0.groups.get(gid)!; if (g.parent !== null && sub.has(g.parent)) s.group({ def: def.id, group: gmap.get(gid)! }).parent = gmap.get(g.parent)!; }
      for (const i of [...isel, ...subInst]) {
        const ni = s.mintInstance(def.id, i.parent !== null && sub.has(i.parent) ? gmap.get(i.parent)! : null, i.def, compose(T, i.xform), i.guid);   // 搬家保身份（ID-2）
        if (i.name !== undefined) ni.name = i.name;
        if (i.locked) ni.locked = true;
        if (i.layer !== undefined) ni.layer = i.layer;
        if (i.hidden) ni.hidden = true;
        d0.instances.delete(i.id);
      }
      for (const gid of sub) b0.groups.delete(gid);
      s.mintInstance(ref.def, ref.group, def.id, translation(origin));
      return { scene: s, events };
    }
    case "mergeObject": {
      const host = s.def(op.at.def), T = host.instances.get(op.target), src = host.instances.get(op.source);
      if (!T || T.parent !== op.at.group) throw new OpTargetError(`instance ${op.target}`);
      if (!src || src.parent !== op.at.group) throw new OpTargetError(`instance ${op.source}`);
      if (op.target === op.source) throw new OpTargetError("mergeObject: target = source");
      if (s.references(src.def, T.def)) throw new OpTargetError("mergeObject: would create a cycle (merging an object into itself)");
      refusePaintMove(s, { def: src.def });   // 带着画的面现在还搬不了（1-3b 第六节）
      const fresh = s.mintInstance(T.def, null, src.def, compose(invert(T.xform), src.xform));
      if (src.name !== undefined) fresh.name = src.name;
      explodeInstance(s, { def: T.def, group: null }, fresh, !!op.cast);
      host.instances.delete(op.source);
      return { scene: s, events: [] };
    }
    case "explode": {
      // 炸开实例：先看「外面一层」和「选中的那个组件」各是什么身体（2026-10-28 夜：以前只看外面一层，网格体组件炸进硬表面层 → 拿网格体当硬表面体用、抛内部错误）
      if (op.instance !== undefined) {
        const host = s.def(op.at.def), inst = host.instances.get(op.instance);
        if (!inst || inst.parent !== op.at.group) throw new OpTargetError(`instance ${op.instance}`);
        refusePaintMove(s, { def: inst.def });   // 炸开网格体组件：它的面会并进外面那一层（1-3b，统筹 11-10 同意进同一个拒绝函数）
        if (s.kindOf(op.at.def) !== s.kindOf(inst.def) || s.kindOf(op.at.def) === "mesh") { explodeInstance(s, op.at, inst, !!op.cast); return { scene: s, events: [] }; }
      }
      const { kernel, ref } = poolOf(s, op.at);
      const d = s.def(ref.def), db = s.brep(ref.def);
      if (op.group !== undefined) {
        const g = db.groups.get(op.group);
        if (!g || g.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
        absorbSnapshot(kernel, g.kernel.toBrep());
        for (const cg of db.groups.values()) if (cg.parent === g.id) cg.parent = ref.group;
        for (const ci of d.instances.values()) if (ci.parent === g.id) ci.parent = ref.group;
        db.groups.delete(g.id);
        return { scene: s, events: [] };
      }
      if (op.instance !== undefined) {
        const inst = d.instances.get(op.instance);
        if (!inst || inst.parent !== ref.group) throw new OpTargetError(`instance ${op.instance}`);
        const src = s.def(inst.def), srcB = s.brep(inst.def);
        const remap = (slot: number): number => { const mat = srcB.materialSlots[slot]; return mat === undefined ? -1 : s.slotFor(ref.def, mat); };
        absorbSnapshot(kernel, srcB.kernel.toBrep(), inst.xform, remap);
        // 定义里的子 group / 子实例 → 复制成父池下的 group / 实例（经实例变换）
        const gmap = new Map<number, number>();
        for (const sg of srcB.groups.values()) {
          const gk = Kernel.fromBrep(remapSnapshotMaterial(transformSnapshot(sg.kernel.toBrep(), inst.xform), remap));
          const ng = s.mintGroup(ref.def, ref.group, gk, transformFrame(inst.xform, sg.axes));
          gmap.set(sg.id, ng.id);
        }
        for (const sg of srcB.groups.values()) if (sg.parent !== null) s.group({ def: ref.def, group: gmap.get(sg.id)! }).parent = gmap.get(sg.parent) ?? ref.group;
        for (const si of src.instances.values()) s.mintInstance(ref.def, si.parent === null ? ref.group : (gmap.get(si.parent) ?? ref.group), si.def, compose(inst.xform, si.xform));
        d.instances.delete(inst.id);   // 定义照留：一份都没摆了也不删（孤儿森林 UX26；user 10-30「为什么删实例会有删组件定义的风险？这个风险就不应该有」）
        return { scene: s, events: [] };
      }
      throw new OpTargetError("explode: nothing named");
    }
    case "transformPool": {
      const { kernel, ref } = poolOf(s, op.at);
      const events = kernel.transformAll((p) => applyPt(op.xform, p));
      if (ref.group !== null) { const g = s.group({ def: ref.def, group: ref.group }); g.axes = transformFrame(op.xform, g.axes); }
      transformGuides(s.guidesOf(ref), op.xform);   // 参考几何跟着池走
      return { scene: s, events };
    }
    case "transformInstance": {
      const inst = s.instance(op.def, op.instance);
      inst.xform = compose(op.xform, inst.xform);
      return { scene: s, events: [] };
    }
    case "placeInstance": {
      const { ref } = poolOf(s, op.at);
      if (!s.defs.has(op.definition)) throw new OpTargetError(`definition ${op.definition}`);
      if (s.references(op.definition, ref.def)) throw new OpTargetError("placeInstance: would create a cycle");
      s.mintInstance(ref.def, ref.group, op.definition, op.xform);
      return { scene: s, events: [] };
    }
    case "importScene": {
      const { ref } = anyPoolOf(s, op.at);   // 网格体里也能导入（定义层挂实例，不碰内核）
      buildImport(s, ref, op.scene, op.place);
      return { scene: s, events: [] };
    }
    case "copyGroup": {
      const { ref } = poolOf(s, op.at);
      const d = s.def(ref.def), db = s.brep(ref.def);
      const src = db.groups.get(op.group);
      if (!src || src.parent !== ref.group) throw new OpTargetError(`group ${op.group}`);
      const gmap = new Map<number, number>();
      const desc = new Set<number>([src.id]);
      let grew = true;
      while (grew) { grew = false; for (const g of db.groups.values()) if (g.parent !== null && desc.has(g.parent) && !desc.has(g.id)) { desc.add(g.id); grew = true; } }
      for (const gid of desc) {
        const g = db.groups.get(gid)!;
        const ng = s.mintGroup(ref.def, ref.group, Kernel.fromBrep(transformSnapshot(g.kernel.toBrep(), op.xform)), transformFrame(op.xform, g.axes));
        ng.guides = cloneGuides(g.guides); transformGuides(ng.guides, op.xform);
        gmap.set(gid, ng.id);
      }
      for (const gid of desc) { const g = db.groups.get(gid)!; if (g.parent !== null && gmap.has(g.parent)) s.group({ def: ref.def, group: gmap.get(gid)! }).parent = gmap.get(g.parent)!; }
      for (const inst of [...d.instances.values()]) if (inst.parent !== null && desc.has(inst.parent)) s.mintInstance(ref.def, gmap.get(inst.parent)!, inst.def, compose(op.xform, inst.xform));
      return { scene: s, events: [] };
    }
    case "addGuide": {
      const { ref } = poolOf(s, op.at);
      const G = s.guidesOf(ref);
      if (op.line) addGuideLine(G, op.line.p, op.line.dir);
      if (op.point) addGuidePoint(G, op.point);
      if (op.circle) addGuideCircle(G, op.circle.c, op.circle.n, op.circle.r);
      if (op.sphere) addGuideSphere(G, op.sphere.c, op.sphere.r);
      return { scene: s, events: [] };
    }
    case "eraseGuides": { const { ref } = poolOf(s, op.at); eraseGuides(s.guidesOf(ref), new Set(op.ids)); return { scene: s, events: [] }; }
    case "clearGuides": { const { ref } = poolOf(s, op.at); const G = s.guidesOf(ref); G.lines = []; G.points = []; G.circles = []; G.spheres = []; return { scene: s, events: [] }; }
    case "applyScale": {
      const inst = s.def(op.def).instances.get(op.instance);
      if (!inst) throw new OpTargetError(`instance ${op.instance}`);
      if (s.kindOf(inst.def) !== "brep") throw new OpTargetError(`definition ${inst.def} is not brep`);
      if (hasShear(inst.xform)) throw new ShearRejected("这一份已经是斜切的（老文件里带来的），拆不出缩放；先把它炸开或重新做成组件");
      const X = inst.xform, sc = [0, 1, 2].map((j) => Math.hypot(X[j], X[4 + j], X[8 + j]));
      if (det3(X) < 0) sc[0] = -sc[0];   // 镜像也烘进几何（这一份变成纯旋转）
      if (sc.every((v) => Math.abs(v - 1) < 1e-12)) return { scene: s, events: [] };
      return { scene: s, events: retransformDefinition(s, inst.def, invert(scalingAbout({ x: 0, y: 0, z: 0 }, { x: sc[0], y: sc[1], z: sc[2] }))) };
    }
    case "setDrawFrame": {
      const { ref } = poolOf(s, op.at);
      const f: Frame | null = op.frame ? { origin: { ...op.frame.origin }, x: { ...op.frame.x }, y: { ...op.frame.y }, z: { ...op.frame.z } } : null;
      const body = s.brep(ref.def);
      if (ref.group !== null) {
        const g = s.group({ def: ref.def, group: ref.group });
        g.axes = f ?? (g.parent !== null ? s.group({ def: ref.def, group: g.parent }).axes : ref.def === s.root ? s.axes : body.drawFrame ?? WORLD_FRAME);
      } else if (ref.def === s.root) s.axes = f ?? WORLD_FRAME;
      else if (f) body.drawFrame = f;
      else delete body.drawFrame;
      return { scene: s, events: [] };
    }
    case "setAxes": {
      const f: Frame = { origin: { ...op.frame.origin }, x: { ...op.frame.x }, y: { ...op.frame.y }, z: { ...op.frame.z } };
      // 落在定义根上 = 换这个组件的原点（网格体也一样；根也一样——根 = 普通组件，user 10-30「我说了root和其他的尽量一视同仁」：根没有外层实例补偿 = 内容整个挪过去，坐标架那一点落到世界原点，编辑器让视角跟着平移）
      if (op.at.group === null && s.defs.has(op.at.def) && (op.at.def === s.root || s.kindOf(op.at.def) === "mesh")) return { scene: s, events: changeDefinitionAxes(s, op.at.def, f) };
      const { ref } = poolOf(s, op.at);
      if (ref.group !== null) s.group({ def: ref.def, group: ref.group }).axes = f;
      else return { scene: s, events: changeDefinitionAxes(s, ref.def, f) };
      return { scene: s, events: [] };
    }
    case "mirror": {
      const { kernel, ref } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      const eids = op.edges.map((e) => resolveEdge(kernel, e));
      const d = s.def(ref.def);
      const insts = (op.instances ?? []).map((id) => { const inst = d.instances.get(id); if (!inst || inst.parent !== ref.group) throw new OpTargetError(`instance ${id}`); return inst; });
      let events: FaceEvent[] = [];
      try { if (fids.length || eids.length) events = mirrorGeometry(kernel, fids, eids, op.plane, { deleteOpposite: op.deleteOpposite, mergeSeam: op.mergeSeam, weld: op.weld, ...(op.guard !== undefined ? { guard: op.guard } : {}) }); }
      catch (e) { if (e instanceof MirrorRejected) throw new OpTargetError(e.message); throw e; }
      // 组件 = 负变换（user「组件也是选单里面选。就是负transform嘛」）：原点在留下这侧 → 镜一份过去；在对面且删对面 → 删；正好在镜像面上 → 不动
      const R = reflectionXform(op.plane), n = normalize3(op.plane.normal);
      for (const inst of insts) {
        const sgn = dot3(sub3(applyPt(inst.xform, { x: 0, y: 0, z: 0 }), op.plane.origin), n);
        if (sgn > 1e-6) s.mintInstance(ref.def, ref.group, inst.def, compose(R, inst.xform));
        else if (sgn < -1e-6 && op.deleteOpposite) d.instances.delete(inst.id);
      }
      return { scene: s, events };
    }
    case "addMaterial": {
      if ("texture" in op) throw new OpTargetError("addMaterial: 旧形状（材质里直接装着图，v0.19.3 及以前的复现包）——图现在先 addTexture、材质用 channels 指它；这一条重放不了");
      for (const g of Object.values(op.channels ?? {}).flat()) if (!s.textures.has(g)) throw new OpTargetError(`addMaterial: texture ${g}`);
      s.addMaterial({ name: op.name, color: [op.color[0], op.color[1], op.color[2]], ...(op.channels && Object.keys(op.channels).length ? { channels: Object.fromEntries(Object.entries(op.channels).map(([k, v]) => [k, [...v]])) } : {}) });
      return { scene: s, events: [] };
    }
    case "addTexture": {
      if (s.texturesFrozen) throw new OpRejected(TEXTURES_FROZEN);
      if (s.textures.has(op.guid)) throw new OpTargetError(`addTexture: texture ${op.guid} already exists`);
      assertSizedImage({ bytes: op.bytes, sizeM: op.sizeM }, "addTexture");
      s.addTexture({ guid: op.guid, name: op.name, value: COLOR_VALUE, content: { kind: "image", mimeType: op.mimeType, bytes: op.bytes }, sizeM: [op.sizeM[0], op.sizeM[1]] });
      return { scene: s, events: [] };
    }
    case "addTiledPaint": {
      if (s.texturesFrozen) throw new OpRejected(TEXTURES_FROZEN);
      if (s.textures.has(op.textureGuid)) throw new OpTargetError(`addTiledPaint: texture ${op.textureGuid} already exists`);
      if (s.materials.some((m) => m.guid === op.materialGuid)) throw new OpTargetError(`addTiledPaint: material ${op.materialGuid} already exists`);
      if (!(op.ora instanceof Uint8Array) || !op.ora.length) throw new Error("addTiledPaint: a tiled paint is born with (blank) layered bytes; got none");
      if (!(op.sizeM.length === 2 && op.sizeM.every((v) => Number.isFinite(v) && v > 0))) throw new Error(`addTiledPaint: sizeM must be two numbers > 0 (got ${op.sizeM.join(", ")})`);
      s.addTexture({ guid: op.textureGuid, name: op.name, value: COLOR_VALUE, content: { kind: "layered", ora: op.ora }, sizeM: [op.sizeM[0], op.sizeM[1]] });
      s.addMaterial({ guid: op.materialGuid, name: op.name, color: [op.color[0], op.color[1], op.color[2]], channels: { [COLOR_CHANNEL]: [op.textureGuid] } });
      return { scene: s, events: [] };
    }
    case "setFreed": return paintOutcome(s, applySetFreed(s, op));
    case "purgeTextures": {
      if (s.texturesFrozen) throw new OpRejected(TEXTURES_FROZEN);
      if (s.shelfFrozen) throw new OpRejected(SHELF_FROZEN_PURGE);
      const pointed = new Set(s.materials.flatMap((m) => Object.values(m.channels ?? {}).flat())), shelved = new Set(s.shelf.items.map((it) => it.ref));
      for (const g of op.textures) { const t = s.textures.get(g); if (!t) throw new OpTargetError(`purgeTextures: texture ${g}`); if (pointed.has(g) || shelved.has(g)) throw new OpTargetError(`purgeTextures: 「${t.name}」还有人用`); }
      for (const g of op.textures) s.textures.delete(g);   // purgeTextures：全家唯一删贴图的地方（守卫只放过这一行）
      return { scene: s, events: [] };
    }
    case "setEdgeLayers": {
      const { kernel } = poolOf(s, op.at);
      const ids = op.edges.map((e) => resolveEdge(kernel, e));
      for (const n of op.layers) kernel.setEdgeLayer(n, ids, op.on);
      return { scene: s, events: [] };
    }
    case "paintFaces": {
      const { kernel, ref } = poolOf(s, op.at);
      const fids = op.faces.map((f) => resolveFace(kernel, f));
      if (op.material !== null && op.material !== BUILTIN_BACK_SLOT && !(op.material in s.materials)) throw new OpTargetError(`material ${op.material}`);
      if (op.material !== null && op.material !== BUILTIN_BACK_SLOT && paintIn(s.textures, s.materials[op.material])) throw new OpRejected(PAINT_ONLY_MESH);   // 画只能给网格体自己的面（1-3b）
      kernel.setFaceMaterial(fids, op.material === null ? null : s.slotFor(ref.def, op.material), op.sides);
      return { scene: s, events: [] };
    }
    case "flipFaceSides": { const { kernel } = poolOf(s, op.at); kernel.flipFaceSides(op.faces.map((f) => resolveFace(kernel, f))); return { scene: s, events: [] }; }
    case "purgeDefs": {
      if (s.shelfFrozen) throw new OpRejected(SHELF_FROZEN_PURGE);
      const live = liveDefs(s);
      for (const id of op.defs) { if (!s.defs.has(id)) throw new OpTargetError(`purgeDefs: definition ${id}`); if (live.has(id)) throw new OpTargetError(`purgeDefs: 「${s.def(id).name}」还摆在模型里或收在素材架上，不是孤儿`); }
      for (const id of op.defs) s.defs.delete(id);   // purgeDefs：全家唯一删定义的地方（守卫只放过这一行）
      return { scene: s, events: [] };
    }
    case "purgeMaterials": {
      if (s.shelfFrozen) throw new OpRejected(SHELF_FROZEN_PURGE);
      const use = materialUse(s), kill = new Set(op.materials);
      for (const i of kill) { const m = s.materials[i]; if (!m) throw new OpTargetError(`purgeMaterials: material ${i}`); if (use[i].faces || use[i].orphanFaces || use[i].shelved) throw new OpTargetError(`purgeMaterials: 「${m.name}」还有人用`); }
      const next: number[] = [];   // 旧下标 → 新下标（−1 = 被删）
      let n = 0;
      for (let i = 0; i < s.materials.length; i++) next.push(kill.has(i) ? -1 : n++);
      for (const d of s.defs.values()) d.body.materialSlots = d.body.materialSlots.map((m) => (m >= 0 ? (next[m] ?? -1) : m));   // 面上的槽号是代号、不动；槽表这一列同一步对上（家规）。负的（内置默认背面 −2 / 悬空 −1）不是下标，原样留
      for (const i of [...kill].sort((a, b) => b - a)) s.materials.splice(i, 1);   // purgeMaterials：全家唯一删材质的地方（守卫只放过这一行）
      return { scene: s, events: [] };
    }
    case "moveInstance": {
      const from = s.defs.get(op.from.def), inst = from?.instances.get(op.from.inst), into = s.defs.get(op.into.def);
      if (!from || !inst) throw new OpTargetError(`instance ${op.from.inst}`);
      if (!into) throw new OpTargetError(`definition ${op.into.def}`);
      if (op.into.parent !== null && (into.body.kind !== "brep" || !into.body.groups.has(op.into.parent))) throw new OpTargetError(`moveInstance: group ${op.into.parent}`);
      if (from === into) {
        inst.parent = op.into.parent;
        if (op.xform) inst.xform = op.xform;
        placeAmongSiblings(into, inst.id, op.index);
        return { scene: s, events: [] };
      }
      if (s.references(inst.def, into.id)) throw new OpTargetError("moveInstance: would create a cycle (moving an object into itself)");
      from.instances.delete(inst.id);
      const moved: Instance = { ...inst, id: into.nextInst++, parent: op.into.parent, xform: op.xform ?? inst.xform };   // 同一个条目（guid / 名字 / 锁 / 层 / 藏都跟着），句柄归新定义
      into.instances.set(moved.id, moved);
      placeAmongSiblings(into, moved.id, op.index);
      return { scene: s, events: [] };
    }
    case "eraseInstance": {
      const d = s.def(op.def);
      if (!d.instances.delete(op.instance)) throw new OpTargetError(`instance ${op.instance}`);
      return { scene: s, events: [] };
    }
    case "rename": {
      if (op.instance !== undefined) {
        const inst = s.def(op.at.def).instances.get(op.instance);
        if (!inst || inst.parent !== op.at.group) throw new OpTargetError(`instance ${op.instance}`);
        if (op.name) inst.name = op.name; else delete inst.name;
        return { scene: s, events: [] };
      }
      if (op.def !== undefined) { if (!op.name) throw new OpTargetError("rename: 组件名不能空（没起名 = 四位码）"); s.def(op.def).name = op.name; return { scene: s, events: [] }; }
      throw new OpTargetError("rename: no target");
    }
    case "setLocked": {
      if (op.group !== undefined) throw new OpTargetError("group lock: 组不是物件，不能锁（0.14）；要当参考就做成组件再锁");
      const d = s.def(op.at.def);
      if (op.instance !== undefined) {
        const inst = d.instances.get(op.instance);
        if (!inst || inst.parent !== op.at.group) throw new OpTargetError(`instance ${op.instance}`);
        if (op.on) inst.locked = true; else delete inst.locked;
        return { scene: s, events: [] };
      }
      throw new OpTargetError("setLocked: no target");
    }
    case "setHidden": {
      if (op.instance !== undefined) {
        const inst = s.def(op.at.def).instances.get(op.instance);
        if (!inst || inst.parent !== op.at.group) throw new OpTargetError(`instance ${op.instance}`);
        if (op.on) inst.hidden = true; else delete inst.hidden;
      }
      if (op.faces?.length || op.edges?.length) {
        const { kernel } = poolOf(s, op.at);
        if (op.faces?.length) kernel.setFaceHidden(op.faces.map((f) => resolveFace(kernel, f)), op.on);
        if (op.edges?.length) kernel.setEdgeLayer("hidden", op.edges.map((e) => resolveEdge(kernel, e)), op.on);
      }
      return { scene: s, events: [] };
    }
    case "unhideAll": {
      for (const d of s.defs.values()) {
        for (const inst of d.instances.values()) delete inst.hidden;
        if (d.body.kind !== "brep") continue;
        for (const k of [d.body.kernel, ...[...d.body.groups.values()].map((g) => g.kernel)]) {
          const fs = k.faces().filter((f) => k.isFaceHidden(f.id)).map((f) => f.id), es = k.edges().filter((e) => k.isEdgeHidden(e.id)).map((e) => e.id);
          if (fs.length) k.setFaceHidden(fs, false);
          if (es.length) k.setEdgeLayer("hidden", es, false);
        }
      }
      return { scene: s, events: [] };
    }
    case "meshMove": { moveVerts(meshOf(s, op.def).kernel, op.moves); return { scene: s, events: [] }; }
    case "meshAddPrimitive": { addPrimitive(meshOf(s, op.def).kernel, op.kind, op.frame, op.size, op.segments); return { scene: s, events: [] }; }
    case "meshInset": { insetFaces(meshOf(s, op.def).kernel, op.faces, op.dist); return { scene: s, events: [] }; }
    case "meshBevel": {
      if (!(op.width > 0) || !(op.segments >= 1 && op.segments <= 64)) throw new OpTargetError(`bevel width ${op.width} segments ${op.segments}`);
      if (!bevelEdges(meshOf(s, op.def).kernel, op.edges, op.width, Math.round(op.segments)).faces.length) throw new OpTargetError("bevel: none of the edges can be beveled");
      return { scene: s, events: [] };
    }
    case "meshBevelVerts": {
      if (!(op.width > 0)) throw new OpTargetError(`bevel width ${op.width}`);
      if (!bevelVerts(meshOf(s, op.def).kernel, op.verts, op.width).faces.length) throw new OpTargetError("bevel: none of the vertices can be beveled");
      return { scene: s, events: [] };
    }
    case "meshSubdivide": {
      if (!(op.levels >= 1 && op.levels <= 4)) throw new OpTargetError(`subdivide levels ${op.levels}`);
      const k = meshOf(s, op.def).kernel;
      if (looseBits(k)) throw new OpTargetError("subdivide: loose edges or vertices");
      subdivide(k, Math.round(op.levels));
      return { scene: s, events: [] };
    }
    case "setMeshMirror": {
      if (!s.defs.has(op.def) || s.kindOf(op.def) !== "mesh") throw new OpTargetError(`setMeshMirror: definition ${op.def} is not a mesh`);
      if (op.mirror) s.meshMirrors.set(op.def, { mode: op.mirror.mode, axis: op.mirror.axis }); else s.meshMirrors.delete(op.def);
      return { scene: s, events: [] };
    }
    case "meshSymmetrize": {
      try { symmetrize(meshOf(s, op.def).kernel, op.axis, op.side); }   // 先沿镜像面切开再对称；劈不开的凹面 = 拒
      catch (err) { throw new OpTargetError(err instanceof Error ? err.message : String(err)); }
      return { scene: s, events: [] };
    }
    case "meshMerge": { if (op.verts.length < 2) throw new OpTargetError(`merge needs 2+ verts, got ${op.verts.length}`); const k = meshOf(s, op.def).kernel; for (const v of op.verts) if (!k.hasV(v)) throw new OpTargetError(`vertex ${v}`); const ids = [...op.verts]; if (op.split) { if (!k.hasE(op.split.edge)) throw new OpTargetError(`edge ${op.split.edge}`); ids.push(splitEdge(k, op.split.edge, op.split.t)); } mergeVerts(k, ids, op.to ?? "center"); return { scene: s, events: [] }; }
    case "meshSymmetrySnap": { if (!(op.tol > 0)) throw new OpTargetError(`symmetry snap tol ${op.tol}`); snapToSymmetry(meshOf(s, op.def).kernel, op.verts, op.axis, op.tol, op.mode); return { scene: s, events: [] }; }
    case "meshEdgeMarks": { const k = meshOf(s, op.def).kernel; for (const e of op.edges) if (!k.hasE(e)) throw new OpTargetError(`edge ${e}`); markEdges(k, op.edges, op.mark); return { scene: s, events: [] }; }
    case "meshSmoothDefault": { if (!(op.deg > 0 && op.deg < 180)) throw new OpTargetError(`smooth default angle ${op.deg}`); meshOf(s, op.def).kernel.setSmoothDefault({ mode: op.mode, deg: op.deg }); return { scene: s, events: [] }; }
    case "meshDelete": { deleteSelection(meshOf(s, op.def).kernel, op, !!op.dissolve); return { scene: s, events: [] }; }
    case "meshDuplicate": { duplicateGeometry(meshOf(s, op.def).kernel, op); return { scene: s, events: [] }; }
    case "meshFill": { const r = fillOrBridge(meshOf(s, op.def).kernel, op); if (typeof r === "string") throw new OpTargetError(r); return { scene: s, events: [] }; }
    case "meshFlip": { const k = meshOf(s, op.def).kernel; flipFaces(k, op.faces.filter((f) => k.hasF(f))); return { scene: s, events: [] }; }
    case "startPaint": { if (s.texturesFrozen) throw new OpRejected(TEXTURES_FROZEN); return paintOutcome(s, applyStartPaint(s, op)); }   // 画的三条指令住 paint-ops.ts（1-3b）
    case "meshPaintFaces": return paintOutcome(s, applyMeshPaintFaces(s, op));
    case "meshLayoutPaint": return paintOutcome(s, applyMeshLayoutPaint(s, op));
    case "paste": {
      const ref = op.at, kind = s.kindOf(ref.def);   // 两种身体都接：别走 poolOf（它只认硬表面池）
      if (!s.hasPool(ref)) throw new OpTargetError(`paste: pool ${ref.def}/${ref.group ?? "root"}`);
      const pp = planPaste(s, op, op.merge ?? KEEP), blocked = pasteBlocked(s, pp, ref.def);
      refusePaintMove(s, { payload: { materials: op.materials, textures: op.textures, faceMats: op.mesh?.faces.map((f) => f.mat), ...pastePaintScope(s, pp) } });   // 粘贴带着画（散面走画 / 新建或更新的定义带着画 / 换掉带贴图坐标的身体）= 拒（1-3b + 审后补）
      if (blocked) throw new OpRejected(blocked);
      if (s.texturesFrozen && [...pp.plan.create, ...pp.plan.update].some((r) => r.kind === TEXTURE)) throw new OpRejected(TEXTURES_FROZEN);
      const merged = landPayload(s, pp, op.materials);
      for (const it of op.shelve ?? []) applyShelfOp(s, { op: "shelfPut", kind: "definition", ref: merged.defGuid(it.ref), folder: null, guid: it.guid });
      for (const i of op.instances ?? []) {
        const d = merged.defOf(i);
        if (d === undefined) throw new OpTargetError(`paste: definition ${i.def} no longer exists`);
        if (s.references(d, ref.def)) throw new OpTargetError("paste: would create a cycle (pasting an object into itself)");
      }
      let events: FaceEvent[] = [];
      const docMat = merged.materialOf;
      if (kind === "mesh") {
        if (op.brep || op.groups?.length) throw new OpTargetError("paste: brep geometry into a mesh body needs a cast");
        if (op.instances?.some((i) => i.parent !== null)) throw new OpTargetError("paste: mesh body has no groups to parent instances under");
        if (op.mesh) {
          const tb = s.mesh(ref.def), tk = tb.kernel, slot = (code: number): number => { const id = docMat(code); if (id < 0) return -1; let j = tb.materialSlots.indexOf(id); if (j < 0) { j = tb.materialSlots.length; tb.materialSlots.push(id); } return j; };
          const vs = op.mesh.verts.map((q) => tk.addVertex(q));
          for (const f of op.mesh.faces) tk.addFace(f.ring.map((i) => vs[i]), { kind: "fresh", face: givenFaceValues(tk, { material: slot(f.mat) }) });   // 经过剪贴板：故意不带角上的数（统筹 11-11 定，1-2½）——带过去 = 贴出来的面和原来那张悄悄共用画布上同一块；「副本共用一块还是另占一块」归 1-3d 一次定（网格体里的「复制面」现在是照抄角上的数）
          for (const e of op.mesh.edges) { const id = tk.ensureEdge(vs[e.a], vs[e.b]); unpackEdgeByte(tk, id, e.flags); }   // 载荷里那个字节拆回列（给定的值）
        }
        for (const i of op.instances ?? []) mintPasted(s, ref.def, null, i, merged);
        return { scene: s, events };
      }
      if (op.mesh) throw new OpTargetError("paste: mesh geometry into a brep body needs a cast");
      const toSlot = (code: number): number => { const id = docMat(code); return id === -1 ? -1 : s.slotFor(ref.def, id); };   // −2 = 内置默认背面，也进槽表
      if (op.brep) events = absorbSnapshot(poolOf(s, op.at).kernel, op.brep, IDENTITY, toSlot);
      const gids: number[] = [];
      for (const g of op.groups ?? []) {   // 先建全部、再连父子（建组能把老组装进新组：子的编号可以比父小，载荷顺序不保证父在前）
        const ng = s.mintGroup(ref.def, ref.group, Kernel.fromBrep(remapSnapshotMaterial(g.snap, toSlot)), g.axes);
        ng.guides = cloneGuides(g.guides); if (g.name !== undefined) ng.name = g.name;
        gids.push(ng.id);
      }
      (op.groups ?? []).forEach((g, i) => { if (g.parent === null) return; const parent = gids[g.parent]; if (parent === undefined) throw new OpTargetError("paste: group parent index out of range"); s.group({ def: ref.def, group: gids[i] }).parent = parent; });
      for (const i of op.instances ?? []) { const parent = i.parent === null ? ref.group : gids[i.parent]; if (parent === undefined) throw new OpTargetError("paste: instance parent index out of range"); mintPasted(s, ref.def, parent, i, merged); }
      return { scene: s, events };
    }
    case "separateObject": {
      const src = meshOf(s, op.def), k = src.kernel, xf = op.instance !== undefined ? s.instance(op.at.def, op.instance).xform : ([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0] as Xform), faces = op.faces.filter((f) => k.hasF(f));
      if (!faces.length) throw new OpTargetError("separate: no faces");
      refusePaintMove(s, { def: op.def, faces });
      const nk = new MeshKernel(), map = new Map<number, number>(), back = new Map<number, number>(), nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = nk.addVertex(k.pt(v)); map.set(v, x); back.set(x, v); } return x; };
      nk.ensureColumns(k.columnDefs());   // 整张面原样搬到新内核：列按 id 对上、面上和角上的数跟着搬（新物件带同一张速查表，贴图坐标的代号原样有效）
      for (const f of faces) { const v = k.columnsOf(f), ring = k.faceVerts(f).map(nv); declareRingEdges(nk, ring, (a, b) => givenEdge(k, k.edgeOf(back.get(a)!, back.get(b)!))); nk.addFace(ring, { kind: "fresh", corner: v.corner, face: v.face }); }   // 面上的列（材质、隐藏）原样搬：新物件的槽表照抄
      nk.setSmoothDefault(k.smoothDefault);
      deleteSelection(k, { faces }, false);
      const d = s.mintDef(op.name, new Kernel());
      d.body = { kind: "mesh", kernel: nk, materialSlots: [...src.materialSlots], uvSetSlots: [...src.uvSetSlots] };   // 槽表 / 速查表照拷（带着画的面现在分不出来，paintMoveBlocked 先拒；第 3 刀放开）
      s.mintInstance(op.at.def, op.at.group, d.id, xf);
      return { scene: s, events: [] };
    }
    case "makeUnique": {
      const inst = s.def(op.def).instances.get(op.instance);
      if (!inst) throw new OpTargetError(`instance ${op.instance}`);
      refusePaintMove(s, { def: inst.def });
      inst.def = uniqueCopy(s, inst.def);
      return { scene: s, events: [] };
    }
    case "meshKnife": { knife(meshOf(s, op.def).kernel, op.face, op.path); return { scene: s, events: [] }; }
    case "meshLoopCut": { const r = loopCuts(meshOf(s, op.def).kernel, op.edge, op.cuts ?? 1, op.t ?? 0.5); if (!r.edges.length) throw new OpTargetError(`loop cut from edge ${op.edge}: not a quad strip`); return { scene: s, events: [] }; }
    case "meshExtrude": { const k = meshOf(s, op.def).kernel; if (op.along !== undefined && !op.faces?.length) extrudeAlongNormals(k, op, op.along); else extrudeAndOffset(k, op, op.offset ?? { x: 0, y: 0, z: 0 }); return { scene: s, events: [] }; }
    case "castDefinition": {
      const d = s.def(op.def);
      if (op.to === "brep") refusePaintMove(s, { def: op.def });   // 网格体转硬表面：带着画怎么办以后另定，现在先拒（1-3b，统筹 11-10）
      const body = castBody(d.body, op.to, op.softDeg !== undefined ? { softDeg: op.softDeg } : undefined);   // 不认的方向在这里抛，文档不动
      // 组没了（网格体没有组分区）：住在组里的实例挂回定义的根上——组没有自己的变换，摆的位置不变（2026-10-28：以前留着指向不存在的组）
      if (body.kind !== "brep") for (const inst of d.instances.values()) if (inst.parent !== null) inst.parent = null;
      d.body = body;
      return { scene: s, events: [] };
    }
    case "shelfPut": case "shelfTake": case "shelfMove": case "shelfFolderAdd": case "shelfFolderRename": case "shelfFolderRemove": return applyShelfOp(s, op);
    case "addLayer": { const id = s.nextLayer++; s.layers.push({ id, guid: mintGuid(), name: op.name, visible: true, ...(op.color ? { color: op.color } : {}) }); return { scene: s, events: [] }; }
    case "renameLayer": { const l = s.layers.find((x) => x.id === op.layer); if (!l) throw new OpTargetError(`layer ${op.layer}`); l.name = op.name; return { scene: s, events: [] }; }
    case "setLayerVisible": { const l = s.layers.find((x) => x.id === op.layer); if (!l) throw new OpTargetError(`layer ${op.layer}`); l.visible = op.visible; return { scene: s, events: [] }; }
    case "removeLayer": {
      if (op.layer === 0) throw new OpTargetError("layer 0 is the default layer and cannot be removed");
      const i = s.layers.findIndex((x) => x.id === op.layer); if (i < 0) throw new OpTargetError(`layer ${op.layer}`);
      s.layers.splice(i, 1);
      for (const d of s.defs.values()) for (const inst of d.instances.values()) if (inst.layer === op.layer) delete inst.layer;
      return { scene: s, events: [] };
    }
    case "assignLayer": {
      if (op.layer !== null && !s.layers.some((x) => x.id === op.layer)) throw new OpTargetError(`layer ${op.layer}`);
      const def = s.def(op.at.def);
      for (const iid of op.instances) { const inst = def.instances.get(iid); if (!inst) throw new OpTargetError(`instance ${iid}`); if (op.layer === null) delete inst.layer; else inst.layer = op.layer; }
      return { scene: s, events: [] };
    }
    case "eraseGroup": {
      const d = s.def(op.at.def), db = s.brep(op.at.def);
      const g = db.groups.get(op.group);
      if (!g) throw new OpTargetError(`group ${op.group}`);
      // 子项一并删（递归）
      const kill = new Set<number>([g.id]);
      let grew = true;
      while (grew) { grew = false; for (const cg of db.groups.values()) if (cg.parent !== null && kill.has(cg.parent) && !kill.has(cg.id)) { kill.add(cg.id); grew = true; } }
      for (const id of kill) db.groups.delete(id);
      for (const [iid, ci] of [...d.instances]) if (ci.parent !== null && kill.has(ci.parent)) d.instances.delete(iid);
      return { scene: s, events: [] };
    }
  }
}
/** 快照里的边集（按端点坐标查）。 */
function snapEdgeSet(snap: ReturnType<typeof extractSnapshot>): (a: Pt3, b: Pt3) => boolean {
  const ks = snap.vertices.map(key);
  const set = new Set(snap.edges.map(([x, y]) => (ks[x] < ks[y] ? `${ks[x]}|${ks[y]}` : `${ks[y]}|${ks[x]}`)));
  return (a, b) => { const ka = key(a), kb = key(b); return set.has(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`); };
}

// ---------- 摘要（调试日志一行：动词 + 数量，不含坐标）----------
export function describeOp(op: Op): string {
  const at = "at" in op && op.at ? ` @${op.at.def}/${op.at.group ?? "root"}` : "";
  switch (op.op) {
    case "plugin": { const d = OP_PLUGINS.get(op.name)?.describe?.(op.args); return `${op.name}${d ? ` ${d}` : ""}${at}`; }
    case "clear": return "clear";
    case "preset": return `preset ${op.name}`;
    case "addEdges": return `addEdges segs=${op.segs.length}${op.curve ? (typeof op.curve === "object" ? ` curve:${op.curve.kind}` : " curve") : ""}${op.harden ? " harden" : ""}${at}`;
    case "explodeCurves": return `explodeCurves n=${op.edges.length}${at}`;
    case "weldEdges": return `weldEdges n=${op.edges.length}${at}`;
    case "castDefinition": return `castDefinition def=${op.def} → ${op.to}`;
    case "meshAddPrimitive": return `meshAddPrimitive def=${op.def} ${op.kind}`;
    case "meshInset": return `meshInset def=${op.def} faces=${op.faces.length} d=${op.dist.toFixed(4)}`;
    case "meshBevel": return `meshBevel def=${op.def} edges=${op.edges.length} w=${op.width.toFixed(4)} seg=${op.segments}`;
    case "meshBevelVerts": return `meshBevelVerts def=${op.def} verts=${op.verts.length} w=${op.width.toFixed(4)}`;
    case "meshSubdivide": return `meshSubdivide def=${op.def} levels=${op.levels}`;
    case "setMeshMirror": return `setMeshMirror def=${op.def} ${op.mirror ? `${op.mirror.mode} ${"xyz"[op.mirror.axis]}` : "off"}`;
    case "meshSymmetrize": return `meshSymmetrize def=${op.def} axis=${"xyz"[op.axis]} side=${op.side}`;
    case "meshMerge": return `meshMerge def=${op.def} verts=${op.verts.length}`;
    case "meshSymmetrySnap": return `meshSymmetrySnap def=${op.def} verts=${op.verts.length} axis=${"xyz"[op.axis]} tol=${op.tol} ${op.mode}`;
    case "meshEdgeMarks": return `meshEdgeMarks def=${op.def} edges=${op.edges.length} ${op.mark}`;
    case "meshSmoothDefault": return `meshSmoothDefault def=${op.def} ${op.mode} ${op.deg}`;
    case "meshDuplicate": return `meshDuplicate def=${op.def} f=${op.faces?.length ?? 0} e=${op.edges?.length ?? 0} v=${op.verts?.length ?? 0}`;
    case "meshFill": return `meshFill def=${op.def} e=${op.edges?.length ?? 0} v=${op.verts?.length ?? 0}`;
    case "meshFlip": return `meshFlip def=${op.def} faces=${op.faces.length}`;
    case "startPaint": return `startPaint def=${op.def} faces=${op.faces.length} uv=${op.uvSet.slice(0, 4)}${op.density !== undefined ? ` density=${op.density}` : ""}${op.canvas !== undefined ? ` canvas=${op.canvas}` : ""}${op.arrange !== undefined ? ` arrange=${op.arrange}` : ""}`;
    case "meshPaintFaces": return `meshPaintFaces def=${op.def} faces=${op.faces.length} material=${op.material ?? "default"}`;
    case "meshLayoutPaint": return `meshLayoutPaint def=${op.def}${op.faces ? ` faces=${op.faces.length}` : ""}`;
    case "paste": return `paste${op.brep ? ` brep=${op.brep.faces.length}f` : ""}${op.mesh ? ` mesh=${op.mesh.faces.length}f` : ""}${op.groups?.length ? ` groups=${op.groups.length}` : ""}${op.instances?.length ? ` instances=${op.instances.length}` : ""}${op.closure ? ` closure=${op.closure.definitions.length}d` : ""}${op.merge ? ` merge=${op.merge.entries}` : ""}${op.shelve?.length ? ` shelve=${op.shelve.length}` : ""}${at}`;
    case "shelfPut": return `shelfPut ${op.kind} ${op.ref.slice(0, 4)}${op.folder ? ` in ${op.folder.slice(0, 4)}` : ""}${op.index !== undefined ? ` @${op.index}` : ""}`;
    case "shelfTake": return `shelfTake ${op.item.slice(0, 4)}`;
    case "shelfMove": return `shelfMove ${op.item.slice(0, 4)} → ${op.folder?.slice(0, 4) ?? "top"}${op.index !== undefined ? ` @${op.index}` : ""}`;
    case "shelfFolderAdd": return `shelfFolderAdd "${op.name}"`;
    case "shelfFolderRename": return `shelfFolderRename ${op.folder.slice(0, 4)}`;
    case "shelfFolderRemove": return `shelfFolderRemove ${op.folder.slice(0, 4)}`;
    case "separateObject": return `separateObject def=${op.def} faces=${op.faces.length} → 「${op.name}」`;
    case "makeUnique": return `makeUnique def=${op.def} instance=${op.instance}`;
    case "mergeObject": return `mergeObject ${op.source} → ${op.target}${op.cast ? " cast" : ""}${at}`;
    case "meshDelete": return `meshDelete def=${op.def}${op.dissolve ? " dissolve" : ""} f=${op.faces?.length ?? 0} e=${op.edges?.length ?? 0} v=${op.verts?.length ?? 0}`;
    case "meshKnife": return `meshKnife def=${op.def} face=${op.face} points=${op.path.length}`;
    case "meshLoopCut": return `meshLoopCut def=${op.def} edge=${op.edge} t=${op.t ?? 0.5}${op.cuts && op.cuts > 1 ? ` cuts=${op.cuts}` : ""}`;
    case "meshExtrude": return `meshExtrude def=${op.def} ${op.faces?.length ? `faces=${op.faces.length}` : op.edges?.length ? `edges=${op.edges.length}` : `verts=${op.verts?.length ?? 0}`} ${op.along !== undefined ? `along=${op.along.toFixed(3)}` : `Δ=${(op.offset?.x ?? 0).toFixed(3)},${(op.offset?.y ?? 0).toFixed(3)},${(op.offset?.z ?? 0).toFixed(3)}`}`;
    case "meshMove": { const m = op.moves[0], d = m ? ` v${m.v}→${m.to.x.toFixed(3)},${m.to.y.toFixed(3)},${m.to.z.toFixed(3)}` : ""; return `meshMove def=${op.def} verts=${op.moves.length}${d}`; }
    case "addLayer": return `addLayer ${op.name}`;
    case "renameLayer": return `renameLayer ${op.layer}`;
    case "setLayerVisible": return `setLayerVisible ${op.layer} ${op.visible ? "on" : "off"}`;
    case "removeLayer": return `removeLayer ${op.layer}`;
    case "assignLayer": return `assignLayer inst=${op.instances.length} → ${op.layer === null ? "inherit" : op.layer}${at}`;
    case "dissolveVertices": return `dissolveVertices n=${op.points.length}${at}`;
    case "batch": return `batch ${op.label} [${op.ops.map(describeOp).join("; ")}]`;
    case "eraseEdges": return `eraseEdges n=${op.edges.length}${at}`;
    case "eraseFaces": return `eraseFaces n=${op.faces.length}${at}`;
    case "eraseSelection": return `eraseSelection faces=${op.faces.length} edges=${op.edges.length}${at}`;
    case "move": { const m = op.moves[0]; const d = m ? ` Δ=${(m.to.x - m.from.x).toFixed(3)},${(m.to.y - m.from.y).toFixed(3)},${(m.to.z - m.from.z).toFixed(3)}` : ""; return `move verts=${op.moves.length}${d}${at}`; }   // 位移不是坐标：D17 要靠它判断落定帧纯不纯
    case "pushpull": return `pushpull ring=${op.face.length} dist=${Number(op.dist.toFixed(4))}${op.keepRing ? " keepRing" : ""}${at}`;
    case "followme": return `followme ring=${op.face.length} path=${op.path.length}${op.closed ? " closed" : ""}${at}`;
    case "absorb": return `absorb faces=${op.faces.length} wires=${op.wires.length}${at}`;
    case "makeGroup": return `makeGroup faces=${op.faces.length} edges=${op.edges.length}${op.groups?.length ? ` groups=${op.groups.length}` : ""}${op.instances?.length ? ` instances=${op.instances.length}` : ""}${at}`;
    case "makeComponent": return `makeComponent "${op.name}" faces=${op.faces.length} edges=${op.edges.length}${op.groups?.length ? ` groups=${op.groups.length}` : ""}${op.instances?.length ? ` instances=${op.instances.length}` : ""}${at}`;
    case "explode": return `explode ${op.group !== undefined ? `group ${op.group}` : `instance ${op.instance}`}${at}`;
    case "transformPool": return `transformPool${at}`;
    case "transformInstance": return `transformInstance ${op.def}/${op.instance}`;
    case "placeInstance": return `placeInstance def=${op.definition}${at}`;
    case "importScene": return `importScene "${op.scene.name}" nodes=${op.scene.nodes.length} meshes=${op.scene.meshes.length}${at}`;
    case "eraseInstance": return `eraseInstance ${op.def}/${op.instance}`;
    case "purgeDefs": return `purgeDefs [${op.defs.join(",")}]`;
    case "purgeMaterials": return `purgeMaterials [${op.materials.join(",")}]`;
    case "moveInstance": return `moveInstance ${op.from.def}/${op.from.inst} → ${op.into.def}/${op.into.parent ?? "root"}${op.index !== undefined ? ` @${op.index}` : ""}`;
    case "copyGroup": return `copyGroup ${op.group}${at}`;
    case "addMaterial": return `addMaterial "${op.name}"${op.channels ? ` channels=${Object.keys(op.channels).join("+")}` : ""}`;
    case "addTexture": return `addTexture "${op.name}" ${op.mimeType} ${op.bytes?.length ?? 0}B ${op.sizeM.join("x")}m`;
    case "addTiledPaint": return `addTiledPaint "${op.name}" ${op.ora?.length ?? 0}B ${op.sizeM.join("x")}m`;
    case "purgeTextures": return `purgeTextures ${op.textures.length}`;
    case "setFreed": return `setFreed ${op.rows.length}`;
    case "flipFaceSides": return `flipFaceSides n=${op.faces.length}${at}`;
    case "paintFaces": return `paintFaces n=${op.faces.length} material=${op.material ?? "default"}${op.sides ? ` sides=${op.sides.filter((x) => x === 0).length}+/${op.sides.filter((x) => x === 1).length}-` : ""}${at}`;
    case "setEdgeLayers": return `setEdgeLayers n=${op.edges.length} ${op.on ? "+" : "-"}${op.layers.join(",")}${at}`;
    case "eraseGroup": return `eraseGroup ${op.group}${at}`;
    case "setHidden": return `setHidden ${op.on ? "on" : "off"}${op.instance !== undefined ? ` instance ${op.instance}` : ""}${op.faces?.length ? ` faces=${op.faces.length}` : ""}${op.edges?.length ? ` edges=${op.edges.length}` : ""}${at}`;
    case "unhideAll": return "unhideAll";
    case "rename": return `rename ${op.instance !== undefined ? `instance ${op.instance}` : `def ${op.def}`} → ${op.name ?? "(去掉)"}`;
    case "setLocked": return `setLocked ${op.on ? "on" : "off"} ${op.group !== undefined ? `group ${op.group}` : `instance ${op.instance}`}${at}`;
    case "addGuide": return `addGuide ${op.line ? "line" : op.circle ? "circle" : op.sphere ? "sphere" : "point"}${at}`;
    case "eraseGuides": return `eraseGuides n=${op.ids.length}${at}`;
    case "clearGuides": return `clearGuides${at}`;
    case "setAxes": return `setAxes${at}`;
    case "setDrawFrame": return `setDrawFrame${at}${op.frame ? "" : " reset"}`;
    case "applyScale": return `applyScale ${op.def}/${op.instance}`;
    case "mirror": return `mirror faces=${op.faces.length} edges=${op.edges.length} instances=${op.instances?.length ?? 0}${op.deleteOpposite ? " -opp" : ""}${op.mergeSeam ? " +seam" : ""}${op.weld ? ` weld=${op.weld}` : ""}${op.guard !== undefined ? ` guard=${op.guard}` : ""}${at}`;
  }
}

/** 把一份网格体的几何经变换 X 并进另一份（材质槽重映射、手标跟着走、裸线带上）。合并物体 / 炸开网格体共用。created 2026-10-28 by Claude Opus 5.5 */
export function appendMesh(tb: MeshBody, sb: MeshBody, X: Xform): void {
  const sk = sb.kernel, tk = tb.kernel, map = new Map<number, number>();
  const back = new Map<number, number>(), nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = tk.addVertex(applyPt(X, sk.pt(v))); map.set(v, x); back.set(x, v); } return x; };
  const slot = (m: number): number => { if (m < 0) return -1; const id = sb.materialSlots[m]; if (id === undefined) return -1; let j = tb.materialSlots.indexOf(id); if (j < 0) { j = tb.materialSlots.length; tb.materialSlots.push(id); } return j; };
  const uvCode = mergeUvSlots(tb.uvSetSlots, sb.uvSetSlots);   // 贴图坐标的速查表：和材质槽同一处并进来、搬过来的面重新对号（施工单十八 3.2½ 第 6 条）
  tk.ensureColumns(sk.columnDefs());   // 整张面原样搬到另一个内核：对方有、这边没有的列补上（原有的面填那一列的 fill），面上和角上的数跟着搬
  for (const f of sk.faces()) { const v = sk.columnsOf(f); remapUvCode(v.face, uvCode); const mi = v.face.get(MATERIAL_INDEX.id); if (mi !== undefined) v.face.set(MATERIAL_INDEX.id, slot(mi)); const ring = sk.faceVerts(f).map(nv); declareRingEdges(tk, ring, (a, b) => givenEdge(sk, sk.edgeOf(back.get(a)!, back.get(b)!))); tk.addFace(ring, { kind: "fresh", corner: v.corner, face: v.face }); }   // 材质槽号按这边的槽表换号（规程第六节：跨物件搬，换号由调用方做）
  for (const e of sk.edges()) {   // 不挂面的线：带着值造、打上裸线位（以前只造了边、没带裸线位）
    if (sk.eFaces(e).length) continue;
    const a = nv(sk.edgeA[e]), b = nv(sk.edgeB[e]);
    if (tk.edgeOf(a, b) < 0) tk.setWire(tk.addEdge(a, b, givenEdge(sk, e)), true);
  }
}
/** 整条边搬到另一个内核 = 给定的值（凭空来的，照源边每一列的值；列按 id 对上，调用方先 ensureColumns）。 */
function givenEdge(src: MeshKernel, e: number): EdgeOrigin { const v = src.edgeShape(e).values; return v ? { kind: "fresh", values: v } : { kind: "fresh" }; }
/** 炸开一份实例（外面一层和它不是一种身体、或外面是网格体的那条路）：跨种类且它有自己的几何 = 要 cast（用户点过「转成 X 再炸」），否则人话拒绝。 */
function explodeInstance(s: Scene, at: PoolRef, inst: Instance, cast: boolean): void {
  if (s.kindOf(at.def) !== s.kindOf(inst.def) && !cast && !bodyEmpty(s.def(inst.def).body)) throw new OpTargetError(`explode: 「${s.def(inst.def).name}」是${s.kindOf(inst.def) === "mesh" ? "网格体" : "硬表面体"}、这一层是${s.kindOf(at.def) === "mesh" ? "网格体" : "硬表面体"}，要先转种类（点「转成 X 再炸」）`);
  if (s.kindOf(at.def) === s.kindOf(inst.def) && s.kindOf(at.def) === "brep") { applyOp(s, { op: "explode", at, instance: inst.id }); return; }   // 同种硬表面：走原来那条（组 / 子实例 / 材质重映射）
  explodeAcrossKinds(s, at, inst);
}
/** 身体里没自己的几何（只摆着子物件）：跨种类炸开 / 合并不用转。 */
export function bodyEmpty(b: SceneBody): boolean {
  return b.kind === "mesh" ? b.kernel.faceCount() === 0 && b.kernel.edges().length === 0 : b.kernel.faces().length === 0 && b.kernel.edges().length === 0 && b.groups.size === 0;
}
/** 同级排序：把 id 排到实例顺序的第 index 位（Map 的插入顺序 = 同级先后，文件里按这个写，计划书 §2.3）。缺 index = 不动。 */
function placeAmongSiblings(d: Definition, id: number, index: number | undefined): void {
  if (index === undefined) return;
  const me = d.instances.get(id)!, rest = [...d.instances.values()].filter((i) => i.id !== id);
  rest.splice(Math.max(0, Math.min(rest.length, index)), 0, me);
  d.instances.clear();
  for (const i of rest) d.instances.set(i.id, i);
}
/** 粘贴一份实例：名字 / 锁 / 层 / 藏跟着走；这是一份新的摆放，GUID 现铸（拷一次贴两次不能同身份）。 */
function mintPasted(s: Scene, def: number, parent: number | null, i: TransferInstance, merged: LandedPayload): void {
  const ni = s.mintInstance(def, parent, merged.defOf(i)!, i.xform);
  if (i.name !== undefined) ni.name = i.name;
  if (i.locked) ni.locked = true;
  const layer = merged.layerOf(i);
  if (layer !== undefined) ni.layer = layer;
  if (i.hidden) ni.hidden = true;
}
/** 画的指令的结果 → 抛（拒绝 = OpRejected 进提示行；目标没了 = OpTargetError）。 */
const paintOutcome = (s: Scene, o: PaintOutcome): ApplyResult => { if (o && "rejected" in o) throw new OpRejected(o.rejected); if (o && "target" in o) throw new OpTargetError(o.target); return { scene: s, events: [] }; };
/** 粘贴计划里要新建（含「断开」铸新）/ 更新的定义：载荷里它们的槽表 + 要被换掉身体的现有定义（1-3b 审后补：同一份文件贴「断开」/「更新」也不许把画搬走、丢掉）。 */
const pastePaintScope = (s: Scene, pp: PastePlan): { defSlots: (readonly (Guid | null)[])[]; replaces: number[]; carriesUv: boolean } => {
  const isDef = (r: { kind: string }): boolean => r.kind === DEFINITION, want = new Set([...pp.plan.create, ...pp.plan.update].filter(isDef).map((r) => r.guid)), upd = new Set(pp.plan.update.filter(isDef).map((r) => r.guid));
  const defs = pp.bundle.docs.filter((d) => d.kind === DEFINITION && want.has((d.doc as DefinitionEntry).def.guid)).map((d) => (d.doc as DefinitionEntry).def);
  return { defSlots: defs.map((d) => d.materialSlots), replaces: [...s.defs.values()].filter((d) => upd.has(d.guid)).map((d) => d.id), carriesUv: defs.some((d) => (d.mesh?.uv?.sets.length ?? 0) > 0) };   // 1-2½：文件形状带着贴图坐标了（施工单十八第 1½ 刀：MeshDoc.uv，在至少一套排法上）
};
/** 第六节那几种动作的唯一拒绝口（判断在 scene/paint.ts paintMoveBlocked）。 */
const refusePaintMove = (s: Scene, what: PaintMove): void => { const why = paintMoveBlocked(s, what); if (why) throw new OpRejected(why); };
const PAINT_ONLY_MESH = "画只能给网格体自己的面（硬表面的面不能换成画）";
const TEXTURES_FROZEN = "这份文件的贴图表是更新版写的，本版读不懂，加贴图 / 清理会和它打架：用更新版打开再改";
const SHELF_FROZEN_PURGE = "这份文件的素材架是更新版写的，本版看不见架上收着什么，清理可能删掉它们：用更新版打开再清理";
/** 同一个文件夹里排到第 index 个（items 是一张表，顺序只在同夹之间有意义；缺 / 超了 = 排最后）。 */
function placeOnShelf(items: ShelfItem[], it: ShelfItem, index: number | undefined): void {
  const peers = items.filter((x) => x.folder === it.folder);
  if (index === undefined || index >= peers.length) { items.push(it); return; }
  items.splice(items.indexOf(peers[Math.max(0, index)]), 0, it);
}
/** 素材架的六条指令（计划书 §15.1-D）。拒绝都说清楚（OpRejected 进提示行），不静默 no-op。 */
function applyShelfOp(s: Scene, op: Extract<Op, { op: "shelfPut" | "shelfTake" | "shelfMove" | "shelfFolderAdd" | "shelfFolderRename" | "shelfFolderRemove" }>): ApplyResult {
  if (s.shelfFrozen) throw new OpRejected("这份文件的素材架是更新版写的，本版不能改（保存时原样带回）");
  const { folders, items } = s.shelf, done: ApplyResult = { scene: s, events: [] };
  const folderMustExist = (g: Guid | null): void => { if (g !== null && !folders.some((f) => f.guid === g)) throw new OpRejected("素材架：那个文件夹已经不在了"); };
  const itemOf = (g: Guid): ShelfItem => { const it = items.find((x) => x.guid === g); if (!it) throw new OpTargetError(`shelf item ${g}`); return it; };
  switch (op.op) {
    case "shelfPut": {
      const def = op.kind === "definition" ? s.defByGuid(op.ref) : undefined, name = op.kind === "definition" ? def?.name : s.materials[s.materialByGuid(op.ref)]?.name;
      if (name === undefined) throw new OpTargetError(`shelfPut: ${op.kind} ${op.ref}`);
      if (def?.id === s.root) throw new OpRejected("模型最外一层不能放上素材架");
      if (items.some((x) => x.kind === op.kind && x.ref === op.ref)) throw new OpRejected(`「${name}」已经在素材架上了`);
      folderMustExist(op.folder);
      if (items.some((x) => x.guid === op.guid)) throw new OpRejected("素材架：这个身份已经有人用了");
      placeOnShelf(items, { guid: op.guid, kind: op.kind, ref: op.ref, folder: op.folder }, op.index);
      return done;
    }
    case "shelfTake": { const it = itemOf(op.item); items.splice(items.indexOf(it), 1); return done; }   // 只去引用，条目不删：没人用了进孤儿，清理才删
    case "shelfMove": {
      const it = itemOf(op.item);
      folderMustExist(op.folder);
      items.splice(items.indexOf(it), 1);
      it.folder = op.folder;
      placeOnShelf(items, it, op.index);
      return done;
    }
    case "shelfFolderAdd": {
      if (!op.name.trim()) throw new OpRejected("文件夹要有名字");
      folderMustExist(op.parent);
      if (folders.some((f) => f.guid === op.guid)) throw new OpRejected("素材架：这个文件夹已经有了");   // 只有新建，没有「搬文件夹」：拒掉重复身份之后造不出环
      folders.push({ guid: op.guid, name: op.name, parent: op.parent });
      return done;
    }
    case "shelfFolderRename": {
      const f = folders.find((x) => x.guid === op.folder);
      if (!f) throw new OpTargetError(`shelf folder ${op.folder}`);
      if (!op.name.trim()) throw new OpRejected("文件夹要有名字");
      f.name = op.name;
      return done;
    }
    case "shelfFolderRemove": {
      const i = folders.findIndex((x) => x.guid === op.folder);
      if (i < 0) throw new OpTargetError(`shelf folder ${op.folder}`);
      if (items.some((x) => x.folder === op.folder) || folders.some((x) => x.parent === op.folder)) throw new OpRejected(`文件夹「${folders[i].name}」里还有东西：先搬空再删`);
      folders.splice(i, 1);
      return done;
    }
  }
}
/**
 * 炸开一份实例，外面一层或组件本身有一边是网格体（2026-10-28 夜 user「炸开mesh会出bug」）：
 * 外面是网格体 → 组件的几何（硬表面组件先拷一份转成网格体）经实例变换并进外面那份网格体；外面是硬表面体 → 网格体组件拷一份转成硬表面体、吸进那一层的汤。
 * 组件里摆着的子实例 → 搬到外面一层（变换叠上）；这一份删掉；**定义照留**（一份都没摆了也留着，SketchUp 也是「清理没用的」才删；2026-10-30 起，以前这里会删）。和硬表面的炸开同一个语义（SketchUp Explode）。
 */
function explodeAcrossKinds(s: Scene, at: PoolRef, inst: Instance): void {
  const host = s.def(at.def), src = s.def(inst.def), hostMesh = s.kindOf(at.def) === "mesh";
  const copyBody = (): SceneBody => (src.body.kind === "mesh" ? { ...src.body, kernel: src.body.kernel.clone(), materialSlots: [...src.body.materialSlots], uvSetSlots: [...src.body.uvSetSlots] } : src.body);
  if (hostMesh) {
    const mb = (src.body.kind === "mesh" ? copyBody() : castBody(src.body, "mesh")) as MeshBody;
    appendMesh(s.mesh(at.def), mb, inst.xform);
  } else {
    const bb = castBody(copyBody(), "brep") as BrepBody;
    const remap = (slot: number): number => { const mat = bb.materialSlots[slot]; return mat === undefined ? -1 : s.slotFor(at.def, mat); };
    absorbSnapshot(poolOf(s, at).kernel, bb.kernel.toBrep(), inst.xform, remap);
  }
  for (const si of src.instances.values()) s.mintInstance(at.def, hostMesh ? null : at.group, si.def, compose(inst.xform, si.xform));
  host.instances.delete(inst.id);   // 定义照留（同上）
}
