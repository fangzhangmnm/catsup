import { type PlaneParams, type Pt3 } from "../kernel/geom.ts";
import type { BodyKind } from "./body-kind.ts";
import type { Body, BrepBody, DefId, EmptyBody, MeshBody, Scene } from "./scene.ts";
export type KindModeId = "geometry" | "surface" | "freeform" | "paint" | "object";
export interface AlignGeometry {
    points: Pt3[];
    segments: [Pt3, Pt3][];
    planes: PlaneParams[];
}
export interface KindDef<B extends Body = Body> {
    readonly id: BodyKind;
    readonly label: string;
    /** 给人看的名字（提示 / 确认框里「转成 X」「是 X」的 X；第 1 版第五节第 1 条：界面不写种类名，从这里取）。label 是登记表里的技术名。 */
    readonly noun: string;
    /** 这种身体可用的编辑模式（空 = 只在物体层摆）。 */
    readonly modes: readonly KindModeId[];
    /** 显式 cast 的去向 + 这个方向可能丢的那几种（第 1 版第五节 4½：名字一套，真转返回的清单不许出这个方向没声明的）。 */
    readonly castsTo: readonly {
        to: BodyKind;
        loses: readonly CastLossId[];
    }[];
    alignGeometry(body: B): AlignGeometry;
    bounds(body: B): {
        min: Pt3;
        max: Pt3;
    } | null;
}
export declare const BREP_KIND: KindDef<BrepBody>;
export declare const MESH_KIND: KindDef<MeshBody>;
/** 空物体（第 1 版第四节）：没有几何、没有编辑模式之外的「摆放」（modes/object.ts）；转去硬表面 / 网格体不丢东西（反方向只在自己没有几何时可用，丢的是那种身体才有的设置，见 BREP / MESH 的 castsTo）。 */
export declare const EMPTY_KIND: KindDef<EmptyBody>;
export declare const KINDS: Readonly<Record<BodyKind, KindDef>>;
export declare const kindOfBody: (b: Body) => KindDef;
export declare function canCast(from: BodyKind, to: BodyKind): {
    ok: true;
    loses: readonly CastLossId[];
} | {
    ok: false;
    why: string;
};
/** 转网格体要披露的数（计划书 §9.2½ ②：转换不问，只报）：N 张面两侧都出（= 两张叠着的面）、其中 M 张材质不同、K 张两侧都是默认背面（转过去就没了）。隐藏的面照算（隐藏照样转）。 */
export interface BrepSideCounts {
    both: number;
    differ: number;
    neither: number;
}
/**
 * 一份算法两处用（计划书 §12 C3）：N 张面两侧都出、其中 M 张两侧材质不同、K 张两侧都是默认背面（整张不出）。按材质比，不按槽号比（和 bake 看到的一样）。
 * skipHidden = 隐藏的面不算（导出：bake 不出隐藏面）；转网格体隐藏的照转，所以照算。
 */
export declare function brepSideCounts(b: BrepBody, opts?: {
    skipHidden?: boolean;
}, into?: BrepSideCounts): BrepSideCounts;
/** 导出表单的说明行：从根（或选中物件的定义）沿实例引用走一遍，一份定义只算一次；网格体的面 = 文件里的面，一张面一个朝向，不算。O(这些定义的面数)，不序列化模型。 */
export declare function exportSideCounts(s: Scene, only?: readonly DefId[]): BrepSideCounts;
/**
 * brep → mesh（单面 / 双面第四版，计划书 §2.9 / §9.2-F；user 11-04「要出几侧就几张面」）：每张膜按侧出面，绕向 = 那一侧朝外（网格体一张面一个朝向）；两侧都出 = 两张重合反向的面（共用点）；默认背面不出。
 * 带洞的膜三角化（mesh 的面不带洞），三角形之间的内部边软 + 平滑（看起来还是一张面）；边标记照搬（软 / 平滑 / 隐藏；折线 = 软 + 平滑）；悬空的边 = 裸线；隐藏的面照旧隐藏；组里的几何一起并进来（组分区丢掉）。失败（某膜三角化不了）= 整个 cast 拒。
 * 不再做法向一致化（recalcNormals）：哪侧朝外是用户看得见、自己定的（默认背面 / 修复「自动朝外」），不猜。
 */
export declare function brepToMesh(b: BrepBody): MeshBody;
/**
 * mesh → brep：三角化（约束 Delaunay，同屏幕）→ 导入那条「三角形 → 膜」管线（kernel/from-triangles.ts：量化合点 → 分平面 → 整批装 → 谓词挑脏的交结算机）。
 * 共面的三角形并成一张膜（盒子回来还是 6 张；两侧不一样的不并）；不平的 n 边形折成平面块、块之间按 softDeg 变软。
 * 两侧（计划书 §2.9「这是这种身体的表示法」）：环朝的那侧 = 它的材质 / 默认正面，另一侧 = 默认背面；重合反向的两张面并成一张膜、材质各落各侧。brep → mesh → brep 两侧都保住。
 * 藏（统筹 11-13 b；以前藏着的面不带 = 悄悄少了）：藏着的面照转、膜照藏，藏着的边照藏（carryMeshSides / carryHiddenEdges）；藏没藏不一样的不并、藏着的边不并掉。
 * 带不过去的两种数在返回值里（mixedHidden = 和露着的面合成一张膜、只好露出来的藏面张数；lostHiddenEdges = 对不上的藏边条数）：「转回硬表面体」转之前问（meshToBrepCheck）。
 */
