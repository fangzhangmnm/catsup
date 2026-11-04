export declare const PUSH_RETRY_MS = 30000;
export interface PushRetryFacts {
    pushPending: boolean;
    /** 和云端没对上，等人处理。 */
    attention: boolean;
    saving: boolean;
    gesture: boolean;
    visible: boolean;
    online: boolean;
    signedIn: boolean;
    /** 上一次试了没推成的时刻（ms）；推成了 / 刚回线 = 0，下一拍就能补。 */
    lastTryAt: number;
    now: number;
}
export declare function shouldRetryPush(f: PushRetryFacts): boolean;
