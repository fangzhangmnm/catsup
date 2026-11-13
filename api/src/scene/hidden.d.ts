import type { Scene } from "./scene.ts";
export interface HiddenCount {
    instances: number;
    faces: number;
    edges: number;
}
/** 整个场景里藏着的：组件份数 + 面 + 边（视图菜单「全部显示（N）」）。 */
export declare function hiddenCount(s: Scene): HiddenCount;
/** 全部放回来（op unhideAll 的身子；改的是传进来的场景）。 */
export declare function showEverything(s: Scene): void;
