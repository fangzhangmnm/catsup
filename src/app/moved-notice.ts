// moved-notice.ts —— 旧 github.io 地址上的「搬家」一行（家族根 ai-docs/20261103-catsup-domain-move.md §0.2）。
// created 2026-11-03 by Claude Opus 5.5
//
// 文案不分搬前搬后：搬完之后旧图标会冻在这一版（缓存优先的离线壳更新不了），这句话要一直是真话。
// 只在旧地址显示；新地址、本机预览都没有。不存「关过了」：关掉只管这一次，下次开机再说一遍，不新增持久键。
import { SITE_URL } from "../config.ts";

const OLD_HOST = "fangzhangmnm.github.io";

export interface MovedNotice { text: string; url: string }

export function movedNoticeFor(loc: { hostname: string; pathname: string }): MovedNotice | null {
  if (loc.hostname !== OLD_HOST) return null;
  const host = new URL(SITE_URL).host;
  return {
    text: `CatsUp 的新地址是 ${host}，这个旧地址以后不再更新。去之前先把没传的都传上去；没登录时存的模型先在图库里「全部导出」。到新地址登录网盘，模型会拉回来，加密模型的口令要重输一次。`,
    url: `${SITE_URL}${loc.pathname.includes("/dev/") ? "/dev/" : "/"}`,
  };
}
