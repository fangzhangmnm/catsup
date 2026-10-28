/** 文档名的后缀（.catsup / 老 .glb；都不是 = ""）。大小写不敏感，返回的是规范小写形。 */
export declare const docSuffixOf: (p: string) => string;
/** 去掉夹和后缀的裸名（显示用）。 */
export declare const bareName: (full: string) => string;
/** 拼文档名：缺 ext = 新文档的后缀（.catsup）；改名传原来的后缀（老 .glb 改名还是 .glb）。 */
export declare const fullName: (dir: string, bare: string, ext?: string) => string;
export declare const isDocName: (p: string) => boolean;
