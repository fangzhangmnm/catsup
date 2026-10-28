// ops.ts —— 编辑动词的**指令**（op）：可序列化、按几何寻址（µm 格点坐标 = 顶点身份，公理 3「重合即同一」），不含顶点 / 边 / 面的运行时 id。
// created 2026-09-20 by Claude Fable 5.1（A1 正规 undo；user 09-20「一开始就按照 multiplayer friendly 做这种 replay 指令式」）
// 2026-10-21（group / component 纪元，Claude Fable 5.1）：op 作用在 **Scene** 上；几何 op 带池地址 `at`（definition + group，缺省 = 根池）；
//   新动词 makeGroup / makeComponent / explode / transformPool / transformInstance / placeInstance / eraseInstance / eraseGroup。
//   池 / 实例的 id 由 Scene 顺序铸造，重放同序列 → 同 id，所以 op 里可以带它们（与顶点 µm 寻址同一精神：共识只在确定性上）。
//
// 为什么按坐标寻址：单机重放靠 id 计数器逐字一致也成立，但联机各 peer 的 id 历史不同——线协议上只有几何本身是共识。
// 解析失败（目标已不在）→ 抛 OpTargetError：单机 = 这批不落地（History 回滚）；联机 = 上层政策，这里不裁。
// 指令流生命周期 = runtime（user 2026-09-07：文件只存快照，不存 op 日志）。
import type { CurveSpec } from "../kernel/kernel.ts";
import { markEdges } from "../mesh/edge-smooth.ts";
import { bevelEdges, bevelVerts } from "../mesh/ops/bevel.ts";
import { snapToSymmetry, straddlingFaces, symmetrize } from "../mesh/mirror.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import { castBody } from "../scene/kinds.ts";
import { moveVerts, extrudeAndOffset, extrudeAlongNormals, knife, loopCut, deleteSelection, insetFaces, addPrimitive, type PrimitiveKind, type PrimitiveFrame } from "../mesh/ops/index.ts";
import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, PtIn, VertexId } from "../kernel/kernel.ts";
import { dot3, normalize3, pointOnSegment3, ptKey3, quantize3, scale3, sub3 } from "../kernel/geom.ts";
import { edgesAlongSegs } from "../kernel/curves.ts";
import { INSERT_TOL } from "../kernel/subdivide.ts";
import { MirrorRejected, mirrorGeometry, reflectionXform } from "./mirror.ts";
import { PRESETS, applyPreset } from "./presets.ts";
import { type PoolRef, type MeshBody, Scene, absorbSnapshot, bboxMin, extractSnapshot, remapSnapshotMaterial, transformSnapshot } from "../scene/scene.ts";
import { type Frame, type Xform, WORLD_FRAME, applyPt, compose, det3, frameAt, frameToXform, hasShear, invert, isRigid, scalingAbout, transformFrame, translation } from "../scene/xform.ts";
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
  | { op: "addEdges"; at?: PoolRef; segs: Seg[]; curve?: boolean | CurveSpec; harden?: boolean }
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
  | { op: "pushpull"; at?: PoolRef; face: FaceKey; dist: number; /** 加边（不自愈：原帽环留着、侧面新起一段；SketchUp 按 Ctrl）。缺 = 接着长。 */ keepRing?: boolean }
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
  | { op: "explode"; at: PoolRef; group?: number; instance?: number }
  | { op: "transformPool"; at: PoolRef; xform: Xform }
  | { op: "transformInstance"; def: number; instance: number; xform: Xform }
  | { op: "placeInstance"; at: PoolRef; definition: number; xform: Xform }
  /** 导入外来 glb（T11 / DT2，2026-10-26）：节点树原样变成组件挂在 at 下面；scene 里的网格是提交前装好的膜（scene/import-build.ts castImport）。place = 文件坐标 → at 的定义坐标。 */
  | { op: "importScene"; at: PoolRef; scene: ImportedScene; place: Xform }
  | { op: "eraseInstance"; def: number; instance: number }
  /** 复制一个 group（含子 group / 子实例）到同父池，整体经 xform（父空间）。 */
  | { op: "copyGroup"; at: PoolRef; group: number; xform: Xform }
  /** 新材质（文档级，只增）：颜色 sRGB 0..1；贴图 = 原图字节（运行时 Uint8Array；线协议要走 base64，未做）+ 物理尺寸 米。返回索引 = 当时的 materials.length。 */
  | { op: "addMaterial"; name: string; color: [number, number, number]; texture?: { mimeType: string; bytes: Uint8Array; sizeM: [number, number] } }
  /** 边层开关（软化 / 硬化 / 隐藏…）：这些边打上 / 去掉若干层。 */
  | { op: "setEdgeLayers"; at: PoolRef; edges: EdgeKey[]; layers: string[]; on: boolean }
  /** 油漆桶：这些面涂文档材质 material（null = 回默认）；槽号在该 definition 里解析 / 新开。 */
  /** sides（DT8，2026-10-26）：每张面涂哪一侧，与 faces 对齐（0 = 平面法向 +n 那侧、1 = −n 那侧）；缺 = 两侧都涂（老复现包 / 老行为）。 */
  | { op: "paintFaces"; at: PoolRef; faces: FaceKey[]; material: number | null; sides?: (0 | 1)[] }
  | { op: "eraseGroup"; at: PoolRef; group: number }
  /** 锁定 / 解锁一个子实例（A27；at = 它所在的池）。解锁永远允许（Editor 的锁护栏对本 op 豁免）。0.14 起组不是物体、不能锁：带 group 的 setLocked 被拒。 */
  | { op: "setLocked"; at: PoolRef; group?: number; instance?: number; on: boolean }
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
  /** 环切：从 edge 出发沿四边形带切一圈，每条边在 t 处劈开（缺 = 0.5）。mesh/ops/loopcut.ts。 */
  | { op: "meshLoopCut"; def: number; edge: number; t?: number }
  /** 删（自由建模的 X / Delete / 删除工具）：面 → 边 → 点三档一次；dissolve = 溶解（边 → 两侧面并一张、二度点去掉；溶解不了的跳过）。mesh/ops/delete.ts deleteSelection。 */
  /** 右键新建（网格体里）：在这个网格体里长一个基本体（坐标架 = 本地；mesh/ops/primitives.ts）。 */
  | { op: "meshAddPrimitive"; def: number; kind: PrimitiveKind; frame: PrimitiveFrame; size: [number, number, number]; segments?: number }
  /** 右键新建（SU 体里 / 根上）：新的网格体组件（定义 + 一份实例，摆在 at 池里 xform 处）。 */
  /** 插入（自由建模；面各自往里插一圈，dist 本地长度、超过上限按上限）。mesh/ops/inset.ts insetFaces。 */
  | { op: "meshInset"; def: number; faces: number[]; dist: number }
  /** 手标边（2026-10-28 FM129）：sharp = 棱 / smooth = 平滑且不画线 / none = 清掉交给默认平滑（mesh/edge-smooth.ts markEdges）。 */
  | { op: "meshEdgeMarks"; def: number; edges: number[]; mark: "sharp" | "smooth" | "none" }
  /** 倒边（2026-10-28 FM152；mesh/ops/bevel.ts bevelEdges）：width = 本地长度、segments ≥ 1（≥ 2 = 圆角）；一条都没倒 = 拒（不提交空步）。 */
  | { op: "meshBevel"; def: number; edges: number[]; width: number; segments: number }
  /** 强行对称（2026-10-28 FM134；mesh/mirror.ts symmetrize）：side 那半为准，另一半删掉照它镜回来；跨过镜像面的面 = 拒。 */
  | { op: "meshSymmetrize"; def: number; axis: 0 | 1 | 2; side: -1 | 1 }
  /** 对称对齐（FM136；只动选中的点）：mode auto = 选区重心那边为准 / flip = 另一边 / average = 取平均。 */
  | { op: "meshSymmetrySnap"; def: number; verts: number[]; axis: 0 | 1 | 2; tol: number; mode: "auto" | "flip" | "average" }
  /** 倒点（Blender Ctrl+Shift+B）。 */
  | { op: "meshBevelVerts"; def: number; verts: number[]; width: number }
  /** 网格体的默认平滑（2026-10-28 FM129；几何属性：没手标的边算棱还是光滑过渡）。 */
  | { op: "meshSmoothDefault"; def: number; mode: "angle" | "smooth" | "hard"; deg: number }
  | { op: "meshDelete"; def: number; verts?: number[]; edges?: number[]; faces?: number[]; dissolve?: boolean }
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
/** 搬成插件之前的指令名（老复现包里的 op 照旧能重放）：老 op 的字段原样当 args。 */
const LEGACY_PLUGIN_OPS: Readonly<Record<string, string>> = { makePlanar: "planar", snapToGrid: "gridSnap", restoreHierarchy: "hierarchy" };
function normalizeLegacy(op: Op): Op {
  const name = LEGACY_PLUGIN_OPS[(op as { op: string }).op];
  if (!name) return op;
  const { op: _old, at, ...args } = op as unknown as { op: string; at: PoolRef } & Record<string, unknown>;
  return { op: "plugin", name, at, args };
}

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
export const poolOf = (s: Scene, at?: PoolRef): { kernel: Kernel; ref: PoolRef } => {
  const ref = at ?? { def: s.root, group: null };
  if (!s.hasPool(ref)) throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"}`);
  const kind = s.kindOf(ref.def);
  if (kind !== "brep") throw new OpTargetError(`pool ${ref.def}/${ref.group ?? "root"} is a ${kind} pool: no brep op applies`);
  return { kernel: s.kernelOf(ref), ref };
};

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
export class ShearRejected extends Error {}
/** 拍平结算出破面：算法没想到的情况（user「如果有，说明我们算法可能想错了」）→ 整步撤回、弹错误（要复现包）。 */
export class PlanarBurst extends Error {}
/** 会改组件实例矩阵、可能乘出斜切的指令（移动 / 旋转 / 等比缩放 / 镜像永远不会；非等比缩放转过的组件、炸开被非等比缩放过的组件会）。 */
const SHEAR_OPS: ReadonlySet<Op["op"]> = new Set(["transformInstance", "placeInstance", "explode", "copyGroup", "setAxes", "transformPool", "makeComponent", "applyScale", "importScene"] as Op["op"][]);   // batch 里的每条各自过 applyOp，不用再查一遍
const shearedInstances = (s: Scene): Map<string, string> => {
  const out = new Map<string, string>();
  for (const d of s.defs.values()) for (const i of d.instances.values()) if (hasShear(i.xform)) out.set(`${d.id}/${i.id}`, s.def(i.def).name);
  return out;
};
/**
 * 执行一条指令。斜切护栏（2026-10-26，user「斜切：和gltf对齐……在发生的时候护栏住，然后提示报错」）：执行后出现了**新的**斜切实例 → 抛 ShearRejected
 * （History 回滚整步）。老文件里本来就斜切的不算（不然那份文件之后什么都改不了）。
 */
