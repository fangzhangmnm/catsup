// region-programs —— 区域程序（Region Programs）的 GLSL 源 + 封闭枚举（created 2026-09-18 by Claude Fable 5.1）。
//
// 提案与数学：ai-docs/20260918-region-programs-formalism-and-gpu-contract.md（§1 统一方程、§3 窄接口、§3.4 精度契约）。
// 纪律（ADR-0009 决定 5）：**每个 program 名在 soft-shaders.ts 有逐行镜像的 CPU 孪生**，缺 = SoftGl2Port.program() 响亮 throw。
//   改任一 GLSL 必须同步孪生；三方 golden（旧 CPU 引擎 fixture / SoftGl / 真 GL）是防漂移锚。
// 精度契约：W = straight u8（逐 dab 量化 = 旧 CPU 引擎 ImageData 语义）；cur / mask / accum / release = f32；
//   混色三档 = color-mix.ts 原式（GPU 直接 pow / cbrt / exp；CPU 孪生用 mixPremultIntoExact 同式）。
// 坐标约定：所有 pass 都是单位 quad gather（Gl2Port 动词面）。B×B 窗口目标用 u_size=(B,B)，texel = floor(v_uv·u_size)；
//   doc 尺寸目标（W）用 u_docSize，docPos = v_uv·u_docSize，写 W 时靠 scissor 限到裁过 doc 的窗口矩形。
//   窗口原点 u_origin=(ox,oy) 是整数（round(c) − half），doc 像素 p = origin + q。
//
// 第一批（手指三 variant）：
//   region-load        叶 tile-index + arena（straight u8）→ W 整幅
//   region-crop      W 窗口 → cur（premult f32；doc 外 = 0）——也用来给 accum 沾色（首 dab）
//   smudge-mask        falloff(dist, r, hardness) × 选区 → mask.r（与 gl-stamp 同式）
//   smudge-absorb      A' = mix(cur, A, ρ)（u_clip=1 时 doc 外像素保持 A）；1×1 时即 accumColor 更新
//   reduce-weighted    (src, mask) → k×k：which=0 Σ m·src(rgba) / which=1 Σ m(.r)；格子归属 = min(k−1, floor(x·k/B))
//   reduce-sum         k×k → 1×1 全和
//   divide             sum / w（w ≤ 0 → 0）→ 加权平均色（1×1）
//   box3               k×k：格归一 sum/w，活格（w>0）3×3 均值；死盒 → 0
//   upsample-bilinear  k×k box → B×B release（mask ≤ 0 → 0；盒活性 = 3×3 邻域有活格）
//   smudge-deposit     W 窗口 = straight(mix(cur, P, m·s))：P ∈ {accum, accumColor, release} ⊕ 掺色 ⊕ 稀释；lockAlpha
// 第二批（模糊 / 锐化 wash，本轮）：wash-coverage / unsharp / wash-lerp（加在文件末，首批落地后补）。
// 远景（连续形式 #1）：advect-segment——接口不动，只多一个名。

import type { Gl2Port } from "../../common/gl2-port.ts";
import { COMPOSITE_VERT } from "./blend-glsl.ts";
import { WARP_FUNCS } from "./gl-compositor.ts";

export const REGION_PROGRAM_IDS = [
  "region-load", "region-crop", "smudge-mask", "smudge-absorb",
  "reduce-weighted", "reduce-sum", "divide", "box3", "upsample-bilinear", "smudge-deposit",
  // 第二批（模糊 / 锐化 wash，2026-09-18 同轮；镜像 filters.ts 旧 attachColorBrushBehavior + sharpen-blur.ts bake）
  "wash-coverage", "wash-premult", "wash-box3", "wash-unpremult", "wash-sharpen", "wash-lerp",
  // 第三批（液化，2026-09-19，总账 #71；镜像 plugins/liquify-engine.ts 旧 CPU 版 = git e4e5aed 前）
  "field-copy", "liquify-accumulate", "liquify-warp",
] as const;
export type RegionProgramId = typeof REGION_PROGRAM_IDS[number];

