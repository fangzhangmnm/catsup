export declare const ENV_W = 1024, ENV_H = 512, ENV_MAX_LOD: number;
/** 9 个球谐系数（实验室 projectSH 原式）。px = RGBA 浮点、w × h、按行；第 j 行 = θ (j + 0.5)π/h。 */
export declare function projectSH(px: Float32Array, w: number, h: number): Float32Array;
export declare class EnvSky {
    /** 共享 uniform：环境图、最大 mip 级、球谐（有没有算出来）。 */
    readonly uniforms: {
        uEnv: {
            value: any;
        };
        uEnvMaxLod: {
            value: number;
        };
        uSH: {
            value: any[];
        };
        uHasSH: {
            value: boolean;
        };
    };
    private rt;
    private key;
    private readonly scene;
    private readonly cam;
    private readonly mat;
    /** 上次烘用了多少毫秒。 */
    lastMs: number;
    constructor();
    /** 太阳（实验室坐标，单位向量）变了才重烘；真烘了返回 true（血槽位按它记次数 / 毫秒）。 */
    ensure(renderer: any, sunLab: readonly [number, number, number]): boolean;
    bytes(): number;
    dispose(): void;
}
