import * as vscode from "vscode";

export function getOpenedTab(uri: vscode.Uri): vscode.Tab | null {
    const targetUriString = uri.toString();
    const tabGroups = vscode.window.tabGroups;
    for (const tabGroup of tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            const tabInput = tab.input;
            if (!(tabInput instanceof vscode.TabInputTextDiff)) {
                continue;
            }
            if (tabInput.modified.toString() === targetUriString) {
                return tab;
            }
        }
    }

    return null;
}

export function getNonce() {
    let text = "";
    const possible =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

type CustomModelConfiguration = {
    openaiAPIKey: string;
    model: string;
    isCodeCopilot: boolean;
};

export function getCustomModelConfiguration(): CustomModelConfiguration | null {
    const config = vscode.workspace.getConfiguration("whalecloud");
    const apiKey = config.get("devCloudAccessToken", "");
    const model = config.get("model", "");
    const isCodeCopilot = config.get("isCodeCopilot", false);
    if (apiKey === "") {
        return null;
    }
    return {
        openaiAPIKey: apiKey,
        model,
        isCodeCopilot
    };
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check that the file or directory exists in an asynchronous manner that relies
// solely on the VS Code API, not Node's fs library, ignoring symlinks.
async function checkIfFileOrDirectoryExists(targetPath: string | vscode.Uri, type: vscode.FileType): Promise<boolean> {
    if (targetPath === "") {
        return false;
    }
    try {
        const stat: vscode.FileStat = await vscode.workspace.fs.stat(
            targetPath instanceof vscode.Uri
                ? targetPath
                : vscode.Uri.file(targetPath));
        return (stat.type & type) !== 0;
    } catch {
        return false;
    }
}

export async function checkIfFileExists(filePath: string | vscode.Uri): Promise<boolean> {
    return await checkIfFileOrDirectoryExists(filePath, vscode.FileType.File);
}


interface GitUrlParts {
    gitHost: string;
    orgName: string;
    repoName: string;
  }
  
export function splitGitUrl(url: string): GitUrlParts | null {
    let giturl = url;
    // 1. 规整像 ssh://git@git-nj.iwhalecloud.com:52422/ossr9dev/rc-public-capability-product.git 这样的git地址
    if (url.startsWith('ssh://')) {
        giturl = url.replace('ssh://','');        
    } 

    const regex = /^(?:https?|git)(?::\/\/|@)([^\/]+)[\/:]([^\/]+)\/(.+?)(?:\.git)?$/;
    const matches = giturl.match(regex);
  
    if (matches) {
      let gitHost = matches[1];
      const orgName = matches[2];
      const repoName = matches[3];
      
      // 2. 规整 git-nj.iwhalecloud.com:52422 这种情况
      if (gitHost.indexOf(':') !== -1) {
        gitHost = gitHost.replace(/:\d+$/, "");
      }
      return {
        gitHost,
        orgName,
        repoName
      };
    } else {
      return null; // 无效的 git 地址
    }
  }