export declare function meshToBrepWith(b: MeshBody, softDeg: number): {
    body: BrepBody;
    mixedHidden: number;
    lostHiddenEdges: number;
};
export declare function meshToBrep(b: MeshBody, softDeg: number): BrepBody;
/**
 * 「转回硬表面体」转之前要问的数（统筹 11-13 b：带不过去的转之前明着说、让人选）：和真转是同一份算法（照转一遍、只要数）。
 * 网格体上一张藏面、一条挨面的藏边都没有 = 不用转就知道是 0（不藏东西的网格体不多花时间）。
 */
export declare function meshToBrepCheck(b: MeshBody, softDeg: number): {
    mixedHidden: number;
    lostHiddenEdges: number;
};
/** 显式 cast（op 层调用）：只认登记表里的方向。opts.softDeg = mesh → brep 的软边角度（缺 = 20°）；opts.mirrored = 这个网格体开着对称（设置住在场景上，身体里看不到）。
 *  返回转好的身体 + 这一次带不过去的东西（castLosses 同一份算法；第 1 版第五节 4½）。返回了这个方向没声明的 = 抛（程序错误）。 */
export declare function castBody(body: Body, to: BodyKind, opts: CastOpts): {
    body: Body;
    losses: readonly CastLoss[];
};
/** 一种带不过去的东西一个名字（字面量联合，不是开放集）。 */
export type CastLossId = "holed-faces" | "back-only-faces" | "fold-edges" | "curves" | "groups" | "guides" | "nonplanar-faces" | "wires" | "edge-marks" | "seams" | "smooth-default" | "mirror" | "uv-sets" | "mixed-hidden" | "lost-hidden-edges" | "attr-columns" | "material-slots";
/** 这一次带不过去的一样东西；0 个的不出现。设置这类不可数的 count = 1。 */
export interface CastLoss {
    readonly what: CastLossId;
    readonly count: number;
}
/** mirrored 必填（统筹 11-13 夜：可选的话新加一个入口忘了传，对称这一样就少报、没人拦）：对称设置住在场景的表上、不在身体上，只有调转换的那一层知道（载荷那几处明写 false）。 */
export interface CastOpts {
    readonly softDeg?: number;
    readonly mirrored: boolean;
}
/**
 * 每个种类自己的载荷有哪几样（第五节 4½ 第 5 条；和第四节「一个定义 = 每个种类都一样的头 + 这个种类自己的载荷」同一张：头〔guid / 名字 / 子物体……〕不在这里）。
 * 加载荷 / 加属性列 = 这里加一样 + 下面每个转换方向写明去向（守卫 test/cast-losses.test.ts：少一样 = 红）。
 */
export declare const KIND_PAYLOAD: {
    readonly brep: readonly ["rules", "faces", "face-sides", "hidden-faces", "holes", "edges", "soft-edges", "hidden-edges", "fold-edges", "curves", "groups", "guides", "material-slots"];
    readonly mesh: readonly ["faces", "face-materials", "hidden-faces", "nonplanar-faces", "edges", "edge-marks", "hidden-edges", "seams", "wires", "smooth-default", "mirror", "uv-sets", "attr-columns", "material-slots"];
    readonly empty: readonly [];
};
export type PayloadOf<K extends BodyKind> = (typeof KIND_PAYLOAD)[K][number];
/** 一样载荷转过去的去向：带过去 / 换算成什么 / 丢（数得出来的那一种，可能是一部分）/ 有就转不了（转成空物体只在没有几何时）。 */
export type CastFate = "carried" | {
    readonly converted: string;
} | {
    readonly lost: CastLossId;
} | {
    readonly blocks: string;
};
/** 网格体内核上的保留列各属于哪一样载荷（守卫：保留列一个不落）。 */
export declare const MESH_COLUMN_PAYLOAD: Readonly<Record<string, PayloadOf<"mesh">>>;
/** 每个转换方向上每一样的去向（第五节 4½ 第 5 条）。丢的那几样 = 这个方向 castsTo 声明的「可能丢」（守卫对账）。 */
export declare const CAST_FATES: {
    readonly [F in BodyKind]: {
        readonly [T in BodyKind]?: {
            readonly [P in PayloadOf<F>]: CastFate;
        };
    };
};
/** 「可能丢」列表里的名字（物体窗口照声明列，不为开窗口转一遍）。 */
export declare const lossLabel: (id: CastLossId) => string;
/** 给人看的一句；全仓只此一处造句。 */
export declare function lossText(l: CastLoss): string;
/** 一串连起来（询问里逐条列）；空 = 「不丢东西」。 */
export declare const lossesText: (ls: readonly CastLoss[]) => string;
/** 几份清单并成一份（同一样的数加起来；粘贴 / 移到…的载荷里好几块几何各转各的）。 */
export declare function sumLosses(lists: readonly (readonly CastLoss[])[]): readonly CastLoss[];
/** 只问不转：和真转同一份算法（网格体转硬表面有藏东西时照转一遍，只要清单）。 */
export declare function castLosses(body: Body, to: BodyKind, opts: CastOpts): readonly CastLoss[];
/** 自己没有几何（挂着子物体不算）。 */
export declare function bodyBare(b: Body): boolean;
