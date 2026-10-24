import type { Pt3 } from "../kernel/kernel.ts";
export interface PpStopsView {
    faces(): {
        id: number;
    }[];
    planeOf(id: number): {
        plane: {
            n: Pt3;
            d: number;
        };
        basis: {
            u: Pt3;
            v: Pt3;
        };
    } | undefined;
    faceRings3(id: number): {
        outer: Pt3[];
    } | undefined;
    guides?(): {
        lines: {
            p: Pt3;
            dir: Pt3;
        }[];
        points: {
            p: Pt3;
        }[];
    };
}
export declare function ppStopsOf(view: PpStopsView, face: number, anchor: Pt3, n: Pt3): number[];
