import type { Command, MeshUnit } from "../commands/command.ts";
import type { Family } from "../commands/action.ts";
/** 连线（Blender J = Connect Vertex Path 的两点版；user 10-27「blender里面选择两个点之后ctrl j 是连线对吧」——是 J，Ctrl+J 是合并物体）：同一张面上的两个点之间切一刀。 */
export declare const connect: Command<MeshUnit>;
export declare const loopCut: Command<MeshUnit>;
/**
 * 插入（右键面的菜单版；工具栏「插入」/ I 键是拖着定宽度的手势版，两个入口同一条 op meshInset）。
 * user 10-27「右键的插入，切环不应该切到工具里面，插入好了应该还是之前的操作模式」「当时我们不是把tool和op解耦了吗」：右键 = 指令 + 马后炮改宽度，不换工具。
 * 宽度默认 = 最小那张面能收的五分之一（1 m 的面 ≈ 10 cm），取到毫米；网格体本地长度（在网格体里编辑时 = 上下文长度）。
 */
export declare const inset: Command<MeshUnit>;
/**
 * 设置原点到选择中心（user 10-27「自由建模里面设置原点怎么设置，右键 设置原点到选择中心好了。然后对齐旋转这个比较少见，以后慢慢想」）：
 * 选区的点的平均（= 移动 / 旋转 / 缩放的轴心）当这个网格体的新原点；朝向不动。一条 setAxes（和硬表面「改组件原点」同一条：几何反挪、每份实例补，世界里不动）。
 */
export declare const originToSelection: Command<MeshUnit>;
export declare const meshEdits: Family;
