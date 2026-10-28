export interface ReadmeSection {
    id: string;
    title: string;
    body: string;
}
/** 帮助页渲染时换成生成的快捷键表（main.ts toggleHelp）。 */
export declare const KEYS_TABLE = "{{KEYS_TABLE}}";
export declare const README_SECTIONS: ReadmeSection[];
