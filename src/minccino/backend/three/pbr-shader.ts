// minccino/backend/three/pbr-shader.ts —— 有光照的表面（铸铜；实验室 overrides/material/material.js「表面」着色器里铸铜用到的那几段移植）。
// 光：太阳（颜色 1.7 / 1.6 / 1.45，方位 / 高度给）+ 太阳投影（遮蔽图集第 21 格）+ 环境：漫反射 = 球谐（env-sky.ts）、镜面 = 环境图按粗糙度挑 mip + Karis 环境 BRDF；
// GGX 高光 + 几何高光抗锯齿（Tokuyoshi & Kaplanyan 2019）；金属的高光带自己的颜色。材质：底色（不借模型颜色：铸铜 = 材料本色）、金属、粗糙、
// 砂铸（砂型颗粒 + 气孔，坑里粗、暗；细到看不清时抹平）、铜绿（积在缝里和凹处 = 世界空间遮蔽低的地方，那里不再是亮金属、变粗）、清漆（蜡：最上面一层光滑介质，菲涅尔）。
// 输出 ACES 色调映射 + 曝光 + gamma（实验室原式）。背景 = 环境图本身；地面 = z = 0，太阳 + 天光照着、有遮蔽和投影，远处融进环境（实验室 BG_FS）。
// 和实验室不一样：没有倒角（要每条硬边往面里能倒多宽，CatsUp 还没给这个几何派生通道——清单 §3 交 Fable）；没有炫光（实验室「相机」的光晕 / 星芒）；
// 噪声按「场景半径 = 1」取尺度（实验室的模型先归一化到半径 1）。
// created 2026-10-29 by Claude Opus 5.5（Tron 第 1 步第四个风格）
import * as THREE from "three";
import { AO_GLSL, type AoUniforms } from "./ao-bake.ts";
import type { EnvSky } from "./env-sky.ts";
import type { PbrShade } from "../../preset/index.ts";

const COMMON = /* glsl */`
  const float PI = 3.14159265;
  uniform sampler2D uEnv; uniform float uEnvMaxLod, uEnvAmt, uExposure; uniform vec3 uSH[9]; uniform bool uHasSH;
  uniform vec3 uSunDir, uSunCol, uSkyCol, uGroundCol; uniform bool uSunOn;
  vec3 toLab(vec3 w) { return vec3(w.x, w.z, -w.y); }   // 世界 z 朝上 → 实验室 y 朝上（环境图按实验室坐标存）
  vec2 dirToEquirect(vec3 d) { return vec2(atan(d.x, -d.z) / (2.0 * PI) + 0.5, acos(clamp(d.y, -1.0, 1.0)) / PI); }
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
  vec3 shIrr(vec3 n) {
    return max(uSH[0] * 0.282095 + 0.488603 * (uSH[1] * n.y + uSH[2] * n.z + uSH[3] * n.x)
      + 1.092548 * (uSH[4] * n.x * n.y + uSH[5] * n.y * n.z + uSH[7] * n.x * n.z)
      + uSH[6] * 0.315392 * (3.0 * n.z * n.z - 1.0) + uSH[8] * 0.546274 * (n.x * n.x - n.y * n.y), 0.0);
  }
  vec3 skyLight(vec3 nLab, float occl) { return mix(uGroundCol, uSkyCol, nLab.y * 0.5 + 0.5) * (0.3 + 0.7 * occl); }
  vec3 ambient(vec3 nW, float occl) { vec3 n = toLab(nW); return uHasSH ? shIrr(n) * uEnvAmt * (0.3 + 0.7 * occl) : skyLight(n, occl); }
  vec3 envSpec(vec3 rW, float rough, float occl) { return textureLod(uEnv, dirToEquirect(toLab(rW)), rough * uEnvMaxLod).rgb * uEnvAmt * (0.4 + 0.6 * occl); }
  vec3 envBRDF(vec3 F0, float rough, float NoV) {   // Karis 的手机版环境 BRDF 近似
    vec4 r = rough * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
    float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
    vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw;
    return F0 * AB.x + AB.y;
  }
  float ggxD(float NH, float a) { float a2 = a * a, d = NH * NH * (a2 - 1.0) + 1.0; return a2 / (PI * d * d); }
  float hash31(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  float vnoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), u.x), mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), u.x), u.y),
               mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), u.x), mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), u.x), u.y), u.z);
  }`;

