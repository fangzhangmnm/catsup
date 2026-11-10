import type { Command, MeshUnit } from "../../commands/command.ts";
/** 整个网格体（修复这台机器只对「你所在的这一层」说话，没有选区这回事）。用户点了才跑；导入、导出、转换都不走这里。 */
export declare const mergeReversed: Command<MeshUnit>;
