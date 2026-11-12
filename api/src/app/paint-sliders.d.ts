import type { Editor } from "../editor/editor.ts";
import type { LeftDial } from "./left-dial.ts";
export declare function mountPaintSliders(dial: LeftDial, editor: Editor, sizeMax: (tool: "paintPen" | "paintEraser") => number): {
    render(): void;
};
