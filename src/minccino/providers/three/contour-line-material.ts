// minccino/providers/three/contour-line-material.ts —— 1 像素原生线（GL 线）的材质：画出来和 LineBasicMaterial 一样，多一件事——
// 旗 ≥ 10 的边（软边 / 折线）只在转成外轮廓时画（I12；user 10-30「软边没有变成外轮廓」→ 拍「光滑那片沿软边画折线、不画交线」，
// 「电脑屏幕默认的 1 像素线稿……做，加油」）。粗线那条路的同一件事在 profile-line-shader.ts；判法 = profile-edges.ts lineKind 的镜像，改一边改另一边。
// created 2026-10-30 by Claude Opus 5.5
// · 片元 = three 自带的 basic 那份（LineBasicMaterial 用的就是这份程序）：颜色 / 色彩空间 / 雾 / 不透明处理一字不差 → 没有软边的地方一个像素不变。
// · 顶点 = 自己的源：begin / project / 颜色 / 雾同 basic；多读四个属性 aOther（这条边另一头）/ aW1 / aW2（两张面从边往面里走的方向）/ aFlag（面数，≥ 10 = 只在外轮廓画）。
// · 两个端点各算一次，视线基准取线段中点 → 两头判得一模一样（不然一头收掉一头不收 = 拉出一条怪线）。收掉 = 两头都挪到裁剪体外。
// · 原来对 LineBasicMaterial 的读写照旧：.color 落到 diffuse、.opacity 落到 opacity（标记换色、像素描边那遍的墨线记号、Tron 每帧换色）。
// · 每条线沿视线往镜头挪一点（2026-10-30；user 截图 1-bit 圆锥「还是有一点点断边」）：原生线没有 polygonOffset，只靠面往后推（units 6 + 按坡度 × 1）赢面；
//   光栅化出来的线像素离真线能有半格多，贴着的面在这些格子里只要比线近就把线挡掉。两处栽了：① 外轮廓上贴着的面几乎侧对镜头（坡度极大）→ 轮廓断成一截一截；
//   ② 线躺在一张面里（圆锥底圈和地面同一平面）→ 坡度那一项刚好不够，零星缺一格。面往后多推（factor 2）也能接上，但会把相邻两张面推出深度台阶、
//   像素描边那遍误描出第二条线（试过、退了）。所以从线这头：挪的量 = 这条边两侧的面里往镜头这边翘的那张，离开边（屏幕上垂直于边）走一个像素深度近多少，
//   保底 PULL_FLOOR_PX 个像素的「一般坡度」（线躺在第三张面里时那张面没记在 aW1 / aW2 里，靠它），封顶 = 到镜头距离的 2%（侧对镜头的面陡到无穷，不封会穿到前面的东西上）。
//   沿视线挪 = 屏幕上一个像素不动。uPx = 一个像素在 NDC 里多高（2 / 目标高度），画之前按当前渲染目标填（onBeforeRender；小图那遍就是小图的高度）。
import * as THREE from "three";

export const CONTOUR_LINE_VERTEX = /* glsl */ `
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
attribute vec3 aOther;
attribute vec3 aW1;
attribute vec3 aW2;
attribute float aFlag;
uniform float uPx;
#define PULL_FLOOR_PX 2.0
// 面（往面里走的方向 w，视空间）往镜头这边翘时，离开这条边、垂直于它在屏幕上的方向走一个像素，深度（沿视线 r）近多少；背着镜头走的 = 0（挡不着线）。
// 垂直分量 = w 在屏幕平面里的投影去掉沿边（e）的那一截：侧对镜头的面投影出来几乎和边平行，只看投影长度会把它的陡低估很多（第一版就栽在这）。
float tiltPerPx( vec3 w, vec3 e, vec3 r, float pxView ) {
	float lw = length( w );
	if ( lw < 1e-12 ) return 0.0;
	w /= lw;
	float along = dot( w, r );
	if ( along >= 0.0 ) return 0.0;
	vec3 ws = w - along * r, es = e - dot( e, r ) * r;
	float le = length( es );
	vec3 wp = le > 1e-9 ? ws - dot( ws, es / le ) * ( es / le ) : ws;
	return - along / max( length( wp ), 1e-6 ) * pxView;
}
void main() {
	#include <color_vertex>
	#include <begin_vertex>
	#include <project_vertex>
	#include <fog_vertex>
	if ( aFlag > -0.5 ) {
		bool persp = projectionMatrix[ 2 ][ 3 ] == - 1.0;
		vec4 csA = modelViewMatrix * vec4( position, 1.0 );
		vec4 csB = modelViewMatrix * vec4( aOther, 1.0 );
		vec3 mid = 0.5 * ( csA.xyz + csB.xyz );
		vec3 vdir = persp ? mid : vec3( 0.0, 0.0, - 1.0 );
		vec3 sm = cross( csB.xyz - csA.xyz, vdir );
		vec3 wA = mat3( modelViewMatrix ) * aW1, wB = mat3( modelViewMatrix ) * aW2;
		float sa = dot( wA, sm ), sb = dot( wB, sm );
		bool quiet = aFlag > 9.5;
		float faces = quiet ? aFlag - 10.0 : aFlag;
		bool silhouette = faces > 1.5 && faces < 2.5 && sa * sb > 0.0;
		if ( quiet && !silhouette ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
		else {
			vec3 r = persp ? normalize( csA.xyz ) : vec3( 0.0, 0.0, - 1.0 );
			float dist = persp ? length( csA.xyz ) : abs( csA.z );
			float pxView = uPx * ( persp ? - csA.z : 1.0 ) / projectionMatrix[ 1 ][ 1 ];
			vec3 e = normalize( csB.xyz - csA.xyz );
			float pull = min( max( max( tiltPerPx( wA, e, r, pxView ), tiltPerPx( wB, e, r, pxView ) ), PULL_FLOOR_PX * pxView ), 0.02 * dist );
			gl_Position = projectionMatrix * vec4( csA.xyz - r * pull, 1.0 );
		}
	}
}
`;

export interface ContourLineOpts { vertexColors?: boolean; color?: number; transparent?: boolean; opacity?: number; depthWrite?: boolean; depthFunc?: number }
/** LineBasicMaterial 的替身（同参数）：画池里的 1 像素线都用它。 */
export function contourLineMaterial(o: ContourLineOpts = {}): any {
  const uniforms = THREE.UniformsUtils.clone(THREE.ShaderLib.basic.uniforms);
  if (o.color !== undefined) uniforms.diffuse.value.setHex(o.color);
  uniforms.opacity.value = o.opacity ?? 1;
  uniforms.uPx = { value: 2 / 1080 };
  const m = new THREE.ShaderMaterial({
    uniforms, vertexShader: CONTOUR_LINE_VERTEX, fragmentShader: THREE.ShaderLib.basic.fragmentShader,
    vertexColors: !!o.vertexColors, transparent: !!o.transparent, depthWrite: o.depthWrite ?? true, depthFunc: o.depthFunc ?? THREE.LessEqualDepth, fog: true,
  });
  m.onBeforeRender = (renderer: any): void => { const t = renderer.getRenderTarget(); uniforms.uPx.value = 2 / Math.max(1, t ? t.height : renderer.getContext().drawingBufferHeight); };
  Object.defineProperty(m, "color", { get: () => uniforms.diffuse.value, configurable: true });
  Object.defineProperty(m, "opacity", { get: () => uniforms.opacity.value, set: (v: number) => { uniforms.opacity.value = v; }, configurable: true });
  return m;
}