// ---- 共用：混色三档（镜像 backend/algorithms/color-mix.ts mixPremultIntoExact；u_space 0=srgb 1=oklab 2=spectral）----
const MIX_GLSL = `
float s2l(float c){ return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float l2s(float c){ float v = clamp(c, 0.0, 1.0); return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055; }
float cbrt1(float x){ return sign(x) * pow(abs(x), 1.0 / 3.0); }
vec3 lrgb2oklab(vec3 c){
  float l = cbrt1(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b);
  float m = cbrt1(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b);
  float s = cbrt1(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
              1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
              0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklab2lrgb(vec3 lab){
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  float l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return clamp(vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), 0.0, 1.0);
}
const float WGM_EPS = 0.001;
const float SR[10] = float[10](0.009281362787953, 0.009732627042016, 0.011254252737167, 0.015105578649573, 0.024797924177217, 0.083622585502406, 0.977865045723212, 1.000000000000000, 0.999961046144372, 0.999999992756822);
const float SG[10] = float[10](0.002854127435775, 0.003917589679914, 0.012132151699187, 0.748259205918013, 1.000000000000000, 0.865695937531795, 0.037477469241101, 0.022816789725717, 0.021747419446456, 0.021384940572308);
const float SB[10] = float[10](0.537052150373386, 0.546646402401469, 0.575501819073983, 0.258778829633924, 0.041709923751716, 0.012662638828324, 0.007485593127390, 0.006766900622462, 0.006699764779016, 0.006676219883241);
const float T0[10] = float[10](0.026595621243689, 0.049779426257903, 0.022449850859496, -0.218453689278271, -0.256894883201278, 0.445881722194840, 0.772365886289756, 0.194498761382537, 0.014038157587820, 0.007687264480513);
const float T1[10] = float[10](-0.032601672674412, -0.061021043498478, -0.052490001018404, 0.206659098273522, 0.572496335158169, 0.317837248815438, -0.021216624031211, -0.019387668756117, -0.001521339050858, -0.000835181622534);
const float T2[10] = float[10](0.339475473216284, 0.635401374177222, 0.771520797089589, 0.113222640692379, -0.055251113343776, -0.048222578468680, -0.012966666339586, -0.001523814504223, -0.000094718948810, -0.000051604594741);
vec3 spectralMix(vec3 la, vec3 lb, float f){
  float off = 1.0 - WGM_EPS;
  vec3 A = la * off + WGM_EPS, Bc = lb * off + WGM_EPS;
  float u = 1.0 - f;
  float r = 0.0, g = 0.0, b = 0.0;
  for (int i = 0; i < 10; i++) {
    float sa = SR[i] * A.r + SG[i] * A.g + SB[i] * A.b;
    float sb = SR[i] * Bc.r + SG[i] * Bc.g + SB[i] * Bc.b;
    float sm = exp(u * log(sa) + f * log(sb));
    r += T0[i] * sm; g += T1[i] * sm; b += T2[i] * sm;
  }
  return clamp(vec3((r - WGM_EPS) / off, (g - WGM_EPS) / off, (b - WGM_EPS) / off), 0.0, 1.0);
}
vec4 mixPremult(vec4 a, vec4 b, float t, int space){
  if (t <= 0.0) return a;
  if (t >= 1.0) return b;
  if (space == 0) return a * (1.0 - t) + b * t;
  float aa = a.a, ab = b.a;
  float wa = (1.0 - t) * aa, wb = t * ab;
  float A = wa + wb;
  if (A <= 1e-6) return vec4(0.0);
  float f = wb / A;
  vec3 la = aa > 1e-6 ? vec3(s2l(a.r / aa), s2l(a.g / aa), s2l(a.b / aa)) : vec3(0.0);
  vec3 lb = ab > 1e-6 ? vec3(s2l(b.r / ab), s2l(b.g / ab), s2l(b.b / ab)) : vec3(0.0);
  vec3 lin;
  if (f <= 1e-6) lin = la;
  else if (f >= 1.0 - 1e-6) lin = lb;
  else if (space == 1) {
    vec3 A1 = lrgb2oklab(la), B1 = lrgb2oklab(lb);
    float u = 1.0 - f;
    float L = A1.x * u + B1.x * f;
    float ca = A1.y * u + B1.y * f;
    float cb = A1.z * u + B1.z * f;
    float Ca = length(A1.yz), Cb = length(B1.yz);
    float Ct = Ca * u + Cb * f;
    float Cm = length(vec2(ca, cb));
    if (Cm > 1e-5 && Ct > Cm) { float k = Ct / Cm; ca *= k; cb *= k; }
    lin = oklab2lrgb(vec3(L, ca, cb));
  } else {
    lin = spectralMix(la, lb, f);
  }
  return vec4(l2s(lin.r) * A, l2s(lin.g) * A, l2s(lin.b) * A, A);
}
`;

const HEAD = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 o;
`;

// ---- region-load：叶 tile → W（doc 尺寸 straight u8）。sampleTiled 与 blend-glsl 同式（256 = TILE_SIZE 字面量同步）。----
const REGION_LOAD_FRAG = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 v_uv;
out vec4 o;
uniform sampler2DArray u_arr;
uniform highp sampler2D u_srcIndex;
uniform vec2 u_docSize;
vec4 sampleTiled(highp sampler2D index, vec2 docPos){
  ivec2 tc = ivec2(floor(docPos / 256.0));
  float slice = texelFetch(index, tc, 0).r;
  if (slice < 0.0) return vec4(0.0);
  vec2 local = (docPos - vec2(tc) * 256.0) / 256.0;
  return texture(u_arr, vec3(local, slice));
}
void main(){ o = sampleTiled(u_srcIndex, v_uv * u_docSize); }`;

// ---- region-crop：W 窗口 → cur（premult f32；doc 外 0）----
const REGION_CROP_FRAG = HEAD + `
uniform vec2 u_size;      // (B,B)
uniform vec2 u_origin;    // (ox,oy) 整数
uniform vec2 u_docSize;
uniform sampler2D u_W;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  ivec2 p = ivec2(u_origin) + q;
  if (p.x < 0 || p.y < 0 || p.x >= int(u_docSize.x) || p.y >= int(u_docSize.y)) { o = vec4(0.0); return; }
  vec4 s = texelFetch(u_W, p, 0);
  o = vec4(s.rgb * s.a, s.a);
}`;

