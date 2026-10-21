import type { Session } from "./session.ts";
import type { NoticeOpts } from "./ui/notice.ts";
export interface CrashRecoveryDeps {
    session: Session;
    notify: (o: NoticeOpts) => void;
    /** 领养成功后关掉图库（若开着）——用户要看的是刚接回来的模型。 */
    closeGallery: () => void;
}
/** boot 接线（main 的开机 IIFE 末尾，restoreLastSession 三态恢复之后）：pending 先自动领养，再逐条问 crash 帧。 */
export declare function initCrashRecovery(d: CrashRecoveryDeps): Promise<void>;