export function applyOp(s: Scene, op0: Op): ApplyResult {
  const op = normalizeLegacy(op0);
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
      const { kernel } = poolOf(s, op.at);
      const events = kernel.addEdges(op.segs, op.curve ? { curve: op.curve } : undefined);
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
      const { kernel } = poolOf(s, op.at);
      const moves = op.moves.map((m) => ({ id: resolveVertex(kernel, m.from), to: m.to }));
      if (op.mirror) {
        const moved = new Set(moves.map((m) => m.id));
        for (const f of kernel.faces()) if ([f.outer, ...f.holes].every((r) => r.vids.every((v) => moved.has(v)))) kernel.faceLayers.swapSides(f.id);
      }
      return { scene: s, events: kernel.moveVertices(moves, op.creaseLayers ? { creaseLayers: op.creaseLayers } : undefined) };
    }
    case "pushpull": { const { kernel } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face); return { scene: s, events: kernel.pushPull(fid, op.dist, op.keepRing ? { keepRing: true } : undefined) }; }
    case "followme": { const { kernel } = poolOf(s, op.at); const fid = resolveFace(kernel, op.face); return { scene: s, events: kernel.followMe(fid, op.path, { closed: op.closed, smoothJoints: op.smoothJoints }) }; }
    case "absorb": {
      const { kernel } = poolOf(s, op.at);
      const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {};
      for (const [n, segs] of Object.entries(op.edgeSegs ?? {})) edgeSegs[n] = segs.map(([a, b]) => ({ a, b }));
      return { scene: s, events: kernel.absorb(op.faces, op.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: op.faceLayers }) };
    }
    case "makeGroup":
    case "makeComponent": {
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
        const ng = s.mintGroup(def.id, null, Kernel.fromBrep(transformSnapshot(g.kernel.toBrep(), T)), transformFrame(T, g.axes));
        ng.guides = guides; if (g.name !== undefined) ng.name = g.name;
        gmap.set(gid, ng.id);
      }
      for (const gid of sub) { const g = b0.groups.get(gid)!; if (g.parent !== null && sub.has(g.parent)) s.group({ def: def.id, group: gmap.get(gid)! }).parent = gmap.get(g.parent)!; }
      for (const i of [...isel, ...subInst]) {
        const ni = s.mintInstance(def.id, i.parent !== null && sub.has(i.parent) ? gmap.get(i.parent)! : null, i.def, compose(T, i.xform));
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
    case "explode": {
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
        d.instances.delete(inst.id);
        if (s.instanceCount(src.id) === 0 && src.id !== s.root) s.defs.delete(src.id);
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
      const { ref } = poolOf(s, op.at);
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
      if (op.at.group === null && op.at.def !== s.root && s.defs.has(op.at.def) && s.kindOf(op.at.def) === "mesh") return { scene: s, events: changeDefinitionAxes(s, op.at.def, f) };   // 网格体的原点（定义根；网格体没有组）
      const { ref } = poolOf(s, op.at);
      if (ref.group !== null) s.group({ def: ref.def, group: ref.group }).axes = f;
      else if (ref.def === s.root) s.axes = f;
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
      s.addMaterial({ name: op.name, color: [op.color[0], op.color[1], op.color[2]], ...(op.texture ? { texture: { mimeType: op.texture.mimeType, bytes: op.texture.bytes, sizeM: [op.texture.sizeM[0], op.texture.sizeM[1]] } } : {}) });
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
      if (op.material !== null && !(op.material in s.materials)) throw new OpTargetError(`material ${op.material}`);
      kernel.setFaceMaterial(fids, op.material === null ? null : s.slotFor(ref.def, op.material), op.sides);
      return { scene: s, events: [] };
    }
    case "eraseInstance": {
      const d = s.def(op.def);
      if (!d.instances.delete(op.instance)) throw new OpTargetError(`instance ${op.instance}`);
      return { scene: s, events: [] };
    }
    case "setLocked": {
      if (op.group !== undefined) throw new OpTargetError("group lock: 组不是物体，不能锁（0.14）；要当参考就做成组件再锁");
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
    case "meshSymmetrize": {
      const k = meshOf(s, op.def).kernel;
      if (straddlingFaces(k, op.axis)) throw new OpTargetError("symmetrize: faces cross the mirror plane");
      symmetrize(k, op.axis, op.side);
      return { scene: s, events: [] };
    }
    case "meshSymmetrySnap": { if (!(op.tol > 0)) throw new OpTargetError(`symmetry snap tol ${op.tol}`); snapToSymmetry(meshOf(s, op.def).kernel, op.verts, op.axis, op.tol, op.mode); return { scene: s, events: [] }; }
    case "meshEdgeMarks": { const k = meshOf(s, op.def).kernel; for (const e of op.edges) if (!k.hasE(e)) throw new OpTargetError(`edge ${e}`); markEdges(k, op.edges, op.mark); return { scene: s, events: [] }; }
    case "meshSmoothDefault": { if (!(op.deg > 0 && op.deg < 180)) throw new OpTargetError(`smooth default angle ${op.deg}`); meshOf(s, op.def).kernel.setSmoothDefault({ mode: op.mode, deg: op.deg }); return { scene: s, events: [] }; }
    case "meshDelete": { deleteSelection(meshOf(s, op.def).kernel, op, !!op.dissolve); return { scene: s, events: [] }; }
    case "meshKnife": { knife(meshOf(s, op.def).kernel, op.face, op.path); return { scene: s, events: [] }; }
    case "meshLoopCut": { const r = loopCut(meshOf(s, op.def).kernel, op.edge, op.t ?? 0.5); if (!r.edges.length) throw new OpTargetError(`loop cut from edge ${op.edge}: not a quad strip`); return { scene: s, events: [] }; }
    case "meshExtrude": { const k = meshOf(s, op.def).kernel; if (op.along !== undefined && !op.faces?.length) extrudeAlongNormals(k, op, op.along); else extrudeAndOffset(k, op, op.offset ?? { x: 0, y: 0, z: 0 }); return { scene: s, events: [] }; }
    case "castDefinition": {
      const d = s.def(op.def);
      const body = castBody(d.body, op.to, op.softDeg !== undefined ? { softDeg: op.softDeg } : undefined);   // 不认的方向在这里抛，文档不动
      d.body = body;
      return { scene: s, events: [] };
    }
    case "addLayer": { const id = s.nextLayer++; s.layers.push({ id, name: op.name, visible: true, ...(op.color ? { color: op.color } : {}) }); return { scene: s, events: [] }; }
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
export function describeOp(op0: Op): string {
  const op = normalizeLegacy(op0);
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
    case "meshSymmetrize": return `meshSymmetrize def=${op.def} axis=${"xyz"[op.axis]} side=${op.side}`;
    case "meshSymmetrySnap": return `meshSymmetrySnap def=${op.def} verts=${op.verts.length} axis=${"xyz"[op.axis]} tol=${op.tol} ${op.mode}`;
    case "meshEdgeMarks": return `meshEdgeMarks def=${op.def} edges=${op.edges.length} ${op.mark}`;
    case "meshSmoothDefault": return `meshSmoothDefault def=${op.def} ${op.mode} ${op.deg}`;
    case "meshDelete": return `meshDelete def=${op.def}${op.dissolve ? " dissolve" : ""} f=${op.faces?.length ?? 0} e=${op.edges?.length ?? 0} v=${op.verts?.length ?? 0}`;
    case "meshKnife": return `meshKnife def=${op.def} face=${op.face} points=${op.path.length}`;
    case "meshLoopCut": return `meshLoopCut def=${op.def} edge=${op.edge} t=${op.t ?? 0.5}`;
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
    case "copyGroup": return `copyGroup ${op.group}${at}`;
    case "addMaterial": return `addMaterial "${op.name}"${op.texture ? " +texture" : ""}`;
    case "paintFaces": return `paintFaces n=${op.faces.length} material=${op.material ?? "default"}${op.sides ? ` sides=${op.sides.filter((x) => x === 0).length}+/${op.sides.filter((x) => x === 1).length}-` : ""}${at}`;
    case "setEdgeLayers": return `setEdgeLayers n=${op.edges.length} ${op.on ? "+" : "-"}${op.layers.join(",")}${at}`;
    case "eraseGroup": return `eraseGroup ${op.group}${at}`;
    case "setHidden": return `setHidden ${op.on ? "on" : "off"}${op.instance !== undefined ? ` instance ${op.instance}` : ""}${op.faces?.length ? ` faces=${op.faces.length}` : ""}${op.edges?.length ? ` edges=${op.edges.length}` : ""}${at}`;
    case "unhideAll": return "unhideAll";
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