// ---- smudge-mask：falloff × 选区（镜像 smudge-engine _dab 的 mask 循环）----
const SMUDGE_MASK_FRAG = HEAD + `
uniform vec2 u_size;
uniform vec2 u_origin;
uniform vec2 u_docSize;
uniform vec2 u_center;    // (cx,cy) 浮点
uniform float u_r;
uniform float u_innerR;
uniform int u_hasSel;
uniform sampler2D u_sel;  // r8 gray8（选区 bbox 平面）
uniform vec2 u_selOrigin;
uniform vec2 u_selSize;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  ivec2 p = ivec2(u_origin) + q;
  if (p.x < 0 || p.y < 0 || p.x >= int(u_docSize.x) || p.y >= int(u_docSize.y)) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float ddx = float(p.x) + 0.5 - u_center.x, ddy = float(p.y) + 0.5 - u_center.y;
  float dist = sqrt(ddx * ddx + ddy * ddy);
  if (dist >= u_r) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float m = 1.0;
  float decay = u_r - u_innerR;
  if (decay > 0.0 && dist > u_innerR) { float u = (dist - u_innerR) / decay; m = 1.0 - u * u * (3.0 - 2.0 * u); }
  if (u_hasSel == 1) {
    ivec2 sp = p - ivec2(u_selOrigin);
    if (sp.x < 0 || sp.y < 0 || sp.x >= int(u_selSize.x) || sp.y >= int(u_selSize.y)) m = 0.0;
    else m *= texelFetch(u_sel, sp, 0).r;
  }
  o = vec4(m, 0.0, 0.0, 1.0);
}`;

// ---- smudge-absorb：A' = mix(cur, A, ρ)；u_clip=1 → doc 外像素保持 A（手指探出画布不沾透明）----
const SMUDGE_ABSORB_FRAG = HEAD + MIX_GLSL + `
uniform vec2 u_size;
uniform vec2 u_origin;
uniform vec2 u_docSize;
uniform int u_clip;
uniform int u_space;
uniform float u_rho;
uniform sampler2D u_A;
uniform sampler2D u_cur;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  vec4 A = texelFetch(u_A, q, 0);
  if (u_clip == 1) {
    ivec2 p = ivec2(u_origin) + q;
    if (p.x < 0 || p.y < 0 || p.x >= int(u_docSize.x) || p.y >= int(u_docSize.y)) { o = A; return; }
  }
  vec4 c = texelFetch(u_cur, q, 0);
  o = mixPremult(c, A, u_rho, u_space);
}`;

// ---- reduce-weighted：(src, mask) → k×k 格和。格归属 = min(k−1, floor(x·(k/B)))（镜像 _multiRes；k=16 时给全平均的第一级）----
const REDUCE_WEIGHTED_FRAG = HEAD + `
uniform vec2 u_size;      // (k,k)
uniform float u_B;
uniform int u_which;      // 0 = Σ m·src（rgba）；1 = Σ m（.r）
uniform sampler2D u_src;
uniform sampler2D u_mask;
void main(){
  ivec2 c = ivec2(floor(v_uv * u_size));
  int k = int(u_size.x), B = int(u_B);
  float scale = float(k) / u_B;
  int x0 = max(0, int(floor(float(c.x) / scale)) - 1), y0 = max(0, int(floor(float(c.y) / scale)) - 1);
  int x1 = (c.x == k - 1) ? B : min(B, int(ceil(float(c.x + 1) / scale)) + 1);
  int y1 = (c.y == k - 1) ? B : min(B, int(ceil(float(c.y + 1) / scale)) + 1);
  vec4 acc = vec4(0.0);
  for (int y = y0; y < y1; y++) {
    if (min(k - 1, int(floor(float(y) * scale))) != c.y) continue;
    for (int x = x0; x < x1; x++) {
      if (min(k - 1, int(floor(float(x) * scale))) != c.x) continue;
      float m = texelFetch(u_mask, ivec2(x, y), 0).r;
      if (m <= 0.0) continue;
      if (u_which == 0) acc += texelFetch(u_src, ivec2(x, y), 0) * m; else acc.r += m;
    }
  }
  o = acc;
}`;

// ---- reduce-sum：k×k → 1×1 全和 ----
const REDUCE_SUM_FRAG = HEAD + `
uniform vec2 u_srcSize;
uniform sampler2D u_src;
void main(){
  vec4 acc = vec4(0.0);
  int w = int(u_srcSize.x), h = int(u_srcSize.y);
  for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) acc += texelFetch(u_src, ivec2(x, y), 0);
  o = acc;
}`;

// ---- divide：sum / w → 加权平均（w ≤ 0 → 0；镜像 _weightedAverage 尾）----
const DIVIDE_FRAG = HEAD + `
uniform sampler2D u_sum;
uniform sampler2D u_w;
void main(){
  vec4 s = texelFetch(u_sum, ivec2(0), 0);
  float w = texelFetch(u_w, ivec2(0), 0).r;
  o = (w <= 0.0) ? vec4(0.0) : s / w;
}`;

