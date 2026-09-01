# experiments/ —— 可丢区

- 日期前缀子目录（`20260728-xxx/`）；write-only：`src/`、`test/` **永不 import 这里**（build.sh 有 grep lint 守门）。
- 用途 = 装不进断言的问题（渲染选型、perf 探针、手感对比）。**不是主线的家**。
- 每个实验死前必须把结论沉淀成 `ai-docs/` 一篇带日期戳的 findings，然后整目录可删。
