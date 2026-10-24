// tool-config.ts —— 工具配置深模块（0.9 QoL 第一件；user 2026-10-21「系统的想一下tool config的深模块，第一天就建立好规范」）。
// created 2026-10-21 by Claude Fable 5.1。规范 = ai-docs/20261021-tool-config-spec.md。
//
// 一句话：**每个工具一张声明式选项表**（类型 / 取值 / 默认 / scope / 修饰键），其余一切——校验、修饰键临时覆盖、订阅、
// 持久化路由、底部选项条 UI——都从表长出来；消费方只会 `config.get(tool, key)`，UI 只会 `config.entries(tool)`。
//
// 规矩（第一天立）：
//   ① 新选项 = 表里加一行，不许在工具代码里私藏 `let mode = ...`；表就是 SSoT。
//   ② 每行必答「换台机器该跟吗？换个文档该跟吗？」→ scope = session（只活这一次）/ device（跟机器）/ doc（跟文档）。
//      本版全部 session（没经 user 同意不开新持久化；device 路由已留接缝，改一个词 + main 递 kv 即生效；doc 归数据契约，未接）。
//   ③ 修饰键 = **按住时的临时覆盖**（SU 同款：Ctrl 按着 = 另一种模式，松开回来），不改存的值；要锁定走选项条。
//   ④ 值永远合法：enum 不在表里 → 忽略；number 夹到 [min, max] 并按 step 量化；bool 强转。
//   ⑤ 模块零 DOM、零 editor import：node 直测（test/tool-config.test.ts）。
import type { Tool } from "./editor.ts";

export type OptionScope = "session" | "device" | "doc";
export interface Modifiers { ctrl?: boolean; shift?: boolean; }

export interface EnumOption {
  readonly kind: "enum";
  readonly label: string;
  readonly values: readonly { readonly id: string; readonly label: string; readonly hint?: string }[];
  readonly def: string;
  readonly scope: OptionScope;
  /** 按住修饰键时临时成为哪个值（ctrl / shift / ctrlShift）。 */
  readonly modifiers?: { readonly ctrl?: string; readonly shift?: string; readonly ctrlShift?: string };
}
export interface NumberOption {
  readonly kind: "number";
  readonly label: string;
  readonly def: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** 显示单位（纯标注；值的量纲由选项自己定义——调参纪律） */
  readonly unit?: string;
  readonly scope: OptionScope;
}
export interface BoolOption {
  readonly kind: "bool";
  readonly label: string;
  readonly def: boolean;
  readonly scope: OptionScope;
}
export type OptionDef = EnumOption | NumberOption | BoolOption;
export type OptionTable = Readonly<Record<string, Readonly<Record<string, OptionDef>>>>;

type ValueOf<D> = D extends EnumOption ? D["values"][number]["id"] : D extends NumberOption ? number : D extends BoolOption ? boolean : never;

/** 持久化接缝（device scope 用）：同步 get / set，与 app 的 device-kv 同形。 */
export interface OptionKv { get(key: string): string | null; set(key: string, v: string | null): void; }

/** 一个工具当前的全部选项（给 UI 生成用）。 */
export interface OptionEntry { readonly key: string; readonly def: OptionDef; readonly value: string | number | boolean; }

export class ToolConfig<T extends OptionTable> {
  private readonly values = new Map<string, string | number | boolean>();
  private readonly subs = new Set<(tool: string, key: string) => void>();
  readonly table: T;
  private readonly kv: OptionKv | undefined;
  private readonly kvPrefix: string;
  /** node strip-types 不认参数属性，故显式赋值。 */
  constructor(table: T, kv?: OptionKv, kvPrefix = "catsup.tool.") {
    this.table = table; this.kv = kv; this.kvPrefix = kvPrefix;
    for (const [tool, opts] of Object.entries(table)) for (const [key, def] of Object.entries(opts as Record<string, OptionDef>)) {
      let v: string | number | boolean = def.def;
      if (def.scope === "device" && kv) { const raw = kv.get(this.kvKey(tool, key)); if (raw !== null) { const parsed = this.coerce(def, def.kind === "number" ? Number(raw) : def.kind === "bool" ? raw === "1" : raw); if (parsed !== undefined) v = parsed; } }
      this.values.set(this.k(tool, key), v);
    }
  }
  private k(tool: string, key: string): string { return `${tool}.${key}`; }
  private kvKey(tool: string, key: string): string { return `${this.kvPrefix}${tool}.${key}`; }

