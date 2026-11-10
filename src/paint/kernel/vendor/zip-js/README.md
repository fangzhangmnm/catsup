# zip.js

- 来源：npm `@zip.js/zip.js` **2.7.55** 的 `dist/zip-full.min.js`（和 2.7.54 那份逐字节相同；相邻的 2.7.53 / 2.7.56 / 2.7.57 都对不上）。
  - `zip-full.min.js`：135312 字节，sha256 `39f3a868427aa4453e77cb4e0011a30ba8fe791ddb78a7b908736b1115f88515`。
  - `LICENSE`：同一个包里的许可证原文（BSD 3-Clause，Copyright (c) 2023, Gildas Lormeau），1501 字节，sha256 `1b7ebc8d7889ed25491484ab2b102370742ca6c0b26650a0c62cc2269b579b84`，从 `https://cdn.jsdelivr.net/npm/@zip.js/zip.js@2.7.55/LICENSE` 下载，下完核过指纹，没有手打。
- 版本是 Claude Fable 5.2 2026-11-10 拿 jsdelivr 给的每个版本的文件指纹逐个对出来的（家族里这个文件以前没记版本）；Claude Opus 5.5 同日下载许可证、核了两个指纹（CatsUp 贴图主线 0-1½）。
- 怎么用：`index.html` 用 classic `<script>` 挂到全局 `zip`；内核的 `src/backend/zip.ts` 读的是这个全局（不 import）。node 测试里 `test/zip-node.mjs`、`test/kernel-shim.mjs` 照样挂一份。
- 家族里另外三个仓（加密库、小黑屋、AtlasMaker）带的是同一个文件，归家族周账。
