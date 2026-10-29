// minccino/backend/three/profile-line-shader.ts —— SU 轮廓线的粗线顶点着色器：**自己的 GLSL 源**（Tron 第一刀步 5 拔的漏点 ①：以前是 onBeforeCompile
// 在 three 编译时对 LineMaterial 的源做字符串替换）。内容 = vendored `LineMaterial.js` 的 vertexShader + 下面 PROFILE_PATCHES 四处替换，
// 守卫 `test/minccino-guard.test.ts` ⑥ 逐字比对（升级 vendored three 时立刻发现漂了）。改轮廓逻辑 = 改 PROFILE_PATCHES 再跑
// `node scripts/gen-profile-line-shader.mjs` 重新生成下面的字面量（别手改字面量）。created 2026-10-29 by Claude Fable 5.1
// 轮廓判定 = profile-edges.ts isSilhouette 的 GLSL 镜像（改一边改另一边；F-87 / 2026-10-26）。

/** 对 LineMaterial 顶点着色器的四处替换（只换第一处，和以前 onBeforeCompile 的 String.replace 一样）。 */
export const PROFILE_PATCHES: readonly (readonly [string, string])[] = [
  [
    "uniform float linewidth;",
    "uniform float linewidth;\nuniform float profileAdd;\nattribute vec3 instanceW1;\nattribute vec3 instanceW2;\nattribute float instanceFlag;"
  ],
  [
    "float aspect = resolution.x / resolution.y;",
    "float aspect = resolution.x / resolution.y;\n\t\t\t// SU 轮廓线：flag = 这条边的面数（0 悬空 / 1 边界 / 2 内边或剪影 / 3+ 非流形）。剪影 = 两张面伸向「过这条边和视线的平面」的同一侧\n\t\t\t// （W1 / W2 = 两张面各自从这条边往面里走的方向；= profile-edges.ts isSilhouette 的 GLSL 镜像，改一边改另一边；F-87 / 2026-10-26）\n\t\t\tvec4 csA = modelViewMatrix * vec4( instanceStart, 1.0 );\n\t\t\tvec4 csB = modelViewMatrix * vec4( instanceEnd, 1.0 );\n\t\t\tvec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? csA.xyz : vec3( 0.0, 0.0, - 1.0 );\n\t\t\tvec3 sm = cross( csB.xyz - csA.xyz, vdir );\n\t\t\tfloat sa = dot( mat3( modelViewMatrix ) * instanceW1, sm );\n\t\t\tfloat sb = dot( mat3( modelViewMatrix ) * instanceW2, sm );\n\t\t\tbool isProfile = instanceFlag < 1.5 || instanceFlag > 2.5 || ( sa * sb > 0.0 );\n\t\t\tfloat lw = linewidth + ( isProfile ? profileAdd : 0.0 );"
  ],
  [
    "float hw = linewidth * 0.5;",
    "float hw = lw * 0.5;"
  ],
  [
    "offset *= linewidth;",
    "offset *= lw;"
  ]
];

/** 把替换套到一份 LineMaterial 顶点着色器源上（守卫 / 生成脚本共用）。 */
export function applyProfilePatches(src: string): string { let s = src; for (const [a, b] of PROFILE_PATCHES) { if (!s.includes(a)) throw new Error("profile-line-shader: anchor missing: " + a); s = s.replace(a, b); } return s; }

export const PROFILE_LINE_VERTEX: string = `
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
uniform float profileAdd;
attribute vec3 instanceW1;
attribute vec3 instanceW2;
attribute float instanceFlag;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;
			// SU 轮廓线：flag = 这条边的面数（0 悬空 / 1 边界 / 2 内边或剪影 / 3+ 非流形）。剪影 = 两张面伸向「过这条边和视线的平面」的同一侧
			// （W1 / W2 = 两张面各自从这条边往面里走的方向；= profile-edges.ts isSilhouette 的 GLSL 镜像，改一边改另一边；F-87 / 2026-10-26）
			vec4 csA = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 csB = modelViewMatrix * vec4( instanceEnd, 1.0 );
			vec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? csA.xyz : vec3( 0.0, 0.0, - 1.0 );
			vec3 sm = cross( csB.xyz - csA.xyz, vdir );
			float sa = dot( mat3( modelViewMatrix ) * instanceW1, sm );
			float sb = dot( mat3( modelViewMatrix ) * instanceW2, sm );
			bool isProfile = instanceFlag < 1.5 || instanceFlag > 2.5 || ( sa * sb > 0.0 );
			float lw = linewidth + ( isProfile ? profileAdd : 0.0 );

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = lw * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= lw;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`;