  /** 当前值（合法性由 set 保证）。 */
  get<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O): ValueOf<T[K][O]> {
    return this.values.get(this.k(tool, key)) as ValueOf<T[K][O]>;
  }
  /** 写值：非法值被拒（返回 false，不改）；合法则存 + 按 scope 落盘 + 通知订阅者。 */
  set<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O, value: ValueOf<T[K][O]> | string | number | boolean): boolean {
    const def = this.table[tool]?.[key] as OptionDef | undefined;
    if (!def) return false;
    const v = this.coerce(def, value);
    if (v === undefined) return false;
    if (this.values.get(this.k(tool, key)) === v) return true;
    this.values.set(this.k(tool, key), v);
    if (def.scope === "device" && this.kv) this.kv.set(this.kvKey(tool, key), typeof v === "boolean" ? (v ? "1" : "0") : String(v));
    for (const fn of this.subs) fn(tool, key);
    return true;
  }
  /** 回默认（一个工具的全部选项）。 */
  reset(tool: keyof T & string): void {
    for (const [key, def] of Object.entries(this.table[tool] ?? {})) this.set(tool, key as keyof T[typeof tool] & string, def.def);
  }
  /** 按住修饰键时的有效值（只对带 modifiers 的 enum 有意义；其余原样）。 */
  effective<K extends keyof T & string, O extends keyof T[K] & string>(tool: K, key: O, mods: Modifiers): ValueOf<T[K][O]> {
    const def = this.table[tool]?.[key] as OptionDef | undefined;
    const base = this.get(tool, key);
    if (!def || def.kind !== "enum" || !def.modifiers) return base;
    const m = def.modifiers;
    const pick = mods.ctrl && mods.shift ? m.ctrlShift : mods.ctrl ? m.ctrl : mods.shift ? m.shift : undefined;
    return (pick !== undefined && def.values.some((x) => x.id === pick) ? pick : base) as ValueOf<T[K][O]>;
  }
  /** 一个工具的选项条目（声明顺序），没有选项 → []。 */
  entries(tool: string): OptionEntry[] {
    const opts = this.table[tool];
    if (!opts) return [];
    return Object.entries(opts).map(([key, def]) => ({ key, def, value: this.values.get(this.k(tool, key))! }));
  }
  /** 某个 enum 值的标签（UI / hint 用）。 */
  labelOf(tool: string, key: string, value: string): string {
    const def = this.table[tool]?.[key];
    if (!def || def.kind !== "enum") return String(value);
    return def.values.find((v) => v.id === value)?.label ?? String(value);
  }
  subscribe(fn: (tool: string, key: string) => void): () => void { this.subs.add(fn); return () => { this.subs.delete(fn); }; }

  private coerce(def: OptionDef, value: unknown): string | number | boolean | undefined {
    switch (def.kind) {
      case "enum": return typeof value === "string" && def.values.some((v) => v.id === value) ? value : undefined;
      case "number": {
        const n = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(n)) return undefined;
        const clamped = Math.min(def.max, Math.max(def.min, n));
        const q = def.min + Math.round((clamped - def.min) / def.step) * def.step;   // 以 min 为格点原点量化
        return Math.min(def.max, Math.max(def.min, q));                                  // 量化可能跳出 max，再夹一次
      }
      case "bool": return typeof value === "boolean" ? value : value === "1" || value === "true" ? true : value === "0" || value === "false" ? false : undefined;
    }
  }
}

// ---------------- CatsUp 的表（SSoT）----------------
/** 表面指派的档位（user 2026-10-24 定稿：三档 平滑组 / 到锐角为止 / 连通体 ↔ 单击 / 双击 / 三击；选项档 = 下限）。定义住 surface-assign.ts。 */
import { SURFACE_TIERS } from "./surface-assign.ts";
import { ARC_MODES } from "./arc-build.ts";
/** 工具 → 选项组：表面指派工具（油漆桶 / 以后的碰撞、贴图投影）共用 `surface` 一组（user「锐角阈值和模式的持久化不同工具共享」）。 */
export function optionGroupOf(tool: string): string { return tool === "paint" ? "surface" : tool; }

export const TOOL_OPTIONS = {
  /** 矩形从哪画（user 2026-10-24「中心rect……还是要」；SU 按 Ctrl / Option 从中心）：Ctrl 按着 = 临时从中心。 */
  rect: {
    from: { kind: "enum", label: "起点", values: [{ id: "corner", label: "从角" }, { id: "center", label: "从中心" }], def: "corner", scope: "session", modifiers: { ctrl: "center" } },
  },
  circle: {
    segments: { kind: "number", label: "段数", def: 24, min: 3, max: 96, step: 1, scope: "session" },
  },
  /** 弧的四种（SU 对照；user 2026-10-24「几种arc模式也看一下」）：两点弧 / 圆心弧 / 三点弧 / 扇形；定义住 arc-build.ts。 */
  arc: {
    mode: { kind: "enum", label: "画法", values: ARC_MODES, def: "two", scope: "session" },
    segments: { kind: "number", label: "段数", def: 12, min: 2, max: 96, step: 1, scope: "session" },
  },
  /** 焊边橡皮（user 2026-10-24「有一个最大角度护栏」）：接点两边的转角 ≤ 这个角才焊成一条长弧 / 折线；共轴（0°）直接真合并；更尖的不碰。 */
  weldErase: {
    maxDeg: { kind: "number", label: "最大角度", def: 45, min: 1, max: 90, step: 1, unit: "°", scope: "session" },
  },
  /** 软边橡皮（「第三个橡皮……原理一样。共面就删边，不共面就改软边」）：两膜二面角 ≤ 这个角才软化（+ 平滑）；共面直接删边并面；更尖的不碰。默认 20° 对齐 SU Soften。 */
  softErase: {
    maxDeg: { kind: "number", label: "最大角度", def: 20, min: 1, max: 90, step: 1, unit: "°", scope: "session" },
  },
  /** 表面指派共用（user 2026-10-24 要的持久化 = 跟机器；scope device，经 host 递来的 device-kv）。 */
  surface: {
    tier: { kind: "enum", label: "范围", values: SURFACE_TIERS, def: "smooth", scope: "device" },
    sharpDeg: { kind: "number", label: "锐角阈值", def: 20, min: 1, max: 90, step: 1, unit: "°", scope: "device" },
  },
} as const satisfies Partial<Record<Tool | "surface", Readonly<Record<string, OptionDef>>>>;

export type CatsUpToolConfig = ToolConfig<typeof TOOL_OPTIONS>;
