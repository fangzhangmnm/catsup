import type { BlendMode, SourceKind } from "./blend-glsl.ts";
import type { IndexTexture } from "./gpu-tile-pool.ts";
import type { Gl2Port, Gl2Texture, Gl2TexSource, Gl2TileArena, PooledFBO, FBOPrec } from "../../common/gl2-port.ts";
export interface OverlayDesc {
    tex: Gl2TexSource;
    opacity: number;
    erase: boolean;
    blendMode: BlendMode;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
    lockAlpha?: boolean;
    selMask?: {
        tex: Gl2Texture;
        ox: number;
        oy: number;
        ow: number;
        oh: number;
    } | null;
    replace?: boolean;
}
export interface FloatDesc {
    tex: Gl2Texture;
    srcW: number;
    srcH: number;
    hinv: number[];
    mode: number;
}
export type Background = [number, number, number, number] | "checker";
export interface Acc {
    read: PooledFBO;
    write: PooledFBO;
}
export declare const WARP_FUNCS = "   // 2026-09-19 export\uFF1Aregion-programs \u7684 liquify-warp \u590D\u7528 sampleSpline\uFF08B \u6837\u6761\u4FDD\u9510\u6838\uFF09\nfloat cubicK(float t){\n  float a = -0.5;\n  float at = abs(t);\n  if (at < 1.0) return (a+2.0)*at*at*at - (a+3.0)*at*at + 1.0;\n  if (at < 2.0) return a*at*at*at - 5.0*a*at*at + 8.0*a*at - 4.0*a;\n  return 0.0;\n}\n// \u4E09\u6B21 B \u6837\u6761\u6838\uFF08mode 3 \u9884\u6EE4\u6CE2\u6837\u6761\uFF1B\u9010\u4F4D\u5BF9\u9F50 src/bspline.ts \u7684 b3\uFF09\nfloat bsp3(float t){\n  float at = abs(t);\n  if (at < 1.0) return 2.0/3.0 - at*at + at*at*at*0.5;\n  if (at < 2.0) { float u = 2.0 - at; return u*u*u/6.0; }\n  return 0.0;\n}\n// mode 3\uFF1A\u9884\u6EE4\u6CE2 B \u6837\u6761\u91C7\u6837\u3002tex = \u7CFB\u6570\u7EB9\u7406\uFF08RGBA16F\uFF0Cpremult\u30010..255 \u5C3A\u5EA6\u3001PAD=8 \u8FB9\u8DDD\uFF0C\n//   \u89C1 src/bspline.ts prefilterToSplinePlane\uFF09\uFF1Bsize = \u903B\u8F91\u6E90\u5C3A\u5BF8\u3002\u7CFB\u6570\u5DF2 premult \u2192 \u76F4\u63A5\u7D2F\u52A0\u3002\nvec4 sampleSpline(sampler2D tex, vec2 size, float sx, float sy){\n  const float PAD = 8.0;   // = BSPLINE_PAD\n  int PW = int(size.x) + 16, PH = int(size.y) + 16;\n  float cx = sx + PAD, cy = sy + PAD;\n  int ix = int(floor(cx)), iy = int(floor(cy));\n  float kx[4], ky[4];\n  for (int i=0;i<4;i++){ kx[i]=bsp3(float(ix-1+i)-cx); ky[i]=bsp3(float(iy-1+i)-cy); }\n  float r=0.0,g=0.0,b=0.0,a=0.0;\n  float ca[16];\n  for (int t=0;t<16;t++) ca[t]=0.0;\n  for (int j=0;j<4;j++){\n    int yy = iy-1+j; if (yy<0||yy>=PH) continue;\n    for (int i=0;i<4;i++){\n      int xx = ix-1+i; if (xx<0||xx>=PW) continue;\n      vec4 c = texelFetch(tex, ivec2(xx,yy), 0);\n      float ww = kx[i]*ky[j];\n      r += c.r*ww; g += c.g*ww; b += c.b*ww; a += c.a*ww;\n      ca[j*4+i] = c.a;\n    }\n  }\n  if (a < 1.0e-4) return vec4(0.0);            // 0..255 \u5C3A\u5EA6\u9608\u503C\uFF08\u5BF9\u9F50 CPU\uFF09\n  // \u53CD\u632F\u94C3\u9650\u5E45\uFF08v0.6.43\uFF0Cuser \u65B9\u6848 A\uFF09\uFF1A\u6E90 \u03B1 \u5728\u4E2D\u592E 2\u00D72 \u6574\u70B9\u7684\u503C = \u7CFB\u6570 3\u00D73 \u00D7 B3 \u6574\u70B9\u6743 [1,4,1]/6\n  //   \u91CD\u5EFA\uFF1B\u03B1 clamp \u8FDB [min,max]\uFF0Cpremult RGB \u7B49\u6BD4\u7F29 \u2192 C=r/\u03B1 \u6BD4\u503C\u4E0D\u52A8\uFF08\u96F6\u8272\u504F\uFF09\uFF0C\u53EA\u6740\u8D1F\u74E3\u8FC7\u51B2\n  //   \uFF08\u534A\u900F\u660E\u7B14\u753B\u65CB\u8F6C\u8FB9\u7F18\"\u53D8\u6DF1\"\u75C5\u6839\uFF09\u3002\u6574\u70B9\u91C7\u6837\u65F6 a=\u6574\u70B9\u503C \u2208 \u57DF\u5185 \u2192 \u6052 no-op\uFF0Cidentity \u65E0\u635F\u4FDD\u6301\u3002\n  float na[4];\n  for (int v=0; v<2; v++) for (int u=0; u<2; u++) {\n    float acc = 0.0;\n    for (int dv=-1; dv<=1; dv++) for (int du=-1; du<=1; du++) {\n      acc += ca[(v+1+dv)*4 + (u+1+du)] * ((du==0?4.0:1.0)/6.0) * ((dv==0?4.0:1.0)/6.0);\n    }\n    na[v*2+u] = acc;\n  }\n  float amin = min(min(na[0],na[1]),min(na[2],na[3]));\n  float amax = max(max(na[0],na[1]),max(na[2],na[3]));\n  float acl = clamp(a, amin, amax);\n  if (acl != a) { float sc = acl / a; r*=sc; g*=sc; b*=sc; a=acl; }\n  if (a < 1.0e-4) return vec4(0.0);\n  // \u7CFB\u6570\u5C3A\u5EA6\uFF1Argb=C\u00B7\u03B1(0..255\u00B7\u03B1)\u3001a=255\u03B1 \u2192 r/a = \u5F52\u4E00\u76F4\u503C\uFF0Ca/255 = \u5F52\u4E00 alpha\n  return vec4(clamp(r/a,0.0,1.0), clamp(g/a,0.0,1.0), clamp(b/a,0.0,1.0), clamp(a/255.0,0.0,1.0));\n}\n// \u8FD4\u56DE**\u76F4\u503C** RGBA\uFF08\u4E0E CPU \u91C7\u6837\u5668\u8F93\u51FA\u540C\uFF1Argb \u53CD\u9884\u4E58\u3001a \u94B3\uFF09\u3002sampler/size/mode \u53C2\u6570\u5316 \u2192 \u6E90\u4E0E\u57FA\u5E95\u5171\u7528\u3002\nvec4 sampleSrc(sampler2D tex, vec2 size, int mode, float sx, float sy){\n  if (mode == 3) return sampleSpline(tex, size, sx, sy);\n  int W = int(size.x), H = int(size.y);\n  int ix = int(floor(sx)), iy = int(floor(sy));\n  if (mode == 0){                                    // nearest\uFF1A\u8D8A\u754C\u900F\u660E\n    if (ix < 0 || ix >= W || iy < 0 || iy >= H) return vec4(0.0);\n    return texelFetch(tex, ivec2(ix, iy), 0);\n  } else if (mode == 1){                             // bilinear\uFF1Areplicate-edge clamp\uFF0Cpremult \u63D2\u503C\n    float fx = sx - float(ix), fy = sy - float(iy);\n    if (ix < -1 || ix >= W || iy < -1 || iy >= H) return vec4(0.0);\n    int x0 = clamp(ix, 0, W-1), x1 = clamp(ix+1, 0, W-1);\n    int y0 = clamp(iy, 0, H-1), y1 = clamp(iy+1, 0, H-1);\n    vec4 c00 = texelFetch(tex, ivec2(x0,y0), 0), c10 = texelFetch(tex, ivec2(x1,y0), 0);\n    vec4 c01 = texelFetch(tex, ivec2(x0,y1), 0), c11 = texelFetch(tex, ivec2(x1,y1), 0);\n    float w00=(1.0-fx)*(1.0-fy), w10=fx*(1.0-fy), w01=(1.0-fx)*fy, w11=fx*fy;\n    float a = c00.a*w00 + c10.a*w10 + c01.a*w01 + c11.a*w11;\n    if (a < 4.0e-7) return vec4(0.0);                // CPU a<1e-4(0..255 \u5C3A) \u2248 a<3.9e-7(0..1)\n    vec3 pm = c00.rgb*c00.a*w00 + c10.rgb*c10.a*w10 + c01.rgb*c01.a*w01 + c11.rgb*c11.a*w11;\n    return vec4(pm / a, a);\n  }\n  // bicubic\uFF1A4\u00D74 Catmull-Rom\uFF0C\u8D8A\u754C tap \u4E22\u5F03\uFF08\u8D21\u732E 0\uFF09\uFF0Cpremult \u7D2F\u52A0 \u2192 \u53CD\u9884\u4E58\n  float kx[4], ky[4];\n  for (int i=0;i<4;i++){ kx[i]=cubicK(float(ix-1+i)-sx); ky[i]=cubicK(float(iy-1+i)-sy); }\n  float r=0.0,g=0.0,b=0.0,a=0.0;\n  for (int j=0;j<4;j++){\n    int yy = iy-1+j; if (yy<0||yy>=H) continue;\n    for (int i=0;i<4;i++){\n      int xx = ix-1+i; if (xx<0||xx>=W) continue;\n      vec4 c = texelFetch(tex, ivec2(xx,yy), 0);\n      float av = c.a, ww = kx[i]*ky[j];\n      r += c.r*av*ww; g += c.g*av*ww; b += c.b*av*ww; a += av*ww;\n    }\n  }\n  // \u53CD\u632F\u94C3\u9650\u5E45\uFF08v0.6.43\uFF0Cuser \u65B9\u6848 A\uFF09\uFF1A\u03B1 clamp \u8FDB\u4E2D\u592E 2\u00D72 texel [min,max]\uFF08\u8D8A\u754C=0\uFF09\uFF0C\n  //   premult RGB \u7B49\u6BD4\u7F29 \u2192 \u96F6\u8272\u504F\uFF0C\u53EA\u6740 Catmull-Rom \u8D1F\u74E3\u8FC7\u51B2\u3002\n  float n00 = (ix  >=0&&ix  <W&&iy  >=0&&iy  <H) ? texelFetch(tex, ivec2(ix,  iy  ), 0).a : 0.0;\n  float n10 = (ix+1>=0&&ix+1<W&&iy  >=0&&iy  <H) ? texelFetch(tex, ivec2(ix+1,iy  ), 0).a : 0.0;\n  float n01 = (ix  >=0&&ix  <W&&iy+1>=0&&iy+1<H) ? texelFetch(tex, ivec2(ix,  iy+1), 0).a : 0.0;\n  float n11 = (ix+1>=0&&ix+1<W&&iy+1>=0&&iy+1<H) ? texelFetch(tex, ivec2(ix+1,iy+1), 0).a : 0.0;\n  float acl = clamp(a, min(min(n00,n10),min(n01,n11)), max(max(n00,n10),max(n01,n11)));\n  if (acl != a && a > 4.0e-7) { float sc = acl / a; r*=sc; g*=sc; b*=sc; a=acl; }\n  float aOut = clamp(a, 0.0, 1.0);\n  if (a < 4.0e-7) return vec4(0.0);\n  return vec4(clamp(r/a,0.0,1.0), clamp(g/a,0.0,1.0), clamp(b/a,0.0,1.0), aOut);\n}\n// doc \u50CF\u7D20 \u2192 \u67D0\u6D6E\u5C42\u6E90 (u,v)\uFF0C\u843D [0,1]\u00B2 \u91C7\u6837\u76F4\u503C\uFF0C\u5426\u5219\u900F\u660E\uFF08quad \u5916\uFF09\u3002\n// u*size \u662F edge \u7EA6\u5B9A\uFF08texel i \u5360 [i,i+1)\uFF09\uFF1Anearest \u7684 floor(sx) \u5929\u7136\u543B\u5408\uFF1Bbilinear/bicubic \u5185\u6838\n// \u6309 center \u7EA6\u5B9A\uFF08texel \u4E2D\u5FC3\u5728\u6574\u6570\uFF09\u63D2\u503C \u2192 \u5582 sx-0.5\uFF0C\u5426\u5219 identity \u65F6 fx=0.5 = \u534A texel \u76F8\u4F4D\u9519\n// \uFF08lift \u4E00\u77AC\u95F4\u5C31\u7CCA + 0.5px \u5DE6\u4E0A\u79FB\u7684\u6839\u56E0\uFF09\u3002\u4FEE\u540E identity/\u6574\u6570\u5E73\u79FB\u4E0B\u4E09\u79CD\u6A21\u5F0F\u90FD\u9010 texel \u7CBE\u786E\u3002\nvec4 warpSample(sampler2D tex, vec2 size, mat3 hinv, int mode, vec2 docXY){\n  vec3 uvw = hinv * vec3(docXY, 1.0);\n  if (abs(uvw.z) < 1.0e-9) return vec4(0.0);\n  float u = uvw.x / uvw.z, v = uvw.y / uvw.z;\n  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return vec4(0.0);\n  float off = (mode == 0) ? 0.0 : 0.5;\n  return sampleSrc(tex, size, mode, u * size.x - off, v * size.y - off);\n}";
export interface ScreenGridBg {
    bg: [number, number, number];
    dot: [number, number, number];
    stepPx: number;
    radiusPx: number;
}
export declare class GLCompositor {
    private _glctx;
    private _prec;
    readonly stats: {
        passes: number;
        floatPasses: number;
    };
    constructor(glctx: Gl2Port, accumPrec?: FBOPrec);
    private _ensureProgram;
    begin(_docW: number, _docH: number, resetStats?: boolean): void;
    end(): void;
    newAcc(docW: number, docH: number, bg?: Background): Acc;
    finishAcc(acc: Acc): PooledFBO;
    returnFBO(f: PooledFBO): void;
    private _drawChecker;
    pass(arena: Gl2TileArena, srcKind: SourceKind, srcIndex: IndexTexture | null, groupTex: Gl2TexSource | null, mode: BlendMode, opacity: number, clipIndex: IndexTexture | null, acc: Acc, docW: number, docH: number, overlay?: OverlayDesc | null, clipTex?: Gl2TexSource | null): void;
    floatPass(f: FloatDesc, acc: Acc, docW: number, docH: number, clipBase?: FloatDesc | null): void;
    presentTo(srcTex: Gl2TexSource, target: PooledFBO, w: number, h: number, unpremult?: boolean): void;
    presentToScreenAffine(srcTex: Gl2TexSource, docW: number, docH: number, affine: number[], canvasW: number, canvasH: number, smooth?: boolean, clearColor?: [number, number, number, number] | null, over?: boolean): void;
    drawScreenBg(grid: ScreenGridBg, canvasW: number, canvasH: number): void;
    warpToBytes(srcCanvas: {
        data: Float32Array;
        w: number;
        h: number;
    } | {
        data: Uint8ClampedArray;
        w: number;
        h: number;
    }, srcW: number, srcH: number, hinv: number[], mode: number, bx: number, by: number, bw: number, bh: number): {
        data: Uint8ClampedArray;
        w: number;
        h: number;
        dstX: number;
        dstY: number;
    } | null;
}
