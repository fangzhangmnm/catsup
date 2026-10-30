import { type EnvRecipeId } from "../../paintshop/index.ts";
export declare const ENV_W = 1024, ENV_H = 512, ENV_MAX_LOD: number;
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
    private recipe;
    /** 上次烘用了多少毫秒。 */
    lastMs: number;
    constructor();
    /** 配方或太阳（实验室坐标，单位向量）变了才重烘；真烘了返回 true（血槽位按它记次数 / 毫秒）。 */
    ensure(renderer: any, recipe: EnvRecipeId, sunLab: readonly [number, number, number]): boolean;
    bytes(): number;
    /** 只放显存（环境图）；对象留着，下次 ensure 重烘（换走写实 / 铸铜闲置一阵后由 render3 调）。 */
    release(): void;
    dispose(): void;
}
