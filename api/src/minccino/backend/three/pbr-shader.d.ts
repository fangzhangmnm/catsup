import { type AoUniforms } from "./ao-bake.ts";
import type { EnvSky } from "./env-sky.ts";
import type { PbrShade } from "../../preset/index.ts";
export declare class PbrMaterials {
    private readonly ao;
    private readonly env;
    private readonly depthFace;
    private readonly depthOther;
    private readonly light;
    private readonly mat;
    private readonly aoModel;
    private readonly aoGround;
    private readonly groundU;
    private readonly mats;
    readonly ground: any;
    constructor(ao: AoUniforms, env: EnvSky, depthFace: number, depthOther: number);
    private mapIds;
    private nextMapId;
    /** map = 贴图的 uniform 对象（后端的贴图缓存给，解码完换贴图时同一个对象里换值）；只有贴图网格、照模型上色时给。 */
    face(side: "front" | "back" | "double", active: boolean, single: boolean, sel?: boolean, map?: {
        value: unknown;
    } | null): any;
    /** 每帧：材质 / 光 / 遮蔽开没开 / 地面。sunWorld = 世界坐标的太阳方向（单位向量）。 */
    sync(p: PbrShade, modelColor: boolean, env: {
        amount: number;
        exposure: number;
    }, sunWorld: {
        x: number;
        y: number;
        z: number;
    }, ao: {
        amount: number;
        radius: number;
        groundRadius: number;
        soft: number;
    } | null, aoReady: boolean, ground: {
        color: number;
        on: number;
    } | null, cam: any, fade: {
        x: number;
        y: number;
        z: number;
    }): void;
    hide(): void;
    dispose(): void;
}
