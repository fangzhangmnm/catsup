import type { BodyKind } from "./body-kind.ts";
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
}
export interface MaterialCensus {
    /** 文档材质表里第几个（序号：I11 换 GUID 之前的临时身份）。 */
    readonly index: number;
    readonly name: string;
    readonly textured: boolean;
    /** 活着的组件里用它的面（一面一侧算一次；藏起来的面也算）。 */
    readonly faces: number;
}
export interface Census {
    readonly defs: readonly DefCensus[];
    readonly materials: readonly MaterialCensus[];
}
/** 活着的组件定义（含模型根）：从根沿「谁摆着谁」走得到的。 */
export declare function liveDefs(s: Scene): Set<DefId>;
/** 一次清点（模型根不列：它不是谁摆出来的，也不会是孤儿）。 */
export declare function census(s: Scene): Census;
/** 孤儿组件（够不着的）：清理指令吃这张单子。 */
export declare const orphanDefs: (c: Census) => DefId[];
