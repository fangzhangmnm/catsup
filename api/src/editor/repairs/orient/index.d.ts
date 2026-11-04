import type { Command, PoolUnit } from "../../commands/command.ts";
/** 翻面：选中的面两侧的值互换（几何不动）。 */
export declare const flipSides: Command<PoolUnit>;
/** 统一朝向：以选中的面为准，沿连着的面灌。 */
export declare const orientUnify: Command<PoolUnit>;
/** 自动朝外：猜外侧（带符号体积 + 够不够鼓）。 */
export declare const orientOutward: Command<PoolUnit>;
