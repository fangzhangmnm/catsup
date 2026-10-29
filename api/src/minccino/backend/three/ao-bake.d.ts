import type { Vec3 } from "../../contract/geometry.ts";
export declare const AO_DIRS = 20, AO_RES = 512, AO_TILES_X = 5, AO_TILES_Y = 4;
/** 着色器那半（GLSL3）：aoAt(p, n) = 0（全挡）…1（不挡）。依赖 uniform：uAoDepth / uAoVP / uAoDir / uAoR / uAoTiles / uAoRadius / uAoSoft。 */
export declare const AO_GLSL = "\n  uniform highp sampler2D uAoDepth;\n  uniform mat4 uAoVP[20]; uniform vec3 uAoDir[20];\n  uniform float uAoRadius, uAoSoft, uAoR; uniform vec2 uAoTiles;\n  vec2 aoTile(int k, vec2 uv) { float kf = float(k); return (vec2(mod(kf, uAoTiles.x), floor(kf / uAoTiles.x)) + clamp(uv, vec2(0.0), vec2(1.0))) / uAoTiles; }\n  float aoOcc(float D, float c0) { return step(0.01 + 0.03 * (1.0 - clamp(c0, 0.0, 1.0)), D) * (1.0 - smoothstep(0.25 * uAoRadius, uAoRadius, D)); }\n  float aoAt(vec3 p, vec3 n) {\n    const vec2 K[4] = vec2[4](vec2(0.75, 0.2), vec2(-0.2, 0.75), vec2(-0.75, -0.2), vec2(0.2, -0.75));\n    float s = 0.0, w = 0.0;\n    for (int k = 0; k < 20; k++) {\n      float c0 = dot(n, uAoDir[k]), c = max(c0, 0.0); c *= c;\n      if (c <= 0.0) continue;\n      vec3 q = (uAoVP[k] * vec4(p + n * 0.008 * uAoR, 1.0)).xyz * 0.5 + 0.5;\n      if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) { s += c; w += c; continue; }\n      float z = textureLod(uAoDepth, aoTile(k, q.xy), 0.0).r;\n      float D = z < 0.9999 ? (q.z - z) * 2.2 : -1.0;   // \u6B63\u4EA4\u6DF1\u5EA6\u8303\u56F4 2.2\uFF08\u573A\u666F\u534A\u5F84 = 1\uFF09\n      float occ = aoOcc(D, c0);\n      float rad = clamp(D, 0.0, uAoRadius) * 0.4 * uAoSoft / 2.1;\n      if (rad > 1.5 / 512.0) {\n        float a = float(k) * 2.39996, ca = cos(a), sa = sin(a);\n        for (int i = 0; i < 4; i++) {\n          vec2 o = mat2(ca, sa, -sa, ca) * K[i] * rad;\n          float zi = textureLod(uAoDepth, aoTile(k, q.xy + o), 0.0).r;\n          occ += aoOcc(zi < 0.9999 ? (q.z - zi) * 2.2 : -1.0, c0);\n        }\n        occ /= 5.0;\n      }\n      s += c * (1.0 - occ); w += c;\n    }\n    return w > 0.0 ? s / w : 1.0;\n  }";
/** 共享 uniform（所有读遮蔽的材质引用同一份对象：烘一次，大家都看见）。 */
export interface AoUniforms {
    uAoDepth: {
        value: any;
    };
    uAoVP: {
        value: any[];
    };
    uAoDir: {
        value: any[];
    };
    uAoR: {
        value: number;
    };
    uAoTiles: {
        value: any;
    };
}
export declare class AoBaker {
    readonly uniforms: AoUniforms;
    private rt;
    private readonly cam;
    private readonly depthOnly;
    private readonly dirs;
    /** 上次烘用了多少毫秒（血槽位 / 黑匣子）。 */
    lastMs: number;
    constructor();
    /** 把 scene 里第 0 层的东西从 20 个方向烘进图集。sphere = 场景包围球（世界坐标）。 */
    bake(renderer: any, scene: any, sphere: {
        c: Vec3;
        r: number;
    }): void;
    /** 显存（血槽位）：图集颜色 1 字节 + 深度 2 字节。 */
    bytes(): number;
    dispose(): void;
}