// ---- box3：格归一 + 活格 3×3 均值（镜像 _multiRes 中段）----
const BOX3_FRAG = HEAD + `
uniform vec2 u_size;      // (k,k)
uniform sampler2D u_sum;
uniform sampler2D u_w;
void main(){
  ivec2 c = ivec2(floor(v_uv * u_size));
  int k = int(u_size.x);
  vec4 acc = vec4(0.0);
  int cnt = 0;
  for (int dy = -1; dy <= 1; dy++) {
    int yy = c.y + dy; if (yy < 0 || yy >= k) continue;
    for (int dx = -1; dx <= 1; dx++) {
      int xx = c.x + dx; if (xx < 0 || xx >= k) continue;
      float w = texelFetch(u_w, ivec2(xx, yy), 0).r;
      if (w <= 0.0) continue;
      acc += texelFetch(u_sum, ivec2(xx, yy), 0) / w;
      cnt++;
    }
  }
  o = (cnt > 0) ? acc / float(cnt) : vec4(0.0);
}`;

// ---- upsample-bilinear：k×k box → B×B release（镜像 _multiRes 尾；盒活性 = 3×3 邻域内有活格）----
const UPSAMPLE_BILINEAR_FRAG = HEAD + `
uniform vec2 u_size;      // (B,B)
uniform float u_k;
uniform sampler2D u_box;
uniform sampler2D u_w;    // k×k Σm（活格判定）
uniform sampler2D u_mask; // B×B
bool boxLive(int ii, int jj, int k){
  for (int dy = -1; dy <= 1; dy++) { int yy = jj + dy; if (yy < 0 || yy >= k) continue;
    for (int dx = -1; dx <= 1; dx++) { int xx = ii + dx; if (xx < 0 || xx >= k) continue;
      if (texelFetch(u_w, ivec2(xx, yy), 0).r > 0.0) return true; } }
  return false;
}
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  float m = texelFetch(u_mask, q, 0).r;
  if (m <= 0.0) { o = vec4(0.0); return; }
  int k = int(u_k);
  float scale = u_k / u_size.x;
  float u = (float(q.x) + 0.5) * scale - 0.5, v = (float(q.y) + 0.5) * scale - 0.5;
  float fu = u - floor(u), fv = v - floor(v);
  int i0 = int(floor(u)), j0 = int(floor(v));
  vec4 acc = vec4(0.0);
  float wt = 0.0;
  for (int dj = 0; dj <= 1; dj++) {
    int jj = min(k - 1, max(0, j0 + dj)); float wv = (dj == 1) ? fv : 1.0 - fv;
    for (int di = 0; di <= 1; di++) {
      int ii = min(k - 1, max(0, i0 + di)); float w = ((di == 1) ? fu : 1.0 - fu) * wv;
      if (w <= 0.0 || !boxLive(ii, jj, k)) continue;
      acc += texelFetch(u_box, ivec2(ii, jj), 0) * w; wt += w;
    }
  }
  o = (wt > 0.0) ? acc / wt : vec4(0.0);
}`;

// ---- smudge-deposit：W 窗口 = straight(mix(cur, P, m·s))（镜像 _dab 2)+3)；scissor = 裁过 doc 的窗口）----
const SMUDGE_DEPOSIT_FRAG = HEAD + MIX_GLSL + `
uniform vec2 u_docSize;
uniform vec2 u_origin;
uniform float u_strength;
uniform float u_colorRate;
uniform float u_dilEff;
uniform int u_lock;
uniform int u_space;
uniform int u_Psel;       // 0 = accum(B×B) 1 = accumColor(1×1) 2 = release(B×B)
uniform vec4 u_paint;     // premult 画笔色（α=1）
uniform sampler2D u_cur;
uniform sampler2D u_mask;
uniform sampler2D u_P;
uniform sampler2D u_avg;  // 1×1（稀释用 ā）
void main(){
  ivec2 p = ivec2(floor(v_uv * u_docSize));
  ivec2 q = p - ivec2(u_origin);
  float m = texelFetch(u_mask, q, 0).r;
  if (m <= 0.0) discard;
  float a = m * u_strength;
  vec4 cur = texelFetch(u_cur, q, 0);
  float ca = cur.a;
  if (u_lock == 1 && ca <= 0.0) discard;
  vec4 P = (u_Psel == 1) ? texelFetch(u_P, ivec2(0), 0) : texelFetch(u_P, q, 0);
  if (u_colorRate > 0.0) P = mixPremult(P, u_paint, u_colorRate, u_space);
  float dilF = 1.0;
  if (u_dilEff > 0.0) { float avgA = clamp(texelFetch(u_avg, ivec2(0), 0).a, 0.0, 1.0); dilF = 1.0 - u_dilEff * (1.0 - avgA); }
  if (dilF < 1.0) P *= dilF;
  vec4 n = mixPremult(cur, P, a, u_space);
  float na = n.a;
  vec3 nrgb = n.rgb;
  if (u_lock == 1) {
    if (na > 1e-6) nrgb *= ca / na; else nrgb = vec3(0.0);
    na = ca;
  }
  o = (na <= 1e-6) ? vec4(0.0) : vec4(nrgb / na, na);
}`;

// ============================================================================
// 第二批：模糊 / 锐化 wash（镜像 filters.ts 旧 _cbComposite ①②③ + plugins/sharpen-blur.ts bake / _boxBlur3Premul / _gaussianBlur3）
//   数值单位跟 CPU 走：字节域（texel×255），premult = byte·(a/255)，alpha 通道 0..255；clamp8 = 截断（v|0），GLSL 用 floor。
//   coverage 存 doc 尺寸 u8 的 alpha（CPU 是 f32；量化到 1/255 是有意的偏差，行为契约测试仍成立）。
// ============================================================================

