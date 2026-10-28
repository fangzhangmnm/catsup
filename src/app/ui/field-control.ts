// field-control.ts —— 一个参数的控件（枚举 → 下拉标准件；数值 → − 值 +；开关 → 开 / 关钮）。底部选项条（context-bar.ts）和参数小窗（vcb.ts）共用，
// 两处画法一致、不各抄一份。触屏友好：数值用 − / + 不弹软键盘；要精确就点数值就地打字（2026-10-28 起，带单位也行）。created 2026-10-25 by Claude Opus 5.5（从 context-bar.ts 抽出）
import { createSelectField } from "./select-field.ts";
import type { ParamFieldDef, ParamValue } from "../../editor/param-panel.ts";
import { formatQuantity, nudgeQuantity, parseQuantity } from "../../editor/units.ts";
import { showNotice } from "./notice.ts";

/** 这一片里有字段正在打字（宿主重画前问一下：重画会把输入框换掉、打到一半的字就没了）。 */
export const fieldEditing = (root: HTMLElement): boolean => !!root.querySelector(".strip-input");

/** 返回一个 `<label class="strip-field">`：标签 + 控件；值变了调 onChange（受控：宿主改完值重画）。 */
export function fieldControl(def: ParamFieldDef, value: ParamValue, onChange: (v: ParamValue) => void): HTMLElement {
  const wrap = document.createElement(def.kind === "number" ? "span" : "label");   // 数值那格里有三颗钮 + 就地输入框：不用 <label>（点标签会去按第一颗钮）
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
      // 物理量（def.quantity）：值存 SI，显示 / − + / 打字全走 units.ts（user 10-28「都单位和用户选择单位对齐」「你可以输入其他单位文本框能接住」）
      const box = document.createElement("span"); box.className = "strip-number";
      const num = Number(value), q = def.quantity;
      const decimals = (String(def.step).split(".")[1] ?? "").length;
      const clampSI = (x: number): number => Math.min(def.max, Math.max(def.min, x));
      const clamp = (x: number): number => clampSI(+x.toFixed(decimals));
      const next = (d: 1 | -1): number => (q ? clampSI(nudgeQuantity(num, d, q, def.step)) : clamp(num + d * def.step));
      const mk = (t: string, d: 1 | -1): HTMLButtonElement => { const b = document.createElement("button"); b.type = "button"; b.className = "strip-step"; b.textContent = t; b.addEventListener("click", () => onChange(next(d))); return b; };
      const shown = q ? formatQuantity(num, q) : `${num}${def.unit ?? ""}`;
      // 点数值 = 就地打字（回车 / 点别处 = 定；Esc = 不改）：什么单位都接，看不懂 = 提示一句、留着让人改
      const val = document.createElement("button"); val.type = "button"; val.className = "strip-value"; val.textContent = shown; val.title = "点一下输入（可以带单位）";
      val.addEventListener("click", (ev) => {
        ev.preventDefault();
        const inp = document.createElement("input");
        inp.type = "text"; inp.className = "strip-input"; inp.value = shown; inp.setAttribute("inputmode", "decimal"); inp.setAttribute("enterkeyhint", "done"); inp.autocomplete = "off"; inp.spellcheck = false;
        inp.setAttribute("aria-label", def.label);
        let done = false;
        const finish = (commit: boolean): void => {
          if (done) return;
          if (commit && inp.value.trim() !== shown) {
            const t = inp.value.trim(), r = q ? parseQuantity(t, q) : Number(t.replace(def.unit ?? "", "").trim());
            const v = typeof r === "number" ? r : NaN;
            if (!Number.isFinite(v)) { showNotice({ id: "field-entry", text: typeof r === "object" ? r.error : `看不懂「${t}」`, level: "warning" }); inp.classList.add("bad"); inp.select(); return; }
            done = true; inp.replaceWith(val); onChange(q ? clampSI(v) : clamp(v)); return;
          }
          done = true; inp.replaceWith(val);
        };
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); finish(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); } });
        inp.addEventListener("blur", () => finish(true));
        val.replaceWith(inp); inp.focus(); inp.select();
      });
      box.append(mk("−", -1), val, mk("+", 1));
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
