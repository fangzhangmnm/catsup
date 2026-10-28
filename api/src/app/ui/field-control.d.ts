import type { ParamFieldDef, ParamValue } from "../../editor/param-panel.ts";
/** 这一片里有字段正在打字（宿主重画前问一下：重画会把输入框换掉、打到一半的字就没了）。 */
export declare const fieldEditing: (root: HTMLElement) => boolean;
/** 返回一个 `<label class="strip-field">`：标签 + 控件；值变了调 onChange（受控：宿主改完值重画）。 */
export declare function fieldControl(def: ParamFieldDef, value: ParamValue, onChange: (v: ParamValue) => void): HTMLElement;
