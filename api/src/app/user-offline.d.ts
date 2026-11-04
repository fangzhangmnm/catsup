export declare function isUserOffline(): boolean;
export declare function setUserOffline(v: boolean): void;
/** 浏览器说有网（navigator.onLine 不可全信，但 false 是可信的）。 */
export declare function browserOnline(): boolean;
/** 网盘这条路现在通不通 = 浏览器有网 ∧ 用户没选「离线继续」。app 里问「能不能上云」一律问它，不直接看 navigator.onLine。 */
export declare function cloudOnline(): boolean;
