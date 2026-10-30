export declare const CONTOUR_LINE_VERTEX = "\n#include <common>\n#include <color_pars_vertex>\n#include <fog_pars_vertex>\nattribute vec3 aOther;\nattribute vec3 aW1;\nattribute vec3 aW2;\nattribute float aFlag;\nvoid main() {\n\t#include <color_vertex>\n\t#include <begin_vertex>\n\t#include <project_vertex>\n\t#include <fog_vertex>\n\tif ( aFlag > 9.5 ) {\n\t\tvec4 csA = modelViewMatrix * vec4( position, 1.0 );\n\t\tvec4 csB = modelViewMatrix * vec4( aOther, 1.0 );\n\t\tvec3 mid = 0.5 * ( csA.xyz + csB.xyz );\n\t\tvec3 vdir = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) ? mid : vec3( 0.0, 0.0, - 1.0 );\n\t\tvec3 sm = cross( csB.xyz - csA.xyz, vdir );\n\t\tfloat sa = dot( mat3( modelViewMatrix ) * aW1, sm );\n\t\tfloat sb = dot( mat3( modelViewMatrix ) * aW2, sm );\n\t\tfloat faces = aFlag - 10.0;\n\t\tbool twoFaced = faces > 1.5 && faces < 2.5;\n\t\tif ( !( twoFaced && sa * sb > 0.0 ) ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );\n\t}\n}\n";
export interface ContourLineOpts {
    vertexColors?: boolean;
    color?: number;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
    depthFunc?: number;
}
/** LineBasicMaterial 的替身（同参数）：画池里的 1 像素线都用它。 */
export declare function contourLineMaterial(o?: ContourLineOpts): any;
