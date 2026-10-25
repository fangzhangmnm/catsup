export declare function deviceKvGet(key: string): string | null;
/** v=null 删键。写失败（配额/隐私模式中途翻脸）→ 落内存层，绝不 throw（device 层是便利不是红线）。 */
export declare function deviceKvSet(key: string, v: string | null): void;
export declare function deviceKvGetJson<T>(key: string, fallback: T): T;
export declare function deviceKvSetJson(key: string, v: unknown): void;
/** 0.4 时代的裸 `catsup.ui.*` 键一次性搬家（读到就迁、迁完删旧键；无则无事）。 */
export declare function migrateLegacyUiPrefs(keys: readonly string[]): void;
/** 还原出厂（factory-reset.ts）：清掉本 app 前缀下的全部键（含内存层），返回删了几个。只动自己前缀——同域名下还有兄弟 app。 */
export declare function deviceKvWipeAll(): number;
/** 还原出厂后验证归零用：本 app 前缀下还剩几个键（含内存层）。 */
export declare function deviceKvCount(): number;
