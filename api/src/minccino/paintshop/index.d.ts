export { projectSH } from "./sh.ts";
/** 环境配方：`fn` = `vec3 fn(vec3 dir, vec3 sunDir)`，线性 HDR；坐标按实验室 y 朝上（后端读的时候转）。 */
export interface EnvRecipe {
    readonly kind: "env";
    readonly name: string;
    readonly source: string;
    readonly glsl: string;
    readonly fn: string;
}
/** 表面配方：`fn` = `void fn(inout Surface s, float amount, vec3 color)`，改 s 里的法线 / 底色（线性）/ 粗糙 / 金属；s.occl 是世界空间遮蔽（0 全挡…1）。 */
export interface SurfaceRecipe {
    readonly kind: "surface";
    readonly name: string;
    readonly source: string;
    readonly glsl: string;
    readonly fn: string;
}
/** 表面配方共用的：Surface 结构 + 值噪声（实验室 core.js GLSL.NOISE 原式）。P = 场景半径 = 1 的坐标（实验室的模型先归一化）。 */
export declare const SURFACE_PRELUDE = "\n  struct Surface { vec3 P; vec3 N; vec3 base; float rough; float metal; float occl; };\n  float hash31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }\n  float vnoise3(vec3 p) {\n    vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);\n    return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), u.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), u.x), u.y),\n               mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), u.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), u.x), u.y), u.z);\n  }";
export declare const ENV_RECIPES: {
    readonly "sky-sea": EnvRecipe;
};
export declare const SURFACE_RECIPES: {
    readonly "sand-cast": SurfaceRecipe;
    readonly patina: SurfaceRecipe;
};
export type EnvRecipeId = keyof typeof ENV_RECIPES;
export type SurfaceRecipeId = keyof typeof SURFACE_RECIPES;
