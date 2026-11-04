// put-back.ts —— 「放回图库（还是加密的）」（工单 C5；规则书 §1 第 5 条「带口令可导回」，Fable 11-03 排）。created 2026-11-04 by Claude Opus 5.5
//   加密文件拿回图库：先问口令、解开验证（口令对、字节完好、确实是 CatsUp 工程），然后把**原容器字节**原样放进图库。
//   不重新封、不存明文、解开的内容用完就丢；撞名加后缀，绝不覆盖。纯函数 + 注入：node 直测。
import { writeNewVerified, type VerifiedWritePorts } from "./home-move.ts";

export type PutBackResult =
  | { status: "placed"; identifier: string; password: string }
  | { status: "not-container" }
  | { status: "cancelled" }
  | { status: "not-a-model" };

export interface PutBackPorts extends VerifiedWritePorts {
  isContainer(b: Blob): Promise<boolean>;
  /** 循环问口令直到对或取消；对了给解开的明文（只用来验证）。 */
  unlock(b: Blob): Promise<{ pw: string; plain: Blob } | null>;
  isModel(plain: Blob): Promise<boolean>;
}

export async function putBack(file: Blob, identifier: string, p: PutBackPorts): Promise<PutBackResult> {
  if (!(await p.isContainer(file))) return { status: "not-container" };
  const got = await p.unlock(file);
  if (!got) return { status: "cancelled" };
  if (!(await p.isModel(got.plain))) return { status: "not-a-model" };
  const name = await writeNewVerified(identifier, file, p);   // 原容器字节；got.plain 到此为止
  return { status: "placed", identifier: name, password: got.pw };
}

/** 文件名 → 图库身份：`模型.catsup.zip` / `模型.glb.zip` / `模型.zip` → `夹/模型<docExt>`。 */
export function identifierForFile(fileName: string, folder: string, docExt: string): string {
  const stem = fileName.replace(/\.zip$/i, "").replace(/\.(catsup|glb)$/i, "") || "模型";
  return `${folder ? `${folder}/` : ""}${stem}${docExt}`;
}
