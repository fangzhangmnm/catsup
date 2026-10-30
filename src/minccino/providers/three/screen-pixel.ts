// minccino/backend/three/screen-pixel.ts —— 风格那条路的两遍全屏：像素描边（后处理挂点）+ 整数倍最近邻放大（屏幕一刀的第一块屏）。
// 像素描边的 GLSL 照实验室公用件 `ShaderLab.pixelOutline`（lab/core.js，user 10-28 调过的判法和线色）移植；改的只有两处：
//   ① CatsUp 有正交相机：内部深度跳变的「按对面那格外推」在透视下用 1/z（屏幕上仿射）、正交下用 z 本身（也仿射）；透视那支和实验室逐字一样。
//   ② 背景格：实验室靠清屏色，这里小图清成全零、背景色在这遍补上（渲染目标里 three 不给背景做色彩换算，自己补最稳）。
// 描边那遍把小图的深度一起写进描边后的那张（gl_FragDepth）：排在描边之后画的辅助几何（stage 1）照样被模型挡。
// 放大那遍按需把小图的深度写回画布：只有这一帧有原分辨率的辅助几何（resolution native，缺省没有）才写——不写省一遍全屏深度带宽。
// 放大两种外观（屏幕一刀）：none = 最近邻；crt-tv = 实验室 lab/app.js SCREEN_FS 的 CRT 电视（复合视频的色度横糊、电子束横向连续、荧光粉的晕、
// 越亮越粗的扫描线、荫罩三色条、四角暗、关着的荧光屏是深灰）——**弧面先不弯**：叠加层和拾取还没接屏幕的逆变换（不变量 6），弯了就对不上。
// created 2026-10-29 by Claude Opus 5.5（Tron 纪元第 1 步）
import * as THREE from "three";
import type { DitherPost, PixelOutlinePost } from "../../preset/index.ts";

