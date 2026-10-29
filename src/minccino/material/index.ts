// minccino/material/ —— 材质模块（骨架稿 v2 不变量 8；T35 / T36）。**步 8 只钉接口**，内容归 Opus（task #91 第 4 步）/ 绘制纪元。
// 四件东西：① 语义通道注册表（开放集：颜色 + 各种做旧…；每通道「每面一个数」和「每像素一张图」两形）② 工艺标签（已上光 = shadeless、自带高光、铸铜、剪纸…）
// ③ 翻译：**按工艺写、只写一次**「工艺 → 槽表」④ **开放槽表**（PBR 那几个槽只是其中一组；色阶带 / 墨线 / 纸层 / 包浆 / 描边 / 边发光另外登记，每槽带默认）
// + 每条管线声明它读哪些槽（`reads`），守卫盯「读了没登记的槽」——翻译数 = 工艺数，不是工艺 × 管线。created 2026-10-29 by Claude Fable 5.1

// ---------------------------------------------------------------- ① 语义通道
export type ChannelForm = "scalar" | "map" | "both";
export interface ChannelDef { readonly id: string; readonly form: ChannelForm; readonly doc: string }
/** 通道的值：每面一个数 / 一个色 / 一张图（图 = 对材质贴图的引用，引擎不认内容）。 */
export type ChannelValue = number | readonly [number, number, number] | { readonly map: object; readonly scale?: number };

// ---------------------------------------------------------------- ② 工艺标签（开放：string 也行，注册表认得的才有翻译）
export type CraftTag = "shadeless" | "specular" | "bronze" | "papercut" | "plastic" | (string & {});

/** 文件里的语义材质：通道值 + 工艺标签（不含任何 PBR 概念）。 */
export interface SemanticMaterial { readonly channels: Readonly<Record<string, ChannelValue>>; readonly crafts: readonly CraftTag[] }

// ---------------------------------------------------------------- ④ 开放槽表（翻译的输出；管线只认这个）
export type SlotKind = "color" | "scalar" | "int" | "bool" | "map";
export type SlotValue = number | boolean | readonly [number, number, number] | { readonly map: object } | null;
export interface SlotDef { readonly id: string; readonly kind: SlotKind; readonly group: string; readonly default: SlotValue; readonly doc: string }
/** 小学钉的第一批槽（T36 四个点名风格 + GB / Casio 的例子要的）。开放：加一个槽 = registerSlot 一行。 */
export const BASE_SLOTS: readonly SlotDef[] = [
  // PBR 组（只在这里存在）
  { id: "baseColor", kind: "color", group: "pbr", default: [0.84, 0.84, 0.84], doc: "底色（白模灰）" },
  { id: "roughness", kind: "scalar", group: "pbr", default: 0.7, doc: "粗糙" },
  { id: "metallic", kind: "scalar", group: "pbr", default: 0, doc: "金属" },
  { id: "emissive", kind: "color", group: "pbr", default: [0, 0, 0], doc: "自发光" },
  { id: "height", kind: "map", group: "pbr", default: null, doc: "浮雕 / 高度（0.5 = 原表面 + 尺度，实验室约定；法线由它推）" },
  { id: "mask", kind: "map", group: "pbr", default: null, doc: "遮罩" },
  { id: "unlit", kind: "bool", group: "lighting", default: false, doc: "已上光（shadeless）：光照 pass 不碰，后处理照过" },
  // 小管线要的槽（不是 PBR 的子集，T36）
  { id: "toneBand", kind: "int", group: "toneBand", default: -1, doc: "GB 四色：第几档（−1 = 按亮度分）" },
  { id: "inkColor", kind: "color", group: "ink", default: [0.07, 0.07, 0.07], doc: "Casio 线稿 / 像素描边：墨线色" },
  { id: "inkWidth", kind: "scalar", group: "ink", default: 1, doc: "墨线宽（像素）" },
  { id: "innerInk", kind: "bool", group: "ink", default: false, doc: "内线画不画（默认只跟硬边）" },
  { id: "paperColor", kind: "color", group: "paper", default: [0.96, 0.94, 0.9], doc: "剪纸色纸：纸色（平涂）" },
  { id: "paperLayer", kind: "int", group: "paper", default: 0, doc: "纸层序（谁在上）" },
  { id: "paperThickness", kind: "scalar", group: "paper", default: 0.5, doc: "纸厚（切边）" },
  { id: "patinaColor", kind: "color", group: "patina", default: [0.2, 0.45, 0.4], doc: "铸铜：包浆色（进凹处）" },
  { id: "cavity", kind: "scalar", group: "patina", default: 0.5, doc: "凹处程度（几何派生的曲率 / 凹腔只是输入，这里是材质愿意吃多少）" },
  { id: "outlineColor", kind: "color", group: "outline", default: [0, 0, 0], doc: "像素描边：描边色（可每物件）" },
  { id: "toneSteps", kind: "int", group: "outline", default: 4, doc: "像素描边：色阶数" },
  { id: "edgeGlowColor", kind: "color", group: "glow", default: [0.3, 0.8, 1], doc: "CRT Tron：边发光色" },
  { id: "edgeGlowStrength", kind: "scalar", group: "glow", default: 0, doc: "边发光强度（0 = 不发）" },
];
export type SlotValues = Readonly<Record<string, SlotValue>>;

