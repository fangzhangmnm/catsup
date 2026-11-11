import type { Gl2Port, Gl2Caps, FBOPrec, PooledFBO, Gl2Texture, Gl2TileArena, Gl2DrawSpec, TexUploadFormat } from "../common/gl2-port.ts";
export declare class SoftGl2Port implements Gl2Port {
    readonly caps: Gl2Caps;
    readonly isLost = false;
    readonly generation = 0;
    private _invalidated;
    private _programs;
    private _fboPool;
    onInvalidated(cb: () => void): void;
    warmProgram(name: string, vert: string, frag: string): void;
    program(name: string, _vert?: string, _frag?: string): void;
    borrowFBO(w: number, h: number, prec?: FBOPrec): PooledFBO;
    returnFBO(f: PooledFBO): void;
    fboPoolHas(w: number, h: number, prec: FBOPrec): boolean;
    get fboPoolBudgetBytes(): number;
    clearPool(): void;
    get fboPoolStats(): {
        count: number;
        bytes: number;
    };
    clearFBO(f: PooledFBO, rgba: [number, number, number, number]): void;
    draw(spec: Gl2DrawSpec): void;
    drawInstanced(spec: Gl2DrawSpec, instances: Float32Array, count: number): void;
    private _drawCommon;
    readPixels(src: PooledFBO, x: number, y: number, w: number, h: number): Uint8Array;
    createTexture(): Gl2Texture;
    uploadTexture(tex: Gl2Texture, format: TexUploadFormat, w: number, h: number, data: ArrayBufferView): void;
    deleteTexture(tex: Gl2Texture): void;
    private _arenas;
    createTileArena(tileSize: number, initialSlices: number): Gl2TileArena;
    get arenaStats(): {
        count: number;
        bytes: number;
    };
}
