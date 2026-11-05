import type { BodyKind } from "./body-kind.ts";
import type { Guid } from "../format/guid.ts";
import type { DefId, InstId, Scene } from "./scene.ts";
export interface DefCensus {
    readonly def: DefId;
    readonly name: string;
    readonly kind: BodyKind;
    /** 谁摆着它（哪个组件里的哪一份）；孤儿摆着的也列。 */
    readonly users: readonly {
        readonly in: DefId;
        readonly instance: InstId;
    }[];
    /** 其中摆在模型里（活着的组件里）的份数；users.length − placed = 躺在孤儿里的。 */
    readonly placed: number;
    /** 从活着的根够得着。 */
    readonly live: boolean;
    /** 素材架收着。 */
    readonly shelved: boolean;
}
export interface MaterialCensus {
    /** 运行时句柄（文档材质表下标；只活这次会话）。 */
    readonly index: number;
    readonly guid: Guid;
    readonly name: string;
    readonly textured: boolean;
    /** 活着的组件里用它的面（一面一侧算一次；藏起来的面也算）。 */
    readonly faces: number;
    /** 只躺在孤儿组件里的面（孤儿捡回来还要它）。 */
    readonly orphanFaces: number;
    /** 素材架收着。 */
    readonly shelved: boolean;
}
export interface MaterialUse {
    faces: number;
    orphanFaces: number;
    shelved: boolean;
}
/** 素材架一行（资源页按这个顺序画）：文件夹在前、条目在后，按 parent 树展开；depth = 缩进。 */
export interface ShelfRow {
    readonly type: "folder" | "definition" | "material" | "other";
    readonly guid: Guid;
    readonly name: string;
    readonly depth: number;
    readonly def?: DefId;
    readonly material?: number;
}
export interface Census {
    readonly defs: readonly DefCensus[];
    readonly materials: readonly MaterialCensus[];
    readonly shelf: readonly ShelfRow[];
}
/** 活着的组件定义（含模型根）：从根和素材架沿「谁摆着谁」走得到的。 */
export declare function liveDefs(s: Scene): Set<DefId>;
/** 从这几个定义沿实例引用够得着的全部定义（自己算）。 */
export declare function reachableDefs(s: Scene, roots: readonly DefId[]): Set<DefId>;
/** 一次清点（模型根不列：它不是谁摆出来的，也不会是孤儿）。 */
export declare function census(s: Scene): Census;
/** 素材架按文件夹树展开成一张顺序表（纯函数）。手改过的文件里成环 / 指不到的文件夹不许让东西看不见：没走到的排在最后、不缩进。 */
export declare function shelfRows(s: Scene): ShelfRow[];
/** 每个材质（按文档材质表下标）被谁用：活着的组件 / 孤儿组件 / 素材架。能不能清理按**面**算，不按槽表算（槽表占位不算有人用；引用图上它还算被引用，闭包照带）。 */
export declare function materialUse(s: Scene): MaterialUse[];
/** 能清理的材质（没有任何面用、架子也没收）：清理指令吃这张单子。 */
export declare const unusedMaterials: (c: Census) => number[];
/** 孤儿组件（够不着的）：清理指令吃这张单子。 */
export declare const orphanDefs: (c: Census) => DefId[];
