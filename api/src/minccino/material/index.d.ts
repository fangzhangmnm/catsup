export type ChannelForm = "scalar" | "map" | "both";
export interface ChannelDef {
    readonly id: string;
    readonly form: ChannelForm;
    readonly doc: string;
}
/** 通道的值：每面一个数 / 一个色 / 一张图（图 = 对材质贴图的引用，引擎不认内容）。 */
export type ChannelValue = number | readonly [number, number, number] | {
    readonly map: object;
    readonly scale?: number;
};
export type CraftTag = "shadeless" | "specular" | "bronze" | "papercut" | "plastic" | (string & {});
/** 文件里的语义材质：通道值 + 工艺标签（不含任何 PBR 概念）。 */
export interface SemanticMaterial {
    readonly channels: Readonly<Record<string, ChannelValue>>;
    readonly crafts: readonly CraftTag[];
}
export type SlotKind = "color" | "scalar" | "int" | "bool" | "map";
export type SlotValue = number | boolean | readonly [number, number, number] | {
    readonly map: object;
} | null;
export interface SlotDef {
    readonly id: string;
    readonly kind: SlotKind;
    readonly group: string;
    readonly default: SlotValue;
    readonly doc: string;
}
/** 小学钉的第一批槽（T36 四个点名风格 + GB / Casio 的例子要的）。开放：加一个槽 = registerSlot 一行。 */
export declare const BASE_SLOTS: readonly SlotDef[];
export type SlotValues = Readonly<Record<string, SlotValue>>;
/** 翻译：一个工艺把语义材质写成槽（只写它知道的槽；没写的用槽默认）。 */
export type Translation = (m: SemanticMaterial) => Partial<Record<string, SlotValue>>;
/** 一条管线声明它读哪些槽（守卫：读了没登记的槽 = 抛）。 */
export interface PipelineReads {
    readonly pipeline: string;
    readonly reads: readonly string[];
}
export declare class MaterialRegistry {
    private channels;
    private slots;
    private translations;
    private pipelines;
    constructor(slots?: readonly SlotDef[]);
    registerChannel(def: ChannelDef): void;
    channel(id: string): ChannelDef | undefined;
    channelList(): ChannelDef[];
    registerSlot(def: SlotDef): void;
    slot(id: string): SlotDef | undefined;
    slotList(): SlotDef[];
    /** 按工艺登记翻译（一个工艺一份；再登记 = 抛，别在别处偷偷覆盖）。 */
    registerTranslation(craft: CraftTag, fn: Translation): void;
    /** 管线声明 reads；读了没登记的槽 = 抛（声明错了，不静默）。 */
    declareReads(p: PipelineReads): void;
    reads(pipeline: string): PipelineReads | undefined;
    /** 翻译一份语义材质：按它的工艺标签顺序套翻译（后者覆盖前者），没写的槽用默认；不认识的工艺跳过并报在 `unknown` 里（不静默）。 */
    translate(m: SemanticMaterial): {
        readonly slots: SlotValues;
        readonly unknown: readonly string[];
    };
}
/** 小学四个点名风格（T36）各读哪些槽——数据，Opus 填预设时照这张表要东西；白模 = 现状、零成本兜底。 */
export declare const GRADE_SCHOOL_READS: readonly PipelineReads[];
/** 现成的一份注册表：基础槽 + 小学四管线的 reads + 两个最薄的翻译（base：颜色进 baseColor；shadeless：unlit）。内容在这之上长。 */
export declare function createMaterialRegistry(): MaterialRegistry;
