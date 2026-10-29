export interface PowerState {
    /** 电量感知开关（默认开；user 自己在设置里关）。 */
    readonly batteryAware: boolean;
    /** 电量 0–1；浏览器不给 = null。 */
    readonly level: number | null;
    readonly charging: boolean | null;
    /** 该省着用了（电量感知开 ∧ 没充电 ∧ 电量 ≤ 0.2）；拿不到电量 = false（不猜）。 */
    readonly saver: boolean;
}
/** 问一次浏览器要电池对象（Chromium 有、WebKit 没有）；拿到后电量 / 充电变化都通知订阅者。 */
export declare function initPowerSensing(): void;
export declare function setBatteryAware(on: boolean): void;
export declare function onPowerChange(cb: () => void): () => void;
export declare function powerState(): PowerState;