// ---- wash-coverage：cov = max(cov, stampA·flow·sel)（blend max-alpha；scissor = dab bbox；dist > R → discard）----
const WASH_COVERAGE_FRAG = HEAD + `
uniform vec2 u_docSize;
uniform vec2 u_center;
uniform float u_R;
uniform float u_innerR;
uniform float u_flow;
uniform int u_hasSel;
uniform sampler2D u_sel;
uniform vec2 u_selOrigin;
uniform vec2 u_selSize;
void main(){
  ivec2 p = ivec2(floor(v_uv * u_docSize));
  float ddx = float(p.x) + 0.5 - u_center.x, ddy = float(p.y) + 0.5 - u_center.y;
  float dist = sqrt(ddx * ddx + ddy * ddy);
  if (dist > u_R) discard;
  float stampA = 1.0;
  if (dist > u_innerR) { float u = (dist - u_innerR) / (u_R - u_innerR); stampA = 1.0 - u * u * (3.0 - 2.0 * u); }
  float a = stampA * u_flow;
  if (u_hasSel == 1) {
    ivec2 sp = p - ivec2(u_selOrigin);
    if (sp.x < 0 || sp.y < 0 || sp.x >= int(u_selSize.x) || sp.y >= int(u_selSize.y)) a = 0.0;
    else a *= texelFetch(u_sel, sp, 0).r;
  }
  o = vec4(0.0, 0.0, 0.0, a);
}`;

// ---- wash-premult：W0 区域 → premult f32（字节单位：rgb·(a/255)，alpha 0..255）----
const WASH_PREMULT_FRAG = HEAD + `
uniform vec2 u_size;
uniform vec2 u_origin;
uniform sampler2D u_W0;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  vec4 s = texelFetch(u_W0, ivec2(u_origin) + q, 0) * 255.0;
  float a = s.a / 255.0;
  o = vec4(s.rgb * a, s.a);
}`;

// ---- wash-box3：premult 3×3 盒（区域边缘 clamp；镜像 _boxBlur3Premul，mask=null）----
const WASH_BOX3_FRAG = HEAD + `
uniform vec2 u_size;
uniform sampler2D u_src;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  int w = int(u_size.x), h = int(u_size.y);
  vec4 acc = vec4(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    int sy = q.y + dy < 0 ? 0 : (q.y + dy >= h ? h - 1 : q.y + dy);
    for (int dx = -1; dx <= 1; dx++) {
      int sx = q.x + dx < 0 ? 0 : (q.x + dx >= w ? w - 1 : q.x + dx);
      acc += texelFetch(u_src, ivec2(sx, sy), 0);
    }
  }
  o = acc / 9.0;
}`;

// ---- wash-unpremult：premult f32 区域 → straight u8（a≤0：保原字节、alpha 0；clamp8 = 截断）----
const WASH_UNPREMULT_FRAG = HEAD + `
uniform vec2 u_size;
uniform vec2 u_origin;
uniform sampler2D u_src;
uniform sampler2D u_W0;
float clamp8(float v){ return v < 0.0 ? 0.0 : (v > 255.0 ? 255.0 : floor(v)); }
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  vec4 s = texelFetch(u_src, q, 0);
  vec4 orig = texelFetch(u_W0, ivec2(u_origin) + q, 0) * 255.0;
  float a = s.a;
  if (a <= 0.0) { o = vec4(orig.rgb / 255.0, 0.0); return; }
  float inv = 255.0 / a;
  o = vec4(clamp8(s.r * inv), clamp8(s.g * inv), clamp8(s.b * inv), clamp8(a)) / 255.0;
}`;

// ---- wash-sharpen：luma-only USM（高斯 3×3 字节截断 + 阈值 4 + 同 delta 三通道；k=0 = 原样）；区域边缘 clamp ----
const WASH_SHARPEN_FRAG = HEAD + `
uniform vec2 u_size;
uniform vec2 u_origin;
uniform float u_k;
uniform sampler2D u_W0;
float clamp8(float v){ return v < 0.0 ? 0.0 : (v > 255.0 ? 255.0 : floor(v)); }
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  int w = int(u_size.x), h = int(u_size.y);
  ivec2 org = ivec2(u_origin);
  vec4 s = texelFetch(u_W0, org + q, 0) * 255.0;
  vec4 acc = vec4(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    int sy = q.y + dy < 0 ? 0 : (q.y + dy >= h ? h - 1 : q.y + dy);
    for (int dx = -1; dx <= 1; dx++) {
      int sx = q.x + dx < 0 ? 0 : (q.x + dx >= w ? w - 1 : q.x + dx);
      float kw = (dx == 0 ? 2.0 : 1.0) * (dy == 0 ? 2.0 : 1.0);
      acc += texelFetch(u_W0, org + ivec2(sx, sy), 0) * 255.0 * kw;
    }
  }
  vec3 bl = floor(acc.rgb / 16.0);
  float luma = 0.2126 * s.r + 0.7152 * s.g + 0.0722 * s.b;
  float lumaB = 0.2126 * bl.r + 0.7152 * bl.g + 0.0722 * bl.b;
  float diff = luma - lumaB;
  vec3 rgb;
  if (abs(diff) < 4.0) rgb = s.rgb;
  else { float delta = u_k * diff; rgb = vec3(clamp8(s.r + delta), clamp8(s.g + delta), clamp8(s.b + delta)); }
  o = vec4(rgb, s.a) / 255.0;
}`;

