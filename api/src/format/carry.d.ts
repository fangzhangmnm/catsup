/** 收集 json 树里所有 bufferView 引用（去重）。 */
export declare function collectBufferViewRefs(json: unknown, out?: Set<number>): Set<number>;
/** 深拷贝并按 map 重写 bufferView 索引（缺映射 = 引用了没携带的视图，报错不猜）。 */
export declare function remapBufferViewRefs<T>(json: T, map: (old: number) => number): T;
