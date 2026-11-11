export type Verb = "brush" | "eraser" | "smudge" | "lasso" | "shape";
export declare const VERBS: readonly Verb[];
export interface SubToolDef {
    id: string;
    icon: string;
    titleKey: string;
    /** 落地路由：老 EditMode 名，或滤镜笔 payload。 */
    route: {
        mode: string;
    } | {
        filter: string;
        variant?: string;
    };
}
export declare const VERB_SUBTOOLS: Record<Verb, readonly SubToolDef[]>;
export declare const DEFAULT_SUBTOOL: Record<Verb, string>;
export declare function isVerb(v: unknown): v is Verb;
export declare function subToolDef(verb: Verb, id: string): SubToolDef;
/** 当前 EditMode（+ 滤镜笔 payload）→ 动词；transient / hand / picker 等非动词模式 → null。 */
export declare function verbOfMode(mode: string, filterId?: string | null): Verb | null;
/** 当前 EditMode（+ payload）→ 子工具 id（用于同步 desk.subTool 记忆与钮面图标）；对不上 → null。 */
export declare function subToolOfMode(mode: string, filterId?: string | null, variantId?: string | null): {
    verb: Verb;
    sub: string;
} | null;
