import {
  DecorationOptions,
  Range,
  TextEditor,
  TextEditorDecorationType,
  window,
} from "vscode";


export const setDecoration = (
  decorationType: TextEditorDecorationType,
  rangesOrOptions: Range[] | DecorationOptions[],
  editor?: TextEditor
): void =>
  (editor ?? window.activeTextEditor)?.setDecorations(
    decorationType,
    rangesOrOptions
  );