const FACE_VS = /* glsl */`
  in vec3 aColor;
  #ifndef SINGLE
  in vec3 aColorB;
  out vec3 vColorB;
  #endif
  out vec3 vColor; out vec3 vPosW; out vec3 vNrmW;
  void main() {
    vColor = aColor;
    #ifndef SINGLE
    vColorB = aColorB;
    #endif
    vec4 pw = modelMatrix * vec4(position, 1.0); vPosW = pw.xyz;
    vNrmW = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * pw;
  }`;
const FACE_FS = /* glsl */`
  precision highp float;
  in vec3 vColor; in vec3 vPosW; in vec3 vNrmW;
  #ifndef SINGLE
  in vec3 vColorB;
  #endif
  uniform vec3 uBase, uPatinaCol;
  uniform float uMetal, uRough, uPatina, uCoat, uCoatRough, uSpec, uPatternAmt, uAoAmt;
  uniform int uPattern;
  uniform bool uAoOn;
  layout(location = 0) out vec4 oColor;
  ${AO_GLSL}
  ${COMMON}
  void main() {
    #ifdef SINGLE
    vec3 c = vColor;
    #else
    vec3 c = gl_FrontFacing ? vColor : vColorB;
    if (c.r < 0.0) discard;   // 那一侧归贴图网格画
    #endif
    vec3 P = vPosW;
    vec3 V = isOrthographic ? normalize((vec4(0.0, 0.0, 1.0, 0.0) * viewMatrix).xyz) : normalize(cameraPosition - P);
    vec3 Nf = normalize(cross(dFdx(vPosW), dFdy(vPosW))); if (dot(Nf, V) < 0.0) Nf = -Nf;
    vec3 N = normalize(vNrmW); if (!gl_FrontFacing) N = -N;
    vec3 dNx = dFdx(N), dNy = dFdy(N);
    float specAA = min(0.3 * (dot(dNx, dNx) + dot(dNy, dNy)), 0.2);
    vec3 base = pow(uBase, vec3(2.2));
    float castRough = 0.0;
    if (uPattern == 9) {   // 砂铸：砂型的颗粒印 + 气孔，坑里粗、暗；细到看不清时抹平，不闪
      vec3 Pm = P / max(uAoR, 1e-3);   // 场景半径 = 1（实验室的模型先归一化）
      float fade = 1.0 - smoothstep(0.3, 0.7, length(fwidth(Pm * 160.0)));
      float g = vnoise3(Pm * 160.0), pit = smoothstep(0.62, 0.85, vnoise3(Pm * 70.0 + 3.0));
      N = normalize(N + (vec3(vnoise3(Pm * 160.0 + 7.0), vnoise3(Pm * 160.0 + 13.0), g) - 0.5) * 0.35 * uPatternAmt * fade);
      base *= 1.0 - 0.25 * uPatternAmt * pit;
      castRough = 0.25 * uPatternAmt * (pit + 0.5 * g);
    }
    float occl = 1.0, sh = 1.0;
    if (uAoOn) { occl = aoAt(P, Nf); if (uSunOn) sh = sunShadow(P, Nf); }
    occl = mix(1.0, occl, uAoAmt);
    float rough = clamp(uRough + castRough, 0.04, 1.0), metal = uMetal;
    float pat = uPatina * clamp((1.0 - occl) * 2.0, 0.0, 1.0);   // 铜绿：积在缝里和凹处
    base = mix(base, pow(uPatinaCol, vec3(2.2)), pat); metal *= 1.0 - 0.85 * pat; rough = mix(rough, 0.85, pat);
    rough = sqrt(sqrt(min(pow(rough, 4.0) + specAA, 1.0)));
    float ndl = dot(N, uSunDir), wrapD = clamp(ndl, 0.0, 1.0);
    vec3 col = base * (1.0 - metal) * (uSunCol * wrapD * sh + ambient(N, occl));
    float a = max(rough * rough, 0.002), NH = max(dot(N, normalize(uSunDir + V)), 0.0), NoV = clamp(dot(N, V), 0.0, 1.0);
    float dG = a * a / (PI * pow(NH * NH * (a * a - 1.0) + 1.0, 2.0));
    vec3 F0 = mix(vec3(0.04), base, metal), Fs = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);
    col += uSunCol * dG * Fs * uSpec * max(ndl, 0.0) * sh * 0.25;
    col += envSpec(reflect(-V, N), rough, occl) * envBRDF(F0, rough, NoV) * uSpec;
    if (uCoat > 0.0) {   // 清漆（蜡）
      float Fc = 0.04 + 0.96 * pow(1.0 - NoV, 5.0), Dc = ggxD(NH, max(uCoatRough * uCoatRough, 0.001));
      col = col * (1.0 - uCoat * Fc) + uCoat * Fc * (uSunCol * Dc * max(ndl, 0.0) * sh * 0.25 + envSpec(reflect(-V, N), uCoatRough, occl));
    }
    vec3 o = pow(aces(col * uExposure), vec3(1.0 / 2.2));
    #ifdef SEL
    o = mix(o, c, 0.45);   // 选中 / 悬停：往高亮色拉一半（顶点色 = 编辑器给的状态色）
    #endif
    oColor = vec4(o, 1.0);
  }`;

