// field-control.ts —— 一个参数的控件（枚举 → 下拉标准件；数值 → − 值 +；开关 → 开 / 关钮）。底部选项条（context-bar.ts）和参数小窗（vcb.ts）共用，
// 两处画法一致、不各抄一份。触屏友好：数值用 − / + 不弹软键盘（精确输入归数值小窗）。created 2026-10-25 by Claude Opus 5.5（从 context-bar.ts 抽出）
import { createSelectField } from "./select-field.ts";
import type { ParamFieldDef, ParamValue } from "../../editor/param-panel.ts";

/** 返回一个 `<label class="strip-field">`：标签 + 控件；值变了调 onChange（受控：宿主改完值重画）。 */
export function fieldControl(def: ParamFieldDef, value: ParamValue, onChange: (v: ParamValue) => void): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "strip-field";
  const lab = document.createElement("span"); lab.className = "strip-label"; lab.textContent = def.label; wrap.appendChild(lab);
  switch (def.kind) {
    case "enum": {
      const cur = String(value);
      const sel = createSelectField({ className: "strip-select", ariaLabel: def.label, items: () => def.values.map((v) => ({ value: v.id, label: v.label, ...(v.hint ? { hint: v.hint } : {}) })), value: () => cur, onChange: (v) => onChange(v) });
      wrap.appendChild(sel.el);
      break;
    }
    case "number": {
      const box = document.createElement("span"); box.className = "strip-number";
      const num = Number(value);
      const decimals = (String(def.step).split(".")[1] ?? "").length;
      const clamp = (x: number): number => Math.min(def.max, Math.max(def.min, +x.toFixed(decimals)));
      const mk = (t: string, d: number): HTMLButtonElement => { const b = document.createElement("button"); b.type = "button"; b.className = "strip-step"; b.textContent = t; b.addEventListener("click", () => onChange(clamp(num + d))); return b; };
      const val = document.createElement("span"); val.className = "strip-value"; val.textContent = `${num}${def.unit ?? ""}`;
      box.append(mk("−", -def.step), val, mk("+", def.step));
      wrap.appendChild(box);
      break;
    }
    case "bool": {
      const on = !!value;
      const b = document.createElement("button"); b.type = "button"; b.className = "strip-toggle" + (on ? " on" : ""); b.textContent = on ? "开" : "关";
      b.addEventListener("click", () => onChange(!on));
      wrap.appendChild(b);
      break;
    }
  }
  return wrap;
}
