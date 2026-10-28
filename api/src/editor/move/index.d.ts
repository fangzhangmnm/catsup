import type { Command, MeshUnit, ObjectUnit, PoolUnit } from "../commands/command.ts";
import type { Family } from "../commands/action.ts";
/** 挪 SU 点：选区解成点集（边的两端、膜的环、单点），每点 from → from + d，按坐标寻址（结算机会再合并 / 折面）。 */
export declare const brepMove: Command<PoolUnit>;
/** 挪网格点：选区解成点集（边的两端、面的环、单点），写位置数组；id 按数组制度稳定、克隆保号，直接按 id 寻址。 */
export declare const meshMove: Command<MeshUnit>;
/** 挪物体：这一份实例的变换矩阵左乘平移（它所在那个定义的坐标里）。 */
export declare const objectMove: Command<ObjectUnit>;
export declare const move: Family;