const FULLSCREEN_VS = /* glsl */`
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const OUTLINE_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uCol, uDepth;
  uniform vec3 uLineCol, uBg;
  uniform float uLineTint, uNear, uFar, uLineMul;
  uniform bool uInner, uDarkSide, uOrtho, uOn, uInside, uBgTex, uDither;
  uniform vec3 uDark, uLight;
  uniform int uWidth;
  #define SLOPE_TOL 3.0
  layout(location = 0) out vec4 oColor;   // three r185 的 GLSL3 不再替你定义 gl_FragColor，自己声明输出
  // 两色抖动（1-bit）：亮度按墨 → 纸那一段归一，和 4×4 Bayer 阈值比，亮 = uLight、暗 = uDark
  vec4 dither(vec4 c, ivec2 p) {
    if (!uDither) return c;
    const float B[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    float t = (B[(p.y & 3) * 4 + (p.x & 3)] + 0.5) / 16.0;
    vec3 L = vec3(0.299, 0.587, 0.114);
    float y = (dot(c.rgb, L) - dot(uDark, L)) / max(dot(uLight, L) - dot(uDark, L), 1e-3);   // 按「墨 → 纸」这一段量：纸色 = 全亮、墨色 = 全暗，中间才抖
    return vec4(y > t ? uLight : uDark, 1.0);
  }
  float viewZ(float d) { if (uOrtho) return uNear + d * (uFar - uNear); float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / ((uFar + uNear) - z * (uFar - uNear)); }
  // 墨线：模型的边画进小图时透明通道写 0（render3 那几份线材质：不混合、不透明度 0），面 / 网格 / 背景都是 1
  bool inkAt(ivec2 q) { return texelFetch(uCol, q, 0).a < 0.25 && texelFetch(uDepth, q, 0).r < 1.0; }
  vec4 colAt(ivec2 q, float dq) { return dq < 1.0 || uBgTex ? texelFetch(uCol, q, 0) : vec4(uBg, 1.0); }
  const ivec2 K[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
  // p（深度 d）往 k 方向第 s 格：该不该描。outside：描背景那侧（p 是背景 / 远的、邻格是物体 / 近的）；inside：描物体那侧——和线稿同一格
  bool hitAt(ivec2 p, float d, ivec2 k, int s, ivec2 hi) {
    ivec2 q = clamp(p + k * s, ivec2(0), hi);
    float dq = texelFetch(uDepth, q, 0).r;
    bool hit = uInside ? (d < 1.0 && dq >= 1.0) : (d >= 1.0 && dq < 1.0);
    if (d < 1.0 && uInner && dq < 1.0) {
      // 外推对不上多少才算错开：3% + 两侧各自一格的坡度 × SLOPE_TOL（2026-10-30 Opus）——面按坡度往后推（polygonOffset factor）推的量各张面不一样，
      // 侧对镜头的面和旁边那张之间就有一个按坡度算的假台阶；不让开它 = 光滑物体的剪影里侧多描一条点点断断的线（圆锥近看两侧双线）。真的前后错开远大于这个。
      float z = viewZ(d), w = 1.0 / z, dr = texelFetch(uDepth, clamp(p - k * s, ivec2(0), hi), 0).r, dq2 = texelFetch(uDepth, clamp(p + k * (s + 1), ivec2(0), hi), 0).r;
      if (uOrtho) {   // 正交：z 在屏幕上仿射；邻格近（远）4% 以上且外推对不上
        float zq = viewZ(dq), pred = dr < 1.0 ? 2.0 * z - viewZ(dr) : z;
        float tol = 0.03 * z + SLOPE_TOL * max(dr < 1.0 ? abs(z - viewZ(dr)) : 0.0, dq2 < 1.0 ? abs(viewZ(dq2) - zq) : 0.0);
        hit = uInside ? (zq > z * 1.04 && zq - pred > tol) : (zq * 1.04 < z && pred - zq > tol);
      } else {        // 透视：1/z 仿射（实验室原式）
        float wq = 1.0 / viewZ(dq), pred = dr < 1.0 ? 2.0 * w - 1.0 / viewZ(dr) : w;
        float tol = 0.03 * w + SLOPE_TOL * max(dr < 1.0 ? abs(w - 1.0 / viewZ(dr)) : 0.0, dq2 < 1.0 ? abs(1.0 / viewZ(dq2) - wq) : 0.0);
        hit = uInside ? (wq * 1.04 < w && pred - wq > tol) : (wq > w * 1.04 && wq - pred > tol);
      }
    }
    return hit;
  }
  bool lineAt(ivec2 q, ivec2 hi) { float dq = texelFetch(uDepth, q, 0).r; for (int i = 0; i < 4; i++) if (hitAt(q, dq, K[i], 1, hi)) return true; return false; }
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy), hi = textureSize(uDepth, 0) - 1;
    float d = texelFetch(uDepth, p, 0).r;
    gl_FragDepth = d;   // 深度跟着写进描边后的那张（排在描边之后的辅助几何要被模型挡）
    vec4 c = colAt(p, d);   // uBgTex：小图已先清成背景色（网格跟内容进小图时，背景上有网格）
    if (!uOn) { oColor = dither(c, p); return; }
    bool line = false; vec3 nb = c.rgb;
    for (int s = 1; s <= 2; s++) {
      if (s > uWidth || line) break;
      for (int i = 0; i < 4; i++) if (!line && hitAt(p, d, K[i], s, hi)) { line = true; nb = uInside ? c.rgb : texelFetch(uCol, clamp(p + K[i] * s, ivec2(0), hi), 0).rgb; }   // inside：线色跟自己这一格（物体）走
    }
    // 清剪影上的碎屑（v0.17.51；user 10-29「像素描边还是有漏的没对齐的像素」「轮子还会闪白」「你给不同的面上不同的颜色就可以啦」）：几乎侧对镜头的面在剪影处只剩 1–2 格厚，
    // 描边吃掉最外一格，厚 2 格的地方里面那格就孤零零露出来（镜头一动换一格 = 闪）。规则：紧挨着描边、不是墨线、看得见的 4 邻格（物体、不是描边、不是墨线）里没有同色的
    // → 改成那些邻格里最多的颜色。只动贴着描边的孤点；墨线靠透明通道记号保护（对角走的墨线 4 邻格本来就不同色）。
    if (!line && uInside && d < 1.0 && !inkAt(p)) {
      bool touches = false, same = false; vec3 cand[4]; int n = 0;
      for (int i = 0; i < 4; i++) {
        ivec2 q = clamp(p + K[i], ivec2(0), hi);
        if (q == p || texelFetch(uDepth, q, 0).r >= 1.0) continue;
        if (lineAt(q, hi)) { touches = true; continue; }
        if (inkAt(q)) continue;
        vec3 cq = texelFetch(uCol, q, 0).rgb;
        if (distance(cq, c.rgb) < 0.01) { same = true; break; }
        cand[n] = cq; n++;
      }
      if (touches && !same && n > 0) {
        int best = 0, bestN = 0;
        for (int i = 0; i < 4; i++) { if (i >= n) break; int m = 0; for (int j = 0; j < 4; j++) { if (j >= n) break; if (distance(cand[i], cand[j]) < 0.01) m++; } if (m > bestN) { bestN = m; best = i; } }
        c = vec4(cand[best], 1.0);
      }
    }
    if (uDarkSide && dot(c.rgb, vec3(0.299, 0.587, 0.114)) < dot(nb, vec3(0.299, 0.587, 0.114))) nb = c.rgb;
    vec3 lc = uLineMul <= 1.0 ? nb * uLineMul : mix(nb, vec3(1.0), uLineMul - 1.0);
    oColor = dither(line ? vec4(mix(uLineCol, lc, uLineTint), 1.0) : c, p);
  }`;

