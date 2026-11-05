export declare const inputGate: import("../controller/input-gate.ts").InputGate;
/** 外点关菜单的那一下：点在画布上 = 只关菜单，不再穿到工具（以前拿着画线工具点外面关菜单，同时起了一笔）；点在别的钮上照常（一下就换到那个钮）。 */
export declare function dismissPress(e: Event): void;
/** 开机最早装：window 上的捕获监听按注册先后跑，门口要排第一。 */
export declare function installInputDom(): void;
