import type { Editor } from "../editor/editor.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { ParamFieldDef, ParamValue } from "../editor/param-panel.ts";
import { type AttributeList, type AttributeRow } from "../scene/attribute-list.ts";
export interface KindPageCtx {
    readonly editor: Editor;
    readonly def: number;
}
/** 物体页上的一行：字段（枚举 / 开关 / 数值，形状 = 参数小窗那三种）或一句说明。off = 灰掉的原因。 */
export type KindPageRow = {
    readonly kind: "field";
    readonly key: string;
    readonly icon: string;
    readonly def: ParamFieldDef;
    readonly value: ParamValue;
    readonly off?: string;
    set(v: ParamValue): void;
} | {
    readonly kind: "note";
    readonly text: string;
    readonly section?: string;
};
/** 元素页：身上有哪些元素属性 + 每一列叫什么；none = 这个种类没有元素（说一句为什么）。 */
export type KindElements = {
    readonly list: AttributeList;
    nameOf(r: AttributeRow): {
        readonly label: string;
        readonly code: string | null;
    };
} | {
    readonly none: string;
};
export interface KindPage {
    /** 种类自己那一页的页名（施工稿第三节：页名 = 种类的名字）；null = 没有这一页（空物体）。 */
    readonly tab: string | null;
    /** 种类那一页：字段（网格体 = 对称 + 镜像面）。这个种类自己的动词（细分、默认平滑、接缝……）照旧走放置表 objectWindow，窗口排在这些字段后面。 */
    fields(ctx: KindPageCtx): readonly KindPageRow[];
    elements(ctx: KindPageCtx): KindElements;
    /** 「材质和贴图」页（第一版只看）：挂着的材质、画、贴图坐标的表。出口（把画拿掉）走放置表 objectMaterials。 */
    materials(ctx: KindPageCtx): readonly KindPageRow[];
}
export declare const KIND_PAGES: Readonly<Record<BodyKind, KindPage>>;
/** 「切换种类 ›」的一项（第 1 版第五节第 4 条）：转到哪一种、跑哪个动作、右边说丢什么；off = 走不通的原因（灰掉）。 */
export interface CastChoice {
    readonly action: string;
    readonly label: string;
    readonly hint: string;
    readonly off?: string;
}
/** 这个物体能切到哪几种（除了它现在这一种），每一种丢什么（登记表 castsTo，括号前那几个字）；切到空物体只在自己没有几何时可用（挂着子物体不算）。 */
export declare function castChoices(editor: Editor, def: number): CastChoice[];
export declare const kindPageOf: (editor: Editor, def: number) => KindPage;
/** 「新建子物体 ›」的几项（第 1 版第五节第 5 条）：id = newChild:<种类>、字 = 种类给人看的名字；三个入口（右键 / 物体窗口 / 层级窗口）同一份，窗口那一层不认识种类。 */
export declare const newChildChoices: () => readonly {
    readonly id: string;
    readonly kind: BodyKind;
    readonly label: string;
}[];
export declare const newChildKindOf: (id: string) => BodyKind | null;