const UPSCALE_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uCol, uDepth;
  uniform int uK, uLook;
  uniform vec2 uSrcSize, uDstSize;
  layout(location = 0) out vec4 oColor;
  vec3 px(ivec2 q) { return texelFetch(uCol, clamp(q, ivec2(0), ivec2(uSrcSize) - 1), 0).rgb; }
  float Y(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    ivec2 i = ivec2(gl_FragCoord.xy) / uK;
    gl_FragDepth = texelFetch(uDepth, i, 0).r;
    vec3 col = px(i);
    if (uLook == 1) {   // CRT 电视（实验室 SCREEN_FS mode 1，去掉弧面）
      vec2 fc = gl_FragCoord.xy, f = fract(fc / float(uK)); float scale = float(uK);
      vec3 l = px(i - ivec2(1, 0)), r = px(i + ivec2(1, 0));
      vec3 blur = (l + 2.0 * col + r) * 0.25;
      col = vec3(Y(col)) + (blur - vec3(Y(blur)));                                   // 复合视频：色度横向糊开
      col = mix(col, f.x < 0.5 ? l : r, 0.45 * 0.5 * smoothstep(0.0, 0.5, abs(f.x - 0.5)));   // 电子束横向连续
      float yS = Y(col);
      vec3 lc = pow(max(col, 0.0), vec3(2.2));                                       // 下面按线性光算
      vec3 halo = pow((l + r + px(i + ivec2(0, 1)) + px(i - ivec2(0, 1))) * 0.25, vec3(2.2));
      lc += max(halo - lc, 0.0) * 0.18;                                              // 荧光粉的一圈晕
      float beam = mix(0.3, 0.8, smoothstep(0.12, 0.85, yS));
      float scan = exp(-pow((f.y - 0.5) / beam, 2.0) * 1.2), scanMean = min(1.0, beam * 1.62);
      lc *= mix(1.0, scan / scanMean, 0.25 * smoothstep(1.5, 3.0, scale));           // 扫描线：越亮越粗，总亮度不变
      int m = int(fc.x) % 3;
      vec3 mask = m == 0 ? vec3(1.0, 0.7, 0.7) : m == 1 ? vec3(0.7, 1.0, 0.7) : vec3(0.7, 0.7, 1.0);
      if ((int(fc.y) % 2) == 1) mask = mask.gbr;
      lc *= mix(vec3(1.0), mask / 0.8, 0.12);                                        // 荫罩
      vec2 v = fc / uDstSize * 2.0 - 1.0; lc *= 1.0 - 0.3 * dot(v, v) * 0.5;          // 四角暗三成
      col = pow(lc, vec3(1.0 / 2.2)) * 0.985 + 0.015;                                // 关着的荧光屏是深灰
    }
    oColor = vec4(col, 1.0);
  }`;

const srgbVec = (hex: number): any => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

/** 小图（颜色 + 深度贴图）+ 描边后的小图 + 两遍全屏。尺寸变了才重建。 */
export class PixelScreen {
  private low: any = null;
  private post: any = null;
  private readonly quadScene: any;
  private readonly quadCam: any;
  private readonly quad: any;
  private readonly outlineMat: any;
  private readonly upscaleMat: any;
  /** 小图尺寸（设备像素 ÷ k，向上取整）和放大倍数 k。 */
  w = 0; h = 0; k = 1;
  constructor() {
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.outlineMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, fragmentShader: OUTLINE_FS, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
      uniforms: { uDither: { value: false }, uDark: { value: new THREE.Vector3() }, uLight: { value: new THREE.Vector3() }, uInside: { value: false }, uBgTex: { value: false }, uCol: { value: null }, uDepth: { value: null }, uLineCol: { value: new THREE.Vector3() }, uBg: { value: new THREE.Vector3() }, uLineTint: { value: 1 }, uNear: { value: 0.1 }, uFar: { value: 100 }, uLineMul: { value: 0.42 }, uInner: { value: false }, uDarkSide: { value: false }, uOrtho: { value: false }, uOn: { value: true }, uWidth: { value: 1 } },
    });
    this.upscaleMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, fragmentShader: UPSCALE_FS, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
      uniforms: { uCol: { value: null }, uDepth: { value: null }, uK: { value: 1 }, uLook: { value: 0 }, uSrcSize: { value: new THREE.Vector2() }, uDstSize: { value: new THREE.Vector2() } },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }
  /** 按画布（设备像素）和放大倍数（设备像素）准备小图；返回小图的渲染目标（场景画进它）。 */
  prepare(W: number, H: number, k: number): any {
    const w = Math.max(1, Math.ceil(W / k)), h = Math.max(1, Math.ceil(H / k));
    if (!this.low || this.w !== w || this.h !== h) {
      this.low?.dispose(); this.post?.dispose();
      const nearest = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
      this.low = new THREE.WebGLRenderTarget(w, h, { ...nearest, depthBuffer: true, depthTexture: new THREE.DepthTexture(w, h) });
      this.post = new THREE.WebGLRenderTarget(w, h, { ...nearest, depthBuffer: true });   // 描边那遍写深度，排在描边之后的辅助几何拿它测
      this.w = w; this.h = h;
    }
    this.k = k;
    return this.low;
  }
  /** 描边后的那张小图（辉光合成也写进它）。 */
  get postTarget(): any { return this.post; }
  get lowTarget(): any { return this.low; }
  /** 小图 → 描边（或只补背景）→ 放大进 `target`（null = 画布），深度一起写回。 */
  finish(renderer: any, target: any, o: { outline: PixelOutlinePost | null; background: number; near: number; far: number; ortho: boolean }): void {
    this.outline(renderer, o);
    this.upscale(renderer, target, "post", "none", false);
  }
  /** 小图 → 描边（后处理挂点）→ post。 */
  outline(renderer: any, o: { outline: PixelOutlinePost | null; background: number; near: number; far: number; ortho: boolean; bgInTex?: boolean; dither?: DitherPost | null }): void {
    const u = this.outlineMat.uniforms, pl = o.outline;
    u.uDither.value = !!o.dither; if (o.dither) { u.uDark.value.copy(srgbVec(o.dither.dark)); u.uLight.value.copy(srgbVec(o.dither.light)); }
    u.uBgTex.value = !!o.bgInTex;
    u.uCol.value = this.low.texture; u.uDepth.value = this.low.depthTexture;
    u.uBg.value.copy(srgbVec(o.background)); u.uOn.value = !!pl;
    if (pl) { u.uLineCol.value.copy(srgbVec(pl.color)); u.uLineTint.value = pl.tint; u.uLineMul.value = pl.shade; u.uDarkSide.value = pl.darkSide; u.uInner.value = pl.inner; u.uWidth.value = pl.width; u.uInside.value = pl.side === "inside"; }
    u.uNear.value = o.near; u.uFar.value = o.far; u.uOrtho.value = o.ortho;
    this.quad.material = this.outlineMat;
    renderer.setRenderTarget(this.post); renderer.render(this.quadScene, this.quadCam);
  }
  /** 放大回 target（屏幕一刀）：src = 小图本身或 post；外观 none / crt-tv；writeDepth = 把小图的深度写回 target（后面还要按原分辨率画东西时才要）。 */
  upscale(renderer: any, target: any, src: "low" | "post", look: "none" | "crt-tv", writeDepth: boolean): void {
    this.upscaleMat.depthWrite = writeDepth; this.upscaleMat.depthTest = writeDepth;
    const v = this.upscaleMat.uniforms;
    v.uCol.value = (src === "post" ? this.post : this.low).texture; v.uDepth.value = this.low.depthTexture; v.uK.value = this.k;
    v.uLook.value = look === "crt-tv" ? 1 : 0; v.uSrcSize.value.set(this.w, this.h); v.uDstSize.value.set(this.w * this.k, this.h * this.k);
    this.quad.material = this.upscaleMat;
    renderer.setRenderTarget(target); renderer.render(this.quadScene, this.quadCam);
  }
  /** 显存估算（血槽位）：小图颜色 + 深度 + 描边后的小图（颜色 + 深度）。 */
  bytes(): number { return this.low ? this.w * this.h * (4 + 4 + 4 + 4) : 0; }
  /** 只放显存（两张小图）；材质留着，下次 prepare 重建（常驻表 residency.ts 调）。 */
  release(): void { this.low?.dispose(); this.post?.dispose(); this.low = this.post = null; this.w = this.h = 0; }
  dispose(): void { this.low?.dispose(); this.post?.dispose(); this.low = this.post = null; this.outlineMat.dispose(); this.upscaleMat.dispose(); this.quad.geometry.dispose(); }
}
