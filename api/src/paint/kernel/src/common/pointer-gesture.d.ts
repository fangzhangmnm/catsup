export interface Vec2 {
    x: number;
    y: number;
}
export interface GestureViewport {
    tx: number;
    ty: number;
    scale: number;
    rot: number;
}
interface ScaleRotStart {
    dist: number;
    angle: number;
    vp: {
        scale: number;
        rot: number;
    };
}
export interface PinchStart {
    dist: number;
    midX: number;
    midY: number;
    angle: number;
    vp: GestureViewport;
}
export interface PinchLimits {
    minScale: number;
    maxScale: number;
    docW: number;
    docH: number;
}
export interface TapRef {
    time: number;
    x: number;
    y: number;
}
export declare function pinchScaleRot(start: ScaleRotStart, dist: number, angle: number, minScale: number, maxScale: number): {
    scale: number;
    rot: number;
};
export declare function solveAnchorTranslation(modelPt: Vec2, scale: number, rot: number, screenX: number, screenY: number): {
    tx: number;
    ty: number;
};
export declare function computePinchViewport(start: PinchStart, a: Vec2, b: Vec2, limits: PinchLimits): GestureViewport;
export declare function snapRotation(cur: number, snapDeg?: number): number | null;
export declare function isTap(durMs: number, distPx: number, maxDurMs: number, maxMovePx: number): boolean;
export declare function isDoubleTap(now: number, prev: TapRef | null, x: number, y: number, windowMs: number, maxGapPx: number): boolean;
export declare function gestureTapAction(maxCount: number): string | null;
export {};
