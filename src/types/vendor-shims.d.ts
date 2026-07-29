// vendored 依赖的类型 shim。
// three：shorthand ambient module → import 得 any（playground 是耗材，不为它 vendor @types/three）。
// 运行时由 esbuild --alias:three=./src/vendor/three/three.module.js 解析；tsc 永不解析真文件。
declare module "three";
