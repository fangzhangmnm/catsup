// minccino/providers/three/contour-line-material.ts —— 1 像素原生线（GL 线）的材质：画出来和 LineBasicMaterial 一样，多一件事——
// 旗 ≥ 10 的边（软边 / 折线）只在转成外轮廓时画（I12；user 10-30「软边没有变成外轮廓」→ 拍「光滑那片沿软边画折线、不画交线」，
// 「电脑屏幕默认的 1 像素线稿……做，加油」）。粗线那条路的同一件事在 profile-line-shader.ts；判法 = profile-edges.ts lineKind 的镜像，改一边改另一边。
// created 2026-10-30 by Claude Opus 5.5
// · 片元 = three 自带的 basic 那份（LineBasicMaterial 用的就是这份程序）：颜色 / 色彩空间 / 雾 / 不透明处理一字不差 → 没有软边的地方一个像素不变。
// · 顶点 = 自己的源：begin / project / 颜色 / 雾同 basic；多读四个属性 aOther（这条边另一头）/ aW1 / aW2（两张面从边往面里走的方向）/ aFlag（面数，≥ 10 = 只在外轮廓画）。
// · 两个端点各算一次，视线基准取线段中点 → 两头判得一模一样（不然一头收掉一头不收 = 拉出一条怪线）。收掉 = 两头都挪到裁剪体外。
// · 原来对 LineBasicMaterial 的读写照旧：.color 落到 diffuse、.opacity 落到 opacity（标记换色、像素描边那遍的墨线记号、Tron 每帧换色）。
import * as THREE from "three";

export const CONTOUR_LINE_VERTEX = /* glsl */ `
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
attribute vec3 aOther;
attribute vec3 aW1;
attribute vec3 aW2;
attribute float aFlag;
void main() {
	#include <color_vertex>
	#include <begin_vertex>
	#include <project_vertex>
	#include <fog_vertex>
	if ( aFlag > 9.5 ) {
		vec4 csA = modelViewMatrix * vec4( position, 1.0 );
		vec4 csB = modelViewMatrix * vec4( aOther, 1.0 );
		vec3 mid = 0.5 * ( csA.xyz + csB.xyz );
		vec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? mid : vec3( 0.0, 0.0, - 1.0 );
		vec3 sm = cross( csB.xyz - csA.xyz, vdir );
		float sa = dot( mat3( modelViewMatrix ) * aW1, sm );
		float sb = dot( mat3( modelViewMatrix ) * aW2, sm );
		float faces = aFlag - 10.0;
		bool twoFaced = faces > 1.5 && faces < 2.5;
		if ( !( twoFaced && sa * sb > 0.0 ) ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
	}
}
`;

export interface ContourLineOpts { vertexColors?: boolean; color?: number; transparent?: boolean; opacity?: number; depthWrite?: boolean; depthFunc?: number }
/** LineBasicMaterial 的替身（同参数）：画池里的 1 像素线都用它。 */
export function contourLineMaterial(o: ContourLineOpts = {}): any {
  const uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.basic.uniforms);
  if (o.color !== undefined) uniforms.diffuse.value.setHex(o.color);
  uniforms.opacity.value = o.opacity ?? 1;
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: CONTOUR_LINE_VERTEX, fragmentShader: THREE.ShaderLib.basic.fragmentShader,
    vertexColors: !!o.vertexColors, transparent: !!o.transparent, depthWrite: o.depthWrite ?? true, depthFunc: o.depthFunc ?? THREE.LessEqualDepth, fog: true,
  });
  Object.defineProperty(m, "color", { get: () => uniforms.diffuse.value, configurable: true });
  Object.defineProperty(m, "opacity", { get: () => uniforms.opacity.value, set: (v: number) => { uniforms.opacity.value = v; }, configurable: true });
  return m;
}