// ---- wash-lerp：W = lerp(W0, baked, cov)（premult 权重；镜像 _cbComposite ③；scissor = dab 覆盖 bbox）----
const WASH_LERP_FRAG = HEAD + `
uniform vec2 u_docSize;
uniform vec2 u_origin;      // baked 区域原点（ex0, ey0）
uniform sampler2D u_W0;
uniform sampler2D u_dst;
uniform sampler2D u_cov;
void main(){
  ivec2 p = ivec2(floor(v_uv * u_docSize));
  float a = texelFetch(u_cov, p, 0).a;
  vec4 src = texelFetch(u_W0, p, 0) * 255.0;
  if (a <= 0.0) { o = src / 255.0; return; }
  vec4 d = texelFetch(u_dst, p - ivec2(u_origin), 0) * 255.0;
  float la = src.a / 255.0, fa = d.a / 255.0;
  float na = la * (1.0 - a) + fa * a;
  if (na <= 0.0) { o = vec4(0.0); return; }
  float wl = (la * (1.0 - a)) / na, wf = (fa * a) / na;
  o = vec4(src.rgb * wl + d.rgb * wf, na * 255.0) / 255.0;
}`;

// ============================================================================
// 第三批：液化（镜像旧 liquify-engine.ts extendStroke (a)(b)(c) + bilinearSample / bicubicSamplePremult / sampleSplinePremult）
//   位移场 = 区域尺寸 rgba f32（.rg = dx,dy），按笔迹包围盒增长（field-copy 搬旧场）；每事件：accumulate B←A（scissor footprint）
//   → field-copy A←B（同 scissor）→ 每叶 liquify-warp 写 W（scissor footprint，全写不 discard——CPU 整块 putImageData）。
//   采样核按液化自己的 CPU 原式（bilinear 越界 tap=0 而非 clamp，与 GL warp 采样器不同，故不借 sampleSrc）；spline 借 WARP_FUNCS.sampleSpline。
//   坐标：像素 = 整数 doc 坐标（无 +0.5，CPU 同）；源矩形 u_srcRect = 叶起笔内容框（CPU 快照 bbox：框外 tap = 0 / nearest 不写）。
// ============================================================================

// ---- field-copy：dst(q) = src(q − offset)（越界 0）——场增长搬旧场 / B→A 拷回 ----
const FIELD_COPY_FRAG = HEAD + `
uniform vec2 u_size;
uniform vec2 u_offset;
uniform vec2 u_srcSize;
uniform sampler2D u_src;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  ivec2 s = q - ivec2(u_offset);
  if (s.x < 0 || s.y < 0 || s.x >= int(u_srcSize.x) || s.y >= int(u_srcSize.y)) { o = vec4(0.0); return; }
  o = texelFetch(u_src, s, 0);
}`;

// ---- liquify-accumulate：圈内 d += 模式位移（reconstruct：d *= 1−α）；圈外原样 ----
const LIQUIFY_ACCUMULATE_FRAG = HEAD + `
uniform vec2 u_size;      // 场尺寸
uniform vec2 u_origin;    // 场原点（doc 整数）
uniform vec2 u_center;    // (cx,cy) doc 浮点
uniform float u_R;
uniform float u_strength;
uniform int u_mode;       // 0 push 1 pinch 2 bloat 3 twirl 4 twirlCW 5 reconstruct
uniform vec2 u_vel;
uniform sampler2D u_A;
void main(){
  ivec2 q = ivec2(floor(v_uv * u_size));
  vec2 d = texelFetch(u_A, q, 0).rg;
  float wx = float(q.x) + u_origin.x, wy = float(q.y) + u_origin.y;
  float dxc = wx - u_center.x, dyc = wy - u_center.y;
  float r2 = dxc * dxc + dyc * dyc;
  float R2 = u_R * u_R;
  if (r2 < R2) {
    float r = sqrt(r2);
    float t = 1.0 - r / u_R;
    float ff = t * t * (3.0 - 2.0 * t);
    if (u_mode == 5) {
      float alpha = min(1.0, ff * u_strength);
      d *= (1.0 - alpha);
    } else {
      vec2 dd;
      if (u_mode == 1) dd = vec2(-dxc * ff * u_strength, -dyc * ff * u_strength);
      else if (u_mode == 2) dd = vec2(dxc * ff * u_strength, dyc * ff * u_strength);
      else if (u_mode == 3) dd = vec2(-dyc * ff * u_strength, dxc * ff * u_strength);
      else if (u_mode == 4) dd = vec2(dyc * ff * u_strength, -dxc * ff * u_strength);
      else dd = vec2(u_vel.x * ff * u_strength, u_vel.y * ff * u_strength);
      d += dd;
    }
  }
  o = vec4(d, 0.0, 0.0);
}`;

