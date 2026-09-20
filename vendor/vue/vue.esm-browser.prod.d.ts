// 极简类型声明：只覆盖本仓 UI 组件实际用到的 Vue API（template-字符串风格）。
// TS 按同名 basename 把这份 .d.ts 配给 vue.esm-browser.prod.js（IDE 用；esbuild 忽略 .d.ts）。
// 不追求 Vue 官方 d.ts 的完整重载——「类型只钉在深接缝」，组件公开契约由各 mount handle interface 表达。

export interface Ref<T> { value: T; }
export function ref<T>(value: T): Ref<T>;
// shallowRef：只在 .value **整体替换**时触发（不深追踪内部）。适合「整块换掉的不可变快照」——
//   如笔架的 Brush[] 镜像：每次 collection 变就整体重算换上，不需要也不该深代理每支笔。
export function shallowRef<T>(value: T): Ref<T>;
export function reactive<T extends object>(target: T): T;
export function toRaw<T>(observed: T): T;   // 2026-09-05：brush-config-view 压感曲线编辑器要 raw 对象（曲线原地改，不走反应式）
export interface ComputedRef<T> { readonly value: T; }
export function computed<T>(getter: () => T): ComputedRef<T>;
export function watch(
  source: unknown,
  cb: (next?: any, prev?: any) => void,
  opts?: { flush?: "pre" | "post" | "sync"; deep?: boolean; immediate?: boolean },
): () => void;
export function onMounted(cb: () => void): void;
export function onUnmounted(cb: () => void): void;
export function nextTick(cb?: () => void): Promise<void>;

// 组件 / app 工厂用宽松类型即可（深契约在调用方的 props/emits + mount handle interface 里）。
export function defineComponent(options: any): any;
export interface App { mount(el: Element | string): any; unmount(): void; }
export function createApp(root: any, props?: any): App;
