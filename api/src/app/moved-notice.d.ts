export interface MovedNotice {
    text: string;
    url: string;
}
export declare function movedNoticeFor(loc: {
    hostname: string;
    pathname: string;
}): MovedNotice | null;