const GROUND_VS = /* glsl */`
  out vec2 vNdc;
  void main() { vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const GROUND_FS = /* glsl */`
  precision highp float;
  in vec2 vNdc;
  uniform mat4 uInvVP; uniform vec3 uGround, uEye; uniform float uGroundOn, uAoAmt; uniform bool uAoOn;
  layout(location = 0) out vec4 oColor;
  ${AO_GLSL}
  ${COMMON}
  void main() {
    vec4 a = uInvVP * vec4(vNdc, -1.0, 1.0), b = uInvVP * vec4(vNdc, 1.0, 1.0);
    vec3 p0 = a.xyz / a.w, d = normalize(b.xyz / b.w - p0);
    vec3 col = textureLod(uEnv, dirToEquirect(toLab(d)), 0.0).rgb;   // 背景 = 环境图本身
    if (uGroundOn > 0.0 && d.z < -1e-6 && p0.z > 0.0) {
      vec3 g = p0 + d * (-p0.z / d.z), up = vec3(0.0, 0.0, 1.0);
      float sh = 1.0, occl = 1.0;
      if (uAoOn) { occl = mix(1.0, aoAt(g, up), uAoAmt); if (uSunOn) sh = sunShadow(g, up); }
      vec3 lit = pow(uGround, vec3(2.2)) * (uSunCol * max(uSunDir.z, 0.0) * sh + skyLight(toLab(up), occl));
      float t = length(g - uEye) / max(uAoR, 1e-3);   // 场景半径 = 1：远处融进环境（实验室 smoothstep(5, 14, t)）
      col = mix(lit, col, smoothstep(5.0, 14.0, t) * uGroundOn + (1.0 - uGroundOn));
    }
    oColor = vec4(pow(aces(col * uExposure), vec3(1.0 / 2.2)), 1.0);
  }`;

const lin3 = (h: number): any => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);   // sRGB 浮点（着色器里再 pow 2.2）

export class PbrMaterials {
  private readonly light = {
    uEnvAmt: { value: 1 }, uExposure: { value: 1 }, uSunDir: { value: new THREE.Vector3(0, 0, 1) }, uSunCol: { value: new THREE.Vector3(1.7, 1.6, 1.45) },
    uSkyCol: { value: new THREE.Vector3(0.4, 0.46, 0.55) }, uGroundCol: { value: new THREE.Vector3(0.26, 0.24, 0.21) }, uSunOn: { value: false },
  };
  private readonly mat = { uBase: { value: new THREE.Vector3() }, uPatinaCol: { value: new THREE.Vector3() }, uMetal: { value: 0 }, uRough: { value: 0.5 }, uPatina: { value: 0 }, uCoat: { value: 0 }, uCoatRough: { value: 0.05 }, uSpec: { value: 1 }, uPatternAmt: { value: 0 }, uPattern: { value: 0 } };
  private readonly aoModel = { uAoRadius: { value: 0.5 }, uAoSoft: { value: 1 }, uAoAmt: { value: 1 }, uAoOn: { value: false } };
  private readonly aoGround = { uAoRadius: { value: 0.25 }, uAoSoft: { value: 1 }, uAoAmt: { value: 1 }, uAoOn: { value: false } };
  private readonly groundU = { uInvVP: { value: new THREE.Matrix4() }, uGround: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() }, uGroundOn: { value: 1 } };
  private readonly mats = new Map<string, any>();
  readonly ground: any;
  constructor(private readonly ao: AoUniforms, private readonly env: EnvSky, private readonly depthFace: number, private readonly depthOther: number) {
    const gm = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: GROUND_VS, fragmentShader: GROUND_FS, depthTest: false, depthWrite: false, uniforms: { ...this.groundU, ...this.light, ...this.aoGround, ...ao, ...env.uniforms } });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gm);
    this.ground.frustumCulled = false; this.ground.renderOrder = -100; this.ground.visible = false;
  }
  face(side: "front" | "back" | "double", active: boolean, single: boolean, sel = false): any {
    const key = `${side}|${active ? 1 : 0}|${single ? 1 : 0}|${sel ? 1 : 0}`;
    let m = this.mats.get(key);
    if (!m) {
      const defines: Record<string, number> = {}; if (single) defines.SINGLE = 1; if (sel) defines.SEL = 1;
      m = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: FACE_VS, fragmentShader: FACE_FS, defines, uniforms: { ...this.light, ...this.mat, ...this.aoModel, ...this.ao, ...this.env.uniforms },
        side: side === "front" ? THREE.FrontSide : side === "back" ? THREE.BackSide : THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: active ? this.depthFace : this.depthOther,
      });
      this.mats.set(key, m);
    }
    return m;
  }
  /** 每帧：材质 / 光 / 遮蔽开没开 / 地面。sunWorld = 世界坐标的太阳方向（单位向量）。 */
  sync(p: PbrShade, env: { amount: number; exposure: number }, sunWorld: { x: number; y: number; z: number }, ao: { amount: number; radius: number; groundRadius: number; soft: number } | null, aoReady: boolean,
    ground: { color: number; on: number } | null, cam: any, fade: { x: number; y: number; z: number }): void {
    const m = this.mat;
    m.uBase.value.copy(lin3(p.base)); m.uPatinaCol.value.copy(lin3(p.patinaColor)); m.uMetal.value = p.metal; m.uRough.value = p.rough; m.uPatina.value = p.patina;
    m.uCoat.value = p.coat; m.uCoatRough.value = p.coatRough; m.uSpec.value = p.spec; m.uPatternAmt.value = p.patternAmt; m.uPattern.value = p.pattern === "sand" ? 9 : 0;
    this.light.uEnvAmt.value = env.amount; this.light.uExposure.value = env.exposure; this.light.uSunDir.value.set(sunWorld.x, sunWorld.y, sunWorld.z);
    const on = !!ao && aoReady;
    this.aoModel.uAoOn.value = on; this.aoGround.uAoOn.value = on; this.light.uSunOn.value = on;   // 太阳投影和遮蔽在同一张图集里
    if (ao) { this.aoModel.uAoAmt.value = ao.amount; this.aoModel.uAoRadius.value = ao.radius; this.aoModel.uAoSoft.value = ao.soft; this.aoGround.uAoAmt.value = ao.amount; this.aoGround.uAoRadius.value = ao.groundRadius; this.aoGround.uAoSoft.value = ao.soft; }
    this.groundU.uGround.value.copy(lin3(ground?.color ?? 0x9a9a96)); this.groundU.uGroundOn.value = ground ? ground.on : 0;
    this.groundU.uInvVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
    this.groundU.uEye.value.set(fade.x, fade.y, fade.z);   // 地面淡出按到眼（正交按到视野中心：正交的眼在几千米外）
    this.ground.visible = true;
  }
  hide(): void { this.ground.visible = false; }
  dispose(): void { for (const x of this.mats.values()) x.dispose(); this.ground.material.dispose(); this.ground.geometry.dispose(); }
}
