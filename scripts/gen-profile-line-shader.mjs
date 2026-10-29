#!/usr/bin/env node
// scripts/gen-profile-line-shader.mjs —— 重新生成 src/minccino/providers/three/profile-line-shader.ts 的 PROFILE_LINE_VERTEX 字面量
//（vendored LineMaterial.js 的 vertexShader + PROFILE_PATCHES）。改了 PROFILE_PATCHES 或升级 three 后跑一次。created 2026-10-29 by Claude Fable 5.1
import { readFileSync, writeFileSync } from "node:fs";
import { PROFILE_PATCHES, applyProfilePatches } from "../src/minccino/providers/three/profile-line-shader.ts";
const lm = readFileSync(new URL("../src/vendor/three/addons/lines/LineMaterial.js", import.meta.url), "utf8");
const m = /vertexShader:\s*\/\* glsl \*\/`([\s\S]*?)`,\s*\n\s*fragmentShader:/.exec(lm);
if (!m) throw new Error("LineMaterial.js: vertexShader literal not found");
const body = applyProfilePatches(m[1]);
const p = new URL("../src/minccino/providers/three/profile-line-shader.ts", import.meta.url);
const src = readFileSync(p, "utf8");
const esc = (t) => t.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
const next = src.replace(/export const PROFILE_LINE_VERTEX: string = `[\s\S]*`;\n$/, "export const PROFILE_LINE_VERTEX: string = `" + esc(body) + "`;\n");
writeFileSync(p, next);
console.log("profile-line-shader.ts regenerated", body.length, "chars", PROFILE_PATCHES.length, "patches");
