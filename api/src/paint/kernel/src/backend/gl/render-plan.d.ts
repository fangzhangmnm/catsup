export interface PlanLeaf {
    kind: "leaf";
    id: number;
    opacity: number;
    mode: string;
    clip: boolean;
    visible: boolean;
    hasContent: boolean;
    float: boolean;
    overlay: boolean;
}
export interface PlanGroup {
    kind: "group";
    id: number;
    opacity: number;
    mode: string;
    clip: boolean;
    visible: boolean;
    children: PlanNode[];
}
export type PlanNode = PlanLeaf | PlanGroup;
export type BgKind = "none" | "checker" | "color";
export interface LeafStep {
    t: "leaf";
    id: number;
    mode: string;
    opacity: number;
    clipBaseId: number | null;
    clipKey: string | null;
    overlay: boolean;
}
export interface FloatStep {
    t: "float";
    id: number;
    clipBaseFloatId: number | null;
}
export interface SegStep {
    t: "seg";
    key: string;
    mode: string;
    opacity: number;
    clipBaseId: number | null;
    clipKey: string | null;
}
export interface GroupStep {
    t: "group";
    id: number;
    mode: string;
    opacity: number;
    clipBaseId: number | null;
    clipKey: string | null;
    body: PlanStep[];
}
export type PlanStep = LeafStep | FloatStep | SegStep | GroupStep;
export interface SegBuild {
    key: string;
    steps: PlanStep[];
    withBg: boolean;
    members: number[];
}
export interface Plan {
    rootSteps: PlanStep[];
    rootBgLive: boolean;
    builds: Map<string, SegBuild>;
    cacheKeys: Set<string>;
    transientKeys: Set<string>;
    liveLeaves: Set<number>;
}
export declare function buildPlan(nodes: PlanNode[], updated: Set<number>, bg: BgKind): Plan;
