// param-panel.ts —— 参数小窗的会话（零 DOM）。user 2026-10-25「把右下角的数值小窗扩成一个「参数小窗」 同意」：
//   马前炮 = 指令执行前设参数（镜像…：选项 + 场景里的 gizmo + 预演，应用 / 取消）；
//   马后炮 = 刚做完那一步还能改参数（撤销这一步、按新参数重做；「马后炮就是你移动之后可以输入/5这种」）。
// 指令是函数、小窗只往里喂参数（user「一个命令是一个类似函数的东西，你面板喂，而不是查面板」）：会话持有值，改值 / 按钮都回调指令自己。
// 字段形状 = 工具选项表的三种（枚举 / 数值 / 开关），底部选项条和小窗用同一个控件模块画（app/ui/field-control.ts）。
// created 2026-10-25 by Claude Opus 5.5
import type { BoolOption, EnumOption, NumberOption } from "./tool-config.ts";

export type ParamFieldDef = Pick<EnumOption, "kind" | "label" | "values"> | Pick<NumberOption, "kind" | "label" | "min" | "max" | "step" | "unit"> | Pick<BoolOption, "kind" | "label">;
export type ParamValue = string | number | boolean;
export interface ParamField { readonly key: string; readonly def: ParamFieldDef; }
export interface ParamButton { readonly key: string; readonly label: string; readonly primary?: boolean; readonly on?: boolean; }
export interface ParamPanelState {
  readonly phase: "before" | "after";
  readonly title: string;
  readonly fields: readonly ParamField[];
  readonly buttons: readonly ParamButton[];
  readonly values: Readonly<Record<string, ParamValue>>;
}
export interface ParamSession extends ParamPanelState {
  set(key: string, value: ParamValue): void;
  press(key: string): void;
  /** 这个会话还算不算数（马后炮：这一步之后又提交过别的 / 撤销过 = 作废）。不给 = 一直算。 */
  stale?(): boolean;
  /** 会话被别的会话顶掉 / 关掉时的收尾（马前炮：退出 gizmo、清预演）。 */
  dispose?(): void;
}

/**
 * 马后炮会话：刚提交的那一步占了 nOps 个操作；改值 = undoN(n) → redo(新值) → 重新数这一步占几个操作。
 * opCount 是编辑器的操作计数（撤销 / 重做 / 别的提交都会让它和记下的不一样 → 作废）。
 */
export function afterthought(o: {
  title: string; fields: readonly ParamField[]; values: Record<string, ParamValue>; nOps: number;
  opCount: () => number; undoN: (n: number) => void; redo: (values: Readonly<Record<string, ParamValue>>) => void;
}): ParamSession {
  let n = o.nOps, mark = o.opCount();
  const values = { ...o.values };
  return {
    phase: "after", title: o.title, fields: o.fields, buttons: [], values,
    stale: () => o.opCount() !== mark,
    set(key, v) {
      if (o.opCount() !== mark || values[key] === v) return;
      o.undoN(n);
      const n0 = o.opCount();
      values[key] = v;
      o.redo(values);
      n = o.opCount() - n0; mark = o.opCount();
    },
    press() {},
  };
}
