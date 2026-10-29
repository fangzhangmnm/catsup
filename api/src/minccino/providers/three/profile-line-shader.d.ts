/** 对 LineMaterial 顶点着色器的四处替换（只换第一处，和以前 onBeforeCompile 的 String.replace 一样）。 */
export declare const PROFILE_PATCHES: readonly (readonly [string, string])[];
/** 把替换套到一份 LineMaterial 顶点着色器源上（守卫 / 生成脚本共用）。 */
export declare function applyProfilePatches(src: string): string;
export declare const PROFILE_LINE_VERTEX: string;
