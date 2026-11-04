// push-retry.ts —— 已落本地、还没推上去的这一份，什么时候再推一次（工单 C3 D；纯函数，node 直测）。created 2026-11-03 by Claude Opus 5.5
//   起因：tick 只看 dirty()，落完本地就不脏了，这笔再也没人推（家族周账 F-137 ⑫ 的主因，test/probes/probe-update-conflict.mjs 场景 4）。
//   不重试的情况都是「推了也没用 / 该问人」：有真分叉（attention，人在横幅里处理）、没网 / 没登录、页面不可见、正在保存、手势按着。
//   节奏 = 自动保存的空闲时间：网络抖的时候不要一秒一次重新编码整个模型。
import { AUTOSAVE_IDLE_MS } from "../config.ts";

export const PUSH_RETRY_MS = AUTOSAVE_IDLE_MS;

export interface PushRetryFacts {
  pushPending: boolean;
  /** 和云端没对上，等人处理。 */
  attention: boolean;
  saving: boolean;
  gesture: boolean;
  visible: boolean;
  online: boolean;
  signedIn: boolean;
  /** 从没传过、人还没答应传（回来问一次之前 / 说了「稍后」）：心跳不推（规则书第 15 条 (a)）。 */
  held?: boolean;
  /** 上一次试了没推成的时刻（ms）；推成了 / 刚回线 = 0，下一拍就能补。 */
  lastTryAt: number;
  now: number;
}

export function shouldRetryPush(f: PushRetryFacts): boolean {
  return !f.held && f.pushPending && !f.attention && !f.saving && !f.gesture && f.visible && f.online && f.signedIn && f.now - f.lastTryAt >= PUSH_RETRY_MS;
}
