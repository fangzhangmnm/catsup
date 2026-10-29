// minccino/device.ts —— 量设备的**唯一**地方（骨架稿 v2 不变量 5：pass 代码不判设备；设备只以代价表 / 预算 / 能力位 / 电量状态这些**数据**进来）。
// created 2026-10-29 by Claude Fable 5.1（步 7）。守卫 ③ 对本文件放行 navigator（量电量），守卫 ④ 盯 graph / overlay / material / backend 不许判设备。
// 电量感知（T35）：**默认开、跟设备的省电模式走、设置里可关、降档时披露不静默**。小学只读状态；谁消费（后台预算 / 降档梯子）以后接。

export interface PowerState {
  /** 电量感知开关（默认开；user 自己在设置里关）。 */
  readonly batteryAware: boolean;
  /** 电量 0–1；浏览器不给 = null。 */
  readonly level: number | null;
  readonly charging: boolean | null;
  /** 该省着用了（电量感知开 ∧ 没充电 ∧ 电量 ≤ 0.2）；拿不到电量 = false（不猜）。 */
  readonly saver: boolean;
}

type BatteryLike = { level: number; charging: boolean; addEventListener(t: string, cb: () => void): void };
let battery: BatteryLike | null = null, asked = false, aware = true;
const listeners = new Set<() => void>();

/** 问一次浏览器要电池对象（Chromium 有、WebKit 没有）；拿到后电量 / 充电变化都通知订阅者。 */
export function initPowerSensing(): void {
  if (asked) return;
  asked = true;
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
  nav.getBattery?.().then((b) => { battery = b; const ping = (): void => { for (const l of listeners) l(); }; b.addEventListener("levelchange", ping); b.addEventListener("chargingchange", ping); ping(); }).catch(() => { /* 不给就不给 */ });
}
export function setBatteryAware(on: boolean): void { aware = on; for (const l of listeners) l(); }
export function onPowerChange(cb: () => void): () => void { listeners.add(cb); return () => { listeners.delete(cb); }; }
export function powerState(): PowerState {
  const level = battery ? battery.level : null, charging = battery ? battery.charging : null;
  return { batteryAware: aware, level, charging, saver: aware && level !== null && charging === false && level <= 0.2 };
}
