/** 网格体的列（保留名 + 贴图坐标那两列；那两列的名字只在 scene/uv.ts 写，守卫 paint-start-guard）→ 显示名。 */
export declare const MESH_NAMES: Readonly<Record<string, string>>;
/** 硬表面体的层（挂在哪 + 层名）→ 显示名。 */
export declare const BREP_NAMES: Readonly<Record<string, string>>;
/** 两边意思相同、用同一个显示名的（网格体的列名 ↔ 硬表面的「挂在哪:层名」）。 */
export declare const SYNONYMS: readonly {
    readonly label: string;
    readonly mesh: readonly string[];
    readonly brep: readonly string[];
}[];
/** 网格体一列的显示：中文名 + 原名（小灰字）；不认识的 = 原样的名字、不另带原名。 */
export declare function meshAttrName(id: string): {
    label: string;
    code: string | null;
};
/** 硬表面一层的显示：中文名，不带原名；不认识的层 = 原样的名字。 */
export declare function brepAttrName(on: "edge" | "face", id: string): string;
/** 类型的说法：布尔 = 是 / 否，整数 = 整数，每个几个小数（columns.ts typeName：bool / int / floats:n）。 */
export declare function typeSay(type: string): string;
/** 大小：B / KB / MB。 */
export declare function bytesSay(n: number): string;
