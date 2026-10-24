// exact/lattice.ts —— 精确几何的坐标约定：**格点整数**（单位 = 内核量化格 Q = 1 µm）。精确模块只收整数，浮点世界在这里换算。
// 设计稿 ai-docs/20261024-exact-geometry-design.md §3。created 2026-10-24 by Claude Fable 5.1
import { Q } from "../geom.ts";
import type { Pt3 } from "../geom.ts";

/** 整数 2D / 3D 点（|坐标| < 2^31 = ±2147 m；超出 = 调用方的错，这里不防）。 */
export interface IPt2 { readonly x: number; readonly y: number; }
export interface IPt3 { readonly x: number; readonly y: number; readonly z: number; }
export const LATTICE_LIMIT = 2 ** 31;

export const toLattice3 = (p: Pt3): IPt3 => ({ x: Math.round(p.x / Q), y: Math.round(p.y / Q), z: Math.round(p.z / Q) });
export const fromLattice3 = (p: IPt3): Pt3 => ({ x: p.x * Q, y: p.y * Q, z: p.z * Q });
export const isLattice = (v: number): boolean => Number.isInteger(v) && Math.abs(v) < LATTICE_LIMIT;
export const assertLattice3 = (p: IPt3, what = "point"): void => { if (!isLattice(p.x) || !isLattice(p.y) || !isLattice(p.z)) throw new Error(`exact: ${what} is not a lattice point (${p.x},${p.y},${p.z})`); };
