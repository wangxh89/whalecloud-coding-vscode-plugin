import * as vscode from "vscode";
import { Logger} from "../../logger";
let tabnineExtensionContext: vscode.ExtensionContext | null = null;

export function setTabnineExtensionContext(
  context: vscode.ExtensionContext
): void {
  tabnineExtensionContext = context;
}

export function getTabnineExtensionContext(): vscode.ExtensionContext | null {
  return tabnineExtensionContext;
}

let  whalecloudLogger: Logger;

export function setLogger(logger: Logger): void {
    whalecloudLogger = logger;
  }
  
export function getLogger(): Logger {
    return whalecloudLogger;
  }
  