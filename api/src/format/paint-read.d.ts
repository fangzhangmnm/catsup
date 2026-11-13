import { type DefinitionDoc, type MaterialDoc, type TextureDoc, type UvSetDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
export declare function paintReadChecks(definitions: readonly DefinitionDoc[], materials: readonly MaterialDoc[], textures: readonly TextureDoc[], uvSets: readonly UvSetDoc[], notes: FormatReadNotes): void;
