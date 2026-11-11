import { type DefinitionDoc, type MaterialDoc, type TextureDoc } from "./document.ts";
import type { FormatReadNotes } from "./migrate/index.ts";
export declare function paintReadChecks(definitions: readonly DefinitionDoc[], materials: readonly MaterialDoc[], textures: readonly TextureDoc[], notes: FormatReadNotes): void;