// ---- liquify-warp：W(p) = 采样 W0 于 p − d(p)（选区 / bleed 三模式 / 四核；字节单位）----
const LIQUIFY_WARP_FRAG = HEAD + WARP_FUNCS + `
uniform vec2 u_docSize;
uniform vec2 u_fieldOrigin;
uniform sampler2D u_field;
uniform sampler2D u_W0;
uniform vec4 u_srcRect;   // 叶起笔内容框 (x,y,w,h)：框外 tap = 0；nearest 框外不写（=0）
uniform int u_sample;     // 0 nearest 1 bilinear 2 bicubic 3 spline
uniform int u_bleed;      // 0 import 1 clip 2 edge
uniform int u_hasSel;
uniform sampler2D u_sel;
uniform vec2 u_selOrigin;
uniform vec2 u_selSize;
uniform sampler2D u_plane;    // spline 系数平面（rgba16f，PAD=8）
uniform vec2 u_planeSize;     // 逻辑尺寸 = 内容框 w,h
float rnd(float x){ return floor(x + 0.5); }
bool cellIn(int ix, int iy){
  int sx = ix - int(u_selOrigin.x), sy = iy - int(u_selOrigin.y);
  if (sx < 0 || sy < 0 || sx >= int(u_selSize.x) || sy >= int(u_selSize.y)) return false;
  return texelFetch(u_sel, ivec2(sx, sy), 0).r * 255.0 >= 127.5;
}
bool inMask(float px, float py){ return cellIn(int(rnd(px)), int(rnd(py))); }
bool srcFootprintIn(float fsx, float fsy){
  int ix = int(floor(fsx)), iy = int(floor(fsy));
  return cellIn(ix, iy) && cellIn(ix + 1, iy) && cellIn(ix, iy + 1) && cellIn(ix + 1, iy + 1);
}
bool inRect(int x, int y){ return x >= int(u_srcRect.x) && x < int(u_srcRect.x + u_srcRect.z) && y >= int(u_srcRect.y) && y < int(u_srcRect.y + u_srcRect.w); }
vec4 fetchB(int x, int y){ return texelFetch(u_W0, ivec2(x, y), 0) * 255.0; }   // 字节单位（调用方保证 inRect）
float crK(float t){ float A = -0.5; float at = abs(t); if (at < 1.0) return (A + 2.0) * at * at * at - (A + 3.0) * at * at + 1.0; if (at < 2.0) return A * at * at * at - 5.0 * A * at * at + 8.0 * A * at - 4.0 * A; return 0.0; }
void main(){
  ivec2 p = ivec2(floor(v_uv * u_docSize));
  int wx = p.x, wy = p.y;
  vec2 d = texelFetch(u_field, p - ivec2(u_fieldOrigin), 0).rg;
  float tdx = d.x, tdy = d.y;
  float srcX = float(wx) - tdx, srcY = float(wy) - tdy;
  if (u_hasSel == 1) {
    if (!inMask(float(wx), float(wy))) { srcX = float(wx); srcY = float(wy); }
    else if (u_bleed != 0 && !srcFootprintIn(srcX, srcY)) {
      if (u_bleed == 1) { srcX = float(wx); srcY = float(wy); }
      else {
        float len = sqrt(tdx * tdx + tdy * tdy);
        if (len >= 1e-3) {
          float dirX = -tdx / len, dirY = -tdy / len;
          int maxK = min(int(ceil(len)), 4096);
          int sxi = wx, syi = wy;
          for (int k = 1; k <= maxK; k++) {
            int rxi = int(rnd(float(wx) + dirX * float(k)));
            int ryi = int(rnd(float(wy) + dirY * float(k)));
            if (!cellIn(rxi, ryi)) break;
            sxi = rxi; syi = ryi;
          }
          srcX = float(sxi); srcY = float(syi);
        } else { srcX = float(wx); srcY = float(wy); }
      }
    }
  }
  if (u_sample == 3) {
    o = sampleSpline(u_plane, u_planeSize, srcX - u_srcRect.x, srcY - u_srcRect.y);
    return;
  }
  if (u_sample == 0) {
    int nx = int(rnd(srcX)), ny = int(rnd(srcY));
    o = inRect(nx, ny) ? fetchB(nx, ny) / 255.0 : vec4(0.0);
    return;
  }
  int ix = int(floor(srcX)), iy = int(floor(srcY));
  if (u_sample == 1) {
    float fx = srcX - float(ix), fy = srcY - float(iy);
    float pr = 0.0, pg = 0.0, pb = 0.0, pa = 0.0;
    float wts[4]; wts[0] = (1.0 - fx) * (1.0 - fy); wts[1] = fx * (1.0 - fy); wts[2] = (1.0 - fx) * fy; wts[3] = fx * fy;
    ivec2 offs[4]; offs[0] = ivec2(0, 0); offs[1] = ivec2(1, 0); offs[2] = ivec2(0, 1); offs[3] = ivec2(1, 1);
    for (int k = 0; k < 4; k++) {
      float wt = wts[k]; int px = ix + offs[k].x, py = iy + offs[k].y;
      if (wt == 0.0 || !inRect(px, py)) continue;
      vec4 c = fetchB(px, py);
      float af = (c.a / 255.0) * wt;
      pr += c.r * af; pg += c.g * af; pb += c.b * af; pa += c.a * wt;
    }
    if (pa < 1e-4) { o = vec4(0.0); return; }
    float afSum = pa / 255.0;
    o = vec4(pr / afSum, pg / afSum, pb / afSum, pa) / 255.0;
    return;
  }
  // bicubic（Catmull-Rom + 反振铃 + round）
  float r = 0.0, g = 0.0, b = 0.0, a = 0.0;
  for (int j = 0; j < 4; j++) {
    int yy = iy - 1 + j; if (!(yy >= int(u_srcRect.y) && yy < int(u_srcRect.y + u_srcRect.w))) continue;
    float wy = crK(float(yy) - srcY);
    if (wy == 0.0) continue;
    for (int i = 0; i < 4; i++) {
      int xx = ix - 1 + i; if (!(xx >= int(u_srcRect.x) && xx < int(u_srcRect.x + u_srcRect.z))) continue;
      float wgt = crK(float(xx) - srcX) * wy;
      if (wgt == 0.0) continue;
      vec4 c = fetchB(xx, yy);
      float av = c.a;
      r += c.r * av * wgt; g += c.g * av * wgt; b += c.b * av * wgt; a += av * wgt;
    }
  }
  float n00 = inRect(ix, iy) ? fetchB(ix, iy).a : 0.0;
  float n10 = inRect(ix + 1, iy) ? fetchB(ix + 1, iy).a : 0.0;
  float n01 = inRect(ix, iy + 1) ? fetchB(ix, iy + 1).a : 0.0;
  float n11 = inRect(ix + 1, iy + 1) ? fetchB(ix + 1, iy + 1).a : 0.0;
  float acl = max(min(min(n00, n10), min(n01, n11)), min(max(max(n00, n10), max(n01, n11)), a));
  if (acl != a && a > 1e-4) { float sc = acl / a; r *= sc; g *= sc; b *= sc; a = acl; }
  if (a < 1e-4) { o = vec4(0.0); return; }
  o = vec4(rnd(clamp(r / a, 0.0, 255.0)), rnd(clamp(g / a, 0.0, 255.0)), rnd(clamp(b / a, 0.0, 255.0)), rnd(clamp(a, 0.0, 255.0))) / 255.0;
}`;

