import { type AoUniforms } from "./ao-bake.ts";
import type { EnvSky } from "./env-sky.ts";
import type { PbrShade, SurfaceLayer } from "../../preset/index.ts";
export declare class PbrMaterials {
    private readonly ao;
    private readonly env;
    private readonly depthFace;
    private readonly depthOther;
    private readonly depthSlope;
    private readonly light;
    private readonly mat;
    private readonly aoModel;
    private readonly aoGround;
    private readonly groundU;
    private readonly mats;
    readonly ground: any;
    constructor(ao: AoUniforms, env: EnvSky, depthFace: number, depthOther: number, depthSlope: number);
    private mapIds;
    private nextMapId;
    /** 这张贴图（uniform 对象）不要了：用它的那几个材质放掉（施工单十九第 1 刀：以前每张新图多一组材质、只加不删）。 */
    dropMap(map: {
        value: unknown;
    }): void;
    /** map = 贴图的 uniform 对象（后端的贴图缓存给，解码完换贴图时同一个对象里换值）；只有贴图网格、照模型上色时给。layers = 涂装车间的表面层（按顺序拼进着色器）。 */
    face(side: "front" | "back" | "double", active: boolean, single: boolean, sel?: boolean, map?: {
        value: unknown;
    } | null, layers?: readonly SurfaceLayer[]): any;
    /** 每帧：材质 / 光 / 遮蔽开没开 / 地面。sunWorld = 世界坐标的太阳方向（单位向量）。 */
    sync(p: PbrShade, layers: readonly SurfaceLayer[], modelColor: boolean, env: {
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
