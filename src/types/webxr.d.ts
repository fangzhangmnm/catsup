// webxr.d.ts —— WebXR Device API 的最小类型 shim（TS lib.dom 不带；只声明本仓用到的子集，不 vendor @types/webxr）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元）

interface XRVec { readonly x: number; readonly y: number; readonly z: number; readonly w: number; }
interface XRRigidTransform { readonly position: XRVec; readonly orientation: XRVec; readonly matrix: Float32Array; readonly inverse: XRRigidTransform; }
interface XRPose { readonly transform: XRRigidTransform; readonly emulatedPosition: boolean; }
interface XRViewerPose extends XRPose { readonly views: readonly unknown[]; }
interface XRSpace { readonly __xrSpaceBrand?: never; }
interface XRReferenceSpaceEvent extends Event { readonly referenceSpace: XRReferenceSpace; readonly transform?: XRRigidTransform; }
interface XRReferenceSpace extends XRSpace {
  addEventListener(type: "reset", listener: (ev: XRReferenceSpaceEvent) => void): void;
  removeEventListener(type: "reset", listener: (ev: XRReferenceSpaceEvent) => void): void;
}
interface XRHapticActuator { pulse(intensity: number, durationMs: number): Promise<boolean>; }
interface XRGamepad {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly touched: boolean; readonly value: number }[];
  readonly hapticActuators?: readonly XRHapticActuator[];
  readonly mapping: string;
}
interface XRInputSource {
  readonly handedness: "none" | "left" | "right";
  readonly targetRayMode: "gaze" | "tracked-pointer" | "screen";
  readonly targetRaySpace: XRSpace;
  readonly gripSpace?: XRSpace;
  readonly gamepad?: XRGamepad;
  readonly profiles: readonly string[];
}
interface XRFrame {
  readonly session: XRSession;
  getViewerPose(ref: XRReferenceSpace): XRViewerPose | null;
  getPose(space: XRSpace, base: XRSpace): XRPose | null;
}
interface XRSession extends EventTarget {
  readonly inputSources: readonly XRInputSource[];
  end(): Promise<void>;
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  addEventListener(type: "end" | "inputsourceschange" | "select" | "selectstart" | "selectend" | "visibilitychange", listener: (ev: Event) => void): void;
  removeEventListener(type: "end" | "inputsourceschange" | "select" | "selectstart" | "selectend" | "visibilitychange", listener: (ev: Event) => void): void;
}
interface XRSystem extends EventTarget {
  isSessionSupported(mode: "immersive-vr" | "immersive-ar" | "inline"): Promise<boolean>;
  requestSession(mode: "immersive-vr" | "immersive-ar" | "inline", opts?: { optionalFeatures?: string[]; requiredFeatures?: string[] }): Promise<XRSession>;
}
interface Navigator { readonly xr?: XRSystem; }
