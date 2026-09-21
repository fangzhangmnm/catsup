// debug-log.ts —— CatsUp 黑匣子（数据源）= @internal/gallery 的 diagLog，与 WeebPaint 同一份代码：500 条环、单条 ≤ 600 字、
//   住 device-kv（同步、**不住 IDB**——IDB 是登录/图库案的嫌疑人，黑匣子不能住在嫌疑人家里）、250 ms 合并落盘 + pagehide 立即 flush。
// created 2026-09-20 by Claude Fable 5.1（user 2026-09-20「实验台可以 sunset 了，留下 debug log」「先做好 debug log like weebpaint」）
//
// 三条数据源：① error-funnel（全 app + store 唯一汇拢点，**全部级别含 log**——store 的 [auth] init / [msal] Error·Warning /
//   silent 续签失败带 msal-tail 都从这条进来）② main 三层错误边界（脚本 / 异步 / 帧）③ 面包屑 note(tag, msg)：
//   boot / auth / doc / op / store / sw / page / net。没有面包屑，一串错误没有时间线可对。
// op 上日志（user 09-20 问「op 操作是否要上 Log」→ 上）：每次提交一行摘要（动词 + 数量 + 事件数 + 耗时，不含坐标）；
//   提交失败那条附 op 的 JSON 前 400 字符 = 复现钥匙。
// 不是 telemetry：永不上传；只有用户在「调试日志」sheet 点复制/分享，字节才离开设备。清空 = 用户点「清空」。
import { diagLog, configureDeviceKv } from "@internal/gallery";
import { deviceKvGet, deviceKvSet } from "./device-kv.ts";
import { APP_VERSION } from "../version.ts";
import { bootUrlLine } from "./debug-lines.ts";

export const { record, note, entries, clear, toText, flush } = diagLog;

let _inited = false;
/** main 最早调（任何 initAuth / store 之前）：接 device-kv 器官 + 页面生命周期面包屑 + 开机 URL 行。 */
export function initDebugLog(): void {
  if (_inited) return;
  _inited = true;
  configureDeviceKv({ get: deviceKvGet, set: deviceKvSet });   // 包的 device-kv seam → 本 app 器官（图库懒建之前黑匣子就要能落盘）
  diagLog.initDiagLog({ app: "CatsUp", version: APP_VERSION });
  note("boot", bootUrlLine(location));
}