// ---------------------------------------------------------------- ③ 翻译 + 管线 reads + 注册表
/** 翻译：一个工艺把语义材质写成槽（只写它知道的槽；没写的用槽默认）。 */
export type Translation = (m: SemanticMaterial) => Partial<Record<string, SlotValue>>;
/** 一条管线声明它读哪些槽（守卫：读了没登记的槽 = 抛）。 */
export interface PipelineReads { readonly pipeline: string; readonly reads: readonly string[] }

export class MaterialRegistry {
  private channels = new Map<string, ChannelDef>();
  private slots = new Map<string, SlotDef>();
  private translations = new Map<string, Translation>();
  private pipelines = new Map<string, PipelineReads>();
  constructor(slots: readonly SlotDef[] = BASE_SLOTS) { for (const s of slots) this.registerSlot(s); }
  registerChannel(def: ChannelDef): void { if (this.channels.has(def.id)) throw new Error(`material: channel "${def.id}" already registered`); this.channels.set(def.id, def); }
  channel(id: string): ChannelDef | undefined { return this.channels.get(id); }
  channelList(): ChannelDef[] { return [...this.channels.values()]; }
  registerSlot(def: SlotDef): void { if (this.slots.has(def.id)) throw new Error(`material: slot "${def.id}" already registered`); this.slots.set(def.id, def); }
  slot(id: string): SlotDef | undefined { return this.slots.get(id); }
  slotList(): SlotDef[] { return [...this.slots.values()]; }
  /** 按工艺登记翻译（一个工艺一份；再登记 = 抛，别在别处偷偷覆盖）。 */
  registerTranslation(craft: CraftTag, fn: Translation): void { if (this.translations.has(craft)) throw new Error(`material: translation for craft "${craft}" already registered`); this.translations.set(craft, fn); }
  /** 管线声明 reads；读了没登记的槽 = 抛（声明错了，不静默）。 */
  declareReads(p: PipelineReads): void {
    for (const r of p.reads) if (!this.slots.has(r)) throw new Error(`material: pipeline "${p.pipeline}" reads unregistered slot "${r}"`);
    this.pipelines.set(p.pipeline, p);
  }
  reads(pipeline: string): PipelineReads | undefined { return this.pipelines.get(pipeline); }
  /** 翻译一份语义材质：按它的工艺标签顺序套翻译（后者覆盖前者），没写的槽用默认；不认识的工艺跳过并报在 `unknown` 里（不静默）。 */
  translate(m: SemanticMaterial): { readonly slots: SlotValues; readonly unknown: readonly string[] } {
    const out: Record<string, SlotValue> = {};
    for (const s of this.slots.values()) out[s.id] = s.default;
    const unknown: string[] = [];
    for (const c of m.crafts) {
      const t = this.translations.get(c);
      if (!t) { unknown.push(c); continue; }
      for (const [k, v] of Object.entries(t(m))) { if (!this.slots.has(k)) throw new Error(`material: translation for "${c}" wrote unregistered slot "${k}"`); if (v !== undefined) out[k] = v; }
    }
    return { slots: out, unknown };
  }
}

/** 小学四个点名风格（T36）各读哪些槽——数据，Opus 填预设时照这张表要东西；白模 = 现状、零成本兜底。 */
export const GRADE_SCHOOL_READS: readonly PipelineReads[] = [
  { pipeline: "whiteModel", reads: ["unlit"] },
  { pipeline: "crtTron", reads: ["baseColor", "emissive", "edgeGlowColor", "edgeGlowStrength", "unlit"] },
  { pipeline: "bronze", reads: ["baseColor", "roughness", "metallic", "patinaColor", "cavity"] },
  { pipeline: "pixelOutline", reads: ["baseColor", "outlineColor", "toneSteps", "inkColor", "unlit"] },
  { pipeline: "papercut", reads: ["paperColor", "paperLayer", "paperThickness"] },
];

/** 现成的一份注册表：基础槽 + 小学四管线的 reads + 两个最薄的翻译（base：颜色进 baseColor；shadeless：unlit）。内容在这之上长。 */
export function createMaterialRegistry(): MaterialRegistry {
  const r = new MaterialRegistry();
  r.registerChannel({ id: "color", form: "both", doc: "颜色（每面一个色 / 一张贴图）" });
  r.registerTranslation("base", (m) => { const c = m.channels.color; return Array.isArray(c) && c.length === 3 ? { baseColor: [c[0], c[1], c[2]] as const } : {}; });
  r.registerTranslation("shadeless", () => ({ unlit: true }));
  for (const p of GRADE_SCHOOL_READS) r.declareReads(p);
  return r;
}
