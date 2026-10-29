// minccino/paintshop/ —— 涂装车间：程序生成的环境（天空盒）和表面纹理（砂铸、铜绿…）的「配方」——半代码半资源：一段 GLSL + 出处。
// 引擎的后端照配方生成（环境图）或在着色器里调用（表面纹理），风格只按 id 引用、按顺序叠。user 10-29 深夜「做一个涂装车间的文件夹，procedural的天空盒，
// 以后的procedural 纹理，放里面……你看一下要不要热加载热插拔。以及严格控制体重」。created 2026-10-29 by Claude Opus 5.5
//
// 插拔：加一个配方 = 这个文件夹里一个文件 + 下面表里一行；扔一个 = 删文件 + 删行。单测（test/minccino-preset.test.ts）盯「风格引用的 id 都在表里」。
// 热加载：现在不做运行时热加载——整个车间是几 KB 的着色器字符串，单独拆包省不了什么，反而要动打包（拆块）和离线壳（多缓存几个文件）。
// 等车间里出现**烤好的二进制资源**（天空图、贴图集、烘好的程序纹理）时，那些按 id 用到才下载、带哈希（和模型包同一套），那才是热加载的点。
// 不碰 three、不碰 DOM：只有字符串和纯函数（守卫 ② ③）；后端照着跑。
import { SKY_SEA } from "./sky-sea.ts";
import { SAND_CAST } from "./sand-cast.ts";
import { PATINA } from "./patina.ts";
export { projectSH } from "./sh.ts";

/** 环境配方：`fn` = `vec3 fn(vec3 dir, vec3 sunDir)`，线性 HDR；坐标按实验室 y 朝上（后端读的时候转）。 */
export interface EnvRecipe { readonly kind: "env"; readonly name: string; readonly source: string; readonly glsl: string; readonly fn: string }
/** 表面配方：`fn` = `void fn(inout Surface s, float amount, vec3 color)`，改 s 里的法线 / 底色（线性）/ 粗糙 / 金属；s.occl 是世界空间遮蔽（0 全挡…1）。 */
export interface SurfaceRecipe { readonly kind: "surface"; readonly name: string; readonly source: string; readonly glsl: string; readonly fn: string }

/** 表面配方共用的：Surface 结构 + 值噪声（实验室 core.js GLSL.NOISE 原式）。P = 场景半径 = 1 的坐标（实验室的模型先归一化）。 */
export const SURFACE_PRELUDE = /* glsl */`
  struct Surface { vec3 P; vec3 N; vec3 base; float rough; float metal; float occl; };
  float hash31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  float vnoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), u.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), u.x), u.y),
               mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), u.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
  }`;

export const ENV_RECIPES = { "sky-sea": SKY_SEA } as const satisfies Record<string, EnvRecipe>;
export const SURFACE_RECIPES = { "sand-cast": SAND_CAST, patina: PATINA } as const satisfies Record<string, SurfaceRecipe>;
export type EnvRecipeId = keyof typeof ENV_RECIPES;
export type SurfaceRecipeId = keyof typeof SURFACE_RECIPES;
