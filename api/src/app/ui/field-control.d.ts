import type { ParamFieldDef, ParamValue } from "../../editor/param-panel.ts";
/** 返回一个 `<label class="strip-field">`：标签 + 控件；值变了调 onChange（受控：宿主改完值重画）。 */
export declare function fieldControl(def: ParamFieldDef, value: ParamValue, onChange: (v: ParamValue) => void): HTMLElement;