const FRAGS: Record<RegionProgramId, string> = {
  "region-load": REGION_LOAD_FRAG,
  "region-crop": REGION_CROP_FRAG,
  "smudge-mask": SMUDGE_MASK_FRAG,
  "smudge-absorb": SMUDGE_ABSORB_FRAG,
  "reduce-weighted": REDUCE_WEIGHTED_FRAG,
  "reduce-sum": REDUCE_SUM_FRAG,
  "divide": DIVIDE_FRAG,
  "box3": BOX3_FRAG,
  "upsample-bilinear": UPSAMPLE_BILINEAR_FRAG,
  "smudge-deposit": SMUDGE_DEPOSIT_FRAG,
  "wash-coverage": WASH_COVERAGE_FRAG,
  "wash-premult": WASH_PREMULT_FRAG,
  "wash-box3": WASH_BOX3_FRAG,
  "wash-unpremult": WASH_UNPREMULT_FRAG,
  "wash-sharpen": WASH_SHARPEN_FRAG,
  "wash-lerp": WASH_LERP_FRAG,
  "field-copy": FIELD_COPY_FRAG,
  "liquify-accumulate": LIQUIFY_ACCUMULATE_FRAG,
  "liquify-warp": LIQUIFY_WARP_FRAG,
};

/** 确保 id 已在 port 注册（幂等；SoftGl2Port 在此核对 CPU 孪生，缺 = throw）。 */
export function ensureRegionProgram(port: Gl2Port, id: RegionProgramId): void {
  port.program(id, COMPOSITE_VERT, FRAGS[id]);
}
/** 一次同步注册全部（对表测试 / gl-smoke 入口；产品路径不再在起笔时调——RegionStroke.run 按需 ensure，2026-09-19）。 */
export function ensureAllRegionPrograms(port: Gl2Port): void {
  for (const id of REGION_PROGRAM_IDS) ensureRegionProgram(port, id);
}
/** 非阻塞预编译一个（有 warmProgram 走它，否则退化为同步 program）。分片暖场的原子（GLBoard.warmUp 每个空闲片两个）。 */
export function warmRegionProgram(port: Gl2Port, id: RegionProgramId): void {
  if (port.warmProgram) port.warmProgram(id, COMPOSITE_VERT, FRAGS[id]);
  else port.program(id, COMPOSITE_VERT, FRAGS[id]);
}
/** 非阻塞预编译全部（gl-smoke 用；产品路径走 GLBoard.warmUp 分片，不一次全起——user 2026-09-19「启动速度是更重要的」）。 */
export function warmAllRegionPrograms(port: Gl2Port): void {
  for (const id of REGION_PROGRAM_IDS) warmRegionProgram(port, id);
}
/** 只读：GLSL 源（gl-smoke / 调试）。 */
export function regionProgramSource(id: RegionProgramId): { vert: string; frag: string } {
  return { vert: COMPOSITE_VERT, frag: FRAGS[id] };
}
