export type FBOPrec = "u8" | "f16" | "f32";
export interface Gl2Caps {
    maxTextureSize: number;
    maxArrayLayers: number;
    maxTextureUnits: number;
    floatColorBuffer: boolean;
}
export interface PooledFBO {
    readonly w: number;
    readonly h: number;
    readonly prec: FBOPrec;
}
export interface Gl2Texture {
    readonly kind: "tex2d";
}
export type TexUploadFormat = "rgba8" | "rgba16f" | "r8" | "r32f";
export type Gl2Blend = "none" | "premult-over" | "max-alpha";
export type Gl2TexSource = Gl2Texture | PooledFBO | Gl2TileArena;
export interface Gl2DrawSpec {
    program: string;
    target: PooledFBO | "screen";
    viewport?: [number, number, number, number];
    clear?: [number, number, number, number];
    scissor?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    blend?: Gl2Blend;
    uniforms?: Record<string, number | boolean | number[] | Float32Array>;
    textures?: Record<string, Gl2TexSource | {
        src: Gl2TexSource;
        filter: "nearest" | "linear";
    }>;
}
export interface Gl2TileArena {
    readonly kind: "arena";
    readonly tileSize: number;
    readonly capacity: number;
    recreate(newCapacity: number): void;
    uploadSlice(slice: number, pixels: Uint8Array): void;
    copySlice(from: PooledFBO, slice: number, srcX: number, srcY: number, w: number, h: number): void;
    dispose(): void;
}
export interface Gl2Port {
    readonly caps: Gl2Caps;
    readonly isLost: boolean;
    readonly generation: number;
    onInvalidated(cb: () => void): void;
    program(name: string, vert?: string, frag?: string): void;
    warmProgram?(name: string, vert: string, frag: string): void;
    borrowFBO(w: number, h: number, prec?: FBOPrec): PooledFBO;
    returnFBO(f: PooledFBO): void;
    clearPool(): void;
    readonly fboPoolStats: {
        count: number;
        bytes: number;
    };
    fboPoolHas?(w: number, h: number, prec: FBOPrec): boolean;
    readonly fboPoolBudgetBytes?: number;
    clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void;
    draw(spec: Gl2DrawSpec): void;
    drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void;
    readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array;
    createTexture(): Gl2Texture;
    uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void;
    deleteTexture(tex: Gl2Texture): void;
    createTileArena(tileSize: number, initialSlices: number): Gl2TileArena;
    readonly arenaStats: {
        count: number;
        bytes: number;
    };
}
